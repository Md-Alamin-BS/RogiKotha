# Functional Design questions — U47 `u47-reviews`

U47 merges T-301 (review module core), T-306 (the composer at `/write`) and T-307 (the experience page and the experiences index) for release 1 (FD-105). The drafts in `docs/aidlc-migration/design-drafts/t-301-review-module-core/`, `t-306-composer-wizard/` and `t-307-experience-page-and-index/` are the starting material. They were written for the 45-Unit plan, so this design keeps only what release 1 needs.

Every question below was answered by the recommended option, "decided by the agent under the owner's delegation of 2026-11-04". Code Generation adds each decision that changes a requirement or a data boundary to `docs/status/decision-log.md` before any code (`project.md` Mandated), as listed in `functional-spec.md` § 12.

## Settled before this stage (not asked again)

- FD-105: release 1 scope. Follow-ups, tombstones, restore, redaction and preview, reactions, the repeat-episode flag, moderation and the staff reveal are release 2.
- C9 release 1: `reviewIdForPublicId`, `isReviewAuthor` and `isReviewPublished`; publish requires a confirmed email in the application layer; persona from `identity.personaFor`; new doctor through `directory.addMemberDoctor` in the same transaction; no evidence step; `review.published {reviewId, doctorId, branchId?}` without `repeatEpisode`.
- C16: the three slots take `{reviewPublicId}` only and load their own data. The edit link goes to U22's route when `isReviewAuthor` is true. U9's `ContributionGate {purpose, returnTo}` and `getContributionAccess()`.
- C17: `PublicEvidenceCount.countPublicEvidence(reviewId)`, interim binding by U46.
- C18: module constants; T-101's in-memory `RateLimiter`. C19: the module defines its own ports and factory and never extends `CommandPorts`.
- U11 (T-104): `personaFor(tx, {accountId, reviewId?, mode})` (anonymous needs `reviewId`), `publicProjection(s)`, `publicPersonaIdsByUsername`, `IdentityOwnership {ownsPersona, ownPersonaIds}`, and the deferred persona-link key.
- U46: `addMemberDoctor(tx, input, actor)`, `ensureProvisionalTerm(tx, {kind, text, lang}, actor)`, `taxonomy.resolve` and `listSuggested`, `directory.listDoctors` and `listFacilities`, `review.listExperienceCards`, `ExperienceCardVM` with `BylineVM`, the shared `AccountRow`, and the demo functions it keeps for U47.
- FD-015, FD-022, FD-024, FD-036, FD-091, FD-099, FD-100 and the hard rules in `project.md`.

## Question 1 — Drafts in release 1

The brief defers drafts unless the composer really needs them. FR39 and AC6.1.2 ask for an encrypted server-side autosave that brings the author back to the same step and fields. The story map gives US6.3's draft part to U47, and C9 lists drafts in release 1.

A. **Minimal drafts.** Encrypted save, open, a short list on `/write`, and deletion at publish. A draft lives 30 days after its last save and is checked when it is read. There is no expiry warning, no purge job and no FD-090 grant migration, because both belong to T-309, which is deferred (recommended).
B. No drafts. The form keeps its values only while the page is open, and AC6.1.2 is deferred.
C. Full T-301 drafts with the worker grant, the expiry warning and the `/me` drafts tab.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The composer needs drafts for AC6.1.2, which belongs to a release-1 story. Drafts are deleted at publish, so no review ever reads one. After review R-07, live drafts are capped at 10 per account, a new eleventh one is refused, and the owner can discard a draft from the "Your drafts" list (BR2.6). The T-309 purge has an `S4` row.

## Question 2 — Composer shape

The demo form is one long page. FR39 asks for a step-by-step wizard with progress, Back and Next, and a final preview.

A. **Four steps in the prototype's block order:** 1 the care, 2 your story, 3 how it went, 4 check and publish. Every step can be reached freely, and nothing is checked until Publish (recommended).
B. The T-306 draft's five steps, with a documents step.
C. Keep the single form.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Evidence attaches after publish (Question 3), so the documents step goes away.

## Question 3 — Documents in the composer

U48 attaches evidence to the author's own review by `review_id` and checks authorship through `isReviewAuthor`. C16 says the composer mounts the existing evidence components with their current props.

