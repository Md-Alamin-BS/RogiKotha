# Business rules — U24 `t-304-worker-evidence-pipeline`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-304-worker-evidence-pipeline/functional-design/`.

Source of truth for the Unit's decision logic. Built from T-304 (FD-070 amendment, images-only scope block), T-303 (what intake leaves behind), `unit-of-work.md` (U24), `requirements.md` (FR44, FR60–FR62, FR66–FR68, FR87, FR88, NFR2), `stories.md` (AC7.1.1–AC7.1.6, AC6.1.6, AC10.1.1, AC10.1.5), `contract-summary.md` (C8, C15), FD-035, FD-036, FD-037, FD-041, FD-070, FD-076, FD-092, FD-093, `01-conventions.md` §3–§5, §11, `02-data-model.md` §7, §16, §17, and the code on `main` at `9cf860a`. The rules that depend on a question follow the answers in `functional-design-questions.md` (Questions 1–19, decided by the agent under the owner's no-questions instruction of 2026-10-29). This Unit is high risk: every authorization and audit rule is spelled out (groups 1, 5, 7, 8).

The worker job has no `Actor`: nobody signs in to it. Its "authorization" is therefore a set of capability limits on what the job may read and change (groups 1 and 8), and its audit trail is the item's custody chain (group 7).

