# Code Generation plan — U47 `u47-reviews` (T-301 + T-306 + T-307)

## Summary

- Builds: the Review module core (encrypted minimal drafts, `review.publish` and `facilityReview.publish` in one transaction through U11's `personaFor`, U46's `addMemberDoctor` and `ensureProvisionalTerm`, the projection, the four C9 seams with the pinned `Tx`-first calling convention), the four-step composer at `/write` behind U9's `ContributionGate`, the experience page with its three self-fetching slots, the experiences index, the author page and the own-review list on `/me`, and the retirement of the demo slice's review write path
- Touches: U47's owned paths only (`packages/domain/src/review/`, `packages/application/src/modules/review/` except U46's files, the write side of `ports/repositories/review.ts`, `packages/database/src/repositories/review-module.ts`, `packages/contracts/src/{schemas/review.ts,view-models/experience.ts,view-models/composer.ts}`, `packages/test-support/src/{builders/review.ts,fakes/review-repository.ts}`, `packages/database/src/demo/reviews.ts`, the `write/`, `authors/` and `experiences/` routes except `[id]/edit/`, `components/patient/{compose,experience}/` except `EditForm.tsx`, `profile/OwnReviewList.tsx`, `server/actions/review.ts`, and the three slot files), plus the recorded additions and append-only shared files listed below, and the records
- Tests: domain rules (every `minimumFieldsMissing` branch, tags, period, title, language, criteria, no-score), application commands and queries on `test-support` fakes (drafts, publish in each mode and every refusal, limiter after validation, anonymous new doctor, rollback, audit and outbox, projection denylist, the four seams), `*.int.test.ts` for every repository method and a `web-int` publish-through-the-container test with the anonymity table checks, component and page tests in `en` and `bn`, moved demo tests, and two smoke files (publish and read back; the page renders its three slots)

## Inputs

- Functional Design (reviewed READY, iteration 1): `construction/u47-reviews/functional-design/`: `functional-spec.md` (§ 2 module surface and the pinned calling convention § 2.1, WF1–WF10, § 4 state transitions, § 5 files, § 7 owned paths, § 9 demo retirement, § 10 tests, § 11 ISS rows, § 12 FD rows), `entities.md` (ENT-001–ENT-013), `rules.md` (BR1.1–BR9.4), `frontend-components.md` (hierarchy, files, composer, slots, message keys), `functional-design-questions.md` (Q1–Q27), `traceability.json`, and `reviews/review-01.md`.
- Unit entry U47 in `inception/units-generation/unit-of-work.md` (responsibilities, seams for U22/U48/U49, owned paths, stories, depends on U46, U11, U9).
- Task files `docs/implementation/tasks/T-301-*.md`, `T-306-*.md`, `T-307-*.md`, read together.
- `main` after U9, U11 and U46 merge (batch 2). U47 is not in the high-risk class: no adversarial step and no sign-off step; the anonymity checks run in the normal suite (design § 10).

## Review points already settled in the design

Review 01 R-01 to R-07 were decided under the owner's delegation of 2026-11-04 and are written into the design. This plan builds them as written:

1. **R-01:** `ReviewCtx = Tx`, `ReviewSeams`, `ReviewModule`, `createReviewModule(deps)`, reached through `getContainer().review` and seams inside `c.ports.unitOfWork.read(...)` (`functional-spec.md` § 2.1, ENT-013) — Steps 21, 30, 36.
2. **R-02:** option A, BR3.12: an anonymous publish with a new doctor is refused with `review.anonymous_new_doctor` and writes nothing — Steps 9, 26, 33, 38, 45.
3. **R-03:** the limiter is hit only after the domain checks pass (BR1.3) — Steps 26, 33.
4. **R-04:** "eligible" is U46's imported predicate, doctor join included — Steps 16, 22.
5. **R-05:** the edit link shows only for quick reviews, `ASSUMPTION(U47)`, and two `S4` rows for U22 — Steps 48, 58.
6. **R-06:** the exact files of § 5 (`review-module.ts`, the port beside U46's read interface, one export line in U46's `modules/review/index.ts`) — Steps 13, 30.
7. **R-07:** live drafts are capped at 10 per account (BR2.6, `errors.review.draftsFull`) — Steps 14, 23, 32.

## Where it runs

- The Unit runs in its own git worktree on its own Bolt branch `bolt/u47-reviews`, cut from `main` after U9, U11 and U46 have merged (batch 2), under the swarm (FD-094). The orchestrator assigns a test database (`rogikotha_wN_test`, as U9 used; the reset guard accepts only names ending in `_test`); `DATABASE_URL_TEST` in the worktree points at that one database only, never at another worktree's.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).
- There is no GitHub Actions workflow and no CI (FD-102). The gate is local only: `pnpm check` and `pnpm smoke` on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths and the listed shared files, after reading `git diff --cached`.
- The switch and the demo deletion land in one commit (design § 9): Steps 36–57 are committed together, so every demo flow works at every commit on `main`.

## Steps (test-after, per the Testing Contract)

**Phase A — baseline, decisions and runner**

