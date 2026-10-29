# Business rules — U17 `t-204-provider-submission-claim-field-change`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U17), `stories.md` (US4.2, AC4.1.5, AC4.3.2, AC10.3.3), `requirements.md` (FR13, FR15–FR21, FR23, FR25, NFR8), `components.md` (Directory), `contract-summary.md` (C7, C9, C15), T-204 with its amendments, FD-060, FD-061, FD-067, FD-069, FD-078, FD-079, FD-093, FD-094, the project hard rules (`project.md`) and `01-conventions.md` §2–§5, §10. The workflows, view models and ports are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question was answered A by the agent under the owner's no-questions instruction of 2026-10-29.

```yaml
rules:
  - id: BR1.1
    statement: "A submission moves once from pending to approved, rejected or merged; an approved submission becomes merged only when its created profile is later merged; nothing returns to pending."
    category: state-transition
    applies_to: "domain/directory/submission-state.ts; directory.decideSubmission, directory.mergeProfiles"
    trigger: "Any change of profile_submissions.status"
    logic: "pending -> approved | rejected | merged; approved -> merged (only from mergeProfiles of its created profile); every other transition is refused with conflict"
    violation: "A decided submission decided again, or reopened"
    source: "T-204 step 1, 02-data-model.md §17, Question 1"
  - id: BR1.2
    statement: "A staff decision on a claim, submission or field change that is no longer pending returns conflict and writes nothing."
    category: constraint
    applies_to: "decideSubmission, decideClaim, decideFieldChange"
    trigger: "The row is loaded for update and its status is not pending"
    logic: "IF status <> pending THEN err(conflict), no audit, no event ELSE decide"
    violation: "Two staff decisions on one row, the second overwriting the first"
    source: "C-rules (one transaction), T-204 step 3"
  - id: BR1.3
    statement: "A submission creates its profile at once in pending_review; approve publishes it, reject sets it rejected, merge makes it the merge source."
    category: state-transition
    applies_to: "directory.submitProfile, directory.decideSubmission"
    trigger: "submitProfile; a staff decision"
    logic: "submit: doctor (or facility + one primary branch) state = pending_review, new public_id, created_doctor_id / created_facility_id set; approve: state = published; reject: state = rejected; merge: WF7 with this profile as source"
    violation: "A pending profile visible in any public view (S1, FR15); a merge with no source content"
    source: "FR15, 02-data-model.md §17, components.md Directory, Question 1"
  - id: BR1.4
    statement: "A claim moves pending -> approved | rejected by staff, or pending -> merged when its target is merged away and the claimant already has a pending claim on the target."
    category: state-transition
    applies_to: "domain/directory/claim.ts"
    trigger: "decideClaim; a merge"
    logic: "pending -> approved | rejected (decideClaim); pending -> merged (planMerge only); no other transition"
    violation: "A rejected claim approved later, or a claim reopened"
    source: "T-204 step 1, FD-060"
  - id: BR1.5
    statement: "A field change is stored approved when it is applied at once, pending when it waits for staff, and moves pending -> approved | rejected by staff or pending -> merged when its target is merged away."
    category: state-transition
    applies_to: "domain/directory/field-change.ts"
    trigger: "proposeFieldChange, decideFieldChange, a merge"
    logic: "new row: approved (claimant + unprotected) or pending (protected or staff); pending -> approved | rejected (decideFieldChange); pending -> merged (planMerge)"
    violation: "An immediate change without a history row, or a pending change applied without a decision"
    source: "FR21, FD-061, T-204 step 3"
  - id: BR2.1
    statement: "Submitting and claiming need a signed-in, confirmed, not-restricted account."
    category: authorization
    applies_to: "directory.submitProfile, directory.claimProfile"
    trigger: "defineCommand requires"
    logic: "requires {authenticated, verifiedEmail, notRestricted}; anonymous -> forbidden; unconfirmed -> auth.email_unverified; restricted -> forbidden"
    violation: "An unconfirmed or restricted account adds a profile or gains field-edit rights"
    source: "03 §4, 01-conventions §5, T-204 acceptance 'Authorization'"
  - id: BR2.2
    statement: "Every staff decision and mergeProfiles needs the providers.decide capability; listing needs any staff role."
    category: authorization
    applies_to: "decideSubmission, decideClaim, decideFieldChange, mergeProfiles, listSubmissions, listClaims, listFieldChanges"
    trigger: "defineCommand requires"
    logic: "decisions: requires {authenticated, capability: providers.decide}; lists: requires {authenticated, staffRole: [super_admin, admin, moderator]}; a moderator calling a decision -> forbidden"
    violation: "A moderator approves a profile (fails the 'forbidden' acceptance row)"
    source: "C7, T-103 rules (admin and super_admin hold providers.decide), 03 §1 (/admin/providers moderator read-only), Question 9"
  - id: BR2.3
    statement: "Submissions are limited to 5 per account per day, claims to 5 per account per day, a claimant's field changes to 30 per account per day; staff are not limited."
    category: constraint
    applies_to: "submitProfile, claimProfile, proposeFieldChange"
    trigger: "Before any write, through the RateLimiter port"
    logic: "hit('directory.submit:account:<id>', 5, 86400) / hit('directory.claim:account:<id>', 5, 86400) / hit('directory.change:account:<id>', 30, 86400); not allowed -> rate_limited with retryAfterSec, nothing written"
    violation: "A 6th submission in a day accepted (fails the 'Rate limit' row)"
    source: "03 §4, T-204 step 3, Question 14"
  - id: BR2.4
    statement: "Only the account holding the approved claim on a profile, or any staff member (Super Admin, Admin or Moderator), may propose a field change to it; a staff proposal always pends and only providers.decide decides it."
    category: authorization
    applies_to: "directory.proposeFieldChange (modules/directory/authorization.ts)"
    trigger: "After requires, before load"
    logic: "IF actor.staffRole in [super_admin, admin, moderator] THEN staff proposal (pending, BR5.3, BR5.6) ELSE IF target.claimed_by_account_id = actor.accountId THEN claimant proposal ELSE forbidden"
    violation: "A non-claimant member changes a profile (fails the 'forbidden' acceptance row); a moderator cannot record sourced data (fails FR18, AC4.1.5); a moderator's proposal publishes without an Admin decision"
    source: "03 §4 ('claimant or staff'), FR18, AC4.1.5, T-204 step 3, Question 18"
  - id: BR3.1
    statement: "A submission needs at least one name; a doctor's other fields are optional, a facility needs a type and a city; every text is trimmed, NFC-normalised and length-bounded."
    category: validation
    applies_to: "SubmitProfileInput"
    trigger: "Parse"
    logic: "kind doctor: nameEn? nameBn? (1-120, at least one), bmdc? (1-20), specialty? (1-80), chamber? (1-160), city?, area? (1-80); kind facility: names as above, type in facility_type, city (1-80), area?, address? (1-200); unknown keys -> validation"
    violation: "An empty profile or a facility with no city (facility_branches.city is NOT NULL)"
    source: "T-204 step 2, 02-data-model.md §4"
  - id: BR3.2
    statement: "A name given in one language is stored in both name columns as written; it is a proper name in the writer's wording, never translated."
    category: calculation
    applies_to: "submitProfile; field change 'name'"
    trigger: "Before insert"
    logic: "name_en = nameEn ?? nameBn; name_bn = nameBn ?? nameEn"
    violation: "A NOT NULL failure, or an invented translation of a person's name"
    source: "02-data-model.md §4 (NOT NULL names), T-201 'user-written text shown in its original wording', FD-024"
  - id: BR3.3
    statement: "Doctor keys are computed in application with the domain functions: doctorNameKey strips a leading honorific and normalises like an alias key; bmdcKey keeps only letters and digits in lowercase."
    category: calculation
    applies_to: "submitProfile, decideFieldChange (name, bmdc), the seed"
    trigger: "Before a doctor row is written or its name or BMDC number changes"
    logic: "doctorNameKey(s) = normalizeAliasKey(s without a leading 'dr', 'prof', 'ডা', 'ডাঃ' or 'অধ্যাপক' and its dot); bmdcKey(s) = NFKC lowercase with [^a-z0-9] removed; the seed uses the same functions"
    violation: "P-140's BMDC A-38054 does not match d2 because the stored key kept the hyphen (finding F9)"
    source: "T-201 finding F2, T-204 step 1 duplicateCandidates"
  - id: BR3.4
    statement: "duplicateCandidates compares the BMDC key first, then the name key, against doctors (or branches) that are published or pending and not merged, and prefers a published match."
    category: calculation
    applies_to: "domain/directory/duplicates.ts, submitProfile"
    trigger: "submitProfile"
    logic: "candidates = rows with bmdc_key = key (when given) else rows with name_key = key; order published first, then oldest; duplicate_of_id = first or null; a duplicate is a hint and never refuses the submission"
    violation: "Submitting A-38054 does not yield duplicate_of_id = d2 (fails the 'Duplicate detection' row)"
    source: "T-204 step 1 and acceptance 'Duplicate detection', FR15"
  - id: BR3.5
    statement: "A submitted specialty sets specialty_id only on an exact match with an active canonical specialty; otherwise the text stays in the payload until staff approve, when ensureSpecialtyTerm finds or creates the canonical term."
    category: calculation
    applies_to: "submitProfile, decideSubmission approve, decideFieldChange approve (specialty)"
    trigger: "A specialty text"
    logic: "submit: specialty_id = findSpecialtyByKey(normalizeAliasKey(text)) ?? null; approve: IF specialty_id null AND payload.specialty THEN specialty_id = ensureSpecialtyTerm(tx, {text}).termId and provenance(specialty) = admin"
    violation: "An approved profile shows no specialty although one was submitted, or a provisional specialty appears without a staff check"
    source: "Question 4, finding F3"
  - id: BR4.1
    statement: "A claim records the method and the private evidence note only; no code, job, email or SMS is created, and the profile is unchanged."
    category: policy
    applies_to: "directory.claimProfile"
    trigger: "claimProfile"
    logic: "insert profile_claims (pending, method, evidence_note); no JobQueue, queueEmail or outbox entry other than directory.claimFiled"
    violation: "A code sent to a chamber phone or professional email (fails AC4.2.1 and FD-060)"
    source: "FD-060, AC4.2.1"
  - id: BR4.2
    statement: "An account holds at most one pending claim per profile and cannot claim a profile it already holds."
    category: constraint
    applies_to: "claimProfile; partial unique index profile_claims_open_unique"
    trigger: "claimProfile"
    logic: "IF target.claimed_by_account_id = actor.accountId OR a pending claim (target, actor) exists THEN conflict; the index (target_kind, target_id, claimant_account_id) WHERE status = 'pending' AND claimant_account_id IS NOT NULL settles a race (23505 -> conflict)"
    violation: "Duplicate pending claims from one account"
    source: "T-204 step 3"
  - id: BR4.3
    statement: "Approving a claim sets claimed_by_account_id only when the claimant still exists and the profile is not held by another account; rejecting needs a reason code."
    category: constraint
    applies_to: "directory.decideClaim"
    trigger: "decideClaim"
    logic: "approve: IF claimant_account_id IS NULL OR (target.claimed_by_account_id IS NOT NULL AND <> claimant) THEN conflict ELSE claimed_by_account_id = claimant, status approved; reject: reasonCode required, status rejected, profile unchanged"
    violation: "Two accounts holding one profile, or a claim granted to a deleted account"
    source: "AC4.2.2, FD-060, FD-078"
  - id: BR4.4
    statement: "A claim grants field-change rights on that profile only: it adds no capability to the Actor and no right over any review, comment or report."
    category: authorization
    applies_to: "decideClaim, getActor, every review and community command"
    trigger: "After approval"
    logic: "the only reader of claimed_by_account_id for rights is directory/authorization.ts (BR2.4); Actor.capabilities unchanged; review.* refuse the claimant as any member (tested in U21 T-301)"
    violation: "An approved claimant edits or hides an experience about them (FR22, prototype note on C-58)"
    source: "02-data-model.md §4, FR22, T-204 acceptance 'Claim never controls reviews', finding F20"
  - id: BR4.5
    statement: "A claim targets a visible doctor, or for a facility the organisation of the visible branch whose page id is given; a hidden or pending profile cannot be claimed."
    category: constraint
    applies_to: "claimProfile, getMyClaimState"
    trigger: "Resolve targetId"
    logic: "doctor: published and not merged; facility: the branch is published and its organisation published, target = organisation; else not_found"
    violation: "A claim on an invisible profile"
    source: "FR20, FR25, AC4.3.2, Question 8, finding F18"
  - id: BR5.1
    statement: "A field change names one field of PROFILE_FIELDS for its kind and a value that fieldSpec accepts."
    category: validation
    applies_to: "ProposeFieldChangeInput, domain/directory/field-change.ts"
    trigger: "proposeFieldChange"
    logic: "doctor: name {en?, bn?} (1-120, one at least), bmdc (1-20), qualifications {en?, bn?} (1-200), specialty {termPublicId} | {text} (1-80), languages {en?, bn?} (1-120), fee {en?, bn?} (1-60), bookingContact {en?, bn?} (1-120), chamber {op: add, name, hours?} | {op: update, chamberKey, name?, hours?} | {op: remove, chamberKey}, visibility {field, hidden}; facility: name, organisationName, address {en?, bn?} (1-200), visibility; else validation with fieldErrors.newValue = errors.directory.valueInvalid"
    violation: "A free-form field name or a value that cannot be applied (finding F3)"
    source: "FR17, FR21, T-204 step 2, Question 5, Question 12"
  - id: BR5.2
    statement: "A claimant's change to an unprotected field publishes at once with provider provenance and is kept as an approved history row with the old and new value."
    category: policy
    applies_to: "proposeFieldChange"
    trigger: "Claimant proposal of languages, fee, bookingContact, chamber, address, or visibility of one of them"
    logic: "apply new value; field_provenance[field] = {source: provider, updatedAt: now} (chambers: chamber.provenance = provider); insert row {status: approved, protected: false, provenance: provider, old_value, new_value, decided_at: now}; outbox doctor.changed | facility.changed"
    violation: "Practical details waiting for staff, or published without history (fails AC4.2.3)"
    source: "FR21, FD-061, AC4.2.3"
  - id: BR5.3
    statement: "A change to a protected field, and every staff proposal, waits as pending; the public value does not change until staff approve."
    category: policy
    applies_to: "proposeFieldChange, isProtectedField"
    trigger: "isProtectedField(kind, field) OR the proposer is staff"
    logic: "protected = doctor {name, bmdc, qualifications, specialty} | facility {name, organisationName}, plus visibility of a protected field; insert row {status: pending, protected, provenance: provider (claimant) | admin (staff)}; outbox directory.fieldChangeProposed {changeId, protected}"
    violation: "A claimant changes name, BMDC number, degrees or specialty without approval (fails AC4.2.3, FD-061)"
    source: "FD-061, C7, AC4.2.3"
  - id: BR5.4
    statement: "Approving a pending change applies it with provider provenance when the proposer held the claim, admin otherwise; rejecting keeps the value and needs a reason code."
    category: calculation
    applies_to: "decideFieldChange"
    trigger: "decideFieldChange"
    logic: "approve: applyFieldChange; source = provider IF the row's provenance = provider ELSE admin (staff or a seeded community row); name/bmdc recompute keys (BR3.3); specialty text -> ensureSpecialtyTerm (BR3.5); reject: reasonCode required, value unchanged"
    violation: "Provenance overstated, or a rejected value published"
    source: "T-204 step 3, FR18, finding F11"
  - id: BR5.5
    statement: "A chamber edit names an opaque chamberKey that must belong to the target doctor; a foreign key is a validation error, so ids cannot be probed."
    category: authorization
    applies_to: "proposeFieldChange chamber update/remove, getMyClaimState"
    trigger: "chamber op with chamberKey"
    logic: "update/delete ... WHERE id = chamberKey AND doctor_id = target.id; zero rows -> validation; chamberKey appears only in the claimant's own MyClaimStateVM"
    violation: "A claimant edits another doctor's chamber"
    source: "Question 6, 01-conventions §4"
  - id: BR5.6
    statement: "A staff field proposal records a source (a URL or a description) and the retrieval date; without them the save is refused with a localized message."
    category: validation
    applies_to: "proposeFieldChange by staff"
    trigger: "Staff proposal"
    logic: "IF source.url (https, <= 500) OR source.description (1-300) AND source.retrievedOn (ISO date, not in the future) THEN store source_url, source_description, retrieved_on and proposed_by ELSE validation with fieldErrors.source = errors.directory.sourceRequired"
    violation: "A staff-sourced field without its source (fails AC4.1.5)"
    source: "FR18, AC4.1.5 (handed over by U14 T-201)"
  - id: BR5.7
    statement: "Provenance is patched per field, never replaced whole; a hidden field keeps its value and gains hidden = true in its provenance entry."
    category: calculation
    applies_to: "applyDoctorFields, applyBranchFields, applyFacilityFields"
    trigger: "Any applied change"
    logic: "field_provenance = jsonb_set(field_provenance, '{<field>}', {source, updatedAt, hidden?}); visibility {field, hidden} sets or clears hidden on that entry only; name can never be hidden"
    violation: "One change erasing another field's provenance (FR18), or a hidden field still rendered (AC4.1.3)"
    source: "FR17, FR18, T-201 Question 7, Question 12"
  - id: BR6.1
    statement: "planMerge is pure: it refuses self-merge and kind mismatch, returns an empty plan for a source already merged into the same final target, and otherwise lists the chambers, claims and pending rows that move while the target keeps its field provenance."
    category: calculation
    applies_to: "domain/directory/merge.ts; decideSubmission merge, mergeProfiles"
    trigger: "A merge"
    logic: "source = target -> validation; kinds differ -> validation; source.merged_into = final target -> empty plan (ok, nothing written); plan = {chambersToAppend: source chambers whose name key is not on the target, sort_order after the target's last; claimedBy: source.claimed_by IF target unclaimed; pendingClaims: re-point, or merged when the claimant already has one pending on target; pendingFieldChanges: merged; source: state rejected, merged_into_id = target (doctors)}"
    violation: "A merge that loses chambers or claims, or overwrites the target's provenance (fails AC4.2.5)"
    source: "FR23, AC4.2.5, T-204 step 1 planMerge"
  - id: BR6.2
    statement: "The merge target is chased to its final profile, at most five hops, and must be published."
    category: constraint
    applies_to: "chaseTarget"
    trigger: "A merge"
    logic: "follow doctors.merged_into_id (or profile_redirects for branches) <= 5 hops; cycle, cap reached or final target not published -> conflict"
    violation: "A merge into a merged or rejected profile"
    source: "T-204 'Tests to write' planMerge, T-201 BR1.7"
  - id: BR6.3
    statement: "A merge writes one redirect from the source's public id to the target's and re-points every redirect that pointed at the source, so redirects never point at a rejected profile and no chain is longer than one hop."
    category: constraint
    applies_to: "insertRedirect, repointRedirects"
    trigger: "A merge commits"
    logic: "insert (source.public_id -> target.public_id, merge_id); UPDATE profile_redirects SET to_public_id = target WHERE to_public_id = source.public_id; the target was checked published in the same transaction"
    violation: "GET of an old id lands on a rejected profile (hard-rule checklist)"
    source: "FR23, NFR8, T-204 hard-rule checklist"
  - id: BR6.4
    statement: "A merge is refused when the source is hidden by moderation or rejected, when it was merged elsewhere, or when both profiles are held by different claimants."
    category: constraint
    applies_to: "planMerge"
    trigger: "A merge"
    logic: "source.state NOT IN (published, pending_review) -> conflict; source.merged_into_id points elsewhere -> conflict; source.claimed_by AND target.claimed_by AND they differ -> conflict"
    violation: "A merge that hands one doctor's profile to another claimant"
    source: "FR23, Question 2"
  - id: BR6.5
    statement: "Reviews and drafts move only through Review's ProfileMergeParticipant on the merge transaction; Directory imports nothing from modules/review and writes no review table."
    category: constraint
    applies_to: "merge, approve; modules/review/profile-merge-participant.ts"
    trigger: "A merge or an approval"
    logic: "transfer(tx, {kind, sourceId, targetId}) -> {reviews, drafts}; unblockDrafts(tx, {submissionId, resolvedDoctorId?}) -> {unblocked}; profile_merges.transferred uses the returned counts"
    violation: "Directory writing review rows (fails the FD-067/C7 acceptance row)"
    source: "FD-067, C7, T-204 amendment"
  - id: BR6.6
    statement: "Every change of a merge commits together or not at all."
    category: constraint
    applies_to: "decideSubmission merge, mergeProfiles"
    trigger: "Any failure inside the merge"
    logic: "one UnitOfWork transaction for the plan, the participant, profile_merges, redirects, audit and outbox; a failure rolls everything back"
    violation: "Chambers copied but reviews not moved (fails 'merge transaction atomicity')"
    source: "T-204 'Tests to write' database"
  - id: BR7.1
    statement: "Each command appends its named events in its transaction: filings carry ids only; decisions carry the recipient, the decision, and enum codes and counts only."
    category: constraint
    applies_to: "every directory command"
    trigger: "The command persists"
    logic: "directory.submissionFiled {submissionId}; directory.claimFiled {claimId}; directory.fieldChangeProposed {changeId, protected}; directory.submissionDecided {submissionId, decision, recipientAccountId?, reasonCode?, draftsUnblocked}; directory.claimDecided {claimId, decision, recipientAccountId?, reasonCode?}; directory.fieldChangeDecided {changeId, decision, recipientAccountId?, fieldKey, reasonCode?}; doctor.changed | facility.changed {id} whenever public data or the claimed flag changes"
    violation: "A missing or late event (fails the 'events' row); content in a payload"
    source: "C15, FD-065, T-204 amendment C7/C15"
  - id: BR7.2
    statement: "The recipient of a decision notice is the submitter, the claimant, or the claimant who proposed the change; it is omitted when that account was de-identified, and staff proposers get no notice."
    category: calculation
    applies_to: "decision events"
    trigger: "A decision"
    logic: "recipientAccountId = submitted_by | claimant | (proposed_by IF the row's provenance = provider); absent when NULL; the account id never appears in a view model or log"
    violation: "A notice to nobody, or to a staff member about their own proposal"
    source: "C15, FD-078, FD-086 (no ids beyond the payload)"
  - id: BR7.3
    statement: "A rejection carries a reason code from PROFILE_REJECT_REASONS, which the notice shows; the staff's free-text note is private to the row and never enters an event, a notice, a log or an audit detail."
    category: policy
    applies_to: "decideSubmission, decideClaim, decideFieldChange"
    trigger: "decision = reject"
    logic: "reasonCode required (duplicate, notEnoughEvidence, couldNotConfirm, incorrectDetails, notAllowed, other); note <= 500 stored in decision_reason / reviewer_note / reason; T-405 renders directory.rejectReason.<code>"
    violation: "Staff text in notification params (02 §12, C15; finding F6)"
    source: "AC4.2.2, 02-data-model.md §12, Question 7"
  - id: BR7.4
    statement: "Every command and the de-identify operation write exactly one audit row in module directory with allowlisted details: ids, enums, counts and booleans, never payload, method, evidence, note or field values."
    category: constraint
    applies_to: "audit builders profile_submitted, submission_decided, claim_filed, claim_decided, field_change_proposed, field_change_decided, profiles_merged, account_deidentified"
    trigger: "Each persist"
    logic: "AuditWriter.write(tx, {module: directory, action, actor, details}); details pass T-101's recursive allowlist (ISS-108)"
    violation: "Free text in audit details (fails the 'Audit' row)"
    source: "T-204 acceptance 'Audit', T-101 BR8.2, FD-065"
  - id: BR8.1
    statement: "deidentifyAccount removes the account link from that account's submissions, claims and field changes, clears its claims' method and evidence note, and ends every claim it held; every row keeps its status, decision, reason, values and the profiles' provenance."
    category: policy
    applies_to: "modules/directory/internal/deidentify-account.ts"
    trigger: "U39 T-410's deletion step, after its hold check"
    logic: "UPDATE submissions SET submitted_by = NULL; claims SET claimant = NULL, method = NULL, evidence_note = NULL; field_changes SET proposed_by = NULL; doctors and facilities SET claimed_by = NULL WHERE = accountId; outbox *.changed per ended claim; one audit row {submissions, claims, fieldChanges, claimsEnded}; return the counts"
    violation: "A row deleted, another account touched, or the claimant's contact text kept (fails the FD-069 and FD-078 rows)"
    source: "FD-069, FD-078, AC10.3.3, Question 11"
  - id: BR8.2
    statement: "deidentifyAccount is idempotent: a second run changes no row and returns zeros, and still writes its one audit row."
    category: constraint
    applies_to: "deidentifyAccount"
    trigger: "A repeated call"
    logic: "every UPDATE filters on = accountId, so a second run matches nothing"
    violation: "A second run changing rows (fails 'de-identify is idempotent')"
    source: "T-204 acceptance FD-069"
  - id: BR8.3
    statement: "Staff views show a de-identified submitter, claimant or proposer as Deleted account, never blank and never an id."
    category: policy
    applies_to: "SubmissionRowVM, ClaimRowVM, FieldChangeRowVM"
    trigger: "The account column is NULL"
    logic: "submittedBy / claimant / proposer = deletedAccount; T-407 renders the label"
    violation: "A blank actor in the staff console (FD-078)"
    source: "FD-078"
  - id: BR9.1
    statement: "Every profile this Unit creates, approves or merges still renders Registration not verified, and a claim never sets a verified flag."
    category: policy
    applies_to: "approve, merge, decideClaim"
    trigger: "Any profile write"
    logic: "no column or field means verified; DoctorProfileVM.registrationNotVerified stays true (T-201)"
    violation: "A claim read as registration verification (hard rule, AC4.2.1, AC4.2.2)"
    source: "D-003, FR16, project.md Mandated"
  - id: BR9.2
    statement: "A pending, rejected or merged profile never appears in a public view model, list, count or search document."
    category: constraint
    applies_to: "every public read (T-201 BR1.1/BR1.2; U18 T-205)"
    trigger: "Any public read"
    logic: "public reads filter state = published and merged_into_id IS NULL; this Unit adds no public read"
    violation: "A community submission public before the staff check (FR15, S1)"
    source: "FR15, Question 1"
  - id: BR9.3
    statement: "The claim's method and evidence note appear only in the staff-only ClaimRowVM, never in a public, claimant or member view model, a log, an event or an audit row."
    category: policy
    applies_to: "listClaims, every other read"
    trigger: "Any read of profile_claims"
    logic: "only listClaims selects method and evidence_note; MyClaimStateVM carries the state only"
    violation: "Private evidence in a public VM (fails AC4.2.1 and the hard-rule checklist)"
    source: "AC4.2.1, 02-data-model.md §4"
  - id: BR9.4
    statement: "No view model carries an account id, email or username of a submitter, claimant or proposer; staff see member, claimant, staff or deletedAccount."
    category: policy
    applies_to: "SubmissionRowVM, ClaimRowVM, FieldChangeRowVM, MyClaimStateVM"
    trigger: "Mapping"
    logic: "map the account column to a role label only"
    violation: "Account linkage in a view model (03 §2)"
    source: "03-routes-and-contracts.md §2, contract-summary privacy rules"
  - id: BR9.5
    statement: "Every new string exists in en and bn under the same key, numerals follow the active language, and no notice copy contains staff free text."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json, AddDoctorPanel, ClaimSheet"
    trigger: "Code Generation"
    logic: "keys of functional-spec.md § 12 added to both files in one commit; pnpm i18n:check green; Bengali flagged for the owner's review (FD-042)"
    violation: "A key without its Bengali string (build failure, project.md Mandated)"
    source: "ADR 0011, FD-024, project.md Mandated"
  - id: BR10.1
    statement: "Domain code imports nothing; application imports only domain and contracts; database imports only application ports and contracts; keys and plans are computed in application."
    category: constraint
    applies_to: "every file in the owned paths"
    trigger: "pnpm lint:boundaries"
    logic: "domain/directory/* pure; commands compute doctorNameKey, bmdcKey, planMerge and pass results to repository methods; no zod import in application"
    violation: "lint:boundaries red (FD-093)"
    source: "01-conventions §2 as built by T-010, FD-093"
  - id: BR10.2
    statement: "Adapters and the Review participant are built only in apps/web/src/server/container.ts; components import only server actions; server actions are parse -> getActor -> command -> Result."
    category: constraint
    applies_to: "container.ts, server/actions/directory.ts, AddDoctorPanel, ClaimSheet"
    trigger: "pnpm lint:boundaries"
    logic: "components import @/server/actions/directory and nothing else under server/; no rendering in actions; authorization is in the commands"
    violation: "A component importing the container or the database"
    source: "FD-093 (1), T-204 step 5"
  - id: BR10.3
    statement: "Directory's application code never imports modules/review; a static import test proves it."
    category: constraint
    applies_to: "modules/directory/**"
    trigger: "Test run"
    logic: "scan modules/directory for imports of modules/review; the lint does not check edges inside application"
    violation: "A cycle Directory -> Review (FD-067)"
    source: "FD-067, T-204 acceptance FD-067/C7"
  - id: BR10.4
    statement: "Contract field names are kept and their values are public ids: targetId, sourceId, mergeIntoId and submissionId are 10-character public ids; claimId and changeId are internal ids carried only in staff view models."
    category: validation
    applies_to: "contracts/schemas/directory.ts"
    trigger: "Parse"
    logic: "PUBLIC_ID_RE for public ids; isId for claimId and changeId"
    violation: "A UUID in a patient-facing input or URL (01-conventions §4)"
    source: "contract-summary.md (contract names win), 01-conventions §4, Question 16"
  - id: BR11.1
    statement: "Each level of tests in functional-spec.md § 11 exists and can fail; names read as sentences; builders, not hand-written fixtures."
    category: constraint
    applies_to: "the Unit's tests"
    trigger: "Code Generation, Build and Test"
    logic: "domain, application (fakes), database (*.int.test.ts), seed, component (en and bn), smoke"
    violation: "A missing level or an always-passing test"
    source: "01-conventions §10, team.md Testing Posture"
  - id: BR11.2
    statement: "The Unit adds at least one smoke assertion and keeps the cumulative smoke suite whole."
    category: constraint
    applies_to: "directory.smoke.test.ts"
    trigger: "pnpm smoke"
    logic: "submit -> approve -> published with registrationNotVerified; AddDoctorPanel renders in en and bn"
    violation: "No smoke assertion for the Unit"
    source: "team.md Testing Posture"
  - id: BR11.3
    statement: "pnpm check, pnpm smoke and CI are green on the Bolt branch and on main after the squash merge, with every package at or above 80% line coverage."
    category: constraint
    applies_to: "the Unit"
    trigger: "Merge"
    logic: "eleven-step pnpm check (with T-011's two), untested files counted; no threshold lowered"
    violation: "A red gate or a lowered floor (D10)"
    source: "team.md Way of Working, D10, T-010"
  - id: BR11.4
    statement: "The pins this Unit changes are updated in the same commit: not-implemented.test.ts loses PgDirectoryRepository from STUB_REPOSITORIES, both migration-count pins rise by one, and the test-support fakes stay a superset of the repositories."
    category: constraint
    applies_to: "not-implemented.test.ts, validator-probes.int.test.ts P8, migrations.int.test.ts, fakes/repositories.ts"
    trigger: "Code Generation"
    logic: "update each pin with the change it pins; the trace test keeps a class that stays a stub"
    violation: "pnpm check red on the Bolt branch (ISS-294)"
    source: "ISS-294, T-010"
  - id: BR11.5
    statement: "Every defect, workaround or assumption found becomes an ISS row linked to U17; the Build and Test record lists them."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Any finding"
    logic: "rows of functional-spec.md § 9 added; ISS-110 fixed in U17 T-204; ISS-265 updated"
    violation: "An unrecorded workaround (project.md Mandated)"
    source: "project.md Mandated, team.md Way of Working"
  - id: BR11.6
    statement: "The seed computes doctor keys with the domain functions, gives every pending submission its pending profile and public id, and stores field changes with canonical field keys and values that fieldSpec accepts."
    category: constraint
    applies_to: "packages/test-support/src/seed/seed-directory.ts, seed.int.test.ts"
    trigger: "pnpm db:seed"
    logic: "F-77 specialty {text}, F-78 and F-81 chamber {op: update, chamberKey: the doctor's first chamber, hours}, F-79 fee, F-80 qualifications, F-82 languages, F-83 name, F-84 specialty {text}; P-140 duplicate_of_id = d2 through bmdcKey; rows written only when new (ISS-179)"
    violation: "Storyboard step 23 cannot decide a field change or merge P-140 (findings F1, F3, F9)"
    source: "FD-039, findings F1, F3, F9, Question 1"
  - id: BR11.7
    statement: "Under parallel construction, this Unit is never built in the same batch as U15 T-202 or U21 T-301: the dependency file gains t-202 -> t-204 and t-204 -> t-301."
    category: constraint
    applies_to: "unit-of-work-dependency.md, the swarm batch plan"
    trigger: "Before the swarm plans Bolt batches"
    logic: "U17 depends on U15 (ClaimSheet.tsx); U21 depends on U17 (repositories/review.ts, review fakes, migration numbering and pins)"
    violation: "Two worktrees editing the same files and migration number (finding F13)"
    source: "FD-094, Question 17"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Submission: pending -> approved, rejected or merged, once | state-transition |
| BR1.2 | Deciding a non-pending row returns conflict | constraint |
| BR1.3 | A submission creates its pending profile; approve publishes, reject rejects | state-transition |
| BR1.4 | Claim states | state-transition |
| BR1.5 | Field-change states | state-transition |
| BR2.1 | Submit and claim: signed in, confirmed, not restricted | authorization |
| BR2.2 | Decisions need providers.decide; lists any staff role | authorization |
| BR2.3 | Rates: 5 submissions, 5 claims, 30 changes per day | constraint |
| BR2.4 | Only the claimant or any staff member proposes; staff proposals pend | authorization |
| BR3.1 | Submission payload validation | validation |
| BR3.2 | One name fills both name columns as written | calculation |
| BR3.3 | Doctor name and BMDC keys from the domain functions | calculation |
| BR3.4 | Duplicate candidates: BMDC first, then name | calculation |
| BR3.5 | Specialty text resolved, or made a term on approval | calculation |
| BR4.1 | A claim sends no code, job or email | policy |
| BR4.2 | One pending claim per account and profile | constraint |
| BR4.3 | Approve only for an existing claimant on an unheld profile | constraint |
| BR4.4 | A claim grants no review control and no capability | authorization |
| BR4.5 | Claim targets a visible doctor or a branch's organisation | constraint |
| BR5.1 | Field keys and value shapes | validation |
| BR5.2 | Claimant's unprotected change publishes with history | policy |
| BR5.3 | Protected and staff changes pend | policy |
| BR5.4 | Approval provenance: provider or admin | calculation |
| BR5.5 | chamberKey belongs to the target doctor | authorization |
| BR5.6 | Staff proposals need a source | validation |
| BR5.7 | Provenance patched per field; hidden flag | calculation |
| BR6.1 | planMerge rules | calculation |
| BR6.2 | Target chased, five hops, published | constraint |
| BR6.3 | One redirect, older ones re-pointed | constraint |
| BR6.4 | Refused merges | constraint |
| BR6.5 | Reviews and drafts move through the port only | constraint |
| BR6.6 | Merge is atomic | constraint |
| BR7.1 | Named events in the transaction | constraint |
| BR7.2 | Decision recipients | calculation |
| BR7.3 | Reason codes in notices, notes private | policy |
| BR7.4 | One allowlisted audit row per command | constraint |
| BR8.1 | De-identify: links and claim text cleared, rows kept, claims ended | policy |
| BR8.2 | De-identify is idempotent | constraint |
| BR8.3 | Deleted account label | policy |
| BR9.1 | Registration not verified always | policy |
| BR9.2 | Pending, rejected, merged profiles never public | constraint |
| BR9.3 | Evidence note staff-only | policy |
| BR9.4 | No account linkage in view models | policy |
| BR9.5 | en and bn keys together | policy |
| BR10.1 | Placement under the T-010 matrix | constraint |
| BR10.2 | Container, actions, components | constraint |
| BR10.3 | Directory never imports modules/review | constraint |
| BR10.4 | Contract names, public-id values | validation |
| BR11.1 | Test levels | constraint |
| BR11.2 | Smoke assertion | constraint |
| BR11.3 | Gate and coverage | constraint |
| BR11.4 | Pins updated in the same commit | constraint |
| BR11.5 | ISS rows | constraint |
| BR11.6 | Seed corrections | constraint |
| BR11.7 | Dependency edges for the swarm | constraint |
