import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Reuses the admin session saved by auth.setup.ts.
 */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

test.use({ storageState: AUTH_FILE });

/** Test backend URL — must match E2E_PORT_BACKEND in playwright.config.ts */
const API_URL = 'http://localhost:5001/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function testEmail(prefix: string) {
  return `${prefix}-${uid()}@e2e-test.example`;
}

async function gotoStudentManagement(page: Page) {
  await page.goto('/admin/students');
  await expect(page.getByRole('table')).toBeVisible();
}

function modal(page: Page) {
  return page.locator('.modal-card');
}

/**
 * Creates a student via the "Add Student" modal and waits for the row to appear.
 */
async function addStudent(
  page: Page,
  opts: {
    name: string;
    email: string;
    password?: string;
    city?: string;
    country?: string;
    phone?: string;
  },
) {
  const {
    name,
    email,
    password = 'Password123',
    city = 'Cairo',
    country = 'Egypt',
    phone = '+20 123 456 789',
  } = opts;

  await page.getByRole('button', { name: '+ Add Student' }).click();
  const m = modal(page);
  await expect(m.getByRole('heading', { name: 'Add New Student' })).toBeVisible();

  await m.getByLabel('Full Name').fill(name);
  await m.getByLabel('Email').fill(email);
  await m.getByLabel('Password').fill(password);
  await m.getByLabel('City').fill(city);
  await m.getByLabel('Country').fill(country);
  await m.getByLabel('Phone Number').fill(phone);

  await m.getByRole('button', { name: 'Add Student' }).click();
  await expect(m.getByRole('heading', { name: 'Add New Student' })).not.toBeVisible();
  await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
}

// ---------------------------------------------------------------------------
// Page rendering
// ---------------------------------------------------------------------------

