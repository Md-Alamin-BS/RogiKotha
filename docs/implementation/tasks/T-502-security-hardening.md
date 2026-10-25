# T-502 — Security hardening: CSP, origin checks, rate limiting, upload limits, cookies, log scrubbing

| Field | Value |
|---|---|
| Story | STORY-OPS-001 (NFR-001–003 subset applicable locally), STORY-AUTH-001 (rate limits, CSRF, cookies), STORY-EVID-001 (upload limits) |
| Phase / Lane | 5 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol (or Opus 5 if Sol implemented) **plus founder approval** |
| Effort setting | Opus `xhigh`; Sol `high` |
| Estimate | 4–5 h agent; validation 2 h |
| Depends on | T-101, T-103, T-303, T-401, T-403, T-405, T-410, T-501 (so the CSP covers `sw.js` and the manifest routes) |
| Parallel-safe with | T-503 (coordinate: T-503 reruns after this merges), T-406–T-409 (no shared files except `next.config.ts`, which only this task edits) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-072** — T-502 builds **no** FD-058 code. T-101 builds the progressive sign-in delay and the severe-activity email and its outbox event, T-105 registers the settings, and T-405 creates the in-app notice. T-502 adds 3–5 adversarial tests that try to break the delay and the notice — timing bypass, account enumeration through delay differences, and counter reset — and keeps the rest of its scope. Changes Owned paths, Not in scope, new step 11, the acceptance checks, the tests and the threat notes.

## Goal

Close the cross-cutting gaps that individual feature tasks were told not to own: a nonce-based
Content Security Policy and the standard security headers, origin/host validation for server
actions and route handlers, the `RateLimiter` wired to every command that 03 §4 assigns a rate,
streaming upload limits that abort on overflow, a documented cookie posture, a proven log-scrubbing
guarantee, and the `APP_MODE` start-up assertion (AD-14). Everything here is verified by a test,
not by a checklist.

## Read first

1. `docs/implementation/00-master-plan.md` §3, §4, §7
2. `docs/implementation/01-conventions.md` §3, §5, §11, §13, §14
3. `docs/implementation/03-routes-and-contracts.md` §1 (route handlers), §3 (`RateLimiter`, `Logger` ports), §4 (every "rate" annotation: `account.resendVerification` 3/h/email, `account.submitFeedback` 5/day, `directory.submitProfile` 5/day, `review.publish` 5/day, `comment.post` 30/h, `reaction.set` 100/h; plus sign-in attempts from T-101)
4. `docs/planning/05-recommended-architecture.md` "Security and privacy controls" (the list this task implements) and "Product modes"
5. `docs/architecture/ARCHITECTURE-SPINE.md` AD-13, AD-14, AD-15
6. `docs/planning/10-validation-strategy.md` "Authentication and identity" and "Evidence" gates
7. The current `apps/web/next.config.ts`, `apps/web/src/server/auth.ts`, `apps/web/src/app/api/evidence/upload/route.ts`, `apps/web/src/server/container.ts`, `packages/adapters/src/rate-limit-memory/`, `packages/adapters/src/logger/` (whatever T-001/T-009 named it)
8. Next.js 16 docs for `headers()`, `serverActions.allowedOrigins`, and nonce CSP with the App Router (verify against the pinned 16.3.4 — re-check `docs/status/dependency-check-log.md` first)

## Owned paths

