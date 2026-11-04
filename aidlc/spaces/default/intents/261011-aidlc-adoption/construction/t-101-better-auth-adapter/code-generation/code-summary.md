# Code summary — U8 `t-101-better-auth-adapter`

Plan Steps 1–16, completed 2026-11-04. The project hand-off is `docs/implementation/handoffs/T-101.md`; issues found in this Unit are ISS-401 to ISS-451 in `docs/implementation/ISSUES.md`. Nothing is committed past `af214ea`; the owner's written sign-off for this high-risk Unit is pending.

## Baseline (Step 1, 2026-10-30, `main` `d22b3b9`)

- `timeout 1200 pnpm check`: exit 0. 98 test files, 1169 tests passed, 2 expected failures. All lines 97.92% (2410 of 2461).
- `timeout 600 pnpm smoke`: 13 files, 26 tests passed.
- Lines per package before this Unit:

| Package | Lines |
|---|---|
| `packages/domain/src` | 0 of 0 |
| `packages/contracts/src` | 317 of 317 (100%) |
| `packages/application/src` | 0 of 0 |
| `packages/database/src` | 565 of 582 (97.08%) |
| `packages/adapters/src` | 0 of 0 |
| `packages/i18n/src` | 54 of 54 (100%) |
| `packages/test-support/src` | 890 of 922 (96.53%) |
| `apps/web/src` | 433 of 435 (99.54%) |
| `apps/worker/src` | 151 of 151 (100%) |

## Decision log and dependencies (Step 2)

- FD-095 to FD-098 are in `docs/status/decision-log.md` as written in design § 9.1. Nothing was appended (review point 3).
- `docs/status/dependency-check-log.md` has the 2026-10-30 entry. Installed: `better-auth@1.7.14` in `apps/web` (no peer warning with Next 16.3.4), `nodemailer@10.2.1` and `@node-rs/argon2@^2.2.1` in `packages/adapters`.

## Spike (Step 4, 2026-10-30, about 20 minutes)

A throwaway script ran `better-auth@1.7.14` with its memory adapter and an `AsyncLocalStorage` scope opened around each `auth.api.*` call. The script was deleted afterwards. Results:

| Item | Result on 1.7.14 |
|---|---|
| Reset-token format (review point 1) | A row in `verification` with `identifier = 'reset-password:<token>'` (plain text, the library default when `verification.storeIdentifier` is unset), `value` = the auth user id, `expiresAt` = now + `resetPasswordTokenExpiresIn`. The token is 24 characters. `resetPassword` consumes the row inside the credential update. So mechanism (a) holds: `AccountRepository.findResetTokenAccount(token)` reads that row without consuming it. |
| Email-verification token | A signed JWT (three segments), not a row: no `verification` row is written by `sendVerificationEmail`. Replay is bounded by the JWT expiry (24 h) and by BR2.2 (verify changes only a pending profile). |
| Scope visible in hooks and callbacks | Yes. `databaseHooks.user.create.before`, `session.create.before`, `sendResetPassword` and `sendVerificationEmail` all saw the store opened around the server call. |
| `user.create.before` returning `false` | `signUpEmail` outside the register scope rejects with "Failed to create user"; no user row. |
| Callbacks receive `token` | Yes, both callbacks; the token stored in the scope came back to the caller. |
| `signInEmail` with `returnHeaders: true` | Returns `headers` with `set-cookie: better-auth.session_token=…`. |
| IP tracking switch | `advanced.ipAddress.disableIpTracking: true`; the session row's `ipAddress` is the empty string `''`, not null. |
| Verify with the auto sign-in refused | `verifyEmail` sets `emailVerified = true` first, then rejects with "Failed to create session" when `session.create.before` returns `false`. The gateway must treat that rejection, in the `verify` scope, as "verified, no session" (BR2.2). |
| Not checked in the box | Drizzle adapter on a caller's transaction (Q4), `next build` with the route, the library's built-in limiter order. Left to Phase B, which wires the instance. |

## What was built (Steps 5–13)

