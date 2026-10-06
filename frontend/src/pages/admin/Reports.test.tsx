import { render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, it, expect, vi } from 'vitest';
import Reports from './Reports';
import { API_URL } from '../../services/api';
import { server } from '../../test/server';

const REPORT_URL = `${API_URL}/admin/reports`;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const reportData = {
  summary: {
    totalUsers: 18,
    totalStudents: 12,
    totalInstructors: 4,
    pendingApprovals: 2,
    totalCourses: 3,
    completionRate: 50,
  },
  monthlyActivity: [
    { month: 'May 2026', newUsers: 1, newCourses: 0 },
    { month: 'Jun 2026', newUsers: 2, newCourses: 1 },
  ],
  categoryDistribution: [
    { name: 'Programming', students: 8 },
    { name: 'Design', students: 4 },
  ],
  coursePerformance: [
    { id: 'course-1', title: 'Intro to TypeScript', learnersStarted: 6, completionRate: 50 },
    { id: 'course-2', title: 'Design Basics', learnersStarted: 2, completionRate: 100 },
  ],
};

function renderReports() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Reports />
    </QueryClientProvider>,
  );
}

describe('Reports', () => {
  it('shows loading while fetching current report data', () => {
    server.use(http.get(REPORT_URL, () => new Promise(() => {})));
    renderReports();
    expect(screen.getByRole('status')).toHaveTextContent(/loading report data/i);
  });

  it('renders live summary metrics, category data, and course performance', async () => {
    server.use(http.get(REPORT_URL, () => HttpResponse.json(reportData)));
    renderReports();

    const overview = await screen.findByLabelText('Key platform metrics');
    expect(within(overview).getByText('18')).toBeInTheDocument();
    expect(within(overview).getByText('3')).toBeInTheDocument();
    expect(within(overview).getByText('2')).toBeInTheDocument();
    expect(within(overview).getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('New users and courses')).toBeInTheDocument();
    expect(screen.getByText('Students by category')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();

    const table = document.querySelector<HTMLElement>('.table-panel table');
    expect(table).toBeInTheDocument();
    expect(within(table!).getByText('Intro to TypeScript')).toBeInTheDocument();
    expect(within(table!).getByText('Design Basics')).toBeInTheDocument();
    expect(within(table!).getByText('6')).toBeInTheDocument();
    expect(within(table!).getByText('100%')).toBeInTheDocument();
  });

  it('shows an explicit error when the report request fails', async () => {
    server.use(http.get(REPORT_URL, () => HttpResponse.json({}, { status: 500 })));
    renderReports();
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed to load report data/i);
  });

  it('shows empty states when the database has no course or category data', async () => {
    server.use(http.get(REPORT_URL, () => HttpResponse.json({
      ...reportData,
      categoryDistribution: [],
      coursePerformance: [],
    })));
    renderReports();

    expect(await screen.findByText(/no category enrollment data yet/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no course data yet/i)).toHaveLength(2);
  });

  it('provides a working report export action after data loads', async () => {
    server.use(http.get(REPORT_URL, () => HttpResponse.json(reportData)));
    renderReports();
    await screen.findByText('New users and courses');

    const createObjectURL = vi.fn(() => 'blob:report');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() });

    const exportButton = await screen.findByRole('button', { name: /export report/i });
    expect(exportButton).toBeEnabled();
    exportButton.click();
    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
  });
});
