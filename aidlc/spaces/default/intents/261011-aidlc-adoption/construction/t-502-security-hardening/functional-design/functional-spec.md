# Functional specification — U41 `t-502-security-hardening` (release 1, narrowed by FD-105)

This file is the source of truth for U41's workflows and decision tables. Data shapes are in `entities.md` and decision logic in `rules.md`; the tables here are derived from them. Review 01 (NOT-READY, 1 Critical, 1 Major, 6 Minor) changed the matcher (every path but named files, R-01), widened log scrubbing to direct console output (R-02), aligned the guard names (R-03), added the C14 amendment block and the consumer tests (R-04), named the shared edits in U48's area (R-05), added the task-file amendment step and two threat rows (R-06), added the proxy's header fallback (R-07) and made the worker hint code-shaped (R-08); see `functional-design-questions.md` § Review 01 findings. U41 is a `library` Unit (kind `library`, size M, high risk because it touches the session cookie posture and guards the evidence upload path). It depends on U48 and is built after U48 is merged on `main`.

## 1. What changes

| Area | On `main` at `b1c68ad` | After U41 |
|---|---|---|
| CSP | none | nonce CSP on every page, set by `proxy.ts` on the request and the response (BR1.1, BR1.2); `default-src 'none'; frame-ancestors 'none'` on `/api` (BR1.6) |
| Other headers | `poweredByHeader: false` only | nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP, CORP on every path; X-Robots-Tag on private paths (BR2.1, BR2.2); HSTS at runtime when https (BR2.4) |
| Host and Origin | Next.js's built-in server-action check only; the proxy matches pages only, and skips every path with a dot | the proxy matches every path, dotted page paths included, except the upload route, `/_next/static`, `/_next/image` and four named root files (ENT-016); it refuses an unknown `Host` or `X-Forwarded-Host`, and refuses an unsafe method without an allowed `Origin` (BR3.2–BR3.4); `serverActions.allowedOrigins` from `APP_ALLOWED_ORIGINS` (BR3.5); the upload route guards itself (BR3.4) |
| Direct console output | six `console.*` calls outside the loggers write messages and stacks | routed through the loggers as code-shaped lines; `no-console` with no allowed methods outside the two logger files (BR6.7) |
| Upload size | U48's per-file check after parsing | declared-length check before reading, counting stream while reading (BR4.1–BR4.3) |
| Body limits | `serverActions.bodySizeLimit` and `proxyClientMaxBodySize` at 11 MB (for the demo upload action) | 1 MB once no action carries a file (BR4.6) |
| Session cookie | Better Auth 1.7.14 already sets HttpOnly, SameSite=Lax, Path=/, Secure and `__Secure-` on https | unchanged; pinned by tests (BR5.1) |
| `trustedOrigins` | `[APP_URL]` | unchanged; pinned by a test (BR3.7) |
| Web logger | key allowlist from `LogFields`, values written as given | one shared policy: key allowlist, value shape, event shape (BR6.1–BR6.4) |
| Worker logger | key denylist (`email`, `token`, `body`, `filename`, `password` → `[redacted]`) | the shared allowlist plus the worker's own names; value and event rules (BR6.1–BR6.4) |
| Docs | no `docs/security/` | `docs/security/local-demo-threat-notes.md` (BR8.2) |

What I checked before deciding, with the source:

- Next.js 16.3.4 is installed. The CSP guide in `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` says Next.js extracts the nonce from the **request's** `Content-Security-Policy` header and stamps framework scripts, page bundles and its own inline scripts; that every page must render dynamically; and that `'unsafe-eval'` is needed in development only.
- `proxy.md` confirms the Next 16 rename (middleware → proxy), the Node.js runtime default, and that a server action is a POST to its page route, so a matcher change can silently drop proxy coverage.
- `proxyClientMaxBodySize.md` says a matched request's body is buffered in memory and, above the limit, **only the first N bytes are passed on and the request continues** (no error). That is why the upload route must stay outside the proxy (BR3.4).
- `server/app-render/action-handler.js` lets a server action through when `Origin` is missing, and compares `Origin` with `X-Forwarded-Host` before `Host`; `server/base-server.js` sets `X-Forwarded-Host` from `Host` only when it is absent. So the proxy checks both headers and refuses a missing `Origin` (BR3.2, BR3.3).
- `serverActions.allowedOrigins` takes host names (`host[:port]`), compared by `isCsrfOriginAllowed` (BR3.5).
- Better Auth 1.7.14 `cookies/index.mjs`: `secure: !!secureCookiePrefix`, `sameSite: "lax"`, `path: "/"`, `httpOnly: true`, name `${prefix}.${cookieName}` with `__Secure-` when `useSecureCookies`. `api/middlewares/origin-check.mjs` returns early when there is no `ctx.request`, so gateway calls (`auth.api.*` with headers only) are never origin-checked; only the HTTP routes are, and FD-104 keeps only `GET /api/auth/ok` open.
- `lib/` is the `web-shared` boundary element (FD-093 (6), `eslint.boundaries.mjs`): it may import only `contracts` and `i18n`, and no Node built-in.
- The latest Next.js entry in `docs/status/dependency-check-log.md` is 2026-09-13 (T-008), more than 3 days old; Code Generation appends a new entry for Next 16.3.4 (CSP, proxy and serverActions behaviour) and Better Auth 1.7.14 before writing code (`project.md` Mandated).

## 2. Module surface

All new code is small and pure where it can be. `lib/security/*` holds the pure helpers; `proxy.ts` and `server/security-settings.ts` read the environment and log.

| File | Exports | Rules |
|---|---|---|
| `apps/web/src/lib/security/settings.ts` | `parseSecuritySettings({appUrl, allowedOrigins, nodeEnv}) → SecuritySettings` (throws `SecuritySettingsError` naming the variable) | BR3.1, BR7.1 |
| `apps/web/src/lib/security/csp.ts` | `newNonce() → string`, `buildCsp({nonce, https, development}) → string`, `CSP_DIRECTIVE_ORDER` | BR1.1–BR1.3 |
| `apps/web/src/lib/security/headers.ts` | `STATIC_SECURITY_HEADERS`, `API_CSP`, `PRIVATE_PATH_PATTERNS`, `securityHeaderRoutes()` (the array `next.config.ts` returns from `headers()`), `HSTS_VALUE` | BR1.6, BR2.1, BR2.2, BR2.4 |
| `apps/web/src/lib/security/origin.ts` | `checkHost(headers, settings) → OriginDecision`, `checkOrigin(method, headers, settings) → OriginDecision`, `checkRequest(request, settings)` (both), `isSafeMethod(method)` | BR3.2, BR3.3 |
| `apps/web/src/lib/security/request-limits.ts` | `UPLOAD_OVERHEAD_BYTES`, `checkDeclaredLength(headers, maxBytes) → ok \| refused(length_invalid \| too_large)`, `readCappedFormData(request, maxBytes) → Promise<{ok: FormData} \| {refused: 'too_large'} \| {malformed: true}>` | BR4.2, BR4.3 |
| `apps/web/src/lib/security/refusal.ts` | `refusalResponse(decision, correlationId?) → Response` (proxy form: empty body; route form: AppError body), `REFUSAL_MESSAGE_KEYS` | BR3.6 |
| `apps/web/src/lib/security/nonce.ts` | `readNonce() → Promise<string \| undefined>` (reads `x-nonce` through `next/headers`, which `lib/cookies.ts` already imports) | BR1.5 |
| `apps/web/src/server/security-settings.ts` | `getSecuritySettings()` (memoised; reads `APP_URL`, `APP_ALLOWED_ORIGINS`, `NODE_ENV` through `optionalEnv` of `server/env.ts`), `guardRouteRequest(request) → Response \| null` (Host, Origin, logging) | BR3.4, BR3.6, BR7.1, BR7.2 |
| `apps/web/src/proxy.ts` | `default proxy(request)`, `config.matcher` | BR1.1, BR2.4, BR3.2–BR3.4 |
| `packages/application/src/ports/log-policy.ts` | `LOG_FIELD_NAMES`, `scrubLogFields(fields, allowed) → Record<string, unknown>`, `scrubLogValue(value)`, `logEventName(event) → string`, `SCRUBBED`, `INVALID_EVENT` | BR6.1–BR6.3 |

