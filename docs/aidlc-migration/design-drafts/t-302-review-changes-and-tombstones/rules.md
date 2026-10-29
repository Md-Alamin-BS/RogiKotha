# Business rules — U22 `t-302-review-changes-and-tombstones`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U22), `stories.md` (US6.2, US6.3, US10.3), `requirements.md` (FR13, FR55, FR69–FR71), `contract-summary.md` (C3, C9, C15), T-302 with its two amendment sections, FD-049, FD-073, FD-077, FD-079, FD-086, FD-087, FD-092, FD-093, the project hard rules (`project.md`), `01-conventions.md` §2–§5 and §10, `02-data-model.md` §6, §10 and §17, the prototype, and the U21 T-301 design draft, whose state machine and projection this Unit extends. Workflows, ports and view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 1–14 were answered A by the agent under the owner's no-questions instruction of 2026-10-29; all await the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. Rules resting on an FD entry the build appends name it as `FD entry (a)`–`(e)` of `functional-spec.md` § 17.

```yaml
rules:
  - id: BR1.1
    statement: "review.addFollowUp and review.correct require a verified email and an account that is not restricted; review.delete, review.restore, facilityReview.delete, facilityReview.restore and review.getHistory require only an authenticated account."
    category: authorization
    applies_to: "modules/review/commands/{add-follow-up,correct,delete,restore,facility-review-delete,facility-review-restore}.ts, queries/get-history.ts"
    trigger: "Any author command"
    logic: "addFollowUp, correct: requires ['authenticated','verifiedEmail','notRestricted'] (U8 order); delete, restore and the facility mirrors: requires ['authenticated']; a suspended, banned or deleted account gets an anonymous Actor from getActor and is refused with forbidden"
    violation: "A restricted account publishing new text through an edit, or a restricted author unable to withdraw their own account of events"
    source: "C9, FR71 (authors may delete), U21 BR1.3, 01-conventions.md §5"
  - id: BR1.2
    statement: "A review is changed only by its author; any other account gets not_found and nothing changes."
    category: authorization
    applies_to: "every author command and review.getHistory (author branch)"
    trigger: "Any command that names a review by public id"
    logic: "load the review row FOR UPDATE by public id; IF none OR identity.ownsAnyPersona({accountId: actor.accountId, personaIds: [row.author_persona_id]}) is false THEN not_found (never forbidden)"
    violation: "Editing, deleting or restoring someone else's review; an answer that reveals another account's review ids"
    source: "T-302 step 5 (owner), 01-conventions.md §5, U21 BR1.2"
  - id: BR1.3
    statement: "Author commands take the review's public id; the internal operations setStateOn, redactOn and deletionStepOn take internal ids and are never server actions."
    category: constraint
    applies_to: "contracts schemas/review.ts, modules/review/commands"
    trigger: "Defining an input"
    logic: "AddFollowUpInput, CorrectReviewInput, DeleteReviewInput, RestoreReviewInput, the facility mirrors and GetReviewHistoryInput carry publicId; SetReviewStateInput, RedactReviewInput carry reviewId (uuid); deletionStepOn takes accountId; none of the internal three is exported from apps/web/src/server/actions"
    violation: "An internal id in a page URL or view model, or a page able to call setState"
    source: "Question 12, 03-routes-and-contracts.md §2 (public ids), C9 (setState internal)"
  - id: BR1.4
    statement: "An account may add at most 30 follow-ups and corrections together per 24 hours."
    category: constraint
    applies_to: "add-follow-up.ts, correct.ts"
    trigger: "Each accepted call"
    logic: "rateLimiter.hit('review.change:account:<accountId>', 30, 86400); allowed false -> rate_limited with retryAfter; a refused call writes nothing; the limit is a code constant until U41 T-502 (no runtime setting in release 1)"
    violation: "A script flooding review.changed events and search refreshes"
    source: "Question 13, U21 BR1.4 (publish limit pattern), the owner's T-105 answer (release 1 settings narrowed)"
  - id: BR2.1
    statement: "An author may add follow-ups and corrections only while the review is published or hidden pending review."
    category: constraint
    applies_to: "add-follow-up.ts, correct.ts, domain/review/policies.ts canAuthorEdit"
    trigger: "addFollowUp or correct"
    logic: "canAuthorEdit(domainState) = domainState in {published, hidden_pending_review}; otherwise review.not_editable (hidden, deleted, deleted_tombstone, draft, pending_review, rejected)"
    violation: "Editing a hidden, deleted or removed review (task row 'Hidden not editable')"
    source: "T-302 step 5 (correct), task acceptance row 'Hidden not editable'"
  - id: BR3.1
    statement: "Follow-ups display in date order below the story; exactly one, the newest follow_up by date, is current, and nothing an author sends can choose it."
    category: calculation
    applies_to: "domain/review/follow-up.ts orderForDisplay, currentOf; projection.ts"
    trigger: "Building an experience page"
    logic: "spine = all follow-ups except the newest later_care, sorted by (dated_year, dated_month, created_at, id) ascending; current = the follow_up kind entry with the greatest (dated_year, dated_month, created_at, id); isCurrent true on it only; currentStatus = {dated, body} of it or null; no input field, column or command sets current"
    violation: "An older entry shown as current, or a pin field anywhere (AC6.3.3, threat note 'Author pins an old follow-up')"
    source: "FR70, AC6.3.3, prototype renderAccount spine and experience.currentNote, Question 1"
  - id: BR3.2
    statement: "reviews.latest_status is the body of the current follow-up, recomputed whenever follow-ups change."
    category: calculation
    applies_to: "add-follow-up.ts, redact.ts, repository setLatestStatus"
    trigger: "A follow-up added or redacted"
    logic: "latest_status = body of currentOf(followUps) or null; the page reads the follow-up rows, the column is a cache"
    violation: "A stale status on a card after an update or a redaction"
    source: "02-data-model.md §6 (latest feeds reviews.latest_status), seed precedent"
  - id: BR3.3
    statement: "An author adds follow_up or later_care entries; a correction entry comes only from a material correct."
    category: constraint
    applies_to: "AddFollowUpInput, add-follow-up.ts"
    trigger: "addFollowUp"
    logic: "kind in {follow_up, later_care}; kind = correction -> validation; body 10..2000 graphemes after trim; dated not after the current Bangladesh month (errors.review.followUpFuture) and year >= 1950; laterProvider (<= 120 graphemes) and laterDoctorPublicId only with later_care"
    violation: "A free-standing 'correction' that no version row backs"
    source: "T-302 steps 1 and 5, 02-data-model.md §6 (correction body is the stated reason)"
  - id: BR3.4
    statement: "A later doctor is linked only when the author names a visible doctor; otherwise the provider stays unlinked text with an offer to submit a profile."
    category: validation
    applies_to: "add-follow-up.ts, projection.ts laterCare"
    trigger: "A later_care entry with laterDoctorPublicId, and every page read"
    logic: "resolve laterDoctorPublicId with directory.resolvePublicId (redirects followed) and require a visible doctor, else validation with fieldErrors.laterDoctor; store later_doctor_id; on read, link only while the doctor is visible, else show later_provider_text; offerProfileSubmission = no doctor linked"
    violation: "A link to a hidden doctor, or no way to submit a missing profile (AC6.2.5)"
    source: "FR55, AC6.2.5, experience.laterCareNote"
  - id: BR3.5
    statement: "Later care never counts for the later doctor or facility."
    category: constraint
    applies_to: "every doctor and facility read (U14), add-follow-up.ts"
    trigger: "Any summary, count or card"
    logic: "no read counts review_follow_ups; a later_care entry writes no review row, no doctor-side event and nothing in review_tags"
    violation: "A later doctor's summary changing or gaining a review (AC6.2.5)"
    source: "AC6.2.5, experience.laterCareNote, hard rule on facility and doctor separation"
  - id: BR3.6
    statement: "The newest later_care entry is the Later or alternative care callout; older ones stay in the spine labelled later care."
    category: calculation
    applies_to: "domain/review/follow-up.ts laterCareOf, projection.ts"
    trigger: "Building an experience page"
    logic: "laterCare = later_care entry with the greatest (dated_year, dated_month, created_at, id) or null; it is not in the spine"
    violation: "Later care mixed into the reviewed care or shown twice"
    source: "T-302 step 1, prototype renderAccount (callout), AC6.2.5"
  - id: BR4.1
    statement: "Every accepted author edit writes the previous content as a private review_versions row first, then bumps the version."
    category: constraint
    applies_to: "correct.ts, repository insertVersion, updateContent"
    trigger: "correct with any change"
    logic: "insertVersion {version: current, snapshot: snapshotOf(before), change_kind: correction, reason: material ? reason : null, actor_kind: author, actor_id: authorPersonaId}; then updateContent with version + 1; one transaction"
    violation: "An edit with no way to read what was there before (threat note 'edits a negative account into a different story')"
    source: "FR69, AC6.3.2, T-302 step 5, Question 7"
  - id: BR4.2
    statement: "The kind, doctor, branch, period, exact date, relationship and identity mode of a published review cannot be edited."
    category: constraint
    applies_to: "CorrectReviewInput, correct.ts"
    trigger: "correct"
    logic: "the schema has no such fields; an input carrying them fails validation"
    violation: "Moving an account to another doctor or period after publication"
    source: "T-302 step 5 input, FD-080 (repeat episode keys), Question 2"
  - id: BR4.3
    statement: "A material change is a change of the story, any section, the Reviewer's labels, sentiment, outcome, or the condition, treatment or medicine tags; a change of the title or symptom tags alone is not material."
    category: calculation
    applies_to: "domain/review/versioning.ts materialFieldsChanged"
    trigger: "correct"
    logic: "compare normalised values (NFC, trimmed; sections by key, empty dropped; claims as sorted codes; tags per group as sets of effective term id, normalised free text or notSure); material = any differs among body, sections, claims, sentiment, outcome, tags of group condition|treatment|medicine"
    violation: "An outcome flipped from worse to helped with no dated correction (AC6.3.2)"
    source: "FR69, AC6.3.1, AC6.3.2, Question 2, FD entry (c)"
  - id: BR4.4
    statement: "A material change needs a reason of 10 to 500 graphemes."
    category: validation
    applies_to: "correct.ts"
    trigger: "correct with a material change"
    logic: "IF material AND (reason absent OR length outside 10..500 graphemes) THEN validation with fieldErrors.reason = errors.review.correctionReasonRequired, nothing written"
    violation: "A dated correction with nothing to explain it"
    source: "T-302 step 5 (reason required), 02-data-model.md §6"
  - id: BR4.5
    statement: "A material change also publishes a dated correction entry carrying the author's reason."
    category: calculation
    applies_to: "correct.ts"
    trigger: "correct with a material change"
    logic: "insert review_follow_ups {kind: correction, dated = monthOf(clock.now()), body: reason, state: published}; a non-material change inserts none"
    violation: "A material change without a dated public trace (AC6.3.2), or a correction entry for a title fix (AC6.3.1)"
    source: "FR69, AC6.3.1, AC6.3.2, T-302 step 5"
  - id: BR4.6
    statement: "correct carries the version it was based on; a stale version is refused."
    category: constraint
    applies_to: "correct.ts"
    trigger: "correct"
    logic: "IF input.expectedVersion <> row.version THEN conflict, nothing written; the edit form reads the version from review.getHistory current"
    violation: "Two open edit forms silently overwriting each other"
    source: "01-conventions.md §3 (conflict), developer view"
  - id: BR4.7
    statement: "A correct that changes nothing writes nothing."
    category: constraint
    applies_to: "correct.ts"
    trigger: "correct with all fields equal after normalisation"
    logic: "return ok({version, material: false, changed: false}); no version row, no audit, no outbox"
    violation: "An Edited marker on an unchanged review"
    source: "AC6.3.1 (Edited only when edited)"
  - id: BR4.8
    statement: "A corrected review still meets the publish minimum and gets its language recomputed."
    category: validation
    applies_to: "correct.ts (reusing U21's publish checks and language detection)"
    trigger: "correct"
    logic: "run U21's minimum (title, story or a section, period) on the proposed content -> review.min_fields with field errors; language = U21 detector over the new text"
    violation: "An emptied review that stays published"
    source: "U21 BR3.1 and BR4.4, FR39"
  - id: BR5.1
    statement: "An author may delete their review while it is published, hidden pending review or hidden."
    category: constraint
    applies_to: "delete.ts, domain/review/review-state.ts"
    trigger: "review.delete"
    logic: "domainState in {published, hidden_pending_review, hidden} -> proceed; otherwise conflict"
    violation: "An author unable to withdraw a reported review, or deleting twice"
    source: "FR71, Question 8, FD entry (e)"
  - id: BR5.2
    statement: "Delete leaves a tombstone when the discussion has comments and otherwise a soft delete that keeps the stored state; both are restorable for 30 days."
    category: calculation
    applies_to: "delete.ts, repository markDeleted"
    trigger: "review.delete"
    logic: "IF discussion.hasDiscussion(tx, id) THEN state = deleted_tombstone ELSE state unchanged; deleted_at = now; restore_until = now + 30 days; hidden_at and hidden_reason_code unchanged"
    violation: "A deleted enum value written (FD-049), or a thread left without context (AC6.3.4)"
    source: "FR71, AC6.3.4, FD-049, T-302 step 4"
  - id: BR5.3
    statement: "Discussion exists when Community reports at least one comment the thread still renders."
    category: calculation
    applies_to: "DiscussionPresence.hasDiscussion (declared here, built by U30 T-401)"
    trigger: "review.delete"
    logic: "true when a comment on the review is published or is a comment tombstone; removed comments with no replies do not count; read on the delete transaction"
    violation: "A tombstone over an empty thread, or a soft delete that orphans visible replies"
    source: "C9 DiscussionPresence, 02-data-model.md §8 (comment tombstones)"
  - id: BR5.4
    statement: "Deleting or restoring sends no email and creates no notice."
    category: constraint
    applies_to: "delete.ts, restore.ts, facility mirrors"
    trigger: "Author delete or restore"
    logic: "no call to notification queueing; outbox review.deleted or review.restored only (C15 routes them to search.refresh)"
    violation: "Any email_deliveries row, mail.send job or notice from these commands"
    source: "FD-087, task acceptance rows FD-087"
  - id: BR5.5
    statement: "Delete has no hold branch and its result never mentions a hold."
    category: constraint
    applies_to: "delete.ts"
    trigger: "review.delete"
    logic: "result = {mode, restoreUntil}; no hold read here; U29 T-309 inserts its check later without changing this result"
    violation: "An author told their review is held (FD-079)"
    source: "FD-073, FD-079"
  - id: BR5.6
    statement: "Deleting a review does not touch its evidence; public artifacts stop answering because evidence reads require an eligible review."
    category: constraint
    applies_to: "delete.ts; C8 evidence.getPublic (U25 T-305)"
    trigger: "review.delete"
    logic: "no evidence write; evidence.getPublic answers only when the review is published and deleted_at is null"
    violation: "A deleted review's documents still served publicly"
    source: "T-302 step 5 (delete), C8"
  - id: BR5.7
    statement: "Facility feedback deletes as a soft delete only and writes no outbox event."
    category: calculation
    applies_to: "facility-review-delete.ts, facility-review-restore.ts"
    trigger: "facilityReview.delete or restore"
    logic: "facility_reviews keeps state, sets deleted_at and restore_until (restore clears both); no event, as U21's facility publish (its BR8.3); restore follows BR6.1 with 'under moderation' read as state in {hidden_pending_review, hidden}"
    violation: "A facility tombstone (facility feedback has no discussion), or a doctor-side event from facility feedback"
    source: "T-302 Not in scope (mirror delete/restore), schema/community.ts (comments reference reviews only), Question 14"
  - id: BR6.1
    statement: "An author restores only what they deleted, within 30 days, and never a review that was under moderation when deleted."
    category: constraint
    applies_to: "restore.ts, domain/review/policies.ts canAuthorRestore"
    trigger: "review.restore"
    logic: "domainState in {deleted, deleted_tombstone} else conflict; restore_until null (moderator removal) -> conflict; hidden_at set -> review.not_restorable; clock.now() > restore_until -> review.restore_expired; else state = published, deleted_at = null, restore_until = null with a conditional update (zero rows -> review.restore_expired)"
    violation: "Day-31 restore succeeding (AC6.3.5), or 'delete to dodge a case, then restore' (threat note)"
    source: "FR71, AC6.3.5, T-302 threat notes, Question 8, FD entry (e)"
  - id: BR7.1
    statement: "A redaction input names ranges in allowed fields only; any key that could carry text, or any other field, is refused as narrative_locked."
    category: validation
    applies_to: "RedactReviewInput (strict), redact.ts"
    trigger: "review.redact or redactOn"
    logic: "strict object {reviewId, ranges: [{field, start, end}] (1..50), reasonCode, caseCode?}; field in {title, body, sections.symptoms|diagnosis|treatment|after, followUp.<id>.body, followUp.<id>.laterProvider}; unknown key anywhere OR other field OR a follow-up of another review -> moderation.narrative_locked; start >= end or non-integer -> validation"
    violation: "A moderator rewriting narrative through redaction (threat note, hard rule)"
    source: "T-302 step 5 (redact), threat notes, Questions 5 and 6, FD entry (a)"
  - id: BR7.2
    statement: "Each range is widened to grapheme boundaries, merged with overlapping or touching ranges, and replaced by the redaction token."
    category: calculation
    applies_to: "domain/review/redaction.ts applyRedaction"
    trigger: "Applying a redaction"
    logic: "offsets are UTF-16 indices; start moves down and end moves up to the nearest boundaries of Intl.Segmenter('und', {granularity: 'grapheme'}); a range beyond the text length -> validation; ranges sorted and merged where start <= previous end; each merged range -> U+2063 '[redacted]' U+2063; applied from the end so offsets stay valid"
    violation: "Half a Bengali conjunct left visible, or a broken surrogate pair"
    source: "T-302 step 3 and 'Grapheme safety' row"
  - id: BR7.3
    statement: "The page shows the redaction token as the localised label; a redaction never sets Edited."
    category: calculation
    applies_to: "projection.ts, UI (U27 T-307)"
    trigger: "Rendering redacted text"
    logic: "text keeps the token; the UI splits on it and renders label.redacted; editedAt reads author correction rows only"
    violation: "A moderator's redaction presented as the author's edit"
    source: "T-302 step 3, Question 3"
  - id: BR7.4
    statement: "A redaction keeps the text before it in a private version row named after the moderator, and is audited on the review and, when given, the case."
    category: constraint
    applies_to: "redact.ts"
    trigger: "review.redact"
    logic: "insertVersion {change_kind: moderation_redaction, reason: reasonCode, actor_kind: moderator, actor_id: staff account id, snapshot including the touched follow-ups}; version + 1; latest_status recomputed; audit review:<id> and case:<code> {fields, rangeCount, reasonCode}; outbox review.changed"
    violation: "A redaction that an appeal cannot reverse, or one with no trace"
    source: "T-302 step 5 (redact), FD entry (a)"
  - id: BR7.5
    statement: "Authors cannot write the redaction token."
    category: validation
    applies_to: "correct.ts, add-follow-up.ts (U21 strips it in saveDraft and publish)"
    trigger: "Any author text"
    logic: "remove every U+2063 from author text before validation and storage"
    violation: "An author faking a moderator redaction"
    source: "Finding F13"
  - id: BR8.1
    statement: "setStateOn runs the state machine on the caller's transaction for the moderation events of C9."
    category: constraint
    applies_to: "modules/review/commands/set-state.ts setStateOn"
    trigger: "report.file (U32), moderation.decide, moderation.restore, appeal.decide (U33)"
    logic: "lock the row; hideThreshold and hideCritical -> autoHide; hide, restore, remove as named; transition(domainState, event) else conflict with nothing written"
    violation: "A second state path outside the table"
    source: "C9 review.setState, T-302 step 5"
  - id: BR8.2
    statement: "A hide event on a review already in its target state is a no-op."
    category: calculation
    applies_to: "set-state.ts"
    trigger: "autoHide on hidden_pending_review, hide on hidden"
    logic: "return ok({from, to, changed: false}); no update, audit or outbox"
    violation: "Duplicate review.hidden events when several reports cross the threshold"
    source: "C9 callers (U32 threshold), developer view"
  - id: BR8.3
    statement: "Each moderation event writes its own columns."
    category: calculation
    applies_to: "set-state.ts, repository setState"
    trigger: "A changed transition"
    logic: "autoHide, hide: hidden_at = coalesce(hidden_at, now), hidden_reason_code = reasonCode; restore from hidden states: hidden_at = null, hidden_reason_code = null; remove: state deleted_tombstone, deleted_at = now, restore_until = null, hidden_reason_code = reasonCode; restore from a removal: state published, deleted_at = null, hidden_at = null, hidden_reason_code = null; outbox autoHide|hide -> review.hidden, restore -> review.restored, remove -> review.deleted"
    violation: "A removal the author could restore, or a hide with no reason on record"
    source: "02-data-model.md §6 and §17, C15, threat note (keeps hidden_reason_code)"
  - id: BR8.4
    statement: "A threshold or critical hide is audited as system, never as the reporter."
    category: constraint
    applies_to: "set-state.ts"
    trigger: "hideThreshold, hideCritical"
    logic: "audit actor = 'system' for these two events whatever the calling actor; staff actor for hide, restore, remove"
    violation: "A reporter's account linked to a review's audit stream (FD-086)"
    source: "FD-086, finding F6"
  - id: BR8.5
    statement: "setStateOn queues no email and creates no notice."
    category: constraint
    applies_to: "set-state.ts"
    trigger: "Any event"
    logic: "no notification call; the deciding moderation command queues the one email"
    violation: "Two emails for one outcome"
    source: "FD-087, task acceptance row 'review.setState sends nothing'"
  - id: BR9.1
    statement: "A tombstoned review answers a tombstone with no identity or narrative; a soft-deleted review answers not_found."
    category: calculation
    applies_to: "queries/get-experience.ts, repository findTombstoneByPublicId"
    trigger: "review.getExperience"
    logic: "IF stored state = deleted_tombstone THEN {kind: tombstone, publicId, removedBy: restore_until set ? author : moderation, messageKey: experience.tombstone | experience.tombstoneRemoved, whyKey: experience.tombstoneWhy, threadSlot: publicId, noindex: true} ELSE U21's eligible page or not_found"
    violation: "A tombstone leaking title, author or doctor (threat note), or a soft-deleted review still reachable"
    source: "T-302 step 6, AC6.3.4, Question 10"
  - id: BR9.2
    statement: "The page carries the follow-up spine, the current status, the later-care callout and the Edited month."
    category: calculation
    applies_to: "projection.ts toExperiencePage"
    trigger: "Building an eligible page"
    logic: "followUps per BR3.1 and BR3.6; currentStatus per BR3.1; laterCare per BR3.4 and BR3.6; editedAt = monthOf(newest correction version row created_at) or null"
    violation: "AC6.3.1 or AC6.3.3 failing"
    source: "T-302 step 6, AC6.3.1, AC6.3.3, Question 3"
  - id: BR9.3
    statement: "No version, history, reason code or internal id reaches the public view model."
    category: constraint
    applies_to: "contracts view-models/experience.ts, projection.ts"
    trigger: "Building any public VM"
    logic: "ExperiencePageVM and TombstoneVM have no version, history, actor or id fields other than public ids"
    violation: "Private versions exposed publicly"
    source: "T-302 step 6 (history not in the public VM), FR69"
  - id: BR9.4
    statement: "Every published-only read excludes a soft-deleted review and includes it again after restore."
    category: constraint
    applies_to: "U14 and U21 read methods, criteriaDistribution for facility feedback"
    trigger: "Any list, count, distribution or card"
    logic: "state = published AND deleted_at IS NULL in SQL (U14 BR1.3); proven here before and after restore; a facility read missing it is fixed here as a recorded addition"
    violation: "A deleted review in a summary (AC6.3.4)"
    source: "FD-049, AC6.3.4, AC6.3.5, T-302 step 8"
  - id: BR9.5
    statement: "Periods in view models are {year, month} in Bangladesh time; the UI formats them."
    category: calculation
    applies_to: "domain/review/period.ts monthOf, projection.ts"
    trigger: "Any dated field"
    logic: "monthOf(instant) = year and month of instant + 6 hours (UTC+6, no daylight saving)"
    violation: "A correction dated in the wrong month near midnight"
    source: "Developer view, 01-conventions.md §4 (time)"
  - id: BR10.1
    statement: "Review history is visible to the author and to staff with content.act only."
    category: authorization
    applies_to: "queries/get-history.ts"
    trigger: "review.getHistory"
    logic: "IF actor has content.act OR owns the author persona THEN ReviewHistoryVM ELSE not_found; publish rows are left out; no actor or persona id in the VM"
    violation: "Prior versions readable by anyone else (FR69 'retained privately')"
    source: "T-302 step 7, FR69, AC6.3.2"
  - id: BR10.2
    statement: "A staff read of a review's history is audited."
    category: constraint
    applies_to: "queries/get-history.ts"
    trigger: "review.getHistory by staff"
    logic: "audit review:<id> review_history_read {} with actor account:<staffId>; an author's read is not audited"
    violation: "Untraceable staff reading of private versions"
    source: "01-conventions.md §5, FD-016 spirit (staff access is audited)"
  - id: BR11.1
    statement: "The publication state machine is U21's table plus five cells: author delete from hidden_pending_review (both kinds), author delete without discussion from hidden, moderator remove from hidden_pending_review, and moderator restore of a moderator removal."
    category: constraint
    applies_to: "domain/review/review-state.ts transition"
    trigger: "Any state change"
    logic: "added: hidden_pending_review --deleteWithDiscussion--> deleted_tombstone; hidden_pending_review --deleteWithoutDiscussion--> deleted; hidden --deleteWithoutDiscussion--> deleted; hidden_pending_review --remove--> deleted_tombstone; deleted_tombstone --restore--> published only when restore_until is null; domainStateOf = deleted when deleted_at is set and stored state in {published, hidden_pending_review, hidden}; every other new pair refused"
    violation: "A missing or extra cell in the cell-by-cell test"
    source: "U21 R4, FR71, Questions 8 and 11, FD entry (e)"
  - id: BR12.1
    statement: "The review step of account deletion deletes the account's drafts only; published reviews and facility feedback stay, de-identified by Identity."
    category: constraint
    applies_to: "commands/deletion-step.ts deletionStepOn (wired by U39 T-410)"
    trigger: "dataRequest.delete web transaction"
    logic: "delete review_drafts where account_id = accountId; return {draftsDeleted}; no review or facility review row changes; idempotent; no worker entry"
    violation: "Deleting retained contributions (FR13, AC10.3.3)"
    source: "FR13, AC10.3.3, FD-077, Question 9, FD entry (b)"
  - id: BR13.1
    statement: "Every decision runs before the repository, and the pins move in the same commit."
    category: constraint
    applies_to: "packages/database, packages/test-support, eslint boundaries"
    trigger: "Code Generation"
    logic: "database imports application ports and contracts only (no domain): the material diff, transition and redaction run in application or domain; not-implemented.test.ts drops PgReviewRepository and moves its trace test to an existing stub (ISS-294); the fake keeps the superset of the repository's methods; no migration, so the migration-count pins do not change"
    violation: "A red lint:boundaries or pin test"
    source: "FD-093, ISS-294, T-010 as merged"
```

