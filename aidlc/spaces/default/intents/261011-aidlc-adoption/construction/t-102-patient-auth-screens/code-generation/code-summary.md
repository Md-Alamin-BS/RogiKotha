# Code summary — U9 `t-102-patient-auth-screens` (T-102)

Plan Steps 1–16, built 2026-11-05 to 2026-11-06 on `bolt/t-102-patient-auth-screens` in the swarm worktree `rk-u9` (FD-094), test database `rogikotha_w1_test` (ISS-485). Issues found in this Unit are ISS-479 to ISS-498 in `docs/implementation/ISSUES.md`; ISS-124, ISS-436 and ISS-440 (patient side) are closed by it, and ISS-438's demo write gate is closed by ISS-484. The task file `docs/implementation/tasks/T-102-patient-auth-screens.md` has the U9 amendments, the `FD-0nn:` acceptance rows and the Hand-off.

ISS numbers: ISS-456 to ISS-478 are taken on `bolt/t-104-identity-module` (U11), so U9 starts at ISS-479. If another Bolt takes these numbers first, renumber at merge time (plan Step 16) and update this file, the task file and the plan notes.

## Baseline (Step 1, 2026-11-05)

- `pnpm check`: 217 test files, 2,284 tests (2,281 passed, 2 expected fail, 1 cold-import timeout in `contracts` `workspace.smoke.test.ts` that passed on re-run).
- `apps/web` lines 95.90% (1,592 of 1,660).
- `pnpm smoke`: 17 files, 32 tests.
- No open `S1` in the auth area.

## What was built

| Layer | Where | Notes |
|---|---|---|
| Lower layers | none | Step 4: no change in `contracts`, `domain`, `application`, `database`, `adapters` or `test-support`; no migration |
| Web server actions | `apps/web/src/server/actions/{auth-form,auth,account}.ts` | extended `AuthFormState` (R-01); `safeAuthNext` (BR1.5); the `rk.pending` cookie (BR2.2); `rateLimitMessage` (BR4.2); register no longer signs in (FD-103); `confirmEmail`, `resendLink`, `resendOwnLink`, `requestReset`, `setNewPassword`, `changePasswordForm`, `signOutEverywhereForm`; `getContributionAccess()` (fails closed) |
| Contribution rule | `apps/web/src/server/auth/contribution-access.ts`, `server/auth/session.ts` | the BR8.1 mapping shared by the gate and the new `requireContributor` guard (Step 14 fix, ISS-484) |
| Demo write actions | `apps/web/src/server/actions/{comments,review}.ts` | `postComment`, `publishReview` and `saveReviewEdit` call `requireContributor`; `deleteComment` stays on `requireAccount` (ISS-496) |
| Components | `apps/web/src/components/patient/auth/` | 14 new: `JoinSteps`, `AuthNotice`, `PendingPanel`, `ResendLinkForm`, `ResendOwnButton`, `ConfirmEmailForm`, `VerifyDone`, `ResetRequestForm`, `SetPasswordForm`, `ChangePasswordForm`, `SessionList`, `SignOutEverywhere`, `SecuritySettings`, `ContributionGate` (C16 props frozen); changed `AccountControl` (grapheme-safe initials, Security and Confirm links), `AuthFields`, `RegisterForm`, `SignInForm`, `use-auth-form` |
| Pages | `register`, `sign-in`, `verify-email`, `reset-password`, `me/security` under `apps/web/src/app/[locale]/(patient)/` | noindex everywhere, `no-referrer` on the two token pages, signed-in redirect, the four `/verify-email` panels, the security page's two parallel queries |
| Chrome | `components/patient/Masthead.tsx` (account entry), `profile/ProfileWorkspace.tsx` (Security link) | |
| Styles | U9 section of `apps/web/src/styles/patient.css` | `.join-steps`, `.session-table`, each `/* added: U9 T-102 ... */`, T-011 tokens, no motion of its own |
| i18n | `packages/i18n/messages/{en,bn}.json`, regenerated `src/keys.ts` | 902 keys in both languages; `errors.auth.rateLimited` and `errors.auth.accountSuspended` values changed; Bengali copy on the owner's U50 copy review (FD-042) |

## Tests

