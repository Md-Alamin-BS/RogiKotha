# Business rules — U21 `t-301-review-module-core`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U21), `unit-of-work-story-map.md` (US3.3, US4.3, US6.1, US6.2, US6.4), `requirements.md` (FR10, FR24–FR27, FR39–FR52, FR78), `stories.md`, `components.md` (Review, Identity), `contract-summary.md` (C4, C6, C7, C8, C9, C15), T-301 with its FD-080 and FD-090 amendments, FD-009, FD-014, FD-015, FD-022, FD-049, FD-067, FD-080, FD-090, the project hard rules (`project.md`), `01-conventions.md` §2–§5 and §10, and the U14 T-201 design draft, whose review read queries and policies this Unit extends and may not rewrite. The workflows, ports and view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 1–14 were answered by the agent on the owner's standing instruction of 2026-10-27; Questions 15 and 16 (owner-class) and Questions 17–21 were answered A by the agent under the owner's no-questions instruction of 2026-10-29, which also decided the raised points R1–R6. All await the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. BR3.13 and BR6.13 are no longer interim: each rests on an FD entry the build appends before code (`functional-spec.md` § 17 (a), (b)). `functional-spec.md` § 14 lists what changes if the owner chooses differently.

Refreshed 2026-10-29 against T-010 as merged (`14c21a9`) and the refreshed U8 T-101, U11 T-104, U12 T-105 and U14 T-201 drafts: rules BR1.1, BR1.3, BR1.4, BR2.1, BR3.8, BR3.9, BR3.12, BR3.13, BR4.1, BR4.2, BR4.7, BR4.9, BR5.1, BR6.4, BR6.8, BR6.9, BR6.10, BR6.12, BR6.13, BR7.3, BR9.4 and BR10.3 changed; BR8.4 and BR10.5 are new (next free numbers; no key was renumbered).

