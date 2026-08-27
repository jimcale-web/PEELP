import { useState, useEffect } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Valid email is required.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  city: z.string().min(1, 'City is required.'),
  country: z.string().min(1, 'Country is required.'),
  phoneNumber: z
    .string()
    .min(7, 'Phone number must be at least 7 characters.')
    .regex(/^[+\d\s\-().]+$/, 'Phone number contains invalid characters.'),
});

type FormFields = z.infer<typeof createStudentSchema>;
type FieldErrors = Partial<Record<keyof FormFields, string>>;

interface Props {
  onClose: () => void;
}

export default function CreateStudentModal({ onClose }: Props) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    city: false,
    country: false,
    phoneNumber: false,
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function getFieldErrors(): FieldErrors {
    const result = createStudentSchema.safeParse({ name, email, password, city, country, phoneNumber });
    if (result.success) return {};
    return Object.fromEntries(result.error.issues.map((e) => [e.path[0], e.message])) as FieldErrors;
  }

  const fieldErrors = getFieldErrors();
  const formValid = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, city: true, country: true, phoneNumber: true });
    if (!formValid) return;

    setSubmitting(true);
    setServerError('');
    try {
      await axios.post(
        `${API_URL}/admin/users`,
        { name: name.trim(), email: email.trim(), password, role: 'STUDENT', city, country, phoneNumber },
        { withCredentials: true },
      );
      await queryClient.invalidateQueries({ queryKey: ['admin', 'students'] });
      onClose();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Failed to create student.');
      } else {
        setServerError('Failed to create student.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Student</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="modal-field">
            <label htmlFor="cs-name">Full Name</label>
            <input
              id="cs-name"
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
            <label htmlFor="cs-email">Email</label>
            <input
              id="cs-email"
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
            <label htmlFor="cs-password">Password</label>
            <input
              id="cs-password"
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

          <div className="modal-row">
            <div className="modal-field">
              <label htmlFor="cs-city">City</label>
              <input
                id="cs-city"
                type="text"
                className={touched.city && fieldErrors.city ? 'input-error' : ''}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                placeholder="Cairo"
                autoComplete="off"
              />
              {touched.city && fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
            </div>

            <div className="modal-field">
              <label htmlFor="cs-country">Country</label>
              <input
                id="cs-country"
                type="text"
                className={touched.country && fieldErrors.country ? 'input-error' : ''}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, country: true }))}
                placeholder="Egypt"
                autoComplete="off"
              />
              {touched.country && fieldErrors.country && <span className="field-error">{fieldErrors.country}</span>}
            </div>
          </div>

          <div className="modal-field">
            <label htmlFor="cs-phone">Phone Number</label>
            <input
              id="cs-phone"
              type="tel"
              className={touched.phoneNumber && fieldErrors.phoneNumber ? 'input-error' : ''}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phoneNumber: true }))}
              placeholder="+20 123 456 7890"
              autoComplete="off"
            />
            {touched.phoneNumber && fieldErrors.phoneNumber && (
              <span className="field-error">{fieldErrors.phoneNumber}</span>
            )}
          </div>

          {serverError && <p className="modal-server-error">{serverError}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-create" disabled={submitting}>
              {submitting ? 'Adding…' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
