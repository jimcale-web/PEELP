import { Router } from 'express';
import { z } from 'zod';
import { hashPassword } from 'better-auth/crypto';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']).default('STUDENT'),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  phoneNumber: z
    .string()
    .refine((v) => v === '' || /^[+\d\s\-().]+$/.test(v), 'Phone number contains invalid characters.')
    .optional()
    .or(z.literal('')),
});

usersRouter.post('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { name, email, password, role, city, country, phoneNumber } = parsed.data;

  // Use better-auth's own scrypt hasher so the hash is compatible with sign-in
  const hashedPassword = await hashPassword(password);
  const { randomUUID } = await import('crypto');
  const now = new Date();
  const userId = randomUUID();

  // Check for duplicate email first
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'A user with that email already exists.' });
    return;
  }

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: false,
      role,
      approvalStatus: 'APPROVED',
      city: city || null,
      country: country || null,
      phoneNumber: phoneNumber || null,
      createdAt: now,
      updatedAt: now,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: 'credential',
          password: hashedPassword,
          createdAt: now,
          updatedAt: now,
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      approvalStatus: true,
      city: true,
      country: true,
      phoneNumber: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.status(201).json({ user });
}));

// Admin: list all users
usersRouter.get('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      approvalStatus: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}));

// Admin: approve or reject a user
usersRouter.patch('/api/admin/users/:id/approval', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvalStatus } = req.body;

  if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED') {
    res.status(400).json({ error: 'approvalStatus must be APPROVED or REJECTED.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const user = await prisma.user.update({
    where: { id },
    data: { approvalStatus, updatedAt: new Date() },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      approvalStatus: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ user });
}));

// Admin: update a user
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  newPassword: z
    .string()
    .refine((v) => v === '' || v.length >= 8, 'New password must be at least 8 characters.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']),
});

usersRouter.patch('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { id } = req.params;
  const { name, email, newPassword, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Check for email conflict with another user
  const emailConflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
  if (emailConflict) {
    res.status(409).json({ error: 'A user with that email already exists.' });
    return;
  }

  const now = new Date();

  // Update password only when a non-empty value is provided;
  // always re-hash with better-auth's scrypt so sign-in works regardless
  // of what algorithm the old hash used.
  if (newPassword) {
    const account = await prisma.account.findFirst({
      where: { userId: id, providerId: 'credential' },
    });

    if (!account) {
      res.status(400).json({ error: 'No credential account found for this user.' });
      return;
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedPassword, updatedAt: now },
    });
  }

  await prisma.user.update({
    where: { id },
    data: { name, email, role, updatedAt: now },
  });

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ user });
}));

// Admin: delete a user
// - ADMIN users cannot be deleted
// - INSTRUCTOR: soft-deleted (deletedAt set)
// - STUDENT: hard-deleted (cascades to accounts/sessions)
usersRouter.delete('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({
      error: `No user with ID "${id}" exists. They may have already been deleted — refresh the list and try again.`,
    });
    return;
  }

  if (existing.role === 'ADMIN') {
    res.status(403).json({
      error: `"${existing.name}" is an Admin account. Admin accounts cannot be deleted for safety reasons.`,
    });
    return;
  }

  if (existing.deletedAt) {
    res.status(409).json({
      error: `"${existing.name}" has already been deactivated (on ${new Date(existing.deletedAt).toLocaleDateString()}).`,
    });
    return;
  }

  if (existing.role === 'INSTRUCTOR') {
    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    res.status(200).json({ deleted: 'soft', name: existing.name });
    return;
  }

  // STUDENT — hard delete (Prisma cascade removes accounts & sessions)
  await prisma.user.delete({ where: { id } });
  res.status(200).json({ deleted: 'hard', name: existing.name });
}));
