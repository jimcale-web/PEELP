import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { requireStudent } from '../middleware/require-student.js';
import { optionalAuth } from '../middleware/optional-auth.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';
import { computeAccessExpiresAt, hasActiveAccessForCategory } from '../lib/access.js';

export const studentsRouter = Router();

// Admin: list students only (includes profile + access fields)
studentsRouter.get('/api/admin/students', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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
      enrolledCategoryId: true,
      enrolledCategory: { select: { id: true, name: true } },
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

studentsRouter.patch('/api/admin/students/:id/access', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
  const accessExpiresAt = computeAccessExpiresAt(accessDuration, now);

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
      enrolledCategoryId: true,
      enrolledCategory: { select: { id: true, name: true } },
      accessDuration: true,
      accessExpiresAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ student });
}));

// Admin: approve or reject a student.
// Approval is independent from a subscription plan. If a duration is supplied, it
// is applied immediately; otherwise the student can be approved without setting an
// access window at this stage.
const setApprovalSchema = z.object({
  approvalStatus: z.enum(['APPROVED', 'REJECTED']),
  accessDuration: z.enum(['MONTHLY', 'YEARLY']).optional(),
});

studentsRouter.patch('/api/admin/students/:id/approval', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const parsed = setApprovalSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(' ');
    res.status(400).json({ error: message });
    return;
  }

  const { id } = req.params;
  const { approvalStatus, accessDuration } = parsed.data;

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
  const student = await prisma.user.update({
    where: { id },
    data: {
      approvalStatus,
      updatedAt: now,
      // Grant category-scoped access for the chosen duration on approval.
      ...(approvalStatus === 'APPROVED' && accessDuration
        ? { accessDuration, accessExpiresAt: computeAccessExpiresAt(accessDuration, now) }
        : {}),
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
      enrolledCategoryId: true,
      enrolledCategory: { select: { id: true, name: true } },
      accessDuration: true,
      accessExpiresAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  res.json({ student });
}));

// Student: browse available courses without exposing administrative fields.
studentsRouter.get('/api/student/courses', requireAuth, requireStudent, asyncHandler(async (_req, res) => {
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

// Student: get a single course's details for the lesson player header.
studentsRouter.get('/api/student/courses/:courseId', optionalAuth, asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      instructor: { select: { id: true, name: true } },
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const student = req.user
    ? await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { accessExpiresAt: true, enrolledCategoryId: true },
      })
    : null;

  res.json({
    course,
    hasAccess: hasActiveAccessForCategory(
      { accessExpiresAt: student?.accessExpiresAt ?? null, enrolledCategoryId: student?.enrolledCategoryId ?? null },
      course.categoryId,
    ),
  });
}));

// Student: get the full course curriculum (sections → lessons → resources) for the lesson player.
// Resources are locked unless the student has an active subscription for the course's category, except free-preview videos.
studentsRouter.get('/api/student/courses/:courseId/sections', optionalAuth, asyncHandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await prisma.course.findFirst({
    where: { id: courseId, deletedAt: null },
    select: { id: true, categoryId: true },
  });

  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return;
  }

  const student = req.user
    ? await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { accessExpiresAt: true, enrolledCategoryId: true },
      })
    : null;
  const hasAccess = hasActiveAccessForCategory(
    { accessExpiresAt: student?.accessExpiresAt ?? null, enrolledCategoryId: student?.enrolledCategoryId ?? null },
    course.categoryId,
  );

  const sections = await prisma.section.findMany({
    where: { courseId, deletedAt: null },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      order: true,
      lessons: {
        where: { deletedAt: null },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          resources: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              url: true,
              isFree: true,
              order: true,
            },
          },
        },
      },
    },
  });

  // Strip the URL from any resource the student isn't entitled to view yet.
  const lockedSections = sections.map((section) => ({
    ...section,
    lessons: section.lessons.map((lesson) => ({
      ...lesson,
      resources: lesson.resources.map((resource) => {
        const unlocked = hasAccess || resource.isFree;
        return {
          ...resource,
          url: unlocked ? resource.url : null,
          locked: !unlocked,
        };
      }),
    })),
  }));

  res.json({ sections: lockedSections, hasAccess });
}));
