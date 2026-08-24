import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const LOGIN_URL = '/login';

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LOGIN_URL);
  });

  test('renders the login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'PEELP' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText('Contact your administrator if you need access.')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password').fill('somepassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
  });

  test('shows validation error when password is empty', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows validation errors when both fields are empty', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid email address')).toBeVisible();
    await expect(page.getByText('Password is required')).toBeVisible();
  });

  test('shows server error for wrong credentials', async ({ page }) => {
    // Mock a 400 to avoid the 401 axios interceptor redirect and test error display
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) })
    );

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('shows server error for non-existent user', async ({ page }) => {
    // Mock a 400 to avoid the 401 axios interceptor redirect and test error display
    await page.route('**/api/auth/sign-in/email', (route) =>
      route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Invalid email or password' }) })
    );

    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

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

    // Wait until the route handler is running (resolveRoute is assigned)
    await handlerReady;

    // While the request is paused the button text changes and inputs are disabled
    await expect(page.getByRole('button', { name: 'Signing in...' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeDisabled();
    await expect(page.getByLabel('Password')).toBeDisabled();

    // Release the request so the test can clean up
    resolveRoute();
  });

  test('redirects to home after successful login', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });

  test('clears server error when resubmitting', async ({ page }) => {
    // First submit: mock a 400 so the error message shows reliably without 401 redirect.
    // Subsequent requests pass through to the real backend.
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

    // Second submit with correct credentials — the error clears and we navigate home
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/');
    await expect(page).toHaveURL('/');
  });
});
