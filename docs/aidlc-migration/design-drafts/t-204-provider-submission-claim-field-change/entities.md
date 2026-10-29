# Entities — U17 `t-204-provider-submission-claim-field-change`

The data shape this Unit reads and writes. Workflows are in `functional-spec.md`; rules in `rules.md`. Tables are owned by Directory (`components.md`) unless stated. Columns marked **new** or **changed** come from the one forward-only migration `<n>_directory_provider_writes.sql` (§ 7); everything else exists on `main` at `9cf860a` (after T-201's migration).

## 1. Directory tables written

```yaml
entities:
  - name: ProfileSubmission
    table: profile_submissions
    owner: Directory
    attributes:
      - { name: id, type: uuid, required: true, constraints: "UUIDv7, app-side" }
      - { name: public_id, type: text, required: true, constraints: "new; 10-char public id, unique; backfilled for existing rows; T-301's doctorSubmissionPublicId (Question 16)" }
      - { name: kind, type: "enum doctor | facility", required: true }
      - { name: payload, type: jsonb, required: true, constraints: "the submitted fields as typed (SubmitProfileInput.payload); the doctor's or facility's data, never the submitter's" }
      - { name: submitted_by_account_id, type: uuid, required: false, references: AccountProfile.id, constraints: "changed: nullable (FD-078); NULL after de-identification" }
      - { name: status, type: submission_status, required: true, constraints: "changed: enum instead of text (ISS-110); BR1.1" }
      - { name: duplicate_of_id, type: uuid, required: false, constraints: "doctor or branch id of the same kind; a hint (BR3.4)" }
      - { name: reviewer_note, type: text, required: false, constraints: "seeded triage note or the staff's private decision note" }
      - { name: decision_reason, type: text, required: false, constraints: "new; a PROFILE_REJECT_REASONS code on reject" }
      - { name: decided_by, type: uuid, required: false, references: AccountProfile.id }
      - { name: decided_at, type: timestamptz, required: false }
      - { name: created_doctor_id, type: uuid, required: false, references: Doctor.id, constraints: "set at submission (Question 1)" }
      - { name: created_facility_id, type: uuid, required: false, references: Facility.id, constraints: "set at submission" }
      - { name: created_at, type: timestamptz, required: true }

  - name: ProfileClaim
    table: profile_claims
    owner: Directory
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: target_kind, type: "enum doctor | facility", required: true, constraints: "facility = the organisation (Question 8)" }
      - { name: target_id, type: uuid, required: true }
      - { name: claimant_account_id, type: uuid, required: false, references: AccountProfile.id, constraints: "changed: nullable (FD-078)" }
      - { name: method, type: text, required: false, constraints: "changed: nullable; 1-200 at filing; NULL after de-identification (Question 11)" }
      - { name: evidence_note, type: text, required: false, constraints: "0-2000; private, staff-only (BR9.3); NULL after de-identification" }
      - { name: status, type: submission_status, required: true, constraints: "changed: enum (ISS-110); pending, approved, rejected, merged (BR1.4)" }
      - { name: decision_reason, type: text, required: false, constraints: "new; reason code on reject" }
      - { name: decision_note, type: text, required: false, constraints: "new; private staff note, <= 500" }
      - { name: decided_by, type: uuid, required: false }
      - { name: decided_at, type: timestamptz, required: false }
      - { name: created_at, type: timestamptz, required: true }
    indexes:
      - "new: profile_claims_open_unique UNIQUE (target_kind, target_id, claimant_account_id) WHERE status = 'pending' AND claimant_account_id IS NOT NULL (BR4.2)"

  - name: ProfileFieldChange
    table: profile_field_changes
    owner: Directory
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: target_kind, type: "enum doctor | facility", required: true, constraints: "facility = the branch for name, address and visibility; the organisation for organisationName" }
      - { name: target_id, type: uuid, required: true }
      - { name: field, type: text, required: true, constraints: "a PROFILE_FIELDS key (BR5.1); the seed's labels become keys (BR11.6)" }
      - { name: old_value, type: jsonb, required: false, constraints: "the value when proposed" }
      - { name: new_value, type: jsonb, required: true, constraints: "the fieldSpec shape" }
      - { name: proposed_by_account_id, type: uuid, required: false, constraints: "changed: nullable (FD-078)" }
      - { name: provenance, type: provenance, required: true, constraints: "provider (claimant), admin (staff), community (seed only); BR5.4" }
      - { name: protected, type: boolean, required: true }
      - { name: status, type: submission_status, required: true, constraints: "changed: enum (ISS-110)" }
      - { name: reason, type: text, required: false, constraints: "reason code on reject" }
      - { name: decision_note, type: text, required: false, constraints: "new; private staff note" }
      - { name: source_url, type: text, required: false, constraints: "new; https, <= 500; staff proposals (BR5.6)" }
      - { name: source_description, type: text, required: false, constraints: "new; 1-300" }
      - { name: retrieved_on, type: date, required: false, constraints: "new; required with a staff source; check: url or description present when retrieved_on is set" }
      - { name: decided_by, type: uuid, required: false }
      - { name: decided_at, type: timestamptz, required: false }
      - { name: created_at, type: timestamptz, required: true }

  - name: ProfileMerge
    table: profile_merges
    owner: Directory
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: kind, type: "enum doctor | facility", required: true, constraints: "facility merges are branch into branch" }
      - { name: source_id, type: uuid, required: true }
      - { name: target_id, type: uuid, required: true }
      - { name: actor, type: text, required: true, constraints: "staff:<accountId>, the audit convention" }
      - { name: reason, type: text, required: true, constraints: "staff note 1-500, or the submission decision for the submission merge" }
      - { name: transferred, type: jsonb, required: true, constraints: "{reviews, drafts, chambers, claims, fieldChangesClosed}: counts only" }
      - { name: created_at, type: timestamptz, required: true }

  - name: ProfileRedirect
    table: profile_redirects
    owner: Directory
    attributes:
      - { name: from_public_id, type: text, required: true, constraints: "primary key" }
      - { name: to_kind, type: "enum doctor | facility", required: true }
      - { name: to_public_id, type: text, required: true, constraints: "new index profile_redirects_to_idx for re-pointing (BR6.3)" }
      - { name: merge_id, type: uuid, required: false, references: ProfileMerge.id }
      - { name: created_at, type: timestamptz, required: true }
```

## 2. Directory profile columns this Unit writes

| Table | Columns written | When |
|---|---|---|
| `doctors` | the whole row in `pending_review` (names, keys, specialty, BMDC, city, area, provenance, `avatar_hue` from `stableHue(publicId)`, `public_id`); `state`; `claimed_by_account_id`; `merged_into_id`; the fields of `PROFILE_FIELDS`; `name_key`, `bmdc_key`; `field_provenance` per key; **new** `booking_contact_en`, `booking_contact_bn` (`text`, both or neither, ≤ 120) | WF2, WF3, WF5–WF8 |
| `doctor_chambers` | insert (submission, claimant add, merge append), update name/hours, delete (claimant remove), `provenance` | WF2, WF6, WF7 |
| `facilities` | the pending row, `state`, `claimed_by_account_id`, `name_*` (organisationName) | WF2, WF3, WF5, WF6, WF8 |
| `facility_branches` | the pending primary branch, `state`, `name_*`, `address_*`, `field_provenance` | WF2, WF3, WF6, WF7 |

`field_provenance` entry shape stays `{source, updatedAt}` with an optional `hidden: true` (T-201 Question 7); keys: `name`, `bmdc`, `qualifications`, `specialty`, `languages`, `fee`, `bookingContact`, `address`, `organisationName`. No account id is ever written into it.

## 3. Contracts (`packages/contracts`)

```yaml
enums:
  PROFILE_REJECT_REASONS: [duplicate, notEnoughEvidence, couldNotConfirm, incorrectDetails, notAllowed, other]
  PROFILE_FIELDS:
    doctor: [name, bmdc, qualifications, specialty, languages, fee, bookingContact, chamber, visibility]
    facility: [name, organisationName, address, visibility]
  PROTECTED_FIELDS:
    doctor: [name, bmdc, qualifications, specialty]
    facility: [name, organisationName]
inputs:
  - name: SubmitProfileInput
    shape: "{kind: doctor, payload: {nameEn?, nameBn?, bmdc?, specialty?, chamber?, city?, area?}} | {kind: facility, payload: {nameEn?, nameBn?, type, city, area?, address?}}"
    returns: "{submissionPublicId}"
  - name: DecideSubmissionInput
    shape: "{submissionId: publicId, decision: approve | reject | merge, mergeIntoId?: publicId, reasonCode?: PROFILE_REJECT_REASONS, note?: <=500}"
    refine: "merge needs mergeIntoId; reject needs reasonCode"
  - name: MergeProfilesInput
    shape: "{kind: doctor | facility, sourceId: publicId, targetId: publicId, reason: 1-500}"
    returns: "{merged: boolean, mergeId?}"
  - name: ClaimProfileInput
    shape: "{targetKind, targetId: publicId, method: 1-200, evidenceNote?: <=2000}"
    returns: "{claimId}"
  - name: DecideClaimInput
    shape: "{claimId: id, decision: approve | reject, reasonCode?, note?}"
  - name: ProposeFieldChangeInput
    shape: "{targetKind, targetId: publicId, field: PROFILE_FIELDS, newValue: fieldSpec(kind, field), source?: {url?, description?, retrievedOn}}"
    returns: "{changeId, applied: boolean}"
  - name: DecideFieldChangeInput
    shape: "{changeId: id, decision: approve | reject, reasonCode?, note?}"
  - name: GetMyClaimStateInput
    shape: "{targetKind, targetId: publicId}"
  - name: "ListSubmissionsInput | ListClaimsInput | ListFieldChangesInput"
    shape: "unchanged: {status?, page?, pageSize?}"
view_models:
  - SubmissionRowVM
  - ClaimRowVM
  - FieldChangeRowVM
  - MyClaimStateVM (with ClaimantEditorVM)
  - "DoctorProfileVM.facts key list gains bookingContact (T-201's VM)"
```

Field lists of the view models are in `functional-spec.md` § 6. `ErrorCode` gains nothing: the commands use `validation` (with `errors.directory.*` field keys), `forbidden`, `not_found`, `conflict`, `rate_limited`, `auth.email_unverified`, `internal`.

## 4. Review tables reached through the port (owned by Review)

| Table | Columns | Method (implemented in `modules/review/profile-merge-participant.ts`) |
|---|---|---|
| `reviews` | `doctor_id`, `branch_id` | `repointDoctor`, `repointBranch` |
| `facility_reviews` | `branch_id` | `repointBranch` |
| `review_drafts` | `doctor_id`, `blocked_on_submission_id` | `repointDraftDoctor`, `unblockDraftsFor` |

Directory never names these tables (BR6.5).

## 5. Taxonomy rows reached through the operation (owned by Taxonomy)

`taxonomy_terms` of kind `specialty`: read by name key; inserted by `ensureSpecialtyTerm` as a canonical, non-provisional, `published` term with `name_en`, `name_bn`, both name keys, `created_by_account_id` left `NULL` (T-201 F12); outbox `term.changed`.

## 6. Events, audit and notices

| Name | Payload | Jobs (C15, routed by U34 T-405) |
|---|---|---|
| `directory.submissionFiled` | `{submissionId}` | `notification.deliver` → staff `newProfile` |
| `directory.claimFiled` | `{claimId}` | → staff `claim` |
| `directory.fieldChangeProposed` | `{changeId, protected}` | → staff `protectedChange` (when protected or staff-proposed) |
| `directory.submissionDecided` | `{submissionId, decision, recipientAccountId?, reasonCode?, draftsUnblocked}` | → `notif.draft.profileReady` (drafts > 0), `notif.submission.approved`, `notif.submission.merged`, `notif.draft.profileRejected` |
| `directory.claimDecided` | `{claimId, decision, recipientAccountId?, reasonCode?}` | → `notif.claim.approved` / `notif.claim.rejected` |
| `directory.fieldChangeDecided` | `{changeId, decision, recipientAccountId?, fieldKey, reasonCode?}` | → `notif.fieldChange.approved` / `rejected` |
| `doctor.changed`, `facility.changed`, `term.changed` | `{id}` | `search.refresh` (U18) |

The `id` fields are internal ids; payloads carry no content (C15). Audit actions in module `directory`: `profile_submitted`, `submission_decided`, `claim_filed`, `claim_decided`, `field_change_proposed`, `field_change_decided`, `profiles_merged`, `account_deidentified` (details per BR7.4).

## 7. Migration `<n>_directory_provider_writes.sql` (forward-only)

1. Guard: stop with a clear error if any of the three `status` columns holds a value outside `submission_status`.
2. `ALTER … status TYPE submission_status USING status::submission_status` on the three tables (ISS-110).
3. `DROP NOT NULL` on `submitted_by_account_id`, `claimant_account_id`, `proposed_by_account_id` (FD-078) and on `profile_claims.method` (Question 11).
4. `profile_submissions`: `public_id text`, backfilled with a deterministic 10-character Crockford base32 value derived from `id` (SQL over `sha256(id::text)` bytes), then `NOT NULL` and `UNIQUE`; `decision_reason text`.
5. `profile_claims`: `decision_reason text`, `decision_note text`; the partial unique index of § 1.
6. `profile_field_changes`: `decision_note`, `source_url`, `source_description`, `retrieved_on date`, and the check of § 1.
7. `doctors`: `booking_contact_en text`, `booking_contact_bn text`, check both or neither.
8. `profile_redirects_to_idx` on `to_public_id`.

`rk_worker` keeps its table-level SELECT on `doctors`, which covers the new columns (live, not ratified, FD-092); no grant changes. Both migration-count pins rise by one (BR11.4).

## 8. Seed shapes (`seed-directory.ts`, BR11.6)

| Corpus | Becomes |
|---|---|
| `PROVIDER_SUBMISSIONS` (8) | each: a `pending_review` doctor (names, specialty through `findSpecialtyByKey`, city, BMDC, community provenance, keys from `doctorNameKey`/`bmdcKey`) + its submission row with a public id; P-140 `duplicate_of_id` = d2 |
| `PROVIDER_CLAIMS` (6) | unchanged: pending, by `shirin_88` (ISS-265) |
| `PROVIDER_FIELD_CHANGES` (8) | `field` from the label map (Specialty → `specialty`, Chamber hours → `chamber`, Consultation fee → `fee`, Qualifications → `qualifications`, Consultation languages → `languages`, Name → `name`); values as `fieldSpec` shapes; `provenance community`, `protected` from `isProtectedField` |
| doctors d1–d11 | `name_key`, `bmdc_key` recomputed with the domain functions |
