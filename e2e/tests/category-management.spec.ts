import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Auth state created by global-setup.ts (admin session).
 */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

test.use({ storageState: AUTH_FILE });

// --- Helpers ------------------------------------------------------------------

function uid() {
  return Date.now().toString(36);
}

function testCategoryName(prefix: string) {
  return `${prefix}-${uid()}`;
}

async function gotoCategoryManagement(page: Page) {
  await page.goto('/admin/categories');
  await expect(page.getByRole('table')).toBeVisible();
}

/** Scoped locator for the open modal card. */
function modal(page: Page) {
  return page.locator('.modal-card');
}

/** Returns the table row that contains the given category name. */
function categoryRow(page: Page, name: string) {
  return page.getByRole('row', { name: new RegExp(name) });
}

async function createCategory(
  page: Page,
  opts: { name: string; description?: string },
) {
  const { name, description } = opts;

  await page.getByRole('button', { name: '+ New Category' }).click();
  const m = modal(page);
  await expect(m.getByRole('heading', { name: 'Create New Category' })).toBeVisible();

  await m.getByLabel('Name').fill(name);
  if (description) await m.getByLabel('Description').fill(description);

  await m.getByRole('button', { name: 'Create Category' }).click();
  await expect(m.getByRole('heading', { name: 'Create New Category' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
}

// --- Page rendering -----------------------------------------------------------

test.describe('Category Management page', () => {
  test('renders the page with table and toolbar', async ({ page }) => {
    await gotoCategoryManagement(page);

    await expect(page.getByRole('heading', { name: 'Category Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New Category' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by name\u2026')).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Courses' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Created' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });

  test('displays total category count', async ({ page }) => {
    await gotoCategoryManagement(page);
    await expect(page.getByText(/\d+ total categories/)).toBeVisible();
  });
});

// --- Create Category ----------------------------------------------------------

test.describe('Create Category', () => {
  test('opens the Create Category modal when "+ New Category" is clicked', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByRole('button', { name: '+ New Category' }).click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Create New Category' })).toBeVisible();
    await expect(m.getByLabel('Name')).toBeVisible();
    await expect(m.getByLabel('Description')).toBeVisible();
    await expect(m.getByRole('button', { name: 'Create Category' })).toBeVisible();
    await expect(m.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('creates a category with name only and it appears in the table', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-basic');
    await createCategory(page, { name });

    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });

  test('creates a category with name and description', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-desc');
    const description = 'A useful test description';
    await createCategory(page, { name, description });

    const row = categoryRow(page, name);
    await expect(row.getByText(description)).toBeVisible();
  });

  test('shows validation error when name is empty', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByRole('button', { name: '+ New Category' }).click();
    const m = modal(page);

    await m.getByLabel('Name').click();
    await m.getByLabel('Name').blur();
    await m.getByRole('button', { name: 'Create Category' }).click();

    await expect(m.getByText('Name is required.')).toBeVisible();
    // modal stays open
    await expect(m.getByRole('heading', { name: 'Create New Category' })).toBeVisible();
  });

  test('shows server error when creating a duplicate category name', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-dup');
    await createCategory(page, { name });

    // Try to create the same name again
    await page.getByRole('button', { name: '+ New Category' }).click();
    const m = modal(page);
    await m.getByLabel('Name').fill(name);
    await m.getByRole('button', { name: 'Create Category' }).click();

    await expect(m.locator('.modal-server-error')).toBeVisible();
    // modal stays open
    await expect(m.getByRole('heading', { name: 'Create New Category' })).toBeVisible();
  });

  test('closes the modal when Cancel is clicked', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByRole('button', { name: '+ New Category' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Create New Category' })).toBeVisible();

    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal on Escape key press', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByRole('button', { name: '+ New Category' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Create New Category' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal when clicking the backdrop', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByRole('button', { name: '+ New Category' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Create New Category' })).toBeVisible();

    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });
});

// --- Search / Filter ----------------------------------------------------------

test.describe('Search', () => {
  test('filters categories by name', async ({ page }) => {
    await gotoCategoryManagement(page);

    const uniquePart = uid();
    const nameA = `Alpha-${uniquePart}`;
    const nameB = `Beta-${uniquePart}`;

    await createCategory(page, { name: nameA });
    await createCategory(page, { name: nameB });

    await page.getByPlaceholder('Search by name\u2026').fill('Alpha');

    await expect(page.getByRole('cell', { name: nameA, exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: nameB, exact: true })).not.toBeVisible();
  });

  test('shows "No categories found." when search has no matches', async ({ page }) => {
    await gotoCategoryManagement(page);

    await page.getByPlaceholder('Search by name\u2026').fill('zzz-no-match-xyz-999');
    await expect(page.getByText('No categories found.')).toBeVisible();
  });

  test('clears the filter when search is emptied', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-filter-clear');
    await createCategory(page, { name });

    const searchInput = page.getByPlaceholder('Search by name\u2026');
    await searchInput.fill('zzz-no-match-xyz-999');
    await expect(page.getByRole('cell', { name, exact: true })).not.toBeVisible();

    await searchInput.clear();
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });
});

// --- Edit Category ------------------------------------------------------------

test.describe('Edit Category', () => {
  test('opens the Edit Category modal with pre-filled data', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-edit-open');
    const description = 'Original description';
    await createCategory(page, { name, description });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Edit' }).click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Edit Category' })).toBeVisible();
    await expect(m.getByLabel('Name')).toHaveValue(name);
    await expect(m.getByLabel('Description')).toHaveValue(description);
  });

  test('updates the category name and the change is reflected in the table', async ({ page }) => {
    await gotoCategoryManagement(page);

    const originalName = testCategoryName('cat-edit-name');
    await createCategory(page, { name: originalName });

    const updatedName = testCategoryName('cat-edited-name');

    const row = categoryRow(page, originalName);
    await row.getByRole('button', { name: 'Edit' }).click();
    const m = modal(page);

    await m.getByLabel('Name').clear();
    await m.getByLabel('Name').fill(updatedName);
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: updatedName, exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: originalName, exact: true })).not.toBeVisible();
  });

  test('updates the category description and the change is reflected in the table', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-edit-desc');
    await createCategory(page, { name, description: 'Old description' });

    const newDescription = 'Updated description text';

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Edit' }).click();
    const m = modal(page);

    await m.getByLabel('Description').clear();
    await m.getByLabel('Description').fill(newDescription);
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(categoryRow(page, name).getByText(newDescription)).toBeVisible();
  });

  test('shows validation error when name is cleared in edit modal', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-edit-blank');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Edit' }).click();
    const m = modal(page);

    await m.getByLabel('Name').clear();
    await m.getByLabel('Name').blur();
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(m.getByText('Name is required.')).toBeVisible();
    await expect(m.getByRole('heading', { name: 'Edit Category' })).toBeVisible();
  });

  test('closes the Edit modal on Cancel', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-edit-cancel');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Edit Category' })).toBeVisible();

    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the Edit modal on Escape key press', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-edit-escape');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Edit Category' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });
});

// --- Delete Category ----------------------------------------------------------

test.describe('Delete Category', () => {
  test('opens the Delete confirmation modal with category name', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-del-open');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Delete' }).click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Delete Category' })).toBeVisible();
    await expect(m.getByText(new RegExp(name))).toBeVisible();
    await expect(m.getByText(/cannot be undone/)).toBeVisible();
  });

  test('deletes a category and the row is removed from the table', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-del-confirm');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Delete' }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Delete Category' })).toBeVisible();

    await m.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name, exact: true })).not.toBeVisible();
  });

  test('closes the Delete modal on Cancel', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-del-cancel');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Delete Category' })).toBeVisible();

    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
    // Category still present after cancel
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });

  test('closes the Delete modal on Escape key press', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-del-escape');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Delete Category' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });

  test('closes the Delete modal when clicking the backdrop', async ({ page }) => {
    await gotoCategoryManagement(page);

    const name = testCategoryName('cat-del-backdrop');
    await createCategory(page, { name });

    const row = categoryRow(page, name);
    await row.getByRole('button', { name: 'Delete' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Delete Category' })).toBeVisible();

    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });
});
