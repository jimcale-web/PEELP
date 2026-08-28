import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  instructorId: z.string().optional(),
  categoryId: z.string().optional(),
});

type FormFields = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

interface Instructor {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  instructorId: string | null;
  instructor: { id: string; name: string } | null;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  course: CourseRow;
  onClose: () => void;
}

export default function EditCourseModal({ course, onClose }: Props) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [instructorId, setInstructorId] = useState(course.instructorId ?? '');
  const [categoryId, setCategoryId] = useState(course.categoryId ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({ title: false });

  const { data: instructors = [] } = useQuery<Instructor[]>({
    queryKey: ['admin', 'instructors'],
    queryFn: async () => {
      const res = await axios.get<{ users: (Instructor & { role: string })[] }>(
        `${API_URL}/admin/users`,
        { withCredentials: true },
      );
      return res.data.users.filter((u) => u.role === 'INSTRUCTOR');
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['admin', 'categories'],
    queryFn: async () => {
      const res = await axios.get<{ categories: Category[] }>(
        `${API_URL}/admin/categories`,
        { withCredentials: true },
      );
      return res.data.categories;
    },
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = schema.safeParse({ title, description, instructorId, categoryId });
    if (result.success) return {};
    return Object.fromEntries(result.error.issues.map((e) => [e.path[0], e.message])) as FieldErrors;
  }

  const fieldErrors = getFieldErrors();
  const formValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ title: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.patch(
        `${API_URL}/admin/courses/${course.id}`,
        {
          title: title.trim(),
          description: description.trim(),
          instructorId: instructorId || undefined,
          categoryId: categoryId || undefined,
        },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to update course.');
      } else {
        setServerError('Failed to update course.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Course</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="ec-title">Title</label>
            <input
              id="ec-title"
              type="text"
              className={touched.title && fieldErrors.title ? 'input-error' : ''}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, title: true }))}
              autoComplete="off"
            />
            {touched.title && fieldErrors.title && (
              <span className="field-error">{fieldErrors.title}</span>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="ec-description">Description</label>
            <textarea
              id="ec-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-field">
            <label htmlFor="ec-category">Category</label>
            <select
              id="ec-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">— Uncategorised —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label htmlFor="ec-instructor">Instructor</label>
            <select
              id="ec-instructor"
              value={instructorId}
              onChange={(e) => setInstructorId(e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {instructors.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>

          {serverError && <p className="modal-server-error">{serverError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
