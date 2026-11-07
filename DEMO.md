# RogiKotha demo (release 1)

Fictional records only: every name, account and document is synthetic.
You need Docker Desktop running, Node 24, pnpm 11 and about 6 GB of free disk; Docker's disk file grows with each reset.
Run `pnpm demo` from the repository root. It checks the prerequisites, starts PostgreSQL (host port 5433), Mailpit and ClamAV, migrates, seeds an empty database, builds, and starts the web app and the worker.
When it prints the banner, open <http://localhost:3000/bn> (Bengali), <http://localhost:3000/en> (English) and Mailpit at <http://localhost:8025> for confirmation and reset emails.
Walk the steps in [the storyboard](docs/implementation/05-demo-storyboard.md); the release-1 walk-through record is [docs/validation/U50-walkthrough.md](docs/validation/U50-walkthrough.md).
Release 1 does not include the staff console and moderation, reports, notifications, admin configuration, search, provider claims, retention and holds, data export and deletion, the workspace extras, the PWA, the evidence viewer, mentions, reactions and blocks, or restore (FD-105).

Every account uses the password `demo-pass-2026!`. Sign in with the email.

| Username | Email | Used for |
|---|---|---|
| `shirin_88` | `shirin_88@demo.rogikotha.local` | author of r1 (pseudonymous) |
| `rafi_c` | `rafi_c@demo.rogikotha.local` | contributor with no content yet: comments and replies |
| `anon_author_r2` | `anon_author_r2@demo.rogikotha.local` | author of r2 (anonymous) |
| `named_tanvir-ahmed` | `named_tanvir-ahmed@demo.rogikotha.local` | author of r6 (named) |

| Task | Command |
|---|---|
| Start again without rebuilding | `pnpm demo:serve` |
| Back to the seeded state (stops the running demo first) | `pnpm demo:reset --yes` |
| Stop | Ctrl+C, then `pnpm demo:down` (stops the containers, keeps the data) |
| Container logs | `pnpm demo:logs` |

## If something fails

- **Docker is not running**: start Docker Desktop and run `pnpm demo` again.
- **A port is taken**: the message names it and how to find its holder. 3000 is the web app; 5433 is often a local PostgreSQL service; 1025 and 8025 are Mailpit; 3310 is ClamAV.
- **ClamAV is late**: on first start it downloads its signatures (several minutes). The demo starts anyway; uploads stay "scanning" until it is ready.
- **Long paths on Windows**: run `git config core.longpaths true` before cloning.
- **Disk space after several resets**: Docker's disk file does not shrink by itself. Run `docker image prune` and `docker builder prune` (never `--volumes`, which deletes the demo data), then compact Docker Desktop's disk file.
