# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: student-management.spec.ts >> Student Management — approval >> approving a pending student replaces buttons with Approved pill
- Location: e2e\tests\student-management.spec.ts:241:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('row', { name: /to-approve-mtsikh8l9zsb@e2e-test.example/ }).getByRole('button', { name: '✓ Approve' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('row', { name: /to-approve-mtsikh8l9zsb@e2e-test.example/ }).getByRole('button', { name: '✓ Approve' })

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
  162 | 
  163 |   test('shows validation errors when required fields are empty', async ({ page }) => {
  164 |     await gotoStudentManagement(page);
  165 | 
  166 |     await page.getByRole('button', { name: '+ Add Student' }).click();
  167 |     const m = modal(page);
  168 |     await m.getByRole('button', { name: 'Add Student' }).click();
  169 | 
  170 |     await expect(m.getByText('Name is required.')).toBeVisible();
  171 |     await expect(m.getByText('Valid email is required.')).toBeVisible();
  172 |     await expect(m.getByText('Password must be at least 8 characters.')).toBeVisible();
  173 |   });
  174 | 
  175 |   test('closes the modal on Cancel', async ({ page }) => {
  176 |     await gotoStudentManagement(page);
  177 | 
  178 |     await page.getByRole('button', { name: '+ Add Student' }).click();
  179 |     await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();
  180 | 
  181 |     await modal(page).getByRole('button', { name: 'Cancel' }).click();
  182 |     await expect(page.locator('.modal-card')).not.toBeVisible();
  183 |   });
  184 | 
  185 |   test('closes the modal on Escape key', async ({ page }) => {
  186 |     await gotoStudentManagement(page);
  187 | 
  188 |     await page.getByRole('button', { name: '+ Add Student' }).click();
  189 |     await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();
  190 | 
  191 |     await page.keyboard.press('Escape');
  192 |     await expect(page.locator('.modal-card')).not.toBeVisible();
  193 |   });
  194 | 
  195 |   test('closes the modal when clicking the backdrop', async ({ page }) => {
  196 |     await gotoStudentManagement(page);
  197 | 
  198 |     await page.getByRole('button', { name: '+ Add Student' }).click();
  199 |     await expect(modal(page).getByRole('heading', { name: 'Add New Student' })).toBeVisible();
  200 | 
  201 |     await page.locator('.modal-backdrop').click({ position: { x: 5, y: 5 } });
  202 |     await expect(page.locator('.modal-card')).not.toBeVisible();
  203 |   });
  204 | 
  205 |   test('rejects duplicate email with a server error', async ({ page }) => {
  206 |     await gotoStudentManagement(page);
  207 | 
  208 |     const email = testEmail('dup-email');
  209 |     await addStudent(page, { name: 'First Student', email });
  210 | 
  211 |     // Try to add again with same email
  212 |     await page.getByRole('button', { name: '+ Add Student' }).click();
  213 |     const m = modal(page);
  214 |     await m.getByLabel('Full Name').fill('Second Student');
  215 |     await m.getByLabel('Email').fill(email);
  216 |     await m.getByLabel('Password').fill('Password123');
  217 |     await m.getByLabel('City').fill('Cairo');
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
> 262 |     await expect(row.getByRole('button', { name: '✓ Approve' })).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
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
  318 |     await expect(row.getByRole('button', { name: '✕ Reject' })).toBeVisible();
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
```