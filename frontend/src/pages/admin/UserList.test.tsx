import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import UserList from './UserList';
import { server, mockUsers, USERS_URL } from '../../test/server';

function renderUserList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>,
  );
}

describe('UserList', () => {
  describe('loading state', () => {
    it('renders skeleton rows while fetching', () => {
      renderUserList();
      // 8 skeleton rows × 6 cells each
      const skeletons = document.querySelectorAll('.skeleton');
      expect(skeletons.length).toBe(8 * 6);
    });

    it('hides the filters while loading', () => {
      renderUserList();
      const filters = document.querySelector('.user-list-filters') as HTMLElement;
      expect(filters.style.visibility).toBe('hidden');
    });
  });

  describe('success state', () => {
    beforeEach(async () => {
      renderUserList();
      // wait for all four user rows to appear
      await screen.findByText('Alice Admin');
    });

    it('displays the total user count', () => {
      expect(screen.getByText(`${mockUsers.length} total users`)).toBeInTheDocument();
    });

    it('renders a row for every user returned by the API', () => {
      for (const user of mockUsers) {
        expect(screen.getByText(user.name)).toBeInTheDocument();
        expect(screen.getByText(user.email)).toBeInTheDocument();
      }
    });

    it('shows the correct role badge for each user', () => {
      const tbody = document.querySelector('.users-table tbody') as HTMLElement;
      expect(within(tbody).getByText('Admin')).toBeInTheDocument();
      expect(within(tbody).getByText('Instructor')).toBeInTheDocument();
      // two students
      expect(within(tbody).getAllByText('Student')).toHaveLength(2);
    });

    it('marks unverified users correctly', () => {
      const carolRow = screen.getByText('Carol Student').closest('tr')!;
      expect(within(carolRow).getByText('No')).toBeInTheDocument();
    });

    it('shows Active status for non-deleted users', () => {
      const aliceRow = screen.getByText('Alice Admin').closest('tr')!;
      expect(within(aliceRow).getByText('Active')).toBeInTheDocument();
    });

    it('shows Deactivated status and dims the row for soft-deleted users', () => {
      const daveRow = screen.getByText('Dave Deleted').closest('tr')!;
      expect(within(daveRow).getByText('Deactivated')).toBeInTheDocument();
      expect(daveRow).toHaveClass('row-deleted');
    });

    it('reveals the filters after data loads', () => {
      const filters = document.querySelector('.user-list-filters') as HTMLElement;
      expect(filters.style.visibility).toBe('visible');
    });
  });

  describe('search filter', () => {
    beforeEach(async () => {
      renderUserList();
      await screen.findByText('Alice Admin');
    });

    it('filters rows by name', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'Bob');

      expect(screen.getByText('Bob Instructor')).toBeInTheDocument();
      expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    });

    it('filters rows by email', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'carol@');

      expect(screen.getByText('Carol Student')).toBeInTheDocument();
      expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    });

    it('shows the empty message when nothing matches', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'zzznomatch');

      expect(screen.getByText(/no users match/i)).toBeInTheDocument();
    });

    it('search is case-insensitive', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'ALICE');

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });
  });

  describe('role filter', () => {
    beforeEach(async () => {
      renderUserList();
      await screen.findByText('Alice Admin');
    });

    it('filters to only admins', async () => {
      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox'), 'ADMIN');

      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
      expect(screen.queryByText('Bob Instructor')).not.toBeInTheDocument();
      expect(screen.queryByText('Carol Student')).not.toBeInTheDocument();
    });

    it('filters to only instructors', async () => {
      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox'), 'INSTRUCTOR');

      expect(screen.getByText('Bob Instructor')).toBeInTheDocument();
      expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    });

    it('filters to only students', async () => {
      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox'), 'STUDENT');

      expect(screen.getByText('Carol Student')).toBeInTheDocument();
      expect(screen.getByText('Dave Deleted')).toBeInTheDocument();
      expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument();
    });

    it('shows all users when reset to All Roles', async () => {
      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox'), 'ADMIN');
      await user.selectOptions(screen.getByRole('combobox'), '');

      expect(screen.getAllByRole('row')).toHaveLength(mockUsers.length + 1); // +1 for thead
    });
  });

  describe('combined search + role filter', () => {
    it('applies both filters simultaneously', async () => {
      renderUserList();
      await screen.findByText('Alice Admin');

      const user = userEvent.setup();
      await user.selectOptions(screen.getByRole('combobox'), 'STUDENT');
      await user.type(screen.getByPlaceholderText(/search/i), 'carol');

      expect(screen.getByText('Carol Student')).toBeInTheDocument();
      expect(screen.queryByText('Dave Deleted')).not.toBeInTheDocument();
    });
  });

  describe('Create User modal', () => {
    beforeEach(async () => {
      renderUserList();
      await screen.findByText('Alice Admin');
    });

    it('does not show the modal before the button is clicked', () => {
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });

    it('opens the modal when "+ New User" is clicked', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new user/i }));
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    it('closes the modal when clicking the backdrop', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new user/i }));
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();

      await user.click(document.querySelector('.modal-backdrop')!);
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });

    it('closes the modal when pressing Escape', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new user/i }));
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });

    it('does not close the modal when clicking inside the modal card', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new user/i }));

      await user.click(document.querySelector('.modal-card')!);
      expect(screen.getByRole('heading', { name: /create new user/i })).toBeInTheDocument();
    });

    it('closes the modal when clicking the × close button', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new user/i }));
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByRole('heading', { name: /create new user/i })).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows an error message when the request fails', async () => {
      server.use(
        http.get(USERS_URL, () => HttpResponse.json({ error: 'Server Error' }, { status: 500 })),
      );
      renderUserList();
      expect(await screen.findByText(/failed to load users/i)).toBeInTheDocument();
    });
  });
});
