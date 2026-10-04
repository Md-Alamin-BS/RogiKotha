-- Grants for §6–§8, §12–§14 (02-data-model.md §16; task step 12), and the
-- FD-037 / ISS-107 default-deny flip for `rk_worker`.
--
-- FD-037: "rk_worker's default privileges flip to default-deny... change
-- 0001_grants_part1.sql's ALTER DEFAULT PRIVILEGES ... to a default-deny
-- posture ... then explicitly GRANT only the specific privileges rk_worker
-- actually needs, table by table." Migrations are forward-only
-- (01-conventions.md §12) — 0001_grants_part1.sql is not edited in place.
-- Two things are needed, not one:
--   1) Flip the DEFAULT PRIVILEGES rule itself, so every table rk_app
--      creates *after* this migration grants rk_worker nothing until an
--      explicit GRANT is added (this alone does not touch existing tables —
--      PostgreSQL's ALTER DEFAULT PRIVILEGES only affects objects created
--      after it runs, for the role it names).
--   2) Because 0002_content.sql's 28 tables were created *after* 0001's
--      default-allow rule was already active, every one of them already
--      inherited SELECT/INSERT/UPDATE/DELETE for rk_worker at CREATE TABLE
--      time — the flip in (1) does not retroactively remove that. Every one
--      of those 28 tables is explicitly REVOKEd here, then only the
--      02-data-model.md §16 allowlist is granted back, table by table (and
--      column by column where the model says so). Tables created in
--      0000_init.sql (account_profiles, account_preferences, staff_devices,
--      …) predate 0001's default-privileges rule entirely, so they were
--      never covered by the old default-allow and need no retroactive
--      REVOKE — only the new, narrow GRANTs below.

-- 1) Flip the default going forward.
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA public REVOKE ALL ON TABLES FROM rk_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA public REVOKE ALL ON SEQUENCES FROM rk_worker;
--> statement-breakpoint

-- 2) Strip what the old default-allow rule already granted on every table
--    0002_content.sql created.
REVOKE ALL ON
  reviews, review_tags, review_versions, review_follow_ups, review_drafts, facility_reviews,
  evidence_items, evidence_artifacts, evidence_redactions, evidence_custody_events,
  legal_holds, retention_policies, retention_bulk_actions,
  comments, comment_mentions, reactions,
  reports, moderation_cases, moderation_case_reasons, moderation_decisions, appeals,
  notifications, staff_notifications, email_deliveries, outbox_events,
  search_documents, search_aliases,
  data_requests
FROM rk_worker;
--> statement-breakpoint
REVOKE ALL ON SEQUENCE moderation_case_seq FROM rk_worker;
--> statement-breakpoint

-- 3) Explicit allowlist (02-data-model.md §16): full DML on evidence,
--    notifications/email/outbox, search, retention (policies + bulk
--    actions — the retention.expire job reads/writes both), data_requests.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  evidence_items, evidence_artifacts, evidence_custody_events, evidence_redactions,
  notifications, staff_notifications, email_deliveries, outbox_events,
  search_documents, search_aliases,
  retention_policies, retention_bulk_actions,
  data_requests
TO rk_worker;
--> statement-breakpoint

-- legal_holds: select only (the worker checks holds before expiring an
-- original; only staff place/release a hold).
GRANT SELECT ON legal_holds TO rk_worker;
--> statement-breakpoint

-- reviews: select + update of state/deleted_at only (retention/notification
-- jobs transition state and soft-delete; they never touch review content).
GRANT SELECT ON reviews TO rk_worker;
--> statement-breakpoint
GRANT UPDATE (state, deleted_at) ON reviews TO rk_worker;
--> statement-breakpoint

-- review_versions: insert only (system-actor version rows for worker-driven
-- transitions, e.g. retention expiry).
GRANT INSERT ON review_versions TO rk_worker;
--> statement-breakpoint

-- comments: select/update (moderation-effect state changes relayed via the
-- outbox reach comments through the worker in some flows).
GRANT SELECT, UPDATE ON comments TO rk_worker;
--> statement-breakpoint

-- reports: select of everything *except* reporter_account_id (hard rule —
-- reporter identity never reaches the worker or any public path).
GRANT SELECT (id, target_kind, target_id, review_id, reason, created_at) ON reports TO rk_worker;
--> statement-breakpoint

-- personas / account_profiles / account_preferences / auth_users: narrow
-- reads the notification/mail jobs need (02-data-model.md §16 note 3 — the
-- one, deliberate, documented exception: rk_worker reads only
-- auth_users.id and auth_users.email so mail.send has an address; it has no
-- privilege on any other auth_* table, and the web tier still owns every
-- write to auth_users). `personas` is already granted in 0001_grants_part1.sql.
GRANT SELECT (id, username, display_name, locale, status) ON account_profiles TO rk_worker;
--> statement-breakpoint
GRANT SELECT ON account_preferences TO rk_worker;
--> statement-breakpoint
GRANT SELECT (id, email) ON auth_users TO rk_worker;
--> statement-breakpoint

-- rk_maintenance (02-data-model.md §16). EXECUTE on fn_expire_audit is
-- already granted in 0003_triggers.sql, alongside the function's own
-- CREATE FUNCTION statement.
GRANT DELETE ON notifications, email_deliveries TO rk_maintenance;
