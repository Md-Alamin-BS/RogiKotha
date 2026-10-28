# CR-011 — Queue de-duplication, pg-boss reset and quiet dotenv (T-009 follow-ups)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — worker composition (ADR-0007); closes T-009's validation follow-ups |
| Phase / Lane | 0–1 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor |
| Effort setting | high |
| Estimate | 1.5–2.5 h agent; validation 0.5–1 h |
| Depends on | T-009 (merged) |
| Parallel-safe with | anything not editing `packages/database/src/queue/`, `packages/database/src/reset.ts`, `apps/worker/src/` or the two `env.ts` files; **not** with CR-009 (it rewrites every import in `packages/database/src`) |
| Due | before the first real job handler lands (T-101 / T-205), at the latest the Phase 1 gate |
| Status | **needs queueing** — `ISS-201` needs the design choice below; the other two are mechanical |

## Why this exists

T-009's validation (`docs/validation/T-009.md`, PASS WITH FOLLOW-UP) found three defects in merged
code. None harms the demo today, because no real handler consumes a job yet; all three bite as soon
as one does.

- **`ISS-201` (S2)** — task step 7 asked for a `singletonKey` "so a relay retry cannot enqueue
  twice". pg-boss 12.31.0 enforces `singleton_key` uniqueness only under the `short`, `singleton`,
  `stately`, `exclusive` or `key_strict_fifo` queue policies, or with `singletonSeconds`
  (`pg-boss/dist/plans.js:713-755`). `PgBossQueue.ensureQueue`
  (`packages/database/src/queue/pg-boss-queue.ts:99`) creates every queue with the default
  `standard` policy, so a relayed event that is reset to unprocessed while its job is still
  `created` produces **two** jobs with the same key (proven live; probe
  `pg-boss-queue.validator.int.test.ts` "ISS-201: …", marked `it.fails`). The comment at
  `apps/worker/src/handlers/outbox-relay.ts:115-116` ("never a duplicate job") is false, and the unit
  test at `outbox-relay.test.ts:162` only checks the key string against a fake queue.
- **`ISS-202` (S3)** — `packages/database/src/reset.ts:18` drops and recreates `public` only. The
  `pgboss` schema, with every queued job, survives `db:reset` and `demo:reset` (probe "ISS-202: …",
  marked `it.fails`). Once `mail.send` or `notification.deliver` exist, jobs queued before a reset
  would run against the reseeded demo.
- **`ISS-203` (S4)** — `apps/worker/src/env.ts:17` and `packages/database/src/env.ts:12` call
  dotenv's `config({ path })` without `quiet: true`, so the worker's first stdout line is dotenv's
  banner, not JSON (`01-conventions.md` §11).

## Read first

`docs/validation/T-009.md`, `docs/implementation/handoffs/T-009.md`, `ISSUES.md` rows `ISS-201`..
`ISS-203`, `02-data-model.md` §5 (outbox) and §16 (roles), `01-conventions.md` §11, the pg-boss
12.31 documentation for queue policies and `send` options (re-verify on the web; the pin's
dependency-check entry is older than 3 days).

## Owned paths

- `packages/database/src/queue/**`
- `packages/database/src/reset.ts`, `packages/database/src/env.ts`
- `apps/worker/src/**`

## Not in scope

Real job handlers (T-101, T-205, …); changing the pg-boss version; anything in `packages/database`
outside the paths above.

## Design choice for `ISS-201` (decide before coding; record it as an `ASSUMPTION` if no ruling)

1. **Deduplicating queue policy** — create relay-fed queues with a policy that enforces
   `singleton_key` (`stately` or `short`). Check what each policy does to sends *without* a key:
   `exclusive`/`short` collapse key-less sends to one per queue, which is wrong for `mail.send`.
2. **`singletonSeconds`** — keep `standard` and add a de-dup window on relay sends. Simple, but a
   retry later than the window still duplicates.
