# Continue on another device

This guide picks up the RogiKotha build on a different computer, for example your home machine. For where the work stands, read [RESUME.md](RESUME.md) first. Your decisions and the agents' calls are in [OWNER-REVIEW-QUEUE.md](OWNER-REVIEW-QUEUE.md).

## What is pushed

| Branch | What it holds |
|---|---|
| `main` | Everything merged: 8 Units of the full plan (CR-004, CR-009, CR-006, CR-007, CR-011, CR-012, T-010, T-011), FD-094 to FD-099, the demo-slice record up to the approved code plan |
| `bolt/demo-slice` | **The current work**: the demo slice (intent `261030-demo-slice`), committed as it stood when this machine stopped. The last commit message says how far it got |
| `bolt/t-101-better-auth-adapter` | The paused full-plan T-101 (sign-in) work in progress; resumes after the demo |

## 1. Set up the machine (once)

You need:

- Git and GitHub access to `Md-Alamin-BS/RogiKotha`.
- Node 24.18 and pnpm 11.20 (`corepack enable`, then `corepack prepare pnpm@11.20.0 --activate`).
- Docker Desktop, running.
- Claude Code with the `aidlc` command available. The repo ships the `.claude/` shell, so approve its hooks when Claude Code asks, then restart Claude Code fully.

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

1. Open the repo folder in Claude Code. The intent cursor is per machine, so select the demo-slice work first:
   ```
   /aidlc intent switch 261030-demo-slice
   ```
2. Then resume it:
   ```
   /aidlc --resume
   ```
   AI-DLC continues at Code Generation for the demo slice. Each machine writes its own audit file under the intent's `audit/` folder; that is expected.
3. Tell Claude where things stand. This is a ready prompt:

   > Continue the demo slice on branch `bolt/demo-slice`. Read `docs/aidlc-migration/CONTINUE-ON-ANOTHER-DEVICE.md` and `docs/aidlc-migration/RESUME.md`. The build workflow ran on my other machine and cannot be resumed here. Look at the plan `aidlc/spaces/default/intents/261030-demo-slice/construction/code-generation/code-generation-plan.md`. Its checkboxes are NOT reliable, because an agent ticked all 14 early. Trust the last commit message on the branch and the code itself. Run `pnpm check` to see what is still broken. Finish the remaining steps with parallel agents where files don't collide: integrate, click-through in a browser, adversarial tests, records. Then run the remaining AI-DLC gates. Don't ask me questions except for approvals and permissions.

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

Then open `http://localhost:3000/en` (or `/bn`). Every seeded patient signs in with the password `demo-pass-2026!`. Their emails are in `packages/test-support/src/seed/seed-accounts.ts`, and once the build is done they are also listed in `docs/implementation/handoffs/demo-slice.md`, together with the click path.

## Standing rules (they also live in `aidlc/spaces/default/memory/` and AGENTS.md)

- No tool or model names, no `Co-Authored-By`, no "Generated with" anywhere, and commits carry only your own git identity.
- Never run `git reset --hard`, `git checkout --` or `git clean` on a dirty tree.
- Synthetic data only. Every user-facing string goes in both `en.json` and `bn.json`.
- The agents decide open points by recommendation and log them in the review queue. They ask you only for gate approvals and permissions.
- The full 45-Unit plan (intent `261011-aidlc-adoption`) is paused, not dropped. To return to it later: `/aidlc intent switch 261011-aidlc-adoption`, then `/aidlc --resume`. It resumes at T-101 Code Generation on `bolt/t-101-better-auth-adapter`.
