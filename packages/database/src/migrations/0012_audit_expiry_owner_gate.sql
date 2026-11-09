-- FD-123 (ISS-141, ISS-148): the append-only escape hatch now checks who is
-- asking, not only the `rk.audit_expiry` flag. Before this, any role holding
-- DELETE on audit_events (rk_app, the web tier, owns the table) could set the
-- transaction-local flag with set_config() and delete audit rows.
--
-- The bypass now needs all of:
--   * a DELETE on audit_events while `rk.audit_expiry = on`, as before;
--   * session_user = 'rk_maintenance', the retention role (02-data-model.md
--     §10, §16). session_user is the login role: it does not change inside a
--     SECURITY DEFINER function or after SET ROLE, and no rk_* role is a
--     member of another;
--   * current_user = the owner of fn_expire_audit, which holds only while that
--     SECURITY DEFINER function runs. rk_maintenance has no DELETE on
--     audit_events of its own, so this is defence in depth.
-- Every other UPDATE or DELETE on the six append-only tables raises
-- append_only_violation, whichever role sets the flag. The table owner can
-- still disable a trigger with ALTER TABLE; that comes with ownership, not with
-- this trigger, and is recorded as ISS-816.
--
-- CREATE OR REPLACE keeps the six triggers of 0003_triggers.sql attached. Both
-- functions pin search_path with pg_temp last, so a caller's search_path or a
-- temporary table cannot steer their name resolution (ISS-148).
CREATE OR REPLACE FUNCTION fn_block_mutation() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND TG_TABLE_NAME = 'audit_events'
     AND current_setting('rk.audit_expiry', true) = 'on'
     AND session_user = 'rk_maintenance'
     AND current_user = (
       SELECT pg_get_userbyid(p.proowner)
       FROM pg_proc p
       WHERE p.oid = 'public.fn_expire_audit(timestamptz)'::regprocedure
     )
  THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'append_only_violation: % on % is not permitted', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'raise_exception';
END;
$$ LANGUAGE plpgsql SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
ALTER FUNCTION fn_expire_audit(timestamptz) SET search_path = pg_catalog, public, pg_temp;
--> statement-breakpoint
-- PR1 of 02-data-model.md §16: only rk_maintenance runs audit expiry. With the
-- gate above an rk_worker call can never delete a row, so the grant goes rather
-- than staying in place looking usable.
REVOKE EXECUTE ON FUNCTION fn_expire_audit(timestamptz) FROM rk_worker;
