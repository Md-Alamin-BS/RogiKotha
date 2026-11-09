# RogiKotha demo (release 1)

Fictional records only: every name, account and document is synthetic.
You need Docker Desktop running, Node 24, pnpm 11 and about 6 GB of free disk; Docker's disk file grows with each reset.
Run `pnpm demo` from the repository root. It checks the prerequisites, starts PostgreSQL (host port 5433), Mailpit and ClamAV, migrates, seeds an empty database, builds, and starts the web app and the worker.
When it prints the banner, open <http://localhost:3000/bn> (Bengali), <http://localhost:3000/en> (English) and Mailpit at <http://localhost:8025> for confirmation and reset emails.
Walk the steps in [the storyboard](docs/implementation/05-demo-storyboard.md); the release-1 walk-through record is [docs/validation/U50-walkthrough.md](docs/validation/U50-walkthrough.md).
The staff console, moderation and the other release-2 features are on the roadmap in the [README](README.md#roadmap) (FD-105).

Every account uses the password `demo-pass-2026!`. Sign in with the email.

| Username | Email | Used for |
|---|---|---|
| `shirin_88` | `shirin_88@demo.rogikotha.local` | author of r1 (pseudonymous) |
| `rafi_c` | `rafi_c@demo.rogikotha.local` | contributor with no content yet: comments and replies |
| `anon_author_r2` | `anon_author_r2@demo.rogikotha.local` | author of r2 (anonymous) |
| `named_tanvir-ahmed` | `named_tanvir-ahmed@demo.rogikotha.local` | author of r6 (named) |

| Task | Command |
|---|---|
| Start again without rebuilding (also after `pnpm demo:down`; starts the containers, keeps the data, uses the last build) | `pnpm demo --no-build` |
| Restart only the web app and the worker (only while the containers still run: after Ctrl+C without `pnpm demo:down`) | `pnpm demo:serve` |
| Back to the seeded state (stops the running demo first) | `pnpm demo:reset --yes` |
| Stop | Ctrl+C, then `pnpm demo:down` (stops the containers, keeps the data) |
| Container logs | `pnpm demo:logs` |

`pnpm demo:down` and `pnpm demo:logs` use the same compose project as `pnpm demo`, including `RK_COMPOSE_PROJECT` when it is set in `.env` or the shell.

## If something fails

- **Docker is not running**: start Docker Desktop and run `pnpm demo` again.
- **A port is taken**: the message names it and how to find its holder. 3000 is the web app; 5433 is often a local PostgreSQL service; 1025 and 8025 are Mailpit; 3310 is ClamAV.
- **ClamAV is late**: on first start it downloads its signatures (several minutes). The demo starts anyway; uploads stay "scanning" until it is ready.
- **`pnpm demo:reset` refuses the storage folder**: it empties only a folder inside the repository, so a `STORAGE_ROOT` outside it (in `.env` or the shell), the repository root itself or a link that leads outside is refused before anything changes. Set `STORAGE_ROOT=./.data/storage`.
- **Long paths on Windows**: run `git config --global core.longpaths true` before cloning (or `git clone -c core.longpaths=true`).
- **Disk space after several resets**: Docker's disk file does not shrink by itself. Run `docker image prune` and `docker builder prune` (never `--volumes`, which deletes the demo data), then compact Docker Desktop's disk file.
