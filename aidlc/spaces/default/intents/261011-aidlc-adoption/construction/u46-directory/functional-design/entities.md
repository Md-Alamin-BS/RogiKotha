# Entities — U46 `u46-directory`

Source of truth for the data shape U46 reads and writes. Built from the reviewed T-201 entities (archived 2026-11-04), the schema files on `main` at `bc63889`, `02-data-model.md` §3–§7 and §17, `components.md` (Directory, Taxonomy, Review), `contract-summary.md` (C6, C7, C17, C18), FD-100 and FD-101, and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds no table. Its one migration adds `taxonomy_terms.suggested`, `suggested_order` and a partial unique index on open provisional terms (T-201 Question 4, BR5.2), and `facility_branches.own_name_en`, `own_name_bn` and `avatar_hue` (Question 3 A). It changes the meaning of no existing column. The Unit writes rows in four places only: a provisional term and its alias (`taxonomy.createProvisional` and the operation U47's publish calls), and a member-added doctor with its optional chamber and its pending submission (`directory.addMemberDoctor`, FD-100). Entities owned by another component are listed because a read crosses them; the owner is named on each.

```yaml
entities:
  - name: Doctor
    owner: Directory
    description: "A doctor or dentist profile (table doctors). Read by every directory query; created only by directory.addMemberDoctor in this Unit."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; never in a view model or URL" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "10-char public id; the only id in URLs and view models" }
      - { name: name_en, type: text, required: true, constraints: "a member-added doctor holds the typed name in both columns, untranslated (FD-024, FD-100)" }
      - { name: name_bn, type: text, required: true }
      - { name: name_key, type: text, required: false, constraints: "written by addMemberDoctor as the seed does; matching uses doctorNameKey over the name columns (BR5.6)" }
      - { name: specialty_id, type: uuid, required: false, references: TaxonomyTerm.id, constraints: "term of kind specialty; absent means not provided" }
      - { name: qualifications_en, type: text, required: false }
      - { name: qualifications_bn, type: text, required: false }
      - { name: bmdc_number, type: text, required: false, constraints: "profile information only; never makes the registration verified; addMemberDoctor never writes it (the typed number stays in the submission payload)" }
      - { name: languages_en, type: text, required: false }
      - { name: languages_bn, type: text, required: false }
      - { name: fee_display_en, type: text, required: false }
      - { name: fee_display_bn, type: text, required: false }
      - { name: about_en, type: text, required: false, constraints: "empty on seeded d7-d10 (CR-012); shown as Not provided (Question 13)" }
      - { name: about_bn, type: text, required: false }
      - { name: city_en, type: text, required: false }
      - { name: city_bn, type: text, required: false }
      - { name: area_en, type: text, required: false }
      - { name: area_bn, type: text, required: false }
      - { name: field_provenance, type: "map<field, ProvenanceEntry>", required: true, default: "{}" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359, constraints: "addMemberDoctor leaves it empty; the view uses stableHue(public_id) (BR3.8)" }
      - { name: claimed_by_account_id, type: uuid, required: false, constraints: "private; projected only as the boolean claimed" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: merged_into_id, type: uuid, required: false, references: Doctor.id }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: false }
    constraints:
      - "Publicly visible only when state is published and merged_into_id is absent (BR1.1)"
      - "gender is stored but not projected"
    relationships:
      - { to: DoctorChamber, cardinality: "one-to-many", direction: "Doctor has DoctorChamber" }
      - { to: TaxonomyTerm, cardinality: "many-to-one", direction: "Doctor has at most one specialty TaxonomyTerm" }
      - { to: ProfileSubmission, cardinality: "one-to-many", direction: "Doctor may be created by ProfileSubmission (created_doctor_id)" }
      - { to: EligibleReview, cardinality: "one-to-many", direction: "Doctor is the subject of EligibleReview (read only by Review)" }

  - name: ProfileSubmission
    owner: Directory
    description: "A member's request to add a profile (table profile_submissions). Written by addMemberDoctor as pending; decided by staff in release 2 (T-204)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [doctor, facility], constraints: "addMemberDoctor writes doctor" }
      - { name: payload, type: json, required: true, constraints: "{nameEn, nameBn, specialtyId, chamber, bmdc}; private; the typed BMDC number lives only here and is never projected (FD-100)" }
      - { name: submitted_by_account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "private; never projected (FD-100, ISS-398)" }
      - { name: status, type: enum, required: true, allowed_values: [pending, approved, rejected, merged], constraints: "addMemberDoctor writes pending" }
      - { name: created_doctor_id, type: uuid, required: false, references: Doctor.id }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "A doctor is member-added and not confirmed while a submission of kind doctor with created_doctor_id = the doctor and status pending exists (BR2.13)"

  - name: DoctorChamber
    owner: Directory
    description: "Where and when a doctor sees patients (table doctor_chambers)."
    attributes:
      - { name: doctor_id, type: uuid, required: true, references: Doctor.id }
      - { name: branch_id, type: uuid, required: false, references: FacilityBranch.id, constraints: "the only link between a doctor and a branch (T-201 Question 14); absent for a member-typed practice place" }
      - { name: name_en, type: text, required: true, constraints: "a member-typed place holds the typed text in both columns" }
      - { name: name_bn, type: text, required: true }
      - { name: hours_en, type: text, required: false }
      - { name: hours_bn, type: text, required: false }
      - { name: provenance, type: enum, required: true, allowed_values: [community, provider, admin] }
      - { name: sort_order, type: integer, required: true, default: 0, constraints: "first by sort_order is the primary chamber" }
      - { name: created_at, type: timestamp, required: true, constraints: "the chamber's last-update date (the table has no updated_at)" }

  - name: Facility
    owner: Directory
    description: "A facility organisation, the parent of one or more branches (table facilities). Read only."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: name_en, type: text, required: true, constraints: "the organisation (\"Shefa Health Group\"); a single-branch organisation carries its branch's name" }
      - { name: name_bn, type: text, required: true }
      - { name: type, type: enum, required: true, allowed_values: [hospital, clinic, diagnostic] }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
      - { name: claimed_by_account_id, type: uuid, required: false, constraints: "private; projected only as the boolean claimed" }
    relationships:
      - { to: FacilityBranch, cardinality: "one-to-many", direction: "Facility has FacilityBranch" }

  - name: FacilityBranch
    owner: Directory
    description: "One physical branch: the page a visitor opens and the subject of facility feedback (table facility_branches)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: public_id, type: string, required: true, unique: true, constraints: "the id in /facilities/{id}" }
      - { name: facility_id, type: uuid, required: true, references: Facility.id }
      - { name: name_en, type: text, required: true, constraints: "UNCHANGED meaning: the branch's label when it has one (\"Dhanmondi branch\"), else its full name (\"Bandar Diagnostic Centre\"), as the seed and the merged pages hold it (Question 3 A)" }
      - { name: name_bn, type: text, required: true }
      - { name: own_name_en, type: text, required: false, constraints: "NEW: the branch's own name as the prototype names it (\"Shefa General Hospital\"), present only when name_* holds a label; database check: own_name_en and own_name_bn both present or both absent" }
      - { name: own_name_bn, type: text, required: false, constraints: "NEW" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359, constraints: "NEW: seeded from the corpus avatarHue; database check 0-359" }
      - { name: city_en, type: text, required: true }
      - { name: city_bn, type: text, required: true }
      - { name: area_en, type: text, required: false }
      - { name: area_bn, type: text, required: false }
      - { name: address_en, type: text, required: false, constraints: "empty on seeded f6-f10 (CR-012); shown as Not provided (Question 5)" }
      - { name: address_bn, type: text, required: false }
      - { name: field_provenance, type: "map<field, ProvenanceEntry>", required: true, default: "{}" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected] }
    constraints:
      - "Publicly visible only when the branch and its facility are both published (BR1.2)"
      - "Display names follow BR3.11: title = own name, else the facility's name; label = name_* when it differs from the title; parent = the facility's name when it differs from the title"
    relationships:
      - { to: FacilityReview, cardinality: "one-to-many", direction: "FacilityBranch is the subject of FacilityReview (read only by Review)" }
      - { to: DoctorChamber, cardinality: "one-to-many", direction: "FacilityBranch hosts DoctorChamber" }

  - name: TaxonomyTerm
    owner: Taxonomy
    description: "A condition, symptom, treatment, medicine or specialty, canonical or provisional (table taxonomy_terms)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: public_id, type: string, required: true, unique: true }
      - { name: kind, type: enum, required: true, allowed_values: [condition, symptom, treatment, medicine, specialty] }
      - { name: name_en, type: text, required: true, constraints: "a provisional term holds the author's original wording in both name columns" }
      - { name: name_bn, type: text, required: true }
      - { name: name_key_en, type: text, required: true, constraints: "normalizeAliasKey(name_en) (BR4.2)" }
      - { name: name_key_bn, type: text, required: true }
      - { name: provisional, type: boolean, required: true, default: false }
      - { name: canonical_id, type: uuid, required: false, references: TaxonomyTerm.id, constraints: "read as a redirect to the canonical term; nothing in release 1 sets it (mapProvisional is release 2)" }
      - { name: created_by_account_id, type: uuid, required: false, constraints: "never written by this Unit, so no term ties an account to a wording on an anonymous review (T-201 F12)" }
      - { name: state, type: enum, required: true, allowed_values: [draft, pending_review, published, hidden_pending_review, hidden, deleted_tombstone, rejected], constraints: "published is active; hidden is deactivated" }
      - { name: suggested, type: boolean, required: true, default: false, constraints: "NEW (T-201 Question 4, ISS-157)" }
      - { name: suggested_order, type: integer, required: false, min: 0, constraints: "NEW; database check >= 0" }
    constraints:
      - "Effective term = canonical_id when set, else the term itself (BR1.6)"
      - "At most one open provisional term per kind and key: partial unique index on (kind, name_key_en) where provisional and canonical_id is null, NEW (BR5.2)"
      - "Tag groups are the fixed enum tag_group [symptom, condition, treatment, medicine]"
    relationships:
      - { to: TaxonomyAlias, cardinality: "one-to-many", direction: "TaxonomyTerm has TaxonomyAlias" }
      - { to: ReviewTag, cardinality: "one-to-many", direction: "TaxonomyTerm is referenced by ReviewTag (read only by Review)" }

  - name: TaxonomyAlias
    owner: Taxonomy
    description: "Another way people write a term (table taxonomy_aliases)."
    attributes:
      - { name: term_id, type: uuid, required: true, references: TaxonomyTerm.id }
      - { name: alias, type: text, required: true, constraints: "kept as written; shown under Also written as" }
      - { name: alias_key, type: text, required: true, constraints: "normalizeAliasKey(alias); unique with term_id" }
      - { name: lang, type: enum, required: true, allowed_values: [en, bn, banglish] }
      - { name: provenance, type: enum, required: true, allowed_values: [community, provider, admin] }

  - name: EligibleReview
    owner: Review
    description: "A row of reviews that counts and shows. Read only inside the Review stub (FD-067)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; passed only to PublicEvidenceCount" }
      - { name: public_id, type: string, required: true, unique: true }
      - { name: doctor_id, type: uuid, required: true, references: Doctor.id }
      - { name: branch_id, type: uuid, required: false, references: FacilityBranch.id, constraints: "where the doctor was seen; lists the branch on a condition page; never feeds a facility figure (BR2.7)" }
      - { name: author_persona_id, type: uuid, required: true, references: Persona.id, constraints: "never projected" }
      - { name: relationship, type: enum, required: true, allowed_values: [self, parent, family, witness] }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative] }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: period_year, type: integer, required: true }
      - { name: period_month, type: integer, required: true, min: 1, max: 12 }
      - { name: title, type: text, required: true, constraints: "original wording" }
      - { name: body, type: text, required: false }
      - { name: sections, type: "map<symptoms|diagnosis|treatment|after, text>", required: false }
      - { name: published_at, type: timestamp, required: false }
      - { name: deleted_at, type: timestamp, required: false }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL AND published_at IS NOT NULL AND its doctor is published and not merged, in SQL, in every read (BR1.3)"
      - "exact_date_enc is private and is never selected"
    relationships:
      - { to: ReviewTag, cardinality: "one-to-many", direction: "EligibleReview has ReviewTag" }

  - name: ReviewTag
    owner: Review
    description: "One tag on a review (table review_tags): a term, a free-text wording or Not sure."
    attributes:
      - { name: review_id, type: uuid, required: true, references: EligibleReview.id }
      - { name: group, type: enum, required: true, allowed_values: [symptom, condition, treatment, medicine] }
      - { name: term_id, type: uuid, required: false, references: TaxonomyTerm.id }
      - { name: free_text, type: text, required: false, constraints: "original wording; the seed stores the Bengali text (ISS-161)" }
      - { name: not_sure, type: boolean, required: true, default: false }
      - { name: created_at, type: timestamp, required: true, constraints: "tag order (BR3.9)" }
    constraints:
      - "Exactly one of term_id, free_text, not_sure (database check)"
      - "A condition tag makes its review about a term by BR1.7 (term link or FD-101 free-text match)"

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
      - { name: criteria, type: "map<criterion, good|mixed|poor|null>", required: true, default: "{}", constraints: "criterion is CRITERIA: [staff, waiting, cleanliness, billing, reportTime, reportTrust, admission, recommend, overall]" }
      - { name: state, type: enum, required: true }
      - { name: published_at, type: timestamp, required: false }
      - { name: deleted_at, type: timestamp, required: false }
    constraints:
      - "Eligible = state published AND deleted_at IS NULL AND published_at IS NOT NULL (BR1.4)"
      - "No sentiment: facility feedback is the nine criteria only (the owner's answer to T-203 Question 1)"

  - name: Persona
    owner: Identity
    description: "The public face of an author (table personas). Only its public columns are read, to build a byline."
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: true, constraints: "projected only for named personas" }
      - { name: username, type: text, required: false, constraints: "projected only for pseudonymous personas" }
    constraints:
      - "An anonymous persona projects no name, username or initials (BR2.10)"

  - name: PublicEvidenceCount
    kind: port
    owner: Directory (declares); Evidence (implements, U48)
    description: "The only way this Unit learns how many documents a review has (C17). Takes internal review ids."
    attributes:
      - { name: countPublicEvidence, type: "(reviewId) -> integer", required: true, constraints: "C17, frozen at U46's merge" }
      - { name: countPublicEvidenceByReview, type: "(reviewIds) -> map<reviewId, integer>", required: true, constraints: "added by U46 (Question 8); a review absent from the map counts 0; frozen at U46's merge" }

  - name: ProvenanceEntry
    kind: value_object
    description: "Where one profile field came from and when it last changed (one entry of field_provenance)."
    attributes:
      - { name: source, type: enum, required: true, allowed_values: [community, provider, admin] }
      - { name: updated_at, type: timestamp, required: true }
      - { name: hidden, type: boolean, required: false, default: false, constraints: "read-only convention; a hidden field is omitted (BR2.2)" }
    constraints:
      - "A populated field with no entry is shown as community, dated by the profile's updated_at, else created_at (BR2.11)"

  - name: Distribution
    kind: value_object
    description: "How eligible accounts spread over one enum. Produced by domain/review/policies.ts distribution()."
    attributes:
      - { name: keys, type: "list<enum value>", required: true, constraints: "render order: sentiment [positive, mixed, negative]; outcome [helped, none, worse, uncertain]; criterion [good, mixed, poor]" }
      - { name: counts, type: "map<key, integer>", required: true, min: 0, constraints: "every key present, zero included" }
      - { name: total, type: integer, required: true, min: 0, constraints: "accounts with a recognised value; the denominator" }
      - { name: not_provided, type: integer, required: true, min: 0, constraints: "eligible accounts with no value" }
      - { name: empty, type: boolean, required: true, constraints: "total = 0" }
      - { name: limited_data, type: boolean, required: true, constraints: "0 < total < threshold" }
    constraints:
      - "No percentage, average, score or rank (BR2.1)"

  - name: Byline
    kind: value_object
    description: "How an author is attributed on a card."
    attributes:
      - { name: persona_kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: false, constraints: "named only" }
      - { name: username, type: text, required: false, constraints: "pseudonymous only" }
      - { name: initials, type: text, required: false, constraints: "named and pseudonymous only" }
```

## Summary

- **Directory** (`Doctor`, `ProfileSubmission`, `DoctorChamber`, `Facility`, `FacilityBranch`): read by the six directory queries; `addMemberDoctor` writes a doctor, an optional chamber and a pending submission (FD-100). A doctor is visible when published and not merged; a branch when it and its organisation are published; a doctor is at a branch only through a chamber. A pending submission marks its doctor "not confirmed". A branch gains an optional own name and a hue without any change to what `name_*` holds, so pages on databases seeded before this Unit keep today's titles.
- **Taxonomy** (`TaxonomyTerm`, `TaxonomyAlias`): read by the four taxonomy queries; written by the provisional-term operation and `createProvisional`. The Unit adds `suggested`, `suggested_order` and the open-provisional key. `canonical_id` is read as a redirect, though nothing sets it in release 1.
- **Review side** (`EligibleReview`, `ReviewTag`, `FacilityReview`, `Persona`): read only inside the Review stub. Doctor figures read `reviews` by `doctor_id`; facility figures read `facility_reviews` by `branch_id` as nine criteria; the two never meet. Documents are counted only through the `PublicEvidenceCount` port; no Unit-46 query names `evidence_items`.
- **Value objects**: `ProvenanceEntry`, `Distribution` (every key, total, not provided, empty, limited data) and `Byline` (no name at all for anonymous personas).
