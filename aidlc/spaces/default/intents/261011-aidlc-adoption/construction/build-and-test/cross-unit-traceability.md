# Cross-unit traceability — RogiKotha release 1 (Build and Test, Step 10)

Every `FR` and `NFR` key in `inception/requirements-analysis/requirements.md` (116: FR1 to FR103,
NFR1 to NFR13) and every three-segment `AC` in `inception/user-stories/stories.md` (190) is checked
against the per-Unit `construction/*/code-generation/traceability.json` files of all 19 Units (there
is no stage-level `construction/code-generation/traceability.json`). Release-1 status of each
requirement comes from `inception/units-generation/unit-of-work-story-map.md` ("Requirements") and
of each story from `inception/units-generation/traceability.json`.

## Method

- **Covered (OK)**: at least one Unit entry has status `OK` and its target names a file that exists
  on `main` at `e09b558` (a path, or a bare file name resolved against the tracked files). The table
  shows the first existing target file.
- A requirement key with no `OK` entry of its own is covered when an acceptance criterion that cites
  it in `stories.md` (the "(kind; FRn ...)" list) is covered; the row names those ACs.
- **Deferred to release 2**: no `OK` entry; the Unit entries or the story's Units Generation status
  read deferred to release 2 under FD-105 (or the earlier FD-019 and FD-048 deferrals).
- **Verified at Build and Test**: U50 marked the row Deferred to Build and Test (ISS-805) and this
  stage ran its check; the verdict is the result of that run (`test-results.md`).
- **UNCOVERED**: in release 1 by the story map, but no `OK` entry and no covered AC. Each is a
  finding for the approval gate.
- **Deferred to release 2 (FD-105, every citing AC deferred)**: a requirement the story map lists
  as in release 1 whose only citing ACs are all deferred to release 2 under FD-105. This is the
  records decision of the Build and Test rung-1 fixes (the orchestrator, under the owner's
  delegation of 2026-11-04; ISS-811). No `OK` row was added to any Unit's `traceability.json`.

## Verdict

**PASS** — no ID is uncovered. 151 IDs are covered `OK`, 4 are verified by this stage's own runs,
148 are deferred to release 2 by name (8 of them by the ISS-811 records decision below), 1 is
retired and 2 are N/A. The first run of this gate found the 8 keys below uncovered (FAIL); the
verdict changed only through that records decision, not through new coverage.

| Set | Total | Covered (OK) | Verified at Build and Test | Deferred to release 2 (named) | Retired | N/A | UNCOVERED |
|---|---|---|---|---|---|---|---|
| Requirements (FR1 to FR103, NFR1 to NFR13) | 116 | 62 | 1 (NFR12) | 53 (43 by FD-105; 8 by FD-105 with every citing AC deferred, ISS-811; FR96 by FD-048, FR97 by FD-019) | 0 | 0 | 0 |
| Acceptance criteria (AC1.1.1 to AC12.4.3) | 190 | 89 | 3 (AC12.3.2, AC12.3.4, AC12.3.5) | 95 (FD-105) | 1 (AC2.2.1) | 2 (AC3.2.5, AC6.1.6) | 0 |
| **All** | **306** | **151** | **4** | **148** | **1** | **2** | **0** |

## Records decision: eight keys deferred to release 2 (ISS-811)

Each of these is cited only by acceptance criteria that FD-105 defers to release 2, so each is
named "deferred to release 2 under FD-105 (every citing AC deferred)". The story map still lists
them as in release 1; that wording is not changed here.

| ID | Story map (release 1) | Citing ACs, all deferred to release 2 (FD-105) | Release-1 part seen in code (informational) |
|---|---|---|---|
| FR22 | U49: comments are the same for every account (claims deferred) | its only AC, AC8.1.5 (provider label), is release 2 in U49 | not confirmed by this stage; provider claims do not exist in release 1 (FD-105), so no account has a privileged channel |
| FR43 | U47 | its only AC, AC6.1.4 (repeat-episode flag), is release 2 (T-403) in U47 | not confirmed by this stage; no Unit's traceability names the distinct-condition or distinct-episode rule |
| FR53 | U48, narrowed: each item keeps its section for its author | AC7.2.4 is in US7.2, deferred to release 2 | not confirmed by this stage |
| FR54 | U47, narrowed: later-treatment text and unlinked names | AC7.2.4 is in US7.2, deferred | not confirmed by this stage |
| FR55 | U47, narrowed: unlinked names as written | AC6.2.5 (later-provider link, profile offer) is release 2 in U47 and U22 | not confirmed by this stage |
| FR56 | U48: the public note "Documents attached — not medically validated" | AC7.2.5 is in US7.2, deferred | the `evidence.notice` key in `packages/i18n/messages/en.json` and `bn.json`; `apps/web/src/components/patient/evidence/EvidenceNote.test.tsx` and its smoke test pass in `pnpm check` |
| FR57 | U47, narrowed | AC7.2.5 is in US7.2, deferred | `apps/web/src/components/patient/experience/ReviewerLabels.tsx` (tested in `experience.test.tsx`, green in `pnpm check`) |
| FR65 | U48, narrowed: originals are never served | AC7.2.6 and AC7.3.8 are in US7.2 and US7.3, deferred | the only evidence route is `POST /api/evidence/upload` (`apps/web/src/app/api/evidence/upload/route.ts`); no route serves an original |

A later records pass may align the story map's "Requirements" rows with this decision; that is
outside this stage.

## Deferred to release 2 (named, not covered)

