# Entities — U25 `t-305-privacy-preview-redaction-publish`

Source of truth for the data shape this Unit writes and reads. Built from T-305, `02-data-model.md` §7, §16 and §17, `contract-summary.md` (C8, C12, C14, C15), the schema on `main` (`packages/database/src/schema/evidence.ts`, `0003_triggers.sql`, `0004_deferred_fks.sql`), the contracts (`schemas/evidence.ts`, `view-models/evidence.ts`, `actor.ts`), the U21, U22, U10 and U24 design drafts and the answers in `functional-design-questions.md`. Workflows, ports and view models are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds **no table and no column**. Its one migration is the partial unique index `evidence_artifacts_current_uq` (BR2.7); it also drops `NOT NULL` on `evidence_items.review_id` only if U23 did not (F1). It writes columns that exist and are unused until now (`superseded_by_id`, `public`, `published_artifact_id`, `retention_expires_at`, `evidence_redactions`). Entities owned by another component are listed because this Unit's operations cross them; the owner is named on each.

```yaml
entities:
  - name: EvidenceItem
    owner: Evidence
    description: "One uploaded image and its lifecycle; columns this Unit reads or writes (intake columns are U23's, processing columns U24's)"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "primary key; internal; never in a public view model, URL or log beyond ids-only log lines (BR5.3, BR8.5); the author's preview and original routes use it (owner-only and staff-only)" }
      - { name: public_id, type: text, required: true, constraints: "the only item id on public pages and in download filenames (BR5.7, BR6.7)" }
      - { name: review_id, type: uuid, required: false, references: Review.id, constraints: "null while the item belongs to a draft (U23 makes it nullable, F1); set by bindToReview or publish (BR4.2, BR4.6); never changed once set" }
      - { name: group, type: enum, required: true, allowed_values: [reviewed, later, outcome], constraints: "EVIDENCE_GROUPS; groups the public section (BR5.9) and search presence (BR5.5)" }
      - { name: label_en, type: text, required: false, constraints: "seed labels only; uploads have none; public label by actor.locale" }
      - { name: label_bn, type: text, required: false, constraints: "as label_en" }
      - { name: state, type: enum, required: true, allowed_values: [quarantined, validating, scanning, sanitising, preview_ready, privacy_confirmed, published, original_expired, failed, rejected, removed], constraints: "this Unit writes privacy_confirmed, published, original_expired and removed (functional-spec.md § 5.1); public states are published and original_expired (BR5.1)" }
      - { name: fail_reason, type: enum, required: false, constraints: "read only: failed(malware) blocks original access (BR6.3); never public (BR5.4)" }
      - { name: declared_mime, type: enum, required: true, allowed_values: [image/jpeg, image/png], constraints: "fallback Content-Type of an original (BR6.7)" }
      - { name: detected_mime, type: enum, required: false, allowed_values: [image/jpeg, image/png], constraints: "preferred Content-Type of an original" }
      - { name: original_filename_enc, type: bytea, required: true, constraints: "never read by this Unit; never used as a download name (BR6.7); worker has no SELECT (ISS-139)" }
      - { name: page_count, type: integer, required: true, default: 1, constraints: "1 in Phase 1 (FD-036); pageNo other than 1 is not_found (BR1.1)" }
      - { name: uploaded_by_account_id, type: uuid, required: true, references: Account.id, constraints: "the one private account link; owner checks only (BR1.1-BR1.3); never in custody, audit, view model or log (BR8.1, FD entry (a)); carried in the outbox event for notification routing only (C15)" }
      - { name: retention_expires_at, type: timestamp, required: false, constraints: "set once at publish to now + originalDays (BR4.4); never changed by this Unit (FD-020)" }
      - { name: hold_id, type: uuid, required: false, references: LegalHold.id, constraints: "read by U29's purge caller, not here (FD-073); U29 may add hold-based hiding to isPubliclyServable (BR5.6)" }
      - { name: published_artifact_id, type: uuid, required: false, references: EvidenceArtifact.id, constraints: "the current page at publish (BR4.4); deferrable key (0004)" }
      - { name: updated_at, type: timestamp, required: false, constraints: "set on every state write" }
    constraints:
      - "Owner check: uploaded_by_account_id = actor.accountId (BR1.1-BR1.3); a non-owner gets forbidden (command) or 404 (route) (BR1.11)"
      - "Every state write takes the row lock (FOR UPDATE) first (BR2.8, BR3.3, BR4.2)"
      - "Partial index evidence_items_retention_expires_at_idx covers hold_id IS NULL AND state = 'published'; an original_expired item leaves it, which is correct (nothing left to expire)"

  - name: EvidenceArtifact
    owner: Evidence
    description: "A stored file of an item: the original, and page and thumbnail rows of which one each is current"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "primary key (UUIDv7); appears in public artifact URLs for current page and thumbnail only (F17 accepted)" }
      - { name: item_id, type: uuid, required: true, references: EvidenceItem.id }
      - { name: kind, type: enum, required: true, allowed_values: [original, page_png, thumbnail], constraints: "derivative_pdf is not written (FD-036); page_png may hold a JPEG (the name is historical, Question 8)" }
      - { name: page_no, type: integer, required: false, constraints: "1 for page_png and thumbnail; null for original" }
      - { name: storage_key, type: text, required: true, constraints: "unique; never in a view model, URL or log (BR5.3, BR8.5); redaction keys private/<itemId>/page-1-<artifactId>.<ext> and thumbnail-1-<artifactId>.<ext>, unique per attempt (WF2)" }
      - { name: sha256, type: text, required: true, constraints: "from Storage.putPrivateDerivative (F14); the public ETag (BR5.7)" }
      - { name: bytes, type: integer, required: true }
      - { name: mime, type: text, required: true, constraints: "Content-Type of every response (BR5.7, BR5.8)" }
      - { name: width, type: integer, required: false, constraints: "page pixels; the coordinate space of rectangles (BR2.1)" }
      - { name: height, type: integer, required: false }
      - { name: sanitiser_version, type: text, required: false, constraints: "ImageRedactor.flatten's version on a redacted artifact" }
      - { name: scanner_version, type: text, required: false, constraints: "copied from the source page on a redacted artifact (same clean scan)" }
      - { name: signature_version, type: text, required: false, constraints: "as scanner_version" }
      - { name: immutable, type: boolean, required: true, default: true, constraints: "bytes are never rewritten; a redaction writes a new row (BR2.6)" }
      - { name: public, type: boolean, required: true, default: false, constraints: "true only on the current page and thumbnail of an item in a public state; set by publish (BR4.3), cleared by removeFile (BR7.2); a necessary, not sufficient, serving condition (BR5.6)" }
      - { name: superseded_by_id, type: uuid, required: false, references: EvidenceArtifact.id, constraints: "set on the old page and thumbnail by a redaction (BR2.6); a superseded row is never public and never served" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "set on an original by purgeOriginal (BR7.3); a deleted row is never served" }
    constraints:
      - "Check evidence_artifacts_original_not_public_check: NOT (kind = 'original' AND public) (exists)"
      - "Current = superseded_by_id IS NULL AND deleted_at IS NULL; unique index evidence_artifacts_current_uq ON (item_id, kind, page_no) WHERE superseded_by_id IS NULL AND deleted_at IS NULL AND kind IN ('page_png','thumbnail') (new, BR2.7)"
      - "Publicly servable = public AND kind IN (page_png, thumbnail) AND current AND item.state IN PUBLIC_EVIDENCE_STATES AND ReviewVisibility.isPublic(item.review_id) (BR5.6); the predicate exists twice (domain isPubliclyServable, repository SQL) because database never imports domain (BR9.1), and both are tested"

  - name: EvidenceRedaction
    owner: Evidence
    description: "One accepted redaction call: the normalised rectangles and the page they were flattened into"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: item_id, type: uuid, required: true, references: EvidenceItem.id }
      - { name: page_no, type: integer, required: true, constraints: "1" }
      - { name: rects, type: "list<{x, y, w, h}>", required: true, constraints: "integers in page pixels after normaliseRects (BR2.2-BR2.4); 1-50 entries; never in audit, custody details or logs (BR8.2, BR8.5)" }
      - { name: applied_to_artifact_id, type: uuid, required: true, references: EvidenceArtifact.id, constraints: "the source page that was superseded; its successor is source.superseded_by_id (BR2.10)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Insert only; count(item_id) drives the skip check (BR3.2)"

  - name: EvidenceCustodyEvent
    owner: Evidence
    description: "Append-only chain of custody (0003_triggers.sql refuses update and delete)"
    attributes:
      - { name: id, type: uuid, required: true, constraints: "the original-access ticket's e claim (BR6.6)" }
      - { name: item_id, type: uuid, required: true, references: EvidenceItem.id }
      - { name: event, type: enum, required: true, allowed_values: [redaction_applied, privacy_confirmed, published, original_accessed, removed, original_expired], constraints: "the values this Unit writes (the enum has more, written by U23 and U24)" }
      - { name: actor, type: text, required: true, allowed_values: ["author", "account:<staffId>", "system:retention", "system:deletion"], constraints: "never account:<uploaderId> (BR8.1, FD entry (a))" }
      - { name: details, type: jsonb, required: true, default: "{}", constraints: "allowlisted per event (BR8.3): redaction_applied {pageNo, count}; privacy_confirmed {redactions, skippedEditing}; published {pageCount}; original_accessed {purpose, reason, staffRole}; removed {by, caseCode?, part?}; original_expired {}" }
      - { name: created_at, type: timestamp, required: true, constraints: "orders the public timeline by the published event (BR5.9)" }
    constraints:
      - "A scan_clean event (written by U24) is the precondition for original access (BR6.3)"
      - "A hard delete of a review cascades here and is refused by the append-only trigger (F19, for U39)"

  - name: AuditEvent
    owner: Platform (AuditWriter, U8)
    description: "Rows this Unit writes on the stream evidence:<itemId>"
    attributes:
      - { name: action, type: enum, required: true, allowed_values: [redaction_applied, privacy_confirmed, original_access, original_access_refused] }
      - { name: actor, type: text, required: true, constraints: "author or account:<staffId> (BR8.1)" }
      - { name: details, type: jsonb, required: true, constraints: "{pageNo, count} | {redactions, skippedEditing} | {purpose, step_up: true} | {code}; never rects, reason text, filenames, storage keys or the uploader's id (BR8.2)" }
    constraints:
      - "original_access_refused is written by defineCommand's onRefused in its own committed transaction (BR6.5)"

  - name: OutboxEvent
    owner: Platform (Outbox, U8; relay U4)
    description: "Events this Unit appends in the same transaction as the state change"
    attributes:
      - { name: type, type: enum, required: true, allowed_values: [evidence.stateChanged, evidence.originalAccessed] }
      - { name: payload, type: json, required: true, constraints: "stateChanged {itemId, reviewId?, state: published | removed, uploaderAccountId} (C15; U24 adds failReason? for its own states); originalAccessed {itemId, custodyEventId} (BR8.4)" }
    constraints:
      - "No event for redaction or confirmation (Question 15)"

  - name: OriginalAccessTicket
    owner: Evidence
    kind: value object (not stored)
    description: "The one-time permission to stream one original"
    attributes:
      - { name: i, type: uuid, required: true, constraints: "item id; must equal the route id" }
      - { name: a, type: uuid, required: true, constraints: "staff account id; must equal actor.accountId" }
      - { name: s, type: text, required: true, constraints: "session id; must equal the current session" }
      - { name: e, type: uuid, required: true, constraints: "custody event id of the granted access; single-use key evidence.original.ticket:<e>" }
      - { name: u, type: timestamp, required: true, constraints: "now + 60 s" }
    constraints:
      - "Signed by Crypto.signClaims under its own HKDF purpose (evidence.original), separate from rk_stepup (T-103 BR on one key per purpose); verified in constant time (BR1.8, BR6.6)"
      - "Single use is enforced by the in-memory RateLimiter per web process (functional-spec.md § 16)"

  - name: RedactionRect
    owner: Evidence
    kind: value object
    attributes:
      - { name: x, type: integer, required: true, constraints: "|value| <= 100000 at parse; clamped to [0, width] (BR2.1, BR2.2)" }
      - { name: y, type: integer, required: true }
      - { name: w, type: integer, required: true, constraints: "may be negative at parse; normalised to a positive extent" }
      - { name: h, type: integer, required: true }

  - name: Review
    owner: Review (U21, U22)
    description: "Read only, through the ReviewVisibility port implemented in modules/review (built here, FD-067)"
    attributes:
      - { name: id, type: uuid, required: true }
      - { name: state, type: enum, required: true, constraints: "isPublic needs published" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "isPublic needs null; an author restore within 30 days clears it and evidence is served again (U22)" }
    constraints:
      - "isPublic(reviewId) = state = 'published' AND deleted_at IS NULL (U22's eligible rule; hidden_pending_review, hidden, deleted_tombstone and soft-deleted rows are not public)"

  - name: RetentionPolicy
    owner: Retention (U29)
    description: "Read only, through OriginalRetentionPolicy.originalDays(tx); interim 90 days until U29 wires it (Question 14)"
```

