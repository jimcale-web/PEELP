import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const LOGIN_URL = '/login';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Contact your administrator if you need access.')).toBeVisible();
  });

  test('navbar is not rendered on the login page', async ({ page }) => {
    await expect(page.locator('nav.navbar')).not.toBeAttached();
  });

  // ─── Client-side validation ──────────────────────────────────────────────────

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  });

  test('shows validation error when password is empty', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('shows validation errors when both fields are empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Please enter your password.')).toBeVisible();
  });

  test('whitespace-only email fails email validation', async ({ page }) => {
    await page.getByLabel('Email').fill('   ');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  });

  // ─── Submission behaviour ────────────────────────────────────────────────────

  test('pressing Enter on the password field submits the form', async ({ page }) => {
    // Mock so we can detect the submission without a real backend call
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) })
    );

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByLabel('Password').press('Enter');

    // The server error (mocked 400) proves the request was submitted via keyboard
    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('disables inputs and button while submitting', async ({ page }) => {
    // Pause the sign-in request mid-flight so we can assert the loading state.
    // handlerReady resolves as soon as the route handler is entered (and resolveRoute is set).
    let resolveRoute!: () => void;
    const handlerReady = new Promise<void>((readyResolve) => {
      page.route('**/api/auth/sign-in/email', async (route) => {
        await new Promise<void>((hold) => {
          resolveRoute = hold;
          readyResolve(); // signal: resolveRoute is now assigned
        });
        await route.continue();
      });
    });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await handlerReady;

    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeDisabled();
    await expect(page.getByLabel('Password')).toBeDisabled();

    resolveRoute();
  });

  // ─── Server-side errors ──────────────────────────────────────────────────────

  test('shows server error for wrong credentials', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) })
    );

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('shows server error for non-existent user', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) })
    );

    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('shows error message for rate-limited login (429)', async ({ page }) => {
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Too many login attempts. Please try again later.' }),
      })
    );

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.error-message')).toBeVisible();
  });

  // ─── Success flow ────────────────────────────────────────────────────────────

  test('redirects to home after successful login', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('clears server error when resubmitting', async ({ page }) => {
    let firstRequest = true;
    await page.route('**/api/auth/sign-in/email', async (route) => {
      if (firstRequest) {
        firstRequest = false;
        await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) });
      } else {
        await route.continue();
      }
    });

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('.error-message')).toBeVisible();

    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
