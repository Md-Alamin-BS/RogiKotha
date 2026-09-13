-- Role grants for §1–§5, §9, §11, §15 (02-data-model.md §16; task step 12).
-- Roles themselves are created by infra/compose/postgres-init/01-roles.sql
-- (T-002) against a fresh volume, before any table exists; this migration
-- only grants on tables that exist as of this task.
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO rk_app, rk_worker, rk_maintenance;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rk_app;
--> statement-breakpoint
-- Explicit and redundant with "no grant given" on a fresh role, but stated
-- so the private-linkage boundary (01-conventions.md §5, AD-3) is visible
-- in the migration itself, not only in application code.
REVOKE ALL ON auth_users, auth_sessions, auth_accounts, auth_verifications, persona_links, identity_reveals, blocks, bookmarks FROM rk_worker;
--> statement-breakpoint
GRANT SELECT ON personas, doctors, facilities, facility_branches, taxonomy_terms, taxonomy_aliases, config_versions TO rk_worker;
--> statement-breakpoint
GRANT INSERT ON audit_events TO rk_worker;
--> statement-breakpoint
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO rk_app, rk_worker;
--> statement-breakpoint
-- Default privileges so T-005's tables (evidence, notifications, outbox,
-- search, retention, data_requests — 02-data-model.md §16) inherit worker
-- access the moment rk_app's migrations create them; T-005 tightens
-- per-table/per-column where the worker must not see private data (e.g.
-- `reports.reporter_account_id`, `evidence_items.original_filename_enc`).
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rk_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rk_worker;
