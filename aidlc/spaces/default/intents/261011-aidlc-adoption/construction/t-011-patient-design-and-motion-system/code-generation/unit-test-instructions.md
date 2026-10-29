# Unit test instructions — U45 `t-011-patient-design-and-motion-system`

## Framework

Vitest 4 through `vitest.workspace.ts`: the `web` project for components and layouts (jsdom, rendered in `en` and `bn`), the `tooling` project for `scripts/css-motion-check.mjs` and `tools/contrast.mjs`. Playwright for `apps/web/e2e/motion.spec.ts` against the built app (Build and Test). Coverage with `@vitest/coverage-v8`; `apps/web` stays at 80% lines or more.

## Run this Unit's tests

Every long command carries an outer `timeout`. Step 2 replaces this block with the commands verified on the Bolt branch.

```bash
pnpm infra:up
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web --coverage --coverage.reportsDirectory "$TMPDIR/cov-web"
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project tooling
timeout 120 pnpm contrast
timeout 120 pnpm contrast:patient
timeout 120 pnpm check:motion
timeout 600 pnpm smoke
timeout 1200 pnpm check
timeout 900 pnpm --filter @rogikotha/web smoke:e2e
```

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
