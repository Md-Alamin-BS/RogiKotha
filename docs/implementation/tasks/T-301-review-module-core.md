# T-301 — Review module core: drafts, publish, projection, aggregates

| Field | Value |
|---|---|
| Story | STORY-REV-001, STORY-REV-002, STORY-REV-004, STORY-IDENT-001 (projection half), STORY-DIR-003 (facility accounts) |
| Phase / Lane | 3 / A |
| Class → model | M3 → Claude Opus 5 (alt. GPT-5.6 Sol); validator: GPT-5.6 Sol (+ human approval for M3) |
| Effort setting | Opus `xhigh` / Sol `high` |
| Estimate | 5–7 h agent; validation 2 h |
| Depends on | T-104 (identity personas), T-105 (config: `limitedDataThreshold`), T-201 (directory + taxonomy queries) |
| Parallel-safe with | T-303 (evidence intake — touches only `evidence` module; T-301 only references evidence item ids through the `EvidenceRepository.statesFor(ids)` port), T-206, T-207 |

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-080 / C9 — `repeatEpisode` on `review.published`** — The event payload is `{reviewId, doctorId, branchId?, repeatEpisode: boolean}`. `repeatEpisode` is true when the same account already has a published review of the same doctor that shares a condition tag and the same treatment period (AC6.1.4). The review still publishes. The payload never names the earlier review. The exact matching rule (what counts as the same period, how tags are compared) is written in this task's Functional Design. T-403 builds the worker job that consumes the flag. Changes: step 5 (`review.publish`), Hard-rule checklist and new acceptance rows.
- **FD-090 — worker grant on `review_drafts`** — Drafts expire after 30 days, and the hourly `retention.expire` job (T-309) must warn 4 days before and purge expired drafts. The worker has no grant on `review_drafts` today, so this task adds a forward-only migration that grants `rk_worker` `SELECT (id, account_id, expires_at)` and `DELETE` on `review_drafts`, and nothing on `payload_enc`. This is a worker-grant change (data boundary) and needs its own decision entry, which the orchestrator adds as FD-090; the migration is not applied before that entry exists. T-309 builds the job. Changes: Owned paths, step 4 (`expireDrafts` stays a web-tier method; the worker purge is T-309's) and new acceptance rows.

## Amendments — release 1 (FD-105, FD-109..FD-112)

These decisions are binding and override the text below where they differ. Release 1 builds this task inside Unit U47 `u47-reviews`, together with T-306 and T-307 (record: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u47-reviews/`).

- **FD-105 — what release 1 builds** — drafts (encrypted, minimal, capped at 10 live per account), `review.publish` and `facilityReview.publish`, the projection, the module surface and the four seams of C9 release 1. The state machine of §17 shrinks to `(none) → published`; hide, remove, delete and restore are release 2 (T-302), so the acceptance row "Transition table complete" is deferred. Changes: Goal, Steps and the acceptance row above.
- **FD-109** — the FR46 checkboxes ("What went well / What could improve") are deferred; AC6.2.3 is narrowed to its sentiment half. Changes: the projection and `DraftPayload` carry sentiment and outcome only.
- **FD-110** — Reviewer's labels are the prototype's three codes; stored labels that are not codes are shown as written.
- **FD-111** — facility visit accounts are named or pseudonymous; an anonymous one is refused as `validation` on `identity`.
- **FD-112** — the author persona (`persona:<id>`) is the actor of the publish audit row and of `review_versions.actor_id`, never the account. BR3.12: an anonymous publish with a new doctor is refused with `review.anonymous_new_doctor` and writes nothing.
- **FD-080 as built** — `review.published` carries `{reviewId, doctorId, branchId: null}` and no `repeatEpisode`; the three FD-080 acceptance rows are deferred to the Unit that builds the repeat-episode job (T-403).
- **FD-090 as built** — no migration and no `rk_worker` grant in release 1 (U47 adds none); the worker purge and the expiry warning are T-309's (ISS-520). The row "FD-090: worker grant is narrow" is deferred.
- **Acceptance commands as built** — the `@rk/...` filters do not exist; run the unit-scoped commands of `construction/u47-reviews/code-generation/unit-test-instructions.md`: `pnpm exec vitest run --config vitest.workspace.ts --project domain|contracts|application packages/<package>/src/review` (or `modules/review`), `--project database packages/database/src/repositories/review-module.int.test.ts review-reads.int.test.ts` and `--project web-int apps/web/src/server/review-module.int.test.ts` (run `--project test-support-seed` first against a fresh test database, ISS-545). Rows run against the matching tests: "Publish minimum fields" and "Rate limit" in `publish.test.ts`, "Anonymous alias scoped" in `review-module.int.test.ts` (`web-int`) and `projection.test.ts`, "Facility isolation" in `review-reads.int.test.ts`, "No scalar score" in `packages/contracts/src/schemas/review.test.ts`. "Preview equals public" holds up to the optional `period`, `relationship` and `doctor` of `PreviewVM` (ISS-534).

## Goal

Implement the `review` module end to end on the backend: domain entity + publication state machine
+ policies, encrypted server-side drafts, `review.publish`, the single projection function that
both `review.preview` and `review.getExperience` use, every read query the patient pages need,
distributions with denominators and the limited-data rule, facility accounts with criteria, outbox
events and audit rows. No UI in this task (T-306/T-307 consume it).

## Read first

1. `docs/implementation/01-conventions.md` §1, §3, §4, §5, §10
2. `docs/implementation/02-data-model.md` §0 (enums), §6 (reviews), §17 (publication state machine)
3. `docs/implementation/03-routes-and-contracts.md` §2, §3 (ports), §4 "review", §5 (events)
4. `PRODUCT.md` "Hard rules" — the four that bind this task: no number stands for quality; Not provided never `0`; Limited data; facility feedback never touches a doctor
5. Prototype (spec for what the projection must contain): `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` — `renderAccount` 804–936 (sections and their data), `byline` 485–515, `distBlock` 286–316, `sentimentBlock`/`outcomeBlock` 317–337, `accountRow` 527–552, `renderPreview` 1546–1572; `ui-design-prototype/shared/rogikotha-data.js` — `reviews`, `followUps`, `laterCare`, `facilityReviews`, `sentimentOf`, `outcomeOf`, `criteriaDist`, `accountsByAuthor`, `relatedByCondition`, `config.limitedDataThreshold`
6. `packages/contracts/src/view-models/experience.ts` and `composer.ts` as created by T-003 (fill the `TODO(T-301)` markers)

## Owned paths

- `packages/domain/src/review/**` (`review.ts`, `review-state.ts`, `policies.ts`, `facility-review.ts`, `index.ts`, tests)
- `packages/application/src/modules/review/**` (commands, queries, `authorization.ts`, `projection.ts`, `index.ts`, tests)
- `packages/application/src/ports/repositories/review.ts`
- `packages/contracts/src/schemas/review.ts`, `packages/contracts/src/view-models/experience.ts`, `packages/contracts/src/view-models/composer.ts` (fill TODO markers only)
- `packages/database/src/repositories/review.ts` (+ `*.int.test.ts`)
- `packages/test-support/src/builders/review.ts`, `packages/test-support/src/fakes/review-repository.ts`
- `packages/database/src/migrations/*_review_drafts_worker_grant.sql` — forward-only: `GRANT SELECT (id, account_id, expires_at), DELETE ON review_drafts TO rk_worker` (FD-090), plus a `02-data-model.md` §16 note naming the grant and its reason
- `packages/i18n/messages/{en,bn}.json` — only new `errors.review.*` keys

## Not in scope

Corrections, follow-ups, versioning, tombstones, restore, redaction (T-302). Evidence intake or
processing (T-303–T-305). Any React component (T-306, T-307). Search document refresh (T-205 owns
the job; this task only emits the outbox event). Comments/reactions (T-401).

## Steps

1. **Domain entity** `packages/domain/src/review/review.ts`: `Review` type mirroring `reviews` columns (no DB types), `FacilityReview`, `ReviewTag`, `FollowUp` (type only; commands in T-302). Value objects: `PeriodMonth {year, month}` with `parsePeriod(text, locale)` accepting the bilingual month list (`January…December`, `জানুয়ারি…ডিসেম্বর`) and digits in either script; `IdentityMode`; `Claims` (`wrongDx|wrongRx|secondOpinion` — the prototype's three; store as `[{label}]` so later free-text labels fit).
2. **State machine** `review-state.ts`: transition table exactly as `02-data-model.md` §17 "Publication"; `transition(state, event) → Result<state>`; events `publish`, `autoHide`, `hide`, `restore`, `deleteWithDiscussion`, `deleteWithoutDiscussion`, `authorRestore`, `remove`, `reject`. Table-driven test covers every cell.
3. **Policies** `policies.ts`: `minimumFieldsSatisfied(draft)` — quick: doctor + body ≥ 20 chars + relationship + (≥ 1 tag or `notSure`); detailed: doctor + ≥ 1 non-empty section + relationship + tags rule; `isLimitedData(total, threshold)` → `total < threshold`; `latestStatusOf(followUps)` → newest by (year, month, created_at) — author cannot pin; `publicPeriod(period)` → `{year, month}` only, never a day; `distribution(values, allowed)` → `{counts: Record<allowed, number>, total}` where `total` counts only rows whose value is non-null? **No** — `total` = number of eligible published accounts, `counts` per value, and `notProvided = total − Σcounts`; the prototype's `sentimentOf` does this — match it.
4. **Repository port** `ports/repositories/review.ts`: `insertDraft/updateDraft/getDraft/listDrafts/expireDrafts`, `insertReview`, `getByPublicId`, `getById`, `listPublished({page, doctorId?, branchId?, conditionTermId?, authorPersonaIds?})`, `sentimentCounts(doctorId)`, `outcomeCounts(doctorId)`, `criteriaCounts(branchId)`, `tagFrequency(conditionTermId)`, `relatedByCondition(conditionTermId, excludeId, limit)`, `byAuthorPersonas(personaIds)` (**public** personas only — the anonymous persona is never passed), `countPublishedToday(accountId)` (rate limit), facility-review equivalents. All list queries filter `state = 'published'` in SQL, never in JS.
5. **Commands** (one file each, `defineCommand`): `review.saveDraft` (encrypt `payload` JSON with `Crypto.encrypt`; `expires_at = clock.now() + 30 d`; `blocked_on_submission_id` when `payload.doctorSubmissionId` set; owner check on update), `review.publish` (requires `verifiedEmail` + `notRestricted`; `rateLimiter.hit('review.publish:account:<id>', 5, 86400)`; decrypt draft; `minimumFieldsSatisfied` else `review.min_fields`; `attestation === true` else `review.attestation_required`; persona via `identity.personaFor({accountId, reviewId: newId, mode})` — for `anonymous` the review id is generated first so the alias is thread-scoped; tags: for each selected tag call `taxonomy.resolve`, unmapped free text → `taxonomy.createProvisional`; evidence: `EvidenceRepository.statesFor(payload.evidenceItemIds)` — items in `privacy_confirmed` are linked and `evidence.publish` is invoked (T-305 provides; until then call the port method and let the fake satisfy it), items in any other state are **left private and do not block** publication; insert `reviews` + `review_tags` in one transaction with `audit_events` (`stream review:<id>`, action `publish`, details `{kind, identityMode, tagCount, evidenceLinked}`) and outbox `review.published {reviewId, doctorId, branchId?, repeatEpisode}` (FD-080; `repeatEpisode` computed in the same transaction from the account's earlier published reviews of the same doctor, and the earlier review is never named); delete the draft), `facilityReview.publish` (same skeleton; `criteria` validated against `criterion` × `criterion_value|null`).
6. **Projection** `projection.ts`: one pure function `toExperiencePage(review, deps) → ExperiencePageVM` used by **both** `review.preview` and `review.getExperience`. Fields, in the prototype's section order: kicker (episode + condition), title, byline (persona projection: `named` → display name, `pseudonymous` → `@username`, `anonymous` → `anonSentence` flag and no name, `relationship`, `postedMonthYear`), flags (sentiment|`notProvided`, outcome|`notProvided`, condition tag, `periodMonthYear`), claims → `[{labelKey}]` rendered with `label.reviewerLabel`, body, `sections` (detailed only; empty sections omitted), followUps (T-302 fills; empty array now), laterCare (null now), evidence groups (T-305 fills; `evidenceGroups: []` + `hasDocuments:false` now), discussion placeholder (`threadSlot: reviewId`), relatedByCondition (cards: sentiment, title, static byline, doctor name, period, outcome), sameDoctor cards, margin (`anonNote` when anonymous, period, posted, doctor {publicId, name, `registrationNotVerified: true`}, condition {publicId, name}, tags, otherAccounts by same **public** persona — `[]` for anonymous). Never includes: `exact_date`, `accountId`, `personaLinks`, original filenames, `likes` raw counts (T-401 adds reaction counts via its own query).
7. **Queries**: `review.preview {draftId}` (owner; builds a transient `Review` from the decrypted draft and calls `toExperiencePage`), `review.getExperience {publicId}` (404 for anything not `published`; T-302 adds the tombstone branch), `review.listExperiences {page}`, `review.forDoctor {doctorId, filters}` → `ExperienceCardVM[]` (the `accountRow` fields: flags incl. `documentsCount|noDocuments`, title, byline, period, doctor link, excerpt truncated with `Intl.Segmenter` at 190 graphemes), `review.forBranch`, `review.forCondition`, `review.sentimentDistribution {doctorId}` / `review.outcomeDistribution {doctorId}` → `{counts, total, notProvided, limitedData}` where `limitedData = isLimitedData(total, config.limitedDataThreshold)`, `review.criteriaDistribution {branchId}` → per criterion `{counts: {good,mixed,poor}, total, notProvided}`, `review.getDraft`, `review.listDrafts {accountId}` (T-409 consumes: title/excerpt from decrypted payload, `expiresInDays`, `blocked`).
8. **Database repository** with Drizzle; `sentimentCounts` is one `GROUP BY` over `reviews WHERE doctor_id = $1 AND state = 'published'`; **there is no join to `facility_reviews` anywhere in the doctor queries** — add a test that greps the SQL text for `facility_reviews` in the doctor-aggregate query builders and asserts absence.
9. **Fakes and builders** in `test-support`; `aReview()` defaults to a published pseudonymous quick review on the seeded doctor `d1` equivalent.
10. Add `errors.review.minFields`, `errors.review.attestationRequired`, `errors.review.rateLimited` in both dictionaries.
11. Run `pnpm check`; fill the hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Transition table complete | `pnpm --filter @rk/domain test review-state` | every (state, event) pair asserted; illegal ones return `err('conflict')` |
| Publish minimum fields | `pnpm --filter @rk/application test review.publish` | quick review without tag and without `notSure` → `review.min_fields`; with `notSure` → ok |
| Rate limit | same | 6th publish in a day → `rate_limited` |
| Anonymous alias scoped | `pnpm --filter @rk/application test projection` | two anonymous reviews by one account get different personas; `otherAccounts` is `[]` on both |
| Preview equals public | same | `review.preview(draft)` deep-equals `review.getExperience(publicId)` after publish, ignoring `publicId`/`postedMonthYear` |
| Not provided | same | `sentiment: null` → VM `sentiment: null` and `flags[0].key === 'label.notProvided'`; distribution `notProvided` counts it, never `0` in a count that should be null |
| Limited data | same | `limitedDataThreshold = 5`, 4 published → `limitedData: true`; 5 → `false` |
| Facility isolation | `pnpm --filter @rk/database test review.int` | 3 doctor reviews + 8 facility reviews on the doctor's branch → doctor distribution `total = 3` |
| No scalar score | `pnpm --filter @rk/domain test no-score` | a test enumerates exported functions of `domain/review` and asserts none returns a plain number for a review set (see Tests) |
| Exact date private | grep | `rg exact_date packages/application/src/modules/review/projection.ts` → no match |
| Migrations + repo | `pnpm --filter @rk/database test` | green against compose PostgreSQL |
| FD-080: repeat episode flagged (C9) | `pnpm --filter @rk/application test review.publish` | account A publishes a review of d1 tagged diabetes for March 2026, then a second review of d1 tagged diabetes for March 2026: the second `review.published` outbox row has `repeatEpisode: true` and still publishes; the first has `false` |
| FD-080: no flag for a different period or doctor | same | a second review of d1 for a different treatment period, and one of d2 with the same tag and period, both have `repeatEpisode: false` |
| FD-080: payload hygiene (C9) | same | the outbox payload keys are exactly `reviewId, doctorId, branchId, repeatEpisode`; no earlier review id appears anywhere in it |
| FD-090: worker grant is narrow (C9) | `pnpm --filter @rk/database test validator-probes` as a real `rk_worker` session | `select id, account_id, expires_at from review_drafts` and `delete from review_drafts where expires_at < now()` succeed; `select payload_enc from review_drafts` and `update review_drafts` are denied |
| Whole tree | `pnpm check` | green |

## Tests to write

- `review-state.test.ts`: table-driven, all cells.
- `policies.test.ts`: `minimumFieldsSatisfied` matrix (quick/detailed × each missing field), `parsePeriod` for `March 2026`, `মার্চ ২০২৬`, `03/2026`, garbage → `err`; `isLimitedData` at threshold − 1, threshold, threshold + 1; `latestStatusOf` with unordered input.
- `no-score.test.ts`: `Object.values(domainReview)` filtered to functions taking a `Review[]` — call each with a fixture set — assert the result is never `typeof === 'number'`; plus a static assertion that no export name matches `/score|rating|stars?/i`.
- `publish.test.ts`: happy path, each `requires` refusal (`anonymous`, unverified, restricted), attestation, evidence-state rules (confirmed linked / preview_ready left private / failed ignored), audit row shape, outbox event emitted, draft deleted, transaction rollback when persona creation fails.
- `projection.test.ts`: named/pseudonymous/anonymous bylines; sections omitted when empty; claims carry `label.reviewerLabel`; excerpt grapheme truncation with a Bengali string (no broken conjunct — assert the truncated string ends on a grapheme boundary via `Intl.Segmenter`).
- `review.int.test.ts` (database): repository methods; publication filter in SQL (insert a `hidden` review and assert it is absent from every list query); facility isolation.

## Threat notes

| Abuse case | Mitigation | Test |
|---|---|---|
| Publish on someone else's draft | owner check in `saveDraft`/`publish`/`preview` | `publish.test.ts` "refuses foreign draft" |
| Draft payload readable from DB | `payload_enc` via `Crypto`; repository never returns plaintext | `review.int.test.ts` "row bytes do not contain the story text" |
| Anonymous review linked through `otherAccounts` | `byAuthorPersonas` receives only public personas; anonymous personas filtered in the query | `projection.test.ts` |
| Exact visit date leaks | `publicPeriod` strips day; VM has no such field | grep + projection test |
| Spam publishing | rate limit 5/day per account (`RateLimiter`) | `publish.test.ts` |
| Hidden review reachable by list queries | `state = 'published'` in SQL | `review.int.test.ts` |

## Hard-rule checklist

- [ ] No number stands for quality; distributions carry `counts` + `total`; no combined score function exists (`no-score.test.ts`).
- [ ] Missing sentiment/outcome → `notProvided`, never `0`.
- [ ] Limited data at `< limitedDataThreshold` from config.
- [ ] Doctor VM inside the projection carries `registrationNotVerified: true`.
- [ ] Facility reviews excluded from doctor aggregates in SQL.
- [ ] Reviewer claims projected with `label.reviewerLabel`.
- [ ] Exact date never projected.
- [ ] Anonymous persona never linked to other content.
- [ ] Both dictionaries updated for new error keys.
- [ ] `repeatEpisode` is a boolean only; no event, log or view model names the earlier review (FD-080).
- [ ] The `review_drafts` worker grant excludes `payload_enc` (FD-090).
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

Built in release 1 by Unit U47 `u47-reviews` (branch `bolt/u47-reviews`, 2026-11-07); the full record is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u47-reviews/code-generation/code-summary.md`.

### What changed
- Domain `packages/domain/src/review/{review,facility-review}.ts`; contracts `DraftPayload`, the draft inputs, `ComposerVM`, `OwnReviewVM`, `PreviewVM`, the slimmer `ExperiencePageVM`; `ReviewModuleRepository` and `PgReviewModuleRepository` (no migration); `createReviewModule` with `saveDraft`, `discardDraft`, `getDraft`, `listOwnDrafts`, `preview`, `publish`, `facilityReviewPublish`, `getExperience`, `countExperiences`, `authorCards`, `listOwnReviews`, `hasOwnReviewOfDoctor` and the seams `reviewIdForPublicId`, `isReviewAuthor`, `isReviewPublished`, `authorIdentityModeOf` (plus `lastEditedAt`), all with `Tx` first, reached as `getContainer().review`.
- Recorded additions beyond the design: `identityModeOf`, `visibleDoctorRefByPublicId`, `activeTermRefsByPublicIds`, `TaxonomyRepository.listPublished` and `taxonomy.listSpecialties`; one line in `03-routes-and-contracts.md` § 2 for `review.anonymous_new_doctor`; the card filters `personaIds` and `excludePublicId` on U46's `listExperienceCards`.
- The seams and the `Tx`-first calling convention freeze at the merge (BR6.8).

### Not done and why
- State machine beyond `(none) → published`, `repeatEpisode`, the FD-090 grant and the draft purge: release 2 (T-302, T-403, T-309); ISS-520.
- Custom Reviewer's labels, the FR46 checkboxes and anonymous facility visits: FD-109 to FD-111; ISS-526, ISS-527.

### Questions for the human
- Allow U+200C and U+200D in long text and tag text, for Bengali conjunct input (ISS-530)?
- Keep `personaIds` on the web-facing card schema (ISS-533)?

### Follow-ups
- ISS-519 to ISS-546; U22 (ISS-521, ISS-522), U48 and U49 (ISS-540), U50 (ISS-523, ISS-528, ISS-532, ISS-536).

### `pnpm check` output summary
- Green on the final tree: 288 files, 3146 passed plus 2 expected failures; lint 0 errors; coverage total 95.22% (domain 99.48%, contracts 100%, application 90.05%, database 98.09%, test-support 95.32%, apps/web 94.99%). `pnpm smoke`: 23 files, 44 tests.

### Hard-rule evidence
- No score, Not provided, exact date private: `contracts/src/schemas/review.test.ts`, `projection.test.ts`, `publish.test.ts`. Facility isolation: `review-reads.int.test.ts`. Anonymity: `review-module.int.test.ts` (`web-int`). Acceptance rows executed expected against observed: plan Step 60.
