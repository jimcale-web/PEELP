import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { UserRow } from './EditUserModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Props {
  user: UserRow;
  onClose: () => void;
}

export default function DeleteUserModal({ user, onClose }: Props) {
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

  const isSoftDelete = user.role === 'INSTRUCTOR';
  const actionLabel = isSoftDelete ? 'Deactivate' : 'Delete';
  const actionLabelInProgress = isSoftDelete ? 'Deactivating…' : 'Deleting…';

  async function handleConfirm() {
    setSubmitting(true);
    setServerError('');
    try {
      await axios.delete(`${API_URL}/admin/users/${user.id}`, { withCredentials: true });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const serverMsg = err.response?.data?.error;

        if (serverMsg) {
          setServerError(serverMsg);
        } else if (status === 401) {
          setServerError('You are not signed in. Please refresh the page and sign in again.');
        } else if (status === 403) {
          setServerError('You do not have permission to perform this action.');
        } else if (status === 404) {
          setServerError(`User "${user.name}" was not found — they may have already been deleted. Refresh the list and try again.`);
        } else if (status === 409) {
          setServerError(`User "${user.name}" has already been deactivated.`);
        } else if (!err.response) {
          setServerError('Could not reach the server. Check your connection and try again.');
        } else {
          setServerError(`Failed to ${isSoftDelete ? 'deactivate' : 'delete'} user (HTTP ${status}).`);
        }
      } else {
        setServerError(`An unexpected error occurred while trying to ${isSoftDelete ? 'deactivate' : 'delete'} "${user.name}".`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-card--narrow" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{actionLabel} User</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="delete-confirm-body">
          {isSoftDelete ? (
            <p>
              Are you sure you want to <strong>deactivate</strong> <strong>{user.name}</strong>?
              They will no longer be able to sign in, but their data will be kept.
            </p>
          ) : (
            <p>
              Are you sure you want to <strong>permanently delete</strong> <strong>{user.name}</strong>?
              This action <strong>cannot be undone</strong>.
            </p>
          )}
        </div>

        {serverError && <p className="modal-server-error">{serverError}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className={isSoftDelete ? 'btn-deactivate' : 'btn-delete'}
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? actionLabelInProgress : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
