# T-101 — Better Auth adapter: email/password, verification, reset, sessions, Actor

| Field | Value |
|---|---|
| Story | STORY-AUTH-001 (register, confirm, sign-in/out, session), part of STORY-AUTH-002 (reset, sessions) |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol (or Opus 5 if Sol implemented) + human approval (T-106) |
| Effort setting | xhigh (Opus) / high (Sol) |
| Estimate | 5–7 h agent; validation 2 h (plus T-106) |
| Depends on | T-004 (auth_* + account tables), T-008 (web shell), T-009 (worker for `mail.send`), T-006 (i18n keys for emails), CR-006 (`rk_worker` has no grant on `auth_users`, FD-041), CR-011 (queue de-duplication before the first real job handler) (FD-071) |
| Parallel-safe with | D-001, T-201, T-207 (disjoint paths); **not** with T-102/T-103/T-104 (they build on this) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-071** — T-101 builds the worker's `mail.send` handler (`apps/worker/src/handlers/mail-send.ts`). The handler reads the recipient from `email_deliveries.to_email_enc`, decrypted with the mail-only key `MAIL_RECIPIENT_KEY` (FD-095; first written as `APP_ENCRYPTION_KEY`), and never from `auth_users`; the web tier fills `to_email_enc` when it queues the email. T-405 later extends the handler with preference checks, the `suppressed` status and the per-key params allowlist. Changes "Depends on" (adds CR-006 and CR-011), step 6, the acceptance checks and the tests.
- **FD-058 / FD-063 / FD-072** — T-101 builds the progressive sign-in delay and the severe-activity email (new steps 10 and 11). Defaults: the delay doubles from 1 s after the 3rd failed sign-in within 15 minutes, capped at 30 s; 10 failures within 15 minutes count as severe. T-101 reads these values through the `ConfigProvider` port, with those values as defaults; T-105 later registers the keys as runtime settings. For the in-app notice, T-101 writes an outbox event in the same transaction, and T-405 consumes it to create the notification. Contract Design names the event and the setting keys. The suspicious-activity challenge (CAPTCHA) is deferred. Changes Owned paths, Not in scope, Steps, Acceptance checks, Tests and Threat notes.
- **FD-058 setting keys before T-105 (review R-14)** — The merged `ConfigValuesSchema` (`packages/contracts/src/config-values.ts`) requires every key and is `.strict()`, so `ConfigProvider.current()` and `StaticConfigProvider` (typed on `ConfigValues`) cannot hold the FD-058 keys until the schema has them. T-101 adds exactly those keys to `config-values.ts`, with the FD-063 defaults in `DEFAULT_CONFIG_VALUES` and the ranges Contract Design names, and no other key. It also wires a defaults-only `ConfigProvider` in the web composition root (`apps/web/src/server/container.ts`), returning `DEFAULT_CONFIG_VALUES`, until T-105 replaces it with the database-backed one. `apps/*` cannot import `test-support`, so this provider is not `StaticConfigProvider`. T-105 takes over the keys and the provider. Changes: Owned paths, step 10 and the FD-063 acceptance row.
- **FD-059** — Self-service email reset is the demo's account recovery, and every completed reset is audited (step 6). Manual Admin recovery and a verified recovery phone or secondary email are deferred (Not in scope).
- **FD-057** — The demo ships 30-day sessions, the session list and "Sign out everywhere" (step 7). Recent successful logins and failed-login alerts are deferred (Not in scope). The FD-058 severe-activity email is a separate feature and stays in scope.
- **FD-056** — No automatic deletion of unverified or inactive accounts: T-101 adds no cleanup job or policy (Not in scope, acceptance checks).

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **C5 sign-in contract (FD-058, FD-063, FD-072)** — The setting block is `signIn` in `ConfigValues`, with defaults and ranges: `delayAfterFailures` 3 (1-20), `windowMinutes` 15 (1-1440), `firstDelaySeconds` 1 (1-60), `maxDelaySeconds` 30 (1-300, at least `firstDelaySeconds`), `severeFailures` 10 (2-100, above `delayAfterFailures`). The delay is a refusal, not a wait: from `delayAfterFailures`, an attempt that arrives before the current delay has passed is refused with `auth.rate_limited` and `retryAfterSec`, without checking the password. Failures are counted per normalised email (NFC, trim, lowercase) in the in-memory limiter. Response shape and timing are the same whether or not the email has an account. `account.signIn` also refuses accounts whose status is `deleted`. Changes: steps 10 and 11 and the acceptance rows.
- **C5 fixed limit** — The fixed sign-in limit is 10 failures per 15 minutes per email and 30 per 15 minutes per network, superseding the 6 per 15 minutes in 03 §4. Changes: step 4 and the Rate limit row.
- **C5 severe notice** — When an address that has an account reaches `severeFailures` inside the window, T-101 queues the email `email.security.severeSignInActivity` and appends `account.securityEvent {kind: severeSignInActivity}` in the same transaction, at most once per account per window. T-405 creates the in-app notice with key `notif.security.severeSignInActivity`. Nothing is written for an address without an account. Changes: step 11 and the severe rows.
- **C15 relay routes** — `account.registered` and `account.securityEvent` route to no `mail.send` job: the web command queues the email itself (FD-071). T-101 removes any `account.* → mail.send` entry from the relay's event map, and the relay never enqueues `mail.send`. Changes: step 6 and a new acceptance row.

