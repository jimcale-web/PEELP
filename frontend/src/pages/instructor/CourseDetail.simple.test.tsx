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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CourseDetail Component', () => {
  beforeEach(() => {
    // Set up default handlers for course and sections endpoints
    server.use(
      http.get('http://localhost:5000/api/instructor/courses/:courseId', () =>
        HttpResponse.json({ course: mockCourse }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: mockSections }),
      ),
    );
  });

  it('renders course details', async () => {
    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('Introduction to React')).toBeInTheDocument();
    });

    expect(screen.getByText('Learn the basics of React.js')).toBeInTheDocument();
    expect(screen.getByText('Category: Programming')).toBeInTheDocument();
  });

  it('renders existing sections', async () => {
    renderCourseDetail();

    await waitFor(() => {
      expect(screen.getByText('1. Getting Started')).toBeInTheDocument();
    });

    expect(screen.getByText('Set up your development environment')).toBeInTheDocument();
  });

  it('opens section form when add section button is clicked', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    const addButton = await screen.findByRole('button', { name: /add section/i });
    await user.click(addButton);

    expect(screen.getByLabelText('Section Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('creates a new section', async () => {
    const user = userEvent.setup();
    const newSection = {
      id: 'section-2',
      title: 'Advanced Topics',
      description: 'Learn advanced React patterns',
      order: 1,
      createdAt: '2024-01-16T10:00:00.000Z',
      updatedAt: '2024-01-16T10:00:00.000Z',
      lessons: [],
    };

    server.use(
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ section: newSection }, { status: 201 }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: [...mockSections, newSection] }),
      ),
    );

    renderCourseDetail();

    // Wait for initial load
    await screen.findByText('1. Getting Started');

    // Open form
    const addButton = screen.getByRole('button', { name: /add section/i });
    await user.click(addButton);

    // Fill form
    const titleInput = screen.getByLabelText('Section Title');
    const descInput = screen.getByLabelText('Description');
    await user.type(titleInput, 'Advanced Topics');
    await user.type(descInput, 'Learn advanced React patterns');

    // Submit
    const createButton = screen.getByRole('button', { name: /create section/i });
    await user.click(createButton);

    // Verify section is added
    await waitFor(() => {
      expect(screen.getByText('2. Advanced Topics')).toBeInTheDocument();
    });
  });

  it('creates a lesson and adds a resource to it', async () => {
    const user = userEvent.setup();
    let resourceAdded = false;

    const newLesson = {
      id: 'lesson-1',
      title: 'Props and State',
      description: 'Understand component state and props',
      order: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
      resources: [],
    };
    const newResource = {
      id: 'resource-1',
      title: 'React Docs',
      type: 'LINK',
      url: 'https://react.dev/learn/state-a-as-a-snapshot',
      description: 'Official guide to state',
      order: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-15T10:00:00.000Z',
    };

    server.use(
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons', () =>
        HttpResponse.json({ lesson: newLesson }, { status: 201 }),
      ),
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId/lessons/:lessonId/resources', async ({ request }) => {
        expect(await request.json()).toMatchObject({
          type: 'VIDEO',
          url: 'https://react.dev/learn/state-a-as-a-snapshot',
          isFree: true,
        });
        resourceAdded = true;
        return HttpResponse.json({ resource: { ...newResource, type: 'VIDEO', isFree: true } }, { status: 201 });
      }),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({
          sections: [{
            ...mockSections[0],
            lessons: resourceAdded ? [{ ...newLesson, resources: [newResource] }] : [newLesson],
          }],
        }),
      ),
    );

    renderCourseDetail();
    await screen.findByText('1. Getting Started');

    await user.click(screen.getByRole('button', { name: /add lesson/i }));
    await user.type(screen.getByLabelText('Lesson Title'), 'Props and State');
    await user.type(screen.getByLabelText('Lesson Description'), 'Understand component state and props');
    await user.click(screen.getByRole('button', { name: /create lesson/i }));

    await waitFor(() => {
      expect(screen.getByText('1. Props and State')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /add resource/i }));
    await user.selectOptions(screen.getByLabelText('Resource Type'), 'VIDEO');
    await user.type(screen.getByLabelText('URL'), 'https://react.dev/learn/state-a-as-a-snapshot');
    await user.click(screen.getByLabelText('Make this video free'));
    await user.click(screen.getByRole('button', { name: /save resource/i }));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open/i })).toBeInTheDocument();
    });
  });

  it('edits an existing section', async () => {
    const user = userEvent.setup();
    const updatedSection = {
      ...mockSections[0],
      title: 'Updated Getting Started',
    };

    renderCourseDetail();

    await screen.findByText('1. Getting Started');

    // Set up handlers for update and refetch
    server.use(
      http.put('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId', () =>
        HttpResponse.json({ section: updatedSection }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: [updatedSection, ...mockSections.slice(1)] }),
      ),
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    const titleInput = screen.getByDisplayValue('Getting Started');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated Getting Started');

    const updateButton = screen.getByRole('button', { name: /update/i });
    await user.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('1. Updated Getting Started')).toBeInTheDocument();
    });
  });

  it('deletes a section', async () => {
    const user = userEvent.setup();
    
    renderCourseDetail();

    // Wait for initial load
    await screen.findByText('1. Getting Started');

    // Set up handlers for delete and refetch
    server.use(
      http.delete('http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId', () =>
        HttpResponse.json({ deleted: true, title: 'Getting Started' }),
      ),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: [] }),
      ),
    );

    window.confirm = () => true;

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText('No sections yet. Create one to get started!')).toBeInTheDocument();
    });
  });

  it('navigates back to instructor dashboard', async () => {
    const user = userEvent.setup();
    renderCourseDetail();

    await screen.findByText('Introduction to React');

    const backButton = screen.getByRole('button', { name: /back to courses/i });
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByTestId('instructor-dashboard')).toBeInTheDocument();
    });
  });

  it('shows error when course fails to load', async () => {
    server.use(
      http.get('http://localhost:5000/api/instructor/courses/:courseId', () =>
        HttpResponse.json({ error: 'Not found' }, { status: 404 }),
      ),
    );

    renderCourseDetail();

    await waitFor(() => {
      expect(
        screen.getByText(/unable to load course\. the course may not exist/i),
      ).toBeInTheDocument();
    });
  });
});
