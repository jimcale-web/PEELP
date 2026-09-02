import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import '../../styles/StudentCourseCatalog.css';

interface StudentCourse {
  id: string;
  title: string;
  description: string | null;
  category: { id: string; name: string } | null;
  instructor: { id: string; name: string } | null;
  _count: { sections: number };
}

async function fetchStudentCourses(): Promise<StudentCourse[]> {
  const response = await api.get<{ courses: StudentCourse[] }>('/student/courses');
  return response.data.courses;
}

export default function CourseCatalog() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ['student', 'courses'],
    queryFn: fetchStudentCourses,
  });

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) {
      return courses;
    }

    return courses.filter((course) =>
      [course.title, course.description, course.category?.name, course.instructor?.name]
        .some((value) => value?.toLocaleLowerCase().includes(query)),
    );
  }, [courses, search]);

  return (
    <main className="student-course-catalog">
      <div className="student-course-catalog__content">
        <header className="student-course-catalog__header">
          <div>
            <p className="student-course-catalog__eyebrow">Learning library</p>
            <h1>Explore Courses</h1>
            <p>Find a course and start learning at your own pace.</p>
          </div>
          {!isLoading && <span className="student-course-catalog__count">{courses.length} courses</span>}
        </header>

        <label className="student-course-catalog__search" htmlFor="course-search">
          <span className="sr-only">Search courses</span>
          <input
            id="course-search"
            type="search"
            placeholder="Search courses, categories, or instructors"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {isError && (
          <p className="student-course-catalog__message student-course-catalog__message--error">
            Unable to load courses. Please refresh and try again.
          </p>
        )}

        {isLoading ? (
          <p className="student-course-catalog__message">Loading courses...</p>
        ) : filteredCourses.length === 0 ? (
          <p className="student-course-catalog__message">
            {courses.length === 0 ? 'No courses are available yet.' : 'No courses match your search.'}
          </p>
        ) : (
          <section className="student-course-grid" aria-label="Available courses">
            {filteredCourses.map((course) => (
              <article
                className="student-course-card"
                key={course.id}
                onClick={() => navigate(`/student/course/${course.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    navigate(`/student/course/${course.id}`);
                  }
                }}
              >
                <div className="student-course-card__category">
                  {course.category?.name ?? 'General'}
                </div>
                <h2>{course.title}</h2>
                <p className="student-course-card__description">
                  {course.description ?? 'Course details will be available soon.'}
                </p>
                <footer className="student-course-card__footer">
                  <span>{course.instructor?.name ?? 'PEELP instructor'}</span>
                  <span>{course._count.sections} {course._count.sections === 1 ? 'section' : 'sections'}</span>
                </footer>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
