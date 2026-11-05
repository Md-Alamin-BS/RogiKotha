# Entities — U22 `t-302-review-changes-and-tombstones` (release 1)

U22 adds **no table, no column and no migration**. It changes the content columns of an existing `reviews` row (U47 ENT-001) and appends `review_versions` rows (U47 ENT-003) with `change_kind correction`. The only schema-file change is the comment on `review_versions.actor_id` (Question 8). The input, the edit view model and the history view model are new contract types in `packages/contracts`. The YAML block is the source of truth; the ER view in `functional-spec.md` is derived from it.

```yaml
entities:
  - id: ENT-101
    name: Review (correction view of U47 ENT-001)
    kind: aggregate root (table reviews), owned by U47; U22 changes content only
    description: "What a correction may change on a published review, and what it never changes."
    attributes:
      - { name: title, type: text, required: true, max: 120, constraints: "author's title, or derived by U47 BR3.6 when the edit leaves it empty" }
      - { name: body, type: text, required: false, constraints: "quick kind only; 20..10000 graphemes after trim; stored as written" }
      - { name: sections, type: json, required: false, constraints: "detailed kind only: {symptoms?, diagnosis?, treatment?, after?}, each 1..5000 graphemes, empty keys absent, at least one present, all together at least 20 graphemes" }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative] }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: claims, type: json, required: true, constraints: "[{label}]; new labels only wrongDx | wrongRx | secondOpinion; a seeded free-text label may be kept or removed, never added or reworded" }
      - { name: language, type: enum, required: true, allowed_values: [en, bn, mixed], constraints: "recomputed from the new title and text (U47 BR3.7)" }
      - { name: version, type: integer, required: true, constraints: "incremented by exactly 1 per accepted correction; equals the newest review_versions.version" }
      - { name: updated_at, type: timestamp, required: true, constraints: "set to now on an accepted correction" }
    constraints:
      - "never changed by a correction: id, public_id, author_persona_id, doctor_id, branch_id, kind, relationship, identity_mode, period_year, period_month, exact_date_enc, state, published_at, attestation_at, tags"
      - "only an eligible review (U46 BR1.3 predicate, used by U47's isReviewPublished) can be corrected"

  - id: ENT-102
    name: ReviewVersion (correction row)
    kind: entity (table review_versions), append-only (0003_triggers.sql)
    description: "One row per accepted author correction; version n holds the full content of version n."
    attributes:
      - { name: review_id, type: uuid, required: true, references: reviews.id }
      - { name: version, type: integer, required: true, constraints: "previous reviews.version + 1, written in the same transaction as the update" }
      - { name: snapshot, type: json, required: true, constraints: "{kind, title, body | sections, sentiment, outcome, claims, corrected: CorrectionField[]}; never an account id, a persona id, the exact date, the doctor or any identity field" }
      - { name: change_kind, type: enum, required: true, allowed_values: [correction], constraints: "U22 writes correction only; publish is U47's" }
      - { name: reason, type: text, required: false, constraints: "always null in release 1 (Question 3)" }
      - { name: actor_kind, type: enum, required: true, allowed_values: [author] }
      - { name: actor_id, type: uuid, required: true, constraints: "reviews.author_persona_id of the corrected review, never the account id (U47 FD row 4, Question 8)" }
      - { name: created_at, type: timestamp, required: true, constraints: "the correction time; the history shows its month and year in Asia/Dhaka" }
    constraints:
      - "never updated or deleted (trigger); retention purge is release 2 (FD-004)"
      - "corrected is empty exactly when only the title changed; a row without a corrected key (demo-era correction rows, U47 and seed publish rows) is read as corrected: [] (review R-05)"
      - "the snapshot of the version just before a material correction is public through Show original (Question 3); every snapshot is therefore written as public-safe text only"
    relationships:
      - { to: Review, cardinality: "n..1", direction: "a version belongs to one review" }

  - id: ENT-103
    name: CorrectionField
    kind: value object (enum in packages/contracts, as const)
    description: "The material parts of a review a correction can name."
    attributes:
      - { name: value, type: enum, required: true, allowed_values: [story, symptoms, diagnosis, treatment, after, sentiment, outcome, claims] }
    constraints:
      - "story is the quick body; symptoms, diagnosis, treatment and after are the detailed sections; title is never a CorrectionField (presentation, Question 2)"
      - "a list of CorrectionField is kept in this fixed order and has no duplicates"

  - id: ENT-104
    name: CorrectReviewInput
    kind: contract (packages/contracts/src/schemas/review.ts, replaces the T-003 stub)
    description: "What the edit form sends; strict, so no other key is accepted."
    attributes:
      - { name: publicId, type: public id, required: true }
      - { name: expectedVersion, type: integer, required: true, min: 1 }
      - { name: title, type: text, required: true, constraints: "0..120 graphemes after trim; empty means derive (U47 BR3.6)" }
      - { name: content, type: "union", required: true, constraints: "{kind: quick, story} | {kind: detailed, sections: {symptoms?, diagnosis?, treatment?, after?}}; must match the stored kind" }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative] }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain] }
      - { name: claims, type: "list of text", required: true, constraints: "codes wrongDx | wrongRx | secondOpinion, or a seeded label kept exactly as stored; no duplicates" }
    constraints:
      - "no key for doctor, relationship, period, exact date, identity mode, tags, persona or account (strict schema)"

  - id: ENT-105
    name: EditReviewVM
    kind: view model (packages/contracts/src/view-models/experience.ts)
    description: "The author's current content for the edit form; produced only for the author."
    attributes:
      - { name: publicId, type: public id, required: true }
      - { name: kind, type: enum, required: true, allowed_values: [quick, detailed] }
      - { name: version, type: integer, required: true }
      - { name: title, type: text, required: true }
      - { name: story, type: text, required: false, constraints: "quick only" }
      - { name: sections, type: json, required: false, constraints: "detailed only" }
      - { name: sentiment, type: enum, required: false }
      - { name: outcome, type: enum, required: false }
      - { name: claims, type: "list of text", required: true }
      - { name: doctorName, type: text, required: false, constraints: "read-only display; null renders Not provided" }
    constraints:
      - "no internal id, persona id, account id, identity mode label or exact date"

  - id: ENT-106
    name: ReviewHistoryVM
    kind: view model (packages/contracts/src/view-models/experience.ts), the result of review.getHistory (C9)
    attributes:
      - { name: editedAt, type: "ISO date", required: false, constraints: "the newest correction version's created_at; absent when never edited" }
      - { name: corrections, type: "list of {at: ISO date, fields: CorrectionField[], original: OriginalTextVM}", required: true, default: "[]", constraints: "one entry per version with a non-empty corrected list, oldest first; original is the content of the version just before that correction" }
      - { name: "OriginalTextVM", type: "{kind, title, story? | sections?, sentiment?, outcome?, claims?}", required: true, constraints: "read from the previous version snapshot; a key the snapshot lacks (partial seed rows) is absent, never rendered as Not provided or 0; kind inferred from body or sections when the snapshot has none" }
      - { name: versions, type: "list of {version, at, kind: published | edited | corrected, fields: CorrectionField[]}", required: false, constraints: "present only when the actor is the author (isReviewAuthor); newest first" }
    constraints:
      - "never an actor_id, persona id, account id, reason, exact date, or the text of a version that no material correction followed"
      - "C9 writes corrections as [{at, field}]; this design groups the fields of one version under one date and adds original, a recorded additive refinement of the C9 note"
```

## Summary

U22 owns no new storage. A correction changes the content columns of one published review (ENT-101) and appends one version row (ENT-102) that carries the full new content, the list of material parts changed (ENT-103) and the author persona as actor. The edit form sends a strict `CorrectReviewInput` (ENT-104) that cannot carry identity, doctor, period or tags, and reads an `EditReviewVM` (ENT-105) built only for the author. The history slot reads `ReviewHistoryVM` (ENT-106). Every reader gets the Edited date and the dated correction lines, each with the original text before it. Only the author gets the version list.
