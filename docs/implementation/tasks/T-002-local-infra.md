# T-002 — Local infrastructure (PostgreSQL, Mailpit, ClamAV)

| Field | Value |
|---|---|
| Story | STORY-FOUND-001 — Architecture-enforced application foundation (local composition) |
| Phase / Lane | 0 / A |
| Class → model | M0 → GPT-5.6 Luna (alt Claude Haiku 4.5); validator: Claude Sonnet 5 (quick pass) |
| Effort setting | Luna `medium` |
| Estimate | 1–1.5 h agent; validation 0.5 h |
| Depends on | — (T-001 provides the `infra:*` root scripts; this task can start in parallel and be tested with `docker compose` directly) |
| Parallel-safe with | T-001, T-003, T-006 |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


Add a custom ClamAV signature so malware detection is demonstrable with a harmless file: create
`infra/compose/clamav/rogikotha-test.ndb` containing one line
`RogiKotha.Test.Marker:0:*:<hex of "ROGIKOTHA-MALWARE-TEST-MARKER">` (ndb format
`Name:TargetType:Offset:HexSignature`, target 0 = any file) and bind-mount it read-only into the
container's database directory (`/var/lib/clamav/rogikotha-test.ndb`). Verify with
`docker compose exec clamav clamscan /path/to/flagged.jpg` → `FOUND`. Note in `.env.example` that the
first start downloads ≈ 300 MB of official signatures and the custom file loads alongside them.

## Goal

Provide the three local services the demo needs — PostgreSQL 18 with the three application roles, Mailpit as the SMTP sink, ClamAV as the scanner — as one Docker Compose file, plus the `.env.example` that every later task reads variable names from. The application must start even when ClamAV is still downloading signatures.

## Read first

1. `docs/implementation/00-master-plan.md` §3 (rows PostgreSQL, ClamAV, Mailpit), FD-035
2. `docs/implementation/02-data-model.md` §16 (roles and grants)
3. `docs/implementation/01-conventions.md` §11 (secrets, fail-closed)
4. `docs/implementation/03-routes-and-contracts.md` §1 route handlers (`/api/health` semantics) and §3 (`MalwareScanner`, `Mailer`, `Storage` ports)
5. Global disk notes in the user's `CLAUDE.md`: Docker's vhdx grows on every build; keep images minimal

## Owned paths

Create: `infra/compose/docker-compose.yml`, `infra/compose/postgres-init/01-roles.sql`, `infra/compose/postgres-init/02-extensions.sql`, `infra/compose/.env.example`, `infra/compose/README.md`
Modify: none (root `.env.example` is a copy made by the human; `.env` is git-ignored by T-001)

## Not in scope

- Production topology, reverse proxy, Garage, backups (STORY-OPS-001).
- Any application code; the clamd client and SMTP adapter are T-304 / T-101.
- Creating the database schema (T-004).

## Steps

1. `infra/compose/docker-compose.yml`:
   ```yaml
   name: rogikotha
   services:
     postgres:
       image: postgres:18
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: rogikotha
       ports: ["5432:5432"]
       volumes:
         - pgdata:/var/lib/postgresql/data
         - ./postgres-init:/docker-entrypoint-initdb.d:ro
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U postgres -d rogikotha"]
         interval: 5s
         timeout: 3s
         retries: 20
     mailpit:
       image: axllent/mailpit:latest
       ports: ["1025:1025", "8025:8025"]
       environment:
         MP_SMTP_AUTH_ACCEPT_ANY: 1
         MP_SMTP_AUTH_ALLOW_INSECURE: 1
       volumes:
         - mailpit:/data
     clamav:
       image: clamav/clamav:1.5.4
       ports: ["3310:3310"]
       environment:
         CLAMAV_NO_FRESHCLAMD: "false"
       volumes:
         - clamdb:/var/lib/clamav
       healthcheck:
         test: ["CMD", "clamdcheck.sh"]
         interval: 30s
         timeout: 10s
         start_period: 600s
         retries: 5
   volumes:
     pgdata:
     mailpit:
     clamdb:
   ```
   Notes to write into `README.md`: pin `clamav/clamav:1.5.4` (never `latest`; 1.5.4 carries the 2026 CVE fixes); on first start ClamAV downloads ≈ 300 MB of signatures and can take several minutes before `clamd` accepts connections — the health check `start_period` covers that; **nothing in the app may depend on the container being healthy** (the scanner port reports `unavailable` and the pipeline fails closed). Mailpit: check `https://github.com/axllent/mailpit/releases` and pin the current stable tag instead of `latest` before committing; record the tag in the hand-off. Named volumes only — no bind mounts of source directories (Windows file-sharing performance and permission problems). Postgres init scripts run only on a fresh volume; `pnpm infra:reset` (down `-v`) is the way to re-run them.
