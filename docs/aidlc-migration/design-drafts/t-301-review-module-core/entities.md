# Entities — U21 `t-301-review-module-core`

Source of truth for the data shape this Unit writes and reads. Built from T-301 (with its FD-080 and FD-090 amendments), `02-data-model.md` §3, §6, §7, §16 and §17, `components.md` (Review, Identity), `contract-summary.md` (C4, C8, C9, C15), the schema files on `main` (`packages/database/src/schema/{review,identity,evidence,enums}.ts`, migration `0004_deferred_fks.sql`), the U14 T-201 design draft and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds no table and no column. It changes the database with one forward-only migration, the FD-090 worker grant on `review_drafts` (BR2.6). The timing of one foreign key, `persona_links_review_id_reviews_id_fk`, which must be `DEFERRABLE INITIALLY DEFERRED` (Question 5), is changed by U11 T-104's migration (its Question 7 A); this Unit adds that migration only if T-104 merged without it. Entities owned by another component are listed because this Unit's commands cross them; the owner is named on each.

Refreshed 2026-10-29: the persona attributes follow the U11 T-104 draft and Questions 17–19 (thread alias, profile username, "Former member"), the page condition follows U14 T-201's linked-condition-first rule, the draft payload has no FR46 field (FD entry (a)), and the audit actor rests on FD entry (d) (`functional-spec.md` § 17).

