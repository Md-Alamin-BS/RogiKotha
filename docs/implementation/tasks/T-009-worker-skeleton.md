# T-009 — Worker skeleton (pg-boss, job registry, outbox relay, shutdown)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation (worker composition; ADR-0007) |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 1.5–2 h agent; validation 0.5 h |
| Depends on | T-004 (client), T-005 (`outbox_events`, `PgOutbox`) |
| Parallel-safe with | T-006, T-007, T-008, T-010 |

## Goal

Create `apps/worker` as a separately runnable Node process that connects to PostgreSQL as `rk_worker`, starts pg-boss, registers job handlers from a table, relays `outbox_events` into jobs every two seconds using the event→job map from the contracts doc, logs structured JSON, and shuts down cleanly. No business handlers yet — later tasks add files under `handlers/` and one line in the registry.

## Read first

1. `docs/implementation/03-routes-and-contracts.md` §5 (events and jobs — the relay map), §3 (`JobQueue`, `Outbox`, `Logger` ports)
2. `docs/implementation/01-conventions.md` §1 (worker layout), §2 (worker must not import Better Auth, identity reveal or deletion commands), §11 (logging, `DATABASE_URL_WORKER`)
3. `docs/implementation/02-data-model.md` §12 (`outbox_events`), §16 (worker grants)
4. `docs/architecture/ARCHITECTURE-SPINE.md` AD-6 (worker has no application session, reveal, delete or general credentials), AD-15
5. `packages/database/src/repositories/outbox.ts` and `client.ts` from T-004/T-005
6. pg-boss 12.x README: `new PgBoss({ connectionString })`, `boss.start()`, `boss.createQueue(name)` (required in v10+ before `send`/`work`), `boss.send(name, data, { singletonKey, retryLimit, retryDelay, retryBackoff, expireInSeconds })`, `boss.work(name, { batchSize, pollingIntervalSeconds }, handler)`, `boss.schedule(name, cron)`, `boss.stop({ graceful: true })`

## Owned paths

Create: `apps/worker/src/main.ts`, `apps/worker/src/container.ts`, `apps/worker/src/registry.ts`, `apps/worker/src/handlers/outbox-relay.ts`, `apps/worker/src/handlers/index.ts`, `apps/worker/src/logger.ts`, `apps/worker/src/env.ts`, `apps/worker/src/health.ts`, `apps/worker/src/*.test.ts`, `apps/worker/vitest.config.ts`, `packages/database/src/queue/pg-boss-queue.ts`, `packages/database/src/queue/index.ts`, `packages/database/src/queue/*.int.test.ts`
Modify: `apps/worker/package.json`, `apps/worker/tsconfig.json`, `packages/database/package.json` (add pg-boss), `packages/database/src/index.ts` (export queue)

## Not in scope

