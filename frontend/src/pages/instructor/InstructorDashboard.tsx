import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api, { API_ORIGIN } from '../../services/api';
import '../../styles/InstructorDashboard.css';

interface Category {
  id: string;
  name: string;
}

interface CourseRow {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  category?: { id: string; name: string } | null;
  createdAt: string;
}

function resolveThumbnailUrl(thumbnailUrl?: string | null): string | null {
  if (!thumbnailUrl) return null;
  return thumbnailUrl.startsWith('http') ? thumbnailUrl : `${API_ORIGIN}${thumbnailUrl}`;
}

async function fetchInstructorCourses(): Promise<CourseRow[]> {
  const res = await api.get<{ courses: CourseRow[] }>('/instructor/courses');
  return res.data.courses;
}

async function fetchCategories(): Promise<Category[]> {
  const res = await api.get<{ categories: Category[] }>('/instructor/categories');
  return res.data.categories;
}

export default function InstructorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ['instructor', 'courses'],
    queryFn: fetchInstructorCourses,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['instructor', 'categories'],
    queryFn: fetchCategories,
  });

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setThumbnailFile(file);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(file ? URL.createObjectURL(file) : null);
  };

  const handleRemoveThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (categoryId) {
        formData.append('categoryId', categoryId);
      }
      if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
      }
      await api.post('/instructor/courses', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTitle('');
      setDescription('');
      setCategoryId('');
      handleRemoveThumbnail();
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'courses'] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Unable to create this course. Please try again.');
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError('Unable to create this course. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCourseClick = (courseId: string) => {
    navigate(`/instructor/course/${courseId}`);
  };

  return (
    <div className="instructor-dashboard-container">
      <div className="instructor-dashboard-card">
        <div className="instructor-header">
          <div>
            <h1>Instructor Dashboard</h1>
            <p>Welcome back, {user?.name ?? 'Instructor'}.</p>
          </div>
          <span className="instructor-status">{user?.role === 'ADMIN' ? 'Admin Instructor' : 'Instructor'}</span>
        </div>

        <div className="instructor-toolbar">
          <button
            type="button"
            className="instructor-create-btn"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? 'Close Form' : '+ Create Course'}
          </button>
        </div>

        {showCreateForm && (
          <form className="instructor-form" onSubmit={handleSubmit}>
            <div className="instructor-form-grid">
              <div className="instructor-field">
                <label htmlFor="course-title">Course title</label>
                <input
                  id="course-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Introduction to Python"
                />
              </div>

              <div className="instructor-field">
                <label htmlFor="course-category">Category</label>
                <select
                  id="course-category"
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="instructor-field">
              <label htmlFor="course-description">Description</label>
              <textarea
                id="course-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Describe what students will learn in this course"
              />
            </div>

            <div className="instructor-field">
              <label htmlFor="course-thumbnail">Thumbnail image</label>
              <input
                id="course-thumbnail"
                type="file"
                accept="image/*"
                onChange={handleThumbnailChange}
              />
              {thumbnailPreview && (
                <div className="instructor-thumbnail-preview">
                  <img src={thumbnailPreview} alt="Thumbnail preview" />
                  <button type="button" className="instructor-thumbnail-remove-btn" onClick={handleRemoveThumbnail}>
                    Remove
                  </button>
                </div>
              )}
            </div>

            {error && <div className="instructor-error">{error}</div>}

            <div className="instructor-form-actions">
              <button
                type="button"
                className="instructor-cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                  handleRemoveThumbnail();
                }}
              >
                Cancel
              </button>
              <button type="submit" className="instructor-submit-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Save Course'}
              </button>
            </div>
          </form>
        )}

        {isError ? (
          <div className="instructor-error">Unable to load your courses right now.</div>
        ) : null}

        {isLoading ? (
          <p className="instructor-empty">Loading courses…</p>
        ) : courses.length === 0 ? (
          <div className="instructor-empty">You do not have any courses yet.</div>
        ) : (
          <table className="instructor-course-list">
            <thead>
              <tr>
                <th>Thumbnail</th>
                <th>Course</th>
                <th>Category</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id} onClick={() => handleCourseClick(course.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    {resolveThumbnailUrl(course.thumbnailUrl) ? (
                      <img
                        className="instructor-course-thumbnail"
                        src={resolveThumbnailUrl(course.thumbnailUrl)!}
                        alt={`${course.title} thumbnail`}
                      />
                    ) : (
                      <div className="instructor-course-thumbnail-placeholder">No image</div>
                    )}
                  </td>
                  <td>
                    <strong>{course.title}</strong>
                    <div>{course.description || 'No description provided.'}</div>
                  </td>
                  <td>{course.category?.name ?? 'Uncategorized'}</td>
                  <td>{new Date(course.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