A. **No documents step.** After publish, the author lands on the experience page, where the author tools already mount `AuthorEvidence reviewPublicId` (current props) (recommended).
B. Upload into the draft before publish. This needs a draft column that `evidence_items` does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). This keeps the demo flow "write, then attach documents" exactly as it works on `main`.

## Question 4 — Anonymous facility visit accounts

U11's `personaFor` refuses anonymous without a `reviewId`, and `persona_links.review_id` points at `reviews` only.

A. **Facility visit accounts offer named or pseudonymous only in release 1.** An FD row narrows FR10 for facility feedback, and an `S4` row records it for release 2 (recommended).
B. Ask U11 to add a no-review anonymous branch. U11 is already designed and merged first.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 5 — Who is the actor in the publish audit row and in the first version row

`AuditActor` is `account:<id>`, `staff:<id>`, `system` or `anonymous`. An `account:<id>` actor on an anonymous review's audit row would link the account to the review outside `persona_links`. The demo also writes the account id into `review_versions.actor_id`.

A. **The author persona: `persona:<personaId>` in the audit row, and the persona id in `review_versions.actor_id`, for every identity mode.** `AuditActor` is widened additively with `persona:${string}`. U46's term and doctor operations inside publish get the same actor. An FD row records it, and `01-conventions.md` §5 gets a dated note (recommended).
B. `account:<id>`. This adds a second linkage store for anonymous reviews.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). U46 already expects "the publishing persona" as the actor (its BR5.3 and BR5.8).

**Added after review R-02 (decided by the agent under the owner's delegation of 2026-11-04):** `addMemberDoctor` writes `profile_submissions.submitted_by_account_id`, and a new doctor's only review would be the one being published. For an anonymous review, that row would link the account to the review outside `persona_links`. So an anonymous review cannot add a doctor who is not listed (BR3.12). The composer explains why in en and bn and asks the author to post under their name or username, or to choose a listed doctor. The command refuses the combination with `review.anonymous_new_doctor` before any write, and a database test proves that no `profile_submissions` row is written for an anonymous review.

## Question 6 — FR46 "What went well / What could improve" checkboxes

They have no column, no prototype screen and no message key.

A. **Defer them to release 2 with an FD row.** AC6.2.3 narrows to its sentiment half: a skipped sentiment publishes and shows "Not provided" (recommended).
B. Design them now, adding a column and new copy.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). This follows the T-301 draft's Question 15.

## Question 7 — Reviewer's labels

The prototype offers three suggested labels (`claim.wrongDx`, `claim.wrongRx`, `claim.secondOpinion`). FR47 also mentions custom labels. The seed stores some claims as Bengali display text.

A. **The three suggested labels, stored as codes. Custom labels are deferred with an FD row. A stored label that is not a known code is shown exactly as written.** Every label is always prefixed "Reviewer's label" (recommended).
B. Add a free-text custom label field now.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The seed needs no rewrite.

## Question 8 — How tags become `review_tags` rows

`review_tags` holds exactly one of a term, free text or Not sure.

A. **A suggested chip stores its term. Typed free text goes through U46's `ensureProvisionalTerm` inside the publish transaction and stores the returned term. Not sure is its own row** (recommended).
B. Store typed text as `free_text` and never create provisional terms. AC5.3.2 would then fail.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Typed text that matches an existing alias stores that term and shows its name. This is recorded as an assumption for U46's alias rules.

## Question 9 — Duplicate warning without the repeat-episode flag

C9 drops `repeatEpisode` (U47 stores nothing for it). AC6.1.5 still lists a duplicate pattern check among the composer's warnings.

A. **A warning only: "You already wrote about this doctor".** It is shown when the author has a published review of the same doctor under any of their personas (`ownPersonaIds`). It never blocks, and it never names or links the earlier review (recommended).
B. The T-301 same-condition-and-month rule. It needs the flag's matching logic, which is release 2.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 10 — Title

`reviews.title` is required. The prototype composer has no title field, and the demo form has one.

A. **An optional title field. When it is blank, the title is the first sentence of the story, or of the first filled section, cut at 80 graphemes with "…"** (recommended).
B. A required title.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 11 — `reviews.language`

A. **Detect it from the script of the title and the story.** Only Bengali letters give `bn`, only Latin letters give `en`, and both give `mixed`. With no letters at all, the actor's locale is used. This is the demo's rule, moved into the domain (recommended).
B. Ask the author.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Nothing is translated (FD-024, FR92).

