import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import { requireAuth } from './middleware/require-auth.js';


const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Defence-in-depth: hard rate limit on the sign-in endpoint.
// 10 attempts per 15 minutes per IP → HTTP 429.
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` PEELP Backend - Online Learning Management System`);
});
