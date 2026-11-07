# Unit test instructions — U41 `t-502-security-hardening`

## Framework

Vitest 4 (4.1.11) through `vitest.workspace.ts`, which lists the workspace projects. U41 uses these:

- `application` (`packages/application/vitest.config.ts`, node): `ports/log-policy.test.ts` and the unchanged `worker-subpath.test.ts`.
- `web` (`apps/web/vitest.config.ts`, jsdom): `lib/security/__tests__/`, `proxy.test.ts`, `proxy.smoke.test.ts`, `server/logger.test.ts`, `server/security-settings.test.ts`, `server/security-cookies.test.ts`, the i18n reporter test, the upload `route.security.test.ts` and the 413 consumer tests. Files that use Web streams or `Request` bodies start with `// @vitest-environment node` (`request-limits.test.ts`, `proxy*.test.ts`, `route.security.test.ts`).
- `worker` (`apps/worker/vitest.config.ts`, node): `logger.test.ts`, `logger.levels.test.ts`, `env.load.test.ts`, `main.test.ts`, `log-scrub.test.ts`.
- `i18n` (`packages/i18n/vitest.config.ts`): `request.test.ts` for the `onIntlError` reporter.
- `web-int` (node, serial, group 3): `server/log-scrub.int.test.ts` and `server/security.adversarial.int.test.ts`, against `DATABASE_URL_TEST`.

Playwright only where the design asks: `apps/web/e2e/smoke/security-headers.spec.ts` (design § 8.4), run against a production build. Coverage uses `@vitest/coverage-v8`.

## Where it runs

The Unit runs in its own git worktree. `DATABASE_URL_TEST` points at the test database the orchestrator assigned (`rogikotha_wN_test`, because the reset guard accepts only names ending in `_test`), never at another worktree's database. There is no CI (FD-102): these commands and the gate run locally only. Run only one database-touching command at a time (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).

## Run this Unit's tests

Every long command carries an outer `timeout`. Run from the worktree root. Step 3 runs the existing files below before any change and records the count in the plan.

```bash
pnpm infra:up

# Log policy (application) and the worker subpath guard:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project application packages/application/src/ports/log-policy.test.ts packages/application/src/worker-subpath.test.ts

# Web logger:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/logger.test.ts

# Worker logger, console routing and worker log scrubbing:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project worker apps/worker/src/logger.test.ts apps/worker/src/logger.levels.test.ts apps/worker/src/env.load.test.ts apps/worker/src/main.test.ts apps/worker/src/log-scrub.test.ts

# i18n reporter (package side, then the web wiring and the review action):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project i18n packages/i18n/src/request.test.ts
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/i18n/ apps/web/src/server/actions/review.test.ts

# Pure security helpers (settings, csp, headers, origin, refusal, request-limits, nonce, sweep):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/lib/security/

# Settings reader, proxy, cookie and trustedOrigins pins:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/server/security-settings.test.ts apps/web/src/proxy.test.ts apps/web/src/server/security-cookies.test.ts

# Upload route (Phase F, after U48 is merged): U48's route tests with the updated helper, then U41's security test:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/app/api/evidence/upload/

# 413 consumer tests (Phase F):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/components/patient/evidence/

# Web log-scrub integration against the assigned test database:
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/log-scrub.int.test.ts

# The Unit's smoke file, then the whole cumulative smoke suite:
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/proxy.smoke.test.ts
timeout 600 pnpm smoke

# Browser spec (after a production build):
timeout 900 pnpm --filter @rogikotha/web build
timeout 900 pnpm --filter @rogikotha/web exec playwright test e2e/smoke/security-headers.spec.ts

# Adversarial tests (Step 34, written by a separate agent):
timeout 300 pnpm exec vitest run --config vitest.workspace.ts --project web apps/web/src/lib/security/__tests__/security.adversarial.test.ts apps/web/src/app/api/evidence/upload/route.adversarial.test.ts
timeout 600 pnpm exec vitest run --config vitest.workspace.ts --project web-int apps/web/src/server/security.adversarial.int.test.ts

# Lint (no-console, boundaries) and the gate:
timeout 600 pnpm lint
timeout 600 pnpm lint:boundaries
timeout 1200 pnpm check
timeout 600 pnpm test:int
```

If a bracketed or parenthesised path does not match in the shell, pass it in quotes. Never replace a filter with a bare project-wide command when running the Unit's own tests; the gate commands at the end (`pnpm smoke`, `pnpm lint`, `pnpm check`, `pnpm test:int`, the full `smoke:e2e`) are the only whole-suite runs.

## What to cover (`functional-spec.md` § 8)

