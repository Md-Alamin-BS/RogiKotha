# Agent handoff, validation and estimation practices — research (2026-09-12)

**Question:** What is current best practice for a multi-week build executed by many short AI-agent sessions (Claude Code, Codex CLI) with a human supervisor: how sessions hand off, how each task is validated, how defects are logged, how to estimate agent time, and how to run two lanes with git worktrees?
**Method:** web search and fetch of official docs (Anthropic, OpenAI, METR, DORA, Stack Overflow) and well-known community patterns on 2026-09-12; each claim is labelled official / research / community.
**Result:** the protocol in `docs/implementation/04-handoff-and-validation.md`. This file is the evidence behind it.

## 1. Handoff between agent sessions

1. **[Official/Anthropic]** Claude Code's context layer is two-tiered: `CLAUDE.md` (human-written, persistent, loaded every session) and auto memory (Claude-written notes under the project memory directory, indexed by a `MEMORY.md` capped at 200 lines / 25 KB — content past that is silently dropped on load). Keep `CLAUDE.md` under ~200 lines; longer files "consume more context and reduce adherence." The project-root `CLAUDE.md` is re-read from disk after `/compact`. https://code.claude.com/docs/en/memory
2. **[Official/OpenAI]** Codex loads `AGENTS.md` hierarchically (global → repo root → nested), closer files override, and stops once the combined size reaches ~32 KiB. Codex docs cover instruction discovery only — there is no section on progress tracking or state handoff between runs; that is left to the user. https://agents.md/ · https://learn.chatgpt.com/docs/agent-configuration/agents-md
3. **[Official/Anthropic]** Do not duplicate `AGENTS.md` and `CLAUDE.md`: make `CLAUDE.md` import it with `@AGENTS.md` plus tool-specific additions, so both agents read one source of truth. https://code.claude.com/docs/en/memory
4. **[Official/Anthropic]** Context is a finite resource subject to "context rot"; recommended techniques: compaction before limits, **structured note-taking to external files** (a progress/notes file) for persistent memory that survives a reset, and sub-agent delegation returning condensed summaries rather than transcripts. https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents
5. **[Community, widely practised]** The "Ralph Wiggum loop": progress lives in files and git history, not the context window. Each iteration reads the plan and a progress file, picks the single highest-priority incomplete task, implements it fully, runs tests, updates the progress file, commits, stops. One task per iteration gives clean rollback points and focused context. https://dwmkerr.com/ralph-wiggum-loop/ · https://github.com/agenticloops-ai/ralph-loop
6. **[Community, modelled on an AWS product]** Kiro specs: `requirements.md` → `design.md` → `tasks.md`, where `tasks.md` is the literal "pick next" pointer with inputs/outputs/dependencies per task, checked off as completed. https://kiro.dev/docs/specs/
7. **[Community, GitHub-affiliated]** GitHub Spec Kit adds a `constitution.md` of non-negotiable principles read at the start of every phase. https://github.com/github/spec-kit · https://github.github.com/spec-kit/

**Synthesis for a handoff file:** current task and one-line status, dated decision/assumption log, pointer to the next task, short known-issues/blockers list, links rather than inlined detail. Start a fresh session when the task is committed and done, when the session repeats mistakes (context-rot symptom), or at a task boundary. No vendor specifies a numeric "start fresh" threshold; that is convention.

## 2. Validation after each task

1. **[Official/Anthropic]** "Building effective agents": programmatic gates at intermediate steps; coding solutions are "verifiable through automated tests" so agents can self-correct, but "human review remains crucial"; prefer stopping conditions over unbounded autonomy. https://www.anthropic.com/engineering/building-effective-agents
2. **[Official/Anthropic]** Claude Code's `/code-review` and the hosted Code Review run four parallel review agents, score findings for confidence and surface only items ≥ 80 — an explicit admission that a single LLM-as-judge pass is noisy enough to need ensembling and thresholds. https://code.claude.com/docs/en/code-review
3. **[Official/OpenAI]** Codex `/review` is read-only, supports `--uncommitted`, `--base <branch>`, `--commit <sha>`, and a separate `review_model` config — cross-model review is a first-class option. https://developers.openai.com/codex/cli/features
4. **[Research]** LLM-as-judge is empirically unreliable for code: positional bias, verbosity bias, self-enhancement bias (favouring its own outputs), high sensitivity to prompt wording with unchanged code. Treat a single AI verdict as advisory, never a merge gate. https://arxiv.org/html/2604.16790v1 · https://arxiv.org/pdf/2505.16222
5. **[Research]** Stack Overflow 2025: 29 % of developers trust AI output (down 11 points year on year), 46 % distrust, 66 % say answers are "almost right but not quite", 45 % lose significant time debugging AI-generated code. https://survey.stackoverflow.co/2025/ai
6. **[Research, mixed]** DORA 2025: 90 % AI adoption, 59 % perceive better quality, but median PR review time up 441 % year on year and 31 % more PRs merged with zero review; AI is an amplifier of existing discipline, not a substitute. https://dora.dev/dora-report-2025/
7. **[Community]** TDD with agents (failing test → implement → green) is the common way to make acceptance criteria executable; consistent with Anthropic's guidance but not a vendor mandate.

