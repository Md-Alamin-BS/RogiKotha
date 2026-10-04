# Agent prompts — tool-specific, copy-paste ready

The generic prompts in `README.md` §3–§4 define *what* every session does. This file gives the exact
text to paste into each tool, plus the rules that differ by tool: how the session records the model
it is running on, how it keeps git attribution clean, and how it syncs with the remote.

Fill the four placeholders before pasting: `T-XXX` (task id), `LANE` (A or B), `MODEL` (the model
you selected in the tool, e.g. `claude-opus-4-8`), `EFFORT` (the effort/thinking setting you chose).

## 0. Tool notes

| Tool | Instruction files it loads | How it knows the model | Attribution risk | Notes |
|---|---|---|---|---|
| **puku-cli** (your main tool, usually with Claude Opus 4.8) | reads `CLAUDE.md` at session start (its `InstructionsLoaded` hook fires on it); `@AGENTS.md` inside `CLAUDE.md` is Claude Code import syntax and may not be expanded, so the prompt tells the agent to read `AGENTS.md` itself | the docs describe provider profiles and per-agent `model:` overrides but no command that prints the active model — the prompt makes the agent state the model you passed and ask you if its tool reports something different | **high**: a previous puku-cli commit landed on GitHub with author `Puku CLI / Opus 4.8 <noreply@puku.sh>` (see `AGENTS.md`); the prompt forces an author check after every commit | has sub-agents, hooks, MCP, web search; `/compact` summarises long sessions — the hand-off files are written to disk before that matters |
| Claude Code | `CLAUDE.md` (which imports `AGENTS.md`) and `AGENTS.md` | `/model` shows it; `/status` too | low, but its default commit trailer must stay off (`AGENTS.md`) | use `claude --worktree lane-a` for lane isolation |
| Codex CLI | `AGENTS.md` only (ignores `CLAUDE.md`) | shown in the session header; `/model` | low | `codex --model gpt-5.6-terra`; cross-vendor validator for M3 |

**Model record rule (binding, added to `04-handoff-and-validation.md` §2):** every session writes
`tool · model id · effort` into (a) its `BUILD-LOG.md` lines, (b) the header table of its
`handoffs/T-xxx.md` or `docs/validation/T-xxx.md`, and (c) the run-record fields in the task file's
hand-off section. This is validation evidence, not attribution; it never goes into code, commit
messages or product docs.

**Same-vendor validation:** with puku-cli + Opus 4.8 doing most of the work, the rule is: M0/M1/M2
tasks may be validated by puku-cli + Opus 4.8 in a **new session**; M3 tasks must be validated by the
other vendor (Codex GPT-5.6 Sol or Terra) or, if Codex is unavailable, by a *different* model in
puku-cli (e.g. Sonnet 5 through its Anthropic profile) **plus** your explicit approval line in the
validation record. Never the same session for both.

## 1. Implementer prompt — puku-cli