| Group | Tests |
|---|---|
| Log policy | `LOG_FIELD_NAMES` equals the `LogFields` keys; every BR6.2 value class (UUID, `account.signIn`, `errors.auth.rateLimited`, 42 kept; an address, a review sentence, Bengali text, `C:\\x`, `/tmp/x`, a 64-hex hash, a 40-character base64 token, `report.png`, `রিপোর্ট.jpg`, a quoted message, an object, a 25-item array handled as specified); event shape including `Signed in shirin.demo@example.test` → `log.invalid_event`; an unknown `reporterAccountId` dropped |
| Loggers | web: `@` value scrubbed, invalid event replaced, envelope not overwritable; worker: email, token, body, filename and password keys dropped, `eventName` kept, a `message` with a path scrubbed |
| Console routing | `worker.crashed`, `worker.env_invalid` naming variables only, `fix: 'db.reset_required'`, `i18n.message_error` with `MISSING_MESSAGE`, `review.action_failed`; the `no-console` rule fails on a stray call |
| `settings.ts` | APP_URL's origin first; list parsing, default ports removed, lower-casing, duplicates collapsed; path, query, fragment, credentials, `*`, `ftp:`, bare host and 11 entries refused with an error naming the variable, never the value |
| `csp.ts` | exact string per row of design § 4.3; `'unsafe-eval'` only in development; no `'unsafe-inline'` in `script-src`; no nonce in `style-src`; nonce once, 16 bytes, two differ; no host, scheme or wildcard source (FR99 guard) |
| `headers.ts` | six static headers on `/:path*`; `API_CSP` on `/api/:path*`; X-Robots-Tag on each private pattern and on no public page; no HSTS in the static list |
| `origin.ts` | every row of design § 4.1 and the listed host tricks (`LOCALHOST:3000`, `localhost:3000.evil.example`, `localhost.:3000`, userinfo, the https twin, a second allowed origin, two X-Forwarded-Host values) |
| `request-limits.ts` | declared length at the cap passes, one byte more `too_large`; `abc`, `-1`, 16 digits `length_invalid`; counted stream at the cap parses, one byte more errors; a 16 MB chunked stream is cancelled before it is fully pulled; non-multipart and null bodies `malformed` |
| `refusal.ts`, sweep | empty proxy body with `no-store`; AppError route body per kind; no header value echoed; no inline script, handler or `javascript:` in `apps/web/src` |
| `security-settings.ts` | memoised; an invalid list gives 500 and one `security.settings_invalid` line |
| Proxy | the cases of design § 8.1: nonce on request and response, client `x-nonce` and CSP overwritten, HSTS only on https, unknown Host 403 with next-intl never called, cross-origin POST 403, `/api/health` and `/_next/webpack-hmr` skip next-intl, the matcher list, the dotted path, the R-07 fallback on `/en/%E0%A4%A` |
| Pins | session cookie name, `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure`, no `domain` for http and https; `trustedOrigins` is `[APP_URL]`; `/api/auth/get-session` 404 |
| Upload route | cross-origin, cross-site and unknown Host 403 with no command run; `Content-Length: 15794177` 413 before the body is read; chunked 16 MB 413 with bounded bytes pulled; U48's per-file 400 and `type_rejected` unchanged; every 413 body is the AppError with U48's `messageKey` |
| Consumers | the 413 shows the localized too-large text in `en` and `bn`, no generic failure text |
| Integration | no address, review marker, file name part or token in either logger's output (web and worker) |
| Smoke | `/en` and the dotted page path get a nonce CSP; `Host: evil.example` 403; cross-origin POST to the dotted path 403, same-origin passes |
| Browser | headers on `/en` and `/bn`, no `X-Powered-By`, nonce rotation, zero CSP violations on five pages per locale, ENT-011 cookie jar, no off-origin request |
| Adversarial | A1–A5 of design § 8.5, by a separate agent |

Each test must be able to fail. Test names read as sentences. Never assert on class names or internal calls.

## Coverage

80% lines per package, measured by `pnpm check` (`pnpm test:coverage`). The packages that move are `apps/web`, `apps/worker`, `packages/application` and `packages/i18n`; each stays at or above 80% and the floor is never lowered to pass (D10). Record the before (Step 1) and after (Step 33) figures in `code-summary.md`.

## Mocking and test data

- Application ports: the `test-support` fakes and builders, never hand-written fixture objects. In `apps/web` tests use the helpers that already wrap them (`server/request-context-test-support.ts`, `server/better-auth/library-test-support.ts` for `buildTestLibrary`, and U48's upload route test helper), because nothing in `apps/*` may import `test-support` directly.
- Requests: build them with `new NextRequest(url, {headers, method, body})`; streams for the size tests are generated in the test (a `ReadableStream` that yields synthetic bytes and records how much was pulled), never a file on disk.
- Logs: capture `process.stdout.write` and `console.*` as `auth.int.test.ts` does, and assert on the captured text.
- Environment: set `APP_URL`, `APP_ALLOWED_ORIGINS` and `NODE_ENV` per test with `vi.stubEnv` and reset the memoised settings between tests.
- Data: synthetic only. Every address uses `example.test` (for example `mitu.logscrub.demo@example.test`), every name, review text and file name is invented, and the markers (`LOGSCRUB-EN-7Q`, `লগস্ক্রাব-বাংলা`, `logscrub-রিপোর্ট-7Q.png`, `LOGSCRUB-THROW-7Q`) are the only values the scrub tests search for.
