# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-management.spec.ts >> Student Management — search and filter >> approval filter shows only students with the selected status
- Location: e2e\tests\student-management.spec.ts:457:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('cell', { name: 'filter-pending-mtsil4y68u71@e2e-test.example', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('cell', { name: 'filter-pending-mtsil4y68u71@e2e-test.example', exact: true })

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
- paragraph: 12 total · 12 active
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
  419 | 
  420 |     const name = 'Unique Search Name';
  421 |     const email = testEmail('search-name');
  422 |     await addStudent(page, { name, email });
  423 | 
  424 |     await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(name);
  425 |     await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  426 |   });
  427 | 
  428 |   test('search by email narrows results', async ({ page }) => {
  429 |     await gotoStudentManagement(page);
  430 | 
  431 |     const name = 'Search By Email';
  432 |     const email = testEmail('search-email');
  433 |     await addStudent(page, { name, email });
  434 | 
  435 |     await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(email);
  436 |     await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
  437 |   });
  438 | 
  439 |   test('search by city narrows results', async ({ page }) => {
  440 |     await gotoStudentManagement(page);
  441 | 
  442 |     const email = testEmail('search-city');
  443 |     const city = 'Zanzibar';
  444 |     await addStudent(page, { name: 'City Search Student', email, city, country: 'Tanzania' });
  445 | 
  446 |     await page.getByPlaceholder('Search by name, email, city or country\u2026').fill(city);
  447 |     await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  448 |   });
  449 | 
  450 |   test('no-match search shows empty-state message', async ({ page }) => {
  451 |     await gotoStudentManagement(page);
  452 | 
  453 |     await page.getByPlaceholder('Search by name, email, city or country\u2026').fill('zzz-no-match-xyz');
  454 |     await expect(page.getByText('No students match your filters.')).toBeVisible();
  455 |   });
  456 | 
  457 |   test('approval filter shows only students with the selected status', async ({ page, request }) => {
  458 |     await gotoStudentManagement(page);
  459 | 
  460 |     // Seed a PENDING student so there is something to filter by
  461 |     const email = testEmail('filter-pending');
  462 |     await request.post(`${API_URL}/register`, {
  463 |       data: {
  464 |         name: 'Filter Pending',
  465 |         email,
  466 |         password: 'Password123',
  467 |         city: 'Accra',
  468 |         country: 'Ghana',
  469 |         phoneNumber: '+233 200 000 001',
  470 |       },
  471 |     });
  472 | 
  473 |     await gotoStudentManagement(page);
  474 |     await page.getByRole('combobox').selectOption('PENDING');
  475 | 
> 476 |     await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
      |                                                                        ^ Error: expect(locator).toBeVisible() failed
  477 | 
  478 |     // An approved student should not be visible
  479 |     await page.getByRole('combobox').selectOption('APPROVED');
  480 |     await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();
  481 |   });
  482 | 
  483 |   test('clearing the approval filter restores all students', async ({ page }) => {
  484 |     await gotoStudentManagement(page);
  485 | 
  486 |     const email = testEmail('clear-filter');
  487 |     await addStudent(page, { name: 'Clear Filter Student', email });
  488 | 
  489 |     await page.getByRole('combobox').selectOption('PENDING');
  490 |     await expect(page.getByRole('cell', { name: email, exact: true })).not.toBeVisible();
  491 | 
  492 |     await page.getByRole('combobox').selectOption('');
  493 |     await expect(page.getByRole('cell', { name: email, exact: true })).toBeVisible();
  494 |   });
  495 | });
  496 | 
  497 | 
```