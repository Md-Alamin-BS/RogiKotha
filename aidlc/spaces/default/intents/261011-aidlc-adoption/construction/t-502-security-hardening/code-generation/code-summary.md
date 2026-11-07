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

## Steps 5–11 (2026-11-06)

- **Step 5:** `packages/application/src/ports/log-policy.ts` holds `LOG_FIELD_NAMES`, `scrubLogFields`, `scrubLogValue`, `logEventName`, `SCRUBBED` and `INVALID_EVENT`. Its only import is a type import of `LogFields`. The compile-time check is a `Record<keyof LogFields, true>`, so a missing or extra name fails to compile. `LogFields` gains `errorName` (Step 4). There is one export line each in `index.ts` and `worker.ts`. ASSUMPTION(U41): an array longer than 20 items keeps its first 20 (BR6.2 says "at most 20 items").
- **Step 6:** `log-policy.test.ts` (41 tests). `worker-subpath.test.ts` is unchanged and green.
- **Step 7:** the web logger uses the shared policy, with `level` and `event` re-asserted after the fields. `logger.test.ts` has 3 existing cases and 3 new ones.
- **Step 8:** the worker logger keeps only `LOG_FIELD_NAMES ∪ WORKER_LOG_FIELD_NAMES` (ENT-012, exported from `apps/worker/src/logger.ts`), with value scrubbing and the event check. The index-signature `LogFields` is kept. In the test, "redacts … fields" is replaced by "drops … fields", and there are new cases for `eventName` and for a `[scrubbed]` `message`. `logger.levels.test.ts` is unchanged. This fixes the proposed `S1` row for free-text `message` (the value scrub).
- **Step 9:** `main.ts`: the crash goes to `worker.crashed {errorName}` through a `JsonLogger` built before `main()`, and `fix` is `db.reset_required`. `env.ts`: both console calls become `worker.env_invalid {code, variables}`. `env.load.test.ts` and `main.test.ts` were updated, with the reasons in the test files.
- **Step 10:** `@rogikotha/i18n/request` exports `createRequestConfig({onIntlError})`. The default export takes no reporter and prints nothing. ASSUMPTION(U41): the web wiring is `apps/web/src/server/i18n-request.ts`, which writes `i18n.message_error {errorCode}`, and `next.config.ts` points the plugin there. The reason: `apps/web/src/i18n/` is `web-shared`, which may not import `server/logger.ts`. The old re-export and its test are deleted. `review.ts:228` is deferred until U47 merges (see Deferred).
- **Step 11:** `eslint.config.mjs`: `no-console` is `error` with no allowed method for `apps/*/src/**` and `packages/*/src/**`. There are seven file exceptions, each with a one-line reason: the two loggers, `migrate.ts`, `reset.ts`, `seed.ts`, and, until the rebase, `actions/review.ts` (U47) and `actions/evidence.ts` (U48). A probe `console.error` in `apps/web/src/lib/` failed lint and was then removed. `timeout 900 pnpm lint`: 0 errors and 1 warning that was already there (`packages/i18n/src/routing.ts:17`, an unused disable, not touched). Lint needed a `pnpm --filter @rogikotha/web build` for typed routes; the build is green with the new plugin path.
- **Tests run (unit-scoped):** `application` project 31 files / 299 tests; `i18n` project 7 / 42; `worker` project 13 / 95; `web` (`server/logger.test.ts`, `server/i18n-request.test.ts`, `i18n/`, `actions/review.test.ts`) 4 / 38. All green. `tsc` is clean for `packages/application`, `apps/worker` and `packages/i18n`. The web type check ran inside `next build`.

## Steps 23–27 (2026-11-06)

- **Step 23:** `apps/worker/src/log-scrub.test.ts` (5 tests) drives the real `JsonLogger` through five paths:
  - `logOutcomes`, with a marker in `eventName` and in a cast `errorCode`;
  - `job.failed`, from a poller whose error holds an address, a Windows path, a POSIX path and a 40-character token;
  - `worker.crashed`, when the container throws before it exists;
  - `loadEnv` with `APP_MODE=LOGSCRUB-ENV-7Q`: `worker.env_invalid` names `APP_MODE` and never the value;
  - the queue policy mismatch: `fix: 'db.reset_required'`, both policies kept, no `pnpm db:reset` sentence.

  Every case also checks that nothing reaches `console.error/warn/info/debug` or `process.stdout.write`, and that every `console.log` line ends with the logger's envelope. U48's processor case is added in Step 32.
- **Step 24:** `infra/compose/.env.example` gains `APP_ALLOWED_ORIGINS=`, with its format in a comment. The `APP_MODE` comment now says the start-up assertion is deferred (FD-105). `apps/web/playwright.config.ts` sets `webServer.env = { APP_ALLOWED_ORIGINS: ORIGIN }` (R5); Playwright merges it with the process environment.
- **Step 25:** `apps/web/src/proxy.smoke.test.ts` has 5 tests. It runs in the node environment, with next-intl replaced by a pass-through as in `proxy.test.ts`, and with `APP_URL=http://localhost:3000` and `NODE_ENV=production`. `timeout 900 pnpm smoke`: 22 files / 46 tests green.
  - The assigned test database `rogikotha_test_w8` was owned by `postgres`, so the reset failed with "must be owner of schema public". Its owner was changed to `rk_app` and the three extensions of `02-extensions.sql` were added, as for `w1` to `w7`.
