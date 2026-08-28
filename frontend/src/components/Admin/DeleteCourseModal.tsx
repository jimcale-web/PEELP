import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { CourseRow } from './EditCourseModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Props {
  course: CourseRow;
  onClose: () => void;
}

export default function DeleteCourseModal({ course, onClose }: Props) {
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
      await axios.delete(`${API_URL}/admin/courses/${course.id}`, { withCredentials: true });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'courses'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to delete course.');
      } else {
        setServerError('Failed to delete course.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Course</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="delete-confirm-body">
          <p>
            Are you sure you want to <strong>delete</strong> <strong>{course.title}</strong>?
            This action <strong>cannot be undone</strong>.
          </p>
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
