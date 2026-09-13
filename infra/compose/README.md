# Local infrastructure (T-002)

Three containers the demo needs locally: PostgreSQL 18 (application data), Mailpit (SMTP sink for
every outgoing email), ClamAV (malware scan for evidence uploads). No application code lives here.

## Start / stop / reset

From the repo root (scripts added by T-001):

```
pnpm infra:up       # docker compose -f infra/compose/docker-compose.yml up -d
pnpm infra:down     # … down (keeps volumes)
pnpm infra:reset    # … down -v (drops volumes — postgres-init scripts re-run on next `infra:up`)
pnpm infra:logs     # … logs -f
```

Equivalent direct commands (no root scripts needed): replace `pnpm infra:up` with
`docker compose -f infra/compose/docker-compose.yml up -d`, etc.

Postgres init scripts (`postgres-init/*.sql`) only run against a **fresh** volume — Postgres skips
`/docker-entrypoint-initdb.d` once `pgdata` already has a database. Use `pnpm infra:reset` to force
them to run again.

## URLs and ports

| Service | URL / address | Notes |
|---|---|---|
| PostgreSQL | `localhost:5433` (container's internal port is still 5432 — remapped per `ISS-084`, a native Windows PostgreSQL service occupies host port 5432 on some machines) | databases `rogikotha` (owned by `rk_app`) and `rogikotha_test` |
| Mailpit SMTP | `localhost:1025` | any auth accepted (`MP_SMTP_AUTH_ACCEPT_ANY`), insecure allowed for local dev |
| Mailpit web UI | http://localhost:8025 | read every email the app sends; `GET /api/v1/info` returns JSON when it's up |
| ClamAV (clamd) | `localhost:3310` | INSTREAM protocol; see `MalwareScanner` port in `03-routes-and-contracts.md` §3 |

## Roles

`postgres-init/01-roles.sql` creates `rk_app` (owns `rogikotha` and `rogikotha_test`), `rk_worker`,
`rk_maintenance` (both database-level `CONNECT` only on `rogikotha`) — see
`02-data-model.md` §16. **Table- and column-level grants are applied by migration
`0004_roles.sql` in T-004**, not here, because no tables exist yet when this init script runs.
Until T-004 runs its migration, `rk_worker`/`rk_maintenance` can connect but see no tables.

`postgres-init/02-extensions.sql` creates `pg_trgm`, `citext`, `pgcrypto` in both databases.
`uuidv7()` is built into PostgreSQL 18 core — no extension required for it.

## Confirming each service is ready

- Postgres: `docker compose -f infra/compose/docker-compose.yml ps` shows `healthy`
  (`pg_isready`), usually within a few seconds.
- Mailpit: `curl -s http://localhost:8025/api/v1/info` returns a JSON body with a version field.
- ClamAV: **on first start it downloads roughly 300 MB of official virus-definition signatures via
  freshclamd before `clamd` will accept connections — this can take several minutes.** Check with
  `docker compose -f infra/compose/docker-compose.yml exec clamav clamdscan --version` (succeeds
  once ready) or `docker compose -f infra/compose/docker-compose.yml logs clamav | grep "Listening daemon"`.
  The healthcheck's `start_period: 600s` covers this window; **nothing in the application may
  depend on the clamav container reporting healthy at start-up** — the `MalwareScanner` port
  reports `status: 'unavailable'` when clamd cannot be reached and the upload pipeline fails
  closed (item stays `scanning`, never advances) rather than blocking app start-up (FD-035).

## Custom test signature (Scope change 2026-09-12 / CR-001 / FD-036)

`clamav/rogikotha-test.ndb` adds one signature, `RogiKotha.Test.Marker`, that matches any file
containing the ASCII bytes `ROGIKOTHA-MALWARE-TEST-MARKER` (ndb format
`Name:TargetType:Offset:HexSignature`, target `0` = any file type). It is bind-mounted
**read-write** into the container's signature directory (`/var/lib/clamav/rogikotha-test.ndb`) —
not read-only as the scope-change text originally asked, because the image's entrypoint runs
`chown -R clamav:clamav /var/lib/clamav` on every start and fails on a read-only mount
(`ISS-041`; the compose file carries the same note next to the mount). Nothing in the app writes
to it. It loads alongside the official signatures on every start — it does not wait for the
freshclamd download.
This lets the demo show a "malware detected" outcome with a harmless synthetic file instead of a
real malicious sample: create any file whose bytes include `ROGIKOTHA-MALWARE-TEST-MARKER` (for
example append it to a JPEG used only for this demo step) and scan it:

```
docker compose -f infra/compose/docker-compose.yml exec clamav clamscan /path/to/flagged.jpg
```

Expected output includes `FOUND` and the signature name `RogiKotha.Test.Marker`.

## Demonstrating fail-closed behaviour (storyboard step 12)

Stop only the scanner and confirm uploads still queue but never leave `scanning`:

```
docker compose -f infra/compose/docker-compose.yml stop clamav
```

Restart it with `docker compose -f infra/compose/docker-compose.yml start clamav` when done.

## Version pins

- `postgres:18` — floating major tag, per `00-master-plan.md` §3; re-verified 2026-09-13
  (`docs/status/dependency-check-log.md`) as resolving to 18.6, no newer 18.x patch at that date.
- `clamav/clamav:1.5.4` — **never `latest`**; 1.5.4 carries the 2026 CVE fixes
  (CVE-2026-20337/20338/20339/20345/20346/20347/20348, CVE-2025-8088). Re-verified unchanged
  2026-09-13.
- `axllent/mailpit:v1.31.1` — **never `latest`**. The task's original inline compose snippet said
  `axllent/mailpit:latest`; this was overridden per the dependency check dated 2026-09-13
  (`docs/status/dependency-check-log.md`), which found the master plan's placeholder had moved to
  a real current stable tag, `v1.31.1` (2026-09-05). See `ISS-039`.

## Storage and disk notes

Named volumes only (`pgdata`, `mailpit`, `clamdb`) — no bind mounts of source directories, to
avoid Windows file-sharing performance and permission problems. The two files that *are*
bind-mounted (`postgres-init/*.sql`, `clamav/rogikotha-test.ndb`) must stay LF-only —
`infra/compose/.gitattributes` (`* text eol=lf`) enforces this regardless of a checkout's
`core.autocrlf`, because a CRLF-converted `.ndb` file fails to parse correctly inside the
container (`ISS-044`). Docker Desktop's backing vhdx grows with every image pull and named volume
and never shrinks on its own; this is a known, recurring disk-space issue on this workstation (see
the owner's local disk-maintenance notes, outside this repo) — run the owner's disk-cleanup
routine (`disk-report.ps1` / `disk-cleanup.ps1 -Execute -Compact`) periodically rather than
treating vhdx growth from this stack as a defect.

## What this task does not do

No production topology, reverse proxy, Garage, or backups (that's `STORY-OPS-001`). No application
code — the clamd client adapter is T-304, the SMTP adapter is T-101, the database schema and
migration-applied grants are T-004.