- **Step 26:** `apps/web/e2e/smoke/security-headers.spec.ts` has 8 tests:
  - on `/en` and `/bn`: the BR2.1 values (written out in the spec), no `X-Powered-By`, `'strict-dynamic'` and no `'unsafe-eval'`;
  - two loads give different nonces, and every `<script>` tag in the HTML carries the header's nonce;
  - no `securitypolicyviolation` event and no CSP console message on five pages per locale (home, doctors, a doctor profile, an experience, sign-in) and on the root not-found page (`/fr`);
  - after the seeded patient signs in, every cookie is one of ENT-011: host-only, path `/`, `Lax`, not `Secure` on http, and `httpOnly` exactly for the session cookies;
  - no request leaves the app's origin.

  `next build` and the spec are green.
  - ASSUMPTION(U41): the first run found one `script-src eval` violation on the doctor profile. It comes from zod 4's `allowsEval` probe (`Function('')` inside a `try`) in a client chunk. The probe does no harm, but the browser reports it. The new `apps/web/src/instrumentation-client.ts` runs `z.config({ jitless: true })` before hydration, and the violation is gone. The alternative is an `ISS-` row against U46 plus an exception in the spec; the owner may choose that instead.
  - ASSUMPTION(U41): the shared development database `rogikotha` has only migrations 0000 to 0010 (no U46 0011), so `directory.listFacilities` failed there. U41 did not migrate a database that other worktrees use. The browser runs used a new database, `rogikotha_e2e_w8` (owner `rk_app`). It was built with `pnpm db:reset && pnpm db:seed` and passed to the run as `DATABASE_URL`.
  - `motion.spec.ts` is green: one case failed once under load and passed on the next two runs.
  - `demo.spec.ts` has 4 red cases that U41 did not cause. `register()` expects `/sign-in?next=…` after registering, but `server/actions/auth.ts:167` (T-101) now sends a new account to `/verify-email`. U41 does not edit `demo.spec.ts`.
- **Step 27 (a), BR1.4:** before the change, the root not-found page had 11 `script-src-elem` violations: 9 Next.js chunks and 2 inline scripts with no nonce, because the page was prerendered. With `await connection()` in `apps/web/src/app/not-found.tsx`, the build lists the page as dynamic (`ƒ /_not-found`) and the browser reports no violation. So the line stays and there is no S3 row.
  - The component is now `async`, so `apps/web/src/app/root.test.tsx` changed too. It is not in the owned list, and the change is the smallest that works: the test mocks `connection` from `next/server`, awaits the page, and gains the case "renders per request, so its scripts get the response nonce".
- **Step 27 (b), WF5 step 3:** the trial ran `next build` with `APP_ALLOWED_ORIGINS=http://build-only.example:3200`, then `next start` (port 3108) with `APP_ALLOWED_ORIGINS=http://start-only.example:3200`. It sent a POST to the real `setTheme` server action with `Host: localhost:3000` and `Origin: http://start-only.example:3200`.
  - The POST got 200 and set `rk.theme`, so Next.js's own origin check accepted the start-time value. A POST from the build-time origin got 403 from the proxy.
  - `next start` runs `next.config.ts` again (its log shows "Running next.config.ts"), so the value is not fixed at build time. There is no S4 row and no "rebuild after changing" note.
  - Afterwards the app was rebuilt without the trial value.
- **Tests run (unit-scoped):**
  - worker `log-scrub.test.ts`: 5 tests.
  - web `lib/security`, `proxy.test.ts`, `proxy.smoke.test.ts`, `app/root.test.tsx` and `security-cookies.test.ts`: 12 files / 192 tests.
  - `pnpm smoke`: 22 files / 46 tests.
  - Playwright: `security-headers.spec.ts` 8 of 8. The whole e2e suite: 21 passed and 4 failed (the `demo.spec.ts` cases above).
  - `tsc` is clean for `apps/web`, `apps/web/e2e` and `apps/worker`. ESLint and Prettier are clean on the changed files, and `pnpm lint:boundaries` is green.

## Steps 28–32 (2026-11-08)

- **Step 28 (after the merge with `main` up to a9a2ffe):**
  - Console grep (Step 4's (b), U48's files included, tests, `e2e/` and `scripts/` left out): only the two loggers, `packages/database/src/migrate.ts`, `reset.ts` and `packages/test-support/src/seed/seed.ts`, all permanent exceptions. `server/actions/review.ts` and `server/actions/evidence.ts` have no `console` call any more, so their temporary exceptions were removed from `eslint.config.mjs` in the merge commit. Nothing was left to route.
  - Body-limit grep (Step 21): no file in `apps/web/src/server/actions` takes a `File` or `Blob` (`evidence.ts` keeps only the remove action and type re-exports). `serverActions.bodySizeLimit` and `proxyClientMaxBodySize` are now `1mb` (BR4.6); ISS-690 is fixed.
  - U48's route: the code is `evidence.too_large` and the key `errors.evidence.tooLarge` ("Each file must be 15 MB or smaller."), as the design expected; no rename. U48 also holds `EVIDENCE_UPLOAD_CONTENT_LENGTH_CAP` (15 794 176) in `packages/domain/src/evidence/limits.ts`; the route computes `UPLOAD_MAX_REQUEST_BYTES` from `EVIDENCE_MAX_FILE_BYTES + UPLOAD_OVERHEAD_BYTES` as planned, and `route.security.test.ts` asserts both are equal. U48's helper `contentLengthRefusal` (its ASSUMPTION(U48): "U41 replaces these lines") answered 411 to a missing `Content-Length` and 400 to an oversized one.
