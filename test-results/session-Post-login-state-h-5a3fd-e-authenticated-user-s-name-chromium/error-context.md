# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session.spec.ts >> Post-login state >> home page shows the authenticated user's name
- Location: e2e\tests\session.spec.ts:89:7

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator: locator('.user-info strong')
Expected: "Admin User"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('.user-info strong')

```

```yaml
- navigation:
  - heading "PEELP" [level=1]
  - link "Home":
    - /url: /
  - link "Admin":
    - /url: /admin/users
  - link "Instructor":
    - /url: /instructor
  - text: Admin User
  - button "Sign Out"
- link "User Management":
  - /url: /admin/users
- link "Student Management":
  - /url: /admin/students
- link "Course Management":
  - /url: /admin/courses
- link "Category Management":
  - /url: /admin/categories
- link "Reports":
  - /url: /admin/reports
- heading "User Management" [level=1]
- paragraph: 1 total users
- button "+ New User"
- textbox "Search by name or email…"
- combobox "Filter by role":
  - option "All Roles" [selected]
  - option "Admin"
  - option "Instructor"
  - option "Student"
- combobox "Filter by approval":
  - option "All Statuses" [selected]
  - option "Pending"
  - option "Approved"
  - option "Rejected"
- table:
  - rowgroup:
    - row "Name Email Role Verified Status Approval Joined":
      - columnheader "Name"
      - columnheader "Email"
      - columnheader "Role"
      - columnheader "Verified"
      - columnheader "Status"
      - columnheader "Approval"
      - columnheader "Joined"
      - columnheader
  - rowgroup:
    - row "Admin User admin@example.com Admin Yes Active ✓ Approved 9/1/2026 Edit Admin User":
      - cell "Admin User"
      - cell "admin@example.com"
      - cell "Admin"
      - cell "Yes"
      - cell "Active"
      - cell "✓ Approved"
      - cell "9/1/2026"
      - cell "Edit Admin User":
        - button "Edit Admin User": Edit