- Any real job handler (`evidence.process` T-304, `search.refresh` T-205, `notification.deliver`/`mail.send` T-405/T-101, `retention.expire` T-309, `data.*` T-410).
- The `JobQueue` port interface in `application` (T-101 creates `packages/application` scaffolding; until then `pg-boss-queue.ts` exports a class with the port's method shape and a `// TODO(T-101): implements JobQueue` marker).

## Steps

1. `pnpm --filter @rogikotha/database add pg-boss@^12.30.0`; `pnpm --filter @rogikotha/worker add -D tsx@^4`; worker `package.json` scripts: `dev: tsx watch src/main.ts`, `build: tsc -p tsconfig.build.json` (emit to `dist/`, `noEmit: false` — this app is run, not bundled), `start: node dist/main.js`, `typecheck`, `test`. Root `pnpm dev:worker` (T-001) now resolves.
2. `packages/database/src/queue/pg-boss-queue.ts`: `class PgBossQueue { constructor(connectionString, logger); start(); stop(); enqueue(name, payload, opts?) — maps to boss.send with singletonKey = opts.key, retryLimit default 3, retryDelay 10, retryBackoff true, expireInSeconds 300; work(name, handler, opts?) — wraps the handler so a thrown error is logged with { event: 'job.failed', job: name, jobId } and rethrown for pg-boss retry; schedule(name, cron) }`. Queues are created lazily: `ensureQueue(name)` calls `boss.createQueue(name)` once per process (pg-boss 10+ requires explicit queue creation — do not skip). pg-boss owns its `pgboss` schema; with `DATABASE_URL_WORKER` the `rk_worker` role must be allowed to create it — add to the hand-off that T-005's grants must include `GRANT CREATE ON DATABASE rogikotha TO rk_worker` (or run `boss.start()` once as `rk_app` during `db:migrate` — choose the migration path: add `packages/database/src/migrate.ts` step "pg-boss install" using `boss.start()` with `DATABASE_URL` then `stop()`, then grant `rk_worker` usage on schema `pgboss`; document in the hand-off which you did and add the SQL to a new custom migration `0007_pgboss_grants.sql` **in your owned paths — add it to Owned paths in the hand-off**).
3. `apps/worker/src/env.ts`: reads `DATABASE_URL_WORKER`, `APP_MODE`, `LOG_LEVEL`, `STORAGE_ROOT`, `CLAMD_HOST`, `CLAMD_PORT`, `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` with zod; **refuses** `DATABASE_URL` (the app role) — if `DATABASE_URL_WORKER` is missing, exit 1 with a clear message; never fall back to the app URL. Asserts `APP_MODE` ∈ development|demo|production.
4. `logger.ts`: minimal JSON logger (`{ ts, level, event, ...fields }` to stdout) implementing the `Logger` port shape; redacts any field named `email|token|body|filename|password` by replacing the value with `"[redacted]"` — a test proves it.
5. `container.ts`: builds `{ db, outbox: new PgOutbox(db), queue: new PgBossQueue(env.DATABASE_URL_WORKER, logger), logger, clock }`. **No** auth, identity, or data-request modules are imported here — add an ESLint boundary note (`// boundary: worker composition — see 01-conventions §2`) and a test that greps `apps/worker/src` for `better-auth|identity.reveal|dataRequest.delete` and expects no match (T-010 turns this into a lint rule).
6. `registry.ts`: `export const JOBS: Record<JobName, { handler: JobHandler; opts?: WorkOptions; cron?: string }>` seeded with only `outbox.relay` (cron-less; a self-rescheduling poller — see step 7) — later tasks add entries. `JobName` union: `'outbox.relay' | 'evidence.process' | 'search.refresh' | 'notification.deliver' | 'mail.send' | 'retention.expire' | 'data.export' | 'data.delete'` (from 03 §5). `main.ts` iterates the registry: `ensureQueue`, `work`, `schedule` where `cron` is set (`retention.expire` will be `'0 * * * *'`, added by T-309).
7. `handlers/outbox-relay.ts`: `RELAY: Record<string, JobName[]>` copied from the 03 §5 table (`'review.published': ['search.refresh','notification.deliver']`, `'evidence.received': ['evidence.process']`, …). Loop: every 2 s (`setInterval` guarded against overlap) `outbox.claimBatch(50)` → for each event, for each job in `RELAY[event.name]` → `queue.enqueue(job, event.payload, { key: `${event.id}:${job}` })` → `markProcessed`; unknown event names are logged `outbox.unmapped` and marked processed (never block the queue); failures increment `attempts` via `markFailed` and stop after 5 attempts with `outbox.dead`. Use the `singletonKey` so a relay retry cannot enqueue twice.
8. `health.ts`: writes `{ event: 'worker.heartbeat', queues: n, outboxPending: count }` every 60 s at `info`; T-504 may expose it. `main.ts`: start → log `worker.started { mode, jobs }` → handle `SIGINT`/`SIGTERM` (Windows: also `SIGBREAK` and `process.on('message', 'shutdown')` for `tsx watch`) → `queue.stop()` graceful with 10 s timeout → `pool.end()` → exit 0.
9. Tests: `logger.test.ts` (redaction); `outbox-relay.test.ts` with `ListOutbox`/`MemoryJobQueue` fakes from `test-support` — "maps review.published to search.refresh and notification.deliver", "unmapped events are marked processed and logged", "a failing enqueue marks the event failed and retries next tick", "singleton keys are stable across retries"; `pg-boss-queue.int.test.ts` (database project, needs compose) — "enqueue then work runs the handler once", "a thrown handler error is retried" (retryLimit 1, assert two invocations), "stop is graceful".
10. Manual: `pnpm infra:up && pnpm db:migrate && pnpm dev:worker` → logs `worker.started`; insert a row into `outbox_events` by psql (`insert into outbox_events(name,payload) values ('doctor.changed','{"id":"x"}')`) → within 2 s a `search.refresh` job appears in `pgboss.job`; Ctrl-C → `worker.stopped`. Commit: `T-009: worker skeleton with pg-boss queue and outbox relay`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Starts with worker role only | `DATABASE_URL_WORKER= pnpm dev:worker` | exits 1 with "DATABASE_URL_WORKER is required" |
| Starts | `pnpm dev:worker` | logs `worker.started` with `jobs: ["outbox.relay"]` |
| Relay | psql insert as above, then `psql … -c "select name, singletonkey from pgboss.job"` | one `search.refresh` row keyed `<eventId>:search.refresh`; `outbox_events.processed_at` set |
| Unmapped | insert `name='nonsense'` | log `outbox.unmapped`, row marked processed |
| Graceful stop | Ctrl-C | `worker.stopped` within 10 s, exit 0 |
| No forbidden imports | `grep -rnE "better-auth|identity\.reveal|dataRequest\.delete" apps/worker/src` | no matches |
| Redaction | `pnpm --filter @rogikotha/worker test -t redact` | passes |
| Integration | `pnpm test:int -t pg-boss` | green |
| Typecheck/lint | `pnpm typecheck && pnpm lint` | exit 0 |

## Tests to write

- `apps/worker/src/logger.test.ts`: "redacts email, token, body, filename and password fields".
- `apps/worker/src/handlers/outbox-relay.test.ts`: the four tests in step 9.
- `apps/worker/src/container.test.ts`: "worker source never imports auth, identity reveal or deletion commands".
- `packages/database/src/queue/pg-boss-queue.int.test.ts`: the three tests in step 9.

## Hard-rule checklist

- [x] Original evidence / private linkage never reaches the worker (connects as `rk_worker` only; refuses the app URL).
- [x] Logs carry opaque ids only (redaction tested).
- [x] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed

`apps/worker` is a real runnable process: `env.ts` (zod-validated, `DATABASE_URL_WORKER`-only,
refuses to start without it), `logger.ts` (`JsonLogger`, redacts `email|token|body|filename|password`
fields), `container.ts` (composition root — `db`, `PgOutbox`, an `outboxSource` adapter closing over
`db`, `PgBossQueue`, `logger`, a placeholder `SystemClock`), `registry.ts` (`JobName` union, `JOBS`
registry seeded with `outbox.relay`), `handlers/outbox-relay.ts` (`RELAY`/`OUTBOX_EVENTS` from
03-routes-and-contracts.md §5, `relayOnce` — claim, enqueue mapped jobs, mark processed, 5-attempt
dead-letter give-up), `health.ts` (60 s `worker.heartbeat`), `main.ts` (starts the queue, runs
`outbox.relay` on a 2 s `setInterval` poller guarded against overlap, handles
SIGINT/SIGTERM/SIGBREAK/`message:'shutdown'`, graceful `queue.stop()` + pool close). New
`packages/database/src/queue/pg-boss-queue.ts` (`PgBossQueue` — lazy `ensureQueue`, `enqueue`,
`work` wrapping a thrown handler error as `job.failed` + rethrow, `schedule`, `stop`) and
`installPgBoss` (installs/migrates the `pgboss` schema as `rk_app`).

**Beyond the literal "Owned paths" list, with the task's own explicit permission** (step 2's "add it
to Owned paths in the hand-off"): `packages/database/src/migrate.ts` now calls `installPgBoss(url)`
before the SQL migrations run, and a new `packages/database/src/migrations/0006_pgboss_grants.sql`
grants `rk_worker` USAGE + DML (+ default privileges for future pg-boss schema versions) on schema
`pgboss` — the Option B path from 02-data-model.md §16 note 2 ("the `pgboss` schema is created by
migration … run as `rk_app`, with USAGE/DML grants to `rk_worker`"), not the task's other listed
option (`GRANT CREATE ON DATABASE`). Also touched, one line each, for the same reason:
`packages/database/src/migrations.int.test.ts` (hardcoded migration count 6 → 7 — `ISS-194`) and
`packages/database/src/queue/pg-boss-queue.ts`'s sibling `.int.test.ts`.

`ISS-144`/`ISS-145` (the two rows this task explicitly owned): `ISS-145` fixed — `OUTBOX_EVENTS`
tuple + tests. `ISS-144` deferred, not fixed — see "Not done and why".

### Not done and why

- **`ISS-144` (at-most-once outbox delivery) not fixed.** The task offered a real choice here. A
  correct fix needs either a `claimed_at`/lease column on `outbox_events` (a schema change —
  `01-conventions.md` §15's stop-and-ask "data-model boundary" category, and `outbox.ts`'s table is
  owned by T-005, not this task) or holding a database transaction open across an async pg-boss
  `send()` call (unspecified timeout/retry behaviour, connection-pool-exhaustion risk for a single M1
  task to design from scratch). Both are bigger and riskier than this task's 1.5–2 h budget. Left
  `packages/database/src/repositories/outbox.ts` untouched; logged `ISS-185` explaining the reasoning
  so the next session does not have to re-derive it.
- **`build`/`start` compile but are not the supported way to run the worker yet.** `apps/worker`'s
  `tsc -p tsconfig.build.json` is green (needed for `pnpm check`'s `pnpm -r build`), but every
  workspace package's `package.json` "exports" still points at its own TS source, not a compiled
  `dist/` — so `node dist/main.js` in isolation cannot actually resolve `@rogikotha/database`'s own
  `.js`-suffixed-but-not-really relative imports (same gap `ISS-183`/`CR-009` already tracks for
  `apps/web`). `pnpm dev:worker` (`tsx watch`) is the verified, supported path; every acceptance check
  in this task's own table uses it. Logged as `ISS-193`.
- **`dataRequest.created` maps to both `data.export` and `data.delete`** in `RELAY` — §5 lists them as
  alternatives depending on the request's `kind`, but no payload shape or command layer exists yet
  (T-410) to branch on it. Harmless today (T-009 registers no handler for either). `ISS-188`.

### Questions for the human

None that block this task — every ambiguity encountered had a narrower, reversible reading available
(see the `ISS-` rows below) and this session took it rather than stopping. The one item worth a
founder glance when convenient: `ISS-144`'s deferral (above) — confirm the "due Phase 1 gate" owner
stays on the phase-gate timeline rather than needing to move earlier.

### Follow-ups

- `ISS-144` — fix at-most-once outbox delivery (lease column or held-transaction claim), before the
  Phase 1 gate.
- `ISS-187` — confirm the `setInterval`-poller reading of "self-rescheduling poller" is the intended
  design, or switch `outbox.relay` to a pg-boss-chained job if a future task needs multi-process
  workers (today's single-process assumption would otherwise double-relay).
- `ISS-193` / `CR-009` — worker `build`+`start` need every workspace package to ship compiled output
  (or a bundler) before `node dist/main.js` is truly standalone-runnable.
- `ISS-195` — widen `test-support`'s `ListOutbox` fake with `claimBatch`/`markProcessed`/`markFailed`
  so worker tests can reuse it instead of a local double.

### `pnpm check` output summary

```
pnpm typecheck   — 9/9 workspace projects, exit 0
pnpm lint        — 0 errors, 1 pre-existing warning (packages/i18n/src/routing.ts, not touched here)
pnpm test        — 42 files / 165 tests (163 passed, 2 expected-fail), all green
pnpm i18n:check  — 777 keys, both locales, parity OK
pnpm build       — apps/worker + apps/web, both green
```

`pnpm test:int -t pg-boss` — 1 file / 3 tests green (`enqueue then work runs the handler once`,
`a thrown handler error is retried`, `stop is graceful`), run against the compose PostgreSQL as
`rk_worker` with `migrate: false` — the same restricted-role path the real worker uses.

`pnpm smoke` — 8 files / 11 tests green (`apps/worker/src/worker.smoke.test.ts` is this task's new
assertion: a `review.published` outbox event relays to `search.refresh` + `notification.deliver`).

Manual verification (task step 10, both directions): `pnpm infra:up && pnpm db:migrate &&
pnpm dev:worker` logs `worker.started {"jobs":["outbox.relay"]}`; inserting
`outbox_events(name='doctor.changed', payload='{"id":"x"}')` produces a `search.refresh` row in
`pgboss.job` keyed `<eventId>:search.refresh` within 2 s, and `outbox_events.processed_at` is set;
inserting an unmapped `name` logs `outbox.unmapped` and is marked processed. Graceful shutdown was
verified via a `child_process.fork()` IPC `'shutdown'` message (see `ISS-`-free note: on this Windows
host, `kill`/`child.kill('SIGTERM')` from outside a real console does not reliably deliver the signal
to a native `node.exe` process — a known Windows/Node limitation, not a bug in the handler — so the
`message:'shutdown'` path, which the task explicitly asked for, was used to verify the shutdown logic
programmatically: `worker.stopping` → `worker.stopped` → exit 0, well inside the 10 s budget).

### Hard-rule evidence

- **Worker connects as `rk_worker` only; refuses `DATABASE_URL`.** `apps/worker/src/env.ts:32-34`
  (checks `DATABASE_URL_WORKER` before anything else, never reads `DATABASE_URL`); verified live —
  `DATABASE_URL_WORKER= pnpm dev:worker` exits 1 with "DATABASE_URL_WORKER is required (the worker
  never falls back to DATABASE_URL)". `packages/database/src/queue/pg-boss-queue.int.test.ts` runs
  every test through `workerUrlForTestDb()` (the `rk_worker` role) with `migrate: false`, proving the
  restricted role actually works end to end, not just that the app role would.
- **Logs carry opaque ids only; redaction tested.** `apps/worker/src/logger.ts` — `logger.test.ts`
  "redacts email, token, body, filename and password fields" and "a field named event, level or ts
  never overwrites the envelope" (`ISS-192` — a real bug found and fixed during manual verification:
  a field literally named `event` silently clobbered the log line's own event name).
  `container.test.ts` greps `apps/worker/src` for `better-auth`/`identity.reveal`/`dataRequest.delete`
  — no source-file matches (`ISS-196`: the literal grep matches `container.test.ts` itself, which must
  quote those strings to define the check).
- **No agent/tool attribution in any file or commit.** No AI/tool/model name appears in any file this
  task touched; commit author/committer and message verified with `git log -1
  --format='%an <%ae>%n%cn <%ce>%n%B'` before pushing (see `handoffs/T-009.md`).