`log-policy.ts` imports nothing. It is exported from `packages/application/src/index.ts` and from the worker subpath `packages/application/src/worker.ts`, so the worker reaches it the only way FD-093 (2) allows.

## 3. Workflows

### WF1 — A page request (GET, or a server-action POST) through the proxy

1. `getSecuritySettings()`; if it throws, answer `500` with an empty body and `Cache-Control: no-store`, log `security.settings_invalid` once per process (BR7.1), stop.
2. `checkHost` (BR3.2). Refused → `403`, empty body, `Cache-Control: no-store`; log `security.request_refused {kind, status: '403'}`; stop.
3. If the method is not GET, HEAD or OPTIONS: `checkOrigin` (BR3.3). Refused → as step 2.
4. `nonce = newNonce()`; `policy = buildCsp({nonce, https, development})` (BR1.1, BR1.2).
5. Copy the request headers; set `x-pathname` (as today), `x-nonce = nonce` and `content-security-policy = policy`, overwriting any client value. Build `new NextRequest(request, {headers})` and hand it to next-intl's middleware, exactly as `proxy.ts` does today with `x-pathname`. If next-intl's response carries no request-header override (`x-middleware-override-headers` absent; next-intl 4.14.4 returns a bare `NextResponse.next()` when `decodeURI` fails on a malformed percent-encoded path), the proxy replaces it with `NextResponse.next({request: {headers}})` built from its own headers (BR1.1, Review 01 R-07).
6. On the response next-intl returns (a pass-through, a rewrite or a locale redirect), set `Content-Security-Policy = policy` and, if `https`, `Strict-Transport-Security = HSTS_VALUE` (BR2.4). The static headers of BR2.1 and BR2.2 are added by `next.config.ts` `headers()`, which Next.js applies before the proxy runs (proxy.md, "execution order").
7. Next.js renders the page dynamically (the locale layout reads `headers()`, BR1.4), reads the nonce from the request's CSP header and stamps its scripts. If the request was a server action, Next.js runs its own Origin-versus-Host check with `allowedOrigins` (BR3.5) before the action body.

### WF2 — An `/api` request through the proxy (every route except the upload)

1. Steps 1–3 of WF1 (Host for every method; Origin for unsafe methods).
2. Return `NextResponse.next()` with HSTS when `https`. No next-intl, no nonce. `next.config.ts` adds the static headers and `API_CSP` (BR1.6, BR2.1).
3. On `main` this covers `GET /api/health` and `/api/auth/*` (GET and POST), whose route handler keeps FD-104's allowlist (only `/api/auth/ok` reaches the library) and is not edited. Their bodies are tiny, so the proxy's buffering costs nothing.

### WF2b — Next.js internals the matcher still sees

`/_next/*` paths other than `/_next/static/` and `/_next/image` (for example the development HMR endpoint) and `/__nextjs*` development endpoints get WF1 step 2 (Host) only, then `NextResponse.next()`: no next-intl, so they are never redirected to a locale, and no page CSP. Everything else, including any path with a dot such as `/en/experiences/<id>-a.b`, takes WF1 (BR3.4, Review 01 R-01).

### WF3 — `POST /api/evidence/upload` (the proxy does not match it)

U41 owns two places in U48's route. Everything else is U48's WF1.

