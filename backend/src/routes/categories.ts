import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { requireInstructor } from '../middleware/require-instructor.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const categoriesRouter = Router();

// Public: categories available to students during self-registration.
categoriesRouter.get('/api/categories', asyncHandler(async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      description: true,
    },
    orderBy: { name: 'asc' },
  });

  res.json({ categories });
}));

categoriesRouter.get('/api/instructor/categories', requireAuth, requireInstructor, asyncHandler(async (_req, res) => {
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

const categorySelect = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { courses: true } },
} as const;

// Admin: list all categories
categoriesRouter.get('/api/admin/categories', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
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
categoriesRouter.post('/api/admin/categories', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
categoriesRouter.patch('/api/admin/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
categoriesRouter.delete('/api/admin/categories/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
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
