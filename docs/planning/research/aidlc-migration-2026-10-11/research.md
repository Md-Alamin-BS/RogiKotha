# AI-DLC 2.10.0 -> 2.11.0 migration runbook: verification against primary sources

Date: 2026-10-11. Repo checked read-only: `rogikotha` @ `7a29b5b` (main, clean).
Nothing in the repo was edited; no `aidlc config`, `aidlc update` or `/aidlc` command was run.

## Sources actually fetched

- Release `v2.11.0` notes: `gh release view v2.11.0 -R awslabs/aidlc-workflows` (published 2026-10-08, tag object 4079edb).
- Upstream files at `ref=v2.11.0` via `gh api repos/awslabs/aidlc-workflows/contents/...`:
  - `docs/guide/02-your-first-workflow.md`, `03-spaces-and-intents.md`, `04-phases-and-stages.md`,
    `05-scopes-and-depth.md`, `08-knowledge.md`, `09-rules-and-the-learning-loop.md`,
    `12-cli-commands.md`, `15-troubleshooting.md`, `16-worked-examples.md`,
    `18-install-and-lifecycle.md`, `harnesses/codex-cli.md`, `onboarding.md`, `workflow-profiles.md`
  - `core/aidlc-common/stages/inception/{requirements-analysis,user-stories,domain-design,practices-discovery,reverse-engineering,units-generation,delivery-planning}.md`, `core/aidlc-common/stages/construction/code-generation.md`
  - `core/scopes/aidlc-classic.md`, `harness/codex/manifest.ts` (also at v2.10.0)
  - `core/tools/aidlc-knowledge.ts`, `aidlc-unit.ts`, `aidlc-lib.ts`, `aidlc-swarm.ts`, `aidlc-worktree.ts`, `aidlc-utility.ts`, `scripts/install.ps1`
- Issues/PRs via `gh api`: #1526, #1543, #1544, #1545, #1589, #1666, #1727, #1788, #1856, #2131 (+ compare against tag), open issues list (200 most recent open), and bodies of #1187, #1220, #1273, #1278, #1407, #1547, #1551, #1575, #1596, #1631, #1639, #1642, #1855, #1952, #2197, #2244, #2246, #2263, #2282.
- Local read-only: `aidlc --version` (2.10.0), `aidlc --help`, `aidlc engine --help`, `%LOCALAPPDATA%\aidlc\bin\*`, `pins.json`, both `aidlc-manifest.json` files, `.claude/aidlc-common/**`, `.mcp.json`, `AGENTS.md`, `.gitignore`, `.env` (key names only).

Notation: `guide/NN` = `docs/guide/NN-*.md @ v2.11.0`; `stage/X` = `core/aidlc-common/stages/*/X.md @ v2.11.0`.

---

## 1. Upgrade 2.10.0 -> 2.11.0 on Windows, two harnesses (claude + codex)

### 1.1 Official upgrade commands

Release notes, "Upgrade" section:
```
aidlc update
cd /path/to/project
aidlc config --yes
aidlc doctor
```
"When a project contains multiple harnesses, run `aidlc config --harness <name> --yes` for each harness you want to refresh." The bare `aidlc config --yes` does NOT apply to us: guide/18 "Configure or Refresh a Project": "When more than one harness is present, every `aidlc config` invocation must include `--harness <name>`, including previews and refreshes."

### 1.2 The pin must be moved: YES

- This project is pinned: `.aidlc-version` = `2.10.0`, machine `pins.json` = `{"...\\rogikotha": "2.10.0"}` (local read).
- guide/18 "Release Channels": "Project pins keep overriding the machine channel ... a pinned project dispatches to that exact retained version whatever the machine follows." guide/18 "Update and Version Selection": "A successful update retains the prior active version and every registered project pin." So `aidlc update` alone leaves this project on 2.10.0.
- `aidlc config --pin <version>`: "Install and validate the exact version when needed, then atomically write `.aidlc-version` ... without changing the machine-active pointer" (guide/18 table). "A pin switches the engine that serves the project at once, but the project's own files stay at the version they were last refreshed to until the next `aidlc config` ... the reply ends with 'Run `aidlc config` to finish updating this project.'" (guide/18 "Project Pins and CI").
- So: `aidlc config --pin 2.11.0 --yes`, then refresh each harness. Commit only `.aidlc-version` from the pin step (guide/18 "Commit only `.aidlc-version`").
- Rollback line printed by a refresh from another release: "`aidlc config --pin 2.9.0 --yes` (this pins the version for everyone on the project ...)" (guide/18 "Refresh Safety") — i.e. `aidlc config --pin 2.10.0 --yes` then refresh, to go back.

