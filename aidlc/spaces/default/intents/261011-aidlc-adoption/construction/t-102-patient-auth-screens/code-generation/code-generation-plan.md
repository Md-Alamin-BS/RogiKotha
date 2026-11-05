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

- [ ] **Step 1** — Baseline in the worktree on `bolt/t-102-patient-auth-screens`. Confirm `DATABASE_URL_TEST` names the assigned `rogikotha_test_wN`. Run `pnpm infra:up`, then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record the file and test counts and the `apps/web` line coverage. Read the open `ISSUES.md` rows in the auth area (ISS-029, ISS-124, ISS-436, ISS-440, ISS-449). An open `S1` in the area stops the Unit.
- [ ] **Step 2** — Dependency check (design § 10): the log entry for `next`, `react` and `next-intl` is older than 3 days. Re-check the pinned versions as current stable, and the known `useActionState` and progressive-enhancement issues (native form POST to a server action, `redirect()` inside an action, `cookies().set` in an action). Append a dated entry to `docs/status/dependency-check-log.md`. Confirm that no new FD entry is needed: U9 changes no hard rule, data boundary or founder decision (FD-053, FD-057, FD-096, FD-103, FD-104 already cover it).
- [ ] **Step 3** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`, the `web` jsdom project and the `web-int` project) and record the exact unit-scoped commands in `unit-test-instructions.md`. Run the existing auth tests with the unit-scoped command and record the count before any change.

**Phase B — lower layers**

- [ ] **Step 4** — Contracts, domain, application, database and adapters: no change. U9 adds no entities, tables, commands, queries or ports (`functional-spec.md` § 5: all C5 and C19 interfaces are consumed unchanged). `ContributionAccess` and `AuthFormState` live in `apps/web/src/server/actions/auth-form.ts`, not in `contracts`. No migration, so no migration number is taken. Verify with `git diff --stat main -- packages/contracts packages/domain packages/application packages/database packages/adapters packages/test-support` (empty). No tests are added there; their existing suites stay green. If the build finds a missing piece in a lower layer, do not add it inside U9: record an `ISS-` row and take the narrower option inside the owned paths, marked `ASSUMPTION(U9): ...`.

**Phase C — web server (API / endpoint)**

- [ ] **Step 5** — Implement `server/actions/auth-form.ts`: the extended `AuthFormState`, `AuthMessage` and `INITIAL_AUTH_STATE` (§ 3.1); `PENDING_EMAIL_COOKIE = 'rk.pending'`, `PENDING_EMAIL_MAX_AGE_SEC = 1800`, `type ContributionAccess`; `safeAuthNext` (BR1.5 steps 1–6, built on `safeNextPath`); `readPendingCookie` (BR2.2); `parseEmailOnly`, `parseSetPassword` (mismatch → `auth.reset.mismatch`, BR5.2), `parseChangePassword`; `rateLimitMessage(retryAfterSec)` (BR4.2). Move `registerRefusal`, `signInRefusal`, `parseRegistration` and `parseSignIn` to the new state shape.
- [ ] **Step 6** — Write and run `server/actions/auth-form.test.ts` (extended): the BR1.5 refusal list (`/sign-in`, `/admin`, `/en/Admin`, `/en/%61dmin`, `/bn/SIGN-IN`, `//x`, `https://evil.example`) and the kept `/en/experiences/abc`; a malformed cookie, a cookie with a bad address and one with a bad `next`; `rateLimitMessage` at 1, 59, 60 and 61 seconds and with no `retryAfterSec`; each parser's refusals; no submitted value in any returned state (BR1.2, BR10.1).
- [ ] **Step 7** — Implement `server/actions/auth.ts`: change `register` (set `rk.pending`, redirect to `/{chosenLocale}/verify-email[?next]`, never sign in, BR2.1) and `signIn` (BR4.1–BR4.4, default `/{accountLocale}/me`); extend `signOut` to delete `rk.pending`; add `confirmEmail`, `resendLink`, `resendOwnLink`, `requestReset`, `setNewPassword`, `changePasswordForm` and `signOutEverywhereForm` per § 3.2. Cookie attributes: HttpOnly, SameSite=Lax, Secure on https, Path=/, 30 minutes. `internal` results are logged through the logger port with `code` and `correlationId` only. Implement `getContributionAccess()` in `server/actions/account.ts` (BR8.1, fail closed).
- [ ] **Step 8** — Write and run the action tests in `server/actions/auth.test.ts` (extended) and a new `server/actions/account-access.test.ts`: each action's `ok` and each refusal mapping; register sets the identical cookie and redirect for a new and an existing address; mismatched passwords skip the command; sign out everywhere does nothing without `confirm=yes`; `rk.pending` deleted by sign-in, confirm, sign-out and sign-out everywhere; `getContributionAccess` for anonymous, `pending_verification`, `active` verified, `suspended` and `restricted`. Then write and run the integration test `server/auth-screens.int.test.ts` (`web-int`, against the assigned test database and Mailpit): register → Mailpit token → `confirmEmail` → `getContributionAccess() === 'allowed'`, called the way a server component calls it, proving the request's cookies are kept (design § 10 risk 1).

**Phase D — i18n and UI (frontend behaviour)**

