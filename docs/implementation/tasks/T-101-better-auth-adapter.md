# T-101 — Better Auth adapter: email/password, verification, reset, sessions, Actor

| Field | Value |
|---|---|
| Story | STORY-AUTH-001 (register, confirm, sign-in/out, session), part of STORY-AUTH-002 (reset, sessions) |
| Phase / Lane | 1 / A |
| Class → model | M3 → Claude Opus 5 (alt GPT-5.6 Sol); validator: GPT-5.6 Sol (or Opus 5 if Sol implemented) + human approval (T-106) |
| Effort setting | xhigh (Opus) / high (Sol) |
| Estimate | 5–7 h agent; validation 2 h (plus T-106) |
| Depends on | T-004 (auth_* + account tables), T-008 (web shell), T-009 (worker for `mail.send`), T-006 (i18n keys for emails) |
| Parallel-safe with | D-001, T-201, T-207 (disjoint paths); **not** with T-102/T-103/T-104 (they build on this) |

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
- `packages/adapters/src/password-argon2/**` (+ `bench.ts`)
- `packages/adapters/src/mail-smtp/**`
- `packages/adapters/src/rate-limit-memory/**`
- `packages/database/src/repositories/account.ts`
- `packages/database/src/schema/auth.ts` (only if T-004's column set needs Better Auth-required columns added — add, never rename)
- `packages/contracts/src/schemas/account.ts`, `packages/contracts/src/actor.ts` (fill, keep shape)
- `packages/i18n/messages/{en,bn}.json` — `email.*`, `errors.auth.*` keys from the auth spec §5 (add if D-001/T-006 did not)
- `apps/worker/src/handlers/mail-send.ts`
- `infra/compose/.env.example` (add `BETTER_AUTH_SECRET`, `APP_URL`, `SMTP_HOST/PORT`, `MAIL_FROM`)
- `docs/status/dependency-check-log.md` (append only if a re-check was needed)

## Not in scope

- Any UI (T-102). Staff roles, devices, step-up (T-103). Personas beyond the two created at register (T-104). Capability resolution beyond a stub returning `[]` for non-staff (T-103 replaces it). MFA, passkeys, OAuth, organisations, any Better Auth plugin not named here. Production cookie domain/proxy trust beyond `APP_URL` (T-502).

## Steps

1. **Spike (time-box 45 min).** Install `better-auth@1.7.3` in `apps/web`, create the instance with the Drizzle adapter against the T-004 schema and `/api/auth/[...all]/route.ts` (`toNextJsHandler`). Run `pnpm --filter web build` and one sign-up call with `curl`. If the Drizzle adapter or Next 16.3.4 peer resolution fails and cannot be fixed inside the box, switch to Better Auth's built-in `pg` (Kysely) adapter pointed at the same `auth_*` tables and record the reason under Questions/Follow-ups. Do **not** use `--legacy-peer-deps`; if peer errors appear, pin the exact versions that satisfy them and log it in the dependency-check log. Verify `getServerSession`-style helpers are not called inside any `"use cache"` scope (there is none yet — add a comment in `auth.ts` forbidding it).
2. **Model mapping.** Map Better Auth models to `auth_users`, `auth_sessions`, `auth_accounts`, `auth_verifications` with the column names of 02 §1 (use `modelName` and `fields`). Add a schema test in `packages/database` asserting Better Auth's expected columns exist (run the library's schema generator in dry mode and diff).
3. **Password hashing.** Implement `PasswordHasher` with `@node-rs/argon2`: Argon2id, `memoryCost 65536` (KiB), `timeCost 3`, `parallelism 1`, output PHC string. Wire `emailAndPassword.password.hash/verify` to the port. Add `packages/adapters/src/password-argon2/bench.ts` (`pnpm --filter adapters bench:argon2`) that hashes 5 times and prints median ms; run it and record the number in the hand-off. If median > 500 ms on the dev machine, keep parameters (requirement) and note it.
4. **Auth options.** `emailAndPassword: { enabled, requireEmailVerification: true, minPasswordLength: 10, maxPasswordLength: 256, resetPasswordTokenExpiresIn: 3600 }`; `emailVerification: { expiresIn: 86400, autoSignInAfterVerification: true, sendOnSignUp: true }`; `session: { expiresIn: 30*24*3600, updateAge: 24*3600 }`; cookies `httpOnly`, `sameSite: 'lax'`, `secure` iff `APP_URL` starts with `https`; `trustedOrigins: [APP_URL]`; `rateLimit` enabled with a custom rule set: sign-in 10 / 15 min per IP-hash, sign-up 5 / hour, forget-password 3 / hour, send-verification 3 / hour — implement via the `RateLimiter` port inside the commands as well (the library limiter is defence in depth; the port is the tested one). `BETTER_AUTH_SECRET` from env; fail start-up if missing or < 32 chars.
5. **Register command.** `account.register` (03 §4): validate input with the zod schema (username regex, ≥10 password, age, terms, locale); if the email already exists → enqueue `email.existing` mail to the owner and return the **same** `ok({ accountId: <new random uuid not persisted> })` shape (the id is never used; document it) with identical timing (pad to the measured hash time — hash a dummy password); otherwise call Better Auth's server API `signUpEmail` (so the library owns the credential row and sends verification via the hook), then in the same transaction create `account_profiles` (status `pending_verification`, `username_key`, `terms_version` from env `TERMS_VERSION`), `account_preferences`, and the `named` + `pseudonymous` personas (`personas` + `persona_links`; T-104 will move this behind the identity repository — leave a `// TODO(T-104)` and keep it in the account module for now). Audit `account:<id>` action `registered`. Outbox `account.registered`. Use `databaseHooks.user.create.after` only as a guard that logs and refuses if a user row appears without a profile (defence against library-driven creation).
6. **Verification and reset hooks.** `sendVerificationEmail({ user, url })` → `Mailer.send({ to, category: 'verification', messageKey: 'email.verify', params: { link: url }, locale: profile.locale })`; `sendResetPassword` likewise with `email.reset`. The SMTP adapter renders subject/body from `packages/i18n` (`email.<name>.subject/body`, plain text, one `{link}`), and **enqueues** `mail.send` through the `JobQueue` (never sends inline). `apps/worker/src/handlers/mail-send.ts` sends with nodemailer to `SMTP_HOST:SMTP_PORT` (Mailpit), updates `email_deliveries` (`sent`/`failed`, attempts), retries 5× with backoff. `account.verifyEmail` runs after the library verifies: sets `status active`, audit `email_verified`. `account.resetPassword`: after the library rotates the password, revoke all sessions (`auth.api.revokeSessions`), audit, send `email.security.passwordChanged`.
7. **Remaining commands/queries.** `account.resendVerification` (rate-limited, neutral result), `account.requestPasswordReset` (neutral result even for unknown email; same timing padding), `account.signOut`, `account.signOutEverywhere`, `account.changePassword` (verify current via hasher, revoke *other* sessions, security mail), `account.listSessions` (label = UA family + OS parsed with a tiny regex helper, `current` flag by session id), `account.updatePreferences`, `account.submitFeedback` (rate 5/day). Each as a `defineCommand` with `requires` per 03 §4 and an audit row.
8. **Actor.** `getActor()` in `apps/web/src/server/auth.ts`: read the session with Better Auth's `api.getSession({ headers })`; load `account_profiles`; refuse `suspended|banned` (treat as anonymous + set a flag so T-102 can show `errors.auth.accountSuspended`); resolve `capabilities` via `resolveCapabilities(profile.staff_role, config)` — for this task a stub in `packages/application/src/authorization/capabilities.ts` returning `[]` unless `super_admin` (returns all) with `// TODO(T-103)`; `locale` from the route; `correlationId` from an incoming header or new uuid. Cache per request with React `cache()`.
9. **Route handler + actions.** `/api/auth/[...all]/route.ts` via `toNextJsHandler(auth)`. `apps/web/src/server/actions/account.ts`: one exported async function per command, each `parse → getActor → command → Result`, no rendering logic (T-102 consumes them).
10. **Tests** (see below), `pnpm check`, hand-off, commit `T-101: …`.

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
| Rate limit | 11 sign-in attempts in a minute | 11th returns `auth.rate_limited` with `retryAfter` |
| Argon2 bench | `pnpm --filter adapters bench:argon2` | median ms printed and recorded |
| Suspended cannot act | set `status='suspended'` in a test, call `getActor()` | `kind: 'anonymous'` + suspended flag |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- `packages/application/src/modules/account/*.test.ts` (fakes): register happy path creates profile + personas + audit + outbox; register with existing email returns ok and enqueues `email.existing`; username taken → `auth.username_taken`; invalid username → `auth.username_invalid`; password 9 chars → `auth.password_too_short`; age/terms missing → their codes; resend/reset are neutral for unknown emails; `changePassword` with wrong current → `auth.invalid_credentials`; `signOutEverywhere` revokes all; `submitFeedback` sixth call in a day → `rate_limited`.
- `packages/adapters/src/password-argon2/*.test.ts`: PHC string format, verify true/false, parameters present in the string.
- `packages/adapters/src/rate-limit-memory/*.test.ts`: window semantics and `retryAfter`.
- `packages/database/src/repositories/account.int.test.ts`: Better Auth schema columns exist; `account_profiles.username` citext uniqueness (`Shirin_88` vs `shirin_88` conflict).
- `apps/web/src/server/auth.int.test.ts`: full register → verify → sign-in → `getActor()` → sign-out cycle against compose PostgreSQL and Mailpit; timing test; cookie attributes; rate limit.
- `apps/worker/src/handlers/mail-send.test.ts`: retry and `email_deliveries` status transitions with a failing transport.

