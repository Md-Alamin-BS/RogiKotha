# Code Generation plan — U9 `t-102-patient-auth-screens` (T-102)

## Summary

- Builds: the patient account path on top of T-101's commands: the pending "check your email" screen and the POST-only confirm page (`/verify-email`), password reset request and set-new-password (`/reset-password`), the `/me/security` page (masked address, change password, sessions, sign out everywhere), the unconfirmed account entry with a Security link, and the C16 gate `ContributionGate` with `getContributionAccess()` for U47 and U49
- Touches: U9's owned paths only (`apps/web/src/app/[locale]/(patient)/{register,sign-in,verify-email,reset-password,me/security}/`, `apps/web/src/components/patient/auth/`, the account entry in `Masthead.tsx`, the Security link in `profile/ProfileWorkspace.tsx`, `apps/web/src/server/actions/{account,auth,auth-form}.ts`), plus the append-only shared files listed below (`en.json`, `bn.json`, the regenerated `keys.ts`, U9's section of `patient.css`, `ISSUES.md`, `dependency-check-log.md`) and the records
- Tests: `auth-form.ts` helpers and parsers, every server action's `ok` and refusal mappings, component tests in `en` and `bn`, page tests in U9's own files, one `web-int` integration test (register → Mailpit → confirm → `allowed`), one smoke file (pending screen and gate), and 3–5 adversarial tests by a separate agent (high-risk Unit: auth)

## Inputs

- Functional Design (reviewed READY, iteration 1): `construction/t-102-patient-auth-screens/functional-design/`: `functional-spec.md` (WF1–WF9, §§ 4–10), `rules.md` (BR1.1–BR10.1), `frontend-components.md` (components, `AuthFormState`, actions, message keys, tests), `functional-design-questions.md` (Q1–Q18, the ISS findings, the review decisions), `traceability.json`, and `reviews/review-01.md` (two Major and six Minor findings, all settled in the design; see below).
- Unit entry U9 in `inception/units-generation/unit-of-work.md` (owned paths, the T-106 auth rows taken over, FD-053, FD-057, FD-096, FD-103, FD-105).
- Task file `docs/implementation/tasks/T-102-patient-auth-screens.md`, and `main` as merged with U8 T-101, U3 T-010 and U45 T-011.

## Review points already settled in the design

Review 01 R-01 to R-08 were decided under the owner's delegation of 2026-11-04 and are written into the design (`functional-design-questions.md` § "Review 01 findings"). This plan builds them as written:

1. **R-01:** the extended `AuthFormState` (`status`, `{key, params}` messages, `notice`, `expired`); the form formats numbers; the existing forms move to it (Step 5, Step 11).
2. **R-02:** no typed value in the returned state; with JavaScript the browser keeps its own values (Step 5, Step 7).
3. **R-03, R-04:** `safeAuthNext` exactly as BR1.5; one default `/{locale}/me` (Step 5).
4. **R-05:** `rk.pending` cleared on sign-out and sign-out everywhere, validated on every read (Step 7).
5. **R-06:** `next` travels in `rk.pending` to the done panel (Step 7, Step 10).
6. **R-07:** `restricted` is `unavailable` in the gate; the release-2 point is an ISS row (Step 16).
7. **R-08:** page tests in U9's own files; `pages.test.tsx` changed only if a placeholder row fails; `keys.ts` regenerated on rebase (Step 9, Step 11).

## Where it runs

- The Unit runs in its own git worktree on its own Bolt branch `bolt/t-102-patient-auth-screens`, cut from `main`, under the swarm (FD-094). The orchestrator assigns one of the test databases `rogikotha_test_w1` to `rogikotha_test_w6`; `DATABASE_URL_TEST` in the worktree points at that one database only. Never at `rogikotha_test` of another worktree.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).
- There is no GitHub Actions workflow and no CI (FD-102). The gate is local only: `pnpm check` and `pnpm smoke` on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths and the listed shared files, after reading `git diff --cached`.

## Steps (test-after, per the Testing Contract)

**Phase A — baseline and runner**

