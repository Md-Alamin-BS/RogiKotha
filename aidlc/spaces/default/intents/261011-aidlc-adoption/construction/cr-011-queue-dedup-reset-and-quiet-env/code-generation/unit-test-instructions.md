# Unit test instructions — U4 `cr-011-queue-dedup-reset-and-quiet-env`

## Framework

Vitest 4. Database tests (`*.int.test.ts`, the new `queue/pg-boss-queue.smoke.test.ts`) run in the `database` project against `rogikotha_test` (compose PostgreSQL 18, reset once per run by CR-007's global setup), as `rk_worker` unless the test needs `rk_app`. Worker tests run in `apps/worker` with fakes and no database.

## Run this Unit's tests

```bash
pnpm infra:up
timeout 300 pnpm test:int queue outbox reset-guard env validator-probes
pnpm --filter @rogikotha/worker exec vitest run
pnpm smoke
```

Filters go straight after the script name. Every database run gets an outer `timeout`. `code-summary.md` records the exact commands used. Then `pnpm check` and the full `timeout 300 pnpm test:int`.

Verified at Code Generation step 3 (2026-10-28): `pnpm --filter @rogikotha/worker exec vitest run` collects the worker project's 4 files (14 tests on the baseline), and `timeout 300 pnpm test:int reset-guard` runs only the matching database files (2 files, 8 tests), with the global-setup reset once. The filter `queue` collects every file under `src/queue/`, including the ISS-201 and ISS-202 probes in `queue/pg-boss-queue.validator.int.test.ts`; `validator-probes` collects the T-005 and CR-006 probes, which this Unit does not change.

## What to cover (spec § 11 plus the design review)

| Group | Tests | Rules |
|---|---|---|
| Queue module | T1–T5, T15, T17 (a send that throws on a dropped queue leaves the event unprocessed with no attempt counted, and the next batch relays it) | BR3.1–BR3.9 |
| Relay store | T6–T12 | BR1.1–BR1.10, BR2.1–BR2.3 |
| Outbox repository | T13 | BR1.2 |
| Reset | T14 and the flipped ISS-202 probe | BR4.1–BR4.4 |
| Environment | T16, W6 (stdout and `console.log` both captured) | BR5.1–BR5.3 |
| Worker | W1–W5 | BR1.11, BR1.12, BR2.4 |
| Probes | ISS-201 and ISS-202 move from `it.fails` to `it` with bodies unchanged | BR6.1 |
| Smoke | "the same key sent twice to a fresh queue gives one job" | BR6.3 |

Each test asserts only on its own queue names and ids and must be able to fail. Tests that remove a queue row run that step as `rk_app`.

## Manual check

`timeout 30 pnpm --filter @rogikotha/worker exec tsx src/main.ts`: the first stdout line parses as a JSON object.

## Coverage

Not measured yet: the 80% floor arrives with T-010 (U3).

## Mocking and test data

Worker tests use the relay store fake; database tests use real roles with their own queue and event names, and no shared fixtures.