```

# Test source

```ts
  1   | ﻿import { test, expect, type Page, type BrowserContext } from '@playwright/test';
  2   | import path from 'path';
  3   | import fs from 'fs';
  4   | 
  5   | const ADMIN_EMAIL = 'admin@example.com';
  6   | const ADMIN_PASSWORD = 'password123';
  7   | const ADMIN_NAME = 'Admin User';
  8   | 
  9   | /**
  10  |  * Auth state created by auth.setup.ts (runs as the "setup" project before tests).
  11  |  * All authenticated tests reuse this file via test.use({ storageState }).
  12  |  */
  13  | const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');
  14  | 
  15  | // ─── Helpers ──────────────────────────────────────────────────────────────────
  16  | 
  17  | async function clearSession(page: Page, context: BrowserContext) {
  18  |   await context.clearCookies();
  19  |   await page.goto('/login', { waitUntil: 'domcontentloaded' });
  20  |   await page.evaluate(() => localStorage.clear());
  21  | }
  22  | 
  23  | /** Log in via the UI. Creates a fresh session in the DB for tests that need it. */
  24  | async function loginAsAdmin(page: Page) {
  25  |   await page.goto('/login');
  26  |   await page.getByLabel('Email').fill(ADMIN_EMAIL);
  27  |   await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  28  |   await page.getByRole('button', { name: 'Sign In' }).click();
  29  |   await page.waitForURL('/');
  30  | }
  31  | 
  32  | // ─── Protected routes ─────────────────────────────────────────────────────────
  33  | 
  34  | test.describe('Protected routes', () => {
  35  |   test.beforeEach(async ({ page, context }) => {
  36  |     await clearSession(page, context);
  37  |   });
  38  | 
  39  |   test('unauthenticated visit to / redirects to /login', async ({ page }) => {
  40  |     await page.goto('/');
  41  |     await page.waitForURL('/login');
  42  |     await expect(page).toHaveURL('/login');
  43  |     await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  44  |   });
  45  | 
  46  |   test('unauthenticated visit to an unknown path redirects to /login', async ({ page }) => {
  47  |     await page.goto('/some/unknown/path');
  48  |     await page.waitForURL('/login');
  49  |     await expect(page).toHaveURL('/login');
  50  |   });
  51  | 
  52  |   test('shows loading indicator before the redirect decision', async ({ page }) => {
  53  |     let resolveSessionCheck!: () => void;
  54  |     await page.route('**/api/auth/get-session', async (route) => {
  55  |       await new Promise<void>((resolve) => { resolveSessionCheck = resolve; });
  56  |       await route.continue();
  57  |     });
  58  | 
  59  |     const navPromise = page.waitForURL('/login');
  60  |     await page.goto('/');
  61  | 
  62  |     await expect(page.getByText('Loading...')).toBeVisible();
  63  |     resolveSessionCheck();
  64  |     await navPromise;
  65  |   });
  66  | 
  67  |   test('authenticated user can access / without being redirected', async ({ page, context }) => {
  68  |     // Load the saved auth cookies without making a new sign-in request
  69  |     const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as {
  70  |       cookies: Parameters<BrowserContext['addCookies']>[0];
  71  |     };
  72  |     await context.addCookies(state.cookies);
  73  | 
  74  |     await page.goto('/');
  75  |     await expect(page).toHaveURL('/');
  76  |     await expect(page.getByRole('heading', { name: 'Welcome to PEELP' })).toBeVisible();
  77  |   });
  78  | });
  79  | 
  80  | // ─── Post-login state ─────────────────────────────────────────────────────────
  81  | 
  82  | test.describe('Post-login state', () => {
  83  |   test.use({ storageState: AUTH_FILE });
  84  | 
  85  |   test.beforeEach(async ({ page }) => {
  86  |     await page.goto('/');
  87  |   });
  88  | 
  89  |   test("home page shows the authenticated user's name", async ({ page }) => {
> 90  |     await expect(page.locator('.user-info strong')).toHaveText(ADMIN_NAME);
      |                                                     ^ Error: expect(locator).toHaveText(expected) failed
  91  |   });
  92  | 
  93  |   test("home page shows the user's role badge", async ({ page }) => {
  94  |     await expect(page.locator('.role-badge')).toHaveText('ADMIN');
  95  |   });
  96  | 
  97  |   test('navbar is visible after login', async ({ page }) => {
  98  |     await expect(page.locator('nav.navbar')).toBeVisible();
  99  |   });
  100 | 
  101 |   test("navbar displays the user's name", async ({ page }) => {
  102 |     await expect(page.locator('.user-name')).toHaveText(ADMIN_NAME);
  103 |   });
  104 | 
  105 |   test('navbar has a Sign Out button', async ({ page }) => {
  106 |     await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
  107 |   });
  108 | 
  109 |   test('authToken is stored in localStorage after login', async ({ page }) => {
  110 |     const token = await page.evaluate(() => localStorage.getItem('authToken'));
  111 |     expect(token).not.toBeNull();
  112 |     expect((token as string).length).toBeGreaterThan(0);
  113 |   });
  114 | 
  115 |   test('login page is still accessible when already authenticated (no forced redirect)', async ({ page }) => {
  116 |     await page.goto('/login');
  117 |     await expect(page).toHaveURL('/login');
  118 |     await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  119 |   });
  120 | });
  121 | 
  122 | // ─── Session persistence ──────────────────────────────────────────────────────
  123 | 
  124 | test.describe('Session persistence', () => {
  125 |   test.use({ storageState: AUTH_FILE });
  126 | 
  127 |   test('authenticated user remains logged in after a full page reload', async ({ page }) => {
  128 |     await page.goto('/');
  129 |     await page.reload();
  130 | 
  131 |     await expect(page).toHaveURL('/');
  132 |     await expect(page.locator('nav.navbar')).toBeVisible();
  133 |     await expect(page.locator('.user-name')).toHaveText(ADMIN_NAME);
  134 |   });
  135 | 
  136 |   test('user info is preserved correctly after reload', async ({ page }) => {
  137 |     await page.goto('/');
  138 |     await page.reload();
  139 | 
  140 |     await expect(page.locator('.role-badge')).toHaveText('ADMIN');
  141 |     await expect(page.locator('.user-info strong')).toHaveText(ADMIN_NAME);
  142 |   });
  143 | });
  144 | 
  145 | // ─── Logout flow ──────────────────────────────────────────────────────────────
  146 | // Each test logs in fresh so the session is valid even after previous tests sign out.
  147 | // The express and better-auth rate limits are raised in test mode, so this is safe.
  148 | 
  149 | test.describe('Logout', () => {
  150 |   test.beforeEach(async ({ page }) => {
  151 |     await loginAsAdmin(page);
  152 |   });
  153 | 
  154 |   test('clicking Sign Out navigates to /login', async ({ page }) => {
  155 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  156 |     await page.waitForURL('/login');
  157 |     await expect(page).toHaveURL('/login');
  158 |   });
  159 | 
  160 |   test('navbar is removed after logout', async ({ page }) => {
  161 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  162 |     await page.waitForURL('/login');
  163 |     await expect(page.locator('nav.navbar')).not.toBeAttached();
  164 |   });
  165 | 
  166 |   test('visiting / after logout redirects to /login', async ({ page }) => {
  167 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  168 |     await page.waitForURL('/login');
  169 | 
  170 |     await page.goto('/');
  171 |     await page.waitForURL('/login');
  172 |     await expect(page).toHaveURL('/login');
  173 |   });
  174 | 
  175 |   test('authToken is removed from localStorage after logout', async ({ page }) => {
  176 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  177 |     await page.waitForURL('/login');
  178 | 
  179 |     const token = await page.evaluate(() => localStorage.getItem('authToken'));
  180 |     expect(token).toBeNull();
  181 |   });
  182 | 
  183 |   test('can log back in successfully after logout', async ({ page }) => {
  184 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  185 |     await page.waitForURL('/login');
  186 | 
  187 |     await page.getByLabel('Email').fill(ADMIN_EMAIL);
  188 |     await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  189 |     await page.getByRole('button', { name: 'Sign In' }).click();
  190 | 
```