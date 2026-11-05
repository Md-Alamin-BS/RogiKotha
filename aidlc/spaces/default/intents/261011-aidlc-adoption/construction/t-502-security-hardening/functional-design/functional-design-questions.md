# Functional Design questions — U41 `t-502-security-hardening`

U41 is T-502 narrowed for release 1 (FD-105): security headers and a nonce CSP, Host and Origin checks, the upload request cap, the session cookie posture and `trustedOrigins`, log scrubbing, and the threat notes. The owner delegated every design decision to the agent on 2026-11-04 ("all the permission need from me or approval do it yourself which is best and recomeded"). Each question below lists the recommended option first and is answered by it. Code Generation adds the FD-next row proposed in `functional-spec.md` § 9 to `docs/status/decision-log.md` before any code (`project.md` Mandated); its number is taken at merge, because U46 has already proposed FD-106 to FD-108.

## Settled before this stage (not asked again)

- FD-105: the rate-limit table and `network-key.ts`, `assertAppMode()`, the FD-072 adversarial test and the PWA CSP are deferred to release 2.
- FD-102: no GitHub Actions; the gate is local `pnpm check` and `pnpm smoke`; `.github/workflows` is not touched.
- FD-104: the library's `/api/auth/*` routes stay closed except `/api/auth/ok`.
- FR99 and FD-019: release 1 has no analytics or third-party origin, so the CSP allows none.
- U48 WF1 and § 7: U41 owns the origin check and the Content-Length cap of 15 MB plus 64 KB (15 794 176 bytes) before the body is read; U48 owns its per-account upload rate limit and its per-file, per-review and type limits.
- Next 16.3.4 is pinned, and `proxy.ts` is its middleware file. Confirmed from the installed `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` ("The `middleware` file convention is deprecated and has been renamed to `proxy`"; "Proxy defaults to using the Node.js runtime") and from the existing `apps/web/src/proxy.ts`, which Next already runs on `main`.

## Question 1 — Where the CSP and the other headers are set

A. **The CSP and HSTS at runtime in `proxy.ts`; the headers that never change (nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options, COOP, CORP, X-Robots-Tag, the `/api` CSP) in `next.config.ts` `headers()`** (recommended). The nonce must be fresh per request, so the CSP has to come from the proxy. HSTS depends on `APP_URL`, and `next.config.ts` `headers()` is evaluated at build time, so a build made with one `APP_URL` would send the wrong HSTS answer when started with another. The constant headers belong in `next.config.ts` because it reaches every response, including static files and the upload route the proxy does not match.
B. Everything in `next.config.ts`: no per-request nonce is possible, so `script-src` would need `'unsafe-inline'`, which the requirements rule out (strict nonce CSP).
C. Everything in the proxy: static files and the upload route would get no headers, because the proxy does not run for them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 2 — Which requests the proxy covers

A. **Every path, pages with a dot in their URL included, and every `/api` path except `/api/evidence/upload`; only `/_next/static`, `/_next/image` and named root files are also left out; the upload route runs its own Host, Origin and size guard as its first lines** (recommended; the "every path" part was changed by Review 01 R-01, see below). The installed `proxyClientMaxBodySize.md` says a proxied request's body is buffered in memory and, past the limit, only the first bytes are passed on while the request carries on with no error. A 15 MB upload through the proxy would be truncated without a sign. Covering the other `/api` routes gives them the Host check (DNS rebinding) at no cost, since their bodies are tiny. Next.js's own guidance, that a matcher change can silently drop proxy coverage, is why every route handler the proxy does not match calls the guard itself.
B. Keep today's matcher (pages only) and have every route handler call the guard. That works, but `/api/health` and `/api/auth/*` would get no Host check unless each handler remembered it.
C. Include the upload route in the proxy and raise `proxyClientMaxBodySize` to 16 MB. Every upload would be held in memory twice, and a body over the limit would still be cut silently.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 3 — A state-changing request that carries no `Origin`

