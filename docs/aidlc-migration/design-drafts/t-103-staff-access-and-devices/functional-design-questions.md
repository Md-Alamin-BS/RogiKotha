# Functional Design — questions (U10 `t-103-staff-access-and-devices`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-103-staff-access-and-devices/functional-design/`.

Context:
- Unit U10 (kind `library`, size XL) delivers T-103 (`docs/implementation/tasks/T-103-staff-access-and-devices.md`, with its FD-051 and FD-053 amendments) for stories US3.2 and US11.1. It depends on U8 T-101 and U3 T-010 (`unit-of-work-dependency.md`); U11 T-104, U12 T-105, U13 T-106, U17 T-204, U33 T-404, U35 T-406, U37 T-408, U39 T-410 and U41 T-502 depend on it. It is designed as **high risk** (auth and staff identity), as `team.md` requires, although the Units table marks it "—" (R2).
- Inputs read: `unit-of-work.md` (U10, decision-change table), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `requirements.md` (FR6, FR7, FR100, FR101, FR102), `stories.md` (US3.2 AC3.2.1–AC3.2.5, US11.1 AC11.1.1–AC11.1.6, US11.2 AC11.2.2, AC3.3.5, AC7.3.3, AC7.3.4), `contract-summary.md` (C1, C2, C5, C15, ownership rules, FD-088 revision), `docs/status/decision-log.md` (FD-016, FD-018, FD-020, FD-022, FD-034, FD-035, FD-037, FD-041, FD-051, FD-053, FD-065, FD-071, FD-088, FD-091, FD-092), `01-conventions.md` (§3, §5, §7–§11), `02-data-model.md` (§0, §2, §11, §12, §16), `03-routes-and-contracts.md` (§1–§5), `05-demo-storyboard.md`, `docs/design/auth-screens-spec.md` (§0, §2, §4, §5, §6), `PRODUCT.md` hard rules through `project.md`, `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`, U8's draft (`design-drafts/t-101-better-auth-adapter/`).
- Prototype read: `ui-design-prototype/admin/app.js` (`renderSignin`, `renderApprove`, `renderSecurity`, `renderStaffAccount`, `openStepUp`, the role switcher, the auth click and submit handlers) and `admin/index.html` (masthead controls, auth views).
- Code read as it is on `main` (2026-10-28): `packages/contracts/src/{actor,config-values,errors}.ts`, `schemas/{staff,account}.ts`, `view-models/security.ts`; `packages/database/src/schema/{account,notification}.ts`, `migrations/0000_init.sql`, `0001_grants_part1.sql`, `0005_grants_part2.sql`; `apps/web/src/app/[locale]/admin/{layout,sign-in/page,security/page}.tsx`, `components/admin/Masthead.tsx`, `components/shared/Sheet.tsx`, `proxy.ts`, `styles/admin.css`; `packages/test-support/src/corpus/accounts.ts`, `seed/seed-accounts.ts`; `packages/i18n/messages/{en,bn}.json` (`staff.*`, `email.staff.*`, `errors.auth.*`, `admin.role.*`).
- Open `ISSUES.md` rows in this area: ISS-021, ISS-023, ISS-024, ISS-025 (D-001 prototype assumptions), ISS-034 (security `.kv` columns), ISS-054 (`admin.role.current` removed), ISS-100 (auth screens show console chrome, owner T-103), ISS-108 (S2, audit details are a shallow denylist, owner the Unit that builds `application/audit`).
- Owner answers that bind this design: U8 R1 — the worker holds a separate, mail-only key, so the device-approval recipient is encrypted with that key through `queueEmail` (BR9.1); CR-006 grant rulings (FD-092) — `rk_worker` holds nothing on `staff_devices` or `staff_device_approvals`, and this Unit adds no grant.
- Research (2026-10-28): the Next.js authentication guide says layouts do not re-render on navigation and should not be the auth check; checks go close to the data, and server actions are treated as public endpoints. Better Auth's server-side session creation and password verification on the pinned 1.7.x are confirmed in Code Generation (`functional-spec.md` § 16).

## Settled before this stage

These are decided by FD entries, the contracts or the requirements and are not asked again.

