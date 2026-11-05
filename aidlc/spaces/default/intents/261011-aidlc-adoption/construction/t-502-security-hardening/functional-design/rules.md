# Business rules — U41 `t-502-security-hardening` (release 1, narrowed by FD-105)

The YAML block is the source of truth. The summary table after it is a derived view. Rule IDs are frozen once this design is approved (`project.md` Corrections). Scope: the security headers and nonce CSP, Host and Origin checks, the upload request cap, the session cookie posture and `trustedOrigins`, log scrubbing, and the threat notes. The rate-limit table, `network-key.ts`, `assertAppMode()`, the FD-072 adversarial test and the PWA CSP are deferred to release 2 (FD-105) and have no rule here. Every decision below was taken by the agent under the owner's delegation of 2026-11-04; the reasoning is in `functional-design-questions.md`. Review 01 changed BR1.1, BR3.2, BR3.4, BR4.2 and BR6.1 and added BR6.7 and BR6.8 (see `functional-design-questions.md` § Review 01 findings).

```yaml
rules:
  # BR1 — Content Security Policy and nonce
  - id: BR1.1
    statement: "Every page response carries a Content-Security-Policy built from a fresh 128-bit nonce, and the same policy is set on the forwarded request so Next.js stamps its own scripts with that nonce."
    category: security
    applies_to: "apps/web/src/proxy.ts, lib/security/csp.ts"
    trigger: "Every request the proxy treats as a page (BR3.4 branch 3), dotted paths included"
    logic: "nonce = base64(crypto.getRandomValues(16 bytes)); policy = buildCsp({nonce, https, development}); forwarded request headers: set x-nonce = nonce and content-security-policy = policy, overwriting any value the client sent; the request is then handed to next-intl's middleware exactly as today (x-pathname kept); IF next-intl's response carries no request-header override (no x-middleware-override-headers, which is its bare NextResponse.next() when decodeURI fails on a malformed percent-encoded path) THEN the proxy returns NextResponse.next({request: {headers}}) with its own headers instead, so the client's headers never reach the renderer; response header Content-Security-Policy = policy (Review 01 R-07)"
    violation: "S1: a page without the header, a reused nonce, or a client-chosen nonce"
    source: "T-502 step 1, Next 16 CSP guide (installed docs), Constraints 'Security, privacy and audit' (strict nonce CSP)"
  - id: BR1.2
    statement: "The policy has exactly these directives: default-src 'self'; script-src 'self' 'nonce-<n>' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; plus upgrade-insecure-requests only when APP_URL is https."
    category: security
    applies_to: "lib/security/csp.ts"
    trigger: "Every policy built"
    logic: "IF development (NODE_ENV === 'development') THEN script-src also gets 'unsafe-eval'; ELSE it never does; style-src carries no nonce, because a nonce makes browsers ignore 'unsafe-inline' and the ported markup and React style props render style attributes; worker-src and manifest-src are not written (default-src covers them until the PWA work, FD-105)"
    violation: "S1: 'unsafe-eval' outside development, 'unsafe-inline' in script-src, or a missing directive"
    source: "T-502 step 1 (narrowed: no worker-src or manifest-src in release 1), FD-105"
  - id: BR1.3
    statement: "The policy allows no third-party origin: no host source, no https: or http: scheme source and no wildcard in any directive."
    category: privacy
    applies_to: "lib/security/csp.ts and its test"
    trigger: "Every policy built; the test enumerates every directive"
    logic: "allowed tokens: 'self', 'none', 'nonce-<n>', 'strict-dynamic', 'unsafe-inline' (style-src only), 'unsafe-eval' (script-src, development only), blob: and data: (img-src only); anything else fails the test; adding an origin later needs an FD row first"
    violation: "S1: an analytics or other third-party request becomes possible (FR99)"
    source: "FR99, FD-019, AC12.4.1, AC12.4.3, U41 brief (release-1 FR99 guard)"
  - id: BR1.4
    statement: "Pages under [locale] render dynamically, so every response gets its own nonce."
    category: security
    applies_to: "apps/web/src/app/[locale]/layout.tsx and every page tree under it"
    trigger: "Code Generation and every later Unit"
    logic: "the locale layout keeps reading headers() (it already does), which makes the whole tree dynamic; no Unit adds generateStaticParams, 'use cache', dynamic = 'force-static' or Partial Prerendering under [locale] without an FD row; the root app/not-found.tsx is made dynamic with one `await connection()` line if Code Generation confirms that removes its CSP violations, otherwise an S3 row records that its scripts are blocked (the page still works without them)"
    violation: "S2: a statically prerendered page whose scripts carry no nonce and are blocked"
    source: "Next 16 CSP guide 'Static vs Dynamic Rendering with CSP' (installed docs)"
  - id: BR1.5
    statement: "No inline script, dangerouslySetInnerHTML, string event handler or javascript: URL exists in apps/web/src; a future next/script must pass the request's nonce."
    category: security
    applies_to: "apps/web/src/**/*.{ts,tsx}"
    trigger: "Every pnpm check (the sweep test)"
    logic: "the sweep test reads every non-test source file and fails on '<script', 'dangerouslySetInnerHTML', 'javascript:' and an on<event>= string attribute; 'next/script' is allowed only in a file that also calls readNonce() from lib/security/nonce.ts; on main the sweep finds no hit, so the layouts need no edit (Q10)"
    violation: "S1: a script path that bypasses the nonce"
    source: "T-502 steps 1 and 9"
  - id: BR1.6
    statement: "Every /api response carries the static policy default-src 'none'; frame-ancestors 'none'."
    category: security
    applies_to: "next.config.ts headers()"
    trigger: "Every /api/* response, the upload route included"
    logic: "static header on source '/api/:path*'; JSON and image bytes never need a script or a frame"
    violation: "S3: an API response that a browser could render as a document with script"
    source: "T-502 step 2 (extended), defence in depth"

  # BR2 — Other security headers
  - id: BR2.1
    statement: "Every response carries X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=(), X-Frame-Options: DENY, Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Resource-Policy: same-origin."
    category: security
    applies_to: "next.config.ts headers(), from the list in lib/security/headers.ts"
    trigger: "Every response, static files and the upload route included"
    logic: "one entry on source '/:path*'; these values never depend on the environment, so build-time evaluation is safe"
    violation: "S2: a header missing on any storyboard page"
    source: "T-502 step 2, U41 brief"
  - id: BR2.2
    statement: "Private surfaces also carry X-Robots-Tag: noindex, nofollow."
    category: privacy
    applies_to: "next.config.ts headers()"
    trigger: "Every response on a PrivatePathSet pattern (ENT-006)"
    logic: "the staff console, /me, the auth pages, notifications, saved, write, the edit page, author pages and /api; the pages keep their noindex() metadata"
    violation: "S3: a private page indexable by header"
    source: "T-502 step 2, NFR8"
  - id: BR2.3
    statement: "X-Powered-By is never sent."
    category: security
    applies_to: "next.config.ts"
    trigger: "Every response"
    logic: "poweredByHeader: false stays (already on main); a test pins it"
    violation: "S3: the framework is advertised"
    source: "T-502 step 2"
  - id: BR2.4
    statement: "Strict-Transport-Security: max-age=31536000 is sent only when APP_URL is https."
    category: security
    applies_to: "apps/web/src/proxy.ts"
    trigger: "Every response the proxy lets through"
    logic: "IF SecuritySettings.https THEN set the header ELSE never; set at runtime in the proxy, not in next.config headers(), because headers() is evaluated at build time and the build may run with another APP_URL; no includeSubDomains and no preload (reversible)"
    violation: "S3: HSTS on http, or missing on https"
    source: "T-502 step 2, U41 brief"

  # BR3 — Host and Origin
  - id: BR3.1
    statement: "The allowed origins are APP_URL's origin plus every entry of APP_ALLOWED_ORIGINS; the allowed hosts are their URL.host values."
    category: configuration
    applies_to: "lib/security/settings.ts, server/security-settings.ts, next.config.ts"
    trigger: "First use in each process"
    logic: "split APP_ALLOWED_ORIGINS on commas, trim, drop empty entries; each entry must parse as http: or https: with no path other than '/', no query, no fragment, no user or password, no '*'; lower-case the host; drop the default port; at most 10 entries; APP_URL's origin is always first and always allowed"
    violation: "the process refuses to serve (BR7.1)"
    source: "T-502 step 3, U41 brief"
  - id: BR3.2
    statement: "A request whose Host, or whose X-Forwarded-Host when present, is not an allowed host is refused."
    category: security
    applies_to: "checkHost in apps/web/src/lib/security/origin.ts, called by apps/web/src/proxy.ts (every matched request) and by guardRouteRequest in apps/web/src/server/security-settings.ts (every route handler the proxy does not match)"
    trigger: "Every request, before any other work"
    logic: "host = Host header, ASCII lower-cased; IF host is missing OR not in allowedHosts THEN refuse kind host; forwarded = first comma-separated value of X-Forwarded-Host, trimmed and lower-cased; IF forwarded is present AND not in allowedHosts THEN refuse kind forwarded_host (Next.js's server-action check reads X-Forwarded-Host first, and Next itself fills it from Host only when absent); exact match only, so 'localhost:3000.evil.example', a trailing dot and a userinfo trick all fail"
    violation: "403 (BR3.6)"
    source: "T-502 step 3, Next 16 action-handler.js parseHostHeader (installed)"
  - id: BR3.3
    statement: "A state-changing request is accepted only from an allowed origin."
    category: security
    applies_to: "checkOrigin in apps/web/src/lib/security/origin.ts, called by apps/web/src/proxy.ts (POST, PUT, PATCH, DELETE on matched paths, server actions included) and by guardRouteRequest in apps/web/src/server/security-settings.ts"
    trigger: "Every request whose method is not GET, HEAD or OPTIONS"
    logic: "IF Origin is present: 'null' refuses kind origin_null; an exact match in allowedOrigins is allowed; anything else refuses kind origin. IF Origin is absent: allowed only when Sec-Fetch-Site is exactly 'same-origin', else refuse kind origin_missing (stricter than Next.js, which lets a request without Origin through; browsers send Origin on every POST)"
    violation: "403 (BR3.6); no server action or route handler body runs"
    source: "T-502 step 3, Constraints 'Security, privacy and audit' (CSRF and origin checks), Next 16 data-security guide"
  - id: BR3.4
    statement: "The proxy matches every path except /api/evidence/upload, /_next/static, /_next/image and a named list of root files; every route handler the proxy does not match runs guardRouteRequest itself as its first line."
    category: security
    applies_to: "proxy.ts config.matcher, guardRouteRequest in apps/web/src/server/security-settings.ts, apps/web/src/app/api/evidence/upload/route.ts"
    trigger: "Every request"
    logic: "matcher: ['/((?!api/evidence/upload|_next/static/|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)']; the exclusions are named files, never an extension pattern, because a slugged page id accepts any suffix (SLUGGED_PUBLIC_ID_RE in packages/contracts/src/ids.ts), so /en/experiences/<id>-a.b is a real page that must get the CSP, the Host check and the Origin rule (Review 01 R-01); apps/web/public does not exist on main and app/ has no file-based metadata route, so the named list holds the four conventional root files only; a Unit that adds a public file adds its exact name to the list in the same commit; the upload route is excluded because the proxy buffers a matched request's body in memory and silently truncates it at proxyClientMaxBodySize (installed docs, proxyClientMaxBodySize 'Behavior'). Inside the proxy, three branches: (1) /api/* → Host and Origin, then NextResponse.next() without next-intl or a page CSP; (2) Next.js internals still matched (/_next/* other than static and image, /__nextjs*) → Host check only, then NextResponse.next(), so next-intl never rewrites them; (3) every other path, dotted or not → the page flow of BR1.1. Narrowed in Review 01 (R-03): POST /api/auth/* stays under the proxy and keeps FD-104's handler unchanged"
    violation: "S1: a page served without the CSP or Host check, an upload truncated by the proxy, or a body-carrying route with no Host or Origin check"
    source: "Next 16 proxy.md (matcher, 'Server Functions are not separate routes'), proxyClientMaxBodySize.md (installed docs), Review 01 R-01 and R-03"
  - id: BR3.5
    statement: "serverActions.allowedOrigins is the list of allowed hosts."
    category: security
    applies_to: "next.config.ts"
    trigger: "Config load (next dev, next build, next start)"
    logic: "allowedOrigins = SecuritySettings.allowedHosts (host[:port], the form Next.js compares); when next.config loads without APP_URL (a build with no .env) the list is [] and Next.js keeps its same-origin default; the proxy's BR3.3 check runs before Next.js's own check in every case"
    violation: "S2: a legitimate second origin's server actions fail, or a disallowed one passes Next.js's check (the proxy still refuses it)"
    source: "T-502 step 3, Next 16 serverActions.md and csrf-protection.js (installed)"
  - id: BR3.6
    statement: "A refusal answers without echoing the request and is logged once."
    category: security
    applies_to: "proxy.ts, guardRouteRequest callers"
    trigger: "Every refusal of BR3.2, BR3.3, BR4.2 or BR4.3"
    logic: "proxy: status 403, empty body, Cache-Control: no-store; route handler: status 403 with AppError {code: 'forbidden', messageKey: 'errors.common.forbidden', correlationId}; one log line security.request_refused {kind, status} (plus correlationId in a route handler), never the Host, Origin, path, user agent or address; no new i18n key (both strings exist in en.json and bn.json)"
    violation: "S2: an attacker-chosen value reflected or logged"
    source: "T-502 step 3 ('403, no body'), C14 (AppError body, 403 for a failed origin check)"
  - id: BR3.7
    statement: "Better Auth's trustedOrigins stays [APP_URL]."
    category: security
    applies_to: "apps/web/src/server/better-auth/instance.ts (unchanged)"
    trigger: "Instance creation"
    logic: "the library checks Origin only on its HTTP routes (origin-check.mjs returns early without ctx.request), and FD-104 leaves only GET /api/auth/ok open, which the check skips; widening the list adds nothing and would contradict T-101 BR4.2; a test pins the value and the route allowlist"
    violation: "S2: a widened trust list without a reason"
    source: "FD-104, T-101 BR4.2, Better Auth 1.7.14 api/middlewares/origin-check.mjs (installed)"

  # BR4 — Upload request cap
  - id: BR4.1
    statement: "An upload request is at most EVIDENCE_MAX_FILE_BYTES + 65 536 = 15 794 176 bytes."
    category: limit
    applies_to: "apps/web/src/app/api/evidence/upload/route.ts, lib/security/request-limits.ts"
    trigger: "Every POST /api/evidence/upload"
    logic: "maxRequestBytes = EVIDENCE_MAX_FILE_BYTES (U48, C18) + UPLOAD_OVERHEAD_BYTES (65 536); one file per request (U48 Q7)"
    violation: "413 (BR4.2, BR4.3)"
    source: "U48 functional-spec.md WF1 step 1, U48 ENT-006, C18, FR61, AC7.1.3"
  - id: BR4.2
    statement: "A declared Content-Length is checked before any byte of the body is read."
    category: limit
    applies_to: "checkDeclaredLength in apps/web/src/lib/security/request-limits.ts, called by the upload route right after guardRouteRequest"
    trigger: "Every upload request, before authentication and before U48's rate limit"
    logic: "IF Content-Length is present AND not /^[0-9]{1,15}$/ THEN 400 AppError {code: validation, messageKey: errors.common.validation}; IF it is greater than maxRequestBytes THEN 413 AppError {code: evidence.too_large, messageKey: the key U48 maps evidence.too_large to}; IF absent (chunked) THEN continue, BR4.3 counts; the response carries Connection: close so the server stops reading"
    violation: "a large body is read before it is refused"
    source: "U48 WF1 step 1, T-502 step 5, U41 brief"
  - id: BR4.3
    statement: "The body is read only through a counting stream that stops at the cap, so a chunked body or a lying Content-Length cannot exceed it."
    category: limit
    applies_to: "readCappedFormData in lib/security/request-limits.ts; the upload route's form-parse line (U48 step 4)"
    trigger: "When U48's route parses the form"
    logic: "wrap request.body in a TransformStream that adds each chunk's length; IF the running total exceeds maxRequestBytes THEN error the stream with a BodyLimitExceeded marker and cancel the source; parse with new Request(request.url, {method, headers, body: counted, duplex: 'half'}).formData(); BodyLimitExceeded maps to 413 evidence.too_large; any other parse error maps to U48's existing parse-failure answer; a Content-Length smaller than the body is cut by Node's HTTP parser at the declared length, and a larger one is cut by this counter"
    violation: "S1: memory exhaustion through one request"
    source: "T-502 step 5 (streaming byte counter), U41 brief (count the stream)"
  - id: BR4.4
    statement: "U41's lines keep U48's order: Host, Origin and declared length first; then U48's authentication, its rate limit, then the capped parse."
    category: limit
    applies_to: "apps/web/src/app/api/evidence/upload/route.ts"
    trigger: "Every upload request"
    logic: "U41 edits only WF1 step 1 (the guard lines) and the one line of WF1 step 4 that reads the form; a signed-out or unconfirmed request and a rate-limited one never have their body read"
    violation: "S2: U48's rules reordered by U41"
    source: "U48 functional-spec.md WF1 and § 7"
  - id: BR4.5
    statement: "Per-file, per-review, file-count and file-type limits stay U48's; U41 tests them adversarially on the real route."
    category: limit
    applies_to: "U48 BR2.1 to BR2.4"
    trigger: "Adversarial tests at Code Generation"
    logic: "no U41 code duplicates them"
    violation: "a second, drifting copy of the limits"
    source: "unit-of-work.md U41 responsibilities, C18 (one owner per constant)"
  - id: BR4.6
    statement: "Once no server action carries a file, the server-action and proxy body limits return to 1 MB."
    category: limit
    applies_to: "next.config.ts experimental.serverActions.bodySizeLimit and experimental.proxyClientMaxBodySize"
    trigger: "Code Generation, after U48 is merged"
    logic: "IF a grep of apps/web/src/server/actions finds no File or Blob handling THEN set both to '1mb' and replace the 11 MB comment; ELSE keep '11mb' and add an S4 row naming the action"
    violation: "S3: an 11 MB buffered body allowed on every page POST for no reason"
    source: "next.config.ts comment on main (the 11 MB limits exist for the demo upload action U48 removes)"

  # BR5 — Session cookies and trust
  - id: BR5.1
    statement: "The session cookie is HttpOnly, SameSite=Lax, Path=/, has no Domain, and is Secure with the __Secure- prefix exactly when APP_URL is https."
    category: security
    applies_to: "server/better-auth/instance.ts (unchanged), the cookie tests"
    trigger: "Every Set-Cookie for rk.session_token or rk.dont_remember"
    logic: "Better Auth 1.7.14 already does this with cookiePrefix 'rk', useSecureCookies = APP_URL starts with https://, defaultCookieAttributes {httpOnly, sameSite lax, path /} (cookies/index.mjs); U41 changes no auth code and pins the attributes for http and https in tests; __Host- is not used (Q6)"
    violation: "S1: a session cookie readable by script or sent cross-site"
    source: "T-502 step 6 (narrowed), Constraints 'Security, privacy and audit', U41 brief"
  - id: BR5.2
    statement: "Release 1 sets only the cookies in CookieInventory (ENT-011)."
    category: privacy
    applies_to: "every page, signed in and signed out"
    trigger: "The e2e cookie check"
    logic: "after the storyboard's sign-in and a language and theme switch, the browser holds only the session token (and rk.dont_remember if used) and rk.lang, rk.theme, rk.motion; no consent banner exists"
    violation: "S1: a non-essential or third-party cookie (AC12.4.2)"
    source: "AC12.4.2, FD-019"

  # BR6 — Log scrubbing
  - id: BR6.1
    statement: "Everything the application writes to its log goes through one of the two loggers, and both keep only allowlisted field names: LOG_FIELD_NAMES for the web, LOG_FIELD_NAMES plus WORKER_LOG_FIELD_NAMES for the worker. Output Next.js or Node prints on its own (an unhandled server error) is outside this guarantee and is a residual in the threat notes (Review 01 R-02)."
    category: privacy
    applies_to: "packages/application/src/ports/log-policy.ts, apps/web/src/server/logger.ts, apps/worker/src/logger.ts"
    trigger: "Every log call"
    logic: "LOG_FIELD_NAMES is declared next to LogFields with a compile-time check that the two hold the same names, so a Unit that adds a LogFields key must add it to the list in the same file; an unknown key is dropped; the worker's key denylist (email, token, body, filename, password) is replaced by the allowlist, so those keys are now dropped instead of written as [redacted]"
    violation: "S1: private data in logs (AC12.3.3)"
    source: "NFR10, AC12.3.3, T-101 BR8.1, T-502 step 7"
  - id: BR6.2
    statement: "Every kept value must look like an identifier or a code; anything else is written as [scrubbed]."
    category: privacy
    applies_to: "scrubLogValue in log-policy.ts"
    trigger: "Every kept field"
    logic: "finite number or boolean: kept; string: kept only IF it matches ^[A-Za-z0-9._:-]{1,120}$ AND contains no run of 32 or more letters and digits AND does not end in a file extension (ENT-012); ELSE '[scrubbed]'; array: at most 20 items, each scalar treated as above, other items '[scrubbed]'; object, NaN, Infinity or any other type: '[scrubbed]'; undefined and null: dropped; so an address (@), review text or Bengali text (spaces, non-ASCII), a path (/ or \\), a token or hash, an error message with quotes, and a file name are never written"
    violation: "S1: private data in logs"
    source: "T-502 step 7 (tightened from a denylist to a value shape), AC7.1.6, U48 BR7.1, U47 and U49 logging rules"
  - id: BR6.3
    statement: "An event name must be a dotted identifier of at most 80 characters, else the line is written as log.invalid_event."
    category: privacy
    applies_to: "log-policy.ts, both loggers"
    trigger: "Every log call"
    logic: "^[A-Za-z][A-Za-z0-9_]*(\\.[A-Za-z0-9_]+){0,4}$; this stops data interpolated into the event name ('Signed in x@example.test')"
    violation: "S1: private data through the event name"
    source: "T-101 instance.ts library logger (same failure mode), T-502 step 7"
  - id: BR6.4
    statement: "The envelope fields are written last and cannot be overwritten by a field."
    category: integrity
    applies_to: "both loggers"
    trigger: "Every line"
    logic: "web: {level, event, ...fields, at}, with level and event re-asserted after the fields; worker: {...fields, ts, level, event} as today"
    violation: "S3: a misleading log line"
    source: "apps/worker/src/logger.ts on main (existing guarantee), kept"
  - id: BR6.5
    statement: "The scrubbing applies in every APP_MODE and has no switch."
    category: privacy
    applies_to: "both loggers"
    trigger: "Always"
    logic: "no environment variable or argument turns it off; tests use the real loggers with an injected writer"
    violation: "S1"
    source: "AC12.3.3, BR6.1"
  - id: BR6.6
    statement: "A test proves that review text, evidence filenames, email addresses and tokens never reach either log."
    category: privacy
    applies_to: "log-policy.test.ts, both logger tests, server/log-scrub.int.test.ts, the worker log test"
    trigger: "Every pnpm check"
    logic: "unit vectors for every value class; an integration run that registers, signs in, publishes a review and uploads evidence with synthetic markers in the email, the review text (English and Bengali), the file name and a token-like string, with console and stdout captured, then asserts no marker appears; comments are included when U49 is on main at Code Generation, else U50 adds them (S4 row)"
    violation: "S1"
    source: "U41 brief, AC12.3.3, AC7.1.6, T-502 step 7"
  - id: BR6.7
    statement: "No application source file in apps/ or packages/ writes to the console directly; only apps/web/src/server/logger.ts and apps/worker/src/logger.ts do."
    category: privacy
    applies_to: "every non-test source file under apps/*/src and packages/*/src; eslint.config.mjs"
    trigger: "Every pnpm check (lint)"
    logic: "no-console is set to 'error' with no allowed methods for apps/*/src/** and packages/*/src/**, test files and the two logger files excepted; the two database command-line tools packages/database/src/migrate.ts and reset.ts are also excepted with a one-line reason each (they run from pnpm db:* in a developer terminal, never in the web or worker process) and get an S4 row; if the flat config cannot express this, a test walks the same files and fails on any console. call; the calls found on main are routed through the logger as code-shaped lines: apps/worker/src/main.ts:155 → logger.error('worker.crashed', {errorName}); packages/i18n/src/request.ts:32 → an injected reporter that apps/web wires to logger.error('i18n.message_error', {errorCode: error.code}); apps/web/src/server/actions/review.ts:228 → logger.error('review.action_failed', {command, errorName}); apps/worker/src/env.ts:72,80 → new JsonLogger().error('worker.env_invalid', {code: 'database_url_worker_required' | 'env_invalid', variables: [the failing variable names]}), since JsonLogger needs no environment; never the message or the stack"
    violation: "S1: a message or stack quoting user input reaches the log outside the policy"
    source: "Review 01 R-02, AC12.3.3"
  - id: BR6.8
    statement: "The worker's start-up recovery hint is a code-shaped constant."
    category: integrity
    applies_to: "apps/worker/src/main.ts (worker.start_failed)"
    trigger: "A queue policy mismatch at start-up"
    logic: "fix: 'db.reset_required' replaces 'pnpm db:reset', which BR6.2 would write as [scrubbed]; expectedPolicy and actualPolicy are pg-boss policy names (standard, short, singleton, stately) and stay as they are, because they are already code-shaped; the threat notes and the worker's start-up section say that db.reset_required means 'run pnpm db:reset'"
    violation: "S3: the operator loses the only recovery hint"
    source: "Review 01 R-08"

  # BR7 — Configuration and failure
  - id: BR7.1
    statement: "Invalid security settings stop the process from serving rather than serve with a weak policy."
    category: configuration
    applies_to: "server/security-settings.ts, proxy.ts, next.config.ts"
    trigger: "First use"
    logic: "an invalid APP_URL or APP_ALLOWED_ORIGINS throws one error naming the variable, never its value; the proxy then answers 500 with an empty body and logs security.settings_invalid once; next.config.ts throws on a present but invalid APP_ALLOWED_ORIGINS, so next dev and next start fail fast; a missing APP_URL in next.config (a build without .env) is not an error there (T-101 BR7.2: next build needs no secret and no database)"
    violation: "S1: a silently open origin list"
    source: "T-101 BR7.2, construction.md (fail fast)"
  - id: BR7.2
    statement: "Settings are read once per process at first use, never at module load."
    category: configuration
    applies_to: "server/security-settings.ts"
    trigger: "First request"
    logic: "memoised; tests pass their own reader"
    violation: "S3: a build that needs the environment"
    source: "T-101 BR7.2"
  - id: BR7.3
    statement: "lib/security holds only pure helpers; reading the environment and logging happen in proxy.ts and server/security-settings.ts."
    category: architecture
    applies_to: "apps/web/src/lib/security/"
    trigger: "pnpm lint:boundaries"
    logic: "lib/ is the web-shared element, which may import only contracts and i18n and no Node built-in (FD-093 (6)); Web Crypto, TransformStream, Request and URL are globals, not imports"
    violation: "the boundary lint fails"
    source: "FD-093 (6), eslint.boundaries.mjs"

  # BR8 — Scope guards
  - id: BR8.1
    statement: "U41 builds none of the parts FD-105 deferred, adds no CI file, and keeps FD-104's route allowlist."
    category: scope
    applies_to: "the whole Unit"
    trigger: "Code Generation and review"
    logic: "no RATE_LIMITS table, no network-key.ts, no defineCommand change, no assertAppMode, no sign-in-delay adversarial test, no worker-src or manifest-src; nothing under .github/workflows (FD-102); apps/web/src/app/api/auth/[...all]/route.ts unchanged"
    violation: "S2: scope drift"
    source: "FD-105, FD-102, FD-104, unit-of-work.md U41"
  - id: BR8.2
    statement: "Every threat in docs/security/local-demo-threat-notes.md names its control and the test that covers it, or says it is residual or deferred and who owns it."
    category: documentation
    applies_to: "docs/security/local-demo-threat-notes.md"
    trigger: "Code Generation"
    logic: "rows from T-502's threat table, narrowed to release 1; the cookie table of ENT-011; the residuals list"
    violation: "S3: an undocumented threat"
    source: "T-502 'Threat notes', AD-16"
```

