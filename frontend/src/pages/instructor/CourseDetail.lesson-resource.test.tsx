import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CourseDetail from './CourseDetail';
import { server } from '../../test/server';

// ─── Mock data ─────────────────────────────────────────────────────────────

const mockCourse = {
  id: 'course-1',
  title: 'Introduction to React',
  description: 'Learn the basics of React.js',
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Programming' },
  instructorId: 'instructor-1',
  instructor: { id: 'instructor-1', name: 'John Instructor' },
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
};

const mockSections = [
  {
    id: 'section-1',
    title: 'Getting Started',
    description: 'Set up your development environment',
    order: 0,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    lessons: [],
  },
];

const mockLesson = {
  id: 'lesson-1',
  title: 'Props and State',
  description: 'Understand component state and props',
  order: 0,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  resources: [],
};

// ─── Render helper ────────────────────────────────────────────────────────────

function renderCourseDetail(courseId: string = 'course-1') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/instructor/course/:courseId',
        element: (
          <QueryClientProvider client={queryClient}>
            <CourseDetail />
          </QueryClientProvider>
        ),
      },
      {
        path: '/instructor',
        element: <div data-testid="instructor-dashboard">Instructor Dashboard</div>,
      },
    ],
    { initialEntries: [`/instructor/course/${courseId}`] },
  );

  render(<RouterProvider router={router} />);
  return router;
}

/** Opens the section's lesson form and waits for the section to be visible first. */
async function openLessonForm(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByText('1. Getting Started');
  await user.click(screen.getByRole('button', { name: /add lesson/i }));
}

/** Creates a lesson (via mocked API) so the resource form can be exercised against it. */
async function createLessonAndOpenResourceForm(user: ReturnType<typeof userEvent.setup>) {
  server.use(
    http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons', () =>
      HttpResponse.json({ lesson: mockLesson }, { status: 201 }),
    ),
    http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
      HttpResponse.json({
        sections: [{ ...mockSections[0], lessons: [mockLesson] }],
      }),
    ),
  );

  await openLessonForm(user);
  await user.type(screen.getByLabelText('Lesson Title'), 'Props and State');
  await user.type(screen.getByLabelText('Lesson Description'), 'Understand component state and props');
  await user.click(screen.getByRole('button', { name: /create lesson/i }));

  await waitFor(() => {
    expect(screen.getByText('1. Props and State')).toBeInTheDocument();
  });

  await user.click(screen.getByRole('button', { name: /add resource/i }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CourseDetail - Lesson creation', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:5000/api/instructor/courses/:courseId', () =>
        HttpResponse.json({ course: mockCourse }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: mockSections }),
      ),
    );
  });

  it('opens the lesson form when "Add Lesson" is clicked', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await openLessonForm(user);

    expect(screen.getByLabelText('Lesson Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Lesson Description')).toBeInTheDocument();
  });

  it('shows a validation error when submitting without a title', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await openLessonForm(user);
    await user.click(screen.getByRole('button', { name: /create lesson/i }));

    expect(await screen.findByText('Lesson title is required.')).toBeInTheDocument();
  });

  it('does not call the API when the lesson title is blank', async () => {
    const user = userEvent.setup();
    let lessonCreateCalled = false;

    server.use(
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons', () => {
        lessonCreateCalled = true;
        return HttpResponse.json({ lesson: mockLesson }, { status: 201 });
      }),
    );

    renderCourseDetail();
    await openLessonForm(user);
    await user.click(screen.getByRole('button', { name: /create lesson/i }));

    await screen.findByText('Lesson title is required.');
    expect(lessonCreateCalled).toBe(false);
  });

  it('clears the validation error once a title is provided and lesson is created', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons', () =>
        HttpResponse.json({ lesson: mockLesson }, { status: 201 }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: [{ ...mockSections[0], lessons: [mockLesson] }] }),
      ),
    );

    renderCourseDetail();
    await openLessonForm(user);
    await user.click(screen.getByRole('button', { name: /create lesson/i }));
    await screen.findByText('Lesson title is required.');

    await user.type(screen.getByLabelText('Lesson Title'), 'Props and State');
    await user.click(screen.getByRole('button', { name: /create lesson/i }));

    await waitFor(() => {
      expect(screen.queryByText('Lesson title is required.')).not.toBeInTheDocument();
    });
    expect(await screen.findByText('1. Props and State')).toBeInTheDocument();
  });

  it('surfaces a server error message when lesson creation fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons', () =>
        HttpResponse.json({ error: 'Section not found.' }, { status: 404 }),
      ),
    );

    renderCourseDetail();
    await openLessonForm(user);
    await user.type(screen.getByLabelText('Lesson Title'), 'Props and State');
    await user.click(screen.getByRole('button', { name: /create lesson/i }));

    expect(await screen.findByText('Section not found.')).toBeInTheDocument();
  });

  it('closes the lesson form and clears errors when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await openLessonForm(user);
    await user.click(screen.getByRole('button', { name: /create lesson/i }));
    await screen.findByText('Lesson title is required.');

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByLabelText('Lesson Title')).not.toBeInTheDocument();
    expect(screen.queryByText('Lesson title is required.')).not.toBeInTheDocument();
  });
});

