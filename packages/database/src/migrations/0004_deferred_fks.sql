-- Deferred foreign keys (02-data-model.md §16 note 1; task step 9): T-004
-- created `bookmarks.review_id`, `persona_links.review_id` and
-- `enforcements.decision_id` as plain `uuid` columns because `reviews` and
-- `moderation_decisions` did not exist yet. All three would need a Drizzle
-- schema file that imports across an existing import (`schema/account.ts`
-- <-> `schema/moderation.ts` via `accountProfiles`; `schema/identity.ts` <->
-- `schema/review.ts` via `personas`), so they are added here as raw SQL
-- instead of inline `.references()` calls. `evidence_items.hold_id` is NOT
-- here — it is a normal Drizzle-managed FK, already created by
-- `0002_content.sql` (no circular import to avoid).

ALTER TABLE bookmarks
  ADD CONSTRAINT bookmarks_review_id_reviews_id_fk
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
--> statement-breakpoint

ALTER TABLE persona_links
  ADD CONSTRAINT persona_links_review_id_reviews_id_fk
  FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL;
--> statement-breakpoint

ALTER TABLE enforcements
  ADD CONSTRAINT enforcements_decision_id_moderation_decisions_id_fk
  FOREIGN KEY (decision_id) REFERENCES moderation_decisions(id);
--> statement-breakpoint

-- Deferrable: `evidence.publish` sets `evidence_items.published_artifact_id`
-- and the row it points at is written in the same transaction (task step
-- 9); Drizzle 0.45's foreign-key builder has no `deferrable`/
-- `initiallyDeferred` option (verified against its `pg-core/foreign-keys.d.ts`
-- — neither the column-level nor the table-level builder exposes it), so
-- this one constraint can only be expressed as raw SQL, deferrable or not.
ALTER TABLE evidence_items
  ADD CONSTRAINT evidence_items_published_artifact_id_evidence_artifacts_id_fk
  FOREIGN KEY (published_artifact_id) REFERENCES evidence_artifacts(id)
  DEFERRABLE INITIALLY DEFERRED;
