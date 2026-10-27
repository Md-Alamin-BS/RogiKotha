# Unit test instructions — U2 `cr-007-int-test-reset-determinism`

## Framework

Vitest 4, the `database` project against the isolated `rogikotha_test` database (compose PostgreSQL 18). After this Unit, the reset runs once per run in the project's `globalSetup`; test files only open their pools.

## Run this Unit's tests

```bash
pnpm infra:up
pnpm test:int reset-guard
pnpm test:int
```

Filters go straight after the script name (`pnpm test:int reset-guard`); `code-summary.md` records the exact command used. Then `pnpm check` and `pnpm smoke`.

## What to cover

| Test | Proves |
|---|---|
| The stale-backend sweep refuses a database whose name does not end in `_test` or `_test_b` (for example `rogikotha`) | the sweep can never touch the development database |
| A `DROP SCHEMA` blocked by a held lock rejects with a lock-timeout error in well under 15 s | the gate fails fast instead of hanging (ISS-143) |
| One drop-and-migrate cycle per `pnpm test:int` | the reset moved to `globalSetup` |

The blocker test opens its own second connection, takes a conflicting lock, and releases it in `finally`, so it leaves nothing behind.

Evidence outside the test files, recorded in `code-summary.md`:
- the deliberate-contention run before the fix (hangs, cut off by an outer timeout) and after (fails in ≲ 15 s naming the blocker);
- 10 consecutive `pnpm test:int` durations, none above about 2× the median;
- one run from a manual `DROP SCHEMA public CASCADE`, green (ISS-092);
- the two `it.fails` tripwires in `validator-probes.int.test.ts` still expected-fail.

## Coverage

Not measured yet: the 80% floor arrives with T-010 (team practice).

## Mocking and test data

None: real connections to the real test database; no fixture rows.
