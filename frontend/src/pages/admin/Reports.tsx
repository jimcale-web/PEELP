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
import '../../styles/Reports.css';

const overviewStats = [
  { label: 'Total users', value: '24.8K', change: '+12.4%', tone: 'blue' },
  { label: 'Enrollments', value: '8.6K', change: '+8.1%', tone: 'purple' },
  { label: 'Revenue', value: '$94.2K', change: '+15.7%', tone: 'green' },
  { label: 'Completion rate', value: '81%', change: '+4.2%', tone: 'orange' },
];

const revenueTrend = [
  { month: 'Jan', revenue: 10400, target: 9200 },
  { month: 'Feb', revenue: 11850, target: 9800 },
  { month: 'Mar', revenue: 12600, target: 10200 },
  { month: 'Apr', revenue: 14180, target: 12000 },
  { month: 'May', revenue: 16320, target: 13600 },
  { month: 'Jun', revenue: 18240, target: 15100 },
];

const coursePerformance = [
  { course: 'English', students: 458, revenue: 12200 },
  { course: 'IT Basics', students: 372, revenue: 9800 },
  { course: 'Marketing', students: 312, revenue: 8700 },
  { course: 'Design', students: 284, revenue: 7200 },
  { course: 'Business', students: 246, revenue: 6900 },
  { course: 'Data Skills', students: 201, revenue: 6100 },
];

const subscriptionMix = [
  { name: 'Monthly', value: 42, color: '#667eea' },
  { name: 'Quarterly', value: 27, color: '#8b5cf6' },
  { name: 'Annual', value: 23, color: '#22c55e' },
  { name: 'Category', value: 8, color: '#f59e0b' },
];

const completionTrend = [
  { name: 'Beginner', rate: 86 },
  { name: 'Intermediate', rate: 79 },
  { name: 'Advanced', rate: 68 },
  { name: 'Certification', rate: 72 },
];

const recentCourses = [
  { name: 'English Communication', enrollments: 146, completion: 82, revenue: '$18.4K' },
  { name: 'Web Fundamentals', enrollments: 128, completion: 76, revenue: '$15.1K' },
  { name: 'Digital Marketing', enrollments: 119, completion: 74, revenue: '$13.9K' },
  { name: 'Data Analytics', enrollments: 102, completion: 81, revenue: '$12.6K' },
];

const formatNumberValue = (value: string | number | ReadonlyArray<string | number> | undefined) => {
  const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);

  return Number.isFinite(numericValue) ? numericValue : 0;
};

export default function Reports() {
  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <p className="eyebrow">Performance overview</p>
          <h1>Reports dashboard</h1>
        </div>
        <button type="button" className="export-button">
          Export report
        </button>
      </div>

      <section className="overview-grid" aria-label="Key platform metrics">
        {overviewStats.map((stat) => (
          <article key={stat.label} className={`metric-card metric-card--${stat.tone}`}>
            <p>{stat.label}</p>
            <div className="metric-row">
              <h2>{stat.value}</h2>
              <span>{stat.change}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="chart-grid">
        <article className="panel panel--wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Revenue</p>
              <h3>Monthly performance</h3>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`$${formatNumberValue(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                <Area type="monotone" dataKey="target" stroke="#cbd5e1" strokeWidth={2} fill="transparent" name="Target" />
                <Area type="monotone" dataKey="revenue" stroke="#667eea" strokeWidth={3} fill="url(#revenueFill)" name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Customer mix</p>
              <h3>Subscriptions</h3>
            </div>
          </div>
          <div className="chart-wrap small-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={subscriptionMix} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={4}>
                  {subscriptionMix.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${formatNumberValue(value)}%`, 'Share']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="legend-list">
            {subscriptionMix.map((item) => (
              <div key={item.name} className="legend-item">
                <span className="legend-swatch" style={{ backgroundColor: item.color }} />
                <span>{item.name}</span>
                <strong>{item.value}%</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel panel--wide">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Learner progress</p>
              <h3>Course completion by track</h3>
            </div>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionTrend} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip formatter={(value) => [`${formatNumberValue(value)}%`, 'Completion']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Bar dataKey="rate" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel panel--wide table-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Top courses</p>
              <h3>Performance snapshot</h3>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Enrollments</th>
                  <th>Completion</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.map((course) => (
                  <tr key={course.name}>
                    <td>{course.name}</td>
                    <td>{course.enrollments}</td>
                    <td>{course.completion}%</td>
                    <td>{course.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="table-panel panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Course activity</p>
            <h3>Enrollment by program</h3>
          </div>
        </div>
        <div className="chart-wrap tall-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={coursePerformance} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="course" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip formatter={(value) => [formatNumberValue(value).toLocaleString(), 'Students']} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
              <Bar dataKey="students" fill="#22c55e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
