import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import { requireAuth } from './middleware/require-auth.js';
import { requireAdmin } from './middleware/require-admin.js';
import { requireInstructor } from './middleware/require-instructor.js';
import { errorHandler } from './middleware/error-handler.js';
import { asyncHandler } from './lib/async-handler.js';
import { prisma } from './lib/prisma.js';


const app = express();
const PORT = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Defence-in-depth: hard rate limit on the sign-in endpoint.
// 10 attempts per 15 minutes per IP → HTTP 429.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Raise the limit in test mode so E2E test logins don't get blocked
  max: process.env.NODE_ENV === 'test' ? 10000 : (Number(process.env.RATE_LIMIT_MAX) || 10),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Apply rate limit only to the sign-in route before handing off to better-auth
app.all('/api/auth/sign-in/*', loginRateLimit);

app.all('/api/auth/*', (req, res, next) => {
  toNodeHandler(auth)(req, res).catch(next);
});
app.use(express.json());
// Health check route
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'PEELP Backend is running' });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});

// Public: self-registration
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  city: z.string().min(1, 'City is required.'),
  country: z.string().min(1, 'Country is required.'),
  phoneNumber: z
    .string()
    .min(7, 'Phone number must be at least 7 characters.')
    .regex(/^[+\d\s\-().]+$/, 'Phone number contains invalid characters.'),
});

app.post('/api/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { name, email, password, city, country, phoneNumber } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists.' });
    return;
  }

  const hashedPassword = await hashPassword(password);
  const { randomUUID } = await import('crypto');
  const now = new Date();
  const userId = randomUUID();

  const user = await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: false,
      role: 'STUDENT',
      approvalStatus: 'PENDING',
      city,
      country,
      phoneNumber,
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
    select: { id: true, name: true, email: true, role: true },
  });

  res.status(201).json({ user });
}));


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

app.post('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
app.get('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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
app.patch('/api/admin/users/:id/approval', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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

app.patch('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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

// Admin: list students only (includes profile + access fields)
app.get('/api/admin/students', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
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
      accessDuration: true,
      accessExpiresAt: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ students });
}));

// Admin: set / update a student's accessibility duration (MONTHLY or YEARLY).
// Each call resets the expiry from "now": +1 month for MONTHLY, +1 year for YEARLY.
const setAccessDurationSchema = z.object({
  accessDuration: z.enum(['MONTHLY', 'YEARLY']),
});

app.patch('/api/admin/students/:id/access', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = setAccessDurationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'accessDuration must be MONTHLY or YEARLY.' });
    return;
  }

  const { id } = req.params;
  const { accessDuration } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  if (existing.role !== 'STUDENT') {
    res.status(400).json({ error: 'This endpoint is only for students.' });
    return;
  }

  const now = new Date();
  const accessExpiresAt = new Date(now);
  if (accessDuration === 'MONTHLY') {
    accessExpiresAt.setMonth(accessExpiresAt.getMonth() + 1);
  } else {
    accessExpiresAt.setFullYear(accessExpiresAt.getFullYear() + 1);
  }

  const student = await prisma.user.update({
    where: { id },
    data: { accessDuration, accessExpiresAt, updatedAt: now },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      city: true,
      country: true,
      phoneNumber: true,
      accessDuration: true,
      accessExpiresAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ student });
}));

// Admin: approve or reject a student
app.patch('/api/admin/students/:id/approval', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { approvalStatus } = req.body;

  if (approvalStatus !== 'APPROVED' && approvalStatus !== 'REJECTED') {
    res.status(400).json({ error: 'approvalStatus must be APPROVED or REJECTED.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'Student not found.' });
    return;
  }
  if (existing.role !== 'STUDENT') {
    res.status(400).json({ error: 'This endpoint is only for students.' });
    return;
  }

  const student = await prisma.user.update({
    where: { id },
    data: { approvalStatus, updatedAt: new Date() },
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
      accessDuration: true,
      accessExpiresAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ student });
}));

