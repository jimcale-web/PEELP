import { useEffect, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import type { StudentRow } from './EditStudentModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/** Days remaining until an access expiry timestamp. Null when no expiry is set, negative once it has passed. */
export function daysUntilExpiry(accessExpiresAt: string | null): number | null {
  if (!accessExpiresAt) return null;
  const ms = new Date(accessExpiresAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Short human-readable access status, e.g. "12 days left", "Expires today" or "Expired 3 days ago". */
export function formatPlanStatus(accessExpiresAt: string | null): string {
  const days = daysUntilExpiry(accessExpiresAt);
  if (days === null) return 'No active plan';
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`;
  if (days === 0) return 'Expires today';
  const overdue = Math.abs(days);
  return `Expired ${overdue} day${overdue === 1 ? '' : 's'} ago`;
}

type DurationKey = 'MONTHLY' | 'YEARLY' | 'RENEW';

interface Props {
  student: StudentRow;
  onClose: () => void;
}

export default function ManagePlanModal({ student, onClose }: Props) {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState<DurationKey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function applyDuration(duration: 'MONTHLY' | 'YEARLY', key: DurationKey) {
    if (savingKey) return;
    if (!student.enrolledCategoryId) {
      setError('Select a course category before granting access.');
      return;
    }

    setSavingKey(key);
    setError('');
    try {
      await axios.patch(
        `${API_URL}/admin/students/${student.id}/access`,
        { accessDuration: duration, categoryId: student.enrolledCategoryId },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Failed to update access. Please try again.'
        : 'Failed to update access. Please try again.';
      setError(message);
    } finally {
      setSavingKey(null);
    }
  }

  const days = daysUntilExpiry(student.accessExpiresAt);
  const statusActive = days !== null && days >= 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Plan</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="plan-student">
          {student.name} <span className="plan-student-email">({student.email})</span>
        </p>

        <div className="plan-summary">
          <div className="plan-summary-row">
            <span className="plan-summary-label">Category</span>
            <span className="plan-summary-value">
              {student.enrolledCategory ? student.enrolledCategory.name : 'Not set'}
            </span>
          </div>
          <div className="plan-summary-row">
            <span className="plan-summary-label">Plan</span>
            <span className="plan-summary-value">{student.accessDuration ?? '—'}</span>
          </div>
          <div className="plan-summary-row">
            <span className="plan-summary-label">Days left</span>
            <span className={`plan-summary-value ${statusActive ? 'plan-status--active' : 'plan-status--expired'}`}>
              {formatPlanStatus(student.accessExpiresAt)}
            </span>
          </div>
        </div>

        {student.accessExpiresAt && (
          <p className="duration-expiry plan-expiry">
            Expires {new Date(student.accessExpiresAt).toLocaleDateString()}
          </p>
        )}

        {error && <p className="modal-server-error" role="alert">{error}</p>}

        <div className="duration-toggle duration-toggle--modal" aria-label="Accessibility duration">
          <button
            className={`duration-btn ${student.accessDuration === 'MONTHLY' ? 'duration-btn--active' : ''}`}
            onClick={() => applyDuration('MONTHLY', 'MONTHLY')}
            disabled={!!savingKey}
          >
            Monthly
          </button>
          <button
            className={`duration-btn ${student.accessDuration === 'YEARLY' ? 'duration-btn--active duration-btn--yearly' : ''}`}
            onClick={() => applyDuration('YEARLY', 'YEARLY')}
            disabled={!!savingKey}
          >
            Yearly
          </button>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className="btn-renew-plan"
            onClick={() => student.accessDuration && applyDuration(student.accessDuration, 'RENEW')}
            disabled={!student.accessDuration || !!savingKey}
            title={student.accessDuration ? 'Extend the current plan starting today' : 'Set a plan before renewing'}
          >
            {savingKey === 'RENEW' ? 'Renewing…' : 'Renew'}
          </button>
        </div>
      </div>
    </div>
  );
}
