import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { requireInstructor } from '../middleware/require-instructor.js';
import { uploadThumbnail, uploadsDir } from '../middleware/upload.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const coursesRouter = Router();

// Admin: list all courses
coursesRouter.get('/api/admin/courses', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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

// Public: browse available courses without exposing administrative fields or requiring login.
coursesRouter.get('/api/public/courses', asyncHandler(async (_req, res) => {
  const courses = await prisma.course.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      instructor: { select: { id: true, name: true } },
      category: { select: { id: true, name: true } },
      _count: { select: { sections: { where: { deletedAt: null } } } },
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
coursesRouter.post('/api/admin/courses', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
coursesRouter.patch('/api/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
coursesRouter.delete('/api/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
coursesRouter.get('/api/instructor/courses', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    where: {
      deletedAt: null,
      ...(req.user?.role === 'ADMIN' ? {} : { instructorId: req.user!.id }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
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

// Instructor: get a specific course
coursesRouter.get('/api/instructor/courses/:courseId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
      instructorId: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to view this course.' });
    return;
  }

  res.json({ course });
}));

coursesRouter.post('/api/instructor/courses', requireAuth, requireInstructor, uploadThumbnail.single('thumbnail'), asyncHandler(async (req, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { title, description, categoryId } = parsed.data;
  const instructorId = req.user?.role === 'ADMIN' ? (req.body.instructorId || req.user.id) : req.user!.id;

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.deletedAt) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      res.status(400).json({ error: 'Category not found.' });
      return;
    }
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();
  const thumbnailUrl = req.file ? `/uploads/thumbnails/${req.file.filename}` : null;

  const course = await prisma.course.create({
    data: {
      id: randomUUID(),
      title,
      description: description || null,
      thumbnailUrl,
      instructorId,
      categoryId: categoryId || null,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
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

// Instructor: update a course (title/description/category and optionally thumbnail)
coursesRouter.patch('/api/instructor/courses/:courseId', requireAuth, requireInstructor, uploadThumbnail.single('thumbnail'), asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const existing = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!existing) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && existing.instructorId !== req.user!.id) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(403).json({ error: 'You do not have permission to edit this course.' });
    return;
  }

  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { title, description, categoryId } = parsed.data;

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.deletedAt) {
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      res.status(400).json({ error: 'Category not found.' });
      return;
    }
  }

  let thumbnailUrl = existing.thumbnailUrl;
  if (req.file) {
    if (existing.thumbnailUrl) {
      const oldPath = path.join(uploadsDir, path.basename(existing.thumbnailUrl));
      fs.unlink(oldPath, () => {});
    }
    thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      title,
      description: description || null,
      thumbnailUrl,
      categoryId: categoryId || null,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
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

// Instructor: delete a course's thumbnail image
coursesRouter.delete('/api/instructor/courses/:courseId/thumbnail', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const existing = await prisma.course.findFirst({ where: { id: courseId, deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && existing.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to edit this course.' });
    return;
  }

  if (existing.thumbnailUrl) {
    const oldPath = path.join(uploadsDir, path.basename(existing.thumbnailUrl));
    fs.unlink(oldPath, () => {});
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: { thumbnailUrl: null, updatedAt: new Date() },
    select: {
      id: true,
      title: true,
      description: true,
      thumbnailUrl: true,
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
