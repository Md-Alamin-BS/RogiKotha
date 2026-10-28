# Unit test instructions — U3 `t-010-boundary-lint-and-ci`

## Framework

Vitest 4 through `vitest.workspace.ts`, plus a new `tooling` project (`scripts/vitest.config.ts`) for the root scripts. Coverage with `@vitest/coverage-v8`. ESLint 10 for the boundary rules and the fixture proof. The `database` project needs the compose PostgreSQL (`pnpm infra:up`) and resets `rogikotha_test` once per run, so only one database-touching run at a time.

## Run this Unit's tests

Every long command carries an outer `timeout` (ISS-143):

```bash
pnpm infra:up
timeout 300 pnpm lint
timeout 300 pnpm lint:boundaries
timeout 120 pnpm exec vitest run --config vitest.workspace.ts --project tooling
timeout 300 pnpm --filter @rogikotha/database exec vitest run src/outbox.int.test.ts
timeout 900 pnpm test:coverage
timeout 600 pnpm smoke
timeout 900 pnpm check
```

Step 2 replaces this block with the exact commands verified on the Bolt branch. In Phase B each developer runs only its own package's coverage, for example `timeout 300 pnpm --filter @rogikotha/contracts exec vitest run --coverage`, and never the `database` project unless it owns `packages/database`.

## What to cover (design § 11)

| Group | Tests | Rules |
|---|---|---|
| Fixture proof | `pnpm lint:boundaries` against the manifest: FX1–FX10 each reported once with its rule id, FX11–FX15 silent, no other problem; prints "10 expected violations found" | BR5.1–BR5.3, BR2.*, BR3.* |
| Smoke | `scripts/boundaries.smoke.test.mjs`: FX1 linted through ESLint's Node API reports the boundary rule's error | BR5.5 |
| Identity guard | a temporary file and message with a `Co-Authored-By` trailer or "Generated with" footer are refused; a bare model name passes | BR11.1, BR11.2 |
| Contrast | flag mode on a token file without the tokens exits 1 naming the pair; `pnpm contrast` output equals `pnpm tools:contrast` | BR9.2, BR9.3 |
| Outbox | `countPending` counts unprocessed rows before and after `markProcessed` and `markDead` | BR3.6 (ISS-205) |
| Coverage raise | ordinary unit tests through public exports in each package below 80% | BR6.5 |
| Mutation | disable one rule block → `pnpm lint:boundaries` exits 1; restore | BR5.4 |

Each test must be able to fail: the fixture on a missing or over-wide rule, the guard on a removed marker, the contrast test on the old skip-and-pass behaviour.

## Coverage

From this Unit on: 80% lines per workspace package with source code, measured in the same run as the tests; packages with zero lines pass; the figure is never lowered and an exclusion needs a reason (D10, BR6.1–BR6.7).

## Mocking and test data

Fixture files under `lint-fixtures/boundary-violation/`; temporary files in the OS temp directory. No mocks of the code under test.
