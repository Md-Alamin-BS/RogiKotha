# Business rules — U47 `u47-reviews`

The YAML block is the source of truth. The summary table after it is a derived view. Rule IDs are frozen once this design is approved (`project.md` Corrections).

```yaml
rules:
  # BR1 — Authorization and limits
  - id: BR1.1
    statement: "Drafts and the preview belong to one confirmed account: saveDraft, discardDraft, getDraft, listOwnDrafts and preview require an authenticated account with a confirmed email, and touch only drafts whose account_id is the actor's."
    category: authorization
    applies_to: "review.saveDraft, review.discardDraft, review.getDraft, review.listOwnDrafts, review.preview"
    trigger: "Every call"
    logic: "requires {authenticated, verifiedEmail}; IF draftId names no live draft of Actor.accountId THEN not_found (another account's draft and an unknown id answer the same)"
    violation: "forbidden for a signed-out or unconfirmed actor; not_found for someone else's draft"
    source: "FR39, Question 21, T-102 BR8.1"
  - id: BR1.2
    statement: "Publishing is refused in the application layer to any actor that is not a signed-in account with a confirmed email and not restricted, whatever the UI showed."
    category: authorization
    applies_to: "review.publish, facilityReview.publish"
    trigger: "Every call"
    logic: "requires {authenticated, verifiedEmail, notRestricted} through defineCommand, in T-101's order"
    violation: "forbidden; nothing written; the draft is kept"
    source: "C9 release 1, unit-of-work.md U47, FR40"
  - id: BR1.3
    statement: "An account may publish at most 5 doctor reviews or facility visits in 24 hours, per process."
    category: policy
    applies_to: "review.publish, facilityReview.publish"
    trigger: "After authorization, the draft load and every validation rule (BR3.1–BR3.12) have passed, just before the publish transaction; a refused attempt does not count"
    logic: "rateLimiter.hit('review.publish:account:<accountId>', 5, 86400); IF not allowed THEN rate_limited with retryAfterSec; module constant REVIEW_PUBLISH_LIMIT; a test shows five min_fields refusals followed by a valid publish succeeds"
    violation: "rate_limited; the draft is kept"
    source: "C9 (5/day), C18, Question 20, review R-03"
  - id: BR1.4
    statement: "An account may save drafts at most 300 times an hour, per process."
    category: policy
    applies_to: "review.saveDraft"
    trigger: "Every save"
    logic: "rateLimiter.hit('review.saveDraft:account:<accountId>', 300, 3600); module constant REVIEW_DRAFT_SAVE_LIMIT"
    violation: "rate_limited; the composer shows Not saved and retries (BR8.3)"
    source: "C18, Question 20"
  - id: BR1.5
    statement: "The own-review list and the duplicate hint are private to the actor's account and are built from the actor's own persona ids."
    category: authorization
    applies_to: "review.listOwnReviews, review.hasOwnReviewOfDoctor"
    trigger: "Every call"
    logic: "requires {authenticated}; personaIds = ownership.ownPersonaIds(tx, {accountId: Actor.accountId}); never called for a public page"
    violation: "forbidden for a signed-out actor"
    source: "T-104 BR3.4, BR3.5, Question 15"

  # BR2 — Drafts
  - id: BR2.1
    statement: "Saving a draft parses the payload leniently, inserts a new draft or updates the actor's own live one, and pushes its expiry to 30 days after this save; it writes no audit row and no outbox event."
    category: policy
    applies_to: "review.saveDraft"
    trigger: "Autosave, step change, Save and finish later"
    logic: "parse DraftPayload (all fields optional, bounds enforced, unknown keys dropped); kind = payload.mode (facility → quick); doctor_id = visible doctor of doctorPublicId or null; draftId absent → insert, unless the account already has 10 live drafts (BR2.6); present → update where id and account_id match and expires_at > now, else not_found; expires_at = now + 30 d; return {draftId, expiresAt}"
    violation: "validation with fieldErrors for out-of-bound fields; not_found for a draft that is not the actor's or has expired"
    source: "FR39, AC6.1.2, Question 1, T-301 Question 4"
  - id: BR2.2
    statement: "A draft's payload is stored only encrypted and never appears in a log, an audit row or an event."
    category: constraint
    applies_to: "review_drafts.payload_enc"
    trigger: "saveDraft and every draft read"
    logic: "payload_enc = Crypto.encrypt(JSON); reads use Crypto.decryptText; logs carry at most the draft id"
    violation: "Private medical text at rest or in logs in clear"
    source: "FR39, 02-data-model.md §6"
  - id: BR2.3
    statement: "A draft that has expired, or that cannot be decrypted or parsed, does not exist for its owner."
    category: constraint
    applies_to: "review.getDraft, review.listOwnDrafts, review.preview, review.publish"
    trigger: "Every draft read"
    logic: "IF expires_at <= now THEN not_found; IF decrypt or DraftPayload parse fails THEN not_found AND log review.draft_unreadable {draftId}; nothing is deleted (the purge is T-309's)"
    violation: "An expired or seeded plaintext draft opened, or a decryption error shown to the author"
    source: "Question 1, Question 24, ISS-269"
  - id: BR2.4
    statement: "listOwnDrafts returns the actor's live, readable drafts, newest save first, at most 10."
    category: policy
    applies_to: "review.listOwnDrafts"
    trigger: "/write without a draft parameter"
    logic: "order updated_at desc; map to DraftSummaryVM {draftId, title (author title, else derived by BR3.6, else null), target, updatedAt, expiresAt}"
    violation: "Another account's draft listed, or an unreadable one"
    source: "AC6.1.2, Question 1"
  - id: BR2.5
    statement: "A draft is deleted only by its successful publish, in the same transaction; any refusal or failure keeps it unchanged."
    category: constraint
    applies_to: "review.publish, facilityReview.publish"
    trigger: "Publish"
    logic: "delete review_drafts where id = draftId and account_id = Actor.accountId as the last step of the publish transaction"
    violation: "Lost work after a refused publish (AC6.1.3), or a draft left behind after a publish"
    source: "AC6.1.3, FR39"
  - id: BR2.6
    statement: "An account holds at most 10 live drafts; a save that would create an eleventh is refused, and the owner can discard a draft."
    category: constraint
    applies_to: "review.saveDraft, review.discardDraft, DraftList"
    trigger: "saveDraft without a draftId; Discard on /write"
    logic: "IF countOwnLiveDrafts(accountId) >= 10 AND draftId absent THEN conflict with messageKey errors.review.draftsFull, nothing written; saving an existing draft is never refused by the cap; discardDraft deletes the actor's own draft (another account's or an unknown id → not_found), no audit row; module constant REVIEW_LIVE_DRAFT_CAP; expired rows wait for T-309's purge (S4)"
    violation: "Unbounded encrypted drafts nobody can reach (review R-07), or an author with no way to start a new draft"
    source: "Question 1, review R-07, FD-090 (the purge is T-309's)"

  # BR3 — Publish validation
  - id: BR3.1
    statement: "Publishing needs the author's affirmative experience and privacy attestation."
    category: validation
    applies_to: "review.publish, facilityReview.publish"
    trigger: "Publish"
    logic: "input.attestation must be the literal true (PublishReviewInput)"
    violation: "review.attestation_required; the composer goes to step 4 and focuses the first unchecked box"
    source: "FR40, FD-014, AC6.1.3"
  - id: BR3.2
    statement: "A doctor review publishes only with the minimum content: a doctor, a story, the relationship, a tag or Not sure, and a valid period; every missing item is reported together, in a fixed order."
    category: validation
    applies_to: "review.publish"
    trigger: "Publish"
    logic: "doctor = visible doctor of doctorPublicId, or a newDoctor that passes BR3.11; story = quick: story 20..10000 graphemes after trim; detailed: at least one section non-empty and all sections together at least 20 graphemes; relationship set; tags by BR3.3; period by BR3.4; collect failures in the order doctor, relationship, period, story, tags into review.min_fields {fieldErrors}"
    violation: "review.min_fields with one messageKey per missing field (errors.review.missingDoctor, missingRelationship, periodInvalid, missingStory, missingTag)"
    source: "FR40, FR41, AC6.1.1, AC6.1.3, AC6.2.1"
  - id: BR3.3
    statement: "At least one condition or symptom tag, or one typed tag of any group, or Not sure, is required; at most 20 tags."
    category: validation
    applies_to: "DraftPayload.tags, notSure at publish"
    trigger: "Publish (BR3.2)"
    logic: "ok IF notSure OR any tag with group in (condition, symptom) OR any typed tag; typed text 1..60 graphemes, plain text; duplicates of (group, termPublicId) or (group, case-folded text) are dropped; IF more than 20 THEN validation"
    violation: "review.min_fields (tags) with errors.review.missingTag, announced in the active language"
    source: "FR36, AC5.3.1, AC6.1.3"
  - id: BR3.4
    statement: "The treatment month and year are required, from January 2000 up to the current month; an optional private exact date must be a real date inside that month and not in the future."
    category: validation
    applies_to: "DraftPayload.period, exactDate"
    trigger: "Publish (BR3.2)"
    logic: "current month in Asia/Dhaka from Clock; year*12+month in [2000*12+1, now]; exactDate (YYYY-MM-DD) IF present: valid calendar date, same year and month, <= today"
    violation: "review.min_fields (period) with errors.review.periodInvalid; a bad exact date → validation with fieldErrors.exactDate"
    source: "FR42, AC6.2.2, Question 12"
  - id: BR3.5
    statement: "The identity mode is named, pseudonymous or anonymous for a doctor review, and named or pseudonymous for a facility visit."
    category: validation
    applies_to: "review.publish, facilityReview.publish"
    trigger: "Publish"
    logic: "PublishReviewInput.identityMode in IDENTITY_MODES; facility: IF anonymous THEN validation"
    violation: "validation with fieldErrors.identity"
    source: "FR10, Question 4"
  - id: BR3.6
    statement: "A review's title is the author's title when given; otherwise the first sentence of the story, or of the first filled section, cut at 80 graphemes with an ellipsis."
    category: calculation
    applies_to: "Review.title, DraftSummaryVM.title, preview"
    trigger: "Publish, preview, draft list"
    logic: "IF trimmed title 1..120 graphemes THEN it ELSE first sentence (up to . ! ? । or a line break) of the first non-empty text; IF longer than 80 graphemes THEN cut on a grapheme boundary + '…'"
    violation: "A review without a title (NOT NULL) or a title cut inside a grapheme"
    source: "Question 10, T-301 Question 2"
  - id: BR3.7
    statement: "The review's language is detected from the script of its title and text, never asked and never translated."
    category: calculation
    applies_to: "Review.language, ExperiencePageVM.contentLanguage"
    trigger: "Publish"
    logic: "letters of title and text: only Bengali → bn; only Latin → en; both → mixed; none → the actor's locale"
    violation: "A wrong lang attribute, or any automatic translation"
    source: "FR92, FD-024, Question 11"
  - id: BR3.8
    statement: "Sentiment and outcome are optional, Reviewer's labels are a subset of the three suggested codes, and no other judgement field is accepted."
    category: validation
    applies_to: "DraftPayload.sentiment, outcome, claims"
    trigger: "Publish"
    logic: "sentiment in SENTIMENTS or absent; outcome in OUTCOMES or absent; claims ⊆ [wrongDx, wrongRx, secondOpinion]; FR46 checkbox keys and any rating-like key are dropped by the parser"
    violation: "validation for a value outside the lists"
    source: "FR45, FR47, FD-014, Question 6, Question 7"
  - id: BR3.9
    statement: "Author text is kept exactly as written: only outer whitespace is trimmed, line breaks and tabs are allowed, and any other control or invisible format character is refused."
    category: validation
    applies_to: "title, story, sections, tag text, newDoctor fields, facility body"
    trigger: "Save and publish"
    logic: "hasControlOrFormat(text without \\n\\r\\t) → refuse; no case, Unicode or script normalisation of stored text"
    violation: "errors.common.validation on the field"
    source: "FR92, AC12.1.3, contracts doctor-name.ts"
  - id: BR3.10
    statement: "A facility visit publishes only while facility feedback is on, for a visible branch, with a period, a story of 20 to 10 000 graphemes and the attestation; its nine criteria are optional and never scored."
    category: validation
    applies_to: "facilityReview.publish"
    trigger: "Publish"
    logic: "IF config.featureVisibility.facilityAccounts is false THEN forbidden; branch = visible branch of branchPublicId else min_fields (branch, errors.review.missingBranch); period BR3.4; story; criteria keys ⊆ CRITERIA, values good | mixed | poor; stored with every CRITERIA key, unanswered null"
    violation: "forbidden, review.min_fields or validation; the draft is kept"
    source: "FR27, FR49, AC4.3.4, C18"
  - id: BR3.11
    statement: "A doctor who is not listed is added only with a name of at least three letters after a title, an optional listed specialty, an optional practice place and an optional BMDC number, by U46's limits."
    category: validation
    applies_to: "DraftPayload.newDoctor at publish"
    trigger: "Publish"
    logic: "the contracts schema applies the U46 BR5.5 limits first (field errors newDoctorName, newDoctorSpecialty, newDoctorChamber, newDoctorBmdc); addMemberDoctor validates again and its validation is mapped to the same fields"
    violation: "review.min_fields (doctor) or validation with the newDoctor field keys"
    source: "FD-100, U46 BR5.5"
  - id: BR3.12
    statement: "An anonymous review cannot add a doctor who isn't listed: the composer refuses the combination and the publish command refuses it with its own error code, so no profile submission ever names the author of an anonymous review."
    category: authorization
    applies_to: "review.publish, Composer steps 1 and 4"
    trigger: "Publish; choosing anonymous with a new doctor, or opening Add a doctor while anonymous is chosen"
    logic: "IF identityMode = anonymous AND payload.newDoctor THEN err review.anonymous_new_doctor (messageKey errors.review.anonymousNewDoctor), checked before the rate limit and before any write; addMemberDoctor is never called; the composer shows compose.anonNewDoctor in en and bn (To add a doctor who is not listed, post under your name or your username, or choose a listed doctor) and keeps Publish disabled until the author changes either choice"
    violation: "profile_submissions.submitted_by_account_id linking an account to its anonymous review outside persona_links (review R-02)"
    source: "FD-015, Question 5, U46 BR5.7, review R-02"

  # BR4 — Publish persistence
  - id: BR4.1
    statement: "A doctor review is published in one transaction, in this order: ids, persona, doctor, tags, the review and its tags, version 1, audit, outbox, draft deletion; any error rolls everything back, including the persona, a provisional term and a new doctor."
    category: constraint
    applies_to: "review.publish"
    trigger: "After BR1–BR3 pass"
    logic: "reviewId = ids.newId(); publicId = ids.newPublicId(); then BR4.2, BR4.3 (doctor), BR4.4, insert reviews {state published, published_at = attestation_at = now, version 1} and review_tags, BR4.7, BR4.5, BR4.6, BR2.5; return {publicId}"
    violation: "internal; nothing persists; the draft is kept"
    source: "C9 release 1, 01-conventions §3"
  - id: BR4.2
    statement: "The author persona comes from identity.personaFor on the publish transaction for the chosen mode; an anonymous review gets the alias of its own thread."
    category: policy
    applies_to: "review.publish, facilityReview.publish"
    trigger: "Publish"
    logic: "personaFor(tx, {accountId: Actor.accountId, reviewId, mode}); facility: personaFor(tx, {accountId, mode}) with mode named | pseudonymous; an err from personaFor rolls back"
    violation: "A persona not linked to the account, or an anonymous alias shared across threads"
    source: "C4, T-104 WF4, FR10, FD-015"
  - id: BR4.3
    statement: "A new doctor is created or reused through directory.addMemberDoctor inside the publish transaction, and typed tags become terms through taxonomy.ensureProvisionalTerm on the same transaction; the review module writes neither table itself."
    category: constraint
    applies_to: "review.publish"
    trigger: "Publish"
    logic: "IF newDoctor (only ever for a named or pseudonymous review, BR3.12) THEN {doctorId} = addMemberDoctor(tx, {name, specialtyId?, practiceArea?, bmdcNumber?}, actor with accountId and persona:<personaId>); each suggested chip → the active term of termPublicId (unknown or inactive → validation on tags); each typed tag → ensureProvisionalTerm(tx, {kind: group, text, lang: BR3.7 of the text}, persona actor) → termId; review_tags rows {group, term_id} and one {group: condition, not_sure: true} when notSure"
    violation: "A doctor or term written outside its module, or a provisional term surviving a rolled-back publish"
    source: "C7, FD-100, FR37, AC5.3.2, U46 WF10, WF11, review R-02"
  - id: BR4.4
    statement: "The private exact date is stored only encrypted."
    category: constraint
    applies_to: "reviews.exact_date_enc"
    trigger: "Publish with exactDate"
    logic: "exact_date_enc = Crypto.encrypt(exactDate); null otherwise"
    violation: "An exact date readable in clear"
    source: "FR42, AC6.2.2"
  - id: BR4.5
    statement: "Each publish writes one audit row whose actor is the author persona, never the account, with allowlisted details only."
    category: policy
    applies_to: "review.publish, facilityReview.publish, the term and doctor operations called inside them"
    trigger: "Publish"
    logic: "review: stream review:<reviewId>, action review.published, actor persona:<personaId>, details {kind, identityMode, tagCount, newDoctor: boolean}; facility: stream facility_review:<id>, action facility_review.published, actor persona:<personaId>, details {identityMode, criteriaAnswered}; AuditActor widened additively with persona:<id> (FD row, Question 5)"
    violation: "An audit row linking an account to an anonymous review, or free text in details"
    source: "Question 5, 01-conventions §5, U46 BR5.3, BR5.8"
  - id: BR4.6
    statement: "A doctor review publish appends review.published {reviewId, doctorId, branchId: null}; a facility visit appends no event."
    category: policy
    applies_to: "review.publish"
    trigger: "Publish"
    logic: "outbox in the same transaction; no repeatEpisode field in release 1"
    violation: "An event without its review, or a payload with author or text"
    source: "C9 release 1, C15"
  - id: BR4.7
    statement: "Publish writes review_versions version 1 with change_kind publish, actor_kind author and actor_id the author persona id."
    category: constraint
    applies_to: "review_versions"
    trigger: "Publish"
    logic: "snapshot {kind, title, body | sections, sentiment, outcome, claims}; never the exact date, an account id or a persona id inside the snapshot"
    violation: "An account id in actor_id (the demo's behaviour, retired), or a missing first version for U22"
    source: "Question 5, FR69 (U22 builds on version 1)"
  - id: BR4.8
    statement: "A facility visit is published in one transaction into facility_reviews only, and never reaches a doctor's reviews or summaries."
    category: constraint
    applies_to: "facilityReview.publish"
    trigger: "After BR1–BR3 pass"
    logic: "persona (BR4.2); insert facility_reviews {public_id, author_persona_id, branch_id, identity_mode, period, body, criteria (every key), state published, published_at, version 1}; audit (BR4.5); delete the draft (BR2.5); return {publicId, branchPublicId}"
    violation: "Facility feedback in reviews or in a doctor's figures (hard rule)"
    source: "FR49, AC4.3.4, PRODUCT.md hard rule"
  - id: BR4.9
    statement: "Review command failures log only the command name and the error class."
    category: constraint
    applies_to: "every review command and server action"
    trigger: "Any error"
    logic: "logger.error('<command> failed', {error: class name}); never text, an account id together with a persona id, or the draft payload"
    violation: "Private text or a linkage in logs"
    source: "NFR10, team.md Code Style (logger port, allowlisted fields)"

  # BR5 — The public projection
  - id: BR5.1
    statement: "review.getExperience returns the page only for an eligible review; every other public id answers not_found the same way."
    category: authorization
    applies_to: "review.getExperience"
    trigger: "Experience request"
    logic: "eligible = U46's imported predicate (U46 BR1.3): state published AND deleted_at null AND published_at set AND the joined doctor published and not merged; unknown, hidden, removed, deleted or on an unpublished or merged doctor → not_found → localised 404"
    violation: "A hidden or deleted review shown, or a different answer that reveals its existence"
    source: "FR50, C9"
  - id: BR5.2
    statement: "A missing sentiment or outcome is shown as Not provided, never as a value, a blank or 0."
    category: policy
    applies_to: "ExperiencePageVM, ExperienceBody, cards"
    trigger: "Render"
    logic: "absent field → label.notProvided in both languages"
    violation: "A 0 or an empty badge (hard rule)"
    source: "FR51, AC6.2.3, PRODUCT.md hard rule"
  - id: BR5.3
    statement: "Every Reviewer's label is shown prefixed Reviewer's label and framed as the author's claim, never as a RogiKotha finding."
    category: policy
    applies_to: "ExperiencePageVM.claims, ReviewerLabels"
    trigger: "Render"
    logic: "known code → claim.<code> text; any other stored label → shown as written; each under label.reviewerLabel with label.reviewerLabelWhy"
    violation: "A claim without the prefix, or wording that presents it as validated (hard rule)"
    source: "FR47, FR57, AC6.2.4, PRODUCT.md hard rule"
  - id: BR5.4
    statement: "The story and the detailed sections are shown exactly as written; sections appear in the order symptoms, diagnosis, treatment, after, with empty ones left out and no blank heading."
    category: policy
    applies_to: "ExperiencePageVM.story, sections"
    trigger: "Projection"
    logic: "omit empty keys; ordered list markup; lang attribute when contentLanguage is en or bn and differs from the page locale"
    violation: "A blank heading, reordered text, or translated text"
    source: "FR41, FR92, AC6.2.1, AC12.1.3"
  - id: BR5.5
    statement: "The public view shows the treatment month and year only; the exact date never leaves the server."
    category: constraint
    applies_to: "ExperiencePageVM, cards, preview"
    trigger: "Projection"
    logic: "period {year, month}; exact_date_enc is never selected by a public read"
    violation: "A day of treatment in any public output"
    source: "FR42, AC6.2.2"
  - id: BR5.6
    statement: "The doctor on the page always carries Registration not verified, and Added by a member — not confirmed while U46 says so."
    category: policy
    applies_to: "ExperiencePageVM.doctor"
    trigger: "Projection"
    logic: "memberAddedNotConfirmed from U46's expression, imported; label.notVerified always rendered"
    violation: "A doctor shown as verified (hard rule)"
    source: "PRODUCT.md hard rule, FD-100, U46 BR2.13"
  - id: BR5.7
    statement: "The byline shows only the identity chosen for this review: a named author as plain text, a pseudonymous username as a link to its author page, an anonymous author as Written anonymously with this thread's alias and never a link."
    category: policy
    applies_to: "PageBylineVM, Byline"
    trigger: "Projection"
    logic: "from identity.publicProjection(personaId): named → {displayName}; pseudonymous → {username}; anonymous → {alias = displayName or null}; cards keep U46's BylineVM (no alias)"
    violation: "An anonymous review linked to a profile, a username or another alias (FD-015)"
    source: "FR10, FD-015, AC3.3.1, AC3.3.2, Question 13"
  - id: BR5.8
    statement: "Related experiences come only through U46's card query: up to 6 by the page's first condition term, up to 6 by the same doctor, and up to 10 by the same named or pseudonymous persona; none by author for an anonymous review; never the page's own review."
    category: policy
    applies_to: "ExperiencePageVM.relatedByCondition, sameDoctor, otherByAuthor"
    trigger: "Projection"
    logic: "listExperienceCards({conditionPublicId, limit 6, excludePublicId}); ({doctorPublicId, limit 6, excludePublicId}); IF personaKind is not anonymous THEN ({personaIds: [authorPersonaId], limit 10, excludePublicId}) ELSE []; newest first"
    violation: "Two anonymous reviews linked by an author list, or a quality-ordered list"
    source: "FD-015, AC3.3.2, AC3.3.3, PRODUCT.md neutral order"
  - id: BR5.9
    statement: "No public projection carries an internal id, an account field, a persona id, an email, the exact date, an evidence item, a reaction or comment count, or any number that stands for quality."
    category: constraint
    applies_to: "ExperiencePageVM, PageBylineVM, preview"
    trigger: "Projection; a deep-scan test over generated reviews"
    logic: "denylist: id, reviewId, accountId, personaId, authorPersonaId, email, exactDate, attestationAt, likes, dislikes, commentsCount, score, rating"
    violation: "Private data or a quality number on a public page (hard rules)"
    source: "PRODUCT.md hard rules, C16 rules, T-104 BR1.4"
  - id: BR5.10
    statement: "review.preview builds the same page model from the draft with the same function, without enforcing the minimum and without writing; it shows no public id, no posted date, no related lists and no anonymous alias."
    category: policy
    applies_to: "review.preview"
    trigger: "After each successful draft save"
    logic: "toExperiencePage(transientReview(payload), deps) with publicId, publishedAt absent and related lists []; byline named/pseudonymous from account.getOwnAccount names, anonymous {alias: null}; doctor read-only; typed tags shown as written with provisional: true; facility target → toFacilityAccount(payload)"
    violation: "A preview that differs from the published page in what the public sees, or a query that inserts a persona or term"
    source: "FR39, AC6.1.1, Question 23"

  # BR6 — Seams for U22, U48 and U49
  - id: BR6.1
    statement: "reviewIdForPublicId returns the internal id for a known public id in any state and null otherwise; it never errors and says nothing about state or author."
    category: constraint
    applies_to: "modules/review/queries/review-id-for-public-id.ts"
    trigger: "Any boundary holding a reviewPublicId"
    logic: "IF PUBLIC_ID_RE fails OR no row THEN null ELSE reviews.id"
    violation: "An error or a state hint that lets a caller probe reviews"
    source: "C9 release 1"
  - id: BR6.2
    statement: "isReviewAuthor is true only for an account actor whose account owns the review's author persona, checked through IdentityOwnership.ownsPersona; it is false for anyone else and for an unknown id, with no staff bypass, and never errors."
    category: authorization
    applies_to: "modules/review/queries/is-review-author.ts"
    trigger: "Edit link, author tools, U22 correct, U48 intake"
    logic: "IF Actor.kind != account OR no accountId THEN false; personaId = reviews.author_persona_id of reviewId; none → false; RETURN ownsPersona(tx, {accountId, personaId})"
    violation: "An ownership oracle over anonymous reviews (T-104 adversarial 3)"
    source: "C9, T-104 § 2, BR3.3"
  - id: BR6.3
    statement: "isReviewPublished is true only for a review that passes U46's imported eligibility predicate, doctor join included, and false for an unknown id; it never errors."
    category: constraint
    applies_to: "modules/review/queries/is-review-published.ts"
    trigger: "U49 comment.post and community.thread"
    logic: "U46 BR1.3 predicate on reviewId (published, not deleted, published_at set, doctor published and not merged); the C9 note says the same instead of 'in the published state'"
    violation: "Comments on a hidden or deleted review"
    source: "C9 release 1, U46 BR1.3, review R-04"
  - id: BR6.4
    statement: "Each experience-page slot is a self-fetching server component that takes only reviewPublicId, resolves it once, renders its own empty state for null, never throws into the page, and never renders an account id, an email or a file name."
    category: constraint
    applies_to: "CommentThread, EvidenceSection, ReviewHistory"
    trigger: "Experience page render"
    logic: "reviewId = reviewIdForPublicId(publicId); null → empty state; an expected failure → the slot's bilingual fallback; the page passes nothing else"
    violation: "A broken slot that blanks the page, or an internal id reaching the browser"
    source: "C16 rules"
  - id: BR6.5
    statement: "Until their owners take them over, the slots keep today's behaviour: the comment thread through the demo comments binding, the evidence note through PublicEvidenceCount, and the Edited date through lastEditedAt."
    category: policy
    applies_to: "CommentThread, EvidenceSection, ReviewHistory (U47's versions)"
    trigger: "Experience page render"
    logic: "CommentThread: getActor, demo comments.listComments(reviewId, accountId?) → today's view; EvidenceSection: countPublicEvidence(reviewId) n > 0 → 'Documents attached — not medically validated' + n in locale digits, else 'No documents'; ReviewHistory: lastEditedAt(reviewId) → 'Edited {month year}', else nothing"
    violation: "A demo flow lost (comments, evidence note, edited mark), or evidence shown as 0 or verified"
    source: "C16, C17, FD-099, PRODUCT.md evidence wording"
  - id: BR6.6
    statement: "The author tools with the evidence uploader are rendered only when isReviewAuthor is true for the review the page resolved; inside them, the edit link to U22's route is shown only for a quick review until U22's route replaces the demo route."
    category: authorization
    applies_to: "experiences/[id]/page.tsx, AuthorTools"
    trigger: "Experience page render"
    logic: "isReviewAuthor(tx, {reviewId, actor}) with reviewId from reviewIdForPublicId(tx, {publicId}) → AuthorTools {AuthorEvidence reviewPublicId; editHref /{locale}/experiences/{publicId}/edit only IF vm.reviewKind = quick, marked ASSUMPTION(U47), removed by U22}; never getOwnReviewForEdit"
    violation: "Author tools shown to another reader, or an edit link that leads to a 404 for a detailed review"
    source: "C16 edit_link, C16 composer_evidence"
  - id: BR6.7
    statement: "lastEditedAt is the time of the newest correction version of a review, or null."
    category: calculation
    applies_to: "modules/review/queries/last-edited-at.ts"
    trigger: "ReviewHistory"
    logic: "max(review_versions.created_at) where change_kind = correction; null when none"
    violation: "An Edited mark on an unedited review"
    source: "Question 25, FR69"
  - id: BR6.8
    statement: "The names, paths and signatures of reviewIdForPublicId, isReviewAuthor, isReviewPublished and the three slots are frozen when U47 merges."
    category: constraint
    applies_to: "C9 release-1 queries, C16 slots"
    trigger: "Merge"
    logic: "a later change is breaking under the contract ownership rules and is agreed in contract-summary.md first"
    violation: "U22, U48 or U49 built against a moved seam"
    source: "C16 rules, contract ownership rules (FD-105 seams)"

  # BR7 — Lists and pages
  - id: BR7.1
    statement: "The experiences index lists eligible reviews newest first, 20 per page by keyset cursor, with an exact count line; an invalid cursor goes back to the first page."
    category: policy
    applies_to: "/{locale}/experiences"
    trigger: "Index request"
    logic: "listExperienceCards({limit 20, cursor}); validation with a cursor → 307 to /{locale}/experiences; countExperiences → index.count {n} in locale digits; empty → index.beFirst with a link to /write; More experiences (next cursor) and Back to the newest (later pages)"
    violation: "A non-neutral order, a missing count shown as 0, or a 500 on a bad cursor"
    source: "PRODUCT.md neutral order, Question 22"
  - id: BR7.2
    statement: "The author page lists the public named and pseudonymous reviews whose persona carries that username, each under its own byline, never an anonymous one; any username without such reviews shows the same empty state; the page is noindex."
    category: policy
    applies_to: "/{locale}/authors/[username]"
    trigger: "Author page request"
    logic: "personaIds = identity.publicPersonaIdsByUsername(username); cards = listExperienceCards({personaIds, limit 20, cursor}); header @username, plus the display name of the newest named persona among the cards when present; empty → profile.noContributions; status 200 and noindex in every case"
    violation: "An anonymous review on a profile (FD-015), or an answer that tells registered from unknown usernames"
    source: "FR11, AC10.2.1, AC10.2.2, AC10.2.3, AC10.2.5, Question 14"
  - id: BR7.3
    statement: "The own-review list on /me shows every review written under any of the actor's personas, anonymous ones included, with its state, to that actor only."
    category: policy
    applies_to: "review.listOwnReviews, OwnReviewList"
    trigger: "/me request"
    logic: "ownPersonaIds → reviews by those personas, not deleted, newest first, ≤100; edited = a correction version exists; OwnReviewVM"
    violation: "Another account's review listed, or the list on a public page"
    source: "T-104 BR3.4, Question 15"
  - id: BR7.4
    statement: "countExperiences is the exact number of eligible reviews."
    category: calculation
    applies_to: "review.countExperiences"
    trigger: "Index request"
    logic: "count(*) with U46's eligibility predicate"
    violation: "A rounded, estimated or weighted number"
    source: "PRODUCT.md exact counts"
  - id: BR7.5
    statement: "The duplicate hint is true when the actor already has an eligible review of the same doctor under any persona, and it never names or links that review."
    category: calculation
    applies_to: "review.hasOwnReviewOfDoctor"
    trigger: "Composer, after a save that has a doctor"
    logic: "exists eligible review with doctor_id = the draft's doctor AND author_persona_id in ownPersonaIds; result {duplicate: boolean} only"
    violation: "A review id or title in the answer, or a blocked publish"
    source: "FR43, FR44, AC6.1.5, Question 9"

  # BR8 — The composer
  - id: BR8.1
    statement: "A visitor who may not contribute sees only the composer heading and U9's gate; no composer data is loaded for them."
    category: authorization
    applies_to: "/{locale}/write"
    trigger: "Page request"
    logic: "access = getContributionAccess(); IF access != allowed THEN render a-head + ContributionGate {purpose: write, returnTo: /{locale}/write (with ?doctor= when given)} and stop"
    violation: "Composer data or a form shown to a signed-out or unconfirmed visitor"
    source: "C16 gate, T-102 WF9, BR8.1"
  - id: BR8.2
    statement: "The composer is a four-step wizard with a progress rail, Back and Next and free movement; nothing is checked until Publish."
    category: policy
    applies_to: "Composer"
    trigger: "Any step change"
    logic: "steps 1 the care, 2 your story, 3 how it went, 4 check and publish; rail compose.step {n} compose.of 4; focus the step's h2; announce 'Step {n} of 4: {name}'; history.replaceState ?draft=&step=; the saved step is restored on reopen"
    violation: "A step that blocks progress, or a lost position on reopen (AC6.1.2)"
    source: "FR39, AC6.1.2, Question 2"
  - id: BR8.3
    statement: "The composer autosaves to the server 1.5 seconds after the last change and on every step change, one save at a time, and tells the author whether the draft is saved."
    category: policy
    applies_to: "Composer autosave"
    trigger: "Field change, step change, Save and finish later"
    logic: "debounce 1.5 s; one in flight, a newer change queues one more; ok → compose.draftSaved; error → compose.draftNotSaved and retries after 5, 15, 30 s, then on the next change; not_found → next save creates a new draft and shows compose.draftMissing once; nothing is kept in browser storage"
    violation: "Lost work, parallel creates, or a draft in localStorage"
    source: "FR39, AC6.1.2, BR2.1"
  - id: BR8.4
    statement: "The composer's pattern checks warn about a phone number, an emergency word and a likely duplicate; each warning can be acted on or dismissed, and none blocks publishing."
    category: policy
    applies_to: "Composer safety checks"
    trigger: "Text change, after save"
    logic: "pii: phone patterns with Latin or Bengali digits; emerg: the prototype's emergency words in both languages and the configured emergency numbers → guidance with 999, 16263 and the crisis line from ConfigProvider; dup: BR7.5; dismissed ids kept in the draft; shown on steps 2 and 4"
    violation: "A blocked publish, or a classifier beyond these patterns (FD-009)"
    source: "FR44, FD-009, AC6.1.5"
  - id: BR8.5
    statement: "After each successful save the composer shows the exact public preview of the draft, rendered by the same component as the experience page."
    category: policy
    applies_to: "Composer preview"
    trigger: "Save ok"
    logic: "previewAction({draftId}) → ExperiencePageVM → ExperienceBody mode preview (h2 title); older responses dropped by sequence number"
    violation: "A preview that shows something the page would not"
    source: "FR39, AC6.1.1, BR5.10"
  - id: BR8.6
    statement: "Publish is offered only with the identity chosen and the attestation boxes ticked; a refusal shows a summary that links to each missing field, announced in the active language, and keeps the draft."
    category: validation
    applies_to: "Composer step 4"
    trigger: "Publish press"
    logic: "enabled IF compose.confirm1–3 and compose.age ticked; flush the save, then publishAction({draftId, identityMode, attestation: true}); review.min_fields → .callout.warn errors.review.minFields + one link per field, focus the first, announce; rate_limited → errors.common.rateLimited {minutes}; other errors → their messageKey"
    violation: "A silent refusal or a lost draft (AC6.1.3)"
    source: "FR40, AC6.1.3, NFR6"
  - id: BR8.7
    statement: "A successful publish opens the new experience page (a facility visit opens its branch page); the author alone sees one calm confirmation with no confetti, badge, points or countdown."
    category: policy
    applies_to: "publish actions, experience page ?published=1"
    trigger: "Publish ok"
    logic: "redirect /{locale}/experiences/{publicId}?published=1; the note compose.publishedNote with one PublishTick only when isReviewAuthor; announced once; facility → /{locale}/facilities/{branchPublicId}"
    violation: "Gamified or nudging motion (AC2.4.5), or the note shown to other readers"
    source: "AC2.4.5, NFR13, Question 26"
  - id: BR8.8
    statement: "Only a doctor public id from the URL is preselected; relationship starts empty, identity starts pseudonymous, and the period starts at the current month."
    category: policy
    applies_to: "Composer defaults"
    trigger: "New draft"
    logic: "?doctor=<publicId> preselects when it is in ComposerVM.doctors; other query values ignored"
    violation: "An attestation-like field pre-answered for the author"
    source: "FD-014, T-306 Question 2"
  - id: BR8.9
    statement: "Add a doctor who isn't listed asks for the full name and optionally a specialty, a practice place and a BMDC number, and says that the doctor will show as added by a member and not confirmed; the BMDC number is never shown back publicly."
    category: policy
    applies_to: "Composer step 1"
    trigger: "Toggle compose.addDoctor"
    logic: "choosing a listed doctor clears newDoctor and the reverse; label.memberAddedWhy shown under the panel"
    violation: "A member-added doctor presented as confirmed"
    source: "FD-100, US4.2 (narrowed)"
  - id: BR8.10
    statement: "The facility target is offered only while facility feedback is on; it asks for a branch, a period, a story, the nine optional criteria and a named or pseudonymous identity, and offers no documents and no score."
    category: policy
    applies_to: "Composer target facility"
    trigger: "Target switch"
    logic: "steps: 1 branch + period; 2 story; 3 the nine crit.* choices (good | mixed | poor | none, 'report reliability' labelled patient-perceived); 4 identity + attestation; switching target keeps shared fields in the draft"
    violation: "A score, a doctor field on a facility visit, or the target shown while switched off"
    source: "FR27, AC4.3.4, C18"
  - id: BR8.11
    statement: "The composer and the experience page use only T-011's motion; the disclaimer, the emergency guidance and the safety findings never move, and reduced motion shows everything at once."
    category: constraint
    applies_to: "Composer, ExperiencePage, ExperienceIndex"
    trigger: "Render and step change"
    logic: "step slide in reading direction; Reveal on index and related grids; press feedback; data-static on disclaimer and emergency blocks; nothing loops; prefers-reduced-motion and the app switch → instant"
    violation: "An animated safety text or a looping effect (AC2.4.4)"
    source: "NFR13, FD-091, AC2.4.1–AC2.4.4"
  - id: BR8.12
    statement: "Neither the composer nor the experience page shows a banner or warning about staff identity access; the anonymous choice says only that readers see a name made for this thread."
    category: policy
    applies_to: "compose.identity.anonNote, experience page"
    trigger: "Render"
    logic: "compose.identity.anonNote reworded in en and bn; no caveat block on the page"
    violation: "A staff-access caveat in the writing flow (FD-022)"
    source: "FD-022, AC3.3.6, Question 13"

  # BR9 — Platform and retirement
  - id: BR9.1
    statement: "Every new or changed user-facing string has an English and a Bengali entry under the same key in the same commit; errors travel as message keys."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "pnpm i18n:check on every pnpm check"
    logic: "no literal copy in components or server code; Bengali numerals follow the active language"
    violation: "A build failure (AD-9)"
    source: "project.md Mandated, FD-024, AC12.1.4"
  - id: BR9.2
    statement: "In U47's Bolt, the demo review code that only U47's switched files call is deleted in the same commit as the switch; functions that other Units' files still call stay unchanged, with their retiring Unit named in the file header."
    category: constraint
    applies_to: "packages/database/src/demo/{reviews,doctors}.ts, apps/web/src/server/actions/review.ts, the pages and their tests"
    trigger: "Code Generation"
    logic: "the table in functional-spec.md § 9; every test that imported a deleted function moves its read to the module path with its expectations unchanged"
    violation: "A broken demo flow, a red typecheck, or a weakened adversarial test"
    source: "Question 16, U46 BR7.2, unit-of-work.md U47"
  - id: BR9.3
    statement: "The review module reaches Identity, Directory and Taxonomy only through the seams passed into its factory, never reads persona_links or evidence_items, and does not change CommandPorts."
    category: constraint
    applies_to: "packages/application/src/modules/review/**, packages/database/src/repositories/review*.ts"
    trigger: "pnpm lint:boundaries, a source search test"
    logic: "createReviewModule(ReviewModulePorts); the repository may read reference rows of doctors, facility_branches and taxonomy_terms with U46's imported predicates; container.ts gains one review block"
    violation: "A second linkage store or a red boundary lint"
    source: "C19 module_wiring, C17 rules, T-104 BR3.1"
  - id: BR9.4
    statement: "No screen or schema of this Unit offers a rating, a combined score, a highest-rated sort, or wording that calls evidence verified or approved."
    category: constraint
    applies_to: "every owned file"
    trigger: "no-score test, copy review"
    logic: "a domain test asserts no numeric judgement field exists in DraftPayload, ExperiencePageVM or facility criteria"
    violation: "A hard-rule breach"
    source: "PRODUCT.md hard rules, FD-014"
```

