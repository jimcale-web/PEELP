import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'password123';
const ADMIN_NAME = 'Admin User';

/**
 * Auth state created by auth.setup.ts (runs as the "setup" project before tests).
 * All authenticated tests reuse this file via test.use({ storageState }).
 */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function clearSession(page: Page, context: BrowserContext) {
  await context.clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
}

/** Log in via the UI. Creates a fresh session in the DB for tests that need it. */
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/admin/users');
}

// ─── Protected routes ─────────────────────────────────────────────────────────

test.describe('Protected routes', () => {
  test.beforeEach(async ({ page, context }) => {
    await clearSession(page, context);
  });

  test('unauthenticated visit to / redirects to /login', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });

  test('unauthenticated visit to an unknown path redirects to /login', async ({ page }) => {
    await page.goto('/some/unknown/path');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('shows loading indicator before the redirect decision', async ({ page }) => {
    let resolveSessionCheck!: () => void;
    await page.route('**/api/auth/get-session', async (route) => {
      await new Promise<void>((resolve) => { resolveSessionCheck = resolve; });
      await route.continue();
    });

    const navPromise = page.waitForURL('/login');
    await page.goto('/');

    await expect(page.getByText('Loading...')).toBeVisible();
    resolveSessionCheck();
    await navPromise;
  });

  test('authenticated user can access / without being redirected', async ({ page, context }) => {
    // Load the saved auth cookies without making a new sign-in request
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as {
      cookies: Parameters<BrowserContext['addCookies']>[0];
    };
    await context.addCookies(state.cookies);

    await page.goto('/');
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Welcome to PEELP' })).toBeVisible();
  });
});

// ─── Post-login state ─────────────────────────────────────────────────────────

test.describe('Post-login state', () => {
  test.use({ storageState: AUTH_FILE });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test("home page shows the authenticated user's name", async ({ page }) => {
    await expect(page.locator('.user-info strong')).toHaveText(ADMIN_NAME);
  });

  test("home page shows the user's role badge", async ({ page }) => {
    await expect(page.locator('.role-badge')).toHaveText('ADMIN');
  });

  test('navbar is visible after login', async ({ page }) => {
    await expect(page.locator('nav.navbar')).toBeVisible();
  });

  test("navbar displays the user's name", async ({ page }) => {
    await expect(page.locator('.user-name')).toHaveText(ADMIN_NAME);
  });

  test('navbar has a Sign Out button', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  });

  test('authToken is stored in localStorage after login', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).not.toBeNull();
    expect((token as string).length).toBeGreaterThan(0);
  });

  test('login page is still accessible when already authenticated (no forced redirect)', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });
});

// ─── Session persistence ──────────────────────────────────────────────────────

test.describe('Session persistence', () => {
  test.use({ storageState: AUTH_FILE });

  test('authenticated user remains logged in after a full page reload', async ({ page }) => {
    await page.goto('/');
    await page.reload();

    await expect(page).toHaveURL('/');
    await expect(page.locator('nav.navbar')).toBeVisible();
    await expect(page.locator('.user-name')).toHaveText(ADMIN_NAME);
  });

  test('user info is preserved correctly after reload', async ({ page }) => {
    await page.goto('/');
    await page.reload();

    await expect(page.locator('.role-badge')).toHaveText('ADMIN');
    await expect(page.locator('.user-info strong')).toHaveText(ADMIN_NAME);
  });
});

// ─── Logout flow ──────────────────────────────────────────────────────────────
// Each test logs in fresh so the session is valid even after previous tests sign out.
// The express and better-auth rate limits are raised in test mode, so this is safe.

test.describe('Logout', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('clicking Sign Out navigates to /login', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('navbar is removed after logout', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');
    await expect(page.locator('nav.navbar')).not.toBeAttached();
  });

  test('visiting / after logout redirects to /login', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');

    await page.goto('/');
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');
  });

  test('authToken is removed from localStorage after logout', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');

    const token = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(token).toBeNull();
  });

  test('can log back in successfully after logout', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');

    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL('/admin/users');
    await expect(page).toHaveURL('/admin/users');
    await expect(page.locator('nav.navbar')).toBeVisible();
  });

  test('back navigation after logout keeps protected routes guarded', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.waitForURL('/login');

    await page.goBack().catch(() => {});

    try {
      await page.waitForURL('/login', { timeout: 5000 });
    } catch {
      // goBack() had no history or we stayed at /login — acceptable
    }
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

test.describe('Error handling', () => {
  test('failed session-check does not crash the app', async ({ page, context }) => {
    await clearSession(page, context);
    await page.route('**/api/auth/get-session', (route) => route.abort());

    await page.goto('/login');

    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test.describe('when authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('logout network error keeps the user on the current page', async ({ page }) => {
      // Abort the sign-out request. Because logout() throws and handleLogout()
      // catches the error without calling navigate('/login'), the user stays where they were.
      await page.route('**/api/auth/sign-out', (route) => route.abort());
      await page.getByRole('button', { name: 'Sign Out' }).click();

      // User remains on the admin dashboard (not navigated away)
      await expect(page).toHaveURL('/admin/users');
      await expect(page.locator('nav.navbar')).toBeVisible();
    });
  });
});
