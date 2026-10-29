# Entities — U24 `t-304-worker-evidence-pipeline`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-304-worker-evidence-pipeline/functional-design/`.

Source of truth for the data shape this Unit reads and writes. Built from T-304 (FD-070 amendment, images-only scope block), `02-data-model.md` §0, §7, §12, §16 and §17, `contract-summary.md` C8 and C15, the schema on `main` at `9cf860a` (`schema/evidence.ts`, `schema/notification.ts`, `contracts/src/enums.ts`), pg-boss 12.31.0, and the answers in `functional-design-questions.md`. Workflows and ports are in `functional-spec.md`; decision logic is in `rules.md`.

The Unit adds no table and no column. It changes the worker's privileges on `evidence_items` (FD entry (a), Question 2), the job queue policy of `evidence.process` (Question 4), one event payload (`evidence.received`, Question 1) and adds one event (`evidence.scanDelayed`, Question 5). Entities owned by another Unit are listed because the job crosses them; the owner is named on each. The worker has no `Actor`; every row it writes carries the custody actor `worker`.

```yaml
entities:
  - name: EvidenceItem
    owner: Evidence (U23 T-303 creates rows; this Unit moves the pipeline states)
    description: "One uploaded file (table evidence_items). The worker sees it only through the column list of FD entry (a)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "the only id in the job payload, custody and outbox; never a URL id" }
      - { name: public_id, type: string, required: true, unique: true, constraints: "readable by the worker, unused by the pipeline" }
      - { name: review_id, type: uuid, required: true, references: Review.id, constraints: "NOT NULL on main; U23 must allow an item before its review (finding F7); the pipeline reads it fresh in every transaction and never writes it" }
      - { name: group, type: enum, required: true, constraints: "unused by the pipeline" }
      - { name: label_en, type: text, required: false, constraints: "author's label; readable but never read by the pipeline; never in a payload, log or custody row" }
      - { name: label_bn, type: text, required: false, constraints: "as label_en" }
      - { name: state, type: enum, required: true, allowed_values: [quarantined, validating, scanning, sanitising, preview_ready, privacy_confirmed, published, failed, rejected, removed, original_expired], constraints: "the pipeline writes only the transitions of functional-spec § 5, always by compare-and-set (BR1.5)" }
      - { name: fail_reason, type: enum, required: false, allowed_values: [type_mismatch, too_large, malformed, malware, scanner_unavailable, processing_timeout, unknown, too_many_pages, encrypted], constraints: "set only with state failed; too_many_pages and encrypted are never produced (FD-036)" }
      - { name: declared_mime, type: enum, required: true, allowed_values: [image/jpeg, image/png], constraints: "set at intake; compared with the sniffed type (BR2.3)" }
      - { name: detected_mime, type: enum, required: false, allowed_values: [image/jpeg, image/png], constraints: "written by the pipeline when validation passes (BR2.6)" }
      - { name: original_bytes, type: bigint, required: true, constraints: "re-checked against the stored file on every run (BR2.2)" }
      - { name: original_sha256, type: text, required: true, constraints: "lowercase hex; re-checked on every run (BR2.2)" }
      - { name: original_filename_enc, type: bytea, required: true, constraints: "PRIVATE; no SELECT and no UPDATE for rk_worker after FD entry (a) (BR8.1)" }
      - { name: page_count, type: integer, required: true, default: 1, constraints: "set to 1 at preview_ready (BR4.3)" }
      - { name: uploaded_by_account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "PRIVATE; no SELECT and no UPDATE for rk_worker after FD entry (a); the worker gets the id from the job payload (BR1.6)" }
      - { name: retention_expires_at, type: timestamp, required: false, constraints: "not written by the pipeline; failed items need one from U29 (finding F9, X4)" }
      - { name: hold_id, type: uuid, required: false, constraints: "not read or written by the pipeline" }
      - { name: published_artifact_id, type: uuid, required: false, constraints: "U25's; never written by the pipeline" }
      - { name: idempotency_key, type: text, required: false, unique: true, constraints: "U23's intake key; unused here" }
      - { name: created_at, type: timestamp, required: true }
      - { name: updated_at, type: timestamp, required: false, constraints: "set by every pipeline transition and by touchIfState" }
    constraints:
      - "The pipeline acts only on quarantined, validating, scanning and sanitising (BR1.3)"
      - "Every pipeline query names its columns; no select or returning of all columns (BR8.2)"
      - "The pipeline never writes review_id, group, labels, retention_expires_at, hold_id or published_artifact_id (BR6.6)"
    relationships:
      - { to: EvidenceArtifact, cardinality: "one-to-many", direction: "EvidenceItem has EvidenceArtifact" }
      - { to: CustodyEvent, cardinality: "one-to-many", direction: "EvidenceItem has CustodyEvent (append-only chain)" }
      - { to: EvidenceOutboxEvent, cardinality: "one-to-many", direction: "EvidenceItem is announced by EvidenceOutboxEvent" }
      - { to: ProcessJob, cardinality: "one-to-many", direction: "EvidenceItem is processed by ProcessJob (one key per item chain)" }

  - name: EvidenceArtifact
    owner: Evidence (U23 writes the original; this Unit writes page and thumbnail; U25 writes public copies)
    description: "A stored file of an item (table evidence_artifacts)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: item_id, type: uuid, required: true, references: EvidenceItem.id }
      - { name: kind, type: enum, required: true, allowed_values: [original, page_png, thumbnail, derivative_pdf], constraints: "this Unit writes page_png and thumbnail only; page_png names the role, mime holds the real type (BR4.3)" }
      - { name: page_no, type: integer, required: false, constraints: "1 for both rows this Unit writes" }
      - { name: storage_key, type: text, required: true, unique: true, constraints: "private/<itemId>/page-1.<png|jpg> or private/<itemId>/thumbnail-1.<png|jpg> (BR4.4); the original's key is read from its row, never from the payload (BR8.5)" }
      - { name: sha256, type: text, required: true, constraints: "of the stored bytes, returned by Storage.putPrivateDerivative (BR4.5)" }
      - { name: bytes, type: integer, required: true, constraints: "of the stored bytes" }
      - { name: mime, type: text, required: true, constraints: "image/png or image/jpeg, the same as the input's (Question 7)" }
      - { name: width, type: integer, required: true, constraints: "required for the rows this Unit writes, after orientation" }
      - { name: height, type: integer, required: true, constraints: "as width" }
      - { name: sanitiser_version, type: text, required: true, constraints: "'sharp@<x.y.z> libvips@<a.b.c>' (BR4.5)" }
      - { name: scanner_version, type: text, required: true, constraints: "from the item's latest scan_clean custody event, e.g. '1.5.4'" }
      - { name: signature_version, type: text, required: true, constraints: "from the same event, e.g. '28115'" }
      - { name: immutable, type: boolean, required: true, default: true, constraints: "true for both rows" }
      - { name: public, type: boolean, required: true, default: false, constraints: "always false from this Unit (BR8.6); the database refuses true for original" }
      - { name: superseded_by_id, type: uuid, required: false, constraints: "U25's (redaction); not written here" }
      - { name: deleted_at, type: timestamp, required: false, constraints: "U29's; not written here" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Exactly one page_png and one thumbnail per item, both written in the preview_ready transaction (BR4.7)"
      - "No artifact row is written in a failing transaction (BR6.5)"

  - name: CustodyEvent
    owner: Evidence (append-only; 0003 trigger refuses UPDATE and DELETE)
    description: "One step in an item's chain of custody (table evidence_custody_events). The pipeline's record instead of audit rows (BR7.4)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true }
      - { name: item_id, type: uuid, required: true, references: EvidenceItem.id }
      - { name: event, type: enum, required: true, constraints: "this Unit writes validated, validation_failed, scan_clean, scan_detected, scan_unavailable, sanitised, preview_ready, failed; it never writes scan_started (the scan's own outcome event is the record) or any event of U23, U25, U29" }
      - { name: actor, type: text, required: true, constraints: "always 'worker' from this Unit" }
      - { name: details, type: jsonb, required: true, default: "{}", constraints: "built by custody-details.ts from the allowlist below; unknown keys dropped (BR7.1)" }
      - { name: created_at, type: timestamp, required: true, constraints: "the time of the first scan_unavailable starts the 24 h window (BR3.5)" }
    details_allowlist:
      validated: "{detectedMime: image/jpeg|image/png, width: int, height: int, bytes: int}"
      validation_failed: "{reason: fail_reason, detectedMime?: image/jpeg|image/png|other, check?: integrity}"
      scan_clean: "{scanner: 'clamav', scannerVersion: semver, signatureVersion: digits}"
      scan_detected: "{signature: ^[A-Za-z0-9._:-]{1,128}$ or 'unparsed', scannerVersion, signatureVersion}"
      scan_unavailable: "{attempt: int >= 1, cause: refused|timeout|error_reply|size_limit|protocol|version_unknown, nextAttemptInSec: 30|120|600|3600|0}"
      sanitised: "{sanitiserVersion, pageMime: image/png|image/jpeg, width: int, height: int, thumbnailWidth: int}"
      preview_ready: "{pages: 1}"
      failed: "{stage: validating|scanning|sanitising, reason: fail_reason, check?: integrity|metadata}"
    constraints:
      - "Never a file name, label, account id, storage key, byte content or free text (BR7.1, 01 §5)"
      - "A clean run appends validated, scan_clean, sanitised, preview_ready once each and in order; scan_unavailable events may sit between validated and scan_clean (BR7.2)"

  - name: EvidenceOutboxEvent
    owner: Notification (table outbox_events, FD-038); payload shapes are contracts in C15
    description: "An event in the transactional outbox. The pipeline writes it in the same transaction as the state change."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "becomes the envelope eventId and the job key of evidence.process" }
      - { name: name, type: text, required: true, allowed_values: [evidence.received, evidence.stateChanged, evidence.scanDelayed] }
      - { name: payload, type: jsonb, required: true, constraints: "strict contracts schema per name (BR5.3)" }
      - { name: created_at, type: timestamp, required: true }
      - { name: processed_at, type: timestamp, required: false, constraints: "the relay's" }
      - { name: attempts, type: integer, required: true, default: 0, constraints: "the relay's" }
    payloads:
      evidence.received: "{itemId: uuid, uploaderAccountId: uuid} — written by U23's intake in the web tier; uploaderAccountId is new (Question 1)"
      evidence.stateChanged: "{itemId: uuid, reviewId?: uuid, state: preview_ready|failed (from this Unit), failReason?: fail_reason, uploaderAccountId: uuid}"
      evidence.scanDelayed: "{itemId: uuid, reviewId?: uuid, uploaderAccountId: uuid} — new, at most once per item (BR3.6)"
    relationships:
      - { to: ProcessJob, cardinality: "one-to-many", direction: "evidence.received starts ProcessJob through the relay" }
      - { to: NotificationKey, cardinality: "many-to-one", direction: "stateChanged and scanDelayed are turned into in-app notices by U34" }

  - name: ProcessJob
    owner: Worker (pg-boss table pgboss.job; queue declared in queue-declaration.ts)
    description: "One run request for one item. Not a domain table; listed because its key and policy carry the idempotency rules."
    attributes:
      - { name: name, type: text, required: true, allowed_values: [evidence.process] }
      - { name: data, type: json, required: true, constraints: "the C15 envelope {eventId, name: 'evidence.received', payload: {itemId, uploaderAccountId}}, parsed strictly by EvidenceProcessJob (BR1.1)" }
      - { name: singleton_key, type: text, required: true, constraints: "'evidence.process:<eventId>' for the relay's send and every follow-up of the same item" }
      - { name: policy, type: enum, required: true, allowed_values: [stately], constraints: "one created, one retry and one active job per key (Question 4)" }
      - { name: retry_limit, type: integer, required: true, default: 3 }
      - { name: retry_delay, type: integer, required: true, default: 30, constraints: "seconds, with backoff" }
      - { name: expire_in_seconds, type: integer, required: true, default: 150, constraints: "above the 120 s run budget (BR1.7, closes ISS-251)" }
      - { name: start_after, type: timestamp, required: false, constraints: "set on outage follow-ups: now + 30 s, 2 min, 10 min, then 1 h (BR3.4)" }
      - { name: retry_count, type: integer, required: true, constraints: "passed to the handler through includeMetadata (Question 16)" }

  - name: ScanResult
    owner: application port MalwareScanner (value object)
    description: "What one scan returned. Never thrown; every non-clean reply is unavailable."
    attributes:
      - { name: status, type: enum, required: true, allowed_values: [clean, detected, unavailable] }
      - { name: scannerVersion, type: text, required: false, constraints: "required for clean and detected" }
      - { name: signatureVersion, type: text, required: false, constraints: "required for clean and detected" }
      - { name: signature, type: text, required: false, constraints: "detected only; shaped by BR7.5 before custody" }
      - { name: cause, type: enum, required: false, allowed_values: [refused, timeout, error_reply, size_limit, protocol, version_unknown], constraints: "unavailable only" }

  - name: ImageInspection
    owner: application port ImageSanitiser (value object)
    description: "sharp's header-only reading of the original (BR9.6)."
    attributes:
      - { name: format, type: enum, required: true, allowed_values: [jpeg, png, other] }
      - { name: width, type: integer, required: true }
      - { name: height, type: integer, required: true }
      - { name: pages, type: integer, required: true, constraints: "more than 1 is malformed (animation)" }
      - { name: error, type: enum, required: false, allowed_values: [unreadable], constraints: "instead of the fields above" }

  - name: SanitisedImage
    owner: application port ImageSanitiser (value object)
    description: "The verified page and thumbnail of one item, before storage."
    attributes:
      - { name: page, type: "{bytes: Uint8Array, mime, width, height}", required: true }
      - { name: thumbnail, type: "{bytes: Uint8Array, mime, width: <= 320, height}", required: true }
      - { name: version, type: text, required: true }
      - { name: error, type: enum, required: false, allowed_values: [malformed, timeout, metadata_left, too_large], constraints: "instead of the fields above" }

  - name: NotificationKey
    owner: i18n (packages/i18n); delivery is U34's
    description: "The three in-app notice strings this Unit adds (functional-spec § 6.5)."
    attributes:
      - { name: key, type: enum, required: true, allowed_values: [notif.evidence.previewReady, notif.evidence.failed, notif.evidence.scanDelayed] }
      - { name: en, type: text, required: true }
      - { name: bn, type: text, required: true, constraints: "same commit; goes to the owner's Bengali copy review (FD-042)" }
    constraints:
      - "No interpolated content, no number, no promised time; no email.evidence.* key (FD-070)"
```

