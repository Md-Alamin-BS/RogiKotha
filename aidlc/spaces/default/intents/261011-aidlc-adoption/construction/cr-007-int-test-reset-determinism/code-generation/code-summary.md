# Code summary — U2 `cr-007-int-test-reset-determinism` (CR-007)

## What was built

`pnpm test:int` resets `rogikotha_test` once per run instead of once per test file, and a
`DROP SCHEMA` blocked by a lock now fails in seconds, naming the backend that holds the lock,
instead of hanging. A guarded sweep in the run's global setup ends stale backends of the
connecting role, on test databases only. This closes `ISS-143`.

## Files changed

- `packages/database/src/global-setup.ts` (new): the `database` project's Vitest
  `globalSetup`. It refuses a `DATABASE_URL_TEST` whose name does not end in `_test`/`_test_b`,
  calls `runReset(url, { terminateStaleBackends: true })`, and provides
  `databaseReset: { database, publicSchemaOid }` to the tests.
- `packages/database/src/reset.ts`: `isTestDatabaseName`, `terminateStaleTestBackends`, the
  `ResetOptions` parameter, `lock_timeout = 10s` on every session opened from the reset URL,
  the drop in a transaction with `statement_timeout = 60s`, the lock-holder message on a
  timeout, and `DROP SCHEMA IF EXISTS`.
- `packages/database/src/test-setup.ts`: the per-file `beforeAll(runReset)` is removed; the
  file opens the pool, closes it in `afterAll`, and keeps `workerUrlForTestDb()`.
- `packages/database/vitest.config.ts`: `globalSetup: ['./src/global-setup.ts']`; the
  `fileParallelism: false` comment now gives the current reason.
- `packages/database/src/reset-guard.int.test.ts` (new): 7 regression tests.
- `packages/database/src/reset-guard.smoke.test.ts` (new): 1 smoke assertion (`ISS-247`).
- `packages/database/src/queue/pg-boss-queue.int.test.ts`: one comment line that named
  `test-setup.ts`'s `beforeAll` as the reset now names `global-setup.ts`.
- Records: `docs/implementation/ISSUES.md` (ISS-143 closed; ISS-244 to ISS-247 added),
  `docs/implementation/tasks/CR-007-int-test-reset-determinism.md` (Hand-off filled),
  `docs/implementation/handoffs/CR-007.md` (new).

## Key implementation decisions

