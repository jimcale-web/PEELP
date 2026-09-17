import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { requireInstructor } from '../middleware/require-instructor.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const sectionsRouter = Router();

// Instructor: get sections for a course
sectionsRouter.get('/api/instructor/courses/:courseId/sections', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      instructorId: true,
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

  const sections = await prisma.section.findMany({
    where: {
      courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      createdAt: true,
      updatedAt: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          createdAt: true,
          updatedAt: true,
          resources: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              url: true,
              isFree: true,
              order: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      },
    },
    orderBy: { order: 'asc' },
  });

  res.json({ sections });
}));

const sectionSchema = z.object({
  title: z.string().min(1, 'Section title is required.'),
  description: z.string().optional().or(z.literal('')),
  order: z.number().int().nonnegative().optional(),
});

// Instructor: create a section
sectionsRouter.post('/api/instructor/courses/:courseId/sections', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId } = req.params;
  const { title, description, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      instructorId: true,
    },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to edit this course.' });
    return;
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const section = await prisma.section.create({
    data: {
      id: randomUUID(),
      title,
      description: description || null,
      courseId,
      order: order ?? 0,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ section });
}));

// Instructor: update a section
sectionsRouter.put('/api/instructor/courses/:courseId/sections/:sectionId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = sectionSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId, sectionId } = req.params;
  const { title, description, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      instructorId: true,
    },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to edit this course.' });
    return;
  }

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      deletedAt: null,
      courseId,
    },
    select: { id: true, courseId: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const updated = await prisma.section.update({
    where: { id: sectionId },
    data: {
      title,
      description: description || null,
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ section: updated });
}));

// Instructor: delete a section (soft delete)
sectionsRouter.delete('/api/instructor/courses/:courseId/sections/:sectionId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId, sectionId } = req.params;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      deletedAt: null,
    },
    select: {
      id: true,
      instructorId: true,
    },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to edit this course.' });
    return;
  }

  const section = await prisma.section.findFirst({
    where: {
      id: sectionId,
      deletedAt: null,
      courseId,
    },
    select: { id: true, title: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  await prisma.section.update({
    where: { id: sectionId },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ deleted: true, title: section.title });
}));