2. `postgres-init/01-roles.sql` — creates the roles from data-model §16 with passwords for local use and an application database owned by `rk_app`:
   ```sql
   CREATE ROLE rk_app LOGIN PASSWORD 'rk_app';
   CREATE ROLE rk_worker LOGIN PASSWORD 'rk_worker';
   CREATE ROLE rk_maintenance LOGIN PASSWORD 'rk_maintenance';
   CREATE DATABASE rogikotha_test OWNER rk_app;
   ALTER DATABASE rogikotha OWNER TO rk_app;
   GRANT CONNECT ON DATABASE rogikotha TO rk_worker, rk_maintenance;
   ```
   Table-level grants are applied by the migrations (T-004 `0004_roles.sql`), because tables do not exist yet at init time; document that here.
3. `postgres-init/02-extensions.sql` — run against both databases: `CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS citext; CREATE EXTENSION IF NOT EXISTS pgcrypto;` (use `\c rogikotha` / `\c rogikotha_test` in a `.sql` file — the entrypoint runs `.sql` files with `psql`, so `\c` works). `uuidv7()` is built into PostgreSQL 18; no extension.
4. `infra/compose/.env.example` — every variable the plan uses, with local values and one comment line each:
   ```
   APP_MODE=development            # development | demo | production — AD-14 assertion at start-up
   APP_URL=http://localhost:3000
   DATABASE_URL=postgres://rk_app:rk_app@localhost:5432/rogikotha
   DATABASE_URL_WORKER=postgres://rk_worker:rk_worker@localhost:5432/rogikotha
   DATABASE_URL_TEST=postgres://rk_app:rk_app@localhost:5432/rogikotha_test
   DATABASE_URL_MAINTENANCE=postgres://rk_maintenance:rk_maintenance@localhost:5432/rogikotha
   APP_ENCRYPTION_KEY=              # 32 bytes base64 — generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   BETTER_AUTH_SECRET=              # 32+ random chars — same command
   SMTP_HOST=localhost
   SMTP_PORT=1025
   MAIL_FROM=RogiKotha <no-reply@demo.rogikotha.local>
   MAILPIT_URL=http://localhost:8025   # shown on the verify-email screen when APP_MODE != production
   CLAMD_HOST=localhost
   CLAMD_PORT=3310
   STORAGE_ROOT=./.data/storage
   LOG_LEVEL=info
   ```
   Do not put generated secrets in the example file; the README tells the human to copy it to the repo root as `.env` and fill the two keys.
5. `infra/compose/README.md`: start/stop/reset commands (`pnpm infra:up` etc. from T-001; or `docker compose -f infra/compose/docker-compose.yml up -d` directly), URLs (Mailpit UI `http://localhost:8025`), how to confirm ClamAV is ready (`docker compose -f infra/compose/docker-compose.yml exec clamav clamdscan --version` or `docker compose … logs clamav | grep "Listening daemon"`), the disk note (vhdx growth; compact per the owner's disk-cleanup routine), and the fact that the ClamAV service can be stopped to demonstrate fail-closed behaviour (storyboard step 12).
6. Verify from a clean state: `docker compose -f infra/compose/docker-compose.yml down -v && docker compose -f infra/compose/docker-compose.yml up -d`, then `docker compose -f infra/compose/docker-compose.yml ps` shows postgres healthy and mailpit running within 30 s; `docker compose … exec postgres psql -U rk_app -d rogikotha -c "select current_user, (select count(*) from pg_extension where extname in ('pg_trgm','citext','pgcrypto'))"` returns `rk_app | 3`; `curl -s http://localhost:8025/api/v1/info` returns JSON; ClamAV eventually logs `Listening daemon` (may take minutes; not required to pass).
7. Commit: `T-002: local compose for postgres 18, mailpit, clamav 1.5.4`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Stack starts | `pnpm infra:up && docker compose -f infra/compose/docker-compose.yml ps` | postgres `healthy`, mailpit `running`, clamav `starting` or `healthy` |
| Roles exist | `docker compose -f infra/compose/docker-compose.yml exec postgres psql -U postgres -d rogikotha -c "\du"` | `rk_app`, `rk_worker`, `rk_maintenance` listed |
| Extensions in both DBs | `… psql -U postgres -d rogikotha_test -c "select extname from pg_extension"` | includes `pg_trgm`, `citext`, `pgcrypto` |
| Mailpit reachable | `curl -s http://localhost:8025/api/v1/info` | JSON with version |
| SMTP port open | `node -e "require('net').connect(1025,'localhost').on('connect',()=>{console.log('ok');process.exit(0)})"` | `ok` |
| ClamAV pinned | `grep -n "clamav/clamav:1.5.4" infra/compose/docker-compose.yml` | one match |
| Mailpit pinned | `grep -n "axllent/mailpit:" infra/compose/docker-compose.yml` | a version tag, not `latest` |
| Reset works | `pnpm infra:reset && pnpm infra:up` | fresh volumes; init scripts re-run |
| No secrets committed | `git diff --cached -- infra/compose/.env.example \| grep -E "KEY=|SECRET=" ` | values empty |

## Tests to write

- None (infrastructure). The `/api/health` check in T-008 and the database integration test in T-004 exercise this stack.

## Hard-rule checklist

- [ ] Original evidence is never served publicly; scanning that cannot run fails closed (this task must not make the scanner a hard start-up dependency).
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