## View-model shapes (contracts)

| Shape | Fields | Notes |
|---|---|---|
| `EvidenceSectionVM` | `groups: EvidenceGroupVM[3]`, `hasDocuments`, `statusKey: 'evidence.status'`, `noticeKey: 'evidence.notice'` | new; T-308 renders |
| `EvidenceGroupVM` | `group`, `labelKey: 'evidence.group.<g>'`, `items: EvidenceItemVM[]` | an empty group has `items: []` and renders "No documents" |
| `EvidenceItemVM` | `publicId`, `label?`, `pageCount: 1`, `pages: EvidencePageRefVM[]`, `thumbnailUrl`, `downloadUrl` | no internal id, key, filename, state, uploader or hash |
| `EvidencePageRefVM` | `pageNo`, `artifactUrl`, `width`, `height` | URL `/api/evidence/artifacts/<artifactId>` |
| `ViewerDocVM` | `publicId`, `label?`, `pages`, `downloadUrl` | `itemId` replaced |
| `AuthorEvidenceItemVM` (U23's, extended) | `previewPages: [{pageNo, url, width, height}]`, `redactionCount`, `needsSkipAcknowledgement` | owner only; preview URL uses the internal id (owner route) |
| `ExperiencePageVM` (U21's) | `evidenceGroups` from the section, `hasDocuments` | filled in `get-experience.ts` and `preview.ts` (BR5.10) |
| Inputs | `ApplyRedactionInput {itemId, pageNo: 1, rects: RedactionRect[1..200]}`, `ConfirmPrivacyInput {itemId, confirmed: boolean, skipEditing?: true}`, `AuthorizeOriginalInput {itemId, purpose, reason}`, `PublishEvidenceInput {reviewId, itemIds}`, `GetPreviewPageInput {itemId, pageNo}`, `PresenceForReviewInput {reviewId}` | `AuthorizeOriginalInput` replaces `ReadOriginalEvidenceInput` |
| Enums | `ORIGINAL_ACCESS_PURPOSES = [moderation_case, legal_request, author_request, security_review]`, `PUBLIC_EVIDENCE_STATES = [published, original_expired]` | `as const` in `enums.ts` |

## Data boundaries

- **Public:** current page and thumbnail bytes of a publicly visible item, its public id, label, group and page size. Nothing else leaves the server for a reader (BR5.3).
- **Author only:** the processed preview, redaction count and states of their own items (`getForAuthor`, preview route).
- **Staff with `evidence.original` + approved device + step-up:** one original per ticket (BR1.7, BR1.8). Custody details (including the staff reason) are staff data for T-407; they never name the uploader (BR8.1).
- **Never readable:** `original_filename_enc` (no reader in this Unit), `storage_key` outside the server, `uploaded_by_account_id` outside owner checks and the outbox routing field.
- **Worker:** reads `evidence_items` for `presenceForReview`; calls `purgeOriginal` for retention and deletion; has no SELECT on `original_filename_enc` (ISS-139) or `uploaded_by_account_id` (ISS-239, T-303 step 8) and needs neither.