## Rule index

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Author command requirements | authorization |
| BR1.2 | Only the author changes a review | authorization |
| BR1.3 | Public ids for author commands, internal ids for internal operations | constraint |
| BR1.4 | 30 follow-ups and corrections per day | constraint |
| BR2.1 | Edits only while published or pending review | constraint |
| BR3.1 | Date order, newest follow-up current, no pin | calculation |
| BR3.2 | `latest_status` cache | calculation |
| BR3.3 | Follow-up kinds and limits | constraint |
| BR3.4 | Later doctor link or profile offer | validation |
| BR3.5 | Later care never counts | constraint |
| BR3.6 | Later-care callout | calculation |
| BR4.1 | Version row before every edit | constraint |
| BR4.2 | Fields that cannot be edited | constraint |
| BR4.3 | What is material | calculation |
| BR4.4 | Reason for a material change | validation |
| BR4.5 | Dated correction entry | calculation |
| BR4.6 | Optimistic version check | constraint |
| BR4.7 | No-op edit writes nothing | constraint |
| BR4.8 | Publish minimum and language after edit | validation |
| BR5.1 | Delete allowed states | constraint |
| BR5.2 | Tombstone or soft delete, 30-day window | calculation |
| BR5.3 | What counts as discussion | calculation |
| BR5.4 | No email or notice | constraint |
| BR5.5 | No hold branch | constraint |
| BR5.6 | Evidence untouched | constraint |
| BR5.7 | Facility feedback delete and restore | calculation |
| BR6.1 | Author restore guards | constraint |
| BR7.1 | Strict redaction input | validation |
| BR7.2 | Grapheme-aligned ranges and token | calculation |
| BR7.3 | Token rendering, no Edited | calculation |
| BR7.4 | Redaction version row and audit | constraint |
| BR7.5 | Authors cannot write the token | validation |
| BR8.1 | setStateOn on the caller's transaction | constraint |
| BR8.2 | Idempotent hides | calculation |
| BR8.3 | Columns per moderation event | calculation |
| BR8.4 | Threshold hides audited as system | constraint |
| BR8.5 | No email from setState | constraint |
| BR9.1 | Tombstone or not_found | calculation |
| BR9.2 | Page follow-up fields | calculation |
| BR9.3 | Nothing private in public VMs | constraint |
| BR9.4 | Soft delete leaves every read | constraint |
| BR9.5 | Bangladesh month | calculation |
| BR10.1 | Who reads history | authorization |
| BR10.2 | Staff history reads audited | constraint |
| BR11.1 | Five new state cells | constraint |
| BR12.1 | Deletion step deletes drafts only | constraint |
| BR13.1 | Placement and pins | constraint |
