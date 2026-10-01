import { afterAll, beforeAll } from 'vitest';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to a dedicated test database before running Vitest');
}

let databaseName;
try {
  databaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\//, ''));
} catch {
  throw new Error('TEST_DATABASE_URL must be a valid PostgreSQL connection URL');
}
if (!/(^|[_-])test($|[_-])/i.test(databaseName)) {
  throw new Error('Refusing to run tests: TEST_DATABASE_URL database name must contain a separate "test" segment');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.APP_ENV = 'test';
process.env.STORAGE_DRIVER = 'local';
process.env.CORS_ORIGIN = 'http://tabletime.test';
process.env.JWT_SECRET = 'vitest-only-secret-with-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'vitest-only-refresh-secret-32-characters';
process.env.AUTH_MAX_FAILED = '5';
process.env.AUTH_LOCK_MINUTES = '15';

let prisma;
beforeAll(async () => {
  ({ prisma } = await import('../src/config/prisma.js'));
  await prisma.$connect();
});

afterAll(async () => {
  await prisma?.$disconnect();
});