- **Same account system (FD-034).** Staff are ordinary accounts with `staff_role`; three seeded staff accounts; the role switcher is not shipped; device approval is real (FD-035).
- **Capability table (FD-016, FD-022, FD-051, 03 §2, `actor.ts`).** Super Admin fixed in code with all eight; Admin and Moderator fixed sets plus the two toggles, off by default; `retention.bulk` super_admin only.
- **Security boundaries stay out of runtime configuration (FD-018).** Config switches only the four toggles.
- **D-001 review gates this Unit (FD-053).** Recorded before Code Generation (R1).
- **Staff side narrowed (FD-088).** Sign-in, devices, step-up, roles and capabilities are in release 1; retention bulk actions are deferred, but `retention.bulk` stays in the capability table and its FD-051 rows stay.
- **Notification ownership (FD-065, C15).** `account.securityEvent {kind: deviceApproved}` routes to `notification.deliver`; the approval email is queued by the web command with category `device_approval` (C2).
- **Mail recipients (FD-071, FD-041, owner's U8 R1 answer).** Through `email_deliveries.to_email_enc` and the mail-only key.
- **Sessions (U8, FD-057).** 30 days from creation, absolute, for normal and administrative sessions (AC3.2.4).
- **Staff console look (FD-030, FD-091, `project.md` Code Style).** Chart Tray, the verbatim prototype CSS port.

## Settled in this design without a question

These follow from the contracts, the requirements, the project rules or the code. Each is explained in `functional-spec.md` § 13.

- **The capability table stays in `contracts/actor.ts`** (`capabilitiesForRole`, already right on `main`); `resolveCapabilities` in the application only wraps it and replaces U8's stub. C5's name `capabilitiesOf` is recorded as drift (F7).
- **Staff and patient sign-in share one counter per address and per network** (BR4.2), so the staff route is not a second set of guesses.
- **Staff powers need status `active`**, so a pending account (unproven email) cannot receive an approval email for staff trust (BR3.1, BR4.4).
- **Only the newest approval link of a device works, and 3 approval emails per hour per account** (BR5.5, BR5.6); the spec has no resend button.
- **A role change revokes the target's devices** (BR8.3), so a new role starts from a fresh approval.
- **`/admin/security` is guarded**, against the task's step 3 and in line with 03 §1; the auth screens lose the console chrome (closes ISS-100) (BR3.6).
- **The step-up cookie is also bound to the session id** (BR7.1), so signing out ends it; this is stricter than the task's `{accountId, until}` and changes no contract.
- **`requires.stepUp` is checked after the capability**, so an actor without the capability gets `forbidden`, not a password prompt, and `onRefused` still records T-104's reveal attempts (BR7.4).
- **A step-up-gated action's own audit row carries `step_up: true`** (spec §4.4) in addition to the `step_up {purpose}` row (BR7.5, F15).
- **`next` is accepted only for same-origin `/<locale>/admin/` paths** (BR3.5).
- **The approval page sends `Referrer-Policy: no-referrer`** (BR5.11).
- **`RoleChip` is built here** at `components/admin/auth/RoleChip.tsx`; U35 T-406 reuses it (F9).
- **New copy**: `errors.auth.deviceMismatch`, `staff.account.menu` and the `{minutes}` form of `staff.device.body`, Bengali flagged for the owner's review (FD-042 precedent).

## Question 1

How does staff sign-in check the password without giving a session to a non-staff account or an unknown device?

Why this is open: T-103 step 4 asks to validate credentials "without persisting a session yet if possible", and otherwise to revoke the session at once. The acceptance row says a non-staff sign-in leaves no `auth_sessions` row, and AC3.2.5 says no staff session starts before approval. The library's email sign-in creates a session as part of checking the password.

A. **Check the password through the `PasswordHasher` port first** (recommended). The command reads the credential through U8's account repository and verifies it once (a dummy hash for an unknown address, so the work is the same). Only then does it branch: non-staff → `staff.notStaff`, unknown device → device approval, approved device → the library's sign-in creates the session (Question 2). No session row ever exists for the first two branches. The approved branch costs a second Argon2 verify, which only staff who already know the password ever pay.
B. **Call the library's sign-in with U8's `session.create.before` hook refusing the session** unless the device is approved. One verify, but it depends on the library still telling a right password from a wrong one when the hook refuses, which is not documented.
C. **Call the library's sign-in, then revoke the session** for non-staff and unknown devices (the task's fallback). A live session row and token exist for a moment; the "no `auth_sessions` row" check can only be met after the fact.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

