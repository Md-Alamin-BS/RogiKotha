# Entities — U48 `u48-evidence` (release 1)

The YAML block is the source of truth. The tables `evidence_items`, `evidence_artifacts` and `evidence_custody_events` already exist on `main` (T-005); U48 adds no table, column or enum value. Entity IDs are frozen once this design is approved. Review 01 changed ENT-001, ENT-003, ENT-005, ENT-006, ENT-008 and ENT-009 and added ENT-011.

```yaml
entities:
  - id: ENT-001
    name: EvidenceItem
    description: "One uploaded image attached to a published review by its author. Table evidence_items."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, notes: "internal; never leaves the server" }
      - { name: publicId, type: string, required: true, unique: true, notes: "the itemId in the upload answer, the author list and removal" }
      - { name: reviewId, type: uuid, required: true, references: Review.id, notes: "cascade on review delete" }
      - { name: group, type: enum EvidenceGroup, required: true, default: reviewed, notes: "release 1 always writes reviewed" }
      - { name: state, type: enum EvidenceState, required: true, default: quarantined, allowed: "quarantined, validating, scanning, preview_ready, failed, rejected, removed in release 1 (published only on seeded rows)" }
      - { name: failReason, type: enum EvidenceFailReason, required: false, allowed: "type_mismatch, malformed, too_large, malware, scanner_unavailable, processing_timeout, unknown", constraints: "set only with state rejected or failed (application rule; the table has no CHECK for it)" }
      - { name: declaredMime, type: string, required: true, allowed: "image/jpeg, image/png" }
      - { name: detectedMime, type: string, required: false, allowed: "image/jpeg, image/png", notes: "from magic bytes at intake" }
      - { name: originalBytes, type: integer, required: true, min: 1, max: 15728640 }
      - { name: originalSha256, type: string, required: true, constraints: "64 lowercase hex" }
      - { name: originalFilenameEnc, type: bytes, required: true, notes: "sealed cleaned name, at most 200 characters before sealing; author-only (BR2.6); never selected by the worker (BR4.8)" }
      - { name: uploadedByAccountId, type: uuid, required: true, references: AccountProfile.id, notes: "private; never in an event payload or log; never selected by the worker (BR4.8)" }
      - { name: idempotencyKey, type: string, required: true, unique: true, notes: "client UUID (BR2.5), checked before the limits; the column is nullable for seeded rows" }
      - { name: retentionExpiresAt, type: timestamp, required: false, notes: "stays null in release 1 (BR8.3)" }
      - { name: publishedArtifactId, type: uuid, required: false, notes: "stays null in release 1" }
      - { name: createdAt, type: timestamp, required: true, notes: "start of the processing deadline (BR4.9, BR4.11)" }
      - { name: updatedAt, type: timestamp, required: false, notes: "set on every transition" }
    constraints:
      - "at most 10 items per review in counting states (BR2.3) and at most 100 MB across them (BR2.4), enforced in the application under a per-review lock"
      - "state moves only along functional-spec.md § 4, by compare-and-set (BR4.2)"
      - "an item in quarantined, validating or scanning leaves processing through the job's last attempt (BR4.10) or through the sweep once 3600 s have passed since createdAt (BR4.11)"
    relationships:
      - { to: Review, cardinality: "many to one", direction: "item -> review" }
      - { to: AccountProfile, cardinality: "many to one", direction: "item -> uploader" }
      - { to: EvidenceArtifact, cardinality: "one to one in release 1 (the original)", direction: "artifact -> item" }
      - { to: CustodyEvent, cardinality: "one to many", direction: "event -> item" }

  - id: ENT-002
    name: EvidenceArtifact
    description: "The stored original of an item. Table evidence_artifacts; release 1 writes only kind original."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: itemId, type: uuid, required: true, references: EvidenceItem.id }
      - { name: kind, type: enum ArtifactKind, required: true, allowed: "original in release 1" }
      - { name: storageKey, type: string, required: true, unique: true, constraints: "^[0-9a-f]{32}$ (BR3.1, BR3.2)" }
      - { name: sha256, type: string, required: true }
      - { name: bytes, type: integer, required: true }
      - { name: mime, type: string, required: true }
      - { name: scannerVersion, type: string, required: false, notes: "set when clamd reports it" }
      - { name: public, type: boolean, required: true, default: false, constraints: "never true for kind original (database CHECK)" }
      - { name: deletedAt, type: timestamp, required: false, notes: "set after the file is deleted following rejection, failure or removal" }
    relationships:
      - { to: EvidenceItem, cardinality: "many to one", direction: "artifact -> item" }

  - id: ENT-003
    name: CustodyEvent
    description: "Append-only record of what happened to an item. Table evidence_custody_events. Private."
    attributes:
      - { name: itemId, type: uuid, required: true, references: EvidenceItem.id }
      - { name: event, type: enum CustodyEvent, required: true, allowed: "received, validated, validation_failed, scan_started, scan_clean, preview_ready, scan_detected, scan_unavailable, failed, removed in release 1 (functional-spec.md § 4 names the values per transition)" }
      - { name: actor, type: string, required: true, allowed: "account:<id> | worker (the job and the sweep)" }
      - { name: details, type: json, required: true, notes: "only bytes, mime, failReason, attempt, scannerVersion and a cause code (original_missing); never the file name, storage key or an account id" }
      - { name: createdAt, type: timestamp, required: true }
    relationships:
      - { to: EvidenceItem, cardinality: "many to one", direction: "event -> item" }

  - id: ENT-004
    name: EvidenceStateChanged
    description: "Outbox event appended with every state change after intake (C15 release 1). Routes to no job in release 1 (BR4.12)."
    attributes:
      - { name: itemId, type: uuid, required: true }
      - { name: reviewId, type: uuid, required: true }
      - { name: state, type: enum EvidenceState, required: true }
    constraints:
      - "exactly these three fields; no account id, file name or storage key (BR4.7)"

  - id: ENT-005
    name: EvidenceReceived
    description: "Outbox event appended by intake; the relay's existing entry routes it to evidence.process. The job data is the C15 envelope {eventId, name, payload: {itemId}} and the singleton key is evidence.process:<eventId> (BR4.1)."
    attributes:
      - { name: itemId, type: uuid, required: true, notes: "the internal item id" }

  - id: ENT-006
    name: EvidenceLimits
    description: "Release-1 constants in packages/domain/src/evidence/limits.ts, with C18's values (Q1 answer B). Each is read in one place, so release 2 can swap it for a ConfigProvider key."
    attributes:
      - { name: EVIDENCE_MAX_FILE_BYTES, type: integer, required: true, default: 15728640, notes: "15 MB (C18, AC7.1.3); U41's Content-Length cap is this plus 65536" }
      - { name: EVIDENCE_MAX_PER_REVIEW, type: integer, required: true, default: 10, notes: "C18, AC7.1.3" }
      - { name: EVIDENCE_MAX_TOTAL_BYTES, type: integer, required: true, default: 104857600, notes: "100 MB (C18); can be the first limit hit (BR2.4)" }
      - { name: EVIDENCE_UPLOAD_LIMIT, type: integer, required: true, default: 30, notes: "upload requests per account per window (BR2.7)" }
      - { name: EVIDENCE_UPLOAD_WINDOW_SEC, type: integer, required: true, default: 3600 }
      - { name: EVIDENCE_ATTEMPT_BUDGET_MS, type: integer, required: true, default: 120000, notes: "the handler's own bound per attempt (BR4.6)" }
      - { name: EVIDENCE_PROCESSING_DEADLINE_SEC, type: integer, required: true, default: 3600, notes: "counted from createdAt; after it the job or the sweep fails the item (BR4.9, BR4.11)" }

  - id: ENT-007
    name: PublicEvidenceStates
    description: "as const list in packages/domain/src/evidence/states.ts (C17)."
    attributes:
      - { name: values, type: "EvidenceState[]", required: true, default: "['preview_ready', 'published']" }

  - id: ENT-008
    name: OwnEvidenceList
    description: "The author's own list, returned by getForAuthor only to the item's uploader. It is the existing OwnEvidenceList from apps/web/src/server/actions/evidence.ts, moved to contracts/view-models/evidence.ts with the same name and fields and re-exported from the action file, so EvidenceUploader keeps its props (C16)."
    attributes:
      - { name: reviewPublicId, type: string, required: true }
      - { name: files, type: "OwnEvidenceFile[]", required: true, notes: "oldest first; removed and original_expired omitted" }
      - { name: maxFiles, type: integer, required: true, notes: "EVIDENCE_MAX_PER_REVIEW" }
      - { name: maxBytes, type: integer, required: true, notes: "EVIDENCE_MAX_FILE_BYTES; the uploader works out whether more can be added from the files in pending or ready" }

  - id: ENT-009
    name: OwnEvidenceFile
    description: "One row of OwnEvidenceList (existing type, same name). No storage key, hash or internal id."
    attributes:
      - { name: publicId, type: string, required: true }
      - { name: name, type: string, required: false, notes: "null renders label.notProvided" }
      - { name: size, type: integer, required: true }
      - { name: status, type: enum OwnEvidenceStatus, required: true, allowed: "pending, ready, rejected (existing values) and failed (added); the union only widens, so every existing caller still compiles" }
      - { name: reasonKey, type: string, required: false, notes: "added and optional: the i18n key for rejected and failed (BR6.2)" }

  - id: ENT-010
    name: EvidenceNoteVM
    description: "The public part of EvidenceSection."
    attributes:
      - { name: count, type: integer, required: true, min: 0, notes: "0 renders label.noDocuments, never 0" }

  - id: ENT-011
    name: JobAttempt
    description: "The second argument PgBossQueue.work passes to a job handler (BR4.9), taken from pg-boss's job metadata (includeMetadata: true). No pg-boss type crosses into packages/application: the processor receives plain fields."
    attributes:
      - { name: jobId, type: string, required: true, notes: "for log lines only" }
      - { name: retryCount, type: integer, required: true, min: 0, notes: "retries already made; 0 on the first attempt" }
      - { name: retryLimit, type: integer, required: true, notes: "3 for evidence.process; the last attempt is retryCount >= retryLimit" }
      - { name: signal, type: AbortSignal, required: true, notes: "pg-boss's job signal, combined with the 120 s budget (BR4.6)" }
```

## Summary

| ID | Entity | Kind | Notes |
|---|---|---|---|
| ENT-001 | EvidenceItem | table (existing) | The lifecycle entity; states in functional-spec.md § 4; every processing path ends in a final state. |
| ENT-002 | EvidenceArtifact | table (existing) | Only the private original in release 1. |
| ENT-003 | CustodyEvent | table (existing) | Append-only, private; values named per transition. |
| ENT-004 | EvidenceStateChanged | outbox event | Three fields, no account id; no job in release 1. |
| ENT-005 | EvidenceReceived | outbox event | Triggers `evidence.process` with key `evidence.process:<eventId>`. |
| ENT-006 | EvidenceLimits | domain constants | 15 MB, 10 per review, 100 MB total (C18); 30 uploads per hour; 120 s budget; 3600 s deadline. |
| ENT-007 | PublicEvidenceStates | domain constant | `preview_ready`, `published`. |
| ENT-008–ENT-010 | View models | contracts | The existing author-list types (props kept) and the public count. |
| ENT-011 | JobAttempt | worker type | The attempt facts from pg-boss metadata. |