- [ ] **Step 9** — Add the new keys of `frontend-components.md` § 5 to `packages/i18n/messages/en.json` and `bn.json` in the same commit, and change the values of `errors.auth.rateLimited` and `errors.auth.accountSuspended` (U9's own keys; only `auth.ts` uses them). The Bengali copy is flagged for the owner's copy review at U50 (FD-042). Regenerate `packages/i18n/src/keys.ts` with its script, never by hand, and again after every rebase. Run `timeout 300 pnpm i18n:check`.
- [ ] **Step 10** — Implement the components and pages:
  - in `components/patient/auth/`: extend `AuthFields.tsx` (`PasswordField`, Show/Hide after hydration, Q8), `use-auth-form.ts`, `RegisterForm.tsx`, `SignInForm.tsx`, `AccountControl.tsx` (grapheme-safe initials, `data-verified`, Security and Confirm links); add `JoinSteps`, `PendingPanel`, `ResendLinkForm`, `ResendOwnButton`, `ConfirmEmailForm` (`history.replaceState` drops `?token=`), `VerifyDone`, `ResetRequestForm`, `SetPasswordForm`, `SecuritySettings`, `ChangePasswordForm`, `SessionList`, `SignOutEverywhere`, `AuthNotice` and `ContributionGate` (C16 props `{purpose, returnTo}` frozen, fail closed, BR8.2, BR8.3);
  - pages `register/`, `sign-in/`, `verify-email/`, `reset-password/`, `me/security/`: noindex on all, `referrer: no-referrer` on the two token pages (BR1.4), signed-in redirect on register and sign-in (BR1.6), `requireAccount({returnTo: '/me/security'})` and the two parallel queries on the security page (BR6.1–BR6.5);
  - `Masthead.tsx` account entry only (`unconfirmed: status === 'pending_verification'`, BR7.2) and one `Link` to `/me/security` in `profile/ProfileWorkspace.tsx`;
  - `.join-steps` and `.session-table` in U9's section of `apps/web/src/styles/patient.css`, each marked `/* added: U9 T-102 reason */`, on T-011 tokens, no motion of its own (BR9.1–BR9.3).
  Components import only server actions and `@/server/actions/auth-form` under `server/` (FD-093).
- [ ] **Step 11** — Write and run the UI tests: every new component rendered in `en` and `bn`; `AccountControl` unconfirmed with Bengali initials; `ContributionGate` in all four access states and both purposes, `returnTo` sanitised, and fail-closed when the query throws (mock `@/server/actions/account`); the page tests in U9's own files: `register/page.test.tsx`, `sign-in/auth-pages.test.tsx` (extended), `verify-email/page.test.tsx`, `reset-password/page.test.tsx`, `me/security/page.test.tsx` (noindex, referrer, one `h1`, the signed-out redirect, the four `/verify-email` panels, `confirmed=1` typed by hand without a verified actor). Then run `apps/web/src/app/pages.test.tsx`: if one of its rows asserts a placeholder that U9 replaces (`/verify-email`, `/reset-password`, `/me/security`), change only that row and record the edit in this step's note.
- [ ] **Step 12** — Smoke: add `apps/web/src/components/patient/auth/auth-screens.smoke.test.tsx` with at least one assertion for the pending screen and one for the gate (signed-out prompt). Run `timeout 600 pnpm smoke`; the suite only grows.

**Phase E — gate, adversarial tests, sign-off and records**

- [ ] **Step 13** — Gate: `timeout 1200 pnpm check` (includes contrast, `contrast:patient` and `check:motion`) and `timeout 600 pnpm smoke`, both green, plus `timeout 600 pnpm test:int`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. `apps/web` stays at or above 80% lines (never lowered, D10). Run the T-102 acceptance rows (design § 9) and record expected against observed for Build and Test.
- [ ] **Step 14** — Adversarial tests (high-risk Unit: auth, team practice step 5). A separate agent, not the one that wrote the code, writes and runs 3–5 tests from `functional-spec.md` § 7, which also execute the T-106 auth rows: (1) register and resend give byte-identical results for a new, an unconfirmed and a confirmed address (status, `Set-Cookie` names and attributes, redirect target, page text); (2) a used or expired reset token leaves the password unchanged; (3) signed out, `/me/security` returns no session data; (4) an unconfirmed actor gets `getContributionAccess() !== 'allowed'` and the publish and comment commands refuse it; (5) a GET of `/verify-email?token=` changes no account state and sets no cookie. Files: `server/actions/auth-screens.adversarial.test.ts` and, if needed, `app/[locale]/(patient)/verify-email/verify-email.adversarial.test.ts`. Fix everything they break, add an `ISS-` row per break, and re-run Step 13.
- [ ] **Step 15** — Delegated sign-off. Record a written sign-off in `construction/t-102-patient-auth-screens/code-generation/code-summary.md` under `## Sign-off`, written by the agent and labelled "delegated by the owner on 2026-11-04". It names the adversarial results, the gate counts and any open `ISS-` rows. The owner's FD-053 content review and FD-091 look review of the auth screens are not done here: they move to the U50 release check (Q13) and stay on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.
- [ ] **Step 16** — Records:
  - `docs/implementation/ISSUES.md`: the five findings in `functional-design-questions.md` § "Findings for the ISS register", plus every defect, workaround or `ASSUMPTION(U9)` found in Steps 1–14, each with a severity and `Found in U9 t-102-patient-auth-screens`; close ISS-124, ISS-436 and ISS-440 with `Status` naming U9 when the build fixes them. Take the next free `ISS-` numbers at merge time.
  - the T-102 task file: the changed acceptance rows from design § 9 with `FD-0nn:` labels (FD-074), and the Hand-off.
  - `code-summary.md`, `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`; the bracketed route paths are listed in `code-summary.md` instead, as U8 did).
  - the Build and Test record lists the `ISS-` ids found and fixed in U9.

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
- `apps/web/src/server/auth-screens.int.test.ts` (new test file)

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
