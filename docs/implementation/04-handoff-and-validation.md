# Handoff, issue logging and validation protocol

Every task is implemented by a fresh agent session and validated by a different one. The build only
works if each session leaves the next one an exact, short account of where things stand. This file
defines the files, the rituals at the start and end of every session, the validation gates, and the
issue register. It is binding for implementers, validators and the human.

Evidence for the choices here: §8 (research of 2026-09-12,
`docs/planning/research/agent-handoff-validation-2026-09-12/research.md`).

## 1. The files

| File | Purpose | Who writes | Shape |
|---|---|---|---|
| `NEXT.md` | **The baton.** What the build looks like right now and what to do next, per lane. Always current, never a history. | every session at its end (implementer, validator, human) | ≤ 40 lines; rewritten, not appended |
| `handoffs/T-xxx.md` | The implementer's message to whoever touches this area next: what was built, how it was verified, what is fragile, what to do first if you continue it. | implementer at task end (also for partial work) | template in `templates/handoff-template.md`; ≤ 80 lines |
| `docs/validation/T-xxx.md` | The validator's independent record with verdict. | validator | template in `templates/validation-template.md` |
| `ISSUES.md` | Register of every defect, gap or surprise found by anyone, in any task, with status. | anyone who finds one | one row per issue, IDs `ISS-nnn` |
| `BUILD-LOG.md` | Append-only chronological log: started / finished / validated / merged / blocked events. | every session | one line per event |
| `README.md` §5 tracker | Task status table. | implementer → `validating`, validator → verdict, human → `merged` | |
| `tasks/T-xxx.md` "Hand-off" section | The implementer's record *inside* the task contract: what changed, evidence for the hard-rule checklist, `pnpm check` output. | implementer | already defined in every task file |
| `06-change-requests.md` | Founder-requested changes. | human | |

The task file's hand-off section and `handoffs/T-xxx.md` differ in audience: the first proves the task
contract was met; the second tells the next agent how to work in what was built.

## 2. Session rituals

**Model record (every ritual below):** each session names its tool, exact model id and effort setting in its `BUILD-LOG.md` lines, in the header table of its handoff or validation record, and in the task file's run record. Validation evidence only; never in code, commit messages or product docs. Tool-specific prompts that implement these rituals are in `08-agent-prompts.md`.

### Implementer — at start (before any code)

0. `git fetch origin`; work from the updated `build/demo`. If `NEXT.md` changed upstream (another machine pushed), re-read it before trusting your assignment.
1. Read `NEXT.md`. If it names a different task for your lane than the one you were given, stop and ask the human.
2. Read the `handoffs/` files of every task in your task's **Depends on** row, and any open `ISSUES.md` rows whose *area* matches your owned paths.
3. Read your task file and the docs it names. Then append to `BUILD-LOG.md`: `<date time> · lane X · T-xxx · started · <branch>`.
4. Confirm `pnpm check` is green on your branch before you change anything. If it is not, log an `ISS-` row (`S1`, found in T-xxx, "inherited red check"), fix only if it is inside your owned paths, otherwise stop and ask.

### Implementer — at end (done or stopped)

1. Fill the task file's Hand-off section (what changed, not done and why, questions, follow-ups, `pnpm check` summary, hard-rule evidence).
2. Write `handoffs/T-xxx.md` from the template. Partial work is still handed off — mark `State: partial` and write the exact next step.
3. Add an `ISS-` row for every defect, gap, surprise or workaround you met — including ones you fixed (status `fixed in T-xxx`), so patterns become visible.
4. Rewrite `NEXT.md`: current state in three lines, next task for your lane (from the master plan order, skipping anything blocked), the first three things that agent should do, blockers, questions for the human.
5. Append to `BUILD-LOG.md`: `… · T-xxx · finished (done|partial) · <commit> · <one-line note>`; set the tracker row to `validating`.
6. Commit (task paths only, no attribution), verify the author and message with `git log -1 --format='%an <%ae>%n%B'`, rebase on `origin/build/demo`, push the task branch, open a PR into `build/demo` (rules in §6). Stop. Do not start the next task in the same session.

### Validator — a new session, the other vendor

1. Read `NEXT.md`, `handoffs/T-xxx.md`, the task file, then the diff. Append `… · T-xxx · validation started`.
2. Run the gates in §3. For each acceptance check record expected vs observed.
3. Every finding becomes an `ISS-` row with a severity (§4) **and** appears in the validation record.
4. Write `docs/validation/T-xxx.md` with the verdict. Update the tracker row (`PASS`, `PASS+F`, `FAIL`), append to `BUILD-LOG.md`, and edit `NEXT.md` if the verdict changes what the next agent should do (a `FAIL` puts "fix ISS-… in T-xxx" ahead of the next task for that lane).
5. Commit the validation record and the register changes. Stop.