Create:
- `apps/web/src/proxy.ts` (Next 16 renamed `middleware` → `proxy`; generates the per-request nonce, sets the CSP header, adds `x-nonce` for the layout, rejects unknown `Host`)
- `apps/web/src/lib/security/csp.ts` (builds the policy string from a typed object; unit-tested)
- `apps/web/src/lib/security/origin.ts` (`assertSameOrigin(request)` for route handlers)
- `apps/web/src/lib/security/network-key.ts` (`networkKey(request)` = sha256(ip + '|' + uaFamily) truncated; documented)
- `packages/application/src/rate-limits.ts` (the single table `RATE_LIMITS: Record<commandName, {limit, windowSec, scope: 'account'|'network'|'email'}>`)
- `packages/application/src/define-command.ts` (modify — see below) 
- `apps/web/src/server/app-mode.ts` (`assertAppMode()`: reads `APP_MODE`, checks `demo_clock` table presence vs mode, refuses `production` with `MAILPIT`/localhost SMTP, refuses `demo|development` without the synthetic marker enabled)
- `apps/web/src/lib/security/__tests__/*.test.ts` (including `sign-in-delay.adversarial.int.test.ts`, FD-072), `packages/adapters/src/logger/scrub.test.ts`, `apps/web/e2e/security-headers.spec.ts`
- `docs/security/local-demo-threat-notes.md` (the threat notes section below, expanded with test names — required by AD-16 for M3 work)

Modify:
- `apps/web/next.config.ts` — `headers()` (all non-CSP headers), `poweredByHeader: false`, `experimental.serverActions.allowedOrigins` from `APP_ALLOWED_ORIGINS`
- `apps/web/src/app/[locale]/layout.tsx` and `apps/web/src/app/[locale]/admin/layout.tsx` — read the nonce from headers, pass it to the theme `<script nonce>` and to `next/script` usages; remove any remaining inline handlers
- `packages/application/src/define-command.ts` — `rateLimit` option resolved from `RATE_LIMITS` by command name; `hit()` before `authorize()`; returns `err('rate_limited')` with `retryAfter` in `fieldErrors`? no — in `AppError.details`? Add `retryAfterSec?: number` to `AppError` in `packages/contracts/src/errors.ts` (owned edit, one field)
- `apps/web/src/app/api/evidence/upload/route.ts` — origin check, streaming byte counter with abort, `Content-Length` sanity check
- `apps/web/src/server/auth.ts` — cookie attributes audit (see step 6), `trustedOrigins`
- `apps/worker/src/main.ts` and `apps/web/src/server/container.ts` — call `assertAppMode()` first
- `infra/compose/.env.example` — `APP_MODE`, `APP_ALLOWED_ORIGINS`, `APP_URL`
- `packages/i18n/messages/{en,bn}.json` — `errors.rateLimited` with `{minutes}` if not already present from T-101

## Not in scope

TLS/reverse proxy, WAF, production secrets management, ClamAV network isolation, backups
(STORY-OPS-001 production half), Matomo/consent (STORY-OPS-002), MFA. A distributed rate limiter
(the in-memory sliding window is enough for one process; note the Redis-free production path —
a PostgreSQL-backed limiter — in follow-ups). Any FD-058 code: the progressive sign-in delay, the
severe-activity email and its outbox event are T-101's, the setting keys T-105's and the in-app
notice T-405's (FD-072); T-502 only tests them, and records each defect it finds as an `ISS-` row
linked to the Unit that owns the code.

## Steps

