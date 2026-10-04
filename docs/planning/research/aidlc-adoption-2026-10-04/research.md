# AWS AI-DLC adoption — research (2026-10-04)

**Question:** What is AWS AI-DLC, which version to install, how it installs on Windows for Claude
Code and Codex, and what it changes in this repo.
**Method:** GitHub repository, release pages, `docs/guide/` and the 2.10.0 source of
`awslabs/aidlc-workflows`, read on 2026-10-04.
**Result:** AI-DLC 2.10.0 installed and pinned; migration deferred to
`docs/aidlc-migration/README.md`.

## 1. What AI-DLC is

- AWS's AI-Driven Development Life Cycle: AI plans, asks clarifying questions and implements;
  humans approve at gates. Agile terms are replaced: epics → **units of work**, sprints →
  **bolts** (hours/days); rituals are **Mob Elaboration** (Inception) and **Mob Construction**.
  https://aws.amazon.com/blogs/devops/ai-driven-development-life-cycle/
- The `aidlc-workflows` engine: 5 phases, 33 stages, 14 agents (11 domain experts, 2 reviewers,
  1 composer), 11 scopes (enterprise, feature, mvp, poc, bugfix, refactor, infra, security-patch,
  classic, workshop, express), approval gates, and a committed audit trail.
  https://github.com/awslabs/aidlc-workflows
- Phases and stages: 0 Initialization (0.1–0.3), 1 Ideation (1.1 Intent Capture … 1.7 Approval &
  Handoff), 2 Inception (2.1 Reverse Engineering — brownfield only, 2.2 Practices Discovery,
  2.3 Requirements, 2.4 User Stories, 2.5 Refined Mockups, 2.6 Domain Design, 2.7 Units
  Generation, 2.8 Contract Design, 2.9 Delivery Planning), 3 Construction (per unit: functional
  design, NFR requirements/design, infrastructure design, code generation; then 3.6 Build and
  Test, 3.7 CI), 4 Operation (4.1–4.7). `docs/guide/04-phases-and-stages.md`
- Work lives in an *intent*: `aidlc/spaces/default/intents/<date>-<label>/` with
  `aidlc-state.md`, `audit/` (per-clone shards) and per-stage artifacts. Existing documents go into
  `aidlc/spaces/default/knowledge/documents/`; there is no importer for other methods.
  `docs/guide/03-spaces-and-intents.md`

## 2. Version

- 2.10.0 is the release marked Latest (2026-09-24). Releases after it are
  `2.10.1-preview.*` pre-releases (latest 2026-10-03). 2.10.0 notes: construction checkpoints,
  human-approval guards, coexisting harnesses with a shared `AGENTS.md` block, Windows
  drive-letter fixes; no known issues listed.
  https://github.com/awslabs/aidlc-workflows/releases/tag/v2.10.0

## 3. Install (Windows)

- Machine: `install.ps1` puts versions in `%LOCALAPPDATA%\aidlc\versions\`, a shim at
  `%LOCALAPPDATA%\aidlc\bin\aidlc.cmd`, and adds that directory to the user PATH. It does not
  prompt (only warns when run as administrator), verifies SHA-256 checksums and, when `gh` is
  available, GitHub attestations. Bun/Node are not required.
  ```powershell
  irm https://github.com/awslabs/aidlc-workflows/releases/download/v2.10.0/install.ps1 -OutFile install.ps1
  ./install.ps1 -Version 2.10.0
  ```
- Project: `aidlc config --harness claude --yes`, `aidlc config --harness codex --yes`, then
  `aidlc config --pin 2.10.0` (writes `.aidlc-version`, commit it) and `aidlc doctor`. With more
  than one harness configured, every `aidlc config` call must name `--harness`.
  `docs/guide/18-install-and-lifecycle.md`
- Uninstall: `aidlc uninstall` (installer-owned files only; `--purge` also removes machine config).

## 4. What it writes into this repo

| Path | Notes |
|---|---|
| `.claude/` | `agents/aidlc-*` (14), `skills/aidlc*`, `tools/`, `hooks/`, `sensors/`, `scopes/`, `knowledge/`, `rules/aidlc.md`, `CLAUDE.md` onboarding, `settings.json`. All names are `aidlc`-prefixed — no collision with the existing `bmad-*`, grill-me or impeccable files |
| `.claude/settings.json` | hooks on PreToolUse / PostToolUse / UserPromptSubmit / SessionStart / SessionEnd, a status line, allow rules for Read/Edit/Write/Glob/Grep/Task/WebSearch, `AWS_AIDLC_DEFAULT_SCOPE=classic` |
| `.codex/config.toml`, `.codex/onboarding.md` | Codex onboarding via `developer_instructions` when the project is trusted |
| `AGENTS.md` | managed block between `BEGIN/END AI-DLC` markers, appended; existing content kept |
| `.gitignore` | managed block (generic entries plus AI-DLC runtime state) |
| `.mcp.json` | `context7` plus four AWS servers (`aws-mcp`, `aws-pricing`, `aws-iac`, `aws-serverless`) |
| `aidlc/` | workspace: spaces, intents, memory (the method), knowledge |

## 5. Behaviour that matters here

- **Hooks are fail-open outside AI-DLC work.** `aidlc-plan-approval-guard.ts` blocks only while a
  code-generation stage is active; a missing state file or another stage allows the call. Off
  switch: `AIDLC_DISABLE_PLAN_APPROVAL_GUARD=1` (audited).
- **Tool identity in commits.** `core/tools/aidlc-unit.ts` `createClaimCommit` sets
  `GIT_AUTHOR_NAME/GIT_COMMITTER_NAME = "AI-DLC Unit Claims"`, email `aidlc-unit@local`, and pushes
  the claim ref with `--force-with-lease` when a remote is used. Conflicts with `AGENTS.md`.
  Product commits are not affected; no `Co-Authored-By` trailer appears in the source.
- **Harness coverage.** Claude Code, Kiro CLI/IDE, Codex CLI (≥ 0.145.0), Cursor, opencode,
  GitHub Copilot. Puku CLI is not supported. Copilot cannot coexist with Codex/Cursor (exclusive
  `AGENTS.md` block); Claude coexists with any.
- **Install findings (2026-10-04, this repo).** Six 2.10.0 problems hit during the install — the
  ownership manifest claiming project files after `aidlc config project`, the missing Git Bash
  launcher (#1545), the PATH not being written, the `AGENTS.md` legacy-content refusal, the
  `display_name` requirement on foreign agents, and the duplicate Codex skills on refresh. Details
  and workarounds: `docs/aidlc-migration/README.md` §1.
- **Model.** The upstream README recommends a strong reasoning model; it does not change the
  provider already configured in Claude Code or Codex.
