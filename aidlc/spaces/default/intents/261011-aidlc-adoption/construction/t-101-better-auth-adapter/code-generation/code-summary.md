# Code summary — U8 `t-101-better-auth-adapter`

Phase A (plan Steps 1–9) is recorded here. Phase B and Phase C complete the file.

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

## Phase A layers

Written in Steps 5–9; see the hand-off for the file list, test counts and coverage.
