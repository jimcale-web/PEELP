import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { requireInstructor } from '../middleware/require-instructor.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const lessonsRouter = Router();

const lessonSchema = z.object({
  title: z.string().min(1, 'Lesson title is required.'),
  description: z.string().optional().or(z.literal('')),
  order: z.number().int().nonnegative().optional(),
});

const resourceSchema = z.object({
  type: z.string().min(1, 'Resource type is required.').transform((value) => value.toUpperCase()),
  url: z.string().trim().min(1, 'Resource URL is required.').url('Resource URL must be a valid URL.'),
  isFree: z.boolean().optional().default(false),
  order: z.number().int().nonnegative().optional(),
}).superRefine(({ type, isFree }, context) => {
  if (isFree && type !== 'VIDEO') {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Only video resources can be marked as free.',
      path: ['isFree'],
    });
  }
});

lessonsRouter.get('/api/instructor/courses/:courseId/sections/:sectionId/lessons', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId, sectionId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to view this course.' });
    return;
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lessons = await prisma.lesson.findMany({
    where: { sectionId, deletedAt: null },
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
  });

  res.json({ lessons });
}));

lessonsRouter.post('/api/instructor/courses/:courseId/sections/:sectionId/lessons', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId, sectionId } = req.params;
  const { title, description, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const lesson = await prisma.lesson.create({
    data: {
      id: randomUUID(),
      title,
      description: description || null,
      sectionId,
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
  });

  res.status(201).json({ lesson });
}));

lessonsRouter.put('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId, sectionId, lessonId } = req.params;
  const { title, description, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const updated = await prisma.lesson.update({
    where: { id: lessonId },
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
  });

  res.json({ lesson: updated });
}));

lessonsRouter.delete('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true, title: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ deleted: true, title: lesson.title });
}));

lessonsRouter.get('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  if (req.user?.role !== 'ADMIN' && course.instructorId !== req.user!.id) {
    res.status(403).json({ error: 'You do not have permission to view this course.' });
    return;
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const resources = await prisma.resource.findMany({
    where: { lessonId, deletedAt: null },
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
  });

  res.json({ resources });
}));

lessonsRouter.post('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId, sectionId, lessonId } = req.params;
  const { type, url, isFree, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const { randomUUID } = await import('crypto');
  const now = new Date();

  const resource = await prisma.resource.create({
    data: {
      id: randomUUID(),
      type: type.toUpperCase(),
      url,
      isFree,
      lessonId,
      order: order ?? 0,
      createdAt: now,
      updatedAt: now,
    },
    select: {
      id: true,
      type: true,
      url: true,
      isFree: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.status(201).json({ resource });
}));

lessonsRouter.put('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources/:resourceId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { courseId, sectionId, lessonId, resourceId } = req.params;
  const { type, url, isFree, order } = parsed.data;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, lessonId, deletedAt: null },
    select: { id: true },
  });

  if (!resource) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: {
      type: type.toUpperCase(),
      url,
      isFree,
      ...(order !== undefined && { order }),
      updatedAt: new Date(),
    },
    select: {
      id: true,
      type: true,
      url: true,
      isFree: true,
      order: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ resource: updated });
}));

lessonsRouter.delete('/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources/:resourceId', requireAuth, requireInstructor, asyncHandler(async (req, res) => {
  const { courseId, sectionId, lessonId, resourceId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, instructorId: true },
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
    where: { id: sectionId, courseId, deletedAt: null },
    select: { id: true },
  });

  if (!section) {
    res.status(404).json({ error: 'Section not found.' });
    return;
  }

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, sectionId, deletedAt: null },
    select: { id: true },
  });

  if (!lesson) {
    res.status(404).json({ error: 'Lesson not found.' });
    return;
  }

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, lessonId, deletedAt: null },
    select: { id: true, url: true },
  });

  if (!resource) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  await prisma.resource.update({
    where: { id: resourceId },
    data: { deletedAt: new Date() },
  });

  res.status(200).json({ deleted: true, url: resource.url });
}));
