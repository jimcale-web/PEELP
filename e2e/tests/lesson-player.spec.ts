import { test, expect, type Page } from '@playwright/test';

const COURSE_ID = 'course-lesson-player';

const COURSE = {
  id: COURSE_ID,
  title: 'Intro to Design',
  description: 'A short preview of the course structure and lesson player flow.',
  instructor: { id: 'instr-1', name: 'Ada Lovelace' },
  category: { id: 'cat-1', name: 'Design' },
};

const SECTIONS = [
  {
    id: 'section-1',
    title: 'Getting started',
    description: 'Set up the essentials.',
    order: 1,
    lessons: [
      {
        id: 'lesson-1',
        title: 'Welcome to PEELP',
        description: 'Learn the basics before moving deeper into the curriculum.',
        order: 1,
        // The locked (paid) PDF is listed first so it's the lesson's default
        // active resource, since the resource tabs only render once *every*
        // resource in a lesson is locked — this lesson mixes a free preview
        // with a paid resource, so tabs stay hidden and the viewer shows
        // whichever resource is selected by default.
        resources: [
          {
            id: 'resource-2',
            type: 'PDF',
            url: 'https://example.com/lessons/welcome-guide.pdf',
            isFree: false,
            order: 1,
            locked: true,
          },
          {
            id: 'resource-1',
            type: 'VIDEO',
            url: 'https://example.com/lessons/welcome.mp4',
            isFree: true,
            order: 2,
            locked: false,
          },
        ],
      },
    ],
  },
  {
    id: 'section-2',
    title: 'Practice',
    description: 'Apply what you have learned.',
    order: 2,
    lessons: [
      {
        id: 'lesson-2',
        title: 'Build your workflow',
        description: 'Turn the ideas into a repeatable process.',
        order: 1,
        resources: [
          {
            id: 'resource-3',
            type: 'VIDEO',
            url: 'https://example.com/lessons/workflow.mp4',
            isFree: true,
            order: 1,
            locked: false,
          },
        ],
      },
    ],
  },
];

async function mockCourseData(page: Page) {
  await page.route(`**/api/student/courses/${COURSE_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ course: COURSE, hasAccess: false }),
    });
  });

  await page.route(`**/api/student/courses/${COURSE_ID}/sections`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sections: SECTIONS, hasAccess: false }),
    });
  });
}

test.describe('Lesson Player', () => {
  test.beforeEach(async ({ page }) => {
    await mockCourseData(page);
    await page.goto(`/student/course/${COURSE_ID}`);
  });

  // `hasAccess: false` is the same flag whether a student was never approved/
  // subscribed or their plan has since expired — the backend's lazy expiry
  // check (`hasActiveAccess`) makes both cases indistinguishable to the
  // player, so this also covers the "locked on plan expiry" behavior.
  test('renders the course header and locks premium lesson content in preview mode', async ({ page }) => {
    await expect(page.locator('.lesson-player__course-info h1')).toHaveText('Intro to Design');
    await expect(page.locator('.lesson-player__access-badge')).toBeVisible();

    await expect(page.locator('.lesson-player__content h2')).toHaveText('Welcome to PEELP');
    await expect(page.getByText('This content requires an active subscription.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Browse plans/i })).toBeVisible();
  });

  test('locks lesson content once a previously-active plan expires, same as before approval', async ({ page }) => {
    let hasAccess = true;
    // A single, non-free resource so it flips between unlocked/locked purely
    // based on `hasAccess`, without depending on free-preview resources.
    const paidOnlySections = [
      {
        id: 'section-1',
        title: 'Getting started',
        description: 'Set up the essentials.',
        order: 1,
        lessons: [
          {
            id: 'lesson-1',
            title: 'Welcome to PEELP',
            description: null,
            order: 1,
            resources: [
              { id: 'resource-1', type: 'PDF', url: 'https://example.com/lessons/welcome-guide.pdf', isFree: false, order: 1 },
            ],
          },
        ],
      },
    ];

    await page.route(`**/api/student/courses/${COURSE_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ course: COURSE, hasAccess }),
      });
    });
    await page.route(`**/api/student/courses/${COURSE_ID}/sections`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sections: paidOnlySections.map((section) => ({
            ...section,
            lessons: section.lessons.map((lesson) => ({
              ...lesson,
              resources: lesson.resources.map((resource) => ({
                ...resource,
                url: hasAccess ? resource.url : null,
                locked: !hasAccess,
              })),
            })),
          })),
          hasAccess,
        }),
      });
    });

    await page.goto(`/student/course/${COURSE_ID}`);
    await expect(page.locator('.lesson-player__access-badge')).not.toBeVisible();
    await expect(page.getByText('This content requires an active subscription.')).not.toBeVisible();

    // Simulate the plan expiring: the access window (`accessExpiresAt`) has
    // now passed, so the next fetch reports `hasAccess: false` — locking
    // resources exactly like a student awaiting approval.
    hasAccess = false;
    await page.reload();

    await expect(page.locator('.lesson-player__access-badge')).toBeVisible();
    await expect(page.getByText('This content requires an active subscription.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Browse plans/i })).toBeVisible();
  });

  test('switches active lessons and toggles section collapse states from the sidebar', async ({ page }) => {
    const practiceSectionToggle = page.getByRole('button', { name: /Practice/i });
    await expect(practiceSectionToggle).toBeVisible();
    await practiceSectionToggle.click();

    const secondLesson = page.getByRole('button', { name: 'Build your workflow' });
    await secondLesson.click();

    await expect(page.locator('.lesson-player__content h2')).toHaveText('Build your workflow');
    await expect(page.locator('video.lesson-player__video')).toHaveAttribute('src', 'https://example.com/lessons/workflow.mp4');

    await practiceSectionToggle.click();
    await expect(page.getByRole('button', { name: 'Build your workflow' })).not.toBeVisible();

    await practiceSectionToggle.click();
    await expect(page.getByRole('button', { name: 'Build your workflow' })).toBeVisible();
  });
});
