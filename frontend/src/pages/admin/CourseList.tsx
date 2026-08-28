import { useState } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import '../../styles/CourseList.css';
import CreateCourseModal from '../../components/Admin/CreateCourseModal';
import EditCourseModal from '../../components/Admin/EditCourseModal';
import DeleteCourseModal from '../../components/Admin/DeleteCourseModal';
import type { CourseRow } from '../../components/Admin/EditCourseModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function fetchCourses(): Promise<CourseRow[]> {
  const res = await axios.get<{ courses: CourseRow[] }>(`${API_URL}/admin/courses`, {
    withCredentials: true,
  });
  return res.data.courses;
}

export default function CourseList() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [deletingCourse, setDeletingCourse] = useState<CourseRow | null>(null);

  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: fetchCourses,
  });

  const filtered = courses.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.instructor?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="user-list-container">
      <div className="user-list-card">
        <div className="user-list-header">
          <h1>Course Management</h1>
          <p>{isLoading ? '' : `${courses.length} total courses`}</p>
        </div>

        <div className="user-list-toolbar">
          <button className="btn-new-user" onClick={() => setShowCreateModal(true)}>
            + New Course
          </button>
        </div>

        <div className="user-list-filters">
          <input
            className="search-input"
            type="text"
            placeholder="Search by title or instructor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isError && <p className="state-message error">Failed to load courses. Please refresh.</p>}

        {isLoading ? (
          <p className="state-message">Loading courses…</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Instructor</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="no-results">No courses found.</td>
                  </tr>
                ) : (
                  filtered.map((course) => (
                    <tr key={course.id}>
                      <td>{course.title}</td>
                      <td className="cell-desc">
                        {course.description
                          ? course.description.length > 60
                            ? course.description.slice(0, 60) + '…'
                            : course.description
                          : <span className="text-muted">—</span>}
                      </td>
                      <td>
                        {course.instructor
                          ? course.instructor.name
                          : <span className="text-muted">Unassigned</span>}
                      </td>
                      <td>{new Date(course.createdAt).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-edit-user"
                          onClick={() => setEditingCourse(course)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete-user"
                          onClick={() => setDeletingCourse(course)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && <CreateCourseModal onClose={() => setShowCreateModal(false)} />}
      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
        />
      )}
      {deletingCourse && (
        <DeleteCourseModal
          course={deletingCourse}
          onClose={() => {
            setDeletingCourse(null);
            queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
          }}
        />
      )}
    </div>
  );
}