- **Requirements (45)**: FR7, FR12, FR13, FR14, FR19, FR20, FR21, FR23, FR28 to FR35, FR38, FR58,
  FR59, FR63, FR64, FR67, FR70, FR71, FR73, FR77, FR79 to FR87, FR89, FR90,
  FR93, FR94, FR100 to FR103 — deferred to release 2 by FD-105; FR96 (FD-048) and FR97 (FD-019)
  were deferred earlier.
- **Requirements by the ISS-811 records decision (8)**: FR22, FR43, FR53, FR54, FR55, FR56, FR57,
  FR65 — deferred to release 2 under FD-105 (every citing AC deferred), see the table above.
- **Acceptance criteria (95)**: AC3.3.4, AC3.3.5, AC4.1.5, AC4.2.1 to AC4.2.5, AC5.1.1 to AC5.1.6,
  AC5.2.1 to AC5.2.6, AC5.3.3 to AC5.3.5, AC6.1.4, AC6.2.5, AC6.3.3 to AC6.3.5, AC7.2.1 to AC7.2.6,
  AC7.3.1 to AC7.3.9, AC8.1.3, AC8.1.5, AC8.2.1 to AC8.2.6, AC9.1.1 to AC9.1.6, AC9.2.1 to
  AC9.2.6, AC9.3.1 to AC9.3.5, AC10.1.1 to AC10.1.3, AC10.1.5, AC10.2.4, AC10.3.1 to AC10.3.6,
  AC11.1.1 to AC11.1.6, AC11.2.1 to AC11.2.5, AC12.2.1 to AC12.2.5 — deferred to release 2 by
  FD-105 (search, provider claims and merges, evidence privacy preview and viewer, custody and
  retention, reactions, reports and moderation, notifications, workspace, PWA, admin configuration,
  identity reveal, tombstones and restore).
