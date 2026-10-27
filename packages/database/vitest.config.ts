import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    passWithNoTests: true,
    // ISS-109: this used to match only `*.int.test.ts`, so no
    // `*.smoke.test.ts` in this package was ever collected by `pnpm smoke`.
    include: ['src/**/*.int.test.ts', 'src/**/*.smoke.test.ts'],
    // CR-007: one reset of `DATABASE_URL_TEST` per run, before any file starts.
    globalSetup: ['./src/global-setup.ts'],
    setupFiles: ['./src/test-setup.ts'],
    // Every file shares one `DATABASE_URL_TEST` database, and some files
    // reset it or hold locks on it mid-run (the ISS-202 probe,
    // `reset-guard.int.test.ts`), so files still run one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
  },
});
