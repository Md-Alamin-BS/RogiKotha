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
5. **Commands** (one file each, `defineCommand`): `review.saveDraft` (encrypt `payload` JSON with `Crypto.encrypt`; `expires_at = clock.now() + 30 d`; `blocked_on_submission_id` when `payload.doctorSubmissionId` set; owner check on update), `review.publish` (requires `verifiedEmail` + `notRestricted`; `rateLimiter.hit('review.publish:account:<id>', 5, 86400)`; decrypt draft; `minimumFieldsSatisfied` else `review.min_fields`; `attestation === true` else `review.attestation_required`; persona via `identity.personaFor({accountId, reviewId: newId, mode})` — for `anonymous` the review id is generated first so the alias is thread-scoped; tags: for each selected tag call `taxonomy.resolve`, unmapped free text → `taxonomy.createProvisional`; evidence: `EvidenceRepository.statesFor(payload.evidenceItemIds)` — items in `privacy_confirmed` are linked and `evidence.publish` is invoked (T-305 provides; until then call the port method and let the fake satisfy it), items in any other state are **left private and do not block** publication; insert `reviews` + `review_tags` in one transaction with `audit_events` (`stream review:<id>`, action `publish`, details `{kind, identityMode, tagCount, evidenceLinked}`) and outbox `review.published {reviewId, doctorId, branchId}`; delete the draft), `facilityReview.publish` (same skeleton; `criteria` validated against `criterion` × `criterion_value|null`).
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
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
