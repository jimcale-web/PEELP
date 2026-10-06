import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LessonPlayer from './LessonPlayer';
import { server } from '../../test/server';

const course = {
  id: 'course-1',
  title: 'Introduction to Python',
  description: null,
  instructor: { id: 'instructor-1', name: 'Bob Instructor' },
  category: { id: 'category-1', name: 'Programming' },
};

const sections = [{
  id: 'section-1',
  title: 'Getting Started',
  description: null,
  order: 0,
  lessons: [{
    id: 'lesson-1',
    title: 'Python Basics',
    description: null,
    order: 0,
    resources: [{
      id: 'resource-1',
      type: 'VIDEO',
      url: null,
      isFree: false,
      order: 0,
      locked: false,
    }],
  }],
}];

describe('LessonPlayer progress', () => {
  it('navigates to previous and next videos in course order', async () => {
    const user = userEvent.setup();
    const videoSections = [{
      ...sections[0],
      lessons: [
        sections[0].lessons[0],
        {
          id: 'lesson-2',
          title: 'Advanced Python',
          description: null,
          order: 1,
          resources: [{
            id: 'resource-2',
            type: 'VIDEO',
            url: null,
            isFree: true,
            order: 0,
            locked: false,
          }],
        },
      ],
    }];
    server.use(
      http.get('http://localhost:5000/api/student/courses/course-1', () =>
        HttpResponse.json({ course, hasAccess: true }),
      ),
      http.get('http://localhost:5000/api/student/courses/course-1/sections', () =>
        HttpResponse.json({
          sections: videoSections,
          hasAccess: true,
          canTrackProgress: false,
          completedLessonIds: [],
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter initialEntries={['/student/course/course-1']}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/student/course/:courseId" element={<LessonPlayer />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Python Basics' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous video' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next video' }));
    expect(await screen.findByRole('heading', { name: 'Advanced Python' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous video' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next video' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous video' }));
    expect(await screen.findByRole('heading', { name: 'Python Basics' })).toBeInTheDocument();
  });

  it('shows resource tabs for a locked lesson', async () => {
    const lockedSections = [{
      ...sections[0],
      lessons: [{
        ...sections[0].lessons[0],
        resources: [{ ...sections[0].lessons[0].resources[0], locked: true }],
      }],
    }];
    server.use(
      http.get('http://localhost:5000/api/student/courses/course-1', () =>
        HttpResponse.json({ course, hasAccess: false }),
      ),
      http.get('http://localhost:5000/api/student/courses/course-1/sections', () =>
        HttpResponse.json({
          sections: lockedSections,
          hasAccess: false,
          canTrackProgress: false,
          completedLessonIds: [],
        }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter initialEntries={['/student/course/course-1']}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/student/course/:courseId" element={<LessonPlayer />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: /VIDEO/ })).toBeInTheDocument();
  });

  it('lets an enrolled student mark a lesson complete and incomplete', async () => {
    const user = userEvent.setup();
    const progressUpdates: { completed: boolean }[] = [];

    server.use(
      http.get('http://localhost:5000/api/student/courses/course-1', () =>
        HttpResponse.json({ course, hasAccess: true }),
      ),
      http.get('http://localhost:5000/api/student/courses/course-1/sections', () =>
        HttpResponse.json({
          sections,
          hasAccess: true,
          canTrackProgress: true,
          completedLessonIds: progressUpdates.length > 0 && progressUpdates.at(-1)?.completed
            ? ['lesson-1']
            : [],
        }),
      ),
      http.put(
        'http://localhost:5000/api/student/courses/course-1/lessons/lesson-1/progress',
        async ({ request }) => {
          progressUpdates.push(await request.json() as { completed: boolean });
          return HttpResponse.json({ completed: progressUpdates.at(-1)?.completed });
        },
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <MemoryRouter initialEntries={['/student/course/course-1']}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/student/course/:courseId" element={<LessonPlayer />} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /VIDEO/ })).not.toBeInTheDocument();
    const openCurriculumButton = screen.getByRole('button', { name: 'Open course curriculum' });
    await user.click(openCurriculumButton);
    expect(openCurriculumButton).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: 'Close course curriculum' }));
    expect(openCurriculumButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Mark lesson complete' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mark lesson complete' }));

    expect(await screen.findByText('1 of 1 lessons complete')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark incomplete' })).toBeInTheDocument();
    expect(progressUpdates).toEqual([{ completed: true }]);

    await user.click(screen.getByRole('button', { name: 'Mark incomplete' }));
    await waitFor(() => expect(progressUpdates).toEqual([{ completed: true }, { completed: false }]));
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark lesson complete' })).toBeInTheDocument();
  });
});
