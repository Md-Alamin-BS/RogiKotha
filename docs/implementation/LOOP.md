# LOOP.md — the one-prompt build loop

The human pastes one line into a fresh agent session:

```text
Read docs/implementation/LOOP.md and do exactly what it says. Ask me only when it tells you to.
```

This file tells the session what to do. The session decides its **mode** from the Queue block in
`NEXT.md`, does the work (up to two tasks at once), updates every record, and ends by printing that
same one-line prompt for the human to paste into the next fresh session. The loop runs until the
Queue says `mode: done`.

Detailed rules live in `04-handoff-and-validation.md` and `08-agent-prompts.md`; this file is
self-sufficient for running the loop. Where they differ, this file wins in loop mode.

---

## 0. Every session, before anything else

0. **AI-DLC migration gate.** If `docs/aidlc-migration/README.md` exists and does not say
   **Status: DONE**, stop before any other step (before switching branches). Show the human:
   "⚠️ AI-DLC migration pending — this loop and its resources must be converted into AI-DLC
   artifacts before implementation starts. See `docs/aidlc-migration/README.md`." Then ask:
   "Convert to AI-DLC first, or run this loop on the old process this once?" Continue only on an
   explicit answer.
1. Identify yourself: tool name (puku-cli, Claude Code, Codex) and the model id your tool reports
   (`/model`, `/status`, session header). If the tool cannot tell you, use the model name the human
   configured and say so. Write it as `TOOL · MODEL · EFFORT` in every record you touch.
   Compare it with the `recommended:` line in the Queue (§0.4). If you are running a **lower tier**
   than recommended for an M3 task (auth, identity, evidence, moderation, retention, deletion,
   hardening), stop and tell the human: "Restart this session with <recommended> and paste the same
   line." For M0–M2 tasks a lower tier is acceptable; note it in the record and continue.

   Model tiers (from `00-master-plan.md` §7 and `08-agent-prompts.md` §4):

   | Task class | Implement — model · effort | Validate — model · effort |
   |---|---|---|
   | M0 mechanical | GPT-5.6 Luna or Claude Haiku 4.5 · `medium` (Sonnet 5 / Opus 4.8 also fine) | Sonnet 5 or Opus 4.8 · `high`, new session |
   | M1 routine, M2 frontend port | Claude Sonnet 5 or GPT-5.6 Terra or Opus 4.8 · `high` | the other vendor's mid-tier if available, else same tool · `high`, new session |
   | M3 high-risk | Claude Opus 5 · `xhigh` (or Opus 4.8 at the highest effort the tool offers; GPT-5.6 Sol · `high`) | **other vendor** (GPT-5.6 Sol/Terra · `high`); if impossible, a different model + human approval line |
   | M4 review | — | Opus 5 or Sol · `high` |

   Class is in each task file's header. When a Queue holds two tasks of different classes, the
   session runs at the higher one's tier; sub-agents get their own model per task (§1.1).
2. Read `AGENTS.md`. No tool, model or agent identity in code, comments, docs, commit author, commit
   message or trailers — ever. Check after every commit (step 5.6).
3. `git fetch origin`, then `git switch main && git pull --ff-only origin main`. (`main` is the
   integration branch; `build/demo` was merged into it and deleted on 2026-10-04.)
4. Read `docs/implementation/NEXT.md`. Its **Queue** block is your instruction:

   ```
   mode: implement | validate | done
   tasks: T-xxx[, T-yyy]        (one or two task ids; a task may carry a marker: [running] or [ready])
   recommended: <model> · effort <level>   (for this mode, from the tier table in §0.1)
   ```
   If the Queue is missing or malformed, rebuild it with §4 and continue.

   **Lane-scoped sessions.** If the human's prompt ends with `Lane A` or `Lane B`, you handle only
   the queued task whose task-file header says that lane (skip tasks marked `[ready]` or
   `[running]` by another session; mark yours `[running]` in `NEXT.md`, commit and push that one-line
   change on `main` immediately so the other session sees it). Two lane-scoped sessions may run
   at the same time in two terminals. Without a lane word, one session handles every queued task.
5. Confirm git identity: `git config user.name` / `user.email` must be the human's (not
   puku/noreply/bot). If not, stop and ask the human to fix it.
