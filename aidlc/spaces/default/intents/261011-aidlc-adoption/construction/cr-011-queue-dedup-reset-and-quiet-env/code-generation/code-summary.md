# Code summary — U4 `cr-011-queue-dedup-reset-and-quiet-env` (CR-011)

Built from the approved plan (`code-generation-plan.md`, steps 1–13) on branch
`bolt/cr-011-queue-dedup-reset-and-quiet-env`, start `343d9ba`. Changes are left uncommitted for
the review and the squash commit. Methodology test-after, per the Testing Contract.

## Files

| Path | Change |
|---|---|
| `packages/database/src/queue/queue-declaration.ts` | new: the queue declaration (every C15 job `exclusive`; 5 retries, `evidence.process` 3; `expireInSeconds` 300) |
| `packages/database/src/queue/sql-executor.ts` | new: `SqlExecutor` (pg-boss's `executeSql` shape) and `clientExecutor(client)` |
| `packages/database/src/queue/pg-boss-queue.ts` | `ensureQueue` from the declaration with the fail-closed policy check; `enqueue` with declaration defaults, optional `executor`, confirmed `null`, missing-queue handling; `EnqueueResult`, `QueuePolicyMismatchError`, `QueueMissingError`; `EnqueueOptions.key` comment corrected |
| `packages/database/src/queue/outbox-relay-store.ts` | new: `PgOutboxRelayStore` and the `RelayStore` contract of spec § 10 |
| `packages/database/src/queue/index.ts` | exports the three new modules |
| `packages/database/src/repositories/outbox.ts` | `claimUnprocessed`, `markProcessed`, `recordFailedAttempt`, `markDead` on a `SqlExecutor`; `claimBatch` and `markFailed` removed |
| `packages/database/src/reset.ts` | drops `pgboss` and `public` in one transaction; blocker lookup by schema name over both |
| `packages/database/src/env.ts`, `apps/worker/src/env.ts` | `quiet: true` |
| `apps/worker/src/handlers/outbox-relay.ts` | `planEvent`, `jobKey`, `decideFailure`, `logOutcomes`, `relayQueueNames`, `ensureRelayQueues`; `relayOnce` on the store; routes unchanged |
| `apps/worker/src/container.ts` | `relayStore` (`PgOutboxRelayStore` over the worker pool) replaces `outboxSource` |
| `apps/worker/src/main.ts` | ensures every routed queue before the first tick; `worker.start_failed` and exit 1 on failure |
| `packages/database/src/queue/queue-test-support.ts` | new: shared test helpers (reads and queue removal as `rk_app`) |
| `packages/database/src/queue/pg-boss-queue.int.test.ts` | T1–T5, T15 and a retry-default test added; the three T-009 tests unchanged |
| `packages/database/src/queue/outbox-relay-store.int.test.ts` | new: T6–T12, T17 |
| `packages/database/src/queue/pg-boss-queue.validator.int.test.ts` | ISS-201 and ISS-202 probes `it.fails` → `it`, bodies unchanged, header comment updated |
| `packages/database/src/queue/pg-boss-queue.smoke.test.ts` | new smoke assertion |
| `packages/database/src/outbox.int.test.ts` | T13 (two T-009 tests rewritten, reason below); the `rk_worker` test unchanged |
| `packages/database/src/reset-guard.int.test.ts` | T14 added |
| `packages/database/src/env.int.test.ts`, `apps/worker/src/env.test.ts` | new: T16, W6 |
| `apps/worker/src/handlers/outbox-relay.test.ts` | W1–W5 added; T-009 tests moved to an in-memory `RelayStore` |
| `apps/worker/src/worker.smoke.test.ts` | same assertion on an in-memory `RelayStore` |
| `docs/status/dependency-check-log.md` | 2026-10-28 entry (pg-boss, dotenv) |
| `docs/implementation/ISSUES.md` | ISS-144, ISS-185, ISS-201, ISS-202, ISS-203 closed; ISS-248 to ISS-257 added |
| `docs/implementation/tasks/CR-011-queue-dedup-reset-and-quiet-env.md`, `docs/implementation/handoffs/CR-011.md` | Hand-off |

No migration, grant, route or dependency version changed.

## Key implementation decisions

- **Relay transaction (FD-038).** One connection from the worker pool, `BEGIN`, `SET LOCAL`
  statement timeout 5 s and idle-in-transaction timeout 10 s, claim, one savepoint per event,
  `COMMIT`; outcomes are returned only after the commit and logged by the worker then. The
  store builds both the outbox statements and pg-boss's executor over that connection and does
  not use drizzle's transaction session.
- **Missing queue (design review R-01).** A send that pg-boss rejects with `Queue <name> does
  not exist` clears the ensured mark and rejects with `QueueMissingError`; the store rethrows it
  out of the event's savepoint, so the whole batch rolls back with no attempt counted. The next
  tick's `ensureRelayQueues` re-creates the queue (T17). An unconfirmed `null` (queue row gone
  while still cached) stays a per-event failure, `job_not_enqueued`, as designed (T4, T8, T9).
