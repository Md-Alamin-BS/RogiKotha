# Entities — U47 `u47-reviews`

U47 adds **no table and no migration**. The tables `reviews`, `review_tags`, `review_versions`, `review_drafts` and `facility_reviews` exist on `main` (T-005). Their release-1 meaning is pinned below. The FD-090 worker grant on `review_drafts` belongs to T-309's purge job, which is deferred, so it is not applied now (Question 1). The view models and the draft payload are new contract types in `packages/contracts`. The YAML block is the source of truth, and the ER view in `functional-spec.md` is derived from it.

```yaml
entities:
  - id: ENT-001
    name: Review
    kind: aggregate root (table reviews)
    description: "One published experience of care by one doctor, written by one persona. Release 1 inserts it only in state published; changing its content is U22's, and changing its state is release 2."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "internal; never reaches the browser, a page or a slot (C9 review_ids)" }
      - { name: public_id, type: public id, required: true, unique: true, constraints: "the only id pages, slots, actions and URLs see" }
      - { name: author_persona_id, type: uuid, required: true, references: personas.id, constraints: "from identity.personaFor; the review module never reads persona_links" }
      - { name: doctor_id, type: uuid, required: true, references: doctors.id, constraints: "a visible doctor (U46 predicate) or the one addMemberDoctor returns" }
      - { name: branch_id, type: uuid, required: false, references: facility_branches.id, constraints: "not set by the release-1 composer (null)" }
      - { name: kind, type: enum, required: true, allowed_values: [quick, detailed] }
      - { name: relationship, type: enum, required: true, allowed_values: [self, parent, family, witness] }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: sentiment, type: enum, required: false, allowed_values: [positive, mixed, negative], constraints: "optional (FR45 constant); null renders Not provided" }
      - { name: outcome, type: enum, required: false, allowed_values: [helped, none, worse, uncertain], constraints: "optional; null renders Not provided" }
      - { name: period_year, type: integer, required: true, min: 2000 }
      - { name: period_month, type: integer, required: true, min: 1, max: 12, constraints: "year and month not after the current month (Asia/Dhaka)" }
      - { name: exact_date_enc, type: bytes, required: false, constraints: "encrypted ISO date inside the period month; never projected publicly (FR42)" }
      - { name: title, type: text, required: true, max: 120, constraints: "author's title or derived (BR3.6); stored as written" }
      - { name: body, type: text, required: false, max: 10000, constraints: "quick kind only; 20..10000 graphemes; stored exactly as written (FR92)" }
      - { name: sections, type: json, required: false, constraints: "detailed kind only: {symptoms?, diagnosis?, treatment?, after?}, each 1..5000 graphemes, empty keys absent" }
      - { name: claims, type: json, required: true, default: "[]", constraints: "[{label}] with label one of wrongDx | wrongRx | secondOpinion for new reviews; seeded free-text labels are kept as written" }
      - { name: language, type: enum, required: true, allowed_values: [en, bn, mixed], constraints: "detected from script (BR3.7)" }
      - { name: state, type: enum, required: true, constraints: "release 1 writes published only" }
      - { name: published_at, type: timestamp, required: false, constraints: "set at publish" }
      - { name: attestation_at, type: timestamp, required: true, constraints: "set at publish (FD-014 attestation)" }
      - { name: version, type: integer, required: true, default: 1 }
    constraints:
      - "eligible (public) = U46's imported predicate (U46 BR1.3, from repositories/review-reads.ts): state published AND deleted_at null AND published_at not null AND the joined doctor published and not merged; one predicate on main"
      - "kind quick → body set, sections null; kind detailed → sections set, body null"
    relationships:
      - { to: ReviewTag, cardinality: "1..n", direction: "review owns tags" }
      - { to: ReviewVersion, cardinality: "1..n", direction: "review owns versions" }
      - { to: Persona (U11), cardinality: "n..1", direction: "review references its author persona" }
      - { to: Doctor (U46), cardinality: "n..1", direction: "review references a doctor" }

  - id: ENT-002
    name: ReviewTag
    kind: entity (table review_tags)
    attributes:
      - { name: review_id, type: uuid, required: true, references: reviews.id }
      - { name: group, type: enum, required: true, allowed_values: [symptom, condition, treatment, medicine] }
      - { name: term_id, type: uuid, required: false, references: taxonomy_terms.id, constraints: "suggested chip, or the term ensureProvisionalTerm returned for typed text" }
      - { name: not_sure, type: boolean, required: true, default: false, constraints: "group condition" }
      - { name: free_text, type: text, required: false, constraints: "not written by release 1 (Question 8); seeded rows keep theirs" }
    constraints:
      - "exactly one of term_id, free_text, not_sure (database check)"
      - "at most 20 tags per review; no duplicate (group, term_id)"

  - id: ENT-003
    name: ReviewVersion
    kind: entity (table review_versions)
    description: "Release 1 writes version 1 at publish; U22 writes corrections."
    attributes:
      - { name: review_id, type: uuid, required: true, references: reviews.id }
      - { name: version, type: integer, required: true, constraints: "1 at publish" }
      - { name: snapshot, type: json, required: true, constraints: "{kind, title, body | sections, sentiment, outcome, claims}; no persona, account or exact date" }
      - { name: change_kind, type: enum, required: true, allowed_values: [publish, correction, moderation_redaction, restore], constraints: "publish only, written by U47" }
      - { name: actor_kind, type: enum, required: true, constraints: "author" }
      - { name: actor_id, type: uuid, required: false, constraints: "the author persona id, never the account id (Question 5)" }

  - id: ENT-004
    name: ReviewDraft
    kind: entity (table review_drafts)
    description: "The author's private work in progress; one row per composer session; deleted when it is published."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "seen by its owner only, as draftId" }
      - { name: account_id, type: uuid, required: true, references: account_profiles.id, constraints: "from Actor.accountId only" }
      - { name: kind, type: enum, required: true, allowed_values: [quick, detailed], constraints: "mirror of payload.mode; a facility draft is quick" }
      - { name: payload_enc, type: bytes, required: true, constraints: "Crypto.encrypt of the DraftPayload JSON" }
      - { name: doctor_id, type: uuid, required: false, constraints: "mirror when payload.doctorPublicId names a visible doctor; else null" }
      - { name: blocked_on_submission_id, type: uuid, required: false, constraints: "always null in release 1 (FD-100 publishes the doctor at once)" }
      - { name: updated_at, type: timestamp, required: true }
      - { name: expires_at, type: timestamp, required: true, constraints: "last save + 30 days" }
    constraints:
      - "live = expires_at > now; an expired or unreadable draft is not_found to its owner and never listed"
      - "at most 10 live drafts per account (BR2.6); the owner may discard one"
      - "review_id is not written by release 1"

  - id: ENT-005
    name: FacilityVisitAccount
    kind: aggregate root (table facility_reviews)
    description: "Structured, non-scored feedback about one facility branch (US4.3, FR27). Never joins a doctor's summaries."
    attributes:
      - { name: public_id, type: public id, required: true, unique: true }
      - { name: author_persona_id, type: uuid, required: true, references: personas.id }
      - { name: branch_id, type: uuid, required: true, references: facility_branches.id, constraints: "a visible branch (U46 predicate)" }
      - { name: identity_mode, type: enum, required: true, allowed_values: [named, pseudonymous], constraints: "anonymous deferred (Question 4)" }
      - { name: period_year, type: integer, required: true }
      - { name: period_month, type: integer, required: true }
      - { name: body, type: text, required: true, constraints: "20..10000 graphemes, as written" }
      - { name: criteria, type: json, required: true, constraints: "every CRITERIA key present; value good | mixed | poor | null; no score" }
      - { name: state, type: enum, required: true, constraints: "published" }

  - id: ENT-006
    name: DraftPayload
    kind: value object (packages/contracts/src/schemas/review.ts)
    description: "The composer's state, encrypted inside a draft. Lenient on save (every field optional), strict at publish."
    attributes:
      - { name: v, type: integer, required: true, default: 1 }
      - { name: target, type: enum, required: true, allowed_values: [doctor, facility], default: doctor }
      - { name: mode, type: enum, required: true, allowed_values: [quick, detailed], default: quick }
      - { name: step, type: integer, required: true, min: 1, max: 4, default: 1 }
      - { name: doctorPublicId, type: public id, required: false }
      - { name: newDoctor, type: object, required: false, constraints: "{name 3+ letters after a title, ≤120; specialtyId? uuid; practiceArea? ≤200; bmdc? [A-Za-z0-9-]{0,20}}; mutually exclusive with doctorPublicId" }
      - { name: branchPublicId, type: public id, required: false, constraints: "target facility only" }
      - { name: relationship, type: enum, required: false }
      - { name: period, type: object, required: false, constraints: "{year, month}" }
      - { name: exactDate, type: text, required: false, constraints: "YYYY-MM-DD" }
      - { name: title, type: text, required: false, max: 120 }
      - { name: story, type: text, required: false, max: 10000 }
      - { name: sections, type: object, required: false, constraints: "{symptoms?, diagnosis?, treatment?, after?} each ≤5000" }
      - { name: tags, type: list, required: false, default: "[]", constraints: "[{group, termPublicId} | {group, text ≤60}], ≤20" }
      - { name: notSure, type: boolean, required: false, default: false }
      - { name: sentiment, type: enum, required: false }
      - { name: outcome, type: enum, required: false }
      - { name: claims, type: list, required: false, default: "[]", constraints: "subset of [wrongDx, wrongRx, secondOpinion]" }
      - { name: criteria, type: object, required: false, constraints: "facility only; CRITERIA key → good | mixed | poor" }
      - { name: identityMode, type: enum, required: false, default: pseudonymous }
      - { name: dismissedChecks, type: list, required: false, constraints: "subset of [pii, emerg, dup]" }
    constraints:
      - "unknown keys are dropped on parse; control or format characters (other than line breaks and tabs in long text) are refused"

  - id: ENT-007
    name: ExperiencePageVM
    kind: view model (packages/contracts/src/view-models/experience.ts, replaces the T-003 stub)
    description: "The public projection of one eligible review, also returned by review.preview. Built by one pure function."
    attributes:
      - { name: kind, type: literal, required: true, allowed_values: [experience] }
      - { name: publicId, type: public id, required: false, constraints: "absent in a preview" }
      - { name: reviewKind, type: enum, required: true, allowed_values: [quick, detailed] }
      - { name: title, type: text, required: true }
      - { name: story, type: text, required: false, constraints: "quick" }
      - { name: sections, type: list, required: true, constraints: "[{key, body}] in order symptoms, diagnosis, treatment, after; empty ones absent" }
      - { name: contentLanguage, type: enum, required: true, allowed_values: [en, bn, mixed] }
      - { name: relationship, type: enum, required: true }
      - { name: sentiment, type: enum, required: false, constraints: "absent → Not provided" }
      - { name: outcome, type: enum, required: false, constraints: "absent → Not provided" }
      - { name: period, type: object, required: true, constraints: "{year, month}; never a day" }
      - { name: publishedAt, type: iso date, required: false }
      - { name: claims, type: list, required: true, constraints: "[{code} | {text}]; always rendered under Reviewer's label" }
      - { name: tags, type: list, required: true, constraints: "[{group, name, provisional, conditionPublicId?} | {group: condition, notSure: true}]" }
      - { name: doctor, type: object, required: true, constraints: "{publicId, name, specialty?, memberAddedNotConfirmed}; the page always adds Registration not verified" }
      - { name: byline, type: PageBylineVM, required: true }
      - { name: relatedByCondition, type: list, required: true, constraints: "ExperienceCardVM ≤6, never the page's own review" }
      - { name: sameDoctor, type: list, required: true, constraints: "ExperienceCardVM ≤6" }
      - { name: otherByAuthor, type: list, required: true, constraints: "ExperienceCardVM ≤10; [] for anonymous and in a preview" }
    constraints:
      - "never an internal id, account id, email, persona id, exact date, attestation time, evidence item, like, dislike, comment count or any number standing for quality"

  - id: ENT-008
    name: PageBylineVM
    kind: view model
    attributes:
      - { name: personaKind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: displayName, type: text, required: false, constraints: "named only" }
      - { name: username, type: text, required: false, constraints: "pseudonymous only; used for the /authors link" }
      - { name: alias, type: text, required: false, constraints: "anonymous only, on the experience page only; null for a legacy row or a preview" }
    constraints:
      - "anonymous: never username, displayName, initials or a link"

  - id: ENT-009
    name: ComposerVM
    kind: view model (packages/contracts/src/view-models/composer.ts, replaces the stub)
    attributes:
      - { name: doctors, type: list, required: true, constraints: "[{publicId, label}] from directory.listDoctors, ≤100" }
      - { name: branches, type: list, required: true, constraints: "[{publicId, label}] from directory.listFacilities; [] when facility feedback is off" }
      - { name: specialties, type: list, required: true, constraints: "[{id, name}] from taxonomy.listSpecialties" }
      - { name: suggestedTags, type: object, required: true, constraints: "group → [{termPublicId, name}] from taxonomy.listSuggested" }
      - { name: names, type: object, required: true, constraints: "{named: displayName, pseudonymous: username} from account.getOwnAccount" }
      - { name: draft, type: object, required: false, constraints: "{draftId, payload, expiresAt}" }
      - { name: emergencyNumbers, type: object, required: true, constraints: "from ConfigProvider emergency.*" }

  - id: ENT-010
    name: DraftSummaryVM
    kind: view model
    attributes:
      - { name: draftId, type: uuid, required: true }
      - { name: title, type: text, required: false, constraints: "author title or derived; null → Untitled draft" }
      - { name: target, type: enum, required: true, allowed_values: [doctor, facility] }
      - { name: updatedAt, type: iso date, required: true }
      - { name: expiresAt, type: iso date, required: true }

  - id: ENT-011
    name: OwnReviewVM
    kind: view model
    description: "One row of the author's own list on /me; structurally equal to DemoOwnReviewRow so ProfileWorkspace is unchanged."
    attributes:
      - { name: publicId, type: public id, required: true }
      - { name: title, type: text, required: true }
      - { name: doctorName, type: text, required: true }
      - { name: state, type: enum, required: true, allowed_values: [published, hidden, removed, other] }
      - { name: publishedAt, type: timestamp, required: false }
      - { name: edited, type: boolean, required: true }

  - id: ENT-012
    name: ReviewModulePorts
    kind: module ports (packages/application/src/modules/review/ports.ts, C19)
    attributes:
      - { name: reviews, type: ReviewRepository, required: true, constraints: "write side added by U47 beside U46's read methods" }
      - { name: identity, type: "Pick<IdentityModule, personaFor | publicProjection | publicProjections | publicPersonaIdsByUsername>", required: true }
      - { name: ownership, type: IdentityOwnership, required: true, constraints: "ownsPersona, ownPersonaIds; review and community only" }
      - { name: directory, type: "{ addMemberDoctor }", required: true }
      - { name: taxonomy, type: "{ ensureProvisionalTerm }", required: true }
      - { name: cards, type: "U46 listExperienceCards", required: true }
    constraints:
      - "CommandPorts is not extended; crypto, clock, ids, rateLimiter, config, audit, outbox, logger, unitOfWork come from T-101's CommandPorts at call time"
      - "reviews is ReviewModuleRepository (ports/repositories/review.ts, write side), implemented by PgReviewModuleRepository in packages/database/src/repositories/review-module.ts"

  - id: ENT-013
    name: ReviewSeams and ReviewModule
    kind: module types (packages/application/src/modules/review/module.ts, exported through modules/review/index.ts)
    description: "The pinned calling convention of the C9 seams (functional-spec.md § 2.1). createReviewModule(deps: ReviewModulePorts) returns ReviewModule; ReviewSeams is the part other modules Pick."
    attributes:
      - { name: reviewIdForPublicId, type: "(tx: Tx, {publicId: string}) => Promise<string | null>", required: true }
      - { name: isReviewAuthor, type: "(tx: Tx, {reviewId: string, actor: Actor}) => Promise<boolean>", required: true }
      - { name: isReviewPublished, type: "(tx: Tx, {reviewId: string}) => Promise<boolean>", required: true }
      - { name: lastEditedAt, type: "(tx: Tx, {reviewId: string}) => Promise<string | null>", required: true, constraints: "ReviewModule only, not in ReviewSeams" }
      - { name: "commands and queries", type: "Command<I, O> (defineCommand, defineQuery)", required: true, constraints: "saveDraft, discardDraft, publish, facilityReviewPublish, getDraft, listOwnDrafts, preview, getExperience, countExperiences, authorCards, listOwnReviews, hasOwnReviewOfDoctor; run by runCommand in server/command-call.ts" }
    constraints:
      - "Tx is ports/unit-of-work.ts Tx, valid inside unitOfWork.read and unitOfWork.run; the seams never open a transaction"
      - "the web tier reaches the module as getContainer().review (field added to WebContainer in U47's append-only block); other modules receive Pick<ReviewSeams, ...> in their own factory deps in container.ts"
```

## Summary

- **Review** (ENT-001) is the aggregate. U47 inserts it with its tags (ENT-002) and version 1 (ENT-003) in one transaction. The publicly visible set is U46's eligibility predicate, imported so that `main` keeps one predicate.
- **ReviewDraft** (ENT-004) holds an encrypted **DraftPayload** (ENT-006). It is private to its account, lives 30 days after its last save, and is deleted when it is published.
- **FacilityVisitAccount** (ENT-005) is separate and has no score. Release 1 offers only named or pseudonymous authorship for it.
- **ExperiencePageVM** (ENT-007) with **PageBylineVM** (ENT-008) is the one public shape of a review. The preview returns the same type. It carries no id other than the public id, no private field and no quality number.
- **ComposerVM**, **DraftSummaryVM** and **OwnReviewVM** (ENT-009 to ENT-011) are the composer's and the author's private views.
- **ReviewModulePorts** (ENT-012) lists the seams the factory receives. The module calls Identity, Directory and Taxonomy only through these seams.
- **ReviewSeams and ReviewModule** (ENT-013) pin what the factory returns and how U22, U48, U49 and the web tier call the seams: the caller's `Tx` first, through `getContainer().review` or factory deps.