6. Append to `docs/implementation/BUILD-LOG.md`:
   `<date time> · loop · <mode> <tasks> · session started · TOOL · MODEL · EFFORT`.

Then go to §1 (implement), §2 (validate) or §3 (done).

---

## 1. Mode: implement

Read `00-master-plan.md` §1–§4 and §7, `01-conventions.md` (all), `04-handoff-and-validation.md`
§2–§5 once. Then, for the one or two tasks in the Queue:

### 1.1 Run tasks in parallel when there are two

- Two tasks are in the Queue only if §4 judged them parallel-safe. Give each its **own worktree and
  branch**: `git worktree add ../rk-<task> -b task/<task-lower>-<short-name> main`
  (if the branch already exists on `origin`, check it out instead and read its last handoff — a
  previous session may have left partial work).
- If your tool can run sub-agents (puku-cli sub-agents, Claude Code's Agent tool), start one
  sub-agent per task, each told: "work only inside worktree `../rk-<task>` on branch `<branch>`;
  follow §1.2 for task `<task>`; do not touch the other worktree". Give each sub-agent the model
  its class calls for where the tool allows it (Claude Code: `model: sonnet` for M0–M2, `model: opus`
  for M3; puku-cli: the agent's `model:` field; otherwise it inherits yours) and tell it the effort
  to use. Each sub-agent records its own `TOOL · MODEL · EFFORT`. Wait for both.
  If your tool cannot run sub-agents, do the two tasks one after the other, each in its own worktree.
- The main session never edits code itself when sub-agents are used; it only does §1.3.

### 1.2 Implement one task (the sub-agent's or your own procedure)

1. Read `docs/implementation/tasks/<task>-*.md` fully. A "Scope change" block at the top overrides
   the steps below it. Read the docs and prototype files it names, and
   `docs/implementation/handoffs/<dep>.md` for each task in its "Depends on" row, and open
   `ISSUES.md` rows in its area.
2. `pnpm check` must be green before you change anything (Phase 0 tasks that create the workspace
   are exempt until the scripts exist). If red for reasons outside your owned paths, log an `S1`
   issue, stop this task as `partial`, and let the main session report it.
3. Do the task's Steps in order, inside its Owned paths only (`packages/i18n/messages/{en,bn}.json`
   are the one shared exception: add both languages in the same commit). Install only the
   dependencies the task lists, at the pins in `00-master-plan.md` §3; if a pin is older than 3 days
   in `docs/status/dependency-check-log.md`, re-verify it on the web first and append an entry.
4. Decisions: take the narrower reversible option, mark it `// ASSUMPTION(<task>): …`, and log an
   `S4` issue. **Ask the human only** for: a change to a hard rule (`PRODUCT.md`), a data boundary
   (`02-data-model.md` §16), a founder decision, a different library/version than pinned, or a
   conflict in a file you do not own. Otherwise never stop to ask.
5. Finish: `pnpm check` and `pnpm smoke` green; add at least one smoke assertion for what you built;
   fill the task file's Hand-off section (what changed, not done, questions, follow-ups, `pnpm check`
   summary, hard-rule evidence, run record `TOOL · MODEL · EFFORT · start/end commit`); write
   `docs/implementation/handoffs/<task>.md` from `templates/handoff-template.md`; add `ISSUES.md`
   rows for every defect, surprise, workaround or assumption.
6. Commit on the task branch: message starts `<task>: `; then run
   `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` — if any tool/model name or `Co-Authored-By`
   appears, `git commit --amend --reset-author` and remove the trailer.
7. Sync and push: `git fetch origin && git rebase origin/main`. Conflicts inside owned paths →
   resolve keeping both intents, re-run `pnpm check`. Conflicts in `NEXT.md`/`ISSUES.md`/`BUILD-LOG.md`
   /README tracker → keep both sides' rows (renumber colliding `ISS-` ids, keep the log chronological).
   Conflicts in a lockfile, a migration number, or a foreign file → stop as `partial` and report.
   Then `git push -u origin <branch>` (`--force-with-lease` only if this branch was pushed before).
   Do **not** push to `main`.
8. Return to the main session: state (done/partial), branch, commit, open questions.

### 1.3 Close the session (main session, after all tasks returned)

