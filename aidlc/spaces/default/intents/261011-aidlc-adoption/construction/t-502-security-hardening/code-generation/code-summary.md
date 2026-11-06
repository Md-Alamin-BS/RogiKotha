# Code summary — U41 `t-502-security-hardening`

Started at plan Step 1 on 2026-11-06. Branch `bolt/t-502-security-hardening`, cut from `main` at `94dc658` (U9, U11 and U46 merged). Worktree test database: `rogikotha_test_w8`. The reset guard in `packages/database/src/reset.ts` accepts `_test_w<n>`, so this name passes it. The plan's `rogikotha_wN_test` pattern was written before U11 widened the guard.

## Baseline (plan Step 1, 2026-11-06)

- Set-up: `.env` was copied from the main checkout with only the `DATABASE_URL_TEST` database name changed. `rogikotha_test_w8` was created on the compose PostgreSQL (port 5433). `pnpm install --frozen-lockfile` passed.
- Not run in this step: the whole-suite `pnpm build`, `pnpm check` and `pnpm smoke`. This is ASSUMPTION(U41): the orchestrator asked for unit-scoped tests only, because other builds share the machine. `main` at `94dc658` passed its merge-time gate (`pnpm check` green on `main`, recorded in the U46 code summary). Build and Test (Step 33) runs `pnpm check`, `pnpm smoke`, `pnpm test:int` and coverage on this branch, with nothing left out.
- Line coverage before any change: not measured in this step, for the same reason. Step 33 measures it for `apps/web`, `apps/worker`, `packages/application` and `packages/i18n` and records it beside the after figures. The floor is never lowered (D10).
- File counts (non-test `.ts`/`.tsx` under `src/`, then test files):

  | Package | Source files | Test files |
  |---|---|---|
  | `apps/web` | 192 | 122 |
  | `apps/worker` | 11 | 14 |
  | `packages/application` | 104 | 30 |
  | `packages/i18n` | 5 | 7 |

- Open `ISSUES.md` rows for web, auth, evidence and logging: there is no open `S1`, so the Unit is not stopped. Two open `S2` rows name T-502 as a backstop: `ISS-139` (a table-wide grant; owner T-304) and `ISS-141` (the audit-expiry flag can be set by any role; owner T-309). FD-105 narrowed T-502 to the security posture, and neither row is in U41's design (§ 10). U41 leaves both to their owners and records this at Step 38.
- U48 (`/api/evidence/upload`) is not on `main`: there is no `apps/web/src/app/api/evidence/` and no U48 code commit. Phase F (Steps 28–32) waits for it.
- U47 is rewriting `apps/web/src/server/actions/review.ts` in parallel, so U41 does not edit that file now. Its `console.error` at line 228 (Step 10) is routed after U47 merges, when this branch is rebased (see "Deferred" below).

## Dependency check (plan Step 2)

A dated entry was appended to `docs/status/dependency-check-log.md` (2026-11-06, U41). It records: `next` 16.3.4 kept (latest 16.4.5, with no proxy, CSP or body-limit advisory); `next-intl` 4.14.4 kept; `better-auth` 1.7.14 kept (latest 1.7.18 carries security patches, and a bump row is proposed). The docs confirm R-01, because `proxyClientMaxBodySize` truncates and never refuses. They confirm BR3.3, because Next.js lets a server action with no `Origin` through with only a warning. The docs do not say whether `allowedOrigins` is fixed at build time, so the Step 27(b) trial stays. No FD entry is needed before code beyond the FD-next row of design § 9.

## Test runner (plan Step 3)

Vitest 4.1.11 runs through `vitest.workspace.ts`; the projects are `web`, `worker`, `application`, `i18n` and `web-int`. Playwright is `apps/web/playwright.config.ts` (`e2e/smoke/demo.spec.ts`, `motion.spec.ts`). The unit-scoped commands in `unit-test-instructions.md` run as written. Counts before any change:

| Command | Files | Tests |
|---|---|---|
| `timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/proxy.test.ts apps/web/src/server/logger.test.ts` | 2 | 11 passed |
| `timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project worker apps/worker/src/logger.test.ts apps/worker/src/logger.levels.test.ts apps/worker/src/env.load.test.ts` | 3 | 19 passed |

## Inventory (plan Step 4, WF6 step 2, R-02, risk R10)

Run on the branch at `94dc658`, excluding test files, `e2e/` and `scripts/`.

### (a) Logger calls and their field names

Web and application callers use the closed `LogFields` port (`packages/application/src/ports/logger.ts`). The worker and `packages/database/src/queue/pg-boss-queue.ts` use the worker's index-signature `LogFields`.

| Field | Where | Holds | Decision |
|---|---|---|---|
| `correlationId` | `actions/auth.ts:76`, `server/auth.ts:67`, `command.ts:227,250`, `register.ts:128,133`, `persona-for.ts:44` | id | allowlist (already in `LogFields`) |
| `accountId` | `change-password.ts:105`, `reset-password.ts:77`, `sign-in.ts:96,99`, `verify-email.ts:40` | id | allowlist (already in `LogFields`) |
| `deliveryId` | `send-email-delivery.ts:76,94,107` | id | allowlist (already in `LogFields`) |
| `command` | `actions/auth.ts:76`, `command.ts:227,250` | command name | allowlist (already in `LogFields`) |
| `messageKey` | `send-email-delivery.ts:76,94,107` | i18n key | allowlist (already in `LogFields`) |
| `status` | `send-email-delivery.ts:76,94,107` (`'failed'`, `'sent'`, `'queued'`) | code | allowlist (already in `LogFields`) |
| `errorCode` | `actions/account.ts:100` (an `Error` name), `actions/auth.ts:76`, `gateway.ts:85`, `register.ts:128`, `send-email-delivery.ts:76,107,123`, `outbox-relay.ts:146,154` | code | allowlist (already in `LogFields`) |
| `purpose` | `gateway.ts:85`, `instance.ts:75,196`, `container.ts:109` | code | allowlist (already in `LogFields`) |
| `attempts` | `persona-for.ts:44`, `send-email-delivery.ts:107`, `outbox-relay.ts:146,154` | number | allowlist (already in `LogFields`) |
| `jobId` | `pg-boss-queue.ts:252` | id | allowlist (already in `LogFields`) |
| `errorName` | design: `review.action_failed` (web, Step 10), `worker.crashed` (Step 9); today `main.ts:82` | code | add to `LogFields` at Step 5 (one optional property) |
| `job` | `mail-send.ts:20`, `outbox-relay.ts:146,154,164`, `main.ts:38`, `pg-boss-queue.ts:252` | job name | `WORKER_LOG_FIELD_NAMES` |
| `eventName`, `eventId` | `outbox-relay.ts:140` (`ids`) | code, id | `WORKER_LOG_FIELD_NAMES` |
| `queues`, `outboxPending` | `health.ts:18` | number | `WORKER_LOG_FIELD_NAMES` |
| `mode` | `main.ts:123` (`APP_MODE`) | code | `WORKER_LOG_FIELD_NAMES` |
| `jobs` | `main.ts:123` (array of job names) | codes | `WORKER_LOG_FIELD_NAMES` |
| `signal` | `main.ts:133,138` | code | `WORKER_LOG_FIELD_NAMES` |
| `code`, `queue`, `expectedPolicy`, `actualPolicy`, `sqlState` | `main.ts:73,82` | code | `WORKER_LOG_FIELD_NAMES` |
| `fix` | `main.ts:78` (`'pnpm db:reset'`) | today free text with a space | `WORKER_LOG_FIELD_NAMES`; the value becomes `db.reset_required` at Step 9 (BR6.8) |
| `variables` | design: `worker.env_invalid` (Step 9) | variable names | `WORKER_LOG_FIELD_NAMES` |
| `message` | `main.ts:38` (`job.failed`), `health.ts:20` (`worker.heartbeat_failed`), `pg-boss-queue.ts:139` (`queue.error`), `pg-boss-queue.ts:252` (`job.failed`) | **free text** (`err.message`) | **`S1` row** against T-009 (worker skeleton, which wrote all four), proposed for Step 38. ASSUMPTION(U41): Step 8's worker test needs a `message` holding a path to be written as `[scrubbed]`, and design § 10 accepts "most error messages are written as `[scrubbed]`" as an S4. So `message` stays in `WORKER_LOG_FIELD_NAMES` with BR6.2 value scrubbing, and the S1 row is closed as "fixed in U41" when Step 8 lands. The narrower choice would drop the key, which would make Step 8 unrunnable. |