- **Step 29:** `route.ts` changes in the two named places only. WF3 step 1: `guardRouteRequest`, then `checkDeclaredLength` (400 `validation`; 413 `evidence.too_large` with `Connection: close` and U48's key), each refusal logged once as `security.request_refused`; this replaces `contentLengthRefusal`. WF3 step 3: `request.formData()` became `readCappedFormData(request, UPLOAD_MAX_REQUEST_BYTES)`; `refused` gives the same 413, `malformed` gives U48's `noFile` answer. Differences, each marked ASSUMPTION(U41): (1) U41's refusals are re-wrapped in the route's `{error: AppError}` envelope, because the uploader reads `body.error.messageKey`; C14 names a bare AppError body (proposed row below). (2) A missing `Content-Length` is no longer refused with 411: the design (BR4.2, § 4.2) counts a chunked body instead.
- **Step 30:** the `origin` and `host` headers were added to U48's request helpers in `route.test.ts`, `upload.int.test.ts`, `upload.adversarial.int.test.ts` and `evidence-upload.int.smoke.test.ts`. Unlike the step text, three U48 assertions changed, because U41's design changes the answer: `route.test.ts` declared-over-cap 400 → 413, `route.test.ts` missing length 411 → 200 through the counting stream, `upload.adversarial.int.test.ts` 16 MB declared 400 → 413. New `route.security.test.ts` (16 tests): five Host/Origin refusals (cross-origin, no Origin with `Sec-Fetch-Site: cross-site`, `Origin: null`, unknown Host, bad `X-Forwarded-Host`) answer 403 with no command run; one refusal line with the answer's correlation id and no header value; the cap equals U48's constant; `Content-Length: 15794177` → 413 with a body whose `pull` throws never pulled; a non-numeric length → 400; a chunked 16 MB stream stops at most one 100 000-byte chunk past the cap, cancelled; a signed-out request reads no body; every 413 body is the AppError with `evidence.too_large` and `errors.evidence.tooLarge`; U48's 400 `too_large` for a 15 MB + 1 byte file and `type_rejected` for a renamed executable are unchanged.
- **Step 31:** `EvidenceUploader.request-limit.test.tsx` (2 tests): a 413 with the route's body shows "Each file must be 15 MB or smaller." in `en` and "প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।" in `bn`, not the generic failure. U47's composer does not call the upload route (only `EvidenceUploader` uses `/api/evidence/upload`), so there is no second consumer test. No component change; no S2 row.
- **Step 32:** `apps/web/src/log-scrub.int.test.ts` (`web-int`, 5 tests) registers, confirms and signs in `mitu.logscrub.demo+<run>@example.test`, publishes a review and posts a comment (U49 is on `main`, so no conditional S4 row) with `LOGSCRUB-EN-7Q` and `লগস্ক্রাব-বাংলা`, uploads `logscrub-রিপোর্ট-7Q.png` through the route, then a 413 and a 404, and logs a 40-character token through a cast. The captured console, stdout and stderr hold `security.request_refused` and the cast line, but no address, marker, file-name part, token or password. ASSUMPTION(U41): the file sits in `apps/web/src/`, not `server/`, because `web-server` may not import the upload route in `app/` (the `security-cookies.test.ts` precedent). The run id is in the address, so the test can run again on the same database. Worker `log-scrub.test.ts` gains U48's processor case (6 tests now): the last attempt with a reader that throws the leaky message, a delete whose error class is a path, and a path as the storage key writes `evidence.last_attempt_failed` with `errorClass: Error`, `evidence.original_delete_failed` with `errorClass: [scrubbed]` and `evidence.failed`, and no marker.
- **Tests run (unit-scoped, all green):** web upload route, `route.security.test.ts`, the evidence components, `lib/security`, proxy, settings, cookies, smoke, logger and `root.test.tsx`: 24 files / 321 tests; worker: 16 files / 128 tests; application `ports/` and `worker-subpath`: 2 files / 43 tests; `web-int` upload tests 3 files / 16 tests and `log-scrub.int.test.ts` 5 tests, after `test-support-seed` reset and seeded `rogikotha_test_w8`. `tsc` is clean for `apps/web` and `apps/worker`; ESLint and Prettier are clean on the changed files.

## Step 33 — gate (2026-11-08, branch at `ca0050f` plus the fix below)

| Command | Result |
|---|---|
| `timeout 1400 pnpm check` (typecheck, lint, boundaries fixture, `format:check`, identity, `test:coverage`, i18n parity, both contrast checks, motion check, build) | exit 0. Vitest with coverage: 354 files, 4 209 passed, 2 expected fail, 1 skipped (the existing `validator-probes.int.test.ts` probes; U41 added no skip or `fails`). Lint: 0 errors, 1 warning that is older than U41 (unused disable in `packages/i18n/src/routing.ts`, T-006). i18n parity: 993 keys. |
| `timeout 600 pnpm smoke` | 30 files / 59 tests passed |
| `timeout 600 pnpm test:int` (`database`, `web-int`, `worker-int`) | 63 files / 431 passed, 2 expected fail |
| Browser run, whole e2e suite (built app, own database `rogikotha_e2e_w8`, port 3117) | 21 passed, 4 failed. `security-headers.spec.ts` 8 of 8 and `motion.spec.ts` green; the 4 red cases are `demo.spec.ts` (`register()` expects `/sign-in`, T-101 sends to `/verify-email`; ISS-695) |

- The browser run needed its own Playwright config, because `apps/web/playwright.config.ts` fixes port 3107, which other worktrees use. A local copy outside version control (`apps/web/node_modules/.u41/playwright.u41.config.mjs`) differs only in the port (3117) and the output folder. `rogikotha_e2e_w8` no longer existed. It was created again (owner `rk_app`, with `pg_trgm`, `citext` and `pgcrypto`), then built with `pnpm db:reset && pnpm db:seed`, with `DATABASE_URL` pointing at it.
- Fixed (ISS-694): the first browser run timed out on "reports no CSP violation on five pages" in both locales. The spec followed `experience-row-title-link`, which `main` renamed to `account-row-title-link` (`components/patient/shared/AccountRow.tsx`). The spec now follows the new id, and both cases pass.
- Line coverage per package after U41 (from `coverage/coverage-summary.json` of the `pnpm check` run). The before figures were not measured at Step 1 (ASSUMPTION(U41) there), so no before/after delta is claimed:

  | Package | Lines | Floor 80% |
  |---|---|---|
  | `apps/web` | 3 005 / 3 124 = 96.19% | met |
  | `apps/worker` | 190 / 190 = 100% | met |
  | `packages/application` | 1 766 / 1 917 = 92.12% | met |
  | `packages/i18n` | 55 / 55 = 100% | met |
  | all packages | 9 429 / 9 819 = 96.02% | met (no threshold failed) |

- Acceptance curls (design § 8.4) against `next start` on `127.0.0.1:3118`, with `rogikotha_e2e_w8` and `APP_ALLOWED_ORIGINS=http://localhost:3118`, sent to `http://localhost:3118`:

  | Request | Expected | Observed |
  |---|---|---|
  | `curl -sI /en` | 200, the six BR2.1 headers, a nonce CSP with `'strict-dynamic'` and no `'unsafe-eval'`, no `X-Powered-By`, no HSTS on http | 200; `nosniff`, `strict-origin-when-cross-origin`, the Permissions-Policy list, `DENY`, COOP and CORP `same-origin`; CSP `script-src 'self' 'nonce-…' 'strict-dynamic'`, `style-src 'self' 'unsafe-inline'`, `frame-ancestors 'none'`; no `X-Powered-By` and no `Strict-Transport-Security` |
  | `curl -sI /bn` | the same headers | 200, the same headers |
  | two `curl -sI /en` | two different nonces | two different nonces |
  | `curl -sI -H "Host: evil.example" /en` | 403 from the proxy, empty body | 403, 0 bytes |
  | `X-Forwarded-Host: evil.example` on `/en` | 403 | 403 |
  | cross-origin server-action POST (`Origin: http://evil.example`, `Next-Action`) to `/en` | 403 from the proxy | 403, 0 bytes (control: the same POST from the app's origin with an unknown action id gets Next.js's 404, so the proxy let it through) |
  | cross-origin upload POST to `/api/evidence/upload` (2 KB, and 16 MB) | 403 `forbidden` AppError | 403 `{"error":{"code":"forbidden","messageKey":"errors.common.forbidden",…}}` for both. The 16 MB body was cut off after 327 680 bytes had been sent |
  | oversized upload, same origin, 16 777 216 bytes declared | 413 `evidence.too_large` with `errors.evidence.tooLarge`, `Connection: close`, API CSP, body not read | 413 `{"error":{"code":"evidence.too_large","messageKey":"errors.evidence.tooLarge",…}}`, `connection: close`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`; 327 680 bytes sent before the refusal |

  The server log of that run holds six `security.request_refused` lines (`kind` and `status` only), and none contains `evil.example`.
- `ISS-` rows from this step: ISS-694 (S3, fixed in U41) and ISS-695 (S2, open, owner of `demo.spec.ts`). The open S2 blocks the phase gate, not U41's Build and Test.

## Step 34 — adversarial tests A1–A5 (2026-11-08, separate agent)

Written and run by an agent that did not write U41's code. Files: `apps/web/src/lib/security/__tests__/security.adversarial.test.ts` (76 tests), `apps/web/src/proxy.adversarial.test.ts` (31), `apps/web/src/app/api/evidence/upload/route.adversarial.test.ts` (21), `apps/web/src/security.adversarial.int.test.ts` (`web-int`, 6) and four A4 cases appended to `apps/worker/src/log-scrub.test.ts`. A real-server probe ran against `next start` on `127.0.0.1:3128` with `rogikotha_e2e_w8` and `APP_URL=http://localhost:3128` (scripts outside the repository; the database was rebuilt with `db:reset` and `db:seed` afterwards).

| Attack | What was tried | Outcome |
|---|---|---|
| A1 header spoofing | 24 Host tricks (suffix, prefix, trailing dot, `localhost.:3000`, userinfo both ways, IPv6 and IPv4 literals, ports `300`, `30000`, `03000`, `:80`, path, backslash, percent-encoded colon, two values, empty, missing), X-Forwarded-Host (spoofed, empty, leading comma, two lines either way round), 22 Origin tricks (https twin, trailing dot, userinfo, IPv6, trailing slash, path, `ws:`, no scheme, `null`/`NULL`, two values, empty), a missing Origin with every `Sec-Fetch-Site` but `same-origin`, odd method names; against `/en`, `/bn`, `/en/experiences/<id>-a.b`, `/en/experiences/<id>-x.png`, `/bn/doctors/<id>-dr.x`, `/en/%E0%A4%A`, `/api/auth/ok`, `/api/health`, `/_next/*`, `/__nextjs*` and the upload route, in-process and with `curl` on the real server | **Break, fixed (ISS-696, S2).** `/_next/*` and `/__nextjs*` had the Host check only (WF2b), and Next.js still runs a server action posted there: the real server ran `setTheme` (`Set-Cookie: rk.theme=dark`) for a `Next-Action` POST with no Origin to `/_next/x` and `/__nextjsx/en`, where `/en/x` gets 403. A cross-site or `null` Origin there was still refused by Next.js's own check (500). `proxy.ts` now runs `checkRequest` before the internal-path branch; after a rebuild all three paths answer 403 without Origin and 200 from the app's origin. Every other trick was refused with an empty 403 (proxy) or a `forbidden` AppError (route), with no command run and no body byte read. ASCII case variants of the exact host and origin pass, as designed. Observed residual: the malformed path gets Next.js's own bare `text/plain` 500 with no security headers after the Host check passes (ISS-698, S4) |
| A2 upload size bypass | `Content-Length: 200` and `0` on a 16 MB body; chunked 16 MB and 4 × 200 MB (64 KiB chunks); one byte over the cap declared; signed-out, unconfirmed and rate-limited senders with a 200 MB body; two file parts, a file plus a text `file` field, a text-only `file`; 16 × 1 MB padding fields | No break. Every oversize answered 413 `evidence.too_large`; the counted stream read between cap − 64 KiB and cap + 64 KiB and cancelled the source; one byte over the declared cap answered 413 with `Connection: close` and read nothing. In-process RSS: 164 MB before, peak 308 MB over the run (the uncollected 16 MB slices; one held 200 MB body would exceed the 150 MB bound). Real server: a signed-out chunked 200 MB POST got 401 and a 200 MB declared POST got 413, each after about 320 KB had been sent; the server's working set went 300 → 264 → 264 MB. Signed-out, unconfirmed and rate-limited bodies were pulled 0 times; several parts stored nothing |
| A3 CSP and nonce | `<script>`, `<img src=x onerror>`, `<a href="javascript:">`, `<base href>` and `<meta http-equiv=refresh>` written into a seeded review's title and body, its comment and both personas' display names, then `/en`, `/bn` and the review page in both locales loaded in Chromium; chosen `x-nonce` and `content-security-policy` request headers (also two `x-nonce` lines) on every page path; nonce payloads into `buildCsp`; 10 000 nonces | No break. No dialog, the payload flag never set, zero CSP violations, no raw `<script>`/`<img onerror>`/`<base>` in the DOM, every one of 33 or 13 scripts carried the response nonce, no request left the origin. The handed-on nonce and policy were always the proxy's own (25 requests per path, 25 distinct nonces). `buildCsp` refused every malformed nonce; 10 000 draws had no repeat |
| A4 log leak | Duplicate username, over-long Bengali title, invalid review id, a `unitOfWork` port that throws `LOGSCRUB-THROW-7Q`, a slot failure, a cast with free-text fields and an interpolated event (web, real container and test database); a poller job, a pre-container crash, a heartbeat and a scanner outage that throw the marker (worker) | **Break, fixed (ISS-697, S1).** The worker's `message` field kept a message that passes the id-or-code value shape: `job.failed` and `worker.heartbeat_failed` wrote `"message":"LOGSCRUB-THROW-7Q"`. `apps/worker/src/logger.ts` now always writes `message` as `[scrubbed]` (the key stays, so the failure is visible). The web logger wrote no marker on any path (`command.failed` carries the command name and correlation id only). Residual of § 6, not a pass: for a server-action POST whose body is not JSON, Next.js prints `SyntaxError: Unexpected token 'L', "LOGSCRUB-T"... is not valid JSON`, the first ten body characters, to stderr (ISS-699, S4). Limit noted, no call site affected: a code-shaped user value in an allowlisted id or code field, or an identifier-shaped value interpolated into an event name, cannot be told apart by shape (Step 4's inventory found no such call) |
| A5 cookies and cross-site use | Signed in as the seeded patient in Chromium at `localhost:3128`, then from a page on `127.0.0.1:3129` (another site): a multipart form POST to the upload route, a form POST to `/en/me`, a `no-cors` credentialed fetch and a credentialed fetch with `Next-Action`; in-process, cross-site and `null`-Origin server-action and auth-API POSTs with a cookie; a real session cookie on cross-site, `null` and Origin-less uploads against the test database | No break. The browser sent no cookie on any cross-site POST (SameSite=Lax), the proxy and the route answered 403, the `Next-Action` fetch was stopped by CORS, and the theme cookie did not change. Cookies: `rk.session_token` (HttpOnly, Lax, host-only, path `/`, not Secure on http) and `rk.lang`. `/api/auth/get-session` answered 404. With the real cookie, the three refused uploads wrote no `evidence_items` row; the same-origin control wrote one. The `__Secure-` and `Secure` check with an https `APP_URL` stays the library-level one of `security-cookies.test.ts` (no local TLS server) |

