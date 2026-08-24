import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const E2E_PORT_BACKEND = 5001;
const E2E_PORT_FRONTEND = 5174;

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'e2e/playwright-report', open: 'never' }], ['list']],

  use: {
    baseURL: `http://localhost:${E2E_PORT_FRONTEND}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  projects: [
    // The setup project logs in once and saves auth cookies to a file.
    // The chromium project depends on it so the auth file exists before tests run.
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: [
    {
      // Backend: build then start with the test env
      command: 'npm run build --prefix backend && cross-env NODE_ENV=test DOTENV_CONFIG_PATH=backend/.env.test node backend/dist/index.js',
      url: `http://localhost:${E2E_PORT_BACKEND}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(E2E_PORT_BACKEND),
      },
    },
    {
      // Frontend: preview build pointed at the test backend (include /api so axios baseURL is correct)
      command: `cross-env VITE_API_URL=http://localhost:${E2E_PORT_BACKEND}/api npm run build --prefix frontend && npm run preview --prefix frontend -- --port ${E2E_PORT_FRONTEND}`,
      url: `http://localhost:${E2E_PORT_FRONTEND}`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
