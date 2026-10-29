# Unit test instructions — U45 `t-011-patient-design-and-motion-system`

## Framework

Vitest 4 through `vitest.workspace.ts`: the `web` project for components and layouts (jsdom, rendered in `en` and `bn`), the `tooling` project for `scripts/css-motion-check.mjs` and `tools/contrast.mjs`. Playwright for `apps/web/e2e/motion.spec.ts` against the built app (Build and Test). Coverage with `@vitest/coverage-v8`; `apps/web` stays at 80% lines or more.

## Run this Unit's tests

Every long command carries an outer `timeout`. Verified on `bolt/t-011-patient-design-and-motion-system` at Step 2 (2026-10-29, Git Bash on Windows, Node 24.18, pnpm 11.20):

```bash
pnpm infra:up
# web project with coverage: 29 files, 496 tests, 418/420 lines, 31-35 s
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web --coverage --coverage.reportsDirectory "$TMPDIR/cov-web"
# tooling project (scripts/**/*.test.mjs): 5 files, 24 tests
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project tooling
timeout 120 pnpm contrast
timeout 600 pnpm smoke
timeout 1200 pnpm check
```

`--coverage.include 'apps/web/src/**/*.{ts,tsx}'` may be added to the web run; it gives the same figure. Read the web figure from `coverage-summary.json` by summing the `apps/web/src/` entries.

Added by Phase B, verified when they land: `timeout 120 pnpm contrast:patient` and `timeout 120 pnpm check:motion` (Step 7), and `timeout 900 pnpm --filter @rogikotha/web smoke:e2e` (Step 9; needs `npx playwright install chromium` once).

Baseline before any change (Step 1, commit `9cf860a`): `pnpm check` green in 445 s (93 test files, 1002 passed, 2 expected fail; all packages above 80% lines, `apps/web` 418/420); `pnpm smoke` green in 26 s (12 files, 20 tests).

Only one database-touching run at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm smoke`). Parallel developers in Phase B run only their own project and pass their own `--coverage.reportsDirectory`.

## What to cover (frontend-components § 9)

| Group | Tests | Rules |
|---|---|---|
| Components | `RouteTransition` keyed on the path without the locale (no transition on a language switch); `Reveal` staggers the first six items and nothing after; `PublishTick` present at first paint does not animate; each in `en` and `bn` | BR4.5, BR5, BR6.1 |
| Reduced motion | OS setting and the in-app switch each turn every movement off, including route transitions | BR4 |
| Never animated | demo marker, disclaimer and emergency guidance keep static groups and are never covered | BR6 |
| CSS check | planted violations for M1–M10 each fail; the clean tree passes; a changed dark-block value fails M10 | BR9.1–BR9.3, BR1.8 |
| Contrast | `--pairs patient` passes on the new palette and fails closed on a missing token | BR1.2 |
| Smoke | one motion-system smoke assertion | BR9.4 |
| E2E | `motion.spec.ts`: route fade-rise, reduced motion, static parts | BR9.4 |

Each test must be able to fail. Test names read as sentences; no `test-support` imports in `apps/*`.

## Coverage

80% lines per package (T-010); `apps/web` must stay at or above it with the new components counted.

## Mocking and test data

`next/font/local` is mocked once in `apps/web/vitest.setup.ts`; `matchMedia` for reduced motion is stubbed per test. No mocks of the code under test.