A. **Refuse it unless `Sec-Fetch-Site` is `same-origin`** (recommended). Every current browser sends `Origin` on a POST, so a request with neither header comes from a hand-made client, and such a client cannot carry a visitor's cookies without the visitor's help. Refusing is the fail-closed choice and matches the task file's `origin.ts` tests. It is stricter than Next.js, which lets a server action without `Origin` through with a warning (`action-handler.js` on 16.3.4).
B. Let it through, as Next.js does. That leaves a gap if a non-browser client ever holds a session.
C. Require `Origin` always and ignore `Sec-Fetch-Site`. That refuses some privacy-hardened browsers that strip `Origin` on same-origin requests.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 4 — How a refusal answers

A. **The proxy answers `403` with an empty body and `Cache-Control: no-store`; a route handler answers `403` with the C14 AppError `{code: 'forbidden', messageKey: 'errors.common.forbidden'}`; a request over the upload cap answers `413` with `{code: 'evidence.too_large'}` and the message key U48 uses for that code; a non-numeric `Content-Length` answers `400 validation`. No new i18n key; nothing the client sent is echoed or logged** (recommended). The existing keys already read correctly in both languages: "You don't have permission to do this." / "এটি করার অনুমতি আপনার নেই।" and "Each file must be 15 MB or smaller." / "প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।". A proxy refusal only reaches someone using an address the app is not configured for, so an empty body is enough, and it avoids loading messages before the locale is known. `413` is the HTTP status for a refused request body; the `code` stays the one U48's uploader already shows.
B. A small bilingual HTML page for proxy refusals. It needs a new key pair, a locale guess before routing, and a page that an attacker's request can render.
C. `400` for the request cap too, as C14's amendment lists for `evidence.too_large`. It hides the difference between "request refused before reading" and "file found too large after parsing".
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The `413` is a C14 contract note (`functional-spec.md` § 9).

## Question 5 — How the upload request cap is enforced

A. **Check a declared `Content-Length` before reading, then read the form only through a counting stream that stops at the cap (`readCappedFormData`), replacing the one `request.formData()` line in U48's route** (recommended). The declared check refuses an honest oversized request at once. The counter covers a chunked body (no length) and a body longer than declared. Node's HTTP parser already stops a body at its declared length, so a "smaller" lie cannot get more through either. U48's order stays: authentication and the rate limit run before any byte is read.
B. Refuse any upload without `Content-Length` (`411 Length Required`) and trust the declared value. Browsers always send a length for a `FormData` body, but this leaves no guard if a later change streams the body.
C. Rely on U48's file writer counter only. The whole body would already be in memory from `formData()` before the writer counts anything.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 6 — The session cookie attributes

A. **Change no auth code: Better Auth 1.7.14 already sets the session cookie HttpOnly, SameSite=Lax, Path=/, with no Domain, and Secure with the `__Secure-` prefix exactly when `APP_URL` is https (`cookiePrefix: 'rk'`, `useSecureCookies`, `defaultCookieAttributes` in `server/better-auth/instance.ts`; `cookies/index.mjs` in the installed library). Pin every attribute for both http and https in a test** (recommended). The task file asked for `__Host-`, which also forbids a Domain and requires Path=/; the cookie already has no Domain and Path=/, so `__Host-` would add only a name change, and renaming means overriding the library's cookie names and changing `clearSessionCookies` (ISS-454) for no gain in release 1.
B. Rename the cookie to `__Host-rk.session_token` through `advanced.cookies`. More code in a merged high-risk Unit, and a sign-out path to re-test.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The departure from the task file's `__Host-` is part of the FD-next proposal.

## Question 7 — Better Auth's `trustedOrigins`

A. **Keep `[APP_URL]`, as T-101 BR4.2 set it, and pin it in a test** (recommended). The library checks `Origin` only on its own HTTP routes (`origin-check.mjs` returns early when there is no request object, which is how the gateway calls it), and FD-104 leaves only `GET /api/auth/ok` open, which the check skips. Widening the list would change nothing today and would widen trust if release 2 reopens a route.
B. Set it to the whole allowed list, as T-502 step 3 says. No effect now, and a wider trust list later.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 8 — What `APP_ALLOWED_ORIGINS` holds

