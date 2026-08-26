import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateUserModal from './CreateUserModal';
import { server, USERS_URL } from '../../test/server';

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateUserModal onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

// Helper: fill every required field with valid values
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
  await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await user.type(screen.getByLabelText(/password/i), 'secret123');
}

describe('CreateUserModal', () => {
  describe('initial render', () => {
    it('renders all form fields', () => {
      renderModal();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    });

    it('defaults role to Student', () => {
      renderModal();
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('STUDENT');
    });

    it('renders "Create User" as the submit button label', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /^create user$/i })).toBeInTheDocument();
    });

    it('renders a Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows no validation errors before any interaction', () => {
      renderModal();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/at least 8/i)).not.toBeInTheDocument();
    });
  });

  describe('inline validation (on blur)', () => {
    it('shows a name error after blurring an empty name field', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/full name/i));
      await user.tab(); // blur
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    it('shows an email error after blurring with an invalid email', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/email/i), 'not-an-email');
      await user.tab();
      expect(await screen.findByText('Valid email is required.')).toBeInTheDocument();
    });

    it('shows a password error after blurring with a short password', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/password/i), 'short');
      await user.tab();
      expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });

    it('clears the name error once the user types a valid name', async () => {
      const user = userEvent.setup();
      renderModal();
      // trigger error
      await user.click(screen.getByLabelText(/full name/i));
      await user.tab();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      // fix it
      await user.type(screen.getByLabelText(/full name/i), 'Jane');
      expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
    });

    it('adds input-error class to invalid fields after blur', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/full name/i));
      await user.tab();
      expect(screen.getByLabelText(/full name/i)).toHaveClass('input-error');
    });

    it('removes input-error class once field becomes valid', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/full name/i));
      await user.tab();
      await user.type(screen.getByLabelText(/full name/i), 'Jane');
      expect(screen.getByLabelText(/full name/i)).not.toHaveClass('input-error');
    });
  });

  describe('submit with invalid fields', () => {
    it('shows all field errors on submit when the form is empty', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
      expect(screen.getByText('Valid email is required.')).toBeInTheDocument();
      expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    });

    it('does not call the API when the form is invalid', async () => {
      const postSpy = vi.fn();
      server.use(http.post(USERS_URL, () => { postSpy(); return HttpResponse.json({}, { status: 201 }); }));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  describe('successful submission', () => {
    beforeEach(() => {
      server.use(http.post(USERS_URL, () => HttpResponse.json({}, { status: 201 })));
    });

    it('calls onClose after a successful submission', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();

      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('shows "Creating…" on the submit button while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.post(USERS_URL, () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(await screen.findByRole('button', { name: /creating…/i })).toBeInTheDocument();

      // clean up: resolve the hanging request
      resolve();
    });

    it('disables both Cancel and submit while submitting', async () => {
      let resolve!: () => void;
      server.use(
        http.post(USERS_URL, () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      await screen.findByRole('button', { name: /creating…/i });
      expect(screen.getByRole('button', { name: /creating…/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      resolve();
    });

    it('sends the correct payload to the API', async () => {
      let captured: unknown;
      server.use(
        http.post(USERS_URL, async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/full name/i), 'Jane Doe');
      await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
      await user.type(screen.getByLabelText(/password/i), 'secret123');
      await user.selectOptions(screen.getByLabelText(/role/i), 'INSTRUCTOR');
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      await waitFor(() => expect(captured).toBeDefined());
      expect(captured).toEqual({
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'secret123',
        role: 'INSTRUCTOR',
      });
    });
  });

  describe('failed submission', () => {
    it('shows a server error message when the API returns an error', async () => {
      server.use(
        http.post(USERS_URL, () =>
          HttpResponse.json({ error: 'Email already in use.' }, { status: 409 }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(await screen.findByText('Email already in use.')).toBeInTheDocument();
    });

    it('shows a generic error when the API response has no error field', async () => {
      server.use(
        http.post(USERS_URL, () => HttpResponse.json({}, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(await screen.findByText('Failed to create user.')).toBeInTheDocument();
    });

    it('re-enables the submit button after a failed request', async () => {
      server.use(
        http.post(USERS_URL, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      expect(await screen.findByRole('button', { name: /^create user$/i })).not.toBeDisabled();
    });

    it('does not call onClose on a failed request', async () => {
      server.use(
        http.post(USERS_URL, () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await fillValidForm(user);
      await user.click(screen.getByRole('button', { name: /^create user$/i }));

      await screen.findByText('Server error');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Cancel button', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('role select', () => {
    it('can select Instructor', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.selectOptions(screen.getByLabelText(/role/i), 'INSTRUCTOR');
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('INSTRUCTOR');
    });

    it('can select Admin', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.selectOptions(screen.getByLabelText(/role/i), 'ADMIN');
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('ADMIN');
    });
  });
});
