import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Auth state created by auth.setup.ts.
 * All tests here reuse the admin session so we don't log in on every test.
 */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

test.use({ storageState: AUTH_FILE });

// --- Helpers ------------------------------------------------------------------

function uid() {
  return Date.now().toString(36);
}

function testEmail(prefix: string) {
  return `${prefix}-${uid()}@e2e-test.example`;
}

async function gotoUserManagement(page: Page) {
  await page.goto('/admin/users');
  await expect(page.getByRole('table')).toBeVisible();
}

/**
 * Returns a locator scoped to the open modal card so that getByLabel / getByRole
 * cannot accidentally match aria-label text in the table rows behind the modal.
 */
function modal(page: Page) {
  return page.locator('.modal-card');
}

async function createUser(
  page: Page,
  opts: { name: string; email: string; password?: string; role?: string },
) {
  const { name, email, password = 'Password123', role } = opts;

  await page.getByRole('button', { name: '+ New User' }).click();
  const m = modal(page);
  await expect(m.getByRole('heading', { name: 'Create New User' })).toBeVisible();

  await m.getByLabel('Full Name').fill(name);
  await m.getByLabel('Email').fill(email);
  await m.getByLabel('Password').fill(password);
  if (role) await m.getByLabel('Role').selectOption(role);

  await m.getByRole('button', { name: 'Create User' }).click();
  await expect(m.getByRole('heading', { name: 'Create New User' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
}

// --- Page rendering -----------------------------------------------------------

test.describe('User Management page', () => {
  test('renders the page with table and toolbar', async ({ page }) => {
    await gotoUserManagement(page);

    await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ New User' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by name or email\u2026')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filter by role' })).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role' })).toBeVisible();
  });

  test('displays total user count', async ({ page }) => {
    await gotoUserManagement(page);
    await expect(page.getByText(/\d+ total users/)).toBeVisible();
  });

  test('shows the seeded admin user in the table', async ({ page }) => {
    await gotoUserManagement(page);
    await expect(page.getByRole('cell', { name: 'admin@example.com', exact: true })).toBeVisible();
  });
});

// --- Create User --------------------------------------------------------------

test.describe('Create User', () => {
  test('opens the Create User modal when "+ New User" is clicked', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: '+ New User' }).click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Create New User' })).toBeVisible();
    await expect(m.getByLabel('Full Name')).toBeVisible();
    await expect(m.getByLabel('Email')).toBeVisible();
    await expect(m.getByLabel('Password')).toBeVisible();
    await expect(m.getByLabel('Role')).toBeVisible();
  });

  test('creates a new Student and the user appears in the table', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('student');
    const name = 'E2E Student';

    await createUser(page, { name, email });

    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });

  test('creates a new Instructor and the user appears in the table', async ({ page }) => {
    await gotoUserManagement(page);

    await createUser(page, {
      name: 'E2E Instructor',
      email: testEmail('instructor'),
      role: 'INSTRUCTOR',
    });
  });

  test('creates a new Admin and the user appears in the table', async ({ page }) => {
    await gotoUserManagement(page);

    await createUser(page, {
      name: 'E2E Admin Two',
      email: testEmail('admin2'),
      role: 'ADMIN',
    });
  });

  test('closes the modal when Cancel is clicked', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: '+ New User' }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Create New User' })).toBeVisible();

    await m.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal on Escape key press', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: '+ New User' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Create New User' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal when clicking the backdrop', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: '+ New User' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Create New User' })).toBeVisible();

    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });
});

// --- Edit User ----------------------------------------------------------------

