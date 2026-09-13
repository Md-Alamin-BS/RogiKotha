# docs/implementation — how to run the build

This folder is the complete instruction set for turning the approved design into a runnable local
demo. It is written so that a mid-tier model (Claude Sonnet 5, GPT-5.6 Terra) or a cheap one (Luna,
Haiku 4.5) can implement a task by reading its task file and the referenced sections, without
re-deriving decisions.

| File | What it is | Who reads it |
|---|---|---|
| [00-master-plan.md](00-master-plan.md) | decisions, stack pins, layout, every task with class/estimate/dependencies, model routing, execution order | human first; every agent §1–§4 |
| [01-conventions.md](01-conventions.md) | how code is structured, named, tested, committed; CSS/React port rules; definition of done; hard-rule checklist | every agent |
| [02-data-model.md](02-data-model.md) | every table, enum, state machine | backend tasks |
| [03-routes-and-contracts.md](03-routes-and-contracts.md) | URL map, Result/Actor/errors, ports, the command & query catalogue, events/jobs | every task |
| [../design/auth-screens-spec.md](../design/auth-screens-spec.md) | the auth screens (patient + staff) with all copy in EN and BN | prototype pass, T-102, T-103 |
| [05-demo-storyboard.md](05-demo-storyboard.md) | what the demo shows, seeded accounts, fixtures | T-007, T-503, T-504, the presenter |
| [04-handoff-and-validation.md](04-handoff-and-validation.md) | the protocol: what every session reads first and writes last, validation gates G1–G5, the issue register rules | every agent, the human |
| [NEXT.md](NEXT.md) | the baton — current state and the next task per lane; rewritten by every session | every agent first, the human daily |
| [handoffs/](handoffs/) | one handoff per task (template in `templates/`) | the next agent in that area |
| [ISSUES.md](ISSUES.md) | register of every defect, gap, assumption and deferral with severity and status | everyone |
| [BUILD-LOG.md](BUILD-LOG.md) | append-only chronological log of task events | the human |
| [06-change-requests.md](06-change-requests.md) | log of small changes requested during the build | human + the task that absorbs the change |
| [07-phase-2-document-evidence.md](07-phase-2-document-evidence.md) | the next phase: PDF, then HEIC/Office evidence (not started) | the human, later agents |
| [LOOP.md](LOOP.md) | the one-prompt loop: a session reads the Queue in `NEXT.md`, implements or validates, merges on PASS, queues the next work, prints the next prompt | the human (paste one line), every session |
| [08-agent-prompts.md](08-agent-prompts.md) | copy-paste prompts per tool (puku-cli, Claude Code, Codex), model-record rule, git remote and conflict rules | the human, every session |
| [tasks/](tasks/) | one file per task, D-001 and T-001 … T-505 (T-504 also writes `tasks/T-504-walkthrough-record.md`) | the implementing agent, then the validator |
| [../security/](../security/) | threat notes written during the build (T-502) | validators, T-505 |
| [../validation/](../validation/) | one record per validated task (created by validators) | human gate |

## 0. The simple way: one prompt, every session

If you do not want to run the steps in §1–§4 by hand, paste this into a fresh agent session and keep doing so each time a session ends:

```text
Read docs/implementation/LOOP.md and do exactly what it says. Ask me only when it tells you to.
```

[LOOP.md](LOOP.md) makes the session read `NEXT.md`, implement or validate the queued task(s) — two in parallel when safe — update every record, merge on PASS, queue the next work, and print the same prompt for you to paste again. It runs until everything is merged. The rest of this file describes what happens inside that loop.

## 1. Before the first task