How is a staff session created, after sign-in on an approved device and after a device approval?

Why this is open: T-103 step 6 says "complete the pending sign-in by calling the library's session creation for that user; document the exact API used". Better Auth's documented public API creates sessions through email sign-in; direct session creation for a user goes through internal objects that a library upgrade can change.

A. **Use the library's public email sign-in**, with the account's stored email (read through the account repository) and the password the person has just typed (recommended). At approval, that call is also the password recheck, so a wrong password simply fails it and adds a strike. U8's session hook allows it only inside `staff.signIn` and `staff.approveDevice`, after they have decided. If the spike shows the pinned version cannot be called this way, fall back to B and record why.
B. **Use the library's internal session creation for a known user.** One Argon2 verify fewer on the approved path; ties the code to internals (against AD-4's "authentication is an adapter").
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Where is device trust enforced?

Why this is open: T-103 step 3 puts the device check in the console layout, and U8's `getActor` resolves capabilities from the role alone. A staff member can also sign in on the patient route (same accounts); that session then reaches staff server actions directly, because a layout does not protect server actions and does not re-run on client navigation (Next.js authentication guide). With a stolen password and no device approval, an attacker could act as staff.

A. **In `getActor`: the Actor gets `staffRole` and `capabilities` only when the account is active, has a role and the request carries an approved device for that account** (recommended). Every command, query and route handler that checks `requires.staffRole` or `requires.capability` is then protected by construction, in all later Units. A staff account signed in on the patient route from an unapproved device is an ordinary account. The console layout keeps a redirect helper (`getStaffContext`) for the screens only.
B. **Keep the role and capabilities in the Actor and check the device only in the console layout**, as the task text says. Server actions stay reachable without an approved device unless every later Unit adds its own device check.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Must the approval link be opened in the browser that asked for it?

Why this is open: T-103 step 6 approves the device named in the token from whichever browser opens the link. If an attacker signs in with a stolen password, the real staff member receives the email; if they open it on their own laptop and enter their password, the attacker's browser becomes trusted. The email and screen copy already say "open this link on that device".

A. **Yes: the approval works only when the browser carries the `rk_staff_device` cookie the token was issued for** (recommended). Another browser gets `auth.device_mismatch` ("Open this link on the device you signed in from."), before any password check and without a strike. The cookie is `SameSite=Lax`, so it is sent when the link is opened from the mail client. One new error code (03 §2 first) and its copy in both languages.
B. **No: any browser can approve**, as the task text says. Simpler, but the attack above stays open.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

