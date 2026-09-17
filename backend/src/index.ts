import 'dotenv/config';
import express from 'express';
import { toNodeHandler } from 'better-auth/node';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { auth } from './lib/auth.js';
import { errorHandler } from './middleware/error-handler.js';
import { uploadsDir } from './middleware/upload.js';
import { corsMiddleware } from './lib/cors.js';
import { loginRateLimit } from './lib/rate-limit.js';
import { authRouter } from './routes/auth.js';
import { usersRouter } from './routes/users.js';
import { studentsRouter } from './routes/students.js';
import { coursesRouter } from './routes/courses.js';
import { sectionsRouter } from './routes/sections.js';
import { lessonsRouter } from './routes/lessons.js';
import { categoriesRouter } from './routes/categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Railway terminates TLS and forwards the original client IP to the service.
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT) || 5000;

// Middleware
app.use(corsMiddleware);

// Apply rate limit only to the sign-in route before handing off to better-auth
app.all('/api/auth/sign-in/*', loginRateLimit);

app.all('/api/auth/*', (req, res, next) => {
  toNodeHandler(auth)(req, res).catch(next);
});
app.use(express.json());
// Serve uploaded thumbnail images
app.use('/uploads/thumbnails', express.static(uploadsDir));
// Health check route
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'PEELP Backend is running' });
});

app.use(authRouter);
app.use(usersRouter);
app.use(studentsRouter);
app.use(coursesRouter);
app.use(sectionsRouter);
app.use(lessonsRouter);
app.use(categoriesRouter);

// Serve the built frontend (single-service Railway deployment).
const frontendDistDir = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistDir)) {
  app.use(express.static(frontendDistDir));
  // Client-side routing: any non-API GET falls back to index.html.
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDistDir, 'index.html'));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` PEELP Backend - Online Learning Management System`);
});
