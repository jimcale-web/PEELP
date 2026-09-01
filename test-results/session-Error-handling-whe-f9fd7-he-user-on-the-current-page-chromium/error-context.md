# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: session.spec.ts >> Error handling >> when authenticated >> logout network error keeps the user on the current page
- Location: e2e\tests\session.spec.ts:230:9

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:5174/"
Received: "http://localhost:5174/admin/users"
Timeout:  5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × locator resolved to <html lang="en">…</html>
       - unexpected value "http://localhost:5174/admin/users"

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
  191 |     await page.waitForURL('/');
  192 |     await expect(page).toHaveURL('/');
  193 |     await expect(page.locator('nav.navbar')).toBeVisible();
  194 |   });
  195 | 
  196 |   test('back navigation after logout keeps protected routes guarded', async ({ page }) => {
  197 |     await page.getByRole('button', { name: 'Sign Out' }).click();
  198 |     await page.waitForURL('/login');
  199 | 
  200 |     await page.goBack().catch(() => {});
  201 | 
  202 |     try {
  203 |       await page.waitForURL('/login', { timeout: 5000 });
  204 |     } catch {
  205 |       // goBack() had no history or we stayed at /login — acceptable
  206 |     }
  207 |     await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  208 |   });
  209 | });
  210 | 
  211 | // ─── Error handling ───────────────────────────────────────────────────────────
  212 | 
  213 | test.describe('Error handling', () => {
  214 |   test('failed session-check does not crash the app', async ({ page, context }) => {
  215 |     await clearSession(page, context);
  216 |     await page.route('**/api/auth/get-session', (route) => route.abort());
  217 | 
  218 |     await page.goto('/login');
  219 | 
  220 |     await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
  221 |     await expect(page.getByLabel('Email')).toBeVisible();
  222 |     await expect(page.getByLabel('Password')).toBeVisible();
  223 |   });
  224 | 
  225 |   test.describe('when authenticated', () => {
  226 |     test.beforeEach(async ({ page }) => {
  227 |       await loginAsAdmin(page);
  228 |     });
  229 | 
  230 |     test('logout network error keeps the user on the current page', async ({ page }) => {
  231 |       // Abort the sign-out request. Because logout() throws and handleLogout()
  232 |       // catches the error without calling navigate('/login'), the user stays at '/'.
  233 |       await page.route('**/api/auth/sign-out', (route) => route.abort());
  234 |       await page.getByRole('button', { name: 'Sign Out' }).click();
  235 | 
  236 |       // User remains on the home page (not navigated away)
> 237 |       await expect(page).toHaveURL('/');
      |                          ^ Error: expect(page).toHaveURL(expected) failed
  238 |       await expect(page.locator('nav.navbar')).toBeVisible();
  239 |     });
  240 |   });
  241 | });
  242 | 
```