## Question 12 — Period and private exact date

A. **The month and year are required and pre-filled with the current month.** Years before 2000 and future months are refused. An optional exact date is labelled as private and must fall in that month. It is stored encrypted and never shown publicly (recommended).
B. No exact date field. AC6.2.2 would then be deferred.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 13 — Bylines

A. **A named author is plain text with no link. A pseudonymous `@username` links to `/authors/{username}`. An anonymous review shows "Written anonymously" with the thread alias on its own experience page only, with no link, no initials and no username.** Cards on every list show no alias. AC3.3.6 forbids a staff-access caveat, so the composer's `compose.identity.anonNote` is reworded to "Readers see a name made for this thread only", and the page shows no caveat (recommended).
B. Named names also link to the author page.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). This follows U46's `BylineVM` and T-307's Question 2. FD-022 already puts the staff-access text in the privacy policy only.

## Question 14 — The author page `/authors/[username]`

A. **The named and pseudonymous public reviews whose persona has that username, newest first, each under the identity shown on the review. Anonymous reviews never appear.** An unknown username and a user with no public reviews get the same empty state (status 200, `noindex`), so the page confirms no account (recommended).
B. Answer 404 for an unknown username.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). Reactions, comments and bookmarks on the profile are release 2 (T-409).

## Question 15 — The own-review list on `/me`

`/me/page.tsx` is not listed in U47's owned paths, but the Unit is told to switch the own-review list. U9 edits `ProfileWorkspace.tsx`.

A. **Add `review.listOwnReviews`, built on `ownPersonaIds`, and change the one data call in `me/page.tsx`.** `OwnReviewVM` keeps the shape of `DemoOwnReviewRow`, so `ProfileWorkspace` and U9's link are untouched. The edit is recorded as an owned-path addition (recommended).
B. Make `OwnReviewList` load its own data. This changes `ProfileWorkspace`'s props.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 16 — Which demo code U47 retires

A. **In U47's Bolt, delete everything that only U47's switched files call. Keep, unchanged, the functions that files owned by other Units still call, and name in the file header the Unit that retires each one.** U50 removes anything left without a caller (recommended). The table is in `functional-spec.md` § 9.
B. Delete all of `demo/reviews.ts`. This would break U22's edit route, U48's `actions/evidence.ts` and U49's `actions/comments.ts`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 17 — The experience route folder

A. **Keep `experiences/[id]/`.** The parameter carries a public id with an optional slug (`stripSlug`), as on `main`. Renaming the folder would move U22's `[id]/edit/` (recommended).
B. Rename it to `[publicId]`, as in T-307.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 18 — Related experiences, same-doctor experiences and other experiences by the author on the page

A. **Keep all three, as in the prototype, each read through U46's `listExperienceCards`:** by the page's first condition term (up to 6), by the same doctor (up to 6), and by the same named or pseudonymous persona (up to 10, a filter U47 adds). None appear for an anonymous author, and the page's own review is never listed (recommended).
B. Drop them for release 1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 19 — Composer pickers and id resolution