- **`enqueue` with an executor does not create the queue.** WF4 step 1 says "ensure the
  queue"; inside the relay transaction that would open a second connection (BR1.9). The caller
  that passes its transaction ensures the queue before opening it: the relay ensures every routed
  queue before each batch, and U8's `queueEmail` must do the same (ISS-253).
- **pg-boss's own I/O inside `send` (spec § 15 risk, verified).** The only other connection
  `send` uses is `getQueueCache`'s read of `pgboss.queue` on pg-boss's pool, once per queue
  after `createQueue` evicted it or after the 60 s cache refresh. The relay transaction never
  writes `pgboss.queue`, so that read cannot wait on the relay's locks.
- **Confirmation query.** `select 1 from pgboss.job where name = $1 and coalesce(singleton_key,
  '') = coalesce($2, '') and state in ('created', 'retry', 'active')`, on the same executor, so
  a duplicate inside the same transaction is confirmed too (T5).
- **Reset.** `DROP SCHEMA IF EXISTS pgboss CASCADE` then `… public CASCADE` in the one
  transaction under `statement_timeout` 60 s and the URL's `lock_timeout` 10 s. The blocker
  query joins `pg_namespace` by name for both relation and schema locks, so it works when
  `pgboss` is absent. The message keeps CR-007's tail (`lock_timeout 10s; blocked by backend pid
  <n> (role <r>, …`), so the existing contention test still matches.
- **Worker start.** `main.ts` ensures every distinct job name in `RELAY`; a policy mismatch logs
  `worker.start_failed` with `code: 'queue_policy_mismatch'`, the queue, both policies and
  `fix: 'pnpm db:reset'`; any other failure logs `code: 'queue_ensure_failed'`, the queue, the
  error class and SQL state. Then exit 1. No free-text message is logged (BR2.4).
- **Logs.** `outbox.unmapped` (warn), `outbox.relay_failed` (warn), `outbox.dead` (error),
  `outbox.job_deduplicated` (info) carry `eventName`, `eventId`, `job`, `attempts`, `errorCode`
  only; the old lines' free-text `message` field is gone.

## dotenv: the corrected reasoning (design review R-02)

`functional-spec.md` § 9 rejected `DOTENV_CONFIG_QUIET` in `.env` because "the variable is read
before the file is loaded". That is wrong: dotenv 17.4.2 reads it again after loading the file
(`lib/main.js:292-294`). `quiet: true` is still the choice, because it does not depend on what the
`.env` file contains, and a debug setting still prints on purpose. The banner goes through
`console.log`, so T16 and W6 spy on both `console.log` and `process.stdout.write`. With `quiet:
true` removed from either loader, both fail (`expected "log" to not be called at all, but actually
been called 1 times`); both edits were reverted.

## Test results

Commands (compose PostgreSQL up via `pnpm infra:up`):

- `pnpm check`
- `timeout 600 pnpm smoke`
- `timeout 300 pnpm test:int`
- unit-scoped: `timeout 300 pnpm test:int queue outbox reset-guard env validator-probes` and
  `pnpm --filter @rogikotha/worker exec vitest run`

| Suite | Baseline (before any change) | After |
|---|---|---|
| `pnpm check` (vitest part) | 49 files, 249 passed + 4 expected-fail (253) | 53 files, 277 passed + 2 expected-fail (279); exit 0 |
| `pnpm check` (lint) | 0 errors, 1 warning (`packages/i18n/src/routing.ts:17`) | the same |
| `pnpm smoke` | 10 files, 17 tests | 11 files, 18 tests; exit 0 |
| `pnpm test:int` | 12 files, 65 passed + 4 expected-fail (69) | 15 files, 85 passed + 2 expected-fail (87); exit 0 |
| unit-scoped database run | — | 9 files, 55 passed + 2 expected-fail |
| worker project | 4 files, 14 tests | 5 files, 22 tests |

The two expected-fail left are ISS-139 and ISS-141 in `validator-probes.int.test.ts` (not this
Unit's). The ISS-201 and ISS-202 probes moved from expected-fail to passed. No assertion was
removed or skipped.

**Batch timing.** T6 relays 50 events with two jobs each (100 job inserts) in one batch:
**181 ms** from `relayBatch` call to resolution, against the 5 s statement timeout (each
statement is bounded separately) and the 10 s idle-in-transaction timeout.

**Worker first line.** `timeout 30 pnpm --filter @rogikotha/worker exec tsx src/main.ts`: the
first stdout line is
`{"mode":"development","jobs":["outbox.relay"],"ts":"…","level":"info","event":"worker.started"}`
and parses as a JSON object; no dotenv banner, stderr empty. When `timeout` ends the child, pnpm
then writes `undefined` and an `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` line to stdout (ISS-256);
`tsx src/main.ts` run directly from `apps/worker` prints only the JSON line.

**Safety checks.** `APP_MODE=production pnpm db:reset` still exits 1 with its refusal. T15 and the
T-009 probe show `rk_worker` still cannot create a table in `pgboss` after a reset.

Coverage not measured yet (T-010).

## T-009 assertions rewritten (BR6.4)

| Test | Reason |
|---|---|
| `outbox.int.test.ts` "claimBatch returns unprocessed rows once and marks them" → T13 "a claim locks unprocessed rows without marking them, and a rolled-back claim leaves them claimable" | asserted the at-most-once claim (ISS-144) that CR-011 removes on purpose; still asserts 2 rows claimed and none returned to a second claim while held |
| `outbox.int.test.ts` "markFailed resets a row so a later claimBatch can pick it up again" → T13 "recording a failed attempt adds one attempt and leaves the row claimable; …" | `markFailed` re-opened a processed row; rows now stay unprocessed until marked, so the attempt is recorded without re-opening; still asserts the reclaimed row has 1 attempt |
| `outbox-relay.test.ts` "singleton keys are stable across retries" | expected `evt-5:search.refresh`; C15 fixes `<job>:<eventId>` (Question 4), so it expects `search.refresh:evt-5` |
| `outbox-relay.test.ts` five other `relayOnce` tests, `worker.smoke.test.ts` | the relay transaction moved to `@rogikotha/database`; the in-memory doubles now implement `RelayStore` instead of `OutboxSource` + `RelayQueue.enqueue`. Every assertion is kept |

## Deviations from the plan

- **`EnqueueResult` instead of the contracts `Result`** (ISS-255). `job_not_enqueued` is not an
  `ErrorCode`, and adding one is a contracts change with `en`/`bn` keys for an internal code.
  The narrower option is a local union of the same shape.
- **T17 lives in `queue/outbox-relay-store.int.test.ts`**, next to T8 as the design review asked,
  rather than in `queue/pg-boss-queue.int.test.ts` (the plan groups it with the queue module); it
  needs claimed events.
- **Two tests beyond § 11**: "a job sent without a retry setting takes its declaration" (BR3.8)
  and, in the worker, "a de-duplicated job is logged once the batch committed" and "every tick
  ensures the routed queues before it relays".
- **New helper file** `queue/queue-test-support.ts`, not in the plan's file table; inside the
  owned `queue/**` path.
- **Probe file name.** The ISS-201 and ISS-202 probes are in
  `queue/pg-boss-queue.validator.int.test.ts` (BR6.1); `validator-probes.int.test.ts` holds the
  T-005 and CR-006 probes and is unchanged.
- **`enqueue` with an executor skips the ensure** (above), a reading of WF4 step 1 under BR1.9.

## Notes for later Units

Every queue is `exclusive` by default. U8: every `mail.send` needs its own key, and a
transaction-bound `enqueue` needs `ensureQueue` first. U18: `stately` if `search.refresh`
coalesces by document. U29: a cron occurrence while the previous run is in flight is dropped.
Every handler stays idempotent. Recorded as ISS-253 for a C15 note or an FD entry.

## Issues

Closed in U4: ISS-144, ISS-185, ISS-201, ISS-202, ISS-203. Added (Found in U4 CR-011): ISS-248
(owned paths), ISS-249, ISS-250, ISS-251 (assumptions), ISS-252 (seed banner), ISS-253
(cross-Unit queue rules), ISS-254 (dead-event replay), ISS-255 (`EnqueueResult`), ISS-256 (pnpm
exec stdout), ISS-257 (pg-boss 12.37+ commit failure).
