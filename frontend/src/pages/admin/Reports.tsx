import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../../services/api';
import '../../styles/Reports.css';

interface AdminReport {
  summary: {
    totalUsers: number;
    totalStudents: number;
    totalInstructors: number;
    pendingApprovals: number;
    totalCourses: number;
    completionRate: number;
  };
  monthlyActivity: Array<{
    month: string;
    newUsers: number;
    newCourses: number;
  }>;
  categoryDistribution: Array<{
    name: string;
    students: number;
  }>;
  coursePerformance: Array<{
    id: string;
    title: string;
    learnersStarted: number;
    completionRate: number;
  }>;
}

const chartColors = ['#667eea', '#8b5cf6', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4'];

async function fetchReport(): Promise<AdminReport> {
  const response = await api.get<AdminReport>('/admin/reports');
  return response.data;
}

function exportReport(report: AdminReport) {
  const rows = [
    ['Metric', 'Value'],
    ['Total users', report.summary.totalUsers],
    ['Students', report.summary.totalStudents],
    ['Instructors', report.summary.totalInstructors],
    ['Pending approvals', report.summary.pendingApprovals],
    ['Active courses', report.summary.totalCourses],
    ['Learner completion rate', `${report.summary.completionRate}%`],
    [],
    ['Monthly activity'],
    ['Month', 'New users', 'New courses'],
    ...report.monthlyActivity.map((month) => [month.month, month.newUsers, month.newCourses]),
    [],
    ['Student distribution by category'],
    ['Category', 'Students'],
    ...report.categoryDistribution.map((category) => [category.name, category.students]),
    [],
    ['Course performance'],
    ['Course', 'Learners started', 'Completion rate'],
    ...report.coursePerformance.map((course) => [
      course.title,
      course.learnersStarted,
      `${course.completionRate}%`,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'admin-report.csv';
  link.click();
  URL.revokeObjectURL(url);
}

function formatChartValue(value: string | number | ReadonlyArray<string | number> | undefined) {
  const number = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
  return Number.isFinite(number) ? number.toLocaleString() : '0';
}

export default function Reports() {
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: fetchReport,
  });

  const overviewStats = report
    ? [
        { label: 'Total users', value: report.summary.totalUsers.toLocaleString(), tone: 'blue' },
        { label: 'Active courses', value: report.summary.totalCourses.toLocaleString(), tone: 'purple' },
        { label: 'Pending approvals', value: report.summary.pendingApprovals.toLocaleString(), tone: 'orange' },
        { label: 'Learner completion', value: `${report.summary.completionRate}%`, tone: 'green' },
      ]
    : [];

  return (
    <div className="reports-page">
      <div className="reports-inner">
        <div className="reports-header">
          <div>
            <p className="eyebrow">Performance overview</p>
            <h1>Reports dashboard</h1>
          </div>
          <button
            type="button"
            className="export-button"
            disabled={!report}
            onClick={() => report && exportReport(report)}
          >
            Export report
          </button>
        </div>

        {isLoading && <p className="report-state" role="status">Loading report data…</p>}
        {isError && (
          <p className="report-state report-state--error" role="alert">
            Failed to load report data. Please refresh and try again.
          </p>
        )}

        {report && (
          <>
            <section className="overview-grid" aria-label="Key platform metrics">
              {overviewStats.map((stat) => (
                <article key={stat.label} className={`metric-card metric-card--${stat.tone}`}>
                  <p>{stat.label}</p>
                  <div className="metric-row">
                    <h2>{stat.value}</h2>
                  </div>
                </article>
              ))}
            </section>

            <section className="chart-grid">
              <article className="panel panel--wide">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Platform activity</p>
                    <h3>New users and courses</h3>
                  </div>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.monthlyActivity} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="userFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor="#667eea" stopOpacity={0.55} />
                          <stop offset="95%" stopColor="#667eea" stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip formatter={(value) => [formatChartValue(value)]} />
                      <Legend />
                      <Area type="monotone" dataKey="newUsers" stroke="#667eea" fill="url(#userFill)" name="New users" />
                      <Area type="monotone" dataKey="newCourses" stroke="#22c55e" fill="transparent" name="New courses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Learner distribution</p>
                    <h3>Students by category</h3>
                  </div>
                </div>
                {report.categoryDistribution.length === 0 ? (
                  <p className="report-empty">No category enrollment data yet.</p>
                ) : (
                  <>
                    <div className="chart-wrap small-chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={report.categoryDistribution} dataKey="students" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={4}>
                            {report.categoryDistribution.map((category, index) => (
                              <Cell key={category.name} fill={chartColors[index % chartColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => [formatChartValue(value), 'Students']} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="legend-list">
                      {report.categoryDistribution.map((category, index) => (
                        <div key={category.name} className="legend-item">
                          <span className="legend-swatch" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                          <span>{category.name}</span>
                          <strong>{category.students.toLocaleString()}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </article>

              <article className="panel panel--wide">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Learner progress</p>
                    <h3>Completion by course</h3>
                  </div>
                </div>
                {report.coursePerformance.length === 0 ? (
                  <p className="report-empty">No course data yet.</p>
                ) : (
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={report.coursePerformance} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                        <XAxis dataKey="title" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${formatChartValue(value)}%`, 'Completion']} />
                        <Bar dataKey="completionRate" name="Completion" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </article>

              <article className="panel panel--wide table-panel">
                <div className="panel-header">
                  <div>
                    <p className="eyebrow">Course performance</p>
                    <h3>Learner progress snapshot</h3>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Learners started</th>
                        <th>Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.coursePerformance.length === 0 ? (
                        <tr><td colSpan={3} className="report-empty">No course data yet.</td></tr>
                      ) : (
                        report.coursePerformance.map((course) => (
                          <tr key={course.id}>
                            <td>{course.title}</td>
                            <td>{course.learnersStarted.toLocaleString()}</td>
                            <td>{course.completionRate}%</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