- Step 33 re-run after the fixes: `timeout 1450 pnpm check` exit 0 (358 files, 4 350 passed, 2 expected fail, 1 skipped; lint 0 errors and the same older warning), `pnpm smoke` 30 files / 59 tests, and on a rebuilt app `security-headers.spec.ts` with `motion.spec.ts` 20 of 20 (local config copy, port 3117). ASSUMPTION(U41): the other e2e specs and `pnpm test:int` on its own were not re-run; `pnpm check` runs the integration projects, and the change touches only unsafe methods on internal paths and the worker logger.
- `ISS-` rows from this step: ISS-696 (S2, fixed), ISS-697 (S1, fixed), ISS-698 (S4, residual), ISS-699 (S4, residual).

## Deferred

- `apps/web/src/server/actions/review.ts:228` (Step 10): U47 owns that file and is rewriting it now. U41 routes the call after U47 merges and this branch is rebased. Until then, Step 11's `no-console` rule leaves that line alone through a temporary file exception in `eslint.config.mjs`, not an inline disable, because U41 does not edit that file. The exception is removed at the rebase. The demo upload action `actions/evidence.ts:158,225` has the same kind of temporary exception until U48 removes it (Step 28).
  - Closed 2026-11-08 by the merge with `main`: neither file has a `console` call any more, and both exceptions are removed.

