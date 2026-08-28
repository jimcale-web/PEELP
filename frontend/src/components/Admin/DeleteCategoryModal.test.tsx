import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import DeleteCategoryModal from './DeleteCategoryModal';
import type { CategoryRow } from './EditCategoryModal';
import { server, CATEGORY_URL } from '../../test/server';

const withCourses: CategoryRow = {
  id: 'cat-1',
  name: 'Programming',
  description: 'All things code',
  createdAt: '2024-01-01T10:00:00.000Z',
  updatedAt: '2024-01-01T10:00:00.000Z',
  _count: { courses: 3 },
};

const withoutCourses: CategoryRow = {
  id: 'cat-2',
  name: 'Design',
  description: null,
  createdAt: '2024-02-01T10:00:00.000Z',
  updatedAt: '2024-02-01T10:00:00.000Z',
  _count: { courses: 0 },
};

const withOneCourse: CategoryRow = {
  id: 'cat-3',
  name: 'Business',
  description: null,
  createdAt: '2024-03-01T10:00:00.000Z',
  updatedAt: '2024-03-01T10:00:00.000Z',
  _count: { courses: 1 },
};

function renderModal(category: CategoryRow = withCourses, onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DeleteCategoryModal category={category} onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('DeleteCategoryModal', () => {
  describe('initial render', () => {
    it('shows "Delete Category" as the heading', () => {
      renderModal();
      expect(screen.getByRole('heading', { name: /delete category/i })).toBeInTheDocument();
    });

    it('shows the category name in the confirmation message', () => {
      renderModal();
      expect(screen.getByText(/programming/i)).toBeInTheDocument();
    });

    it('warns that the action cannot be undone', () => {
      renderModal();
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    it('shows a "Delete" confirm button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
    });

    it('shows a Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  describe('course-count warning', () => {
    it('warns about affected courses when count > 1', () => {
      renderModal(withCourses);
      expect(screen.getByText(/3 courses/i)).toBeInTheDocument();
      expect(screen.getByText(/uncategorised/i)).toBeInTheDocument();
    });

    it('uses singular "course" when count is 1', () => {
      renderModal(withOneCourse);
      // The <strong> leaf element contains exactly "1 course" (no trailing 's')
      expect(screen.getByText('1 course')).toBeInTheDocument();
    });

    it('does not show the course warning when count is 0', () => {
      renderModal(withoutCourses);
      expect(screen.queryByText(/uncategorised/i)).not.toBeInTheDocument();
    });
  });

  describe('successful deletion', () => {
    it('calls the DELETE endpoint and closes on confirm', async () => {
      server.use(http.delete(CATEGORY_URL('cat-1'), () => HttpResponse.json({ deleted: true })));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('shows "Deleting…" while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.delete(CATEGORY_URL('cat-1'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({ deleted: true }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByRole('button', { name: /deleting…/i })).toBeInTheDocument();
      resolve();
    });

    it('disables both buttons while deleting', async () => {
      let resolve!: () => void;
      server.use(
        http.delete(CATEGORY_URL('cat-1'), () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({ deleted: true }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await screen.findByRole('button', { name: /deleting…/i });
      expect(screen.getByRole('button', { name: /deleting…/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      resolve();
    });
  });

  describe('error handling', () => {
    it('shows the error message returned by the server', async () => {
      server.use(
        http.delete(CATEGORY_URL('cat-1'), () =>
          HttpResponse.json({ error: 'Category not found.' }, { status: 404 }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByText('Category not found.')).toBeInTheDocument();
    });

    it('shows a fallback error when the server sends no message', async () => {
      server.use(http.delete(CATEGORY_URL('cat-1'), () => HttpResponse.json({}, { status: 500 })));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByText(/failed to delete category/i)).toBeInTheDocument();
    });

    it('does not call onClose after a failed request', async () => {
      server.use(http.delete(CATEGORY_URL('cat-1'), () => HttpResponse.json({ error: 'Error.' }, { status: 500 })));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      await screen.findByText('Error.');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('re-enables the confirm button after a failed request', async () => {
      server.use(http.delete(CATEGORY_URL('cat-1'), () => HttpResponse.json({ error: 'Error.' }, { status: 500 })));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^delete$/i }));

      expect(await screen.findByRole('button', { name: /^delete$/i })).not.toBeDisabled();
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
