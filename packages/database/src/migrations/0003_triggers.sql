-- Append-only enforcement (02-data-model.md §10) and the community one-level
-- reply-depth guard (02-data-model.md §8, task step 4). Named *_triggers.sql
-- per the task's own step 11 instruction ("rename that migration
-- 0004_triggers.sql"), and numbered 0003 rather than 0004: drizzle-kit's own
-- migration count is zero-indexed (0000_init, 0001_grants_part1 already
-- exist, and `drizzle-kit generate` produced 0002_content.sql, not
-- 0003_content.sql) — same renumbering `ISS-085` already accepted for T-004;
-- this task's `0004_deferred_fks.sql`/`0005_grants_part2.sql` follow the
-- same one-lower numbering.

-- The one sanctioned bypass: `fn_expire_audit` sets `rk.audit_expiry = on`
-- (transaction-local — `set_config(..., true)`) for the single DELETE it
-- issues on `audit_events`; every other UPDATE/DELETE on every append-only
-- table, from every role including the table owner, is still blocked
-- unconditionally. Found live while verifying this migration: without this
-- check, `fn_expire_audit`'s own DELETE tripped its table's trigger and the
-- retention-expiry function could never actually delete anything.
CREATE FUNCTION fn_block_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'audit_events' AND current_setting('rk.audit_expiry', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'append_only_violation: % on % is not permitted', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'raise_exception';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_block_mutation_audit_events BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint
CREATE TRIGGER trg_block_mutation_evidence_custody_events BEFORE UPDATE OR DELETE ON evidence_custody_events
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint
CREATE TRIGGER trg_block_mutation_identity_reveals BEFORE UPDATE OR DELETE ON identity_reveals
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint
CREATE TRIGGER trg_block_mutation_moderation_decisions BEFORE UPDATE OR DELETE ON moderation_decisions
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint
CREATE TRIGGER trg_block_mutation_review_versions BEFORE UPDATE OR DELETE ON review_versions
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint
CREATE TRIGGER trg_block_mutation_retention_bulk_actions BEFORE UPDATE OR DELETE ON retention_bulk_actions
  FOR EACH ROW EXECUTE FUNCTION fn_block_mutation();
--> statement-breakpoint

-- fn_expire_audit: retention expiry deletes through a SECURITY DEFINER
-- function callable only by rk_maintenance/rk_worker (02-data-model.md §10,
-- §16), never PUBLIC.
CREATE FUNCTION fn_expire_audit(before timestamptz) RETURNS void AS $$
BEGIN
  PERFORM set_config('rk.audit_expiry', 'on', true);
  DELETE FROM audit_events WHERE created_at < before;
  PERFORM set_config('rk.audit_expiry', 'off', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
--> statement-breakpoint
REVOKE ALL ON FUNCTION fn_expire_audit(timestamptz) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION fn_expire_audit(timestamptz) TO rk_maintenance, rk_worker;
--> statement-breakpoint

-- fn_comment_depth: a reply to a reply is refused (task step 4) — one level
-- only. Domain code (01-conventions.md §3) enforces the same rule; this is
-- the database-level guard.
CREATE FUNCTION fn_comment_depth() RETURNS trigger AS $$
DECLARE
  parent_has_parent boolean;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT (parent_id IS NOT NULL) INTO parent_has_parent FROM comments WHERE id = NEW.parent_id;
    IF parent_has_parent THEN
      RAISE EXCEPTION 'community.reply_depth: a reply to a reply is not permitted'
        USING ERRCODE = 'raise_exception';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_comment_depth BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION fn_comment_depth();