1. Create the integration branch: `git switch -c build/demo` from the commit that contains this folder.
2. Copy `infra/compose/.env.example` to `.env` after T-002 lands; never commit `.env`.
3. Confirm the toolchain: Node 24, pnpm 11, Docker Desktop running (≥ 25 GB free on C:, the vhdx grows ≈ 1.5 GB per cycle — see the disk notes in the global instructions), Claude Code and Codex CLI signed in.
4. Decide your two lanes. Lane A = backend tasks, lane B = frontend tasks (each task file says which). Each lane is a git worktree. With Claude Code use its native isolation: `claude --worktree lane-a` (creates `.claude/worktrees/lane-a` and blocks edits to the main checkout); add a `.worktreeinclude` file listing `.env` so it is copied into new worktrees. With Codex CLI create the worktree yourself: `git worktree add ../rk-lane-b build/demo` and run `codex` inside it. Keep the two lanes file-disjoint (the task files' owned paths already are).
5. Read `04-handoff-and-validation.md` once; it is what every agent does at the start and end of a session, and what you do daily.
6. `CLAUDE.md` at the repo root imports `AGENTS.md` (`@AGENTS.md`) so Claude Code and Codex read the same rules; keep it under 200 lines.

## 2. Running one task

1. Open `NEXT.md`; it names the next task per lane. (The master plan §8 order is the source; `NEXT.md` is the live pointer.)
2. In the lane's worktree: `git switch -c task/t-xxx-short-name build/demo`.
3. Open the tool the task's **Class** routes to (master plan §7) and paste the implementer prompt (§3 below) with the task ID filled in.
4. While it runs: answer only questions it writes under "Questions for the human"; do not add scope. Log any change you want in `06-change-requests.md`.
5. When it reports done: read `handoffs/T-xxx.md` and the task file's hand-off section, skim `git diff --stat`, run `pnpm check` yourself once. Check that `NEXT.md`, `ISSUES.md` and `BUILD-LOG.md` were updated; if not, the task is not finished.
6. Open a **new session** in the *other* vendor's tool and paste the validator prompt (§4). It writes `docs/validation/T-xxx.md`.
7. `PASS` → merge the task branch into `build/demo` (fast-forward or merge commit, your identity, no trailers). `PASS WITH FOLLOW-UP` → merge and add the follow-up as a CR row. `FAIL` → paste the validator's findings back to the implementer session (or a fresh one of the same class) and repeat from step 4. Two FAILs on an M1/M2 task → escalate the class to M3 for the retry.
8. Mark the task `merged` in the tracker table at the bottom of this file and append `merged` to `BUILD-LOG.md`. Full protocol: `04-handoff-and-validation.md`.

Time-boxing: if an agent has run for twice the task's high estimate without reaching a checkpoint, stop it, read its hand-off notes, and restart with the notes pasted in — a fresh session with a summary beats a long confused one.

Tool-specific, copy-paste versions of both prompts (puku-cli with Opus 4.8, Claude Code, Codex), the model-record rule and the git remote rules are in [08-agent-prompts.md](08-agent-prompts.md). The generic versions below are the reference.

## 3. Implementer prompt (paste as the first message)

```text
You are implementing task T-XXX of the RogiKotha build. Work only on this task.

Read, in this order, before writing any code:
1. AGENTS.md
2. docs/implementation/NEXT.md (the baton — if it names a different task for your lane, stop and ask)
3. docs/implementation/04-handoff-and-validation.md sections 2, 3.1, 4, 5 (what you must write at the end)
4. docs/implementation/00-master-plan.md (sections 1-4 and 7)
5. docs/implementation/01-conventions.md (all of it)
6. docs/implementation/handoffs/<file> for every task in your task's "Depends on" row, and the open
   rows of docs/implementation/ISSUES.md in your area
7. docs/implementation/tasks/T-XXX-*.md (your task; it names the exact sections of 02-data-model.md,
   03-routes-and-contracts.md and the prototype files you must read next; a "Scope change" block at
   the top overrides the steps below it)
8. PRODUCT.md "Hard rules"
Then append a "started" line to docs/implementation/BUILD-LOG.md and confirm `pnpm check` is green
before changing anything.

Rules that override anything else you know:
- No agent, tool or model name anywhere: not in code, comments, docs, commit messages or trailers. No
  "Co-Authored-By". Commits use the human's configured git identity only.
- Follow the task file literally. Do not widen scope, do not "improve" copy or visuals, do not
  refactor files you do not own. Owned paths are listed in the task file.
- Every user-facing string goes into both packages/i18n/messages/en.json and bn.json in the same
  commit. No hard-coded strings.
- Every state change goes through an application command with authorization and an audit row. Queries never write.
- Dependencies: install only what the task file lists, at the pinned versions in the master plan
  section 3. If you believe a different version or library is needed, stop and write why under
  "Questions for the human" in the task file; do not switch silently.
- When unsure, follow 01-conventions.md section 15: choose the narrower reversible option, mark it
  with // ASSUMPTION(T-XXX): and record the question.

Definition of done is 01-conventions.md section 13. Before you report completion (also when stopping
with partial work):
- run `pnpm check` and `pnpm smoke` and paste the summaries into the task file's hand-off section;
  add at least one smoke assertion for what you built (04-handoff-and-validation.md section 3.1);
- fill the task file's hand-off section: what changed (paths), what was not done and why, questions,
  follow-ups, and the hard-rule checklist with evidence for each ticked item;
- write docs/implementation/handoffs/T-XXX.md from templates/handoff-template.md (state, what exists,
  how verified, fragile points, assumptions, next task for this lane with the first three steps);
- add a row to docs/implementation/ISSUES.md for every defect, gap, surprise, workaround or
  ASSUMPTION marker (including ones you fixed);
- rewrite docs/implementation/NEXT.md (state, next task per lane, blockers, questions);
- append a "finished" line to docs/implementation/BUILD-LOG.md and set the tracker row in
  docs/implementation/README.md to `validating`;
- commit on the current task branch with a message starting "T-XXX: ".
Then stop. Do not merge. Do not start another task.
```

For Codex CLI, prepend: `Ignore any CLAUDE.md files; AGENTS.md and the files above are authoritative.`

## 4. Validator prompt (new session, other vendor)

```text
You are the independent validator for task T-XXX of the RogiKotha build. You did not implement it.
Your job is to inspect the actual diff and tests and return a verdict with evidence.

Read: AGENTS.md; docs/implementation/04-handoff-and-validation.md sections 2-4; docs/implementation/NEXT.md;
docs/implementation/handoffs/T-XXX.md; docs/implementation/01-conventions.md sections 3, 5, 6, 10, 13, 14;
docs/implementation/tasks/T-XXX-*.md (including its hand-off section); then the diff:
`git diff build/demo...HEAD --stat` and the full diff of every owned path.

Do:
0. Append "validation started" to docs/implementation/BUILD-LOG.md.
1. Run `pnpm check` and `pnpm smoke` (the whole cumulative smoke suite, plus `pnpm e2e:smoke` once it
   exists) yourself. Paste the summaries. A skipped or deleted smoke assertion is a finding.
2. For every acceptance check in the task file, run it and record observed vs expected.
3. For every ticked hard-rule item, verify the cited evidence exists (open the file:line or run the test).
4. Look for: authorization gaps (a command missing `requires`), audit rows missing, strings missing in
   bn.json, imports crossing the boundaries in conventions section 2, private data (account ids, emails,
   reporter ids, original filenames) leaking into view models or logs, and anything outside owned paths.
5. For M3 tasks, also write 3-5 adversarial test cases the implementer did not think of, run them, and
   report results. Do not fix code; you may add test files under the task's test paths and note them.

Write docs/validation/T-XXX.md from docs/implementation/templates/validation-template.md, i.e. with this structure:
- Task, story, commit range, date, validator model id and effort setting (this line is the only place
  a model name may appear in the repo — it is validation evidence, not attribution).
- Commands run with exit codes.
- Acceptance table: check | expected | observed | pass/fail.
- Findings: severity (critical/high/medium/low), file:line, what, why it matters, suggested fix.
- Verdict: PASS | PASS WITH FOLLOW-UP (owner + gate) | FAIL.
- Residual risk and any decision the human must make.
Then: add an ISS- row in docs/implementation/ISSUES.md for every finding (severity per 04 section 4);
set the tracker row in docs/implementation/README.md to the verdict; append "validated <verdict>" to
BUILD-LOG.md; if the verdict is FAIL, put "fix ISS-… in T-XXX" ahead of the next task for that lane
in NEXT.md. Commit those files on the task branch with message "T-XXX: validation record". Then stop.
```

## 5. Task tracker

Update the status column as tasks move. Statuses: `todo`, `in progress (lane A|B)`, `validating`, `PASS`, `PASS+F`, `FAIL`.

| Task | Status | Branch | Validation | Notes |
|---|---|---|---|---|
| D-001 auth screens prototype pass | merged | `task/d-001-auth-screens-prototype` | [D-001](../validation/D-001.md) | founder reviews in both locales and themes before T-102/T-103; 360 px width still unwalked |
| T-001 | merged | `task/t-001-workspace-scaffold` | [T-001](../validation/T-001.md) | packages are empty stubs; `pnpm check` stops at `i18n:check` until T-006 |
| T-002 | merged | `task/t-002-local-infra` | [T-002](../validation/T-002.md) | round 2 `PASS WITH FOLLOW-UP`: `ISS-057`/`ISS-058` confirmed fixed, all 9 acceptance rows re-run live, `clamd` itself detects the custom marker signature. Follow-up `ISS-072` (S3, owner T-304): the README's `grep "Listening daemon"` ClamAV-readiness hint matches nothing on `clamav/clamav:1.5.4` — use `clamdscan --version` |
| T-003 | validating | `task/t-003-contracts` | | Result/errors/Actor/enums/schemas/view-models built; `pnpm check` green (39 tests), `pnpm smoke` green; ISS-073..076 (S4) logged, ISS-076 flags a task-file discrepancy (38 error codes in the source doc vs. an expected 40) |
| T-004 | todo | | | |
| T-005 | todo | | | |
| T-006 | merged | `task/t-006-i18n` | [T-006](../validation/T-006.md) | 764 bilingual keys; `pnpm check` green end-to-end from here on. The ERROR_CODES half of `i18n:check` self-skips until T-003 lands `packages/contracts/src/errors.ts` |
| T-007 | todo | | | |
| T-008 | todo | | | |
| T-009 | todo | | | |
| T-010 | todo | | | |
| T-101 | todo | | | |
| T-102 | todo | | | |
| T-103 | todo | | | |
| T-104 | todo | | | |
| T-105 | todo | | | |
| T-106 | todo | | | |
| T-201 | todo | | | |
| T-202 | todo | | | |
| T-203 | todo | | | |
| T-204 | todo | | | |
| T-205 | todo | | | |
| T-206 | todo | | | |
| T-207 | todo | | | |
| T-301 | todo | | | |
| T-302 | todo | | | |
| T-303 | todo | | | |
| T-304 | todo | | | |
| T-305 | todo | | | |
| T-306 | todo | | | |
| T-307 | todo | | | |
| T-308 | todo | | | |
| T-309 | todo | | | |
| T-401 | todo | | | |
| T-402 | todo | | | |
| T-403 | todo | | | |
| T-404 | todo | | | |
| T-405 | todo | | | |
| T-406 | todo | | | |
| T-407 | todo | | | |
| T-408 | todo | | | |
| T-409 | todo | | | |
| T-410 | todo | | | |
| T-501 | todo | | | |
| T-502 | todo | | | |
| T-503 | todo | | | |
| T-504 | todo | | | |
| T-505 | todo | | | |
