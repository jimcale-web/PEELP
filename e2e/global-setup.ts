import { chromium } from '@playwright/test';
import type { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import pg from 'pg';
import { randomBytes, scrypt } from 'node:crypto';
import { randomUUID } from 'crypto';

/** Reproduces the exact hash format used by @better-auth/utils/password (Node scrypt). */
async function hashPasswordForBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, derivedKey) => (err ? reject(err) : resolve(derivedKey)),
    );
  });
  return `${salt}:${key.toString('hex')}`;
}

const AUTH_FILE = path.join(__dirname, 'tests/.auth/admin.json');

export default async function globalSetup(config: FullConfig) {
  // Load test env so DATABASE_URL points to peelp_test.
  // override:true ensures a host-level DATABASE_URL (e.g. peelp_dev from a
  // developer's shell) never takes precedence over the dedicated test DB.
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test'), override: true });

  const testDbUrl = process.env.DATABASE_URL!;

  // Parse the test DB URL to connect to the default "postgres" DB to create peelp_test
  const parsed = new URL(testDbUrl);
  const testDbName = parsed.pathname.replace('/', '').split('?')[0]; // e.g. "peelp_test"
  parsed.pathname = '/postgres';
  const adminUrl = parsed.toString();

  console.log(`[e2e] Ensuring test database "${testDbName}" exists...`);
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const { rows } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testDbName],
  );

  if (rows.length === 0) {
    // identifiers can't be parameterised in DDL - name is safe (comes from our own .env.test)
    await client.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`[e2e] Created database "${testDbName}".`);
  } else {
    console.log(`[e2e] Database "${testDbName}" already exists.`);
  }

  await client.end();

  console.log('[e2e] Running Prisma migrations against test database...');
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../backend'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'inherit',
  });
  console.log('[e2e] Migrations complete.');

  // Seed the admin user directly into the DB using the same scrypt format as better-auth
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;

  const dbClient = new pg.Client({ connectionString: testDbUrl });
  await dbClient.connect();

  // Remove stale admin rows so re-runs are idempotent
  const { rows: existing } = await dbClient.query(
    'SELECT id FROM "user" WHERE email = $1',
    [adminEmail],
  );
  if (existing.length > 0) {
    const userId = existing[0].id;
    await dbClient.query('DELETE FROM account WHERE "userId" = $1', [userId]);
    await dbClient.query('DELETE FROM "user" WHERE id = $1', [userId]);
  }

  const userId = randomUUID();
  const now = new Date();
  await dbClient.query(
    `INSERT INTO "user" (id, name, email, "emailVerified", role, "approvalStatus", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, true, 'ADMIN', 'APPROVED', $4, $4)`,
    [userId, 'Admin User', adminEmail, now],
  );

  const accountId = randomUUID();
  const hashedPassword = await hashPasswordForBetterAuth(adminPassword);
  await dbClient.query(
    `INSERT INTO account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
     VALUES ($1, $2, 'credential', $3, $4, $5, $5)`,
    [accountId, userId, userId, hashedPassword, now],
  );

  await dbClient.end();
  console.log(`[e2e] Admin user seeded (${adminEmail}).`);

  // --- Log in via browser and save the session cookie for all tests that need auth ---
  // The baseURL is read from the first project's resolved use options.
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:5174';

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  console.log('[e2e] Logging in as admin and saving session...');
  const browser = await chromium.launch();
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto('/login');
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('/admin/users');

  await context.storageState({ path: AUTH_FILE });
  await browser.close();
  console.log('[e2e] Admin session saved.');
}
