import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const schema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
});

type FormFields = z.infer<typeof schema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

export interface CategoryRow {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { courses: number };
}

interface Props {
  category: CategoryRow;
  onClose: () => void;
}

export default function EditCategoryModal({ category, onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({ name: false });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = schema.safeParse({ name, description });
    if (result.success) return {};
    return Object.fromEntries(result.error.issues.map((e) => [e.path[0], e.message])) as FieldErrors;
  }

  const fieldErrors = getFieldErrors();
  const formValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.patch(
        `${API_URL}/admin/categories/${category.id}`,
        { name: name.trim(), description: description.trim() },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to update category.');
      } else {
        setServerError('Failed to update category.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Category</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="ecat-name">Name</label>
            <input
              id="ecat-name"
              type="text"
              className={touched.name && fieldErrors.name ? 'input-error' : ''}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              autoComplete="off"
            />
            {touched.name && fieldErrors.name && (
              <span className="field-error">{fieldErrors.name}</span>
            )}
          </div>

          <div className="modal-field">
            <label htmlFor="ecat-description">Description</label>
            <textarea
              id="ecat-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
