import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { StudentRow } from './EditStudentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Props {
  student: StudentRow;
  onClose: () => void;
}

export default function DeleteStudentModal({ student, onClose }: Props) {
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
      await axios.delete(`${API_URL}/admin/users/${student.id}`, { withCredentials: true });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMsg = err.response?.data?.error;
        if (serverMsg) {
          setServerError(serverMsg);
        } else if (status === 401) {
          setServerError('You are not signed in. Please refresh and sign in again.');
        } else if (status === 403) {
          setServerError('You do not have permission to perform this action.');
        } else if (status === 404) {
          setServerError(`Student "${student.name}" was not found — they may have already been deleted.`);
        } else if (!err.response) {
          setServerError('Could not reach the server. Check your connection and try again.');
        } else {
          setServerError(`Failed to delete student (HTTP ${status}).`);
        }
      } else {
        setServerError(`An unexpected error occurred while deleting "${student.name}".`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Delete Student</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="delete-confirm-body">
          <p>
            Are you sure you want to <strong>permanently delete</strong>{' '}
            <strong>{student.name}</strong>? This action <strong>cannot be undone</strong>.
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
