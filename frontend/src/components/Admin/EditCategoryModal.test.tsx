import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import EditCategoryModal from './EditCategoryModal';
import type { CategoryRow } from './EditCategoryModal';
import { server, CATEGORY_URL } from '../../test/server';

const programmingCategory: CategoryRow = {
  id: 'cat-1',
  name: 'Programming',
  description: 'All things code',
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-01T10:00:00.000Z',
  _count: { courses: 3 },
};

const noDescCategory: CategoryRow = {
  id: 'cat-2',
  name: 'Design',
  description: null,
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-01T10:00:00.000Z',
  _count: { courses: 0 },
};

function renderModal(category: CategoryRow = programmingCategory, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <EditCategoryModal category={category} onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('EditCategoryModal', () => {
  describe('initial render', () => {
    it('shows "Edit Category" as the heading', () => {
      renderModal();
      expect(screen.getByRole('heading', { name: /edit category/i })).toBeInTheDocument();
    });

    it('pre-fills the name field with the current category name', () => {
      renderModal();
      expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('Programming');
    });

    it('pre-fills the description field with the current description', () => {
      renderModal();
      expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('All things code');
    });

    it('leaves description empty when the category has no description', () => {
      renderModal(noDescCategory);
      expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('');
    });

    it('renders "Save Changes" as the submit button label', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /^save changes$/i })).toBeInTheDocument();
    });

    it('shows no validation errors before any interaction', () => {
      renderModal();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });
  });

  describe('inline validation (on blur)', () => {
    it('shows a name error after clearing the name and blurring', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.tab();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    it('adds input-error class to the name field when invalid', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.tab();
      expect(screen.getByLabelText(/^name$/i)).toHaveClass('input-error');
    });
  });

  describe('successful submission', () => {
    it('calls onClose after a successful PATCH', async () => {
      server.use(http.patch(CATEGORY_URL('cat-1'), () => HttpResponse.json({})));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('sends the updated name and description to the correct endpoint', async () => {
      let capturedBody: unknown;
      server.use(
        http.patch(CATEGORY_URL('cat-1'), async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({});
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.clear(screen.getByLabelText(/^name$/i));
      await user.type(screen.getByLabelText(/^name$/i), 'Advanced Programming');
      await user.clear(screen.getByLabelText(/description/i));
      await user.type(screen.getByLabelText(/description/i), 'Deep-dive topics');
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      await waitFor(() =>
        expect(capturedBody).toMatchObject({ name: 'Advanced Programming', description: 'Deep-dive topics' }),
      );
    });

    it('shows "Saving…" while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.patch(CATEGORY_URL('cat-1'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      expect(await screen.findByRole('button', { name: /saving…/i })).toBeInTheDocument();
      resolve();
    });

    it('disables both buttons while submitting', async () => {
      let resolve!: () => void;
      server.use(
        http.patch(CATEGORY_URL('cat-1'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      await screen.findByRole('button', { name: /saving…/i });
      expect(screen.getByRole('button', { name: /saving…/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      resolve();
    });
  });

  describe('server error handling', () => {
    it('shows the error message returned by the server', async () => {
      server.use(
        http.patch(CATEGORY_URL('cat-1'), () =>
          HttpResponse.json({ error: 'A category with that name already exists.' }, { status: 409 }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      expect(await screen.findByText('A category with that name already exists.')).toBeInTheDocument();
    });

    it('shows a fallback error when the server sends no message', async () => {
      server.use(http.patch(CATEGORY_URL('cat-1'), () => HttpResponse.json({}, { status: 500 })));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      expect(await screen.findByText(/failed to update category/i)).toBeInTheDocument();
    });

    it('does not call onClose after a failed request', async () => {
      server.use(http.patch(CATEGORY_URL('cat-1'), () => HttpResponse.json({ error: 'Conflict.' }, { status: 409 })));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      await screen.findByText('Conflict.');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('re-enables the submit button after a failed request', async () => {
      server.use(http.patch(CATEGORY_URL('cat-1'), () => HttpResponse.json({ error: 'Error.' }, { status: 500 })));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^save changes$/i }));

      expect(await screen.findByRole('button', { name: /^save changes$/i })).not.toBeDisabled();
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
});