## Threat notes

| # | Abuse case | Defence | Test |
|---|---|---|---|
| 1 | Email enumeration via register/reset/resend responses | identical success shape + padded timing + neutral copy | timing + shape tests in `auth.int.test.ts` |
| 2 | Verification/reset token replay | Better Auth single-use tokens; `auth_verifications` row deleted on use; second use → `auth.token_invalid` | replay test |
| 3 | Expired token | `expires_at` enforced; `auth.token_expired` | clock-advanced test with `FakeClock`/DB time |
| 4 | Session fixation / theft persists after reset | reset and change-password revoke sessions | "old session dead" tests |
| 5 | Credential stuffing | per-IP-hash + per-email rate limits, generic error, no lockout message | rate-limit test |
| 6 | Weak passwords | min 10, not equal to email, Argon2id | unit tests |
| 7 | Library creates domain rows / bypasses policy | `databaseHooks` guard; only `account.register` inserts profiles | test that direct `auth.api.signUpEmail` without the command is refused by the hook |
| 8 | CSRF on sign-in/sign-out | `trustedOrigins` + Better Auth origin check; server actions are POST-only | origin test (T-106 repeats) |
| 9 | Suspended account keeps using an old session | `getActor()` refuses by `status` on every request | suspended test |
| 10 | Secrets in logs | Logger allowlist; tokens/emails never logged | grep test over captured logs in the int test |

## Hard-rule checklist

- [ ] Public reading never requires an account (no route other than `/api/auth/*` changed).
- [ ] Emails carry no platform content, one link, both languages.
- [ ] Anti-enumeration verified by test.
- [ ] Audit row for every state change; no email/token in `details`.
- [ ] No agent/tool attribution.
- [ ] Both locales for every new `email.*`/`errors.auth.*` key.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
