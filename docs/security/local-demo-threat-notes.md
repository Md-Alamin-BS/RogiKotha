# Local demo threat notes (release 1)

Scope: the local Docker demo (`pnpm demo`), composed without a TLS front, WAF or reverse proxy
(local Docker demo, team.md Deployment). Everything is synthetic data. Unit U41 (`t-502-security-hardening`), rules BR1 to BR8; decisions FD-093, FD-104
and FD-105 (rate-limit table, network key, `assertAppMode()`, FD-072 adversarial test and the PWA
CSP move to release 2).

Every test named below exists on the branch. Checked against the built code on 2026-11-08
(plan Step 36, rechecked at Step 38). The adversarial tests A1 to A5 were written by a separate
agent; their results are in `code-summary.md` (Step 34).

## 1. Threats and controls

| Threat | Control | Test | Status |
|---|---|---|---|
| Stored XSS through review, comment or display-name text | React escaping; nonce `script-src` with `'strict-dynamic'`; no inline script (BR1.1 to BR1.5) | `apps/web/src/lib/security/__tests__/csp.test.ts`; `apps/web/src/lib/security/__tests__/sweep.test.ts`; `apps/web/e2e/smoke/security-headers.spec.ts` (zero violations); adversarial A3 (`lib/security/__tests__/security.adversarial.test.ts`, no break) | covered |
| Third-party data leak (analytics) | No third-party origin in the CSP (BR1.3); no analytics code (FD-019) | `csp.test.ts` "allows no third-party origin"; `security-headers.spec.ts` request log | covered |
| CSRF on server actions and the upload | Proxy Origin check, `serverActions.allowedOrigins`, `guardRouteRequest`, SameSite=Lax (BR3.3 to BR3.5, BR5.1) | `lib/security/__tests__/origin.test.ts`; `apps/web/src/proxy.test.ts`; upload security test (`apps/web/src/app/api/evidence/upload/route.security.test.ts`); adversarial A1 (`proxy.adversarial.test.ts`, `security.adversarial.test.ts`) and A5 (`security.adversarial.int.test.ts`); A1 found that `/_next/*` and `/__nextjs*` had the Host check only, fixed | covered |
| DNS rebinding and Host header injection | Unknown Host and X-Forwarded-Host refused (BR3.2) | `proxy.test.ts`; `proxy.smoke.test.ts`; curl with `Host: evil.example` (Build and Test) | covered |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY` (BR1.2, BR2.1) | `lib/security/__tests__/headers.test.ts`; `security-headers.spec.ts` | covered |
| Session theft through script | HttpOnly cookie, nonce CSP, `get-session` closed (FD-104) | `apps/web/src/security-cookies.test.ts`; `security-headers.spec.ts` cookie check | covered |
| Resource exhaustion through upload | Declared-length check, counting stream, U48's per-file and per-review limits and rate limit (BR4.*) | `lib/security/__tests__/request-limits.test.ts`; `route.security.test.ts`; adversarial A2 (`route.adversarial.test.ts`, no break; a chunked 200 MB body stopped near the cap) | covered |
| Upload truncated by the proxy | Upload route outside the proxy matcher (BR3.4) | `proxy.test.ts` matcher case | covered |
| A page served without CSP or Host check through a dotted URL (`/en/experiences/<id>-a.b`) | Matcher excludes only named files, never an extension (BR3.4, ENT-016) | `proxy.test.ts` matcher cases; `proxy.smoke.test.ts` dotted-path case; adversarial A1 | covered |
| A server action run through a path the proxy did not match (`/robots.txt`, `/favicon.ico`, `/sitemap.xml`, `/manifest.webmanifest`, `/_next/image`, a missing `/_next/static/x`), with no Origin or with a rebound Host | Since review-01 the matcher excludes only `/api/evidence/upload`; static files and the image optimizer get the Host check and the Origin rule (ENT-016 as amended) | `proxy.test.ts` "gives %s the Host check and the Origin rule for an unsafe method"; real-server probe of review-01 (`code-summary.md`, "Review fixes (review-01)") | covered |
| Private data in logs | Key allowlist, value shape and event shape in both loggers (BR6.1 to BR6.6); no direct console output outside the loggers (BR6.7) | `packages/application/src/ports/log-policy.test.ts`; `apps/web/src/server/logger.test.ts`; `apps/worker/src/logger.test.ts`; `apps/worker/src/log-scrub.test.ts`; `apps/web/src/log-scrub.int.test.ts`; the `no-console` lint rule; adversarial A4 found that the worker kept a code-shaped `message`, fixed (`message` is always `[scrubbed]`) | covered |
| Private data in output Next.js or Node prints on its own (an unhandled server error with its message and stack) | The application catches and logs code-shaped lines where it can; the framework's own printing is outside the logger | Adversarial A4 recorded what it prints: for a server-action POST whose body is not JSON, Next.js writes `SyntaxError: Unexpected token ...` with the first ten body characters to stderr | residual |
| Reporter identity leakage through headers or logs | No reporter identity exists in release 1 (reports are release 2, FD-105); the log policy drops any key not on the list and scrubs free text; no response header carries an account or persona id | `log-policy.test.ts` (an unknown `reporterAccountId` key is dropped); `security-headers.spec.ts` header inventory | covered for logs and headers; reporting is release 2 (FD-105, T-403) |
| Credential stuffing and enumeration | T-101's limits, delay and generic answers (merged in U8) | U8's tests | T-101's limits, delay and generic answers are tested in U8; the rate-limit table and the FD-072 adversarial test are release 2 (FD-105) |
| CGNAT lock-out | Network key (release 2) | none | release 2 (FD-105) |
| Demo shortcuts reaching production | `assertAppMode()` (release 2); `migrate`, `reset` and `seed` already refuse `APP_MODE=production` | none | release 2 (FD-105) |
| Service worker caching private responses | T-501 deny list and PWA CSP (release 2) | none | release 2 (FD-105) |
| No TLS locally | HSTS, `upgrade-insecure-requests` and the `__Secure-` cookie prefix switch on with an https `APP_URL` | `csp.test.ts` and `security-cookies.test.ts` https branch | residual: the https branch is checked through configuration; the local demo runs without a TLS front |

## 2. Accepted risks for the local demo

- The in-memory limiters reset on restart and are per process.
- No TLS, no WAF and no reverse proxy locally.
- Only `/api/evidence/upload` skips the proxy, and it runs the same Host and Origin guard itself.
  Until review-01 the matcher also skipped `/_next/static`, `/_next/image` and four named root
  files (`/favicon.ico`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`) on the grounds that
  they hold public bytes only. That did not hold: none of the four root files exists, and on the
  real server a `Next-Action` POST to each root file and to a missing `/_next/static/x` ran
  `setTheme` with no Origin and with a forged Host. Static files now pass through the
  proxy too, at the cost of one header comparison per file request.
