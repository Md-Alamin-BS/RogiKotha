# AI-DLC migration — pending

**Status:** PENDING. AI-DLC is installed but nothing has been converted yet.
**Decided:** 2026-10-04, by the project owner: from now on implementation follows AWS AI-DLC
(`awslabs/aidlc-workflows`), not the BMAD / grill-me / `LOOP.md` process the existing docs were
written for.

Until this file says **DONE**, every agent (Claude Code, Codex, Puku CLI, Cursor, anything else)
must, before starting any implementation, build, loop or task work:

1. Show the human this warning:

   > ⚠️ AI-DLC migration pending. The project now follows AI-DLC, but the plan, backlog, tasks,
   > skills and loop are still in BMAD / grill-me / LOOP.md form. They need converting into AI-DLC
   > artifacts before implementation starts. See `docs/aidlc-migration/README.md`.

2. Ask: "Convert the resources to AI-DLC first, or proceed on the old process this once?"
3. Do only what the human answers. Never start implementation silently on the old process.

Reading, research, planning and answering questions do not need the warning — only work that
builds, changes product code, or runs the loop.

When the migration is finished, set **Status: DONE** above, and remove the warning blocks from
`AGENTS.md`, `docs/implementation/LOOP.md` §0 and `docs/implementation/NEXT.md`.

---

## 1. What is installed