- [x] **Step 1** — Baseline in the worktree on `bolt/t-102-patient-auth-screens`. Confirm `DATABASE_URL_TEST` names the assigned `rogikotha_test_wN`. Run `pnpm infra:up`, then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record the file and test counts and the `apps/web` line coverage. Read the open `ISSUES.md` rows in the auth area (ISS-029, ISS-124, ISS-436, ISS-440, ISS-449). An open `S1` in the area stops the Unit.
  - Note (2026-11-05): the database project's reset guard accepts only names ending in `_test` or `_test_b`, so it refused `rogikotha_test_w1`. ASSUMPTION(U9): the worktree uses a new, empty `rogikotha_w1_test` on the compose PostgreSQL (owner `rk_app`) instead; no code changed. On a fresh worktree `pnpm lint` also fails before the first `pnpm build` (typed routes not generated yet), so `pnpm build` ran once first. Baseline: `pnpm check` 217 test files, 2,284 tests (2,281 passed, 2 expected fail, 1 cold-import timeout in `contracts` `workspace.smoke.test.ts` that passes on its own re-run); `apps/web` lines 95.90% (1,592 of 1,660); `pnpm smoke` 17 files, 32 tests green. No open `S1` in the auth area.
- [x] **Step 2** — Dependency check (design § 10): the log entry for `next`, `react` and `next-intl` is older than 3 days. Re-check the pinned versions as current stable, and the known `useActionState` and progressive-enhancement issues (native form POST to a server action, `redirect()` inside an action, `cookies().set` in an action). Append a dated entry to `docs/status/dependency-check-log.md`. Confirm that no new FD entry is needed: U9 changes no hard rule, data boundary or founder decision (FD-053, FD-057, FD-096, FD-103, FD-104 already cover it).
- [x] **Step 3** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`, the `web` jsdom project and the `web-int` project) and record the exact unit-scoped commands in `unit-test-instructions.md`. Run the existing auth tests with the unit-scoped command and record the count before any change.
  - Note (2026-11-05): the commands in `unit-test-instructions.md` hold; in the worktree the `auth-form.test.ts` plus `components/patient/auth/` filter ran 3 files and 48 tests green before any change.

**Phase B — lower layers**

- [x] **Step 4** — Contracts, domain, application, database and adapters: no change. U9 adds no entities, tables, commands, queries or ports (`functional-spec.md` § 5: all C5 and C19 interfaces are consumed unchanged). `ContributionAccess` and `AuthFormState` live in `apps/web/src/server/actions/auth-form.ts`, not in `contracts`. No migration, so no migration number is taken. Verify with `git diff --stat main -- packages/contracts packages/domain packages/application packages/database packages/adapters packages/test-support` (empty). No tests are added there; their existing suites stay green. If the build finds a missing piece in a lower layer, do not add it inside U9: record an `ISS-` row and take the narrower option inside the owned paths, marked `ASSUMPTION(U9): ...`.

**Phase C — web server (API / endpoint)**

- [x] **Step 5** — Implement `server/actions/auth-form.ts`: the extended `AuthFormState`, `AuthMessage` and `INITIAL_AUTH_STATE` (§ 3.1); `PENDING_EMAIL_COOKIE = 'rk.pending'`, `PENDING_EMAIL_MAX_AGE_SEC = 1800`, `type ContributionAccess`; `safeAuthNext` (BR1.5 steps 1–6, built on `safeNextPath`); `readPendingCookie` (BR2.2); `parseEmailOnly`, `parseSetPassword` (mismatch → `auth.reset.mismatch`, BR5.2), `parseChangePassword`; `rateLimitMessage(retryAfterSec)` (BR4.2). Move `registerRefusal`, `signInRefusal`, `parseRegistration` and `parseSignIn` to the new state shape.
- [x] **Step 6** — Write and run `server/actions/auth-form.test.ts` (extended): the BR1.5 refusal list (`/sign-in`, `/admin`, `/en/Admin`, `/en/%61dmin`, `/bn/SIGN-IN`, `//x`, `https://evil.example`) and the kept `/en/experiences/abc`; a malformed cookie, a cookie with a bad address and one with a bad `next`; `rateLimitMessage` at 1, 59, 60 and 61 seconds and with no `retryAfterSec`; each parser's refusals; no submitted value in any returned state (BR1.2, BR10.1).
- [x] **Step 7** — Implement `server/actions/auth.ts`: change `register` (set `rk.pending`, redirect to `/{chosenLocale}/verify-email[?next]`, never sign in, BR2.1) and `signIn` (BR4.1–BR4.4, default `/{accountLocale}/me`); extend `signOut` to delete `rk.pending`; add `confirmEmail`, `resendLink`, `resendOwnLink`, `requestReset`, `setNewPassword`, `changePasswordForm` and `signOutEverywhereForm` per § 3.2. Cookie attributes: HttpOnly, SameSite=Lax, Secure on https, Path=/, 30 minutes. `internal` results are logged through the logger port with `code` and `correlationId` only. Implement `getContributionAccess()` in `server/actions/account.ts` (BR8.1, fail closed).
- [x] **Step 8** — Write and run the action tests in `server/actions/auth.test.ts` (extended) and a new `server/actions/account-access.test.ts`: each action's `ok` and each refusal mapping; register sets the identical cookie and redirect for a new and an existing address; mismatched passwords skip the command; sign out everywhere does nothing without `confirm=yes`; `rk.pending` deleted by sign-in, confirm, sign-out and sign-out everywhere; `getContributionAccess` for anonymous, `pending_verification`, `active` verified, `suspended` and `restricted`. Then write and run the integration test `server/auth-screens.int.test.ts` (`web-int`, against the assigned test database and Mailpit): register → Mailpit token → `confirmEmail` → `getContributionAccess() === 'allowed'`, called the way a server component calls it, proving the request's cookies are kept (design § 10 risk 1).
  - Note (2026-11-05): 61 action tests green; the integration test is green against `rogikotha_w1_test`. ASSUMPTION(U9): it reads the token from the queued `email_deliveries` row, as T-101's smoke does, because the worker that delivers to Mailpit does not run in `web-int`. T-101's two adversarial tests in `server/actions/` were moved to the new shape: `auth.adversarial.test.ts` gets a `next/headers` stand-in, and `register-enumeration.adversarial.test.ts` now also compares the `rk.pending` cookie and asserts that both observations are real redirects (before, a thrown `cookies()` call would have made both observations equal and the test pass vacuously).