describe('CourseDetail - Resource modal validation', () => {
  beforeEach(() => {
    server.use(
      http.get('http://localhost:5000/api/instructor/courses/:courseId', () =>
        HttpResponse.json({ course: mockCourse }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: mockSections }),
      ),
    );
  });

  it('opens the resource form with default Link type and no free-video checkbox', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);

    expect(screen.getByLabelText('Resource Type')).toHaveValue('LINK');
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.queryByLabelText('Make this video free')).not.toBeInTheDocument();
  });

  it('shows a validation error when the URL is empty', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    expect(await screen.findByText('Resource URL is required.')).toBeInTheDocument();
  });

  it('shows a validation error when the URL is not well-formed', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);
    await user.type(screen.getByLabelText('URL'), 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    expect(await screen.findByText('Resource URL must be a valid URL.')).toBeInTheDocument();
  });

  it('does not call the API when the resource URL is invalid', async () => {
    const user = userEvent.setup();
    let resourceCreateCalled = false;

    server.use(
      http.post(
        'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources',
        () => {
          resourceCreateCalled = true;
          return HttpResponse.json({ resource: {} }, { status: 201 });
        },
      ),
    );

    renderCourseDetail();
    await createLessonAndOpenResourceForm(user);
    await user.type(screen.getByLabelText('URL'), 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    await screen.findByText('Resource URL must be a valid URL.');
    expect(resourceCreateCalled).toBe(false);
  });

  it('reveals the free-video checkbox only when the type is Video', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);

    expect(screen.queryByLabelText('Make this video free')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Resource Type'), 'VIDEO');
    expect(screen.getByLabelText('Make this video free')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Resource Type'), 'ARTICLE');
    expect(screen.queryByLabelText('Make this video free')).not.toBeInTheDocument();
  });

  it('unchecks the free-video flag when switching away from Video type', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);

    await user.selectOptions(screen.getByLabelText('Resource Type'), 'VIDEO');
    await user.click(screen.getByLabelText('Make this video free'));
    expect(screen.getByLabelText('Make this video free')).toBeChecked();

    await user.selectOptions(screen.getByLabelText('Resource Type'), 'LINK');
    await user.selectOptions(screen.getByLabelText('Resource Type'), 'VIDEO');

    expect(screen.getByLabelText('Make this video free')).not.toBeChecked();
  });

  it('creates a Link resource successfully with a valid URL', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;

    server.use(
      http.post(
        'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources',
        async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            {
              resource: {
                id: 'resource-1',
                type: 'LINK',
                url: 'https://react.dev/learn',
                isFree: false,
                order: 0,
                createdAt: '2024-01-15T10:00:00.000Z',
                updatedAt: '2024-01-15T10:00:00.000Z',
              },
            },
            { status: 201 },
          );
        },
      ),
    );

    renderCourseDetail();
    await createLessonAndOpenResourceForm(user);
    await user.type(screen.getByLabelText('URL'), 'https://react.dev/learn');
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    await waitFor(() => {
      expect(requestBody).toMatchObject({
        type: 'LINK',
        url: 'https://react.dev/learn',
        isFree: false,
      });
    });
  });

  it('creates a free Video resource when marked free', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;

    server.use(
      http.post(
        'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources',
        async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(
            {
              resource: {
                id: 'resource-2',
                type: 'VIDEO',
                url: 'https://videos.example.com/lesson-1',
                isFree: true,
                order: 0,
                createdAt: '2024-01-15T10:00:00.000Z',
                updatedAt: '2024-01-15T10:00:00.000Z',
              },
            },
            { status: 201 },
          );
        },
      ),
    );

    renderCourseDetail();
    await createLessonAndOpenResourceForm(user);
    await user.selectOptions(screen.getByLabelText('Resource Type'), 'VIDEO');
    await user.type(screen.getByLabelText('URL'), 'https://videos.example.com/lesson-1');
    await user.click(screen.getByLabelText('Make this video free'));
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    await waitFor(() => {
      expect(requestBody).toMatchObject({
        type: 'VIDEO',
        url: 'https://videos.example.com/lesson-1',
        isFree: true,
      });
    });
  });

  it('surfaces a server error message when resource creation fails', async () => {
    const user = userEvent.setup();

    server.use(
      http.post(
        'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources',
        () => HttpResponse.json({ error: 'Lesson not found.' }, { status: 404 }),
      ),
    );

    renderCourseDetail();
    await createLessonAndOpenResourceForm(user);
    await user.type(screen.getByLabelText('URL'), 'https://react.dev/learn');
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    expect(await screen.findByText('Lesson not found.')).toBeInTheDocument();
  });

  it('closes the resource form and clears errors when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await createLessonAndOpenResourceForm(user);
    await user.click(screen.getByRole('button', { name: /save resource/i }));
    await screen.findByText('Resource URL is required.');

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByLabelText('URL')).not.toBeInTheDocument();
    expect(screen.queryByText('Resource URL is required.')).not.toBeInTheDocument();
  });
});
