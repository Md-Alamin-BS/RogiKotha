import { defaultExclude, defineConfig } from 'vitest/config';

// `seed.int.test.ts` resets and migrates `DATABASE_URL_TEST` itself and
// must never run concurrently with `packages/database`'s own int-test
// project, which resets the *same* physical test database in its own
// `beforeAll` — two concurrent `DROP SCHEMA public CASCADE` calls would
// race. So it stays excluded from this project's default file set (the one
// `pnpm test`/`pnpm check`/`pnpm test:int` sweep) and is run standalone,
// explicitly, instead:
//
//   pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
//
// Vitest's CLI file argument is a *filter* over the already-`include`d set
// — passing the path does not itself bypass `exclude` — so this config
// inspects `process.argv` for that one file and only then lifts the
// exclusion, keeping every other command's behaviour (and every other
// package's project) exactly as it already was.
const runningSeedIntTestDirectly = process.argv.some((arg) => arg.includes('seed.int.test.ts'));

export default defineConfig({
  test: {
    name: 'test-support',
    environment: 'node',
    passWithNoTests: true,
    exclude: runningSeedIntTestDirectly ? defaultExclude : [...defaultExclude, '**/*.int.test.ts'],
    testTimeout: runningSeedIntTestDirectly ? 180_000 : 5_000,
  },
});
