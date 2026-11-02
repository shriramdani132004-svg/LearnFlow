import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load the workspace environment first, then force the dedicated test branch.
config({ path: resolve(__dirname, '../../../.env') });
config();

process.env.NODE_ENV = 'test';
process.env.COOKIE_SECURE = 'false';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (process.env.TEST_DIRECT_URL) {
  process.env.DIRECT_URL = process.env.TEST_DIRECT_URL;
}

process.env.FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required for e2e tests. Set TEST_DATABASE_URL in the workspace .env file.',
  );
}
