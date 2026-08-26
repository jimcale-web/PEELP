import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditUserModal from './EditUserModal';
import type { UserRow } from './EditUserModal';
import { server, USER_URL } from '../../test/server';

const mockUser: UserRow = {
  id: '1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'ADMIN',
  emailVerified: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  deletedAt: null,
};

function renderModal(user: UserRow = mockUser, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditUserModal user={user} onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('EditUserModal', () => {
  describe('initial render', () => {
    it('pre-populates the name field with the user data', () => {
      renderModal();
      expect(screen.getByLabelText<HTMLInputElement>(/full name/i).value).toBe('Alice Admin');
    });

    it('pre-populates the email field with the user data', () => {
      renderModal();
      expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe('alice@example.com');
    });

    it('pre-selects the correct role', () => {
      renderModal();
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('ADMIN');
    });

    it('leaves the new password field blank', () => {
      renderModal();
      expect(screen.getByLabelText<HTMLInputElement>(/new password/i).value).toBe('');
    });

    it('shows the "Save Changes" submit button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('shows no validation errors before any interaction', () => {
      renderModal();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument();
    });
  });

  describe('inline validation (on blur)', () => {
    it('shows a name error after clearing and blurring the name field', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.clear(screen.getByLabelText(/full name/i));
      await user.tab();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    it('shows an email error after entering an invalid email', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.tripleClick(screen.getByLabelText(/email/i));
      await user.type(screen.getByLabelText(/email/i), 'not-valid');
      await user.tab();
      expect(await screen.findByText('Valid email is required.')).toBeInTheDocument();
    });

    it('shows a password error when a non-empty but short password is entered', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/new password/i), 'short');
      await user.tab();
      expect(await screen.findByText('New password must be at least 8 characters.')).toBeInTheDocument();
    });

    it('does not show a password error when the field is left blank', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/new password/i));
      await user.tab();
      expect(screen.queryByText(/at least 8/i)).not.toBeInTheDocument();
    });
  });

  describe('successful submission', () => {
    beforeEach(() => {
      server.use(
        http.patch(USER_URL('1'), () => HttpResponse.json({ user: mockUser }, { status: 200 })),
      );
    });

    it('calls onClose after a successful save (no password change)', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('calls onClose after a successful save with password change', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.type(screen.getByLabelText(/new password/i), 'newpassword1');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('sends an empty newPassword when the field is left blank', async () => {
      let captured: unknown;
      server.use(
        http.patch(USER_URL('1'), async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ user: mockUser }, { status: 200 });
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(captured).toBeDefined());

      expect((captured as Record<string, string>).newPassword).toBe('');
    });

    it('sends the new password when one is provided', async () => {
      let captured: unknown;
      server.use(
        http.patch(USER_URL('1'), async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ user: mockUser }, { status: 200 });
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/new password/i), 'newpassword1');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(captured).toBeDefined());

      expect((captured as Record<string, string>).newPassword).toBe('newpassword1');
    });

    it('sends updated profile fields to the correct endpoint', async () => {
      let captured: unknown;
      server.use(
        http.patch(USER_URL('1'), async ({ request }) => {
          captured = await request.json();
          return HttpResponse.json({ user: mockUser }, { status: 200 });
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.clear(screen.getByLabelText(/full name/i));
      await user.type(screen.getByLabelText(/full name/i), 'Alice Updated');
      await user.click(screen.getByRole('button', { name: /save changes/i }));
      await waitFor(() => expect(captured).toBeDefined());

      const payload = captured as Record<string, string>;
      expect(payload.name).toBe('Alice Updated');
      expect(payload.email).toBe('alice@example.com');
      expect(payload.role).toBe('ADMIN');
    });

    it('shows "Saving…" on the submit button while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.patch(USER_URL('1'), () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({ user: mockUser }) as unknown as Response);
          }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByRole('button', { name: /saving…/i })).toBeInTheDocument();
      resolve();
    });

    it('disables both buttons while submitting', async () => {
      let resolve!: () => void;
      server.use(
        http.patch(USER_URL('1'), () =>
          new Promise<Response>((res) => {
            resolve = () => res(HttpResponse.json({ user: mockUser }) as unknown as Response);
          }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await screen.findByRole('button', { name: /saving…/i });
      expect(screen.getByRole('button', { name: /saving…/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      resolve();
    });
  });

  describe('failed submission', () => {
    it('shows a server error message when the API returns an error', async () => {
      server.use(
        http.patch(USER_URL('1'), () =>
          HttpResponse.json({ error: 'Email already in use.' }, { status: 409 }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Email already in use.')).toBeInTheDocument();
    });

    it('shows a generic fallback when the API has no error field', async () => {
      server.use(
        http.patch(USER_URL('1'), () => HttpResponse.json({}, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByText('Failed to update user.')).toBeInTheDocument();
    });

    it('re-enables the submit button after a failed request', async () => {
      server.use(
        http.patch(USER_URL('1'), () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(await screen.findByRole('button', { name: /save changes/i })).not.toBeDisabled();
    });

    it('does not call onClose on a failed request', async () => {
      server.use(
        http.patch(USER_URL('1'), () => HttpResponse.json({ error: 'Server error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await screen.findByText('Server error');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('dismiss behaviours', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the × button is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the backdrop', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(document.querySelector('.modal-backdrop')!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing Escape', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('role select', () => {
    it('can change to Instructor', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.selectOptions(screen.getByLabelText(/role/i), 'INSTRUCTOR');
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('INSTRUCTOR');
    });

    it('can change to Student', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.selectOptions(screen.getByLabelText(/role/i), 'STUDENT');
      expect(screen.getByLabelText<HTMLSelectElement>(/role/i).value).toBe('STUDENT');
    });
  });
});