1. On `main` (the main checkout): `git pull --ff-only origin main` first (a parallel
   lane session may have pushed). Rewrite `NEXT.md` — state of the build in three lines, questions
   for the human (collected from the sub-agents), blockers. In the Queue mark your finished tasks
   `[ready]`. If **every** queued task is now `[ready]`, set `mode: validate` (keep the ids, drop the
   markers); if another task is still `[running]` in a parallel session, leave `mode: implement` —
   the next validate turn starts when that session marks its task `[ready]`. Set each finished task's
   tracker row in `README.md` §5 to `validating`.
   Append `finished (done|partial)` lines to `BUILD-LOG.md` with the model.
2. Commit these register files on `main` (`git pull --ff-only` first; message
   `loop: queue validate <tasks>`), push `main`. (These files are the only thing the loop
   commits to `main` outside a merge.)
3. Remove the worktrees you created (`git worktree remove ../rk-<task>`); the branches stay on origin.
4. Print, as the last thing you say (fill `<model · effort>` from the tier table for the queued
   tasks' classes — validate column; `<tasks>` is the literal Queue `tasks:` line you just wrote to
   `NEXT.md`, so the printed line is self-contained and needs no cross-reference to find the task ids):

   ```
   Implemented: <tasks> (<done|partial each>). Questions for you: <list or none>.
   Open a NEW session on <model · effort> to VALIDATE <tasks> and paste:
   Read docs/implementation/LOOP.md and do exactly what it says. Ask me only when it tells you to.
   ```
   (If a parallel lane session is still `[running]`, say instead: "Wait for the Lane <X> session to
   finish, then paste the line above.") Then stop.

---

## 2. Mode: validate

If the Queue still has a task marked `[running]`, another session is not finished: say
"Lane <X> is still running; paste again when it has finished" and stop. Otherwise:

You did not implement these tasks; validate them independently. Read `04-handoff-and-validation.md`
§3–§4, `01-conventions.md` §3, §5, §6, §10, §13, §14. For each task in the Queue (in parallel with
sub-agents, each in its own worktree of the task branch, or one after the other):

1. `git worktree add ../rk-<task> task/<branch>` from `origin`. If `origin/main` moved since
   the branch was cut, rebase the branch onto it (register-file conflicts: keep both; any other
   conflict: report and mark the task `FAIL` with an `S1` issue "needs manual rebase").
2. Read `handoffs/<task>.md` and the task file including its Hand-off section.
   If the task is class **M3** and your model is the same model that implemented it (see its run
   record), still validate, but write `Same-model validation — human approval required` in the
   record's verdict line; the human must add `Approved: <name> <date>` before the phase gate.
3. Run `pnpm check` and `pnpm smoke` (the whole cumulative suite; `pnpm e2e:smoke` too once it
   exists). Execute every row of the task's Acceptance table; record expected vs observed. Verify the
   evidence behind each ticked hard-rule item. Read the full diff (`git diff origin/main...HEAD`)
   for: commands missing `requires`, missing audit rows, strings missing in `bn.json`, boundary
   violations (`01-conventions.md` §2), private data in view models or logs, files outside owned
   paths, tool/model names anywhere including `git log --format='%an <%ae>%n%B'`. For M3 tasks add
   and run 3–5 adversarial tests under the task's test paths (never fix code).
4. Write `docs/validation/<task>.md` from `templates/validation-template.md` with verdict
   `PASS | PASS WITH FOLLOW-UP | FAIL`; add an `ISS-` row per finding with severity
   (`S1` breaks demo/hard rule/private data/red check; `S2` storyboard behaviour wrong; `S3` polish;
   `S4` debt). A finding in already-merged code that no currently queued task owns follows
   `04-handoff-and-validation.md` §4.1: fix it now, in its own small branch, if it's small and
   mechanical; otherwise write a `CR-nnn` mini task file so a later session can pick it up — never
   leave it only as an open `ISS-` row with no path forward. Commit on the task branch (`<task>:
   validation record`, author check as in §1.2.6), rebase, push.
5. **Merge on PASS** (also PASS WITH FOLLOW-UP when every follow-up has an `ISS-` row with an owner):
   in the main checkout, `git switch main && git pull --ff-only origin main`,
   `git merge --no-ff <branch> -m "Merge <task>: <title>"`, run `pnpm check` on `main`; if
   green, `git push origin main`, set the tracker row to `merged`, append `merged` to
   `BUILD-LOG.md`. If `pnpm check` is red after the merge, `git merge --abort` is not possible after
   commit — instead `git reset --merge ORIG_HEAD` **before pushing**, mark the task `FAIL` with an
   `S1` issue "integration failure", and do not push.
   On **FAIL**: leave the branch; the tracker row becomes `FAIL`.

### 2.1 Close the session

1. Build the next Queue with §4. Rewrite `NEXT.md` (state, Queue `mode: implement` with the new
   tasks — a `FAIL`ed task goes back first as "`<task>` — fix ISS-… per docs/validation/<task>.md" —
   questions for the human, blockers). Append `validated <verdict>` lines to `BUILD-LOG.md`.
   Commit the register files on `main` (`loop: queue implement <tasks>`), push.
2. Remove your worktrees.
3. Print, as the last thing you say (fill `<model · effort>` from the tier table — implement
   column — for the classes of the tasks you just queued; `<tasks>` is the literal Queue `tasks:`
   line you just wrote to `NEXT.md`, so the printed line is self-contained and needs no
   cross-reference to find the task ids):

   ```
   Validated: <task: verdict, …>. Merged: <tasks>. Needs your decision: <list or none>.
   Open a NEW session on <model · effort> to IMPLEMENT <tasks> and paste:
   Read docs/implementation/LOOP.md and do exactly what it says. Ask me only when it tells you to.
   ```
   Then stop.

---

## 3. Mode: done

All tasks in `README.md` §5 are `merged` (T-505 included). Say so, point the human to `DEMO.md`
and `docs/validation/DEMO-GATES.md`, and stop. Do not print a next prompt.

---

## 4. How to build the next Queue (validator does this; implementer only if the Queue was missing)

1. From `README.md` §5, list tasks whose status is `todo` (or `FAIL` — these come first) and whose
   every "Depends on" task (from the task file header) is `merged`. Treat D-001 as a task; treat
   "half A / half B" of T-207 as two entries `T-207a`, `T-207b` with the dependencies in
   `00-master-plan.md` §5.
2. Order candidates by the step order of `00-master-plan.md` §8, then by lane (A before B).
3. Take the first candidate. Take a second only if: it is in the **other lane**, its task file's
   "Parallel-safe with" row names the first (or their Owned paths are disjoint), and neither is an
   M3 task that the master plan marks sequential within its domain (T-303→T-304→T-305, T-401→T-403→
   T-404, T-101→T-103/T-104, T-301→T-302). Never queue a task and a task that depends on it together.
4. Write the `recommended:` line: the highest tier among the queued tasks' classes, implement
   column of the §0.1 table (e.g. `recommended: Claude Sonnet 5 or Opus 4.8 · effort high`; for an M3
   task `recommended: Claude Opus 5 · effort xhigh (or Opus 4.8 at max)`). When you set
   `mode: validate` (§1.3) use the validate column instead.
5. If nothing is unblocked but tasks remain, set `mode: implement`, `tasks: none`, and write the
   blocker under "Blockers" with what the human must do. If every task is `merged`, `mode: done`.

---

## 5. What the human does

- Paste the one-line prompt into a fresh session whenever the previous one printed it. To run two
  terminals at once during an implement turn, paste the line ending with `Lane A` in one and
  `Lane B` in the other; validate turns always use the plain line in one session. Alternate
  tools if you like (Codex for validate sessions gives cross-vendor review on M3 tasks; otherwise
  the same tool is acceptable — the record says so).
- Answer questions written under "Questions for the human" in `NEXT.md` by editing that file (or
  replying in the session that asked); the next session reads the file, not the chat.
- Read `NEXT.md` and the open `S1`/`S2` rows in `ISSUES.md` when you have five minutes. Add your own
  wishes to `06-change-requests.md`; the next implement session picks up `S`-size rows for the task
  it is working on and larger ones become `CR-` tasks queued by §4. A `CR-nnn` row logged
  `Status: needs queueing` (from `04-handoff-and-validation.md` §4.1 — a session's own out-of-scope
  finding, not a founder wish) is queued the same way once you approve it or answer its question.
- At the end of each phase (the validator writes "phase gate reached" in `NEXT.md`), open the running
  demo and walk the storyboard steps it lists; write what you saw into `docs/validation/PHASE-n.md`.
