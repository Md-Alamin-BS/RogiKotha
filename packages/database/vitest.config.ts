import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    passWithNoTests: true,
    include: ['src/**/*.int.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    // The two int test files share one `DATABASE_URL_TEST` database and one
    // reset cycle (`test-setup.ts`); running them in parallel workers would
    // race the schema reset.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
