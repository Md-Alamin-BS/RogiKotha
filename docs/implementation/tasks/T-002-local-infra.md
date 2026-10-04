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

**Run record:** Claude Code · claude-sonnet-5 · effort medium.

### What changed

Created all five owned files plus one implied by the scope-change block:
`infra/compose/docker-compose.yml` (postgres 18, mailpit, clamav, three named volumes),
`infra/compose/postgres-init/01-roles.sql`, `infra/compose/postgres-init/02-extensions.sql`,
`infra/compose/.env.example`, `infra/compose/README.md`, and
`infra/compose/clamav/rogikotha-test.ndb` (the custom test signature required by the "Scope
change 2026-09-12" block, which the "Owned paths" summary list omitted — see `ISS-042`).

Also appended a 2026-09-13 entry to `docs/status/dependency-check-log.md` (pins: `postgres:18`
unchanged, `clamav/clamav:1.5.4` unchanged, `axllent/mailpit:v1.31.1` — see `ISS-043` for why this
wasn't already present in this worktree), added `infra/compose/.gitattributes` (`* text eol=lf`,
see `ISS-044`), and added `ISS-039` through `ISS-044` to `docs/implementation/ISSUES.md`.

Three deviations from the task's literal inline snippet, all confirmed necessary by running the
actual containers (not assumed) — each is a `// ASSUMPTION(T-002):` comment in
`docker-compose.yml` plus an `ISS-` row:

1. `axllent/mailpit:latest` → `axllent/mailpit:v1.31.1` (the task text itself said to check
   releases and pin a real tag before committing; `ISS-039`).
2. `pgdata:/var/lib/postgresql/data` → `pgdata:/var/lib/postgresql`. The current `postgres:18`
   image (`PG_VERSION 18.6-1.pgdg13+2`) moved to a versioned data directory
   (`PGDATA=/var/lib/postgresql/18/docker`) and declares its own image `VOLUME` one level up; the
   task's literal mount point makes the container exit immediately (`ISS-040`).
3. ClamAV's custom signature bind mount changed from read-only to read-write. The image's `/init`
   entrypoint always runs `chown -R clamav:clamav /var/lib/clamav`, which fails hard against a
   read-only bind mount and exits the container (`ISS-041`).

Additionally, `infra/compose/.gitattributes` (`* text eol=lf`) was added because this Windows
checkout has `core.autocrlf=true` and no repo-root `.gitattributes` — without it, a future
checkout would convert `rogikotha-test.ndb` to CRLF and corrupt its line-based signature format
(`ISS-044`).

### Not done and why

Nothing in scope was skipped. Not attempted (correctly out of scope per the task file): table/
column-level grants (T-004's migration), the clamd client adapter (T-304), the SMTP adapter
(T-101), and the `/api/health` route (T-008).

### Questions for the human

None require a decision before merge. For awareness: `ISS-042` and `ISS-043` note two small
process gaps (a scope-change file not listed in "Owned paths"; a dependency-check-log entry that
existed only as an uncommitted diff in a sibling worktree) — no action needed unless T-006 also
appended the same 2026-09-13 dependency-check-log entry, in which case the merge should just see
identical text on both sides.

### Follow-ups

- T-004: apply `0004_roles.sql` table/column grants against these roles; until then `rk_worker`/
  `rk_maintenance` can connect but see no tables (documented in `infra/compose/README.md`).
- T-008: `/api/health` should report `scanner: unavailable` (not fail startup) whenever clamd
  isn't reachable — this task deliberately does not wire any start-up dependency on ClamAV being
  healthy (FD-035, hard-rule checklist item 1).
- Whoever next edits `infra/compose/docker-compose.yml`: keep the three `// ASSUMPTION(T-002)`
  comments (mailpit tag, postgres volume path, clamav bind-mount mode) — reverting any of them to
  the task's original literal text was confirmed live to break the corresponding container.

### `pnpm check` output summary

N/A — infra only, no application code, no `packages/*` or `apps/*` files touched. `pnpm check`
was not run (nothing for it to check in the owned paths); `docker compose -f
infra/compose/docker-compose.yml config` was used instead as the structural validity check (see
below).

### Hard-rule evidence

Live verification, Docker Desktop running (`docker info` confirmed before touching
`infra/compose/`), from a clean `down -v` state:

- `docker compose -f infra/compose/docker-compose.yml config` — valid, no errors.
- `docker compose -f infra/compose/docker-compose.yml up -d` then `... ps` — postgres and mailpit
  `healthy` within ~10s; clamav `health: starting` then `healthy` after signature download
  (observed healthy within ~1 minute in this run; the task's `start_period: 600s` still covers a
  slower cold pull).
- Roles: `... exec postgres psql -U postgres -d rogikotha -c "\du"` lists `rk_app`, `rk_worker`,
  `rk_maintenance`.
- Extensions: `... exec postgres psql -U rk_app -d rogikotha -c "select current_user, (select
  count(*) from pg_extension where extname in ('pg_trgm','citext','pgcrypto'))"` →
  `rk_app | 3`. Same three extensions confirmed present in `rogikotha_test`.
- Mailpit: `curl -s http://localhost:8025/api/v1/info` → JSON body, `"Version":"v1.31.1"`.
- SMTP port: `node -e "require('net').connect(1025,'localhost')..."` → `ok`.
- Version pins: `grep -n "clamav/clamav:1.5.4" infra/compose/docker-compose.yml` (line 38, one
  match); `grep -n "axllent/mailpit:" infra/compose/docker-compose.yml` → `v1.31.1`, not `latest`.
- Reset: `down -v` then `up -d` again — fresh volumes confirmed (roles/extensions queries re-ran
  clean, no "already exists" errors), init scripts re-executed.
- No secrets committed: `grep -E "KEY=|SECRET=" infra/compose/.env.example` → both
  `APP_ENCRYPTION_KEY=` and `BETTER_AUTH_SECRET=` present with empty values only.
- Custom ClamAV signature (Scope change 2026-09-12 / CR-001 / FD-036): copied a file containing
  the ASCII bytes `ROGIKOTHA-MALWARE-TEST-MARKER` into the running container and ran
  `clamscan /tmp/flagged.jpg` → `RogiKotha.Test.Marker.UNOFFICIAL FOUND` (exit code 1, which is
  clamscan's normal "infected file found" exit status, not a failure).

Hard-rule checklist:

- [x] Original evidence is never served publicly; scanning that cannot run fails closed (this
      task must not make the scanner a hard start-up dependency) — no `depends_on: condition:
      service_healthy` from any other service onto `clamav` exists anywhere in
      `docker-compose.yml`; `clamav`'s own healthcheck only gates its own container's reported
      status, and `README.md` documents "nothing in the application may depend on the clamav
      container reporting healthy at start-up" and the `MalwareScanner` port's
      `status: 'unavailable'` fail-closed contract (`docker-compose.yml`, `README.md` "Confirming
      each service is ready").
- [x] No agent/tool attribution in any file or commit — checked every file created in this task
      (`docker-compose.yml`, both `.sql` files, `.env.example`, `README.md`,
      `rogikotha-test.ndb`) plus the commit message body before pushing; none reference any
      agent, tool, or model name.

---

## Hand-off — re-work 2026-09-13 (ISS-057 S1, ISS-058 S3)

**Run record:** Claude Code · claude-opus-5[1m] · effort high · start `7e4296a`
(pre-rebase branch head) → rebased onto `bb954af` as `7bcf911`/`f2051fa` → re-work commit
`ebef8bc`, hash recorded by the commit immediately after it (a commit cannot carry its own hash —
`ISS-038`). Task class is M0, whose implement tier is
`GPT-5.6 Luna / Claude Haiku 4.5 · medium`; this session ran a **higher** tier than recommended,
which `LOOP.md` §0.1 permits (only a *lower* tier than recommended is a stop condition, and only
for M3).

### What changed

Documentation only — no compose file, SQL, `.env.example`, signature file or container behaviour
was touched. `git diff` against the pre-fix branch head covers exactly two prose passages in
`infra/compose/README.md` plus register files.

1. **`ISS-057` (S1, the merge blocker).** `infra/compose/README.md` "Storage and disk notes" said
   "(see the user's global Claude instructions)", putting a tool brand name into committed product
   documentation — forbidden by `AGENTS.md` ("README.md and any other documentation file"). It now
   reads "(see the owner's local disk-maintenance notes, outside this repo)". The pointer still
   works for a human — the two script names (`disk-report.ps1`, `disk-cleanup.ps1`) were already
   in the same sentence and are what a reader actually needs — but names no tool, model or vendor.
2. **`ISS-058` (S3).** The same file's "Custom test signature" section still described the
   `.ndb` bind mount as read-only, which was the scope-change block's original wording and not
   what shipped. It now says **read-write**, states the reason (the image entrypoint's
   `chown -R clamav:clamav /var/lib/clamav` fails against a read-only mount and exits the
   container), points at `ISS-041` and at the matching `// ASSUMPTION(T-002)` comment beside the
   mount in `docker-compose.yml`, and adds that nothing in the app writes to the file. The README,
   the compose comment and the issue row now agree.
3. Register files: `ISS-057` and `ISS-058` marked fixed; new `ISS-059`, `ISS-060`, `ISS-061`
   (below); `docs/implementation/README.md` §5 tracker row moved `FAIL` → `validating`.

### Correction to the original hand-off

The original hand-off's second hard-rule checkbox ("No agent/tool attribution in any file or
commit — checked every file created in this task ... none reference any agent, tool, or model
name") was **not accurate for `README.md`** at the time it was written; that is precisely what
`ISS-057` found. It is accurate now — see the evidence below.

### Not done and why

- **No new smoke assertion**, contrary to `LOOP.md` §1.2.5. The task file's own "Tests to write"
  row is "None (infrastructure)", the change is two sentences of prose, and
  `vitest.workspace.ts` discovers projects only under `packages/*` and `apps/*` — a test placed in
  this task's owned `infra/compose/` tree would never be collected, and widening the globs means
  editing T-001's `vitest.workspace.ts`, outside T-002's owned paths. Logged as `ISS-059`; the
  cumulative suite was re-run instead (see below).
- **No automated guard** for the rule `ISS-057` broke. A repo-wide grep over tracked files, with
  `docs/implementation/**` and `docs/validation/**` excluded (`LOOP.md` §0.1 *requires* a
  `TOOL · MODEL · EFFORT` run record in those), belongs in `pnpm check` / the CI workflow, both
  owned by T-010. Logged as `ISS-060` against T-010.
- **`BUILD-LOG.md` now has two rows for the same 13:27 "T-002 validated FAIL" event** — the two
  sides of a rebase conflict, kept per `LOOP.md` §1.2.7 ("keep both sides' rows"). `ISS-061`.

### Questions for the human

None. This was a prose fix inside the task's own owned file; no product, data-boundary or
founder decision was involved, so nothing under `LOOP.md` §1.2.4's "ask the human" list applies.

### `pnpm check` output summary

Run in the `rk-T-002` worktree **after** rebasing onto `origin/build/demo` (`bb954af`, i.e. with
T-006's i18n package present), both before and after the edit:

- `pnpm install --ignore-scripts` (per `ISS-055`) — clean.
- `pnpm check` — **green end to end**: `typecheck` (9 projects), `lint` (`eslint .`, no findings),
  `test` 18/18 in 4 files, `i18n:check` "764 keys, both locales, no placeholder or ERROR_CODES
  mismatches" (its ERROR_CODES half still self-skips until T-003 creates
  `packages/contracts/src/errors.ts`), `build` (9 projects).
- `pnpm smoke` — **4/4 passed**, 2 files. No assertion added or removed (`ISS-059`).

This is the first `pnpm check` run this task has ever had that exercises real code: the original
hand-off recorded "N/A — infra only" because on the pre-T-006 base the command stopped at
`i18n:check`.

### Hard-rule evidence (re-verified for this change)

- **No agent/tool attribution in any file or commit** —
  `git diff origin/main...HEAD | grep -inE "claude|gpt|opus|sonnet|haiku|luna|terra|sol|copilot|codex|anthropic|openai|puku|chatgpt|co-authored"`
  now returns matches only inside `docs/implementation/**` and `docs/validation/**`, where
  `LOOP.md` §0.1 mandates a `TOOL · MODEL · EFFORT` run record and where the `ISS-057` finding
  necessarily quotes the offending sentence to be intelligible. Zero matches under `infra/`,
  `packages/`, `apps/`, or any other product path:
  `grep -rinE "claude|opus|sonnet|haiku|codex|puku|anthropic|openai" infra/` → no output.
  `git log origin/main..HEAD --format='%an <%ae> | %cn <%ce> | %s'` → author and committer
  are the human's identity on every commit; no `Co-Authored-By` trailer, no tool name in any
  subject or body.
- **Scanner is not a start-up dependency (fail-closed)** — unchanged by this edit and re-checked:
  `grep -n depends_on infra/compose/docker-compose.yml` → no matches at all, so nothing waits on
  `clamav`'s health. The README's fail-closed paragraph ("`status: 'unavailable'`", item stays
  `scanning`) is untouched.

Hard-rule checklist (re-work):

- [x] Original evidence is never served publicly; scanning that cannot run fails closed — no
      `depends_on` edge onto `clamav` exists; not touched by this change.
- [x] No agent/tool attribution in any file or commit — now true for `infra/compose/README.md`,
      the file `ISS-057` was raised against; verified by the greps above.