## Proposed `ISS-` rows (numbered at Step 38; see "Issues found and fixed in U41" below for the final numbers)

- `S1` worker/logging — free-text `message` (`err.message`) in four worker log calls (`main.ts:38`, `health.ts:20`, `pg-boss-queue.ts:139,252`); found in U41, owner T-009; to be fixed in U41 by the BR6.2 value scrub (Step 8).
- `S3` auth/dependencies — `better-auth` 1.7.14 is four security patches behind 1.7.18 (session revocation through the cookie cache, email links bound to the issuing account, OTP guessing, wildcard `trustedOrigins`); a separate bump task, owner's decision.
- `S4` logging/lint — `packages/test-support/src/seed/seed.ts` writes to the console and was not in the design's inventory; ASSUMPTION(U41) above.
- `S4` logging/lint — temporary `no-console` file exceptions for `apps/web/src/server/actions/review.ts` (U47) and `apps/web/src/server/actions/evidence.ts` (U48) in `eslint.config.mjs`; found in U41; removed at the Step 28 rebase, when their calls are routed or deleted.
- `S4` web/i18n — the next-intl request config moved from `apps/web/src/i18n/request.ts` to `apps/web/src/server/i18n-request.ts` (the `web-shared` boundary may not import the logger); found in U41; ASSUMPTION(U41), to be confirmed by the owner or reversed through a boundary exception.
- `S2` e2e/auth: `apps/web/e2e/smoke/demo.spec.ts` `register()` expects `/sign-in?next=%2F<locale>%2Fme` after registering. T-101 now sends a new account to `/verify-email` (`server/actions/auth.ts:167`), so the four demo walks are red on this branch's base. Found in U41 (Step 26). Owner: T-101/U11 or the owner of the demo spec.
- `S3` environment: the shared development database `rogikotha` has no migration 0011 (U46). The facilities page fails there with `directory.listFacilities: internal` until `pnpm db:migrate` runs on it. Found in U41 (Step 26). When to migrate the shared database is the owner's decision.
- `S4` web/CSP: `apps/web/src/instrumentation-client.ts` turns zod's JIT off in the browser, so its `Function('')` probe no longer raises a `script-src eval` report. Found in U41 (Step 26). ASSUMPTION(U41), to be confirmed by the owner.
- `S3` api/contract (added as ISS-691 on 2026-11-08, because the route comment names it): C14 says `/api/*` errors use the bare AppError body, but U48's upload route and `EvidenceUploader` use `{error: AppError}`. U41's guard and size refusals are re-wrapped in the route's envelope so the uploader shows the too-large copy (`route.ts` `inRouteEnvelope`). Found in U41 (Step 29). Owner: Contract Design / U50, to align C14 with the route or the route with C14. ASSUMPTION(U41).
- `S4` evidence/web (added as ISS-692): U41's design replaces U48's 411 for a missing `Content-Length` with the counting stream (BR4.2, BR4.3), and answers 413 rather than 400 to a declared length over the cap; three U48 assertions follow (`route.test.ts` two, `upload.adversarial.int.test.ts` one). Found in U41 (Step 30). Recorded for U48's owner; C14's 413 note is Step 37.
- `S4` tests/boundaries (added as ISS-693): `log-scrub.int.test.ts` is in `apps/web/src/`, not the design's `server/`, because `web-server` may not import the upload route in `app/`. Found in U41 (Step 32). ASSUMPTION(U41).