| Layer | Where | Notes |
|---|---|---|
| Contracts | `packages/contracts/src/{errors,config-values,actor,parse-input,index}.ts`, `schemas/account.ts`, `view-models/security.ts` | `auth.password_equals_email`; the `signIn` block with the narrowed ranges (review point 2); `Actor.refusal`; `SessionVM` with browser and os; `OwnAccountVM` (FD-096) |
| Domain | `packages/domain/src/account/{account-state,mask-email}.ts` | the account-state table; the masked own address |
| Application | `packages/application/src/{command.ts, worker.ts, ports/*, audit/*, authorization/capabilities.ts, modules/account/**, modules/notification/**}` | `defineCommand` and `defineQuery`; 12 commands and 2 queries; `resolveActor`; `queueEmail` and `sendEmailDelivery`; the `./worker` subpath |
| Test-support | `packages/test-support/src/fakes/*` | fakes for every new port, including the gateway, the unit of work and the two repositories |
| Adapters | `packages/adapters/src/{crypto,password-argon2,rate-limit-memory,mail-smtp}/*`, `scripts/bench-argon2.ts` | `hmac` refuses without `macSecret` (review point 6) |
| Database | migration `0009`, `unit-of-work.ts`, `audit-writer.ts`, `pg-error.ts`, `repositories/{account,email-delivery,notification,not-implemented,outbox}.ts`, `queue/pg-job-queue.ts` | `findResetTokenAccount` (review point 1); `PgJobQueue` enqueues on the command's own transaction |
| Web | `apps/web/src/server/{auth,container,env,health,after-response,client-address,command-call,logger}.ts`, `server/better-auth/*`, `server/actions/{account,auth,auth-form}.ts`, `server/auth/session.ts`, `instrumentation.ts`, the auth and health routes | the demo slice's sign-in shortcut replaced (ISS-391); the old `server/auth/{instance,password}.ts` deleted |
| Worker | `apps/worker/src/{env,container,registry,email-catalog}.ts`, `handlers/{mail-send,outbox-relay,index}.ts` | the mail-only key (FD-095); the message files as data (FD-098) |
| i18n and tooling | `packages/i18n/{messages/*.json, src/keys.ts, package.json, scripts/check-parity.mjs}`, `eslint.boundaries.mjs`, `lint-fixtures/**`, `vitest.workspace.ts`, root `package.json`, `infra/compose/.env.example` | 880 keys in both languages; `web-int` and `worker-int`; 16 planted boundary violations |

`.github/workflows/check.yml` was not changed: FD-102 removed it (ISS-422).

## Review points (plan) as built

1. Reset password must not equal the email: mechanism (a), `AccountRepository.findResetTokenAccount` reads the library's token row without consuming it, before `AuthGateway.resetPassword`.
2. Both sign-in counters count inside `signIn.windowMinutes` (15–1440).
3. FD-095 to FD-098 were already in the decision log; nothing was appended in Step 2.
4. Reset request and resend share a per-network limit of 10 mails per hour with the register existing-email notice.
5. A username race compensates with `deleteUser` and answers `auth.username_taken`; an email race falls through to the existing-email answer.
6. The worker's `mailCrypto` has no `macSecret`, and `hmac` throws there (tested).

## Gate, adversarial tests and fixes (Steps 14–15)

- Step 14 (2026-11-04): `pnpm check` green in all eleven steps (209 files, 2242 tests, 2 expected failures); `pnpm smoke` 17 files, 32 tests; `pnpm test:int` 40 files, 280 tests, 2 expected failures; demo end-to-end 17 of 17.
- Step 15: three separate testers; 7 tests failed and were fixed in production code without weakening a test (ISS-427 to ISS-433). Afterwards `pnpm check` green (215 files, 2265 tests, 2 expected failures), `pnpm smoke` 17 files, 32 tests, demo end-to-end 17 of 17.
- Line coverage (Step 14): domain 94.12%, contracts 100%, application 99.11%, database 97.35%, adapters 100%, i18n 100%, test-support 97.22%, web 95.48%, worker 100%. No threshold lowered.

## Measurements and open points (Step 16)

- Argon2 median, 2026-11-04: 91.2 ms over 5 hashes (m=65536, t=3, p=1).
- The timing floors (900, 400, 400 ms) are not measured (ISS-402); the "Timing" acceptance row is not run.
- Decision-log entries still needed for two Step 15 changes: register no longer signs in (FD-099, ISS-427) and the narrowed `/api/auth` allowlist (BR7.1, ISS-430).
- The design record keeps two stale statements: BR3.12's HMAC purpose name and BR7.1's allowlist naming `get-session` (ISS-412).

## Source manifest

`source-manifest.json` lists 251 paths: every path that differs from `main`, plus the untracked files, minus the record files under `aidlc/` and two docs that differ only because `main` moved on (`docs/aidlc-migration/RESUME.md`, `docs/status/decision-log.md`). ASSUMPTION(T-101): `main`, not `02ac348~1`, is the base, because the latter would also claim the 211 demo-slice files merged in `af214ea` (ISS-447). Deleted files are listed too (`apps/web/src/server/auth/{instance,password}.ts` and their tests).

Left out of the manifest because their paths contain `[` or `]`; T-101 changed each of them:

- `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts` (modified: mocks the container so the real `getActor()` runs)
- `apps/web/src/app/api/auth/[...all]/route.ts` (modified: the allowlist, only `/api/auth/ok`)
- `apps/web/src/app/api/auth/[...all]/route.test.ts` (modified)
- `apps/web/src/app/api/auth/[...all]/route.smoke.test.ts` (new)
- `apps/web/src/app/api/auth/[...all]/route.adversarial.test.ts` (new, Step 15)