**Phase D — i18n and UI (frontend behaviour)**

- [x] **Step 9** — Add the new keys of `frontend-components.md` § 5 to `packages/i18n/messages/en.json` and `bn.json` in the same commit, and change the values of `errors.auth.rateLimited` and `errors.auth.accountSuspended` (U9's own keys; only `auth.ts` uses them). The Bengali copy is flagged for the owner's copy review at U50 (FD-042). Regenerate `packages/i18n/src/keys.ts` with its script, never by hand, and again after every rebase. Run `timeout 300 pnpm i18n:check`.
  - Note (2026-11-05): two changes forced by `check-parity.mjs`. ASSUMPTION(U9): the seconds key is `formErrors.auth.rateLimitedSeconds`, not `errors.auth.rateLimitedSeconds`, because the check refuses an `errors.*` key with no ErrorCode behind it (beside `formErrors.auth.rateLimited`). The check also counts placeholder occurrences, so the Bengali plurals carry both the `one` and `other` branches (CLDR `bn` has both), with the same text in each. Parity passes at 902 keys; `keys.ts` regenerated.
- [x] **Step 10** — Implement the components and pages:
  - in `components/patient/auth/`: extend `AuthFields.tsx` (`PasswordField`, Show/Hide after hydration, Q8), `use-auth-form.ts`, `RegisterForm.tsx`, `SignInForm.tsx`, `AccountControl.tsx` (grapheme-safe initials, `data-verified`, Security and Confirm links); add `JoinSteps`, `PendingPanel`, `ResendLinkForm`, `ResendOwnButton`, `ConfirmEmailForm` (`history.replaceState` drops `?token=`), `VerifyDone`, `ResetRequestForm`, `SetPasswordForm`, `SecuritySettings`, `ChangePasswordForm`, `SessionList`, `SignOutEverywhere`, `AuthNotice` and `ContributionGate` (C16 props `{purpose, returnTo}` frozen, fail closed, BR8.2, BR8.3);
  - pages `register/`, `sign-in/`, `verify-email/`, `reset-password/`, `me/security/`: noindex on all, `referrer: no-referrer` on the two token pages (BR1.4), signed-in redirect on register and sign-in (BR1.6), `requireAccount({returnTo: '/me/security'})` and the two parallel queries on the security page (BR6.1–BR6.5);
  - `Masthead.tsx` account entry only (`unconfirmed: status === 'pending_verification'`, BR7.2) and one `Link` to `/me/security` in `profile/ProfileWorkspace.tsx`;
  - `.join-steps` and `.session-table` in U9's section of `apps/web/src/styles/patient.css`, each marked `/* added: U9 T-102 reason */`, on T-011 tokens, no motion of its own (BR9.1–BR9.3).
  Components import only server actions and `@/server/actions/auth-form` under `server/` (FD-093).
  - Note (2026-11-06): built as written, with these choices inside the design. `SignOutEverywhere` is a client component (design says S) so an `internal` refusal is shown, not lost. `ConfirmEmailForm` takes an `expiredPanel` slot that the page fills with the server-rendered `PendingPanel expired`, because a client form cannot render that server panel itself. `PendingPanel` takes an optional `devInboxUrl` (WF2 step 4), set outside `APP_MODE=production` to the compose Mailpit UI, marked `ASSUMPTION(U9)`. `ContributionGate` keeps the frozen C16 props and renders the exported `ContributionGatePanel {access, purpose, next}`, so tests can render each state without awaiting. The security page passes `returnTo: '/{locale}/me/security'` (BR6.1), because `safeAuthNext` on sign-in refuses a path without the locale. `MastheadAccount.unconfirmed` is optional (missing reads as confirmed). Test updates to keep the touched suites green: `auth-forms.test.tsx` mocks moved to the R-01 state shape and the password queries take `{selector: 'input'}` (the Show/Hide control's name contains the word "password" in Bengali); the `AccountControl` Bengali initials row expects the whole grapheme `নাই`; `sign-in/auth-pages.test.tsx` mocks `getActor` as anonymous. Left for Step 11: `app/pages.test.tsx` fails on its `/register`, `/sign-in`, `/verify-email` and `/me/security` rows (16 tests, en and bn), because those pages now read the request (`getActor`, `cookies()`, `getOwnAccount`) outside a request scope.
- [x] **Step 11** — Write and run the UI tests: every new component rendered in `en` and `bn`; `AccountControl` unconfirmed with Bengali initials; `ContributionGate` in all four access states and both purposes, `returnTo` sanitised, and fail-closed when the query throws (mock `@/server/actions/account`); the page tests in U9's own files: `register/page.test.tsx`, `sign-in/auth-pages.test.tsx` (extended), `verify-email/page.test.tsx`, `reset-password/page.test.tsx`, `me/security/page.test.tsx` (noindex, referrer, one `h1`, the signed-out redirect, the four `/verify-email` panels, `confirmed=1` typed by hand without a verified actor). Then run `apps/web/src/app/pages.test.tsx`: if one of its rows asserts a placeholder that U9 replaces (`/verify-email`, `/reset-password`, `/me/security`), change only that row and record the edit in this step's note.
  - Note (2026-11-06): new `components/patient/auth/auth-screens.test.tsx` (every new component in `en` and `bn`) and `ContributionGate.test.tsx` (four access states × both purposes, unsafe `returnTo` dropped, fail closed on a throwing query); `AccountControl.test.tsx` gains the unconfirmed row with Bengali initials; page tests `register/page.test.tsx`, `sign-in/auth-pages.test.tsx` (extended: noindex, the three notices and their order, signed-in redirect), `verify-email/page.test.tsx`, `reset-password/page.test.tsx`, `me/security/page.test.tsx` (the real `requireAccount` runs on a stubbed request context). 473 tests green across the U9 and page suites; typecheck and lint clean. `app/pages.test.tsx`: no row asserted a placeholder; its 16 failures came from the pages reading the request, so no row was changed and three stand-in mocks were added instead (`@/server/auth` anonymous `getActor`, `next/headers` with no cookie, `@/server/actions/account` with a synthetic own account and no sessions), all 277 rows green. ASSUMPTION(U9): adding mocks is the narrower edit than changing rows, and it stays inside the file's own "shell only" contract.
- [x] **Step 12** — Smoke: add `apps/web/src/components/patient/auth/auth-screens.smoke.test.tsx` with at least one assertion for the pending screen and one for the gate (signed-out prompt). Run `timeout 600 pnpm smoke`; the suite only grows.
  - Note (2026-11-06): the smoke file renders, in `en` and `bn`, the signed-out pending screen (address in the body, prefilled resend field, sign-in link carrying `next`) and the signed-out `ContributionGate` (sign-in and register links carrying the sanitised `returnTo`). `pnpm smoke` went from 17 files and 32 tests (Step 1) to 18 files and 36 tests, all green; no assertion was removed or skipped.

**Phase E — gate, adversarial tests, sign-off and records**

- [x] **Step 13** — Gate: `timeout 1200 pnpm check` (includes contrast, `contrast:patient` and `check:motion`) and `timeout 600 pnpm smoke`, both green, plus `timeout 600 pnpm test:int`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. `apps/web` stays at or above 80% lines (never lowered, D10). Run the T-102 acceptance rows (design § 9) and record expected against observed for Build and Test.
  - Note (2026-11-06): the first two `pnpm check` runs failed, and both failures are fixed inside the owned paths. (1) Lint: `server/auth-screens.int.test.ts` imported `server/actions/*`, which the boundaries matrix refuses for a `web-server` file. The test moved to `server/actions/auth-screens.int.test.ts`, with its relative imports adjusted and `unit-test-instructions.md` updated (`ASSUMPTION(U9)` in the file header; `eslint.boundaries.mjs` not touched). `resendOwnLink` had two unused `_`-prefixed parameters (the config has no underscore ignore pattern), so it now takes none; `useActionState` accepts it, and the three `auth.test.ts` calls follow. (2) Prettier: `SignInForm.tsx`, `auth.ts`, `auth.test.ts` and `account-access.test.ts` were reformatted only. Third run: `pnpm check` exit 0, with 226 test files and 2,511 tests (2,509 passed, 2 expected fail); i18n parity 902 keys; contrast, `contrast:patient` and `check:motion` (M1–M11) pass; build done. Coverage: all files 97.7% lines, `apps/web` 96.93% (1,894 of 1,954; Step 1 was 95.90%). `pnpm smoke`: 18 files and 36 tests green. `pnpm test:int`: 41 files and 286 tests (284 passed, 2 expected fail); the moved int test passes on its own. `npx impeccable detect apps/web/src --no-advisory`: 281 files, no findings. `pnpm contrast`: exit 0, no FAIL. One lint warning stays, outside U9: an unused `eslint-disable` in `packages/i18n/src/routing.ts`.
  - Acceptance rows (design § 9), expected against observed. Rows that need a running app in a browser were not walked here; the shared development database and ports belong to the other worktrees.

    | Row | Expected | Observed |
    |---|---|---|
    | Spec §6 flow (Q17) | register → pending screen with the address → emailed link → Confirm → `/verify-email?confirmed=1` with `auth.verify.done` | Automated: `server/actions/auth-screens.int.test.ts` runs register → queued email token → `confirmEmail` → `getContributionAccess() === 'allowed'` against `rogikotha_w1_test`; the `verify-email/page.test.tsx` panels and the smoke file cover the pending and done screens in `en` and `bn`. Live Mailpit walk in a browser: not run here. |
    | Same-email register | identical pending screen and cookie | `auth.test.ts` "gives a new and an already-registered address the same cookie and redirect, and never signs in": pass. The Step 14 adversarial test (1) still to run. |
    | No-JS | full-page re-render with the summary and the inline error | Not walked in a browser. Forms post natively to server actions and return no typed values (R-02), covered by `auth-forms.test.tsx` and `auth-form.test.ts`. |
    | Focus | summary focused after a failed submit; `h1` after navigation | Component tests for the error summary: pass. Not walked in a browser. |
    | `next` safety | `https://evil.example` → `/{locale}/me`; `/sign-in`, `/en/Admin`, `/en/%61dmin` refused; `/en/experiences/abc` honoured | `auth-form.test.ts` `safeAuthNext` rows: pass; the smoke and gate tests drop an unsafe `returnTo`: pass. |
    | Rate-limit copy | seconds copy from the 3rd failure; minutes copy after the limit | `auth-form.test.ts` `rateLimitMessage` at 1, 59, 60 and 61 s and with none: pass. |
    | Sessions, FD-057 | sessions table, one `auth.security.thisDevice`, sign out everywhere behind the `<details>` confirmation; no recent-logins list or alert | `auth-screens.test.tsx` and `me/security/page.test.tsx`: pass. A two-browser walk was not run here. |
    | Both locales, noindex | Bengali strings and digits; `noindex` on every auth page | Page tests assert `noindex` on all five pages; every component test runs in `en` and `bn`; i18n parity: pass. A 360 px overflow check needs a browser: not run here. |
    | Detector and contrast | clean | impeccable: no findings; `pnpm contrast` and `contrast:patient`: pass. |
    | `pnpm check`, FD-091 motion | exit 0; `check:motion` passes | exit 0; M1–M11 pass. The reduced-motion journey needs a browser: not run here. |
    | FD-053 and FD-091 owner reviews | the owner's look and content reviews | Moved to the U50 release check (Q13); on `OWNER-REVIEW-QUEUE.md`. |
- [x] **Step 14** — Adversarial tests (high-risk Unit: auth, team practice step 5). A separate agent, not the one that wrote the code, writes and runs 3–5 tests from `functional-spec.md` § 7, which also execute the T-106 auth rows: (1) register and resend give byte-identical results for a new, an unconfirmed and a confirmed address (status, `Set-Cookie` names and attributes, redirect target, page text); (2) a used or expired reset token leaves the password unchanged; (3) signed out, `/me/security` returns no session data; (4) an unconfirmed actor gets `getContributionAccess() !== 'allowed'` and the publish and comment commands refuse it; (5) a GET of `/verify-email?token=` changes no account state and sets no cookie. Files: `server/actions/auth-screens.adversarial.test.ts` and, if needed, `app/[locale]/(patient)/verify-email/verify-email.adversarial.test.ts`. Fix everything they break, add an `ISS-` row per break, and re-run Step 13.
  - Written and run (tests only, no production change): `server/actions/auth-screens.adversarial.int.test.ts` (1, 2: 4 pass), `app/[locale]/(patient)/me/security/security.adversarial.int.test.ts` (3, with a forged and a replayed cookie: 4 pass), `server/actions/contribution-access.adversarial.int.test.ts` (4: the gate passes; the comment and publish actions FAIL), `app/[locale]/(patient)/verify-email/verify-email.adversarial.test.tsx` (5, plus reflected markup and off-site `next`: 16 pass), helper `server/actions/auth-adversarial-test-support.ts`. The DB-backed files are `*.adversarial.int.test.ts` so `web-int` runs them (ASSUMPTION(U9)).
  - Open break, proposed `ISS-` row (fix and the Step 13 re-run still to do): an unconfirmed (`pending_verification`) account signs in with its password and `postComment` and `publishReview` let it through, because `requireAccount` (`server/auth/session.ts:22-26`, the `ASSUMPTION(T-101)` there) treats any account Actor with a session as signed in. `getContributionAccess()` answers `unconfirmed`, so only the gate refuses; the actions do not (BR8.1).
  - Fixed (proposed `ISS-` row, S1 pending the owner's confirmation: "Unconfirmed account passes `requireAccount`; `postComment`/`publishReview` accept it (BR8.1)", Found in U9 t-102-patient-auth-screens Step 14, Status fixed in U9): the BR8.1 mapping moved from `server/actions/account.ts` into the pure `server/auth/contribution-access.ts`, so the gate and the actions share one rule (`auth-form.ts` re-exports the `ContributionAccess` type). `server/auth/session.ts` adds `requireContributor()`: signed out goes to sign-in as before, unconfirmed to `/verify-email`, any other state to `/me` (ASSUMPTION(U9)). `postComment`, `publishReview` and `saveReviewEdit` call it; `deleteComment` stays on `requireAccount`, since removing one's own comment is not contributing (ASSUMPTION(U9)). `requireAccount` is unchanged, so an unconfirmed account still reaches `/me` and `/me/security`. Tests: `contribution-access.adversarial.int.test.ts` 3/3 pass; `session.test.ts` gains 5 cases; `comments.test.ts` and `review.test.ts` now mock `requireContributor` for the write paths, with the same assertions. Not changed: `uploadEvidence` (on `getCurrentAccount` plus own-review ownership), which an unconfirmed account can no longer reach because it cannot publish. The edits outside the owned paths (`server/auth/session.ts`, `server/actions/comments.ts`, `review.ts` and their tests) are the minimum the fix needs. Step 13 re-run on 2026-11-06: `pnpm check` exit 0 (230 test files, 2541 pass and 2 expected fail; one lint warning, an unused disable directive in `packages/i18n/src/routing.ts`, which was there before this step); `pnpm smoke` exit 0 (18 files, 36 pass).
- [x] **Step 15** — Delegated sign-off. Record a written sign-off in `construction/t-102-patient-auth-screens/code-generation/code-summary.md` under `## Sign-off`, written by the agent and labelled "delegated by the owner on 2026-11-04". It names the adversarial results, the gate counts and any open `ISS-` rows. The owner's FD-053 content review and FD-091 look review of the auth screens are not done here: they move to the U50 release check (Q13) and stay on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.
- [x] **Step 16** — Records:
  - `docs/implementation/ISSUES.md`: the five findings in `functional-design-questions.md` § "Findings for the ISS register", plus every defect, workaround or `ASSUMPTION(U9)` found in Steps 1–14, each with a severity and `Found in U9 t-102-patient-auth-screens`; close ISS-124, ISS-436 and ISS-440 with `Status` naming U9 when the build fixes them. Take the next free `ISS-` numbers at merge time.
  - the T-102 task file: the changed acceptance rows from design § 9 with `FD-0nn:` labels (FD-074), and the Hand-off.
  - `code-summary.md`, `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`; the bracketed route paths are listed in `code-summary.md` instead, as U8 did).
  - the Build and Test record lists the `ISS-` ids found and fixed in U9.
  - Note (2026-11-06): Step 15's sign-off is in `code-summary.md` § Sign-off. `ISSUES.md` gains ISS-479 to ISS-498 (the five design findings are ISS-479 to ISS-483; the Step 14 break is ISS-484, S1 pending the owner's confirmation); ISS-124, ISS-436 and ISS-440 (patient side) are closed with `Status` naming U9, and ISS-438's demo write gate points at ISS-484. ISS-456 to ISS-478 are already taken on `bolt/t-104-identity-module` (U11), so U9 starts at ISS-479; renumber at merge if another Bolt lands them first. The T-102 task file has a U9 amendments section, six `FD-0nn:` acceptance rows and the Hand-off. `traceability.json` maps the 17 AC and 36 BR ids to files; `source-manifest.json` lists 53 literal paths, and the 13 bracketed route paths are in `code-summary.md`. No Build and Test record exists yet: `code-summary.md` § "Issues found and fixed in U9" is the list for it to copy. Final gate: `pnpm format:check` exit 0; `pnpm check` exit 0 (230 files, 2,541 passed, 2 expected fail, `apps/web` lines 97.09%); `pnpm smoke` exit 0 (18 files, 36 tests).

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–3 | — (baseline, BR1.3 parity baseline) | — |
| 4 | — (no lower-layer change) | — |
| 5–6 | BR1.2, BR1.5, BR2.2, BR4.2, BR5.2, BR10.1 | US3.1 (AC3.1.3, AC3.1.5), US3.2 (AC3.2.2) |
| 7–8 | BR1.1, BR2.1, BR2.2, BR2.4, BR2.5, BR2.6, BR3.1, BR3.2, BR3.3, BR4.1–BR4.4, BR5.1–BR5.3, BR6.4, BR6.5, BR8.1, BR10.1 | US3.1 (AC3.1.1–AC3.1.5), US3.2 (AC3.2.1–AC3.2.3) |
| 9 | BR1.3 | US2.4 (AC2.4.1), US3.1, US3.2 |
| 10–11 | BR1.1–BR1.6, BR2.3, BR3.1, BR3.2, BR6.1–BR6.3, BR7.1, BR7.2, BR8.2, BR8.3, BR9.1–BR9.3 | US2.4 (AC2.4.1–AC2.4.5), US3.1 (AC3.1.1–AC3.1.4), US3.2 (AC3.2.3) |
| 12 | BR2.3, BR8.2 | US3.1 (AC3.1.1, AC3.1.4) |
| 13 | BR1.3, BR9.1, BR9.2 | US2.4 (AC2.4.1–AC2.4.5), US3.1, US3.2 |
| 14 | BR2.1, BR2.4, BR3.1, BR5.3, BR6.1, BR8.1 | US3.1 (AC3.1.2, AC3.1.4), US3.2 (AC3.2.2, AC3.2.3) |
| 15–16 | BR8.1 (release-2 row), BR10.1 | — |

Not covered by U9 (design `traceability.json`): AC2.4.6 (U50 runs the page-speed gate), AC3.1.6 (FD-056), AC3.2.4 (enforced by U8), AC3.2.5 (U10, release 2).

## Owned paths

- `apps/web/src/app/[locale]/(patient)/register/`
- `apps/web/src/app/[locale]/(patient)/sign-in/`
- `apps/web/src/app/[locale]/(patient)/verify-email/`
- `apps/web/src/app/[locale]/(patient)/reset-password/`
- `apps/web/src/app/[locale]/(patient)/me/security/`
- `apps/web/src/components/patient/auth/`
- `apps/web/src/components/patient/Masthead.tsx` (the account entry only)
- `apps/web/src/components/patient/profile/ProfileWorkspace.tsx` (the Security link only)
- `apps/web/src/server/actions/account.ts`, `auth.ts`, `auth-form.ts`, and their tests in `apps/web/src/server/actions/`
- `apps/web/src/server/actions/auth-screens.int.test.ts` (new test file; moved there from `server/` at Step 13)

Not touched: the patient layout, `/me`, `/write`, `terms/` and `privacy/` (U20).

## Shared files (append-only)

| File | U9 use |
|---|---|
| `packages/i18n/messages/en.json`, `packages/i18n/messages/bn.json` | append U9's keys; change the two U9-owned values (Step 9) |
| `packages/i18n/src/keys.ts` | generated; regenerate after every rebase, never merge by hand |
| `apps/web/src/styles/patient.css` | append U9's section with `.join-steps` and `.session-table` |
| `apps/web/src/server/container.ts` | not expected; append-only if a binding is needed |
| `apps/web/src/server/data.ts` | not expected; append-only |
| package barrels (`packages/*/src/index.ts`) | not expected; append-only |
| seed (`packages/test-support/src/seed/**`) | not expected; append-only |
| `apps/web/src/app/pages.test.tsx` | only a failing placeholder row, recorded in Step 11 |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of rows U9 fixes |
| `docs/status/decision-log.md` | not expected; append-only if a new FD is needed |
| `docs/status/dependency-check-log.md` | append one entry (Step 2) |
| `docs/implementation/tasks/T-102-patient-auth-screens.md` | amendments and Hand-off |

Merge rules: on rebase, keep both sides of every append-only file and regenerate `keys.ts`. U9 adds no migration; if one were ever needed, it takes the next free number at merge time, not at build time. Shared demo code is deleted only when a grep shows no caller left on the rebased branch; otherwise it stays and U50 removes it. U9 does not plan to delete any demo code.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "classic",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: `01-conventions.md` §10 sets per-level test minimums that each task delivers together with its code, and §13's definition of done requires them green before hand-off. In git history, tests land in the same task commit as the implementation (for example T-007 and T-009). No source asks for tests to be written before the code, and test-after is the `org.md` default for the `classic` scope.\n- **Ordering**: Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.\n- Test levels follow `01-conventions.md` §10: domain (every state-transition table and policy function), application (each command's happy path, each authorization refusal and one audit assertion, using `test-support` fakes), database (`*.int.test.ts`, each repository method, migrations apply from empty), component (renders in both `en` and `bn`), and end-to-end with Playwright and axe from T-503.\n- Cumulative smoke suite: each unit adds at least one smoke assertion for what it delivered (`*.smoke.test.ts(x)`, and from T-503 also `apps/web/e2e/smoke/*.spec.ts`). `pnpm smoke` runs the whole suite every time. The suite only grows: removing or skipping a smoke assertion needs a recorded reason.\n- Integration tests: `pnpm test:int` runs the database project against `DATABASE_URL_TEST` (the `rogikotha_test` database, separate from the development database). It resets that database to an empty, freshly migrated schema and runs test files serially. It needs the compose PostgreSQL running.\n- Coverage: an 80% line-coverage floor per package, measured with Vitest `@vitest/coverage-v8` (already installed). T-010 adds the thresholds and the CI run before merge, and raises any package below 80%. Until T-010 lands, the floor cannot be measured: no Vitest config has a coverage block yet. Work before T-010 (CR-009) records \"coverage not measured yet\" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (the empty `domain`, `application` and `adapters` packages are exempt until then). We do not claim a coverage figure we have not measured, and once the floor exists it is never lowered to make a step pass (D10).\n- Existing suites stay green: `pnpm check` (typecheck, lint, unit and integration tests, i18n parity, build) and `pnpm smoke` must pass after every unit, with no assertion removed or skipped. In brownfield work we run the full suite before changing anything, to record a baseline.\n- Test names read as sentences. We use builders, not hand-written fixture objects, and we never assert on implementation details (class names, internal calls). A test must be able to fail.\n- UI units also pass `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` cleanly before they are done (`01-conventions.md` §7.8)."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:eb26df65a70c60644a0bdc6b6fa19a28a2583bae7b61a57b814612d8ad43ebb9",
  "contract_sha256": "sha256:57d068825625cb257445b363810a0b4bbe01d375329dd0df119f640f95c1c9f4"
}
```

Applicable layers: API and endpoint (the server actions in `auth.ts`, `account.ts` and the helpers in `auth-form.ts`, Steps 5–8) and frontend behaviour (components and pages, Steps 9–12). Data model, repository and business-logic layers have no change in this Unit (Step 4): U9 adds no entities, tables, commands or queries and consumes C5 and C19 unchanged. Environment and build configuration: none beyond the regenerated `keys.ts`. Documentation and traceability: Step 16.

## Design decisions taken

Q1–Q18 and the review points R-01 to R-08 were decided in the Functional Design under the owner's delegation of 2026-11-04; Q13 moves the owner's FD-053 and FD-091 reviews to U50. High-risk Unit: the sign-off in Step 15 is agent-written and labelled "delegated by the owner on 2026-11-04".
