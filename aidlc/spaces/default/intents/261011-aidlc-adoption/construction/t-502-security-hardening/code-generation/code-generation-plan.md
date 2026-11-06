# Code Generation plan — U41 `t-502-security-hardening` (T-502, release 1, narrowed by FD-105)

## Summary

- Builds: the release-1 security posture: a nonce CSP and HSTS set at runtime by `proxy.ts`, the static headers and `/api` CSP from `next.config.ts`, Host / X-Forwarded-Host / Origin checks in the proxy and in `guardRouteRequest`, `serverActions.allowedOrigins` from `APP_ALLOWED_ORIGINS`, the upload request cap (declared length plus counting stream), body limits back to 1 MB, one shared log policy for the web and worker loggers, direct console output routed through the loggers with a `no-console` rule, cookie and `trustedOrigins` pin tests, and `docs/security/local-demo-threat-notes.md`
- Touches: U41's owned paths (`apps/web/src/proxy.ts` and its tests, `apps/web/src/lib/security/`, `apps/web/next.config.ts`, `apps/web/src/server/logger.ts`, `apps/worker/src/logger.ts`, the new `server/security-settings.ts`, `packages/application/src/ports/log-policy.ts`, `docs/security/`), the console-routing lines and the U48 upload-route lines named below, plus the append-only shared files listed below and the records
- Tests: unit tests for every `lib/security` module, the log policy and both loggers, an extended `proxy.test.ts`, cookie and `trustedOrigins` pins, a web and a worker log-scrub test, the upload `route.security.test.ts` and two 413 consumer tests, one smoke file (`proxy.smoke.test.ts`), one Playwright spec (`e2e/smoke/security-headers.spec.ts`), and 4–5 adversarial tests (A1–A5) by a separate agent (high-risk Unit: session cookies, evidence upload)

## Inputs

- Functional Design (Review 01 NOT-READY; all eight findings R-01 to R-08 settled in the design): `construction/t-502-security-hardening/functional-design/`: `functional-spec.md` (WF1–WF6, §§ 4–11), `rules.md` (BR1.1–BR8.2), `entities.md` (ENT-011 cookie inventory, ENT-016 matcher exclusions), `functional-design-questions.md` (Q1–Q10 and "Review 01 findings"), `traceability.json`, `reviews/review-01.md`.
- Unit entry U41 in `inception/units-generation/unit-of-work.md` (owned paths, FD-072, FD-102, FD-105; depends on U48).
- Task file `docs/implementation/tasks/T-502-security-hardening.md`; contracts C14 and C18 in `inception/contract-design/contract-summary.md`.
- `main` as merged with U8 T-101, U3 T-010, U45 T-011 and U9 T-102. U48 (`/api/evidence/upload`) is **not** on `main` yet; Phase F waits for it.

## Review points already settled in the design

Decided under the owner's delegation of 2026-11-04 and written into the design (`functional-design-questions.md` § "Review 01 findings"). This plan builds them as written:

1. **R-01:** the matcher excludes only the upload route, `/_next/static`, `/_next/image` and four named root files, never an extension (Step 19, Step 20).
2. **R-02:** direct console output is routed through the loggers, and `no-console` has no allowed method outside the loggers (Steps 9–11).
3. **R-03:** guard names `checkHost`, `checkOrigin`, `checkRequest`, `guardRouteRequest` (Steps 15, 18).
4. **R-04:** the C14 amendment block and the 413 consumer tests (Step 31, Step 37).
5. **R-05:** the three edits in U48's area are named in "Shared files" below (Steps 29–30).
6. **R-06:** the task-file amendment section and the two extra threat rows (Steps 36–37).
7. **R-07:** the proxy's `NextResponse.next({request: {headers}})` fallback when next-intl returns no header override (Step 19).
8. **R-08:** the worker hint is the code `db.reset_required` (Step 9).

## Where it runs

- The Unit runs in its own git worktree on its own Bolt branch `bolt/t-502-security-hardening`, cut from `main`, under the swarm (FD-094). The orchestrator assigns one test database; because the database project's reset guard accepts only names ending in `_test`, it is named `rogikotha_wN_test` (as U9 found). `DATABASE_URL_TEST` in the worktree points at that one database only, never at another worktree's database.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).
- There is no GitHub Actions workflow and no CI (FD-102). The gate is local only: `pnpm check` and `pnpm smoke` on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths and the listed shared files, after reading `git diff --cached`.
- Phases A–E can start before U48 merges. Phase F (the upload route) starts only after U48 is squash-merged on `main` and this branch is rebased onto it.

