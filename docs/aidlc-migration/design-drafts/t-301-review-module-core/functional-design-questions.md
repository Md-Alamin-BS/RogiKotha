# Functional Design — questions (U21 `t-301-review-module-core`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-301-review-module-core/functional-design/`.

Context:
- Unit U21 (kind `library`, size XL, not marked high risk) delivers T-301 (`docs/implementation/tasks/T-301-review-module-core.md`, with its FD-080 and FD-090 amendments) for stories US6.1, US6.2, US6.4, US3.3 and US4.3. Bolt 17 in `bolt-plan.md`, after U11 T-104 (Bolt 11), U12 T-105 (Bolt 12), U14 T-201 (Bolt 13) and U17 T-204 (Bolt 16); before U23 T-303 (Bolt 18), U22 T-302, U26 T-306 and U27 T-307. Evidence intake and publication (U23, U25) come later, so every evidence call goes through a port with a fake.
- Inputs read: `unit-of-work.md` (U21, the open point "Evidence-to-draft link … the publish check in U21"), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `requirements.md` (FR10, FR24–FR27, FR39–FR52, FR55, FR78), `stories.md` (AC3.3.1–AC3.3.6, AC4.3.1–AC4.3.5, AC6.1.1–AC6.1.6, AC6.2.1–AC6.2.5, AC6.4.1–AC6.4.5), `components.md` (Review, Identity and its accepted exceptions), `contract-summary.md` (C4, C6, C7, C8, C9, C15, the common rules and the task-file amendments), `delivery-planning-questions.md` Q6, `docs/status/decision-log.md` (FD-008, FD-009, FD-014, FD-015, FD-016, FD-022, FD-023, FD-049, FD-067, FD-080, FD-086, FD-089, FD-090, FD-092), `01-conventions.md` §2–§5 and §10, `02-data-model.md` §0, §3, §6, §7, §16, §17, `03-routes-and-contracts.md` §2–§5, the U14 T-201 and U8 T-101 design drafts, and `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` (owner answers: doctor summaries show counts with denominators only, no percentages; facility pages use the nine-criteria model).
- Code read as it is on `main` and on the T-010 branch (2026-10-28): `packages/database/src/schema/{review,identity,evidence,enums,audit}.ts`, migrations `0002`, `0004`, `0005`, `0008`, the repository stubs `repositories/{review,evidence,identity}.ts`, `validator-probes.int.test.ts` and `migrations.int.test.ts` (both pin the migration count), `packages/contracts/src/{view-models/experience.ts, view-models/composer.ts, schemas/review.ts, actor.ts, errors.ts, config-values.ts, enums.ts}`, `packages/i18n/messages/{en,bn}.json` (the `errors.review.*`, `label.*`, `claim.*`, `byline.*` and `compose.identity.*` keys), `packages/test-support/src/{corpus/reviews.ts, corpus/facility-reviews.ts, corpus/notifications.ts (USER_DRAFTS), seed/seed-content.ts, fakes/repositories.ts, fakes/repositories-superset.test.ts, builders/review.ts}`; the prototype selectors in `ui-design-prototype/shared/rogikotha-data.js` (`distribution`, `sentimentOf`, `outcomeOf`, `criteriaDist`, `relatedByCondition`, `accountsByAuthor`, `followUpsFor`, `laterCareFor`) and renderers in `concept-04b-quiet-clinic-minimal/app.js` (`byline` 582, `accountRow` 624, `renderAccount` 901, `relatedCard`, `renderCompose` 1449, `renderPreview` 1663, `renderExperienceIndex` 1927; the task's line numbers are from an earlier prototype).
- Open `ISSUES.md` rows in this area: ISS-269 (seed drafts stored unencrypted, owner U21), ISS-147 (closed in substance by FD-049), ISS-161 (seed text Bengali only), ISS-222 and ISS-091 (U14), ISS-237, ISS-240 (worker reads `exact_date_enc`), ISS-262 (anonymous comments on non-anonymous threads), ISS-145 (no event-name list).
- U3 T-010 is being built on its branch while this draft is written. Nothing here depends on it beyond the boundary lint and the coverage floor it turns on.

## Settled before this stage

These are decided by FD entries, the contracts or U14's design and are not asked again.

- **`review.published` carries `repeatEpisode`, and the review still publishes (FD-080, C9).** The worker job that opens the repetition case is U32 T-403's; this Unit only computes the boolean and never names the earlier review. The matching rule is this design's (Questions 7 and 8).
- **The worker grant on `review_drafts` is `SELECT (id, account_id, expires_at)` and `DELETE`, nothing on `payload_enc` (FD-090).** The decision entry exists, so the migration may be applied in this Unit. The purge and the 4-day warning are U29 T-309's.
- **An author's soft delete is domain-only state (FD-049).** The stored state stays `published` and `deleted_at` is set; the state machine models `deleted` in the domain.
- **Review figures belong to the U14 queries and policies.** `review.sentimentDistribution`, `outcomeDistribution`, `criteriaDistribution`, `listExperienceCards`, `distribution`, `isLimitedData`, `ExperienceCardVM`, `BylineVM` and `FacilityAccountVM` are U14's (03 §4 ownership note); this Unit extends and does not rewrite them. Their shape is U14's Question 3 answer: counts for every key, the total of recognised values, the eligible accounts without a value, `empty`, `limitedData`.
- **Counts with denominators, no percentages (owner, 2026-10-28, U15 T-202 draft Q1).** No view model of this Unit carries a percentage.
- **Facility feedback uses the nine-criteria model with exact counts, no facility sentiment (owner, 2026-10-28, U16 T-203 draft Q1).**
- **An anonymous review gets an alias scoped to its own thread, never linked to the profile or other reviews (FD-015); staff identity access is disclosed only in the Privacy Policy and Terms (FD-022).**
- **Family members and caregivers attest; there is no consent workflow (FD-014). The composer's pattern checks warn and never block; no classifier runs (FD-009).**
- **Images only in Phase 1 (FD-036); an unconfirmed file is never public (FD-023).**
- **No new dependency.** Grapheme handling uses `Intl.Segmenter`; encryption uses the existing `Crypto` port; no dependency-check entry is needed unless Code Generation finds otherwise.

## Settled in this design without a question

These follow from the contracts, the project rules or the code. Each is explained in `functional-spec.md` § 13.

- **A foreign, missing or expired draft answers `not_found`**, never `forbidden`, so draft ids cannot be probed (BR1.2).
- **The attestation is typed `boolean` in the input schema** so a missing attestation reaches the command and returns `review.attestation_required` naming the field, as AC6.1.3 asks; the schema's `z.literal(true)` would turn it into a generic `validation` error (BR3.6).
- **The previewed identity mode is the one that publishes**: a publish input that differs from the draft's mode is `conflict` (BR3.7).
- **Reviewer's labels are the three suggested codes in release 1**, stored by code; custom labels and their approval workflow are raised (R3, BR3.9).
- **The rate limit uses the `RateLimiter` port only.** The task's `countPublishedToday(accountId)` cannot exist: reviews have no account column, and finding the account's reviews would need the private link (BR1.4).
- **`review.forBranch` returns the branch's facility accounts**, never doctor reviews with that `branch_id` (BR7.3, U14 BR2.7).
- **The discussion slot carries the review's public id**, not the internal id the task text names (BR6.3).
- **`review.getExperience` returns a result tagged `kind: 'experience'`**, so U22 T-302 can add `kind: 'tombstone'`, which U27 T-307 already expects.
- **The page view model uses `null` for a missing sentiment or outcome**, as the T-301 acceptance row "Not provided" states; the U14 card keeps its absent-field convention.
- **Ambiguous free-text tags stay free text** (the author's wording, no link), so publish never guesses a term (BR3.8).
- **This Unit writes no `review_versions` row**: versioning is U22 T-302's, and a version row's `actor_id` would hold the account id (raised as R6).
- **`facilityReview.publish` appends no outbox event**: C15 defines none (BR8.3).
- **Related and same-doctor lists hold at most six cards, other accounts by the same persona at most ten, all newest first** (BR6.9, BR6.10); the prototype shows every match, which does not scale.
- **The draft payload is lenient and bounded while drafting**, strict only at publish (BR2.2).
- **Detailed reviews may keep an opening paragraph in `body`**, as the prototype and T-307 show (BR3.2).
- **The task's `errors.review.rateLimited` is not added**: the `rate_limited` code maps to `errors.common.rateLimited`, which exists. New keys are the per-field `errors.review.missing*`, `doctorPending` and `periodInvalid` (BR3.3).
- **U14's repository stubs are not renamed again.** This Unit replaces its own stubs (`saveDraft`, `getDraft`, `deleteDraft`, `insertReview`, `getByPublicId`, `getById`, `listForDoctor`, `listForBranch`, `listForCondition`, `listExperiences`, `insertFacilityReview`) with the port names of `functional-spec.md` § 6; `updateState` is relabelled `T-302`, which builds `review.setState`; the fake follows so the superset test stays green.

## Question 1

The page view model in `packages/contracts/src/view-models/experience.ts` is a T-003 stub marked `TODO(T-307)`. It carries `likes`, `dislikes`, `identityLabel` and `tombstone`, and none of what T-301 step 6 lists (byline, flags, claims with label keys, related and same-doctor cards, the margin, the evidence placeholder). T-301's owned paths say "fill TODO markers only", but the file has no `TODO(T-301)` marker. Who shapes `ExperiencePageVM`?

Why this is open: the projection is this Unit's (step 6), and "preview equals public" needs one exact type now; U27 T-307 renders it later. Step 6 also says the page never includes raw like counts, which the stub has.

A. **This Unit replaces the stub's page type with the projection's shape** (recommended): the fields of `functional-spec.md` § 7, a `kind: 'experience'` tag, no `likes`, `dislikes` or `identityLabel`; `PreviewVM` stays an alias. U27 T-307 may add rendering-only fields additively, U22 T-302 adds the tombstone variant, U30 T-401 adds reaction counts through its own query. Recorded as an owned-path widening in the hand-off. `ExperienceCardVM` stays U14's in `experience-card.ts`.
B. **Fill the stub as it is** and map the projection into its fields. The byline, flags, claims keys and margin have nowhere to go, and the stub's raw like counts contradict step 6.
C. **Add a new file `experience-page.ts`** and leave the stub. Two competing page types, and T-307 must pick one.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

**`reviews.title` is `NOT NULL`, but the composer has no title field.** The prototype's `renderCompose` asks for none, its saved drafts are called "Untitled — started 14 August", and T-306's composer state has no title. The minimum fields of FR40 and AC6.1.1 do not include one either. Where does a published review's title come from?

A. **The author's title when the payload has one, otherwise derived** (recommended): the first sentence of the story (or of the first non-empty section), cut at 80 graphemes on a grapheme boundary with "…" when cut. The preview is the exact public projection, so the author sees the title before publishing. The payload accepts an optional `title` (at most 120 graphemes), so U26 T-306 can add a field later without a change here.
B. **Make a title a required field.** This adds a minimum field FR40 does not have and fails AC6.1.1's minimum.
C. **Make `title` nullable** (migration) and let the page show no heading. Every card and index needs a fallback, and the prototype's pages all show titles.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Who may **save a draft**? 03 §4 says `review.saveDraft · verified`. The prototype says the opposite: an unverified account sees the pending banner, "drafts still save; only Publish is gated", and T-306 step 1 renders the composer with Publish disabled for unverified accounts.

A. **Any signed-in account, including pending and restricted ones; publish stays verified and not restricted** (recommended). A draft is private and a restricted account may not post, but it can keep writing. The rule is in `authorization.ts`; 03 §4 is corrected in Code Generation.
B. **Verified only, as 03 says.** An unverified author's autosave fails silently and their work is lost before they confirm their email (AC6.1.2).
C. **Verified and not restricted.** Same loss for unverified authors, and a restricted author loses drafts in progress.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

**When does a draft expire?** Drafts "expire after 30 days" with a warning 4 days before (FD-090). The column default counts from creation; the task sets `expires_at = clock.now() + 30 d` on save.

A. **30 days after the last save** (recommended). Autosave runs on every change, so a draft someone is working on never expires under them; an abandoned draft goes 30 days after it was last touched, and the warning names that date.
B. **30 days after creation**, whatever the activity. An author editing a long timeline in week four loses it.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

**The anonymous alias cannot be created before its review exists.** Step 5 generates the review id first and calls `identity.personaFor({accountId, reviewId, mode: anonymous})`, so the persona link names the review. But `persona_links.review_id` has an ordinary, immediately checked foreign key to `reviews` (`0004_deferred_fks.sql`), and `reviews.author_persona_id` needs the persona first. The seed works around it by writing the link with no review id and back-filling it after the insert. How does publish order the two rows?

Why this is open: the table is Identity's (U11 T-104 builds before this Unit), and the fix touches its schema.

A. **Make that one foreign key `DEFERRABLE INITIALLY DEFERRED`** (recommended), in a forward-only migration (`ALTER TABLE persona_links ALTER CONSTRAINT persona_links_review_id_reviews_id_fk DEFERRABLE INITIALLY DEFERRED`), unless U11 T-104 already did it. Publish then creates the persona and its link with the new review id, inserts the review, and PostgreSQL checks the key at commit. The repo already defers a key for the same reason (`evidence_items.published_artifact_id`). Nothing about who can read the table changes. The U11 T-104 draft, written in parallel, chooses the same change (its Question 7), so this Unit adds the migration only if T-104 ships without it.
B. **Write the link without a review id and back-fill it after the review insert**, as the seed does. Needs a second Identity operation, and between the two writes the unique (account, review) index does not protect the alias.
C. **Insert the review under the named persona and swap it afterwards.** Writes a false author for a moment inside the transaction; rejected.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

**Anonymous facility reviews cannot be thread-scoped in the database**: `persona_links.review_id` references `reviews` only, not `facility_reviews`, and facility reviews have no discussion thread. The seed gives each anonymous facility review its own persona with no review id. What does `facilityReview.publish` do?

A. **A fresh anonymous persona for every anonymous facility review**, linked to the account with `review_id` null (recommended). Two anonymous facility reviews of one account never share an alias, which is what FD-015 asks. U11 T-104's `personaFor` with no `reviewId` and mode `anonymous` must always create a new persona; the U11 T-104 draft, written in parallel, specifies exactly this (`personaFor` without a review id always creates a fresh persona); if T-104 ships without it, this Unit adds that branch as a recorded owned-path addition.
B. **Add a `facility_review_id` column to `persona_links`** (a migration on the private table) to scope aliases the same way. More schema for no visible difference, since facility reviews have no thread.
C. **Refuse anonymous facility feedback.** Narrows FR10, which gives every review the three modes.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

**What counts as the same episode for `repeatEpisode`?** C9: "the same account already has a published review of the same doctor that shares a condition tag and the same treatment period … the exact matching rule is U21's Functional Design." The acceptance rows: the same account, d1, diabetes, March 2026 twice → the second is flagged; a different period, or another doctor with the same tag and period → not flagged.

A. **Same account, same doctor, the same treatment month and year, and at least one shared condition** (recommended). A condition is shared when two condition tags have the same effective term (so a mapped provisional term matches its canonical term) or, for free-text condition tags, the same `normalizeAliasKey`. Not sure never matches. The earlier review must be eligible (published, not deleted); its branch and identity mode do not matter, so a repeat under another identity mode is caught. The review always publishes.
B. **As A, but a neighbouring month also matches** (±1 month). Catches a slightly re-dated repeat, but flags two genuine visits a month apart to the moderators, and the author is never told why.
C. **Same doctor and condition in any period.** Flags every follow-up visit for a chronic condition, and fails the "different period → false" acceptance row.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

**How does Review learn that an earlier review is by the same account?** Reviews store only a persona. The account's personas (named, pseudonymous and one per anonymous review) are linked to it only in `persona_links`, which only Identity reads (AD-3). C4's `identity.personasOf` is private to DataRequests.

A. **A boolean-only Identity query, `identity.ownsAnyPersona({accountId, personaIds}) → boolean`** (recommended). Review finds the candidate reviews in its own tables (same doctor, month, shared condition: usually none or a handful), passes their author persona ids, and gets one yes or no, which is exactly the flag FD-080 already decided to publish. The link never leaves Identity, the answer is never stored except as the flag, and nothing about who can read `persona_links` changes. C4 gains the operation additively; built in `modules/identity` by U11 T-104 or, if T-104 has not, by this Unit as a recorded owned-path addition. The U11 T-104 draft, written in parallel, does not include it yet; its `accountsOf` would hand Review account ids, which is option B's problem.
B. **Review reads the account's persona list through `identity.personasOf`.** Moves the private list into the review module: a change to the identity data boundary that needs an FD entry first (project rule).
C. **Compare only the same persona.** No Identity call, but a repeat posted once named and once anonymously, the case most worth flagging, is missed.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

**What happens to a file still in processing when the review publishes?** AC6.1.6: "the text review is public at once and the file shows Processing privately to the author … until the technical pipeline approves it". Step 5 links only `privacy_confirmed` items, leaves the others private, and then deletes the draft. Evidence items are tied to the draft while it exists (U23 T-303's open point), so after the deletion a processing item belongs to nothing, and the author's later privacy confirmation (FD-023) has no review to publish into.

A. **Bind the pending items privately to the new review in the publish transaction** (recommended): items in `quarantined`, `validating`, `scanning`, `sanitising` or `preview_ready` get the review id through a new internal Evidence operation, `evidence.bindToReview({reviewId, itemIds})`, and stay private; when the author later confirms one, U25 T-305 publishes it into that review. `privacy_confirmed` items go through `evidence.publish` as planned; failed, rejected and removed items are ignored. C8 gains the operation additively; U23 or U25 builds it, and this Unit calls the port with a fake until then.
B. **Leave pending items with the deleted draft.** They are orphaned and expire; the author must upload again after publishing, which AC6.1.6 does not describe.
C. **Keep the draft until every item has finished.** A published review and its draft coexist, the workspace shows a draft for something already public, and the draft can be published again.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

**Who is the actor in a publish's audit row?** 01-conventions §5 writes the actor as `account:<id>`. For an anonymous review that row says "account X published review Y" in `audit_events`: a second link between the account and the anonymous review, outside `persona_links` and outside the private account ids the domain design accepts (ReviewDraft, EvidenceItem, Reaction, Report). Staff can read audit streams, and the same would reveal the person behind a pseudonym.

A. **The author persona: `persona:<authorPersonaId>`, for every identity mode** (recommended). Accountability stays intact, because a Super Admin reaches the account through `identity.reveal`, which is audited and capability-gated (FD-016). The format is added to 01-conventions §5 and the `audit_events.actor` comment. Applies to every authored-content command of the review module (publish now; correct, delete and restore in U22 T-302).
B. **Keep `account:<id>`.** Adds an account-to-anonymous-review record that bypasses the reveal controls; a change to the identity data boundary that needs an FD entry.
C. **`persona:` for anonymous reviews only.** Pseudonymous authors stay exposed to anyone reading audit rows, and the actor's format alone tells which reviews are anonymous.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

C4 says **Identity's `RevealTarget` port is implemented by Review for `review` and `facility_review`, built by U21**, and the domain design says the same. T-301's task file does not mention it (the T-401 and T-403 task files carry their own `RevealTarget` amendments). Without it, `identity.reveal` of an anonymous review's author cannot resolve its target.

A. **Build it in this Unit** (recommended): `modules/review/reveal-target.ts`, `resolve(tx, {targetKind, targetId}) → {subject: 'persona', personaId, targetCode}` for a review or facility review in any state (`targetCode` is its public id, as the U11 T-104 draft declares the port), `not_found` otherwise; registered in Identity's `RevealTarget` registry, which until then has no review resolver (T-104 draft Q9). About half an hour; the task file gains the amendment row the other two Units have.
B. **Let U11 T-104 read the review tables directly.** Identity sits below Review, so this is the cycle FD-067 forbids.
C. **Leave it to U33 T-404**, which uses reveals in the staff console. That Unit does not own the review module.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 12

**Is the treatment period a required field at publish?** `period_year` and `period_month` are `NOT NULL`, the repeat-episode rule needs them, and AC6.2.2 assumes every review shows a month and year. FR40's minimum does not list a period. The prototype pre-fills the current month in the active language.

A. **Required at publish, pre-filled by the composer** (recommended): `parsePeriod` reads the bilingual month names or digits in either script; a missing, unparseable or future period refuses the publish naming the field (`errors.review.periodInvalid`, which T-306 also names), and the draft is kept. Because the field arrives pre-filled, an author only meets the error by clearing or garbling it.
B. **Default a missing period to the publish month.** Invents a treatment date the author never gave.
C. **Make the period nullable** (migration) and show Not provided. Faithful to FR40's list, but the repeat check and the search filters lose their key, and every reader of the column changes.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 13

**`reviews.language` (`en | bn | mixed`) is `NOT NULL`**, and U18 T-205 filters search results by it, but nothing says how it is set.

A. **Detect it from the script of the title and text** (recommended): only Bengali letters → `bn`; only Latin → `en`; both, each at least a fifth of the letters → `mixed`; otherwise the majority script; no letters at all → the actor's locale. Deterministic and testable; Banglish (Bengali in Latin letters) reads as `en`, which is what a script-based search filter can match anyway.
B. **Use the actor's interface locale.** A Bengali story written from the English interface is stored as `en`.
C. **Ask the author in the composer.** One more step for every author, for a field they never see.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 14

**Three seed records will not work with this Unit's code.** (1) The corpus drafts are stored as plaintext JSON `{title, excerpt}` in `payload_enc` (ISS-269), so `getDraft` and `listDrafts` fail to decrypt them, and the seed's idempotency check compares stored bytes, which encryption makes random. (2) Seeded claims store the Bengali display text (`ভুল রোগ নির্ণয়`) instead of the code, so the English page cannot show its label and the projection cannot attach `claim.<code>`. (3) Seeded detailed reviews drop the prototype's opening paragraph (`body` is set to null for detailed reviews), although the page shows it above the timeline. Who fixes them?

Why this is open: `seed-content.ts` is U6 CR-012's file, already merged; ISS-269 names U21 as the owner of the draft part.

A. **This Unit corrects the seed in `seed-content.ts`** (recommended, recorded owned-path addition): drafts are encrypted with the real `Crypto` port, written as a valid `DraftPayload` (`story` from the excerpt, `title`, the doctor or the pending submission, and `seedRef`), and found again by decrypting the account's drafts and comparing `seedRef`; claims are stored by code; detailed reviews keep `body`. A seed integration assertion covers each. Closes the draft part of ISS-269.
B. **Leave the seed and make the code tolerate it** (treat undecryptable drafts as plaintext). A plaintext fallback in the decrypt path is exactly what the threat note forbids.
C. **Route the three fixes to a new change request.** The demo shows broken drafts and Bengali claim text in English until it lands.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 15 — for the owner

**FR46 ("What went well" and "What could improve" checkboxes for listening, explanation, medicines/tests/risks, respect/empathy, consultation time, cost/value and recommendation) exists nowhere outside the requirements and AC6.2.3.** There is no column, no prototype screen, no i18n key and no task that builds it. AC6.2.3, mapped to this Unit, expects the ticked boxes "as selected text". FR46 is a PRD Must.

Why this is for the owner: either answer changes the release scope of a Must requirement (A) or the data model and the composer design (B). Not pre-filled.

A. **Defer the FR46 checkboxes from release 1 with an FD entry** (recommended, given the fast-release priority and that the prototype, the source of truth for content, has no such screen): AC6.2.3 is narrowed to its sentiment half (skip the sentiment, the page shows Not provided, no score), which this Unit delivers; the checkboxes become a follow-up task with a design pass.
B. **Build them now**: a forward-only migration adds `went_well` and `could_improve` as arrays of the seven aspect codes, the payload and projection carry them as selected text in both languages, U26 T-306 adds the chips, and new copy goes to the bilingual review (FD-042). About two hours here plus a design pass for the composer, which has no prototype.
C. **Store them inside `sections`** as structured text. No migration, but they would read as free text, could not be filtered, and mix the author's story with checkbox values.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, recorded in OWNER-REVIEW-QUEUE.md; an FD entry defers the FR46 checkboxes from release 1 and narrows AC6.2.3 to its sentiment half; the dependent text in rules.md, functional-spec.md and traceability.json is updated when this draft is finalised)

## Question 16 — for the owner

**The prototype shows an anonymity caveat on the public experience page and in the composer**: `compose.identity.anonNote`, "Anonymous hides your name from readers. It is not absolute anonymity — your account and contact details remain private but known to us, and can be required by law." T-301 step 6 puts it in the page's margin (`anonNote`). FD-008 says the limits of anonymity against lawful disclosure are explained only in the Terms; FD-022 and AC3.3.6 say staff identity access is disclosed only in the Privacy Policy and Terms, and "no banner or warning about staff identity access appears" on the review page or in the writing flow.

Why this is for the owner: the prototype (FD-026/FD-027) and two founder decisions disagree; keeping the note needs an FD entry that amends FD-008 and AC3.3.6. Not pre-filled. Until it is answered, the design follows the founder decisions (BR6.13). Related owner answer (2026-10-29, U20 T-207 draft Q1, `OWNER-REVIEW-QUEUE.md`): the lawful-access section appears on both Terms and Privacy, settled by a new FD entry; that answer places the explanation in the policy pages and says nothing about the review page or the composer, so it is consistent with option A.

A. **No caveat on the public page; the composer's note is reworded without the legal or staff-access sentence** (recommended): the page shows only the anonymous byline ("Written anonymously"); U26 T-306 replaces the composer note with a line such as "Your name and profile are not shown with this review", and the full explanation stays in the Terms and Privacy Policy. FD-008, FD-022 and AC3.3.6 hold.
B. **Keep the prototype's note on both screens**, with an FD entry amending FD-008 and AC3.3.6.
C. **Keep it in the composer only**, where the author decides; still against FD-008 and AC3.3.6's "writing flow", so it also needs an FD entry.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, recorded in OWNER-REVIEW-QUEUE.md; an FD entry records no anonymity caveat on the public page and a reworded composer note without the legal or staff-access sentence; dependent text is updated when this draft is finalised)

## Raised for the owner, not decided in this stage

Each is proposed as an `ISS-` row (`functional-spec.md` § 9) so the owner can rule on it.

- **R1 — Nobody builds the screen for writing facility feedback.** `facilityReview.publish` is built here, but the prototype's "Describe your visit" button on a facility page (`facility.write`) opens the doctor composer, and U26 T-306 builds no facility section. AC4.3.4 ("fill in the facility section") has a backend and no UI. Suggested: a small follow-up in T-306 or a new task.
- **R2 — U27 T-307 step 2 links a named byline to `/authors/{username}`.** A named persona's username is the account's pseudonymous name, so that link would put a real name next to the username the same person uses for pseudonymous reviews. The U11 T-104 draft, written in parallel, adds `profileUsername` to the byline for named personas for the same link, and its `publicByUsername` falls back from the pseudonymous to the named persona of a username, so the profile page would join both identities. This Unit's byline never carries a named persona's username (BR6.4); T-104, T-307 and U38 T-409's public profile need a link target that does not expose it. Severity S2 now, S1 if built as written.
- **R3 — Custom Reviewer's labels (FR47) are not built**: only the three suggested labels are accepted, because FR47's label-approval workflow and configuration have no owner.
- **R4 — Two gaps in the §17 transition table**: a moderator cannot `remove` a review that is `hidden_pending_review`, and an author cannot delete a `hidden` review that has no discussion. This Unit builds the table exactly as written; U22 T-302 and U33 T-404 decide whether to extend it.
- **R5 — `label.limitedDataWhy` hard-codes "Fewer than 5"** while the threshold is a runtime setting; the copy is wrong as soon as the setting changes. Suggested owner: the page Units (U15 T-202) with a `{threshold}` parameter.
- **R6 — `review_versions.actor_id` holds the author's account id** (T-005), the same kind of extra link Question 10 removes from the audit row. U22 T-302 writes the first version rows and should apply the same rule.