// Admin: list all courses
app.get('/api/admin/courses', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ courses });
}));

const courseSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional().or(z.literal('')),
  instructorId: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
});

// Admin: create a course
app.post('/api/admin/courses', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { title, description, instructorId, categoryId } = parsed.data;

  if (instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
    if (!instructor || instructor.role !== 'INSTRUCTOR') {
      res.status(400).json({ error: 'Instructor not found.' });
      return;
    }
  }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.deletedAt) {
      res.status(400).json({ error: 'Category not found.' });
      return;
    }
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const course = await prisma.course.create({
    data: {
      id: randomUUID(),
      title,
      description: description || null,
      instructorId: instructorId || null,
      categoryId: categoryId || null,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      title: true,
      description: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ course });
}));

// Admin: update a course
app.patch('/api/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { id } = req.params;
  const { title, description, instructorId, categoryId } = parsed.data;

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (instructorId) {
    const instructor = await prisma.user.findUnique({ where: { id: instructorId } });
    if (!instructor || instructor.role !== 'INSTRUCTOR') {
      res.status(400).json({ error: 'Instructor not found.' });
      return;
    }
  }

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.deletedAt) {
      res.status(400).json({ error: 'Category not found.' });
      return;
    }
  }

  const course = await prisma.course.update({
    where: { id },
    data: {
      title,
      description: description || null,
      instructorId: instructorId || null,
      categoryId: categoryId || null,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      description: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ course });
}));

// Admin: delete a course (soft delete)
app.delete('/api/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.course.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  await prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });
  res.status(200).json({ deleted: true, title: existing.title });
}));

// Instructor: list own courses (admins can view all)
app.get('/api/instructor/courses', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    where: {
      deletedAt: null,
      ...(req.user?.role === 'ADMIN' ? {} : { instructorId: req.user!.id }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ courses });
}));

app.get('/api/instructor/categories', requireAuth, requireInstructor, asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { courses: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ categories });
}));

app.post('/api/instructor/courses', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { title, description, categoryId } = parsed.data;
  const instructorId = req.user?.role === 'ADMIN' ? (req.body.instructorId || req.user.id) : req.user!.id;

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.deletedAt) {
      res.status(400).json({ error: 'Category not found.' });
      return;
    }
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const course = await prisma.course.create({
    data: {
      id: randomUUID(),
      title,
      description: description || null,
      instructorId,
      categoryId: categoryId || null,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      title: true,
      description: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ course });
}));

// ── Categories ───────────────────────────────────────────────────────────────

const categorySelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { courses: true } },
} as const;

// Admin: list all categories
app.get('/api/admin/categories', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: categorySelect,
    orderBy: { name: 'asc' },
  });
  res.json({ categories });
}));

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional().or(z.literal('')),
});

// Admin: create a category
app.post('/api/admin/categories', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { name, description } = parsed.data;

  const existing = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null },
  });
  if (existing) {
    res.status(409).json({ error: 'A category with that name already exists.' });
    return;
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const category = await prisma.category.create({
    data: {
      id: randomUUID(),
      name,
      description: description || null,
      createdAt: now,
      updatedAt: now,
    },
    select: categorySelect,
  });

  res.status(201).json({ category });
}));

// Admin: update a category
app.patch('/api/admin/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { id } = req.params;
  const { name, description } = parsed.data;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  const nameConflict = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' }, deletedAt: null, NOT: { id } },
  });
  if (nameConflict) {
    res.status(409).json({ error: 'A category with that name already exists.' });
    return;
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name, description: description || null, updatedAt: new Date() },
    select: categorySelect,
  });

  res.json({ category });
}));

// Admin: delete a category (soft delete)
app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }

  // Unlink any courses pointing at this category
  await prisma.course.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });

  res.status(200).json({ deleted: true, name: existing.name });
}));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` PEELP Backend - Online Learning Management System`);
});
