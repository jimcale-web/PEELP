import { execSync } from 'child_process';
import path from 'path';
import * as dotenv from 'dotenv';

export default async function globalTeardown() {
  dotenv.config({ path: path.resolve(__dirname, '../backend/.env.test') });

  console.log('[e2e] Resetting test database…');
  // Drop and recreate all tables — keeps the DB itself intact for next run
  execSync('npx prisma migrate reset --force --skip-seed', {
    cwd: path.resolve(__dirname, '../backend'),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL!,
    },
    stdio: 'inherit',
  });
  console.log('[e2e] Test database reset.');
}
