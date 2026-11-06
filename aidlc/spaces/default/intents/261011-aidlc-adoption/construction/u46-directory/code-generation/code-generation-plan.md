# Code Generation plan — U46 `u46-directory` (T-201 + T-202 + T-203, FD-105)

## Summary

- Builds: the Directory and Taxonomy modules (queries, `addMemberDoctor` for FD-100, the provisional-term operation and `createProvisional`), the `ProviderExperience` and `ConditionStats` ports with their read-only Review stub and four review read queries, the `PublicEvidenceCount` port with its interim binding, one migration (taxonomy suggestion columns, open-provisional key, branch own name and hue), and the `/doctors`, `/facilities` and `/topics` pages switched onto the module queries, with the demo directory and topic code they replace deleted in the same Bolt
- Touches: `packages/{contracts,domain,application,database,test-support,i18n}`, `apps/web/src/{app/[locale]/(patient)/{doctors,facilities,topics},components/patient/{doctors,facilities,topics,shared},lib,server/container.ts,server/data.ts,styles/patient.css}`, `apps/web/src/app/pages.test.tsx` (six rows removed), and the records (design § 11)
- Tests: domain policy functions, contracts `stableHue`, application queries and commands on `test-support` fakes (happy path in `en` and `bn`, each refusal, one audit assertion), database `*.int.test.ts` for every repository method (isolation, hidden, merged doctor, FD-101 match, member-added mark, races, migration from empty), seed counts, page and component tests in both locales, and one database and one component smoke assertion

## Inputs

Functional Design (reviewed READY, iteration 1): `construction/u46-directory/functional-design/`: `functional-spec.md` (WF1–WF13, §§ 1–17), `rules.md` (BR1–BR9, 65 rules), `entities.md`, `frontend-components.md`, `functional-design-questions.md` (Questions 1–14), `traceability.json`, and the review `functional-design/reviews/review-01.md` (one Major, three Minor; resolution below). Also `inception/units-generation/unit-of-work.md` § U46, `unit-of-work-dependency.md` ("Shared files and the collision rule", migrations rule), `inception/contract-design/contract-summary.md` (C6, C7, C17, C18, C19), the task files `docs/implementation/tasks/T-201`, `T-202`, `T-203`, and decision-log FD-067, FD-099 to FD-105.

## Where it runs

- In its own git worktree on the Bolt branch `bolt/u46-directory`, branched from `main`, with its own test database: `DATABASE_URL_TEST` points at one of `rogikotha_test_w1` .. `rogikotha_test_w6`, which the orchestrator assigns. Never point it at `rogikotha_test` or the development database while other worktrees run.
- No GitHub Actions or other CI exist (FD-102). The gate is local only: `pnpm check` (eleven steps) and `pnpm smoke`, on the Bolt branch and again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never `git reset --hard`, `git checkout --` or `git clean` on a dirty tree. Commit only owned and recorded paths, after reading `git diff --cached`.
- The Unit adds no dependency, so no dependency-check entry is needed (WF1 step 1); if a step finds one is needed, the log check of `project.md` Mandated applies first.

## Review points resolved in this plan

1. **R-01 (Major), demo functions still imported by two test files.** Resolved in the design (§ 3 rows for `evidence.adversarial.test.ts` and `reviews.int.test.ts`, § 11 recorded additions) and carried by Step 10: the FD-035 doctor-page read moves to `PgReviewReadRepository.publishedForDoctor` plus `createInterimPublicEvidenceCount`, with every expected value unchanged; the FD-100 rollback read moves to `PgDirectoryModuleRepository.listDoctors({page: 1, pageSize: 100, locale: 'en'})`. Only then are `listPublishedReviewsForDoctor` and `listDoctors` deleted (Step 14), after a grep shows no caller left.
2. **R-02 (Minor), files shared with the parallel wave.** U46 does not edit `repositories/not-implemented.test.ts`, `fakes/repositories.ts` or `fakes/repositories-superset.test.ts`: its repositories, fakes and page tests are new files (BR8.4). The one remaining shared edit is removing the six directory rows and the `facilities` entry of the `@/server/data` mock in `apps/web/src/app/pages.test.tsx`, recorded here as one hunk (U9 adds rows elsewhere in that file). The swarm merges one Unit at a time and U46 rebases before its merge.
3. **R-03 (Minor), merged or unpublished doctor in review counts.** BR1.3 requires the subject doctor visible (published, not merged) in every review read; Step 10 adds the merged-doctor and unpublished-doctor database test.
4. **R-04 (Minor), C6 signature change.** The dated note on `contract-summary.md` (Step 17) words the `ConditionStats.forCondition(termId, locale)` change as an amendment of C6, U46 provider and sole consumer, listing the replaced fields (design § 6).