## Worker privileges on the evidence tables (after FD entry (a))

| Table | SELECT | INSERT | UPDATE | DELETE | Source |
|---|---|---|---|---|---|
| `evidence_items` | every column except `original_filename_enc`, `uploaded_by_account_id` | as FD-092 left it | the same column list | as FD-092 left it | FD entry (a), BR8.1 |
| `evidence_artifacts`, `evidence_custody_events`, `evidence_redactions` | unchanged (table-level, `0005`) | unchanged | unchanged | unchanged | FD-092 |
| `outbox_events` | unchanged | unchanged | unchanged | unchanged | FD-038 |

The pipeline itself uses `SELECT` and `UPDATE` on `evidence_items`, `SELECT` and `INSERT` on artifacts and custody, and `INSERT` on the outbox. Custody's append-only trigger refuses `UPDATE` and `DELETE` for every role.

## Storage layout (this Unit's part)

| Key | Written by | Read by | Public |
|---|---|---|---|
| `quarantine/<itemId>/<uuid>` (U23's `putQuarantine`; the key is read from the original artifact row, and every key must match `^(quarantine\|private\|public)/[0-9a-f-]{36}/[^/]+$`) | U23 | this Unit (`readPrivate`, 15 MB cap) | never |
| `private/<itemId>/page-1.<png\|jpg>` | this Unit | U25 (preview, redaction) | never; U25 writes the public copy |
| `private/<itemId>/thumbnail-1.<png\|jpg>` | this Unit | U25 | never |

Text fallback for the relationships: an evidence item has many artifacts and an append-only chain of custody events, is announced by outbox events, and is processed by pg-boss jobs that share one key per item chain. Scan results, image inspections and sanitised images are value objects that live only inside one run.
