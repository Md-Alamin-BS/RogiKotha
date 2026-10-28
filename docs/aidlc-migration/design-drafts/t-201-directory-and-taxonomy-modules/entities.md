# Entities — U14 `t-201-directory-and-taxonomy-modules`

Source of truth for the data shape this Unit reads and, for the two taxonomy commands, writes. Built from T-201 (with FD-067, C6, C7 and the addendum), `02-data-model.md` §0, §3–§7 and §17, `components.md` (Directory, Taxonomy, Review), `contract-summary.md` (C6, C7, C9), the schema files on `main` and the answers in `functional-design-questions.md`. Workflows, port signatures and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds two columns (`taxonomy_terms.suggested`, `taxonomy_terms.suggested_order`, Question 4) and no table. Every other entity below exists on `main` and is only read. Entities owned by another component are listed because a read crosses them; the owner is named on each.

```yaml
entities:
  - name: Doctor
    owner: Directory
    description: "A doctor or dentist profile (table doctors). Read by every directory query; never written by this Unit."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; never in a view model" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "10-char lowercase base32; the only id in URLs and view models" }
      - { name: name_en, type: text, required: true }
      - { name: name_bn, type: text, required: true }
      - { name: specialty_id, type: uuid, required: false, references: TaxonomyTerm.id, constraints: "term of kind specialty; absent means the specialty is not provided" }
      - { name: qualifications_en, type: text, required: false }
      - { name: qualifications_bn, type: text, required: false }
      - { name: bmdc_number, type: text, required: false, constraints: "profile information only; never makes the registration verified" }
      - { name: languages_en, type: text, required: false }
      - { name: languages_bn, type: text, required: false }
      - { name: fee_display_en, type: text, required: false }
      - { name: fee_display_bn, type: text, required: false }
      - { name: city_en, type: text, required: false }
      - { name: city_bn, type: text, required: false }
      - { name: area_en, type: text, required: false }
      - { name: area_bn, type: text, required: false }
      - { name: field_provenance, type: "map<field, ProvenanceEntry>", required: true, default: "{}" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359 }
      - { name: claimed_by_account_id, type: uuid, required: false, constraints: "private; projected only as the boolean claimed" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: merged_into_id, type: uuid, required: false, references: Doctor.id }
      - { name: updated_at, type: timestamp, required: false }
    constraints:
      - "Publicly visible only when state is published and merged_into_id is absent (BR1.1)"
      - "gender and about are stored but not projected by this Unit (prototype fact list)"
    relationships:
      - { to: DoctorChamber, cardinality: "one-to-many", direction: "Doctor has DoctorChamber" }
      - { to: TaxonomyTerm, cardinality: "many-to-one", direction: "Doctor has one specialty TaxonomyTerm" }
      - { to: EligibleReview, cardinality: "one-to-many", direction: "Doctor is the subject of EligibleReview (read only by Review)" }

  - name: DoctorChamber
    owner: Directory
    description: "Where and when a doctor sees patients (table doctor_chambers)."
    attributes:
      - { name: doctor_id, type: uuid, required: true, references: Doctor.id }
      - { name: branch_id, type: uuid, required: false, references: FacilityBranch.id, constraints: "links the doctor to a facility branch; absent for a chamber with no profile" }
      - { name: name_en, type: text, required: true }
      - { name: name_bn, type: text, required: true }
      - { name: hours_en, type: text, required: false }
      - { name: hours_bn, type: text, required: false }
      - { name: provenance, type: enum, required: true, allowed_values: [community, provider, admin] }
      - { name: sort_order, type: integer, required: true, default: 0, constraints: "the first chamber by sort_order is the doctor's primary chamber" }
      - { name: created_at, type: timestamp, required: true, constraints: "the chamber's last-update date (the table has no updated_at)" }

  - name: Facility
    owner: Directory
    description: "A facility organisation, the parent of one or more branches (table facilities)."
    attributes:
      - { name: public_id, type: string, required: true, unique: true }
      - { name: name_en, type: text, required: true }
      - { name: name_bn, type: text, required: true }
      - { name: type, type: enum, required: true, allowed_values: [hospital, clinic, diagnostic] }
      - { name: field_provenance, type: "map<field, ProvenanceEntry>", required: true, default: "{}" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359, constraints: "not seeded today; stableHue fallback (Question 8)" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: claimed_by_account_id, type: uuid, required: false, constraints: "private; projected only as the boolean claimed" }
    relationships:
      - { to: FacilityBranch, cardinality: "one-to-many", direction: "Facility has FacilityBranch" }

  - name: FacilityBranch
    owner: Directory
    description: "One physical branch, the page a visitor opens and the target of facility feedback (table facility_branches)."
    attributes:
      - { name: public_id, type: string, required: true, unique: true, constraints: "the id in /facilities/{publicId}" }
      - { name: facility_id, type: uuid, required: true, references: Facility.id }
      - { name: name_en, type: text, required: true }
      - { name: name_bn, type: text, required: true }
      - { name: city_en, type: text, required: true }
      - { name: city_bn, type: text, required: true }
      - { name: area_en, type: text, required: false }
      - { name: area_bn, type: text, required: false }
      - { name: address_en, type: text, required: false }
      - { name: address_bn, type: text, required: false }
      - { name: field_provenance, type: "map<field, ProvenanceEntry>", required: true, default: "{}" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: is_primary, type: boolean, required: true, default: false }
    constraints:
      - "Publicly visible only when the branch and its facility are both published (BR1.2)"
      - "Has no avatar_hue column; its hue is stableHue(public_id) (Question 8)"
    relationships:
      - { to: FacilityReview, cardinality: "one-to-many", direction: "FacilityBranch is the subject of FacilityReview (read only by Review)" }
      - { to: DoctorChamber, cardinality: "one-to-many", direction: "FacilityBranch hosts DoctorChamber" }

  - name: ProfileRedirect
    owner: Directory
    description: "An old public id after a merge (table profile_redirects). Read by directory.resolvePublicId; written by U17 T-204."
    attributes:
      - { name: from_public_id, type: string, required: true, unique: true }
      - { name: to_kind, type: enum, required: true, allowed_values: [doctor, facility] }
      - { name: to_public_id, type: string, required: true }
    constraints:
      - "A chain is followed at most five hops; a cycle or a dead end resolves to not_found (BR1.7)"

  - name: TaxonomyTerm
    owner: Taxonomy
    description: "A condition, symptom, treatment, medicine or specialty, canonical or provisional (table taxonomy_terms)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: public_id, type: string, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [condition, symptom, treatment, medicine, specialty] }
      - { name: name_en, type: text, required: true, constraints: "a provisional term holds the reviewer's original wording in both name columns" }
      - { name: name_bn, type: text, required: true }
      - { name: name_key_en, type: text, required: true, constraints: "normalizeAliasKey(name_en) (BR4.2)" }
      - { name: name_key_bn, type: text, required: true, constraints: "normalizeAliasKey(name_bn) (BR4.2)" }
      - { name: provisional, type: boolean, required: true, default: false }
      - { name: canonical_id, type: uuid, required: false, references: TaxonomyTerm.id, constraints: "set when the term is mapped, merged or redirected; the canonical target has no canonical_id itself" }
      - { name: created_by_account_id, type: uuid, required: false, constraints: "private; set by createProvisional; never projected" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected], constraints: "published is active; hidden is deactivated (Question 5)" }
      - { name: suggested, type: boolean, required: true, default: false, constraints: "new in this Unit (Question 4, ISS-157)" }
      - { name: suggested_order, type: integer, required: false, min: 0, constraints: "new in this Unit; order of a suggestion inside its group" }
    constraints:
      - "Effective term = the term itself when canonical_id is absent, else its canonical target (BR1.6)"
      - "Only canonical, published terms of kind condition are listed in the topic index (BR4.4)"
      - "A tag group is the fixed enum tag_group [symptom, condition, treatment, medicine]; groups are not rows (Question 5)"
    relationships:
      - { to: TaxonomyAlias, cardinality: "one-to-many", direction: "TaxonomyTerm has TaxonomyAlias" }
      - { to: TaxonomyTerm, cardinality: "many-to-one", direction: "a mapped TaxonomyTerm points to its canonical TaxonomyTerm" }
      - { to: ReviewTag, cardinality: "one-to-many", direction: "TaxonomyTerm is referenced by ReviewTag (read only by Review)" }

  - name: TaxonomyAlias
    owner: Taxonomy
    description: "Another way people write a term, in en, bn or Banglish (table taxonomy_aliases)."
    attributes:
      - { name: term_id, type: uuid, required: true, references: TaxonomyTerm.id }
      - { name: alias, type: text, required: true, constraints: "kept exactly as written; shown on the condition page" }
      - { name: alias_key, type: text, required: true, constraints: "normalizeAliasKey(alias); unique together with term_id" }
      - { name: lang, type: enum, required: true, allowed_values: [en, bn, banglish] }
      - { name: provenance, type: enum, required: true, allowed_values: [community, provider, admin] }

  - name: EligibleReview
    owner: Review
    description: "The read projection of a review that counts: a row of reviews in state published with no deleted_at. Read only inside the Review stub (FD-067)."
    attributes:
      - { name: public_id, type: string, required: true, unique: true }
      - { name: doctor_id, type: uuid, required: true, references: Doctor.id }
      - { name: branch_id, type: uuid, required: false, references: FacilityBranch.id, constraints: "where the doctor was seen; never feeds a facility figure (BR2.7)" }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "never projected; only the byline derived from the persona" }
      - { name: relationship, type: enum, required: true, allowed_values: [self, parent, family, witness] }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative] }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: period_year, type: integer, required: true }
      - { name: period_month, type: integer, required: true, min: 1, max: 12 }
      - { name: title, type: text, required: true, constraints: "original wording" }
      - { name: body, type: text, required: false, constraints: "quick reviews" }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false, constraints: "detailed reviews" }
      - { name: published_at, type: timestamp, required: false }
    constraints:
      - "state = published AND deleted_at IS NULL, in SQL, for every count, distribution and card (BR1.3)"
      - "exact_date_enc is private and is never selected"
    relationships:
      - { to: ReviewTag, cardinality: "one-to-many", direction: "EligibleReview has ReviewTag" }
      - { to: EvidenceItem, cardinality: "one-to-many", direction: "EligibleReview has EvidenceItem" }

  - name: ReviewTag
    owner: Review
    description: "One tag on a review (table review_tags): a term, a free-text wording or Not sure."
    attributes:
      - { name: review_id, type: uuid, required: true, references: EligibleReview.id }
      - { name: group, type: enum, required: true, allowed_values: [symptom, condition, treatment, medicine] }
      - { name: term_id, type: uuid, required: false, references: TaxonomyTerm.id }
      - { name: free_text, type: text, required: false, constraints: "original wording" }
      - { name: not_sure, type: boolean, required: true, default: false }
      - { name: created_at, type: timestamp, required: true, constraints: "tag order; the first condition tag names the card's condition (BR3.9)" }
    constraints:
      - "Exactly one of term_id, free_text, not_sure (database check)"
      - "A review counts once per effective term however many of its tags point there (BR3.2)"

  - name: FacilityReview
    owner: Review
    description: "Structured feedback about one branch (table facility_reviews). Never joins a doctor's figures."
    attributes:
      - { name: public_id, type: string, required: true, unique: true }
      - { name: branch_id, type: uuid, required: true, references: FacilityBranch.id }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: period_year, type: integer, required: true }
      - { name: period_month, type: integer, required: true }
      - { name: body, type: text, required: true }
      - { name: criteria, type: "map<criterion, good|mixed|poor|null>", required: true, default: "{}", constraints: "criterion is the enum [staff, waiting, cleanliness, billing, reportTime, reportTrust, admission, recommend, overall]" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: published_at, type: timestamp, required: false }
      - { name: deleted_at, type: timestamp, required: false }
    constraints:
      - "Counts only when state = published AND deleted_at IS NULL (BR1.4)"

  - name: EvidenceItem
    owner: Evidence
    description: "A supporting document attached to a review. This Unit only counts items; it reads no file, filename or artifact."
    attributes:
      - { name: review_id, type: uuid, required: true, references: EligibleReview.id }
      - { name: state, type: enum, required: true, constraints: "only published counts as a document (BR1.5)" }

  - name: Persona
    owner: Identity
    description: "The public face of an author (table personas). Read to build a byline; carries no account column."
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: true, constraints: "projected only for named personas" }
      - { name: username, type: text, required: false, constraints: "projected only for pseudonymous personas" }
    constraints:
      - "An anonymous persona projects no name, username or initials (BR2.10)"

  - name: ProvenanceEntry
    kind: value_object
    description: "Where one profile field came from and when it last changed (one entry of field_provenance)."
    attributes:
      - { name: source, type: enum, required: true, allowed_values: [community, provider, admin] }
      - { name: updated_at, type: timestamp, required: true }
      - { name: hidden, type: boolean, required: false, default: false, constraints: "read-only convention (Question 7); a hidden field is omitted" }
    constraints:
      - "A populated field with no entry is shown as source community, dated by the profile's updated_at (Question 6)"

  - name: Distribution
    kind: value_object
    description: "How eligible accounts spread over one enum, with exact counts and the denominator. Produced by domain/review/policies.ts distribution()."
    attributes:
      - { name: keys, type: "list<enum value>", required: true, constraints: "render order: sentiment [positive, mixed, negative]; outcome [helped, none, worse, uncertain]; criterion value [good, mixed, poor]" }
      - { name: counts, type: "map<key, integer>", required: true, min: 0, constraints: "every key present, zero included" }
      - { name: total, type: integer, required: true, min: 0, constraints: "accounts with a recognised value; the denominator" }
      - { name: not_provided, type: integer, required: true, min: 0, constraints: "eligible accounts with no value" }
      - { name: empty, type: boolean, required: true, constraints: "total = 0" }
      - { name: limited_data, type: boolean, required: true, constraints: "0 < total < threshold" }
    constraints:
      - "No percentage, average, score or rank (BR2.1)"

  - name: Byline
    kind: value_object
    description: "How an account is attributed on a card."
    attributes:
      - { name: persona_kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: false, constraints: "named only" }
      - { name: username, type: text, required: false, constraints: "pseudonymous only" }
      - { name: initials, type: text, required: false, constraints: "named and pseudonymous only" }
```

## Summary

- **Directory entities** (`Doctor`, `DoctorChamber`, `Facility`, `FacilityBranch`, `ProfileRedirect`) are read only. A doctor is visible when published and not merged; a branch when it and its organisation are published. Private columns (`claimed_by_account_id`) reach a view model only as a boolean.
- **Taxonomy entities** (`TaxonomyTerm`, `TaxonomyAlias`) are read by the taxonomy queries and written by `createProvisional` and `mapProvisional`. The Unit adds `suggested` and `suggested_order` to the term. A term with a `canonical_id` is a redirect to its canonical target; a `hidden` term is deactivated. Every key column holds `normalizeAliasKey` of its text.
- **Review-side entities** (`EligibleReview`, `ReviewTag`, `FacilityReview`) and the borrowed `EvidenceItem` and `Persona` are read only inside the Review stub, through the `ReviewRepository` read methods (FD-067). Doctor figures read `reviews` by `doctor_id`; facility figures read `facility_reviews` by `branch_id`; the two never meet.
- **Value objects**: `ProvenanceEntry` (source, date, optional hidden flag), `Distribution` (counts for every key, total, not provided, empty, limited data) and `Byline` (no name at all for anonymous personas).
