import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    passWithNoTests: true,
    // ISS-109: this used to match only `*.int.test.ts`, so no
    // `*.smoke.test.ts` in this package was ever collected by `pnpm smoke`.
    include: ['src/**/*.int.test.ts', 'src/**/*.smoke.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    // The two int test files share one `DATABASE_URL_TEST` database and one
    // reset cycle (`test-setup.ts`); running them in parallel workers would
    // race the schema reset.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
