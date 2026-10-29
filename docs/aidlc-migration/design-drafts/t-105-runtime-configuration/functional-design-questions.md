# Functional Design — questions (U12 `t-105-runtime-configuration`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-105-runtime-configuration/functional-design/`.

Context:
- Unit U12 (kind `library`, size M, not high risk in `unit-of-work.md`) delivers T-105 (`docs/implementation/tasks/T-105-runtime-configuration.md`, with its FD-063, FD-068, FD-072, FD-082 and FD-083 amendments and the C1 sign-in ranges) for story US11.1. It depends on U10 T-103 and U3 T-010 (`unit-of-work-dependency.md`), and through U10 on U8 T-101. U13 T-106, U17 T-204, U21 T-301, U29 T-309, U30 T-401, U32 T-403, U33 T-404 and U37 T-408 depend on it. It has no screens: the configuration view is U37 T-408, so this draft has no `frontend-components.md`.
- Inputs read: `unit-of-work.md` (U12, the open-point and documentation tables), `unit-of-work-dependency.md`, `unit-of-work-story-map.md` (US11.1 → U10, U12, U13, U37), `requirements.md` (FR38, FR45, FR47, FR75, FR100, FR101, FR102), `stories.md` (US11.1 AC11.1.1–AC11.1.6, AC3.1.5, AC4.3.5, AC6.4.2, AC9.1.4, AC9.1.6), `contract-summary.md` (C1, C3 `retention.setPolicy`, C5, C15, the ownership rules and the task-file amendments), `docs/status/decision-log.md` (FD-009, FD-016, FD-017, FD-018, FD-020, FD-022, FD-035, FD-058, FD-063, FD-065, FD-067, FD-068, FD-072, FD-082, FD-083, FD-088, FD-093), `01-conventions.md` (§2, §3, §4, §5, §6, §10), `02-data-model.md` (§0, §10, §11, §15, §16), `03-routes-and-contracts.md` (§1, §2, §3, §4 "administration", §5), `05-demo-storyboard.md` (seeded accounts, steps 1 and 24), `PRODUCT.md` hard rules through `project.md`, `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`, T-408's task file (the consumer of every command here), and the drafts of U8 (`design-drafts/t-101-better-auth-adapter/`), U10 (`t-103-staff-access-and-devices/`), U14 (`t-201-…`), U15 (`t-202-…`) and U16 (`t-203-…`), which read configuration.
- Prototype read: `ui-design-prototype/admin/app.js` `loadConfig`, `saveConfig`, `renderConfig` (the role × capability matrix and the step-up on every change), `shared/rogikotha-data.js` (`config.limitedDataThreshold`, `config.emergency`, `moderation.thresholds`, `moderation.permissions`, the `emergency.body` and `compose.safetyEmergFix` strings), `concepts/concept-04b-quiet-clinic-minimal/app.js` (where `emergency.body` is rendered: the Discover emergency panel, the profile, the emergency page).
- Code read on the working tree (branch `bolt/t-010-boundary-lint-and-ci`, 2026-10-28): `packages/contracts/src/{config-values,config-values.test,errors,enums}.ts`, `schemas/administration.ts`, `view-models/config.ts`; `packages/database/src/schema/administration.ts`, `repositories/config.ts` (stubs that throw `NotImplemented('T-105')`), `migrations/0000_init.sql`, `0001_grants_part1.sql` (`rk_worker` SELECT on `config_versions`), `0003_triggers.sql`; `packages/test-support/src/{seed/seed-config.ts, corpus/config.ts, builders/config.ts, fakes/config-provider.ts}`; `apps/web/src/app/[locale]/(patient)/emergency/{page,page.parity.test}.tsx`, `components/patient/Emergency.tsx`, `next.config.ts`; `packages/i18n/messages/{en,bn}.json` (`admin.config.*`, `errors.config.*`, `errors.common.*`, `emergency.*`, `emergview.*`, `compose.safetyEmergFix`). `packages/application` is still empty (U8 builds `defineCommand` and the ports).
- Open `ISSUES.md` rows in this area: ISS-079 (S3, the always-enabled report reasons are not encoded; owner "T-003 or T-408"), ISS-171 (S4, the emergency page reads the static default; owner T-105), ISS-134 (closed in CR-005, remaining gap is T-105's), ISS-108 (S2, audit details are a shallow denylist; owner the Unit that builds `application/audit`), ISS-050 (S4, `admin.config.*` copy awaits the owner's bilingual review), ISS-090 (S4, the audit `target_kind` enum has no `config` value). U8's draft finding F3 (proposed, not yet a row): `severeFailures` up to 100 can never fire under the fixed per-email limit of 10.
- Owner answers that bind this design: the T-202 draft answer "counts with denominators only, no percentages" (no effect on configuration values); the U8 R2 answer "FR90 feedback is text only in this release" (so no feedback-category setting is needed here); FD-088 (the staff side is only what the release needs; the configuration view is in release 1); this Unit's R1 (narrow release-1 settings) and R2 (limited-data threshold 2–50), both 2026-10-29; the approval of U10's staff screens (2026-10-29), so U10, which this Unit depends on, is not held back.
- Library behaviour this design relies on (from the libraries' documented behaviour as known when this draft was written; not re-checked online for this draft, so Code Generation confirms it on the pinned versions and logs the check): Next.js 16 renders a server component at build time unless it reads request data or calls `connection()` from `next/server`, so a page that reads the database must opt into request-time rendering; zod 4 `.strict()` reports unknown keys as one `unrecognized_keys` issue with the key names, and range failures as `too_small` / `too_big`, which is what the mapping in `parseConfigValues` (BR2.3, Question 11) relies on.
- Refreshed 2026-10-29. Re-read:
  - T-010 as merged on `main` (`14c21a9`): `eslint.boundaries.mjs` (`application` has no external edge, type imports included), `01-conventions.md` §2, FD-093, `vitest.workspace.ts`, `.github/workflows/check.yml`, `packages/database/src/repositories/{config.ts, not-implemented.test.ts}` (ISS-294), `migrations.int.test.ts`, `validator-probes.int.test.ts`, `packages/test-support/src/fakes/{repositories-superset.test.ts, port-fakes.test.ts}`;
  - the refreshed T-101 draft (`defineCommand` with `onRefused` for every refusal after `authenticated` and the `recorded` error, the asynchronous `ConfigProvider` and `StaticConfigProvider`, the `signIn` block with ranges 1–9 and 2–10, the opaque `Tx`, ISS-108 closed; its proposed FD rows are referred to by content, because FD-094 in the decision log is now the owner's D13 change);
  - the T-103 draft refreshed the same day (`rk_stepup`, `STEP_UP_PURPOSES`, `resolveCapabilities` behind the device gate);
  - the refreshed T-201 draft (limited data 2–50) and the T-106 draft (its F25: a missing step-up on `config.apply` must be recorded, AC11.1.2);
  - `OWNER-REVIEW-QUEUE.md`: R1 and R2 answered by the owner (2026-10-29), the owner's approval of U10's staff screens (2026-10-29), and the no-questions instruction of 2026-10-29.
  - New Questions 11–13 follow from those; they were decided by the agent under the owner's no-questions instruction of 2026-10-29.

## Settled before this stage

These are decided by FD entries, the contracts or the requirements and are not asked again.

- **Configuration is versioned, bounded data (AD-10, FD-018).** Every value has a range, unknown keys are rejected, a rollback is a new version, structural security and data boundaries stay out of configuration.
- **Retention periods are not configuration (FD-068, FD-082).** `ConfigValues` loses its `retention` block and moves to schema version 2; `retention_policies` (Retention, U29) is the only source; the staff console shows the periods from `retention.currentPolicy`.
- **`config.applied` stays an outbox event (FD-083).** Appended through `ConfigEventSink`, declared in `modules/administration` and implemented in `modules/notification`; both built here; it routes to no job.
- **The sign-in settings are runtime settings (FD-058, FD-063, FD-072).** U8 adds the `signIn` block with the owner's defaults and reads it through `ConfigProvider`; this Unit takes the block over, sets its final ranges (Question 1) and replaces U8's defaults-only provider.
- **Capabilities (FD-016, FD-022, FD-051, U10).** Super Admin is fixed in code; configuration switches only the four Admin and Moderator toggles, off by default; U10's `capabilitiesForRole` reads them, and only behind its approved-device gate.
- **U8's command helper and port (refreshed T-101 draft).** `defineCommand` runs a declared `onRefused` for every refusal after `authenticated`, in its own committed transaction, and commits a handler `err` only when it is marked `recorded`. `ConfigProvider.current()` returns a Promise. The application holds an opaque `Tx` and imports no external package (FD-093).
- **Release-1 settings and the limited-data range (the owner's R1 and R2, 2026-10-29).** Only the seven blocks `ConfigValues` holds; `limitedDataThreshold` 2–50. Each is recorded by an FD row this Unit appends (`functional-spec.md` § 8.1).
- **Who may change what (C1, 03 §1, AC11.1.6).** Reading is for any staff role; `config.propose`, `config.apply` and `config.rollback` need `config.write`, which only Super Admin holds; apply and rollback also need a step-up (U10, purposes `config.apply` and `config.rollback`).
- **Two-person concurrency is optimistic (T-105 threat 4).** `expectedVersion` on apply.
- **No UI here.** The configuration view, its diff sheet and its history list are U37 T-408 (FD-088 keeps them in release 1).

## Settled in this design without a question

These follow from the contracts, the requirements, the project rules or the code. Each is explained in `functional-spec.md` § 11.

- **Every apply and rollback needs a step-up**, not only "sensitive" ones (AC11.1.2 names roles, permissions and retention; the prototype opens the step-up on every change). One rule, no list of sensitive keys to keep current.
- **An apply or rollback that changes nothing is refused** with `validation` and the message `errors.config.noChange`, so the history holds no empty versions (BR2.5, BR7.3).
- **`reportReasons` is a set**: duplicates are dropped and the list is stored in the order of `REPORT_REASONS`, so reordering is not a change (BR1.4).
- **History shows the actor as staff username and current role**, never the account id (03 §2 privacy rule); a deleted actor reads "Deleted account" (BR5.2).
- **The staff `config.current` query reads the database without the cache**, so the version the editor sends as `expectedVersion` is never 5 seconds stale; every other module reads the cached `ConfigProvider` (BR5.1, BR4.3).
- **The provider never throws to its callers**: a read failure or a stored version that fails the schema keeps the last good values, or the defaults when there are none, and logs it. The defaults are the safe side: every capability toggle is off (BR4.5).
- **The emergency page reads the live numbers at request time** and closes ISS-171 (BR9.3).
- **The worker is not wired to the database provider here**; the first worker job that reads configuration wires it (`rk_worker` already has SELECT on `config_versions`) (BR9.4).
- **File names follow `01-conventions.md` §2 naming** (`queries/get-current-config.ts`, `queries/get-config-history.ts`, `queries/propose-config.ts`, `commands/apply-config.ts`, `commands/rollback-config.ts`) rather than the task's `config-current.ts` list; the server actions live in `apps/web/src/server/actions/config.ts`, which T-408 reuses instead of creating `admin-config.ts` with the same three actions (finding F9).
- **New copy**: nine `errors.config.*` message keys, in both languages, Bengali flagged for the owner's review (FD-042 precedent). No new error code.

## Question 1

The sign-in settings' ranges allow values that can never take effect. What are the final ranges?

Why this is open: C1 lets `severeFailures` go up to 100 and `delayAfterFailures` up to 20, but C5 fixes the per-email limit at 10 failures in 15 minutes: after the 10th failure every attempt is refused without a password check and counts as nothing (U8 BR3.2, BR3.5). A severe threshold above 10 never fires, and a delay that starts after the 10th failure never starts. T-105's own acceptance row "apply the severe threshold 10→12, then 12 failed sign-ins … the notice fires at the 12th" cannot pass (finding F1, S2). U8's draft raised the same point for this Unit (its F3).

A. **Narrow the two ranges so every allowed value works** (recommended): `severeFailures` 2–10 and above `delayAfterFailures`; `delayAfterFailures` 1–9. `windowMinutes`, `firstDelaySeconds` and `maxDelaySeconds` keep their C1 ranges. The acceptance row becomes "apply the severe threshold 10→8, then 8 failed sign-ins: the notice fires at the 8th, not the 10th". The owner's defaults (3, 15, 1, 30, 10) are unchanged; C1's range line is corrected in Code Generation.
B. **Let the fixed per-email limit follow the setting** (`max(10, severeFailures)`), as the original row assumes. Raising the severe threshold then also loosens the brute-force limit, and C5's fixed number changes.
C. **Keep the C1 ranges** and rewrite the row only. Values 11–100 are accepted and silently do nothing, which an operator cannot tell from the screen.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

Is `ConfigProvider.current()` synchronous or asynchronous?

Why this is open: 03 §3 writes `current() → ConfigValues`, the test fake `StaticConfigProvider` returns a plain value, and the U8, U10, U14, U15 and U16 drafts all call `current().<key>` without `await`. A provider that reads the database with a 5-second cache has to wait for the database on its first read and after every expiry. U8 creates the port interface, so its shape is fixed before this Unit starts.

A. **Asynchronous: `current(): Promise<ConfigValues>`**, defined that way by U8 when it creates the port (recommended). Callers `await` it; `StaticConfigProvider` returns a resolved promise; U8's defaults-only provider does the same. No caller ever sees a value that was never loaded. The U8, U10, U14, U15 and U16 drafts add `await` when they are finalised (finding F5).
B. **Synchronous, on a snapshot the provider refreshes in the background.** No caller changes, but the first read in a fresh process returns the defaults until the first load finishes (for example a limited-data threshold of 5 when the database says 3), and a refresh failure is invisible.
C. **A per-request snapshot**: the command context and the page helper load the configuration once per request and hand it on; `current()` stays synchronous inside a request. Every entry point (commands, pages, route handlers, worker jobs) must remember to load it first.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

What do `config.propose` and `config.apply` receive: the whole configuration or only the changed keys?

Why this is open: `ProposeConfigInput` is `ConfigValuesSchema.partial()` with `TODO(T-408)` (shallow or deep partial), and `ApplyConfigInput` is the full schema. Both parse the values at the input boundary, so an unknown key such as `auth: {mfa: true}` is refused by the input parser as `validation`, while the acceptance rows expect `config.invariant` (finding F7).

A. **The whole candidate configuration for both, received as a plain JSON object and validated inside the command** (recommended). The editor holds the current values plus its edits and sends all of them; the command checks the denylist, the strict schema and the cross-field rules and maps each failure to its own code (BR2.1–BR2.3). Propose and apply see exactly the same input, so the preview shows exactly what apply will write. An import (Question 10) is the same call.
B. **A deep partial merged onto the current values.** Smaller payloads, but arrays (`reportReasons`) need a merge rule, a removed key cannot be expressed, and a concurrent change can be merged in silently between propose and apply.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Which report reasons can never be turned off?

Why this is open: `02-data-model.md` §11 and T-105 step 1 say `privacy`, `threat`, `unsafeFile`, `dangerous` and `other`; T-408 step 3 says `factual` and the three critical reasons (`privacy`, `threat`, `unsafeFile`). ISS-079 notes that neither list is encoded. The critical three hide content on the first credible report (FD-017, AC9.1.6), and `dangerous` is the unsafe-advice reason FD-009 and FD-017 rely on instead of a classifier; `factual` does not count towards the five-account hide (AC9.1.4).

A. **`privacy`, `threat`, `unsafeFile`, `dangerous`, `other`**, as the data model and T-105 say (recommended). Exported as `ALWAYS_ENABLED_REPORT_REASONS` beside `CRITICAL_REPORT_REASONS`, enforced by the schema (closes ISS-079); T-408 step 3 is corrected to render these five pressed and disabled (finding F4).
B. **The union of both lists** (the five plus `factual`). Factual disputes can then never be switched off either; a Super Admin keeps fewer choices.
C. **T-408's list** (`factual` and the three critical reasons). `dangerous` could then be switched off, which removes the only route dangerous advice has to a moderator (FD-009).
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

Two strings write the emergency numbers into the copy, while the numbers themselves are editable settings. What changes?

Why this is open: `emergency.body` reads "Call 999 for an ambulance … call 16263" and `compose.safetyEmergFix` reads "call 999", in both languages. T-105's checklist says the emergency numbers are editable, and the call buttons use the configured numbers. After a Super Admin changes the ambulance number, the same panel would show two different numbers to someone in an emergency (finding F2, S2). Neither string is rendered by the app yet (`emergency.body` is used by the prototype's emergency panels, which U15 T-202 and T-207 port; `compose.safetyEmergFix` by U26 T-306).

A. **Give both strings number parameters** (recommended): `emergency.body` takes `{ambulance}` and `{healthLine}`, `compose.safetyEmergFix` takes `{ambulance}`; the caller passes the configured numbers through `formatDigits` for the active language. With the default numbers the text reads exactly as today in both languages. The two consumers' drafts pass the parameters.
B. **Make the three numbers fixed**: drop them from configuration and keep only `lastVerified` editable. The copy stays as it is, but FR100's "emergency contacts" are no longer configurable.
C. **Leave the copy as it is.** The numbers can disagree on one screen.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

Proposed copy (Bengali for the owner's review):
- `emergency.body` — en "Call {ambulance} for an ambulance or go to the nearest emergency department. For non-emergency health guidance call {healthLine}." / bn "অ্যাম্বুলেন্সের জন্য {ambulance}-এ কল করুন অথবা নিকটতম জরুরি বিভাগে যান। জরুরি নয় এমন স্বাস্থ্য পরামর্শের জন্য {healthLine}।"
- `compose.safetyEmergFix` — en "If this is happening now, call {ambulance}. You can still publish — this does not block you." / bn "এটি এখন ঘটে থাকলে {ambulance}-এ কল করুন। আপনি প্রকাশ করতে পারবেন — এটি আটকায় না।"

## Question 6

What does "last verified" have to say when an emergency number changes?

Why this is open: the hard rule shows the emergency numbers with their last-verified date, and T-105's checklist requires `lastVerified`. The schema only checks the `YYYY-MM-DD` shape, which accepts `2026-02-31` and dates in the future, and nothing ties the date to a change of number. A changed number shown as "last verified" on an old date tells the reader something untrue.

A. **When any of the three numbers changes, `lastVerified` must change in the same version, and it may never be later than today** (Asia/Dhaka calendar date from the `Clock` port) (recommended). It must also be a real calendar date. A change of number with the old date is refused with `config.invariant` and the field message `errors.config.lastVerifiedRequired`; a future date with `config.out_of_range` and `errors.config.dateInFuture`. A rollback restores numbers and date together, so it passes.
B. **Only "a real date, not in the future".** A number can change while the date stays old.
C. **Only the `YYYY-MM-DD` shape**, as today.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

How are the stored version-1 rows migrated, and is the history protected in the database?

Why this is open: FD-082 says "stored versions are migrated by stripping the block". The seed (T-007) already writes version 1 with `schema_version 1` and a `retention` block into every development database. The acceptance rows also need a version-1 value with a `retention` block to be read and rolled back correctly, which a freshly migrated test database never contains unless a test inserts one. T-105's threat 6 says the history is append-only, but `config_versions` and `config_changes` are not among the tables `fn_block_mutation()` protects (`02-data-model.md` §10).

A. **Both, then lock the history** (recommended): one forward-only migration strips `retention` from every stored row and sets `schema_version` to 2, then attaches the existing `fn_block_mutation()` trigger (`BEFORE UPDATE OR DELETE`) to `config_versions` and `config_changes`; the read path also upgrades any version-1 value it meets (a pure function, so the rollback acceptance row works and an older export can be imported). No grant changes. `02-data-model.md` §10 lists the two tables.
B. **Read-time upgrade only**: no SQL change and no trigger. The `retention` numbers stay in the old rows (the values stored twice that FD-068 removes), and the history stays editable by any role that can update the table.
C. **Migration only, no read-time upgrade.** The rollback acceptance row has no stored version-1 value to work on in tests, and an older export cannot be imported.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

Is a refused configuration change recorded?

Why this is open: FR102 says every administrative configuration change records "actor, timestamp, previous value, new value and result"; AC11.1.3 is about attempts to switch a security boundary off. A refused apply rolls its transaction back, so nothing would remain. A refusal before authorization (`forbidden`, `auth.step_up_required`) must leave nothing written (AC11.1.6, the "Apply without step-up" row), and a failed password recheck is already recorded by U10 (`step_up_failed`).

A. **Record refusals that happen after authorization and step-up** (recommended): when a Super Admin with a valid step-up is refused (`config.invariant`, `config.out_of_range`, `validation`, `conflict`, `not_found`), the command's `onRefused` writes one audit row `config_rejected {operation, code, paths, unknownKeyCount}` on the `config` stream in its own transaction. `paths` holds known setting paths only; unknown key names are counted, never written, because they are free text. Refusals before authorization write nothing here.
B. **Record nothing for refusals.** The result of a change is then only visible when it succeeded; an attempt to send `auth.*` or `audit.*` keys leaves no trace.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change). Refreshed 2026-10-29: how the record is written is Question 13. U8's `onRefused` runs for every refusal after sign-in, so refusals after the step-up are written by the handler with `recorded: true`. AC11.1.2 also asks that a missing password leave "the failed attempt recorded" (T-106 F25), so a missing or stale step-up is recorded too, with `step_up: false`; `forbidden` still writes nothing (AC11.1.6).

## Question 9

Which version is the current one?

Why this is open: `02-data-model.md` §11 says "the highest `version` with `effective_from <= now()`", and T-105 asks for an integration test that a future `effective_from` is ignored until due. No command lets anyone schedule a change: apply and rollback always write `effective_from = now`. The `Clock` port adds the demo clock's offset (FD-035, `02-data-model.md` §15), and `/api/demo/clock` can move that offset back. A version applied while the demo clock was ahead would then have a future `effective_from` and disappear, while `expectedVersion` still counts it.

A. **The highest version is current; `effective_from` records when it was applied** (Clock port, as `01-conventions.md` §4 asks) (recommended). No scheduled versions exist, so nothing needs to wait; moving the demo clock never hides a version. `02-data-model.md` §11 and T-105's integration row are corrected; scheduling, if ever wanted, comes with a command that sets a future date and its own rule.
B. **As the data model says, with the Clock port.** Moving the demo clock back hides newer versions until the clock catches up.
C. **As the data model says, with the database's own time** instead of the Clock port, against `01-conventions.md` §4.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

How are export and import of settings (FR101, AC11.1.4) delivered?

Why this is open: AC11.1.4 asks that a super admin can restore a prior value (rollback) "or export and then import the settings", with the import applied as a new logged version. No task builds export or import; T-408 has no button for either.

A. **No new command** (recommended). Export is the staff `config.current` result `{schemaVersion, version, values}` saved as a JSON file; import is `config.apply` with the file's `values`, so it is validated, needs the reason and the step-up, and creates a new version like any change. Version-1 files are upgraded on the way in (Question 7). This Unit tests the round trip (export → import → no change refused; edited export → new version); T-408 adds the two buttons to the configuration view (finding F8).
B. **Dedicated `config.export` and `config.import` commands** with their own audit actions. More code for the same checks.
C. **Defer export and import** after release 1, with an FD entry narrowing FR101 and AC11.1.4 (the owner's decision).
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11 — added in the 2026-10-29 refresh

Where are the zod issues turned into configuration error codes?

Why this is open: T-010's boundary rules give `application` no external edge, type imports included (FD-093). The first draft's `validateCandidate` mapped zod issue codes (`unrecognized_keys`, `too_small`) inside the application, which needs `zod` there and turns `pnpm lint` red (F13, S1 if built).

A. **`contracts` exports a zod-free `parseConfigValues(raw)`** (recommended): `{ok: true, values}` or `{ok: false, findings: [{path, code, messageKey}], unknownKeyCount}`, with `code` in `config.invariant`, `config.out_of_range`, `validation`. Every zod type stays in `contracts`, beside the schema it maps; the application adds the policy findings (denylist, always-enabled reasons, `lastVerified`) and picks the most serious code. Unknown key names are counted, never returned.
B. **The application types zod's issues structurally** without importing zod. It compiles, but it ties the application to zod's internal issue shape, which changes between versions.
C. **Validation moves to the web tier**, which may import zod. The rules then split across two layers, and the commands trust their callers.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 12 — added in the 2026-10-29 refresh

What happens to a stored or imported version-1 value that has no `signIn` block?

Why this is open: U8 adds `signIn` to `ConfigValues` with FD-063's defaults. Version-1 rows seeded before U8 have no `signIn` block, while rows seeded after it do (the seed spreads `DEFAULT_CONFIG_VALUES`). The first draft's upgrade only removed `retention`, so such a row fails the strict schema: the provider falls back with an error log every 5 seconds, and a rollback to that version or an import of an old export is refused (F16).

A. **The upgrade and the migration fill a missing `signIn` with FD-063's defaults** (recommended), the values the owner chose, which U8 already serves when no setting exists. `upgradeConfigValues(raw, fromVersion, fill)` stays pure: the application passes `{signIn: DEFAULT_CONFIG_VALUES.signIn}`. A present `signIn` is kept. An integration test pins the migration's SQL literal to `DEFAULT_CONFIG_VALUES.signIn`.
B. **Refuse a version-1 value without `signIn`** with `config.invariant`. Databases seeded before U8 serve the defaults with an error log every 5 seconds until `pnpm demo:reset`, and old exports cannot be imported.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 13 — added in the 2026-10-29 refresh

How are refused changes recorded (Question 8) and a lost version race caught, under U8's command helper?

Why this is open: U8's `defineCommand` runs a declared `onRefused` for **every** refusal after `authenticated`, in a committed transaction of its own, and rolls a handler `err` back unless it is marked `recorded`. The first draft declared `onRefused` to write `config_rejected` for refusals after the step-up; under U8's helper it would also run for an Admin's `forbidden`, against AC11.1.6's "nothing written" (F14). Two more facts bear on it. AC11.1.2 says a wrong **or missing** password leaves "the failed attempt recorded"; U10 records a wrong password (`step_up_failed`), but a missing or stale step-up never reaches U10 (T-106 F25, its matrix row M20). And a unique violation on `config_versions.version` aborts the PostgreSQL transaction, while the application cannot open a savepoint on its opaque `Tx` (F15).

A. **Two recorders and a repository savepoint** (recommended):
   - the handler writes `config_rejected {operation, code, paths, unknownKeyCount, step_up: true}` for every refusal after `requires` passed (invalid candidate, no change, `conflict`, `not_found`) and returns it with `recorded: true`;
   - both commands declare an `onRefused` that writes `config_rejected {operation, code: 'auth.step_up_required', step_up: false}` when the refusal is a missing or stale step-up, and nothing for any other refusal, so an Admin's or Moderator's `forbidden` writes nothing. The step-up check runs after the capability check (U10 BR7.4), so only a Super Admin on an approved device can reach that row;
   - `PgConfigRepository.insertVersion` runs its insert in a savepoint of its own and maps the unique violation to `err('conflict')`, so the outer transaction can still write `config_rejected`.
B. **One `onRefused` for every refusal**, `forbidden` included. An Admin's attempt then writes a row, and AC11.1.6 and the "Admin cannot apply: nothing written" row need a requirements change.
C. **The handler records; no `onRefused`**, as the first refresh had it. A missing step-up then leaves no trace, AC11.1.2's "missing password … failed attempt recorded" is unmet and T-106's M20 fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change; the first refresh answered C, and the second pass of the same day moved to A for T-106 F25 and AC11.1.2)

## The points raised for the owner, now answered

Owner's answers, 2026-10-29: **R1** narrow for release 1 (a new FD entry moves the unbuilt FR100/AC11.1.1 settings to release 2); **R2** the limited-data threshold range is 2–50, so "Limited data" cannot be switched off from settings. Both rows are in `functional-spec.md` § 8.1, written `FD-<next>` and numbered when appended.

Each point below changed a requirement or the reach of a hard rule, so neither was pre-filled. Details are in `functional-spec.md` § 8. The text as raised is kept below for the record.

- **R1 — AC11.1.1 names settings that no Unit builds.** AC11.1.1 (FR100, FR45, FR47, FR75) lists label translations, warnings, "whether sentiment is optional", the label-approval workflow and the dangerous-advice visibility policy as configurable; FR100 also lists navigation, profile and form fields, browser-support display and public status labels. `ConfigValues` has none of them, and no task's consumer reads them (no label-approval workflow exists anywhere). Options: **A.** an FD entry narrows FR100 and AC11.1.1 for release 1 to the settings `ConfigValues` holds (thresholds, limited-data threshold, report reasons, capabilities, feature visibility, emergency contacts, sign-in settings), the rest after release 1 (suggested: smallest correct release, nothing half-built); **B.** add `review.sentimentOptional`, `moderation.dangerousAdviceVisible` and their readers in U21 T-301, U26 T-306 and U32 T-403 now, and narrow only the label workflow and wording; **C.** build all of them in this intent. **Answered A by the owner (2026-10-29).**
- **R2 — The limited-data threshold can switch "Limited data" off.** The contract range is 1–50, and "Limited data" shows when `0 < total < threshold` (U14 BR, prototype). With the threshold at 1 the label can never appear, so a configuration change silently removes a hard-rule label. Options: **A.** range 2–50 (suggested: the label always exists; 2 still means "a single account is limited data"); **B.** keep 1–50 as the contract has it. This touches how a hard rule behaves, so it is the owner's call. **Answered A by the owner (2026-10-29): 2–50.**
