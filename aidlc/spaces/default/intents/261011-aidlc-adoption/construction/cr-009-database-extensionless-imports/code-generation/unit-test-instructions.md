# Unit test instructions — U1 `cr-009-database-extensionless-imports`

## Framework

No new tests: CR-009 changes import specifiers only and must not change behaviour. The checks are the existing suites with counts identical to this branch's pre-change baseline, plus a build probe and a mutation test (CR-009 acceptance table).

## Run this Unit's checks

```bash
pnpm --filter @rogikotha/database exec vitest run src/grants.smoke.test.ts
pnpm --filter @rogikotha/worker typecheck
pnpm --filter @rogikotha/web build
```

The first runs the database package's existing smoke test as the unit-scoped test (the package has no `database.smoke.test.ts`; `grants.smoke.test.ts` is its smoke test, as `code-summary.md` records; path corrected at Build and Test, ISS-809). The build runs once with the throwaway probe page (must compile), once with one `.js` suffix put back (must fail with `Module not found`), then the probe is removed.

Then the project gates with identical counts: `pnpm check`, `pnpm smoke`, `pnpm test:int`.

## Coverage

Not measured yet: the 80% floor arrives with T-010 (team practice).

## Mocking and test data

None: no test is added; the seed and the isolated integration database are used as they are.