| Item | Value |
|---|---|
| Version | AI-DLC **2.10.0** (stable, 2026-09-24), pinned in `.aidlc-version` |
| Harnesses | Claude Code (`/aidlc`), Codex CLI (`$aidlc`, needs Codex ≥ 0.145.0; hook trust pending) |
| Not supported | Puku CLI — AI-DLC has no Puku harness; Puku only sees `AGENTS.md` |
| Workspace | `aidlc/` (spaces, intents, knowledge, memory) |
| Machine | `aidlc` command in `%LOCALAPPDATA%\aidlc\`; check with `aidlc doctor` |
| MCP | `.mcp.json` keeps `context7` only (needs `CONTEXT7_API_KEY`); the AWS servers were removed because this project does not run on AWS |

Background, sources and the install analysis: `docs/planning/research/aidlc-adoption-2026-10-04/research.md`.

### Install problems found on 2026-10-04 (read before running any `aidlc config` command)

1. **Preview every config change.** In 2.10.0, `aidlc config project --harness claude …` rewrote
   `.claude/tools/data/aidlc-manifest.json` so that it claimed all 415 project-owned files in
   `.claude/skills/` and `.claude/agents/` (BMAD, grill-me, Impeccable, …). The next
   `aidlc config --harness claude` would have **deleted them**. The 415 entries were removed from
   the manifest by hand. Before any `aidlc config …` that writes, run it with `--dry-run` first and
   continue only if it reports `remove=0`. Avoid `aidlc config project` until upstream fixes this.
2. **Git Bash cannot find `aidlc`** (upstream issue awslabs/aidlc-workflows#1545, fixed on `main`,
   not yet released). Claude Code runs hooks in Git Bash, so every hook failed with
   `aidlc: command not found`. Workaround on this machine: an extensionless forwarder
   `%LOCALAPPDATA%\aidlc\bin\aidlc` that runs `aidlc.cmd`. A later AI-DLC install or update
   replaces it (keeping `aidlc.bak-<time>`). Other machines need the same until the fix ships.
3. **The installer did not add `%LOCALAPPDATA%\aidlc\bin` to the user PATH**; it was added by hand.
   Run the installer with PowerShell 7 (`pwsh`), not Windows PowerShell 5.1, when started from a
   PowerShell 7 environment: 5.1 then loads the wrong module and fails on `Get-FileHash`.
4. **`AGENTS.md`:** the first `aidlc config` refuses to run if text mentioning AI-DLC sits in
   `AGENTS.md` without its `BEGIN/END AI-DLC` markers ("legacy root integration ambiguous"). Now that
   the managed block exists, the warning section above it is accepted. Never edit inside the markers.
5. **Agents need `display_name`.** AI-DLC validates every file in `.claude/agents/`. The four
   `impeccable-*` agents got a `display_name` line; reinstalling Impeccable removes it again and
   blocks AI-DLC until it is re-added.
6. **Codex:** hook trust is still pending — after installing Codex ≥ 0.145.0, run
   `aidlc config trust`. A Codex refresh (`aidlc config --harness codex`) would also add a second
   copy of the 37 `aidlc-*` skills under `.codex/skills/` (they already live in `.agents/skills/`);
   do not refresh Codex unless something is broken.
7. **MCP:** recorded as `none` in AI-DLC; `.mcp.json` is hand-written with `context7` only. AI-DLC
   preserves it on refresh.

## 2. Resources to convert

AI-DLC phases: 0 Initialization · 1 Ideation · 2 Inception · 3 Construction · 4 Operation. Work
happens inside an *intent* (`aidlc/spaces/default/intents/<date>-<label>/`). Existing source
documents go into `aidlc/spaces/default/knowledge/documents/`. There is no automatic importer;
each row below is a manual conversion.

| Existing resource | AI-DLC target |
|---|---|
| `docs/RogiKotha_BRD_v1.0.docx`, `docs/RogiKotha_PRD_v1.0.docx`, `PRODUCT.md`, `docs/scope-of-work.md` | knowledge documents; 1.1 Intent Capture, 1.4 Scope Definition |
| `docs/planning/00`–`01` (source inventory, requirement baseline), `06` traceability matrix, `09-coverage-matrix.md` | 2.3 Requirements Analysis (`requirements.md`) and traceability |
| `docs/planning/08-product-backlog.md`, `docs/planning/backlog.yaml` | 2.4 User Stories, 2.7 Units Generation (units of work, DAG, story map) |
| `docs/architecture/ARCHITECTURE-SPINE.md`, `docs/architecture/decisions/0001`–`0013`, `DEPENDENCY-SELECTIONS.md`, `docs/planning/05-recommended-architecture.md` | 2.6 Domain Design (components, ADRs) |
| `docs/implementation/02-data-model.md`, `03-routes-and-contracts.md` | 2.8 Contract Design |
| `docs/implementation/00-master-plan.md`, `tasks/T-*.md`, `D-*.md`, `06-change-requests.md`, `07-phase-2-document-evidence.md` | 2.9 Delivery Planning (bolt plan); per-unit Construction 3.1–3.5 |
| `docs/implementation/01-conventions.md`, `AGENTS.md` rules | `aidlc/spaces/default/memory/` (the method / rules); 2.2 Practices Discovery |
| `docs/implementation/LOOP.md`, `NEXT.md`, `04-handoff-and-validation.md`, `08-agent-prompts.md`, `BUILD-LOG.md`, `ISSUES.md`, `handoffs/` | replaced by `/aidlc` state, approval gates and audit trail — decide what survives (§3) |
| `docs/planning/10-validation-strategy.md`, `docs/validation/`, `docs/security/` | Construction NFR stages (3.2–3.3), 3.6 Build and Test |
| `DESIGN.md`, `docs/design/`, `docs/planning/ux/`, `ui-design-prototype/`, `.impeccable/` | 1.6 Rough Mockups, 2.5 Refined Mockups |
| `docs/status/decision-log.md`, `current-status.md` | intent state and audit records |
| Product code already built (`apps/`, `packages/`, `infra/` on `main`, plus open `task/*` branches) | brownfield: 2.1 Reverse Engineering |
| `_bmad/`, `bmad-*` skills in `.claude/skills/` and `.agents/skills/` | decide: retire, or keep as helpers inside AI-DLC stages |
| grill-me family (`grill-me`, `grilling`, `batch-grill-me`, `grill-with-docs`) and other planning skills (`to-spec`, `to-tickets`, `triage`, `handoff`, `loop-me`, …) | decide: keep as helpers, or retire |

## 3. Decisions needed before converting

1. **Commit identity during Construction.** AI-DLC's unit-claim registry (`core/tools/aidlc-unit.ts`)
   makes git commits authored as `AI-DLC Unit Claims <aidlc-unit@local>` on a separate claim ref
   and can push them to the remote. That conflicts with the no-tool-identity rule in `AGENTS.md`.
   Decide whether to avoid unit claims, accept them as an exception, or find a supported way to
   change it — before the first Construction bolt.
2. **The loop.** Keep `LOOP.md` / `NEXT.md` as a thin driver around `/aidlc`, or retire them.
3. **Model tiers and cross-vendor validation** (`LOOP.md` §0, ADR 0012). Map M0–M4 and the
   "other vendor validates M3" rule onto AI-DLC's reviewer agents and approval gates.
4. **Puku CLI.** Not an AI-DLC harness. Decide whether Puku is still used for implementation.
5. **In-flight work.** The product code on `main` (merged from `build/demo`, deleted 2026-10-04)
   was built on the old process. `task/t-009-worker-skeleton` and `task/cr-008-seed-and-fixture-gaps`
   are still unmerged, queued for validation, and now target `main`. Decide whether AI-DLC starts
   from this code (reverse engineering) or only covers new work.
6. **Scope.** AI-DLC's Claude harness defaults to `classic` scope (`AWS_AIDLC_DEFAULT_SCOPE`).
   Pick the scope (classic, feature, mvp, …) for the first intent.
