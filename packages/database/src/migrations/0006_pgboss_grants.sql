-- pg-boss schema grants (02-data-model.md §16 note 2; T-009 task step 2).
-- The `pgboss` schema itself is installed by `migrate.ts`'s `installPgBoss`
-- step, which runs immediately before this migration file as `rk_app` (the
-- database owner) — so by the time this file runs, `pgboss` and its tables
-- already exist. `rk_worker` gets USAGE + DML only, never CREATE: it must
-- never attempt to run pg-boss's own schema migrations (its `PgBossQueue`
-- always passes `migrate: false`).
--> statement-breakpoint
GRANT USAGE ON SCHEMA pgboss TO rk_worker;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA pgboss TO rk_worker;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA pgboss TO rk_worker;
--> statement-breakpoint
-- A future pg-boss version bump re-runs `installPgBoss` (still as `rk_app`)
-- and may add tables/sequences of its own; default privileges mean
-- `rk_worker` inherits access to those without a further hand-written
-- migration, the same pattern `0001_grants_part1.sql` uses for `public`.
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA pgboss GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rk_worker;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE rk_app IN SCHEMA pgboss GRANT USAGE, SELECT ON SEQUENCES TO rk_worker;