A. **A comma-separated list of full origins (`http://localhost:3000,http://127.0.0.1:3000`), validated (http or https, no path, query, fragment, credentials or wildcard, at most 10), always joined with `APP_URL`'s origin; the host forms feed the Host check and `serverActions.allowedOrigins`** (recommended). Full origins let the Origin check compare scheme too, so the http twin of an https app is refused. Joining `APP_URL` means a mistake in the list never locks the app out of its own address. The default (variable empty) is `APP_URL` only, the narrowest setting. The Playwright run on `127.0.0.1:3107` sets its own value in `playwright.config.ts`.
B. Host names only (`localhost:3000`). The Origin check could not tell http from https.
C. The list replaces `APP_URL` instead of joining it. One typo blocks every request.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 9 — How logs are scrubbed

A. **One policy in `packages/application/src/ports/log-policy.ts`, next to the `LogFields` type: a key allowlist that a compile-time check keeps equal to `LogFields`, a value rule that keeps only identifier- or code-shaped strings (`^[A-Za-z0-9._:-]{1,120}$`, no run of 32 letters and digits, no file extension) and writes everything else as `[scrubbed]`, and an event-name rule. Both loggers use it; the worker adds its own field names and drops its key denylist** (recommended). The value rule catches what a key list cannot: an address (`@`), review text in English or Bengali (spaces, non-ASCII), a path, a token or hash, and an error message quoting user input. One list beside the type means a Unit that adds a log field gets a compile error until it is allowlisted in the same place. The worker reaches the policy through `@rogikotha/application/worker`, the only entry FD-093 (2) allows.
B. A copy of the rules in each logger. Two lists drift.
C. Only T-502 step 7's value checks (`@`, over 200 characters, a path separator). Review text and Bengali text pass them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Trade-off accepted: most error message text is written as `[scrubbed]`; the error name and SQL state stay (S4 row).

## Question 10 — Reading the nonce in the locale and admin layouts

A. **No layout edit. Next.js stamps its own scripts with the nonce it reads from the request's CSP header, and on `main` there is no inline script, `next/script` or `dangerouslySetInnerHTML` to give it to (grep of `apps/web/src`); the theme is read from cookies on the server, so there is no bootstrap script. Add `readNonce()` in `lib/security/nonce.ts` and a sweep test that fails on any future inline script, and requires `readNonce()` beside any `next/script`** (recommended). This is the smallest change and keeps both layouts as they are; the layouts stay owned by U41 so the first real use lands there.
B. Read the nonce in both layouts and pass it down through a context provider. Code with no reader, which the next change would have to keep correct.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 11 — The 11 MB server-action and proxy body limits

A. **Lower `serverActions.bodySizeLimit` and `proxyClientMaxBodySize` to `'1mb'` once a grep shows that no server action handles a file after U48; otherwise keep them and record an S4 row** (recommended). The 11 MB limits exist only for the demo upload action, which U48 replaces with the route. Leaving them means every page POST may be held in memory up to 11 MB.
B. Keep 11 MB. Harmless locally, but a wider resource-exhaustion surface for no use.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 12 — `style-src`

A. **`'self' 'unsafe-inline'` with no nonce** (recommended). The ported prototype markup and many components render `style` attributes (for example `register/page.tsx`, `EmergencyPanel.tsx`), which a nonce cannot cover; and a nonce in `style-src` makes browsers ignore `'unsafe-inline'`, which would break them. Style injection is far weaker than script injection, and `script-src` stays strict. The task file already accepts and documents this.
B. A nonce in `style-src`, as Next's example shows. Every style attribute would be blocked.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Recorded as an S4 row.

## Question 13 — The root not-found page

