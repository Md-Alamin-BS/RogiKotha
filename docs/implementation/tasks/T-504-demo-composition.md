# T-504 — Demo composition: one-command up, reset, demo clock, storyboard walk-through

| Field | Value |
|---|---|
| Story | STORY-PROT-001 (deterministic demo services, reset), STORY-FOUND-001 (documented checks run from a clean checkout) |
| Phase / Lane | 5 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1.5 h (the validator repeats the walk-through from a clean clone) |
| Depends on | every task T-001 … T-410, T-501, T-502; T-503's suite should be green (its `webServer` uses this task's `demo:serve`) |
| Parallel-safe with | T-503 (coordinate on `demo:serve`), T-505 (starts after this task's walk-through is ticked) |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


Walk the storyboard as amended for images only (steps 6 and 12). The ClamAV custom signature check
(`flagged.jpg` → FOUND) is part of the pre-flight in `pnpm demo`.

## Goal

A presenter with Docker Desktop and Node runs **one command** and gets the whole product on
`http://localhost:3000` with the corpus, the staff accounts, Mailpit and the worker running, plus
`reset` and `clock` commands, and a ten-line `DEMO.md`. Then walk the entire storyboard by hand,
in both languages, and tick every step with what was observed.

## Read first

1. `docs/implementation/00-master-plan.md` §1–§4, §8 (steps 10–11)
2. `docs/implementation/01-conventions.md` §1 (scripts live where), §11, §13
3. `docs/implementation/05-demo-storyboard.md` (all of it — this task verifies it line by line)
4. `docs/implementation/02-data-model.md` §15 (`demo_clock`), §16 (roles)
5. `docs/implementation/03-routes-and-contracts.md` §1 (`/api/demo/clock`, `/api/health`)
6. `infra/compose/docker-compose.yml`, `infra/compose/.env.example` (T-002), `packages/test-support/src/seed/` (T-007), `apps/worker/src/main.ts` (T-009), `apps/web/src/server/app-mode.ts` (T-502)
7. The global disk-maintenance notes in the founder's `~/.claude/CLAUDE.md` (Docker vhdx growth on this machine) — summarise the relevant line in `DEMO.md`

## Owned paths

Create:
- `scripts/demo.mjs` (orchestrator; Node, no extra dependencies; uses `execa`? — no: `node:child_process` only)
- `scripts/demo-reset.mjs`
- `scripts/demo-clock.mjs`
- `scripts/wait-for.mjs` (TCP/HTTP readiness with timeout, used by the three above)
- `DEMO.md` (repo root; presenter-facing)
- `docs/implementation/tasks/T-504-walkthrough-record.md` (the ticked storyboard with observations — separate file so the task file stays readable)

Modify:
- `package.json` (root) — scripts: `demo`, `demo:serve`, `demo:reset`, `demo:clock`, `demo:down`, `demo:logs`
- `infra/compose/docker-compose.yml` — `profiles: ["scan"]` on `clamav` so `pnpm demo` starts it but tolerates failure; named volumes for postgres and clamav signatures; `restart: unless-stopped` **off** (a demo should not resurrect after reboot silently)
- `infra/compose/.env.example` — document every variable `demo.mjs` reads
- `README.md` (repo root) — add a "Run the demo" section pointing at `DEMO.md` (T-505 rewrites the rest of the README)
- `.gitignore` — `.data/`, `.env`

## Not in scope

Production deployment, HTTPS, backups, hosting the demo anywhere but the presenter's machine,
changing seed content (that is T-007; if the walk-through finds a data gap, log a CR).

## Steps

1. **`pnpm demo`** (`scripts/demo.mjs`), each step printed with a timestamp and a ✓/✗:
   1. Preflight: Node ≥ 24, pnpm 11, Docker daemon reachable (`docker info`), free ports 3000, 5432, 1025, 8025, 3310 (on conflict print which process holds it: `netstat -ano | findstr :<port>` on Windows, `lsof -i :<port>` elsewhere, and stop), `.env` exists (else copy `.env.example` and generate `APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET` with `crypto.randomBytes(32)`; print that it did).
   2. `docker compose --profile scan up -d` from `infra/compose`; wait for postgres (`pg_isready` via `docker compose exec`) and Mailpit (`GET :8025/api/v1/info`) up to 90 s; wait for ClamAV up to 120 s **but continue with a warning** if it is not ready (first run downloads signatures; the storyboard's fail-closed step then demonstrates itself).
   3. `pnpm db:migrate` then `pnpm db:seed` if the database is empty (detect via `select count(*) from account_profiles`); otherwise skip and print "existing data kept — run `pnpm demo:reset` for a clean slate".
   4. `pnpm --filter web build` (skip if `.next/BUILD_ID` is newer than the latest source mtime? — no: always build unless `--no-build`; builds are ~1–2 min and stale builds cause confusing demos).
   5. Start `pnpm --filter web start` and `pnpm --filter worker start` as children, prefix their stdout (`web |`, `worker |`), forward SIGINT/SIGTERM to both, exit when either exits.
   6. When `GET /api/health` returns `ok`, print the banner: URLs (`http://localhost:3000/bn`, `/en`, `/en/admin/sign-in`, Mailpit `http://localhost:8025`), the seeded accounts table from `packages/test-support/src/seed/accounts.ts` (usernames, roles, the shared password), the storyboard path, and the reset/clock commands.
   `pnpm demo:serve` = steps 5–6 only (for Playwright's `webServer`). `pnpm demo:down` = `docker compose down` (volumes kept). `pnpm demo:logs` = `docker compose logs -f`.
2. **`pnpm demo:reset`**: confirm prompt unless `--yes`; stop web/worker if this script started them (write a pidfile in `.data/`); `drop schema public cascade; drop schema pgboss cascade; create schema public` via the app role; `pnpm db:migrate`; `pnpm db:seed --reset` (regenerates evidence derivatives through the real pipeline — requires the worker; the seed runs an in-process worker for that step, see T-007); `rm -rf .data/storage/*`; reset `demo_clock.offset_seconds = 0`; Mailpit `DELETE /api/v1/messages`; print ✓.
3. **`pnpm demo:clock -- +91d | -1h | reset | show`**: parses `[+-]<n>(m|h|d)`; `POST /api/demo/clock` (guarded by `APP_MODE != production`, T-502) or, if the web app is down, writes `demo_clock` directly; after a change prints the new effective "now" and reminds that `retention.expire` runs hourly — offer `--run-retention` which enqueues `retention.expire` immediately via the queue adapter so step 22 of the storyboard shows within seconds.
4. **`DEMO.md`** — exactly this shape, ≤ 10 lines of prose plus the accounts table:
   ```
   # RogiKotha — run the demo
   Prerequisites: Docker Desktop running, Node 24, pnpm 11, ~6 GB free on C: (Docker's disk grows ~1.5 GB per cycle; see the disk notes).
   One command: `pnpm demo` → http://localhost:3000/bn (patient) · http://localhost:3000/en/admin/sign-in (staff) · http://localhost:8025 (mail)
   Accounts (password for all: demo-pass-2026!): <table>
   Walkthrough: docs/implementation/05-demo-storyboard.md (≈25 min, two browser windows + Mailpit)
   Move time: `pnpm demo:clock -- +91d --run-retention`   Reset everything: `pnpm demo:reset --yes`   Stop: Ctrl+C, then `pnpm demo:down`
   Fictional records only — every name, account and document is synthetic.
   ```
5. **Windows notes** (append to `DEMO.md` as a short "If something fails" list and expand in the walkthrough record): Docker Desktop must be started before `pnpm demo`; WSL2 backend; port 3000 conflicts with other Next apps, 5432 with a local PostgreSQL service (stop it or change `PG_PORT` in `.env`), 1025/8025 with another Mailpit, 3310 with a local clamd; the docker vhdx grows and never shrinks — after several resets run the disk cleanup described in the founder's global notes; long paths (`git config core.longpaths true`); line endings (`.gitattributes` `* text=auto eol=lf` already set by T-001 — verify); `sharp` and `@napi-rs/canvas` prebuilt binaries for win32-x64 must install without a compiler (verify `pnpm install` output on a clean clone).
6. **Clean-clone rehearsal**: `git clone` into a temp directory, `pnpm install`, `pnpm demo` — time it (target: under 6 minutes after Docker images are cached, under 15 on first pull) and record the timings in the walkthrough record.
7. **Walk the storyboard**: every step 1–28, in Bengali first then English for Parts 1–3, both themes at least once, in Chrome; for each step write in `T-504-walkthrough-record.md`: step, observed result, screenshot filename (reuse T-503's where identical, else capture to `docs/design/screenshots/demo/walkthrough/`), pass/fail, CR id if failed. Fix nothing yourself beyond the demo scripts — findings go to CRs and the tracker.
8. Run `pnpm check`. Run `pnpm e2e` once more against `demo:serve` to confirm T-503's `webServer` wiring.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Clean clone to running demo | `git clone … tmp && cd tmp && pnpm install && pnpm demo` | banner printed with URLs and accounts; `/api/health` `ok`; timing recorded |
| Health | `curl -s localhost:3000/api/health` | `{ ok: true, db: 'ok', queue: 'ok', mail: 'ok', scanner: 'ok' \| 'unavailable' }` |
| Seed idempotence | run `pnpm demo` twice | second run says "existing data kept"; no duplicate doctors (`select count(*) from doctors` = 6) |
| Reset | `pnpm demo:reset --yes` then sign in as `shirin_88` | works; `.data/storage` regenerated; Mailpit empty; clock 0 |
| Clock | `pnpm demo:clock -- +91d --run-retention` | e3's original `original_expired` in custody; e1 (held) untouched; `pnpm demo:clock -- reset` returns |
| ClamAV optional | stop the container, upload a file | item stays `scanning` with `scan_unavailable`; start it → proceeds (storyboard step 12 optional path) |
| Port conflict message | run with something on 3000 | clear message naming the port and the holder; exit 1 |
| Ctrl+C | interrupt `pnpm demo` | web and worker both exit; containers keep running; `pnpm demo:down` stops them |
| Storyboard complete | `T-504-walkthrough-record.md` | 28 steps ticked, each with observation; any fail has a CR id |
| Presenter doc | `DEMO.md` | ≤ 10 prose lines + table; no attribution; matches the banner |
| Quality gates | `pnpm check` | green |

## Tests to write

- `scripts/__tests__/wait-for.test.mjs` — resolves on a listening port, rejects after timeout.
- `scripts/__tests__/demo-clock.test.mjs` — the duration parser (`+91d`, `-1h`, `reset`, invalid → exit 2).
- `scripts/__tests__/demo-preflight.test.mjs` — port-conflict detection with a temporary listener; `.env` generation writes two 64-hex secrets.
- The walk-through record itself is the manual test evidence; T-503 owns the automation.

## Threat notes

Not an M3 task. One note: the generated `.env` secrets are for local use only; `DEMO.md` says so and
`.env` is git-ignored (assert in the preflight test that `.gitignore` contains `.env`).

## Hard-rule checklist

- [ ] Synthetic marker visible on every page walked; `DEMO.md` states records are fictional.
- [ ] No real person or facility named in a negative account (spot-check the corpus during the walk-through; CR if found).
- [ ] Original evidence never served (storyboard step 6 ticked with the 403).
- [ ] Reporter identity "restricted" in the console (step 19 ticked).
- [ ] Both languages walked for Parts 1–3; numerals follow language.
- [ ] No agent/tool attribution in `DEMO.md`, scripts, or commits.

## Release 1 amendment (FD-105, U50)

Built by Unit U50 `u50-release-check` for the 7 November date. Where this amendment and the text above differ, the amendment wins for release 1. Source: U50 functional design § 14.

| Acceptance row | Where it is met in release 1 |
|---|---|
| Clean clone to running demo | `pnpm demo` preflight, services, migrate, seed-if-empty, build, run, banner; rehearsed on a clean clone at Build and Test |
| Health | `/api/health` reports database, queue, mail and scanner from real probes; `ok` needs database, queue and mail (FD-122) |
| Seed idempotence, Reset | `pnpm demo` seeds only when `account_profiles` is empty; `pnpm demo:reset` rebuilds the data, empties storage and Mailpit |
| Clock | deferred to release 2 (FD-105): `demo:clock` is not built and no release-1 code reads the demo clock |
| ClamAV optional | `pnpm demo` warns and continues when ClamAV is late; evidence still fails closed (FD-035) |
| Port conflict message, Ctrl+C | a busy port is named in the preflight; both children stop together |
| Storyboard complete | the walk-through lists all 28 steps in both languages, release-2 parts marked "release 2 (FD-105, <Unit>)" |
| Presenter doc | `DEMO.md`, at most ten lines of prose |

Port correction: the preflight and `DEMO.md` use host port 5433 for PostgreSQL, not 5432 (the compose service is published on 5433, ISS-084). T-504's `profiles: ["scan"]` on ClamAV is not applied, because `pnpm infra:up` must keep starting ClamAV for every Unit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