No web or application caller logs a free-text field. Every web field Step 4 found is already in `LogFields` except `errorName`.

### (b) Direct console calls

| Call | Holds | Plan step / owner |
|---|---|---|
| `apps/web/src/server/logger.ts:49,50` (and its `stdout.write`) | the logger's own writer | `no-console` file exception (Step 11) |
| `apps/worker/src/logger.ts:34` | the logger's own writer | `no-console` file exception (Step 11) |
| `apps/worker/src/main.ts:155` `console.error(err)` | whole error with stack | Step 9 → `worker.crashed {errorName}` |
| `apps/worker/src/env.ts:72` | fixed sentence | Step 9 → `worker.env_invalid {code: 'database_url_worker_required'}` |
| `apps/worker/src/env.ts:80` | zod issue text (can quote the received value) | Step 9 → `worker.env_invalid {code: 'env_invalid', variables}` |
| `packages/i18n/src/request.ts:32` `console.error(error)` | next-intl error with message | Step 10 → `onIntlError(code)` → `i18n.message_error {errorCode}` |
| `apps/web/src/server/actions/review.ts:228` | action name and error name | Step 10 → `review.action_failed {command, errorName}`, **deferred until U47 merges** (U47 is rewriting this file) |
| `apps/web/src/server/actions/evidence.ts:158` | `evidenceId`, error name | demo upload action, which U48 removes; if any call is left after the rebase, Step 28 routes it (`errorName` and an id only) |
| `apps/web/src/server/actions/evidence.ts:225` | error name | as above |
| `packages/database/src/migrate.ts:47` | command-line tool error | `no-console` file exception (Step 11) |
| `packages/database/src/reset.ts:171,205` | command-line tool warning and error | `no-console` file exception (Step 11) |
| `packages/test-support/src/seed/seed.ts:122,126` | step names and counts; `console.error(err)` on failure | **not in the plan's list.** ASSUMPTION(U41): seed is a dev-only command-line tool beside `migrate.ts` and `reset.ts` and prints synthetic counts only. Step 11 adds a fifth file-level `no-console` exception for it, with its reason, rather than routing it through a logger (`test-support` has none). This needs the owner's check at Step 11; the alternative is an `ISS-` row against T-007. |

## Deferred

- `apps/web/src/server/actions/review.ts:228` (Step 10): U47 owns that file and is rewriting it now. U41 routes the call after U47 merges and this branch is rebased. Until then, Step 11's `no-console` rule must leave that line alone. It takes a temporary inline `eslint-disable-next-line no-console -- U41 routes this after U47 merges` only if lint runs before the rebase, and that disable is removed at the rebase.

## Proposed `ISS-` rows (numbered at Step 38, at merge)

- `S1` worker/logging — free-text `message` (`err.message`) in four worker log calls (`main.ts:38`, `health.ts:20`, `pg-boss-queue.ts:139,252`); found in U41, owner T-009; to be fixed in U41 by the BR6.2 value scrub (Step 8).
- `S3` auth/dependencies — `better-auth` 1.7.14 is four security patches behind 1.7.18 (session revocation through the cookie cache, email links bound to the issuing account, OTP guessing, wildcard `trustedOrigins`); a separate bump task, owner's decision.
- `S4` logging/lint — `packages/test-support/src/seed/seed.ts` writes to the console and was not in the design's inventory; ASSUMPTION(U41) above.
