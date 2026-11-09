-- FD-123 (ISS-139, ISS-632; PR2 and PR3 of 02-data-model.md §16): rk_worker's
-- SELECT and UPDATE on evidence_items become column grants.
--   * original_filename_enc: no SELECT, no UPDATE. The sealed file name is
--     read only by the uploader in the web tier.
--   * uploaded_by_account_id: no SELECT. The author id travels in
--     evidence.stateChanged (C15). UPDATE stays, as PR3 removes SELECT only.
-- INSERT and DELETE stay table-wide, as 0005_grants_part2.sql granted them.
--
-- A table-level REVOKE also revokes the matching column privileges on every
-- column, so the grants below are the whole of rk_worker's SELECT and UPDATE.
-- A column added later is closed to rk_worker until a migration grants it
-- (FD-037). The worker's evidence SQL names its columns (WORKER_ITEM_COLUMNS in
-- repositories/evidence.ts), so none of it reads a revoked column.
-- Proven as a real rk_worker session by validator-probes.int.test.ts (ISS-139).
REVOKE SELECT, UPDATE ON evidence_items FROM rk_worker;
--> statement-breakpoint
GRANT SELECT (
  id, public_id, seed_ref, review_id, "group", label_en, label_bn, state, fail_reason,
  declared_mime, detected_mime, original_bytes, original_sha256, page_count,
  retention_expires_at, hold_id, published_artifact_id, idempotency_key, created_at, updated_at
) ON evidence_items TO rk_worker;
--> statement-breakpoint
GRANT UPDATE (
  id, public_id, seed_ref, review_id, "group", label_en, label_bn, state, fail_reason,
  declared_mime, detected_mime, original_bytes, original_sha256, page_count,
  uploaded_by_account_id, retention_expires_at, hold_id, published_artifact_id,
  idempotency_key, created_at, updated_at
) ON evidence_items TO rk_worker;
