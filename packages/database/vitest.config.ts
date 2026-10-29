import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'database',
    environment: 'node',
    passWithNoTests: true,
    // ISS-109: this used to match only `*.int.test.ts`, so no
    // `*.smoke.test.ts` in this package was ever collected by `pnpm smoke`.
    // T-010 (BR6.5): also plain `*.test.ts`, so pure helpers get unit tests without a database.
    include: ['src/**/*.test.ts'],
    // CR-007: one reset of `DATABASE_URL_TEST` per run, before any file starts.
    globalSetup: ['./src/global-setup.ts'],
    setupFiles: ['./src/test-setup.ts'],
    // Every file shares one `DATABASE_URL_TEST` database, and some files
    // reset it or hold locks on it mid-run (the ISS-202 probe,
    // `reset-guard.int.test.ts`), so files still run one at a time.
    fileParallelism: false,
    // T-010: runs after every other project and before `test-support-seed` (group 2), which resets
    // and seeds the same database (https://vitest.dev/config/sequence#sequence-grouporder).
    sequence: { groupOrder: 1 },
    testTimeout: 30_000,
  },
});
