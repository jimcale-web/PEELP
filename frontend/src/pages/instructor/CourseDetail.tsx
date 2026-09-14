import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import api, { API_ORIGIN } from '../../services/api';
import '../../styles/CourseDetail.css';

interface Resource {
  id: string;
  type: string;
  url?: string | null;
  isFree: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface Lesson {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  resources: Resource[];
}

interface Section {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  categoryId?: string | null;
  category?: { id: string; name: string } | null;
  createdAt: string;
}

function resolveThumbnailUrl(thumbnailUrl?: string | null): string | null {
  if (!thumbnailUrl) return null;
  return thumbnailUrl.startsWith('http') ? thumbnailUrl : `${API_ORIGIN}${thumbnailUrl}`;
}

async function fetchCourse(courseId: string): Promise<Course> {
  const res = await api.get<{ course: Course }>(`/instructor/courses/${courseId}`);
  return res.data.course;
}

async function fetchSections(courseId: string): Promise<Section[]> {
  const res = await api.get<{ sections: Section[] }>(`/instructor/courses/${courseId}/sections`);
  return res.data.sections;
}

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!courseId) {
    return <div className="error">Course ID is required.</div>;
  }

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showLessonForms, setShowLessonForms] = useState<Record<string, boolean>>({});
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, { title: string; description: string }>>({});
  const [lessonErrors, setLessonErrors] = useState<Record<string, string>>({});
  const [showResourceForms, setShowResourceForms] = useState<Record<string, boolean>>({});
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, { type: string; url: string; isFree: boolean }>>({});
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState('');

  const { data: course, isLoading: courseLoading, isError: courseError } = useQuery({
    queryKey: ['instructor', 'course', courseId],
    queryFn: () => fetchCourse(courseId),
  });

  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['instructor', 'sections', courseId],
    queryFn: () => fetchSections(courseId),
  });

  const handleCreateSection = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Section title is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/instructor/courses/${courseId}/sections`, {
        title: title.trim(),
        description: description.trim(),
        order: sections.length,
      });
      setTitle('');
      setDescription('');
      setShowCreateForm(false);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Unable to create section. Please try again.');
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError('Unable to create section. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) {
      return;
    }

    try {
      await api.delete(`/instructor/courses/${courseId}/sections/${sectionId}`);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error ?? 'Unable to delete section.');
        return;
      }
      if (err instanceof Error) {
        alert(err.message);
        return;
      }
      alert('Unable to delete section.');
    }
  };

  const handleCreateLesson = async (sectionId: string) => {
    const draft = lessonDrafts[sectionId] ?? { title: '', description: '' };
    const message = draft.title.trim() ? '' : 'Lesson title is required.';
    setLessonErrors((current) => ({ ...current, [sectionId]: message }));
    if (message) {
      return;
    }

    try {
      const sectionLessons = sections.find((section) => section.id === sectionId)?.lessons ?? [];
      await api.post(`/instructor/courses/${courseId}/sections/${sectionId}/lessons`, {
        title: draft.title.trim(),
        description: draft.description.trim(),
        order: sectionLessons.length,
      });
      setLessonDrafts((current) => ({ ...current, [sectionId]: { title: '', description: '' } }));
      setShowLessonForms((current) => ({ ...current, [sectionId]: false }));
      setLessonErrors((current) => ({ ...current, [sectionId]: '' }));
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setLessonErrors((current) => ({ ...current, [sectionId]: err.response?.data?.error ?? 'Unable to create lesson.' }));
        return;
      }
      if (err instanceof Error) {
        setLessonErrors((current) => ({ ...current, [sectionId]: err.message }));
        return;
      }
      setLessonErrors((current) => ({ ...current, [sectionId]: 'Unable to create lesson.' }));
    }
  };

  const handleDeleteLesson = async (sectionId: string, lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      await api.delete(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}`);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error ?? 'Unable to delete lesson.');
        return;
      }
      if (err instanceof Error) {
        alert(err.message);
        return;
      }
      alert('Unable to delete lesson.');
    }
  };

  const validateResourceDraft = (draft: { type: string; url: string; isFree: boolean }): string => {
    if (!draft.type.trim()) {
      return 'Resource type is required.';
    }

    const trimmedUrl = draft.url.trim();
    if (!trimmedUrl) {
      return 'Resource URL is required.';
    }

    try {
      new URL(trimmedUrl);
    } catch {
      return 'Resource URL must be a valid URL.';
    }

    if (draft.isFree && draft.type !== 'VIDEO') {
      return 'Only video resources can be marked as free.';
    }

    return '';
  };

  const handleCreateResource = async (sectionId: string, lessonId: string) => {
    const draft = resourceDrafts[lessonId] ?? { type: 'LINK', url: '', isFree: false };
    const message = validateResourceDraft(draft);
    setResourceErrors((current) => ({ ...current, [lessonId]: message }));
    if (message) {
      return;
    }

    try {
      const lessonResources = sections
        .find((section) => section.id === sectionId)
        ?.lessons.find((lesson) => lesson.id === lessonId)?.resources ?? [];

      await api.post(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/resources`, {
        type: draft.type,
        url: draft.url.trim(),
        isFree: draft.type === 'VIDEO' && draft.isFree,
        order: lessonResources.length,
      });
      setResourceDrafts((current) => ({ ...current, [lessonId]: { type: 'LINK', url: '', isFree: false } }));
      setShowResourceForms((current) => ({ ...current, [lessonId]: false }));
      setResourceErrors((current) => ({ ...current, [lessonId]: '' }));
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setResourceErrors((current) => ({ ...current, [lessonId]: err.response?.data?.error ?? 'Unable to create resource.' }));
        return;
      }
      if (err instanceof Error) {
        setResourceErrors((current) => ({ ...current, [lessonId]: err.message }));
        return;
      }
      setResourceErrors((current) => ({ ...current, [lessonId]: 'Unable to create resource.' }));
    }
  };

  const handleDeleteResource = async (sectionId: string, lessonId: string, resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await api.delete(`/instructor/courses/${courseId}/sections/${sectionId}/lessons/${lessonId}/resources/${resourceId}`);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        alert(err.response?.data?.error ?? 'Unable to delete resource.');
        return;
      }
      if (err instanceof Error) {
        alert(err.message);
        return;
      }
      alert('Unable to delete resource.');
    }
  };

  const handleEditClick = (section: Section) => {
    setEditingId(section.id);
    setEditTitle(section.title);
    setEditDescription(section.description || '');
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !course) {
      return;
    }

    setThumbnailError('');
    try {
      setThumbnailUploading(true);
      const formData = new FormData();
      formData.append('title', course.title);
      formData.append('description', course.description || '');
      if (course.categoryId) {
        formData.append('categoryId', course.categoryId);
      }
      formData.append('thumbnail', file);
      await api.patch(`/instructor/courses/${courseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'course', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setThumbnailError(err.response?.data?.error ?? 'Unable to upload thumbnail.');
        return;
      }
      if (err instanceof Error) {
        setThumbnailError(err.message);
        return;
      }
      setThumbnailError('Unable to upload thumbnail.');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleThumbnailDelete = async () => {
    if (!confirm('Are you sure you want to remove this thumbnail image?')) {
      return;
    }

    setThumbnailError('');
    try {
      setThumbnailUploading(true);
      await api.delete(`/instructor/courses/${courseId}/thumbnail`);
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'course', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setThumbnailError(err.response?.data?.error ?? 'Unable to remove thumbnail.');
        return;
      }
      if (err instanceof Error) {
        setThumbnailError(err.message);
        return;
      }
      setThumbnailError('Unable to remove thumbnail.');
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleUpdateSection = async (sectionId: string) => {
    setError('');

    if (!editTitle.trim()) {
      setError('Section title is required.');
      return;
    }

    try {
      setSubmitting(true);
      await api.put(`/instructor/courses/${courseId}/sections/${sectionId}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
      });
      setEditingId(null);
      setEditTitle('');
      setEditDescription('');
      await queryClient.invalidateQueries({ queryKey: ['instructor', 'sections', courseId] });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error ?? 'Unable to update section. Please try again.');
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError('Unable to update section. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (courseError) {
    return <div className="error">Unable to load course. The course may not exist or you don't have permission to view it.</div>;
  }

  if (courseLoading) {
    return <div className="loading">Loading course...</div>;
  }

  return (
    <div className="course-detail-container">
      <div className="course-detail-card">
        <div className="course-detail-header">
          <button
            type="button"
            className="course-detail-back-btn"
            onClick={() => navigate('/instructor')}
          >
            ← Back to Courses
          </button>
          <div className="course-detail-thumbnail-section">
            {resolveThumbnailUrl(course?.thumbnailUrl) ? (
              <img
                className="course-detail-thumbnail"
                src={resolveThumbnailUrl(course?.thumbnailUrl)!}
                alt={`${course?.title} thumbnail`}
              />
            ) : (
              <div className="course-detail-thumbnail-placeholder">No thumbnail</div>
            )}
            <div className="course-detail-thumbnail-actions">
              <label className="course-detail-thumbnail-upload-btn">
                {course?.thumbnailUrl ? 'Change Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  disabled={thumbnailUploading}
                  hidden
                />
              </label>
              {course?.thumbnailUrl && (
                <button
                  type="button"
                  className="course-detail-thumbnail-delete-btn"
                  onClick={handleThumbnailDelete}
                  disabled={thumbnailUploading}
                >
                  Remove
                </button>
              )}
            </div>
            {thumbnailError && <div className="instructor-error">{thumbnailError}</div>}
          </div>
          <div>
            <h1>{course?.title}</h1>
            <p className="course-detail-description">{course?.description || 'No description provided.'}</p>
            {course?.category && <p className="course-detail-category">Category: {course.category.name}</p>}
          </div>
        </div>

        <div className="sections-toolbar">
          <h2>Sections</h2>
          <button
            type="button"
            className="create-section-btn"
            onClick={() => setShowCreateForm((current) => !current)}
          >
            {showCreateForm ? 'Close Form' : '+ Add Section'}
          </button>
        </div>

        {showCreateForm && (
          <form className="section-form" onSubmit={handleCreateSection}>
            <div className="form-field">
              <label htmlFor="section-title">Section Title</label>
              <input
                id="section-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Introduction to Topics"
              />
            </div>

            <div className="form-field">
              <label htmlFor="section-description">Description</label>
              <textarea
                id="section-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what students will learn in this section"
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setError('');
                }}
              >
                Cancel
              </button>
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Section'}
              </button>
            </div>
          </form>
        )}

        {sectionsLoading ? (
          <p className="loading">Loading sections…</p>
        ) : sections.length === 0 ? (
          <div className="empty-state">No sections yet. Create one to get started!</div>
        ) : (
          <div className="sections-list">
            {sections.map((section, index) => (
              <div key={section.id} className="section-item">
                {editingId === section.id ? (
                  <div className="edit-form">
                    <div className="form-field">
                      <label htmlFor={`edit-title-${section.id}`}>Section Title</label>
                      <input
                        id={`edit-title-${section.id}`}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor={`edit-description-${section.id}`}>Description</label>
                      <textarea
                        id={`edit-description-${section.id}`}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>

                    {error && <div className="form-error">{error}</div>}

                    <div className="edit-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => {
                          setEditingId(null);
                          setError('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="submit-btn"
                        disabled={submitting}
                        onClick={() => handleUpdateSection(section.id)}
                      >
                        {submitting ? 'Updating...' : 'Update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="section-content">
                      <h3>{index + 1}. {section.title}</h3>
                      {section.description && <p>{section.description}</p>}
                      <small className="section-date">Created {new Date(section.createdAt).toLocaleDateString()}</small>

                      <div className="section-lessons">
                        <div className="lesson-toolbar">
                          <h4>Lessons</h4>
                          <button
                            type="button"
                            className="mini-btn"
                            onClick={() => {
                              setShowLessonForms((current) => ({ ...current, [section.id]: !current[section.id] }));
                              setLessonErrors((current) => ({ ...current, [section.id]: '' }));
                            }}
                          >
                            {showLessonForms[section.id] ? 'Close form' : '+ Add Lesson'}
                          </button>
                        </div>

                        {showLessonForms[section.id] && (
                          <div className="lesson-form">
                            <div className="form-field">
                              <label htmlFor={`lesson-title-${section.id}`}>Lesson Title</label>
                              <input
                                id={`lesson-title-${section.id}`}
                                type="text"
                                value={lessonDrafts[section.id]?.title ?? ''}
                                onChange={(event) => setLessonDrafts((current) => ({
                                  ...current,
                                  [section.id]: {
                                    title: event.target.value,
                                    description: current[section.id]?.description ?? '',
                                  },
                                }))}
                              />
                            </div>

                            <div className="form-field">
                              <label htmlFor={`lesson-description-${section.id}`}>Lesson Description</label>
                              <textarea
                                id={`lesson-description-${section.id}`}
                                value={lessonDrafts[section.id]?.description ?? ''}
                                onChange={(event) => setLessonDrafts((current) => ({
                                  ...current,
                                  [section.id]: {
                                    title: current[section.id]?.title ?? '',
                                    description: event.target.value,
                                  },
                                }))}
                              />
                            </div>

                            {lessonErrors[section.id] && <div className="form-error">{lessonErrors[section.id]}</div>}

                            <div className="form-actions">
                              <button
                                type="button"
                                className="cancel-btn"
                                onClick={() => {
                                  setShowLessonForms((current) => ({ ...current, [section.id]: false }));
                                  setLessonErrors((current) => ({ ...current, [section.id]: '' }));
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                className="submit-btn"
                                onClick={() => handleCreateLesson(section.id)}
                              >
                                Create Lesson
                              </button>
                            </div>
                          </div>
                        )}

                        {(section.lessons ?? []).length === 0 ? (
                          <div className="lesson-empty">No lessons yet.</div>
                        ) : (
                          <ul className="lesson-list">
                            {(section.lessons ?? []).map((lesson, lessonIndex) => (
                              <li key={lesson.id} className="lesson-item">
                                <div className="lesson-item-header">
                                  <div>
                                    <h5>{lessonIndex + 1}. {lesson.title}</h5>
                                    {lesson.description && <p>{lesson.description}</p>}
                                  </div>
                                  <button
                                    type="button"
                                    className="delete-btn small"
                                    onClick={() => handleDeleteLesson(section.id, lesson.id)}
                                  >
                                    Delete Lesson
                                  </button>
                                </div>

                                <div className="resource-box">
                                  <div className="resource-toolbar">
                                    <strong>Resources</strong>
                                    <button
                                      type="button"
                                      className="mini-btn"
                                      onClick={() => {
                                        setShowResourceForms((current) => ({ ...current, [lesson.id]: !current[lesson.id] }));
                                        setResourceErrors((current) => ({ ...current, [lesson.id]: '' }));
                                      }}
                                    >
                                      {showResourceForms[lesson.id] ? 'Close' : '+ Add Resource'}
                                    </button>
                                  </div>

                                  {showResourceForms[lesson.id] && (
                                    <div className="resource-form">
                                      <div className="form-field">
                                        <label htmlFor={`resource-type-${lesson.id}`}>Resource Type</label>
                                        <select
                                          id={`resource-type-${lesson.id}`}
                                          value={resourceDrafts[lesson.id]?.type ?? 'LINK'}
                                          onChange={(event) => setResourceDrafts((current) => ({
                                            ...current,
                                            [lesson.id]: {
                                              type: event.target.value,
                                              url: current[lesson.id]?.url ?? '',
                                              isFree: event.target.value === 'VIDEO' && (current[lesson.id]?.isFree ?? false),
                                            },
                                          }))}
                                        >
                                          <option value="LINK">Link</option>
                                          <option value="VIDEO">Video</option>
                                          <option value="ARTICLE">Article</option>
                                          <option value="DOCUMENT">Document</option>
                                        </select>
                                      </div>

                                      <div className="form-field">
                                        <label htmlFor={`resource-url-${lesson.id}`}>URL</label>
                                        <input
                                          id={`resource-url-${lesson.id}`}
                                          type="url"
                                          value={resourceDrafts[lesson.id]?.url ?? ''}
                                          onChange={(event) => setResourceDrafts((current) => ({
                                            ...current,
                                            [lesson.id]: {
                                              type: current[lesson.id]?.type ?? 'LINK',
                                              url: event.target.value,
                                              isFree: current[lesson.id]?.isFree ?? false,
                                            },
                                          }))}
                                        />
                                      </div>

                                      {(resourceDrafts[lesson.id]?.type ?? 'LINK') === 'VIDEO' && (
                                        <div className="form-field">
                                          <label className="resource-free-label" htmlFor={`resource-free-${lesson.id}`}>
                                            <input
                                              id={`resource-free-${lesson.id}`}
                                              className="resource-free-checkbox"
                                              type="checkbox"
                                              checked={resourceDrafts[lesson.id]?.isFree ?? false}
                                              onChange={(event) => setResourceDrafts((current) => ({
                                                ...current,
                                                [lesson.id]: {
                                                  type: current[lesson.id]?.type ?? 'VIDEO',
                                                  url: current[lesson.id]?.url ?? '',
                                                  isFree: event.target.checked,
                                                },
                                              }))}
                                            />
                                            Make this video free
                                          </label>
                                        </div>
                                      )}

                                      {resourceErrors[lesson.id] && <div className="form-error">{resourceErrors[lesson.id]}</div>}

                                      <div className="form-actions">
                                        <button
                                          type="button"
                                          className="cancel-btn"
                                          onClick={() => {
                                            setShowResourceForms((current) => ({ ...current, [lesson.id]: false }));
                                            setResourceErrors((current) => ({ ...current, [lesson.id]: '' }));
                                          }}
                                        >
                                          Cancel
                                        </button>
                                        <button
                                          type="button"
                                          className="submit-btn"
                                          onClick={() => handleCreateResource(section.id, lesson.id)}
                                        >
                                          Save Resource
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {(lesson.resources ?? []).length === 0 ? (
                                    <div className="resource-empty">No resources yet.</div>
                                  ) : (
                                    <ul className="resource-list">
                                      {(lesson.resources ?? []).map((resource) => (
                                        <li key={resource.id} className="resource-item">
                                          <div>
                                            <span className="resource-type">({resource.type})</span>
                                            {resource.type === 'VIDEO' && resource.isFree && <span className="resource-free-badge">Free</span>}
                                            {resource.url && (
                                              <a href={resource.url} target="_blank" rel="noreferrer">Open</a>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            className="delete-btn small"
                                            onClick={() => handleDeleteResource(section.id, lesson.id, resource.id)}
                                          >
                                            Remove
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="section-actions">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() => handleEditClick(section)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() => handleDeleteSection(section.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
