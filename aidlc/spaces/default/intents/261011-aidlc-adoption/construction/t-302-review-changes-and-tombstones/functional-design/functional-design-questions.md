# Functional Design questions — U22 `t-302-review-changes-and-tombstones` (release 1)

## Context

- Unit U22 (untagged, size M, not high risk) delivers the release-1 part of T-302 (FD-105): the author corrects their own review (FR69). Each saved correction writes a `review_versions` row, and the history appears through the `<ReviewHistory reviewPublicId>` slot. Corrections send no email. Deferred to release 2: follow-ups, delete, tombstones and restore, `setState`, `redact` and the deletion step.
- Builds on U47's approved design (`construction/u47-reviews/functional-design/`): the `ReviewSeams` calling convention (§ 2.1), the slot handover (C16), the edit route `experiences/[id]/edit`, and the two S4 rows U47 left for U22: the demo correction writes the account id as `actor_id` (FD row 4), and detailed reviews cannot be edited.
- Read: `unit-of-work.md` (U22, U47), `unit-of-work-story-map.md` (US6.2, US6.3), `stories.md` (AC6.2.1–AC6.2.5, AC6.3.1–AC6.3.5), `requirements.md` (FR69), `contract-summary.md` (C9 release 1 `review.correct` and `review.getHistory`, C15 `review.changed`, C16, C19), U11's design (`IdentityOwnership.ownsPersona`), FD-099 to FD-105, the demo edit code on `main` (`getOwnReviewForEdit`, `updateOwnReview`, `saveReviewEdit`, the edit page, `EditForm`), the schema (`review_versions` has `reason`, `actor_kind`, `actor_id`, `created_at`; no unique key on `(review_id, version)`; append-only trigger), the seed (version 1 rows with `actor_id null` and a partial snapshot), and the earlier draft in `docs/aidlc-migration/design-drafts/t-302-review-changes-and-tombstones/` (written before FD-105; its follow-up, delete, redact and deletion-step questions are out of scope now).

## Settled before this stage

- **FD-105:** release 1 is corrections with versions only; no email from T-302.
- **U47 BR4.7:** publish writes version 1 with the full content snapshot, `actor_kind author`, `actor_id` the author persona.
- **U47 BR6.2, BR6.7, BR6.8:** `isReviewAuthor` is the only authorship check U22 uses; `lastEditedAt` is the newest correction version; the slot names, paths and props are frozen.
- **U11 BR3.5:** U22 never receives `IdentityOwnership`; it goes through `isReviewAuthor`.
- **C9 release 1:** `review.getHistory` returns `{editedAt?, corrections: [{at, field}], versions: [{version, at}]}`, with versions for the author only; `review.correct` emits `review.changed {reviewId, doctorId, branchId?}`.
- **Hard rules:** only the author edits; anonymity never leaks; the version actor is the persona; every string in en and bn.

All questions below were decided by the agent under the owner's delegation of 2026-11-04, by the recommended option (listed first).

## Questions

### Question 1 — Which fields the author can change

The demo edit form changes title, story, sentiment and outcome of quick reviews only. U47 left detailed reviews uneditable.

A. **Title, the story (quick) or the four sections (detailed), sentiment, outcome and the Reviewer's labels. The kind, doctor, relationship, period, exact date, identity mode and tags stay as published** (recommended). Covers both kinds, as U47's S4 row asks. Changing the identity mode could link an anonymous review to a name; changing the doctor or the period would move an account to a different provider; tags go through Taxonomy and are left for release 2.
B. The demo's four fields, extended with sections only. A wrongly chosen "Wrong diagnosis" label could never be removed.
C. Every field, tags and doctor included. Needs Taxonomy and Directory calls, and a doctor change rewrites another doctor's figures.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 2 — Which changes count as material corrections

FR69 and AC6.3.2 make a change to diagnosis, treatment or outcome a dated correction; AC6.3.1 allows a non-substantive presentation edit with only an "Edited" date. A quick review keeps diagnosis and treatment inside one free-text story, so a field-level test cannot see them.

A. **Only the title is presentation. Every other editable field (story, each section, sentiment, outcome, Reviewer's labels) is material** (recommended). Simple, deterministic and conservative: no change to what happened can pass as cosmetic. A typo fix in the story shows as a dated correction, which is honest and needs no extra input.
B. Material only for the diagnosis and treatment sections, outcome and the labels; the quick story, symptoms and after sections, and sentiment as presentation. A quick review's changed diagnosis would then never show as a correction, which fails AC6.3.2.
C. Ask the author to tick "this is a correction". The author could opt out of AC6.3.2.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 3 — What readers see of a correction

AC6.3.2 says the original account stays readable and the prior version is kept privately. C9 gives the public `corrections: [{at, field}]` and the versions to the author only.

A. **Readers see "Edited {month year}" after any author edit. For each material correction they also see a dated line naming the corrected parts ("Corrected: outcome, story — May 2026") and a "Show original" disclosure with the text of the version just before that correction. A title-only edit keeps no public original. No free-text reason is asked** (recommended; revised after review R-01). This follows AC6.3.2 and C9 literally ("the original still readable"). The edit form warns the author that the earlier wording stays readable after a material correction. A reason would be a new public free-text field while moderation is deferred, so the `reason` column stays null.
B. The dated line only, with earlier texts private. This meets AC6.3.2 only under a narrow reading, and the review flagged it as a product decision.
C. A required public reason with each correction. This adds a new unmoderated public text surface in release 1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04; revised to "Show original" on 2026-11-05 after review R-01, by recommendation under the same delegation)

