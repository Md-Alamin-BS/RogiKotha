## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-27T23:04:01Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | packages/database/src/reset.ts > dropPublicSchema catch block | If the connection is already broken when the drop fails, the `ROLLBACK` in the catch throws first and hides the original lock-timeout or statement-timeout error that the Unit exists to surface. | Wrap the `ROLLBACK` so its failure is swallowed and the original error (or the named-blocker error) still reaches the caller. | New |
| R-02 | Minor | packages/database/src/global-setup.ts > setup, and reset.ts > SWEEP_SQL | The sweep ends every backend the connecting role may signal on `*_test`/`*_test_b`. If `DATABASE_URL_TEST` is ever a superuser or owner role, a second concurrent `pnpm test:int` or a dev worker on the same test database is killed silently, apart from one `console.warn`. The name guard holds (code check, URL check in global-setup, and the repeated `current_database() ~ '_test(_b)?$'` in SQL), so this is isolation, not safety. | Add one line to `unit-test-instructions.md` or the hand-off that one `pnpm test:int` at a time may use a test database. No code change needed. | New |
| R-03 | Minor | packages/database/src/reset-guard.int.test.ts > 'runReset under lock contention' | Every `pnpm test:int` now spends 10 s on purpose waiting for the lock timeout (about 22 s before, about 30 s after). It is correct, but the cost is permanent. | Accept and keep it (recorded in the hand-off), or later make the timeout injectable so the test can use a short value. | New |
| R-04 | Minor | docs/implementation/ISSUES.md > ISS-245, ISS-247 | Both deviations are justified. ISS-245: a sweep inside every `runReset` would kill the run's own `rk_app` pool during mid-run resets (ISS-202 probe and the contention test), and the `pg_has_role` filter avoids permission errors. The development `db:reset` and `demo:reset` path never sweeps, as required. ISS-247: the extra smoke file meets the team's rule that each Unit adds a smoke assertion. The task file said the sweep belongs "inside runReset", which is now an opt-in option. | The owner confirms both at the gate (both are already marked `founder`). No rework needed. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `timeout 300 pnpm test:int reset-guard` | PASS: 2 files, 8 tests (tests 10.18 s) | The new tests run green against the compose PostgreSQL, and the contention case takes the expected 10 s. |
| `git diff HEAD` against `source-manifest.json` | All 10 changed non-record paths match the manifest. The only path outside it is the untracked `aidlc/.aidlc-subagent-inflight`, which is framework scratch. | No unclaimed source change. |
| Identity grep over the `docs/` and `packages/` diff | No match for tool, model or agent identity | Clean. |

### Summary

The design is sound. The name guard is layered, `APP_MODE=production` is still refused, the development reset path has no sweep, `DROP SCHEMA IF EXISTS` is correct, and `lock_timeout` plus `statement_timeout` make a blocked drop fail fast with the blocker named. The regression tests can fail and clean up in `finally`. ISS-143 is closed with timing evidence: 10 runs between 28.25 and 30.28 s, plus a 13 s fail-fast run. ISS-244 to ISS-247 are well formed. Only minor points remain.
