# Code summary — U1 `cr-009-database-extensionless-imports` (CR-009)

## What was built

`apps/web` can now import `@rogikotha/database` under Next's Turbopack build. Every relative
import and export specifier in `packages/database/src` lost its `.js` suffix: 136 specifiers
in 47 files, changed by suffix only. `@rogikotha/database` was added to `transpilePackages` in
`apps/web/next.config.ts`. The package's logic, types, exports, schema and migrations are
unchanged. This closes `ISS-183`.

## Files changed

- `packages/database/src/**`, 47 files, import and export specifiers only
  (`git diff --stat packages/database`: 47 files changed, 136 insertions(+), 136 deletions(-)):
  `index.ts`, `client.ts`, `audit-writer.ts`, `migrate.ts`, `reset.ts`, `test-setup.ts`,
  `search/index.ts`, `queue/index.ts`, 14 `repositories/*.ts`, 16 `schema/*.ts`, and 9 test
  files (`append-only.int.test.ts`, `client.int.test.ts`, `constraints.int.test.ts`,
  `grants.smoke.test.ts`, `migrations.int.test.ts`, `outbox.int.test.ts`,
  `validator-probes.int.test.ts`, `queue/pg-boss-queue.int.test.ts`,
  `queue/pg-boss-queue.validator.int.test.ts`).
- `apps/web/next.config.ts`: one line, `'@rogikotha/database'` in `transpilePackages`.
- `apps/web/src/app/[locale]/dbprobe/page.tsx`: throwaway probe, created for Steps 2 and 5 and
  deleted in Step 6. It is not in the working tree.
- Records: `docs/implementation/ISSUES.md` (ISS-183 closed; ISS-230, ISS-231 and ISS-232
  added), `docs/implementation/06-change-requests.md` (CR-009 row set to applied),
  `docs/implementation/tasks/CR-009-database-extensionless-imports.md` (Hand-off filled),
  `docs/implementation/handoffs/CR-009.md` (new).

## Key implementation decisions

- Each file was edited by replacing `.js';` with `';` across the whole file, and only after
  checking that the file's `.js'` occurrences were exactly its relative specifiers. Across
  `src/**`, 136 `.js'` matches equal 136 relative specifiers, so no package or `node:`
  specifier was touched.
- Directory imports keep `/index` (`./schema/index`, `./search/index`, `./queue/index`). The
  plan's Step 3 example shows `./search/index.js` → `./search`. The task file and the build
  brief ask for the suffix only, and CR-005 kept `./index`, so the narrower form was taken
  (`ISS-230`). Both forms resolve under `moduleResolution: "bundler"` and Turbopack.
- The probe page imports `doctors` from the main barrel and renders `typeof doctors`, so the
  import is used and the page has the default export `next build` requires.

## Test results

Unit-scoped command:
`pnpm --filter @rogikotha/database exec vitest run src/grants.smoke.test.ts`. The package has
no `database.smoke.test.ts`; `grants.smoke.test.ts` is its smoke test. Result: 1 file, 1 test
passed.

Baseline (Step 1, before any change) and after (Step 6, probe removed) give identical counts:

| Check | Baseline | After |
|---|---|---|
| `pnpm check` typecheck | 9/9 packages green | 9/9 packages green |
| `pnpm check` lint | 0 errors, 1 warning (`packages/i18n/src/routing.ts:17`, already there) | same |
| `pnpm check` tests (`vitest run`) | 46 files, 216 passed + 4 expected-fail (220) | 46 files, 216 passed + 4 expected-fail (220) |
| `pnpm check` i18n parity | 781 keys, both locales | 781 keys, both locales |
| `pnpm check` build | green; `next build` 37 route rows + `ƒ Proxy (Middleware)` | green; 37 route rows + `ƒ Proxy (Middleware)` |
| `pnpm smoke` | 9 files, 15 tests | 9 files, 15 tests |
| `pnpm test:int` | 9 files, 32 passed + 4 expected-fail (36) | 9 files, 32 passed + 4 expected-fail (36) |
| `pnpm --filter @rogikotha/worker typecheck` | green | green |

Grep counts under `packages/database/src`:

| Count | Baseline | After |
|---|---|---|
| Relative specifiers ending `.js` | 136 (47 files) | 0 |
| All relative specifiers | 136 (47 files) | 136 (47 files) |

The task file expected 124 and 124. The package has grown since then; the real numbers are
above.

Diff check: filtering `git diff -U0 packages/database` for changed lines that are not
`import … from './…'`, `export * from './…'`, `} from './…'` or `import './…'` finds nothing.

Probe build (`pnpm --filter @rogikotha/web build` with `dbprobe/page.tsx` present):

- Before the fix (Step 2) it failed with exit 1:

  ```
  Error: Turbopack build failed with 21 errors:
  Error: Module not found: Can't resolve './search/index.js'   (packages/database/src/index.ts:21)
  ... 19 more `Module not found: Can't resolve './<file>.js'` (client, schema/index, audit-writer,
      15 repositories/*, queue/index)
  Error: Export doctors doesn't exist in target module
  The module has no exports at all.
  Import trace: ./packages/database/src/index.ts -> ./apps/web/src/app/[locale]/dbprobe/page.tsx
  ```

- After the fix (Step 5) it succeeded with exit 0: `✓ Compiled successfully`, with route
  `ƒ /[locale]/dbprobe` listed.

Mutation test (Step 5): with `packages/database/src/index.ts:21` set back to
`export * from './search/index.js';`, the build exits 1:

```
Error: Turbopack build failed with 1 error:
./packages/database/src/index.ts:21:1
Error: Module not found: Can't resolve './search/index.js'
```

After the line was restored, it exits 0: `✓ Compiled successfully in 1305ms`.

Coverage: coverage not measured yet (T-010). No test was added, removed, retargeted or skipped.
The build probe and the mutation test stand in for this Unit's smoke assertion, as the
approved plan states; no smoke assertion was removed.

## Issues

- `ISS-183` (S2): closed, fixed in CR-009.
- `ISS-230` (S4): directory imports keep `/index` (assumption, narrower option).
- `ISS-231` (S4): after the probe page was deleted, `apps/web`'s `tsc --noEmit` failed on a
  stale, untracked `.next/types/validator.ts` (`TS2307 … dbprobe/page.js`). Rebuilding the web
  app once cleared it, and `pnpm check` went green.
- `ISS-232` (S4): the advisory `traceability` sensor reports `upstream ID set is empty` for
  this story-less Unit (fire id `2ed6dea1`). Nothing was invented to make it pass.
- `ISS-193` (S4) stays open and untouched: extensionless specifiers do not make the worker's
  `dist/main.js` runnable under plain `node`.

## Deviations and assumptions

- Step 3: `/index` was kept on directory imports instead of the bare folder form in the plan's
  example (see Key implementation decisions and `ISS-230`).
- Step 6: one extra `pnpm --filter @rogikotha/web build` ran between deleting the probe and the
  final `pnpm check`, to regenerate the stale `.next/types` (`ISS-231`). The Turbopack cache
  under `apps/web/.next/cache/` still holds the probe's name. That cache is untracked build
  output, and no tracked file refers to the probe.
- Step 7: `06-change-requests.md` already had a CR-009 row, written when the CR was raised. Its
  Status cell was updated to applied, the way CR-005's row reads; no second row was added.
- `traceability.json` maps `NFR11`, the requirement the plan's traceability table names,
  because U1 has no story. See `ISS-232` for the sensor result.