3. **Transactional relay** — enqueue in the same database transaction that sets `processed_at`
   (if pg-boss 12.31's `send` accepts a caller-supplied executor — verify before relying on it), so
   the window that produces a duplicate does not exist.

Recommended: **3 if the executor option is confirmed, else 1**, with handlers still written to be
idempotent (cheap insurance, already the convention for `search.refresh`).

## Steps

1. Implement the chosen `ISS-201` fix; correct the comment at `outbox-relay.ts:115-116`.
2. Add `DROP SCHEMA IF EXISTS pgboss CASCADE` beside the existing cleanup in `reset.ts`;
   `installPgBoss` (via `runMigrate`) and `0006_pgboss_grants.sql` already recreate and re-grant it.
3. Pass `quiet: true` to both dotenv `config()` calls.
4. Flip the two validator probes in `pg-boss-queue.validator.int.test.ts` from `it.fails` to `it`.
5. Add one smoke assertion for the de-dup behaviour.

## Acceptance checks

| # | Check | Expected |
|---|---|---|
| 1 | Validator probe "ISS-201: …" as a normal `it` | green: exactly 1 job per `singleton_key` after a re-relay |
| 2 | Validator probe "ISS-202: …" as a normal `it` | green: 0 `pgboss.job` rows after `runReset` + migrate |
| 3 | `pnpm --filter @rogikotha/worker dev` (or `start`) first stdout line | a JSON object, no dotenv banner |
| 4 | Relay of a key-less job kind (if any exists) | not collapsed by the chosen policy |
| 5 | `pnpm check`, `pnpm smoke`, `pnpm test:int` | green; no assertion removed |

## Hard-rule checklist

- [ ] `rk_worker` gains no new privilege (`02-data-model.md` §16)
- [ ] No private data in logs (`01-conventions.md` §11)
- [ ] No tool or model identity in code, comments, commits

## Hand-off (implementer fills in)

Done for Code Generation (AI-DLC Unit U4); the AI-DLC review and Build and Test still run.
Full record: `docs/implementation/handoffs/CR-011.md` and
`aidlc/spaces/default/intents/261011-aidlc-adoption/construction/cr-011-queue-dedup-reset-and-quiet-env/code-generation/code-summary.md`.

**Design choice for `ISS-201`.** Option 3 (transactional relay, FD-038) with option 1 on top:
pg-boss 12.31.0's `send(..., { db })` is confirmed, and every queue is created `exclusive` from
one declaration (`queue/queue-declaration.ts`), so the key de-duplicates for every producer and
the ISS-201 probe passes unchanged. Key-less sends collapse to one in flight under `exclusive`;
no relayed job is key-less (acceptance check 4), and `mail.send` must pass a key (`ISS-253`).

**What changed.**
- `packages/database/src/queue/outbox-relay-store.ts` (new): one transaction per tick, claim
  without marking, `send(..., { db })` on the same connection, a savepoint per event, mark
  processed or record the attempt (dead at 5), outcomes returned after `COMMIT`. A missing
  queue rolls back the whole batch (design review R-01).
- `queue/pg-boss-queue.ts`: `ensureQueue` creates from the declaration and fails closed on a
  stored policy mismatch; `enqueue` takes an optional `executor`, uses the declaration's retry
  defaults (5, `evidence.process` 3) and confirms every `null` before reporting `deduplicated`.
- `repositories/outbox.ts`: `claimUnprocessed`, `markProcessed`, `recordFailedAttempt`,
  `markDead` on the caller's connection; the at-most-once `claimBatch` and `markFailed` are gone
  (`ISS-248` for the owned-path extension).
- `apps/worker/src/`: `planEvent` (key `<job>:<eventId>`, envelope `{eventId, name, payload}`),
  `decideFailure`, `logOutcomes`; `relayOnce` ensures the routed queues and logs after commit;
  `main.ts` ensures every routed queue at start and exits 1 on failure. The comment that said
  "never a duplicate job" is replaced by the mechanism (FD-038, `exclusive`).
- `reset.ts`: drops `pgboss` and `public` in one transaction under CR-007's limits; the blocker
  lookup covers both schemas.
- Both `env.ts` files: `quiet: true`.
- The two validator probes are plain `it` tests with their bodies unchanged; new smoke
  assertion `queue/pg-boss-queue.smoke.test.ts`.

**Acceptance.**

| # | Check | Expected | Observed |
|---|---|---|---|
| 1 | Probe "ISS-201: …" as a normal `it` | 1 job per `singleton_key` after a re-relay | green; T7 re-relays an event whose job is still queued and keeps 1 job |
| 2 | Probe "ISS-202: …" as a normal `it` | 0 `pgboss.job` rows after `runReset` + migrate | green; T15: `rk_worker` can create a queue and send after a reset, cannot create a table |
| 3 | Worker's first stdout line | a JSON object, no dotenv banner | `timeout 30 pnpm --filter @rogikotha/worker exec tsx src/main.ts`: first line `{"mode":"development",…,"event":"worker.started"}`, parses as JSON |
| 4 | Relay of a key-less job kind | not collapsed | no relayed job is key-less (W2); distinct keys give distinct jobs (T3, T6) |
| 5 | `pnpm check`, `pnpm smoke`, `pnpm test:int` | green; no assertion removed | exit 0: check 53 files, 277 passed + 2 expected-fail; smoke 11 files / 18; test:int 15 files, 85 passed + 2 expected-fail |

**Hard-rule checklist.** `rk_worker` gains no privilege (no migration or grant changed; T15 and
the probe still deny `CREATE` in `pgboss`). Relay and start-up log lines carry ids, names,
counts and codes only (W4). No tool or model identity anywhere.

**Not done / follow-ups.** `06-change-requests.md` still shows CR-011 as queued (not in this
Unit's plan). Open rows: `ISS-249`–`ISS-257`.