A. **Try one `await connection()` line in `apps/web/src/app/not-found.tsx` so it renders per request and gets a nonce; keep it only if the browser check then shows no CSP violation on an unknown URL; otherwise leave the file and record an S3 row** (recommended). The page is outside the `[locale]` layout, so it is the one place that may still be prerendered; its text and plain links work without script either way.
B. Leave it and accept the console violations. The storyboard check of zero violations would need an exception.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 14 — Recording the departures from the task file

A. **One FD-next row (text in `functional-spec.md` § 9) for the nine places where U41 departs from T-502's text or from `unit-of-work.md` U41: the matcher (every path but the upload route and named files), refusing a request without `Origin`, `__Secure-` instead of `__Host-`, `style-src` without nonce, CSP and HSTS at runtime, `trustedOrigins` unchanged, `413` for the cap, no nonce read in the layouts, and no direct console output (items 1, 8 and 9 widened or added by Review 01). Numbered at merge** (recommended). The task files are the build instructions agents follow, so a reader of T-502 must find where release 1 differs. None of the nine changes a hard rule, a data boundary or a founder decision, so no other row is needed before code.
B. Record them only in this design. A later agent reading T-502 alone would rebuild the task file's version.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 15 — The log-scrub integration run and comments

A. **Cover register, sign-in, review publish and evidence upload, which exist once U48 is merged; add `comment.post` if U49 is on `main` when Code Generation starts, else record an S4 row and let U50 add it** (recommended). U41 depends on U48 only, so it cannot assume U49 is merged.
B. Wait for U49. That delays a high-risk Unit for one case.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Review 01 findings

Review 01 (`reviews/review-01.md`, 2026-11-05) answered NOT-READY with 1 Critical, 1 Major and 6 Minor findings. Every fix below was decided by the agent under the owner's delegation of 2026-11-04.

| Finding | Severity | Fix | Where |
|---|---|---|---|
| R-01: the page matcher skipped every path with a dot, and slugged page ids accept dots, so `/en/experiences/<id>-x.y` served user text with no CSP, no Host check and no proxy Origin rule | Critical | The dot exclusion is gone. The matcher leaves out only `api/evidence/upload`, `_next/static`, `_next/image` and the named root files `favicon.ico`, `robots.txt`, `sitemap.xml` and `manifest.webmanifest` (`apps/web/public` does not exist on `main`, so it adds no names); never an extension pattern. Next.js internals still matched get the Host check only and skip next-intl. No canonical-slug redirect is built here: those pages are U46's and U47's, so an S3 proposal against U47 is recorded. Matcher, unit and smoke cases for `/en/experiences/<id>-a.b` expect a CSP, a Host refusal and the Origin rule. | BR3.4, BR1.1 trigger, ENT-016, WF2b, § 8.1, § 8.4, A1, § 10, FD-next (1) |
| R-02: direct `console.*` calls bypassed the log policy | Major | WF6's inventory covers every `console.` call in `apps/` and `packages/` (tests, `e2e/` and `scripts/` excepted). The known calls (`apps/worker/src/main.ts:155`, `packages/i18n/src/request.ts:32`, `apps/web/src/server/actions/review.ts:228`, `apps/worker/src/env.ts:72,80`) go through a logger with an event and a code or error name only, never the message or stack; `env.ts` builds a `JsonLogger` itself, since that needs no environment. `no-console` becomes `error` with no allowed method in `apps/*/src` and `packages/*/src`, except the two logger files and the two database command-line tools (S4 row); a walking test replaces the rule if the flat config cannot scope it. BR6.1 now says "everything the application writes", and Next.js's own printing of unhandled errors is a residual in the threat notes. A4 gains an unhandled throw with a synthetic marker. | BR6.1, new BR6.7, WF6 steps 2 and 2b, § 6, § 7, § 8.2, A4, § 10, FD-next (9) |
| R-03: the rules named the guards in different places from § 2 | Minor | BR3.4 now reads "every route handler the proxy does not match", so `/api/auth/*`, which stays under the proxy, needs no edit. BR3.2 and BR3.3 name `checkHost` and `checkOrigin` in `lib/security/origin.ts` and `guardRouteRequest` in `server/security-settings.ts`; BR4.2 names `checkDeclaredLength` in `lib/security/request-limits.ts`. | BR3.2, BR3.3, BR3.4, BR4.2 |
| R-04: the shared C14 contract did not list the new answers, and only U48's uploader was checked | Minor | § 9 has a "C14 release-1 amendment" block listing the `413`, the `400 validation` and the unknown-Host `403`. Code Generation appends it to `contract-summary.md` as a dated note under C14. A component test beside U48's uploader, and beside U47's composer if it calls the route, checks that a `413` shows its text by `messageKey` in both languages; a consumer that reads the status instead gets an S2 row against its owner. | § 9, § 7, § 8.3, WF6 step 10 |
| R-05: three edits inside U48's area were not recorded | Minor | § 7 lists them as acknowledged shared edits: the form-parse line in the route, the new `route.security.test.ts`, and the `origin` and `host` headers in U48's test helper. The Code Generation plan's files-touched list carries them. `unit-of-work.md` and U48's files are not edited. | § 7 |
| R-06: the task file stayed stale, a threat row was missing, and the dropped layout-nonce item was not among the departures | Minor | WF6 step 10b writes `## Amendments — release 1 (FD-105)` into the T-502 task file, with the new expected values: U48's one-file refusal in place of "11 parts → 413", and U48's `400 type_rejected` in place of "`.exe` → 415". § 6 has the "Reporter identity leakage through headers or logs" row (covered for logs and headers; reporting deferred). FD-next lists the layout-nonce departure as item (8). | WF6 step 10b, § 6, § 9 |
| R-07: on a malformed percent-encoded path, next-intl returns a bare `NextResponse.next()`, so the client's own request headers could reach the renderer | Minor | When next-intl's response carries no request-header override, the proxy returns `NextResponse.next({request: {headers}})` with its own headers. A `proxy.test.ts` case sends `/en/%E0%A4%A` with a client `content-security-policy` and `x-nonce`. | BR1.1, WF1 step 5, § 8.1 |
| R-08: `fix: 'pnpm db:reset'` would always be written as `[scrubbed]` | Minor | The hint becomes the code `db.reset_required`, and the threat notes explain it. `expectedPolicy` and `actualPolicy` already hold pg-boss policy names, which are code-shaped, so they stay as they are. The S4 row records the change. | new BR6.8, ENT-012, § 10 |