test.describe('Student Management — page rendering', () => {
  test('renders heading, toolbar and table columns', async ({ page }) => {
    await gotoStudentManagement(page);

    await expect(page.getByRole('heading', { name: 'Student Management' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Student' })).toBeVisible();
    await expect(page.getByPlaceholder('Search by name, email, city or country\u2026')).toBeVisible();

    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Email' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Location' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Phone' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Verified' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Joined' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Approval' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Accessibility Duration' })).toBeVisible();
  });

  test('shows total and active counts', async ({ page }) => {
    await gotoStudentManagement(page);
    await expect(page.getByText(/\d+ total/)).toBeVisible();
    await expect(page.getByText(/\d+ active/)).toBeVisible();
  });

  test('navigates to the student page via Admin Tabs', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('link', { name: 'Student Management' }).click();
    await expect(page).toHaveURL('/admin/students');
    await expect(page.getByRole('heading', { name: 'Student Management' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Add Student
// ---------------------------------------------------------------------------

test.describe('Student Management — add student', () => {
  test('opens the Add Student modal when "+ Add Student" is clicked', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByRole('button', { name: '+ Add Student' }).click();
    const m = modal(page);

    await expect(m.getByRole('heading', { name: 'Add New Student' })).toBeVisible();
    await expect(m.getByLabel('Full Name')).toBeVisible();
    await expect(m.getByLabel('Email')).toBeVisible();
    await expect(m.getByLabel('Password')).toBeVisible();
    await expect(m.getByLabel('City')).toBeVisible();
    await expect(m.getByLabel('Country')).toBeVisible();
    await expect(m.getByLabel('Phone Number')).toBeVisible();
  });

  test('creates a student and the row appears in the table', async ({ page }) => {
    await gotoStudentManagement(page);

    const name = 'New Student E2E';
    const email = testEmail('new-student');
    await addStudent(page, { name, email });

    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });

  test('new student shows location in the table', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('location-check');
    await addStudent(page, { name: 'Location Student', email, city: 'Nairobi', country: 'Kenya' });

    const row = page.getByRole('row', { name: new RegExp(email) });
    await expect(row.getByText('Nairobi, Kenya')).toBeVisible();
  });

  test('new student appears as PENDING by default', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('pending-check');
    await addStudent(page, { name: 'Pending Student', email });

    // Admin-created students are APPROVED — so they should not show Approve/Reject
    // buttons. They will display the green pill instead.
    const row = page.getByRole('row', { name: new RegExp(email) });
    await expect(row.getByText('✓ Approved')).toBeVisible();
  });

  test('shows validation errors when required fields are empty', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByRole('button', { name: '+ Add Student' }).click();
    const m = modal(page);
    await m.getByRole('button', { name: 'Add Student' }).click();

    await expect(m.getByText('Name is required.')).toBeVisible();
    await expect(m.getByText('Valid email is required.')).toBeVisible();
    await expect(m.getByText('Password must be at least 8 characters.')).toBeVisible();
  });

  test('closes the modal on Cancel', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByRole('button', { name: '+ Add Student' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    await modal(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal on Escape key', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByRole('button', { name: '+ Add Student' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('closes the modal when clicking the backdrop', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByRole('button', { name: '+ Add Student' }).click();
    await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();

    await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
    await expect(page.locator('.modal-card')).not.toBeVisible();
  });

  test('rejects duplicate email with a server error', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('dup-email');
    await addStudent(page, { name: 'First Student', email });

    // Try to add again with same email
    await page.getByRole('button', { name: '+ Add Student' }).click();
    const m = modal(page);
    await m.getByLabel('Full Name').fill('Second Student');
    await m.getByLabel('Email').fill(email);
    await m.getByLabel('Password').fill('Password123');
    await m.getByLabel('City').fill('Cairo');
    await m.getByLabel('Country').fill('Egypt');
    await m.getByLabel('Phone Number').fill('+20 111 222 333');
    await m.getByRole('button', { name: 'Add Student' }).click();

    await expect(m.getByText(/already exists/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Approval
// ---------------------------------------------------------------------------

test.describe('Student Management — approval', () => {
  test('admin-created student shows Approved pill immediately', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('auto-approved');
    await addStudent(page, { name: 'Auto Approved', email });

    const row = page.getByRole('row', { name: new RegExp(email) });
    await expect(row.getByText('✓ Approved')).toBeVisible();
  });

  test('approving a pending student replaces buttons with Approved pill', async ({ page, request }) => {
    // Seed a PENDING student via the API directly (bypasses the admin-create
    // endpoint which auto-approves, so we can test the approval flow).
    const email = testEmail('to-approve');
    await request.post(`${API_URL}/register`, {
      data: {
        name: 'To Approve',
        email,
        password: 'Password123',
        city: 'Cairo',
        country: 'Egypt',
        phoneNumber: '+20 123 456 789',
      },
    });

    await gotoStudentManagement(page);

    // Filter to pending so the row is easy to find
    await page.getByRole('combobox').selectOption('PENDING');

    const row = page.getByRole('row', { name: new RegExp(email) });
    await expect(row.getByRole('button', { name: '✓ Approve' })).toBeVisible();

    await row.getByRole('button', { name: '✓ Approve' }).click();

    // Clear the filter so the now-approved student stays visible
    await page.getByRole('combobox').selectOption('');

    // After approval, buttons are replaced by the green pill
    await expect(row.getByRole('button', { name: '✓ Approve' })).not.toBeVisible();
    await expect(row.getByText('✓ Approved')).toBeVisible();
  });

  test('approving a pending student without a subscription succeeds', async ({ request }) => {
    const email = testEmail('approve-no-plan');
    await request.post(`${API_URL}/register`, {
      data: {
        name: 'No Plan Student',
        email,
        password: 'Password123',
        city: 'Alexandria',
        country: 'Egypt',
        phoneNumber: '+20 111 222 333',
      },
    });

    const studentsResponse = await request.get(`${API_URL}/admin/students`);
    expect(studentsResponse.ok()).toBeTruthy();
    const students = await studentsResponse.json();
    const student = students.students.find((entry: { email: string }) => entry.email === email);
    expect(student).toBeTruthy();

    const approvalResponse = await request.patch(`${API_URL}/admin/students/${student.id}/approval`, {
      data: { approvalStatus: 'APPROVED' },
    });

    expect(approvalResponse.ok()).toBeTruthy();
    expect((await approvalResponse.json()).student.approvalStatus).toBe('APPROVED');
  });

  test('rejecting a pending student replaces buttons with Rejected pill', async ({ page, request }) => {
    const email = testEmail('to-reject');
    await request.post(`${API_URL}/register`, {
      data: {
        name: 'To Reject',
        email,
        password: 'Password123',
        city: 'Nairobi',
        country: 'Kenya',
        phoneNumber: '+254 700 000 001',
      },
    });

    await gotoStudentManagement(page);
    await page.getByRole('combobox').selectOption('PENDING');

    const row = page.getByRole('row', { name: new RegExp(email) });
    await expect(row.getByRole('button', { name: '✕ Reject' })).toBeVisible();

    await row.getByRole('button', { name: '✕ Reject' }).click();

    // Clear the filter so the now-rejected student stays visible
    await page.getByRole('combobox').selectOption('');

    await expect(row.getByRole('button', { name: '✕ Reject' })).not.toBeVisible();
    await expect(row.getByText('✕ Rejected')).toBeVisible();
  });

  test('pending badge appears in header when there are pending students', async ({ page, request }) => {
    const email = testEmail('badge-check');
    await request.post(`${API_URL}/register`, {
      data: {
        name: 'Badge Check',
        email,
        password: 'Password123',
        city: 'Lagos',
        country: 'Nigeria',
        phoneNumber: '+234 800 000 001',
      },
    });

    await gotoStudentManagement(page);
    await expect(page.locator('.pending-badge')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Accessibility Duration
// ---------------------------------------------------------------------------

test.describe('Student Management — accessibility duration', () => {
  test('Monthly button becomes active when clicked', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('duration-monthly');
    await addStudent(page, { name: 'Monthly Student', email });

    const row = page.getByRole('row', { name: new RegExp(email) });
    const monthlyBtn = row.getByRole('button', { name: 'Monthly' });

    await expect(monthlyBtn).not.toHaveClass(/duration-btn--active/);
    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveClass(/duration-btn--active/);
  });

  test('Yearly button becomes active when clicked', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('duration-yearly');
    await addStudent(page, { name: 'Yearly Student', email });

    const row = page.getByRole('row', { name: new RegExp(email) });
    const yearlyBtn = row.getByRole('button', { name: 'Yearly' });

    await expect(yearlyBtn).not.toHaveClass(/duration-btn--active/);
    await yearlyBtn.click();
    await expect(yearlyBtn).toHaveClass(/duration-btn--active/);
  });

  test('switching from Monthly to Yearly updates the active button', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('duration-switch');
    await addStudent(page, { name: 'Switch Duration', email });

    const row = page.getByRole('row', { name: new RegExp(email) });
    const monthlyBtn = row.getByRole('button', { name: 'Monthly' });
    const yearlyBtn = row.getByRole('button', { name: 'Yearly' });

    await monthlyBtn.click();
    await expect(monthlyBtn).toHaveClass(/duration-btn--active/);

    await yearlyBtn.click();
    await expect(yearlyBtn).toHaveClass(/duration-btn--active/);
    await expect(monthlyBtn).not.toHaveClass(/duration-btn--active/);
  });

  test('expiry date appears below the toggle after setting duration', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('expiry-date');
    await addStudent(page, { name: 'Expiry Check', email });

    const row = page.getByRole('row', { name: new RegExp(email) });
    await row.getByRole('button', { name: 'Monthly' }).click();

    await expect(row.locator('.duration-expiry')).toBeVisible();
    await expect(row.locator('.duration-expiry')).toContainText('Expires');
  });
});

// ---------------------------------------------------------------------------
// Search & Filter
// ---------------------------------------------------------------------------

test.describe('Student Management — search and filter', () => {
  test('search by name narrows results', async ({ page }) => {
    await gotoStudentManagement(page);

    const name = 'Unique Search Name';
    const email = testEmail('search-name');
    await addStudent(page, { name, email });

    await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(name);
    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });

  test('search by email narrows results', async ({ page }) => {
    await gotoStudentManagement(page);

    const name = 'Search By Email';
    const email = testEmail('search-email');
    await addStudent(page, { name, email });

    await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(email);
    await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  });

  test('search by city narrows results', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('search-city');
    const city = 'Zanzibar';
    await addStudent(page, { name: 'City Search Student', email, city, country: 'Tanzania' });

    await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(city);
    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });

  test('no-match search shows empty-state message', async ({ page }) => {
    await gotoStudentManagement(page);

    await page.getByPlaceholder('Search by name, email, city or country\u2026').fill('zzz-no-match-xyz');
    await expect(page.getByText('No students match your filters.')).toBeVisible();
  });

  test('approval filter shows only students with the selected status', async ({ page, request }) => {
    await gotoStudentManagement(page);

    // Seed a PENDING student so there is something to filter by
    const email = testEmail('filter-pending');
    await request.post(`${API_URL}/register`, {
      data: {
        name: 'Filter Pending',
        email,
        password: 'Password123',
        city: 'Accra',
        country: 'Ghana',
        phoneNumber: '+233 200 000 001',
      },
    });

    await gotoStudentManagement(page);
    await page.getByRole('combobox').selectOption('PENDING');

    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();

    // An approved student should not be visible
    await page.getByRole('combobox').selectOption('APPROVED');
    await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();
  });

  test('clearing the approval filter restores all students', async ({ page }) => {
    await gotoStudentManagement(page);

    const email = testEmail('clear-filter');
    await addStudent(page, { name: 'Clear Filter Student', email });

    await page.getByRole('combobox').selectOption('PENDING');
    await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();

    await page.getByRole('combobox').selectOption('');
    await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  });
});

