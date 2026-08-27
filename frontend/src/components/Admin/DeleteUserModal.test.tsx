import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import DeleteUserModal from './DeleteUserModal';
import type { UserRow } from './EditUserModal';
import { server, USER_URL } from '../../test/server';

const instructor: UserRow = {
  id: '2',
  name: 'Bob Instructor',
  email: 'bob@example.com',
  role: 'INSTRUCTOR',
  emailVerified: true,
  approvalStatus: 'APPROVED',
  createdAt: '2024-02-20T10:00:00.000Z',
  deletedAt: null,
};

const student: UserRow = {
  id: '3',
  name: 'Carol Student',
  email: 'carol@example.com',
  role: 'STUDENT',
  emailVerified: false,
  approvalStatus: 'APPROVED',
  createdAt: '2024-03-10T10:00:00.000Z',
  deletedAt: null,
};

function renderModal(user: UserRow, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DeleteUserModal user={user} onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('DeleteUserModal', () => {
  describe('instructor (soft delete)', () => {
    it('shows "Deactivate User" as the heading', () => {
      renderModal(instructor);
      expect(screen.getByRole('heading', { name: /deactivate user/i })).toBeInTheDocument();
    });

    it('mentions the user name in the confirmation message', () => {
      renderModal(instructor);
      expect(screen.getByText(/bob instructor/i)).toBeInTheDocument();
    });

    it('explains that data will be kept (soft delete)', () => {
      renderModal(instructor);
      expect(screen.getByText(/data will be kept/i)).toBeInTheDocument();
    });

    it('shows a "Deactivate" confirm button', () => {
      renderModal(instructor);
      expect(screen.getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument();
    });

    it('calls the DELETE endpoint and closes on confirm', async () => {
      server.use(http.delete(USER_URL('2'), () => HttpResponse.json({ deleted: 'soft' })));

      const user = userEvent.setup();
      const { onClose } = renderModal(instructor);
      await user.click(screen.getByRole('button', { name: /^deactivate$/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('shows "Deactivating…" while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.delete(USER_URL('2'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({ deleted: 'soft' }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal(instructor);
      await user.click(screen.getByRole('button', { name: /^deactivate$/i }));

      expect(await screen.findByRole('button', { name: /deactivating…/i })).toBeInTheDocument();
      resolve();
    });
  });

  describe('student (hard delete)', () => {
    it('shows "Delete User" as the heading', () => {
      renderModal(student);
      expect(screen.getByRole('heading', { name: /delete user/i })).toBeInTheDocument();
    });

    it('mentions the user name in the confirmation message', () => {
      renderModal(student);
      expect(screen.getByText(/carol student/i)).toBeInTheDocument();
    });

    it('warns that the action cannot be undone', () => {
      renderModal(student);
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('shows a "Delete" confirm button', () => {
      renderModal(student);
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('calls the DELETE endpoint and closes on confirm', async () => {
      server.use(http.delete(USER_URL('3'), () => HttpResponse.json({ deleted: 'hard' })));

      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));
      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('shows "Deleting…" while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.delete(USER_URL('3'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({ deleted: 'hard' }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByRole('button', { name: /deleting…/i })).toBeInTheDocument();
      resolve();
    });
  });

  describe('error handling', () => {
    it('shows a server error message on failure', async () => {
      server.use(
        http.delete(USER_URL('3'), () =>
          HttpResponse.json({ error: 'Database error.' }, { status: 500 }),
        ),
      );

      const user = userEvent.setup();
      renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByText('Database error.')).toBeInTheDocument();
    });

    it('shows a generic fallback when the API has no error field', async () => {
      server.use(
        http.delete(USER_URL('3'), () => HttpResponse.json({}, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByText(/failed to delete user \(http 500\)/i)).toBeInTheDocument();
    });

    it('re-enables the confirm button after a failed request', async () => {
      server.use(
        http.delete(USER_URL('3'), () => HttpResponse.json({ error: 'Error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByRole('button', { name: /^delete$/i })).not.toBeDisabled();
    });

    it('does not call onClose on a failed request', async () => {
      server.use(
        http.delete(USER_URL('3'), () => HttpResponse.json({ error: 'Error' }, { status: 500 })),
      );

      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await screen.findByText('Error');
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('dismiss behaviours', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the × button is clicked', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when clicking the backdrop', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.click(document.querySelector('.modal-backdrop')!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when pressing Escape', async () => {
      const user = userEvent.setup();
      const { onClose } = renderModal(student);
      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
