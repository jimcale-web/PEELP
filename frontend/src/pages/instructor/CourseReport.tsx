import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import '../../styles/CourseReport.css';

interface CourseReportData {
  course: { id: string; title: string };
  enrollmentCount: number;
  completedLearners: number;
  completionRate: number;
  lessonCount: number;
  averageProgressRate: number;
  sections: {
    id: string;
    title: string;
    lessons: {
      id: string;
      title: string;
      completedCount: number;
      completionRate: number;
    }[];
  }[];
}

async function fetchCourseReport(courseId: string): Promise<CourseReportData> {
  const response = await api.get<CourseReportData>(`/instructor/courses/${courseId}/report`);
  return response.data;
}

export default function CourseReport() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['instructor', 'course-report', courseId],
    queryFn: () => fetchCourseReport(courseId!),
    enabled: Boolean(courseId),
  });

  if (isLoading) {
    return <main className="course-report"><p className="course-report__message">Loading course report...</p></main>;
  }

  if (isError || !report) {
    return (
      <main className="course-report">
        <p className="course-report__message course-report__message--error">
          Unable to load this course report. Please try again.
        </p>
      </main>
    );
  }

  const lessons = report.sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ ...lesson, sectionTitle: section.title })),
  );

  return (
    <main className="course-report">
      <div className="course-report__content">
        <header className="course-report__header">
          <div>
            <button
              type="button"
              className="course-report__back"
              onClick={() => navigate(`/instructor/course/${report.course.id}`)}
            >
              ← Back to course
            </button>
            <p className="course-report__eyebrow">Course performance</p>
            <h1>{report.course.title}</h1>
          </div>
        </header>

        <section className="course-report__metrics" aria-label="Course performance metrics">
          <article className="course-report__metric">
            <p>Active course enrollments</p>
            <strong>{report.enrollmentCount}</strong>
            <span>Approved students enrolled in this course or its active category</span>
          </article>
          <article className="course-report__metric">
            <p>Course completion rate</p>
            <strong>{report.completionRate}%</strong>
            <span>{report.completedLearners} of {report.enrollmentCount} learners completed every lesson</span>
          </article>
          <article className="course-report__metric">
            <p>Average lesson progress</p>
            <strong>{report.averageProgressRate}%</strong>
            <span>Completed lessons across all active course enrollments</span>
          </article>
          <article className="course-report__metric">
            <p>Active lessons</p>
            <strong>{report.lessonCount}</strong>
            <span>Lessons counted toward course completion</span>
          </article>
        </section>

        <section className="course-report__panel" aria-labelledby="lesson-performance-title">
          <div className="course-report__panel-header">
            <div>
              <p className="course-report__eyebrow">Learner progress</p>
              <h2 id="lesson-performance-title">Lesson performance</h2>
            </div>
          </div>
          {lessons.length === 0 ? (
            <p className="course-report__message">Add lessons to this course to see completion metrics.</p>
          ) : (
            <div className="course-report__table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Lesson</th>
                    <th>Completed learners</th>
                    <th>Completion rate</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => (
                    <tr key={lesson.id}>
                      <td>{lesson.sectionTitle}</td>
                      <td>{lesson.title}</td>
                      <td>{lesson.completedCount} / {report.enrollmentCount}</td>
                      <td>{lesson.completionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
