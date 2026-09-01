import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  },
  {
    id: 'section-2',
    title: 'Core Concepts',
    description: 'Learn components, JSX, and hooks',
    order: 1,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
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

// ─── Initial render ───────────────────────────────────────────────────────────

describe('CourseDetail', () => {
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

  describe('initial render', () => {
    it('renders loading state initially', () => {
      renderCourseDetail();
      expect(screen.getByText(/loading course/i)).toBeInTheDocument();
    });

    it('renders course details after loading', async () => {
      renderCourseDetail();

      await waitFor(() => {
        expect(screen.getByText('Introduction to React')).toBeInTheDocument();
      });

      expect(screen.getByText('Learn the basics of React.js')).toBeInTheDocument();
      expect(screen.getByText('Category: Programming')).toBeInTheDocument();
    });

    it('renders back button', async () => {
      renderCourseDetail();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back to courses/i })).toBeInTheDocument();
      });
    });

    it('renders sections list', async () => {
      renderCourseDetail();

      await waitFor(() => {
        expect(screen.getByText('1. Getting Started')).toBeInTheDocument();
        expect(screen.getByText('2. Core Concepts')).toBeInTheDocument();
      });

      expect(screen.getByText('Set up your development environment')).toBeInTheDocument();
      expect(screen.getByText('Learn components, JSX, and hooks')).toBeInTheDocument();
    });

    it('renders add section button', async () => {
      renderCourseDetail();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add section/i })).toBeInTheDocument();
      });
    });
  });

  // ─── Error handling ─────────────────────────────────────────────────────────

  describe('error handling', () => {
    it('renders error message when course fails to load', async () => {
      server.use(
        http.get('http://localhost:5000/api/instructor/courses/:courseId', () =>
          HttpResponse.json({ error: 'Not found' }, { status: 404 }),
        ),
      );

      renderCourseDetail();

      await waitFor(() => {
        expect(
          screen.getByText(
            /unable to load course\. the course may not exist or you don't have permission/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it('shows empty state when no sections exist', async () => {
      server.use(
        http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ sections: [] }),
        ),
      );

      renderCourseDetail();

      await waitFor(() => {
        expect(
          screen.getByText('No sections yet. Create one to get started!'),
        ).toBeInTheDocument();
      });
    });
  });

  // ─── Create section ───────────────────────────────────────────────────────────

  describe('create section', () => {
    it('shows form when add section button is clicked', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      expect(screen.getByLabelText('Section Title')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create section/i })).toBeInTheDocument();
    });

    it('hides form when close form button is clicked', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      const closeButton = screen.getByRole('button', { name: /close form/i });
      await user.click(closeButton);

      expect(screen.queryByLabelText('Section Title')).not.toBeInTheDocument();
    });

    it('creates a section with valid data', async () => {
      const user = userEvent.setup();
      const newSection = {
        id: 'section-3',
        title: 'Advanced Topics',
        description: 'Learn advanced React patterns',
        order: 2,
        createdAt: '2024-01-16T10:00:00.000Z',
        updatedAt: '2024-01-16T10:00:00.000Z',
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

      // Verify form closes and section is added
      await waitFor(() => {
        expect(screen.getByText('3. Advanced Topics')).toBeInTheDocument();
      });

      expect(screen.getByText('Learn advanced React patterns')).toBeInTheDocument();
      expect(titleInput).not.toBeInTheDocument();
    });

    it('shows error when title is empty', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      const createButton = screen.getByRole('button', { name: /create section/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Section title is required.')).toBeInTheDocument();
      });
    });

    it('shows error when section creation fails', async () => {
      const user = userEvent.setup();
      server.use(
        http.post('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 403 }),
        ),
      );

      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      const titleInput = screen.getByLabelText('Section Title');
      await user.type(titleInput, 'Test Section');

      const createButton = screen.getByRole('button', { name: /create section/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to create section/i)).toBeInTheDocument();
      });
    });

    it('disables create button while submitting', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      const titleInput = screen.getByLabelText('Section Title');
      await user.type(titleInput, 'Test Section');

      const createButton = screen.getByRole('button', { name: /create section/i });

      // Mock slow network
      server.use(
        http.post('http://localhost:5000/api/instructor/courses/:courseId/sections', async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({ section: mockSections[0] }, { status: 201 });
        }),
      );

      await user.click(createButton);

      // Button text should change to "Creating..."
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
      });
    });
  });

  // ─── Edit section ───────────────────────────────────────────────────────────

  describe('edit section', () => {
    it('shows edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const titleInput = screen.getByDisplayValue('Getting Started');
      const descInput = screen.getByDisplayValue('Set up your development environment');

      expect(titleInput).toBeInTheDocument();
      expect(descInput).toBeInTheDocument();
    });

    it('updates section with new data', async () => {
      const user = userEvent.setup();
      const updatedSection = {
        ...mockSections[0],
        title: 'Updated Getting Started',
        description: 'Updated description',
      };

      server.use(
        http.put(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          () => HttpResponse.json({ section: updatedSection }),
        ),
      );

      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const titleInput = screen.getByDisplayValue('Getting Started');
      const descInput = screen.getByDisplayValue('Set up your development environment');

      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Getting Started');
      await user.clear(descInput);
      await user.type(descInput, 'Updated description');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('1. Updated Getting Started')).toBeInTheDocument();
      });

      expect(screen.getByText('Updated description')).toBeInTheDocument();
    });

    it('cancels edit when cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Form should be closed, section title should be visible
      expect(screen.getByText('1. Getting Started')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('Getting Started')).not.toBeInTheDocument();
    });

    it('shows error when update fails', async () => {
      const user = userEvent.setup();
      server.use(
        http.put(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          () => HttpResponse.json({ error: 'Forbidden' }, { status: 403 }),
        ),
      );

      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      const editButton = screen.getAllByRole('button', { name: /edit/i })[0];
      await user.click(editButton);

      const titleInput = screen.getByDisplayValue('Getting Started');
      await user.clear(titleInput);
      await user.type(titleInput, 'New Title');

      const updateButton = screen.getByRole('button', { name: /update/i });
      await user.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(/unable to update section/i)).toBeInTheDocument();
      });
    });
  });

  // ─── Delete section ───────────────────────────────────────────────────────────

  describe('delete section', () => {
    it('deletes section when confirmed', async () => {
      const user = userEvent.setup();
      server.use(
        http.delete(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          () => HttpResponse.json({ deleted: true, title: 'Getting Started' }),
        ),
        http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ sections: [mockSections[1]] }),
        ),
      );

      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      // Mock window.confirm
      window.confirm = () => true;

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText('Getting Started')).not.toBeInTheDocument();
      });

      expect(screen.getByText('1. Core Concepts')).toBeInTheDocument();
    });

    it('cancels delete when not confirmed', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      // Mock window.confirm to return false
      window.confirm = () => false;

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      // Section should still be there
      expect(screen.getByText('1. Getting Started')).toBeInTheDocument();
    });

    it('shows error alert when deletion fails', async () => {
      const user = userEvent.setup();
      server.use(
        http.delete(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          () => HttpResponse.json({ error: 'Cannot delete' }, { status: 400 }),
        ),
      );

      renderCourseDetail();

      await screen.findByText('1. Getting Started');

      window.confirm = () => true;
      window.alert = vi.fn();

      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      await user.click(deleteButton);

      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });
    });
  });

  // ─── Navigation ───────────────────────────────────────────────────────────────

  describe('navigation', () => {
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

    it('closes form and clears error when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderCourseDetail();

      const addButton = await screen.findByRole('button', { name: /add section/i });
      await user.click(addButton);

      // Try to submit without title to trigger error
      const createButton = screen.getByRole('button', { name: /create section/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Section title is required.')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Form and error should be gone
      expect(screen.queryByLabelText('Section Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Section title is required.')).not.toBeInTheDocument();
    });
  });
});
