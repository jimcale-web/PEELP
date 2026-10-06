import { Router } from 'express';
import { requireAuth } from '../middleware/require-auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/prisma.js';

export const adminReportsRouter = Router();

adminReportsRouter.get('/api/admin/reports', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const [
    totalUsers,
    totalStudents,
    totalInstructors,
    pendingApprovals,
    totalCourses,
    usersCreated,
    coursesCreated,
    categories,
    courses,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, role: 'STUDENT', approvalStatus: 'APPROVED' } }),
    prisma.user.count({ where: { deletedAt: null, role: 'INSTRUCTOR' } }),
    prisma.user.count({ where: { deletedAt: null, approvalStatus: 'PENDING' } }),
    prisma.course.count({ where: { deletedAt: null } }),
    prisma.user.findMany({
      where: { deletedAt: null, createdAt: { gte: firstMonth } },
      select: { createdAt: true },
    }),
    prisma.course.findMany({
      where: { deletedAt: null, createdAt: { gte: firstMonth } },
      select: { createdAt: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            enrolledStudents: {
              where: { deletedAt: null, role: 'STUDENT', approvalStatus: 'APPROVED' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.course.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        title: true,
        sections: {
          where: { deletedAt: null },
          select: {
            lessons: {
              where: { deletedAt: null },
              select: {
                id: true,
                progress: {
                  where: {
                    student: {
                      is: {
                        deletedAt: null,
                        role: 'STUDENT',
                        approvalStatus: 'APPROVED',
                      },
                    },
                  },
                  select: { studentId: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const monthKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = (date: Date) =>
    date.toLocaleString('en', { month: 'short', year: 'numeric' });
  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const key = monthKey(date);
    return {
      month: monthLabel(date),
      newUsers: usersCreated.filter((user) => monthKey(user.createdAt) === key).length,
      newCourses: coursesCreated.filter((course) => monthKey(course.createdAt) === key).length,
    };
  });

  const coursePerformanceWithCounts = courses.map((course) => {
    const lessons = course.sections.flatMap((section) => section.lessons);
    const lessonCount = lessons.length;
    const learnerProgress = new Map<string, number>();

    for (const lesson of lessons) {
      for (const progress of lesson.progress) {
        learnerProgress.set(progress.studentId, (learnerProgress.get(progress.studentId) ?? 0) + 1);
      }
    }

    const learnersStarted = learnerProgress.size;
    const learnersCompleted = lessonCount > 0
      ? [...learnerProgress.values()].filter((completedLessons) => completedLessons === lessonCount).length
      : 0;

    return {
      id: course.id,
      title: course.title,
      learnersStarted,
      learnersCompleted,
      completionRate: learnersStarted > 0 ? Math.round((learnersCompleted / learnersStarted) * 100) : 0,
    };
  }).sort((a, b) => b.learnersStarted - a.learnersStarted || a.title.localeCompare(b.title));

  const learnerCourseStarts = coursePerformanceWithCounts.reduce((total, course) => total + course.learnersStarted, 0);
  const completedLearnerCourses = coursePerformanceWithCounts.reduce((total, course) => total + course.learnersCompleted, 0);
  const coursePerformance = coursePerformanceWithCounts.map(({ learnersCompleted: _learnersCompleted, ...course }) => course);

  res.json({
    summary: {
      totalUsers,
      totalStudents,
      totalInstructors,
      pendingApprovals,
      totalCourses,
      completionRate: learnerCourseStarts > 0
        ? Math.round((completedLearnerCourses / learnerCourseStarts) * 100)
        : 0,
    },
    monthlyActivity,
    categoryDistribution: categories.map((category) => ({
      name: category.name,
      students: category._count.enrolledStudents,
    })),
    coursePerformance: coursePerformance.slice(0, 8),
  });
}));
