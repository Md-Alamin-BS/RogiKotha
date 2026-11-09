# Continue on another device

> **2026-11-09: release 1 is finished and submitted. Start with [handoff-2026-11-09/README.md](handoff-2026-11-09/README.md)** (how to continue on this archive branch). The older handoffs are [handoff-2026-11-08](handoff-2026-11-08/README.md) and [handoff-2026-11-06](handoff-2026-11-06/README.md).

This guide picks up the RogiKotha build on a different computer, for example your home machine. For where the work stands, read [RESUME.md](RESUME.md) first. Your decisions and the agents' calls are in [OWNER-REVIEW-QUEUE.md](OWNER-REVIEW-QUEUE.md).

## What is pushed

| Branch | What it holds |
|---|---|
| `main` | Everything merged: 8 Units of the full plan (CR-004, CR-009, CR-006, CR-007, CR-011, CR-012, T-010, T-011), FD-094 to FD-099, the demo-slice record up to the approved code plan |
| `bolt/demo-slice` | **The current work**: the demo slice (intent `261030-demo-slice`). The code is **complete** (`f31342a`) and carries the 2026-11-01 additions after the owner's test: the write-form fix, adding an unlisted doctor (FD-100) and the Hospitals & clinics and Health topics pages (FD-101); issues ISS-324 to ISS-400. `pnpm check`, `pnpm smoke` and the Playwright demo walk in en and bn (17/17, click-path steps 1 to 10) are green. Code Generation waits for your approval. **Not merged into `main`** |
| `bolt/t-101-better-auth-adapter` | The paused full-plan T-101 (sign-in) work in progress; resumes after the demo |

## 0. Just show the demo (about 15 minutes, no Claude Code needed)

Use this when the other computer only has to run the demo. It needs Git, Node 24.18, pnpm 11.20 and Docker
Desktop (running).

```bash
git clone https://github.com/Md-Alamin-BS/RogiKotha.git rogikotha   # or: git fetch --all in an existing clone
cd rogikotha
git switch bolt/demo-slice
corepack enable && corepack prepare pnpm@11.20.0 --activate
pnpm install
cp infra/compose/.env.example .env
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
# paste both printed lines over the two empty lines in .env
pnpm infra:up                      # PostgreSQL 18, Mailpit, ClamAV
docker ps                          # wait until rogikotha-clamav-1 shows (healthy): its first start downloads ~300 MB
pnpm db:reset && pnpm db:seed      # the fictional records and demo logins
pnpm --filter @rogikotha/web build
pnpm --filter @rogikotha/web start # http://localhost:3000/en and /bn
```

- Logins and the 10-step click path: [`docs/implementation/handoffs/demo-slice.md`](../implementation/handoffs/demo-slice.md).
  Every seeded patient uses the password `demo-pass-2026!`, for example `abba_of_two@demo.rogikotha.local`.
- Before showing it, run `pnpm demo:reset` (then restart `start`) so only the fictional records are there.
- Uploads read "Ready" only while ClamAV is healthy; otherwise they stay "Scan pending" on purpose.
- Port 3000 must be free. If another app uses it: `pnpm --filter @rogikotha/web start -- --port 3100`.
- The production build is quicker to click through than `pnpm demo` (dev mode compiles each page on first open).

## 1. Set up the machine (once)

You need:

- Git and GitHub access to `Md-Alamin-BS/RogiKotha`.
- Node 24.18 and pnpm 11.20 (`corepack enable`, then `corepack prepare pnpm@11.20.0 --activate`).
- Docker Desktop, running.
- Claude Code with the `aidlc` command available. The repo ships the `.claude/` shell, so approve its hooks when Claude Code asks, then restart Claude Code fully.
- AI-DLC 2.11.0 registered for this folder. On a computer new to the project, run `aidlc config --pin 2.11.0` once in the repo folder (add `--download` first if that release is not installed: `aidlc config --download`). Without it every AI-DLC hook stops with "this project's 2.11.0 pin is not registered on this machine". `.aidlc-version` is already committed.

```bash
git clone https://github.com/Md-Alamin-BS/RogiKotha.git rogikotha   # or: git fetch --all in an existing clone
cd rogikotha
git config user.name "Md. Al-Amin"          # commits carry only your own identity
git config user.email "102671792+Md-Alamin-BS@users.noreply.github.com"
git switch bolt/demo-slice
pnpm install
```

## 2. The `.env` file (never committed)

```bash
cp infra/compose/.env.example .env
```

Then fill the two secrets with new random values. These are local demo keys, so new values are fine; anything encrypted on the other machine cannot be read here, but `db:reset` rebuilds the data anyway.

```bash
node -e "console.log('APP_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('BETTER_AUTH_SECRET=' + require('crypto').randomBytes(32).toString('base64'))"
```