## Checks for Code Generation (each with its fallback already decided)

- U48's route imports `EVIDENCE_MAX_FILE_BYTES` through an export the `web` element may use (the application package's evidence module). If it does not, Code Generation adds that one re-export line to the application evidence module index as a shared edit.
- next-intl's middleware carries forwarded request headers through, as T-008 verified for `x-pathname`. The proxy test and the e2e nonce check prove it for `x-nonce` and `content-security-policy`; if it fails, the proxy sets the headers on the `NextResponse.next({request: {headers}})` it builds around next-intl's answer.
- `serverActions.allowedOrigins` is read when `next start` loads the config. Code Generation checks it (`functional-spec.md` WF5 step 3) and records an S4 row if it is fixed at build time.
- The root not-found page (Question 13) and the body-limit grep (Question 11) are tried at Code Generation with their outcomes already decided.

## Assumptions & Open Questions

None.

## Sources

- `inception/units-generation/unit-of-work.md` § U41 and "Constants that stand in for T-105"; `docs/implementation/tasks/T-502-security-hardening.md`.
- `inception/contract-design/contract-summary.md` C14, C18; `inception/requirements-analysis/requirements.md`; `inception/user-stories/stories.md` US3.1, US7.1, US12.3, US12.4.
- `construction/u48-evidence/functional-design/functional-spec.md` WF1, § 7.
- `docs/status/decision-log.md` FD-072, FD-093, FD-102, FD-103, FD-104, FD-105; `docs/status/dependency-check-log.md`.
- Code on `main` at `b1c68ad` and the installed Next.js 16.3.4 and Better Auth 1.7.14 sources, as listed in `functional-spec.md` § Sources.
