# Business rules — U22 `t-302-review-changes-and-tombstones` (release 1)

Rules for `review.correct`, `review.getOwnForEdit`, `review.getHistory`, the edit route and the `<ReviewHistory>` slot. U47's rules apply unchanged where cited (U47 BRx.y). The YAML block is the source of truth; the table after it is a summary.

```yaml
rules:
  # BR1 — Who may correct, and what
  - id: BR1.1
    statement: "Only the review's author may correct it or open its edit form; anyone else, an unknown id and an ineligible review get the same not_found."
    category: authorization
    applies_to: "review.correct, review.getOwnForEdit, experiences/[id]/edit"
    trigger: "Edit page load, Save"
    logic: "in this order, in one read or transaction: reviewId = reviewIdForPublicId(tx, {publicId}); IF null THEN not_found; IF NOT isReviewPublished(tx, {reviewId}) THEN not_found; IF NOT isReviewAuthor(tx, {reviewId, actor}) THEN not_found; every not_found maps to errors.common.notFound; no staff bypass; U22 never receives IdentityOwnership (U11 BR3.5)"
    violation: "A different answer for 'not yours' and 'does not exist', which would reveal who wrote an anonymous review"
    source: "FR69, C9 isReviewAuthor, U47 BR6.2, Question 7"
  - id: BR1.2
    statement: "A correction needs the same contribution gate as publishing: signed in, confirmed email, not restricted."
    category: authorization
    applies_to: "review.correct"
    trigger: "Save"
    logic: "defineCommand requires authenticated → verifiedEmail → notRestricted, the order of U47's publish; the edit page asks a signed-out visitor to sign in with returnTo the edit route"
    violation: "An unconfirmed or restricted account changing public content"
    source: "C9 review.publish requires, Question 7"
  - id: BR1.3
    statement: "A correction can change only the title, the story or sections, sentiment, outcome and the Reviewer's labels; it never changes kind, doctor, relationship, period, exact date, identity mode, tags, state or author."
    category: validation
    applies_to: "CorrectReviewInput, review.correct"
    trigger: "Save"
    logic: "strict schema with no other key; content.kind must equal the stored kind ELSE validation (errors.common.validation); the repository update sets only ENT-101's changeable columns"
    violation: "An identity-mode change linking an anonymous review to a name, or a review moved to another doctor"
    source: "Question 1, compose.edit.intro"
  - id: BR1.4
    statement: "At most 30 accepted corrections per account per 24 hours; only a committed correction uses a slot."
    category: policy
    applies_to: "review.correct"
    trigger: "Save, after BR2 and BR3.2 (validation passed, something changed)"
    logic: "RateLimiter.reserveFailure(review-correct:account:<accountId>, 24 h), limit 30 as a C18 code constant; IF earlier.length >= 30 THEN release, rate_limited (errors.review.correctionsLimit, no minutes) and nothing is written; IF the save is refused or the transaction rolls back THEN release; the slot is kept only after commit; hit is not used because it cannot check without counting (review R-07)"
    violation: "A script flooding versions, audit rows and events"
    source: "Question 6"

  # BR2 — Content validation (same minimum as publishing)
  - id: BR2.1
    statement: "A quick review's story stays 20..10000 graphemes after trim."
    category: validation
    applies_to: "CorrectReviewInput.content (quick)"
    trigger: "Save"
    logic: "IF story out of range THEN validation with fieldErrors.story = errors.review.missingStory (U47 BR3.2 key)"
    violation: "A correction that empties a published review"
    source: "U47 BR3.2, AC6.3.1"
  - id: BR2.2
    statement: "A detailed review keeps at least one non-empty section, each 1..5000 graphemes, all together at least 20; empty sections are dropped, never stored as blank."
    category: validation
    applies_to: "CorrectReviewInput.content (detailed)"
    trigger: "Save"
    logic: "trim each section; remove empty keys; IF none left OR total < 20 OR any > 5000 THEN validation with errors.review.missingStory"
    violation: "A blank heading on the page or a detailed review with no account"
    source: "U47 BR3.2, AC6.2.1"
  - id: BR2.3
    statement: "The title follows U47's title rule and the language is recomputed from the new text."
    category: calculation
    applies_to: "Review.title, Review.language"
    trigger: "Save"
    logic: "title = U47 BR3.6 (author's title 1..120 graphemes, else derived); language = U47 BR3.7 on the new title and text; text kept as written by U47 BR3.9 (outer whitespace trimmed, invisible control characters refused); never translated"
    violation: "A missing title or a wrong lang attribute after an edit"
    source: "U47 BR3.6, BR3.7, BR3.9, FR92"
  - id: BR2.4
    statement: "Sentiment and outcome stay optional, and the Reviewer's labels stay the author's claims: new labels only from the three codes, a seeded free-text label only kept or removed."
    category: validation
    applies_to: "CorrectReviewInput.sentiment, outcome, claims"
    trigger: "Save"
    logic: "sentiment, outcome: absent or one enum value (absent renders Not provided); claims: each a code OR a label equal to one already stored; duplicates refused; ELSE validation with fieldErrors.claims = errors.common.validation"
    violation: "A numeric judgement, a 0 for a missing value, or a new free-text claim written without moderation"
    source: "U47 BR3.8, AC6.2.3, AC6.2.4"

  # BR3 — Versions
  - id: BR3.1
    statement: "Only the title is a presentation field; every other changed field is a material correction."
    category: calculation
    applies_to: "packages/domain/src/review/versioning.ts classifyChange"
    trigger: "Save, after BR2"
    logic: "compare the normalised new content with the locked current content; changed = fields that differ; corrected = changed minus title, as CorrectionField codes in the fixed ENT-103 order (quick body → story; each section → its key; sentiment; outcome; claims compared as sets)"
    violation: "A changed diagnosis, treatment or outcome shown only as Edited"
    source: "FR69, AC6.3.1, AC6.3.2, Question 2"
  - id: BR3.2
    statement: "A save that changes nothing writes nothing."
    category: policy
    applies_to: "review.correct"
    trigger: "Save, after BR3.1"
    logic: "IF changed is empty THEN ok {publicId, version: current, changed: false} with no update, version, audit, outbox or rate-limit hit"
    violation: "An Edited mark on an unchanged review"
    source: "Question 10"
  - id: BR3.3
    statement: "An accepted correction is one transaction: lock, version check, update, version row, audit row, outbox event."
    category: constraint
    applies_to: "review.correct"
    trigger: "Save, after BR1–BR3.2"
    logic: "SELECT the review FOR UPDATE; IF version != expectedVersion THEN conflict; UPDATE content columns, version = version + 1, updated_at = now; INSERT review_versions (BR3.4); AuditWriter.write(action review.corrected (past tense, like review.published), target review:<id>, actor persona:<authorPersonaId>, fields {version, corrected}); Outbox review.changed {reviewId, doctorId, branchId?}; any failure rolls everything back"
    violation: "A content change without its version row, or a version row without its change"
    source: "C9 review.correct, C15 review.changed, Question 5"
  - id: BR3.4
    statement: "The version row holds the full new content and the corrected list, with the author persona as actor and no identity data."
    category: constraint
    applies_to: "review_versions"
    trigger: "BR3.3"
    logic: "version = new reviews.version; change_kind correction; actor_kind author; actor_id = reviews.author_persona_id; reason null; snapshot {kind, title, body | sections, sentiment, outcome, claims, corrected}; never the account id, the exact date, the doctor or the identity mode"
    violation: "An account id in actor_id (the retired demo behaviour), which links an anonymous review to its account"
    source: "U47 BR4.7, U47 FD row 4, Question 4, Question 8"
  - id: BR3.5
    statement: "A stale form never overwrites a newer version."
    category: constraint
    applies_to: "review.correct"
    trigger: "Save"
    logic: "IF the locked version differs from expectedVersion THEN conflict (errors.review.editConflict: This review changed in another tab — reload to see the latest); the form keeps the typed values and offers to reload"
    violation: "A lost update or two version rows with the same number"
    source: "Question 5"
  - id: BR3.6
    statement: "Version rows are never changed or removed by U22, and a correction sends no email."
    category: policy
    applies_to: "review_versions, review.correct"
    trigger: "Always"
    logic: "insert only (the append-only trigger also refuses UPDATE and DELETE); no Notification call, no mail job; the 180-day retention purge (FD-004) is release 2"
    violation: "A rewritten history or an email sent by T-302 in release 1"
    source: "FR69, FD-004, FD-105, C9"

  # BR4 — History
  - id: BR4.1
    statement: "Readers see 'Edited' with the month and year of the newest author correction, and nothing when there is none."
    category: calculation
    applies_to: "ReviewHistoryVM.editedAt, <ReviewHistory>"
    trigger: "Experience page render"
    logic: "editedAt = U47 lastEditedAt (max created_at of change_kind correction); rendered as label.edited + month year in Asia/Dhaka with locale digits"
    violation: "An Edited mark on an unedited review, or none after an edit"
    source: "AC6.3.1, U47 BR6.7"
  - id: BR4.2
    statement: "After a material correction the original account stays readable to every reader: each material correction shows as a dated line naming the corrected parts, with a Show original disclosure holding the text of the version just before it; a title-only edit keeps no public original."
    category: policy
    applies_to: "ReviewHistoryVM.corrections, <ReviewHistory>"
    trigger: "Experience page render"
    logic: "for each correction version n with non-empty corrected, oldest first: {at: created_at, fields: corrected, original: snapshot of version n-1 as OriginalTextVM}; rendered as history.corrected plus a closed details history.showOriginal with the original title, story or sections, and the sentiment, outcome and labels it has; keys the snapshot lacks are omitted; the original carries lang by U47 BR3.7; a version with corrected [] (title only) adds no line and no original"
    violation: "A silent material change, an original that cannot be read, or a public original for a title-only edit"
    source: "AC6.3.2, C9 review.correct (the original still readable) and getHistory, FR69, Question 3"
  - id: BR4.3
    statement: "Only the author sees the list of versions, and it shows numbers, dates and kinds only."
    category: authorization
    applies_to: "ReviewHistoryVM.versions"
    trigger: "review.getHistory"
    logic: "IF isReviewAuthor(tx, {reviewId, actor}) THEN versions newest first, kind published for change_kind publish, edited for an empty or missing corrected (a missing key reads as [], review R-05), corrected otherwise ELSE versions absent"
    violation: "Another reader learning that they are not the author by a different response, or seeing private texts"
    source: "C9 getHistory, AC6.3.2, Question 9"
  - id: BR4.4
    statement: "getHistory answers not_found for an unknown or ineligible review and never returns an actor, an account, a persona, a reason, or the text of any version except the originals of BR4.2."
    category: constraint
    applies_to: "review.getHistory"
    trigger: "<ReviewHistory> render"
    logic: "reviewId = reviewIdForPublicId; IF null OR NOT isReviewPublished THEN not_found; the repository's history read selects version, change_kind, created_at, snapshot.corrected, and the content snapshot only of versions directly followed by a material correction; never actor_id or reason"
    violation: "A history leaking who edited, or text the author removed"
    source: "C9, C16 rules"
  - id: BR4.5
    statement: "The ReviewHistory slot keeps its frozen props, resolves the id itself and never throws into the page."
    category: constraint
    applies_to: "components/patient/review-history/ReviewHistory.tsx"
    trigger: "Experience page render"
    logic: "props {reviewPublicId} only; not_found or no edits → renders nothing; an unexpected failure → the bilingual fallback history.unavailable, logged through the logger port with allowlisted fields"
    violation: "A broken slot that blanks the experience page, or an internal id in the browser"
    source: "U47 BR6.4, BR6.8, C16"

  # BR5 — Edit route and page integration
  - id: BR5.1
    statement: "The edit route serves the author only, for quick and detailed reviews alike, and is never indexed."
    category: authorization
    applies_to: "experiences/[id]/edit/page.tsx, review.getOwnForEdit"
    trigger: "Edit page request"
    logic: "publicId = stripSlug(id); null → notFound(); requireAccount(returnTo /experiences/{id}/edit); getOwnForEdit by BR1.1; not_found → notFound(); render EditForm for vm.kind; metadata noindex"
    violation: "A detailed review that cannot be edited, or an edit page that confirms authorship to someone else"
    source: "U47 FD row (detailed reviews), C16 edit_link"
  - id: BR5.2
    statement: "The experience page shows the edit link to the author for every review kind."
    category: authorization
    applies_to: "ExperiencePage, AuthorTools (U47's files)"
    trigger: "U22 merge"
    logic: "remove U47's ASSUMPTION(U47) condition vm.reviewKind === 'quick'; editHref is shown whenever AuthorTools renders (isAuthor, U47 BR6.6)"
    violation: "An edit link hidden from the author of a detailed review"
    source: "U47 BR6.6, Question 1"
  - id: BR5.3
    statement: "Every new string exists in en and bn with the same key, in the same commit."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Build"
    logic: "keys of functional-spec.md § 7; pnpm check's parity step fails on a missing key"
    violation: "A hard-coded string or a key without its Bengali entry"
    source: "ADR 0011, FD-024"
  - id: BR5.4
    statement: "After an accepted or unchanged save the author returns to the experience page; a refused save stays on the form with every message in the active language."
    category: policy
    applies_to: "server/actions/review-edit.ts correctReviewAction"
    trigger: "Save"
    logic: "ok → revalidatePath and redirect /{locale}/experiences/{publicId}; validation → field errors (messageKey per field) and errors.common.validation in the summary; conflict → errors.review.editConflict with a reload link; rate_limited → errors.review.correctionsLimit; forbidden → errors.common.forbidden; not_found → errors.common.notFound; unexpected → errors.common.internal, logged"
    violation: "A lost edit on a refused save, or an untranslated error"
    source: "01-conventions.md §6, demo saveReviewEdit behaviour"

  # BR6 — Retiring the demo edit code
  - id: BR6.1
    statement: "During its build U22 deletes only the demo code it alone calls; shared demo code is deleted at merge time only when no caller is left."
    category: policy
    applies_to: "demo/reviews.ts, server/actions/review.ts, server/data, contracts demo types"
    trigger: "U22 Code Generation and merge"
    logic: "in U22's Bolt delete saveReviewEdit and its edit-only helpers, updateOwnReview, snapshotOf and their bindings and tests, and stop calling getOwnReviewForEdit; at merge, after rebasing on main, grep apps/ and packages/ for each shared item (getOwnReviewForEdit, personasOf, getReviewByPublicId, the server/data reviews binding, DemoReviewEditRow, DemoUpdateReviewFields, demo/reviews.ts); delete an item only when no caller is left, in a separate commit followed by pnpm check; otherwise leave it for the next Unit; U50 removes leftovers"
    violation: "Dead demo code left behind, or a deletion that breaks another Unit's unmerged branch"
    source: "U47 functional-spec § 9, Question 11, review R-02"
```

## Summary

| Group | Rules | In short |
|---|---|---|
| BR1 | BR1.1–BR1.4 | Author only, with one `not_found` for everyone else; the publish gate; the fixed set of changeable fields; 30 committed corrections a day. |
| BR2 | BR2.1–BR2.4 | The same minimum content as publishing, for quick and detailed reviews; title and language rules reused; labels stay claims. |
| BR3 | BR3.1–BR3.6 | Title is presentation, everything else material; no-op writes nothing; one transaction with a version check; the persona as actor; append-only; no email. |
| BR4 | BR4.1–BR4.5 | Edited date and dated correction lines with Show original for every reader; version list for the author only; no identity in the history; the slot never breaks the page. |
| BR5 | BR5.1–BR5.4 | The edit route for both kinds, author only and `noindex`; the edit link for every kind; en and bn; redirects and refusals. |
| BR6 | BR6.1 | Demo edit code: own items during the build, shared items at merge after a caller grep. |
