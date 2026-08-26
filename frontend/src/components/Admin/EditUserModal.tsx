import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const editUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  // Optional: leave blank to keep current password
  newPassword: z
    .string()
    .refine((v) => v === '' || v.length >= 8, 'New password must be at least 8 characters.')
    .optional()
    .or(z.literal('')),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']),
});

type FormFields = z.infer<typeof editUserSchema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
}

interface Props {
  user: UserRow;
  onClose: () => void;
}

export default function EditUserModal({ user, onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>(user.role);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, newPassword: false });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = editUserSchema.safeParse({ name, email, newPassword, role });
    if (result.success) return {};
    const errors: FieldErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof FieldErrors;
      if (!errors[key]) errors[key] = issue.message;
    }
    return errors;
  }

  const fieldErrors = getFieldErrors();
  const formValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, newPassword: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.patch(
        `${API_URL}/admin/users/${user.id}`,
        { name: name.trim(), email: email.trim(), newPassword, role },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to update user.');
      } else {
        setServerError('Failed to update user.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="eu-name">Full Name</label>
            <input
              id="eu-name"
              type="text"
              className={touched.name && fieldErrors.name ? 'input-error' : ''}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              autoComplete="off"
            />
            {touched.name && fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="modal-field">
            <label htmlFor="eu-email">Email</label>
            <input
              id="eu-email"
              type="email"
              className={touched.email && fieldErrors.email ? 'input-error' : ''}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              autoComplete="off"
            />
            {touched.email && fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="modal-field">
            <label htmlFor="eu-role">Role</label>
            <select
              id="eu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="modal-password-section">
            <p className="modal-section-label">
              Reset Password <span className="field-hint">(leave blank to keep current password)</span>
            </p>
            <div className="modal-field">
              <label htmlFor="eu-new-password">New Password</label>
              <input
                id="eu-new-password"
                type="password"
                className={touched.newPassword && fieldErrors.newPassword ? 'input-error' : ''}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, newPassword: true }))}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
              {touched.newPassword && fieldErrors.newPassword && (
                <span className="field-error">{fieldErrors.newPassword}</span>
              )}
            </div>
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