### Human — daily

Read `NEXT.md` and the open `S1`/`S2` rows in `ISSUES.md`. Merge `PASS` branches into `build/demo` in dependency order, then re-run `pnpm check` on `build/demo` and append `… · merged`. Answer the questions in `NEXT.md` (write the answer into `NEXT.md` or the task file — not only in chat, because the next agent will not see the chat). Log your own change requests in `06-change-requests.md`.

## 3. Validation gates (what "tested and validated after each task" means)

Gate order per task; a task cannot be marked `validating` until G1 passes, and cannot `PASS` until G1–G4 pass.

| Gate | What runs | Who | Passes when |
|---|---|---|---|
| **G1 self-check** | `pnpm check` (typecheck, lint incl. boundaries, unit + integration, i18n parity, build) on the task branch | implementer | green; output pasted in the task file |
| **G2 acceptance** | every row of the task's "Acceptance checks" table, executed, not read | validator | observed = expected for every row |
| **G3 regression smoke** | `pnpm smoke` — the **cumulative** smoke suite (§3.1); plus `pnpm e2e:smoke` once T-503 exists | validator | green; no assertion removed or skipped |
| **G4 review** | diff read for the items in the validator prompt (authorization, audit, i18n parity, boundaries, private data in view models/logs, files outside owned paths); for M3 tasks 3–5 adversarial tests written and run | validator | no `S1`; `S2` only with an owner and a due gate (→ `PASS WITH FOLLOW-UP`) |
| **G5 phase gate** | the storyboard steps unlocked by the phase, walked by the human in both locales; `docs/validation/PHASE-n.md` | human + validator | every step observed as written or logged as an issue |

### 3.1 The cumulative smoke suite

Each task adds at least one smoke assertion for the behaviour it delivered, in `packages/*/src/**/*.smoke.test.ts` or `apps/web/src/**/*.smoke.test.tsx` (Vitest, tagged by filename), and from T-503 on in `apps/web/e2e/smoke/*.spec.ts` (Playwright, Chromium only, ≤ 3 min). `pnpm smoke` runs them all. The suite only grows; deleting or skipping a smoke assertion needs an `ISS-` row explaining why. This is what catches "task N broke task N-3" — the validator runs the whole thing every time, not just the new task's tests.

### 3.2 Rules for verdicts

- In loop mode (`LOOP.md`) the validating session merges `PASS` branches into `build/demo` itself after a green `pnpm check` on the merged result, and same-model validation of an M3 task is allowed with a `human approval required` line that the human signs before the phase gate.