A. **Doctors come from `directory.listDoctors` and branches from `directory.listFacilities` (first 100 each). Specialties for "Add a doctor" come from a small new taxonomy query, `taxonomy.listSpecialties` (a recorded addition in U46's merged module).** At publish, the review repository turns the doctor's or branch's public id into its internal id with U46's visibility predicate, imported and not rewritten (recommended).
B. Keep U46's demo `listDoctorOptions` and `listSpecialtyOptions`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). More than 100 doctors needs a search picker in release 2 (`S4` row).

## Question 20 — Rate limits (C18 constants)

A. **Publish: 5 per account per 24 hours, shared by doctor reviews and facility visits (`review.publish:account:<accountId>`). It is counted only after validation passes (review R-03). Draft save: 300 per account per hour (`review.saveDraft:account:<accountId>`). Both are per process** (recommended).
B. Separate publish limits per target.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The limits are recorded as `S4` constants for T-105.

## Question 21 — Who may save a draft

T-102's gate shows the form only to `allowed` (confirmed) accounts.

A. **Saving a draft needs a signed-in account with a confirmed email, the same as the gate. Publish also needs "not restricted"** (recommended).
B. Any signed-in account.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 22 — Index paging and count

A. **20 cards per page, newest first, through U46's keyset cursor.** The page has "More experiences" and "Back to the newest" links. A count line "{n} patient experiences" comes from `review.countExperiences`, in the active language's digits. An invalid cursor redirects to the first page (recommended).
B. The demo's fixed 50 with no paging.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 23 — The preview byline before publish

A. **Named and pseudonymous previews use the names from U8's `account.getOwnAccount` (display name, username), which match the current personas. An anonymous preview shows "Written anonymously" without an alias, because the alias is created at publish** (recommended).
B. Create the persona when previewing. A preview would then write.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 24 — The seeded plaintext drafts (ISS-269)

The three or four seeded drafts of `shirin_88` hold plaintext, not ciphertext.

A. **A draft that cannot be decrypted or parsed is treated as unreadable.** It is left out of the list, opening it answers `not_found`, and `review.draft_unreadable` is logged with the draft id only. The seed is unchanged, and an `S4` row hands the encrypted seed drafts to the release-2 drafts tab (recommended).
B. Encrypt the seed drafts now. This needs the seed to import the crypto adapter, which is an FD-093 boundary change.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 25 — The "Edited" date before U22

A. **The `<ReviewHistory>` slot reads `review.lastEditedAt(reviewId)`: the time of the newest `correction` row in `review_versions`, which the demo edit route writes today.** U22 replaces the internals with `getHistory` (recommended).
B. No edited mark until U22.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04).

## Question 26 — After a successful publish

A. **Redirect to the experience page, as the demo does today.** For the author only (checked with `isReviewAuthor`), `?published=1` shows one `PublishTick` with "Your experience is published", announced once. There is no confetti, badge or count. A facility visit redirects to its branch page (recommended).
B. Confirm in place on `/write`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). The author then attaches documents on the page, as in the demo.

## Question 27 — Disclaimer and emergency guidance

A. **The composer and the experience page keep the persistent `disclaimer.long` panel as on `main`. The composer's emergency-word finding shows the configured numbers (`emergency.*`, read through `ConfigProvider`) and never blocks publish. Neither is ever animated or covered** (recommended).
B. Move the disclaimer into the comment slot only.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04). FR75's disclaimer above the thread is U49's.

## Assumptions & Open Questions

- [assumption] U46 exports its review eligibility predicate, its visible-doctor and visible-branch predicates, and its `memberAddedNotConfirmed` SQL expression from the database package, so U47 imports them instead of writing new ones. If U46 merged them as private functions, U47 exports them as a recorded one-line addition and changes no logic.
- [assumption] U46's `listExperienceCards` accepts an additive `personaIds` filter and an `excludePublicId`. If its signature does not have them, U47 adds them as optional parameters (additive under the ownership rules) and adds a dated note to C9.
- [assumption] U46's `ensureProvisionalTerm` returns `{termId}` for both a found term and a new one.
- None of these needs the owner. Each is checked at the start of Code Generation against the merged code.

## Sources

- Initial description: the dispatch brief for U47 (2026-11-04).
- `inception/units-generation/unit-of-work.md` (U47, U22, U46, U48, U49, constants, open points); `unit-of-work-story-map.md`.
- `inception/contract-design/contract-summary.md` C4, C7, C9, C16, C17, C18, C19 and the ownership rules.
- `docs/status/decision-log.md` FD-015, FD-022, FD-024, FD-090, FD-099 to FD-105.
- `construction/t-104-identity-module/functional-design/`, `construction/t-102-patient-auth-screens/functional-design/`, `construction/u46-directory/functional-design/`.
- Drafts `docs/aidlc-migration/design-drafts/t-301-review-module-core/`, `t-306-composer-wizard/`, `t-307-experience-page-and-index/`.
- Code on `main` at `29e1837`: `apps/web/src/server/actions/review.ts`, `packages/database/src/demo/reviews.ts`, `apps/web/src/server/data.ts`, the `/write`, `/experiences`, `/experiences/[id]`, `/authors/[username]` and `/me` pages, `packages/database/src/schema/review.ts`, `packages/contracts/src/{schemas/review.ts,view-models/experience.ts,view-models/composer.ts}`, `packages/application/src/ports/audit-writer.ts`.
