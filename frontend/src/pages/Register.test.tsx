import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Register from './Register';
import { server } from '../test/server';

const REGISTER_URL = 'http://localhost:5000/api/register';

/**
 * Render Register inside a memory router so Link / useNavigate work without
 * a real browser. We also add a /login stub so navigation assertions are easy.
 */
function renderRegister() {
  const router = createMemoryRouter(
    [
      { path: '/register', element: <Register /> },
      { path: '/login', element: <div data-testid="login-page">Login</div> },
    ],
    { initialEntries: ['/register'] },
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return router;
}

/** Fill every required field with valid values. */
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full Name'), 'Test User');
  await user.type(screen.getByLabelText('Phone Number'), '+254 712 345 678');
  await user.type(screen.getByLabelText('City'), 'Nairobi');
  await user.type(screen.getByLabelText('Country'), 'Kenya');
  await screen.findByRole('option', { name: 'Programming' });
  await user.selectOptions(screen.getByLabelText('Category to enroll in'), 'cat-1');
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Password'), 'Password123');
  await user.type(screen.getByLabelText('Confirm Password'), 'Password123');
}

// ─── Initial render ───────────────────────────────────────────────────────────

describe('Register', () => {
  describe('initial render', () => {
    it('renders the page heading and subtitle', () => {
      renderRegister();
      expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText(/join peelp as a student/i)).toBeInTheDocument();
    });

    it('renders all required form fields', () => {
      renderRegister();
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone Number')).toBeInTheDocument();
      expect(screen.getByLabelText('City')).toBeInTheDocument();
      expect(screen.getByLabelText('Country')).toBeInTheDocument();
      expect(screen.getByLabelText('Category to enroll in')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders the "Create Account" submit button', () => {
      renderRegister();
      expect(screen.getByRole('button', { name: /^create account$/i })).toBeInTheDocument();
    });

    it('renders a "Sign in" link pointing to /login', () => {
      renderRegister();
      const link = screen.getByRole('link', { name: /sign in/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/login');
    });

    it('shows no validation errors before any interaction', () => {
      renderRegister();
      expect(screen.queryByText(/please enter/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/must be/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/don't match/i)).not.toBeInTheDocument();
    });
  });

  // ─── Field validation (submit with empty form) ────────────────────────────

  describe('field validation on empty submit', () => {
    it('shows all required-field errors when the form is submitted empty', async () => {
      const user = userEvent.setup();
      renderRegister();

      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(await screen.findByText('Please enter your full name.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid phone number (at least 7 digits).')).toBeInTheDocument();
      expect(screen.getByText('Please enter your city.')).toBeInTheDocument();
      expect(screen.getByText('Please enter your country.')).toBeInTheDocument();
      expect(screen.getByText('Please select a category to enroll in.')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
      expect(screen.getByText('Your password must be at least 8 characters long.')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password.')).toBeInTheDocument();
    });

    it('does not call the API when the form is invalid', async () => {
      const postSpy = vi.fn();
      server.use(http.post(REGISTER_URL, () => { postSpy(); return HttpResponse.json({}, { status: 201 }); }));

      const user = userEvent.setup();
      renderRegister();
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Specific field validation ─────────────────────────────────────────────

  describe('specific field validation', () => {
    it('shows an error for an invalid email address', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Email'), 'not-an-email');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      expect(await screen.findByText('Please enter a valid email address.')).toBeInTheDocument();
    });

    it('shows an error when the password is too short', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Password'), 'short');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      expect(await screen.findByText('Your password must be at least 8 characters long.')).toBeInTheDocument();
    });

    it('shows an error when the phone number is too short', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Phone Number'), '123');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      expect(await screen.findByText('Please enter a valid phone number (at least 7 digits).')).toBeInTheDocument();
    });

    it('shows an error when the phone number contains invalid characters', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Phone Number'), 'abc12345');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      expect(await screen.findByText('Your phone number can only contain digits, spaces, +, -, ( and ).')).toBeInTheDocument();
    });

    it('shows an error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Password'), 'Password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'Different456');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      expect(await screen.findByText("Passwords don't match. Please check and try again.")).toBeInTheDocument();
    });

    it('applies input-error class to invalid fields on submit', async () => {
      const user = userEvent.setup();
      renderRegister();
      await user.click(screen.getByRole('button', { name: /^create account$/i }));
      await screen.findByText('Please enter your full name.');
      expect(screen.getByLabelText('Full Name')).toHaveClass('input-error');
      expect(screen.getByLabelText('Email')).toHaveClass('input-error');
    });
  });

  // ─── Loading state ─────────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows "Creating account…" on the button while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.post(REGISTER_URL, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response);
          }),
        ),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(await screen.findByRole('button', { name: /creating account…/i })).toBeInTheDocument();

      resolve();
    });

    it('disables the submit button while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.post(REGISTER_URL, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response);
          }),
        ),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await screen.findByRole('button', { name: /creating account…/i });
      expect(screen.getByRole('button', { name: /creating account…/i })).toBeDisabled();

      resolve();
    });

    it('disables all inputs while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.post(REGISTER_URL, () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response);
          }),
        ),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await screen.findByRole('button', { name: /creating account…/i });
      expect(screen.getByLabelText('Full Name')).toBeDisabled();
      expect(screen.getByLabelText('Email')).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();

      resolve();
    });
  });

  // ─── Successful submission ─────────────────────────────────────────────────

  describe('successful submission', () => {
    beforeEach(() => {
      server.use(http.post(REGISTER_URL, () => HttpResponse.json({}, { status: 201 })));
    });

    it('navigates to /login after successful registration', async () => {
      const user = userEvent.setup();
      const router = renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await waitFor(() =>
        expect(router.state.location.pathname).toBe('/login'),
      );
    });

    it('passes { registered: true } state to /login on success', async () => {
      const user = userEvent.setup();
      const router = renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
      expect(router.state.location.state).toEqual({ registered: true });
    });

    it('sends the correct payload to the API', async () => {
      let captured: unknown;
      server.use(
        http.post(REGISTER_URL, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await waitFor(() => expect(captured).toBeDefined());
      expect(captured).toEqual({
        name: 'Test User',
        phoneNumber: '+254 712 345 678',
        city: 'Nairobi',
        country: 'Kenya',
        categoryId: 'cat-1',
        email: 'test@example.com',
        password: 'Password123',
      });
    });

    it('does not include confirmPassword in the API payload', async () => {
      let captured: unknown;
      server.use(
        http.post(REGISTER_URL, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await waitFor(() => expect(captured).toBeDefined());
      expect(captured).not.toHaveProperty('confirmPassword');
    });

    it('trims whitespace from name, city, country and email before sending', async () => {
      let captured: unknown;
      server.use(
        http.post(REGISTER_URL, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const user = userEvent.setup();
      renderRegister();
      await user.type(screen.getByLabelText('Full Name'), '  Test User  ');
      await user.type(screen.getByLabelText('Phone Number'), '+254 712 345 678');
      await user.type(screen.getByLabelText('City'), '  Nairobi  ');
      await user.type(screen.getByLabelText('Country'), '  Kenya  ');
      await screen.findByRole('option', { name: 'Programming' });
      await user.selectOptions(screen.getByLabelText('Category to enroll in'), 'cat-1');
      await user.type(screen.getByLabelText('Email'), '  test@example.com  ');
      await user.type(screen.getByLabelText('Password'), 'Password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'Password123');
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await waitFor(() => expect(captured).toBeDefined());
      expect(captured).toMatchObject({
        name: 'Test User',
        city: 'Nairobi',
        country: 'Kenya',
        email: 'test@example.com',
      });
    });
  });

  // ─── Server errors ─────────────────────────────────────────────────────────

  describe('server errors', () => {
    it('shows the duplicate-email message on a 409 response', async () => {
      server.use(
        http.post(REGISTER_URL, () => HttpResponse.json({ error: 'duplicate' }, { status: 409 })),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(
        await screen.findByText('An account with that email already exists. Try signing in instead.'),
      ).toBeInTheDocument();
    });

    it('shows the server validation message on a 400 response', async () => {
      server.use(
        http.post(REGISTER_URL, () =>
          HttpResponse.json({ error: 'Phone number is invalid.' }, { status: 400 }),
        ),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(await screen.findByText('Phone number is invalid.')).toBeInTheDocument();
    });

    it('shows a generic error on a 500 response', async () => {
      server.use(
        http.post(REGISTER_URL, () => HttpResponse.json({}, { status: 500 })),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(
        await screen.findByText('Something went wrong during registration. Please try again.'),
      ).toBeInTheDocument();
    });

    it('shows a network error message when the server is unreachable', async () => {
      server.use(
        http.post(REGISTER_URL, () => HttpResponse.error()),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      expect(
        await screen.findByText('Unable to connect. Please check your internet connection and try again.'),
      ).toBeInTheDocument();
    });

    it('re-enables the submit button after a failed request', async () => {
      server.use(
        http.post(REGISTER_URL, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await screen.findByText('Something went wrong during registration. Please try again.');
      expect(screen.getByRole('button', { name: /^create account$/i })).not.toBeDisabled();
    });

    it('does not navigate after a failed request', async () => {
      server.use(
        http.post(REGISTER_URL, () => HttpResponse.json({ error: 'duplicate' }, { status: 409 })),
      );

      const user = userEvent.setup();
      const router = renderRegister();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create account$/i }));

      await screen.findByText('An account with that email already exists. Try signing in instead.');
      expect(router.state.location.pathname).toBe('/register');
    });
  });
});
