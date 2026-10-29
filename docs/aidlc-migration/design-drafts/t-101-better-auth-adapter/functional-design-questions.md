# Functional Design — questions (U8 `t-101-better-auth-adapter`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-101-better-auth-adapter/functional-design/`.

Refreshed 2026-10-29 against T-010 as built, the owner's answers and the sibling drafts (see `functional-spec.md`, "Refreshed 2026-10-29"). Question 8 changed to C; Questions 12–14 are new. Every open answer was filled by the agent under the owner's no-questions instruction of 2026-10-29.

Context:
- Unit U8 (kind `library`, size XL, **high risk**: authentication, identity, sessions) delivers T-101 (`docs/implementation/tasks/T-101-better-auth-adapter.md`, with its FD-045..FD-075 and FD-076..FD-090 amendments) for stories US3.1 and US3.2. Bolt 8 in `bolt-plan.md`; depends on U5 CR-006 (merged: `0007`/`0008`, FD-092), U4 CR-011 (merged: transactional relay, queue declaration) and U3 T-010 (boundary lint, coverage floor). Units Generation also assigned it the open points "sign-in counter address normalisation", "`apps/web/src/server/container.ts` is created by T-101" and "AC10.3.6 feedback fields (Account)".
- Inputs read: `unit-of-work.md` (U8, decision-change table, open points), `unit-of-work-story-map.md`, `requirements.md` (FR1–FR9, NFR3, NFR10, NFR11), `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5, AC10.1.4, AC10.3.6), `components.md` (Account), `contract-summary.md` (C1, C2, C5, C14, C15, ownership rules), `docs/status/decision-log.md` (FD-013, FD-041, FD-056..FD-059, FD-063, FD-070..FD-072, FD-076, FD-077, FD-092), `01-conventions.md`, `02-data-model.md` (§1, §2, §3, §12, §16, §17), `03-routes-and-contracts.md` (§1–§5), `docs/design/auth-screens-spec.md` (§1, §3, §5).
- Code read as it is on `main` (2026-10-28): `packages/database/src/schema/{auth,account,identity,notification}.ts`, `client.ts`, `audit-writer.ts`, `repositories/{account,outbox}.ts`, `queue/{pg-boss-queue,queue-declaration,sql-executor,outbox-relay-store}.ts`; `apps/worker/src/{main,container,env,logger,registry}.ts` and `handlers/outbox-relay.ts`; `apps/web/src/server/actions/preferences.ts` and `app/api/health/route.ts`; `packages/application/src/index.ts` (empty placeholder, "Filled by T-101"); `packages/adapters/src/index.ts` (empty); `packages/contracts/src/{actor,errors,config-values}.ts`, `schemas/account.ts`; `packages/test-support/src/fakes/*`; `packages/i18n/messages/en.json` (`email.*`, `errors.auth.*`).
- Open `ISSUES.md` rows in this area: ISS-032, ISS-033, ISS-078 (fixed, owner T-101), ISS-111 item 1, ISS-112 (S2, the adapter mapping comment is wrong), ISS-113, ISS-155, ISS-180, ISS-223, ISS-243 (no plain email in job payloads, owned by U8 and U34), ISS-253 (mail.send keys and ensure-before-transaction), ISS-255 (JobQueue result type).
- Library research (2026-10-28, Better Auth documentation, to be re-confirmed on the pinned version in Code Generation): `disabledPaths` exists; `sendVerificationEmail` and `sendResetPassword` receive `{user, url, token}`; `revokeSessionsOnPasswordReset` and `onPasswordReset` exist; `sendOnSignUp`, `sendOnSignIn`, `autoSignInAfterVerification` exist; a `databaseHooks` before-hook that returns `false` aborts the operation, and hooks of a transactional operation run after commit; `requestPasswordReset` is neutral for unknown addresses; sign-in of an unverified user under `requireEmailVerification` answers 403.
- Dependency check: the Better Auth entry in `docs/status/dependency-check-log.md` is dated 2026-09-10 (49 days old), the `@node-rs/argon2` entry 2026-09-13, and `nodemailer` has none; T-010's 2026-10-28 entry covers only its lint and coverage tools. Code Generation must re-check the current stable 1.7.x release and its security advisories since 1.7.3, peer compatibility with Next 16.3.4, and nodemailer's current stable release, and append a dated entry before installing (BR7.8).
- T-010 as built (read on `bolt/t-010-boundary-lint-and-ci` with `git show`, 2026-10-29): the boundary matrix in `eslint.boundaries.mjs` and `01-conventions.md` §2 (FD-093); `application` and `domain` may import no external package and no Node built-in; only `apps/web/src/server/container.ts` may import `adapters`; `web` (routes under `app/`) may not import `database`; the worker may import `application` only through a future `@rogikotha/application/worker` subpath (type-only imports of the root allowed), never `better-auth`, `drizzle-orm`, `pg` or `modules/{account,identity}`, and has no `i18n` edge; components may import server actions only. `pnpm check` has nine steps (`typecheck`, `lint`, `lint:boundaries`, `format:check`, `check:identity`, `test:coverage` with an 80% line floor per package, `i18n:check`, `contrast`, `build`). CI (`.github/workflows/check.yml`) runs on `main` and `bolt/**` with a `postgres:18` service, job-only `APP_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET`, and no Mailpit. The `web` and `worker` Vitest projects exclude `*.int.test.ts`. T-010's hand-off: "`next build` without a `.env`: nothing in `apps/web` reads one at build time".
- Owner answers (`docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`): R1 the worker holds a separate, mail-only key, with an FD entry before T-101's code; R2 FR90 feedback is text only in this release; T-102 Q4 the holder's own email is shown masked, with an FD entry amending 03 §2; T-104 Q15 "Former member" for a deleted account's named and pseudonymous personas; T-105 R1 only the settings the demo uses are built in release 1, R2 the limited-data threshold allows 2–50. From 2026-10-29 the agent decides every open point by its recommendation.
- Findings of the sibling drafts against this Unit: T-102 Q10 (`SessionListItem.label` becomes `browser` and `os`), T-102 ENT-004 (the field-error key list), T-102 F1 (verify from a server action, not a page render); T-103 F2 (staff powers only with an approved device and an active account), T-103 Q1/Q2 (password check through `PasswordHasher` first, sessions through the public email sign-in), T-103 BR7.4 (`requires` order); T-104 F9 (`getActor` must not read `persona_links` through the account repository, AD-3), T-104 F12 and § 10.2 (`onRefused` for every refusal after `authenticated`, a `recorded` error commits), T-104 Q12 (ISS-108); T-105 Q1 (sign-in ranges where every value works), T-105 Q2 and F5 (`ConfigProvider.current()` returns a Promise).

## Settled before this stage

These are decided by FD entries, the contracts or the requirements and are not asked again.

- **Progressive delay and severe notice (FD-058, FD-063, FD-072, C5).** Failures per normalised email (NFC, trim, lowercase) in the in-memory limiter; from the 3rd failure in 15 minutes a refusal (not a wait) with `auth.rate_limited` and `retryAfterSec`, 1 s doubling to a 30 s cap; severe at 10, once per account per window, real accounts only; values read through `ConfigProvider` with the FD-063 defaults; no CAPTCHA.
- **Fixed limits (C5).** 10 failures per 15 minutes per email and 30 per 15 minutes per network, superseding 03 §4's 6 per 15 minutes.
- **The `signIn` setting block (C1, review R-14).** Exactly `delayAfterFailures`, `windowMinutes`, `firstDelaySeconds`, `maxDelaySeconds`, `severeFailures` with the C5 ranges; a defaults-only `ConfigProvider` in `apps/web/src/server/container.ts` until T-105.
- **`mail.send` is U8's (FD-071).** The worker reads the recipient from `email_deliveries.to_email_enc` decrypted with `APP_ENCRYPTION_KEY`; it cannot read `auth_users` (FD-041, CR-006 `0007`). Worker-started notifications are in-app only (FD-070).
- **Relay routes (C15).** `account.registered` routes to no job; `account.securityEvent` routes to `notification.deliver` only; the web command queues its own email.
- **Scope cuts.** No automatic deletion (FD-056); 30-day sessions, session list and Sign out everywhere, no login history or failed-login alerts (FD-057); self-service email reset, every reset audited, no manual Admin recovery (FD-059).
- **Unconfirmed accounts may browse and edit settings but not contribute (FR4, AC3.1.4, `components.md` Account).** Question 2 only settles how the library is configured to allow it.
- **Queue rules from CR-011 (ISS-253).** Every `mail.send` gets its own key; a producer that passes its own transaction to `enqueue` ensures the queue before opening it.
- **Import boundaries (FD-093, `01-conventions.md` §2 as built by T-010).** The placement of every file this Unit creates follows the matrix (`functional-spec.md` § 6.4). FD-093 (2) already allows the first Unit that needs application code in the worker to add `@rogikotha/application/worker`; this Unit is that Unit.
- **Gate and CI (T-010).** The nine-step `pnpm check`, the 80% line floor per package (new code arrives with its tests; `domain`, `application` and `adapters` stop being zero-line packages in this Bolt), `format:check`, `check:identity`, and a green CI run on the Bolt head before the merge.
- **The worker's key is mail-only (owner's answer to R1).** `email_deliveries.to_email_enc` uses `MAIL_RECIPIENT_KEY`; the worker never holds `APP_ENCRYPTION_KEY`. Proposed FD-094 (`functional-spec.md` § 9.1) is appended before any code.
- **Feedback is text only in release 1 (owner's answer to R2).** Confirms Question 11 A; proposed FD-096 narrows FR90 and AC10.3.6.
- **The holder's own email is shown masked (owner's answer to T-102 Q4).** This Unit builds the data side: `account.getOwnAccount` returns the masked address, and `account.resendOwnVerification` resends without an address. Proposed FD-095 amends 03 §2.
- **"Former member" (owner's answer to T-104 Q15)** changes nothing here: this Unit creates personas but never de-identifies them, and `personas.deidentified_at` is T-104's column. The username check keeps counting a deleted profile's username as taken; T-410 decides otherwise if it frees usernames.
- **T-105 R1 and R2** change nothing here: the `signIn` block is a setting the demo uses (FD-072 row), and the limited-data range is T-105's.
- **`ConfigProvider.current()` returns a Promise (T-105 Q2 A, F5).** This Unit creates the port that way; the defaults-only provider and `StaticConfigProvider` return a resolved promise.

## Settled in this design without a question

These follow from the contracts, the requirements, the project rules or the code, so they are design decisions, not open points. Each is explained in `functional-spec.md` § 13.

- **The contract summary wins over the task text where they differ** (its own rule): C2's `notification.queueEmail` and `RecipientDirectory`, C5's limits, C15's routes. The task's step 4 values that C5 replaced are read as C5.
- **Sessions last 30 days from creation, absolutely (AC3.2.4).** The library still refreshes `updated_at` once a day for "last seen", but `getActor` refuses and revokes any session older than 30 days from `created_at`. `02-data-model.md` §1's "rolling" is corrected. The library's cookie cache stays off, so a revoked session is refused on its next request (AC3.2.3).
- **The username check does not depend on the email.** If it ran only for new emails, "username taken" against "neutral success" would reveal whether an email has an account (BR1.3).
- **Refusals happen before any database read or password check**, so a refused attempt costs the same for every address (BR3.2).
- **Passwords are NFC-normalised before hashing and verifying**, so a Bengali passphrase typed on two keyboards still matches (FR3 allows international characters).
- **A completed reset clears the live link from `email_deliveries.params`** once the delivery is final (BR6.8), so no working reset link stays at rest where `rk_worker` can read it.
- **The severe notice's once-per-window check reads `email_deliveries`** (a row for the account and message key newer than the window), so it survives a restart, unlike the in-memory counters.
- **The application layer's foundations are built here**: `defineCommand`, the explicit command context `{input, actor, ports, tx}`, and the ports T-101 uses (`UnitOfWork`, `AuthGateway`, `PasswordHasher`, `RateLimiter`, `ConfigProvider`, `Crypto`, `Clock`, `IdGenerator`, `JobQueue`, `Outbox`, `AuditWriter`, `Logger`, `MailTransport`, `AfterResponse`, `AccountRepository`, `EmailDeliveryRepository`). `packages/application/src/index.ts` says "Filled by T-101", and no earlier Unit created them. The `JobQueue` port returns the project's `Result`, with the adapter mapping `job_not_enqueued` to `internal` (closes ISS-255). Because `application` may import no external package and no Node built-in (FD-093), nothing in it imports `better-auth` or `node:async_hooks`; the library-call scope lives in the web tier (Question 12).
- **`defineCommand` carries the later Units' hook points from the start** (T-103 BR7.4, T-104 F12 and § 10.2): the `requires` order is `authenticated → verifiedEmail → notRestricted → staffRole → capability → stepUp → owner`; `onRefused({actor, input, refusal})` runs in its own transaction for every refusal after `authenticated` passed, rate limits included; a handler's `err` rolls back unless the handler marks it `recorded`. T-101's own commands use none of the three, so tests of `defineCommand` itself cover them.
- **The `Crypto` port and `adapters/crypto` are built here** (AES-256-GCM, `iv | tag | ciphertext`, the layout `FakeCrypto` already uses; `hmac(purpose, bytes)` with a per-purpose key derived from `BETTER_AUTH_SECRET`), because `to_email_enc` and the counter keys need them and no other Unit before U8 builds them. The web container builds two instances: the app key and the mail key (FD-094).
- **No staff powers in T-101's Actor (T-103 F2).** `getActor` never sets `staffRole` or `capabilities`; the capability stub returns `[]` for everyone, `super_admin` included, until T-103 adds the device gate. Otherwise a super_admin password alone, on the patient sign-in, would carry every capability between this Unit's merge and T-103's.
- **No persona read in `getActor` (T-104 F9, AD-3).** `Actor.personaId` stays unset until T-104's `identity.currentPersonaOf`; the account repository has no method that reads `personas` or `persona_links`. The display name T-102's account menu needs comes from `account.getOwnAccount` (the profile's own `display_name`). Registration still inserts the two personas, with `TODO(T-104)`.
- **ISS-108 is fixed here.** This Unit creates `packages/application/src/audit/`, which ISS-108 names as the place for the allowlist: details are built by one typed builder per action (ids, enums, counts, booleans, before/after values), and `assertAllowlisted` in `audit-writer.ts` recurses into nested objects and arrays, with a test for each of the five accepted cases in ISS-108. T-104's Question 12 then finds it fixed.
- **Field errors use T-102's key list (T-102 ENT-004).** `errors.auth.emailInvalid`, `errors.auth.passwordTooShort`, `errors.auth.passwordTooLong`, `errors.auth.passwordEqualsEmail`, `errors.auth.usernameInvalid`, `errors.auth.usernameTaken`, `errors.auth.displayNameRequired`, `errors.auth.ageRequired`, `errors.auth.termsRequired`, `errors.auth.invalidCredentials`. The four missing keys are added here in both languages, with T-102's proposed copy and the Bengali flagged, so no emitted key is ever missing.
- **Session items carry `browser` and `os`, not one English label (T-102 Q10 A, F8).** `SessionVM` changes the same way in `view-models/security.ts`, and `SecurityVM` gains `emailVerified` and `ownEmailMasked`.
- **Sign-in after verification uses the library's own auto sign-in** (`autoSignInAfterVerification: true`, the task's value). The first draft turned it off and let the command sign in, but no public library call creates a session without the password. The session hook allows that session only inside the verification scope and only for a pending, active or restricted profile (BR2.2).
- **Verification runs from a server action** (POST), never during a page render, because only actions and route handlers can set the cookie (T-102 F1).
- **Integration tests get their own projects.** `web-int` and `worker-int` in `vitest.workspace.ts` (`sequence.groupOrder: 3`, after `database` and `test-support-seed`, one file at a time), because the `web` and `worker` projects exclude `*.int.test.ts`; CI gains a Mailpit service and `MAIL_RECIPIENT_KEY`, `APP_URL` and `TERMS_VERSION`.
- **Nothing reads a secret at module load**, so `next build` still needs no `.env` (T-010 hand-off): the container is built on first use, and `/api/auth/[...all]` calls the library handler lazily.
- **The account state machine goes to `packages/domain/src/account/account-state.ts`** (02 §17 names that file), with only the transitions T-101 performs used by T-101 code.
- **The health route reports `db`** (its comment and NFR3 name T-101) through `apps/web/src/server/health.ts`, because a route under `app/` may not import `database` (FD-093); `mail` stays `unknown` (no web-side SMTP check; the worker sends).
- **The adapter mapping follows ISS-112**: the schema object is aliased under the library's model names with no `fields` block; the three indexes of ISS-113 come in the next free forward-only migration; nothing is renamed.
- **Bengali copy**: `email.security.severeSignInActivity.{subject,body}`, `errors.auth.passwordEqualsEmail` (Question 7) and T-102's `errors.auth.emailInvalid`, `errors.auth.passwordTooLong` and `errors.auth.displayNameRequired` are new and are flagged for the owner's bilingual review (FD-042 precedent). Every other key T-101 uses already exists in both files.

## Question 1

How do the auth flows reach Better Auth, and which of its HTTP endpoints stay reachable?

Why this is open: T-101 step 9 mounts `toNextJsHandler(auth)` at `/api/auth/[...all]`, and C14 says "the progressive delay answers 429" there. But that catch-all serves every library endpoint by default (sign-up, sign-in, request-password-reset, reset-password, verify-email, change-password, change-email, update-user, delete-user, revoke-sessions and more), and every one of them bypasses something the commands own: `account.register`'s domain rows and timing floor, the delay and limits, the audit rows, the `queueEmail` path. The library also builds its email links to its own endpoints.

A. **Every flow goes through a server action and its command; the route is an allowlist** (recommended). Commands call the library's server API (`signUpEmail`, `signInEmail`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `changePassword`, `revokeSessions`, `listSessions`) inside their command context. The route handler wraps the library handler and answers 404 for any path not on a short allowlist (`/get-session`, `/ok`); `disabledPaths` repeats the block list as a second layer. Email links point to the app's own pages (`/<locale>/verify-email?token=`, `/<locale>/reset-password?token=`), built from the token the library hands its callback. C14's "429" line is corrected: the delay is an `AppError` from the server action. An allowlist also stays closed when a library upgrade adds endpoints.
B. **Keep the library endpoints and put the policy in its hooks.** `hooks.before` on `/sign-in/email` runs the delay; `hooks.after` records failures and the severe notice; register, reset and change rely on `databaseHooks`. Two ways into the same policy, harder to test with the `test-support` fakes, and the library's error shape leaks to the browser.
C. **Mount the catch-all as the task text says**, with no restriction. Every bypass above stays open.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change). Refined in the 2026-10-29 refresh by Question 12: the commands reach the server API through the `AuthGateway` port, not by importing the library.

## Question 2

Can an account that has not confirmed its email sign in?

Why this is open: T-101 step 4 sets `requireEmailVerification: true`. With that, the library refuses to create a session for an unverified user (403). But FR4 and AC3.1.4 say an unconfirmed account "can browse and edit account settings but cannot contribute", `components.md` says the same, and the auth spec has a "Signed in, unverified" masthead state and an unverified `/write` banner. Editing settings needs a session.

A. **Yes: the library does not require verification; the application does** (recommended). `requireEmailVerification: false`, `autoSignIn: false` at sign-up (registration still lands on the pending screen with no session), `sendOnSignIn: false`. A pending account signs in and gets an Actor with `emailVerified: false`; every command with `requires.verifiedEmail` refuses it with `auth.email_unverified`; settings commands accept it. To close the "someone registered my address first" case: a completed password reset proves inbox control, so it also confirms a pending account's email (BR5.4), and it revokes every session (BR5.2).
B. **No: keep `requireEmailVerification: true`** as the task text says. An unconfirmed holder gets `auth.email_unverified` at sign-in, the "edit settings before confirmation" part of FR4 and AC3.1.4 is not met, and the spec's signed-in-unverified state never occurs.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Where does the web tier's email queueing live, and what is the `Mailer` port?

Why this is open: T-101 step 6 describes a web-tier `Mailer` adapter that writes the `email_deliveries` row and enqueues `mail.send`, and 03 §3 gives `Mailer.send({to, …})` an SMTP adapter. C2 instead names `notification.queueEmail(tx, {accountId, category, messageKey, params, dedupeKey})` in `modules/notification/internal/queue-email.ts`, reading the recipient through `RecipientDirectory` (implemented in `modules/account`), and says "U8 builds the first version for essential categories". C2 also promises "the same dedupeKey never queues twice", but `email_deliveries` has no column for it.

A. **Follow C2** (recommended). U8 builds the first `queueEmail` (verification, reset and security, always allowed) and Account's `RecipientDirectory.contactFor` (reads the address through the account repository, encrypts it with the `Crypto` port). The delivery and its `mail.send {deliveryId}` job (key `mail.send:<deliveryId>`) are written on the caller's transaction, with the queue ensured beforehand. The SMTP side becomes a `MailTransport` port (`send({to, subject, text})`) that only the worker uses, implemented by `adapters/mail-smtp`. A nullable unique `dedupe_key` column is added to `email_deliveries` in the same forward-only migration as the auth indexes, so the contract holds from the first version. U34 extends `queueEmail` without changing its signature. Owned-path additions: `modules/notification/internal/queue-email.ts` and the migration.
B. **Follow the task text**: a web `Mailer` adapter writes the row; U34 later replaces it with `queueEmail`. Every caller changes twice, and the C2 signature is not met until U34.
C. **Follow C2 but without `dedupe_key`**: U8 documents that it ignores `dedupeKey`, and U34 adds the column. The contract is broken until U34 and nothing in U8 needs de-duplication beyond the severe notice, which uses its own check.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

The library writes `auth_*` rows on its own connection, but T-101 wants the domain rows "in the same transaction". How do the library's writes and the application's writes commit together?

Why this is open: `signUpEmail`, `resetPassword` and `changePassword` commit their own work through the Drizzle adapter; the application's transaction (profile, personas, audit, outbox, email) is separate. A failure between the two leaves an auth user without a profile, or a changed password without its audit row (FD-059 says every reset is audited). Whether the pinned 1.7.x can run its adapter on a caller's transaction is not documented.

A. **Library first, then one application transaction, with explicit recovery** (recommended). Register: if the application transaction fails, the auth user is deleted (cascade) and the command returns `internal`; `getActor` treats any profile-less user as anonymous. Reset and change: the application transaction (audit, event, email, revoke) is retried up to 3 times and a final failure is logged at error level (`auth.reset_record_failed`, account id only); the risk is recorded as an ISS row. Code Generation's first spike checks whether the pinned version can run the adapter on the command's transaction; if it can, that is used instead and the recovery code is dropped.
B. **The account repository writes the credential rows itself inside the command transaction** (password hash, token consumption, session deletion) and the library is used only to mint tokens and sessions. Fully atomic, but it re-implements library internals (token formats, row shapes) that a library upgrade can change, against AD-4's "authentication is an adapter".
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

Does a session store the client's IP address?

Why this is open: the library stores `ip_address` on every session by default. The session list (FD-057, AC3.2.3) shows a device label, first seen and last seen, and needs no IP; FD-019 rules out analytics and 01-conventions §11 keeps personal data out of logs. The network rate-limit key needs the address for a moment, not stored.

A. **No: turn the library's IP tracking off** (recommended). `auth_sessions.ip_address` stays empty. The network key is an HMAC of the address computed once per request and kept only in the in-memory counter (BR3.12, BR4.9). The production proxy trust (which header carries the real address) stays with T-502.
B. **Yes, keep the library default.** Every session row keeps the address for up to 30 days with no feature that reads it.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

Which Actor shape does `getActor` return, and how does it tell T-102 that a session belongs to a suspended account?

Why this is open: `packages/contracts/src/actor.ts` (and 01-conventions §5) has `kind: 'anonymous' | 'account'`, `emailVerified?`, `stepUp?: {rechecked_at}`, and the task says "fill, keep shape". C5's `actor_shape` line reads `kind: anonymous | account | staff | system`, `verifiedEmail`, `stepUpAt?`. T-101 step 8 needs a flag on the anonymous Actor of a suspended account so T-102 can show `errors.auth.accountSuspended`.

A. **Keep `actor.ts` as it is and add one optional field, `refusal?: 'suspended' | 'banned'`**, set only on an anonymous Actor (recommended). Staff stay `kind: 'account'` with a `staffRole`, which T-103 sets behind its device gate (T-101 never sets it, T-103 F2). The C5 `actor_shape` line is recorded as drift (an ISS row) and corrected to the code at the next contract revision. Additive, so no consumer breaks.
B. **Adopt C5's shape now.** Renames `emailVerified` and `stepUp`, adds two kinds, and changes `actor.ts`, its tests and every later Unit's expectations, for no behaviour T-101 needs.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

The auth spec (§3.1) and T-101's threat 6 say a password must not equal the email; ISS-033 found there is no error copy for it. And `RegisterInput` has no maximum length, while the task sets 256. What does T-101 do?

Why this is open: no `ErrorCode` exists for "equals email", and `errors.ts` says a new code is added to 03 §2 first. A password with no upper bound lets one request make the server hash megabytes with Argon2 (a cheap denial of service).

A. **Add `auth.password_equals_email`** (03 §2 first, then `errors.ts`, then `errors.auth.passwordEqualsEmail` in `en` and `bn`, the Bengali flagged), compared on the normalised forms, and cap passwords at 256 characters with the generic `validation` code and a password field error (recommended). An additive error code is a safe contract change (C-rules); ISS-033 closes.
B. **Enforce the 256 cap only** and leave "not equal to email" deferred under ISS-033. Threat 6's defence stays partial.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

Proposed Bengali copy (for the owner's review): `errors.auth.passwordEqualsEmail` — en "Password: it can't be the same as your email." / bn "পাসওয়ার্ড: এটি আপনার ইমেইলের মতো হতে পারবে না।"

## Question 8

C1 lets `severeFailures` range up to 100, but the fixed per-email limit refuses every attempt after 10 failures in 15 minutes (C5). With `severeFailures` above 10, the severe notice can never fire. What does T-101 do?

Why this is open: both numbers come from C5; T-105 will expose `severeFailures` as a runtime setting. Counting refused attempts as failures would make the delay grow without end.

A. **Keep both as C5 states**, implement them exactly, and raise an S3 ISS row for U12 T-105 (and C1) so the setting's range is narrowed to the fixed limit or the fixed limit follows the setting, by the owner's choice (recommended). Nothing changes for the defaults (10 = 10).
B. **Make the fixed per-email limit `max(10, severeFailures)`** now. Changes C5's fixed number without a contract revision.
C. **Narrow the two ranges now, as U12 T-105's Question 1 A decided**: `delayAfterFailures` 1–9, `severeFailures` 2–10 and above `delayAfterFailures`; the other three keys keep C1's ranges; the defaults (3, 15, 1, 30, 10) do not change (recommended in the 2026-10-29 refresh). This Unit writes the block first, so the schema never accepts a value that does nothing, T-105 does not have to change it, and finding F3 closes here. C1's range line is recorded as drift, to be corrected at the next contract revision, the way Question 6 treats C5's `actor_shape` line.
X. Other (please specify)

[Answer]: C (decided by the agent under the owner's no-questions instruction of 2026-10-29; it was A on 2026-10-27, before T-105's draft settled the ranges)

## Question 9

When does the severe-activity notice's transaction run?

Why this is open: the 10th failure for a real account writes an email delivery, a job, an outbox event and an audit row; for an address without an account it writes nothing. Run inside the request, that extra transaction makes the 10th response slower only for real accounts, which AC3.1.5 forbids ("neither the response nor its timing reveals …").

A. **After the response is sent**, through a small `AfterResponse` port (web adapter: Next's `after()`; test fake: runs the task at once and records it) (recommended). The response is decided first and is the same for every address; the notice's four writes still commit together in one transaction; a failure is logged (`auth.severe_notice_failed`, account id only).
B. **Inside the request.** Simpler, but the 10th response of a real account is one transaction slower.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

The auth spec §3.6 says "Sign out everywhere" asks for the password inline (step-up). 03 §4 and `SignOutEverywhereInput` (`{}`) have no password, and `account.stepUp` is T-103's. Does T-101's `signOutEverywhere` require a step-up?

Why this is open: signing out everywhere is a protective action; requiring a password makes it harder for a holder who suspects misuse, while the harm an attacker can do with it is to sign the holder out.

A. **No step-up in T-101**, as 03 §4 and the schema say (recommended). The spec's password prompt is raised as an S4 ISS row for U9 T-102 and U10 T-103, which can add `requires.stepUp` once `account.stepUp` exists.
B. **Require a password in the input now.** Changes the contract schema and duplicates T-103's step-up.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

Units Generation assigned "AC10.3.6 feedback fields (Account)" to this Functional Design. AC10.3.6 (FR90) wants feedback with a category from an admin-configured list, a description, an optional screenshot and a contact-permission choice; the `feedback` table has `body` and `locale` only, T-101's `account.submitFeedback` is `{body}`, and T-409's `FeedbackPanel` is a textarea. What does T-101 build?

Why this is open: the category list is a runtime setting (T-105 owns `ConfigValues`; review R-14 lets T-101 add only the `signIn` keys), and a screenshot is a new file-upload path with scanning and private storage, which today only the evidence pipeline has. No Unit's task file builds these fields.

A. **Build `account.submitFeedback` with the current columns** (`body`, `locale`, 5 per day) and raise the missing AC10.3.6 fields to the owner as an S2 ISS row (recommended). Whether FR90's extra fields are built in this intent, and by which Unit, is a scope decision for the owner (the FD-056..FD-059 pattern), not decided here.
B. **Add `category` and `contact_allowed` columns now** with a fixed category list in code. A list in code contradicts "admin-configured", and T-409 has no fields to send them.
C. **Build all four fields, screenshot included.** A new upload path inside a high-risk auth Unit, outside its owned paths and estimate.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; the owner's answer to R2 on 2026-10-28, "FR90 feedback is text only in this release", confirms it; proposed FD-096 records the narrowing)

## Question 12

Where does the Better Auth call live, now that `application` may import no external package and no Node built-in (FD-093, T-010)?

Why this is open: the first draft let the commands call `auth.api.*` themselves and kept an AsyncLocalStorage `CommandContext` in `defineCommand`. Under the boundary matrix as built, `packages/application/src` may import only `domain` and `contracts`, so both imports turn `pnpm lint` red. `adapters` may import `better-auth`, but not `database`, whose Drizzle schema and connection the library's adapter needs. `apps/web/src/server/*` may import `better-auth`, `database` and `application`, and `server/container.ts` alone may import `adapters`.

A. **An `AuthGateway` port in `application`, implemented in `apps/web/src/server/better-auth/`** (recommended). The port speaks the application's language: `createCredentialUser`, `issueVerificationToken`, `verifyEmailToken`, `issueResetToken`, `resetPassword`, `changePassword`, `createSession`, `getSession`, `revokeSession(s)`, `listSessions`, `deleteUser`. Each method opens a library-call scope (AsyncLocalStorage, a web-tier Node import) naming its purpose; the `user.create.before` and `session.create.before` hooks and the email callbacks read that scope. `server/container.ts` builds the gateway with the Argon2 hasher from `adapters`, so `server/better-auth/*` never imports `adapters`. Commands stay testable with a fake gateway from `test-support`.
B. **Implement the gateway in `packages/adapters/src/better-auth/`** and pass the Drizzle adapter and schema in from the container as opaque values. Keeps "adapters hold libraries", but hides the database dependency from the boundary rules and needs casts at the seam.
C. **Add `application → better-auth` and `application → node:async_hooks` edges** (an FD-093 amendment). The first draft as written; every command test then loads the library, and the "pure application" rule is gone for every later Unit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

How does the worker's `mail.send` get the email copy, given that the worker has no `i18n` edge (FD-093)?

Why this is open: FD-071 has the worker render each email from `packages/i18n` in the delivery's locale. `packages/i18n/src` imports `next-intl`, and the matrix gives the worker no edge to it. The JSON files in `packages/i18n/messages/` sit outside every element and are not exported by the package.

A. **A data-only element for the message files** (recommended). `i18n-messages` covers `packages/i18n/messages/*.json`, exported as `@rogikotha/i18n/messages/<locale>.json`; `worker` and `i18n` may import it. The worker imports both files with `with { type: 'json' }` and passes the `email.*` entries to the `mail.send` use case, which is pure application code in `@rogikotha/application/worker`. `next-intl` becomes an optional peer of `@rogikotha/i18n`, so the worker never installs or loads it. Needs proposed FD-097 (amends FD-093 and §2) and two fixture cases in `pnpm lint:boundaries`.
B. **Read the JSON through `node:fs`** from a path resolved at start. Passes the lint, but the cross-package dependency is then invisible to the rules that exist to show it.
C. **Render in the web tier at queue time** and store subject and body in `email_deliveries`. New columns, the rendered text with its live link at rest, and T-405's send-time checks would act on text written earlier.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

How does `account.signIn` check the password?

Why this is open: the first draft let the library's `signInEmail` decide, relied on it hashing a dummy for an unknown email (undocumented, "to confirm in the spike"), and revoked any session the library returned for a suspended account. U10 T-103's Question 1 A checks the staff password through the `PasswordHasher` port first, with the same counters (shared per address and per network), so two different credential paths would exist.

A. **Through the port first, then the gateway mints the session** (recommended). After the refusals of BR3.2, the command reads the credential through the account repository (password hash, status, account id; the web tier only) and verifies once with the port, against a dummy PHC hashed once at start-up when the address is unknown or deleted. Only a pending, active or restricted account then reaches `AuthGateway.createSession` (the library's public email sign-in inside a scope that allows a session); the library verifies a second time, a cost only a correct password pays. A suspended account never has a session row, not even briefly, and the equal-cost failure paths do not depend on library internals.
B. **Keep the library as the decider** (the first draft): one Argon2 verify on success, but the timing of unknown emails depends on undocumented behaviour, a suspended account's session exists until it is revoked, and T-103 builds a second path.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Answered by the owner (raised in the first draft)

Each changed a data boundary or a product scope, so the first draft did not decide it. The owner has now answered both; the proposed decision-log rows are in `functional-spec.md` § 9.1 and are appended before any code.

- **R1 — The worker key decrypted more than mail addresses.** FD-071's `APP_ENCRYPTION_KEY` encrypts every `*_enc` column, and `rk_worker` can read `reviews.exact_date_enc` (ISS-240) and `evidence_items.original_filename_enc` (ISS-139). **Owner's answer (2026-10-28):** the worker holds a separate, mail-only key. Proposed FD-094: `MAIL_RECIPIENT_KEY`, used only for `to_email_enc`; the worker never holds `APP_ENCRYPTION_KEY`.
- **R2 — FR90's extra feedback fields had no builder** (Question 11). **Owner's answer (2026-10-28):** feedback is text only (body and locale) in this release; category, screenshot and contact move to release 2. Proposed FD-096.
