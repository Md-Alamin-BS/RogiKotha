# Unit test instructions — U6 `cr-012-storyboard-seed-correction`

## Framework

Vitest 4. Corpus tests run in `packages/test-support`'s default sweep (no database). The seed integration test `src/seed/seed.int.test.ts` runs standalone against an empty, migrated `rogikotha_test`; it cannot run alongside `pnpm test:int` because both use the same test database.

## Run this Unit's tests

```bash
pnpm infra:up
pnpm --filter @rogikotha/test-support exec vitest run
timeout 300 pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
pnpm smoke
```

Then `timeout 300 pnpm test:int` and `pnpm check`. `code-summary.md` records the exact commands used.

Runner verified on the Bolt branch before the first test (Step 2): `vitest/4.1.11` through `pnpm --filter @rogikotha/test-support exec vitest --version`; the default sweep `pnpm --filter @rogikotha/test-support exec vitest run` ran 6 files, 55 tests, all green; the standalone seed test ran 1 file, 3 tests, green. Exact unit-scoped commands, each with an outer timeout:

```bash
timeout 120 pnpm --filter @rogikotha/test-support exec vitest run
timeout 300 pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
timeout 600 pnpm smoke
timeout 300 pnpm test:int
timeout 900 pnpm check
```

The standalone seed test and `pnpm test:int` (and `pnpm check`, which runs the database project) are never run at the same time.

## What to cover (design § 11)

| Group | Tests | Rules |
|---|---|---|
| Seed integration | counts DC1–DC22; MOD-2033 `factual` 5 / `impersonation` 1 with 6 reports from 6 reporters; other cases unchanged; all lanes as the prototype (MOD-2041 critical); MOD-2018 appeal; `anon_author_r2` carries r2 only; zero orphans over every foreign key; new rows complete except `about`/`address`; d7's chambers on f6 and f7; second run inserts nothing | BR1.5, BR1.6, BR3.1–BR3.4, BR4.1–BR4.4, BR5.4 |
| Corpus | counts equal the prototype except the named n8 exclusion; 14 pinned hues; one persona per anonymous thread (`anon:r15` carries r15 and k31); `anon_author_r4` is not r4's author; Banglish aliases; inline follow-ups `r17-fu-1`, `r24-fu-1` | BR1.3, BR1.7, BR2.1–BR2.7 |
| Rewritten | `cr-008-validation.test.ts`: notifications minus n8, every kind still covered, time format; its MOD-2033 assertions stay (reason recorded) | BR6.3 |
| Smoke | pinned counts become the FD-089 values (reason recorded); one new assertion: FD-089 counts and FD-039 facts through the package entry point | BR6.4 |

Each test must be able to fail: the count tests on a dropped or extra record, the padding test on the old rule (`impersonation` 4), the isolation test on any other content carried by `anon:r2`.

## Coverage

Not measured yet: the 80% floor arrives with T-010 (U3).

## Mocking and test data

None. The corpus is generated from the prototype; the seed runs against the real test database.