- `style-src 'unsafe-inline'` stays on (style attributes), so CSS injection is not blocked by the CSP.
- There is no CSP violation reporting endpoint.
- Most error messages are written as `[scrubbed]` in logs, so a failure is diagnosed from its code
  and event name, not its text.
- Next.js and Node print unhandled errors themselves, outside the logger.
- Next.js answers a malformed percent-encoded page path such as `/en/%E0%A4%A` with its own bare
  `text/plain` 500, which carries no CSP and none of the static security headers; the body is
  fixed text with no request data, and a forged Host on that path still gets the proxy's 403.
- A code-shaped user value in an allowlisted id or code field, or interpolated into an event name,
  cannot be told apart from an id by shape; the Step 4 inventory found no such call site.
- HSTS, `upgrade-insecure-requests` and the `__Secure-` cookie prefix are checked through
  configuration, because the local demo runs without TLS.
- `APP_ALLOWED_ORIGINS` is read again at `next start`, not fixed at build time (checked in Step
  27), so changing it needs a restart but no rebuild.
- The database command-line tools print their errors to the developer's terminal.

## 3. Cookie inventory (ENT-011)

Release 1 sets exactly these cookies; no other cookie is set on any page (AC12.4.2).
`rk.session_data` is never set because `cookieCache` is disabled in
`server/better-auth/instance.ts`. The staff device, step-up and purge cookies do not exist in
release 1 (the staff console is release 2, FD-105).

| Cookie | Set by | HttpOnly | SameSite | Path | Secure | Domain | Max-Age | Sensitive | Test |
|---|---|---|---|---|---|---|---|---|---|
| `rk.session_token` (http) / `__Secure-rk.session_token` (https) | Better Auth through the gateway and `applySetCookies` | yes | Lax | `/` | only on https | none | 30 days (`SESSION_MAX_AGE_SECONDS`) | yes | `apps/web/src/security-cookies.test.ts`; `apps/web/src/server/better-auth/session-cookies.test.ts`; `security-headers.spec.ts` |
| `rk.dont_remember` / `__Secure-rk.dont_remember` | Better Auth, only when a sign-in passes `rememberMe` false | yes | Lax | `/` | only on https | none | session | yes | none of its own: set by the library, expired with the session cookie by `apps/web/src/server/better-auth/session-cookies.test.ts`; the jar check in `security-headers.spec.ts` covers only a default sign-in |
| `rk.lang` | next-intl `localeCookie` and `server/actions/preferences.ts` | no | Lax | `/` | no | none | 1 year | no | `packages/i18n/src/routing.test.ts` (name); `security-headers.spec.ts` (jar holds only ENT-011 cookies) |
| `rk.theme` | `server/actions/preferences.ts` | no | Lax | `/` | no | none | 1 year | no | `apps/web/src/server/actions/preferences.test.ts` (Lax, `/`, one year); `security-headers.spec.ts` |
| `rk.motion` | `server/actions/preferences.ts` | no | Lax | `/` | no | none | 1 year | no | `server/actions/preferences.test.ts`; `security-headers.spec.ts` |

## 4. Worker code `db.reset_required` (BR6.8)

At start the worker checks that each pg-boss queue exists with the policy the code expects. If a
queue exists with a different policy (for example after a schema from an older build), the worker
does not try to repair it. It logs one line whose `fix` field is the code `db.reset_required`,
with `expectedPolicy` and `actualPolicy` holding the two policy names, and stops.

`db.reset_required` means: run `pnpm db:reset` (it rebuilds the demo database from empty), then
`pnpm db:seed`, then start the worker again. The code is a fixed token, not prose, so the log line
stays inside the allowlist and carries no private data. Test: the queue mismatch case in
`apps/worker/src/log-scrub.test.ts`.
