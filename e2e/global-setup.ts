import { execSync } from 'child_process';
import path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';

export default async function globalSetup() {
  // Load test env so DATABASE_URL points to peelp_test
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test') });

  const testDbUrl = process.env.DATABASE_URL!;

  // Parse the test DB URL to connect to the default "postgres" DB to create peelp_test
  const parsed = new URL(testDbUrl);
  const testDbName = parsed.pathname.replace('/', '').split('?')[0]; // e.g. "peelp_test"
  parsed.pathname = '/postgres';
  const adminUrl = parsed.toString();

  console.log(`[e2e] Ensuring test database "${testDbName}" exists…`);
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();

  const { rows } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [testDbName],
  );

  if (rows.length === 0) {
    // identifiers can't be parameterised in DDL — name is safe (comes from our own .env.test)
    await client.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`[e2e] Created database "${testDbName}".`);
  } else {
    console.log(`[e2e] Database "${testDbName}" already exists.`);
  }

  await client.end();

  console.log('[e2e] Running Prisma migrations against test database…');
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../backend'),
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'inherit',
  });
  console.log('[e2e] Migrations complete.');
}
