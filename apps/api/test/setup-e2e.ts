import { parse } from 'url';

const dbUrl = process.env.DATABASE_URL || '';

if (dbUrl && !dbUrl.includes('_test')) {
  throw new Error(`
    FATAL: E2E tests must be run against a dedicated test database! 
    The current DATABASE_URL is: ${dbUrl}
    Please configure a test database (e.g., ending with '_test') in your environment 
    or use a .env.test file to prevent overwriting development data.
  `);
}

// Redirect uploads to a test-specific folder to prevent polluting the real uploads folder
process.env.UPLOAD_DIR = 'uploads_test';