```yaml
entities:
  - name: Review
    owner: Review
    description: "One published account of a treatment episode (table reviews). Written by review.publish; read by every projection and list of this Unit."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "generated before any insert so an anonymous alias can be scoped to it (BR4.2); never in a view model" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "10-char lowercase base32; the only id in URLs, view models and the discussion slot" }
      - { name: seed_ref, type: text, required: false, constraints: "seed only; never projected" }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "never projected; the byline is derived from the persona (BR6.4)" }
      - { name: doctor_id, type: uuid, required: true, references: Doctor.id, constraints: "a visible doctor at publish (BR3.4)" }
      - { name: branch_id, type: uuid, required: false, references: FacilityBranch.id, constraints: "a visible branch where the doctor has a chamber (BR3.11); never feeds a facility figure" }
      - { name: kind, type: enum, required: true, allowed_values: [quick, detailed] }
      - { name: relationship, type: enum, required: true, allowed_values: [self, parent, family, witness] }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative], constraints: "absent renders Not provided (BR6.5)" }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: period_year, type: integer, required: true, min: 1950, constraints: "not after the current year (BR3.5)" }
      - { name: period_month, type: integer, required: true, min: 1, max: 12 }
      - { name: exact_date_enc, type: bytes, required: false, constraints: "Crypto.encrypt of YYYY-MM-DD; private; never selected into a view-model path (BR4.5)" }
      - { name: title, type: text, required: true, constraints: "author's title or derived, at most 120 graphemes (BR4.3); original wording" }
      - { name: body, type: text, required: false, constraints: "the story of a quick review, or the optional opening paragraph of a detailed one (BR3.2)" }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false, constraints: "detailed reviews; empty sections are not stored" }
      - { name: claims, type: "list<{label: wrongDx|wrongRx|secondOpinion}>", required: true, default: "[]", constraints: "codes only in release 1 (BR3.9)" }
      - { name: language, type: enum, required: true, allowed_values: [en, bn, mixed], constraints: "detected from script (BR4.4)" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected], constraints: "published at publish (BR4.10); soft delete keeps published and sets deleted_at (FD-049, BR5.2)" }
      - { name: published_at, type: timestamp, required: false, constraints: "set at publish; projected as month and year only" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "written by U22 T-302 and the worker deletion steps" }
      - { name: restore_until, type: timestamp, required: false, constraints: "U22 T-302; null for a moderator removal (BR5.3)" }
      - { name: version, type: integer, required: true, default: 1 }
      - { name: latest_status, type: text, required: false, constraints: "U22 T-302" }
      - { name: attestation_at, type: timestamp, required: false, constraints: "the publish time when the attestation was given (BR3.6)" }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL, in SQL (U14 BR1.3, BR7.1)"
      - "Carries no account column; the account is reachable only through persona_links in Identity (AD-3)"
    relationships:
      - { to: ReviewTag, cardinality: "one-to-many", direction: "Review has ReviewTag" }
      - { to: EvidenceItem, cardinality: "one-to-many", direction: "Review has EvidenceItem (published or privately bound)" }
      - { to: Persona, cardinality: "many-to-one", direction: "Review is written by one Persona" }

  - name: ReviewTag
    owner: Review
    description: "One tag of a review (table review_tags): a term, the author's free text, or Not sure."
    attributes:
      - { name: review_id, type: uuid, required: true, references: Review.id }
      - { name: group, type: enum, required: true, allowed_values: [symptom, condition, treatment, medicine] }
      - { name: term_id, type: uuid, required: false, references: TaxonomyTerm.id, constraints: "a resolved or newly provisional term of the group's kind (BR3.8)" }
      - { name: free_text, type: text, required: false, constraints: "kept as written; used only when resolution is ambiguous" }
      - { name: not_sure, type: boolean, required: true, default: false }
      - { name: created_at, type: timestamp, required: true, constraints: "tag order; the first condition tag with a term, else the first free-text condition tag, is the page's condition (BR6.8, U14 BR3.9)" }
    constraints:
      - "Exactly one of term_id, free_text, not_sure (database check)"
      - "One effective term at most once per group per review (BR3.8)"

  - name: ReviewDraft
    owner: Review
    description: "The composer's autosave target (table review_drafts). Holds a private account id by design (accepted exception, components.md Identity)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "the draftId of every draft operation; returned to its owner only" }
      - { name: account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "the owner (BR1.2); readable by the worker for the expiry warning (FD-090)" }
      - { name: review_id, type: uuid, required: false, references: Review.id, constraints: "editing a published review; U22 T-302" }
      - { name: kind, type: enum, required: true, allowed_values: [quick, detailed], constraints: "mirrors payload.mode; a facility draft is stored as quick" }
      - { name: payload_enc, type: bytes, required: true, constraints: "Crypto.encrypt(JSON(DraftPayload)); never readable by the worker (BR2.1, BR2.6)" }
      - { name: doctor_id, type: uuid, required: false, references: Doctor.id, constraints: "mirrors the payload's doctor for listing" }
      - { name: blocked_on_submission_id, type: uuid, required: false, references: ProfileSubmission.id, constraints: "the author's own pending submission (BR2.4)" }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: true, constraints: "every save" }
      - { name: expires_at, type: timestamp, required: true, constraints: "last save + 30 days (BR2.3); readable by the worker" }
    constraints:
      - "Read only by its owner; an expired draft is not found before the worker purges it (BR2.3)"
      - "Deleted in the publish transaction (BR4.1)"
      - "rk_worker: SELECT (id, account_id, expires_at) and DELETE only (FD-090, BR2.6)"

  - name: DraftPayload
    kind: value_object
    description: "The decrypted composer state. Partial while drafting; checked in full at publish. Schema in contracts/schemas/review.ts."
    attributes:
      - { name: target, type: enum, required: false, allowed_values: [doctor, facility], default: doctor }
      - { name: mode, type: enum, required: false, allowed_values: [quick, detailed], default: quick }
      - { name: doctorPublicId, type: string, required: false }
      - { name: doctorSubmissionPublicId, type: string, required: false, constraints: "a pending submission of the author (BR2.4)" }
      - { name: branchPublicId, type: string, required: false, constraints: "doctor target: optional branch (BR3.11); facility target: required (BR8.1)" }
      - { name: relationship, type: enum, required: false, allowed_values: [self, parent, family, witness] }
      - { name: periodText, type: text, required: false, constraints: "parsed by parsePeriod at publish (BR3.5)" }
      - { name: exactDate, type: string, required: false, constraints: "YYYY-MM-DD, inside the period; private (BR4.5)" }
      - { name: title, type: text, required: false, max: 120, constraints: "graphemes" }
      - { name: story, type: text, required: false, max: 10000, constraints: "quick story, detailed opening paragraph, facility body" }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false, constraints: "each at most 5000 graphemes" }
      - { name: tags, type: "list<{group, termPublicId? | freeText? | notSure: true}>", required: false, max: 20 }
      - { name: notSure, type: boolean, required: false }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative] }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: claims, type: "list<wrongDx|wrongRx|secondOpinion>", required: false, max: 3 }
      - { name: criteria, type: "map<criterion, good|mixed|poor|null>", required: false, constraints: "facility target only (BR8.1)" }
      - { name: identity, type: enum, required: false, allowed_values: [named, pseudonymous, anonymous], constraints: "must equal the publish input when set (BR3.7)" }
      - { name: evidenceItemIds, type: "list<string>", required: false, max: 10 }
      - { name: ignoredChecks, type: "list<pii|emerg|dup>", required: false, constraints: "composer state only (T-306); never read by publish" }
      - { name: confirmations, type: "list<boolean>", required: false, constraints: "composer state only; the server reads the attestation from the publish input" }
      - { name: seedRef, type: text, required: false, constraints: "seed drafts only, for idempotency (Question 14); never projected" }
    constraints:
      - "Unknown keys are dropped; no rating, score or stars key exists (BR2.2, BR3.12)"
      - "No What went well or What could improve field: FR46 is deferred from release 1 (BR3.13, FD entry (a)); such keys are dropped like any unknown key"
      - "Encoded size at most 64 KiB (BR2.2)"

  - name: FacilityReview
    owner: Review
    description: "Structured, non-scored feedback about one branch (table facility_reviews). Written by facilityReview.publish; never joins a doctor's figures."
    attributes:
      - { name: public_id, type: string, required: true, unique: true }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "anonymous: a fresh persona per facility review (BR8.2)" }
      - { name: branch_id, type: uuid, required: true, references: FacilityBranch.id }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: period_year, type: integer, required: true }
      - { name: period_month, type: integer, required: true, min: 1, max: 12 }
      - { name: body, type: text, required: true, constraints: "at least 20 graphemes; original wording" }
      - { name: criteria, type: "map<criterion, good|mixed|poor|null>", required: true, default: "{}", constraints: "the nine criteria of the enum; no score is derived (FR27)" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: published_at, type: timestamp, required: false }
      - { name: version, type: integer, required: true, default: 1 }
      - { name: deleted_at, type: timestamp, required: false }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL (U14 BR1.4)"
      - "Has no doctor_id; listed only on its branch (BR7.3)"

  - name: Persona
    owner: Identity
    description: "The public face of an author (table personas). Read for bylines; created through identity.personaFor at publish."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "never projected" }
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: true, constraints: "named: the display name on the byline; anonymous: the random thread alias (patient-xxxx, T-104 BR2.1), shown only on its own page and discussion (BR6.4, Question 17)" }
      - { name: username, type: text, required: false, constraints: "pseudonymous: the name on the byline; named and pseudonymous: profileUsername for the profile link (FR11, AC10.2.1, Question 18); never for anonymous or de-identified personas" }
      - { name: avatar_hue, type: integer, required: false, constraints: "constant for anonymous personas (T-104 BR1.6)" }
      - { name: deidentified_at, type: timestamp, required: false, constraints: "added by U11 T-104 (the owner's answer to its Question 15); set: the byline shows Former member with no name, username or profile link, and the page lists no other accounts (BR6.4, BR6.9, Question 19)" }
    relationships:
      - { to: PersonaLink, cardinality: "one-to-one", direction: "Persona has one private PersonaLink" }

  - name: PersonaLink
    owner: Identity
    description: "The private link from a persona to its account (table persona_links). Never read by Review; written by identity.personaFor."
    attributes:
      - { name: persona_id, type: uuid, required: true, unique: true, references: Persona.id }
      - { name: account_id, type: uuid, required: true, references: AccountProfile.id }
      - { name: review_id, type: uuid, required: false, references: Review.id, constraints: "set for a review's anonymous alias; the foreign key is DEFERRABLE INITIALLY DEFERRED (U11 T-104's migration, or this Unit's fallback) so the link can be written before the review in one transaction (Question 5); null for an anonymous facility review (BR8.2)" }
    constraints:
      - "No rk_worker privilege; readable only through Identity's PrivateIdentityRepository (AD-3)"
      - "Review learns at most one boolean from it: identity.ownsAnyPersona (Question 8), asked of U11 T-104's finalisation"

  - name: EvidenceItemForPublish
    owner: Evidence
    description: "The view of an uploaded file that review.publish needs (port EvidenceForPublish, built by U23 T-303 and U25 T-305; faked until then)."
    attributes:
      - { name: item_id, type: uuid, required: true }
      - { name: state, type: enum, required: true, allowed_values: [quarantined, validating, scanning, sanitising, preview_ready, privacy_confirmed, published, failed, rejected, removed, original_expired] }
    constraints:
      - "Returned only for items of the given draft and author (BR3.10)"
      - "privacy_confirmed -> published with the review; non-terminal -> bound privately; terminal failures ignored (BR4.6)"

  - name: TaxonomyTerm
    owner: Taxonomy
    description: "A condition, symptom, treatment or medicine term (table taxonomy_terms). Read to resolve tags; a provisional term may be created inside the publish transaction (U14 BR5.2)."
    attributes:
      - { name: public_id, type: string, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [condition, symptom, treatment, medicine, specialty] }
      - { name: canonical_id, type: uuid, required: false, constraints: "effective term = canonical target (U14 BR1.6)" }
      - { name: provisional, type: boolean, required: true }

  - name: PeriodMonth
    kind: value_object
    description: "A treatment period at month precision (domain/review/review.ts)."
    attributes:
      - { name: year, type: integer, required: true, min: 1950 }
      - { name: month, type: integer, required: true, min: 1, max: 12 }
    constraints:
      - "Produced by parsePeriod; never later than the current month (BR3.5)"
      - "publicPeriod returns {year, month}; no day exists in any public shape"

  - name: Claim
    kind: value_object
    description: "One Reviewer's label (reviews.claims item)."
    attributes:
      - { name: label, type: enum, required: true, allowed_values: [wrongDx, wrongRx, secondOpinion] }
    constraints:
      - "Projected as labelKey claim.<code> with label.reviewerLabel (BR6.6)"

  - name: ConditionKey
    kind: value_object
    description: "What two condition tags must share to count as the same episode (BR4.9)."
    attributes:
      - { name: term_id, type: uuid, required: false, constraints: "effective term id of a condition tag" }
      - { name: text_key, type: text, required: false, constraints: "normalizeAliasKey of a free-text condition tag" }
    constraints:
      - "Not sure produces no key"

  - name: DomainPublicationState
    kind: value_object
    description: "The state the review state machine reasons about: the stored enum plus the domain-only 'deleted' (FD-049)."
    attributes:
      - { name: value, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, deleted, rejected] }
    constraints:
      - "deleted = stored published with deleted_at set (BR5.2)"

  - name: ReviewPublishedEvent
    kind: value_object
    description: "Payload of the review.published outbox event (C15)."
    attributes:
      - { name: reviewId, type: uuid, required: true }
      - { name: doctorId, type: uuid, required: true }
      - { name: branchId, type: uuid, required: true, constraints: "null when the review names no branch; the key is always present" }
      - { name: repeatEpisode, type: boolean, required: true }
    constraints:
      - "Exactly these four keys; no earlier review id, account id or persona id (BR4.8)"

  - name: ReviewAuditRow
    kind: value_object
    description: "The audit_events row of a publish (Administration owns the table, FD-065)."
    attributes:
      - { name: stream, type: text, required: true, constraints: "review:<id> or facility_review:<id>" }
      - { name: action, type: text, required: true, constraints: "publish" }
      - { name: actor, type: text, required: true, constraints: "persona:<authorPersonaId>, never account:<id> (BR4.7, FD entry (d)); the provisional terms a publish creates carry the same actor (BR3.8)" }
      - { name: details, type: "map", required: true, constraints: "{kind, identityMode, tagCount, evidenceLinked, evidencePending} or {identityMode, criteriaAnswered}" }
```

## Summary

- **Review-owned entities** (`Review`, `ReviewTag`, `ReviewDraft`, `FacilityReview`) are written by the three commands of this Unit (`review.saveDraft`, `review.publish`, `facilityReview.publish`) and read by its queries. A review carries no account column; its author is a persona. The draft is the one place an account id sits next to content, as the domain design accepts, and only its owner and (for id, account and expiry) the worker can read it.
- **Value objects**: `DraftPayload` (partial, bounded, encrypted), `PeriodMonth` (month precision, never a day in public), `Claim` (three codes), `ConditionKey` (the repeat-episode match), `DomainPublicationState` (the stored enum plus the domain-only `deleted`), `ReviewPublishedEvent` (four keys) and `ReviewAuditRow` (actor is the persona).
- **Borrowed entities**: `Persona` and `PersonaLink` (Identity; Review never reads the link, it gets one boolean for the repeat check), `EvidenceItemForPublish` (Evidence, through a port built later), `TaxonomyTerm` (Taxonomy, resolved and possibly created as provisional inside the publish transaction).
- **Database changes**: the FD-090 grant; the deferrable persona-link foreign key only if U11 T-104 merged without it. No table or column is added.
