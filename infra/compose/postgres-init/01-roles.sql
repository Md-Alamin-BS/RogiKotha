-- Roles from docs/implementation/02-data-model.md §16.
--
-- Table-level and column-level grants (rk_worker's revokes on auth_*, persona_links,
-- identity_reveals, blocks, bookmarks, reports.reporter_account_id,
-- evidence_items.original_filename_enc; rk_maintenance's retention/backup grants) are applied by
-- migration 0004_roles.sql (T-004), because the tables do not exist yet when this script runs
-- against a fresh volume. This script only creates the roles, the test database, and
-- database-level CONNECT grants so those roles can log in and migrations can run.
CREATE ROLE rk_app LOGIN PASSWORD 'rk_app';
CREATE ROLE rk_worker LOGIN PASSWORD 'rk_worker';
CREATE ROLE rk_maintenance LOGIN PASSWORD 'rk_maintenance';

CREATE DATABASE rogikotha_test OWNER rk_app;
ALTER DATABASE rogikotha OWNER TO rk_app;

GRANT CONNECT ON DATABASE rogikotha TO rk_worker, rk_maintenance;