### Question 4 — What a version row holds

U47 writes version 1 as the content at publish. The demo correction writes the content after the change. The earlier draft proposed "content before the change", which no longer fits because version 1 already exists.

A. **Version n holds the full content of version n (after the change), plus `corrected`, the list of material field codes changed from version n−1 (empty for a title-only edit). `actor_kind author`, `actor_id` the review's author persona id, `reason` null** (recommended). Same convention as U47 and the demo; storing `corrected` at write time means the history never diffs snapshots, so the seed's partial version 1 rows cannot produce false corrections.
B. Derive the corrected fields at read time by diffing consecutive snapshots. The seed's version 1 rows lack sentiment and outcome, so the first correction of every seeded review would show false entries.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 5 — Two saves of the same review at once

There is no unique key on `(review_id, version)`, and the demo update has no version check.

A. **The form carries `expectedVersion`; the command locks the review row (`FOR UPDATE`) and answers `conflict` (`errors.review.editConflict`, "This review changed in another tab — reload to see the latest") when the stored version differs** (recommended; message refined after review R-04). No lost update, no duplicate version number, and no migration.
B. Last write wins. A second tab silently overwrites the first and can write a duplicate version number.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 6 — A limit on corrections

T-302 sets none. Each accepted correction writes a version row, an audit row and an outbox event.

A. **30 accepted corrections per account per 24 hours, a code constant (C18). A rolled-back correction uses no slot. `RateLimiter.hit` cannot check a count without adding to it, so the command uses the port's `reserveFailure` on `review-correct:account:<accountId>` with a 24-hour window. The slot is reserved before the transaction and released when the save is refused or rolls back. It is kept only after the commit, which has the same effect as hitting after the commit. When the limit is reached, the message is `errors.review.correctionsLimit`, which names no minutes** (recommended; refined after reviews R-04 and R-07). The limit is far above honest use, stops a script, and needs no new runtime setting.
B. No limit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 7 — Who may correct, and which reviews

A. **Only the author, checked through `isReviewAuthor` inside the transaction, with the same contribution gate as publishing (signed in, confirmed email, not restricted); only an eligible (published) review. Anyone else, an unknown id and an ineligible review all get the same `not_found`; no staff bypass** (recommended). One authorship check across U22, U47 and U48; the answer never tells "not yours" from "does not exist", so anonymous reviews give nothing away.
B. Owner check by persona lookup in the review module. U11 BR3.5 forbids U22 from holding `IdentityOwnership`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 8 — Demo version rows that name an account

The demo's `updateOwnReview` wrote `actor_id = accountId` (U47 FD row 4). `review_versions` is append-only, so an `UPDATE` is blocked by the trigger.

A. **No data migration. From U22's merge every new row names the persona; the history never reads `actor_id`; the local demo data is rebuilt with `pnpm demo:reset` (synthetic data only). The `actor_id` column comment in `schema/review.ts` is corrected to "the author persona id"** (recommended). The old rows exist only in local synthetic databases and are never shown.
B. A migration that disables the trigger to rewrite old rows. Weakens an append-only guarantee for synthetic data.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 9 — Where the author's version list ends

C9 gives the author `versions: [{version, at}]`. AC6.3.2 keeps prior versions private.

A. **The author sees a private list of their versions (number, date, "Published", "Edited" or "Corrected: …"). The list shows no texts; the public "Show original" of Question 3 is the only place an earlier text appears** (recommended). This meets C9 without a second text viewer. Viewing every version's text privately can be added in release 2.
B. Also show each earlier text to the author. A new private viewer, more copy and tests, beyond C9.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 10 — Saving without changes

A. **A save with no change writes nothing (no version, audit, event or rate-limit hit) and returns to the experience page** (recommended). An "Edited" mark never appears for nothing.
B. Write a version anyway. A false "Edited" date.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

### Question 11 — Where the new edit action lives, and when the demo edit code goes

`server/actions/review.ts` is U47's file. `getOwnReviewForEdit` is also called by U48's `actions/evidence.ts`.

A. **U22 adds `server/actions/review-edit.ts` with `correctReviewAction` and deletes `saveReviewEdit` and its edit-only helpers from `review.ts`. During the build, U22's Bolt deletes only what it alone calls: `updateOwnReview` and `snapshotOf`. It stops calling `getOwnReviewForEdit`. The shared demo functions, bindings, types and `demo/reviews.ts` are handled at merge: after rebasing on `main`, the merging Unit deletes a shared item only when a grep finds no caller left, and otherwise leaves it for the next Unit. U50 removes anything still left** (recommended; merge-time mechanism added after review R-02). This follows U47's table § 9. No Unit needs to know its merge position while it is being built.
B. U22 deletes every demo edit function at once. Breaks U48's branch if U48 merges after U22 without having switched.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Assumptions & Open Questions

None.
