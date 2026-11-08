# Build instructions — RogiKotha release 1

Build and Test for intent `261011-aidlc-adoption`, run on `main` at `e09b558` (all ten release-1
Units merged and reviewed), in the worktree `bolt/build-and-test`. The demo composition is local
only (FD-031, D11); there is no staging or production build.

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 24.x (`engines.node` is `>=24 <25`; run on 24.19.0) | `node -v` |
| pnpm | 11.x (`packageManager` pins 11.20.0) | `pnpm -v` |
| Docker Desktop | running, compose v2 | `docker ps` |
| Free disk | about 6 GB (DEMO.md); Docker's disk file grows with every reset | — |

## Dependency installation

```bash
pnpm install --frozen-lockfile
```

The workspace is the root plus `apps/web`, `apps/worker` and seven `packages/*`
(`domain`, `contracts`, `application`, `database`, `adapters`, `i18n`, `test-support`). The
Playwright Chromium browser is needed for the browser suites: `pnpm --filter @rogikotha/web exec
playwright install chromium`.

## Environment setup

1. Copy `infra/compose/.env.example` to `.env` at the repository root and fill the three keys
   (`APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `MAIL_RECIPIENT_KEY`) with
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. `pnpm demo`
   does this itself on a first run. Never commit `.env`.
2. Start the local services: `pnpm infra:up` (PostgreSQL 18 on host port 5433, Mailpit on 1025 and
   8025, ClamAV on 3310, from `infra/compose/docker-compose.yml`). Skip this when the containers are
   already healthy; this run used the running `rogikotha-*` containers and did not recreate them.
3. Databases (one PostgreSQL server, separate databases):

   | Variable | Database | Used by |
   |---|---|---|
   | `DATABASE_URL`, `DATABASE_URL_WORKER`, `DATABASE_URL_MAINTENANCE` | `rogikotha` | the demo (web, worker, maintenance role) |
   | `DATABASE_URL_TEST` | `rogikotha_test` (a parallel worktree uses `rogikotha_test_w<n>`; this run used `rogikotha_test_w9`) | `pnpm test:int`, `pnpm test:coverage`, `pnpm smoke` |
   | fixed by `apps/web/e2e/helpers/env.ts` | `rogikotha_e2e_test` | `pnpm e2e`, `pnpm e2e:perf` (port 3107, lock `.data/e2e.lock`) |

   A new test database is created as `postgres` with owner `rk_app`, then `pg_trgm`, `citext` and
   `pgcrypto`: `docker exec rogikotha-postgres-1 psql -U postgres -c "create database <name> owner
   rk_app"` and `... -d <name> -c "create extension if not exists pg_trgm; create extension if not
   exists citext; create extension if not exists pgcrypto"`. `pnpm db:reset` and `pnpm db:seed`
   act on whatever `DATABASE_URL` names; the test runs' stale-backend sweep only acts on a name
   ending in `_test`, `_test_b` or `_test_w1`..`_test_w9`, and `migrate`, `reset` and `seed` refuse
   `APP_MODE=production` (AD-14).

## Build commands

```bash
pnpm build                                              # pnpm -r build: every package and both apps
pnpm --filter @rogikotha/web build                      # next build (Next.js 16), output apps/web/.next
pnpm --filter @rogikotha/web --filter @rogikotha/worker build   # the pair `pnpm e2e` builds first
```

The worker build is `tsc -p tsconfig.build.json` into `apps/worker/dist`; the browser suite runs the
worker from its TypeScript source under its own `tsx` loader (ISS-193, ISS-759). Typecheck alone is
`pnpm typecheck` (strict TypeScript 6 in every package, including `apps/web/e2e`).

## Build verification

- `pnpm build` exits 0 and the Next.js route table lists every release-1 route (`/[locale]`,
  doctors, facilities, topics, experiences and their edit page, write, authors, me and me/security,
  register, sign-in, verify-email, reset-password, emergency, about, terms, privacy, the staff
  `admin/*` shell routes, `/api/auth/[...all]`, `/api/evidence/upload`, `/api/health`) and the
  proxy (middleware).
- `pnpm check` is the single local gate: typecheck, lint (boundaries included), the boundaries
  fixture, `format:check`, `check:identity`, `test:coverage` (unit and integration tests with the
  80% per-package line floor), `i18n:check`, `contrast`, `contrast:patient`, `check:motion` and the
  build.
- A running build answers `GET /api/health` with `{ ok, db, queue, mail, scanner, mode }`.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `pnpm test:int` or `test:coverage` hangs on reset | another client holds a lock on the test database; the reset sweeps this role's stale backends on a test database (CR-007) and times out after 10 s; stop the other run |
| A vitest worker dies with exit `3221225477` or `139`, or a test hits the 5000 ms timeout under load | known Windows/Node crash and load sensitivity; rerun once before trusting a red (team practice) |
| `pnpm e2e` waits on `.data/e2e.lock` | another browser run in the same checkout holds it; wait, never delete it while a run is live |
| Port 3107 is taken | another browser suite is running; the suite never uses the demo's port 3000 |
| `next build` reports a stale type or route | delete `apps/web/.next` and rebuild |
| Docker reports `context deadline exceeded` | Docker's disk is full; see the machine's disk notes, never prune named volumes |
