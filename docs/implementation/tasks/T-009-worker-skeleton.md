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

- [ ] Original evidence / private linkage never reaches the worker (connects as `rk_worker` only; refuses the app URL).
- [ ] Logs carry opaque ids only (redaction tested).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
