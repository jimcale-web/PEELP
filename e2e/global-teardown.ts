import path from 'path';
import * as dotenv from 'dotenv';
import pg from 'pg';

export default async function globalTeardown() {
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test'), override: true });

  const testDbUrl = process.env.DATABASE_URL!;

  console.log('[e2e] Clearing test database tables...');
  const client = new pg.Client({ connectionString: testDbUrl });
  await client.connect();

  // Truncate all application tables in dependency order
  await client.query(`
    TRUNCATE TABLE verification, account, session, "user"
    RESTART IDENTITY CASCADE
  `);

  await client.end();
  console.log('[e2e] Test database cleared.');
}
