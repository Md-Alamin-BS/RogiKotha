# Entities — U22 `t-302-review-changes-and-tombstones`

Source of truth for the data shape this Unit writes and reads. Built from T-302, `02-data-model.md` §6, §8, §10, §16 and §17, `components.md` (Review), `contract-summary.md` (C9, C15), the schema on `main` (`packages/database/src/schema/review.ts`, `schema/community.ts`, migration `0003_triggers.sql`), the U21 T-301 design draft and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds **no table, no column and no migration**. It writes columns that exist and are unused until now (`hidden_at`, `hidden_reason_code`, `deleted_at`, `restore_until`, `version`, `latest_status`, the `review_versions` and `review_follow_ups` tables), and changes one schema comment (`review_versions.actor_id`, Question 7). Entities owned by another component are listed because this Unit's commands cross them; the owner is named on each.

```yaml
entities:
  - name: Review
    owner: Review
    description: "A published account of care; columns this Unit writes or newly reads (the rest are U21's)"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "primary key; internal ids are used by setStateOn, redactOn" }
      - { name: public_id, type: text, required: true, constraints: "author commands and pages address a review by it (BR1.3)" }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "owner check through identity.ownsAnyPersona (BR1.2)" }
      - { name: title, type: text, required: true, constraints: "editable, non-material (BR4.3); redactable" }
      - { name: body, type: text, required: false, constraints: "editable, material; redactable" }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false, constraints: "editable, material; each key redactable" }
      - { name: claims, type: "list<{label: wrongDx|wrongRx|secondOpinion}>", required: true, constraints: "editable, material (codes only, U21)" }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative], constraints: "editable, material; null renders Not provided" }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain], constraints: "editable, material" }
      - { name: language, type: enum, required: true, allowed_values: [en, bn, mixed], constraints: "recomputed after every edit and redaction (BR4.8)" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected], constraints: "never a 'deleted' value (FD-049); deleted_tombstone on a delete with discussion or a moderator removal" }
      - { name: hidden_at, type: timestamp, required: false, constraints: "set by autoHide and hide, cleared by restore; when set at deletion the author cannot restore (BR6.1)" }
      - { name: hidden_reason_code, type: text, required: false, constraints: "a reason code from the moderation caller, never prose (BR8.3)" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "set by author delete and moderator remove; cleared by restore" }
      - { name: restore_until, type: timestamp, required: false, constraints: "deleted_at + 30 days for an author delete; null for a moderator removal (BR5.2, BR8.3)" }
      - { name: version, type: integer, required: true, default: 1, constraints: "+1 on every accepted correct and every redaction; never on a follow-up" }
      - { name: latest_status, type: text, required: false, constraints: "cache: body of the current follow-up (BR3.2)" }
      - { name: updated_at, type: timestamp, required: false, constraints: "set by content writes in the web tier only (ISS-237: the worker cannot write it)" }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL (U14 BR1.3), in SQL in every published-only read"
      - "Domain state 'deleted' = deleted_at set AND stored state in {published, hidden_pending_review, hidden} (BR11.1)"
    relationships:
      - { to: ReviewVersion, cardinality: "one-to-many", direction: "Review keeps ReviewVersion" }
      - { to: ReviewFollowUp, cardinality: "one-to-many", direction: "Review has ReviewFollowUp" }
      - { to: ReviewTag, cardinality: "one-to-many", direction: "Review has ReviewTag (replaced as a set by correct)" }
      - { to: Comment, cardinality: "one-to-many", direction: "Comment belongs to Review (Community)" }

  - name: ReviewVersion
    owner: Review
    description: "Private, append-only copy of a review's content before a change"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: review_id, type: uuid, required: true, references: Review.id, constraints: "ON DELETE CASCADE, blocked by the append-only trigger (finding F9, U29)" }
      - { name: version, type: integer, required: true, constraints: "the version the snapshot shows (the review's version before the change)" }
      - { name: snapshot, type: json, required: true, constraints: "ContentSnapshot (below)" }
      - { name: change_kind, type: enum, required: true, allowed_values: [publish, correction, moderation_redaction, restore], constraints: "this Unit writes correction and moderation_redaction; publish rows exist only in the seed (F14) and are left out of history; restore is unused (kept for an appeal that reverses a redaction, U33)" }
      - { name: reason, type: text, required: false, constraints: "the author's reason for a material correction; the reason code for a redaction; null for a non-material correction" }
      - { name: actor_kind, type: enum, required: true, allowed_values: [author, moderator, system] }
      - { name: actor_id, type: uuid, required: false, constraints: "author -> persona id; moderator -> staff account id; system -> null; never an author's account id (Question 7, FD entry (d))" }
      - { name: created_at, type: timestamp, required: true, constraints: "editedAt is the month of the newest correction row" }
    constraints:
      - "Append-only: UPDATE or DELETE raises append_only_violation (0003_triggers.sql)"
      - "rk_worker has no privilege (FD-092)"
      - "Readable only through review.getHistory by the author or content.act staff (BR10.1)"

  - name: ContentSnapshot
    owner: Review
    description: "Value object stored in review_versions.snapshot"
    attributes:
      - { name: title, type: text, required: true }
      - { name: body, type: text, required: false }
      - { name: sections, type: "map<string, text>", required: false }
      - { name: claims, type: "list<string>", required: true }
      - { name: sentiment, type: enum, required: false }
      - { name: outcome, type: enum, required: false }
      - { name: tags, type: "list<{group, termId?, freeText?, notSure}>", required: true }
      - { name: followUps, type: "list<{id, body, laterProviderText?}>", required: false, constraints: "only in moderation_redaction rows, only the follow-ups the redaction touched" }

  - name: ReviewFollowUp
    owner: Review
    description: "A dated entry after the story: an update, a correction note or later care"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "named by redaction fields followUp.<id>.*" }
      - { name: review_id, type: uuid, required: true, references: Review.id }
      - { name: kind, type: enum, required: true, allowed_values: [follow_up, correction, later_care], constraints: "authors add follow_up and later_care; correction only from a material correct (BR3.3)" }
      - { name: dated_year, type: integer, required: true, min: 1950 }
      - { name: dated_month, type: integer, required: true, min: 1, max: 12, constraints: "not after the current Bangladesh month" }
      - { name: body, type: text, required: true, constraints: "10..2000 graphemes; for correction the author's reason; redactable" }
      - { name: later_provider_text, type: text, required: false, constraints: "later_care only, <= 120 graphemes; redactable" }
      - { name: later_doctor_id, type: uuid, required: false, references: Doctor.id, constraints: "later_care only; a visible doctor at write time; linked on the page only while visible (BR3.4)" }
      - { name: state, type: enum, required: true, default: published, constraints: "always published here (U21 reuse of publication_state; no follow-up lifecycle in release 1)" }
      - { name: created_at, type: timestamp, required: true, constraints: "tie-break of the display order" }
    constraints:
      - "Display order is by date, never by insertion; no pin column (BR3.1)"
      - "Never counted for the later doctor or facility (BR3.5)"

  - name: FacilityReview
    owner: Review
    description: "Facility feedback; this Unit writes its delete and restore columns only"
    attributes:
      - { name: public_id, type: text, required: true }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id }
      - { name: state, type: enum, required: true, constraints: "unchanged by delete (no discussion exists, F10)" }
      - { name: deleted_at, type: timestamp, required: false }
      - { name: restore_until, type: timestamp, required: false }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL in criteriaDistribution and forBranch (BR9.4)"

  - name: ReviewDraft
    owner: Review
    description: "Encrypted composer state; the account-deletion step deletes them (BR12.1)"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: account_id, type: uuid, required: true, references: AccountProfile.id }
    constraints:
      - "deletionStepOn deletes every row of the account; not holdable (legal_holds has no draft target)"

  - name: Comment
    owner: Community
    description: "Read only through DiscussionPresence.hasDiscussion (U30)"
    attributes:
      - { name: review_id, type: uuid, required: true, references: Review.id, constraints: "comments attach to reviews only, never to facility feedback" }
      - { name: state, type: enum, required: true }
      - { name: tombstone, type: boolean, required: true }
    constraints:
      - "Discussion exists when a comment is published or a comment tombstone (BR5.3)"
      - "comment.post locks the review FOR SHARE and requires it eligible (finding F12)"

  - name: Persona
    owner: Identity
    description: "The author of a review; ownership is resolved by identity.ownsAnyPersona"
    attributes:
      - { name: id, type: uuid, required: true }
    constraints:
      - "Account deletion removes persona links; named and pseudonymous personas then read Former member on retained reviews (Question 9, U11 T-104)"

  - name: RedactionRange
    owner: Review
    description: "Value object of the redaction input"
    attributes:
      - { name: field, type: enum, required: true, allowed_values: [title, body, sections.symptoms, sections.diagnosis, sections.treatment, sections.after, "followUp.<id>.body", "followUp.<id>.laterProvider"] }
      - { name: start, type: integer, required: true, min: 0, constraints: "UTF-16 offset; widened down to a grapheme boundary" }
      - { name: end, type: integer, required: true, constraints: "> start; widened up to a grapheme boundary; <= text length" }
    constraints:
      - "No key may carry text; an unknown key is moderation.narrative_locked (BR7.1)"
      - "The stored token is U+2063 '[redacted]' U+2063 (BR7.2)"
```

