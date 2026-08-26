import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { requireAuth } from './middleware/require-auth.js';
import { requireAdmin } from './middleware/require-admin.js';
import { errorHandler } from './middleware/error-handler.js';
import { asyncHandler } from './lib/async-handler.js';
import { prisma } from './lib/prisma.js';


const app = express();
const PORT = Number(process.env.PORT) || 5000;

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
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

// Admin: create a user
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['ADMIN', 'INSTRUCTOR', 'STUDENT']).default('STUDENT'),
});

app.post('/api/admin/users', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { name, email, password, role } = parsed.data;

  // Use bcrypt + prisma directly to create the user so we avoid better-auth
  // routing/response-object quirks when calling auth.api from inside the server.
  const { hashSync } = await import('bcryptjs');
  const hashedPassword = hashSync(password, 10);
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
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ users });
}));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` PEELP Backend - Online Learning Management System`);
});
