import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Auth state created by global-setup.ts (admin session).
 * The seeded admin has ADMIN role, which the backend and frontend both
 * treat as instructor-capable (see InstructorRoute / requireInstructor).
 */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

test.use({ storageState: AUTH_FILE });

// --- Helpers ------------------------------------------------------------------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function testCourseTitle(prefix: string) {
  return `${prefix}-${uid()}`;
}

async function gotoInstructorDashboard(page: Page) {
  await page.goto('/instructor');
  await expect(page.getByRole('heading', { name: 'Instructor Dashboard' })).toBeVisible();
}

/** Section/lesson headings are prefixed with a running index, e.g. "1. My Section". */
function headingNamed(page: Page, title: string) {
  return page.getByRole('heading', { name: new RegExp(`\\d+\\.\\s*${escapeRegExp(title)}$`) });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Scoped locator for a given section card, identified by its heading text. */
function sectionItem(page: Page, sectionTitle: string) {
  return page.locator('.section-item', { has: headingNamed(page, sectionTitle) });
}

/** Scoped locator for a given lesson item within a section, identified by its heading text. */
function lessonItem(section: ReturnType<typeof sectionItem>, lessonTitle: string) {
  return section.locator('.lesson-item', { has: headingNamed(section.page(), lessonTitle) });
}

async function createCourse(page: Page, opts: { title: string; description?: string }) {
  const { title, description } = opts;

  await page.getByRole('button', { name: '+ Create Course' }).click();
  await page.getByLabel('Course title').fill(title);
  if (description) {
    await page.getByLabel('Description').fill(description);
  }
  await page.getByRole('button', { name: 'Save Course' }).click();

  await expect(page.getByRole('heading', { name: 'Instructor Dashboard' })).toBeVisible();
  await expect(page.getByText(title)).toBeVisible();
}

async function openCourse(page: Page, title: string) {
  await page.getByText(title).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

async function createSection(page: Page, opts: { title: string; description?: string }) {
  const { title, description } = opts;

  await page.getByRole('button', { name: /add section/i }).click();
  await page.getByLabel('Section Title').fill(title);
  if (description) {
    await page.getByLabel('Description').fill(description);
  }
  await page.getByRole('button', { name: 'Create Section' }).click();

  await expect(headingNamed(page, title)).toBeVisible();
}

async function createLesson(section: ReturnType<typeof sectionItem>, opts: { title: string; description?: string }) {
  const { title, description } = opts;

  await section.getByRole('button', { name: /add lesson/i }).click();
  await section.getByLabel('Lesson Title').fill(title);
  if (description) {
    await section.getByLabel('Lesson Description').fill(description);
  }
  await section.getByRole('button', { name: 'Create Lesson' }).click();

  await expect(headingNamed(section.page(), title)).toBeVisible();
}

// --- Instructor Dashboard -------------------------------------------------------

test.describe('Instructor Dashboard', () => {
  test('renders the dashboard with toolbar and course list', async ({ page }) => {
    await gotoInstructorDashboard(page);
    await createCourse(page, { title: testCourseTitle() });

    await expect(page.getByRole('button', { name: '+ Create Course' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Course' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible();
  });

  test('opens the create course form when "+ Create Course" is clicked', async ({ page }) => {
    await gotoInstructorDashboard(page);

    await page.getByRole('button', { name: '+ Create Course' }).click();

    await expect(page.getByLabel('Course title')).toBeVisible();
    await expect(page.getByLabel('Category')).toBeVisible();
    await expect(page.getByLabel('Description')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Course' })).toBeVisible();
  });

  test('shows a validation error when submitting without a title', async ({ page }) => {
    await gotoInstructorDashboard(page);

    await page.getByRole('button', { name: '+ Create Course' }).click();
    await page.getByRole('button', { name: 'Save Course' }).click();

    await expect(page.getByText('Course title is required.')).toBeVisible();
  });

  test('creates a new course and it appears in the course list', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const title = testCourseTitle('course-basic');
    await createCourse(page, { title, description: 'An end-to-end test course.' });

    await expect(page.getByText('An end-to-end test course.')).toBeVisible();
  });

  test('navigates to the course detail page when a course row is clicked', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const title = testCourseTitle('course-nav');
    await createCourse(page, { title });
    await openCourse(page, title);

    await expect(page).toHaveURL(/\/instructor\/course\/.+/);
  });

  test('navigates back to the dashboard from the course detail page', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const title = testCourseTitle('course-back');
    await createCourse(page, { title });
    await openCourse(page, title);

    await page.getByRole('button', { name: /back to courses/i }).click();

    await expect(page).toHaveURL('/instructor');
    await expect(page.getByRole('heading', { name: 'Instructor Dashboard' })).toBeVisible();
  });
});

// --- Course Detail: Sections -----------------------------------------------------

test.describe('Course Detail - Sections', () => {
  test('creates a section and it appears in the sections list', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-sections');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    await expect(page.getByText('No sections yet. Create one to get started!')).toBeVisible();

    const sectionTitle = testCourseTitle('section');
    await createSection(page, { title: sectionTitle, description: 'Getting started material' });

    await expect(page.getByText('Getting started material')).toBeVisible();
  });

  test('shows a validation error when creating a section without a title', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-section-err');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    await page.getByRole('button', { name: /add section/i }).click();
    await page.getByRole('button', { name: 'Create Section' }).click();

    await expect(page.getByText('Section title is required.')).toBeVisible();
  });
});

// --- Course Detail: Lessons -------------------------------------------------------

test.describe('Course Detail - Lessons', () => {
  test('creates a lesson within a section', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-lessons');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    const sectionTitle = testCourseTitle('section-for-lesson');
    await createSection(page, { title: sectionTitle });

    const section = sectionItem(page, sectionTitle);
    await expect(section.getByText('No lessons yet.')).toBeVisible();

    const lessonTitle = testCourseTitle('lesson');
    await createLesson(section, { title: lessonTitle, description: 'Understand the basics' });

    await expect(section.getByText('Understand the basics')).toBeVisible();
  });

  test('shows a validation error when creating a lesson without a title', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-lesson-err');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    const sectionTitle = testCourseTitle('section-for-lesson-err');
    await createSection(page, { title: sectionTitle });

    const section = sectionItem(page, sectionTitle);
    await section.getByRole('button', { name: /add lesson/i }).click();
    await section.getByRole('button', { name: 'Create Lesson' }).click();

    await expect(section.getByText('Lesson title is required.')).toBeVisible();
  });

  test('deletes a lesson', async ({ page }) => {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-lesson-del');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    const sectionTitle = testCourseTitle('section-for-lesson-del');
    await createSection(page, { title: sectionTitle });

    const section = sectionItem(page, sectionTitle);
    const lessonTitle = testCourseTitle('lesson-to-delete');
    await createLesson(section, { title: lessonTitle });

    page.once('dialog', (dialog) => dialog.accept());
    await lessonItem(section, lessonTitle).getByRole('button', { name: /delete lesson/i }).click();

    await expect(headingNamed(page, lessonTitle)).not.toBeVisible();
    await expect(section.getByText('No lessons yet.')).toBeVisible();
  });
});