```yaml
rules:
  - id: BR1.1
    statement: "review.saveDraft, review.getDraft, review.listDrafts and review.preview require an authenticated account; a pending (unverified) or restricted account may keep drafts, an anonymous visitor may not."
    category: authorization
    applies_to: "modules/review/commands/save-draft.ts, queries/get-draft.ts, queries/list-drafts.ts, queries/preview.ts"
    trigger: "Any draft operation"
    logic: "requires: ['authenticated'] in defineCommand or the query helper (U8 T-101 order); IF actor.kind = account (status pending_verification, active or restricted; suspended, banned and deleted accounts get an anonymous Actor from getActor) THEN proceed ELSE forbidden with no side effect; the owner check is the draft load of BR1.2, not requires: owner, so a foreign draft answers not_found"
    violation: "An unverified author losing autosave, or an anonymous visitor writing a draft row (AC6.1.2)"
    source: "FR39, AC6.1.2, prototype renderCompose (drafts save while unverified), T-306 step 1, Question 3"
  - id: BR1.2
    statement: "A draft is reachable only by the account that owns it; a draft of another account, or one that does not exist or has expired, answers not_found and changes nothing."
    category: authorization
    applies_to: "saveDraft (update), getDraft, preview, review.publish, facilityReview.publish"
    trigger: "Any operation that names a draftId"
    logic: "load the draft by id AND account_id = actor.accountId AND expires_at > clock.now(); IF none THEN not_found (never forbidden, so the answer is no oracle for other accounts' draft ids)"
    violation: "Publishing or previewing someone else's draft (threat note 'Publish on someone else's draft')"
    source: "T-301 step 5 and threat notes, 01-conventions.md §5 (owner)"
  - id: BR1.3
    statement: "review.publish and facilityReview.publish require a verified email and an account that is not restricted."
    category: authorization
    applies_to: "modules/review/commands/publish.ts, facility-review-publish.ts"
    trigger: "A publish is attempted"
    logic: "requires: ['authenticated', 'verifiedEmail', 'notRestricted'] (U8 T-101 order); IF actor.kind = account AND actor.emailVerified AND actor.status is not restricted THEN proceed ELSE forbidden; nothing is written and the draft is kept; no onRefused hook and no recorded error, so every refusal rolls back"
    violation: "An unconfirmed or restricted account publishing content (AC6.1.1, 01-conventions.md §5)"
    source: "FR39, C9 (verified + notRestricted), T-301 step 5 and publish.test.ts"
  - id: BR1.4
    statement: "Each publish command is rate limited to 5 per account per 24 hours through the RateLimiter port, checked before the draft is decrypted."
    category: constraint
    applies_to: "review.publish (key review.publish:account:<id>), facilityReview.publish (key facilityReview.publish:account:<id>)"
    trigger: "A publish is attempted by an authorized actor"
    logic: "rateLimiter.hit(key, 5, 86400) at the start of the handler, before the draft is loaded; IF not allowed THEN rate_limited with retryAfterSec (the port's retryAfter); nothing is written; every authorized attempt counts, refused ones included (the composer enables Publish only when the minimum is met, T-306); no database count by account is used, because reviews carry no account column"
    violation: "A sixth publish in a day succeeding fails the 'Rate limit' acceptance row"
    source: "C9 (5/day), T-301 step 5 and acceptance row 'Rate limit', 03-routes-and-contracts.md §3 RateLimiter"
  - id: BR2.1
    statement: "A draft payload is stored only as Crypto.encrypt output in payload_enc; the plaintext is never stored, logged, put in an audit row or returned by the repository."
    category: constraint
    applies_to: "review.saveDraft, ReviewRepository draft methods, seed-content.ts drafts"
    trigger: "Writing or reading a draft"
    logic: "save: payload_enc = encrypt(TextEncoder(JSON(payload))) through the Crypto port (application imports no Node built-in); read: the repository returns payload_enc bytes; the application layer decrypts; a decrypt failure is an internal error logged with the draft id only; seeded drafts are encrypted with the Crypto adapter itself (Question 21, FD entry (e)), never with the test fake's fixed key"
    violation: "Story text readable in the database row fails the int test 'row bytes do not contain the story text'"
    source: "FR39 (encrypted autosave), 02-data-model.md §6, T-301 step 5 and threat notes, ISS-269, FD-093, Question 21"
  - id: BR2.2
    statement: "saveDraft accepts a partial DraftPayload: every field optional, unknown keys dropped, each field bounded; a draft never has to be publishable."
    category: validation
    applies_to: "contracts/schemas/review.ts DraftPayload, review.saveDraft"
    trigger: "Every autosave"
    logic: "parse with the DraftPayload schema: story <= 10000 graphemes, each section <= 5000, title <= 120, tags <= 20, claims <= 3, evidenceItemIds <= 10 (the evidence per-draft limit), encoded JSON <= 64 KiB; IF a bound is exceeded or a field has the wrong type THEN validation with fieldErrors; no rating or score field exists in the schema"
    violation: "An oversized or malformed payload stored, or a numeric rating accepted (AC6.1.1)"
    source: "FR39, FR40, T-306 step 2 (composer state), C8 (10 items per draft), construction.md (validate inputs at boundaries)"
  - id: BR2.3
    statement: "A draft expires 30 days after its last save; an expired draft is gone for every read before the worker purges it."
    category: calculation
    applies_to: "review.saveDraft, getDraft, listDrafts, preview, publish"
    trigger: "Every save and every read"
    logic: "save sets expires_at = clock.now() + 30 days; every read filters expires_at > clock.now(); expireDrafts in the web tier is this read-time filter, the purge and the 4-day warning are retention.expire (U29 T-309)"
    violation: "An author losing a draft they are still editing, or reading a draft past its expiry"
    source: "02-data-model.md §6 (30 d), FD-090, T-301 amendment FD-090 and step 4, Question 4"
  - id: BR2.4
    statement: "A draft that names a pending doctor submission of its own author is blocked: doctor_id stays empty and blocked_on_submission_id is set until the payload names a visible doctor."
    category: calculation
    applies_to: "review.saveDraft"
    trigger: "The payload carries doctorSubmissionPublicId"
    logic: "IF the submission exists, is pending and was filed by actor.accountId THEN blocked_on_submission_id = its id and doctor_id = null; IF it is another account's or unknown THEN validation (fieldErrors.doctor); IF the payload names a doctor THEN doctor_id = that doctor and the block is cleared"
    violation: "A draft blocked on someone else's submission, or a blocked draft that publishes"
    source: "03-routes-and-contracts.md §4 saveDraft, components.md Review, C7 ProfileMergeParticipant.unblockDrafts"
  - id: BR2.5
    statement: "listDrafts returns the owner's live drafts, newest save first, each with its title or no title, a 190-grapheme excerpt, the days left, the blocked flag and the named doctor."
    category: calculation
    applies_to: "review.listDrafts, ComposerDraftVM"
    trigger: "The workspace drafts tab (U38 T-409) asks"
    logic: "drafts of actor.accountId with expires_at > now, ordered updated_at desc; title = payload.title if present, else absent (the UI shows 'Untitled — started {date}'); excerpt from story or the first non-empty section (U14 BR3.7: 190 graphemes); expiresInDays = ceil((expires_at - now) / 1 day); blocked = blocked_on_submission_id is set"
    violation: "Another account's drafts listed, or an expired draft shown"
    source: "T-301 step 7 (listDrafts), prototype seed drafts (Untitled — started …), T-409 step 4"
  - id: BR2.6
    statement: "The worker may read only id, account_id and expires_at of review_drafts and delete rows; it can never read payload_enc or update a draft."
    category: constraint
    applies_to: "migration <next>_review_drafts_worker_grant.sql, 02-data-model.md §16"
    trigger: "Code Generation; every pnpm test:int"
    logic: "GRANT SELECT (id, account_id, expires_at), DELETE ON review_drafts TO rk_worker; no INSERT, no UPDATE, no SELECT on other columns; §16 moves PA3 from planned to the live list"
    violation: "The worker reading draft text breaks FD-090 and the validator-probes acceptance row"
    source: "FD-090, T-301 amendment FD-090 and acceptance row 'FD-090: worker grant is narrow'"
  - id: BR3.1
    statement: "A quick review is publishable with a doctor, a story of at least 20 graphemes after trimming, a relationship, and at least one tag or Not sure."
    category: validation
    applies_to: "domain/review/policies.ts minimumFieldsSatisfied"
    trigger: "review.publish of a quick draft"
    logic: "doctor resolved (BR3.4) AND graphemeLength(trim(story)) >= 20 AND relationship in [self, parent, family, witness] AND (tags non-empty OR notSure); sentiment, outcome, claims and evidence are not required"
    violation: "A quick review without tag and without Not sure publishing fails the 'Publish minimum fields' row"
    source: "FR40, AC6.1.1, AC6.1.3, T-301 step 3"
  - id: BR3.2
    statement: "A detailed review has the same minimum as a quick review, except that at least one non-empty section replaces the story; an opening paragraph is optional."
    category: validation
    applies_to: "domain/review/policies.ts minimumFieldsSatisfied"
    trigger: "review.publish of a detailed draft"
    logic: "doctor AND (at least one of sections.symptoms, diagnosis, treatment, after is non-empty after trimming) AND relationship AND (tags OR notSure); body, when given, is kept as the opening paragraph"
    violation: "A detailed review with only empty sections publishing, or a different minimum from quick (AC6.2.1)"
    source: "FR40, FR41, AC6.2.1, T-301 step 3, T-307 step 3 (body + timeline)"
  - id: BR3.3
    statement: "A refused publish names every missing field at once in a fixed order and keeps the draft untouched."
    category: validation
    applies_to: "review.publish, facilityReview.publish"
    trigger: "minimumFieldsSatisfied or the period check fails"
    logic: "return review.min_fields with fieldErrors for each missing field in the order doctor, story or sections, relationship, tags, period: errors.review.missingDoctor (or errors.review.doctorPending when blocked), missingStory or missingSection, missingRelationship, missingTag, periodInvalid; no row, audit or outbox entry is written"
    violation: "A refusal that does not name the field, or one that deletes or alters the draft, fails AC6.1.3"
    source: "AC6.1.3, 03-routes-and-contracts.md §2 (AppError.fieldErrors), T-306 step 9"
  - id: BR3.4
    statement: "The doctor of a publish is a visible doctor: published and not merged; an old public id is followed to its target; a blocked draft cannot publish."
    category: validation
    applies_to: "review.publish"
    trigger: "Resolving payload.doctorPublicId"
    logic: "directory.resolvePublicId({kind: doctor, publicId}) then the visible doctor (U14 BR1.1, BR1.7); IF blocked_on_submission_id is set THEN fieldErrors.doctor = errors.review.doctorPending; IF no visible doctor THEN fieldErrors.doctor = errors.review.missingDoctor"
    violation: "A review attached to a hidden, merged-away or pending profile"
    source: "FR40, U14 BR1.1 and BR1.7, components.md Review (checks pending submissions)"
  - id: BR3.5
    statement: "The treatment period is required at publish, parsed by parsePeriod from the bilingual month names or digits in either script, and may not lie in the future; an optional exact date must fall inside that month."
    category: validation
    applies_to: "domain/review/review.ts parsePeriod, review.publish, facilityReview.publish"
    trigger: "Publishing a draft"
    logic: "parsePeriod(text): NFC; Bengali digits mapped to ASCII; accepts 'March 2026', 'Mar 2026', 'মার্চ ২০২৬' (and the ি/ী spelling variants of জানুয়ারি and ফেব্রুয়ারি), '03/2026', '3/2026', '2026-03'; year 1950 to the current year; month 1-12; (year, month) <= the current month; ELSE err; exactDate (YYYY-MM-DD) optional, its year and month must equal the period and it may not be in the future"
    violation: "A garbage or future period stored, or a review with no period (the column is NOT NULL)"
    source: "FR42, AC6.2.2, T-301 steps 1 and 3 (policies.test.ts parsePeriod), 02-data-model.md §6, Question 12"
  - id: BR3.6
    statement: "Publishing needs the author's explicit experience and privacy attestation; without it the command answers review.attestation_required."
    category: validation
    applies_to: "PublishReviewInput, FacilityReviewPublishInput, review.publish, facilityReview.publish"
    trigger: "A publish is attempted"
    logic: "the input schema types attestation as boolean; IF attestation is not true THEN review.attestation_required (fieldErrors.attestation) and nothing is written; ELSE attestation_at = clock.now()"
    violation: "A publish without attestation, or a generic validation error that does not name the attestation (AC6.1.3)"
    source: "FR40, FD-014, AC6.1.3, T-301 step 5 and publish.test.ts"
  - id: BR3.7
    statement: "The identity mode the author previewed is the one that publishes: an input identityMode that differs from the draft's chosen mode is refused."
    category: validation
    applies_to: "review.publish, facilityReview.publish"
    trigger: "A publish is attempted"
    logic: "IF payload.identity is set AND payload.identity != input.identityMode THEN conflict and nothing is written; IF payload.identity is absent THEN input.identityMode is used"
    violation: "A review published under a different identity than its preview showed (AC6.1.1 'preview shows only the public projection')"
    source: "AC6.1.1, AC3.3.1, T-301 acceptance row 'Preview equals public'"
  - id: BR3.8
    statement: "Each tag is resolved once: a term reference must be an active term of the group's kind, free text resolves to its effective term or becomes a provisional term, ambiguous free text stays free text, Not sure is its own row; one review carries each effective term at most once per group."
    category: calculation
    applies_to: "review.publish (tags)"
    trigger: "Publishing a draft with tags"
    logic: "group -> kind (symptom, condition, treatment, medicine); termPublicId -> an active term of that kind ELSE validation (fieldErrors.tags); freeText -> taxonomy.resolve({text, kind}): one term -> term_id; none -> ensureProvisionalTerm(tx, {kind, text, lang}, persona actor) on the publish transaction (U14 WF11, BR5.2, BR5.5), after the persona exists (BR4.2), with lang = the script of the text (bn when Bengali letters are the majority, en when Latin letters are, else actor.locale; banglish is never guessed) -> term_id; the operation never aborts the transaction and returns the concurrent winner on a race; ambiguous -> free_text kept as written; notSure -> not_sure row; duplicates of the same effective term in a group collapse to the first; no second authorization or rate limit runs for the terms (publish did both)"
    violation: "A tag pointing at a hidden or wrong-kind term, a provisional term created outside the publish transaction or with the account as its actor, or a reviewer's wording altered (AC5.3.2)"
    source: "FR37, FR40, T-301 step 5 (tags), U14 BR4.3, BR5.2, BR5.5 and finding F12, T-306 step 4"
  - id: BR3.9
    statement: "Reviewer's labels are the three suggested labels only in release 1, stored by their code."
    category: validation
    applies_to: "DraftPayload.claims, review.publish, reviews.claims"
    trigger: "Publishing a draft with claims"
    logic: "each claim in [wrongDx, wrongRx, secondOpinion], at most once; stored as [{label: <code>}]; any other value -> validation (fieldErrors.claims); custom labels move to release 2 with the label configuration and the label-approval workflow (R3 decided; FD entry (c), with the owner's T-105 answer of 2026-10-29)"
    violation: "A free-text claim published without the approval workflow FR47 describes"
    source: "FR47, AC6.2.4, T-301 step 1 (Claims), prototype renderCompose claims, R3, FD entry (c)"
  - id: BR3.10
    statement: "Every evidence item a publish names must belong to this draft and its author; otherwise the publish is refused and nothing is written."
    category: authorization
    applies_to: "review.publish (evidence), EvidenceForPublish port"
    trigger: "Publishing a draft whose payload lists evidenceItemIds"
    logic: "evidenceForPublish.itemsOfDraft(tx, {draftId, accountId, itemIds}) -> [{itemId, state}]; IF any listed id is not returned THEN validation (fieldErrors.evidence) and no side effect; the check fails closed"
    violation: "Linking another author's upload to a review (open point 'Evidence-to-draft link', unit-of-work.md)"
    source: "unit-of-work.md open point (publish check in U21), C8, T-301 step 5"
  - id: BR3.11
    statement: "An optional branch is accepted only when it is a visible branch where the reviewed doctor has a chamber."
    category: validation
    applies_to: "review.publish (payload.branchPublicId)"
    trigger: "The payload names a branch"
    logic: "IF branchPublicId is given THEN it must be a visible branch (U14 BR1.2) AND a doctor_chambers row links the doctor to it ELSE validation (fieldErrors.branch); absent -> branch_id null"
    violation: "A review attached to an unrelated or hidden branch"
    source: "02-data-model.md §6 (branch_id), C15 (branchId?), U14 BR1.2"
  - id: BR3.12
    statement: "Sentiment and outcome are optional enum choices; no publish path accepts, computes or stores a numeric rating."
    category: policy
    applies_to: "DraftPayload, review.publish, reviews"
    trigger: "Publishing"
    logic: "sentiment in [positive, mixed, negative] or absent; outcome in [helped, none, worse, uncertain] or absent; absent stores null; the schema has no rating, score or stars field; sentiment stays optional in release 1, because the setting that could make it required (FR45) moves to release 2 (the owner's T-105 answer of 2026-10-29)"
    violation: "A numeric rating anywhere is an S1 defect against the hard rule (AC6.1.1)"
    source: "project.md Forbidden (no number for quality), FR40, FR45, AC6.1.1, AC6.2.3, U12 T-105 R1 (owner, 2026-10-29)"
  - id: BR3.13
    statement: "The What went well and What could improve checkboxes of FR46 are deferred from release 1 by an FD entry: nothing in this Unit stores, accepts or projects them, and a payload carrying them is stripped like any unknown key."
    category: policy
    applies_to: "DraftPayload, review.publish, ExperiencePageVM"
    trigger: "Code Generation; every saveDraft and publish"
    logic: "no column, migration, payload field, view-model field or i18n key for the FR46 checkboxes exists; DraftPayload drops unknown keys (BR2.2), so wentWell or couldImprove keys in a payload are dropped on save; AC6.2.3 is narrowed for release 1 to its sentiment half, which BR3.12 and BR6.5 deliver (a skipped sentiment publishes and shows Not provided, no score); the checkboxes return as a follow-up task with its own design pass"
    violation: "A checkbox column, field or score built in release 1 against the FD entry, or a skipped sentiment shown as a value or 0"
    source: "FR46, AC6.2.3, Question 15 A (decided by the agent under the owner's no-questions instruction of 2026-10-29), FD entry (a) in functional-spec.md § 17"
  - id: BR4.1
    statement: "A publish is one transaction: persona, review, tags, provisional terms, evidence linkage, audit row, outbox rows and the draft deletion commit together or not at all."
    category: constraint
    applies_to: "review.publish, facilityReview.publish"
    trigger: "A publish passes every check"
    logic: "one UnitOfWork transaction (defineCommand, U8 T-101): persona -> provisional terms with their audit rows (actor persona:<id>) and term.changed -> review row -> review_tags -> evidence publish and bind -> audit -> outbox review.published -> delete draft; IF any step returns err or throws THEN everything rolls back, the draft is kept and the result is internal (or the step's expected error); no error of this command is marked recorded"
    violation: "A half-published review, or a lost draft after a failure (publish.test.ts 'transaction rollback when persona creation fails')"
    source: "01-conventions.md §3, C9, T-301 step 5 and publish.test.ts"
  - id: BR4.2
    statement: "The author persona follows the chosen mode: named uses the account's named persona, pseudonymous its pseudonymous persona, anonymous a new alias scoped to this review, created with the review id generated first."
    category: calculation
    applies_to: "review.publish"
    trigger: "Publishing"
    logic: "reviewId = ids.newId() before any insert; personaId = identity.personaFor(tx, {accountId, reviewId, mode}) (U11 T-104: an internal operation on the caller's transaction); for anonymous the link row carries reviewId and the persona_links -> reviews foreign key is checked at commit (DEFERRABLE INITIALLY DEFERRED, made so by U11 T-104's migration, its Question 7 A; this Unit's fallback migration only if T-104 merged without it); the new anonymous persona's display name is its random thread alias (T-104 BR2.1)"
    violation: "Two anonymous reviews of one account sharing an alias, or a publish failing on the foreign key, fails the 'Anonymous alias scoped' row (AC3.3.2)"
    source: "FR10, FD-015, AC3.3.1, AC3.3.2, C4 personaFor, T-301 step 5, Question 5, U11 T-104 Question 7"
  - id: BR4.3
    statement: "A review's title is the author's own title when given, otherwise the first sentence of the story or first section, cut at 80 graphemes on a grapheme boundary; the preview shows the same title."
    category: calculation
    applies_to: "domain/review/policies.ts deriveTitle, review.publish, review.preview"
    trigger: "Publishing or previewing"
    logic: "IF trim(payload.title) is non-empty THEN title = it (<= 120 graphemes) ELSE text = story or the first non-empty section; sentence = text up to the first '.', '?', '!', '।' or line break; title = sentence cut to 80 graphemes with Intl.Segmenter, with '…' when cut"
    violation: "A NOT NULL insert failure on reviews.title, or a preview whose title differs from the public page"
    source: "02-data-model.md §6 (title), AC6.1.1, prototype renderCompose (no title field), Question 2"
  - id: BR4.4
    statement: "The stored language of a review's text is detected from its script: Bengali, English or mixed."
    category: calculation
    applies_to: "domain/review/policies.ts detectLanguage, reviews.language, the tag lang of provisional terms"
    trigger: "Publishing"
    logic: "count letters in the Bengali block (U+0980-U+09FF) and Latin letters over title, story and sections; only Bengali -> bn; only Latin -> en; both, each >= 20% of the letters -> mixed; else the majority script; no letters -> the actor's locale"
    violation: "A Bengali review stored as en misdirects the search language filter (T-205 step 5)"
    source: "02-data-model.md §6 (language), T-205 filters, Question 13"
  - id: BR4.5
    statement: "Only month and year of the treatment period are stored in the clear; an exact date is stored only encrypted in exact_date_enc."
    category: constraint
    applies_to: "review.publish, reviews.period_year, period_month, exact_date_enc"
    trigger: "Publishing"
    logic: "period_year, period_month from parsePeriod; IF payload.exactDate THEN exact_date_enc = encrypt(utf8(exactDate)) ELSE null; publicPeriod(period) returns {year, month} only"
    violation: "An exact date in any clear column, view model or log fails AC6.2.2 and the 'Exact date private' grep row"
    source: "FR42, AC6.2.2, T-301 step 3 (publicPeriod) and threat notes"
  - id: BR4.6
    statement: "Evidence never blocks text: privacy-confirmed items are published with the review, items still in processing or awaiting confirmation are bound privately to the new review, failed and removed items are ignored."
    category: policy
    applies_to: "review.publish (evidence)"
    trigger: "Publishing a draft with evidence"
    logic: "states from BR3.10: privacy_confirmed -> evidence.publish(tx, {reviewId, itemIds}); quarantined, validating, scanning, sanitising, preview_ready -> evidence.bindToReview(tx, {reviewId, itemIds}) (private, not public; a later confirmation publishes it into this review); failed, rejected, removed -> nothing; the review publishes in every case"
    violation: "A text review held back by a file, an unconfirmed file shown publicly (FD-023), or a processing file orphaned when the draft is deleted (AC6.1.6)"
    source: "FR44, FD-023, AC6.1.6, 03-routes-and-contracts.md §4 publish, T-301 step 5, C8, Question 9"
  - id: BR4.7
    statement: "A publish writes one audit row whose actor is the author persona, never the account, with allowlisted details only."
    category: policy
    applies_to: "review.publish (stream review:<id>), facilityReview.publish (stream facility_review:<id>)"
    trigger: "A publish commits"
    logic: "AuditWriter.write(tx, {stream, action: publish, actor: 'persona:<authorPersonaId>', targetKind, targetId, details: {kind, identityMode, tagCount, evidenceLinked, evidencePending}}) for reviews; {identityMode, criteriaAnswered} for facility reviews; details built with U8 T-101's audit allowlist builders (ISS-108); never text, account ids or file names; the provisional terms a publish creates carry the same persona actor (BR3.8)"
    violation: "An audit row 'account:<id> published review <id>' for an anonymous review is a second persona-to-account link outside persona_links (AD-3)"
    source: "01-conventions.md §5, AD-3, components.md Identity (accepted exceptions), T-301 step 5 (audit), Question 10, FD entry (d) in functional-spec.md § 17"
  - id: BR4.8
    statement: "review.published carries exactly reviewId, doctorId, branchId and repeatEpisode, ids and a boolean only, and never names an earlier review."
    category: constraint
    applies_to: "review.publish outbox"
    trigger: "A review publish commits"
    logic: "Outbox.append(tx, 'review.published', {reviewId, doctorId, branchId: id or null, repeatEpisode: boolean}); no account id, persona id, earlier review id, text or count"
    violation: "Any other key fails the 'FD-080: payload hygiene' row; an earlier review id links two reviews of one author (FD-015)"
    source: "FD-080, C9, C15, T-301 amendment FD-080 and acceptance row 'payload hygiene'"
  - id: BR4.9
    statement: "repeatEpisode is true when the same account already has an eligible published review of the same doctor for the same treatment month and year that shares a condition."
    category: calculation
    applies_to: "domain/review/policies.ts isRepeatEpisode, review.publish"
    trigger: "Publishing a review"
    logic: "candidates = eligible reviews (U14 BR1.3) with the same doctor_id, period_year and period_month, sharing at least one condition key with the new review, where a condition key is the effective term id of a condition tag or normalizeAliasKey of a free-text condition tag; the repository returns each candidate's author persona, effective condition term ids and free-text condition tags as written, and the application computes the free-text keys with the domain function and keeps the sharing ones (database may not import domain; Question 20); Not sure never matches; branch is ignored; repeatEpisode = identity.ownsAnyPersona({accountId, personaIds: the kept candidates' author personas}), false without a call when none is kept; computed inside the publish transaction; the boolean is never returned to the author; the review publishes either way"
    violation: "The second identical episode without the flag, or a different period, doctor or condition with the flag, fails the FD-080 acceptance rows"
    source: "FR43, AC6.1.4, FD-080, C9 (the exact rule is U21's), T-301 amendment FD-080, Questions 7, 8 and 20, FD-093"
  - id: BR4.10
    statement: "A published review starts in state published, version 1, with published_at and attestation_at set to the publish time; this Unit writes no review_versions row."
    category: calculation
    applies_to: "review.publish"
    trigger: "Publishing"
    logic: "state = published; version = 1; published_at = attestation_at = clock.now(); deleted_at and restore_until null; review_versions is written by U22 T-302 when a material edit happens"
    violation: "A review published in another state, or an actor-bearing version row written outside its owning Unit"
    source: "02-data-model.md §6 and §17, AC6.1.1, scope of T-301 (versioning is T-302)"
  - id: BR5.1
    statement: "The publication state machine is the table of 02-data-model.md §17, with the soft-deleted state 'deleted' kept in the domain only; every other (state, event) pair is refused with conflict."
    category: constraint
    applies_to: "domain/review/review-state.ts transition"
    trigger: "Any state change of a review or facility review"
    logic: "draft --publish--> published; pending_review --publish--> published; pending_review --reject--> rejected; published --autoHide--> hidden_pending_review; published --hide--> hidden; published --deleteWithDiscussion--> deleted_tombstone; published --deleteWithoutDiscussion--> deleted; published --remove--> deleted_tombstone; hidden_pending_review --restore--> published; hidden_pending_review --hide--> hidden; hidden --restore--> published; hidden --deleteWithDiscussion--> deleted_tombstone; hidden --remove--> deleted_tombstone; deleted_tombstone --authorRestore--> published; deleted --authorRestore--> published; any other pair -> a structural refusal {ok: false, reason: conflict} that the application maps to err(conflict) (domain imports nothing, not even contracts' Result); the two cells R4 raises are added later by U33 T-404 and U22 T-302 with a dated §17 note, never here"
    violation: "A missing or extra cell fails the 'Transition table complete' row"
    source: "02-data-model.md §17, FD-049, T-301 step 2, C9 setState events, FD-093, R4 (decided)"
  - id: BR5.2
    statement: "The domain state of a stored review is derived from its state column and deleted_at: a published row with deleted_at is 'deleted'; persisting 'deleted' keeps the column published and sets deleted_at."
    category: calculation
    applies_to: "domain/review/review-state.ts domainStateOf, toStored"
    trigger: "Loading or saving a review's state"
    logic: "domainStateOf(row) = 'deleted' IF row.state = published AND row.deleted_at IS NOT NULL ELSE row.state; toStored('deleted') = {state: published, deleted_at: now}; the moderation events hideThreshold and hideCritical of C9 both map to autoHide"
    violation: "A soft-deleted review counted in any figure, or an enum value 'deleted' written to the column"
    source: "FD-049, ISS-147 (closed by FD-049), U14 BR1.3, C9 review.setState"
  - id: BR5.3
    statement: "authorRestore is allowed by the table only from a deletion the author made; the 30-day window itself is checked by U22 T-302's restore command."
    category: constraint
    applies_to: "domain/review/review-state.ts, review.restore (U22)"
    trigger: "An author restore"
    logic: "the table permits deleted_tombstone|deleted -> published on authorRestore; a tombstone made by moderator remove has restore_until = null, so the window check (restore_until set and now <= restore_until) refuses it"
    violation: "An author restoring a review a moderator removed"
    source: "02-data-model.md §17, AC6.3.5, FD-049"
  - id: BR6.1
    statement: "One pure function, toExperiencePage(review, deps), builds the experience page for both review.preview and review.getExperience."
    category: constraint
    applies_to: "modules/review/projection.ts"
    trigger: "Any experience page or preview"
    logic: "the queries load everything the page needs into deps (doctor, condition and tag names, persona projection, related cards, other accounts, locale) and call toExperiencePage; the function reads no port, clock or random value"
    violation: "Preview and public page drifting apart fails the 'Preview equals public' row (AC6.1.1)"
    source: "FR39, AC6.1.1, 03-routes-and-contracts.md §4 preview, T-301 step 6"
  - id: BR6.2
    statement: "review.getExperience answers only an eligible review: published and not soft-deleted; anything else is not_found."
    category: constraint
    applies_to: "review.getExperience"
    trigger: "A public experience page is requested"
    logic: "IF the review with that public id has state published AND deleted_at IS NULL THEN project ELSE not_found; U22 T-302 adds the tombstone answer for deleted_tombstone"
    violation: "A hidden or deleted review reachable by URL"
    source: "U14 BR1.3, T-301 step 7, FR50"
  - id: BR6.3
    statement: "The experience page view model carries public ids and public text only: no exact date, account id, persona id, persona link, internal UUID, original filename or raw reaction count."
    category: authorization
    applies_to: "ExperiencePageVM, PreviewVM, every card in it"
    trigger: "Building a page"
    logic: "references are public ids (the discussion slot is the review's publicId); the byline carries only what BR6.4 allows; reaction counts are U30 T-401's own query; a deep scan of the JSON finds none of accountId, personaId, exactDate, exact_date, originalFilename, email, seedRef, likes, dislikes"
    violation: "Any private key is an S1 defect (03-routes-and-contracts.md §2; 'Exact date private' grep row)"
    source: "03-routes-and-contracts.md §2, contract-summary.md privacy rules, AD-3, T-301 step 6 (never includes) and threat notes"
  - id: BR6.4
    statement: "The page byline shows the chosen identity only: named shows the display name, pseudonymous the username, anonymous the thread's own alias with 'Written anonymously', and a de-identified persona 'Former member'; named and pseudonymous bylines carry the profile username for the profile link, anonymous and Former member bylines never do."
    category: authorization
    applies_to: "PageBylineVM on the experience page and in the preview; cards keep U14's BylineVM"
    trigger: "Projecting an author"
    logic: "from Identity's byline data (U11 T-104 identity.bylinesFor) for the review's author persona: named -> {personaKind: named, displayName, initials, profileUsername}; pseudonymous -> {personaKind: pseudonymous, username, initials, profileUsername}; anonymous -> {personaKind: anonymous, alias} (the persona's display name, patient-xxxx; no initials, no profileUsername, constant hue; Question 17); formerMember true (a named or pseudonymous persona de-identified by U11 T-104, the owner's answer to its Question 15) -> {personaKind, formerMember: true} with no name, username or profileUsername (Question 19); plus relationship and postedMonthYear {year, month}; the preview's anonymous byline has no alias (BR6.12); cards on lists use U14's BylineVM, which carries no alias, so the alias stays inside its thread"
    violation: "A byline showing a second identity (AC3.3.1), an anonymous page without its thread alias (AC3.3.2), an alias on a list outside its thread (FD-015), or a deleted person's name or profile link on a retained review (FR13)"
    source: "FR10, FR11, FR13, AC3.3.1, AC3.3.2, AC10.2.1, AC10.3.3, FD-015, U14 BR2.10, U11 T-104 Questions 6 and 15, T-301 step 6 (byline), Questions 17, 18 and 19"
  - id: BR6.5
    statement: "The page flags are, in order, sentiment or Not provided, outcome or Not provided, the condition tag, and the treatment month and year; a missing value is never 0 or blank."
    category: calculation
    applies_to: "ExperiencePageVM.flags, sentiment, outcome"
    trigger: "Building a page"
    logic: "flags[0] = {kind: sentiment, key: sentiment.<value> | label.notProvided}; flags[1] = {kind: outcome, key: outcome.<value> | label.notProvided}; flags[2] = {kind: condition, label} when a condition tag exists; flags[3] = {kind: period, key: review.episodeDate, period: {year, month}}; vm.sentiment and vm.outcome are null when not given"
    violation: "A missing sentiment shown as a value or 0 fails the 'Not provided' row and AC6.2.3"
    source: "project.md Mandated (Not provided), FR51, AC6.2.3, AC6.4.2, T-301 step 6 and acceptance row 'Not provided'"
  - id: BR6.6
    statement: "Every reviewer's claim is projected with the Reviewer's label key and framed as the author's claim."
    category: policy
    applies_to: "ExperiencePageVM.claims"
    trigger: "A review with claims"
    logic: "claims = [{labelKey: claim.<code>}] in stored order, with reviewerLabelKey = label.reviewerLabel and noteKey = label.reviewerLabelWhy; no claim is ever projected as a platform finding or with the words verified or approved"
    violation: "A claim without the Reviewer's label prefix breaks the hard rule (AC6.2.4)"
    source: "project.md Mandated (Reviewer's label), FR47, AC6.2.4, T-301 step 6"
  - id: BR6.7
    statement: "The story is projected in the author's original wording: the opening paragraph when present, then the non-empty detailed sections in the order symptoms, diagnosis, treatment, after, with the text's language for the lang attribute."
    category: calculation
    applies_to: "ExperiencePageVM.body, sections, contentLanguage"
    trigger: "Building a page"
    logic: "body = reviews.body when non-empty; sections = [{key, body}] for each non-empty section in fixed order, empty ones omitted with no heading; contentLanguage = reviews.language; no text is translated"
    violation: "Blank section headings or a reordered timeline fail AC6.2.1"
    source: "FR41, AC6.2.1, U14 BR2.9, T-301 step 6, T-307 step 3"
  - id: BR6.8
    statement: "The doctor on an experience page always carries registrationNotVerified true, and the page's condition is chosen as on a card: the first condition tag that has a term, else the first free-text condition tag."
    category: policy
    applies_to: "ExperiencePageVM.doctor, condition, margin"
    trigger: "Building a page"
    logic: "doctor = {publicId, name in locale, registrationNotVerified: true} (literal, U14 BR2.5); condition = U14 BR3.9 as refreshed: IF the review has a condition tag with term_id THEN the first such tag by (created_at, id) gives {publicId, name} of its effective term, or {name} only when that term is hidden; ELSE IF it has a free-text condition tag THEN the first gives {name}; ELSE absent"
    violation: "A doctor without the flag is an S1 defect (hard rule)"
    source: "project.md Mandated (Registration not verified), D-003, U14 BR2.5 and BR3.9, T-301 hard-rule checklist"
  - id: BR6.9
    statement: "Other accounts by this author are the eligible reviews of the same persona only, never found through the account, and none at all for an anonymous review or a de-identified persona."
    category: authorization
    applies_to: "ExperiencePageVM.margin.otherAccounts, ReviewRepository.byAuthorPersonas"
    trigger: "Building a page"
    logic: "IF identity_mode = anonymous OR the author's byline data says formerMember THEN [] and byAuthorPersonas is not called ELSE byAuthorPersonas([author_persona_id]) excluding this review, eligible only, newest first, at most 10, as [{publicId, title}]; the query also filters identity_mode <> anonymous in SQL"
    violation: "An anonymous review linked to other content fails the 'Anonymous alias scoped' row and AC3.3.2, AC3.3.3; a deleted person's retained reviews grouped under one label weakens FR13's de-identification"
    source: "FD-015, FR13, AC3.3.2, AC3.3.3, AC10.3.3, T-301 steps 4 and 6, prototype accountsByAuthor, Question 19"
  - id: BR6.10
    statement: "Related experiences are eligible reviews sharing the page's condition, and same-doctor experiences are the doctor's other eligible reviews; each list excludes the page's review, is newest first and has at most six cards."
    category: calculation
    applies_to: "ExperiencePageVM.relatedByCondition, sameDoctor"
    trigger: "Building a page"
    logic: "relatedByCondition(the effective term of the page's condition per BR6.8, excludeId, 6), matched against each other review's condition chosen the same way (U14 BR3.9: the first condition tag that has a term); a page whose condition is free text only has no related cards; and the doctor's eligible reviews (excludeId, 6); both ordered published_at desc, tie public_id; cards are ExperienceCardVM (U14); no list is ordered by sentiment, outcome, reactions or evidence"
    violation: "A non-neutral order breaks the neutral-ordering hard rule"
    source: "project.md Mandated (neutral order), U14 BR2.8, T-301 step 6, prototype relatedByCondition"
  - id: BR6.11
    statement: "Until U25 T-305 lands, the page carries no evidence groups and says so; every document count counts published evidence only."
    category: calculation
    applies_to: "ExperiencePageVM.evidenceGroups, hasDocuments; ExperienceCardVM.documentsCount"
    trigger: "Building a page or card"
    logic: "evidenceGroups = [] and hasDocuments = false in this Unit; documentsCount follows U14 BR1.5 (published items of an eligible review); the UI shows No documents, never 0"
    violation: "A processing or failed file shown on the public page (FR44, AC6.1.6)"
    source: "FR44, FR51, AC6.1.6, AC6.4.2, T-301 step 6, U14 BR1.5"
  - id: BR6.12
    statement: "review.preview builds the page from the decrypted draft without writing anything: no persona, term or evidence row is created by a preview."
    category: constraint
    applies_to: "review.preview"
    trigger: "The composer asks for the preview"
    logic: "a transient Review from the draft (BR3.1-BR3.5 not enforced; missing values project as Not provided); byline: named and pseudonymous from the account's existing personas, found read-only through identity.currentPersonaOf (named and pseudonymous ids, Question 8 refresh) and identity.bylinesFor, anonymous from the mode alone with no alias, because the thread alias is created at publish; free-text tags resolve read-only and an unresolved one shows its wording with provisional = true; title from BR4.3; publicId and postedMonthYear absent; allowed differences after publish: the review's publicId, postedMonthYear, discussion, the public ids of terms created at publish, and an anonymous byline's alias"
    violation: "A preview that creates an anonymous persona or a provisional term breaks 'queries never write' (01-conventions.md §3)"
    source: "01-conventions.md §3, AC6.1.1, T-301 step 7 (preview) and acceptance row 'Preview equals public'"
  - id: BR6.13
    statement: "The experience page carries no anonymity caveat about the limits of anonymity, lawful disclosure or staff access; an anonymous review shows only its anonymous byline, and the composer's note is reworded without the legal or staff-access sentence."
    category: policy
    applies_to: "ExperiencePageVM, PreviewVM (margin and byline); compose.identity.anonNote (U26 T-306)"
    trigger: "Building any experience page or preview; U26 T-306 rewording the composer note"
    logic: "neither the page VM nor its margin has an anonNote field or any key naming lawful disclosure or staff identity access; the byline (personaKind anonymous, the thread alias) gives the 'Written anonymously' line; U26 T-306 replaces compose.identity.anonNote in both dictionaries with the wording of FD entry (b); the explanation stays in the Terms and the Privacy Policy, in the lawful-access section both carry (the owner's T-207 answer of 2026-10-29)"
    violation: "A review-page or writing-flow warning about staff identity access contradicts FD-022 and AC3.3.6"
    source: "FD-008, FD-022, AC3.3.6, U20 T-207 Question 1 (owner, 2026-10-29), Question 16 A (decided by the agent under the owner's no-questions instruction of 2026-10-29), FD entry (b) in functional-spec.md § 17"
  - id: BR7.1
    statement: "Every review list and count filters eligibility in SQL: state published and deleted_at null; the U14 predicate is reused, not restated."
    category: constraint
    applies_to: "every ReviewRepository read added by this Unit (listPublished, relatedByCondition, byAuthorPersonas, sameDoctor, repeat candidates)"
    trigger: "Any read of reviews"
    logic: "the reads use U14's eligibility predicate (U14 BR1.3) in the WHERE clause; nothing is filtered in application code"
    violation: "A hidden review in any list fails the review.int test 'publication filter in SQL'"
    source: "U14 BR1.3, T-301 step 4 and threat notes, review.int.test.ts"
  - id: BR7.2
    statement: "review.listExperiences, review.forDoctor and review.forCondition return ExperienceCardVM pages newest first through U14's listExperienceCards read, with no extra filters in release 1."
    category: calculation
    applies_to: "queries/list-experiences.ts, for-doctor.ts, for-condition.ts; ListExperiencesInput"
    trigger: "An index or list asks"
    logic: "keyset cursor on (published_at, public_id) per U14 WF13; pageSize 20 (max 50); forDoctor scopes by doctor, forCondition by effective condition term; ListExperiencesInput loses its untyped filters field and its TODO(T-301)"
    violation: "Two list implementations with different eligibility or order"
    source: "T-301 step 7, U14 WF13 and BR2.8, AC5.2.3 (newest by default)"
  - id: BR7.3
    statement: "review.forBranch lists the branch's eligible facility accounts only; a doctor review is never listed on a branch, whatever its branch_id."
    category: constraint
    applies_to: "queries/for-branch.ts"
    trigger: "A facility page asks for its accounts"
    logic: "IF (await config.current()).featureVisibility.facilityAccounts is false THEN an empty page and no read (U14 BR2.12) ELSE facility_reviews of that branch, eligible (U14 BR1.4), newest first, mapped to FacilityAccountVM (U14); reviews.branch_id is never read here"
    violation: "Doctor and facility feedback mixed on a branch page fails AC4.3.1 and U14 BR2.7; facility accounts listed while facility feedback is turned off breaks U14 BR2.12"
    source: "FR24, FR26, FR100 (feature visibility), AC4.3.1, AC6.4.3, U14 BR2.7 and BR2.12 (T-203 finding F8, owner's answer)"
  - id: BR7.4
    statement: "The sentiment, outcome and criteria distributions are U14's queries and policies, reused unchanged; this Unit adds no second distribution, percentage or score."
    category: constraint
    applies_to: "review.sentimentDistribution, outcomeDistribution, criteriaDistribution, domain/review/policies.ts distribution and isLimitedData"
    trigger: "Code Generation"
    logic: "the U14 shape (keys, counts, total of recognised values, notProvided, empty, limitedData from ConfigProvider.current().limitedDataThreshold) is the only one; T-301's acceptance rows run against it"
    violation: "A rewrite of U14's queries, or a constant threshold, breaks the 03 §4 ownership note and the hard rule"
    source: "03-routes-and-contracts.md §4 ownership note, U14 BR2.3, BR2.4 and BR3.1, owner answer 2026-10-28 (counts with denominators only, no percentages)"
  - id: BR7.5
    statement: "No doctor-side query joins or names facility_reviews, and a test reads the query builders' SQL text to prove it."
    category: constraint
    applies_to: "ReviewRepository doctor reads (distributions, cards, related, same doctor, repeat candidates)"
    trigger: "Code Generation; every pnpm test:int"
    logic: "the SQL text of each doctor-aggregate builder does not contain facility_reviews; 3 doctor reviews plus 8 facility reviews on the doctor's branch give a doctor distribution total of 3"
    violation: "Facility feedback in a doctor's figures is an S1 defect (hard rule; AC4.3.3)"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, AC4.3.3, AC6.4.3, T-301 step 8 and acceptance row 'Facility isolation'"
  - id: BR7.6
    statement: "No exported domain function returns a plain number for a set of reviews, and no export is named score, rating or stars."
    category: policy
    applies_to: "packages/domain/src/review/**"
    trigger: "pnpm --filter @rogikotha/domain test no-score"
    logic: "for each exported function that takes a Review[]: call it with a fixture set and assert typeof result != number; assert no export name matches /score|rating|stars?/i"
    violation: "A combined score function is an S1 defect (hard rule)"
    source: "project.md Forbidden (no number for quality), T-301 acceptance row 'No scalar score' and no-score.test.ts"
  - id: BR8.1
    statement: "facilityReview.publish publishes a facility draft with a visible branch, a story of at least 20 graphemes, a period, the attestation and optional non-scored criteria."
    category: validation
    applies_to: "modules/review/commands/facility-review-publish.ts"
    trigger: "A facility publish is attempted"
    logic: "payload.target = facility; branchPublicId -> visible branch (U14 BR1.2); graphemeLength(trim(story)) >= 20; period per BR3.5; attestation per BR3.6; criteria keys within CRITERIA, values good, mixed, poor or null, missing keys stored as null, every key optional; ELSE review.min_fields or validation naming the field"
    violation: "A facility review with a score or an unknown criterion, or a doctor review written to facility_reviews"
    source: "FR24, FR27, AC4.3.4, T-301 step 5 (facilityReview.publish), owner answer 2026-10-28 (nine-criteria model)"
  - id: BR8.2
    statement: "An anonymous facility review gets a fresh anonymous persona of its own, linked to the account without a review id."
    category: calculation
    applies_to: "facilityReview.publish"
    trigger: "Publishing a facility review anonymously"
    logic: "personaId = identity.personaFor({accountId, mode: anonymous}) with no reviewId, which always creates a new persona and a persona_links row with review_id null; named and pseudonymous follow BR4.2"
    violation: "Two anonymous facility reviews of one account sharing an alias (FD-015)"
    source: "FD-015, 02-data-model.md §3 (persona_links.review_id references reviews only), seed-content.ts facility reviews, Question 6"
  - id: BR8.3
    statement: "A facility publish writes its row, its audit row and deletes the draft in one transaction, and appends no outbox event."
    category: policy
    applies_to: "facilityReview.publish"
    trigger: "A facility publish commits"
    logic: "facility_reviews {state published, version 1, published_at}; audit per BR4.7; C15 defines no facility-review event, so none is appended; a search refresh of facility documents is U18 T-205's decision"
    violation: "An undocumented event name in the outbox (ISS-145)"
    source: "C15, 01-conventions.md §3, BR4.1"
  - id: BR8.4
    statement: "While facility feedback is turned off, facilityReview.publish is refused, writes nothing and keeps the draft."
    category: policy
    applies_to: "modules/review/commands/facility-review-publish.ts"
    trigger: "A facility publish is attempted"
    logic: "after authorization and the rate limit: IF (await config.current()).featureVisibility.facilityAccounts is false THEN forbidden, no row, audit or outbox entry, draft unchanged; the composer (U26 T-306) hides the facility target in that case; facility drafts keep saving (a draft is private)"
    violation: "Facility feedback collected while the platform does not show it, or a draft lost because the feature was off"
    source: "FR100 (feature visibility), U14 BR2.12 (T-203 finding F8, owner's answer), decided by the agent under the owner's no-questions instruction of 2026-10-29"
  - id: BR9.1
    statement: "No row, payload, view model or log written by this Unit links an account to a review outside persona_links and the draft's own account_id."
    category: authorization
    applies_to: "every command, query, audit row, outbox payload and log line of modules/review"
    trigger: "Code Generation; the reviewer's diff review (G4)"
    logic: "audit actor = persona (BR4.7); outbox payloads carry no account id (BR4.8); log lines carry review id or draft id but never both an account id and a review id; the rate-limit key lives only in memory"
    violation: "A second account-to-anonymous-review link breaks AD-3 and the anonymity guarantee (FD-015, FD-016)"
    source: "AD-3, FD-015, FD-016, components.md Identity (accepted exceptions), 01-conventions.md §5"
  - id: BR9.2
    statement: "Review implements Identity's RevealTarget for reviews and facility reviews: the target resolves to its author persona, in any state."
    category: authorization
    applies_to: "modules/review/reveal-target.ts"
    trigger: "identity.reveal with targetKind review or facility_review"
    logic: "resolve(tx, {targetKind, targetId}) -> ok({subject: persona, personaId: author_persona_id, targetCode: the row public_id}) when the row exists in any state; not_found otherwise; Review never reads persona_links itself"
    violation: "identity.reveal unable to resolve a review author, or Review reading the private link table"
    source: "C4 RevealTarget (implemented by Review, built by U21), components.md Review, FD-016, Question 11"
  - id: BR9.3
    statement: "The persona list passed to byAuthorPersonas never contains an anonymous persona, and the query drops anonymous rows itself."
    category: authorization
    applies_to: "ReviewRepository.byAuthorPersonas"
    trigger: "Building other accounts by the same author"
    logic: "callers pass only the review's own persona when it is not anonymous; the SQL adds identity_mode <> anonymous"
    violation: "An anonymous review listed under a public persona"
    source: "T-301 step 4 and threat notes, FD-015"
  - id: BR9.4
    statement: "The review module reads other modules only through their public application API or a declared port, and adds to U14's and U17's files in modules/review without rewriting them."
    category: constraint
    applies_to: "packages/application/src/modules/review/**"
    trigger: "Code Generation; pnpm lint (boundaries)"
    logic: "Review may call directory, taxonomy, identity and evidence (it sits above them, FD-067); provider-experience.ts and condition-stats.ts (U14) and profile-merge-participant.ts (U17) change only additively; no file of modules/directory or modules/taxonomy imports modules/review; under T-010's matrix (FD-093, eslint.boundaries.mjs): packages/domain/src/review imports nothing outside domain (plain unions and structural results, no contracts enum arrays or Result; normalizeAliasKey from domain/taxonomy is inside the element), modules/review imports only domain and contracts and no external package or Node built-in (inputs parsed with the contracts schemas, never zod; Intl.Segmenter and TextEncoder are globals), the review repository imports application ports and contracts only, never domain, and the seed reaches the Crypto adapter only through @rogikotha/adapters/crypto (FD entry (e)); pnpm lint and pnpm lint:boundaries pass with no new suppression"
    violation: "A cycle, a rewrite of another Unit's port implementation, or a red boundary lint (FD-093)"
    source: "FD-067, FD-093, U14 BR6.1, BR6.3 and BR6.6, C7 ProfileMergeParticipant (U17), 01-conventions.md §2 as merged by T-010, Question 21"
  - id: BR10.1
    statement: "Each level is tested as 01-conventions.md §10 asks, with builders and rows the tests insert themselves."
    category: validation
    applies_to: "domain, application (fakes), database (*.int.test.ts) tests of this Unit"
    trigger: "Code Generation"
    logic: "domain: the transition table cell by cell, every policy; application: each command's happy path, each refusal (anonymous, unverified, restricted, foreign draft, rate limit), one audit assertion per command; database: each repository method, the SQL publication filter, facility isolation, the row-bytes check, the worker grant probes"
    violation: "A test that cannot fail, or one that depends on another test's rows"
    source: "01-conventions.md §10, team.md Testing Posture, T-301 'Tests to write'"
  - id: BR10.2
    statement: "The cumulative smoke suite gains at least one assertion for this Unit and loses none."
    category: validation
    applies_to: "pnpm smoke"
    trigger: "Code Generation"
    logic: "review.smoke.test.ts publishes a builder draft through the application with fakes and reads the projection back: registrationNotVerified true, no private key, preview equal to the public page"
    violation: "Breaks team.md Testing Posture"
    source: "team.md Testing Posture, bolt-plan.md Bolt 17 (publish from a test, read the projection)"
  - id: BR10.3
    statement: "pnpm check, pnpm smoke and pnpm test:int exit 0, every package stays at or above the 80% line floor, and CI is green on the Bolt branch before the merge."
    category: validation
    applies_to: "The whole repository"
    trigger: "End of Code Generation and Build and Test; before the squash merge"
    logic: "IF the Unit is complete THEN the three commands exit 0, where pnpm check is the full gate of its day (nine steps after T-010: typecheck, lint, lint:boundaries, format:check, check:identity, test:coverage, i18n:check, contrast, build; eleven after U45 T-011); coverage per package >= 80% with untested files counted, binding domain and application now that they hold code, and test-support's new fakes, builders and seed code count toward its floor; the CI workflow passes on the branch head; the floor is never lowered (D10)"
    violation: "Any red check or red CI run blocks the merge (team.md Way of Working)"
    source: "team.md Way of Working and Testing Posture, D10, T-010 (pnpm check, coverage, CI), T-301 acceptance row 'Whole tree'"
  - id: BR10.4
    statement: "Every finding of this design is an ISS row linked to U21 T-301, and the draft-key half of ISS-269 closes here."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "the rows of functional-spec.md § 9 are added with Found in U21 T-301; ISS-269's draft assumption is fixed (Question 14); the other ISS-269 markers stay with their owners"
    violation: "An unrecorded finding breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), ISS-269"
  - id: BR10.5
    statement: "The tests that pin stubs, migrations, foreign keys and fake method names are updated in the same commit as the change they pin."
    category: validation
    applies_to: "packages/database/src/repositories/not-implemented.test.ts, migrations.int.test.ts, validator-probes.int.test.ts (P8), schema/foreign-keys.int.test.ts, packages/test-support/src/fakes/repositories.test.ts and repositories-superset.test.ts"
    trigger: "Code Generation"
    logic: "PgReviewRepository's remaining stub list in not-implemented.test.ts loses this Unit's methods and keeps only T-302's, which still throw NotImplemented naming T-302; the trace test never calls a method this Unit implements (it moves to a method that stays a stub, unless U14 already moved it); each migration this Unit adds raises both migration-count pins by one from the count at build time, with a comment, and is a drizzle custom migration whose journal timestamp is later than the previous one; if this Unit adds the deferrable persona-link key, foreign-keys.int.test.ts gains the assertion the evidence key has (deferrable true, initially deferred true) and its raw-SQL name list still matches 0004 because the constraint keeps its name; the fake tests use the renamed review methods"
    violation: "A red pnpm check (S1): each listed test fails as soon as a stub becomes real, a migration is added or a fake method is renamed (ISS-294)"
    source: "ISS-294, T-010 Phase B tests, U14 BR7.6, CR-006 note on the migration pins, U11 T-104 § 7"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Drafts need an account; pending and restricted allowed | authorization |
| BR1.2 | Own drafts only; foreign, missing or expired is `not_found` | authorization |
| BR1.3 | Publish needs verified email and not restricted | authorization |
| BR1.4 | 5 publish attempts per account per day, per command | constraint |
| BR2.1 | Draft payload only ever encrypted | constraint |
| BR2.2 | Partial, bounded `DraftPayload`; no rating field | validation |
| BR2.3 | Sliding 30-day expiry; expired drafts gone at read time | calculation |
| BR2.4 | Blocked on the author's own pending submission | calculation |
| BR2.5 | `listDrafts` shape and order | calculation |
| BR2.6 | Narrow worker grant on `review_drafts` (FD-090) | constraint |
| BR3.1 | Quick minimum fields | validation |
| BR3.2 | Detailed minimum fields; optional opening paragraph | validation |
| BR3.3 | Every missing field named; draft kept | validation |
| BR3.4 | Visible doctor; redirects followed; blocked cannot publish | validation |
| BR3.5 | Period required, bilingual parse, not in future; exact date inside it | validation |
| BR3.6 | Attestation required, its own error | validation |
| BR3.7 | Previewed identity mode is the one that publishes | validation |
| BR3.8 | Tag resolution, provisional terms in the transaction | calculation |
| BR3.9 | Three suggested Reviewer's labels, stored as codes | validation |
| BR3.10 | Evidence must belong to the draft and its author | authorization |
| BR3.11 | Optional branch must host the doctor | validation |
| BR3.12 | Optional sentiment and outcome; no rating anywhere | policy |
| BR3.13 | FR46 checkboxes deferred from release 1 (FD entry (a)) | policy |
| BR4.1 | One transaction for the whole publish | constraint |
| BR4.2 | Persona per mode; anonymous alias per review | calculation |
| BR4.3 | Title: author's or derived, 80 graphemes | calculation |
| BR4.4 | Language detected from script | calculation |
| BR4.5 | Month and year in clear; exact date encrypted | constraint |
| BR4.6 | Evidence never blocks; pending files bound privately | policy |
| BR4.7 | Audit actor is the persona; allowlisted details | policy |
| BR4.8 | `review.published` has exactly four keys | constraint |
| BR4.9 | `repeatEpisode` matching rule | calculation |
| BR4.10 | Initial state, version and dates; no version row | calculation |
| BR5.1 | Transition table of §17, `deleted` in the domain | constraint |
| BR5.2 | Domain state derived from `state` and `deleted_at` | calculation |
| BR5.3 | Author restore only from the author's own deletion | constraint |
| BR6.1 | One pure projection for preview and public page | constraint |
| BR6.2 | `getExperience` answers eligible reviews only | constraint |
| BR6.3 | Public ids and public text only | authorization |
| BR6.4 | Page byline per mode: thread alias, profile username, Former member | authorization |
| BR6.5 | Flags with Not provided, never 0 | calculation |
| BR6.6 | Claims with the Reviewer's label | policy |
| BR6.7 | Original wording; sections in order; empty omitted | calculation |
| BR6.8 | Registration not verified; linked condition tag first | policy |
| BR6.9 | Other accounts by the same persona only; none for anonymous or Former member | authorization |
| BR6.10 | Related and same-doctor cards, newest first, six each | calculation |
| BR6.11 | No evidence groups until T-305; published documents only | calculation |
| BR6.12 | Preview writes nothing; allowed differences listed (alias included) | constraint |
| BR6.13 | No anonymity caveat on the page; composer note reworded (FD entry (b)) | policy |
| BR7.1 | Eligibility in SQL, U14's predicate | constraint |
| BR7.2 | Lists through U14's keyset read, newest first | calculation |
| BR7.3 | `forBranch` lists facility accounts only, none while the feature is off | constraint |
| BR7.4 | U14's distributions reused unchanged | constraint |
| BR7.5 | No `facility_reviews` in doctor queries, SQL-text test | constraint |
| BR7.6 | No scalar score, no score-named export | policy |
| BR8.1 | Facility publish minimum and criteria | validation |
| BR8.2 | Fresh anonymous persona per facility review | calculation |
| BR8.3 | Facility publish: one transaction, audit, no event | policy |
| BR8.4 | Facility publish refused while facility feedback is off | policy |
| BR9.1 | No account-to-review link outside `persona_links` | authorization |
| BR9.2 | `RevealTarget` for reviews and facility reviews | authorization |
| BR9.3 | `byAuthorPersonas` never sees an anonymous persona | authorization |
| BR9.4 | Module boundaries and the T-010 matrix; additive to U14 and U17 files | constraint |
| BR10.1 | Tests per level on own rows | validation |
| BR10.2 | One more smoke assertion, none removed | validation |
| BR10.3 | All checks and CI green; 80% floor | validation |
| BR10.4 | Findings recorded; ISS-269 draft key closed | policy |
| BR10.5 | Stub, migration, foreign-key and fake pins updated with the change | validation |