```yaml
rules:
  # Group 1 — Job entry and claim
  - id: BR1.1
    statement: "The job accepts only the C15 envelope of an evidence.received event and does nothing with any other shape."
    category: validation
    applies_to: "apps/worker handlers/evidence-process.ts, EvidenceProcessJob"
    trigger: "pg-boss delivers an evidence.process job"
    logic: "Parse data with EvidenceProcessJob: {eventId: uuid, name: 'evidence.received', payload: {itemId: uuid, uploaderAccountId: uuid}}, strict (unknown keys refused). IF the parse fails THEN log evidence.payload_invalid with eventId when present, complete the job (no retry), write nothing."
    violation: "Retrying a malformed payload forever, or acting on a guessed item id"
    source: "C15 envelope, outbox-relay.ts planEvent, Question 1"
  - id: BR1.2
    statement: "The job loads the item by its id from the database and stops quietly when it does not exist."
    category: validation
    applies_to: "processEvidenceItem"
    trigger: "After BR1.1"
    logic: "loadForProcessing(itemId) returns {id, state, failReason, declaredMime, originalBytes, originalSha256, reviewId, originalKey} or null. IF null THEN log evidence.item_missing {itemId}, outcome skipped."
    violation: "Creating an item, or failing the job so it retries an item that was deleted"
    source: "C8 evidence.process, idempotent jobs (C15 common rules)"
  - id: BR1.3
    statement: "The job acts only on items in quarantined, validating, scanning or sanitising; every other state is left exactly as it is."
    category: authorization
    applies_to: "processEvidenceItem"
    trigger: "After BR1.2"
    logic: "IF state NOT IN (quarantined, validating, scanning, sanitising) THEN log evidence.process.skipped {itemId, state}, outcome skipped, no write. preview_ready, privacy_confirmed, published, failed, rejected, removed and original_expired belong to the author, U25, moderators or retention."
    violation: "A replayed job re-processing a published, removed or failed item"
    source: "02-data-model.md §17 Evidence, T-304 step 1 (idempotent resume)"
  - id: BR1.4
    statement: "A retried job resumes at the stored state, never at the beginning."
    category: policy
    applies_to: "pipeline.ts nextStage, processEvidenceItem"
    trigger: "Every run"
    logic: "quarantined is first compare-and-set to validating; then WHILE nextStage(state) is not null run that stage. validating and sanitising re-run from their start (they write nothing until their closing transaction); scanning scans again. A run never repeats a stage whose closing transaction committed."
    violation: "Re-validating an item that is at scanning (acceptance row 'Resume after crash')"
    source: "T-304 step 1 and acceptance 'Resume after crash'"
  - id: BR1.5
    statement: "Every state change is a compare-and-set committed in one transaction with that step's custody events, artifact rows, outbox events and follow-up job."
    category: data-integrity
    applies_to: "EvidenceRepository.transition, touchIfState, UnitOfWork"
    trigger: "Each stage's closing write"
    logic: "UPDATE evidence_items SET state = to, … , updated_at = now() WHERE id = itemId AND state = from. IF zero rows THEN the transaction rolls back, the run deletes the files it wrote (BR4.8), logs evidence.process.superseded {itemId, from}, outcome superseded."
    violation: "Two concurrent jobs both writing scan_clean, or a preview_ready after a removal"
    source: "C15 (idempotent jobs), FD-038, Question 4"
  - id: BR1.6
    statement: "The uploader's account id comes from the job payload only and goes nowhere but the outbox payloads."
    category: privacy
    applies_to: "processEvidenceItem, outbox payloads, logs, custody"
    trigger: "Any use of the uploader"
    logic: "uploaderAccountId is copied unchanged into evidence.stateChanged and evidence.scanDelayed. It is never read from evidence_items.uploaded_by_account_id, never logged, never written to custody details or artifact rows."
    violation: "The worker reading uploaded_by_account_id, or the id appearing in a log line"
    source: "C15 recipient rule, PR3 (02 §16), ISS-239, Question 1, FD entry (a)"
  - id: BR1.7
    statement: "One run has 120 seconds; pg-boss expires the job only after 150 seconds."
    category: limit
    applies_to: "evidence-process.ts handler, queue-declaration.ts"
    trigger: "Every run"
    logic: "runSignal = any(AbortSignal.timeout(EVIDENCE_RUN_BUDGET_MS = 120000), job.signal). evidence.process is declared with expireInSeconds 150, so the use case can record the outcome before pg-boss gives up. The budget is a constant; tests inject a shorter one through the use case's input."
    violation: "An unbounded run, or pg-boss expiring the job while it is still writing"
    source: "C15 (120 s per item), 03 §4, ISS-251, Question 9"
  - id: BR1.8
    statement: "A worker process runs one evidence job at a time, and sharp uses one thread and no cache."
    category: limit
    applies_to: "registry entry for evidence.process, SharpImageSanitiser"
    trigger: "Worker start"
    logic: "work('evidence.process', {batchSize: 1}) and the handler awaits each job; sharp.concurrency(1); sharp.cache(false)."
    violation: "Several image decodes at once exhausting memory (pixel-bomb amplification)"
    source: "T-304 threat notes (teamConcurrency 1), AD-15 resource limits"

  # Group 2 — Validating
  - id: BR2.1
    statement: "The original is read from private storage with a hard byte cap of 15 MB."
    category: limit
    applies_to: "Storage.readPrivate, validating stage"
    trigger: "Start of every stage that needs the bytes"
    logic: "readPrivate(originalKey, {maxBytes: MAX_BYTES + 1}); IF more than MAX_BYTES (15 * 1024 * 1024) THEN failed(too_large). originalKey comes from the item's original artifact row, never from the payload."
    violation: "Reading an unbounded file into memory"
    source: "T-304 scope block (> 15 MB defence in depth), FR61, limits.ts (U23)"
  - id: BR2.2
    statement: "The quarantined bytes must still be exactly the bytes received at intake."
    category: data-integrity
    applies_to: "every run, before validating and before scanning and sanitising on resume"
    trigger: "After BR2.1"
    logic: "IF length != original_bytes OR sha256(bytes) != original_sha256 THEN failed(unknown) with custody validation_failed {reason: unknown, check: integrity} (or failed {stage, reason: unknown, check: integrity} outside validating)."
    violation: "Processing a file that changed in quarantine after intake"
    source: "FR62 (quarantine), AD-7 (custody), Question 10"
  - id: BR2.3
    statement: "The file's magic bytes must name the same image type the author declared."
    category: validation
    applies_to: "pipeline.ts sniffImageType, validating stage"
    trigger: "After BR2.2"
    logic: "sniffImageType: bytes start FF D8 FF → image/jpeg; 89 50 4E 47 0D 0A 1A 0A → image/png; otherwise other. IF sniffed != declared_mime THEN failed(type_mismatch), custody validation_failed {reason: type_mismatch, detectedMime: sniffed}. detected_mime is written only when it is image/jpeg or image/png."
    violation: "not-a-png.png reaching the scanner or sharp as a PNG"
    source: "FR60, FR62, AC7.1.2, T-304 scope block, Question 6"
  - id: BR2.4
    statement: "sharp's own reading of the header must agree with the magic bytes, show one frame and stay within 40 MP."
    category: validation
    applies_to: "ImageSanitiser.inspect, validating stage"
    trigger: "After BR2.3"
    logic: "inspect(bytes) reads the header only. IF unreadable THEN malformed; IF format != sniffed type THEN type_mismatch; IF pages > 1 (animated) THEN malformed; IF width * height > 40000000 THEN too_large. A crafted 30000 x 30000 header fails in under 2 s without decoding."
    violation: "Decoding a pixel bomb, or accepting an animated or disguised file"
    source: "T-304 scope block and acceptance 'Pixel bomb', 03 §4 (≤ 40 MP)"
  - id: BR2.5
    statement: "No scan is attempted before validation has passed."
    category: policy
    applies_to: "processEvidenceItem"
    trigger: "Any validation failure"
    logic: "The scanner port is called only in the scanning stage, which is reachable only through the validating → scanning compare-and-set."
    violation: "FakeScanner.calls > 0 for a type mismatch"
    source: "T-304 acceptance 'Type mismatch'"
  - id: BR2.6
    statement: "A passed validation is recorded once, with what was checked."
    category: audit
    applies_to: "validating closing transaction"
    trigger: "BR2.1–BR2.4 pass"
    logic: "transition(validating → scanning, detectedMime); custody validated {detectedMime, width, height, bytes}."
    violation: "Advancing without a validated custody event"
    source: "T-304 step 1 (custody validated), AD-7"

  # Group 3 — Scanning (fail closed)
  - id: BR3.1
    statement: "Only an exact clean reply from the scanner, with its signature version known, lets an item advance."
    category: security
    applies_to: "scanning stage, MalwareScanner"
    trigger: "Scanner result"
    logic: "IF status = clean (reply exactly 'stream: OK', version known) THEN transition(scanning → sanitising) with custody scan_clean {scanner: clamav, scannerVersion, signatureVersion}. Every other result never advances."
    violation: "Any path to sanitising without scan_clean"
    source: "FD-035, 01 §11, AD-6, FR62, Question 11"
  - id: BR3.2
    statement: "Malware fails the item and keeps the original for custody."
    category: security
    applies_to: "scanning stage"
    trigger: "status = detected"
    logic: "transition(scanning → failed, malware); custody scan_detected {signature, scannerVersion, signatureVersion} then failed {stage: scanning, reason: malware}; outbox evidence.stateChanged {state: failed, failReason: malware}. No artifact is written and the original is not deleted (retention expires it, X4)."
    violation: "Deleting the original, writing a derivative, or recording the file name"
    source: "T-304 step 1 and acceptance 'Malware', AC7.1.4"
  - id: BR3.3
    statement: "An unavailable scanner keeps the item in scanning and schedules the next attempt in the same transaction."
    category: security
    applies_to: "scanning stage"
    trigger: "status = unavailable, and BR3.5 does not apply"
    logic: "touchIfState(scanning) must succeed; custody scan_unavailable {attempt, cause, nextAttemptInSec}; JobQueue.enqueue(tx, evidence.process, the same envelope, {key: evidence.process:<eventId>, startAfter: now + scanRetryDelaySec(attempt)}). The run ends rescheduled and the job completes normally."
    violation: "Advancing, failing early, or dropping the retry"
    source: "T-304 step 1 and acceptance 'Fail closed', 02 §17, Question 4"
  - id: BR3.4
    statement: "Retries wait 30 seconds, 2 minutes, 10 minutes, then one hour each."
    category: policy
    applies_to: "pipeline.ts scanRetryDelaySec"
    trigger: "BR3.3"
    logic: "attempt 1 → 30; 2 → 120; 3 → 600; ≥ 4 → 3600 (seconds). attempt = number of earlier scan_unavailable events of the item + 1."
    violation: "A schedule that hammers clamd or waits days"
    source: "T-304 step 1 (30 s, 2 m, 10 m, then hourly)"
  - id: BR3.5
    statement: "After 24 hours without a scan, the item fails with scanner_unavailable."
    category: policy
    applies_to: "scanning stage"
    trigger: "status = unavailable and Clock.now() - (time of the first scan_unavailable) ≥ 24 h"
    logic: "transition(scanning → failed, scanner_unavailable); custody scan_unavailable {attempt, cause, nextAttemptInSec: 0} then failed {stage: scanning, reason: scanner_unavailable}; outbox evidence.stateChanged {state: failed, failReason: scanner_unavailable}. The item never advanced; the author can now replace or remove it."
    violation: "An item stuck in scanning forever with no exit (F8)"
    source: "AC7.1.4, FR66, Question 3, FD entry (b)"
  - id: BR3.6
    statement: "The author is told once that a document could not be checked yet."
    category: notification
    applies_to: "scanning stage"
    trigger: "The first scan_unavailable of the item"
    logic: "IF there was no earlier scan_unavailable custody event THEN the BR3.3 transaction also appends evidence.scanDelayed {itemId, reviewId?, uploaderAccountId}. Later outages of the same item append nothing. U34's dedupe key is the second guard."
    violation: "One notice per retry (up to 27 notices a day)"
    source: "T-304 step 1 and FD-070 row 'scanner outage notice'"
  - id: BR3.7
    statement: "The scanner always scans the bytes that just passed BR2.2 in this run."
    category: security
    applies_to: "scanning stage"
    trigger: "Every scan"
    logic: "The bytes are read and integrity-checked at the start of the run; a resumed run at scanning repeats BR2.1 and BR2.2 before the scan."
    violation: "Scanning a cached or different copy from the one sanitised"
    source: "FR62 (scan the upload), Question 10"

  # Group 4 — Sanitising and preview
  - id: BR4.1
    statement: "The copy the author will review is re-encoded with orientation applied, every metadata block dropped and the input's format kept."
    category: privacy
    applies_to: "SharpImageSanitiser.sanitise"
    trigger: "Sanitising stage"
    logic: "sharp(bytes, {limitInputPixels: 40000000, failOn: 'error', sequentialRead: true}).rotate().timeout({seconds: 30}); PNG → .png({compressionLevel: 9}); JPEG → .jpeg({quality: 85, mozjpeg: true}); never withMetadata, keepMetadata, keepExif, keepIccProfile, withExif. Thumbnail: .resize({width: 320, withoutEnlargement: true}), same format."
    violation: "EXIF GPS, XMP, IPTC, ICC or text comments in the copy (AC7.1.6)"
    source: "FR62, AC7.1.1, AC7.1.6, T-304 scope block and step 3, Question 7"
  - id: BR4.2
    statement: "Each output is checked again before it is stored, and refused if any metadata survived."
    category: privacy
    applies_to: "SharpImageSanitiser.sanitise"
    trigger: "After encoding page and thumbnail"
    logic: "metadata(output): format equals the input's; exif, icc, xmp, iptc and comments absent; orientation absent or 1; width * height ≤ 40000000. IF any check fails THEN error metadata_left → failed(unknown) with custody failed {stage: sanitising, reason: unknown, check: metadata}."
    violation: "Trusting the encoder without checking its output"
    source: "T-304 step 3 (re-read metadata, exif undefined), AC7.1.6"
  - id: BR4.3
    statement: "Exactly one page and one thumbnail are made per item."
    category: policy
    applies_to: "sanitising stage"
    trigger: "Sanitising stage"
    logic: "Artifacts kind page_png, page_no 1, and kind thumbnail, page_no 1; page_count = 1. kind page_png names the role; the mime column holds the real type (image/png or image/jpeg)."
    violation: "Several pages for an image, or a thumbnail without a page"
    source: "FD-036 (page_count always 1), T-304 scope block"
  - id: BR4.4
    statement: "Derivatives are written only under private storage, with fixed names per item."
    category: security
    applies_to: "Storage.putPrivateDerivative"
    trigger: "Sanitising stage"
    logic: "private/<itemId>/page-1.<png|jpg> and private/<itemId>/thumbnail-1.<png|jpg>; temp file then rename; a stale unreferenced file of the same name is replaced; the key matches the storage key pattern. Nothing is written under public/."
    violation: "A derivative under public/ before the author confirmed privacy (AD-6, hard rule)"
    source: "T-304 step 1 (private/, not public/), ISS-181, Question 8"
  - id: BR4.5
    statement: "Every artifact row records the hash of the stored bytes and the versions of the tools that made and checked it, and is private and immutable."
    category: audit
    applies_to: "EvidenceRepository.insertArtifact"
    trigger: "Sanitising closing transaction"
    logic: "{item_id, kind, page_no, storage_key, sha256 (of the stored bytes), bytes, mime, width, height, sanitiser_version 'sharp@x.y.z libvips@a.b.c', scanner_version and signature_version from the item's latest scan_clean custody event, public false, immutable true}."
    violation: "An artifact without hash or versions, or public = true (hard-rule checklist)"
    source: "T-304 step 1 and hard-rule checklist, 02 §7"
  - id: BR4.6
    statement: "A file that cannot be decoded is malformed; a decode that takes too long is a processing timeout."
    category: validation
    applies_to: "sanitising stage"
    trigger: "Sanitiser error"
    logic: "error malformed (decode error, truncation) → failed(malformed); error timeout (sharp 30 s or the run signal) → failed(processing_timeout); error too_large (limitInputPixels) → failed(too_large); any other exception → BR6.4."
    violation: "Mapping a broken file to unknown, or retrying a deterministic decode error"
    source: "T-304 scope block failure mapping, Question 17"
  - id: BR4.7
    statement: "Preview readiness is one transaction: state, artifacts, custody and the author's event."
    category: data-integrity
    applies_to: "sanitising closing transaction"
    trigger: "Both files stored"
    logic: "transition(sanitising → preview_ready, pageCount 1); insertArtifact × 2; custody sanitised {sanitiserVersion, pageMime, width, height, thumbnailWidth} and preview_ready {pages: 1}; outbox evidence.stateChanged {itemId, reviewId?, state: preview_ready, uploaderAccountId}."
    violation: "A preview_ready item without artifacts, or artifacts without the state"
    source: "T-304 step 1 (preview_ready), C15"
  - id: BR4.8
    statement: "A run that does not commit its files deletes them, and never deletes anything else."
    category: data-integrity
    applies_to: "sanitising stage"
    trigger: "Lost compare-and-set, or any failure after a derivative file was written"
    logic: "Storage.delete(key, {reason: 'pipeline_abandoned'}) for each key this run wrote; a deletion error is logged (evidence.cleanup_failed {itemId}) and does not change the outcome. The original and every file with an artifact row are never deleted by the pipeline."
    violation: "Orphan derivative files after a removal, or the pipeline deleting the original"
    source: "T-304 step 1 (delete nothing on malware), AD-7, WF9"

  # Group 5 — Notices (FD-070)
  - id: BR5.1
    statement: "The pipeline sends no email by construction: it has no mail dependency at all."
    category: privacy
    applies_to: "EvidencePipelineDeps, worker container"
    trigger: "Always"
    logic: "The deps type holds no mail port, no email-delivery repository, no Crypto and no account or identity port; the use case appends outbox events only. No mail.send job, no email_deliveries row, whatever the author's emailEvidence preference."
    violation: "Any mail path reachable from the pipeline (FD-070, FD-041)"
    source: "FD-070, T-304 FD-070 acceptance rows, AC10.1.5 as narrowed"
  - id: BR5.2
    statement: "The pipeline announces only the author-relevant outcomes: ready for privacy review, failed, and the first outage."
    category: notification
    applies_to: "outbox writes"
    trigger: "preview_ready, failed, first scan_unavailable"
    logic: "evidence.stateChanged for preview_ready and failed (with failReason); evidence.scanDelayed once (BR3.6). The intermediate states validating, scanning and sanitising append no event; the composer polls them (U23 getForAuthor)."
    violation: "An event per internal transition, or a failure the author never hears of (AC10.1.1)"
    source: "AC10.1.1, FR87, Question 5"
  - id: BR5.3
    statement: "Event payloads hold exactly the allowlisted ids and enums."
    category: privacy
    applies_to: "evidence.stateChanged, evidence.scanDelayed"
    trigger: "Every append"
    logic: "stateChanged: {itemId, reviewId?, state, failReason?, uploaderAccountId}; scanDelayed: {itemId, reviewId?, uploaderAccountId}; built by a contracts schema that is strict, so no other key can be added."
    violation: "A label, file name, signature name or address in a payload"
    source: "C15 (ids, enums, counts, booleans only), 02 §12"
  - id: BR5.4
    statement: "Notice copy names no file, label or completion time, and exists in both languages."
    category: content
    applies_to: "notif.evidence.previewReady, notif.evidence.failed, notif.evidence.scanDelayed"
    trigger: "i18n"
    logic: "Copy as functional-spec § 6.5, en and bn in the same commit; no interpolated content; scanDelayed promises no time."
    violation: "A promised completion time (AC7.1.5) or a missing Bengali string (project rule)"
    source: "AC7.1.5, ADR 0011, FD-024, prototype n7 and ev.failNote, Question 15"
  - id: BR5.5
    statement: "Turning these events into notifications is U34's, with a dedupe key that includes the state."
    category: notification
    applies_to: "cross-Unit X3"
    trigger: "U34 builds notification.deliver"
    logic: "U34 routes evidence.stateChanged by state to notif.evidence.previewReady or notif.evidence.failed and evidence.scanDelayed to notif.evidence.scanDelayed, recipient uploaderAccountId, kind evidence; dedupe key <event>:<itemId>:<state>:<accountId>."
    violation: "A later notice for the same item swallowed by the dedupe key (F10)"
    source: "T-405 routing table, C15, Question 15"

  # Group 6 — Failures, timeouts, retries
  - id: BR6.1
    statement: "Each failure cause maps to one fail reason, fixed by stage."
    category: policy
    applies_to: "pipeline.ts failureFor"
    trigger: "Any failure"
    logic: "validating: too large → too_large; integrity → unknown; magic or format mismatch → type_mismatch; unreadable header or animation → malformed; pixels > 40 MP → too_large; run signal → processing_timeout. scanning: detected → malware; 24 h outage → scanner_unavailable; final-attempt error → unknown. sanitising: decode error → malformed; limitInputPixels → too_large; timeout → processing_timeout; metadata left → unknown; final-attempt error → unknown. too_many_pages and encrypted are never produced (FD-036)."
    violation: "A reason outside the enum, or the same cause mapped differently in two places"
    source: "T-304 scope block failure mapping, 02 §0 evidence_fail_reason"
  - id: BR6.2
    statement: "A failure is one transaction: state, reason, custody and the author's event."
    category: data-integrity
    applies_to: "every failure"
    trigger: "BR6.1"
    logic: "transition(stage → failed, reason); custody validation_failed {reason, detectedMime?, check?} in validating or scan_detected for malware, then failed {stage, reason}; outbox evidence.stateChanged {state: failed, failReason}."
    violation: "A failed item without a custody record or without the author's notice"
    source: "T-304 step 1 and step 5 (custody failed {stage}), AC7.1.4"
  - id: BR6.3
    statement: "A run that runs out of time fails as a timeout, except in scanning, where it counts as an outage."
    category: limit
    applies_to: "run signal"
    trigger: "runSignal aborts"
    logic: "IF the stage is validating or sanitising THEN failed(processing_timeout); IF scanning THEN the scanner returns unavailable {cause: timeout} and BR3.3 or BR3.5 applies."
    violation: "Failing an item only because clamd was slow"
    source: "T-304 step 5, acceptance 'Timeout'"
  - id: BR6.4
    statement: "Unexpected errors are retried by pg-boss up to three times; the last attempt records the failure instead of throwing."
    category: policy
    applies_to: "processEvidenceItem, handler"
    trigger: "An exception that is not a mapped cause (storage read error, database error, defect)"
    logic: "IF retryCount < retryLimit THEN rethrow (pg-boss retry: delay 30 s, backoff). ELSE commit failed(unknown) with custody failed {stage, reason: unknown} and the stateChanged event, and complete. A run that committed a follow-up job (BR3.3) never throws afterwards."
    violation: "Endless retries, a silent stuck item, or two pending jobs for one item"
    source: "T-304 step 5 (retryLimit 3, retry exhaustion → failed(unknown)), Question 16"
  - id: BR6.5
    statement: "A failed item keeps its original and keeps no derivative."
    category: data-integrity
    applies_to: "every failure"
    trigger: "BR6.2"
    logic: "No artifact row is written in a failing transaction; files written by the run are deleted (BR4.8); the original artifact and file are untouched."
    violation: "A derivative of a failed file surviving where U25 could publish it"
    source: "T-304 step 1 and acceptance 'Malware' (original still in storage; no artifacts)"
  - id: BR6.6
    statement: "Nothing the pipeline does touches the review or its text."
    category: policy
    applies_to: "processEvidenceItem"
    trigger: "Always"
    logic: "The pipeline writes evidence_items (state, fail_reason, detected_mime, page_count, updated_at), evidence_artifacts, evidence_custody_events and outbox_events only; it never reads or writes reviews or drafts."
    violation: "A failed file affecting the review's publication (FR44, FR66)"
    source: "FR44, FR66, AC6.1.6, T-304 hard-rule checklist"

  # Group 7 — Custody, logs and privacy
  - id: BR7.1
    statement: "Custody details are built from an allowlist per event, with the actor always 'worker'."
    category: audit
    applies_to: "custody-details.ts, EvidenceRepository.appendCustody"
    trigger: "Every custody write"
    logic: "validated {detectedMime, width, height, bytes}; validation_failed {reason, detectedMime?, check?}; scan_clean {scanner, scannerVersion, signatureVersion}; scan_detected {signature, scannerVersion, signatureVersion}; scan_unavailable {attempt, cause, nextAttemptInSec}; sanitised {sanitiserVersion, pageMime, width, height, thumbnailWidth}; preview_ready {pages}; failed {stage, reason, check?}. Unknown keys are dropped; string values must match their enum or version pattern."
    violation: "A file name, label, account id or free text in custody (01 §5)"
    source: "02 §7 (details allowlisted), 01 §5, T-304 threat notes"
  - id: BR7.2
    statement: "A clean run adds exactly validated, scan_clean, sanitised and preview_ready, once each and in that order."
    category: audit
    applies_to: "processEvidenceItem"
    trigger: "Happy path"
    logic: "After U23's received event, the chain is received, validated, scan_clean, sanitised, preview_ready; scan_unavailable events may sit between validated and scan_clean. Custody is append-only (0003 trigger)."
    violation: "A missing or duplicated custody event (acceptance 'Stage order')"
    source: "T-304 acceptance 'Stage order', AD-7"
  - id: BR7.3
    statement: "Log lines carry only allowlisted fields."
    category: privacy
    applies_to: "Logger calls in the use case, handler and adapters"
    trigger: "Every log line"
    logic: "Allowed: event, correlationId, itemId, eventId, stage, outcome, failReason, attempt, cause, durationMs, errorCode. Never the original filename (the pipeline never reads it), the account id, the signature name, bytes or storage keys."
    violation: "A log line that could identify the uploader or the file (AC7.1.6)"
    source: "01 §11, FR68, AC7.1.6, T-304 threat 'Log leaks file names'"
  - id: BR7.4
    statement: "The pipeline writes no audit_events rows; the custody chain is its record."
    category: audit
    applies_to: "processEvidenceItem"
    trigger: "Always"
    logic: "No AuditWriter in the deps. Staff and author actions on evidence (removal, original access, holds) keep writing audit rows in their own Units."
    violation: "Leaning on the worker's unratified INSERT on audit_events (FD-092 (e))"
    source: "01 §5 (commands), AD-7, Question 13"
  - id: BR7.5
    statement: "A malware signature name is stored only in custody, and only in a safe shape."
    category: privacy
    applies_to: "scan_detected details"
    trigger: "status = detected"
    logic: "IF signature matches ^[A-Za-z0-9._:-]{1,128}$ THEN store it ELSE store 'unparsed'. It is never logged and never in a payload."
    violation: "Scanner output injected into JSON or logs unbounded"
    source: "T-304 step 1 (scan_detected {signature}), defensive parsing"

  # Group 8 — Privileges and boundaries
  - id: BR8.1
    statement: "The worker's database role cannot read or change the original filename or the uploader of an evidence item."
    category: authorization
    applies_to: "rk_worker grants on evidence_items"
    trigger: "Migration (U23 step 8, or this Unit)"
    logic: "REVOKE SELECT, UPDATE ON evidence_items FROM rk_worker; GRANT SELECT (every column except original_filename_enc, uploaded_by_account_id), UPDATE (the same list) ON evidence_items TO rk_worker; INSERT and DELETE unchanged. Probes: select original_filename_enc, select uploaded_by_account_id and select * as rk_worker → permission denied."
    violation: "ISS-139 left open; a column REVOKE that has no effect (F1)"
    source: "02 §16 PR2, PR3, ISS-139, ISS-239, AD-6, Question 2, FD entry (a)"
  - id: BR8.2
    statement: "Every query the worker runs on evidence_items names its columns."
    category: data-integrity
    applies_to: "PgEvidenceRepository worker methods and any later worker job"
    trigger: "Code review and the grants test"
    logic: "No select of all columns and no returning of all columns on evidence_items from the worker pool; the int test runs each worker method as rk_worker."
    violation: "permission denied at run time after BR8.1"
    source: "BR8.1 consequence, cross-Unit X5"
  - id: BR8.3
    statement: "The worker reaches pipeline code only through @rogikotha/application/worker, whose import graph holds no account, identity, data-requests or mail module."
    category: authorization
    applies_to: "apps/worker, packages/application/src/worker.ts"
    trigger: "pnpm lint and the worker import-graph test"
    logic: "process.ts imports pipeline.ts, custody-details.ts, ports and contracts only; it never imports modules/evidence/index.ts, commands/ or authorization.ts. T-010's lint refuses better-auth, drizzle-orm, pg and modules/identity in the worker."
    violation: "Auth, identity, reveal or delete capability in the worker (AD-6, hard-rule checklist)"
    source: "AD-6, FD-093 (2), T-304 step 5 and acceptance 'Worker boundary'"
  - id: BR8.4
    statement: "The scanner and sanitiser adapters are built only in the worker's composition root."
    category: authorization
    applies_to: "apps/worker/src/container.ts"
    trigger: "Worker start"
    logic: "Only container.ts constructs ClamdScanner and SharpImageSanitiser; the web container builds neither."
    violation: "The web tier parsing or scanning untrusted bytes (T-303 hard rule)"
    source: "01 §1 and §2, T-303 hard-rule checklist"
  - id: BR8.5
    statement: "No storage path comes from the job payload."
    category: security
    applies_to: "processEvidenceItem, Storage"
    trigger: "Every storage call"
    logic: "The original key is read from its artifact row; derivative keys are built from the item's uuid; the storage adapter's key pattern refuses anything else."
    violation: "Path traversal through a forged payload"
    source: "T-303 step 2 (key pattern), T-303 threat 'path traversal'"
  - id: BR8.6
    statement: "The pipeline never makes anything public and never deletes an original."
    category: security
    applies_to: "processEvidenceItem"
    trigger: "Always"
    logic: "Every artifact it writes has public = false; it never writes under public/; it never calls Storage.delete on the original key."
    violation: "An original or unconfirmed copy reaching the public (hard rule)"
    source: "PRODUCT.md hard rule (original evidence never public), AD-6, 02 §7"

  # Group 9 — Adapters
  - id: BR9.1
    statement: "The clamd adapter speaks INSTREAM exactly."
    category: technical
    applies_to: "scanner-clamd"
    trigger: "scan()"
    logic: "TCP to CLAMD_HOST:CLAMD_PORT; write 'zINSTREAM\\0'; for each chunk of at most 64 KiB write a 4-byte big-endian length then the chunk; then a 4-byte zero; read until \\0 or 4 KiB. No third-party clamd client."
    violation: "Bytes that differ from the protocol (asserted by the stub test)"
    source: "T-304 step 2, ClamAV clamd protocol"
  - id: BR9.2
    statement: "Only 'stream: OK' is clean; every reply the adapter does not fully understand means unavailable."
    category: security
    applies_to: "scanner-clamd reply parser"
    trigger: "Reply received"
    logic: "'stream: OK' → clean; 'stream: <sig> FOUND' → detected; 'INSTREAM size limit exceeded' → unavailable(size_limit); ERROR → unavailable(error_reply); anything else, a second reply, a missing terminator or more than 4 KiB → unavailable(protocol)."
    violation: "A misread reply treated as clean (T-304 threat)"
    source: "T-304 step 2 and threat notes, FD-035"
  - id: BR9.3
    statement: "The scanner gives up after 5 seconds to connect and 30 seconds in total."
    category: limit
    applies_to: "scanner-clamd"
    trigger: "scan()"
    logic: "connect timeout 5 s → unavailable(timeout); whole scan 30 s → unavailable(timeout); ECONNREFUSED → unavailable(refused); the run signal → unavailable(timeout); the socket is destroyed in every case."
    violation: "A hung socket holding the run"
    source: "C15 common rules (ClamAV 30 s), 03 §3"
  - id: BR9.4
    statement: "A clean result carries the scanner and signature versions, or it is not clean."
    category: audit
    applies_to: "scanner-clamd version query"
    trigger: "Before each scan"
    logic: "'zVERSION\\0' on its own connection, cached 10 minutes; 'ClamAV 1.5.4/28115/…' → scannerVersion 1.5.4, signatureVersion 28115. IF the query fails or does not parse THEN the scan returns unavailable(version_unknown)."
    violation: "An artifact without the signature version it was checked against"
    source: "T-304 step 2 (zVERSION), hard-rule checklist (hash + versions), Question 11"
  - id: BR9.5
    statement: "sharp is configured once, with fixed bounds, and is the only image library in the pipeline."
    category: technical
    applies_to: "image-sharp"
    trigger: "Adapter construction and each call"
    logic: "concurrency 1, cache off, limitInputPixels 40000000, failOn error, sequentialRead, 30 s timeout; version string from sharp.versions."
    violation: "Unbounded decodes or a second, unchecked image path"
    source: "T-304 step 3, dependency-check log (sharp 0.35.4)"
  - id: BR9.6
    statement: "Inspection reads the header only."
    category: limit
    applies_to: "ImageSanitiser.inspect"
    trigger: "Validating stage"
    logic: "sharp(bytes, {limitInputPixels: false, failOn: 'none'}).metadata() returns format, width, height, pages; it never decodes pixels; an exception → unreadable."
    violation: "Decoding before the pixel check"
    source: "T-304 scope block (sharp metadata for dimensions)"

  # Group 10 — Build, tests and records
  - id: BR10.1
    statement: "The pins that describe the old shapes move in the same commit."
    category: technical
    applies_to: "not-implemented.test.ts, repositories-superset.test.ts, migration-count pins, queue-declaration tests, fakes tests"
    trigger: "Code Generation"
    logic: "The T-304 stub methods (updateState, insertArtifact, recordCustodyEvent) are replaced by the worker methods and leave the stub list; the fake gains them; the two pins of 9 migrations become 10 only if this Unit adds the grants migration; the queue tests expect stately and 150 s."
    violation: "A red pin, or a pin deleted instead of updated"
    source: "ISS-294, T-010 tests, team.md (smoke suite only grows)"
  - id: BR10.2
    statement: "The three new keys exist in en.json and bn.json in the same commit."
    category: content
    applies_to: "packages/i18n"
    trigger: "Code Generation"
    logic: "pnpm i18n:check green; no email.evidence.* key."
    violation: "A key without its Bengali string (project rule)"
    source: "project.md Mandated (both languages), FD-070"
  - id: BR10.3
    statement: "The real-scanner test skips loudly when clamd is absent, and Build and Test needs one run that did not skip."
    category: technical
    applies_to: "clamd.int.test.ts, Build and Test record"
    trigger: "Every test run"
    logic: "IF clamd does not answer within 3 s THEN skip with 'clamd not reachable at <host:port>; start infra (pnpm infra:up) to run scanner tests'. Build and Test records one local run with clamd up in which flagged.jpg is detected and photo.jpg is clean."
    violation: "A silent pass, or an acceptance row met only by a skipped test"
    source: "T-304 step 7, team.md step 3, Question 12"
  - id: BR10.4
    statement: "The contract and data documents follow the code in the same Bolt."
    category: technical
    applies_to: "03 §3–§5, 02 §16 and §17, contract-summary C8 and C15"
    trigger: "Code Generation"
    logic: "Ports MalwareScanner and ImageSanitiser with their new shapes; evidence.process behaviour; evidence.received and stateChanged payloads; the new evidence.scanDelayed; PR2 and PR3 marked applied; the two new state rows."
    violation: "Docs that contradict the code (contract ownership rules)"
    source: "contract-summary 'Breaking changes' and 'Additive changes', D9"
  - id: BR10.5
    statement: "The FD entries are in the decision log before code that depends on them."
    category: technical
    applies_to: "decision-log.md"
    trigger: "WF0 step 3"
    logic: "FD entries (a) and (b) of functional-spec § 18 with the next free numbers."
    violation: "A data-boundary or hard-rule change without its FD entry (project rule)"
    source: "project.md Mandated (decision log binding), contract ownership rules"
  - id: BR10.6
    statement: "Every finding, workaround and assumption gets an ISS row linked to U24, and the Build and Test record lists them."
    category: technical
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Code Generation and Build and Test"
    logic: "Rows for F1–F20 that stay open or are fixed here; status updates for ISS-072, ISS-139, ISS-181, ISS-182, ISS-251, ISS-279 and ISS-164."
    violation: "A defect known only in chat"
    source: "team.md (ISSUES.md is the live register), project.md Mandated"
```