// --- Course Detail: Resource Modal --------------------------------------------------

test.describe('Course Detail - Resource modal', () => {
  async function setupLesson(page: Page) {
    await gotoInstructorDashboard(page);

    const courseTitle = testCourseTitle('course-resources');
    await createCourse(page, { title: courseTitle });
    await openCourse(page, courseTitle);

    const sectionTitle = testCourseTitle('section-for-resource');
    await createSection(page, { title: sectionTitle });

    const section = sectionItem(page, sectionTitle);
    const lessonTitle = testCourseTitle('lesson-for-resource');
    await createLesson(section, { title: lessonTitle });

    return lessonItem(section, lessonTitle);
  }

  test('opens the resource form with Link selected by default and no free-video checkbox', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();

    await expect(lesson.getByLabel('Resource Type')).toHaveValue('LINK');
    await expect(lesson.getByLabel('URL')).toBeVisible();
    await expect(lesson.getByLabel('Make this video free')).toHaveCount(0);
  });

  test('shows a validation error when the URL is empty', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByText('Resource URL is required.')).toBeVisible();
  });

  test('shows a validation error when the URL is malformed', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByLabel('URL').fill('not-a-valid-url');
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByText('Resource URL must be a valid URL.')).toBeVisible();
  });

  test('reveals the free-video checkbox only when Video type is selected', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await expect(lesson.getByLabel('Make this video free')).toHaveCount(0);

    await lesson.getByLabel('Resource Type').selectOption('VIDEO');
    await expect(lesson.getByLabel('Make this video free')).toBeVisible();

    await lesson.getByLabel('Resource Type').selectOption('ARTICLE');
    await expect(lesson.getByLabel('Make this video free')).toHaveCount(0);
  });

  test('creates a Link resource with a valid URL', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByLabel('URL').fill('https://example.com/resource');
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByText('(LINK)')).toBeVisible();
    await expect(lesson.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://example.com/resource');
  });

  test('creates a free Video resource and shows the Free badge', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByLabel('Resource Type').selectOption('VIDEO');
    await lesson.getByLabel('URL').fill('https://videos.example.com/lesson-1');
    await lesson.getByLabel('Make this video free').check();
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByText('(VIDEO)')).toBeVisible();
    await expect(lesson.getByText('Free')).toBeVisible();
  });

  test('creates a non-free Video resource without showing the Free badge', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByLabel('Resource Type').selectOption('VIDEO');
    await lesson.getByLabel('URL').fill('https://videos.example.com/lesson-2');
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByText('(VIDEO)')).toBeVisible();
    await expect(lesson.getByText('Free')).toHaveCount(0);
  });

  test('deletes a resource', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByLabel('URL').fill('https://example.com/to-delete');
    await lesson.getByRole('button', { name: 'Save Resource' }).click();

    await expect(lesson.getByRole('link', { name: 'Open' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await lesson.getByRole('button', { name: 'Remove' }).click();

    await expect(lesson.getByText('No resources yet.')).toBeVisible();
  });

  test('closes the resource form and clears errors on cancel', async ({ page }) => {
    const lesson = await setupLesson(page);

    await lesson.getByRole('button', { name: /add resource/i }).click();
    await lesson.getByRole('button', { name: 'Save Resource' }).click();
    await expect(lesson.getByText('Resource URL is required.')).toBeVisible();

    await lesson.getByRole('button', { name: 'Cancel' }).click();

    await expect(lesson.getByLabel('URL')).toHaveCount(0);
    await expect(lesson.getByText('Resource URL is required.')).toHaveCount(0);
  });
});