## Steps (test-after, per the Testing Contract)

Each layer is implemented first, then its tests are written and run with the unit-scoped commands in `unit-test-instructions.md`. Run only one database-touching command at a time.

**Phase A — baseline and runner**

- [x] **Step 1** — Baseline and FD rows. In the worktree on `bolt/u46-directory`: `pnpm infra:up`, then `timeout 1200 pnpm check` (eleven steps) and `timeout 600 pnpm smoke`, both green; record the counts and the per-package coverage table. Read the open `ISSUES.md` rows in directory, taxonomy, review, seed and fakes (ISS-157, ISS-161, ISS-222, ISS-266, ISS-268, ISS-294, ISS-398). Then, before any code, append FD-106, FD-107 and FD-108 (design § 17, text as written there) to `docs/status/decision-log.md` under working numbers; the final numbers are taken at merge, after rebasing on `main` (the log ends at FD-105 today).
- [x] **Step 2** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`; projects `domain`, `contracts`, `application`, `database`, `test-support`, `test-support-seed`, `web`) and run each unit-scoped command of `unit-test-instructions.md` once on the baseline; record the result there.

**Phase B — core layers**

- [x] **Step 3** — Contracts: implement `stableHue` in `packages/contracts/src/ids.ts`; view models in `view-models/{doctor,facility,condition,experience-card}.ts` (design § 7); the stub `ExperienceCardVM` in `view-models/experience.ts` becomes a re-export from `experience-card.ts`; schemas `schemas/{directory,taxonomy}.ts` (`GetDoctorInput` with typed filters, `ListDoctorsInput`, `AddMemberDoctorInput`, `ResolveInput` with optional `kind`); one barrel line each. `discover.ts` and `search.ts` keep compiling.
- [x] **Step 4** — Contracts tests: `stableHue` equals the prototype's `hash` for fixed ids; the input schemas accept and refuse their edge values. Run the contracts command.
- [x] **Step 5** — Domain: `packages/domain/src/review/policies.ts` (`distribution`, `isLimitedData` only), `domain/src/directory/` (`registrationNotVerified`, `omitEmptyFields`, `branchNames`), `domain/src/taxonomy/` (`normalizeAliasKey`); plain values only (BR6.6).
- [x] **Step 6** — Domain tests (design § 10 domain rows): all-zero keys, unknown values ignored, not provided; limited at 4 of 5, not at 5, 0 empty and not limited; `omitEmptyFields` drops null, blank, empty and hidden in fact order; `registrationNotVerified` always true; `branchNames` three cases; `normalizeAliasKey` composed and decomposed Bengali, punctuation, vowel signs. Run the domain command.
- [x] **Step 7** — Application: `ports/public-evidence-count.ts` (C17 plus `countPublicEvidenceByReview`), `ports/repositories/{directory,taxonomy}.ts` and the read methods of `ports/repositories/review.ts`, one line in `ports/index.ts`; `modules/directory/ports.ts` (`ProviderExperience`), `modules/taxonomy/ports.ts` (`ConditionStats`); the Review stub `modules/review/{provider-experience,condition-stats}.ts` and `queries/{sentiment-distribution,outcome-distribution,criteria-distribution,list-experience-cards}.ts`; the Directory module queries and `internal/add-member-doctor.ts`; the Taxonomy module queries, `provisional-term.ts` and `commands/create-provisional.ts` (limiter key `taxonomy.createProvisional:account:<accountId>`, 30 per 3600 s, per process); factories `createDirectoryModule(ports)` and `createTaxonomyModule(ports)`; barrel lines. Configuration is read once per call with `await config.current()`.
- [x] **Step 8** — Test-support fakes in new files: `packages/test-support/src/fakes/directory-repositories.ts` (directory, taxonomy and review-read repository fakes applying BR1.3, ISS-222) and `fakes/directory-ports.ts` (`ProviderExperience`, `ConditionStats`, `PublicEvidenceCount`), one export line in `fakes/index.ts`. Then `fakes/directory-repositories.test.ts` (hidden and soft-deleted reviews not counted; a superset check against the three new repository files, run in Step 10 once those exist).
- [x] **Step 9** — Application tests (design § 10 application rows) on the new fakes: each query's happy path in `en` and `bn`; facts omitted and provenance; facility feedback off records no `forBranch` or `summariesForBranches` call; deep scans for locale-suffixed keys, private keys and percentage fields; anonymous byline; the static import scan (no Directory or Taxonomy import of Review); `createProvisional` happy path with audit and outbox, refusal for visitor, unverified and restricted actors with nothing written, the 31st call `rate_limited`, a repeat returns the same term; the operation on a caller's transaction with a persona actor; `addMemberDoctor` validation, reuse and create, audit and `doctor.changed` only on create, no BMDC number in the result. Run the application and test-support commands.

**Phase C — database**

- [x] **Step 10** — Database: the migration under the working name `packages/database/src/migrations/<n>_directory_suggestions_and_branch_names.sql` (design WF1 step 5; number taken at merge, today the next free is `0010`), with `schema/{taxonomy,directory}.ts` and the drizzle `meta/` snapshot; the pinned counts in `migrations.int.test.ts` and `validator-probes.int.test.ts` (P8) rise by one. If the FD-101 grouped fragment scans per row in `explain`, add the expression index on condition tags to the same migration and record it (design § 15). New repository files `repositories/{directory-module,taxonomy-module,review-reads,public-evidence-count-interim}.ts` (BR8.4; the T-201 stubs stay untouched as dead code, F9), one barrel line each. Seed: `packages/test-support/src/seed/seed-directory.ts` (keys through `normalizeAliasKey`, TAG_GROUPS suggestions, branch own name and hue, `name_*` unchanged, re-run a no-op). Then the tests: a `*.int.test.ts` per new repository file covering every method (design § 10 database rows: facility isolation both ways, hidden, merged and unpublished doctor (R-03), FD-101 match, member-added mark, the two-connection `addMemberDoctor` and provisional-key races, branch names and checks, migration from empty); the moved FD-035 read in `demo/evidence.adversarial.test.ts` and the moved FD-100 read in `demo/reviews.int.test.ts`, expected values unchanged (R-01); the seed rows in `seed/seed.int.test.ts` (per-condition totals from the corpus, c8 at 0, r2, r21, r8 unmatched; f1 own name, label and hue; f2 none; `listSuggested` order; 10 conditions). Run the database command, then the seed command, then the superset check of Step 8.

**Phase D — adapters, web and UI**

- [x] **Step 11** — Adapters: no change. U46 adds no `packages/adapters` code; the interim `PublicEvidenceCount` lives in `packages/database` (design § 6). Confirm `pnpm typecheck` still passes and record "adapters: no change" in `code-summary.md`.
- [x] **Step 12** — Web wiring and endpoints: `apps/web/src/server/container.ts`, U46's append-only block (the directory, taxonomy and review-read repositories, the two port implementations, the interim `PublicEvidenceCount` binding); `apps/web/src/lib/doctor-filters.ts` (`parseProfileFilters`, `filterHref`); the six page loaders `app/[locale]/(patient)/{doctors,facilities,topics}/page.tsx` and `…/[id]/page.tsx` switched to `getContainer()` queries with a `cache()`d loader, 404 for a non-public id, 307 for a condition the doctor has no account for, metadata from the same loader, no `loading.tsx`. Then the tests: `lib/doctor-filters.test.ts`, and each route's own `page.test.tsx` (404 without a container call, 307, metadata titles in both locales; mocks of `@/server/container` and `@/server/auth`); remove the six directory rows and the `facilities` entry of the `@/server/data` mock in `app/pages.test.tsx` (R-02). No worker change. Run the web command for these files.
  - Done (2026-11-06): the container block, `lib/doctor-filters.ts` with its test, and the six `cache()`d loaders in `{doctors,facilities,topics}/load.ts` (404 before any container call, 307 through the locale-aware `redirect`, threshold and emergency settings) with `load.test.ts` beside each. Left open, because they need the VM components of Step 13: each `page.tsx` and `generateMetadata` calling its loader and rendering `DoctorIndex`, `DoctorProfile`, `FacilityIndex`, `FacilityProfile`, `TopicIndex`, `ConditionPage`; the route `page.test.tsx` files (metadata titles in both locales); and the R-02 removal in `app/pages.test.tsx`. Tick this step when Step 13 lands those.
  - Done (2026-11-06, with Step 14): the six `page.tsx` files call their loaders and render the VM components; the profile and condition pages and their metadata share the `cache()`d loader, and the doctor page passes `searchParams` to `loadDoctorProfile`. The index pages pass `title=""` to `ViewShell` because `IndexHead` already brings the page's only h1 (the first page test caught two h1s). Route page tests: `doctors/doctors-pages.test.tsx` (rewritten), `facilities/facilities-pages.test.tsx`, `topics/topics-pages.test.tsx` (render, one h1, the loader's 404 passed through, tab title in `en` and `bn`), mocking `./load`; the container, 404 and 307 cases stay in each `load.test.ts`. R-02: the six directory rows, the `facilities` entry and the retired `doctors` mock entries left `app/pages.test.tsx`; its language-switch check now reads `/search`.
- [x] **Step 13** — UI components: new `components/patient/shared/{Avatar,Badge,NotVerified,MemberAdded,DistBlock,SentimentBlock,OutcomeBlock,AccountRow,DoctorLink,FacilityLink,ConditionLink,MiniList,BrowseCard,IndexHead,EmergencyPanel}.tsx`; rewrite `components/patient/doctors/{DoctorIndex (from DoctorList),DoctorEntry,DoctorProfile,ProfileFilters,ConditionPills}.tsx` (`ProfileFilters` is the one client component; `DoctorAvatar`, `MemberAddedBadge`, `NotVerifiedBadge` replaced by the shared ones), `facilities/{FacilityIndex,FacilityEntry,FacilityProfile,FacilityAccountRow}.tsx`, `topics/{TopicIndex,ConditionPage,PlacesPanel,FreqList}.tsx`; extend `doctors/directory-test-support.ts` with the VM builders, keeping its existing exports. CSS: U46's block in `apps/web/src/styles/patient.css`, each rule with `/* added: U46 <reason> */`, T-011 tokens only, no motion (frontend-components § 7). i18n: the keys of frontend-components § 8 in both `packages/i18n/messages/en.json` and `bn.json` in the same commit (Bengali marked for the owner's review, FD-042); `label.limitedDataWhy` takes `{threshold}`; `profile.list.orderNote` and `facility.orderNote` stay until U50. Then the component tests of frontend-components § 9, each in `en` and `bn` with the real dictionaries (index order and Bengali digits, member-added mark, profile block order, omitted facts and "Not provided", distributions with no `%`, filters and the single announcement, anonymous byline, nine criteria, separation callout, siblings, facility names, feedback off, topic index with zero topics, places and `FreqList`, compact emergency panel). Run the web command for these files.
  - Done (2026-11-06): the fifteen shared primitives (the three links as `DoctorLink.tsx`, `FacilityLink.tsx` with `facilityLabel`, `ConditionLink.tsx`; `MemberAdded withWhy` renders the why note), the doctor, facility and topic components on the VMs, the VM builders and `EMERGENCY_CONFIG` in `directory-test-support.ts`, the U46 CSS block, and the keys `facility.notVerified`, `facility.notVerifiedWhy`, `facility.parentOf`, `sentiment.ofTotal`, `label.notProvidedCount`, `profile.showingCount`, `prov.updatedOn`, `condition.countsLine`, `condition.countedFrom`, `emergency.compactLine`, plus `profile.filterRelationship` (the relationship pills' group label, which had no key), with `label.limitedDataWhy` taking `{threshold}`; the Bengali of all of them is for the owner's review (FD-042). Tests: `DoctorIndex`, `DoctorProfile`, `ProfileFilters`, `FacilityDirectory`, `ConditionViews` and `directory.smoke.test.tsx`. ASSUMPTION(U46): the pages still render the demo components until Step 14's page switch, so the four demo files whose names Step 13 takes were renamed (`DemoDoctorEntry`, `DemoDoctorProfile` with its test, `DemoFacilityEntry`, `DemoFacilityProfile`) and the two `[id]/page.tsx` imports follow; `DoctorList`, `FacilityList`, `TopicList`, `TopicProfile`, `DoctorAvatar`, `MemberAddedBadge`, `NotVerifiedBadge` and their tests stay. Step 14 (with Step 12's open page work) deletes all of them in the page-switch commit.
- [x] **Step 14** — Retire the demo code (BR7.1, design § 3), in the same commit as the page switch: delete `demo/facilities.ts` with `demo/facilities.int.test.ts`; from `demo/doctors.ts` delete `listDoctors`, `listPublishedReviewsForDoctor`, `listTopics`, `getTopic`, `taggedWithTopic`, `topicExperienceCount`, `isPublishedTopic` and their tests in `demo/doctors.int.test.ts` and `demo/topics.int.test.ts`; remove the matching lines in `demo/index.ts` and `apps/web/src/server/data.ts` and the types only they used in `contracts/src/view-models/demo.ts`. Before each deletion, `grep -rn "<name>" packages apps` must show no caller left outside the file and its own test; if a caller remains, keep the function and leave it for U50 (record an ISS row). Keep `getDoctor`, `listRecentPublishedReviews`, `listDoctorOptions`, `listSpecialtyOptions` (BR7.2). Do not edit `demo/reviews.ts`, `demo/evidence.ts` or `server/actions/review.ts`.
  - Done (2026-11-06): the grep found no caller outside the retired set, so nothing is left for U50. Deleted `demo/facilities.ts`, `demo/facilities.int.test.ts`, `demo/topics.int.test.ts` (all its tests were on `listTopics`/`getTopic`), the seven functions in `demo/doctors.ts`, the `facilities` lines in `demo/index.ts` and `server/data.ts`, and `DemoFacilityRow`, `DemoFacilityVisit`, `DemoFacilityDetail`, `DemoTopicRow`, `DemoTopicDetail` in `view-models/demo.ts`. In `demo/doctors.int.test.ts` the three `listDoctors` tests and the malformed-id test went; the three card tests (newest first, counts, excerpt) now read through the kept `listRecentPublishedReviews`, so the kept card mapper stays covered. Web: deleted `DemoDoctorEntry`, `DemoDoctorProfile` and its test, `DoctorList` and its test, `DoctorAvatar`, `MemberAddedBadge`, `NotVerifiedBadge`, `DemoFacilityEntry`, `DemoFacilityProfile`, `FacilityList`, `FacilityViews.test.tsx`, `TopicList`, `TopicProfile`, `TopicViews.test.tsx`, and the four demo builders `buildFacilityRow`, `buildFacilityDetail`, `buildTopicRow`, `buildTopicDetail`; `DoctorAvatar.test.tsx` moved to `shared/Avatar.test.tsx` on the shared `Avatar`.
- [x] **Step 15** — Smoke: add `packages/database/src/repositories/directory.smoke.test.ts` (every doctor card has `registrationNotVerified` true; a pending submission marks its doctor; facility isolation holds) and `apps/web/src/components/patient/directory.smoke.test.tsx` (the profile renders "Registration not verified" and, for a marked VM, the member-added badge). Move the `listDoctors`, `listFacilities`, `listTopics` assertions of `demo/demo-slice.smoke.test.ts` onto the module repository reads with the same assertions; remove none (BR8.2).
  - Done (2026-11-06): `repositories/directory.smoke.test.ts` runs the Directory module's `listDoctors` and `getDoctor` over the Pg repositories and `PgUnitOfWork` (every card `registrationNotVerified` in `en` and `bn`; pending marks, approved does not; six facility reviews at the doctor's branch change none of its figures). `directory.smoke.test.tsx` landed in Step 13. In `demo-slice.smoke.test.ts` the three reads now go through `PgDirectoryModuleRepository.listDoctors` (name, member-added mark) with `PgReviewReadRepository.publishedForDoctor` (the published count), `listBranches` and `PgTaxonomyModuleRepository.listTerms`; every assertion kept. `pnpm smoke`: 19 files, 36 tests green.

**Phase E — gate and records**

- [x] **Step 16** — Gate: `timeout 1200 pnpm check` (eleven steps, including the 80% line floor per package) and `timeout 600 pnpm smoke`, both green, with no assertion removed or skipped; `npx impeccable detect apps/web/src --no-advisory` exit 0; `pnpm contrast`, `pnpm contrast:patient` and `pnpm check:motion` clean (part of `pnpm check`). Record counts and coverage before and after.
- [x] **Step 17** — Documents: `docs/implementation/02-data-model.md` §4 and §5, `03-routes-and-contracts.md` §4, the dated note on C6 (amendment, R-04), C7 and C17 in `inception/contract-design/contract-summary.md`, and the `## Amendments — release 1 (FD-105)` section in the T-201, T-202 and T-203 task files.
  - Done (2026-11-06): §4 `facility_branches` gains `own_name_*` and `avatar_hue` (FD-108); §5 `taxonomy_terms` gains `suggested`, `suggested_order` and the open-provisional partial index, with the FD-101 match and the `und-x-icu` collation; 03 §4 gains a "Release 1, as built by U46" line under directory, taxonomy and review; the three dated notes in `contract-summary.md`; one amendments section in each of the three task files.