- Unit and component: `auth-form.test.ts`, `auth.test.ts`, `account-access.test.ts`, `auth-screens.test.tsx` (every new component in `en` and `bn`), `ContributionGate.test.tsx`, `AccountControl.test.tsx`, `auth-forms.test.tsx`, `session.test.ts` (+5 cases), `comments.test.ts`, `review.test.ts`.
- Page tests in U9's own folders: `register/page.test.tsx`, `sign-in/auth-pages.test.tsx`, `verify-email/page.test.tsx`, `reset-password/page.test.tsx`, `me/security/page.test.tsx`.
- Integration (`web-int`): `server/actions/auth-screens.int.test.ts` (register → queued email token → `confirmEmail` → `allowed`).
- Smoke: `components/patient/auth/auth-screens.smoke.test.tsx` (pending screen and signed-out gate, `en` and `bn`).
- Adversarial (Step 14, a separate agent): see Sign-off.

## Gate

- Step 13 (2026-11-06, third run): `pnpm check` exit 0, 226 files, 2,511 tests (2,509 passed, 2 expected fail); `pnpm test:int` 41 files, 286 tests (284 passed, 2 expected fail); `npx impeccable detect apps/web/src --no-advisory` 281 files, no findings; `pnpm contrast`, `contrast:patient` and `check:motion` (M1–M11) pass.
- Step 14 re-run after the ISS-484 fix (2026-11-06): `pnpm check` exit 0, 230 files, 2,541 passed and 2 expected fail; `pnpm smoke` 18 files, 36 tests.
- Step 16 final run (2026-11-06): `pnpm format:check` exit 0; `pnpm check` exit 0, 230 test files, 2,543 tests (2,541 passed, 2 expected fail); typecheck, lint (1 warning, ISS-493), boundaries, format, identity check, i18n parity (902 keys), `contrast`, `contrast:patient`, `check:motion` and build all pass; `pnpm smoke` exit 0, 18 files, 36 tests.
- Line coverage (Step 16 run): all files 97.75% (5,408 of 5,532); `apps/web/src` 97.09% (1,903 of 1,960), above the 80% floor and up from 95.90% at baseline. No threshold lowered.
- One lint warning stays, outside U9: an unused `eslint-disable` in `packages/i18n/src/routing.ts` (ISS-493).

## Files outside the owned paths

- `apps/web/src/server/auth/session.ts`, `session.test.ts` and the new `server/auth/contribution-access.ts`; `apps/web/src/server/actions/comments.ts`, `comments.test.ts`, `review.ts`, `review.test.ts`: the minimum the ISS-484 fix needs (BR8.1). `review.test.ts` contains NUL bytes, so its guard name was replaced with a byte-preserving script rather than the file tools.
- Shared, append-only: `apps/web/src/app/pages.test.tsx` (three stand-in mocks, no row changed, ISS-490), `apps/web/src/styles/patient.css`, `packages/i18n/messages/en.json`, `bn.json`, `packages/i18n/src/keys.ts` (generated), `docs/implementation/ISSUES.md`, `docs/status/dependency-check-log.md`, `docs/implementation/tasks/T-102-patient-auth-screens.md`.
- T-101's tests in `server/actions/` moved to the new state shape: `auth.adversarial.test.ts`, `register-enumeration.adversarial.test.ts`.
- Not touched: `.github/workflows`, `eslint.boundaries.mjs`, the lower packages, `/me`, `/write`, `terms/`, `privacy/`.

## Paths not in `source-manifest.json`

`source-manifest.json` lists literal paths only. These changed paths contain `[` or `]` and are listed here instead:

- `apps/web/src/app/[locale]/(patient)/me/security/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/me/security/page.tsx`
- `apps/web/src/app/[locale]/(patient)/me/security/security.adversarial.int.test.ts`
- `apps/web/src/app/[locale]/(patient)/register/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/register/page.tsx`
- `apps/web/src/app/[locale]/(patient)/reset-password/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/reset-password/page.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/auth-pages.test.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/page.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/signed-in-redirect.ts`
- `apps/web/src/app/[locale]/(patient)/verify-email/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/verify-email/page.tsx`
- `apps/web/src/app/[locale]/(patient)/verify-email/verify-email.adversarial.test.tsx`

The AI-DLC record files under `aidlc/` are not listed in the manifest either.

## Issues found and fixed in U9