- [ ] **Step 1** — Baseline in the worktree on `bolt/u47-reviews`. Confirm `DATABASE_URL_TEST` names the assigned database. Run `pnpm infra:up`, `pnpm build` once (typed routes), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record the test-file and test counts and the line coverage of `domain`, `application`, `contracts`, `database`, `test-support` and `apps/web`. Read the open `docs/implementation/ISSUES.md` rows in the review, compose and experience areas (among them ISS-269). An open `S1` in the area stops the Unit.
- [ ] **Step 2** — FD rows before any code (design § 12, WF10 step 2): append the four rows to `docs/status/decision-log.md`, each "decided by the agent under the owner's delegation of 2026-11-04": (1) FR46 checkboxes deferred, AC6.2.3 narrowed to its sentiment half; (2) release-1 Reviewer's labels are the prototype's three codes, stored non-code labels shown as written; (3) facility visit accounts are named or pseudonymous only; (4) the author persona `persona:<id>` is the actor of publish audit rows and `review_versions.actor_id`. Numbers: the next free after U46's FD-106..FD-108 (so FD-109..FD-112 if nothing else lands first); renumber at merge time if another Bolt took them. Add the dated note for row 4 to `docs/implementation/01-conventions.md` §5.
- [ ] **Step 3** — Dependency check: read `docs/status/dependency-check-log.md`. U47 adds no dependency (design WF10 step 1); confirm that `package.json` files gain none. Append an entry only if a dependency turns out to be needed (then stop and ask first).
- [ ] **Step 4** — Check the merged seams against the design's assumptions (`functional-design-questions.md` § Assumptions) with `git grep` on the rebased branch: U11's `personaFor`, `publicProjection(s)`, `publicPersonaIdsByUsername`, `IdentityOwnership` (`packages/application/src/modules/identity/`); U46's eligibility predicate in `packages/database/src/repositories/review-reads.ts`, the visible-doctor and visible-branch predicates and `memberAddedNotConfirmed` in `repositories/directory-module.ts`, `listExperienceCards` and its params, `directory.addMemberDoctor`, `taxonomy.ensureProvisionalTerm`, the `PublicEvidenceCount` port and `modules/review/index.ts`; U9's `ContributionGate`, `getContributionAccess` and `requireContributor`. Record every name that differs, and every additive change it forces, in this step's note as an owned-path addition.
- [ ] **Step 5** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`; projects `domain`, `contracts`, `application`, `test-support`, `database`, `web`, `web-int`) and confirm the unit-scoped commands in `unit-test-instructions.md`. Run the existing review tests with them (`apps/web/src/server/actions/review.test.ts`, `components/patient/compose/`, `components/patient/experience/`, `packages/database/src/demo/reviews.int.test.ts`) and record the counts before any change.

**Phase B — domain (business logic, pure)**

- [ ] **Step 6** — Create `packages/domain/src/review/review.ts`: `graphemeLength` (`Intl.Segmenter`), `minimumFieldsMissing` (BR3.2–BR3.4, BR3.11, items collected in the fixed order), `tagRuleSatisfied` (BR3.3, Not sure counts, 20-tag limit), `periodValid` and the private exact date check (BR3.4). Keep U46's two policy functions untouched.
- [ ] **Step 7** — Add to `review.ts`: `deriveTitle` (BR3.6, grapheme-safe), `detectLanguage` (BR3.7), `orderedSections` (BR5.4, empty sections omitted), and the review constants (sentiment optional, `REVIEW_TAG_MAX = 20`). Create `packages/domain/src/review/facility-review.ts` with `criteriaValid` (BR3.10, nine criteria, each `good | mixed | poor` or absent). Append the export lines to the domain review barrel U46 created (or `packages/domain/src/index.ts`, append-only).
- [ ] **Step 8** — Write and run `packages/domain/src/review/review.test.ts` and `facility-review.test.ts`: every `minimumFieldsMissing` branch in its order, the tag rule (none, Not sure, 20, 21), period and exact date (future, before period, valid), `deriveTitle` with Bengali graphemes, `detectLanguage` (`bn`, `en`, mixed), `orderedSections`, `criteriaValid` (unknown key, bad value, empty).

**Phase C — contracts**

- [ ] **Step 9** — `packages/contracts/src/schemas/review.ts`: `DraftPayload` (ENT-006) replacing `payload: unknown`, `SaveDraftInput`, `DiscardDraftInput`, `PublishReviewInput` (shape kept), the three Reviewer's label codes as an `as const` list (FD row 2), and the identity-mode enum reuse. Leave `ListExperiencesInput` and the follow-up, correction, delete and restore inputs as they are. In `packages/contracts/src/errors.ts` (append-only) add `review.anonymous_new_doctor` (BR3.12).
- [ ] **Step 10** — `packages/contracts/src/view-models/experience.ts`: `ExperiencePageVM` (ENT-007) without the T-003 stub fields `likes`, `dislikes`, `identityLabel`, `tombstone`, `followUps`, `evidenceGroups`; `PageBylineVM` (ENT-008); `PreviewVM = ExperiencePageVM`; `OwnReviewVM` (ENT-011, the shape of `DemoOwnReviewRow`); keep U46's `ExperienceCardVM` re-export. `view-models/composer.ts`: `ComposerVM` (ENT-009) and `DraftSummaryVM` (ENT-010). Fix every compile error the removed fields cause in owned files only; record any outside caller.
- [ ] **Step 11** — `packages/application/src/ports/audit-writer.ts` (recorded addition): `AuditActor` gains `persona:${string}` (FD row 4). No migration: `audit_events.actor` is text.
- [ ] **Step 12** — Write and run `packages/contracts/src/schemas/review.test.ts`: `DraftPayload` lenient parse, `PublishReviewInput` requires `attestation: true`, the label code list; and a `no-score` test that `DraftPayload`, `ExperiencePageVM` and the facility criteria carry no numeric judgement field (BR9.4).

**Phase D — repository / data access**

- [ ] **Step 13** — Port: add `ReviewModuleRepository` to the write side of `packages/application/src/ports/repositories/review.ts`, beside U46's read interface, with the methods of design § 5 (drafts, reference ids, publish inserts, eligible read, seams, lists). Export it through the ports barrel (append-only).
- [ ] **Step 14** — Create `packages/database/src/repositories/review-module.ts` with `PgReviewModuleRepository`, draft methods: `insertDraft`, `updateOwnDraft`, `countOwnLiveDrafts`, `findOwnLiveDraft`, `listOwnLiveDrafts` (newest 10), `deleteOwnDraft`. Every query filters by the owning account and `expires_at > now`; `payload_enc` is stored and returned as bytes only (encryption happens in the module through the `crypto` port).
- [ ] **Step 15** — Add to `review-module.ts`: `visibleDoctorIdByPublicId`, `visibleBranchIdByPublicId` (U46's imported predicates), `activeTermIdsByPublicIds`, and the publish inserts `insertReview` (with `exact_date_enc`), `insertTags`, `insertVersion`, `insertFacilityReview`. All take the caller's `Tx`.
- [ ] **Step 16** — Add the reads: `findEligibleByPublicId` (review, tags with term names in the locale, doctor reference with `memberAddedNotConfirmed`; never selects `exact_date_enc`), `idForPublicId`, `authorPersonaIdOf`, `isEligible`, `lastCorrectionAt`, `countEligible`, `listByPersonas`, `existsEligibleOfDoctorByPersonas`. Eligibility is U46's predicate from `review-reads.ts`, imported, never rewritten (R-04).
- [ ] **Step 17** — U46's `listExperienceCards` (recorded addition, in the file found in Step 4): add the optional `personaIds` and `excludePublicId` filters, additive only; existing callers unchanged.
- [ ] **Step 18** — Write and run `packages/database/src/repositories/review-module.int.test.ts`, drafts part: insert, update own, another account's draft not found, expired draft not found, count and list newest first, delete own only, a seeded plaintext draft is returned as bytes and not deleted.
- [ ] **Step 19** — Extend `review-module.int.test.ts`, publish and reads part: inserts in one `Tx` and a rolled-back `Tx` leaves no review, tag or version; `findEligibleByPublicId` refuses hidden, removed, deleted and merged-doctor reviews; no public read selects `exact_date_enc`; each seam method; `countEligible`, `listByPersonas`, `existsEligibleOfDoctorByPersonas`. Add the two filter rows to U46's `listExperienceCards` int test (append-only rows).
- [ ] **Step 20** — Test support: extend `packages/test-support/src/builders/review.ts` with `aDraftPayload()` (quick, detailed and facility variants) and the release-1 `aReview()` fields; create `packages/test-support/src/fakes/review-repository.ts` implementing `ReviewModuleRepository`; add one export line to `fakes/index.ts`. Add their rows to `builders/builders.test.ts` and `fakes/fakes.test.ts`. Synthetic data only.

**Phase E — application module (business logic)**

- [ ] **Step 21** — `packages/application/src/modules/review/ports.ts` (`ReviewModulePorts`, ENT-012: repository, unit of work, crypto, clock, ids, rate limiter, audit, outbox, config, identity seams, `addMemberDoctor`, `ensureProvisionalTerm`, `listExperienceCards`, `publicProjection(s)`, `publicPersonaIdsByUsername`) and `module.ts` (`ReviewCtx = Tx`, `ReviewSeams`, `ReviewModule`, § 2.1). Create `limits.ts`: publish 5 per 24 h, draft save 300 per hour, 10 live drafts, 30-day draft life (C18 constants).
- [ ] **Step 22** — Seams: `queries/review-id-for-public-id.ts`, `is-review-author.ts` (through `IdentityOwnership`, the same answer for another account and an unknown id), `is-review-published.ts` (eligible predicate), `author-identity-mode-of.ts` (a bare mode string), `last-edited-at.ts`. Plain functions taking `(tx, input)`; they never open a transaction and never throw for an expected case (BR6.1–BR6.3, BR6.7, BR6.9).
- [ ] **Step 23** — `commands/save-draft.ts` (BR1.1, BR1.4, BR2.1, BR2.2, BR2.6: rate limit, lenient parse, encrypt, insert with the 10-draft cap or update own, `expires_at = now + 30 d`) and `commands/discard-draft.ts` (BR2.6, own draft only, otherwise `not_found`).
- [ ] **Step 24** — `queries/get-draft.ts` (BR2.3: expired or unreadable is `not_found`, unreadable is logged with `code` and `correlationId` only) and `queries/list-own-drafts.ts` (BR2.4, `DraftSummaryVM[]`).
- [ ] **Step 25** — `projection.ts`: pure `toExperiencePage(review, {doctor, tagNames, byline, related})` and `toFacilityAccount(payload, deps)` (BR5.2–BR5.9: absent judgements are Not provided, claims under Reviewer's label, `orderedSections`, month and year only, byline per persona kind, `otherByAuthor` empty for anonymous, no private or numeric field).
- [ ] **Step 26** — `commands/publish.ts` (WF4): authorize (confirmed, not restricted, BR1.2), load own live draft, domain checks in order (attestation, minimum fields, identity mode, BR3.12 anonymous new doctor, judgements and labels; a refusal writes nothing and is not counted), then the limiter (BR1.3), then in one `Tx`: ids and `personaFor`, `addMemberDoctor` only for named or pseudonymous, chip terms and `ensureProvisionalTerm`, insert review, tags and version 1 (actor = persona id), audit with `persona:<id>`, outbox `review.published {reviewId, doctorId, branchId: null}`, delete the draft (BR4.1–BR4.7, BR4.9).
- [ ] **Step 27** — `commands/facility-review-publish.ts` (WF5, BR3.10, BR4.8): `forbidden` when facility feedback is off, anonymous refused, shared publish limit after validation, `personaFor`, insert `facility_reviews`, audit, delete the draft, no outbox event.
- [ ] **Step 28** — `queries/get-experience.ts` (BR5.1–BR5.9: eligible read, `publicProjection`, the three related lists through `listExperienceCards` with `excludePublicId`, then `toExperiencePage` in `actor.locale`) and `queries/count-experiences.ts` (BR7.4).
- [ ] **Step 29** — `queries/author-cards.ts` (BR7.2, WF8: unknown username and no public reviews give the same empty answer), `queries/list-own-reviews.ts` (BR1.5, BR7.3, every state except deleted, newest first), `queries/has-own-review-of-doctor.ts` (BR7.5), `queries/preview.ts` (BR5.10, WF3: transient review, minimum not enforced, anonymous byline `{alias: null}`).
- [ ] **Step 30** — Factory `createReviewModule(deps)` in `packages/application/src/modules/review/module.ts` (commands with `defineCommand`, queries with `defineQuery`, the seams closed over the repository and `IdentityOwnership`). Add the one export line for `createReviewModule`, `ReviewModule`, `ReviewSeams`, `ReviewModulePorts` to U46's `modules/review/index.ts` (recorded addition).
- [ ] **Step 31** — Taxonomy (recorded addition): `packages/application/src/modules/taxonomy/queries/list-specialties.ts` and its line in the taxonomy factory, with one test row in that module's test file (Q19).
- [ ] **Step 32** — Write and run `modules/review/drafts.test.ts` and `seams.test.ts` on fakes: `saveDraft` create, update, another account's draft, expired, rate limited, the eleventh live draft refused with `errors.review.draftsFull` while saving an existing one still works; `discardDraft` own and another account's; `getDraft` unreadable; the four seams, `isReviewAuthor` false for another account's anonymous review and for an unknown id, `authorIdentityModeOf` `anonymous`, `null` for an unknown id, never a persona or account id.
- [ ] **Step 33** — Write and run `modules/review/publish.test.ts`: the happy path in each identity mode; each refusal (unconfirmed, restricted, rate limited, attestation, every `min_fields` item, bad exact date, bad label); five `min_fields` refusals then a valid publish succeeds (BR1.3); anonymous with a new doctor refused with `review.anonymous_new_doctor` and `addMemberDoctor` never called; rollback when `addMemberDoctor` or `ensureProvisionalTerm` fails; one audit assertion with the `persona:` actor; the outbox payload; the draft deleted only on success.
- [ ] **Step 34** — Write and run `modules/review/facility-review-publish.test.ts` (happy path, feature off, anonymous refused) and `projection.test.ts` (Not provided, Reviewer's label, section order, month and year only, each byline kind, `otherByAuthor` empty for anonymous, a key-denylist deep scan over generated reviews, BR5.9), and `queries.test.ts` (`getExperience` `not_found`, `authorCards` empty for unknown and anonymous-only, `listOwnReviews`, `hasOwnReviewOfDoctor`, `preview` in each mode).

**Phase F — web server (API / endpoint)**

- [ ] **Step 35** — `apps/web/src/server/container.ts` (U47's append-only block): add `review: ReviewModule` to `WebContainer`, build `createReviewModule(deps)` from `PgReviewModuleRepository`, the identity seams, `directory.addMemberDoctor`, `taxonomy.ensureProvisionalTerm` and U46's card query. Add one row to `server/container.test.ts` that the container exposes `review` with the four seams.
- [ ] **Step 36** — `apps/web/src/server/actions/review.ts`: add `saveDraftAction`, `discardDraftAction` (revalidates `/write`), `previewAction`, `duplicateHintAction`, `publishDraftAction` (redirect to `/{locale}/experiences/{publicId}?published=1`; `review.anonymous_new_doctor` mapped to `errors.review.anonymousNewDoctor` on the identity field) and `publishFacilityVisitAction` (redirect to `/{locale}/facilities/{branchPublicId}`), each through `getActor()` and `runCommand(...)`, answering message keys; `revalidatePath('/', 'layout')` after a publish. Delete `publishReview`, `ComposeInput`, `NewDoctorInput`, `ComposeCommon`, `personaFor`, `languageOf` and the `Compose*` types. Keep `saveReviewEdit` and its helpers unchanged for U22.
- [ ] **Step 37** — Rewrite `apps/web/src/server/actions/review.test.ts` for the new actions (each `ok` and refusal mapping, a signed-out publish writes nothing, a persona of another account is refused) and keep the `saveReviewEdit` rows unchanged. Move the publish rows of `server/actions/ownership.adversarial.test.ts` to the module path with the same expectations.
- [ ] **Step 38** — Write and run `apps/web/src/server/review-module.int.test.ts` (`web-int`, assigned test database): publish a quick review through `getContainer().review` and read it back; a rollback leaves no persona, term or doctor; an anonymous publish with a `newDoctor` gets `review.anonymous_new_doctor` and leaves `profile_submissions`, `doctors`, `reviews` and `persona_links` unchanged; no `profile_submissions.created_doctor_id` has an anonymous review; two anonymous reviews by one account have different aliases and appear neither on the author page nor in each other's related lists (BR3.12, design § 10 anonymity checks).

**Phase G — i18n and UI (frontend behaviour)**

- [ ] **Step 39** — i18n: add the new keys of `frontend-components.md` § 8 to `packages/i18n/messages/en.json` and `bn.json` in the same commit, and reword `compose.identity.anonNote` (BR8.12). Bengali drafted and flagged for the owner's bilingual review at U50 (FD-042). Regenerate `packages/i18n/src/keys.ts` with its script, never by hand, and again after every rebase. Run `timeout 300 pnpm i18n:check`. If the parity check refuses an `errors.*` key without an ErrorCode, follow U9's precedent and record the key change as `ASSUMPTION(U47)`.
- [ ] **Step 40** — Composer logic: `components/patient/compose/composer-reducer.ts` (state of § 4, prototype toggles), `use-autosave.ts` (1.5 s debounce, immediate on step change, one save in flight, sequence numbers drop older answers, backoff 5/15/30 s, `beforeunload` only while pending or failed, stops while publishing), `safety.ts` (pure: phone pattern in Latin and Bengali digits, emergency words in `en` and `bn`).
- [ ] **Step 41** — Write and run `composer-reducer.test.ts`, `use-autosave.test.ts` (fake timers) and `safety.test.ts` (both scripts, spaces and dashes, no false positive on a year).
- [ ] **Step 42** — Composer shell: `Composer.tsx`, `StepRail.tsx` (focus to the step `h2[tabindex=-1]`, `useAnnounce`), `PreviewAside.tsx` (`details` at 360 px, open on step 4), `DraftList.tsx` (server; Continue, Discard with confirmation, the 10-draft message).
- [ ] **Step 43** — Step 1 components: `StepCare.tsx` (target switch only when branches exist, doctor `select` preselected only from `?doctor=`, add-doctor toggle disabled while anonymous with `compose.anonNewDoctor`, relationship, period, private exact date, mode) and `NewDoctorFields.tsx` (BR3.11, BR8.9).
- [ ] **Step 44** — Step 2 components: `StepStory.tsx` (title, quick story with grapheme counter or four sections, facility story), `TagPicker.tsx` (suggested chips with `aria-pressed`, free text with Add and Enter, provisional title, Not sure, 20-tag counter, announcements), `SafetyChecks.tsx` (static findings, `data-static` with an emergency finding).
- [ ] **Step 45** — Steps 3 and 4: `StepHowItWent.tsx` (sentiment, outcome, three `claim.*` toggles; facility: nine `crit.*`; no score anywhere) and `StepCheck.tsx` (identity choice with names, no anonymous option for a facility, `compose.anonNewDoctor` with links and Publish disabled, four attestation boxes, `aria-describedby` reason, Save and finish later). `FormErrorSummary`, `OptionGroup`, `TextField` and `period.ts` are reused unchanged.
- [ ] **Step 46** — Write and run `components/patient/compose/composer.test.tsx` and `steps.test.tsx` in `en` and `bn`: each step, the anonymous new-doctor state, the summary of missing fields with links, Publish disabled until the four boxes, the draft list and the 10-draft message.
- [ ] **Step 47** — `apps/web/src/app/[locale]/(patient)/write/page.tsx` (WF1: gate first and no composer data loaded when not `allowed`; `returnTo` with `?doctor=`; parallel loads; `?draft=` with `compose.draftMissing`; `documentTitle('compose')`, indexable). Rewrite `write/page.test.tsx` (mock `@/server/actions/account`): gate in each access state, the composer when allowed, a missing draft. Change the two `/write` rows of `app/[locale]/(patient)/signed-out.adversarial.test.ts` from "redirected to sign in" to "shown the gate", still asserting no doctor list is read and `returnTo` stays on `/write` (BR8.1, reason in the hand-off).
- [ ] **Step 48** — Experience body components in `components/patient/experience/`: `ExperienceBody.tsx` (page and preview modes, `lang` on foreign text), `Flags.tsx`, `ReviewerLabels.tsx`; `Byline.tsx` gains the alias form (anonymous: `byline.anonSentence`, alias on the page variant only, never a link or initials); `AuthorTools.tsx` gains `editHref`.
- [ ] **Step 49** — Page components: `ExperiencePage.tsx` (block order, slots get only `reviewPublicId`, `AuthorTools` only when `isAuthor`, `editHref` only when `vm.reviewKind === 'quick'` marked `ASSUMPTION(U47)`), `ExperienceMargin.tsx`, `RelatedGrid.tsx`, `PublishedNote.tsx` (one `PublishTick`, announced once), `Pager.tsx`, `AuthorProfile.tsx`.
- [ ] **Step 50** — Slots (C16, props frozen at merge): `components/patient/comments/CommentThread.tsx` becomes the self-fetching `{reviewPublicId}` slot over the demo `comments.listComments`, with today's markup moved unchanged to `CommentThreadView.tsx`; new `components/patient/evidence/EvidenceSection.tsx` (count through `PublicEvidenceCount`, `EvidenceNote` or `label.noDocuments`); new `components/patient/review-history/ReviewHistory.tsx` (`lastEditedAt`, `experience.edited` month and year, or nothing). Each resolves the id with the § 2.1 call shape and renders its empty state on `null`.
- [ ] **Step 51** — Pages: rewrite `experiences/[id]/page.tsx` (WF6: `stripSlug`, `cache` shared with `generateMetadata`, `notFound()` before markup, one `reviewIdForPublicId` and one `isReviewAuthor`, no `loading.tsx` under `[id]`); rewrite `experiences/page.tsx` and add `experiences/loading.tsx` (WF7: 20 per page, 307 on a bad cursor, count line, static skeleton); replace the placeholder `authors/[username]/page.tsx` (WF8, `noindex`, 200 for an unknown username).
- [ ] **Step 52** — `/me` (recorded addition): in `app/[locale]/(patient)/me/page.tsx` replace `accounts.listOwnReviews(...)` with `runCommand(getContainer().review.listOwnReviews, {})`; change the prop type of `components/patient/profile/OwnReviewList.tsx` to `OwnReviewVM[]`. `ProfileWorkspace.tsx` is not touched.
- [ ] **Step 53** — CSS: append U47's section to `apps/web/src/styles/patient.css` with the prototype classes the new components use (`.c-steps`, `.c-modes`, `.c-side`, `.preview-card`, `.chapters`, `.a-margin` and others found missing), on FD-091 tokens, each new class marked `/* added: U47 reason */`; motion only through T-011's tokens and reduced-motion rules (BR8.11).
- [ ] **Step 54** — Write and run the experience tests in `en` and `bn`: `components/patient/experience/experience.test.tsx` (`ExperienceBody` both modes, each byline, Flags with Not provided, Reviewer's labels, edit link only for quick, `AuthorTools` only for the author), `components/patient/experience/slots.test.tsx` (the three slots with data, empty and error states), and the page tests `experiences/[id]/page.test.tsx`, `experiences/page.test.tsx`, `authors/[username]/page.test.tsx`, `me/page.test.tsx` (rewritten for the module path).

**Phase H — demo retirement (same commit as the switch)**

- [ ] **Step 55** — `packages/database/src/demo/reviews.ts`: delete `createQuickReview`, `insertQuickReview`, `assertPersonaOfAccount`, `createQuickReviewWithNewDoctor`, `nameKeyOf`, `columnNameKey`, `hueOf`, `createPseudonymousPersona`; keep `getReviewByPublicId`, `getOwnReviewForEdit`, `updateOwnReview`, `snapshotOf`, `personasOf`; rewrite the file header to list the remaining functions and the Unit retiring each (U22, U48, U49). In `demo/doctors.ts` delete `listDoctorOptions` and `listSpecialtyOptions`; delete `listRecentPublishedReviews` only if `git grep` shows U20 already switched the home. Before each deletion run `git grep -n <name> -- apps packages` and delete only when no caller is left; otherwise leave it for U50 with an ISS row. Move the affected rows of `demo/reviews.int.test.ts` (publish and FD-100 rows, expectations kept on the module path in Step 19 and Step 38) and `demo/doctors.int.test.ts`.
- [ ] **Step 56** — Delete `components/patient/compose/ComposeForm.tsx`, `ComposeForm.test.tsx`, `ComposePreview.tsx` and the compose parts of `compose-test-support.ts`; delete `components/patient/experience/ExperienceDetail.tsx`, `ExperienceDetail.test.tsx`, `ExperienceIndex.tsx`, `ExperienceIndex.test.tsx`, `ExperienceRow.tsx`, after a `git grep` shows no caller. Keep `EditForm.tsx`, `FormErrorSummary.tsx`, `OptionGroup.tsx`, `TextField.tsx`, `period.ts`, `Byline.tsx`, `people.ts`.
- [ ] **Step 57** — Move the shared tests that import deleted code: the publish assertion of `packages/database/src/demo/demo-slice.smoke.test.ts` (to the new smoke file in Step 58, with the reason recorded; the suite does not shrink) and the `/write`, `/experiences`, `/experiences/[id]`, `/me` rows of `apps/web/src/app/pages.test.tsx` (change only the rows that fail, record each edit in this step's note). Run the unit-scoped commands for every moved file.

**Phase I — smoke, gate and records**

- [ ] **Step 58** — Smoke: add `apps/web/src/server/review-module.int.smoke.test.ts` (`web-int`: publish a quick review through the module and read it back through `getExperience`) and `apps/web/src/components/patient/experience/experience-page.smoke.test.tsx` (the page renders its three slots, in `en` and `bn`). Run `timeout 600 pnpm smoke`; record the file and test counts against Step 1; the suite only grows.
- [ ] **Step 59** — Gate: `timeout 1200 pnpm check` (includes `format:check`, contrast, `contrast:patient` and `check:motion`) and `timeout 600 pnpm smoke`, both green, plus `timeout 600 pnpm test:int`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. Every package stays at or above 80% lines (never lowered, D10); record before and after per package.
- [ ] **Step 60** — Acceptance rows from the T-301, T-306 and T-307 task files and design § 10, recorded expected against observed for Build and Test; rows that need a browser are marked not walked here.
- [ ] **Step 61** — Records:
  - `docs/implementation/ISSUES.md`: the eleven `S4` rows of design § 11, plus every defect, workaround or `ASSUMPTION(U47)` found in Steps 1–60, each with a severity and `Found in U47 u47-reviews`; take the next free `ISS-` numbers at merge time; update `Status` of rows U47 fixes (ISS-269 draft part stays open per § 11).
  - `inception/contract-design/contract-summary.md`: the dated notes of design § 6 (C9 with the § 2.1 convention and the eligibility note, C7, C6, C1 and C19, C16).
  - the T-301, T-306 and T-307 task files: amendments with `FD-0nn:` labels, and the Hand-off (the recorded additions with their reasons, the `/write` gate change, the seams and slots frozen at merge).
  - `code-summary.md`, `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`; the bracketed route paths are listed in `code-summary.md`), and the list of `ISS-` ids found and fixed for the Build and Test record.

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–5 | — (baseline, FD rows, seam check, runner) | — |
| 6–8 | BR3.2–BR3.4, BR3.6, BR3.7, BR3.10, BR3.11, BR5.4 | US6.1 (AC6.1.1, AC6.1.3), US6.2 (AC6.2.1, AC6.2.2), US5.3 (AC5.3.1), US12.1 (AC12.1.3) |
| 9–12 | BR3.8, BR3.12, BR4.5, BR5.3, BR5.9, BR9.4 | US6.2 (AC6.2.3, AC6.2.4), US3.3 (AC3.3.2) |
| 13–20 | BR2.1–BR2.6, BR4.1, BR4.4, BR4.7, BR5.1, BR6.1–BR6.3, BR7.1–BR7.5 | US6.1 (AC6.1.2), US6.2 (AC6.2.2), US10.2 (AC10.2.1–AC10.2.3, AC10.2.5) |
| 21–25 | BR1.1, BR1.4, BR1.5, BR2.1–BR2.6, BR5.1–BR5.9, BR6.1–BR6.3, BR6.7, BR6.9 | US6.1 (AC6.1.2), US3.3 (AC3.3.1), US6.2 (AC6.2.3, AC6.2.4) |
| 26–27 | BR1.2, BR1.3, BR3.1–BR3.12, BR4.1–BR4.9 | US6.1 (AC6.1.1, AC6.1.3), US3.3 (AC3.3.1, AC3.3.2), US4.3 (AC4.3.4), US5.3 (AC5.3.2) |
| 28–31 | BR5.1–BR5.10, BR7.2–BR7.5 | US3.3 (AC3.3.3), US10.2 (AC10.2.1–AC10.2.3, AC10.2.5), US6.1 (AC6.1.5) |
| 32–34 | BR1.3, BR2.6, BR3.12, BR4.5, BR5.9, BR6.2, BR6.9 | US3.3 (AC3.3.1–AC3.3.3), US6.1, US4.3 (AC4.3.4) |
| 35–38 | BR1.2, BR3.12, BR6.8, BR8.6, BR8.7 | US6.1 (AC6.1.3), US3.3 (AC3.3.2), US2.4 (AC2.4.5) |
| 39 | BR8.12, BR9.1 | US12.1 (AC12.1.4), US3.3 (AC3.3.6) |
| 40–47 | BR8.1–BR8.12, BR3.12 | US6.1 (AC6.1.1–AC6.1.3, AC6.1.5), US5.3 (AC5.3.1), US4.3 (AC4.3.4), US2.4 (AC2.4.1–AC2.4.4), US3.3 (AC3.3.6) |
| 48–54 | BR5.2–BR5.8, BR6.4–BR6.7, BR7.1–BR7.3, BR8.7, BR8.11 | US6.2 (AC6.2.1–AC6.2.4), US3.3 (AC3.3.1, AC3.3.3), US10.2, US2.4 (AC2.4.1–AC2.4.5) |
| 55–57 | BR9.2, BR9.3 | — (demo retirement; protective expectations kept) |
| 58–60 | BR9.4, BR8.11 | US6.1, US6.2, US2.4 |
| 61 | BR6.8 (seams frozen), BR9.2 | — |

Not covered by U47 (design `traceability.json`): AC2.4.6 (U50 page-speed gate); AC3.3.4, AC3.3.5, AC4.2.1–AC4.2.5, AC5.3.3–AC5.3.5, AC6.1.4, AC6.2.5, AC6.3.3–AC6.3.5, AC6.4.4, AC10.2.4 (deferred, FD-105); AC4.3.1–AC4.3.3, AC4.3.5, AC6.4.1–AC6.4.3, AC6.4.5 (U46); AC6.1.6 (U48); AC6.3.1, AC6.3.2 (U22); AC12.1.1, AC12.1.2, AC12.1.5, AC12.1.6 (U7, U20, U9, U50). US4.2 is served only through FD-100's composer entry (BR3.11, BR8.9).

## Owned paths

- `packages/domain/src/review/` (except U46's two policy functions and U22's `versioning.ts`)
- `packages/application/src/modules/review/` (except U46's stub files, `index.ts` among them)
- `packages/application/src/ports/repositories/review.ts` (write side)
- `packages/database/src/repositories/review-module.ts` and `review-module.int.test.ts`
- `packages/contracts/src/schemas/review.ts`, `packages/contracts/src/view-models/experience.ts`, `packages/contracts/src/view-models/composer.ts`
- `packages/test-support/src/builders/review.ts`, `packages/test-support/src/fakes/review-repository.ts`
- `packages/database/src/demo/reviews.ts`
- `apps/web/src/app/[locale]/(patient)/write/`, `apps/web/src/app/[locale]/(patient)/authors/`, `apps/web/src/app/[locale]/(patient)/experiences/` (except `[id]/edit/`)
- `apps/web/src/components/patient/compose/` (except `EditForm.tsx` and its test), `apps/web/src/components/patient/experience/`
- `apps/web/src/components/patient/profile/OwnReviewList.tsx`
- `apps/web/src/server/actions/review.ts` and its tests; `apps/web/src/server/review-module.int.test.ts`, `review-module.int.smoke.test.ts`
- Until U47 merges: `components/patient/evidence/EvidenceSection.tsx`, `components/patient/comments/CommentThread.tsx` (with the new `CommentThreadView.tsx`), `components/patient/review-history/`

Not touched: `ProfileWorkspace.tsx` and `components/patient/auth/` (U9), `EditForm.tsx` and `experiences/[id]/edit/` (U22), `server/actions/{evidence,comments}.ts` (U48, U49), `CommandPorts`, the T-201 stub `repositories/review.ts`, `repositories/not-implemented.test.ts` and `fakes/repositories.ts`.

## Shared files (append-only)

| File | U47 use |
|---|---|
| `packages/i18n/messages/en.json`, `packages/i18n/messages/bn.json` | append U47's keys; reword `compose.identity.anonNote` (Step 39) |
| `packages/i18n/src/keys.ts` | generated; regenerate after every rebase, never merge by hand |
| `apps/web/src/styles/patient.css` | append U47's section (Step 53) |
| `apps/web/src/server/container.ts` | U47's own block: `review: ReviewModule` (Step 35) |
| `apps/web/src/app/[locale]/(patient)/me/page.tsx` | one data call (Step 52) |
| `packages/application/src/modules/review/index.ts` (U46) | one export line (Step 30) |
| `packages/application/src/modules/taxonomy/` (factory and `queries/list-specialties.ts`) | one query and one factory line (Step 31) |
| `packages/application/src/ports/audit-writer.ts` | one type member (Step 11) |
| `packages/contracts/src/errors.ts` | one error code (Step 9) |
| U46's `listExperienceCards` file and its int test | two optional filters and their rows (Steps 17, 19) |
| package barrels (`packages/*/src/index.ts`, `fakes/index.ts`, the ports barrel) | export lines only |
| `packages/database/src/demo/doctors.ts`, `doctors.int.test.ts` | delete two functions and their rows (Step 55) |
| `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts`, `server/actions/ownership.adversarial.test.ts` | the moved rows (Steps 37, 47) |
| `apps/web/src/app/pages.test.tsx`, `packages/database/src/demo/demo-slice.smoke.test.ts` | only the failing rows, recorded (Step 57) |
| `docs/status/decision-log.md` | four FD rows (Step 2) |
| `docs/implementation/01-conventions.md` | one dated note in §5 (Step 2) |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of rows U47 fixes |
| `inception/contract-design/contract-summary.md` | dated notes C1, C6, C7, C9, C16, C19 (Step 61) |
| `docs/implementation/tasks/T-301-*.md`, `T-306-*.md`, `T-307-*.md` | amendments and Hand-off |

Merge rules: on rebase, keep both sides of every append-only file and regenerate `keys.ts`. U47 adds no migration (`entities.md`: the tables exist since T-005, and the FD-090 drafts grant belongs to the deferred T-309); if one were ever needed, it takes the next free number at merge time, not at build time. FD and `ISS-` numbers are also taken at merge time. Shared demo code is deleted only when a `git grep` on the rebased branch shows no caller left; otherwise it stays and U50 removes it (`demo/accounts.ts` `listOwnReviews`, and `listRecentPublishedReviews` if U20 has not switched).

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

Applicable layers: data model and contracts (Steps 9–12; no table and no migration, the tables exist since T-005), repository and data access (Steps 13–20), business logic (domain Steps 6–8 and the module Steps 21–34), API and endpoint (the container block and the server actions, Steps 35–38), and frontend behaviour (i18n, composer, experience pages and slots, Steps 39–54). Environment and build configuration: none beyond the regenerated `keys.ts`. Documentation and traceability: Step 61.

## Design decisions taken

Q1–Q27 and the review points R-01 to R-07 were decided in the Functional Design under the owner's delegation of 2026-11-04. The four FD rows of design § 12 are appended in Step 2 before any code. U47 is not a high-risk Unit, so no adversarial step or written sign-off is planned; the anonymity checks run in the normal suite (Steps 32, 33, 38).
