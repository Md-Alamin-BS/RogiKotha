import { defaultExclude, defineConfig } from 'vitest/config';

// `seed.int.test.ts` resets and migrates `DATABASE_URL_TEST` itself and
// must never run concurrently with `packages/database`'s own int-test
// project, which uses the *same* physical test database. So it stays
// excluded from this project's file set. In the root runs (`pnpm test`,
// `pnpm test:coverage`, `pnpm check`) it runs in its own
// `test-support-seed` project of `vitest.workspace.ts`, after `database`
// (T-010). It can still be run standalone from this package:
//
//   pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
//
// Vitest's CLI file argument is a *filter* over the already-`include`d set
// — passing the path does not itself bypass `exclude` — so this config
// inspects `process.argv` for that one file and only then lifts the
// exclusion. Under the root config the exclusion stays, or the file would
// also run in this project, beside `test-support-seed` (T-010).
const runningFromRootWorkspace = process.argv.some((arg) => arg.includes('vitest.workspace'));
const runningSeedIntTestDirectly =
  !runningFromRootWorkspace && process.argv.some((arg) => arg.includes('seed.int.test.ts'));

export default defineConfig({
  test: {
    name: 'test-support',
    environment: 'node',
    passWithNoTests: true,
    exclude: runningSeedIntTestDirectly ? defaultExclude : [...defaultExclude, '**/*.int.test.ts'],
    testTimeout: runningSeedIntTestDirectly ? 180_000 : 5_000,
  },
});
