import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import axios from 'axios';
import '../styles/Register.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface Category {
  id: string;
  name: string;
}

const registerSchema = z.object({
  name: z.string().min(1, 'Please enter your full name.'),
  phoneNumber: z
    .string()
    .min(7, 'Please enter a valid phone number (at least 7 digits).')
    .regex(/^[+\d\s\-().]+$/, 'Your phone number can only contain digits, spaces, +, -, ( and ).'),
  city: z.string().min(1, 'Please enter your city.'),
  country: z.string().min(1, 'Please enter your country.'),
  categoryId: z.string().min(1, 'Please select a category to enroll in.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Your password must be at least 8 characters long.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match. Please check and try again.",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

function resolveRegisterError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Unable to connect. Please check your internet connection and try again.";
    }
    const status = err.response.status;
    const serverMsg: string | undefined = err.response.data?.error;
    if (status === 409) {
      return "An account with that email already exists. Try signing in instead.";
    }
    if (status === 400 && serverMsg) {
      return serverMsg;
    }
    return "Something went wrong during registration. Please try again.";
  }
  return "Something went wrong during registration. Please try again.";
}

export default function Register() {
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { data: categories = [], isLoading: isLoadingCategories, isError: isCategoriesError } = useQuery({
    queryKey: ['registration', 'categories'],
    queryFn: async (): Promise<Category[]> => {
      const response = await axios.get<{ categories: Category[] }>(`${API_URL}/categories`);
      return response.data.categories;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError('');
    try {
      await axios.post(
        `${API_URL}/register`,
        {
          name: data.name.trim(),
          phoneNumber: data.phoneNumber.trim(),
          city: data.city.trim(),
          country: data.country.trim(),
          categoryId: data.categoryId,
          email: data.email.trim(),
          password: data.password,
        },
        { withCredentials: true },
      );
      navigate('/login', { state: { registered: true } });
    } catch (err) {
      setServerError(resolveRegisterError(err));
    }
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Create Account</h2>
        <p className="register-subtitle">Join PEELP as a student</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Row 1: Name | Phone */}
          <div className="register-fields-row">
            <div className="form-group">
              <label htmlFor="reg-name">Full Name</label>
              <input
                id="reg-name"
                type="text"
                className={errors.name ? 'input-error' : ''}
                placeholder="Jane Doe"
                disabled={isSubmitting}
                autoComplete="name"
                {...register('name')}
              />
              {errors.name && <span className="field-error">{errors.name.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone Number</label>
              <input
                id="reg-phone"
                type="tel"
                className={errors.phoneNumber ? 'input-error' : ''}
                placeholder="+254 700 000 000"
                disabled={isSubmitting}
                autoComplete="tel"
                {...register('phoneNumber')}
              />
              {errors.phoneNumber && <span className="field-error">{errors.phoneNumber.message}</span>}
            </div>
          </div>

          {/* Row 2: City | Country */}
          <div className="register-fields-row">
            <div className="form-group">
              <label htmlFor="reg-city">City</label>
              <input
                id="reg-city"
                type="text"
                className={errors.city ? 'input-error' : ''}
                placeholder="Nairobi"
                disabled={isSubmitting}
                autoComplete="address-level2"
                {...register('city')}
              />
              {errors.city && <span className="field-error">{errors.city.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-country">Country</label>
              <input
                id="reg-country"
                type="text"
                className={errors.country ? 'input-error' : ''}
                placeholder="Kenya"
                disabled={isSubmitting}
                autoComplete="country-name"
                {...register('country')}
              />
              {errors.country && <span className="field-error">{errors.country.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-category">Category to enroll in</label>
            <select
              id="reg-category"
              className={errors.categoryId ? 'input-error' : ''}
              disabled={isSubmitting || isLoadingCategories}
              {...register('categoryId')}
            >
              <option value="">
                {isLoadingCategories ? 'Loading categories...' : 'Select a category'}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            {isCategoriesError && (
              <span className="field-error">Unable to load categories. Please refresh and try again.</span>
            )}
            {errors.categoryId && <span className="field-error">{errors.categoryId.message}</span>}
          </div>

          {/* Row 3: Email (full width) */}
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className={errors.email ? 'input-error' : ''}
              placeholder="jane@example.com"
              disabled={isSubmitting}
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          {/* Row 4: Password | Confirm Password */}
          <div className="register-fields-row">
            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className={errors.password ? 'input-error' : ''}
                placeholder="Min. 8 characters"
                disabled={isSubmitting}
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && <span className="field-error">{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="reg-confirm-password">Confirm Password</label>
              <input
                id="reg-confirm-password"
                type="password"
                className={errors.confirmPassword ? 'input-error' : ''}
                placeholder="Repeat password"
                disabled={isSubmitting}
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword.message}</span>
              )}
            </div>
          </div>

          {serverError && <div className="error-message">{serverError}</div>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="register-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
