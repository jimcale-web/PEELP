import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load test env first so DATABASE_URL and other vars are available for the
// webServer env block below. override:true ensures host-level env vars (e.g. a
// developer's shell DATABASE_URL pointing at peelp_dev) never bleed through.
dotenv.config({ path: path.resolve(__dirname, 'backend/.env.test'), override: true });

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
      // Backend: build then start with the test env.
      // All critical env vars are passed explicitly via `env` so they override
      // anything already present in the host environment (avoids the dev DB
      // leaking in when DATABASE_URL is set in the developer's shell).
      command: 'npm run build --prefix backend && node backend/dist/index.js',
      url: `http://localhost:${E2E_PORT_BACKEND}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(E2E_PORT_BACKEND),
        DATABASE_URL: process.env.DATABASE_URL!,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
        FRONTEND_URL: process.env.FRONTEND_URL!,
        ADMIN_EMAIL: process.env.ADMIN_EMAIL!,
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD!,
        RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX!,
      },
    },
    {
      // Frontend: preview build pointed at the test backend (include /api so axios baseURL is correct)
      command: `cross-env VITE_API_URL=http://localhost:${E2E_PORT_BACKEND}/api npm run build --prefix frontend && npm run preview --prefix frontend -- --port ${E2E_PORT_FRONTEND}`,
      url: `http://localhost:${E2E_PORT_FRONTEND}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