```text
You are implementing task T-XXX of the RogiKotha build in lane LANE. Work only on this task.
Tool and model for this session: puku-cli · MODEL · effort EFFORT. If your tool reports a different
model than MODEL, stop and tell me before doing anything else.

READ FIRST, in this order:
1. AGENTS.md — no agent/tool/model identity anywhere in the repo (code, comments, docs, commit author,
   commit message, trailers). This applies to puku-cli's own defaults: verify after every commit.
2. docs/implementation/NEXT.md — if it names a different task for lane LANE than T-XXX, stop and ask me.
3. docs/implementation/04-handoff-and-validation.md sections 2, 3.1, 4, 5, 6.
4. docs/implementation/00-master-plan.md sections 1-4 and 7; docs/implementation/01-conventions.md (all).
5. docs/implementation/handoffs/<file> for every task in your task's "Depends on" row; open rows of
   docs/implementation/ISSUES.md in your area.
6. docs/implementation/tasks/T-XXX-*.md — your contract. A "Scope change" block at its top overrides
   the steps below it. Then the docs and prototype files it names.
7. PRODUCT.md "Hard rules".

GIT, BEFORE ANY CODE:
- git fetch origin. If origin/main is ahead of your local main, fast-forward it. If
  docs/implementation/NEXT.md changed upstream, re-read it and re-check that T-XXX is still the task.
- git switch -c task/t-xxx-<short-name> main (from the updated branch). If the branch already
  exists on origin (a previous session started this task), check it out and read its last handoff.
- Confirm git config user.name and user.email are the human's identity (not puku/noreply). If not,
  stop and ask me.
- Run pnpm check; it must be green before you change anything (Phase 0 tasks that create the
  workspace are exempt until the scripts exist). Append a "started" line to
  docs/implementation/BUILD-LOG.md: "<date time> · lane LANE · T-XXX · started · <branch> · puku-cli MODEL EFFORT".

RULES THAT OVERRIDE ANYTHING ELSE:
- Follow the task file literally. Do not widen scope, do not "improve" copy or visuals, do not touch
  files outside the task's owned paths (the dictionaries en.json/bn.json are the one shared exception).
- Every user-facing string goes into both packages/i18n/messages/en.json and bn.json in the same commit.
- Every state change goes through an application command with authorization and an audit row.
- Install only the dependencies the task file lists, at the pins in 00-master-plan.md section 3. If
  the pinned version is older than 3 days in docs/status/dependency-check-log.md, or you believe a
  different version or library is needed, research it on the web (AGENTS.md requires this), write
  your finding in the task file under "Questions for the human", and ask me before switching.
- When unsure, follow 01-conventions.md section 15: take the narrower reversible option, mark it
  // ASSUMPTION(T-XXX): …, and record the question. Ask me directly for anything that changes a hard
  rule, a data boundary, a founder decision, or a file you do not own.
- Never run git reset --hard, git checkout -- <file> on files you did not change, git clean, or any
  force push except --force-with-lease on your own task branch after a rebase.

WHEN DONE (or when stopping with partial work, or after twice the task's high estimate):
1. Run pnpm check and pnpm smoke; add at least one smoke assertion for what you built.
2. Fill the task file's Hand-off section (what changed, not done and why, questions, follow-ups,
   pnpm check summary, hard-rule evidence, run record: puku-cli · MODEL · EFFORT · start/end commit).
3. Write docs/implementation/handoffs/T-XXX.md from templates/handoff-template.md, with the model in
   its header table.
4. Add a row to docs/implementation/ISSUES.md for every defect, gap, surprise, workaround or
   ASSUMPTION marker (including ones you fixed).
5. Rewrite docs/implementation/NEXT.md (state, next task per lane with its first three steps,
   blockers, questions for me). Append a "finished (done|partial)" line to BUILD-LOG.md with the
   model. Set the tracker row in docs/implementation/README.md section 5 to "validating".
6. Commit on the task branch: message starts "T-XXX: ", human identity only, no trailer. Then run
   git log -1 --format='%an <%ae>%n%cn <%ce>%n%B' and check that no tool, model or "Co-Authored-By"
   appears anywhere. If it does, fix it with git commit --amend --reset-author (and remove the
   trailer) before pushing.
7. Sync and push: git fetch origin; git rebase origin/main. On conflicts:
   - inside your owned paths → resolve keeping both intents, re-run pnpm check;
   - in NEXT.md / ISSUES.md / BUILD-LOG.md / README tracker → keep both sides' rows (renumber ISS-
     ids if they collide, keep BUILD-LOG chronological), then rewrite NEXT.md from the newest state;
   - in a lockfile, a migration number, or any file outside your owned paths → stop and ask me.
   Then git push -u origin <task-branch> (use --force-with-lease only if you rebased an already-pushed
   task branch). Do not push to main. Open a pull request into main with
   gh pr create --base main --title "T-XXX: <title>" --body-file docs/implementation/handoffs/T-XXX.md
   (no attribution lines in the body). If gh is unavailable, tell me the branch name.
8. Report to me in five lines: state, commit, PR link, open questions, and the next task NEXT.md
   names. Then stop. Do not merge. Do not start another task.
```

## 2. Validator prompt — puku-cli (new session; for M3 tasks use Codex or a different model, see §0)