## Steps 36–38 (2026-11-08)

- **Step 36 (threat notes):** `docs/security/local-demo-threat-notes.md` was checked against the built code. Every test it names exists on the branch; the "test in Step <n>" markers are gone and the adversarial results are named (A1 break ISS-696, A4 break ISS-697, A2, A3 and A5 no break). The `rk.theme` and `rk.motion` rows now name `server/actions/preferences.test.ts` (the Step 36 note assumed `lib/cookies.test.ts`, which tests only the readers), the `rk.lang` row names `packages/i18n/src/routing.test.ts`, and the `rk.dont_remember` row says it has no test of its own. The residuals gained ISS-698, ISS-699, the shape-based limit of the value check, the TLS-by-configuration limit and the result of Step 27 (b): `APP_ALLOWED_ORIGINS` is read again at `next start`.
- **Step 37 (records of the decision):** the dated C14 release-1 amendment is appended under C14 in `inception/contract-design/contract-summary.md`. It describes the real answers, including the route's `{error: AppError}` envelope (ISS-691) and the missing-length case counted rather than refused (ISS-692). The `## Amendments — release 1 (FD-105)` section sits above "Goal" in `docs/implementation/tasks/T-502-security-hardening.md`. FD-116 is appended to `docs/status/decision-log.md` and marked "awaiting the owner's confirmation". ASSUMPTION(U41): the number is FD-116 as the task assigned; `main` had no FD-116 at 6842749 (highest FD-115, U50 holds FD-120 to FD-122). If U46 or another Unit lands an FD-116 first, renumber at merge.
- **Step 38 (records):** `docs/implementation/ISSUES.md` holds ISS-690 to ISS-717 (the table below); `traceability.json` maps steps to rules to criteria (AC3.1.5 stays "Deferred", FD-105); `source-manifest.json` lists the 64 literal paths (no bracketed path was touched; `aidlc/`, `.claude/` and `.agents/` are left out).