### 1.3 `--dry-run` in 2.11.0 and how removals are reported

- Exists: Config Options table, guide/18: "`--dry-run` | Calculate the complete plan without creating the target directory or changing bytes"; "`--plan-token <token>` | Apply only the exact plan approved from a JSON dry run"; `--json` emits "counts, actions, `data.notes`, and `data.planToken`".
- Removals (guide/18 "Refresh Safety"; PR #1727, merged into v2.11.0): "An unchanged framework file the new release no longer ships is removed, and config names each one: the refresh prints `Removed N files that are no longer part of AI-DLC <version>:` and the list, and `--dry-run` prints the same list as `Will remove`. ... In JSON these actions carry `detail: "no longer shipped"`." Every path gets one action `create|update|merge|preserve|remove|conflict` (guide/18 action table).
- PR #1526 dry run reports a project skill as `preserve / project-owned` (PR #1526 body, "Changes"/tests).
- Dry run works while a workflow is open: PR #1238 (in v2.11.0 notes).
- Note: dry-running against 2.11.0 files requires the pin (or `--from`) first, because the pinned project dispatches to 2.10.0 (see 1.2). Running the pin first then the dry run is the ordering consistent with guide/18; whether `--dry-run --from <2.11.0 runtime>` works without pinning: **unverified**.

### 1.4 Hand-made extensionless forwarder `%LOCALAPPDATA%\aidlc\bin\aidlc`

- Current local file (read): a `#!/bin/sh` forwarder `exec "$(dirname "$0")/aidlc.cmd" "$@"` dated 2026-10-04.
- 2.11.0 ships its own: release notes "Git Bash finds `aidlc` through a new `bin\aidlc` launcher"; PR #1543 "install extensionless bin/aidlc forwarder for Windows Git Bash" (merge commit is an ancestor of v2.11.0: compare `1b91786...v2.11.0` = ahead 310 / behind 0). Issue #1545 closed 2026-10-04.
- What happens to ours — guide/15 troubleshooting table, Git Bash row: "If a file named `aidlc` that AI-DLC did not write (for example an earlier hand-made forwarder) is already in that bin directory, the installer, `aidlc update` and `aidlc use` ask once at a terminal whether to replace it, and keep your file as `aidlc.bak-<time>` beside it. `--yes` (`-Yes` for the installer) answers yes. Without a terminal or `--yes`, they leave the file as it is and say to move it aside." Same in guide/18 "Output, Automation, and Exit Codes" ("`--yes` never bypasses ownership ... with one exception on Windows: an `aidlc` in the bin directory that AI-DLC did not write ...").
- `aidlc doctor` shows a `Windows launcher (Git Bash)` row (guide/15) and a `Windows launcher` row while an old 2.10.0 helper is in place (PR #1666 body). PR #1666: "After `aidlc update` from 2.10.0 on Windows, the next command is meant to replace the old launcher helper"; 8.3-short-path case fixed.
- Whether `aidlc config --pin` (which also installs a release) performs the launcher replacement: **unverified** (docs name only installer/update/use). Run `aidlc update` first, interactively.
- Recommendation: run `aidlc update` from PowerShell 7 (not from Git Bash through the forwarder that is being replaced — precautionary, not documented).

### 1.5 Does the refresh repair the hand-edited manifest? YES (with nuance)

- Issue #1589 (closed 2026-10-09) maintainer comment: "Fixed by #1526, which is in v2.11.0 ... A manifest written by an earlier version that already lists such files is repaired on the next refresh: the files are kept and dropped from the ownership record." PR #1526 merge commit is an ancestor of v2.11.0 (compare: ahead 369 / behind 0).
- Mechanism (PR #1526 "Scope note"): a fixed refresh writes `"shippedOnly": true`; a manifest without the mark has any recorded, not-shipped path under overlay-candidate dirs staged as project overlay, kept, reported `preserve / project-owned`, and dropped from the record.
- Our state: both manifests have no `shippedOnly` key and, after the hand edit, list zero non-`aidlc*` paths under `.claude/skills/`, `.claude/agents/`, `.agents/skills/` (local check). So the hand edit already removed the bad entries; the first 2.11.0 refresh will mark `shippedOnly` and leave the 415 project files unowned. Expected `remove` actions in the dry run should be limited to retired AI-DLC files.

### 1.6 What the refresh touches

| Surface | 2.11.0 behaviour | Source |
|---|---|---|
| `AGENTS.md` | "One marked block; ... preserve project instructions". Ambiguous *unmarked* AI-DLC content still refused ("legacy root integration ambiguous"). Our block exists (`<!-- BEGIN AI-DLC:agents -->` lines 93-153); Codex manifest owns it (`rootContributions.AGENTS.md` managed-block). Copy archive also omits `AGENTS.md` (PR #1757). | guide/18 "Root Integrations and Ownership"; guide/15 row "legacy root integration ambiguous"; release notes |
| `.mcp.json` | Claude: "Add or remove only consented, baseline-owned entries; preserve user keys and overrides". Our Claude manifest records `.mcp.json` json-map with `entries: {}` and `mcpMode: none` -> `context7` is user-owned and kept. | guide/18 table; local manifest |
| `.gitignore` | One marked block; "preserve every byte outside it". Older releases' generic template lines (logs, node_modules, dist ...) inside the block are moved into the user's part on first refresh "and says so once". | guide/18 |
| `.claude/settings.json` | project-owned; AI-DLC hook groups restored, user hook groups appended, shipped allow entries first, user allow/deny/ask kept; AI-DLC statusLine refreshed, custom one kept. | guide/18 "Refresh Safety"; PR #1300 |
| `.codex/config.toml` | Only AI-DLC keys changed, every other byte kept. | guide/18; PR #1999 |
| bmad-*/impeccable-*/grill-* skills | Not recorded as framework-owned, preserved (`preserve / project-owned`). | PR #1526; #1589 comment |
| non-aidlc agents in `.claude/agents/` | "leave the host's own agents in the harness agents dir alone" | PR #1544 |
| host tool files (`node_modules/`, `package.json`, nested `.gitignore`) in managed dirs | never copied/owned/removed | PR #1788; guide/18 "Refresh preserves" |
| `aidlc/` workspace, memory, knowledge | preserved; memory files are project-owned seeds | guide/18 "Refresh preserves" |
| `.claude/CLAUDE.md` | framework-owned (listed in our Claude manifest); local edits would `conflict` (needs `--force`). Ours appears to be the shipped template — fine. | local manifest; guide/18 "Locally modified framework-owned files conflict" |

### 1.7 Codex specifics

- Skills location: `harness/codex/manifest.ts` @ v2.11.0 (and @ v2.10.0) lines 11-13: "skills are NOT shipped in .codex/skills/ — Codex discovers skills at <project>/.agents/skills/". Local Codex manifest records 84 files under `.agents/skills/` (all `aidlc*`) and none under `.codex/skills/`. **This contradicts `docs/aidlc-migration/README.md` §1 item 6** ("A Codex refresh ... would also add a second copy of the 37 `aidlc-*` skills under `.codex/skills/`"). Confirm with `aidlc config --harness codex --dry-run --json` before trusting either.
- After refresh, re-trust hooks in Codex: guide/18 "Codex's own hook trust ... its line names the step in Codex instead (type `/hooks`, press `t` to trust all, then press Esc)"; `harnesses/codex-cli.md` line ~166 "Re-run this trust command whenever an AI-DLC upgrade changes `.codex/hooks.json`". PR #2005/#1827 in 2.11.0.
- PR #2000 "Codex reads its own install in a project shared with another tool" (2.11.0) — relevant to our Claude+Codex project.

### 1.8 2.11.0 behaviour changes that affect us

- Guard Policy default `off` on every scope except `enterprise` (release notes "Leaner defaults"; PR #1531; `core/scopes/aidlc-classic.md` `guard_policy: off`). "Team memory that requires strict Guard Policy still takes precedence" (release notes). Our `org.md`/`team.md` `## Guard Policy` sections are empty.
- Collaborators off outside `enterprise`: "each stage runs with its lead agent only; `/aidlc --collaborators on` brings the support agents back" (release notes; classic `collaborators: off`). Affects Practices Discovery hub-and-spoke and User Stories mob, and ADR 0012-style independent validation (reviewers still run: classic `review_cap: advisory`).
- Plan Approval: engine-asked; `/aidlc --plan-approval on|off`, "only the person can turn it off"; classic `plan_approval: on`; express/poc off (release notes; PR #1490, #1494).
- Guard off still keeps human presence: classic scope text "Human presence stays up"; guide/04 "A gate that is put to you needs a real message from you to approve it."
- Composed plans no longer write a scope file automatically (release notes "Script compatibility").
- Code Generation no longer runs lint/type-check sensors after every file (release notes).
- `/aidlc --project-type <greenfield|brownfield>` new (release notes; guide/12).
- Persona classification: `aidlcAgentClaim` treats any `.claude/agents/*.md` carrying `display_name:`, `examples:`, `tier:` or `plugin:` as an AI-DLC persona (`core/tools/aidlc-lib.ts` @ v2.11.0 ~L35505; PR #1544). Our 4 `impeccable-*` agents carry the hand-added `display_name` (README §1 item 5), so under 2.11.0 they will be loaded as AI-DLC personas rather than skipped as host agents. They pass the schema (name + display_name present) and the doctor name check (stem == name), so nothing breaks, but the workaround is no longer needed; removing `display_name` would make them host agents again (inference from source; impact otherwise **unverified**).

---

## 2. Knowledge onboarding (DocumentKB)

- Originals MUST be under `aidlc/spaces/<space>/knowledge/documents/` for `onboard`. `core/tools/aidlc-knowledge.ts` @ v2.11.0 `onboard()` (~L1454-1478): a path whose realpath is not under `documents/` throws "`<path>` is outside `<documents>`. Copy it under documents/ first, then re-run." Same text in installed 2.10.0 `.claude/tools/aidlc-knowledge.ts:1488`. Symlinks are skipped / refused (`walkDocuments` comment ~L225-237; ~L803 "requires the explicit "linked" source kind, never a symlink"); hard links refused (~L1372).
- A `linked` source kind exists for corpora OUTSIDE the repo (alias in gitignored `knowledge/.sources.local.json`, ~L867-940), but no CLI verb creates linked rows in 2.11.0 (only `kind: "managed"` is ever written: ~L1312, ~L4070; flag parser accepts only `--space --intent --json --allow-inactive --to --text-file --source-revision --tags`). So: no indexing in place of `docs/architecture/decisions/*.md`; copies are required (duplicates committed to git).
- Command syntax: CLI is `aidlc engine knowledge onboard [path]` (local `aidlc engine --help`: "knowledge: onboard [path], sync, list, show <id>, associate <id> --intent [slug], dissociate ..., rebind <id> --to <path>, summarize <id> --text-file <path> --source-revision <sha256>"); `aidlc knowledge ...` is NOT a top-level command in 2.10.0 ("error: unknown command 'knowledge'"). In chat: `/aidlc knowledge onboard [path]` (guide/12 "`/aidlc knowledge <verb>`"), or the `aidlc-knowledge` skill. Batch caps: 20 documents / 256 MiB per pathless onboard or sync; 32 MiB per file (guide/12).
- `.docx`: detected (`WORD_DOCX_MIME`, aidlc-knowledge.ts ~L309) but "a Word (`.docx`) file has no built-in default — with none configured it is catalogued and citable as `unsupported_type`" (guide/12). Only PDF has a default extractor (`pdftotext`, capped at 50 pages). Same in 2.10.0. Extractors are configured as `documentExtractors` (object keyed by MIME, `argv` array with exactly one `$IN`) in the harness's `tools/data/harness.json` (`aidlc-lib.ts` @ v2.11.0 ~L456-500; guide/12). Caveat in source (`extractorArgvFor`, ~L570): once any extractor is configured, a type it omits gets none — so configuring a docx extractor must also re-declare PDF. Locally `pdftotext` exists (`/mingw64/bin/pdftotext`), `pandoc` does not.
- 2.11.0 new: naming a PDF/Word file in the request copies it into `knowledge/documents/`, onboards it and reads it (guide/02 "Starting from an existing document"; `stage/requirements-analysis` Step 1 `document-input --onboard`; PR #1720). With no docx extractor the workflow "says why and asks you for a text or Markdown version".
- Catalog consumption: no stage reads the catalog wholesale. Only Intent Capture / Requirements Analysis read the one user-named document via `document-input` and may cite `/aidlc knowledge show <id>` (`stage/requirements-analysis` Step 1; installed `intent-capture.md:77`). The reliably-loaded channel for standing context is Tier 2 team knowledge: `aidlc/spaces/<space>/knowledge/aidlc-shared/*.md` (all agents) and `knowledge/<agent-slug>/*.md` (guide/08 "Tier 2"), loaded right after the persona since PR #1856 (in v2.11.0). Files must be `.md` and the folder name must match the agent slug exactly (guide/08 "Verifying Knowledge Is Loaded", "Where the directories come from").

## 3. Brownfield start and reusing existing planning

### 3.1 `--project-type brownfield` and Reverse Engineering

- guide/12 "`/aidlc --project-type <type>`": at the start "the type you give replaces the scan's verdict"; mid-workflow runs `aidlc engine workspace reclassify`, "puts back the Reverse Engineering ...", logs `WORKSPACE_RECLASSIFIED`. Holds for that piece of work only. Our repo has `apps/`, `packages/`, `package.json` so the scan should say brownfield anyway (guide/02 "Stage 0.2").
- RE (guide/04 Phase 2 table and "Key behavior"; `stage/reverse-engineering`): CONDITIONAL on brownfield; two-link pipeline (developer scan, architect synthesis) writing 9 artifacts to `aidlc/spaces/<space>/codekb/<repo>/`; reuse offered only when a CURRENT store exists. RE currently reads all code and only rates repo docs — RFC #1642 (open) proposes reading README/docs/ADRs first; reported "close to 3 hours for a simple project". Expect a long RE run.
- PR #1756 (2.11.0): "existing code brings back the Reverse Engineering a composed plan left out" — skipping RE on brownfield is resisted.

### 3.2 Can existing requirements/stories/ADRs be reused instead of regenerated?

- Hard dependencies (frontmatter `consumes ... required: true`, v2.11.0): `code-generation` needs `requirements` + `unit-of-work`; `delivery-planning` needs `requirements`, `components`, `unit-of-work`, `unit-of-work-dependency`; `units-generation` needs `components` + `requirements`; `domain-design`, `user-stories` need `requirements`. `recompose` "rejects flips that would starve a remaining stage of a required input" (guide/12 "`aidlc-utility recompose`"). => Requirements Analysis, Domain Design, Units Generation, Delivery Planning cannot be skipped if Construction is to run. Optional (`required: false`) everywhere: `stories`, `mockups`, `contract-summary`, `functional-spec`, NFR/infra design outputs.
- What exists for reuse: (a) name one existing document in the start request -> RA reads it via `document-input` (guide/02; `stage/requirements-analysis` Step 1); (b) Tier 2 knowledge folders (2 above); (c) DocumentKB copies + `knowledge show <id>`; (d) the stage-protocol "Artifact Re-use" Keep/Modify/Redo question fires "When a stage detects existing output artifacts in its artifact directory" (installed `.claude/aidlc-common/protocols/stage-protocol.md` ~L1090-1115) — documented for backward jump/redo; pre-placing hand-written artifacts in a fresh record to trigger it is **unverified / not documented** and may collide with write-provenance guards.
- Stage skipping: at creation `next --scope <scope> --skip <slug,...> --add <slug,...> -- "<description>"`; mid-run `/aidlc --skip <slug,...>` / `--add` apply at once via `recompose` (guide/12 "Creating a workflow with its own stage changes"); `/aidlc compose` proposes an EXECUTE/SKIP grid at a gate (guide/12 "`/aidlc compose`"; guide/05 "The Adaptive Composer"). Initialization stages cannot be skipped.
- Known bug if User Stories is skipped while Units exist: #2282 (open, 2026-10-10) — per-Unit Code Generation traceability sensor checks ALL intent FR/NFR IDs.

### 3.3 Recommended scope and grid

Base: `classic` (`core/scopes/aidlc-classic.md` @ v2.11.0: depth Standard, skeleton off, review_cap advisory, guard_policy off, sensors on, learnings on, summary_confirmation off, plan_approval on, collaborators off). Classic already SKIPs all Ideation and Operation and CI Pipeline (guide/05 matrix: 18 stages). Recommended per-work changes:

| # | Stage | Decision | Why |
|---|---|---|---|
| 0.1-0.3 | Initialization | EXECUTE (automatic) | cannot skip |
| 1.x | Ideation (all) | SKIP (classic already) | PRD/BRD/scope exist |
| 2.1 | Reverse Engineering | EXECUTE | brownfield; ~10 tasks of code exist; PR #1756 re-adds it anyway |
| 2.2 | Practices Discovery | EXECUTE | only sanctioned writer of `team.md`/`project.md` (section 4) |
| 2.3 | Requirements Analysis | EXECUTE, `--depth minimal`, name `docs/planning/01-requirement-baseline.md` in the request | required by DD/UG/DP/CG |
| 2.4 | User Stories | EXECUTE (transcribe `08-product-backlog.md`) — SKIP only if accepting #2282 | optional input but #2282 |
| 2.5 | Refined Mockups | SKIP | design/prototype exist; `mockups` optional |
| 2.6 | Domain Design | EXECUTE (transcribe ADRs 0001-0013, ARCHITECTURE-SPINE) | `components` required |
| 2.7 | Units Generation | EXECUTE (group the ~37 remaining tasks into Units; DAG from master plan) | required |
| 2.8 | Contract Design | EXECUTE light or SKIP | `contract-summary` optional; 02/03 docs exist |
| 2.9 | Delivery Planning | EXECUTE | required; records the Construction Verification Command and Unit Ownership |
| 3.1 | Functional Design | EXECUTE (light) or SKIP | optional for CG; per-unit cost |
| 3.2 | NFR Requirements | SKIP (12 NFR already in RA) | optional |
| 3.3 | NFR Design | SKIP | optional |
| 3.4 | Infrastructure Design | SKIP | docker compose only, no cloud |
| 3.5 | Code Generation | EXECUTE | the work |
| 3.6 | Build and Test | EXECUTE | coverage floor 80% for classic (org.md "Testing Posture") |
| 3.7, 4.x | CI / Operation | SKIP (classic already) | |

Exact start command (syntax per guide/12; combination of all flags in one chat line is **unverified**): `/aidlc --project-type brownfield --scope classic --depth minimal --skip refined-mockups,nfr-requirements,nfr-design,infrastructure-design "<description naming docs/planning/01-requirement-baseline.md>"`. Alternative: `/aidlc compose "<same task>"` and edit the grid at the gate. The engine validates the grid (`validate-grid`, guide/12) — a refused flip names alternatives.

## 4. Practices Discovery and memory files

- Writes memory: `stage/practices-discovery` "outputs: ... On affirmation, content is promoted to aidlc/spaces/<active-space>/memory/team.md and project.md"; Step 7 runs `aidlc engine state practices-promote` which "replaces the five matching sections in `team.md`" and "appends stamped hard constraints under `project.md`'s `## Mandated` and `## Forbidden`". guide/04 Phase 2 table row 2.2 says the same.
- Feeding existing conventions: brownfield lead "inspect[s] git history, CI/deployment configuration, and the available reverse-engineering artifact paths"; re-run reads existing `team.md` as baseline (`stage/practices-discovery` Step 2). There is no input slot for a conventions doc. Practical channel: put a copy of `docs/implementation/01-conventions.md` under `aidlc/spaces/default/knowledge/aidlc-shared/` (or `knowledge/aidlc-pipeline-deploy-agent/`) — loaded after the persona (PR #1856). That the lead then uses it for the draft is expected but **unverified**.
- Editing directly: for the human, allowed — guide/09 L11 "a single hand-editable set at the workspace root", L27 "you can edit them by hand". For agents, not: `stage/practices-discovery` Step 7 "The orchestrator does not edit active-space memory directly"; installed `team.md` header "Edit at the gate, not directly"; `org.md` Mandated "NEVER edit a memory file directly to record a switch". Caveat: a later Practices Discovery promotion replaces the five team.md sections, so hand edits there are overwritten (offered back as the re-run baseline).

## 5. Unit ownership and claim commits

- `solo` is the default: `stage/delivery-planning` "Construction staffing": "For the one-session choice, leave the field absent (the byte-identical default) or record `set-unit-ownership solo`"; team requires an explicit `set-unit-ownership team`. guide/04: "Unit-major (the default for new solo work ...)".
- Solo never creates `AI-DLC Unit Claims` commits: in `core/tools/aidlc-unit.ts` @ v2.11.0 `createClaimCommit` (L414-430 sets `GIT_AUTHOR_NAME: "AI-DLC Unit Claims"`, `aidlc-unit@local`) is called only from `publishUnit` (requires a live team claim, L1674-1675), `claimUnit` and `releaseUnit`, both gated by `if (!isTeamUnitOwnership(state)) fail(...)` (L3351, L3476). Verified from source.
- PR #2131 is NOT in v2.11.0: merged to `main` 2026-10-08T02:06Z, merge commit `f96ad17`; `compare f96ad17...v2.11.0` = **diverged** (v2.11.0 ahead 3, behind 41); the three tag-only commits are release prep (#2103 CI fix, "prepare v2.11.0 from the tested preview", a test timeout). The v2.11.0 source still hard-codes the identity (L426-429). Expect the fix in the next release after 2.11.0.

## 6. Open upstream bugs likely to bite on 2.11.0 (Windows, Git Bash, pnpm/vitest/Next)

| Issue | Status | Impact here | Workaround |
|---|---|---|---|
| #2244 Code Generation refused: "unclaimed source changes" | open (2026-10-09) | Source walk hard-excludes only `.cache .git .gradle .mypy_cache .next .nuxt .pytest_cache .ruff_cache .tox .venv .vs __pycache__ node_modules venv` and conditionally `build coverage dist logs target tmp` (`aidlc-lib.ts` @ v2.11.0 ~L20131-20146, ~L20340). Not excluded: our gitignored `.vitest/`, `.data/`, `*.tsbuildinfo`, Playwright `test-results/`. Source comment says ignored source candidates are force-added (~L21062), and #1952 (ignore patterns) is still open — so `.gitignore` is likely not an escape (**inference**). Reporter "Turned off Guards" and was still stuck. | Keep caches inside `node_modules/` or a hard-excluded name (e.g. vitest `cacheDir` under `node_modules/.vite`), delete stray caches before approving Code Generation, or follow the refusal text (claim the path in the unit's `source-manifest.json` + one recovery review). |
| #1952 ignore patterns for fingerprinting | open feature | same root cause | none shipped |
| #2282 per-Unit traceability checks all FR/NFR when User Stories skipped | open | if 2.4 is skipped | run User Stories, or `--sensors off` |
| #2197 Plan Approval at every Unit even when autonomous | open feature | many Units -> one stop each | `/aidlc --plan-approval off` (person only) |
| #2263 first turn in new Claude Code project says hooks are off and asks to write `settings.local.json` | open, found on v2.11.0 | false positive on first turn | decline the write; `next` proceeds |
| #1631 Windows: concurrent Claude Code sessions share one intent | open (2.10.0 analysis; launcher chain) | two chats in one checkout | one AI-DLC session per checkout at a time (fix in 2.11.0 **unverified**) |
| #1575 no hook fires on GUI-launched Windows Claude Code (PATH) | open | if Claude Code is started from a GUI, not a terminal | start Claude Code from a terminal with `%LOCALAPPDATA%\aidlc\bin` on PATH |
| #1548 human-turn hook never fires in desktop Code tab / VS Code extension | open | gates refuse without HUMAN_TURN | use the CLI |
| #1278 Bun binary auto-loads cwd `.env` into every subprocess | open | our `.env` has `DATABASE_URL*`, `APP_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, SMTP etc. -> injected into sensors/git/hooks children | accept, or keep secrets out of root `.env` |
| #1551 solo per-unit construction deadlock (2.10.0) | open | possible on Functional Design | fix in 2.11.0 **unverified** |
| #1547 unit start refused on large brownfield (~30 s routing cutoff) | open | 49k-file repos; ours much smaller | — |
| #1596 per-Unit review bound to whole workspace; one rejection resets all Units | open | stage-major/swarm, also seen solo unit-major on Windows | build Units one at a time |
| #2246, #1274 swarm/parallel Unit issues | open | only if `Construction Execution: swarm` | stay `serial` (default) |
| #1639 guards read PowerShell commands with POSIX parser | open | PowerShell writes not seen by guards | prefer Git Bash for agent shell |
| #1855 project-only `aidlc engine hook` exits 1 on native builds since #1424 (in 2.11.0) | open | only if we add our own aidlc-style hook | none needed now |
| #1407 AI-DLC overrides statusline (Claude, Codex) | open | cosmetic | custom statusLine is kept on refresh (guide/18) |
| #1220 config EEXIST with non-ASCII subdirectory names (Windows) | open | checked: 0 non-ASCII tracked paths | — |

Fixed in 2.11.0 and relevant: #1545 Git Bash launcher (PR #1543), #1589 manifest claims (PR #1526), Bolt worktree MAX_PATH (PR #1399), submodule worktrees (PR #1483), `.vs` cache exclusion (PR #1574), CRLF clones not conflicting (PR #2070), PowerShell `aidlc.cmd` arguments (PR #1474), BOM in settings (PR #1851), Windows document identity (PR #1703).

## 7. Conflicts with "no tool/model identity in commits, files, PRs" (AGENTS.md)

1. Team-mode claim commits authored/committed as `AI-DLC Unit Claims <aidlc-unit@local>` and pushed to the remote claim ref (`aidlc-unit.ts` @ v2.11.0 L426-429, push at ~L473). Avoided by staying `solo` (section 5). Fixed upstream only after 2.11.0 (PR #2131).
2. Swarm (parallel Units): reviewed-source snapshot commits authored `AI-DLC <aidlc@localhost>` stored under local `refs/aidlc/reviewed-source/...` (`aidlc-swarm.ts` @ v2.11.0 ~L1622-1629, ~L1760-1770; `aidlc-lib.ts` ~L19945). Not on branches and not pushed by the tool (no `push` in swarm/worktree source), but a `git push --mirror` or `refs/*` push would publish them. Avoid swarm.
3. Worktree park snapshots authored `AI-DLC <aidlc@localhost>` under `refs/aidlc/parked/...` (`aidlc-worktree.ts` @ v2.11.0 ~L3300-3306). Local refs only.
4. Bolt worktree squash-merge commit uses the user's own identity with message `Bolt <slug>` (no trailer) but runs `git commit --no-verify` (`aidlc-worktree.ts` ~L2607, ~L2853): repo commit-msg hooks are bypassed, so a hook-based trailer guard would not run. Only on worktree/Bolt merge paths.
5. Installed 2.10.0 equivalents: `.claude/tools/aidlc-unit.ts:425-428`, `aidlc-swarm.ts:1539-1542`, `aidlc-worktree.ts:3046-3049` (local grep).
6. No `Co-Authored-By` / "Generated with" text found in the installed framework (`.claude/aidlc-common`, skills, agents, knowledge, tools, hooks, scopes, sensors, `.codex`, `.agents/skills/aidlc*`) — local grep.
7. The managed `AGENTS.md` / `.claude/CLAUDE.md` blocks and the Claude statusline name "AI-DLC" (the framework), not an agent/model; treat as framework documentation, not self-attribution (judgement call for the owner).

## 8. Contradictions with the stated assumptions / README

- README §1 item 6 (Codex refresh duplicates skills into `.codex/skills/`): contradicted by `harness/codex/manifest.ts` @ v2.10.0 and v2.11.0 and by our Codex manifest. Verify with dry run.
- README §1 item 1 ("Avoid `aidlc config project` until upstream fixes this"): fixed in 2.11.0 (#1526, #1589).
- README §1 item 2 forwarder "A later AI-DLC install or update replaces it (keeping `aidlc.bak-<time>`)": correct only at a terminal or with `--yes`; non-interactive runs leave it and say to move it aside (guide/15).
- README §1 item 5 (`display_name` needed on impeccable agents): no longer needed in 2.11.0 (PR #1544); keeping it now makes them AI-DLC personas.
- README §2 "Existing source documents go into `aidlc/spaces/default/knowledge/documents/`" — correct, and must be copies; `.docx` will be `unsupported_type` without a configured extractor; DocumentKB is not automatically consumed by Inception stages.
- README §3.6 "Claude harness defaults to `classic`": still true (`aidlc-classic.md` "the implicit default"), but cold-start long descriptions get the compose offer instead (guide/05).
- Assumption "skip RA/stories/design by reusing artifacts": only optional-input stages can be skipped; RA, DD, UG, DP must run (section 3.2).