Proposed copy (Bengali for the owner's review): `errors.auth.deviceMismatch` — en "Open this link on the device you signed in from." / bn "যে ডিভাইস থেকে সাইন ইন করেছিলেন, সেই ডিভাইসেই এই লিংকটি খুলুন।"

## Question 5

Where are the three wrong-password strikes per approval token kept, and how is a device found quickly?

Why this is open: the task invalidates a token after three wrong passwords, but `staff_device_approvals` has no counter, and `staff_devices` has no index on `(account_id, device_hash)`, which every staff request reads.

A. **One forward-only migration**: `staff_device_approvals.failed_attempts smallint not null default 0`, and a unique index on `staff_devices (account_id, device_hash) where revoked_at is null` (recommended). The strikes survive a restart; one open row per account and browser; no grant changes (the worker has nothing on these tables).
B. **Keep the strikes in the in-memory limiter**, keyed by the token hash. No migration for the counter, but a restart resets the strikes; the lookup still needs the index.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

How are the "security notification" rows of an approved device written?

Why this is open: T-103 step 6 says "`staff_notifications` kind `security` + user notification `security`", and an acceptance row checks "audit + notifications rows". FD-065 makes the Notification module the owner of those tables, and C15 already names `account.securityEvent {kind: deviceApproved}`, which U34 T-405's `notification.deliver` turns into notices.

A. **Append `account.securityEvent {accountId, kind: deviceApproved}`** in the approval transaction and write no notification row here (recommended). U34 creates the notices; until it lands, the acceptance row reads "audit row + outbox row" (ISS row F12).
B. **Insert one `staff_notifications` and one `notifications` row directly**, as the task says. Writes another module's tables and makes U34 skip this event to avoid a duplicate.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

What does `account.stepUp` record, and what does its input carry?

Why this is open: T-103 step 8 audits `step_up` with `details: {purpose}`, but `StepUpInput` is `{password}` only. AC11.1.2 says a wrong or missing password "leaves the setting unchanged with the failed attempt recorded". Audit details may hold ids and enums only (01-conventions §5).

A. **`StepUpInput` gains a required `purpose` from a closed list** (`config.apply`, `config.rollback`, `identity.reveal`, `evidence.original`, `moderation.enforce`, `staff.setRole`, `retention.bulk`, `account.delete`), **and every attempt is audited**: `step_up {purpose}` on success, `step_up_failed {purpose}` on a wrong password; 5 failures per 15 minutes per account (03 §4) (recommended). No caller exists yet, so the input change breaks nothing.
B. **Keep `{password}` and audit successes only.** Failed rechecks leave no record, which AC11.1.2 asks for.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

Is `staff.setStaffRole` built in this release?

Why this is open: C5 and 03 §4 list it as U10's, "seed only for the demo plus the config route". The seed sets roles directly, and U37 T-408's config view has no role control, so nothing calls it in release 1. FD-088 keeps "roles" in the release. The owner asked for the narrowest staff side the release needs.

A. **Build the command with no UI** (recommended): Super Admin plus step-up, no change to one's own role, active targets only, a role change revokes the target's devices, audited with before and after values. About an hour of work with tests; the contract is met and a later UI only adds a screen.
B. **Defer it**: C5 marks it as after release 1 and roles stay seed-only. Saves the hour; a later Unit adds the command and its tests.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

Does "Sign out everywhere" need a step-up now that `account.stepUp` exists?

Why this is open: `auth-screens-spec.md` §3.6 asks for the password inline before Sign out everywhere. U8's draft (its Question 10, answer A, already in the owner's queue) left it without step-up and raised it for U9 and U10. Signing out everywhere is a protective action: the only harm an attacker can do with it is to sign the holder out, while a password prompt slows down a holder who suspects misuse.

A. **No step-up** (recommended), consistent with U8's answer; the spec line is recorded as changed in this Unit's reference-document corrections.
B. **Add `requires.stepUp`** to `account.signOutEverywhere` and send U9's button through `withStepUp`, as the spec says.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

The pending screen and the approval email write "30" / "৩০" into the string. The spec (§5) says Bengali numerals come from the formatter, and T-103's checklist says the 30-minute digits come from the formatter. What changes?

Why this is open: the screen can pass a number to the formatter; the email is rendered by the worker from `{link}` only (U8 BR6.2), and adding a param changes the allowlist on both sides.

A. **The screen string becomes `{minutes}` rendered with `formatNumber`; the email keeps its literal digits**, which already follow each language, with an S4 ISS row for U34 T-405 if a param is wanted later (recommended).
B. **Both use `{minutes}`**: `email.staff.deviceApproval` params become `{link, minutes}`, formatted per locale in the worker; the allowlist changes in `queue-email.ts` and `mail-send.ts`.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

Neither question below changes a hard rule or a data boundary, but each is the owner's to answer, so neither is decided here. Details are in `functional-spec.md` § 9.

- **R1 — FD-053 gate.** The owner's approval of the D-001 auth-screen review (both languages, both themes, 360 px) is not recorded yet; it is listed as waiting in `OWNER-REVIEW-QUEUE.md`. That queue row says "on the new look"; for the staff screens the look stays Chart Tray (FD-091), so the review covers the existing `ui-design-prototype/admin/` screens. Code Generation does not start until the approval and its date are in this Unit's record.
- **R2 — Risk class.** `unit-of-work.md` marks U10 not high-risk, while `team.md` puts every auth Unit in the high-risk class. This design follows `team.md`: collaborators on, 3–5 adversarial tests by a separate agent, the owner's written sign-off. Suggested: confirm, and correct the Units table at the next Units revision.
