import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const editStudentSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  city: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
  phoneNumber: z
    .string()
    .refine(
      (v) => v === '' || /^[+\d\s\-().]+$/.test(v),
      'Phone number contains invalid characters.',
    )
    .optional()
    .or(z.literal('')),
  newPassword: z
    .string()
    .refine((v) => v === '' || v.length >= 8, 'New password must be at least 8 characters.')
    .optional()
    .or(z.literal('')),
});

type FormFields = z.infer<typeof editStudentSchema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

export interface StudentRow {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT';
  emailVerified: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  city: string | null;
  country: string | null;
  phoneNumber: string | null;
  enrolledCategoryId: string | null;
  enrolledCategory: { id: string; name: string } | null;
  accessDuration: 'MONTHLY' | 'YEARLY' | null;
  accessExpiresAt: string | null;
  createdAt: string;
  deletedAt: string | null;
}

interface Props {
  student: StudentRow;
  onClose: () => void;
}

export default function EditStudentModal({ student, onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState(student.name);
  const [email, setEmail] = useState(student.email);
  const [city, setCity] = useState(student.city ?? '');
  const [country, setCountry] = useState(student.country ?? '');
  const [phoneNumber, setPhoneNumber] = useState(student.phoneNumber ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    city: false,
    country: false,
    phoneNumber: false,
    newPassword: false,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = editStudentSchema.safeParse({ name, email, city, country, phoneNumber, newPassword });
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
    setTouched({ name: true, email: true, city: true, country: true, phoneNumber: true, newPassword: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.patch(
        `${API_URL}/admin/students/${student.id}`,
        { name: name.trim(), email: email.trim(), city, country, phoneNumber, newPassword },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to update student.');
      } else {
        setServerError('Failed to update student.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Student</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="es-name">Full Name</label>
            <input
              id="es-name"
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
            <label htmlFor="es-email">Email</label>
            <input
              id="es-email"
              type="email"
              className={touched.email && fieldErrors.email ? 'input-error' : ''}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              autoComplete="off"
            />
            {touched.email && fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
          </div>

          <div className="modal-row">
            <div className="modal-field">
              <label htmlFor="es-city">City</label>
              <input
                id="es-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="off"
                placeholder="Cairo"
              />
            </div>

            <div className="modal-field">
              <label htmlFor="es-country">Country</label>
              <input
                id="es-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                autoComplete="off"
                placeholder="Egypt"
              />
            </div>
          </div>

          <div className="modal-field">
            <label htmlFor="es-phone">Phone Number</label>
            <input
              id="es-phone"
              type="tel"
              className={touched.phoneNumber && fieldErrors.phoneNumber ? 'input-error' : ''}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
              autoComplete="off"
            />
            {touched.phoneNumber && fieldErrors.phoneNumber && (
              <span className="field-error">{fieldErrors.phoneNumber}</span>
            )}
          </div>

          <div className="modal-password-section">
            <p className="modal-section-label">
              Reset Password <span className="field-hint">(leave blank to keep current password)</span>
            </p>
            <div className="modal-field">
              <label htmlFor="es-new-password">New Password</label>
              <input
                id="es-new-password"
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