## Amendments — T-101 Functional Design and build (FD-095..FD-098, 2026-10-29 to 2026-11-04)

These are binding and override the text below where they differ. The design is in `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-101-better-auth-adapter/functional-design/`.

- **FD-095** — `email_deliveries.to_email_enc` is encrypted with the mail-only `MAIL_RECIPIENT_KEY`; the worker holds that key and no other. Step 6 and the FD-071 acceptance row are corrected above.
- **Q1 / BR7.1** — every flow runs through an `account.*` command and the catch-all route is an allowlist. In the build (Step 15) only `/api/auth/ok` reaches the library; every other path, `get-session` included, answers 404 with a JSON `null` (ISS-430). This replaces step 9's plain `toNextJsHandler(auth)`.
- **Q2** — `requireEmailVerification: false`, not `true` as step 4 says: an unconfirmed account signs in and changes its settings (FR4, AC3.1.4). Contributions are gated on the confirmed status through `requires.verifiedEmail` in `defineCommand`; the demo slice's write actions do not use it yet, so a pending demo account can still write until T-201 onward (ISS-438).
- **Q12 / FD-093** — the library and its call scope live in `apps/web/src/server/better-auth/`; the application reaches it only through the `AuthGateway` port. `getActor()` is in `apps/web/src/server/auth.ts` as step 8 says, built on `resolveActor` in `application`.
- **Absolute 30-day sessions** — `getActor()` refuses a session 30 days after its creation, however recently the library refreshed it (AC3.2.4, BR4.1).
- **Demo slice (FD-099)** — the slice's sign-in shortcut is replaced (ISS-391): its register, sign-in and sign-out forms run `account.register`, `account.signIn` and `account.signOut`. Register no longer signs in: a new and an existing address both go to sign-in (ISS-427), which changes FD-099's "sign in right after registering" until T-102's "check your email" screen.

## Goal

Stand up Better Auth 1.7.3 behind the application boundary (ADR-0003, AD-4): confirmed email/password registration, sign-in/out, verification (24 h), reset (1 h), 30-day database sessions, Argon2id hashing through the `PasswordHasher` port, anti-enumeration, rate limiting, and a `getActor()` that maps a library session to the application `Actor`. Domain rows (`account_profiles`, personas, preferences) are created by the `account.register` command, never by the library.

## Read first

1. `docs/implementation/00-master-plan.md` §2 (FD-031), §3 (pins: Better Auth 1.7.3, `@node-rs/argon2` 2.2.x, `pg` 8.23), §7.
2. `docs/implementation/01-conventions.md` §1 (paths), §3, §5 (Actor), §6 (email keys), §11, §13–§15.
3. `docs/implementation/02-data-model.md` §1 (auth_* tables), §2 (`account_profiles`, `account_preferences`), §3 (personas created at register), §12 (`email_deliveries`, `outbox_events`), §17 Account state machine.
4. `docs/implementation/03-routes-and-contracts.md` §1 route handlers (`/api/auth/[...all]`), §2 (Actor, error codes `auth.*`), §3 ports (`PasswordHasher`, `Mailer`, `RateLimiter`, `Clock`, `AuditWriter`, `ConfigProvider`), §4 "account" (all commands except `staff.*`), §5 events `account.registered`, `account.securityEvent`.
5. `docs/design/auth-screens-spec.md` §3.1–§3.6 (behaviour the commands must support), §5 `email.*` keys.
6. `docs/architecture/decisions/0003-use-better-auth-behind-application-policy.md`, `docs/planning/01-requirement-baseline.md` "Accounts and identity", `docs/planning/10-validation-strategy.md` "Authentication and identity".
7. `docs/status/dependency-check-log.md` entry 2026-09-10 (if older than 3 days when you start, re-check Better Auth advisories and append an entry before installing).
8. Better Auth official docs (fetch current): installation with Next.js App Router, Drizzle adapter + `modelName`/`fields` mapping, `emailAndPassword` options (`requireEmailVerification`, `password.hash/verify`, `resetPasswordTokenExpiresIn`), `emailVerification` (`sendVerificationEmail`, `expiresIn`, `autoSignInAfterVerification`), `session` (`expiresIn`, `updateAge`, `cookieCache`), `advanced.cookies`/`useSecureCookies`, `trustedOrigins`, `rateLimit`, `databaseHooks` (`user.create.after`), `hooks.before/after`.

