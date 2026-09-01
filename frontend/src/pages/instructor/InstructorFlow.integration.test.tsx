import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InstructorDashboard from './InstructorDashboard';
import CourseDetail from './CourseDetail';
import { server } from '../../test/server';

// ─── Mock data ─────────────────────────────────────────────────────────────

const mockCourses = [
  {
    id: 'course-1',
    title: 'React Basics',
    description: 'Learn React fundamentals',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Programming' },
    instructorId: 'instructor-1',
    instructor: { id: 'instructor-1', name: 'John' },
    createdAt: '2024-01-15T10:00:00.000Z',
  },
];

const mockCategories = [
  {
    id: 'cat-1',
    name: 'Programming',
    description: 'Programming courses',
    createdAt: '2024-01-01T10:00:00.000Z',
    updatedAt: '2024-01-01T10:00:00.000Z',
  },
];

// ─── Render helper ────────────────────────────────────────────────────────────

function renderInstructorFlow() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const router = createMemoryRouter(
    [
      {
        path: '/instructor',
        element: (
          <QueryClientProvider client={queryClient}>
            <InstructorDashboard />
          </QueryClientProvider>
        ),
      },
      {
        path: '/instructor/course/:courseId',
        element: (
          <QueryClientProvider client={queryClient}>
            <CourseDetail />
          </QueryClientProvider>
        ),
      },
    ],
    { initialEntries: ['/instructor'] },
  );

  render(<RouterProvider router={router} />);
  return { router, queryClient };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Instructor Course Flow: Create Course and Add Sections', () => {
  let createdCourseId: string;
  const newCourse = {
    id: 'course-2',
    title: 'Advanced TypeScript',
    description: 'Master TypeScript for production apps',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Programming' },
    instructorId: 'instructor-1',
    instructor: { id: 'instructor-1', name: 'John' },
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    createdCourseId = newCourse.id;

    // Set up default handlers
    server.use(
      http.get('http://localhost:5000/api/instructor/courses', () =>
        HttpResponse.json({ courses: mockCourses }),
      ),
      http.get('http://localhost:5000/api/instructor/categories', () =>
        HttpResponse.json({ categories: mockCategories }),
      ),
      http.post('http://localhost:5000/api/instructor/courses', async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json(
          {
            course: {
              ...newCourse,
              ...body,
            },
          },
          { status: 201 },
        );
      }),
      http.get('http://localhost:5000/api/instructor/courses/:courseId', ({ params }) => {
        const { courseId } = params;
        const course = courseId === 'course-1' ? mockCourses[0] : newCourse;
        return HttpResponse.json({ course });
      }),
      http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
        HttpResponse.json({ sections: [] }),
      ),
      http.post('http://localhost:5000/api/instructor/courses/:courseId/sections', 
        async ({ request }) => {
          const body = await request.json();
          return HttpResponse.json(
            {
              section: {
                id: 'section-new',
                ...body,
                order: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            },
            { status: 201 },
          );
        },
      ),
    );
  });

  describe('Full instructor workflow', () => {
    it('allows instructor to create a course and add sections', async () => {
      const user = userEvent.setup();
      renderInstructorFlow();

      // Step 1: Wait for dashboard to load with existing courses
      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
      });

      // Step 2: Click create course button
      const createCourseBtn = screen.getByRole('button', { name: /create course/i });
      await user.click(createCourseBtn);

      // Step 3: Fill in course details
      const titleInput = screen.getByPlaceholderText('Introduction to Python');
      const descInput = screen.getByPlaceholderText(
        'Describe what students will learn in this course',
      );
      const categorySelect = screen.getByDisplayValue('Select a category');

      await user.type(titleInput, 'Advanced TypeScript');
      await user.type(
        descInput,
        'Master TypeScript for production apps',
      );
      await user.selectOptions(categorySelect, 'cat-1');

      // Step 4: Submit course creation
      const saveButton = screen.getByRole('button', { name: /save course/i });
      await user.click(saveButton);

      // Step 5: Wait for course to be created and list updated
      await waitFor(() => {
        expect(screen.getByText(/close form/i)).toBeInTheDocument();
      });

      // Step 6: Find and click on the newly created course
      const courses = screen.getAllByText('Advanced TypeScript');
      const courseRow = courses[0].closest('tr');
      await user.click(courseRow!);

      // Step 7: Wait for course detail page to load
      await waitFor(() => {
        expect(screen.getByText('Advanced TypeScript')).toBeInTheDocument();
      });

      expect(screen.getByText('Master TypeScript for production apps')).toBeInTheDocument();

      // Step 8: Add first section
      const addSectionBtn = screen.getByRole('button', { name: /add section/i });
      await user.click(addSectionBtn);

      const sectionTitleInput = screen.getByLabelText('Section Title');
      const sectionDescInput = screen.getByLabelText('Description');

      await user.type(sectionTitleInput, 'TypeScript Fundamentals');
      await user.type(sectionDescInput, 'Learn TS basics: types, interfaces, and generics');

      const createSectionBtn = screen.getByRole('button', { name: /create section/i });
      await user.click(createSectionBtn);

      // Step 9: Verify first section was created
      await waitFor(() => {
        expect(screen.getByText('1. TypeScript Fundamentals')).toBeInTheDocument();
      });

      expect(screen.getByText('Learn TS basics: types, interfaces, and generics')).toBeInTheDocument();

      // Step 10: Add second section
      const addSectionBtn2 = screen.getByRole('button', { name: /add section/i });
      await user.click(addSectionBtn2);

      const sectionTitleInput2 = screen.getByLabelText('Section Title');
      const sectionDescInput2 = screen.getByLabelText('Description');

      await user.type(sectionTitleInput2, 'Advanced Patterns');
      await user.type(
        sectionDescInput2,
        'Master decorators, mixins, and advanced type patterns',
      );

      const createSectionBtn2 = screen.getByRole('button', { name: /create section/i });
      await user.click(createSectionBtn2);

      // Step 11: Verify both sections exist
      await waitFor(() => {
        expect(screen.getByText('2. Advanced Patterns')).toBeInTheDocument();
      });

      expect(screen.getByText('1. TypeScript Fundamentals')).toBeInTheDocument();
      expect(screen.getByText('Learn TS basics: types, interfaces, and generics')).toBeInTheDocument();
      expect(screen.getByText('Master decorators, mixins, and advanced type patterns')).toBeInTheDocument();
    });

    it('allows editing a section after creation', async () => {
      const user = userEvent.setup();

      // Mock sections endpoint with existing section
      const existingSection = {
        id: 'section-1',
        title: 'Original Title',
        description: 'Original description',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      server.use(
        http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ sections: [existingSection] }),
        ),
        http.put(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          async ({ request }) => {
            const body = await request.json();
            return HttpResponse.json({
              section: {
                ...existingSection,
                ...body,
                updatedAt: new Date().toISOString(),
              },
            });
          },
        ),
      );

      renderInstructorFlow();

      // Navigate to course detail
      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
      });

      const courseRow = screen.getByText('React Basics').closest('tr');
      await user.click(courseRow!);

      // Wait for course and section to load
      await waitFor(() => {
        expect(screen.getByText('1. Original Title')).toBeInTheDocument();
      });

      // Click edit
      const editBtn = screen.getByRole('button', { name: /edit/i });
      await user.click(editBtn);

      // Update section
      const titleInput = screen.getByDisplayValue('Original Title');
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');

      const updateBtn = screen.getByRole('button', { name: /update/i });
      await user.click(updateBtn);

      // Verify update
      await waitFor(() => {
        expect(screen.getByText('1. Updated Title')).toBeInTheDocument();
      });

      expect(screen.queryByText('1. Original Title')).not.toBeInTheDocument();
    });

    it('allows deleting a section', async () => {
      const user = userEvent.setup();

      const existingSection = {
        id: 'section-1',
        title: 'Section to Delete',
        description: 'This will be deleted',
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      server.use(
        http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ sections: [existingSection] }),
        ),
        http.delete(
          'http://localhost:5000/api/instructor/courses/:courseId/sections/:sectionId',
          () => HttpResponse.json({ deleted: true, title: 'Section to Delete' }),
        ),
        http.get('http://localhost:5000/api/instructor/courses/:courseId/sections', () =>
          HttpResponse.json({ sections: [] }),
        ),
      );

      renderInstructorFlow();

      // Navigate to course
      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
      });

      const courseRow = screen.getByText('React Basics').closest('tr');
      await user.click(courseRow!);

      // Wait for section to load
      await waitFor(() => {
        expect(screen.getByText('1. Section to Delete')).toBeInTheDocument();
      });

      // Mock confirm to return true
      window.confirm = () => true;

      // Click delete
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteBtn);

      // Verify section is deleted
      await waitFor(() => {
        expect(screen.getByText('No sections yet. Create one to get started!')).toBeInTheDocument();
      });

      expect(screen.queryByText('1. Section to Delete')).not.toBeInTheDocument();
    });

    it('shows validation error when creating course without title', async () => {
      const user = userEvent.setup();
      renderInstructorFlow();

      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
      });

      const createCourseBtn = screen.getByRole('button', { name: /create course/i });
      await user.click(createCourseBtn);

      // Try to submit without filling title
      const saveButton = screen.getByRole('button', { name: /save course/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Course title is required.')).toBeInTheDocument();
      });

      // Form should still be open
      expect(screen.getByPlaceholderText('Introduction to Python')).toBeInTheDocument();
    });
  });

  describe('Back navigation', () => {
    it('navigates back to dashboard when back button is clicked', async () => {
      const user = userEvent.setup();
      renderInstructorFlow();

      // Load dashboard
      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
      });

      // Click on course
      const courseRow = screen.getByText('React Basics').closest('tr');
      await user.click(courseRow!);

      // Wait for course detail
      await waitFor(() => {
        expect(screen.getByText('React Basics')).toBeInTheDocument();
        expect(screen.getByText(/learn react fundamentals/i)).toBeInTheDocument();
      });

      // Click back button
      const backBtn = screen.getByRole('button', { name: /back to courses/i });
      await user.click(backBtn);

      // Should be back on dashboard
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /instructor dashboard/i })).toBeInTheDocument();
      });
    });
  });
});