test.describe('Edit User', () => {
  test('opens the Edit User modal and pre-fills user data', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: /^Edit Admin User/ }).first().click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Edit User' })).toBeVisible();
    await expect(m.getByLabel('Full Name')).toHaveValue('Admin User');
    await expect(m.getByLabel('Email')).toHaveValue('admin@example.com');
  });

  test('updates user name and the change is reflected in the table', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('edit-target');
    const originalName = 'Edit Target';
    const updatedName = 'Edit Target Updated';

    await createUser(page, { name: originalName, email });

    await page.getByRole('button', { name: `Edit ${originalName}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    await m.getByLabel('Full Name').fill(updatedName);
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: updatedName, exact: true })).toBeVisible();
  });

  test('updates user role and the role pill changes in the table', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('role-change');
    const name = 'Role Change User';

    await createUser(page, { name, email });

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    await m.getByLabel('Role').selectOption('INSTRUCTOR');
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();

    const userRow = page.getByRole('row', { name: new RegExp(email) });
    await expect(userRow.getByText('Instructor')).toBeVisible();
  });

  test('updates user password (user can then sign in with new password)', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('pw-reset');
    const name = 'Password Reset User';

    await createUser(page, { name, email, password: 'OldPass123' });

    await page.getByRole('button', { name: `Edit ${name}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    await m.getByLabel('New Password').fill('NewPass456');
    await m.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('NewPass456');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('closes the Edit modal on Cancel', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: /^Edit Admin User/ }).first().click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Edit User' })).toBeVisible();

    await m.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the Edit modal on Escape key press', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByRole('button', { name: /^Edit Admin User/ }).first().click();
    await expect(modal(page).getByRole('heading', { name: 'Edit User' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });
});

// --- Delete / Deactivate User -------------------------------------------------

test.describe('Delete / Deactivate User', () => {
  test('hard-deletes a Student and the row is removed from the table', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('delete-student');
    const name = 'Delete Student';

    await createUser(page, { name, email });

    await page.getByRole('button', { name: `Delete ${name}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Delete User' })).toBeVisible();
    await expect(m.getByText(/permanently delete/)).toBeVisible();
    await m.getByRole('button', { name: 'Delete' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();
  });

  test('soft-deactivates an Instructor and the row shows Deactivated status', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('deactivate-instructor');
    const name = 'Deactivate Instructor';

    await createUser(page, { name, email, role: 'INSTRUCTOR' });

    // The button's aria-label is always "Delete {name}" even for instructors;
    // the visible text differs ("Deactivate") but accessible name doesn't.
    await page.getByRole('button', { name: `Delete ${name}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Deactivate User' })).toBeVisible();
    await m.getByRole('button', { name: 'Deactivate' }).click();

    await expect(page.locator('.modal-card')).not.toBeVisible();

    const userRow = page.getByRole('row', { name: new RegExp(email) });
    await expect(userRow.getByText('Deactivated')).toBeVisible();
  });

  test('closes the Delete modal on Cancel', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('cancel-delete');
    const name = 'Cancel Delete User';

    await createUser(page, { name, email });

    await page.getByRole('button', { name: `Delete ${name}` }).click();
    const m = modal(page);
    await expect(m.getByRole('heading', { name: 'Delete User' })).toBeVisible();

    await m.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();

    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });

  test('closes the Delete modal on Escape key press', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('esc-delete');
    const name = 'Esc Delete User';

    await createUser(page, { name, email });

    await page.getByRole('button', { name: `Delete ${name}` }).click();
    await expect(modal(page).getByRole('heading', { name: 'Delete User' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });
});

// --- Search & Filter ----------------------------------------------------------

test.describe('Search and Filter', () => {
  test('search by name narrows the table results', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByPlaceholder('Search by name or email\u2026').fill('Admin User');

    await expect(page.getByRole('cell', { name: 'admin@example.com', exact: true })).toBeVisible();
  });

  test('search by email narrows the table results', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByPlaceholder('Search by name or email\u2026').fill('admin@example.com');

    await expect(page.getByRole('cell', { name: 'Admin User', exact: true })).toBeVisible();
  });

  test('no-match search shows the empty state message', async ({ page }) => {
    await gotoUserManagement(page);

    await page.getByPlaceholder('Search by name or email\u2026').fill('zzz-no-match-xyz');

    await expect(page.getByText('No users match your filters.')).toBeVisible();
  });

  test('role filter shows only users with the selected role', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('filter-student');
    await createUser(page, { name: 'Filter Student', email });

    await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('ADMIN');

    await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin@example.com', exact: true })).toBeVisible();
  });

  test('clearing the role filter restores all users', async ({ page }) => {
    await gotoUserManagement(page);

    const email = testEmail('restore-filter');
    await createUser(page, { name: 'Restore Filter User', email });

    await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('ADMIN');
    await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();

    await page.getByRole('combobox', { name: 'Filter by role' }).selectOption('');
    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });
});