- `FAIL` → the implementer's lane fixes the listed `ISS-` rows first (same class of model, fresh session, with the validation record pasted in). Two `FAIL`s on an M1/M2 task → escalate the class (master plan §7).
- `PASS WITH FOLLOW-UP` → merge; each follow-up is an `ISS-` row with `S2`/`S3`, an owner task, and a due gate (usually the phase gate).
- A validator never fixes code. It may add test files under the task's test paths and must say so.
- The implementer and validator are never the same session, and for M3 tasks never the same vendor (if only one vendor is available, a different model plus the human's written approval in the record is the fallback — `08-agent-prompts.md` §0).

## 4. Issue register rules (`ISSUES.md`)

| Severity | Meaning | Rule |
|---|---|---|
| `S1` | breaks the demo, violates a hard rule, leaks private data, red `pnpm check` | blocks merge of the task where it was found; goes to the top of `NEXT.md` |
| `S2` | wrong or missing behaviour the storyboard needs | must be fixed before the phase gate; needs an owner task |
| `S3` | cosmetic, copy, a11y polish, minor divergence from the prototype | fixed in the owning task or batched into a `CR-` mini task |
| `S4` | tech debt, workaround, `// ASSUMPTION(T-xxx)` markers, deferred to Phase 2 | tracked; reviewed at T-505 |

Columns: `ID · date · found in (task) · by (implementer/validator/human) · severity · area (module or path) · title · repro / evidence (file:line, test, command) · status (open / fixed in T-xxx / deferred → CR-nnn or Phase 2 / won't fix + reason) · owner`.

Every `// ASSUMPTION(T-xxx):` marker in code has an `S4` row. Every validator finding has a row. Every fixed bug has a row — the register is also the list of things the smoke suite should cover.

## 5. Context hygiene (why the files are short)

- One task per session. When the task is done or you are stuck, hand off and stop; a fresh session reading a 60-line handoff outperforms a long session carrying a stale plan.
- Handoffs describe *state and next steps*, never transcripts. No pasted logs longer than 20 lines; link to files instead.
- If a session runs past **twice the task's high estimate** without reaching a checkpoint, it stops and hands off as `partial`.
- The task file is the contract; if the implementer finds it wrong, it writes the disagreement in the hand-off section and `ISSUES.md`, picks the narrower option, and continues. Task files are edited by the human (or by T-505), not silently by implementers.

## 6. Two lanes in parallel

- Lane A (backend) and lane B (frontend) each own a git worktree and a task branch at a time. `NEXT.md` has one "next" per lane.
- Merge into `build/demo` in the master plan's dependency order only; a lane never merges its own branch — the human does, after `PASS`.
- A task that must change a shared file it does not own (dictionary files are the usual case) says so in its handoff; the human merges that task first.
- Rebase task branches on `build/demo` before validation when the dependency landed after the branch was cut; log it in `BUILD-LOG.md`.
- Remote: `origin` (GitHub) holds `build/demo` and the task branches. Every session fetches first; task branches are pushed and opened as PRs into `build/demo`; nobody pushes to `build/demo`/`main` except a validator told `MERGE: yes` after PASS, or the human. Conflict rules: owned paths → resolve and re-check; register files (`NEXT.md`, `ISSUES.md`, `BUILD-LOG.md`, tracker) → union of both sides then rewrite `NEXT.md` from the newest state; lockfiles, migration numbers, foreign files → ask the human. `--force-with-lease` only on one's own task branch; never `--force`. Full text: `08-agent-prompts.md` §3.

## 7. Budget for this protocol

Reading the baton and the dependency handoffs costs each session 5–10 minutes; writing the handoff, issues and `NEXT.md` costs 10–15 minutes; re-work after `FAIL` verdicts is budgeted at one in five tasks needing one fix cycle. Together ≈ 8 % of implementation time — the row "Handoff, issue logging and re-work" in the master plan roll-up.

## 8. Sources and rationale

Full citations: `docs/planning/research/agent-handoff-validation-2026-09-12/research.md`.

| Choice in this protocol | Why | Source type |
|---|---|---|
| `NEXT.md` as a short, rewritten baton; handoffs ≤ 80 lines; no transcripts | Anthropic's context-engineering guidance: context is finite and degrades ("context rot"); keep persistent state in structured external notes and hand sub-results back as condensed summaries | official (Anthropic) |
| One task per session; stop and hand off at the task boundary | the widely practised "Ralph loop": progress lives in files and git, each iteration picks one task, tests, updates the progress file, commits | community |
| `tasks/` files with dependencies as the "pick next" source; `NEXT.md` as the pointer | Kiro's `tasks.md` and GitHub Spec Kit: executable task lists with explicit inputs/outputs beat prose plans | community (product-backed) |
| `CLAUDE.md` imports `AGENTS.md` (`@AGENTS.md`) so Claude Code and Codex read one rule set | Claude Code memory docs recommend the import instead of duplication; Codex reads `AGENTS.md` only (≈ 32 KiB cap) | official (both vendors) |
| Validator is a different session and, for M3, a different vendor; a single AI "looks good" never gates a merge | LLM-as-judge shows positional, verbosity and self-enhancement bias (arXiv 2604.16790, 2505.16222); Claude Code's own review ensembles four agents with a confidence threshold; Codex exposes `review_model` for cross-model review | research + official |
| Gates are deterministic checks (`pnpm check`, acceptance table, cumulative smoke) before any review opinion | Anthropic: coding work is "verifiable through automated tests"; Stack Overflow 2025: 66 % of developers find AI answers "almost right", 45 % lose time debugging them | official + survey |
| Human phase gate (G5) even though every task was validated | DORA 2025: teams are merging more with zero review while perceiving higher quality; AI amplifies existing discipline | research |
| In-repo `ISSUES.md` instead of GitHub Issues during the build | it stays in every agent's file context; Codex's GitHub connector cannot create issues at all | official gap + community |
| 8 % handoff/re-work budget plus a 20–30 % calendar buffer | METR's RCT: experienced developers were 19 % slower with AI while believing they were faster; no vendor publishes a re-work rate — measure your own after Phase 0 and adjust | research |
| `claude --worktree <lane>` per lane, `.worktreeinclude` for `.env`, daily merges to `build/demo`, file-disjoint lanes | Claude Code worktree docs (isolation checks, `baseRef`); community consensus that worktrees remove branch collisions but not semantic conflicts | official + community |
