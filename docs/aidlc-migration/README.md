# AI-DLC migration — in progress

**Status:** IN PROGRESS. AI-DLC 2.11.0 is installed, the in-flight work is merged, and the source
documents are in the knowledge catalog. The first intent has not been started yet (§4).
**Decided:** 2026-10-04, by the project owner: from now on implementation follows AWS AI-DLC
(`awslabs/aidlc-workflows`), not the BMAD / grill-me / `LOOP.md` process the existing docs were
written for. On 2026-10-11 the owner accepted the recommended answers to the open decisions (§3).

Until this file says **DONE**, every agent (Claude Code, Codex, Puku CLI, Cursor, anything else)
must, before starting any implementation, build, loop or task work:

1. Show the human this warning:

   > ⚠️ AI-DLC migration pending. The project now follows AI-DLC, but the plan, backlog, tasks,
   > skills and loop are still in BMAD / grill-me / LOOP.md form. They need converting into AI-DLC
   > artifacts before implementation starts. See `docs/aidlc-migration/README.md`.

2. Ask: "Convert the resources to AI-DLC first, or proceed on the old process this once?"
3. Do only what the human answers. Never start implementation silently on the old process.

Reading, research, planning and answering questions do not need the warning — only work that
builds, changes product code, or runs the loop. Running `/aidlc` for the conversion itself is the
migration, not a bypass of it.

When the migration is finished, set **Status: DONE** above, and remove the warning blocks from
`AGENTS.md`, `docs/implementation/LOOP.md` §0 and `docs/implementation/NEXT.md`.

