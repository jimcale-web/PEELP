import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseReport from './CourseReport';
import { server } from '../../test/server';

describe('CourseReport', () => {
  it('shows enrollment, completion, and lesson performance from the report API', async () => {
    server.use(
      http.get('http://localhost:5000/api/instructor/courses/course-1/report', () =>
        HttpResponse.json({
          course: { id: 'course-1', title: 'Introduction to Python' },
          enrollmentCount: 12,
          completedLearners: 3,
          completionRate: 25,
          lessonCount: 2,
          averageProgressRate: 58,
          sections: [{
            id: 'section-1',
            title: 'Getting Started',
            lessons: [{
              id: 'lesson-1',
              title: 'Python Basics',
              completedCount: 7,
              completionRate: 58,
            }],
          }],
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter initialEntries={['/instructor/course/course-1/report']}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/instructor/course/:courseId/report" element={<CourseReport />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Introduction to Python' })).toBeInTheDocument();
    expect(screen.getByText('Active course enrollments')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getAllByText('58%')).toHaveLength(2);
    expect(screen.getByText('Python Basics')).toBeInTheDocument();
    expect(screen.getByText('7 / 12')).toBeInTheDocument();
  });
});