## Inventory, coverage and files outside the owned paths

- Inventory: see "Inventory" above (logger calls and console calls with their classification). After the merge, the only direct `console` use is in the two loggers, `packages/database/src/migrate.ts`, `reset.ts` and `packages/test-support/src/seed/seed.ts`, all permanent file exceptions (ISS-705).
- Coverage: the before figures were not measured (ASSUMPTION(U41) at Step 1), so no before and after delta is claimed. The after figures are in the Step 33 table and in "Sign-off" below; the 80% floor is met in all four packages and never lowered.
- Files edited outside the owned paths (each is the smallest change that works):
  - U48's route tests and helpers: `apps/web/src/app/api/evidence/upload/route.test.ts`, `upload.int.test.ts`, `upload.adversarial.int.test.ts`, `evidence-upload.int.smoke.test.ts` (the `origin` and `host` headers; three assertions follow the 413/counting behaviour, ISS-692).
  - `apps/web/src/app/not-found.tsx` and `root.test.tsx` (BR1.4, `await connection()`), `apps/web/src/instrumentation-client.ts` (new, ISS-708).
  - `apps/web/src/server/i18n-request.ts` and test (new), `apps/web/src/i18n/request.ts` and test (deleted), `packages/i18n/src/request.ts` and test (the `onIntlError` reporter, ISS-706).
  - `packages/application/src/index.ts`, `worker.ts`, `ports/logger.ts` (log-policy exports and the U48 id fields), `eslint.config.mjs`, `infra/compose/.env.example`, `apps/web/playwright.config.ts`, `apps/web/e2e/smoke/security-headers.spec.ts` (new; one test id fixed, ISS-694), `docs/status/dependency-check-log.md`.
  - Tests placed outside the design's folders for boundary reasons: ISS-693 and ISS-716.
- Open S2 rows `ISS-139` and `ISS-141` name T-502 as a backstop but are outside U41's narrowed scope (FD-105); they stay with T-304 and T-309.

## Issues found and fixed in U41