1. **CSP with nonces.** In `proxy.ts` generate a 128-bit base64 nonce per request; build the policy via `csp.ts`: `default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'` (the ported stylesheets use no inline styles except the prototype's own `style=""` attributes, which are attributes, not `<style>` — `'unsafe-inline'` for styles is accepted and documented; scripts are strict); `img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; worker-src 'self'` (for `sw.js`); `manifest-src 'self'`; `upgrade-insecure-requests` only when `APP_URL` is https. Dev mode adds `'unsafe-eval'` to `script-src` **only** when `NODE_ENV=development` (Next dev needs it); assert in a test that the production build's policy has no `unsafe-eval`. Forward the nonce via the `x-nonce` request header; layouts read it with `headers()` and attach it to the theme/lang bootstrap script and to `<ServiceWorkerRegistration>`'s inline needs (prefer none — the component is a module script).
2. **Headers.** In `next.config.ts` `headers()`: `Strict-Transport-Security` (only when https), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, `X-Frame-Options: DENY` (belt and braces with `frame-ancestors`), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin` (except `/api/evidence/artifacts/*` which stays `same-origin` too — artifacts are only embedded by our own pages), `X-Robots-Tag: noindex, nofollow` on `/:locale/admin/:path*`, `/:locale/me/:path*`, `/:locale/(register|sign-in|verify-email|reset-password)`, `/api/:path*`. `poweredByHeader: false`.
3. **Origin/host.** `proxy.ts` rejects requests whose `Host` is not in `APP_ALLOWED_ORIGINS` (403, no body). `serverActions.allowedOrigins` = the same list. `origin.ts` `assertSameOrigin()` compares `Origin` (or `Sec-Fetch-Site`) against `APP_URL` for every POST route handler (`/api/evidence/upload`, `/api/demo/clock`); GET handlers skip it. Better Auth `trustedOrigins` = the same list.
4. **Rate limiter wiring.** Fill `RATE_LIMITS` from 03 §4 plus: `account.signIn` 10 / 15 min per email **and** 30 / 15 min per network key; `account.register` 5 / h per network; `account.requestPasswordReset` 3 / h per email; `report.file` 20 / day per account; `evidence.intake` 20 / h per account; `search.query` 120 / min per network; `staff.beginDeviceApproval` 3 / h per account. `defineCommand` consults the table by `name` and calls `RateLimiter.hit(key)` **before** authorization so an attacker learns nothing from timing; key = `${name}:account:${actor.accountId}` or `${name}:net:${networkKey}` or `${name}:email:${sha256(email)}`. On refusal return `err('rate_limited', { retryAfterSec })`; the web layer maps it to `errors.rateLimited` with `{minutes: ceil(retryAfterSec/60)}`. Write `network-key.ts`: hash of client IP (from `x-forwarded-for` first hop only when `TRUST_PROXY=1`, else socket) + UA family. Document in the file header: **never IP-only** — Bangladeshi mobile carriers put thousands of users behind one CGNAT address, so an IP-only limit would lock out a whole town after one abuser (recommended architecture: "never IP-only for shared mobile networks").
5. **Upload limits at the edge.** In the upload route: reject if `Content-Length` > 100 MB + 1 MB overhead before reading; while streaming each part, count bytes and `controller.abort()` + return `413` with `evidence.too_large` when a file exceeds 15 MB or the request total exceeds 100 MB; enforce ≤ 10 parts; enforce the extension allowlist before touching the storage port; call `assertSameOrigin`. The application command already re-checks — this is defence in depth, tested at the route level with a synthetic 16 MB stream.
6. **Cookie audit.** Produce a table in `docs/security/local-demo-threat-notes.md` and assert each row in a test (`security-headers.spec.ts` reads `Set-Cookie`): Better Auth session cookie — `HttpOnly; SameSite=Lax; Secure (when https); Path=/`; `rk_staff_device` — `HttpOnly; SameSite=Strict; Path=/; Max-Age=90d`; step-up cookie — `HttpOnly; SameSite=Strict; Max-Age=300`; `rk.lang`, `rk.theme`, `rk.motion` — not HttpOnly, `SameSite=Lax`, no sensitive value; `rk.purge` — `SameSite=Lax; Max-Age=60`. Better Auth cookie prefix `__Host-` when https.
7. **Log scrubbing.** In the logger adapter add a final `scrub()` stage: allowlisted field names only (`event, correlationId, actorId, accountId, personaId, itemId, reviewId, caseCode, jobName, durationMs, status, code, count, state, kind`); any string value matching `/@/`, longer than 200 chars, or containing a path separator is replaced with `"[scrubbed]"`; unknown keys dropped. Test: run the application integration suite with the real logger writing to a buffer, then assert the buffer contains no `@`, none of five seeded review body fragments, no seeded original filename, no token-like base64 ≥ 32 chars.
8. **APP_MODE.** `assertAppMode()` at both composition roots: `APP_MODE ∈ {development, demo, production}`; `production` refuses `SMTP_HOST` in `{localhost, mailpit, 127.0.0.1}`, refuses `DEMO_*` env, refuses a database where `demo_clock` exists; `development|demo` require `DEMO_MARKER=1` (the layout reads it to render the synthetic marker — the marker cannot be disabled in these modes, AD-14). Log one structured `app.mode` event.
9. **Sweep.** `grep -rn "dangerouslySetInnerHTML\|onclick=\|javascript:" apps/web/src` → each hit either removed or justified with a comment and the nonce; `grep -rn "unsafe-inline\|unsafe-eval" apps/web/src` → only the two documented occurrences.
10. Run `pnpm check`, `pnpm e2e --grep security`, and a manual pass in Chrome with the console open: zero CSP violations across the storyboard's Part 1–3 pages in both locales.
11. **Adversarial tests of the FD-058 delay and notice (FD-072).** Write 3–5 tests in `apps/web/src/lib/security/__tests__/sign-in-delay.adversarial.int.test.ts` against compose PostgreSQL and Mailpit, using synthetic accounts only. They try to break T-101's code; they do not change it. Cover at least: (a) **timing bypass** — after 3 failures, fire concurrent sign-in attempts for one address and check that none escapes the delay and that every one is counted; (b) **enumeration through delay differences** — the same failure sequence for an address with an account and one without gives the same delays, responses and timing (median difference < 15 %), and the severe-activity notice never changes the response; (c) **counter reset** — changing the network key or user agent, varying the address's letter case or surrounding whitespace, or requesting a password reset does not reset the counter or the delay. Optionally add (d) concurrent attempts around the 10th failure produce exactly one severe-activity email and one outbox event. Record each test's result against its expected outcome in the hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Headers present | `curl -sI localhost:3000/en \| grep -iE "content-security-policy\|x-content-type\|referrer\|permissions-policy\|x-frame\|cross-origin"` | all present; `X-Powered-By` absent |
| CSP nonce rotates | two `curl -sI` calls | different nonces; `script-src` has no `unsafe-inline` |
| Prod policy strict | `NODE_ENV=production pnpm --filter web build && pnpm test --filter web -- csp` | test asserting no `unsafe-eval` passes |
| Zero CSP violations | manual: storyboard Part 1–3 with DevTools console | 0 violations, both locales |
| Host check | `curl -sI -H "Host: evil.example" localhost:3000/en` | 403 |
| Server action origin | `curl -X POST localhost:3000/en/sign-in -H "Origin: https://evil.example" …` | rejected (Next returns 403/400 for disallowed origin) |
| Upload route origin | `curl -X POST localhost:3000/api/evidence/upload -H "Origin: https://evil.example" -F file=@x.png` | 403 |
| Upload overflow aborts | `pnpm test --filter web -- upload-limits` | 16 MB single file → 413 within the first 16 MB read; 11 parts → 413; `.exe` renamed `.png` → 415 before storage is touched |
| Sign-in throttle | script 11 wrong passwords for one email, waiting out each FD-058 delay (FD-072) | 11th returns `rate_limited` with `retryAfterSec`; another email from same network still allowed until 30 |
| Comment throttle | `pnpm test --filter application -- rate-limits` | 31st `comment.post` in an hour refused; key differs per account |
| Cookies | `pnpm e2e --grep cookies` | every row of the cookie table asserted |
| Log scrub | `pnpm test --filter adapters -- scrub` and the integration-run buffer test | no `@`, bodies, filenames, tokens |
| APP_MODE | `APP_MODE=production SMTP_HOST=mailpit pnpm --filter web start` | refuses to start with `app.mode.refused` |
| Demo marker | `APP_MODE=demo DEMO_MARKER=0 pnpm --filter web start` | refuses to start |
| FD-072: timing bypass (AC3.1.5) | `pnpm test:int -- sign-in-delay.adversarial` case (a): 3 failures for `shirin.demo@example.test`, then 5 concurrent attempts | no concurrent attempt completes without a delay; the next attempt after them gets the 9th-attempt delay (30 s), so all 5 were counted |
| FD-072: no enumeration through delay differences (AC3.1.5) | case (b): the same 10-failure sequence for `shirin.demo@example.test` and `nobody.demo@example.test` | identical delay per attempt, identical response shape and status; median timing difference < 15 %; Mailpit has a severe-activity email only for the real address |
| FD-072: counter cannot be reset by the attacker (AC3.1.5) | case (c): after 5 failures, retry from a new network key, with `Shirin.Demo@Example.test` and with surrounding spaces, and after a password-reset request | the next attempt is still delayed by the next step of the schedule each time |
| FD-072: one severe notice under concurrency (AC3.1.5) | case (d), if written: 9 failures, then 3 concurrent wrong attempts | exactly one `email_deliveries` row (category `security`) and one outbox event for the severe-activity notice |
| FD-072: T-502 adds no FD-058 code | `git diff --stat main...` on the T-502 branch | no change under `packages/application/src/modules/account/` or to the FD-058 setting keys; the FD-058 additions are tests only |
| Quality gates | `pnpm check` | green |

## Tests to write

- `csp.test.ts` — policy object → string; production has no `unsafe-eval`; `worker-src`/`manifest-src` present; nonce embedded.
- `origin.test.ts` — allowed/denied origins, missing `Origin` with `Sec-Fetch-Site: same-origin` allowed, cross-site denied.
- `network-key.test.ts` — same IP + different UA → different keys; `x-forwarded-for` ignored unless `TRUST_PROXY=1`; only the first hop used.
- `rate-limits.test.ts` (application) — every command in `RATE_LIMITS` refuses on limit+1 and resets after the window (FakeClock); refusal happens before `authorize()` (spy order).
- `upload-limits.test.ts` (route handler with a streamed body) — overflow abort, part count, extension allowlist, origin.
- `scrub.test.ts` + `log-scrub.int.test.ts` — as step 7.
- `app-mode.test.ts` — the refusal matrix.
- `sign-in-delay.adversarial.int.test.ts` — the 3–5 adversarial cases of step 11 against T-101's FD-058 code (FD-072).
- `e2e/security-headers.spec.ts` — headers + cookie table + zero CSP violations captured via `page.on('console')` across five pages per locale.

## Threat notes

Write these into `docs/security/local-demo-threat-notes.md` with the test that covers each:

| Threat | Control | Test |
|---|---|---|
| Stored XSS via review/comment body or display name | React escaping + strict `script-src` nonce; no `dangerouslySetInnerHTML` | csp test, sweep, e2e zero violations with a seeded `<script>` body fixture |
| CSRF on server actions / upload | `allowedOrigins`, `assertSameOrigin`, SameSite cookies | origin tests, e2e cookie table |
| Credential stuffing / enumeration | per-email + per-network sign-in limits, the progressive per-email delay and severe-activity notice (T-101, FD-058), generic errors, identical timing on unknown email (T-101), rate check before authz | rate-limits test, T-106 record, `sign-in-delay.adversarial.int.test.ts` (FD-072) |
| CGNAT lock-out (false positive DoS) | network key = IP + UA family, per-account keys preferred | network-key test |
| Resource exhaustion via upload | edge byte counting + abort, part cap, pixel/page caps in worker (T-304) | upload-limits test |
| Clickjacking of the console | `frame-ancestors 'none'`, `X-Frame-Options: DENY` | headers curl |
| Session cookie theft via XSS | HttpOnly, nonce CSP | cookie table |
| Private data in logs | allowlist scrubber | scrub tests |
| Demo shortcuts reaching production | `assertAppMode` | app-mode test |
| SW caching private responses | T-501 deny list | T-501 inventory spec |
| Reporter identity leakage through headers/logs | scrubber drops unknown keys; `reports.reporter_account_id` is never in a VM (T-403) | scrub test + T-403 tests |

Residual (documented, not fixed here): in-memory limiter resets on restart and is per-process; no TLS locally; no WAF; Better Auth advisory recheck is a release-gate item.

## Hard-rule checklist

- [ ] Reporter identity never reaches logs or the reported party (scrub test; unknown keys dropped).
- [ ] Original evidence is never served publicly (route table unchanged; CORP header on artifacts).
- [ ] Synthetic marker cannot be disabled in demo/development (`assertAppMode`).
- [ ] Bengali and English both work (`errors.rateLimited` in both dictionaries; zero CSP violations in both locales).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
