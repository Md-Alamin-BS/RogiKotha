## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-28T06:58:36Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/261011-aidlc-adoption/construction/cr-011-queue-dedup-reset-and-quiet-env/functional-design/functional-spec.md > WF2, WF4, section 4.3 "Confirmed null" (BR3.6), rules BR1.5/BR1.6/BR1.9 | Only a `null` from `send` clears the "ensured" mark. pg-boss 12.31.0 refreshes its queue cache every 60 s (`manager.js` `onCacheQueues`, `queueCacheIntervalSeconds` default 60). Once the cache is refreshed, a missing queue row (a `db:reset` or `demo:reset` while the dev worker runs, BR4.6) makes `send` throw `Queue X does not exist` (`manager.js:503-512`) instead of returning `null`. The spec treats that as an ordinary event failure. The ensured mark stays set, so no tick re-creates the queue. The relay ticks every 2 s, so each affected event reaches attempt 5 in about 10 s and is then marked processed with no job (`dead`). A recoverable systemic fault therefore turns into permanent job loss, and the fix is a manual worker restart. | Treat a "queue does not exist" send error like the unconfirmed `null`: clear the ensured mark and re-ensure on the next tick. Better, make a failure that is not specific to one event (queue missing, connection or timeout error) fail the whole batch under BR1.8 instead of counting an attempt against every event. Add a test next to T4/T8 for the thrown path, not only the `null` path. | New |
| R-02 | Minor | functional-spec.md > section 9 (dotenv alternatives) | The spec rejects `DOTENV_CONFIG_QUIET` in `.env` because "the variable is read before the file is loaded". dotenv 17.4.2 re-reads it after populating (`lib/main.js:292-294`, comment "handle user settings DOTENV_CONFIG_ options inside .env file(s)"), so the stated reason is wrong. `quiet: true` is still the better choice because it does not depend on the file. The banner uses `console.log`, so T16 and W6 must watch `console.log`/stdout, not only `process.stdout.write`. | Correct the reason in section 9. Keep `quiet: true`. Make T16 and W6 spy on `console.log` and `process.stdout.write`, and confirm T16 fails when `quiet` is removed. | New |
| R-03 | Minor | functional-spec.md > section 7 (U18 `stately` note), section 4.2 | Binding cross-Unit constraints are written only in this Unit's folder. `exclusive` is the default for every queue; U18 must declare `stately` if it coalesces by document; U29 relies on `exclusive` dropping a cron occurrence (`null`); U8 must always pass a key. A later Unit that does not read this folder would get silent drops or collapsed key-less sends. FD-038 says "`singletonKey` stays" and does not name the queue policy. | Add a short FD entry, or a note in C15, that application queues are `exclusive` and that coalescing or multi-in-flight jobs must declare another policy. Section 15 already records the U29 check. | New |
| R-04 | Minor | functional-spec.md > WF2 step 5.5, BR1.6 | `dead` leaves the event with `processed_at` set and no job. It is distinguishable only by `attempts = 5` and a log line. There is no query or alert for operators, and a dead event can never be replayed. This is the T-009 behaviour kept as is, but the spec presents ISS-144 as closed. | State in the spec that `dead` is a deliberate drop kept from T-009. Record an `ISS-` row (S4) for a replay path or a dead-event view. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| pg-boss source check (`dist/plans.js:752`, `dist/manager.js:788-830`, `manager.js:1484`) | Pass | Unique index `job_i6` on `(name, COALESCE(singleton_key,''))` where `state <= active` and policy `exclusive`. State order is created, retry, active, so a retrying job still holds its key. `createJob` runs the insert on `options.db`; insert ends in `ON CONFLICT DO NOTHING`, so a duplicate returns `null` without aborting the transaction. Policy cannot be changed after creation, so the fail-closed check and the `pnpm db:reset` hint are sound. |
| pg-boss `send` and the transaction | Pass with a note | The only extra read is `getQueueCache`, which uses pg-boss's own pool. It is outside the relay transaction and cannot deadlock it. It is what produces the throw above. |
| Read-only DB query on dev database `rogikotha` | Pass | `pgboss` schema owned by `rk_app`, 0 queues. `db:reset` can drop it, and there is no policy mismatch to hit on the dev database. |
| dotenv 17.4.2 source | Pass | `quiet` is honoured; the banner goes to stdout through `console.log`. |
| Existing callers of `enqueue` and `send` | Pass | Callers are the validator probes, the T-009 int tests, the relay and fakes. None sends key-less twice and expects two jobs. |

### Summary

The design is sound and implementable. A transactional relay with a savepoint per event, `exclusive` queues from one declaration, and a one-transaction drop of `pgboss` with `public` hold up against the pg-boss 12.31.0 source and keep CR-007's guarantees. The two probes can flip without weakening. The one gap worth weighing before approval is the missing-queue path, where an unhandled thrown error can burn all five attempts in about 10 s and drop events silently. The owned-path extensions are justified, and no open point needs an FD entry beyond the Minor suggestion.