## Owned paths

- `apps/web/src/server/auth.ts` (Better Auth instance, `getActor()`)
- `apps/web/src/app/api/auth/[...all]/route.ts`
- `apps/web/src/server/actions/account.ts` (thin actions for the commands; T-102 adds the form glue only)
- `packages/application/src/modules/account/**` (commands, queries, authorization, tests)
- `packages/application/src/ports/password-hasher.ts`, `ports/mailer.ts`, `ports/rate-limiter.ts` (create if T-003 left stubs)
- `packages/application/src/ports/config-provider.ts` — create the `current()` interface from 03 §3 only if it does not exist yet; T-105 owns the database-backed implementation (FD-072)
- `packages/contracts/src/config-values.ts` (and its test) — only the FD-058 sign-in setting keys and their FD-063 defaults, so the strict schema accepts them; T-105 takes the keys over (review R-14)
- `apps/web/src/server/container.ts` (create it if no earlier Unit has) — only the defaults-only `ConfigProvider` wiring (a small provider returning `DEFAULT_CONFIG_VALUES`), until T-105 replaces it (review R-14)
- `packages/adapters/src/password-argon2/**` (+ `bench.ts`)
- `packages/adapters/src/mail-smtp/**`
- `packages/adapters/src/rate-limit-memory/**`
- `packages/database/src/repositories/account.ts`
- `packages/database/src/schema/auth.ts` (only if T-004's column set needs Better Auth-required columns added — add, never rename)
- `packages/contracts/src/schemas/account.ts`, `packages/contracts/src/actor.ts` (fill, keep shape)
- `packages/i18n/messages/{en,bn}.json` — `email.*`, `errors.auth.*` keys from the auth spec §5 (add if D-001/T-006 did not)
- `apps/worker/src/handlers/mail-send.ts` (T-101 builds it; T-405 extends it, FD-071)
- `infra/compose/.env.example` (add `BETTER_AUTH_SECRET`, `APP_URL`, `SMTP_HOST/PORT`, `MAIL_FROM`)
- `docs/status/dependency-check-log.md` (append only if a re-check was needed)

## Not in scope

- Any UI (T-102). Staff roles, devices, step-up (T-103). Personas beyond the two created at register (T-104). Capability resolution beyond a stub returning `[]` for non-staff (T-103 replaces it). MFA, passkeys, OAuth, organisations, any Better Auth plugin not named here. Production cookie domain/proxy trust beyond `APP_URL` (T-502).
- Registering the FD-058 setting keys as runtime settings (T-105) and creating the in-app severe-activity notification from the outbox event (T-405) (FD-072). The suspicious-activity challenge (CAPTCHA) is deferred to the production release (FD-058).
- Preference checks, the `suppressed` status and the per-key params allowlist in `mail.send` (T-405 extends the handler, FD-071).
- Recent successful logins and failed-login alerts (deferred, FD-057).
- Manual Admin account recovery and a verified recovery phone or secondary email (deferred, FD-059).
- Any automatic deletion of unverified or inactive accounts, and any Super Admin cleanup policy or its notices (deferred; the demo keeps "no automatic deletion", FD-056).

## Steps

1. **Spike (time-box 45 min).** Install `better-auth@1.7.3` in `apps/web`, create the instance with the Drizzle adapter against the T-004 schema and `/api/auth/[...all]/route.ts` (`toNextJsHandler`). Run `pnpm --filter web build` and one sign-up call with `curl`. If the Drizzle adapter or Next 16.3.4 peer resolution fails and cannot be fixed inside the box, switch to Better Auth's built-in `pg` (Kysely) adapter pointed at the same `auth_*` tables and record the reason under Questions/Follow-ups. Do **not** use `--legacy-peer-deps`; if peer errors appear, pin the exact versions that satisfy them and log it in the dependency-check log. Verify `getServerSession`-style helpers are not called inside any `"use cache"` scope (there is none yet — add a comment in `auth.ts` forbidding it).
2. **Model mapping.** Map Better Auth models to `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` with the column names of 02 §1 (use `modelName` and `fields`). Add a schema test in `packages/database` asserting Better Auth's expected columns exist (run the library's schema generator in dry mode and diff).
3. **Password hashing.** Implement `PasswordHasher` with `@node-rs/argon2`: Argon2id, `memoryCost 65536` (KiB), `timeCost 3`, `parallelism 1`, output PHC string. Wire `emailAndPassword.password.hash/verify` to the port. Add `packages/adapters/src/password-argon2/bench.ts` (`pnpm --filter adapters bench:argon2`) that hashes 5 times and prints median ms; run it and record the number in the hand-off. If median > 500 ms on the dev machine, keep parameters (requirement) and note it.
4. **Auth options.** `emailAndPassword: { enabled, requireEmailVerification: true, minPasswordLength: 10, maxPasswordLength: 256, resetPasswordTokenExpiresIn: 3600 }`; `emailVerification: { expiresIn: 86400, autoSignInAfterVerification: true, sendOnSignUp: true }`; `session: { expiresIn: 30*24*3600, updateAge: 24*3600 }`; cookies `httpOnly`, `sameSite: 'lax'`, `secure` iff `APP_URL` starts with `https`; `trustedOrigins: [APP_URL]`; `rateLimit` enabled with a custom rule set: sign-in 10 failures / 15 min per email and 30 / 15 min per network (C5; supersedes 03 §4's 6 per 15 min), sign-up 5 / hour, forget-password 3 / hour, send-verification 3 / hour — implement via the `RateLimiter` port inside the commands as well (the library limiter is defence in depth; the port is the tested one). `BETTER_AUTH_SECRET` from env; fail start-up if missing or < 32 chars.
5. **Register command.** `account.register` (03 §4): validate input with the zod schema (username regex, ≥10 password, age, terms, locale); if the email already exists → enqueue `email.existing` mail to the owner and return the **same** `ok({ accountId: <new random uuid not persisted> })` shape (the id is never used; document it) with identical timing (pad to the measured hash time — hash a dummy password); otherwise call Better Auth's server API `signUpEmail` (so the library owns the credential row and sends verification via the hook), then in the same transaction create `account_profiles` (status `pending_verification`, `username_key`, `terms_version` from env `TERMS_VERSION`), `account_preferences`, and the `named` + `pseudonymous` personas (`personas` + `persona_links`; T-104 will move this behind the identity repository — leave a `// TODO(T-104)` and keep it in the account module for now). Audit `account:<id>` action `registered`. Outbox `account.registered`. Use `databaseHooks.user.create.after` only as a guard that logs and refuses if a user row appears without a profile (defence against library-driven creation).
6. **Verification and reset hooks.** `sendVerificationEmail({ user, url })` → `Mailer.send({ to, category: 'verification', messageKey: 'email.verify', params: { link: url }, locale: profile.locale })`; `sendResetPassword` likewise with `email.reset`. The web-tier `Mailer` adapter writes the `email_deliveries` row (`account_id`, `to_email_enc` = the address encrypted with `MAIL_RECIPIENT_KEY` (FD-095), `locale`, `category`, `message_key`, `params`, status `queued`) and **enqueues** `mail.send` through the `JobQueue` with the delivery id and no plaintext address (never sends inline) (FD-071). `apps/worker/src/handlers/mail-send.ts` (built here, FD-071) loads the delivery row, decrypts `to_email_enc` with `MAIL_RECIPIENT_KEY`, the only key it holds (FD-095) — it never reads `auth_users` (FD-041, FD-071) — renders subject/body from `packages/i18n` (`email.<name>.subject/body`, plain text, one `{link}`) using the row's `message_key`, `params` and `locale`, sends with nodemailer to `SMTP_HOST:SMTP_PORT` (Mailpit), updates `email_deliveries` (`sent`/`failed`, attempts), retries 5× with backoff. T-405 later extends this handler with preference checks, the `suppressed` status and the per-key params allowlist (FD-071). `account.verifyEmail` runs after the library verifies: sets `status active`, audit `email_verified`. `account.resetPassword`: after the library rotates the password, revoke all sessions (`auth.api.revokeSessions`), write an audit row for every completed reset (FD-059), send `email.security.passwordChanged`.
7. **Remaining commands/queries.** `account.resendVerification` (rate-limited, neutral result), `account.requestPasswordReset` (neutral result even for unknown email; same timing padding), `account.signOut`, `account.signOutEverywhere`, `account.changePassword` (verify current via hasher, revoke *other* sessions, security mail), `account.listSessions` (label = UA family + OS parsed with a tiny regex helper, `current` flag by session id; active sessions only — no history of recent successful logins and no failed-login alerts, FD-057), `account.updatePreferences`, `account.submitFeedback` (rate 5/day). Each as a `defineCommand` with `requires` per 03 §4 and an audit row.
8. **Actor.** `getActor()` in `apps/web/src/server/auth.ts`: read the session with Better Auth's `api.getSession({ headers })`; load `account_profiles`; refuse `suspended|banned` (treat as anonymous + set a flag so T-102 can show `errors.auth.accountSuspended`); resolve `capabilities` via `resolveCapabilities(profile.staff_role, config)` — for this task a stub in `packages/application/src/authorization/capabilities.ts` returning `[]` unless `super_admin` (returns all) with `// TODO(T-103)`; `locale` from the route; `correlationId` from an incoming header or new uuid. Cache per request with React `cache()`.
9. **Route handler + actions.** `/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`. `apps/web/src/server/actions/account.ts`: one exported async function per command, each `parse → getActor → command → Result`, no rendering logic (T-102 consumes them).
10. **Progressive sign-in delay (FD-058, FD-063, FD-072).** Count failed sign-ins per email address over a sliding 15-minute window, keyed the same way whether or not the address belongs to an account. From the 3rd failed sign-in within 15 minutes, each further attempt for that address that arrives before the current delay has passed is refused with `auth.rate_limited` and `retryAfterSec` (FD-063, C5), without checking the password. The delay starts at 1 s, doubles, and is capped at 30 s. Failures older than 15 minutes stop counting. Read the threshold, window, first delay, cap and severe threshold through the `ConfigProvider` port. The keys are added to `packages/contracts/src/config-values.ts` here with these defaults (3 failures, 15 min, 1 s, 30 s, 10 failures) in `DEFAULT_CONFIG_VALUES`, and the web composition root wires a defaults-only provider until T-105 replaces it (review R-14); T-105 registers the keys as runtime settings, and Contract Design names them. The delay is a refusal carrying `retryAfterSec`, not a server-side wait, and the counter lives in the in-memory limiter (C5). The keys are the `signIn` block (`delayAfterFailures`, `windowMinutes`, `firstDelaySeconds`, `maxDelaySeconds`, `severeFailures`) with the ranges in the Contract Design amendment above. An address with no account gets exactly the same delays, response shape and timing (AC3.1.5). No CAPTCHA or other challenge is shown (deferred, FD-058).
11. **Severe-activity email and outbox event (FD-058, FD-063, FD-072).** When an address that belongs to an account reaches the severe threshold (default 10 failures within 15 minutes), queue an essential `security` email through the `Mailer` port (content-free, both languages; message key `email.security.severeSignInActivity`) and, in the same transaction, append the outbox event `account.securityEvent {kind: severeSignInActivity}` for the in-app notice (ids and enum only). T-405 consumes the event and creates the notification with key `notif.security.severeSignInActivity`. An address with no account triggers nothing, and the sign-in response and its timing are the same either way. The notice is sent at most once per account per window.
12. **Tests** (see below), `pnpm check`, hand-off, commit `T-101: …`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Build with Better Auth on Next 16.3.4 | `pnpm --filter web build` | exit 0, no peer warnings for better-auth |
| Register creates domain rows | `curl -X POST $APP_URL/api/… ` via the action test harness, then `psql`-equivalent query in the integration test | one row each in `auth_users`, `auth_accounts` (`password` starts with `$argon2id$`), `account_profiles` (status `pending_verification`), `account_preferences`, two `personas`, two `persona_links`, one `audit_events`, one `outbox_events` |
| Verification mail | register, then GET `http://localhost:8025/api/v1/messages` | one message to the address with subject `email.verify.subject` (EN or BN per locale), body contains exactly one `http` link |
| Verify link | open the link | `account_profiles.status = 'active'`, `auth_users.email_verified = true`, session cookie set |
| Existing email | register the same email again | HTTP result identical in shape and status; Mailpit shows `email.existing.subject`; no new `auth_users` row |
| Timing | integration test measuring 20 register calls new vs existing | median difference < 15 % |
| Reset | request reset, open link, set password | old session's `getSession` returns null; `email.security.passwordChanged` in Mailpit |
| Sessions 30 d | inspect `auth_sessions.expires_at` after sign-in | `≈ now + 30 d`; cookie `HttpOnly; SameSite=Lax`; no `Secure` on http |
| Rate limit | 31 sign-in attempts in a minute from one network, each for a different email address (so no progressive delay applies, FD-058) | the 31st returns `auth.rate_limited` with `retryAfterSec` (30 per 15 min per network, C5) |
| Argon2 bench | `pnpm --filter adapters bench:argon2` | median ms printed and recorded |
| Suspended cannot act | set `status='suspended'` in a test, call `getActor()` | `kind: 'anonymous'` + suspended flag |
| FD-071: recipient travels encrypted (AC10.1.4) | register a new account, then read its `email_deliveries` row and the `mail.send` job payload in the integration test | one row with non-null `to_email_enc` that decrypts with `MAIL_RECIPIENT_KEY` (FD-095) to the registered address, and not with `APP_ENCRYPTION_KEY`; the job payload holds the delivery id and no plaintext address; Mailpit has the message at that address |
| FD-071: worker never reads `auth_users` | run `mail-send.int.test.ts` with the worker connected as `rk_worker` after CR-006's revoke | the email is delivered and the row becomes `sent`; the handler issues no query on `auth_users` (the role cannot read it) |
| FD-063: delay schedule (AC3.1.5) | integration test with `FakeClock`, 9 wrong passwords for `shirin.demo@example.test` within 15 minutes, each sent when the previous `retryAfterSec` has passed | attempts 1–3 checked normally; from the 4th, an attempt before the delay has passed is refused with `auth.rate_limited` and `retryAfterSec` 1, 2, 4, 8, 16, then 30 (cap), and the password is not checked on a refused attempt (C5) |
| FD-063: window expiry (AC3.1.5) | after the 9 failures, advance `FakeClock` 15 minutes and try again | no delay applied |
| FD-058: no enumeration through the delay (AC3.1.5) | the same 9 failures for `nobody.demo@example.test` (no account) | identical delays, response shape and status; median timing difference < 15 % against the real address |
| FD-063: settings through `ConfigProvider` (AC3.1.5) | `StaticConfigProvider` holding a `ConfigValues` (accepted by the strict schema, which now has the FD-058 keys) with the first threshold set to 5 and the cap to 10 s; then `DEFAULT_CONFIG_VALUES`; and a check that the web container's defaults-only provider returns the defaults | delays start after the 5th failure and stop at 10 s; with the defaults, delays start after the 3rd failure, begin at 1 s and stop at 30 s, with 10 failures severe |
| FD-058: severe-activity email and outbox event (AC3.1.5) | 10 wrong passwords for `shirin.demo@example.test` within 15 minutes | exactly one `email_deliveries` row (category `security`) and one Mailpit message with no platform content; one outbox event (name from Contract Design) committed in the same transaction as the 10th failure |
| FD-058: no notice for an unknown address (AC3.1.5) | 10 wrong passwords for `nobody.demo@example.test` | no `email_deliveries` row and no outbox event; the 10th response is identical in shape and status to the real-address case |
| FD-058: no CAPTCHA in the demo (AC3.1.5) | 12 failed sign-ins, inspect each response | no challenge field or challenge step in any response |
| FD-059: every reset audited (AC3.2.2) | complete a reset through the link, then reopen the link | one `audit_events` row for the reset on `account:<id>` with no email or token in `details`; the reopened link returns `auth.token_invalid` and the password is unchanged |
| FD-057: sign out everywhere (AC3.2.3) | sign in from two sessions, run `account.signOutEverywhere` from one | both sessions' `getSession` returns null; before that, `account.listSessions` returned exactly the two active sessions and no login history |
| FD-056: no automatic deletion (AC3.1.6) | integration test: a `pending_verification` account and an `active` account both created 400 days ago (`FakeClock`), then run every scheduled worker job once | both `auth_users` and `account_profiles` rows still exist; no registered job selects unverified or inactive accounts |
| FD-063: C5 settings block and ranges | unit test of `ConfigValuesSchema` | `signIn` keys exist with defaults 3, 15, 1, 30, 10; a value outside a range (for example `maxDelaySeconds` below `firstDelaySeconds`, or `severeFailures` not above `delayAfterFailures`) is rejected |
| FD-063: refusal, not wait (C5) | sign-in test: 4th wrong password, then a correct password sent before `retryAfterSec` has passed | refused with `auth.rate_limited` and `retryAfterSec`; the password is not checked; after the delay a correct password signs in |
| FD-058: severe notice once per window (C5) | 15 wrong passwords for `shirin.demo@example.test` inside one window | exactly one `email_deliveries` row (`email.security.severeSignInActivity`) and one `account.securityEvent {kind: severeSignInActivity}`; a new window can send again |
| FD-063: deleted account refused (C5) | sign in to an account with status `deleted` | refused with the same shape and timing as a wrong password |
| FD-071/C15: no relay route to `mail.send` | read the relay's event map in a test | no `account.*` event maps to `mail.send`; registering still produces one `email_deliveries` row and one `mail.send` job, queued by the web command |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- `packages/application/src/modules/account/*.test.ts` (fakes): register happy path creates profile + personas + audit + outbox; register with existing email returns ok and enqueues `email.existing`; username taken → `auth.username_taken`; invalid username → `auth.username_invalid`; password 9 chars → `auth.password_too_short`; age/terms missing → their codes; resend/reset are neutral for unknown emails; `changePassword` with wrong current → `auth.invalid_credentials`; `signOutEverywhere` revokes all; `submitFeedback` sixth call in a day → `rate_limited`.
- `packages/adapters/src/password-argon2/*.test.ts`: PHC string format, verify true/false, parameters present in the string.
- `packages/adapters/src/rate-limit-memory/*.test.ts`: window semantics and `retryAfter`.
- `packages/database/src/repositories/account.int.test.ts`: Better Auth schema columns exist; `account_profiles.username` citext uniqueness (`Shirin_88` vs `shirin_88` conflict).
- `apps/web/src/server/auth.int.test.ts`: full register → verify → sign-in → `getActor()` → sign-out cycle against compose PostgreSQL and Mailpit; timing test; cookie attributes; rate limit.
- `apps/worker/src/handlers/mail-send.test.ts`: retry and `email_deliveries` status transitions with a failing transport; the recipient comes from decrypting `to_email_enc`, and a row whose `to_email_enc` cannot be decrypted is marked `failed` without sending (FD-071).
- `apps/worker/src/handlers/mail-send.int.test.ts`: as `rk_worker` against compose PostgreSQL and Mailpit, a queued row is delivered without any read of `auth_users` (FD-071).
- `packages/application/src/modules/account/sign-in-delay.test.ts` (fakes, `FakeClock`, `StaticConfigProvider`): the delay schedule, the 15-minute window, the cap, settings read through the port with defaults, identical behaviour for an address with no account, the severe threshold writing one security email and one outbox event in the same transaction, and nothing written for an address with no account (FD-058, FD-063, FD-072).

## Threat notes

| # | Abuse case | Defence | Test |
|---|---|---|---|
| 1 | Email enumeration via register/reset/resend responses | identical success shape + padded timing + neutral copy | timing + shape tests in `auth.int.test.ts` |
| 2 | Verification/reset token replay | Better Auth single-use tokens; `auth_verifications` row deleted on use; second use → `auth.token_invalid` | replay test |
| 3 | Expired token | `expires_at` enforced; `auth.token_expired` | clock-advanced test with `FakeClock`/DB time |
| 4 | Session fixation / theft persists after reset | reset and change-password revoke sessions | "old session dead" tests |
| 5 | Credential stuffing | per-IP-hash + per-email rate limits, progressive per-email delay and the severe-activity notice (FD-058), generic error, no lockout message | rate-limit test; sign-in delay tests (T-502 adds adversarial tests, FD-072) |
| 6 | Weak passwords | min 10, not equal to email, Argon2id | unit tests |
| 7 | Library creates domain rows / bypasses policy | `databaseHooks` guard; only `account.register` inserts profiles | test that direct `auth.api.signUpEmail` without the command is refused by the hook |
| 8 | CSRF on sign-in/sign-out | `trustedOrigins` + Better Auth origin check; server actions are POST-only | origin test (T-106 repeats) |
| 9 | Suspended account keeps using an old session | `getActor()` refuses by `status` on every request | suspended test |
| 10 | Secrets in logs | Logger allowlist; tokens/emails never logged | grep test over captured logs in the int test |
| 11 | Account enumeration through the progressive delay or the severe-activity notice | the same counter, delays, response and timing for an address with no account; the notice goes only to a real holder and changes nothing in the response (FD-058) | unknown-address delay and severe tests |

## Hard-rule checklist

- [ ] Public reading never requires an account (no route other than `/api/auth/*` changed).
- [ ] Emails carry no platform content, one link, both languages.
- [ ] Anti-enumeration verified by test.
- [ ] Audit row for every state change; no email/token in `details`.
- [ ] No agent/tool attribution.
- [ ] Both locales for every new `email.*`/`errors.auth.*` key.

## Hand-off (implementer fills in)

The full hand-off is `docs/implementation/handoffs/T-101.md`: what exists, the gate results, coverage before and after, the measurements, the spike results, the acceptance rows, and the files outside the owned paths.

### What changed

- Better Auth 1.7.14 sits behind the `AuthGateway` port in `apps/web/src/server/better-auth/`; the account commands and queries are in `packages/application/src/modules/account/`, built with `defineCommand` (`command.ts`), with the ports in `packages/application/src/ports/`.
- Adapters: Argon2id, `Crypto` (AES-256-GCM, per-purpose HMACs), the memory rate limiter, SMTP. Database: migration 0009, the unit of work, the account and email-delivery repositories, `PgJobQueue`, the recursive audit check (ISS-108).
- `getActor()` in `apps/web/src/server/auth.ts`; the `/api/auth/[...all]` route forwards only `/api/auth/ok`.
- `queueEmail` on the command's transaction and the worker's `mail.send` with the mail-only key (FD-095) and the i18n message files (FD-098).
- The demo slice's register, sign-in, sign-out and session read run through these commands (ISS-391); register sends the browser to sign-in instead of signing in (ISS-427).

### Not done and why

- The register, resend and reset-request timing floors are placeholders and the "Timing" row was not run (ISS-402): measuring needs 20 runs against compose, left to Build and Test.
- Several acceptance rows are proven with fakes only, not against compose (ISS-448).
- `check.yml` was not changed: FD-102 removed the workflow (ISS-422).
- `@node-rs/argon2` stays in `apps/web/package.json` until a step may change the lockfile (ISS-419).

### Questions for the human

- Written sign-off for this high-risk Unit (auth), before the phase gate.
- Confirm the two Step 15 changes, decided by recommendation: register no longer signs in, which changes FD-099's flow (ISS-427); `/api/auth/get-session` is closed, which narrows BR7.1 (ISS-430). Each needs a decision-log entry.

### Follow-ups

ISS-401 to ISS-451; the open ones name their owning Unit. T-102 wires the `/verify-email` page and the "check your email" screen; T-504's preflight must generate `MAIL_RECIPIENT_KEY` (ISS-443).

### `pnpm check` output summary

2026-11-04: green in all eleven steps, 215 files, 2265 tests plus 2 expected failures, every 80% line threshold met. `pnpm smoke` 17 files, 32 tests. `pnpm test:int` 40 files, 280 tests plus 2 expected failures. Demo end-to-end 17 of 17. Argon2 median 91.2 ms.

### Hard-rule evidence

- [x] Public reading never requires an account: no page route changed by T-101; an anonymous Actor reads every public page (`auth.ts`, `resolve-actor.test.ts`).
- [x] Emails carry no platform content, one link, both languages (`apps/worker/src/email-catalog.ts` and its test, `email-params.ts`).
- [x] Anti-enumeration verified by test (`register-enumeration.adversarial.test.ts`, `sign-in.test.ts`, `resend.test.ts`, `password-reset.test.ts`); timing medians not yet measured (ISS-402).
- [x] Audit row for every state change, no email or token in `details` (`audit/*.ts`, `audit-writer.test.ts`, `email-exposure.adversarial.test.ts`).
- [x] No agent or tool attribution in any file T-101 wrote; nothing is committed yet, and commits carry only the owner's git identity.
- [x] Both locales for every new `email.*` and `errors.auth.*` key (`pnpm i18n:check`, 880 keys; Bengali marked for the owner's review, FD-042).
