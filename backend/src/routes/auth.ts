import { Router } from 'express';
import { z } from 'zod';
import { hashPassword } from 'better-auth/crypto';
import { requireAuth } from '../middleware/require-auth.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const authRouter = Router();

authRouter.get('/api/me', requireAuth, (req, res) => {
  res.json({ user: req.user, session: req.session });
});

// Public: self-registration
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  city: z.string().min(1, 'City is required.'),
  country: z.string().min(1, 'Country is required.'),
  categoryId: z.string().min(1, 'Please select a category to enroll in.').optional(),
  phoneNumber: z
    .string()
    .min(7, 'Phone number must be at least 7 characters.')
    .regex(/^[+\d\s\-().]+$/, 'Phone number contains invalid characters.'),
});

authRouter.post('/api/register', asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { name, email, password, city, country, phoneNumber, categoryId } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists.' });
    return;
  }

  let enrolledCategoryId: string | undefined;
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true },
    });
    if (!category) {
      res.status(400).json({ error: 'The selected enrollment category is no longer available.' });
      return;
    }
    enrolledCategoryId = category.id;
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
      enrolledCategoryId,
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