## View-model shapes (contracts)

| Type | Owner | Shape |
|---|---|---|
| `ExperienceResult` | Review | `ExperiencePageVM \| TombstoneVM` tagged by `kind` |
| `FollowUpVM` | Review | `{kind, dated: {year, month}, body, laterProvider?: {text?, doctor?: {publicId, name}}, isCurrent}` |
| `LaterCareVM` | Review | `{dated, body, providerText?, doctor?: {publicId, name, registrationNotVerified: true}, offerProfileSubmission}` |
| `TombstoneVM` | Review | `{kind: 'tombstone', publicId, removedBy: 'author' \| 'moderation', messageKey, whyKey, threadSlot, noindex: true}` |
| `ReviewHistoryVM` | Review | `{current: {version, content}, versions: [{version, changeKind, actorKind, reason?, at, content}]}` |

## Data boundaries

| Boundary | Rule |
|---|---|
| Public projection | current content only; no version, reason code, actor or internal id (BR9.3) |
| Private history | author and `content.act` staff; staff reads audited (BR10.1, BR10.2) |
| Audit details | ids, enums, counts and field names only; never text (01-conventions §5) |
| Outbox payloads | `{reviewId, doctorId, branchId?}` only (C15) |
| Worker | nothing from this Unit (BR12.1) |
| Account link | never stored in a review, version or follow-up row (FD entry (d)) |