- **Covered with a release-2 remainder**: AC2.3.1 (360 px and 1280 px covered; 390, 768 and 1440 px
  deferred, ISS-787), AC2.3.5 (Chromium covered; Firefox, WebKit and the real Safari/iOS smoke
  deferred, ISS-787, ISS-788), NFR5 (Chromium only), NFR8 (merge redirects deferred with T-204),
  AC2.4.6 and NFR13 (the search page's gate deferred with T-206).

## Retired and N/A

- AC2.2.1: retired by FD-091; its successor AC2.4.1 is covered.
- AC3.2.5 (staff new-device approval, U10 T-103, deferred with the staff console) and AC6.1.6
  (evidence attaches through U48) are N/A in every Unit that lists them; AC3.2.5's requirement FR7
  is deferred to release 2 (FD-105).

## Per-ID coverage

| ID | Verdict | Owning Unit(s) | Target file | Note |
|---|---|---|---|---|
| AC1.1.1 | Covered (OK) | cr-006-worker-auth-users-grant, cr-007-int-test-reset-determinism, cr-011-queue-dedup-reset-and-quiet-env, t-010-boundary-lint-and-ci, u50-release-check | `packages/database/src/grants.smoke.test.ts` | — |
| AC1.1.2 | Covered (OK) | cr-006-worker-auth-users-grant, cr-007-int-test-reset-determinism, cr-011-queue-dedup-reset-and-quiet-env, t-010-boundary-lint-and-ci, u50-release-check | `packages/database/src/migrations.int.test.ts` | — |
| AC1.1.3 | Covered (OK) | t-010-boundary-lint-and-ci, u50-release-check | `vitest.workspace.ts` | — |
| AC1.1.4 | Covered (OK) | cr-011-queue-dedup-reset-and-quiet-env, u50-release-check | `packages/database/src/queue/outbox-relay-store.ts` | — |
| AC1.1.5 | Covered (OK) | cr-011-queue-dedup-reset-and-quiet-env, u50-release-check | `apps/worker/src/handlers/outbox-relay.ts` | — |
| AC2.1.1 | Covered (OK) | u50-release-check | `scripts/demo-reset.mjs` | — |
| AC2.1.2 | Covered (OK) | u50-release-check | `docs/validation/U50-walkthrough.md` | — |
| AC2.1.3 | Covered (OK) | u50-release-check | `apps/web/e2e/helpers/page-check.ts` | — |
| AC2.1.4 | Covered (OK) | u50-release-check | `scripts/demo.mjs` | — |
| AC2.2.1 | Retired | u50-release-check | — | u50-release-check N/A: Retired by FD-091; its successor AC2.4.1 is covered |
| AC2.2.2 | Covered (OK) | u50-release-check | `docs/validation/RELEASE-1-GATES.md` | — |
| AC2.2.3 | Covered (OK) | u50-release-check | `docs/validation/RELEASE-1-GATES.md` | — |
| AC2.3.1 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check | `apps/web/src/styles/patient.css` | 360 px and 1280 px covered; 390, 768 and 1440 px deferred to release 2 (FD-105, ISS-787) |
| AC2.3.2 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check | `apps/web/src/styles/patient.css` | — |
| AC2.3.3 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check | `tools/contrast.mjs` | — |
| AC2.3.4 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check | `apps/web/src/styles/patient.css` | — |
| AC2.3.5 | Covered (OK) | t-011-patient-design-and-motion-system | `apps/web/src/app/fonts/bn-heading.ts` | Chromium part covered; Firefox, WebKit and real Safari/iOS deferred to release 2 (FD-105, ISS-787, ISS-788) |
| AC2.3.6 | Covered (OK) | t-011-patient-design-and-motion-system | `scripts/css-motion-check.mjs` | T-011's motion check is OK; U50's Lighthouse record ran here: all record-only and gated pages under the 3 s reference |
| AC2.4.1 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews, u50-release-check | `apps/web/src/components/patient/motion/RouteTransition.tsx` | — |
| AC2.4.2 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews, u50-release-check | `apps/web/src/styles/motion.css` | — |
| AC2.4.3 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews, u50-release-check | `apps/web/src/components/patient/motion/Reveal.tsx` | — |
| AC2.4.4 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews, u50-release-check | `apps/web/src/components/patient/motion/PublishTick.tsx` | — |
| AC2.4.5 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, u47-reviews, u50-release-check | `apps/web/src/styles/motion.css` | — |
| AC2.4.6 | Covered (OK) | t-011-patient-design-and-motion-system, t-207-discover-emergency-about | `apps/web/e2e/smoke/motion.spec.ts` | covered (T-011 CSS check, T-207); the Lighthouse gate ran here: medians within every threshold on all 4 pages; the LCP element is never animated in on en and bn home and en r1, the bn r1 probe never completed (ISS-815); search page release 2 |
| AC3.1.1 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `apps/web/src/server/auth.ts` | — |
| AC3.1.2 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/register.ts` | — |
| AC3.1.3 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/register.test.ts` | — |
| AC3.1.4 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/verify-email.ts` | — |
| AC3.1.5 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/sign-in.ts` | — |
| AC3.1.6 | Covered (OK) | t-101-better-auth-adapter | `apps/worker/src/registry.ts` | — |
| AC3.2.1 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/request-password-reset.ts` | — |
| AC3.2.2 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/reset-password.ts` | — |
| AC3.2.3 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/sign-out-everywhere.ts` | — |
| AC3.2.4 | Covered (OK) | t-101-better-auth-adapter | `packages/application/src/modules/account/resolve-actor.ts` | — |
| AC3.2.5 | N/A (not built by any release-1 Unit) | t-101-better-auth-adapter, t-102-patient-auth-screens | — | t-101-better-auth-adapter N/A: Staff new-device approval is built by U10 T-103; U8 gives sessions, the gateway scopes and an Actor without staff powers (BR4.3, resolve-actor.ts) / t-102-patient-auth-screens N/A: Staff ne |
| AC3.3.1 | Covered (OK) | t-104-identity-module, u47-reviews, u49-comments | `packages/application/src/modules/identity/persona-for.ts` | — |
| AC3.3.2 | Covered (OK) | t-104-identity-module, u47-reviews, u49-comments | `packages/domain/src/identity/alias.ts` | — |
| AC3.3.3 | Covered (OK) | t-104-identity-module, u47-reviews, u49-comments | `packages/database/src/repositories/identity.ts` | — |
| AC3.3.4 | Deferred to release 2 | t-104-identity-module, u47-reviews, u49-comments | — | u47-reviews: Reactions are deferred to release 2 (FD-105, T-402) / u49-comments: Reactions are release 2 (FD-105); BR3.7 keeps every number out of the thread / t-104-identity-module N/A: Reactions are deferred to release |
| AC3.3.5 | Deferred to release 2 | t-104-identity-module, u47-reviews, u49-comments | — | t-104-identity-module: The audited staff identity reveal is deferred to release 2 with U10 (FD-105); not built (BR5.3) / u47-reviews: The audited staff identity reveal is deferred to release 2 (FD-105) / u49-comments: Th |
| AC3.3.6 | Covered (OK) | t-104-identity-module, u47-reviews | `packages/i18n/messages/en.json` | — |
| AC4.1.1 | Covered (OK) | u46-directory | `packages/database/src/repositories/directory-module.ts` | — |
| AC4.1.2 | Covered (OK) | u46-directory | `apps/web/src/components/patient/shared/NotVerified.tsx` | — |
| AC4.1.3 | Covered (OK) | u46-directory | `packages/domain/src/directory/policies.ts` | — |
| AC4.1.4 | Covered (OK) | u46-directory | `packages/application/src/modules/directory/mappers.ts` | — |
| AC4.1.5 | Deferred to release 2 | u46-directory | — | u46-directory: Write side of sourced profile fields is T-204 (directory.proposeFieldChange), deferred to release 2 by FD-105 |
| AC4.2.1 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: Provider claims are T-204, deferred to release 2 (FD-105); U46 covers only FD-100's member-added doctor / u47-reviews: Provider claims are T-204, deferred to release 2 (FD-105); only the FD-100 composer en |
| AC4.2.2 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: Claim decisions are T-204 and T-407, deferred to release 2 (FD-105) / u47-reviews: Claim decisions are T-204 and T-407, deferred to release 2 (FD-105) |
| AC4.2.3 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: Field changes of a claimed profile are T-204, deferred to release 2 (FD-105) / u47-reviews: Field changes are T-204, deferred to release 2 (FD-105) |
| AC4.2.4 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: Photo suggestions are T-204, deferred to release 2 (FD-105) / u47-reviews: Photo suggestions are T-204, deferred to release 2 (FD-105) |
| AC4.2.5 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: Duplicate merge and redirects are T-204, deferred to release 2 (FD-105, ISS-502) / u47-reviews: Duplicate merge is T-204, deferred to release 2 (FD-105) |
| AC4.3.1 | Covered (OK) | u46-directory | `apps/web/src/components/patient/facilities/FacilityProfile.tsx` | — |
| AC4.3.2 | Covered (OK) | u46-directory | `apps/web/src/components/patient/shared/NotVerified.tsx` | — |
| AC4.3.3 | Covered (OK) | t-207-discover-emergency-about, u46-directory | `apps/web/src/components/patient/home/Home.tsx` | — |
| AC4.3.4 | Covered (OK) | u46-directory, u47-reviews | `packages/application/src/modules/review/provider-experience.ts` | — |
| AC4.3.5 | Covered (OK) | t-207-discover-emergency-about, u46-directory | `apps/web/src/components/patient/home/teaser-sub.ts` | — |
| AC5.1.1 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.1.2 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.1.3 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.1.4 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.1.5 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.1.6 | Deferred to release 2 | - | — | US5.1: deferred to release 2 (FD-105): unified search is T-205 and T-206 (U18, U19) |
| AC5.2.1 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.2.2 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.2.3 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.2.4 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.2.5 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.2.6 | Deferred to release 2 | - | — | US5.2: deferred to release 2 (FD-105): search filters, ranking and result cards are T-205 and T-206 (U18, U19) |
| AC5.3.1 | Covered (OK) | u47-reviews | `apps/web/src/components/patient/compose/TagPicker.tsx` | — |
| AC5.3.2 | Covered (OK) | u46-directory, u47-reviews | `packages/application/src/modules/taxonomy/commands/create-provisional.ts` | — |
| AC5.3.3 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: taxonomy.mapProvisional is deferred to release 2 (C6, FD-105); reads already count a mapped term for its canonical target / u47-reviews: Admin alias mapping is deferred to release 2 (FD-105) |
| AC5.3.4 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: FR38 tag management is deferred to release 2 (FD-105, story map) / u47-reviews: Super Admin tag management is deferred to release 2 (FD-105) |
| AC5.3.5 | Deferred to release 2 | u46-directory, u47-reviews | — | u46-directory: FR38 Super Admin checks come with tag management in release 2 (FD-105) / u47-reviews: Super Admin tag management is deferred to release 2 (FD-105) |
| AC6.1.1 | Covered (OK) | u47-reviews | `packages/domain/src/review/review.ts` | — |
| AC6.1.2 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/commands/save-draft.ts` | — |
| AC6.1.3 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/commands/publish.ts` | — |
| AC6.1.4 | Deferred to release 2 | u47-reviews | — | u47-reviews: The repeat-episode flag is release 2 (T-403); review.published carries no repeatEpisode |
| AC6.1.5 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/commands/publish.ts` | — |
| AC6.1.6 | N/A (not built by any release-1 Unit) | u47-reviews | — | u47-reviews N/A: Evidence attaches to the published review through U48 (AuthorTools mounts the evidence components) |
| AC6.2.1 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | — |
| AC6.2.2 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/contracts/src/schemas/review.ts` | — |
| AC6.2.3 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | — |
| AC6.2.4 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | — |
| AC6.2.5 | Deferred to release 2 | t-302-review-changes-and-tombstones, u47-reviews | — | t-302-review-changes-and-tombstones: Follow-ups by later providers are release 2 (FD-105); ISS-729 / u47-reviews: Linking a later provider and the profile-submission offer are T-302 and T-204, release 2 |
| AC6.3.1 | Covered (OK) | t-302-review-changes-and-tombstones | `packages/domain/src/review/versioning.ts` | — |
| AC6.3.2 | Covered (OK) | t-302-review-changes-and-tombstones | `packages/application/src/modules/review/commands/correct.ts` | — |
| AC6.3.3 | Deferred to release 2 | t-302-review-changes-and-tombstones, u47-reviews | — | t-302-review-changes-and-tombstones: Follow-ups are release 2 (FD-105); ISS-729 / u47-reviews: Follow-ups are deferred to release 2 (FD-105, T-302) |
| AC6.3.4 | Deferred to release 2 | t-302-review-changes-and-tombstones, u47-reviews | — | t-302-review-changes-and-tombstones: Delete with tombstone is release 2 (FD-105); ISS-735 / u47-reviews: Deletion with tombstones is deferred to release 2 (FD-105) |
| AC6.3.5 | Deferred to release 2 | t-302-review-changes-and-tombstones, u47-reviews | — | t-302-review-changes-and-tombstones: Restore is release 2 (FD-105); ISS-729 / u47-reviews: Restore is deferred to release 2 (FD-105) |
| AC6.4.1 | Covered (OK) | u46-directory | `packages/domain/src/review/policies.ts` | — |
| AC6.4.2 | Covered (OK) | u46-directory | `packages/domain/src/review/policies.ts` | — |
| AC6.4.3 | Covered (OK) | u46-directory | `packages/application/src/modules/review/provider-experience.ts` | — |
| AC6.4.4 | Covered (OK) | u46-directory | `packages/database/src/repositories/review-reads.ts` | — |
| AC6.4.5 | Covered (OK) | u46-directory | `packages/database/src/repositories/directory-module.ts` | — |
| AC7.1.1 | Covered (OK) | u48-evidence | `packages/domain/src/evidence/file-type.ts` | — |
| AC7.1.2 | Covered (OK) | u48-evidence | `packages/domain/src/evidence/file-type.ts` | — |
| AC7.1.3 | Covered (OK) | t-502-security-hardening, u48-evidence | `apps/web/src/lib/security/request-limits.ts` | — |
| AC7.1.4 | Covered (OK) | u48-evidence | `packages/application/src/modules/evidence/jobs/process-evidence.ts` | — |
| AC7.1.5 | Covered (OK) | u48-evidence | `packages/domain/src/evidence/states.ts` | — |
| AC7.1.6 | Covered (OK) | t-502-security-hardening, u48-evidence | `apps/web/src/log-scrub.int.test.ts` | — |
| AC7.2.1 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.2.2 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.2.3 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.2.4 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.2.5 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.2.6 | Deferred to release 2 | - | — | US7.2: deferred to release 2 (FD-105): privacy preview, redaction and the public viewer are T-305 and T-308 (U25, U28) |
| AC7.3.1 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.2 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.3 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.4 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.5 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.6 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.7 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.8 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC7.3.9 | Deferred to release 2 | - | — | US7.3: deferred to release 2 (FD-105): custody, retention, legal holds and staff removal are T-309 and T-407 (U29, U36) |
| AC8.1.1 | Covered (OK) | u49-comments | `packages/domain/src/community/` | — |
| AC8.1.2 | Covered (OK) | u49-comments | `apps/web/src/components/patient/comments/` | — |
| AC8.1.3 | Deferred to release 2 | u49-comments | — | u49-comments: Comment editing and its private history are release 2 (FD-105) |
| AC8.1.4 | Covered (OK) | u49-comments | `packages/domain/src/community/` | — |
| AC8.1.5 | Deferred to release 2 | u49-comments | — | u49-comments: The provider label and the privacy report are release 2 (FD-105) |
| AC8.1.6 | Covered (OK) | u49-comments | `packages/contracts/src/schemas/community.ts` | — |
| AC8.2.1 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC8.2.2 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC8.2.3 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC8.2.4 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC8.2.5 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC8.2.6 | Deferred to release 2 | - | — | US8.2: deferred to release 2 (FD-105): Like and Dislike reactions are T-401's reaction part |
| AC9.1.1 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.1.2 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.1.3 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.1.4 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.1.5 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.1.6 | Deferred to release 2 | - | — | US9.1: deferred to release 2 (FD-105): reports and the temporary hide are T-403 (U32) |
| AC9.2.1 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.2.2 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.2.3 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.2.4 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.2.5 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.2.6 | Deferred to release 2 | - | — | US9.2: deferred to release 2 (FD-105): the moderation queue is T-404 and T-406 (U33, U35) |
| AC9.3.1 | Deferred to release 2 | - | — | US9.3: deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 (U33, U35, U38) |
| AC9.3.2 | Deferred to release 2 | - | — | US9.3: deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 (U33, U35, U38) |
| AC9.3.3 | Deferred to release 2 | - | — | US9.3: deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 (U33, U35, U38) |
| AC9.3.4 | Deferred to release 2 | - | — | US9.3: deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 (U33, U35, U38) |
| AC9.3.5 | Deferred to release 2 | - | — | US9.3: deferred to release 2 (FD-105): appeals, blocking and enforcement are T-404, T-406 and T-409 (U33, U35, U38) |
| AC10.1.1 | Deferred to release 2 | - | — | US10.1: deferred to release 2 (FD-105): notifications are T-405 and T-408 (U34, U37) |
| AC10.1.2 | Deferred to release 2 | - | — | US10.1: deferred to release 2 (FD-105): notifications are T-405 and T-408 (U34, U37) |
| AC10.1.3 | Deferred to release 2 | - | — | US10.1: deferred to release 2 (FD-105): notifications are T-405 and T-408 (U34, U37) |
| AC10.1.4 | Covered (OK) | t-101-better-auth-adapter | `packages/application/src/modules/notification/internal/queue-email.ts` | — |
| AC10.1.5 | Deferred to release 2 | - | — | US10.1: deferred to release 2 (FD-105): notifications are T-405 and T-408 (U34, U37) |
| AC10.2.1 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/queries/author-cards.ts` | — |
| AC10.2.2 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/queries/author-cards.ts` | — |
| AC10.2.3 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/queries/author-cards.ts` | — |
| AC10.2.4 | Deferred to release 2 | u47-reviews | — | u47-reviews: Bookmarks are deferred to release 2 (FD-105, T-409) |
| AC10.2.5 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/queries/author-cards.ts` | — |
| AC10.3.1 | Deferred to release 2 | - | — | US10.3: deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410 (U38, U39) |
| AC10.3.2 | Deferred to release 2 | - | — | US10.3: deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410 (U38, U39) |
| AC10.3.3 | Deferred to release 2 | - | — | US10.3: deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410 (U38, U39) |
| AC10.3.4 | Deferred to release 2 | - | — | US10.3: deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410 (U38, U39) |
| AC10.3.5 | Deferred to release 2 | - | — | US10.3: deferred to release 2 (FD-105): dashboard, preferences, feedback panel and data requests are T-409 and T-410 (U38, U39) |
| AC10.3.6 | Deferred to release 2 | t-101-better-auth-adapter | — | t-101-better-auth-adapter: Release 2 (FD-097): U8 builds account.submitFeedback with body and locale only; category, screenshot and contact permission are not built |
| AC11.1.1 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.1.2 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.1.3 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.1.4 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.1.5 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.1.6 | Deferred to release 2 | - | — | US11.1: deferred to release 2 (FD-105): runtime configuration and capabilities are T-103, T-105 and T-408 (U10, U12, U37); release 1 reads constants |
| AC11.2.1 | Deferred to release 2 | - | — | US11.2: deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 (U33, U35, U36, U37) |
| AC11.2.2 | Deferred to release 2 | - | — | US11.2: deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 (U33, U35, U36, U37) |
| AC11.2.3 | Deferred to release 2 | - | — | US11.2: deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 (U33, U35, U36, U37) |
| AC11.2.4 | Deferred to release 2 | - | — | US11.2: deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 (U33, U35, U36, U37) |
| AC11.2.5 | Deferred to release 2 | - | — | US11.2: deferred to release 2 (FD-105): operational dashboards and bulk actions are T-404, T-406, T-407 and T-408 (U33, U35, U36, U37) |
| AC12.1.1 | Covered (OK) | t-207-discover-emergency-about, u50-release-check | `apps/web/src/components/patient/home/Home.tsx` | — |
| AC12.1.2 | Covered (OK) | cr-004-live-region-announcements, u50-release-check | `apps/web/src/components/shared/ThemeControls.tsx` | — |
| AC12.1.3 | Covered (OK) | u47-reviews, u50-release-check | `packages/contracts/src/schemas/review.ts` | — |
| AC12.1.4 | Covered (OK) | cr-004-live-region-announcements, t-207-discover-emergency-about, u47-reviews, u50-release-check | `packages/i18n/messages/bn.json` | — |
| AC12.1.5 | Covered (OK) | t-207-discover-emergency-about, u50-release-check | `apps/web/src/app/[locale]/(patient)/page.tsx` | — |
| AC12.1.6 | Covered (OK) | t-207-discover-emergency-about, u50-release-check | `apps/web/src/components/patient/home/Home.tsx` | — |
| AC12.2.1 | Deferred to release 2 | - | — | US12.2: deferred to release 2 (FD-105): the PWA is T-501 (U40) |
| AC12.2.2 | Deferred to release 2 | - | — | US12.2: deferred to release 2 (FD-105): the PWA is T-501 (U40) |
| AC12.2.3 | Deferred to release 2 | - | — | US12.2: deferred to release 2 (FD-105): the PWA is T-501 (U40) |
| AC12.2.4 | Deferred to release 2 | - | — | US12.2: deferred to release 2 (FD-105): the PWA is T-501 (U40) |
| AC12.2.5 | Deferred to release 2 | - | — | US12.2: deferred to release 2 (FD-105): the PWA is T-501 (U40) |
| AC12.3.1 | Covered (OK) | u50-release-check | `apps/web/src/server/health.ts` | — |
| AC12.3.2 | Verified at Build and Test | u50-release-check (check run here) | `apps/web/src/server/health.ts` | Met: with CLAMD_PORT pointed at an unused port /api/health read scanner down (ok true); with SMTP_PORT unused, mail down and ok false (test-results.md, stopped services) |
| AC12.3.3 | Covered (OK) | t-502-security-hardening, u50-release-check | `packages/application/src/ports/log-policy.ts` | — |
| AC12.3.4 | Verified at Build and Test | u50-release-check (drill run here) | `docs/validation/U50-walkthrough.md` | Met: break committed (/en 500), reverted, db:reset && db:seed on rogikotha_bt, /en and /bn 200, health ok, pnpm check and pnpm smoke green (test-results.md, rollback drill) |
| AC12.3.5 | Verified at Build and Test | u50-release-check (run here) | `apps/web/e2e/perf/nfr13.spec.ts` | Met: five record-only pages measured, LCP 1.23 s each, all under the 3 s reference, no gate |
| AC12.4.1 | Covered (OK) | t-502-security-hardening | `apps/web/src/lib/security/csp.ts` | — |
| AC12.4.2 | Covered (OK) | t-502-security-hardening | `apps/web/src/security-cookies.test.ts` | — |
| AC12.4.3 | Covered (OK) | t-502-security-hardening | `apps/web/src/lib/security/__tests__/csp.test.ts` | — |
| FR1 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `apps/web/src/server/auth.ts` | via AC3.1.1, AC3.1.4 |
| FR2 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/register.ts` | via AC3.1.2, AC3.1.3 |
| FR3 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/register.ts` | via AC3.1.2, AC3.1.3 |
| FR4 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/verify-email.ts` | via AC3.1.4 |
| FR5 | Covered (OK) | t-101-better-auth-adapter | `apps/worker/src/registry.ts` | via AC3.1.6 |
| FR6 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/sign-out-everywhere.ts` | via AC3.2.3, AC3.2.4 |
| FR7 | Deferred | - | — | deferred to release 2 (FD-105): administrative device approval, T-103 |
| FR8 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/sign-in.ts` | via AC3.1.5 |
| FR9 | Covered (OK) | t-101-better-auth-adapter, t-102-patient-auth-screens | `packages/application/src/modules/account/commands/request-password-reset.ts` | via AC3.2.1, AC3.2.2 |
| FR10 | Covered (OK) | t-104-identity-module, u47-reviews, u49-comments | `packages/application/src/modules/identity/persona-for.ts` | via AC3.3.1, AC3.3.2, AC3.3.3, AC3.3.6, AC10.2.1, AC10.2.3 |
| FR11 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/queries/author-cards.ts` | via AC10.2.1, AC10.2.2, AC10.2.3, AC10.2.5 |
| FR12 | Deferred | - | — | deferred to release 2 (FD-105): blocking, account deletion and optional profile details, T-404, T-409 and T-410 |
| FR13 | Deferred | - | — | deferred to release 2 (FD-105): blocking, account deletion and optional profile details, T-404, T-409 and T-410 |
| FR14 | Deferred | - | — | deferred to release 2 (FD-105): blocking, account deletion and optional profile details, T-404, T-409 and T-410 |
| FR15 | Covered (OK) | u46-directory | `packages/database/src/repositories/directory-module.ts` | via AC4.1.1, AC4.1.2 |
| FR16 | Covered (OK) | u46-directory | `apps/web/src/components/patient/shared/NotVerified.tsx` | via AC4.1.2 |
| FR17 | Covered (OK) | u46-directory | `packages/domain/src/directory/policies.ts` | via AC4.1.3 |
| FR18 | Covered (OK) | u46-directory | `packages/application/src/modules/directory/mappers.ts` | via AC4.1.4 |
| FR19 | Deferred | - | — | deferred to release 2 (FD-105): photo suggestion, claim, field changes and merge, T-204 and T-407 |
| FR20 | Deferred | - | — | deferred to release 2 (FD-105): photo suggestion, claim, field changes and merge, T-204 and T-407 |
| FR21 | Deferred | - | — | deferred to release 2 (FD-105): photo suggestion, claim, field changes and merge, T-204 and T-407 |
| FR22 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC8.1.5, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR23 | Deferred | - | — | deferred to release 2 (FD-105): photo suggestion, claim, field changes and merge, T-204 and T-407 |
| FR24 | Covered (OK) | u46-directory, t-207-discover-emergency-about | `apps/web/src/components/patient/facilities/FacilityProfile.tsx` | via AC4.3.1, AC4.3.5 |
| FR25 | Covered (OK) | u46-directory | `apps/web/src/components/patient/shared/NotVerified.tsx` | via AC4.3.2 |
| FR26 | Covered (OK) | t-207-discover-emergency-about, u46-directory | `apps/web/src/components/patient/home/Home.tsx` | via AC4.3.3 |
| FR27 | Covered (OK) | u46-directory, u47-reviews | `packages/application/src/modules/review/provider-experience.ts` | via AC4.3.4 |
| FR28 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR29 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR30 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR31 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR32 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR33 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR34 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR35 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR36 | Covered (OK) | u47-reviews | `apps/web/src/components/patient/compose/TagPicker.tsx` | via AC5.3.1 |
| FR37 | Covered (OK) | u46-directory, u47-reviews | `packages/application/src/modules/taxonomy/commands/create-provisional.ts` | via AC5.3.2 |
| FR38 | Deferred | - | — | deferred to release 2 (FD-105): Super Admin tag management, T-105 and T-408 |
| FR39 | Covered (OK) | u47-reviews, t-302-review-changes-and-tombstones | `packages/domain/src/review/review.ts` | via AC6.1.1, AC6.1.2, AC6.2.1 |
| FR40 | Covered (OK) | u47-reviews | `packages/domain/src/review/review.ts` | via AC6.1.1, AC6.1.3 |
| FR41 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | via AC6.2.1 |
| FR42 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/contracts/src/schemas/review.ts` | via AC6.2.2 |
| FR43 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC6.1.4, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR44 | Covered (OK) | u47-reviews | `packages/application/src/modules/review/commands/publish.ts` | via AC6.1.5 |
| FR45 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | via AC6.2.3 |
| FR46 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | via AC6.2.3 |
| FR47 | Covered (OK) | t-302-review-changes-and-tombstones, u47-reviews | `packages/domain/src/review/versioning.ts` | via AC6.2.4 |
| FR48 | Covered (OK) | u46-directory | `packages/domain/src/review/policies.ts` | via AC6.4.1 |
| FR49 | Covered (OK) | u46-directory | `packages/application/src/modules/review/provider-experience.ts` | via AC6.4.3 |
| FR50 | Covered (OK) | u46-directory | `packages/database/src/repositories/review-reads.ts` | via AC6.4.4 |
| FR51 | Covered (OK) | u46-directory | `packages/domain/src/review/policies.ts` | via AC6.4.2 |
| FR52 | Covered (OK) | u46-directory | `packages/database/src/repositories/directory-module.ts` | via AC6.4.5 |
| FR53 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC7.2.4, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR54 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC7.2.4, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR55 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC6.2.5, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR56 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC7.2.5, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR57 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC7.2.5, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR58 | Deferred | - | — | deferred to release 2 (FD-105): search, T-205 and T-206 |
| FR59 | Deferred | - | — | deferred to release 2 (FD-105): timeline comparison, privacy preview and redaction, T-305 and T-308 |
| FR60 | Covered (OK) | u48-evidence | `packages/domain/src/evidence/file-type.ts` | via AC7.1.1, AC7.1.2 |
| FR61 | Covered (OK) | t-502-security-hardening | `apps/web/src/lib/security/request-limits.ts` | — |
| FR62 | Covered (OK) | u48-evidence, t-502-security-hardening | `packages/domain/src/evidence/file-type.ts` | via AC7.1.1, AC7.1.2, AC7.1.4, AC7.1.6 |
| FR63 | Deferred | - | — | deferred to release 2 (FD-105): timeline comparison, privacy preview and redaction, T-305 and T-308 |
| FR64 | Deferred | - | — | deferred to release 2 (FD-105): timeline comparison, privacy preview and redaction, T-305 and T-308 |
| FR65 | Deferred to release 2 (FD-105, every citing AC deferred) | — | — | records decision at Build and Test (orchestrator, ISS-811): cited only by AC7.2.6, AC7.3.8, all deferred to release 2 under FD-105; the story map lists it as in release 1 |
| FR66 | Covered (OK) | u48-evidence | `packages/application/src/modules/evidence/jobs/process-evidence.ts` | via AC7.1.4 |
| FR67 | Deferred | - | — | deferred to release 2 (FD-105): retention and legal holds, T-309 |
| FR68 | Covered (OK) | t-502-security-hardening, u48-evidence | `apps/web/src/log-scrub.int.test.ts` | via AC7.1.6 |
| FR69 | Covered (OK) | t-302-review-changes-and-tombstones | `packages/domain/src/review/versioning.ts` | via AC6.3.1, AC6.3.2 |
| FR70 | Deferred | - | — | deferred to release 2 (FD-105): follow-ups, deletion, tombstones and restore, T-302's other parts |
| FR71 | Deferred | - | — | deferred to release 2 (FD-105): follow-ups, deletion, tombstones and restore, T-302's other parts |
| FR72 | Covered (OK) | u49-comments | `packages/domain/src/community/` | via AC8.1.4 |
| FR73 | Deferred | - | — | deferred to release 2 (FD-105): comment editing, history and staff deletion, T-401 and T-404 |
| FR74 | Covered (OK) | u49-comments | `packages/domain/src/community/` | via AC8.1.1, AC8.1.6 |
| FR75 | Covered (OK) | u49-comments | `apps/web/src/components/patient/comments/` | via AC8.1.2 |
| FR76 | Covered (OK) | t-207-discover-emergency-about, u50-release-check | `apps/web/src/app/[locale]/(patient)/page.tsx` | via AC12.1.5 |
| FR77 | Deferred | - | — | deferred to release 2 (FD-105): reactions, T-401 |
| FR78 | Covered (OK) | t-104-identity-module, u47-reviews, u49-comments | `packages/database/src/repositories/identity.ts` | via AC3.3.3 |
| FR79 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR80 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR81 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR82 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR83 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR84 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR85 | Deferred | - | — | deferred to release 2 (FD-105): reports and moderation, T-403, T-404 and T-406 |
| FR86 | Deferred | - | — | deferred to release 2 (FD-105): retention and legal holds, T-309 |
| FR87 | Deferred | - | — | deferred to release 2 (FD-105): notifications, T-405 |
| FR88 | Covered (OK) | t-101-better-auth-adapter | `packages/application/src/modules/notification/internal/queue-email.ts` | via AC10.1.4 |
| FR89 | Deferred | - | — | deferred to release 2 (FD-105): preferences and the feedback panel, T-409; the feedback command is merged in T-101 (FD-097) |
| FR90 | Deferred | - | — | deferred to release 2 (FD-105): preferences and the feedback panel, T-409; the feedback command is merged in T-101 (FD-097) |
| FR91 | Covered (OK) | t-207-discover-emergency-about, u50-release-check, cr-004-live-region-announcements, u47-reviews | `apps/web/src/components/patient/home/Home.tsx` | via AC12.1.1, AC12.1.2, AC12.1.3 |
| FR92 | Covered (OK) | u47-reviews, u50-release-check | `packages/contracts/src/schemas/review.ts` | via AC12.1.3 |
| FR93 | Deferred | - | — | deferred to release 2 (FD-105): PWA, T-501 |
| FR94 | Deferred | - | — | deferred to release 2 (FD-105): PWA, T-501 |
| FR95 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews | `tools/contrast.mjs` | via AC2.3.3, AC2.3.4, AC2.4.3, AC12.1.6 |
| FR96 | Deferred | - | — | deferred earlier (FD-048) |
| FR97 | Deferred | - | — | deferred earlier (FD-019) |
| FR98 | Covered (OK) | t-502-security-hardening | `apps/web/src/security-cookies.test.ts` | via AC12.4.2 |
| FR99 | Covered (OK) | t-502-security-hardening | `apps/web/src/lib/security/__tests__/csp.test.ts` | — |
| FR100 | Deferred | - | — | deferred to release 2 (FD-105): runtime configuration, capabilities and dashboards, T-103, T-105 and T-408 |
| FR101 | Deferred | - | — | deferred to release 2 (FD-105): runtime configuration, capabilities and dashboards, T-103, T-105 and T-408 |
| FR102 | Deferred | - | — | deferred to release 2 (FD-105): runtime configuration, capabilities and dashboards, T-103, T-105 and T-408 |
| FR103 | Deferred | - | — | deferred to release 2 (FD-105): runtime configuration, capabilities and dashboards, T-103, T-105 and T-408 |
| NFR1 | Covered (OK) | t-011-patient-design-and-motion-system, t-207-discover-emergency-about | `scripts/css-motion-check.mjs` | via AC2.3.6, AC2.4.6 |
| NFR2 | Covered (OK) | u48-evidence | `packages/domain/src/evidence/states.ts` | via AC7.1.5 |
| NFR3 | Covered (OK) | u50-release-check | `apps/web/src/server/health.ts` | via AC12.3.1 |
| NFR4 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check | `apps/web/src/styles/patient.css` | via AC2.3.1, AC2.3.2 |
| NFR5 | Covered (OK) | t-011-patient-design-and-motion-system | `apps/web/src/app/fonts/bn-heading.ts` | via AC2.3.5 |
| NFR6 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews | `apps/web/src/styles/patient.css` | via AC2.3.2, AC2.3.3, AC2.3.4, AC2.4.3, AC12.1.6 |
| NFR7 | Covered (OK) | t-011-patient-design-and-motion-system, u50-release-check, cr-004-live-region-announcements, t-207-discover-emergency-about, u47-reviews | `apps/web/src/styles/patient.css` | via AC2.3.1, AC2.3.4, AC12.1.4, AC12.1.6 |
| NFR8 | Covered (OK) | t-502-security-hardening | `apps/web/src/lib/security/headers.ts` | — |
| NFR9 | Covered (OK) | cr-011-queue-dedup-reset-and-quiet-env | `packages/database/src/queue/outbox-relay-store.int.test.ts` | — |
| NFR10 | Covered (OK) | cr-011-queue-dedup-reset-and-quiet-env, t-502-security-hardening | `apps/worker/src/handlers/outbox-relay.test.ts` | — |
| NFR11 | Covered (OK) | cr-006-worker-auth-users-grant, cr-007-int-test-reset-determinism, cr-009-database-extensionless-imports, cr-011-queue-dedup-reset-and-quiet-env, t-010-boundary-lint-and-ci | `packages/database/src/migrations/0007_revoke_worker_auth_users.sql` | — |
| NFR12 | Verified at Build and Test | u50-release-check (drill run here) | `docs/validation/U50-walkthrough.md` | via AC12.3.4, run here |
| NFR13 | Covered (OK) | t-011-patient-design-and-motion-system, t-102-patient-auth-screens, t-207-discover-emergency-about, u46-directory, u47-reviews, u50-release-check | `apps/web/src/components/patient/motion/RouteTransition.tsx` | via AC2.4.1 to AC2.4.6; e2e:perf still red at Build and Test because Lighthouse intermittently reports no LCP (ISS-815); figures within thresholds |