1. **U48 step 1, U41's lines:**
   1. `const refused = guardRouteRequest(request)`: settings, `checkHost`, `checkOrigin` (POST always needs an allowed Origin). Refused → `403` AppError `{code: 'forbidden', messageKey: 'errors.common.forbidden', correlationId}` with `Cache-Control: no-store`, one `security.request_refused` line with the same `correlationId`.
   2. `checkDeclaredLength(request.headers, UPLOAD_MAX_REQUEST_BYTES)` where `UPLOAD_MAX_REQUEST_BYTES = EVIDENCE_MAX_FILE_BYTES + UPLOAD_OVERHEAD_BYTES` (15 794 176) is computed in the route from the evidence constant U48's route already imports. A non-numeric `Content-Length` → `400` AppError `validation`; a larger one → `413` AppError `{code: 'evidence.too_large', messageKey: <U48's key for evidence.too_large>}` with `Connection: close`. No byte of the body has been read.
2. U48 steps 2–3 unchanged: session (`401`/`403`), then the per-account rate limit (`429`).
3. **U48 step 4, U41's one line:** `request.formData()` becomes `readCappedFormData(request, UPLOAD_MAX_REQUEST_BYTES)`. `{refused: 'too_large'}` → the same `413` as step 1.2. `{malformed: true}` → U48's existing answer for a body that is not a valid form. `{ok: form}` → U48 continues with the form.
4. U48 steps 5–10 unchanged (type, size, pre-check, write, intake, answer).

`readCappedFormData` in detail: it wraps `request.body` in a `TransformStream` whose `transform` adds `chunk.byteLength` to a counter and, once the counter passes the cap, calls `controller.error(BODY_LIMIT_EXCEEDED)` and lets the pipe cancel the source, so the server stops pulling bytes. It parses with `new Request(request.url, {method: 'POST', headers: request.headers, body: counted, duplex: 'half'}).formData()`. A null body gives `malformed`. The counter makes a chunked body and a body longer than its declared length stop at the cap; Node's HTTP parser already cuts a body at its declared `Content-Length`.

### WF4 — A log line (web and worker)

1. `logEventName(event)`: the event, or `log.invalid_event` if it does not match the event shape (BR6.3).
2. `scrubLogFields(fields, allowed)`: drop every key not in `allowed`; for each kept key apply `scrubLogValue` (BR6.2); drop `undefined` and `null`.
3. Write one JSON line with the envelope last: web `{level, event, ...kept, at}` (level and event re-asserted), worker `{...kept, ts, level, event}` (BR6.4). The writers (`process.stdout.write`, `console.warn`, `console.error`, `console.log`) are unchanged.

`allowed` is `LOG_FIELD_NAMES` in the web logger and `LOG_FIELD_NAMES ∪ WORKER_LOG_FIELD_NAMES` in the worker logger. The worker logger keeps its index-signature `LogFields` type, because `packages/database/src/queue/pg-boss-queue.ts` relies on that structural shape.

### WF5 — Process start and configuration

1. `next.config.ts` loads (on `next dev`, `next build` and `next start`). It reads `APP_URL` and `APP_ALLOWED_ORIGINS` through `optionalEnv` and `parseSecuritySettings`. A present but invalid list throws (BR7.1). With no `APP_URL` (a build without `.env`) it uses `allowedOrigins: []`. It returns `securityHeaderRoutes()` from `headers()`, `poweredByHeader: false`, `experimental.serverActions.allowedOrigins = settings.allowedHosts`, and the BR4.6 body limits.
2. The first proxied request or upload calls `getSecuritySettings()`, which validates and memoises (BR7.2).
3. Code Generation confirms on a real `next build` then `next start` that `serverActions.allowedOrigins` follows the start-time environment (changing `APP_ALLOWED_ORIGINS` between build and start). If Next.js bakes it at build time, the threat notes and `.env.example` say "rebuild after changing APP_ALLOWED_ORIGINS", and an S4 row records it. The proxy's own check is runtime either way.

### WF6 — Code Generation order

1. Baseline: `pnpm check` and `pnpm smoke` green on the Bolt branch; read the open `ISSUES.md` rows for web, auth, evidence and logging; append the dependency-check entry (§ 1).
2. `log-policy.ts` and its test; then the web and worker loggers and their tests (BR6.*). Inventory on `main`, excluding test files, `e2e/` and `scripts/`: (a) every `logger.(info|warn|error)(` call in `apps/` and `packages/`; every field name used must be allowlisted; a name that holds an id or a code is added to the right list; a name that would hold free text is an `ISS-` row against the owning Unit, not a new allowlist entry; (b) every `console.` call in `apps/` and `packages/` (Review 01 R-02). Found at design time: `apps/worker/src/main.ts:155`, `packages/i18n/src/request.ts:32`, `apps/web/src/server/actions/review.ts:228`, `apps/worker/src/env.ts:72` and `:80`, the two loggers' own writers, the demo upload action `apps/web/src/server/actions/evidence.ts:158,225` (U48 removes that action; any call left after U48 is routed the same way), and the database command-line tools `packages/database/src/migrate.ts:47` and `reset.ts:170,204`.
2b. Route each known call through a logger with an event and a code or error name only, never the message or the stack (BR6.7): `main.ts:155` → `logger.error('worker.crashed', {errorName})`, using a `JsonLogger` built before `main()` runs; `request.ts:32` → the i18n request config takes an optional `onIntlError(code)` reporter, which `apps/web/src/i18n/request.ts` wires to the web logger as `logger.error('i18n.message_error', {errorCode})`; `review.ts:228` → `logger.error('review.action_failed', {command: action, errorName})` through the container's logger; `env.ts:72,80` → `new JsonLogger().error('worker.env_invalid', {code, variables})` with `code` `database_url_worker_required` or `env_invalid` and `variables` the failing variable names only (zod issue messages are dropped, since they can quote the received value); `main.ts:78` `fix: 'pnpm db:reset'` → `fix: 'db.reset_required'` (BR6.8). Then set `no-console` to `error` with no allowed method for `apps/*/src/**` and `packages/*/src/**` in `eslint.config.mjs`, with file-level exceptions for the two loggers and the two database command-line tools (each with its reason in a comment); if the flat config cannot scope it that way, add `apps/web/src/lib/security/__tests__/no-console.test.ts`, which walks the same files and fails on any `console.` call outside the exceptions. Any other call the inventory finds is routed the same way or gets an `ISS-` row against its owner.
3. `settings.ts`, `csp.ts`, `headers.ts`, `origin.ts`, `refusal.ts`, `request-limits.ts`, `nonce.ts` and their tests.
4. `server/security-settings.ts` and its test; then `proxy.ts` and its extended test; then `next.config.ts`.
5. The two edits in U48's upload route, its security test, and the update to U48's route test helper so its requests carry `origin: http://localhost:3000` (§ 7).
6. Cookie and `trustedOrigins` pin tests (BR3.7, BR5.1).
7. `server/log-scrub.int.test.ts` and the worker log test (BR6.6).
8. `playwright.config.ts` env line, `e2e/smoke/security-headers.spec.ts`, `proxy.smoke.test.ts`.
9. The not-found trial (BR1.4) and the body-limit grep (BR4.6).
10. `docs/security/local-demo-threat-notes.md`, `.env.example`, the `ISSUES.md` rows (§ 10), the FD-next proposal (§ 9), and the C14 release-1 amendment block of § 9 appended to `inception/contract-design/contract-summary.md` as a dated note under C14, as other Units add their C-notes.
10b. Add `## Amendments — release 1 (FD-105)` to `docs/implementation/tasks/T-502-security-hardening.md` (`unit-of-work.md` "Task headers to correct"), above "Goal". It says which steps are deferred (steps 4, 8, 11 and the rate-limit, APP_MODE and FD-072 acceptance rows), lists the departures of the FD-next row, and gives the new expected values of the changed acceptance rows: "Upload overflow aborts": a request over 15 794 176 bytes → `413 evidence.too_large` before the body is read; a second file part in one request → U48's one-file refusal (`400`, `ev.upload.errors.*` as U48 defines it), in place of "11 parts → 413"; a renamed `.exe` → U48's `400 evidence.type_rejected` before storage is touched, in place of "415"; "Cookies": the ENT-011 rows only (no staff, step-up or purge cookie in release 1); "Headers present": also on a dotted page path. The task's other text stays as history.
11. `pnpm check`, `pnpm smoke`, `pnpm --filter @rogikotha/web build` then `pnpm --filter @rogikotha/web smoke:e2e`, and the acceptance curls of § 8.4. Then the separate agent's adversarial tests (§ 8.5).

## 4. Decision tables

### 4.1 Request verdict (proxy and `guardRouteRequest`)

| # | Settings | Host / X-Forwarded-Host | Method | Origin | Sec-Fetch-Site | Verdict | Proxy answer | Route answer |
|---|---|---|---|---|---|---|---|---|
| 1 | invalid | any | any | any | any | refused | 500, empty | 500 AppError `internal` |
| 2 | valid | Host missing or not allowed | any | any | any | refused `host` | 403, empty | 403 AppError `forbidden` |
| 3 | valid | Host allowed, X-Forwarded-Host present and not allowed | any | any | any | refused `forwarded_host` | 403, empty | 403 AppError `forbidden` |
| 4 | valid | allowed | GET, HEAD, OPTIONS | any | any | allowed | continue | continue |
| 5 | valid | allowed | unsafe | in allowed origins | any | allowed | continue | continue |
| 6 | valid | allowed | unsafe | `null` | any | refused `origin_null` | 403, empty | 403 AppError `forbidden` |
| 7 | valid | allowed | unsafe | other value | any | refused `origin` | 403, empty | 403 AppError `forbidden` |
| 8 | valid | allowed | unsafe | absent | `same-origin` | allowed | continue | continue |
| 9 | valid | allowed | unsafe | absent | absent or any other value | refused `origin_missing` | 403, empty | 403 AppError `forbidden` |

Host and Origin comparisons are exact after ASCII lower-casing of the host and removal of a default port (`:80` for http, `:443` for https). `https://localhost:3000` does not match `http://localhost:3000`.

### 4.2 Upload size verdict (route only)

| Content-Length | Counted body | Answer |
|---|---|---|
| not `^[0-9]{1,15}$` | not read | 400 AppError `validation` |
| > 15 794 176 | not read | 413 AppError `evidence.too_large` |
| ≤ 15 794 176 or absent | ≤ 15 794 176 | U48 continues (its own per-file check stays: > 15 728 640 bytes is U48's `400 evidence.too_large`) |
| ≤ 15 794 176 or absent | reaches 15 794 177 | stream stopped; 413 AppError `evidence.too_large` |

Note on statuses: C14's release-1 amendment lists `400` for `evidence.too_large`. U48 keeps `400` for a file that is too large after parsing; U41's request-level refusal answers `413`, the HTTP status for a refused request body, with the same `code` and `messageKey`, so the uploader shows the same text. This adds `413` to C14 (contract note in § 9).

### 4.3 CSP by environment

| `NODE_ENV` | `APP_URL` | `script-src` | `upgrade-insecure-requests` | HSTS | session cookie name |
|---|---|---|---|---|---|
| development | http | `'self' 'nonce-…' 'strict-dynamic' 'unsafe-eval'` | no | no | `rk.session_token` |
| production (next start) | http | `'self' 'nonce-…' 'strict-dynamic'` | no | no | `rk.session_token` |
| production | https | `'self' 'nonce-…' 'strict-dynamic'` | yes | `max-age=31536000` | `__Secure-rk.session_token` |
| test (Vitest) | as the test sets | no `'unsafe-eval'` (only `development` adds it) | per `APP_URL` | per `APP_URL` | per `APP_URL` |

## 5. Strings shown to people

U41 adds **no i18n key**. Every refusal a person could see reuses a key that already exists in both dictionaries:

| Situation | messageKey | English (en.json) | Bengali (bn.json) |
|---|---|---|---|
| Upload refused by the Host or Origin check | `errors.common.forbidden` | You don't have permission to do this. | এটি করার অনুমতি আপনার নেই। |
| Upload request over the cap | the key U48 maps `evidence.too_large` to; on `main` `errors.evidence.tooLarge` | Each file must be 15 MB or smaller. | প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে। |
| `Content-Length` that is not a number (only a hand-made client can send it) | `errors.common.validation` | Please check the highlighted fields. | চিহ্নিত ঘরগুলো আবার দেখুন। |

A proxy refusal (unknown Host, cross-origin page POST) has an empty body: no legitimate visitor of the configured address reaches it, and the browser shows its own error page. If Code Generation finds U48 renamed the too-large key, the route uses U48's key; if U48's uploader reads the HTTP status rather than `code`, Code Generation records an S2 row against U48 rather than editing U48's component.

## 6. The threat notes (outline of `docs/security/local-demo-threat-notes.md`)

| Threat | Control | Test | Status |
|---|---|---|---|
| Stored XSS through review, comment or display-name text | React escaping; nonce `script-src` with `'strict-dynamic'`; no inline script (BR1.1–BR1.5) | `csp.test.ts`; sweep test; `security-headers.spec.ts` zero violations; adversarial A3 | covered |
| Third-party data leak (analytics) | no third-party origin in the CSP (BR1.3); no analytics code (FD-019) | `csp.test.ts` "allows no third-party origin"; e2e request log | covered |
| CSRF on server actions and the upload | proxy Origin check, `serverActions.allowedOrigins`, `guardRouteRequest`, SameSite=Lax (BR3.3–BR3.5, BR5.1) | `origin.test.ts`, `proxy.test.ts`, upload security test; adversarial A1 | covered |
| DNS rebinding and Host header injection | unknown Host and X-Forwarded-Host refused (BR3.2) | `proxy.test.ts`; curl with `Host: evil.example` | covered |
| Clickjacking | `frame-ancestors 'none'`, `X-Frame-Options: DENY` (BR1.2, BR2.1) | `headers.test.ts`, e2e | covered |
| Session theft through script | HttpOnly cookie, nonce CSP, get-session closed (FD-104) | cookie pin test, e2e cookie check | covered |
| Resource exhaustion through upload | declared-length check, counting stream, U48's per-file and per-review limits and rate limit (BR4.*) | `request-limits.test.ts`, upload security test; adversarial A2 | covered |
| Upload truncated by the proxy | upload route outside the proxy matcher (BR3.4) | `proxy.test.ts` matcher case | covered |
| A page served without CSP or Host check through a dotted URL (`/en/experiences/<id>-a.b`) | matcher excludes only named files, never an extension (BR3.4, ENT-016) | `proxy.test.ts` matcher cases, `proxy.smoke.test.ts` dotted-path case; adversarial A1 | covered |
| Private data in logs | key allowlist, value shape, event shape in both loggers (BR6.1–BR6.6); no direct console output outside the loggers (BR6.7) | `log-policy.test.ts`, logger tests, `log-scrub.int.test.ts`, the `no-console` lint rule; adversarial A4 | covered |
| Private data in output Next.js or Node prints on its own (an unhandled server error with its message and stack) | none in release 1: the application catches and logs code-shaped lines where it can; the framework's own printing is outside the logger | adversarial A4 records what it prints | residual |
| Reporter identity leakage through headers or logs | no reporter identity exists in release 1 (reports are release 2, FD-105); the log policy drops any key not on the list and scrubs free text, and no response header carries an account or persona id | `log-policy.test.ts` (an unknown `reporterAccountId` key is dropped); `security-headers.spec.ts` header inventory | covered for logs and headers; reporting itself deferred (FD-105, T-403) |
| Credential stuffing and enumeration | T-101's limits, delay and generic answers (merged in U8) | U8's tests; the FD-072 adversarial test | deferred (FD-105) |
| CGNAT lock-out | network key | — | deferred (FD-105) |
| Demo shortcuts reaching production | `assertAppMode()` | — | deferred (FD-105) |
| Service worker caching private responses | T-501 deny list and PWA CSP | — | deferred (FD-105) |
| No TLS locally | HSTS, `upgrade-insecure-requests` and `__Secure-` switch on with an https `APP_URL` | `csp.test.ts` and cookie pin test for the https branch | residual: untested against a real TLS front |

Residuals listed in the file: the in-memory limiters reset on restart and are per process; no TLS, no WAF and no reverse proxy locally; `/_next/static`, `/_next/image` and the four named root files skip the Host check (public bytes only); `style-src 'unsafe-inline'`; no CSP violation reporting endpoint; most error messages are written as `[scrubbed]` in logs; Next.js and Node print unhandled errors themselves; the database command-line tools print their errors to the developer's terminal. The file also explains the worker code `db.reset_required` ("run `pnpm db:reset`", BR6.8).

The cookie table of `entities.md` ENT-011 is copied into the file, each row naming its test.

## 7. Owned paths and shared edits

**Owned** (from `unit-of-work.md` U41, with the files this design adds):

- `apps/web/src/proxy.ts`, `apps/web/src/proxy.test.ts`, new `apps/web/src/proxy.smoke.test.ts` (the matcher change of BR3.4 is in `proxy.ts`)
- `apps/web/src/lib/security/` (new: `settings.ts`, `csp.ts`, `headers.ts`, `origin.ts`, `refusal.ts`, `request-limits.ts`, `nonce.ts`, `__tests__/`)
- `apps/web/next.config.ts`
- `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/admin/layout.tsx`: **no edit planned** (Q10); owned so a later nonce use lands here
- `apps/web/src/server/auth.ts`: **no edit planned**; the cookie attributes and `trustedOrigins` live in `server/better-auth/instance.ts`, which also stays unchanged (BR3.7, BR5.1)
- `apps/web/src/server/logger.ts` and `logger.test.ts`
- `apps/worker/src/logger.ts` and `logger.test.ts`, `logger.levels.test.ts` if it asserts the denylist
- the guard lines and the form-parse line in `apps/web/src/app/api/evidence/upload/route.ts`, and a new `route.security.test.ts` beside it
- `infra/compose/.env.example`: the `APP_ALLOWED_ORIGINS` line; the `APP_MODE` comment corrected to say the start-up assertion is deferred (FD-105)
- `docs/security/` (new `local-demo-threat-notes.md`)
- New files no other Unit owns, claimed here: `apps/web/src/server/security-settings.ts` and its test, `apps/web/src/server/security-cookies.test.ts`, `apps/web/src/server/log-scrub.int.test.ts`, `packages/application/src/ports/log-policy.ts` and its test, `apps/worker/src/log-scrub.test.ts`, `apps/web/e2e/smoke/security-headers.spec.ts`

**Shared edits** (append-only or the one line named):

- `packages/application/src/index.ts`: one export line for `log-policy.ts`.
- `packages/application/src/worker.ts`: one export line for `log-policy.ts`; `worker-subpath.test.ts` must stay green unchanged (log-policy imports nothing).
- `packages/application/src/ports/logger.ts`: only if Code Generation's grep (WF6 step 2) finds an id or code field that is logged but missing from `LogFields`; one optional property per such field.
- **Acknowledged shared edits inside U48's area** (Review 01 R-05). `unit-of-work.md` gives U41 only "the origin check" in the upload route, so these three are named here, and the Code Generation plan's files-touched list carries each of them; `unit-of-work.md` and U48's own design files are not edited:
  1. `apps/web/src/app/api/evidence/upload/route.ts`: the guard lines of WF3 step 1 (Host, Origin, declared length) and the one form-parse line of WF3 step 3 (`request.formData()` → `readCappedFormData`). Nothing else.
  2. `apps/web/src/app/api/evidence/upload/route.security.test.ts`: a new test file in U48's directory (§ 8.3).
  3. U48's upload route test helper: add `origin: 'http://localhost:3000'` and `host: 'localhost:3000'` to the requests it builds, so U48's tests pass the new guard. No U48 assertion changes.
- **Console routing** (BR6.7, Review 01 R-02), one call each, code-shaped lines only: `apps/worker/src/main.ts` (line 155 and the `fix` value on line 78, BR6.8), `apps/worker/src/env.ts` (lines 72 and 80) with the matching expectation change in `apps/worker/src/env.load.test.ts` (it asserts the code `database_url_worker_required` and the event `worker.env_invalid` instead of the old sentences; reason recorded: the old sentences carried zod issue text), `packages/i18n/src/request.ts` (line 32, the optional `onIntlError` reporter) and `apps/web/src/i18n/request.ts` (wires the reporter to the web logger), `apps/web/src/server/actions/review.ts` (line 228). `eslint.config.mjs`: the `no-console` scope and its four file exceptions.
- **Contract note**: `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/contract-design/contract-summary.md`: the dated C14 release-1 amendment block of § 9, appended under C14 (append-only).
- **Task file**: `docs/implementation/tasks/T-502-security-hardening.md`: the new `## Amendments — release 1 (FD-105)` section of WF6 step 10b (append-only; the rest stays as history).
- **Consumer tests for the 413**: one new component test beside each consumer of the upload route, `EvidenceUploader` (U48's `components/patient/evidence/`) and U47's composer if it calls the route; each is a new file, nothing in the components changes (§ 8.3).
- `apps/web/playwright.config.ts`: `webServer.env = { APP_ALLOWED_ORIGINS: ORIGIN }`, because the browser tests run on `http://127.0.0.1:3107`, which is not `APP_URL`.
- `apps/web/src/app/not-found.tsx`: one `await connection()` line, only if it removes the CSP violations (BR1.4).
- `docs/implementation/ISSUES.md`: the rows in § 10.
- `docs/status/dependency-check-log.md`: one dated entry.
- `docs/status/decision-log.md`: the FD-next row of § 9, numbered at merge.

**Shared demo code:** U41 deletes none. The only demo code in its area is the demo upload server action and its 11 MB limits; U48 removes the action, and U41 only lowers the limits (BR4.6). If a grep shows a caller left, U50 removes it.

**Not touched:** `.github/workflows` (FD-102), `apps/web/src/app/api/auth/[...all]/route.ts` (FD-104), `apps/web/src/server/better-auth/*` source, `packages/application/src/command.ts` (no `defineCommand` change, FD-105), anything for `RATE_LIMITS`, `network-key.ts` or `assertAppMode`.

## 8. Tests (test-after, `team.md` Testing Posture)

Every test name reads as a sentence; builders, not fixture objects; synthetic data only (`*.demo@example.test` addresses, invented review text, invented file names).

### 8.1 Unit (Vitest `web` project, `// @vitest-environment node` where Web streams are used)

- `settings.test.ts`: APP_URL's origin is first and always allowed; a comma list with spaces and empty entries; default ports removed; host lower-cased; duplicates collapsed; a path, query, fragment, credentials, `*`, `ftp:` or a bare host refused with an error that names `APP_ALLOWED_ORIGINS` and not the value; 11 entries refused; `development` only for `NODE_ENV=development`.
- `csp.test.ts`: the exact directive string for each row of § 4.3; no `'unsafe-eval'` unless development; no `'unsafe-inline'` in `script-src`; `style-src` has no nonce; the nonce appears once; two `newNonce()` values differ and each decodes to 16 bytes; **every directive's sources are within the allowed tokens (no host, scheme or wildcard: the FR99 guard)**; `upgrade-insecure-requests` only on https.
- `headers.test.ts`: `securityHeaderRoutes()` puts the six static headers on `/:path*`, `API_CSP` on `/api/:path*`, X-Robots-Tag on each private pattern and on no public page (`/en`, `/en/doctors`, `/en/experiences/x`); no HSTS in the static list.
- `origin.test.ts`: every row of § 4.1, plus `Host: LOCALHOST:3000` (allowed), `localhost:3000.evil.example`, `localhost.:3000`, `evil.example@localhost:3000` (refused), `Origin: https://localhost:3000` on an http app (refused), a second allowed origin (allowed), `X-Forwarded-Host: localhost:3000, evil.example` (first value checked).
- `request-limits.test.ts`: declared length exactly at the cap passes, one byte more is `too_large`, `abc`, `-1` and a 16-digit value are `length_invalid`; a counted stream of exactly the cap parses; one byte more errors; a chunked (no length) stream of 16 MB stops and the source reports cancelled before it was fully pulled; a body that is not multipart is `malformed`; a null body is `malformed`.
- `refusal.test.ts`: the proxy form has an empty body and `no-store`; the route form has the AppError shape with the right key per kind; no header value appears in the body.
- `sweep.test.ts` (BR1.5): no non-test file under `apps/web/src` contains `<script`, `dangerouslySetInnerHTML`, `javascript:` or a string `on…=` handler; a `next/script` import only beside `readNonce`.
- `security-settings.test.ts`: memoised (the reader runs once); an invalid list makes `guardRouteRequest` answer 500 and log `security.settings_invalid` once.
- `proxy.test.ts` (extended, existing four cases unchanged): the CSP on the response and on the handed-on request carry the same nonce; a client `x-nonce` or `content-security-policy` request header is overwritten; two requests get different nonces; HSTS only with an https `APP_URL`; unknown Host → 403 empty and next-intl never called; cross-origin POST → 403; same-origin POST and a GET without Origin pass; an `/api/health` request skips next-intl and gets no page CSP; a `/_next/webpack-hmr` request skips next-intl and gets only the Host check; matcher covers `/en`, `/en/experiences/abcdefghij-a.b`, `/en/doctors/abcdefghij-dr.x`, `/bn/x.json`, `/api/health`, `/api/auth/ok` and `/_next/webpack-hmr`, and skips exactly `/api/evidence/upload`, `/_next/static/chunk.js`, `/_next/image`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml` and `/manifest.webmanifest` (Review 01 R-01); for `/en/experiences/abcdefghij-a.b` the response has the CSP, `Host: evil.example` gets 403, and a cross-origin POST gets 403; a malformed percent-encoded path (`/en/%E0%A4%A`) with a client `content-security-policy` and `x-nonce` request header still hands on the proxy's own nonce and policy, through the `NextResponse.next({request: {headers}})` fallback (Review 01 R-07).
- No-console guard (BR6.7): `pnpm lint` fails on a fixture file under `lint-fixtures/` that calls `console.log` from an `apps/*/src` path, or, if the rule is a test instead, `no-console.test.ts` lists no file outside the four exceptions.
- `log-policy.test.ts` (application): `LOG_FIELD_NAMES` equals the `LogFields` keys (and the compile-time check exists); each value class of BR6.2 (UUID kept, `account.signIn` kept, `errors.auth.rateLimited` kept, 42 kept, an address, a review sentence, Bengali text, `C:\\x`, `/tmp/x`, a 64-hex hash, a 40-character base64 token, `report.png`, `রিপোর্ট.jpg`, a quoted error message, an object and an array of 25 items each handled as specified); event shape cases including `Signed in shirin.demo@example.test` → `log.invalid_event`.
- `logger.test.ts` (web, existing three cases kept): a value with `@` written as `[scrubbed]`; an invalid event replaced; `level` and `event` cannot be overwritten by a cast field.
- `logger.test.ts` (worker): the existing "redacts email, token, body, filename and password fields" case is replaced by "drops email, token, body, filename and password fields", which asserts the keys are absent (reason recorded: the denylist is replaced by a stricter allowlist; the old expectation `[redacted]` would now be wrong); the envelope case stays; a worker name such as `eventName` kept; a `message` with a path or quotes written as `[scrubbed]`.

### 8.2 Integration (`web-int` and worker projects, compose PostgreSQL running)

- `server/log-scrub.int.test.ts`: with `console` and `process.stdout.write` captured as in `auth.int.test.ts`, register `mitu.logscrub.demo@example.test`, sign in, publish a review whose text holds the markers `LOGSCRUB-EN-7Q` and `লগস্ক্রাব-বাংলা`, upload a PNG named `logscrub-রিপোর্ট-7Q.png` through U48's evidence commands, force one failing path (an upload over the limit and an unknown review id), and include a 40-character token-like string in a field the test passes through a cast; then assert the captured text contains no `@example.test`, neither text marker, no part of the file name and no token. Comments (`comment.post`) are added when U49 is on `main`, else an S4 row hands them to U50.
- `apps/worker/src/log-scrub.test.ts`: the outbox relay's `logOutcomes`, `job.failed` with an error whose message holds an address and a path, U48's processor with a fake reader that throws such an error, the top-level `main()` failure path (`worker.crashed`), `loadEnv` with an invalid `APP_MODE` value `LOGSCRUB-ENV-7Q` (`worker.env_invalid` names `APP_MODE`, never the value) and the queue mismatch line (`fix` is `db.reset_required`, the policies are kept): the `JsonLogger` output holds no marker, address or path, and nothing reaches the console except through the logger.
- The i18n reporter: a missing message key in production mode writes `i18n.message_error` with `errorCode: MISSING_MESSAGE` through the web logger and nothing else.
- Cookie pin, `apps/web/src/server/security-cookies.test.ts` (new, owned; a unit test in the `web` project, kept in `server/` because the `web-server` element may use `better-auth/library-test-support.ts` and `lib/` may not): build the library with `buildTestLibrary` for `http://localhost:3000` and `https://demo.rogikotha.local`; `authCookies.sessionToken` has the name, `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` and no `domain` of ENT-011; `options.trustedOrigins` is `[APP_URL]`; the auth route answers 404 for `/api/auth/get-session` (FD-104 kept).

### 8.3 Route (Vitest, beside the route)

- `app/api/evidence/upload/route.security.test.ts`: cross-origin POST → 403 `forbidden` and no command ran (fake ports record no call); no Origin with `Sec-Fetch-Site: cross-site` → 403; unknown Host → 403; `Content-Length: 15794177` → 413 before `request.body` is touched (a body whose `pull` throws proves it is never read); a chunked 16 MB synthetic stream from a signed-in confirmed account → 413 with fewer than 15 794 176 + one chunk bytes pulled; a 15 MB + 1 byte file inside a request under the cap → U48's `400 evidence.too_large` (U41 does not change it); a renamed `.exe` → U48's `type_rejected` before the storage fake is called; every 413 body is the AppError with `code: 'evidence.too_large'` and U48's `messageKey`.
- 413 shown to people (Review 01 R-04): a component test beside `EvidenceUploader` (U48) and, if U47's composer calls the upload route, one beside the composer feeds each a `413` response with that AppError body and expects the localized text by `messageKey` in `en` ("Each file must be 15 MB or smaller.") and `bn` ("প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।"), with no generic failure text. If either consumer chooses its text by HTTP status instead of `messageKey`, the test is still written, it fails, and Code Generation records an S2 row against the owning Unit instead of editing the component.

### 8.4 Smoke and browser

- `proxy.smoke.test.ts` (in `pnpm smoke`): a request to `/en` and to the dotted page path `/en/experiences/<seeded id>-a.b` gets a CSP with a nonce and no `'unsafe-eval'` in a non-development run; `Host: evil.example` gets 403 on both; a cross-origin POST to the dotted path gets 403 and a same-origin one passes.
- `e2e/smoke/security-headers.spec.ts` (Playwright, run after `pnpm build` with `pnpm --filter @rogikotha/web smoke:e2e`): the headers of BR2.1 on `/en` and `/bn`, no `X-Powered-By`; two loads give different nonces and every `<script>` carries the header's nonce; zero CSP violations in the console across five pages per locale (home, doctors, a doctor profile, an experience, sign-in); after signing in, the cookie jar holds only the ENT-011 cookies with their attributes; no request leaves the app's origin during the run (AC12.4.1).
- Acceptance curls for the Build and Test record: `curl -sI localhost:3000/en` (headers, no X-Powered-By), two calls for nonce rotation, `curl -sI -H "Host: evil.example" localhost:3000/en` (403), a cross-origin server-action POST (403 from the proxy), a cross-origin upload POST (403), an oversized upload (413).

### 8.5 Adversarial test ideas (for the separate agent at Code Generation; 4–5 required)

- **A1 Header spoofing.** Try every Host, X-Forwarded-Host, Origin and Sec-Fetch-Site trick against a page, a server action, `/api/auth/ok` and the upload route: suffix and prefix hosts, a trailing dot, upper case, userinfo, IPv6 brackets, `Origin: null`, the https twin of the http origin, a missing Origin with `same-site`, two X-Forwarded-Host values; repeat each against a dotted page path (`/en/experiences/<id>-a.b`, `/en/experiences/<id>-x.png`) and a malformed percent-encoded path. Expected: only exact allowed values pass; no command runs and no row is written for a refused request.
- **A2 Upload size bypass.** Lie with `Content-Length` (small declared, large sent), send chunked bodies of 16 MB and 200 MB, send from a signed-out client and from a rate-limited account, send several file parts in one request. Expected: 413 or U48's refusal; the server never reads much more than the cap; signed-out and rate-limited requests have their body read not at all; memory of the web process stays bounded (measure the RSS before and after).
- **A3 CSP and nonce.** Seed a review body, a display name and a comment with `<script>`, `<img src=x onerror=…>`, `<a href="javascript:…">`, `<base href>` and `<meta http-equiv>` payloads; send a request with a chosen `x-nonce` and a chosen `content-security-policy` header. Expected: no dialog or script runs in either locale, the response nonce is never the client's, and every nonce differs.
- **A4 Log leak.** Drive the error paths that carry user data into errors (an invalid UUID in a route, an over-long title, a duplicate username, a scanner outage in the worker) with synthetic markers, and log through a cast with free-text fields and an interpolated event name. Also make a server action and the worker throw an unhandled error whose message carries the synthetic marker `LOGSCRUB-THROW-7Q` (for example through a fake port in a test build). Expected: no marker in the output of either logger. What Next.js or Node prints on its own for the unhandled throw is recorded in the Build and Test record as the residual of § 6, not as a pass.
- **A5 Cookies and cross-site use.** With an https `APP_URL` behind a local TLS test server if feasible (else the library's cookie builder), check `__Secure-` and `Secure`; from a page on another origin, submit a form POST and a `fetch` with credentials to a server action and to the upload route while signed in. Expected: refused by the Origin check; SameSite=Lax keeps the cookie off the cross-site POST; `/api/auth/get-session` still 404.

## 9. Contract changes, decisions to record, and notes

- **C14 release-1 amendment (U41)** — Code Generation appends this block under C14 in `inception/contract-design/contract-summary.md` as a dated note (WF6 step 10), the way other Units add C-notes (Review 01 R-04):

  > U41 amendment (date of the Code Generation commit): `POST /api/evidence/upload` also answers `413` AppError `{code: evidence.too_large, messageKey: <U48's key for that code>}` when a request is over 15 794 176 bytes (EVIDENCE_MAX_FILE_BYTES + 65 536), refused from `Content-Length` before the body is read or by the counting stream while it is read; `400` AppError `{code: validation, messageKey: errors.common.validation}` when `Content-Length` is not a decimal integer; and `403` AppError `{code: forbidden, messageKey: errors.common.forbidden}` for an unknown `Host` or `X-Forwarded-Host`, besides a failed origin check. U48 keeps `400 evidence.too_large` for a file over 15 MB found after parsing. Consumers (U47's composer, U48's author components) show the error by `messageKey`, which the consumer tests of U41 check. Every `/api` response also carries `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`.
- **C18 note:** U41 reads `EVIDENCE_MAX_FILE_BYTES`; `UPLOAD_OVERHEAD_BYTES` (65 536) is a new U41 constant; both go into U41's S4 constants row.
- **FD-next (proposed; the number is taken at merge, after U46's FD-106 to FD-108):** "T-502 release-1 security posture (U41): (1) the proxy matches every path, dotted page paths included, except `/api/evidence/upload`, `/_next/static`, `/_next/image` and named root files (never an extension pattern, because slugged page ids accept dots); the upload route is excluded because Next 16 buffers and silently truncates a proxied body, and it runs its own Host, Origin and size guard; (2) a state-changing request without `Origin` is refused unless `Sec-Fetch-Site` is `same-origin`, stricter than Next.js's own check; (3) the session cookie keeps Better Auth's `__Secure-` prefix on https instead of the task file's `__Host-`; (4) `style-src` is `'self' 'unsafe-inline'` with no nonce, because the ported markup uses style attributes; (5) CSP and HSTS are set at runtime by the proxy, the other headers by `next.config.ts`; (6) `trustedOrigins` stays `[APP_URL]`, inert while FD-104 closes the library's routes; (7) the upload route answers `413` for a request over the cap; (8) the locale and admin layouts do not read the nonce, as `unit-of-work.md` U41 lists, because no inline script exists and Next.js stamps its own scripts; a sweep test and `readNonce()` cover any future script; (9) no application code writes to the console directly outside the two loggers (lint rule), so log scrubbing covers everything the application writes; Next.js's own printing of unhandled errors stays a residual. Decided by the agent under the owner's delegation of 2026-11-04, awaiting the owner's confirmation."
- **Rule chain:** no hard rule, data boundary or founder decision changes, so nothing else needs an FD row before code.

## 10. Issue rows (added at Code Generation, `Found in U41 T-502`)

- S4: deferred by FD-105: the per-command rate-limit table and `network-key.ts`, `assertAppMode()`, the FD-072 sign-in-delay adversarial test, and `worker-src` / `manifest-src` for the PWA (one row each, release-2 owner named).
- S4: `UPLOAD_OVERHEAD_BYTES` (65 536) and the upload cap are module constants standing in for T-105 (C18).
- S4: `style-src 'unsafe-inline'` is accepted for the prototype's style attributes; a CSS clean-up could remove it.
- S4: no CSP violation reporting endpoint in release 1; violations show only in the browser console.
- S4: HSTS, `upgrade-insecure-requests` and the `__Secure-` cookie are tested through configuration only; the local demo has no TLS.
- S4: `/_next/static`, `/_next/image` and the four named root files skip the proxy's Host check; they serve public bytes only.
- S3 proposal against U47 (and U46 for doctor, facility and topic pages): a slugged public id accepts any suffix, so `/en/experiences/<id>-<anything>` renders the page under many URLs; a redirect to the canonical slug would give one URL per record. U41 does not build it (those pages belong to U46 and U47); the proxy now covers every such URL either way.
- S4: the database command-line tools (`packages/database/src/migrate.ts`, `reset.ts`) keep their direct console output, excepted from `no-console` because they run from `pnpm db:*` in a developer terminal and never in the web or worker process; their error text can include SQL detail.
- S4: Next.js and Node print unhandled server errors with their message and stack on their own; this output is outside the log policy (residual of § 6).
- S4: the worker's recovery hint is now the code `db.reset_required` instead of the sentence `pnpm db:reset`; the threat notes explain it.
- S4: `trustedOrigins` stays `[APP_URL]`; revisit if release 2 reopens a library route.
- S4: the preference cookies (`rk.lang`, `rk.theme`, `rk.motion`) carry no `Secure` flag on https; they hold no sensitive value.
- S4: most error messages are written as `[scrubbed]` in both logs; the error name and SQL state stay, the text does not.
- S4: every refused request writes one log line; there is no log rate limit.
- S4: the session cookie uses `__Secure-`, not the task file's `__Host-` (FD-next).
- S3 (conditional): the root not-found page is prerendered, so its scripts are blocked by the CSP (BR1.4), if `await connection()` does not fix it.
- S4 (conditional): `serverActions.allowedOrigins` is fixed at build time (WF5 step 3), if Code Generation finds that.
- S4 (conditional): comment posting is not in the log-scrub integration run because U49 is not on `main` yet; U50 adds it.
- Any logged field holding free text that Code Generation's grep finds: one row each, against the owning Unit, severity S1.

## 11. Risks to check in Code Generation and Build and Test

- R1: next-intl's middleware must carry the forwarded `x-nonce` and `content-security-policy` request headers through, as it does `x-pathname` (T-008 verified the mechanism). The proxy test checks the handed-on request, and the e2e test checks that the rendered scripts carry the nonce.
- R2: the second matcher entry must compile in Next's matcher syntax; `next build` fails loudly if not.
- R3: `duplex: 'half'` and `TransformStream` on the request body need Node 24's undici `Request`; the route test uses the same runtime.
- R4: Vitest runs with `NODE_ENV=test`, so no test sees `'unsafe-eval'` unless it sets `development`; the dev-mode case is a unit test of `buildCsp`, not of the running server.
- R5: the existing Playwright specs (`demo.spec.ts`, `motion.spec.ts`) run on `127.0.0.1:3107`; without the `playwright.config.ts` env line every POST they make is refused.
- R6: U48's route tests build requests without `Origin`; they fail until the helper is updated (§ 7).
- R7: the web logger change may scrub values other Units log today (for example a `status` holding free text); the grep in WF6 step 2 finds them first.
- R8: with the dot exclusion gone, the proxy sees every Next.js development internal under `/_next/*` and `/__nextjs*`; WF2b keeps next-intl away from them. `pnpm dev` with the browser console open is part of the manual check, so an HMR or error-overlay request that next-intl would redirect shows up at once.
- R9: a future file added to `apps/web/public` is matched by the proxy until its exact name joins ENT-016; it is still served (the proxy passes it through after the Host check), only with the page flow's cost.
- R10: `no-console` with no allowed method also hits any console call another Unit adds before U41 merges; the inventory in WF6 step 2 runs on the `main` U41 branches from.

## Sources

- Unit and scope: `inception/units-generation/unit-of-work.md` § U41 and "Constants that stand in for T-105"; task file `docs/implementation/tasks/T-502-security-hardening.md`.
- Contracts: `inception/contract-design/contract-summary.md` C14 (and its release-1 amendment) and C18.
- Requirements: `inception/requirements-analysis/requirements.md` (FR61, FR99, NFR8, NFR10, Constraints "Security, privacy and audit"); `inception/user-stories/stories.md` US3.1 (AC3.1.5), US7.1 (AC7.1.3, AC7.1.6), US12.3 (AC12.3.3), US12.4 (AC12.4.1–AC12.4.3).
- U48: `construction/u48-evidence/functional-design/functional-spec.md` WF1, § 6, § 7, § 10; `rules.md` BR2.2, BR7.1; `entities.md` ENT-006.
- Decisions: `docs/status/decision-log.md` FD-072, FD-093, FD-102, FD-103, FD-104, FD-105.
- Code on `main` at `b1c68ad`: `apps/web/next.config.ts`, `apps/web/src/proxy.ts` and `proxy.test.ts`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/admin/layout.tsx`, `apps/web/src/app/not-found.tsx`, `apps/web/src/server/auth.ts`, `apps/web/src/server/better-auth/{instance,session-cookies,library-scope}.ts`, `apps/web/src/server/{logger,env}.ts`, `apps/worker/src/{logger,main,health}.ts`, `apps/worker/src/handlers/outbox-relay.ts`, `packages/database/src/queue/pg-boss-queue.ts`, `packages/application/src/{ports/logger,worker,command}.ts`, `apps/web/src/app/api/auth/[...all]/route.ts`, `apps/web/playwright.config.ts`, `eslint.boundaries.mjs`, `infra/compose/.env.example`, `packages/i18n/messages/{en,bn}.json`, `packages/contracts/src/errors.ts`. The upload route does not exist on `main` yet; U48 builds it.
- Installed library sources: `apps/web/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`, `.../03-file-conventions/proxy.md`, `.../01-next-config-js/serverActions.md`, `.../01-next-config-js/proxyClientMaxBodySize.md`, `next/dist/server/app-render/action-handler.js`, `next/dist/server/app-render/csrf-protection.js`, `next/dist/server/base-server.js`; `better-auth/dist/cookies/index.mjs`, `better-auth/dist/api/middlewares/origin-check.mjs`.
- `docs/status/dependency-check-log.md` (latest Next.js entry 2026-09-13).