## Rules summary

| Group | Rules | What they decide |
|---|---|---|
| BR1 Authorization and limits | BR1.1–BR1.5 | Drafts and publish need a confirmed account, and publish also needs "not restricted". Publish allows 5 a day, counted only after validation passes. Draft saves allow 300 an hour. Own lists are private. |
| BR2 Drafts | BR2.1–BR2.6 | Encrypted, owner-only and lenient. A draft lasts 30 days after its last save. An unreadable draft does not exist for its owner. A draft is deleted by its own publish or its owner's discard. At most 10 live drafts per account. |
| BR3 Publish validation | BR3.1–BR3.12 | Attestation; minimum fields in a fixed order; the tag rule; period and private date; identity modes; the derived title; detected language; optional judgements and three labels; text as written; facility visits; the member-added doctor; no new doctor on an anonymous review. |
| BR4 Publish persistence | BR4.1–BR4.9 | One transaction. The persona comes from Identity. The doctor and terms come from their modules. The exact date is encrypted. The audit actor is the persona. There is one event. Version 1 is written. Facility visits are kept apart. Logs are clean. |
| BR5 Projection | BR5.1–BR5.10 | Eligible reviews only. "Not provided". "Reviewer's label". Text as written. Month and year only. "Registration not verified". Bylines per mode. Related lists through U46. A key denylist. The preview uses the same function. |
| BR6 Seams | BR6.1–BR6.8 | `reviewIdForPublicId`, `isReviewAuthor` and `isReviewPublished`. Self-fetching slots that keep today's behaviour. Author tools only for the author. The Edited date. The seams freeze at merge. |
| BR7 Lists and pages | BR7.1–BR7.5 | The index (cursor, exact count). The author page (no anonymous reviews, no existence oracle). The own list. The count. The duplicate hint. |
| BR8 Composer | BR8.1–BR8.12 | The gate, the four steps, autosave, the pattern checks, the preview, the publish summary, a calm confirmation, defaults, add-a-doctor, the facility target, motion, and no staff-access caveat. |
| BR9 Platform | BR9.1–BR9.4 | Bilingual keys, demo retirement, module boundaries and the hard rules. |