```text
You are the independent validator for task T-XXX of the RogiKotha build. You did not implement it.
Tool and model for this session: puku-cli · MODEL · effort EFFORT. If your tool reports a different
model than MODEL, stop and tell me. If the task is class M3 and MODEL is the same model that
implemented it (see the task file's run record), stop and tell me — M3 needs the other vendor.

READ: AGENTS.md; docs/implementation/04-handoff-and-validation.md sections 2-4;
docs/implementation/NEXT.md; docs/implementation/handoffs/T-XXX.md; docs/implementation/01-conventions.md
sections 3, 5, 6, 10, 13, 14; docs/implementation/tasks/T-XXX-*.md including its hand-off section.

GIT: git fetch origin; check out the task branch (origin/task/t-xxx-…); if origin/main moved
since the branch was cut, rebase the task branch onto it first (resolve register-file conflicts by
keeping both sides; stop and ask me on any other conflict). Append "validation started" to
docs/implementation/BUILD-LOG.md with the model.

DO:
1. Run pnpm check and pnpm smoke (the whole cumulative smoke suite; plus pnpm e2e:smoke once it
   exists). Paste the summaries. A skipped or deleted smoke assertion is a finding.
2. Execute every row of the task's "Acceptance checks" table; record observed vs expected.
3. Verify the evidence behind every ticked hard-rule item (open the file:line or run the test).
4. Read the full diff of every owned path (git diff origin/main...HEAD). Look for: commands
   missing `requires`, missing audit rows, strings missing in bn.json, imports crossing the boundaries
   in conventions section 2, private data (account ids, emails, reporter ids, original filenames) in
   view models or logs, files outside owned paths, any tool/model name in code, comments, docs or
   the commit author/message/trailers (git log origin/main..HEAD --format='%an <%ae>%n%B').
5. For M3 tasks write 3-5 adversarial tests the implementer did not think of, run them, report
   results. Never fix code; you may add test files under the task's test paths and must say so.
6. If a check needs facts you do not have (a library behaviour, a CVE, a Windows quirk), search the
   web and cite the source in the record.

WRITE docs/validation/T-XXX.md from docs/implementation/templates/validation-template.md; the
validator line is "puku-cli · MODEL · EFFORT". Then: an ISS- row in docs/implementation/ISSUES.md for
every finding (severity per 04 section 4); tracker row in docs/implementation/README.md set to the
verdict; "validated <verdict>" line in BUILD-LOG.md with the model; if FAIL, put "fix ISS-… in T-XXX"
ahead of the next task for that lane in NEXT.md.

COMMIT those files on the task branch ("T-XXX: validation record", human identity, no trailer;
verify with git log -1 as above), git fetch origin, rebase if needed, git push. Comment the verdict on
the PR (gh pr comment) if gh is available.

MERGE: do not merge unless my prompt contains the line "MERGE: yes". If it does and the verdict is
PASS (or PASS WITH FOLLOW-UP with every follow-up logged as an ISS- row), then: git switch main;
git pull --ff-only origin main; git merge --no-ff <task-branch> -m "Merge T-XXX: <title>";
pnpm check on main; git push origin main; append "merged" to BUILD-LOG.md and set the
tracker row to "merged" (commit that on main and push). If pnpm check fails on main,
do not push; tell me. Ask me before merging if anything in the record is marked "decision for the
human".

Report to me in five lines: verdict, findings by severity, what I must decide, PR link, next task.
Then stop.
```

## 3. Git remote rules (apply to every tool; also added to `04-handoff-and-validation.md` §6)

1. `origin` is `https://github.com/Md-Alamin-BS/RogiKotha.git`. `main` is the integration branch (`build/demo` was merged into it and deleted on 2026-10-04).
2. Every session starts with `git fetch origin` and works from the updated `main`. Another machine may have pushed: if `NEXT.md` changed upstream, the session re-reads it before trusting the task assignment it was given.
3. Task branches are pushed to `origin` and opened as PRs into `main`; agents never push to `main` unless the prompt says `MERGE: yes` (validator only, PASS only).
4. Conflicts: owned paths → resolve and re-check; register files (`NEXT.md`, `ISSUES.md`, `BUILD-LOG.md`, README tracker) → union of both sides, then `NEXT.md` rewritten from the newest state; lockfiles, migration numbers, files outside owned paths → stop and ask.
5. `--force-with-lease` only on the session's own task branch after a rebase; never `--force`, never on shared branches.
6. After every commit: `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` must show your identity and no tool/model/trailer. A wrong author is fixed with `git commit --amend --reset-author` before pushing.
7. Two migrations with the same number from two lanes is the one conflict that always goes to the human.

## 4. Model routing with puku-cli as the main tool

`00-master-plan.md` §7 stands; this maps it onto the tool you will mostly use.

| Class | Implementer | Validator |
|---|---|---|
| M0 | puku-cli + Opus 4.8 (or a cheaper profile if you have one) | puku-cli + Opus 4.8, new session |
| M1 / M2 | puku-cli + Opus 4.8 | puku-cli + Opus 4.8, new session (Codex Terra when you want a second vendor) |
| M3 | puku-cli + Opus 4.8 at the highest effort the tool offers | **Codex GPT-5.6 Sol/Terra** (preferred) or puku-cli with a different model + your approval line |
| M4 | — | Codex Sol, or puku-cli + Opus 4.8 only if the implementer was Codex |

Opus 4.8 is the previous-generation top model; Anthropic's own comparison tables place Opus 5 above it, but it sits at or above Sonnet 5 for spec-following work, so it is a sound default for M0–M2 and acceptable for M3 with cross-vendor validation. Re-check `docs/planning/research/model-assignment-2026-09-10/research.md` if you change providers.