**Synthesis:** run the full check suite after every task, not only diff-scoped tests; review with a different session and, for critical work, a different model; treat "looks good" as unverified until a deterministic check or a human confirms it.

## 3. Issue and defect logging

1. **[Official/Anthropic]** Claude Code GitHub Actions lets `@claude` on issues/PRs trigger work; the common failure is a missing `permissions:` block. https://code.claude.com/docs/en/github-actions
2. **[Official/OpenAI]** Codex's GitHub connector can read, search and comment on issues and open PRs but **cannot create a GitHub issue** (documented gap). https://developers.openai.com/codex/integrations/github · https://github.com/openai/codex/issues/17513
3. **[Community]** For a small team during active implementation an in-repo issue register is preferred over GitHub Issues because it is in the agent's file context automatically; severity triage and a link to the task that found the issue are standard hygiene. No official statement either way.

## 4. Estimating agent time

1. **[Research org]** METR Time Horizon 1.1 (Jan 2026): the 50 %-task-completion time horizon of frontier models has been doubling roughly every 3–4 months since 2024; 31 of 228 benchmark tasks are now 8 h+, but human baselines exist for only 5 of those, so long-task numbers carry wide uncertainty. https://metr.org/time-horizons/ · https://metr.org/blog/2026-1-29-time-horizon-1-1/
2. **[Research, load-bearing caveat]** METR's July 2025 RCT: 16 experienced open-source developers on 246 real tasks in their own large, familiar repos were **19 % slower** with AI tools while believing they were 20 % faster. A documented perception gap; a caution against taking a first-pass agent ETA at face value. https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/
3. **[Not verified]** No 2026 Anthropic or OpenAI statement gives a validation-failure or re-work rate to budget; derive a baseline from the first week of tasks.
4. **[Inference]** Size tasks against a human-style baseline, add 20–30 % schedule buffer for verification and re-work, and re-estimate after the first phase.

## 5. Parallel lanes with git worktrees

1. **[Official/Anthropic]** Claude Code has native `--worktree` / `-w` support (v2.1.49+): isolated worktree under `.claude/worktrees/<name>/` on branch `worktree-<name>`, with hard checks blocking edits or commands that target the main checkout; can branch from a PR number. https://code.claude.com/docs/en/worktrees
2. **[Official/Anthropic]** Default base ref is `fresh` (remote default branch); `worktree.baseRef: "head"` branches from local work, for lanes that must build on unmerged work. Same source.
3. **[Official/Anthropic]** Worktrees share `.git` and permission approvals; each needs its own dependency install; `.worktreeinclude` copies git-ignored files such as `.env` into new worktrees. Same source.
4. **[Community, consistent]** Keep lanes short-lived and merge to an integration branch daily or per task; worktrees remove branch collisions but not semantic conflicts, which still need a rebase/merge step. No vendor prescribes a cadence.
5. **[Not verified]** No official guidance on avoiding semantic conflicts beyond directory isolation; file-disjoint task decomposition is a planning responsibility.

## Recommended protocol (adopted in `04-handoff-and-validation.md`)

- One `CLAUDE.md` that `@`-imports `AGENTS.md`, under ~200 lines, with build/test commands, conventions and "do not repeat this mistake" rules.
- A separate progress file (`NEXT.md`) as the session handoff artefact: current task, status, next-task pointer, dated assumptions, blockers — kept out of `CLAUDE.md` to protect its size budget.
- Session start: read the progress file and context files, pick exactly one task, confirm scope before editing. Session end: run the full check suite, update the progress file, commit, stop.
- Fresh session whenever a task is committed and done, or on repeated/contradictory behaviour.
- Automated tests must pass before a task is done; prefer test-first.
- Never a single AI self-review; a second session, another model, or a human reviews.
- Lightweight in-repo issue register with severity and the task that found the issue; escalate blockers to GitHub Issues only if needed.
- Acceptance criteria as executable checks wherever possible.
- Budget assuming agent ETAs are optimistic (METR RCT).
- Two lanes: `claude --worktree <lane>` per lane with `.worktreeinclude` for env files; merge to the integration branch at least daily; keep lane tasks file-disjoint.
- Cross-model review for security- or correctness-critical work (Codex `review_model`, Claude subagent on another model).

## Not verified

- No vendor-published numeric re-work or validation-failure rate.
- No official guidance on file-based issue registers vs GitHub Issues.
- No official guidance on preventing semantic merge conflicts between parallel worktrees.
- METR's 8 h+ task-duration figures rest mostly on estimated human baselines.