Paste both lines into `.env`. Leave the other values as in the example: the database is on port 5433, Mailpit on 1025/8025, ClamAV on 3310.

## 3. Start the services and check the baseline

```bash
pnpm infra:up                 # PostgreSQL 18, Mailpit, ClamAV (ClamAV's first start downloads about 300 MB of signatures)
pnpm db:reset && pnpm db:seed # fresh database with the fictional records
pnpm check                    # the full gate, about 3–6 minutes on an idle machine
pnpm smoke
```

If one test fails only with "Timeout waiting for worker to respond", run it again. That is the known cold-start flake (ISS-296).

## 4. Continue in Claude Code

1. Open the repo folder in Claude Code, started from a terminal inside that folder, and approve the project's hooks when it asks. The intent cursor is per machine, so select the demo-slice work first:
   ```
   /aidlc intent switch 261030-demo-slice
   ```
2. Then resume it:
   ```
   /aidlc --resume
   ```
   AI-DLC shows the Code Generation approval gate for the demo slice: the code is done and waits for your Approve. Each machine writes its own audit file under the intent's `audit/` folder; that is expected. All 14 plan steps are done and ticked in `construction/code-generation/code-generation-plan.md`; if a resume ever shows them as `[ ]`, take that file back from git and never rebuild.
3. Tell Claude where things stand. On 2026-10-30 the code was done. On 2026-11-01 you tested the demo and the branch gained the write-form fix, FD-100 (add an unlisted doctor) and FD-101 (facility and topic pages); an AI-DLC reviewer read the add-a-doctor change (NOT-READY, two S2 fixed), and Code Generation was put at its approval gate. This is a ready prompt:

   > Continue the demo slice on branch `bolt/demo-slice`. Read `docs/aidlc-migration/CONTINUE-ON-ANOTHER-DEVICE.md`, `docs/aidlc-migration/RESUME.md` and `docs/implementation/handoffs/demo-slice.md`. The code is complete and green, including the 2026-11-01 additions (FD-100, FD-101, ISS-392 to ISS-400), and Code Generation waits at its approval gate; the express scope has no stage reviewer, so do not request one. Do not rebuild: all 14 plan steps are done. Show me the gate and wait for my answer. After I approve, run Build and Test and the three local deployment stages. Keep the branch unmerged until I say merge; then squash-merge into main, run `pnpm check` on main and push. Don't ask me questions except for approvals and permissions.

   Checked on 2026-11-01 in a fresh clone of `bolt/demo-slice`: after `aidlc config --pin 2.11.0` and the intent switch, `aidlc engine status` reads "Awaiting your approval on Code Generation", 5 of 10 stages done. If `/aidlc` instead says Claude Code is not running AI-DLC's hooks, approve them (or set `"disableAllHooks": false` in `.claude/settings.local.json`) and run it again.

## 5. What is left after the code

The demo slice is an express intent with 7 stages. Reverse Engineering and Requirements are approved. After Code Generation:

1. **Code Generation gate:** needs your approval. AI-DLC asks; answer Approve.
2. **Build and Test:** a fresh `pnpm check` and `pnpm smoke`, and the click-through, then your approval.
3. **Deployment pipeline, deployment execution, observability setup:** local demo only (`pnpm demo`), each with your approval.
4. **Merge:** squash-merge `bolt/demo-slice` into `main`, run `pnpm check` on `main`, push.

## 6. Running the demo

```bash
pnpm infra:up
pnpm db:reset && pnpm db:seed
pnpm demo          # migrates, seeds, runs the web app and the worker
```

Then open `http://localhost:3000/en` (or `/bn`). Every seeded patient signs in with the password `demo-pass-2026!`. Their emails are in `packages/test-support/src/seed/seed-accounts.ts` and also listed in `docs/implementation/handoffs/demo-slice.md`, together with the click path (10 steps, including adding an unlisted doctor and the Hospitals & clinics and Health topics pages).

## Standing rules (they also live in `aidlc/spaces/default/memory/` and AGENTS.md)

- No tool or model names, no `Co-Authored-By`, no "Generated with" anywhere, and commits carry only your own git identity.
- Never run `git reset --hard`, `git checkout --` or `git clean` on a dirty tree.
- Synthetic data only. Every user-facing string goes in both `en.json` and `bn.json`.
- The agents decide open points by recommendation and log them in the review queue. They ask you only for gate approvals and permissions.
- The full 45-Unit plan (intent `261011-aidlc-adoption`) is paused, not dropped. To return to it later: `/aidlc intent switch 261011-aidlc-adoption`, then `/aidlc --resume`. It resumes at T-101 Code Generation on `bolt/t-101-better-auth-adapter`.