- **Reset in `globalSetup`.** Vitest's `globalSetup` runs once in the main process before any
  test file. Files no longer reset, so the drop and migrate cycle runs once per run (it was 10,
  one per collected file, plus the ISS-202 probe's own reset, which stays as it was).
- **`lock_timeout` through the URL.** `runMigrate` and `installPgBoss` open their own pools from
  a URL, and `migrate.ts` is outside the owned paths. `reset.ts` therefore passes them a URL
  with `options=-c lock_timeout=10s`, which node-postgres sends in the startup packet.
- **Naming the blocker.** After a timeout the drop rolls back while the blocker still holds
  its lock. `reset.ts` then reads `pg_locks` for granted locks on schema `public` (CREATE in
  progress) and on relations in it, and joins `pg_stat_activity` for role, application and
  state. `rk_app` cannot see another role's `state`, so that reads `unknown`.
- **Sweep scope (`ISS-245`).** The sweep runs only when the global setup asks for it, and only
  on roles the connecting role may signal. Inside every `runReset` it would end the run's own
  `rk_app` pool connections whenever a reset runs mid-run, and pg's `Pool` raises an unhandled
  `error` event for that. `rk_app` has no `pg_signal_backend`, so `rk_worker` and superuser
  backends are filtered out instead of raising a permission error; they get the lock-timeout
  error.
- **Refusal without connecting.** `terminateStaleTestBackends` checks the URL's database name
  first and returns `{ ok: false, reason }` (a Result, not a throw); the SQL repeats the check.
  `runReset` turns a refusal into a thrown error, as it already did for `APP_MODE=production`.
- **`fileParallelism: false` stays.** Files share one database, and the ISS-202 probe and the
  new contention test reset or lock it mid-run.

## Test results

Unit-scoped command: `pnpm test:int reset-guard` → 2 files, 8 tests passed (the contention
test takes 10.04 s).

| Check | Baseline (Step 1) | After (Step 8) |
|---|---|---|
| `pnpm check` exit | 0 | 0 |
| `pnpm check` typecheck | 9/9 packages | 9/9 packages |
| `pnpm check` lint | 0 errors, 1 warning (`packages/i18n/src/routing.ts:17`) | same |
| `pnpm check` tests (`vitest run`) | 47 files, 241 passed + 4 expected-fail (245) | 49 files, 249 passed + 4 expected-fail (253) |
| `pnpm check` i18n parity | 781 keys | 781 keys |
| `pnpm check` build | 37 route rows + `ƒ Proxy (Middleware)` | same |
| `pnpm smoke` | 9 files, 16 tests | 10 files, 17 tests |
| `pnpm test:int` | 10 files, 57 passed + 4 expected-fail (61) | 12 files, 65 passed + 4 expected-fail (69) |
| `pnpm test:int` durations | 21.47, 22.99, 21.90 s | see the 10 runs below |
| `DROP SCHEMA` cycles per run | 10 (one per collected file) + 1 (ISS-202 probe) | 1 (global setup) + 1 (ISS-202 probe) |

The 10 consecutive runs (Step 7), all exit 0 with 12 files and 65 passed + 4 expected-fail:

| Run | Vitest duration | Wall |
|---|---|---|
| 1 | 30.04 s | 33 s |
| 2 | 30.28 s | 32 s |
| 3 | 28.25 s | 30 s |
| 4 | 30.18 s | 32 s |
| 5 | 30.00 s | 32 s |
| 6 (after a manual `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` as `rk_app`) | 30.00 s | 31 s |
| 7 | 30.24 s | 32 s |
| 8 | 30.02 s | 32 s |
| 9 | 30.17 s | 32 s |
| 10 | 30.06 s | 32 s |

Median 30.05 s; maximum 30.28 s, 1.01× the median. The runs take about 8 s longer than the
baseline because the contention test waits out the 10 s lock timeout on purpose.

Deliberate contention: a `psql` session in the compose container ran
`BEGIN; CREATE TABLE cr007_blocker(id int);` and was left `idle in transaction`.

- Before (Step 2, blocker as `postgres`): `timeout 120 pnpm test:int` → exit 124 at 120 s.
  The output stopped after the first file's three tests were reported skipped (`↓`) and the
  second file had started. `pg_stat_activity` samples:

  ```
  +40 s  20901 postgres cr007-blocker idle in transaction  CREATE TABLE cr007_blocker(id int);
         20934 rk_app   active  Lock  DROP SCHEMA public CASCADE
  +90 s  21042 rk_app   active  Lock  DROP SCHEMA public CASCADE
         20901 postgres cr007-blocker idle in transaction  CREATE TABLE cr007_blocker(id int);
         20934 rk_app   active  Lock  DROP SCHEMA public CASCADE
  ```

- After (Step 7, same blocker as `postgres`): exit 1 after 13 s wall.

  ```
  Error: db:reset could not lock schema public within lock_timeout 10s; blocked by backend pid 22001 (role postgres, application "cr007-blocker", state unknown)
   ❯ dropPublicSchema packages/database/src/reset.ts
   ❯ runReset packages/database/src/reset.ts
   ❯ Object.setup packages/database/src/global-setup.ts
  Caused by: error: canceling statement due to lock timeout
  ```

- After (Step 7, the same blocker opened as `rk_app`): exit 0 after 32 s wall, 12 files,
  65 passed + 4 expected-fail, with
  `db:reset ended 1 stale backend(s) on rogikotha_test: pid 22098 (role rk_app, application "cr007-blocker-rk-app", state idle in transaction)`.

After each scenario every blocker and orphaned `DROP` backend was ended by pid, and
`pg_stat_activity` showed no backend left on `rogikotha_test`. No helper script was written;
the blockers were `psql` sessions in the container.

`beforeAll` timeout: it fires, but it cannot cancel the pg query. Pid 20934's `DROP` was still
queued at +90 s, after its file's 60 s hook timeout. Once the blocker ended, that orphaned drop
removed `public`, which is how `ISS-244` was found. The driver-level `lock_timeout` is the
safeguard.

Other checks:

- The `ISS-139` and `ISS-141` tripwires in `validator-probes.int.test.ts` still report as
  expected fail (`19 passed | 2 expected fail` for that file); the run total stays at 4.
- `APP_MODE=production pnpm db:reset` and `pnpm db:migrate` exit 1 with their refusal.
- `pnpm db:reset` ran twice on a scratch database `rogikotha_cr007_scratch` (owned by `rk_app`,
  not a test name) with no sweep line; the second run left 59 tables and 9 migration rows. The
  scratch database was dropped afterwards. The development database `rogikotha` was not reset,
  and no backend on it was touched.
- Mutation checks: a per-file `beforeAll(runReset)` put back into `test-setup.ts` fails
  "this file's setup hooks did not reset the schema again" (`expected 882957 to be 880761`);
  `lock_timeout` raised to 20 s fails the contention test after 20.04 s. Both were reverted.

Coverage: coverage not measured yet (T-010). No assertion was removed, retargeted or skipped.

## Issues

- `ISS-143` (S3): closed, fixed in CR-007.
- `ISS-244` (S4): a reset failed with `3F000` when a killed run's queued drop had already
  removed `public`. Fixed with `DROP SCHEMA IF EXISTS`.
- `ISS-245` (S4): the sweep's narrower scope (assumption).
- `ISS-246` (S4): Vitest prints `No test files found, exiting with code 0` before a global-setup
  error, although it exits 1 (informational).
- `ISS-247` (S4): `reset-guard.smoke.test.ts` is outside the plan's file table (deviation).

## Deviations and assumptions

- Step 4: the sweep runs only when the caller asks (the global setup), not before every drop
  on a test database, and only on roles the connecting role may signal (`ISS-245`).
- Step 4: the drop is `DROP SCHEMA IF EXISTS public CASCADE` (`ISS-244`).
- Step 6: one extra file, `reset-guard.smoke.test.ts`, for the team's one-smoke-assertion rule
  (`ISS-247`). `reset-guard.int.test.ts` also has a positive sweep test, run as `rk_worker` so
  it cannot end the file's own `rk_app` pool.
- Step 6 (c): "one drop cycle per run" is proven in two parts. The global setup provides its
  reset marker, and the `public` schema oid read while the file is collected equals the oid
  after the file's setup hooks. A direct oid comparison with the global setup's value would
  depend on file order, because the ISS-202 probe resets mid-run.
- Step 7: the "dev reset keeps working" check ran on a scratch non-test database, to leave the
  owner's `rogikotha` data alone.
- One comment line in `queue/pg-boss-queue.int.test.ts` was corrected, because the change made
  it wrong.
- `06-change-requests.md` still shows CR-007 as queued; the plan does not list that file.