## Steps (test-after, per the Testing Contract)

**Phase A — baseline and runner**

- [ ] **Step 1** — Baseline in the worktree. Confirm `DATABASE_URL_TEST` names the assigned `rogikotha_wN_test`. Run `pnpm infra:up`, `pnpm build` once (typed routes for lint), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record file and test counts and line coverage for `apps/web`, `apps/worker`, `packages/application` and `packages/i18n` in `code-summary.md`. Read the open `ISSUES.md` rows for web, auth, evidence and logging; an open `S1` there stops the Unit. Record whether U48 is on `main` yet.
- [ ] **Step 2** — Dependency check (design § 1): the latest Next.js entry in `docs/status/dependency-check-log.md` is older than 3 days. Re-check Next.js 16.3.4 as current stable and its known issues for nonce CSP, `proxy.ts` (matcher, Node runtime, execution order), `serverActions.allowedOrigins` (build time or start time) and `proxyClientMaxBodySize`; next-intl 4.14.4 middleware header pass-through; Better Auth 1.7.14 cookie attributes and origin check; Node 24 undici `Request` with `duplex: 'half'` and `TransformStream`. Append one dated entry to `docs/status/dependency-check-log.md`. Confirm no FD entry is needed before code (design § 9 "Rule chain").
- [ ] **Step 3** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`: the `web`, `worker`, `application`, `i18n`, `web-int` projects; Playwright in `apps/web`) and the unit-scoped commands in `unit-test-instructions.md`. Run the existing `apps/web/src/proxy.test.ts`, `apps/web/src/server/logger.test.ts`, `apps/worker/src/logger.test.ts`, `apps/worker/src/logger.levels.test.ts` and `apps/worker/src/env.load.test.ts` with those commands and record the count before any change.

**Phase B — business logic: the log policy and console routing**

- [ ] **Step 4** — Inventory (WF6 step 2, R-02, risk R10). On the branch, excluding test files, `e2e/` and `scripts/`: (a) `grep -rnE "logger\.(info|warn|error)\(" apps packages --include=*.ts --include=*.tsx`; list every field name; (b) `grep -rn "console\." apps/*/src packages/*/src`. Write both lists into `code-summary.md` § Inventory, each name marked: id or code (allowlist it), free text (an `S1` `ISS-` row against the owning Unit, not an allowlist entry). Known console calls: `apps/worker/src/main.ts:155`, `packages/i18n/src/request.ts:32`, `apps/web/src/server/actions/review.ts:228`, `apps/worker/src/env.ts:72,80`, the two loggers, `packages/database/src/migrate.ts`, `reset.ts`.
- [ ] **Step 5** — Implement `packages/application/src/ports/log-policy.ts` (imports nothing): `LOG_FIELD_NAMES`, `scrubLogFields`, `scrubLogValue`, `logEventName`, `SCRUBBED`, `INVALID_EVENT`, plus a compile-time check that `LOG_FIELD_NAMES` equals the `LogFields` keys (BR6.1–BR6.3). Add one export line each to `packages/application/src/index.ts` and `packages/application/src/worker.ts`. If Step 4 found an id or code field missing from `LogFields`, add one optional property per field in `packages/application/src/ports/logger.ts`.
- [ ] **Step 6** — Write and run `packages/application/src/ports/log-policy.test.ts` (design § 8.1: every value class of BR6.2, the event cases including `Signed in shirin.demo@example.test` → `log.invalid_event`, an unknown `reporterAccountId` dropped). Run `packages/application/src/worker-subpath.test.ts` unchanged; it stays green.
- [ ] **Step 7** — Change `apps/web/src/server/logger.ts` to the shared policy (WF4: event check, `scrubLogFields` with `LOG_FIELD_NAMES`, envelope `{level, event, ...kept, at}` with `level` and `event` re-asserted). Extend `apps/web/src/server/logger.test.ts` (existing three cases kept): `@` value written as `[scrubbed]`, invalid event replaced, envelope not overwritable through a cast.
- [ ] **Step 8** — Change `apps/worker/src/logger.ts`: the denylist becomes `LOG_FIELD_NAMES ∪ WORKER_LOG_FIELD_NAMES` with the value and event rules; keep the index-signature `LogFields` type (`pg-boss-queue.ts` relies on it); envelope `{...kept, ts, level, event}`. In `apps/worker/src/logger.test.ts` replace "redacts email, token, body, filename and password fields" with "drops email, token, body, filename and password fields" (reason recorded in the test file's step note: the allowlist replaces the denylist); add `eventName` kept and a `message` with a path written as `[scrubbed]`. Check `logger.levels.test.ts`; change it only if it asserts the denylist.
- [ ] **Step 9** — Route the worker's console calls (BR6.7, BR6.8): `apps/worker/src/main.ts:155` → `logger.error('worker.crashed', {errorName})` with a `JsonLogger` built before `main()`; `main.ts:78` `fix: 'pnpm db:reset'` → `fix: 'db.reset_required'`; `apps/worker/src/env.ts:72,80` → `new JsonLogger().error('worker.env_invalid', {code, variables})` with `code` `database_url_worker_required` or `env_invalid` and only the variable names. Update `apps/worker/src/env.load.test.ts` to assert the code and the event (reason: the old sentences carried zod issue text) and `main.test.ts` if it asserts the old `fix`. Run the worker unit tests.
- [ ] **Step 10** — Route the web's console calls: `packages/i18n/src/request.ts:32` takes an optional `onIntlError(code)` reporter (extend `packages/i18n/src/request.test.ts`: the reporter gets the code, nothing is printed); `apps/web/src/i18n/request.ts` wires it to `logger.error('i18n.message_error', {errorCode})`, with a test that a missing key writes `errorCode: MISSING_MESSAGE` and nothing else; `apps/web/src/server/actions/review.ts:228` → `logger.error('review.action_failed', {command: action, errorName})` through the container's logger (keep `review.test.ts` green; adjust only a console spy if one exists). Any other call Step 4 found is routed the same way or gets an `ISS-` row against its owner.
- [ ] **Step 11** — `eslint.config.mjs`: `no-console: ['error']` with no allowed method for `apps/*/src/**` and `packages/*/src/**`, with file-level exceptions for `apps/web/src/server/logger.ts`, `apps/worker/src/logger.ts`, `packages/database/src/migrate.ts` and `packages/database/src/reset.ts`, each with its reason in a comment. Prove it fails: run `pnpm lint` once with a temporary `console.log` in an `apps/web/src` file, then remove it (or, if the flat config cannot scope it, add `apps/web/src/lib/security/__tests__/no-console.test.ts` that walks the same files). Run `timeout 600 pnpm lint` green.

**Phase C — business logic: the pure `lib/security` helpers** (`lib/` may import only `contracts` and `i18n`, no Node built-in, BR7.3)

- [ ] **Step 12** — Implement `apps/web/src/lib/security/settings.ts` (`parseSecuritySettings`, `SecuritySettingsError` naming the variable, never the value; BR3.1, BR7.1). Then write and run `lib/security/__tests__/settings.test.ts` (design § 8.1 list).
- [ ] **Step 13** — Implement `lib/security/csp.ts` (`newNonce` with Web Crypto, 16 bytes; `buildCsp`; `CSP_DIRECTIVE_ORDER`; BR1.1–BR1.3). Then write and run `__tests__/csp.test.ts`: the exact string per row of design § 4.3, and the FR99 guard (no host, scheme or wildcard source in any directive).
- [ ] **Step 14** — Implement `lib/security/headers.ts` (`STATIC_SECURITY_HEADERS`, `API_CSP`, `PRIVATE_PATH_PATTERNS`, `securityHeaderRoutes()`, `HSTS_VALUE`; BR1.6, BR2.1, BR2.2, BR2.4). Then write and run `__tests__/headers.test.ts`.
- [ ] **Step 15** — Implement `lib/security/origin.ts` (`checkHost`, `checkOrigin`, `checkRequest`, `isSafeMethod`; lower-casing and default-port removal; BR3.2, BR3.3). Then write and run `__tests__/origin.test.ts`: every row of design § 4.1 plus the listed host tricks.
- [ ] **Step 16** — Implement `lib/security/refusal.ts` (`refusalResponse`, `REFUSAL_MESSAGE_KEYS`: `errors.common.forbidden`, `errors.common.validation`, `errors.common.internal`, all present in both dictionaries; BR3.6) and `lib/security/request-limits.ts` (`UPLOAD_OVERHEAD_BYTES = 65_536`, `checkDeclaredLength`, `readCappedFormData` per WF3; BR4.2, BR4.3). Then write and run `__tests__/refusal.test.ts` and `__tests__/request-limits.test.ts` (`// @vitest-environment node`; the 16 MB chunked stream is cancelled before it is fully pulled).
- [ ] **Step 17** — Implement `lib/security/nonce.ts` (`readNonce()` through `next/headers`; BR1.5). Then write and run `__tests__/sweep.test.ts` (no `<script`, `dangerouslySetInnerHTML`, `javascript:` or string `on…=` handler in non-test files under `apps/web/src`; `next/script` only beside `readNonce`) and a `readNonce` case in `__tests__/nonce.test.ts`. Run `timeout 600 pnpm lint:boundaries` to confirm `lib/security` stays inside `web-shared`.

**Phase D — API / endpoint: settings, proxy, config, pins**

- [ ] **Step 18** — Implement `apps/web/src/server/security-settings.ts` (`getSecuritySettings()` memoised through `optionalEnv` of `server/env.ts`; `guardRouteRequest(request) → Response | null` with one `security.request_refused {kind, status, correlationId}` line; `security.settings_invalid` once per process; BR3.4, BR3.6, BR7.1, BR7.2). Then write and run `server/security-settings.test.ts`.
- [ ] **Step 19** — Rewrite `apps/web/src/proxy.ts`: the new `config.matcher` (every path except `api/evidence/upload`, `_next/static`, `_next/image`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `manifest.webmanifest`; ENT-016); WF1 (settings, Host, Origin for unsafe methods, nonce, request headers `x-pathname`, `x-nonce`, `content-security-policy` overwritten, next-intl, the R-07 fallback when `x-middleware-override-headers` is absent, CSP and HSTS on the response); WF2 for `/api/*` (no next-intl, no nonce); WF2b for other `/_next/*` and `/__nextjs*` (Host only).
- [ ] **Step 20** — Extend `apps/web/src/proxy.test.ts` (existing four cases unchanged) with every case of design § 8.1 "proxy.test.ts", including the matcher list, the dotted path `/en/experiences/abcdefghij-a.b`, `/_next/webpack-hmr`, and the malformed path `/en/%E0%A4%A` through the fallback.
- [ ] **Step 21** — `apps/web/next.config.ts` (WF5): read `APP_URL` and `APP_ALLOWED_ORIGINS` through `optionalEnv` and `parseSecuritySettings` (no `APP_URL` → `allowedOrigins: []`); `headers()` returns `securityHeaderRoutes()`; keep `poweredByHeader: false`; set `experimental.serverActions.allowedOrigins`. BR4.6: `grep -rn "formData\|File" apps/web/src/server/actions` for any action that still takes a file. If none (U48 removed the demo upload action), set `bodySizeLimit` and `proxyClientMaxBodySize` to `1mb`; if a caller is left, keep `11mb` and add an `ISS-` row for U50. Run `timeout 600 pnpm --filter @rogikotha/web build`.
- [ ] **Step 22** — Write and run `apps/web/src/server/security-cookies.test.ts` (BR3.7, BR5.1; `buildTestLibrary` for `http://localhost:3000` and `https://demo.rogikotha.local`: name, `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure`, no `domain`; `trustedOrigins` is `[APP_URL]`; `/api/auth/get-session` answers 404). No change to `server/auth.ts` or `server/better-auth/*`.
- [ ] **Step 23** — Write and run `apps/worker/src/log-scrub.test.ts` (BR6.6; design § 8.2: outbox relay `logOutcomes`, `job.failed` with an address and a path, the top-level `worker.crashed` path, `loadEnv` with `APP_MODE=LOGSCRUB-ENV-7Q`, the queue mismatch `fix: 'db.reset_required'`). U48's processor case is added in Step 32.

**Phase E — environment, build, browser and smoke**

- [ ] **Step 24** — `infra/compose/.env.example`: add the `APP_ALLOWED_ORIGINS` line with a comment, and correct the `APP_MODE` comment to say the start-up assertion is deferred (FD-105). `apps/web/playwright.config.ts`: `webServer.env = { APP_ALLOWED_ORIGINS: ORIGIN }` (risk R5).
- [ ] **Step 25** — Smoke: add `apps/web/src/proxy.smoke.test.ts` (`// @vitest-environment node`): `/en` and `/en/experiences/<synthetic id>-a.b` get a CSP with a nonce and no `'unsafe-eval'`; `Host: evil.example` gets 403 on both; a cross-origin POST to the dotted path gets 403 and a same-origin one passes. Run it, then `timeout 600 pnpm smoke`; the suite only grows.
- [ ] **Step 26** — Write `apps/web/e2e/smoke/security-headers.spec.ts` (design § 8.4: BR2.1 headers on `/en` and `/bn`, no `X-Powered-By`, nonce rotation and every `<script>` carrying it, zero CSP violations on five pages per locale, the ENT-011 cookie jar after sign-in, no request off the app's origin). Run `timeout 900 pnpm --filter @rogikotha/web build` then `timeout 900 pnpm --filter @rogikotha/web smoke:e2e`; `demo.spec.ts` and `motion.spec.ts` stay green.
- [ ] **Step 27** — Two trials. (a) BR1.4: if the e2e run shows CSP violations on the root not-found page, add one `await connection()` line to `apps/web/src/app/not-found.tsx` and re-run; if it does not fix it, revert the line and add the conditional S3 row. (b) WF5 step 3: `next build` with one `APP_ALLOWED_ORIGINS`, `next start` with another, and a cross-origin server-action POST from the second; record whether the value is fixed at build time (conditional S4 row and a "rebuild after changing" note in `.env.example` and the threat notes).

**Phase F — API / endpoint: the upload route (last code step; only after U48 is merged on `main` and the branch is rebased)**

- [ ] **Step 28** — Rebase onto `main` with U48. Re-run Step 4's console grep (U48's files included) and Step 21's body-limit grep. Read U48's route, its test helper and the key it maps `evidence.too_large` to; note any rename in `code-summary.md`.
- [ ] **Step 29** — Edit `apps/web/src/app/api/evidence/upload/route.ts`, two places only (WF3, BR4.4): at U48 step 1, `guardRouteRequest(request)` then `checkDeclaredLength(request.headers, UPLOAD_MAX_REQUEST_BYTES)` with `UPLOAD_MAX_REQUEST_BYTES = EVIDENCE_MAX_FILE_BYTES + UPLOAD_OVERHEAD_BYTES` (400 `validation`, 413 `evidence.too_large` with `Connection: close`); at U48 step 4, `request.formData()` → `readCappedFormData(request, UPLOAD_MAX_REQUEST_BYTES)`. Nothing else in the file changes.
- [ ] **Step 30** — Update U48's upload route test helper to add `origin: 'http://localhost:3000'` and `host: 'localhost:3000'` (no U48 assertion changes) and run U48's route tests green. Then write and run `apps/web/src/app/api/evidence/upload/route.security.test.ts` (`// @vitest-environment node`; every case of design § 8.3, including a body whose `pull` throws to prove it is never read).
- [ ] **Step 31** — Consumer tests for the 413 (R-04): a new test file beside `EvidenceUploader` in `apps/web/src/components/patient/evidence/` and, if U47's composer calls the upload route, one beside the composer: a `413` with the AppError body shows "Each file must be 15 MB or smaller." in `en` and "প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।" in `bn`. No component change; if a test fails because the component reads the status, record an S2 row against the owning Unit.
- [ ] **Step 32** — Write and run `apps/web/src/server/log-scrub.int.test.ts` (`web-int`, design § 8.2) against the assigned test database: register `mitu.logscrub.demo@example.test`, sign in, publish a review with `LOGSCRUB-EN-7Q` and `লগস্ক্রাব-বাংলা`, upload `logscrub-রিপোর্ট-7Q.png` through U48's commands, an over-limit upload and an unknown review id, a 40-character token through a cast; assert no marker in the captured output. Add U48's processor case to `apps/worker/src/log-scrub.test.ts`. If U49 is not on `main`, add the conditional S4 row for comments.

**Phase G — gate, adversarial tests, sign-off and records**

- [ ] **Step 33** — Gate: `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green, plus `timeout 600 pnpm test:int` and the Step 26 e2e run. `apps/web`, `apps/worker`, `packages/application` and `packages/i18n` stay at or above 80% lines (never lowered, D10). Run the acceptance curls of design § 8.4 and record expected against observed for Build and Test.
- [ ] **Step 34** — Adversarial tests (high-risk Unit, team practice step 5). A separate agent, not the one that wrote the code, writes and runs A1–A5 of design § 8.5 (header spoofing, upload size bypass with RSS measured, CSP and nonce payloads in both locales, log leak with `LOGSCRUB-THROW-7Q`, cookies and cross-site use). Files: `apps/web/src/lib/security/__tests__/security.adversarial.test.ts`, `apps/web/src/app/api/evidence/upload/route.adversarial.test.ts`, and `apps/web/src/server/security.adversarial.int.test.ts` for the database-backed cases. Fix everything they break, add an `ISS-` row per break, and re-run Step 33. What Next.js or Node prints on its own for the unhandled throw is recorded as the § 6 residual, not as a pass.
- [ ] **Step 35** — Delegated sign-off: in `construction/t-502-security-hardening/code-generation/code-summary.md` under `## Sign-off`, written by the agent and labelled "delegated by the owner on 2026-11-04", naming the adversarial results, the gate counts and any open `ISS-` rows.
- [ ] **Step 36** — `docs/security/local-demo-threat-notes.md` (BR8.2): the threat table of design § 6 with each row's test, the residuals, the ENT-011 cookie table with each row's test, and the `db.reset_required` explanation (BR6.8).
- [ ] **Step 37** — Contract and decision records: the dated C14 release-1 amendment block of design § 9, appended under C14 in `inception/contract-design/contract-summary.md`; the `## Amendments — release 1 (FD-105)` section above "Goal" in `docs/implementation/tasks/T-502-security-hardening.md` (WF6 step 10b); the FD-next row of design § 9 appended to `docs/status/decision-log.md`, numbered at merge after U46's FD-106 to FD-108, marked "awaiting the owner's confirmation".
- [ ] **Step 38** — Records: `docs/implementation/ISSUES.md` gets the rows of design § 10 plus every defect, workaround or `ASSUMPTION(U41)` from Steps 1–34, each with a severity and `Found in U41 t-502-security-hardening`, taking the next free `ISS-` numbers at merge time; `code-summary.md` (inventory, before and after coverage, "Issues found and fixed in U41" for the Build and Test record); `traceability.json` (step → BR → AC); `source-manifest.json` with literal paths only (the bracketed route paths are listed in `code-summary.md`). Final `pnpm format:check`, `pnpm check` and `pnpm smoke`.

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–3 | — (baseline, dependency check) | — |
| 4–8 | BR6.1, BR6.2, BR6.3, BR6.4, BR6.5 | US12.3 (AC12.3.3), US12.4 (AC12.4.3), US7.1 (AC7.1.6) |
| 9–11 | BR6.7, BR6.8 | US12.3 (AC12.3.3) |
| 12 | BR3.1, BR7.1 | US12.3 |
| 13 | BR1.1, BR1.2, BR1.3 | US12.4 (AC12.4.1, AC12.4.3) |
| 14 | BR1.6, BR2.1, BR2.2, BR2.4 | US7.1 (AC7.1.6), US12.3 |
| 15–16 | BR3.2, BR3.3, BR3.6, BR4.2, BR4.3 | US7.1 (AC7.1.3), US12.3 |
| 17 | BR1.5, BR7.3 | US12.4 (AC12.4.1) |
| 18–20 | BR1.1, BR2.4, BR3.2, BR3.3, BR3.4, BR3.6, BR7.1, BR7.2 | US12.3, US12.4 (AC12.4.1) |
| 21 | BR2.1, BR2.2, BR2.3, BR3.5, BR4.6, BR7.1 | US12.3, US7.1 (AC7.1.6) |
| 22 | BR3.7, BR5.1 | US12.4 (AC12.4.2) |
| 23 | BR6.6, BR6.8 | US12.3 (AC12.3.3) |
| 24–27 | BR1.4, BR2.1, BR3.5, BR5.2 | US12.4 (AC12.4.1, AC12.4.2) |
| 28–31 | BR3.4, BR4.1, BR4.2, BR4.3, BR4.4, BR4.5 | US7.1 (AC7.1.3) |
| 32 | BR6.6 | US12.3 (AC12.3.3), US7.1 (AC7.1.6) |
| 33–35 | all, through the gate and A1–A5 | US12.3, US12.4, US7.1 |
| 36–38 | BR8.1, BR8.2 | — |

Not covered by U41 (design `traceability.json`): AC3.1.5 (US3.1; the FD-072 sign-in-delay test is deferred to release 2 by FD-105; U8 already ran adversarial tests on the delay). Also deferred by FD-105 and recorded as S4 rows only: the per-command rate-limit table and `network-key.ts`, `assertAppMode()`, the PWA `worker-src` / `manifest-src`.

## Owned paths

- `apps/web/src/proxy.ts`, `apps/web/src/proxy.test.ts`, new `apps/web/src/proxy.smoke.test.ts`
- `apps/web/src/lib/security/` (new: `settings.ts`, `csp.ts`, `headers.ts`, `origin.ts`, `refusal.ts`, `request-limits.ts`, `nonce.ts`, `__tests__/`)
- `apps/web/next.config.ts`
- `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/admin/layout.tsx` (no edit planned, Q10)
- `apps/web/src/server/auth.ts` (no edit planned)
- `apps/web/src/server/logger.ts` and `logger.test.ts`
- `apps/worker/src/logger.ts`, `logger.test.ts`, `logger.levels.test.ts` (only if it asserts the denylist)
- new files claimed by U41: `apps/web/src/server/security-settings.ts` and `security-settings.test.ts`, `apps/web/src/server/security-cookies.test.ts`, `apps/web/src/server/log-scrub.int.test.ts`, `apps/web/src/server/security.adversarial.int.test.ts`, `packages/application/src/ports/log-policy.ts` and `log-policy.test.ts`, `apps/worker/src/log-scrub.test.ts`, `apps/web/e2e/smoke/security-headers.spec.ts`
- the guard lines and the form-parse line in `apps/web/src/app/api/evidence/upload/route.ts`, and the new `route.security.test.ts` and `route.adversarial.test.ts` beside it
- `infra/compose/.env.example` (`APP_ALLOWED_ORIGINS`, the `APP_MODE` comment)
- `docs/security/` (new `local-demo-threat-notes.md`)

Not touched: `.github/workflows` (FD-102), `apps/web/src/app/api/auth/[...all]/route.ts` (FD-104), `apps/web/src/server/better-auth/*` source, `packages/application/src/command.ts`, anything for `RATE_LIMITS`, `network-key.ts` or `assertAppMode`.

## Shared files (append-only or the one line named)

| File | U41 use |
|---|---|
| `packages/application/src/index.ts`, `packages/application/src/worker.ts` | one export line each for `log-policy.ts` (Step 5) |
| `packages/application/src/ports/logger.ts` | one optional `LogFields` property per id or code field Step 4 finds; else unchanged |
| `apps/worker/src/main.ts`, `apps/worker/src/env.ts`, `apps/worker/src/env.load.test.ts` | the console lines and the `fix` value (Step 9) |
| `packages/i18n/src/request.ts`, `packages/i18n/src/request.test.ts`, `apps/web/src/i18n/request.ts` | the optional `onIntlError` reporter and its wiring (Step 10) |
| `apps/web/src/server/actions/review.ts` | line 228 only (Step 10) |
| `eslint.config.mjs` | the `no-console` scope and its four file exceptions (Step 11) |
| `apps/web/playwright.config.ts` | the `webServer.env` line (Step 24) |
| `apps/web/src/app/not-found.tsx` | one `await connection()` line, only if it removes the violations (Step 27) |
| `apps/web/src/app/api/evidence/upload/route.ts` (U48) | the guard lines and the form-parse line only (Step 29) |
| U48's upload route test helper | the `origin` and `host` headers only (Step 30) |
| new consumer test files beside `EvidenceUploader` (U48) and U47's composer | new files; no component change (Step 31) |
| `packages/i18n/messages/en.json`, `bn.json` | not expected: U41 adds no key and reuses `errors.common.forbidden`, `errors.common.validation` and U48's too-large key, all present in both files; if a key turns out to be missing, add it to both files in the same commit and regenerate `keys.ts` with its script |
| `inception/contract-design/contract-summary.md` | the dated C14 note (Step 37) |
| `docs/implementation/tasks/T-502-security-hardening.md` | the amendments section (Step 37) |
| `docs/status/decision-log.md` | the FD-next row, numbered at merge (Step 37) |
| `docs/status/dependency-check-log.md` | one entry (Step 2) |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of rows U41 fixes (Step 38) |

Merge rules: on rebase, keep both sides of every append-only file and regenerate `keys.ts` if it changed. U41 adds no migration; if one were ever needed, it takes the next free number at merge time, not at build time. Shared demo code is deleted only when a grep shows no caller left on the rebased branch; otherwise it stays and U50 removes it. U41 deletes no demo code: the demo upload action is U48's to remove, and U41 only lowers the body limits once the Step 21 grep shows no file-carrying action left.

## Design decisions taken

Q1–Q10 and the review points R-01 to R-08 were decided in the Functional Design under the owner's delegation of 2026-11-04. The FD-next row (design § 9) is recorded as "awaiting the owner's confirmation". High-risk Unit: the sign-off in Step 35 is agent-written and labelled "delegated by the owner on 2026-11-04".

Applicable layers: business logic (the log policy and the pure `lib/security` helpers, Steps 4–17), API and endpoint (the proxy, `security-settings.ts`, `next.config.ts`, the pins and the upload route, Steps 18–23 and 28–32), frontend behaviour (only the 413 consumer tests, Step 31, and the browser spec, Step 26). Data model and repository layers have no change: no table, migration, repository or command. Environment and build configuration: Steps 21, 24 and 27. Documentation and traceability: Steps 36–38.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "classic",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: `01-conventions.md` §10 sets per-level test minimums that each task delivers together with its code, and §13's definition of done requires them green before hand-off. In git history, tests land in the same task commit as the implementation (for example T-007 and T-009). No source asks for tests to be written before the code, and test-after is the `org.md` default for the `classic` scope.\n- **Ordering**: Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.\n- Test levels follow `01-conventions.md` §10: domain (every state-transition table and policy function), application (each command's happy path, each authorization refusal and one audit assertion, using `test-support` fakes), database (`*.int.test.ts`, each repository method, migrations apply from empty), component (renders in both `en` and `bn`), and end-to-end with Playwright and axe from T-503.\n- Cumulative smoke suite: each unit adds at least one smoke assertion for what it delivered (`*.smoke.test.ts(x)`, and from T-503 also `apps/web/e2e/smoke/*.spec.ts`). `pnpm smoke` runs the whole suite every time. The suite only grows: removing or skipping a smoke assertion needs a recorded reason.\n- Integration tests: `pnpm test:int` runs the database project against `DATABASE_URL_TEST` (the `rogikotha_test` database, separate from the development database). It resets that database to an empty, freshly migrated schema and runs test files serially. It needs the compose PostgreSQL running.\n- Coverage: an 80% line-coverage floor per package, measured with Vitest `@vitest/coverage-v8` (already installed). T-010 adds the thresholds and the CI run before merge, and raises any package below 80%. Until T-010 lands, the floor cannot be measured: no Vitest config has a coverage block yet. Work before T-010 (CR-009) records \"coverage not measured yet\" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (the empty `domain`, `application` and `adapters` packages are exempt until then). We do not claim a coverage figure we have not measured, and once the floor exists it is never lowered to make a step pass (D10).\n- Existing suites stay green: `pnpm check` (typecheck, lint, unit and integration tests, i18n parity, build) and `pnpm smoke` must pass after every unit, with no assertion removed or skipped. In brownfield work we run the full suite before changing anything, to record a baseline.\n- Test names read as sentences. We use builders, not hand-written fixture objects, and we never assert on implementation details (class names, internal calls). A test must be able to fail.\n- UI units also pass `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` cleanly before they are done (`01-conventions.md` §7.8)."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:eb26df65a70c60644a0bdc6b6fa19a28a2583bae7b61a57b814612d8ad43ebb9",
  "contract_sha256": "sha256:57d068825625cb257445b363810a0b4bbe01d375329dd0df119f640f95c1c9f4"
}
```