## Rules summary (derived from the YAML)

| ID | Rule in one line | Where |
|---|---|---|
| BR1.1 | Fresh 128-bit nonce per page request; CSP on request and response | `proxy.ts`, `csp.ts` |
| BR1.2 | The exact directive list; `'unsafe-eval'` only in development; styles without nonce | `csp.ts` |
| BR1.3 | No third-party origin in any directive (FR99 guard) | `csp.ts` test |
| BR1.4 | Pages under `[locale]` stay dynamic; root not-found made dynamic if it works | layouts, `not-found.tsx` |
| BR1.5 | No inline script or handler; `next/script` must use the nonce | sweep test |
| BR1.6 | `/api` responses get `default-src 'none'; frame-ancestors 'none'` | `next.config.ts` |
| BR2.1 | nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP, CORP everywhere | `next.config.ts` |
| BR2.2 | X-Robots-Tag on private paths | `next.config.ts` |
| BR2.3 | No X-Powered-By | `next.config.ts` |
| BR2.4 | HSTS only on https, set at runtime | `proxy.ts` |
| BR3.1 | Allowed origins = APP_URL origin + APP_ALLOWED_ORIGINS | `settings.ts` |
| BR3.2 | Unknown Host or X-Forwarded-Host refused | `proxy.ts`, `origin.ts` |
| BR3.3 | Unsafe methods need an allowed Origin, or Sec-Fetch-Site same-origin | `proxy.ts`, `origin.ts` |
| BR3.4 | Proxy covers every path, dotted pages included, except the upload route, `_next/static`, `_next/image` and named root files; unmatched routes guard themselves | `proxy.ts`, upload route |
| BR3.5 | `serverActions.allowedOrigins` = allowed hosts | `next.config.ts` |
| BR3.6 | 403 without echo; one `security.request_refused` line | `proxy.ts`, route |
| BR3.7 | `trustedOrigins` stays `[APP_URL]` (inert under FD-104) | instance test |
| BR4.1 | Upload cap 15 794 176 bytes | upload route |
| BR4.2 | Content-Length checked before reading (400 / 413) | `request-limits.ts` |
| BR4.3 | Counting stream stops chunked or lying bodies at the cap | `request-limits.ts` |
| BR4.4 | U48's order kept; U41 edits two places only | upload route |
| BR4.5 | Per-file and per-review limits stay U48's | U48 |
| BR4.6 | Body limits back to 1 MB when no action carries a file | `next.config.ts` |
| BR5.1 | Session cookie HttpOnly, Lax, Path=/, Secure and `__Secure-` on https | tests only |
| BR5.2 | Only the essential cookies exist | e2e |
| BR6.1 | Everything the application logs goes through the two loggers; key allowlist, one list beside `LogFields` | `log-policy.ts` |
| BR6.2 | Values must look like ids or codes, else `[scrubbed]` | `log-policy.ts` |
| BR6.3 | Event names must be dotted identifiers | `log-policy.ts` |
| BR6.4 | Envelope fields cannot be overwritten | loggers |
| BR6.5 | No switch turns scrubbing off | loggers |
| BR6.6 | A test proves no review text, filename, address or token is logged | tests |
| BR6.7 | No direct `console.` call outside the two loggers (lint) | `eslint.config.mjs` |
| BR6.8 | Worker recovery hint is the code `db.reset_required` | `apps/worker/src/main.ts` |
| BR7.1 | Invalid settings fail closed | settings, proxy, config |
| BR7.2 | Settings read once, at first use | `security-settings.ts` |
| BR7.3 | `lib/security` stays pure (FD-093 (6)) | boundary lint |
| BR8.1 | No deferred part, no CI, FD-104 kept | whole Unit |
| BR8.2 | Threat notes map threat to control to test | `docs/security/` |
