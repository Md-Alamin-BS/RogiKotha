# CR-007 — Make `pnpm test:int` deterministic (reset once per project, fail fast on lock contention)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — architecture-enforced foundation (the gate must be trustworthy) |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 1–2 h agent |
| Depends on | T-004 (owns `test-setup.ts`), T-005 (merged — it tripled the file count that causes this) |
| Parallel-safe with | anything not editing `packages/database/src/test-setup.ts` or `packages/database/vitest.config.ts`; **not** parallel-safe with another task running `pnpm test:int` against the same database |
| Status | **needs queueing** — no founder decision required, but the fix is a design choice, not mechanical, so it gets its own session |

## Why this exists

`ISS-143` (S3, found by T-005's validator). `pnpm test:int` is intermittently non-deterministic.
During T-005's validation the suite was run **eight** times. Seven were green — including one from a
manual destructive `DROP SCHEMA public CASCADE`, which re-confirms that the reset/migration path
itself is idempotent (`ISS-092`'s fix holds). Run 2 of 8 did this instead:

```
Test Files  1 failed, 5 passed (6)
     Tests  26 passed, 1 skipped (27)
  Duration  2641.53s
```

— a **44-minute hang**, stack pointing at `packages/database/src/test-setup.ts:18-23`:

```ts
reset ??= runReset(url);
await reset;
```

The 60 s `beforeAll` timeout never fired, so the gate did not fail fast; it simply stopped.

## Root cause (established, not guessed)

Two facts combine:

1. **The reset runs per test file, not per project.** Vitest isolates module state per file, so
   `test-setup.ts`'s module-level `reset` promise is re-created in every file's worker. Each file
   therefore performs a full `DROP SCHEMA public CASCADE` plus the whole six-migration cycle.
   `fileParallelism: false` serialises them, so this is correctness-safe but repeated N times.
2. **`DROP SCHEMA` has no lock timeout.** A `pg_stat_activity` sample taken during a *healthy* run
   caught a backend sitting `idle in transaction` holding `CREATE TABLE "audit_events"`.
   `DROP SCHEMA public CASCADE` queues behind such a backend **indefinitely**.

T-005 took this project from 2 collected int-test files to 6 (7 including the validator's probe
file), roughly tripling the exposure. It will keep growing: T-007, T-009 and every Phase 2+ module
task adds int tests. A one-in-eight, 44-minute, silent hang in the gate every session is not
survivable for the rest of the build.

## Suggested fix (the implementer may propose better, but must say why)

- Move the reset to a Vitest **`globalSetup`** for the `database` project so the drop + migrate cycle
  runs **once per `pnpm test:int` invocation** instead of once per file. Test files then only open
  their pool. Keep `fileParallelism: false` unless the implementer proves per-file isolation is no
  longer needed.
- Inside `runReset`, `SET lock_timeout = '10s'` (and `statement_timeout` for the drop) so a blocked
  drop **fails loudly in seconds** instead of hanging. A failed gate that says "could not acquire
  lock on schema public" is strictly better than one that stops for 44 minutes.
- Before the drop, sweep stale backends on the test database:
  `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid()`.
  Guard it so it can only ever run against a database whose name ends in `_test` / `_test_b` — never
  against `rogikotha`.
- Verify the `beforeAll` timeout actually fires when the underlying query blocks (it did not here);
  if Vitest cannot interrupt a blocked `pg` query, the driver-level timeout above is the real
  safeguard and the test-level one is decoration — say so in the hand-off.

## Read first

1. `packages/database/src/test-setup.ts` and `packages/database/src/reset.ts`
2. `packages/database/vitest.config.ts` (the `fileParallelism: false` comment explains the original constraint)
3. `docs/validation/T-005.md` — the `ISS-143` finding, the eight-run evidence and the `pg_stat_activity` sample
4. `docs/validation/T-004.md` and `ISS-092` — why the reset path looks the way it does; do not regress its idempotency
5. `docs/implementation/01-conventions.md` §13 (testing conventions)

## Owned paths

- `packages/database/src/test-setup.ts`
- `packages/database/src/reset.ts`
- `packages/database/vitest.config.ts`
- `packages/database/src/*.int.test.ts` — only if the setup contract changes; new files freely

## Steps

1. Reproduce the contention deliberately: open a psql session, `BEGIN; CREATE TABLE x(...);` and
   leave it idle, then run `pnpm test:int` and confirm the current code hangs. This is the
   regression test's scenario — a passing suite missed this bug, which is the signal to strengthen
   the test, not only the code (`04-handoff-and-validation.md` §4.1).
2. Implement the fix above (or a better one, justified in the hand-off).
3. Re-run the deliberate-contention scenario and confirm the run now **fails within ~15 s** with a
   lock-timeout error naming the blocker.
4. Run `pnpm test:int` **at least 10 times** back to back and record every duration. Include one run
   started from a manual `DROP SCHEMA public CASCADE` to re-prove `ISS-092` idempotency.
5. Confirm the two `it.fails` tripwires in `validator-probes.int.test.ts` still behave as expected
   (they must stay expected-fail while `ISS-139`/`ISS-141` are open).
6. Close `ISS-143` as `fixed in CR-007` with the timing evidence.

## Acceptance checks

| Check | Expected |
|---|---|
| `pnpm test:int` run 10× consecutively | 10/10 exit 0; **no run longer than ~2× the median** |
| Deliberate `idle in transaction` blocker held during a run | run fails in ≲ 15 s with a lock-timeout error naming the blocking backend — never hangs |
| Number of `DROP SCHEMA` cycles per `pnpm test:int` | 1 (was: one per collected test file) |
| Run started from a manual `DROP SCHEMA public CASCADE` | green — `ISS-092` idempotency preserved |
| The backend sweep pointed at `rogikotha` (non-test) | refuses to run |
| `pnpm check`, `pnpm smoke` | exit 0, no assertion removed |

## Hand-off

_(filled by the implementer)_