## Summary

| Group | Rules | Theme |
|---|---|---|
| 1 Job entry and claim | BR1.1–BR1.8 | envelope, load, acted-on states, resume, compare-and-set, uploader id, budget, concurrency |
| 2 Validating | BR2.1–BR2.6 | size, integrity, magic bytes, header, scan order, record |
| 3 Scanning | BR3.1–BR3.7 | clean only, malware, outage, schedule, 24 h window, one notice, same bytes |
| 4 Sanitising | BR4.1–BR4.8 | re-encode, verify, one page, private storage, artifact rows, decode errors, closing transaction, cleanup |
| 5 Notices | BR5.1–BR5.5 | no mail by construction, which events, payloads, copy, routing |
| 6 Failures | BR6.1–BR6.6 | mapping, failure transaction, timeouts, retries, originals kept, review untouched |
| 7 Custody and privacy | BR7.1–BR7.5 | allowlists, chain, logs, no audit rows, signature |
| 8 Privileges | BR8.1–BR8.6 | column grants, named columns, worker entry, composition root, no payload paths, never public |
| 9 Adapters | BR9.1–BR9.6 | INSTREAM, strict replies, timeouts, versions, sharp bounds, header-only inspection |
| 10 Build and records | BR10.1–BR10.6 | pins, i18n, loud skip, docs, FD entries, ISS rows |
