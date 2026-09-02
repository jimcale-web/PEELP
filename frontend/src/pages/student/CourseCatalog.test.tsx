import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import CourseCatalog from './CourseCatalog';
import { server, STUDENT_COURSES_URL } from '../../test/server';

function renderCourseCatalog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CourseCatalog />
    </QueryClientProvider>,
  );
}

describe('CourseCatalog', () => {
  it('shows a loading message while fetching courses', () => {
    renderCourseCatalog();

    expect(screen.getByText(/loading courses/i)).toBeInTheDocument();
  });

  it('displays courses and their metadata', async () => {
    renderCourseCatalog();

    expect(await screen.findByText('Introduction to Python')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('Bob Instructor')).toBeInTheDocument();
    expect(screen.getByText('3 sections')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('PEELP instructor')).toBeInTheDocument();
    expect(screen.getByText('1 section')).toBeInTheDocument();
  });

  it('filters courses by title, category, and instructor', async () => {
    const user = userEvent.setup();
    renderCourseCatalog();
    await screen.findByText('Introduction to Python');

    await user.type(screen.getByRole('searchbox', { name: /search courses/i }), 'bob');

    expect(screen.getByText('Introduction to Python')).toBeInTheDocument();
    expect(screen.queryByText('Design Fundamentals')).not.toBeInTheDocument();
  });

  it('shows a helpful message when search has no matches', async () => {
    const user = userEvent.setup();
    renderCourseCatalog();
    await screen.findByText('Introduction to Python');

    await user.type(screen.getByRole('searchbox', { name: /search courses/i }), 'missing');

    expect(screen.getByText(/no courses match your search/i)).toBeInTheDocument();
  });

  it('shows an error message when loading courses fails', async () => {
    server.use(http.get(STUDENT_COURSES_URL, () => HttpResponse.json({}, { status: 500 })));
    renderCourseCatalog();

    expect(await screen.findByText(/unable to load courses/i)).toBeInTheDocument();
  });
});
