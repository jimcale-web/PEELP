import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import { prisma } from './lib/prisma.js';
import { auth } from './lib/auth.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Parse request bodies BEFORE auth handler
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Intercept auth requests and fix origin validation
app.use('/api/auth/*', (req, res, next) => {
  // better-auth performs strict origin validation
  // We'll bypass it by modifying the host header to match origin
  const origin = req.headers.origin || req.headers.referer || `http://${req.headers.host}`;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      req.headers.host = originUrl.host;
      req.headers['x-forwarded-proto'] = originUrl.protocol.replace(':', '');
    } catch (e) {
      // If URL parsing fails, keep original headers
    }
  }

  next();
});

// Auth handler
app.all('/api/auth/*', toNodeHandler(auth));

// Health check route
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'PEELP Backend is running' });
});

// Routes (to be implemented)
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/admin', require('./routes/admin'));
// app.use('/api/courses', require('./routes/courses'));
// etc.

// Error handling middleware
app.use((_err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(_err);
  res.status(500).json({ error: 'Internal server error' });
});

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL via Prisma');
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL via Prisma:', error);
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 PEELP Backend - Online Learning Management System`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use. Stop the existing process or set PORT to another value.`);
      process.exit(1);
    }

    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

  const shutdown = (signal: string): void => {
    console.log(`\n${signal} received. Shutting down...`);

    server.close(async (error) => {
      if (error) {
        console.error('❌ Error during HTTP server shutdown:', error);
        process.exit(1);
      }

      await prisma.$disconnect();
      console.log('✅ Prisma connection closed');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

void startServer();
