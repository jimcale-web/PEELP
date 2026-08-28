import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { CategoryRow } from './EditCategoryModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Props {
  category: CategoryRow;
  onClose: () => void;
}

export default function DeleteCategoryModal({ category, onClose }: Props) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleConfirm() {
    setSubmitting(true);
    setServerError('');
    try {
      await axios.delete(`${API_URL}/admin/categories/${category.id}`, { withCredentials: true });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to delete category.');
      } else {
        setServerError('Failed to delete category.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const courseCount = category._count.courses;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Category</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="delete-confirm-body">
          <p>
            Are you sure you want to <strong>delete</strong> <strong>{category.name}</strong>?
          </p>
          {courseCount > 0 && (
            <p>
              This category is assigned to <strong>{courseCount} course{courseCount !== 1 ? 's' : ''}</strong>.
              Those courses will become uncategorised.
            </p>
          )}
          <p>This action <strong>cannot be undone</strong>.</p>
        </div>

        {serverError && <p className="modal-server-error">{serverError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-delete" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