| ISS | Sev | Status |
|---|---|---|
| ISS-479 `safeNextPath` accepted auth pages, `/api`, `/admin` | S3 | fixed in U9 |
| ISS-480 suspended copy named a deferred appeal route | S2 | fixed in U9 |
| ISS-481 gate copy listed deferred features | S3 | fixed in U9; unused `auth.gate.body` left to U50 |
| ISS-482 `/me` not session-aware; FD-096 banner | S4 | open, owner of `/me` |
| ISS-483 release 2 `restricted` accounts in C9/C10 | S4 | open, release 2 |
| ISS-484 unconfirmed account could comment and publish (BR8.1) | S1 (pending the owner's confirmation) | fixed in U9 |
| ISS-485 test-database name refused by the reset guard | S4 | workaround; fix with ISS-466 (U11) |
| ISS-486 `pnpm lint` before the first build on a fresh worktree | S4 | open |
| ISS-487 dev inbox URL hard-coded to port 8025 | S4 | assumption |
| ISS-488 int tests read tokens from `email_deliveries` | S4 | assumption |
| ISS-489 seconds key under `formErrors.*` | S4 | assumption |
| ISS-490 request stand-ins in `pages.test.tsx` | S4 | workaround |
| ISS-491 Bengali password labels share a prefix | S4 | workaround in tests |
| ISS-492 boundaries and unused-parameter lint failures at Step 13 | S4 | fixed in U9 |
| ISS-493 unused `eslint-disable` in `packages/i18n/src/routing.ts` | S4 | open, not U9 code |
| ISS-494 adversarial test naming and scope | S4 | assumption |
| ISS-495 `web-int` pool kept the process alive | S4 | workaround |
| ISS-496 `requireContributor` redirects; `deleteComment` unchanged | S4 | assumption |
| ISS-497 choices that differ from the design's wording | S4 | recorded |
| ISS-498 browser-only acceptance rows not walked | S4 | open, Build and Test or U50 |

Closed by U9: ISS-124 (sign-out is the POST action), ISS-436 (rate-limit unit), ISS-440 (patient side: confirmation, no password; staff step-up with U10), and the demo write gate of ISS-438.

## Sign-off

Written by the agent, delegated by the owner on 2026-11-04. This is not the owner's own signature: it records, under that delegation, that the high-risk validation steps for this auth Unit were done and what they found.

- Adversarial tests (Step 14, by a separate agent that did not write the code), against the real test database where the angle needs one:
  1. Register and signed-out resend give byte-identical answers for a new, an unconfirmed and a confirmed address (outcome, redirect, `rk.pending` cookie name and attributes, no session cookie): pass.
  2. A used and an expired reset token each return the expired state, write no cookie and leave the password unchanged: pass.
  3. `/me/security` signed out, with a forged cookie and with a cookie replayed after "sign out everywhere": redirect to sign-in, and neither query returns data or an address: pass.
  4. An unconfirmed account: `getContributionAccess()` answers `unconfirmed`, but `postComment` and `publishReview` let it through. This broke (ISS-484, S1 pending the owner's confirmation). Fixed with `requireContributor`; the test now passes 3 of 3 and was not weakened.
  5. A script-running scanner opening `/verify-email?token=` changes no account state and sets no cookie; reflected markup stays inert; six hostile `next` values never become a link: 16 of 16 pass.
- Gate (final run, 2026-11-06): `pnpm check` exit 0 (230 files, 2,541 passed, 2 expected fail), `pnpm smoke` exit 0 (18 files, 36 tests), `apps/web` lines 97.09%; earlier at Step 13, `pnpm test:int` 41 files, 284 passed and 2 expected fail, impeccable no findings. The Step 14 adversarial files run in `web-int` and the jsdom `web` project: 27 tests, all passing after the fix.
- Open `ISS-` rows from this Unit: ISS-482 (`/me`), ISS-483 (release 2), ISS-485 (with ISS-466), ISS-486, ISS-493 and ISS-498 (browser-only acceptance rows for Build and Test or U50), plus the recorded assumptions ISS-487 to ISS-491, ISS-494 to ISS-497. No open `S1` or `S2`.
- Not covered by this sign-off: the owner's FD-053 content review and FD-091 look review of the auth screens. They move to the U50 release check (Q13) and stay on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. The owner should also confirm ISS-484's S1 severity.