- [x] **Step 18** — Records: `docs/implementation/ISSUES.md` rows from the next free number (the register ends at ISS-455 today) with `Found in U46 u46-directory`: F1–F9 of design § 9, and the status changes (ISS-222, ISS-157, ISS-268 fixed; ISS-266 won't fix; ISS-161 and ISS-398 unchanged), plus anything found while building. Write `code-summary.md` (owned-path additions with reasons, the final i18n key list, the collation finding, adapters "no change"), `traceability.json` and `source-manifest.json` (literal paths only, no `[`, `]` or `*`; bracketed route paths listed in `code-summary.md` instead). At merge: rebase on `main`, take the next free migration number and FD numbers, regenerate the snapshot and the pins, re-run the gate, squash-merge locally, run `pnpm check` on `main`.
  - Done (2026-11-06): ISS-499 to ISS-515 (F1–F9 as ISS-499 to ISS-507, then the build's findings and ASSUMPTION rows); ISS-157, ISS-222 and ISS-268 set to fixed in U46, ISS-266 to won't fix. `code-summary.md`, `traceability.json` (96 ids) and `source-manifest.json` written; the 15 bracketed route paths are listed in `code-summary.md`. The merge items above stay for the merge, and the ISS ids are re-taken there too if U9 or U11 lands rows first.

## Story and rule traceability

| Step | Rules | Stories |
|---|---|---|
| 1 | BR8.5, FD-106–FD-108 | US6.4 (FD-106, FD-107), US4.3 (FD-108) |
| 2 | BR8.1 | — |
| 3–4 | BR2.1, BR2.2, BR2.9, BR2.10, BR3.8, BR6.4 | US4.1, US4.3, US5.3, US6.4 |
| 5–6 | BR2.3–BR2.5, BR3.1, BR3.11, BR4.1, BR6.6 | US4.1, US4.3, US6.4 |
| 7–9 | BR1.5, BR2.1–BR2.13, BR3.2–BR3.10, BR4.3–BR4.6, BR5.1–BR5.8, BR6.1–BR6.5 | US4.1, US4.2 (FD-100 member-added doctor), US4.3, US5.3, US6.4 |
| 10 | BR1.1–BR1.7, BR2.6, BR2.7, BR2.13, BR3.11, BR4.2, BR4.4, BR4.5, BR5.2, BR5.6, BR5.7, BR7.3, BR8.4, BR8.6 | US4.1, US4.2, US4.3, US5.3, US6.4 |
| 11 | BR6.6 | — |
| 12 | BR2.12, BR3.5, BR9.3 | US4.1, US4.3, US5.3 |
| 13 | BR2.1–BR2.5, BR2.10, BR3.4, BR3.6, BR9.1, BR9.2, BR9.4 | US4.1, US4.3, US5.3, US6.4, US2.4 |
| 14 | BR7.1, BR7.2, BR7.4 | US4.1, US4.3, US5.3 |
| 15 | BR8.2 | US4.1, US4.2 |
| 16 | BR8.3, BR9.2 | US2.4 |
| 17–18 | BR6.4, BR8.5 | — |

Deferred to release 2 (FD-105), not built: AC4.1.5, AC4.2.1–AC4.2.5, AC5.3.3, AC5.3.4 and T-202's "Redirect" row (design § 16, `traceability.json`).

## Owned paths and shared files

Owned (`unit-of-work.md` § U46): `packages/domain/src/{directory,taxonomy}/`, `packages/domain/src/review/policies.ts` (`isLimitedData`, `distribution` only), `packages/application/src/modules/{directory,taxonomy}/`, the read-side Review stub in `packages/application/src/modules/review/` (the four queries and the two port implementations), `packages/application/src/ports/repositories/{directory,taxonomy}.ts` and the read methods of `review.ts`, `packages/application/src/ports/public-evidence-count.ts` (frozen at merge), `packages/contracts/src/view-models/{doctor,facility,condition,experience-card}.ts`, `packages/database/src/repositories/{directory,taxonomy}.ts` and the read methods of `review.ts`, its migration, `packages/database/src/demo/{doctors,facilities}.ts` and the demo topic functions, `packages/test-support/src/seed/seed-directory.ts`, `apps/web/src/app/[locale]/(patient)/{doctors,facilities,topics}/`, `apps/web/src/components/patient/{doctors,facilities,topics,shared}/`.

Recorded additions (design § 11, each named in `code-summary.md`): `packages/database/src/schema/{taxonomy,directory}.ts`, `migrations/meta/`, the four new repository files and their tests, `migrations.int.test.ts` and `validator-probes.int.test.ts` pins, `demo/{facilities.int.test.ts,topics.int.test.ts,doctors.int.test.ts,demo-slice.smoke.test.ts}`, `demo/evidence.adversarial.test.ts` and `demo/reviews.int.test.ts` (one read each, R-01), `packages/contracts/src/view-models/experience.ts` (re-export), `packages/contracts/src/schemas/{directory,taxonomy}.ts`, `packages/contracts/src/ids.ts`, `packages/test-support/src/fakes/{directory-repositories,directory-ports}.ts` and `directory-repositories.test.ts`, `packages/test-support/src/seed/seed.int.test.ts`, `apps/web/src/lib/doctor-filters.ts` and its test, `apps/web/src/app/pages.test.tsx` (six rows and one mock entry removed, R-02).

Shared files (append-only, own block or own line, per `unit-of-work-dependency.md`):

- `packages/i18n/messages/en.json` and `bn.json`: U46's keys only, both files in one commit.
- `apps/web/src/server/container.ts`: U46's module block and the interim `PublicEvidenceCount` binding (U48 swaps it later).
- `apps/web/src/server/data.ts` and `packages/database/src/demo/index.ts`: only the binding and export lines of the retired demo functions are removed.
- `packages/contracts/src/view-models/demo.ts`: only the types the retired functions used are removed.
- `apps/web/src/styles/patient.css`: one `/* added: U46 … */` block.
- Barrels: `packages/*/src/index.ts`, `packages/application/src/ports/index.ts`, `packages/test-support/src/fakes/index.ts`: one line per module.
- Seed: `seed-directory.ts` is U46's; `seed.ts` and `seed-content.ts` are not edited.
- `docs/implementation/ISSUES.md`: new rows and status updates of the rows named in Step 18 only.
- `docs/status/decision-log.md`: FD-106 to FD-108 appended (numbers taken at merge).

Migrations: written under a working name; at merge, after rebasing on `main`, the migration takes the next free number, the drizzle snapshot and `_journal.json` are regenerated and the pinned counts updated (U11, U47 or U48 may land one first).

Shared demo code is deleted only when a grep shows no caller left; otherwise it stays and U50 removes it (F6: `getDoctor`, `listRecentPublishedReviews`, `listDoctorOptions`, `listSpecialtyOptions` stay for U20, U22 and U47).

Not edited: `packages/database/src/repositories/not-implemented.test.ts`, `packages/test-support/src/fakes/{repositories.ts,repositories-superset.test.ts}`, `packages/database/src/demo/{reviews.ts,evidence.ts}`, `apps/web/src/server/actions/review.ts`, `components/patient/{home,experience,compose,evidence,comments}/`.

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

Applicable layers: data model and database behaviour (the migration, the seed), repository and data access (the four new repository files), business logic (domain, the Directory and Taxonomy modules, the Review stub), API and endpoint (the six page loaders and the container wiring), and frontend behaviour (the shared primitives and the directory, facility and topic components). Environment and build configuration: no change (no new dependency, no new test project). Adapters: no change.

## Design decisions taken

Questions 1–14 were decided in the Functional Design under the owner's delegation of 2026-11-04 and are listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. The four review points above follow the design's own resolutions. U46 is not in the high-risk class, so no adversarial tests or written sign-off are required; collaborators stay off.