| ISS | Sev | Status | What |
|---|---|---|---|
| ISS-690 | S4 | fixed in U41 (Step 28) | Body limits stay 11 MB while a demo upload action exists; now 1 MB |
| ISS-691 | S3 | open, U50 | C14 bare AppError body versus the route's `{error: AppError}` envelope |
| ISS-692 | S4 | recorded for U48's owner | Three U48 assertions changed (413 and counting stream) |
| ISS-693 | S4 | open | `log-scrub.int.test.ts` placed in `apps/web/src/` |
| ISS-694 | S3 | fixed in U41 (Step 33) | Security spec followed a renamed test id |
| ISS-695 | S2 | open, T-101 / U11 | `demo.spec.ts` expects `/sign-in`, T-101 sends `/verify-email` (blocks the phase gate, not U41) |
| ISS-696 | S2 | fixed in U41 (Step 34) | Server action run on `/_next/*` and `/__nextjs*` with no Origin |
| ISS-697 | S1 | fixed in U41 (Steps 8 and 34) | Worker `message` field carried error text; now always `[scrubbed]` |
| ISS-698 | S4 | residual | Next.js bare 500 for a malformed percent-encoded path |
| ISS-699 | S4 | residual | Next.js prints the first characters of a non-JSON action body |
| ISS-700 to ISS-703 | S4 | deferred to release 2 (FD-105) | Rate-limit table and network key; `assertAppMode()`; FD-072 adversarial test; PWA `worker-src` / `manifest-src` |
| ISS-704 | S3 | open, owner | better-auth 1.7.14 behind 1.7.18 security patches |
| ISS-705 | S4 | open, owner to confirm | Fifth `no-console` exception (`seed.ts`) and the database tools |
| ISS-706 | S4 | open, owner to confirm | next-intl request config moved to `server/i18n-request.ts` |
| ISS-707 | S3 | open, owner | Shared development database lacks migration 0011 |
| ISS-708 | S4 | open, owner to confirm | `instrumentation-client.ts` turns zod's JIT off in the browser |
| ISS-709 | S3 | open, U47 / U46 | Slugged ids accept any suffix; no canonical redirect |
| ISS-710 | S4 | open, release 2 | `UPLOAD_OVERHEAD_BYTES` and the cap as module constants (C18) |
| ISS-711 | S4 | accepted | `style-src 'unsafe-inline'`, no CSP reporting endpoint, static files skip the Host check |
| ISS-712 | S4 | accepted | TLS-only features tested by configuration; `__Secure-` not `__Host-`; preference cookies not `Secure` |
| ISS-713 | S4 | open, release 2 | `trustedOrigins` inert while FD-104 closes the library routes |
| ISS-714 | S4 | accepted | Scrubbed error messages, one line per refusal, `db.reset_required` code |
| ISS-715 | S4 | fixed in U41 (Step 28) | Temporary `no-console` exceptions for `review.ts` and `evidence.ts` |
| ISS-716 | S4 | open, owner to confirm | `security-settings.ts` and tests placed by the boundary matrix, not the design's `server/` |
| ISS-717 | S4 | open, U50 | Only two e2e specs re-run after the Step 34 fixes |

The only `ISS-` numbers used are 690 to 717; ISS-718 and ISS-719 stay free.

## Sign-off

Delegated by the owner on 2026-11-04 (the owner's standing delegation of the sign-off of high-risk Units to the agents). Written 2026-11-08 by the agent that did plan Steps 35 to 38, not by the agent that wrote the adversarial tests (Step 34) or by the one that wrote the Unit's code.

- Adversarial results (A1 to A5, Step 34, separate agent): two breaks, both fixed and kept as tests. ISS-696 (S2): a server action ran on `/_next/*` and `/__nextjs*` with no `Origin`; `proxy.ts` now runs the Host and Origin check first. ISS-697 (S1): the worker's `message` field kept a code-shaped error text; it is now always `[scrubbed]`. A2 (upload size bypass, RSS measured), A3 (CSP and nonce payloads, both locales) and A5 (cookies and cross-site use) found nothing. Two framework residuals are recorded, not passed: ISS-698 and ISS-699 (S4).
- Gate counts (final run on this branch, 2026-11-08): `pnpm format:check` clean; `pnpm check` exit 0 (358 test files, 4 350 passed, 2 expected fail, 1 skipped; all-package line coverage 96.1%, 9 438 of 9 821; no threshold failed; the 80% floor holds for `apps/web`, `apps/worker`, `packages/application` and `packages/i18n`); `pnpm smoke` 30 files / 59 tests; `pnpm test:int` ran inside `pnpm check` and earlier at Step 33 (63 files / 431 tests); browser: `security-headers.spec.ts` and `motion.spec.ts` 20 of 20 after the Step 34 fixes.
- Open `ISS-` rows: S2 ISS-695 (`demo.spec.ts` red, owner T-101 / U11; blocks the phase gate, not this Unit's Build and Test). S3 ISS-691, ISS-704, ISS-707, ISS-709. S4 ISS-692, ISS-693, ISS-700 to ISS-703, ISS-705, ISS-706, ISS-708, ISS-710, ISS-713, ISS-716, ISS-717 and the accepted or residual ISS-698, ISS-699, ISS-711, ISS-712, ISS-714. No open S1. Fixed in U41: ISS-690, ISS-694, ISS-696, ISS-697, ISS-715.
- The owner's own check is still wanted on: FD-116 (awaiting the owner's confirmation), and the ASSUMPTION(U41) choices behind ISS-705, ISS-706, ISS-708 and ISS-716.
