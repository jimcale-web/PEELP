import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Login.css';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function resolveLoginError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (!err.response) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    if (status === 400 || status === 401) {
      return "The email or password you entered is incorrect. Please try again.";
    }
    if (status === 429) {
      return "Too many sign-in attempts. Please wait a few minutes before trying again.";
    }
    return "Something went wrong while signing in. Please try again.";
  }
  if (err instanceof Error) {
    // Filter out internal axios/better-auth noise
    if (err.message.startsWith('Login failed:') || err.message.includes('status code')) {
      return "Something went wrong while signing in. Please try again.";
    }
    return err.message;
  }
  return "Something went wrong while signing in. Please try again.";
}

export default function Login() {
  const [serverError, setServerError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justRegistered = (location.state as { registered?: boolean } | null)?.registered === true;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (err) {
      setServerError(resolveLoginError(err));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Sign In</h2>

        {justRegistered && (
          <div className="success-message">
            Account created! Your registration is pending admin approval before you can access the platform.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="text"
              id="email"
              className={errors.email ? 'input-error' : ''}
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email && (
              <span className="field-error">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={errors.password ? 'input-error' : ''}
              disabled={isSubmitting}
              {...register('password')}
            />
            {errors.password && (
              <span className="field-error">{errors.password.message}</span>
            )}
          </div>

          {serverError && <div className="error-message">{serverError}</div>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Contact your administrator if you need access.</p>
          <p style={{ marginTop: '10px' }}>
            Don't have an account?{' '}
            <Link to="/register" className="register-link">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
