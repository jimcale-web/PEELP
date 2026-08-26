import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  role: z.enum(['STUDENT', 'INSTRUCTOR', 'ADMIN']),
});

type FormFields = z.infer<typeof createUserSchema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

interface Props {
  onClose: () => void;
}

export default function CreateUserModal({ onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({ name: false, email: false, password: false });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = createUserSchema.safeParse({ name, email, password, role });
    if (result.success) return {};
    return Object.fromEntries(
      result.error.issues.map((e) => [e.path[0], e.message]),
    ) as FieldErrors;
  }

  const fieldErrors = getFieldErrors();
  const formValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.post(
        `${API_URL}/admin/users`,
        { name: name.trim(), email: email.trim(), password, role },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to create user.');
      } else {
        setServerError('Failed to create user.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New User</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="cu-name">Full Name</label>
            <input
              id="cu-name"
              type="text"
              className={touched.name && fieldErrors.name ? 'input-error' : ''}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              placeholder="Jane Doe"
              autoComplete="off"
            />
            {touched.name && fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="modal-field">
            <label htmlFor="cu-email">Email</label>
            <input
              id="cu-email"
              type="email"
              className={touched.email && fieldErrors.email ? 'input-error' : ''}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              placeholder="jane@example.com"
              autoComplete="off"
            />
            {touched.email && fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="modal-field">
            <label htmlFor="cu-password">Password</label>
            <input
              id="cu-password"
              type="password"
              className={touched.password && fieldErrors.password ? 'input-error' : ''}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            {touched.password && fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
          </div>

          <div className="modal-field">
            <label htmlFor="cu-role">Role</label>
            <select
              id="cu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {serverError && <p className="modal-server-error">{serverError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
