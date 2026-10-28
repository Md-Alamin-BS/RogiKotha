# Functional Design — questions (U4 `cr-011-queue-dedup-reset-and-quiet-env`)

Context:
- Unit U4 (kind `library`, size M, not high risk) delivers CR-011 (`docs/implementation/tasks/CR-011-queue-dedup-reset-and-quiet-env.md`) for story US1.1 (NFR9, NFR10, NFR11). Units Generation gave it more than the task file names: "Transactional outbox relay (FD-038) and queue follow-ups ISS-144, ISS-185, ISS-201..203" (`unit-of-work.md`, U4). Inputs read: `unit-of-work.md` (U4), `unit-of-work-story-map.md` (US1.1 → U2, U3, U4, U5, U43, U44), `requirements.md` (NFR9–NFR11), `components.md` (Notification: "relay outbox rows to durable jobs transactionally"; "singletonKey idempotency") and `contract-summary.md` (common rules, C11's `moderation.openRepetitionCase`, C15 and the contract ownership rules).
- Code read as it is on `main` (after CR-006, CR-007, CR-009): `packages/database/src/queue/` (all four files), `reset.ts`, `migrate.ts`, `global-setup.ts`, `test-setup.ts`, `reset-guard.int.test.ts`, `env.ts`, `client.ts`, `repositories/outbox.ts`, `outbox.int.test.ts`, `migrations/0006_pgboss_grants.sql`, `vitest.config.ts`; `apps/worker/src/` (all files) and `apps/worker/vitest.config.ts`; `packages/test-support/src/seed/seed.ts`.
- pg-boss 12.31.0 read in `node_modules` (`dist/plans.js` queue indexes `job_i1`–`job_i8`, `create_queue`, `insertJobs`; `dist/manager.js` `createJob`, `createQueue`, `updateQueue`; `dist/timekeeper.js` cron sends; `dist/types.d.ts` `QueuePolicy`, `SendOptions`, `ConnectionOptions`). dotenv 17.4.2 read in `node_modules` (`quiet` option).
- Live checks on 2026-10-28 against `rogikotha_test` as `rk_worker` (a scratch queue, deleted afterwards): `functional-spec.md` § 2.

## Settled before this stage

These are decided by FD entries, the task file or the contracts, and are not asked again.

- **The relay is transactional (FD-038).** It enqueues with pg-boss `send(..., { db })` inside the same transaction that sets `processed_at`; `singletonKey` stays; handlers stay idempotent. The live check in `functional-spec.md` § 2 confirms the pinned version supports it.
- **Jobs retry 5 times with exponential backoff; `evidence.process` keeps 3 (FD-076, C15 common rules).** Question 5 only asks which Unit applies the number.
- **Every module appends outbox events in the same transaction as its change; Notification owns `outbox_events` (FD-065).** The relay itself is owned by U4; the job envelope and the notification routes by U34; each publisher owns its event's payload; each Unit edits only the relay routes for the jobs it builds (C15 ownership rules).
- **`db:reset` and `demo:reset` also clear the `pgboss` schema (CR-011 step 2, ISS-202).** CR-007's guarantees (FD-043, ISS-143, ISS-244) stay: `lock_timeout` 10 s, `statement_timeout` 60 s on the drop, a blocked drop that names the blocking backend, `DROP SCHEMA IF EXISTS`, the guarded sweep on `_test`/`_test_b` databases only, and the refusal under `APP_MODE=production`.
- **dotenv loads with `quiet: true` in both env files (CR-011 step 3, ISS-203).**
- **No pg-boss version change, no real job handler, no new worker privilege** (CR-011 "Not in scope" and hard-rule checklist; `02-data-model.md` §16 as reviewed by CR-006, FD-041, FD-092).
- **The two validator probes become plain `it` tests** (CR-011 step 4); their bodies are not weakened (the probe file's own header).

## Settled in this design without a question

These follow from the FD entries, the contracts or the code. Each is explained in `functional-spec.md`.

- **One transaction per relay tick, with a savepoint per event** (§ 5 WF2). A failed job insert would otherwise abort the whole batch; the savepoint undoes only that event's inserts and records its attempt in the same transaction.
- **The relay transaction is short and bounded**: claim with `FOR UPDATE SKIP LOCKED`, a 5 s statement timeout and a 10 s idle-in-transaction timeout, no I/O inside it except its own SQL, and every routed queue ensured before it opens (§ 5 WF2, BR1.9). This answers ISS-185's concern about holding a transaction across `send()`: with `{ db }` the send is one more SQL statement on the same connection.
- **A `null` from `send()` is confirmed before it counts as de-duplicated** (BR3.6). pg-boss returns `null` both when a policy drops a duplicate and when the queue row is missing (its insert joins `pgboss.queue` and ends in `ON CONFLICT DO NOTHING`); without the check a relay that outlived a reset would mark events processed with no job.
- **Outcome logs are written only after the commit** (BR1.11), so a log line never reports a change that rolled back.
- **Dead events stay as they are stored today**: `processed_at` set and `attempts` at the limit, with the `outbox.dead` log. No column is added, so no schema or data-boundary change.
- **The relay routes are not changed by this Unit** (BR2.5). The differences between `RELAY` and C15 belong to U8, U25, U32, U34 and U39.
- **The relay's database mechanism lives in `packages/database`; its decisions stay in the worker** (§ 10). The worker may not run SQL (ISS-205), and the worker's Vitest project collects no `*.int.test.ts`, so the real-database tests live in the `database` project.
- **The reset drops `pgboss` and `public` in one transaction** (BR4.1). Dropping only `pgboss` would leave `0006_pgboss_grants.sql` recorded as applied and `rk_worker` without access after the reinstall.
- **Tests of the Unit's own sources sit where those sources' tests already are**: one added case in `reset-guard.int.test.ts` (CR-007's tests of `reset.ts`) and a new `env.int.test.ts` for `env.ts`. They are listed with the Question 2 extension in one `ISS-` row (BR7.1).

## Question 1

Which **queue policy** do the queues get, on top of FD-038's transactional relay?

Why this is open: FD-038 removes the relay's own duplicate window, but it does not decide the queue policy, and two of CR-011's checks depend on it. Acceptance check 1 flips the ISS-201 probe to a plain `it`; that probe calls `PgBossQueue.enqueue` twice with the same key while the first job is queued and expects one job. Under today's `standard` policy it stays at two jobs whatever the relay does. `PgBossQueue`'s own `EnqueueOptions.key` comment and C15 ("jobs are idempotent by `singletonKey`") also promise key de-duplication. pg-boss 12.31.0 enforces a key only through a policy's unique index (checked live, `functional-spec.md` § 2 and § 4): `short` (one queued job per key), `stately` (one per key in each of queued, retry and active), `exclusive` (one queued, retry or active job per key), or `singletonSeconds` (one per key per time slot). Every policy treats a send without a key as the empty key, so it collapses key-less sends, and a queue's policy cannot be changed after the queue is created.

A. **`exclusive` for every application queue, by one declaration in `packages/database/src/queue/`** (recommended). At most one queued, retrying or active job per key. A second send returns "de-duplicated" and is not an error. With FD-038 the relay cannot create a duplicate, and the queue now also stops one from any other producer (a web-tier retry of `mail.send`, a manual reset of `processed_at`). The ISS-201 probe passes as written. Key-less sends (only pg-boss's cron sends, for `retention.expire`) are limited to one in flight, which is the non-overlap an hourly sweep wants. A job that coalesces by entity can take `stately` in the same declaration (its owner records it). Cost: a policy check on queues created earlier (Question 3), and handlers stay idempotent, because a same-key job can run again after the first completes.
B. **FD-038 only; keep `standard`.** The fewest changes. But the ISS-201 probe cannot pass, so it would have to be rewritten to test the relay instead of the queue. That conflicts with the probe file's rule not to weaken a probe and with acceptance check 1 as written, and the key promise stays false for every producer other than the relay.
C. **`stately` for every queue.** Also passes the probe, and keeps a queued job possible while one with the same key is active, which suits coalescing keys. For per-event keys it is weaker: a retry may conflict with another job in the retry state and drop it to failed (pg-boss notes this), and it allows a second job beside the active one.
D. **`singletonSeconds` on relay sends.** Rejected in CR-011 already: slots are fixed buckets, so two sends a second apart across a slot boundary still duplicate, and the slot also blocks a legitimate later job.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

The transactional relay needs the outbox claim to **stop marking rows processed at claim time** (ISS-144, ISS-185). That code is `packages/database/src/repositories/outbox.ts`, with its tests in `packages/database/src/outbox.int.test.ts`, and neither is in CR-011's literal owned paths. How is that handled?

Why this is open: `unit-of-work.md` gives U4 ISS-144 and ISS-185 and the transactional relay, but CR-011's owned paths list only `queue/**`, `reset.ts`, `env.ts` and `apps/worker/src/**`, and its "Not in scope" excludes the rest of `packages/database`. `PgOutbox.claimBatch` sets `processed_at` inside its own claiming transaction, so it cannot be part of a relay transaction as it stands, and `outbox.int.test.ts` asserts that behaviour on purpose.

A. **Extend the owned paths to those two files, record it as an ISS row** (recommended), as T-009 did for `migrate.ts` (ISS-190). The repository gets transaction-scoped operations (claim without marking, mark processed, record a failed attempt, mark dead) and loses the at-most-once `claimBatch`; the two outbox tests are rewritten to the new behaviour with the reason recorded. One outbox access path remains, and ISS-144 and ISS-185 close.
B. **Leave the repository alone and write the relay's own outbox SQL in `packages/database/src/queue/`.** Inside the literal owned paths, but the package then has two ways to claim outbox rows, the old at-most-once one stays exported for any later caller, and ISS-144 stays open on a method nothing should use.
C. **Leave ISS-144 and ISS-185 out of this Unit.** FD-038 cannot then be built as decided, because the claim commits before any job is enqueued.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

What happens when a queue **already exists with a different policy** than the declaration (for example a `standard` queue created by T-009 on a database that was not reset)?

Why this is open: pg-boss's `createQueue` ends in `ON CONFLICT DO NOTHING`, so re-creating a queue with another policy silently keeps the old one (checked live), and `updateQueue` refuses a policy change. On 2026-10-28 the development database `rogikotha` held no queues and `rogikotha_test` held only test queues from earlier runs, which the reset in this Unit removes. So no live database needs a migration today, but a forgotten old queue would make the key promise silently false for that queue.

A. **Fail closed** (recommended). `ensureQueue` reads the existing queue's policy. On a mismatch the worker (or the web process) refuses to start with one message naming the queue, the expected and the actual policy and the fix (`pnpm db:reset`, which now also clears `pgboss`). The demo is local only, so a one-command reset is a fair price for never running with a weaker policy than the code declares. pg-boss's own internal queues are not checked.
B. **Warn and continue.** The transactional relay still prevents relay duplicates, but the queue keeps the weaker behaviour without anyone having to act, and the warning scrolls past in the log.
C. **Delete and re-create the queue automatically.** Deleting a queue deletes its jobs; that is data loss as an automatic side effect, run as `rk_worker`.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

C15 fixes the job **key** as `<job>:<eventId>` and the job **payload** as the envelope `{eventId, name, payload}`. The relay on `main` sends the key `<eventId>:<job>` and the bare event payload. Does this Unit align them?

Why this is open: the relay is U4's (C15 ownership rules), so the key it builds is this Unit's to fix; the envelope is U34's to define. No handler consumes any relayed job yet, so nothing breaks today. The first handlers (U18 `search.refresh`, U24 `evidence.process`, U32 `moderation.openRepetitionCase`) are written against C15; C11 already shows `moderation.openRepetitionCase` taking the envelope.

A. **Align both now** (recommended). Key `<job>:<eventId>` (a route may name its own key, as C11's `repetition:<reviewId>` does; U32 adds that entry), and job data `{eventId, name, payload}` with the payload passed through unchanged. Handlers are then written against the contract from the start, and U34 adds the zod schema for the envelope in `packages/contracts` when it lands (outside this Unit's paths).
B. **Align the key only** and leave the envelope to U34. The first handler written before U34 would read the bare payload and break when U34 wraps it.
C. **Change neither.** The relay keeps disagreeing with C15 until another Unit fixes it.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

FD-076 settles **5 retries with backoff (3 for `evidence.process`)**. `PgBossQueue` on `main` sends every job with `retryLimit: 3`. Does this Unit apply FD-076?

Why this is open: the retry number is per job, and the relay enqueues `evidence.process` and every other routed job itself, so the number cannot be left to each handler's owner without the relay knowing it. The per-job settings fit in the same declaration as the policy (Question 1).

A. **Apply it now in the queue declaration** (recommended): 5 retries with exponential backoff by default, 3 for `evidence.process`; a caller's explicit value still wins. One small change in an owned file, and the queues match a decided contract before their handlers exist.
B. **Leave 3 everywhere** and let each owning Unit change its job. Every later owner has to remember FD-076, and the relay keeps sending 3 for jobs whose owner never touches the relay.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

None of the points above changes a hard rule, a data boundary or a worker grant, so no FD entry is needed before Code Generation. Findings outside this Unit's paths are proposed as `ISS-` rows in the stage report (for example the dotenv banner that `packages/test-support/src/seed/seed.ts` still prints).
