# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-management.spec.ts >> Student Management — approval >> rejecting a pending student replaces buttons with Rejected pill
- Location: e2e\tests\student-management.spec.ts:301:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('row', { name: /to-reject-mtsikn1fzrlv@e2e-test.example/ }).getByRole('button', { name: '✕ Reject' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('row', { name: /to-reject-mtsikn1fzrlv@e2e-test.example/ }).getByRole('button', { name: '✕ Reject' })

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
- heading "Student Management" [level=1]
- paragraph: 5 total · 5 active
- button "+ Add Student"
- textbox "Search by name, email, city or country…"
- combobox:
  - option "All Statuses"
  - option "Pending" [selected]
  - option "Approved"
  - option "Rejected"
- table:
  - rowgroup:
    - row "Name Email Location Phone Verified Joined Approval Accessibility Duration":
      - columnheader "Name"
      - columnheader "Email"
      - columnheader "Location"
      - columnheader "Phone"
      - columnheader "Verified"
      - columnheader "Joined"
      - columnheader "Approval"
      - columnheader "Accessibility Duration"
  - rowgroup:
    - row "No students match your filters.":
      - cell "No students match your filters."
```

# Test source

```ts
  218 |     await m.getByLabel('Country').fill('Egypt');
  219 |     await m.getByLabel('Phone Number').fill('+20 111 222 333');
  220 |     await m.getByRole('button', { name: 'Add Student' }).click();
  221 | 
  222 |     await expect(m.getByText(/already exists/i)).toBeVisible();
  223 |   });
  224 | });
  225 | 
  226 | // ---------------------------------------------------------------------------
  227 | // Approval
  228 | // ---------------------------------------------------------------------------
  229 | 
  230 | test.describe('Student Management — approval', () => {
  231 |   test('admin-created student shows Approved pill immediately', async ({ page }) => {
  232 |     await gotoStudentManagement(page);
  233 | 
  234 |     const email = testEmail('auto-approved');
  235 |     await addStudent(page, { name: 'Auto Approved', email });
  236 | 
  237 |     const row = page.getByRole('row', { name: new RegExp(email) });
  238 |     await expect(row.getByText('✓ Approved')).toBeVisible();
  239 |   });
  240 | 
  241 |   test('approving a pending student replaces buttons with Approved pill', async ({ page, request }) => {
  242 |     // Seed a PENDING student via the API directly (bypasses the admin-create
  243 |     // endpoint which auto-approves, so we can test the approval flow).
  244 |     const email = testEmail('to-approve');
  245 |     await request.post(`${API_URL}/register`, {
  246 |       data: {
  247 |         name: 'To Approve',
  248 |         email,
  249 |         password: 'Password123',
  250 |         city: 'Cairo',
  251 |         country: 'Egypt',
  252 |         phoneNumber: '+20 123 456 789',
  253 |       },
  254 |     });
  255 | 
  256 |     await gotoStudentManagement(page);
  257 | 
  258 |     // Filter to pending so the row is easy to find
  259 |     await page.getByRole('combobox').selectOption('PENDING');
  260 | 
  261 |     const row = page.getByRole('row', { name: new RegExp(email) });
  262 |     await expect(row.getByRole('button', { name: '✓ Approve' })).toBeVisible();
  263 | 
  264 |     await row.getByRole('button', { name: '✓ Approve' }).click();
  265 | 
  266 |     // Clear the filter so the now-approved student stays visible
  267 |     await page.getByRole('combobox').selectOption('');
  268 | 
  269 |     // After approval, buttons are replaced by the green pill
  270 |     await expect(row.getByRole('button', { name: '✓ Approve' })).not.toBeVisible();
  271 |     await expect(row.getByText('✓ Approved')).toBeVisible();
  272 |   });
  273 | 
  274 |   test('approving a pending student without a subscription succeeds', async ({ request }) => {
  275 |     const email = testEmail('approve-no-plan');
  276 |     await request.post(`${API_URL}/register`, {
  277 |       data: {
  278 |         name: 'No Plan Student',
  279 |         email,
  280 |         password: 'Password123',
  281 |         city: 'Alexandria',
  282 |         country: 'Egypt',
  283 |         phoneNumber: '+20 111 222 333',
  284 |       },
  285 |     });
  286 | 
  287 |     const studentsResponse = await request.get(`${API_URL}/admin/students`);
  288 |     expect(studentsResponse.ok()).toBeTruthy();
  289 |     const students = await studentsResponse.json();
  290 |     const student = students.students.find((entry: { email: string }) => entry.email === email);
  291 |     expect(student).toBeTruthy();
  292 | 
  293 |     const approvalResponse = await request.patch(`${API_URL}/admin/students/${student.id}/approval`, {
  294 |       data: { approvalStatus: 'APPROVED' },
  295 |     });
  296 | 
  297 |     expect(approvalResponse.ok()).toBeTruthy();
  298 |     expect((await approvalResponse.json()).student.approvalStatus).toBe('APPROVED');
  299 |   });
  300 | 
  301 |   test('rejecting a pending student replaces buttons with Rejected pill', async ({ page, request }) => {
  302 |     const email = testEmail('to-reject');
  303 |     await request.post(`${API_URL}/register`, {
  304 |       data: {
  305 |         name: 'To Reject',
  306 |         email,
  307 |         password: 'Password123',
  308 |         city: 'Nairobi',
  309 |         country: 'Kenya',
  310 |         phoneNumber: '+254 700 000 001',
  311 |       },
  312 |     });
  313 | 
  314 |     await gotoStudentManagement(page);
  315 |     await page.getByRole('combobox').selectOption('PENDING');
  316 | 
  317 |     const row = page.getByRole('row', { name: new RegExp(email) });
> 318 |     await expect(row.getByRole('button', { name: '✕ Reject' })).toBeVisible();
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  319 | 
  320 |     await row.getByRole('button', { name: '✕ Reject' }).click();
  321 | 
  322 |     // Clear the filter so the now-rejected student stays visible
  323 |     await page.getByRole('combobox').selectOption('');
  324 | 
  325 |     await expect(row.getByRole('button', { name: '✕ Reject' })).not.toBeVisible();
  326 |     await expect(row.getByText('✕ Rejected')).toBeVisible();
  327 |   });
  328 | 
  329 |   test('pending badge appears in header when there are pending students', async ({ page, request }) => {
  330 |     const email = testEmail('badge-check');
  331 |     await request.post(`${API_URL}/register`, {
  332 |       data: {
  333 |         name: 'Badge Check',
  334 |         email,
  335 |         password: 'Password123',
  336 |         city: 'Lagos',
  337 |         country: 'Nigeria',
  338 |         phoneNumber: '+234 800 000 001',
  339 |       },
  340 |     });
  341 | 
  342 |     await gotoStudentManagement(page);
  343 |     await expect(page.locator('.pending-badge')).toBeVisible();
  344 |   });
  345 | });
  346 | 
  347 | // ---------------------------------------------------------------------------
  348 | // Accessibility Duration
  349 | // ---------------------------------------------------------------------------
  350 | 
  351 | test.describe('Student Management — accessibility duration', () => {
  352 |   test('Monthly button becomes active when clicked', async ({ page }) => {
  353 |     await gotoStudentManagement(page);
  354 | 
  355 |     const email = testEmail('duration-monthly');
  356 |     await addStudent(page, { name: 'Monthly Student', email });
  357 | 
  358 |     const row = page.getByRole('row', { name: new RegExp(email) });
  359 |     const monthlyBtn = row.getByRole('button', { name: 'Monthly' });
  360 | 
  361 |     await expect(monthlyBtn).not.toHaveClass(/duration-btn--active/);
  362 |     await monthlyBtn.click();
  363 |     await expect(monthlyBtn).toHaveClass(/duration-btn--active/);
  364 |   });
  365 | 
  366 |   test('Yearly button becomes active when clicked', async ({ page }) => {
  367 |     await gotoStudentManagement(page);
  368 | 
  369 |     const email = testEmail('duration-yearly');
  370 |     await addStudent(page, { name: 'Yearly Student', email });
  371 | 
  372 |     const row = page.getByRole('row', { name: new RegExp(email) });
  373 |     const yearlyBtn = row.getByRole('button', { name: 'Yearly' });
  374 | 
  375 |     await expect(yearlyBtn).not.toHaveClass(/duration-btn--active/);
  376 |     await yearlyBtn.click();
  377 |     await expect(yearlyBtn).toHaveClass(/duration-btn--active/);
  378 |   });
  379 | 
  380 |   test('switching from Monthly to Yearly updates the active button', async ({ page }) => {
  381 |     await gotoStudentManagement(page);
  382 | 
  383 |     const email = testEmail('duration-switch');
  384 |     await addStudent(page, { name: 'Switch Duration', email });
  385 | 
  386 |     const row = page.getByRole('row', { name: new RegExp(email) });
  387 |     const monthlyBtn = row.getByRole('button', { name: 'Monthly' });
  388 |     const yearlyBtn = row.getByRole('button', { name: 'Yearly' });
  389 | 
  390 |     await monthlyBtn.click();
  391 |     await expect(monthlyBtn).toHaveClass(/duration-btn--active/);
  392 | 
  393 |     await yearlyBtn.click();
  394 |     await expect(yearlyBtn).toHaveClass(/duration-btn--active/);
  395 |     await expect(monthlyBtn).not.toHaveClass(/duration-btn--active/);
  396 |   });
  397 | 
  398 |   test('expiry date appears below the toggle after setting duration', async ({ page }) => {
  399 |     await gotoStudentManagement(page);
  400 | 
  401 |     const email = testEmail('expiry-date');
  402 |     await addStudent(page, { name: 'Expiry Check', email });
  403 | 
  404 |     const row = page.getByRole('row', { name: new RegExp(email) });
  405 |     await row.getByRole('button', { name: 'Monthly' }).click();
  406 | 
  407 |     await expect(row.locator('.duration-expiry')).toBeVisible();
  408 |     await expect(row.locator('.duration-expiry')).toContainText('Expires');
  409 |   });
  410 | });
  411 | 
  412 | // ---------------------------------------------------------------------------
  413 | // Search & Filter
  414 | // ---------------------------------------------------------------------------
  415 | 
  416 | test.describe('Student Management — search and filter', () => {
  417 |   test('search by name narrows results', async ({ page }) => {
  418 |     await gotoStudentManagement(page);
```