Research behind this file: `docs/planning/research/aidlc-adoption-2026-10-04/research.md` (install),
`docs/planning/research/aidlc-migration-2026-10-11/research.md` (2.11.0 runbook, verified against
upstream source and docs) and `.../inventory.md` (this file's §5 checked against the repo).

---

## 1. Progress

| # | Step | State |
|---|---|---|
| 1 | Install AI-DLC, pin, flag the migration | done 2026-10-04 (`1561022`) |
| 2 | Finish the in-flight work on the old process | done 2026-10-11: T-009 and CR-008 validated (PASS WITH FOLLOW-UP) and merged; CR-010 fixed the red lint the install caused; CR-011 written up |
| 3 | Upgrade to 2.11.0 (current stable, 2026-10-08) | done 2026-10-11: `aidlc update`, `aidlc config --pin 2.11.0`, dry run per harness (`remove=0`, `conflict=0`), refresh both, `aidlc doctor` 0 problems |
| 4 | Load the source documents as knowledge | done 2026-10-11: 35 documents in `aidlc/spaces/default/knowledge/documents/` (copies — see §6), 33 extracted, the two `.docx` catalogued as originals only |
| 5 | Restart Claude Code; trust Codex hooks | **to do (human)** — see §4 |
| 6 | First intent: Practices Discovery → Reverse Engineering → transcribe the planning set → Delivery Planning | **to do** — §4 |
| 7 | Retire or keep the BMAD / grill-me skills; freeze `LOOP.md`, `NEXT.md`, `BUILD-LOG.md`, `ISSUES.md` | to do after step 6's Delivery Planning gate |
| 8 | Set **Status: DONE**, remove the three warning blocks | last |

## 2. What is installed

| Item | Value |
|---|---|
| Version | AI-DLC **2.11.0** (stable, 2026-10-08), pinned in `.aidlc-version`; 2.10.0 kept in `%LOCALAPPDATA%\aidlc\versions\` for rollback (`aidlc config --pin 2.10.0 --yes`, then refresh both harnesses) |
| Harnesses | Claude Code (`/aidlc`), Codex CLI (`$aidlc`, needs Codex ≥ 0.145.0; hooks must be trusted once with `/hooks` → `t`) |
| Not supported | Puku CLI — AI-DLC has no Puku harness; Puku only sees `AGENTS.md`. Use Claude Code or Codex for AI-DLC work |
| Workspace | `aidlc/` (spaces, intents, knowledge, memory) |
| Machine | `aidlc` in `%LOCALAPPDATA%\aidlc\bin\` (official Git Bash launcher since 2.11.0); check with `aidlc doctor` |
| MCP | `.mcp.json` keeps `context7` only (needs `CONTEXT7_API_KEY`); project-owned, AI-DLC leaves it alone |

### Known problems and how to work with them (2.11.0)

1. **Preview every config change.** Run `aidlc config --harness <claude|codex> --dry-run --json`
   first; apply only if `remove` lists AI-DLC files only and `conflict=0`. The 2.10.0 ownership bug
   (it claimed our BMAD/Impeccable/grill files) is fixed in 2.11.0 (#1589, PR #1526).
   `--harness` is required on every config call because two harnesses are configured; `--pin`
   takes no `--harness`.
2. **Restart after a refresh.** Hooks in `.claude/settings.json` change; an open Claude Code session
   keeps the old ones. Launch Claude Code from a terminal — hooks do not fire from the desktop app or
   the VS Code extension (#1575, #1548). Run one AI-DLC session per checkout (#1631).
3. **The old hand-made Git Bash forwarder** is kept as `%LOCALAPPDATA%\aidlc\bin\aidlc.bak-handmade-20261011`;
   2.11.0's own launcher replaced it (`aidlc doctor` flags a foreign launcher).
4. **`AGENTS.md`:** never edit inside the `BEGIN/END AI-DLC` markers; text above them is ours.
5. **Impeccable agents carry `display_name`** (added for 2.10.0). In 2.11.0 that makes AI-DLC treat
   them as personas; nothing breaks. Removing the line is optional; reinstalling Impeccable removes it.
6. **Codex skills** live only in `.agents/skills/` (the earlier note about a duplicate copy under
   `.codex/skills/` was wrong — the Codex manifest never ships there).
7. **Knowledge batches** are capped at 20 documents per `onboard`/`sync`; onboard by subdirectory.
8. **A guard hook** refuses Bash commands that write under `aidlc/spaces/` through a shell variable
   (it cannot tell the target is not the audit trail). Write such paths literally.
9. **`.env` is loaded into every process `aidlc` starts** (#1278) — local dev secrets only; never
   put real secrets in `.env`.
10. **Code Generation can refuse to complete** on "unclaimed source changes" from caches (#2244):
    delete `.vitest/`, `*.tsbuildinfo`, `test-results/`, `.data/` before approving a Code Generation
    gate. On the first turn AI-DLC may wrongly claim hooks are off and offer to write
    `settings.local.json` (#2263) — decline.

## 3. Decisions (accepted 2026-10-11)

1. **Commit identity.** Keep `Unit Ownership: solo` and serial execution (both defaults). Solo mode
   never creates the `AI-DLC Unit Claims <aidlc-unit@local>` commits, and serial execution avoids the
   swarm commits authored `AI-DLC <aidlc@localhost>`. Do not enable team ownership or parallel
   ("swarm") Construction while `AGENTS.md`'s no-tool-identity rule stands. The fixed claim identity
   is fixed upstream (PR #2131) but only in 2.11.1 previews. Bolt merges are committed under the
   human's identity but with `--no-verify` (no repo commit hooks exist today).
2. **The loop.** `LOOP.md` / `NEXT.md` stop being the driver once the first intent reaches
   Construction; `/aidlc` state, gates and the audit trail replace them. Until then `NEXT.md` stays
   current. `BUILD-LOG.md`, `ISSUES.md`, `docs/validation/` and `handoffs/` stay as history; the open
   `S1`/`S2` rows carry into the delivery plan.
3. **Model tiers and cross-vendor validation** (`LOOP.md` §0, ADR 0012) map to AI-DLC's reviewer
   agents plus `/aidlc --collaborators on` for high-risk (M3) units; record the rule in `team.md` at
   Practices Discovery. Model ids in records conflict with `AGENTS.md` (`04-handoff-and-validation.md:29`);
   settle that there too.
4. **Puku CLI** is not used for AI-DLC work.
5. **In-flight work** was finished on the old process (§1 step 2). AI-DLC starts **brownfield** from
   `main` and reverse-engineers the existing `apps/`, `packages/`, `infra/`.
6. **Scope.** `classic`, brownfield, minimal depth, skipping Refined Mockups, NFR Requirements, NFR
   Design and Infrastructure Design (the planning set already covers them). Requirements Analysis,
   User Stories, Domain Design, Units Generation and Delivery Planning cannot be skipped — Code
   Generation needs their artifacts — so they **transcribe** the existing documents rather than
   re-derive them. Skipping User Stories also triggers upstream bug #2282.

## 4. Next: start the first intent

1. Exit this Claude Code session, start `claude` again from a terminal in the repo, run
   `/aidlc --doctor`. In Codex: `/hooks`, `t`, Esc, then `$aidlc --doctor`.
2. Start the intent (one line; if the engine rejects the combined flags, use `/aidlc compose` and set
   the same grid at its approval gate):

   ```text
   /aidlc --project-type brownfield --scope classic --depth minimal --skip refined-mockups,nfr-requirements,nfr-design,infrastructure-design "Adopt AI-DLC for the RogiKotha demo build already in progress. Reverse-engineer apps/, packages/ and infra/ on main. Requirements, stories, architecture, data model and contracts already exist and are authoritative: transcribe them from the knowledge documents (start with docs/planning/01-requirement-baseline.md, then 08-product-backlog.md, ARCHITECTURE-SPINE.md with ADRs 0001-0013, 02-data-model.md, 03-routes-and-contracts.md, decision-log.md FD-001..FD-037) instead of re-deriving them. Delivery planning continues docs/implementation/00-master-plan.md from where it stands: T-001..T-009, T-207a, D-001 merged; CR-009 next and alone; then T-010, CR-011 and Phase 1."
   ```
3. At **Practices Discovery**, affirm `team.md` from `01-conventions.md` and the `AGENTS.md` rules, and
   resolve the four conflicts with `org.md` listed in `docs/planning/research/aidlc-migration-2026-10-11/inventory.md`:
   merge style (task merges are `--no-ff`; AI-DLC squashes Bolts), coverage floor (none today vs the
   80 % default), deployment (local Docker demo only, no CI/CD yet) and model ids in records.
4. Approve each gate. After Delivery Planning, do §1 step 7, then step 8.

## 5. Resources and where they go

There is no automatic importer; each row is converted by the stage named, from the knowledge copy.

| Existing resource | AI-DLC target |
|---|---|
| `docs/RogiKotha_PRD_v1.0.docx`, `..._BRD_v1.0.docx` | knowledge originals only (no Word extractor); their content is read through `00-source-inventory.md` and `01-requirement-baseline.md`, the Gate 1 extraction |
| `PRODUCT.md`, `docs/scope-of-work.md` | knowledge; hard rules feed `project.md` and every unit's checklist |
| `docs/planning/01-requirement-baseline.md`, `06-requirement-traceability-matrix.md` | 2.3 Requirements Analysis (`requirements.md`) and traceability |
| `docs/planning/08-product-backlog.md` (`backlog.yaml` is partly superseded by the master plan) | 2.4 User Stories, 2.7 Units Generation |
| `docs/architecture/ARCHITECTURE-SPINE.md`, `decisions/0001`–`0013`, `DEPENDENCY-SELECTIONS.md` (FD-032 replaced its UI rows), `docs/planning/05-recommended-architecture.md` | 2.6 Domain Design |
| `docs/implementation/02-data-model.md` | 2.6 Domain Design / 3.1 Functional Design |
| `docs/implementation/03-routes-and-contracts.md` | 2.8 Contract Design |
| `docs/status/decision-log.md` (FD-001..FD-037, binding) | knowledge; seeds `project.md` "Decided" |
| `docs/implementation/00-master-plan.md`, `README.md` §5 tracker (the only record of what is merged), `tasks/T-*.md`, `CR-*.md`, `06-change-requests.md` | 2.9 Delivery Planning; per-unit Construction 3.1–3.5 |
| `docs/implementation/07-phase-2-document-evidence.md` | deferred scope (FD-036), not in this intent's delivery plan |
| `docs/implementation/05-demo-storyboard.md`, `docs/planning/10-validation-strategy.md`, `docs/validation/` | 3.6 Build and Test acceptance |
| `docs/implementation/01-conventions.md`, `AGENTS.md` rules | `aidlc/spaces/default/memory/team.md` via 2.2 Practices Discovery |
| `DESIGN.md`, `docs/planning/ux/`, `docs/design/`, `ui-design-prototype/`, `.impeccable/` | design contracts (Refined Mockups is skipped: Gate 4 already chose Concept 04b) |
| `LOOP.md`, `NEXT.md`, `04-handoff-and-validation.md`, `08-agent-prompts.md`, `BUILD-LOG.md`, `ISSUES.md`, `handoffs/` | replaced by `/aidlc` state, gates and audit (§3.2) |
| `docs/status/current-status.md`, `docs/planning/09-coverage-matrix.md` | stale — not onboarded; refresh or retire at §1 step 7 |
| Product code on `main` (`apps/`, `packages/`, `infra/`) | 2.1 Reverse Engineering |
| `_bmad/`, `bmad-*` skills, grill-me family and other planning skills | decide at §1 step 7 |
| `../rogikotha-gate4` worktree (275 untracked files, an early Gate 4 Next.js prototype) | owner to decide: keep, archive or delete |

## 6. Knowledge snapshot

AI-DLC refuses to index files outside `knowledge/documents/`, so the 35 documents there are
**copies** taken on 2026-10-11 from `main` at `8033e57`, with their repo paths preserved
(`documents/docs/...`, `documents/PRODUCT.md`, `documents/DESIGN.md`). The originals in `docs/`
stay the source of truth. When an original changes, copy it over the snapshot and run
`aidlc engine knowledge sync` (≤ 20 changed files per run).
