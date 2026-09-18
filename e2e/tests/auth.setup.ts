import { test as setup } from '@playwright/test';
import path from 'path';

/** Logs in once as the admin user and saves the session cookies for all tests that need auth. */
const AUTH_FILE = path.join(__dirname, '.auth', 'admin.json');

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/admin/users');
  await page.context().storageState({ path: AUTH_FILE });
});
