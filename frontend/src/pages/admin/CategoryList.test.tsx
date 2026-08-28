import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { describe, it, expect, beforeEach } from 'vitest';
import CategoryList from './CategoryList';
import { server, mockCategories, CATEGORIES_URL } from '../../test/server';

function renderCategoryList() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoryList />
    </QueryClientProvider>,
  );
}

describe('CategoryList', () => {
  describe('loading state', () => {
    it('shows a loading message while fetching', () => {
      renderCategoryList();
      expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
    });
  });

  describe('success state', () => {
    beforeEach(async () => {
      renderCategoryList();
      await screen.findByText('Programming');
    });

    it('displays the total category count', () => {
      expect(screen.getByText(`${mockCategories.length} total categories`)).toBeInTheDocument();
    });

    it('renders a row for every category returned by the API', () => {
      for (const cat of mockCategories) {
        expect(screen.getByText(cat.name)).toBeInTheDocument();
      }
    });

    it('renders descriptions when present', () => {
      expect(screen.getByText('All things code')).toBeInTheDocument();
    });

    it('shows a dash for categories with no description', () => {
      const designRow = screen.getByText('Design').closest('tr')!;
      expect(designRow.textContent).toContain('—');
    });

    it('shows the course count pill for each category', () => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Programming
      expect(screen.getByText('0')).toBeInTheDocument(); // Design
      expect(screen.getByText('1')).toBeInTheDocument(); // Business
    });

    it('renders Edit and Delete buttons for each row', () => {
      expect(screen.getAllByRole('button', { name: /^edit$/i })).toHaveLength(mockCategories.length);
      expect(screen.getAllByRole('button', { name: /^delete$/i })).toHaveLength(mockCategories.length);
    });
  });

  describe('error state', () => {
    it('shows an error message when the API fails', async () => {
      server.use(http.get(CATEGORIES_URL, () => HttpResponse.json({}, { status: 500 })));
      renderCategoryList();
      expect(await screen.findByText(/failed to load categories/i)).toBeInTheDocument();
    });
  });

  describe('search filter', () => {
    beforeEach(async () => {
      renderCategoryList();
      await screen.findByText('Programming');
    });

    it('filters rows by name', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'prog');

      expect(screen.getByText('Programming')).toBeInTheDocument();
      expect(screen.queryByText('Design')).not.toBeInTheDocument();
      expect(screen.queryByText('Business')).not.toBeInTheDocument();
    });

    it('search is case-insensitive', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'DESIGN');

      expect(screen.getByText('Design')).toBeInTheDocument();
      expect(screen.queryByText('Programming')).not.toBeInTheDocument();
    });

    it('shows the empty-state message when nothing matches', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'zzznomatch');

      expect(screen.getByText(/no categories found/i)).toBeInTheDocument();
    });

    it('shows all rows when search is cleared', async () => {
      const user = userEvent.setup();
      await user.type(screen.getByPlaceholderText(/search/i), 'prog');
      await user.clear(screen.getByPlaceholderText(/search/i));

      expect(screen.getAllByRole('row')).toHaveLength(mockCategories.length + 1); // +1 for thead
    });
  });

  describe('Create Category modal integration', () => {
    beforeEach(async () => {
      renderCategoryList();
      await screen.findByText('Programming');
    });

    it('does not show the modal before the button is clicked', () => {
      expect(screen.queryByRole('heading', { name: /create new category/i })).not.toBeInTheDocument();
    });

    it('opens the modal when "+ New Category" is clicked', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new category/i }));
      expect(screen.getByRole('heading', { name: /create new category/i })).toBeInTheDocument();
    });

    it('closes the modal when the backdrop is clicked', async () => {
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /new category/i }));
      await user.click(document.querySelector('.modal-backdrop')!);
      expect(screen.queryByRole('heading', { name: /create new category/i })).not.toBeInTheDocument();
    });
  });

  describe('Edit Category modal integration', () => {
    beforeEach(async () => {
      renderCategoryList();
      await screen.findByText('Programming');
    });

    it('opens the Edit modal with the correct category data', async () => {
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe('Programming');
    });

    it('closes the Edit modal when the × button is clicked', async () => {
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0]);
      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByRole('heading', { name: /edit category/i })).not.toBeInTheDocument();
    });
  });

  describe('Delete Category modal integration', () => {
    beforeEach(async () => {
      renderCategoryList();
      await screen.findByText('Programming');
    });

    it('opens the Delete modal when Delete is clicked', async () => {
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
      expect(screen.getByRole('heading', { name: /delete category/i })).toBeInTheDocument();
    });

    it('shows the category name in the Delete modal', async () => {
      const user = userEvent.setup();
      await user.click(screen.getAllByRole('button', { name: /^delete$/i })[0]);
      // scope to the modal so we don't conflict with the table row
      const modal = document.querySelector('.modal-card')!;
      expect(modal.textContent).toMatch(/programming/i);
    });
  });
});
