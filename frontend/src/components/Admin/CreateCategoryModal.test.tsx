import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, vi } from 'vitest';
import CreateCategoryModal from './CreateCategoryModal';
import { server, CATEGORIES_URL } from '../../test/server';

function renderModal(onClose = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <CreateCategoryModal onClose={onClose} />
      </QueryClientProvider>,
    ),
  };
}

describe('CreateCategoryModal', () => {
  describe('initial render', () => {
    it('renders the Name and Description fields', () => {
      renderModal();
      expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('renders "Create Category" as the submit button label', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /^create category$/i })).toBeInTheDocument();
    });

    it('renders a Cancel button', () => {
      renderModal();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('shows no validation errors before any interaction', () => {
      renderModal();
      expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
    });

    it('starts with empty fields', () => {
      renderModal();
      expect((screen.getByLabelText(/^name$/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('inline validation (on blur)', () => {
    it('shows a name error after blurring an empty name field', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/^name$/i));
      await user.tab();
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    it('adds input-error class to the name field when it is invalid', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/^name$/i));
      await user.tab();
      expect(screen.getByLabelText(/^name$/i)).toHaveClass('input-error');
    });

    it('clears the name error once a valid name is typed', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/^name$/i));
      await user.tab();
      await screen.findByText('Name is required.');
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      expect(screen.queryByText('Name is required.')).not.toBeInTheDocument();
    });

    it('removes input-error class once the field becomes valid', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByLabelText(/^name$/i));
      await user.tab();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      expect(screen.getByLabelText(/^name$/i)).not.toHaveClass('input-error');
    });
  });

  describe('submit with invalid fields', () => {
    it('shows the name error on submit when the form is empty', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^create category$/i }));
      expect(await screen.findByText('Name is required.')).toBeInTheDocument();
    });

    it('does not call the API when the form is invalid', async () => {
      const postSpy = vi.fn();
      server.use(http.post(CATEGORIES_URL, () => { postSpy(); return HttpResponse.json({}, { status: 201 }); }));

      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByRole('button', { name: /^create category$/i }));
      expect(postSpy).not.toHaveBeenCalled();
    });
  });

  describe('successful submission', () => {
    it('calls onClose after a successful POST', async () => {
      server.use(http.post(CATEGORIES_URL, () => HttpResponse.json({}, { status: 201 })));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });

    it('submits with optional description when provided', async () => {
      let capturedBody: unknown;
      server.use(
        http.post(CATEGORIES_URL, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json({}, { status: 201 });
        }),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      await user.type(screen.getByLabelText(/description/i), 'Natural sciences');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      await waitFor(() => expect(capturedBody).toMatchObject({ name: 'Science', description: 'Natural sciences' }));
    });

    it('shows "Creating…" while the request is in flight', async () => {
      let resolve!: () => void;
      server.use(
        http.post(CATEGORIES_URL, () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      expect(await screen.findByRole('button', { name: /creating…/i })).toBeInTheDocument();
      resolve();
    });

    it('disables both buttons while submitting', async () => {
      let resolve!: () => void;
      server.use(
        http.post(CATEGORIES_URL, () =>
          new Promise<Response>((res) => { resolve = () => res(HttpResponse.json({}, { status: 201 }) as unknown as Response); }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      await screen.findByRole('button', { name: /creating…/i });
      expect(screen.getByRole('button', { name: /creating…/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      resolve();
    });
  });

  describe('server error handling', () => {
    it('shows the error message returned by the server', async () => {
      server.use(
        http.post(CATEGORIES_URL, () =>
          HttpResponse.json({ error: 'A category with that name already exists.' }, { status: 409 }),
        ),
      );

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Programming');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      expect(await screen.findByText('A category with that name already exists.')).toBeInTheDocument();
    });

    it('shows a fallback error when the server sends no message', async () => {
      server.use(http.post(CATEGORIES_URL, () => HttpResponse.json({}, { status: 500 })));

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Science');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      expect(await screen.findByText(/failed to create category/i)).toBeInTheDocument();
    });

    it('does not call onClose after a failed request', async () => {
      server.use(http.post(CATEGORIES_URL, () => HttpResponse.json({ error: 'Conflict.' }, { status: 409 })));

      const user = userEvent.setup();
      const { onClose } = renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Programming');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      await screen.findByText('Conflict.');
      expect(onClose).not.toHaveBeenCalled();
    });

    it('re-enables the submit button after a failed request', async () => {
      server.use(http.post(CATEGORIES_URL, () => HttpResponse.json({ error: 'Conflict.' }, { status: 409 })));

      const user = userEvent.setup();
      renderModal();
      await user.type(screen.getByLabelText(/^name$/i), 'Programming');
      await user.click(screen.getByRole('button', { name: /^create category$/i }));

      expect(await screen.findByRole('button', { name: /^create category$/i })).not.toBeDisabled();
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
