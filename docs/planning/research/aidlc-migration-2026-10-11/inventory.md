# AI-DLC migration inventory check and team-practices extraction

Repo: C:\Users\BS01395\Documents\GitHub\rogikotha, branch main, HEAD 7a29b5b. Checked 2026-10-11. Read-only.
Read directly: README.md (aidlc-migration) in full, 01-conventions.md in full, 00-master-plan.md sections 1-4 and 7-10, 04-handoff-and-validation.md in full, 10-validation-strategy.md in full, AGENTS.md lines 1-140, package.json, eslint.config.mjs, prettier.config.mjs, vitest.workspace.ts, packages/database/vitest.config.ts, 11-worktree-safe-execution-plan.md, parts of LOOP.md, NEXT.md, current-status.md, decision-log.md, dependency-check-log.md, implementation/README.md tracker rows, ADR 0010/0012. NOT read in full: the two .docx (only size/date), BUILD-LOG.md, ISSUES.md, ui-design-prototype/, planning/research/*, docs/validation/*.md, scope-of-work.md (date/size only).
"Last" = `git log -1 --format=%ad --date=short -- <path>`. Sizes in bytes.

## PART A - Inventory check of README section 2

Verdict legend: AUTH = authoritative, SUPERS = superseded in whole or part, STALE = content no longer matches repo.

| Row | Path | Exists | Files | Last | Verdict |
|---|---|---|---|---|---|
| 1 | docs/RogiKotha_BRD_v1.0.docx | yes | 1 (64,369) | 2026-09-06 | AUTH source; PRD wins where it explicitly supersedes (decision-log D-001) |
| 1 | docs/RogiKotha_PRD_v1.0.docx | yes | 1 (71,051) | 2026-09-06 | AUTH, top source |
| 1 | PRODUCT.md | yes | 1 (8,029) | 2026-09-10 | AUTH; hard rules at PRODUCT.md:89-112 |
| 1 | docs/scope-of-work.md | yes | 1 (12,078) | 2026-09-07 | AUTH but predates FD-031..037 (content not re-read) |
| 2 | docs/planning/00-source-inventory.md | yes | 1 (6,055) | 2026-08-30 | AUTH, historical |
| 2 | docs/planning/01-requirement-baseline.md | yes | 1 (23,572) | 2026-09-10 | AUTH (100 FR + 12 NFR) |
| 2 | docs/planning/06-requirement-traceability-matrix.md | yes | 1 (14,851) | 2026-09-10 | AUTH |
| 2 | docs/planning/09-coverage-matrix.md | yes | 1 (28,825) | 2026-10-04 | MAPPING WRONG + STALE. It is story-vs-prototype coverage, derived by tools/coverage.mjs, header "Date 2026-09-06" (09-coverage-matrix.md:1-8). Not a traceability artifact |
| 3 | docs/planning/08-product-backlog.md | yes | 1 (46,925) | 2026-09-10 | AUTH, 12 epics / 34 stories (frontmatter status: planned) |
| 3 | docs/planning/backlog.yaml | yes | 1 (49,107) | 2026-08-30 | PARTLY SUPERSEDED. Its 104 task records (current-status.md:13) belong to the pre-FD-031 plan; the executable plan is the 46-task master plan. Stories still valid |
| 4 | docs/architecture/ARCHITECTURE-SPINE.md | yes | 1 (16,596) | 2026-08-30 | AUTH (AD-1..AD-17); partly overridden by FD-032/033 |
| 4 | docs/architecture/decisions/0001..0013 | yes | 13 (10,965 total) | 2026-08-30 | AUTH, 0010 and 0012 confirmed `Status: Accepted`; 0006 (Garage) deferred (00-master-plan.md:71) |
| 4 | docs/architecture/DEPENDENCY-SELECTIONS.md | yes | 1 (6,843) | 2026-09-12 | PARTLY SUPERSEDED: Tailwind/shadcn/Radix rows replaced by FD-032 (00-master-plan.md:39) |
| 4 | docs/planning/05-recommended-architecture.md | yes | 1 (17,379) | 2026-08-30 | background; SUPERSEDED by spine + FD-031..035 where they differ |
| 5 | docs/implementation/02-data-model.md | yes | 1 (27,913) | 2026-09-12 | AUTH (30 tables, validated live in T-004/T-005). Mapping debatable: data model fits Domain/Functional Design (2.6/3.1) better than Contract Design |
| 5 | docs/implementation/03-routes-and-contracts.md | yes | 1 (30,785) | 2026-09-13 | AUTH, fits 2.8 |
| 6 | docs/implementation/00-master-plan.md | yes | 1 (29,474) | 2026-10-04 | AUTH (sections 3,4,8); section 7 model routing is process, to be remapped |
| 6 | docs/implementation/tasks/T-*.md | yes | 47 | 2026-10-04 | AUTH specs. Per tracker: T-001..T-008, T-207a merged; T-009 validating; T-010, T-101..T-505 todo (tracker README lines 159-209). Dir total 54 files, 718,459 B |
| 6 | tasks/D-*.md | yes | 1 (D-001) | 2026-10-04 | merged (tracker line 159). Also 6 CR-*.md files exist (CR-004..CR-009) |
| 6 | docs/implementation/06-change-requests.md | yes | 1 (8,841) | 2026-09-14 | AUTH change log |
| 6 | docs/implementation/07-phase-2-document-evidence.md | yes | 1 (5,391) | 2026-09-12 | AUTH, deferred scope (FD-036); belongs in requirements/backlog, not delivery plan |
| 7 | docs/implementation/01-conventions.md | yes | 1 (20,617) | 2026-10-04 | AUTH; sections 12-13 hold process rules that clash with AI-DLC |
| 7 | AGENTS.md | yes | 1 (12,488) | 2026-10-04 | AUTH; non-AI-DLC content is lines 1-91 |
| 8 | docs/implementation/LOOP.md | yes | 1 (17,857) | 2026-10-04 | old-process driver |
| 8 | docs/implementation/NEXT.md | yes | 1 (5,271) | 2026-10-04 | STALE state: "Updated 2026-09-14"; queue validate T-009 + CR-008, both branches still unmerged locally |
| 8 | 04-handoff-and-validation.md | yes | 1 (17,775) | 2026-10-04 | old process; gates G1-G5 map to 3.6 |
| 8 | 08-agent-prompts.md | yes | 1 (14,290) | 2026-10-04 | SUPERSEDED once AI-DLC drives; mentions puku-cli |
| 8 | BUILD-LOG.md | yes | 1 (60,438) | 2026-09-14 | append-only history, archive |
| 8 | ISSUES.md | yes | 1 (127,552) | 2026-09-14 | AUTH register (ISS-001..~196); open S1/S2 rows must be carried over, README gives no plan for that |
| 8 | handoffs/ | yes | docs/implementation/handoffs 13 files (84,883); docs/handoffs 2 files (22,367) | 2026-09-14 / 2026-09-11 | two different handoffs dirs; docs/handoffs/GATE4_DUMMY_UI_AGENT_PROMPT.md is STALE (Gate 4 done) |
| 9 | docs/planning/10-validation-strategy.md | yes | 1 (8,620) | 2026-08-30 | AUTH for verdict contract (lines 6-14) and production gates (74-111); Gate 2-4 sections (30-72) historical |
| 9 | docs/validation/ | yes | 13 (249,722) | 2026-09-14 | evidence archive |
| 9 | docs/security/ | yes | 1, README only (297) | 2026-09-12 | placeholder; T-502 fills it; nothing to convert |
| 10 | DESIGN.md | yes | 1 (18,636) | 2026-09-10 | AUTH |
| 10 | docs/design/ | yes | 5 (69,774) | 2026-09-14 | AUTH (auth-screens-spec, dev-spec); comparison/trim-log are history |
| 10 | docs/planning/ux/ | yes | 7 (56,568) | 2026-09-10 | AUTH; a second DESIGN.md lives here besides the root one |
| 10 | ui-design-prototype/ | yes | 42 (1,836,819) | 2026-10-11 | AUTH visual source (conventions section 7) |
| 10 | .impeccable/ | yes | 5 (36,276) | 2026-10-04 | tooling state |
| 11 | docs/status/decision-log.md | yes | 1 (25,743) | 2026-09-13 | MAPPING WRONG. Contains FD-001..037 founder decisions and source-authority D-001..; these are binding constraints, not "intent state and audit records". Onboard as knowledge and seed project.md "Decided" |
| 11 | docs/status/current-status.md | yes | 1 (11,227) | 2026-09-12 | STALE. Line 3 "As of 2026-09-12"; says "No production application code or dependency has been added" and "Nothing under apps/ or packages/ exists yet" (line 13). Reality: apps/web, apps/worker, 7 packages, infra/compose on main (95 tracked files under apps/, 222 under packages/, 7 under infra/) |
| 12 | apps/ packages/ infra/ | yes | see above | 2026-09-13 / 09-14 / 09-13 | AUTH code. README names 2 open task branches; local branches are also task/gate4-foundation (not mentioned). Remote has 15 task/* branches (most merged) |
| 13 | _bmad/, bmad-* skills | yes | _bmad 22 files; 49 bmad entries in .claude/skills and in .agents/skills | 2026-08-30 | decision pending |
| 14 | grill-me family etc. | not itemised | - | - | not checked |

### Omitted by section 2 but relevant to a migration

| Path | Size | Why |
|---|---|---|
| docs/implementation/README.md | 24,358 | holds the task status tracker (section 5) and run prompts; only record of which tasks are merged/todo; needed to build the unit list |
| docs/implementation/05-demo-storyboard.md | 9,191 | G5 acceptance walk-through; Build and Test input |
| docs/implementation/templates/ (2) | 2,397 | handoff/validation templates |
| docs/status/dependency-check-log.md | n/a | required by AGENTS.md:55-64; latest entry 2026-10-04, 7 days old, so a fresh check is due |
| docs/status/risk-register.md | n/a | header "As of 2026-08-30"; feeds NFR and threat stages |
| docs/status/validation-log.md | n/a | header "As of 2026-08-30"; verdict index |
| docs/status/pending-changes-inventory.md, impeccable-detector-* (6 files) | n/a | closed / generated; archive |
| docs/planning/03-research-report.md | 33,067 | research behind architecture; fits Feasibility 1.3 |
| docs/planning/07-agent-model-assignment.md | 4,687 | classes superseded by master plan section 7 (its own line 2), policy parts still apply |
| docs/planning/09-frontend-prototype-plan.md | 12,753 | Gate 4 brief, historical |
| docs/planning/11-worktree-safe-execution-plan.md | 4,780 | source for Way of Working; Gate-4-specific parts stale (line 3 "no implementation started") |
| docs/planning/research/ | 28 files, 286,650 | includes aidlc-adoption research.md |
| docs/architecture/reviews/ (3) | 6,706 | rubric and fidelity reviews |
| docs/design/third-party-component-register.md | n/a | required by validation strategy line 53 |
| tools/ + tools/README.md | n/a | prototype QA tooling wired into `pnpm tools:check` (package.json:34) |
| infra/compose/ + .env.example | 7 files | env definition for 3.4 Infrastructure Design / 3.7 CI |
| .mcp.json, .aidlc-version, .nvmrc | | env pins |

Stage-coverage gaps in the mapping: nothing for 1.2 Market Research, 1.3 Feasibility, 1.5 Team Formation, 3.4 Infrastructure Design (infra/compose), 3.7 CI Pipeline (no CI exists: .github contains only `agents/`, no workflows; T-010 "boundary lint and CI" is todo, tracker line 169), or Operation 4.x (production deployment out of scope, 00-master-plan.md:307). Stage numbers 0.x-4.x in the README were checked against .claude/tools/data/stage-graph.json and are correct.

Other issues in README text:
- Section 3 omits that 04-handoff-and-validation.md:29 and docs/validation/README.md deliberately allow model ids in BUILD-LOG, handoffs and validation records. That is a second conflict with the blanket no-attribution rule (AGENTS.md:21-43) besides unit claims.
- Section 1 says Git Bash `aidlc` forwarder is machine-local; nothing to verify in repo.
- `aidlc/spaces/default/` currently contains only `intents/` and `memory/`; `knowledge/documents/` does not exist yet.

### Knowledge documents to onboard, ranked

| Rank | File | Bytes | Reason |
|---|---|---|---|
| 1 | docs/RogiKotha_PRD_v1.0.docx | 71,051 | controlling source |
| 2 | docs/RogiKotha_BRD_v1.0.docx | 64,369 | business source, subordinate to PRD |
| 3 | PRODUCT.md | 8,029 | hard rules; derive every task checklist |
| 4 | docs/planning/01-requirement-baseline.md | 23,572 | 100 FR + 12 NFR |
| 5 | docs/status/decision-log.md | 25,743 | FD-001..037 |
| 6 | docs/architecture/ARCHITECTURE-SPINE.md | 16,596 | AD-1..AD-17 |
| 7 | docs/implementation/00-master-plan.md | 29,474 | stack pins, layout, task graph |
| 8 | docs/implementation/01-conventions.md | 20,617 | conventions, DoD, hard-rule checklist |
| 9 | docs/implementation/02-data-model.md | 27,913 | schema |
| 10 | docs/implementation/03-routes-and-contracts.md | 30,785 | routes, commands |
| 11 | docs/planning/06-requirement-traceability-matrix.md | 14,851 | 112 PRD IDs to stories |
| 12 | docs/planning/08-product-backlog.md | 46,925 | stories |
| 13 | docs/scope-of-work.md | 12,078 | scope |
| 14 | docs/architecture/decisions/0001-0013 (13 files) | 10,965 | ADRs |
| 15 | docs/planning/10-validation-strategy.md | 8,620 | test contract |
| 16 | DESIGN.md (18,636), docs/planning/ux/EXPERIENCE.md + DESIGN.md (ux dir 56,568), docs/design/auth-screens-spec.md (design dir 69,774) | | design contracts |
| 17 | docs/architecture/DEPENDENCY-SELECTIONS.md | 6,843 | with FD-032 caveat |
| 18 | docs/implementation/07-phase-2-document-evidence.md | 5,391 | deferred scope |
| 19 | docs/implementation/05-demo-storyboard.md | 9,191 | acceptance |
| 20 | docs/planning/backlog.yaml | 49,107 | machine-readable stories; verify DocumentKB accepts yaml |
| 21 | docs/planning/03-research-report.md | 33,067 | background |

Do not onboard: current-status.md (stale), 09-coverage-matrix.md (derived, stale), BUILD-LOG.md, ISSUES.md (127 KB; summarise open S1/S2 instead), detector json, pending-changes-inventory.

## PART B - Practices extraction for team.md

org.md refs: squash-merge org.md:15-19; Testing Posture org.md:40-66 (80% floor at 46-47); Deployment org.md:70-76; Code Style org.md:78-92; Guard Policy org.md:68 (heading only). Tags: CONFLICT = contradicts an org default; EXTEND = adds to it; OK = consistent. Line numbers for eslint.config.mjs, prettier.config.mjs, vitest.workspace.ts are in-file lines.

### Way of Working
- Integration branch `main`; one branch per task named `task/t-101-better-auth`; worktree per lane (01-conventions.md:217; 00-master-plan.md:303; 04-handoff-and-validation.md:147). EXTEND (trunk-based, org.md:6-8).
- Start: `git fetch origin`, `git switch main && git pull --ff-only origin main` (LOOP.md:48-49; 04:33). OK.
- Merge: `git merge --no-ff <branch> -m "Merge <task>: <title>"`, then `pnpm check` on main, then push (LOOP.md:185-191; 08-agent-prompts.md:147). Seen in history: `git log --merges` shows 13feb18, e84f9ee, eaefcf2, ec5e998, ee0d250, fdd2a43, 31dbd07. CONFLICT with org.md:15-19 (squash-merge each Bolt).
- Red check after merge: `git reset --merge ORIG_HEAD` before push, mark task FAIL (LOOP.md:189-191).
- Implementer never merges own branch; validator (loop mode) or human merges after PASS, in dependency order (04:148,151; LOOP.md:185).
- One task = one PR into main after VALIDATE says PASS (01:219).
- Commit only task-owned paths after reading `git diff --cached`; message `T-101: <summary>` plus short body (01:218; 11-worktree:25).
- Conflict rules: owned paths resolve and recheck; register files union both sides; lockfiles, migration numbers, foreign files ask the human; `--force-with-lease` only on own branch, never `--force` (04:151).
- One task per session; implementer and validator are different sessions; stop at task boundary; session over 2x high estimate hands off as partial (04:3,46,83,140,142).
- Small defects in merged code: fix at once in `task/cr-nnn-<slug>` if mechanical, no decision, <= 1h; otherwise write tasks/CR-nnn file (04:106-136; founder instruction 2026-09-13).
- Concurrent DB-touching tasks need isolated databases per worktree (NEXT.md "State of the build").
- When unsure: stop at doubt, write the question with two options, pick the reversible and narrower one, mark `// ASSUMPTION(T-xxx):`, continue; every marker needs an S4 row (01:247-252; 04:96).

### Walking Skeleton
- No explicit skeleton ceremony. De facto: Phase 0 Foundation (T-001..T-010) before anything user-visible (00-master-plan.md:115-131); step gates "`pnpm install` clean; `pnpm infra:up` healthy" and "shell renders /en and /bn" (00-master-plan.md:291-292); final slice "storyboard runs end to end in both locales" (00-master-plan.md:300).
- Proposal, not a repo statement: skeleton on, with `pnpm check` (package.json:22) as the recorded verification command; Foundation is already merged except T-009 and T-010.

### Testing Posture
- Methodology not declared as TDD/BDD; practice is test-with-implementation per layer, tests part of Definition of Done (01:221-228). Matches org default test-after (org.md:43-44). OK.
- Levels and minimums: domain (every transition table, every policy, hard-rule tests), application (happy path, each authorization refusal, one audit assertion), database `*.int.test.ts` against compose Postgres via `DATABASE_URL_TEST` (each repository method; migrations from empty), component (Vitest + Testing Library + jsdom, render in `en` and `bn`), e2e Playwright + axe from T-503 (01:199-205). Test names as sentences, builders not hand fixtures, no assertions on implementation details (01:207).
- Coverage floor: none. No threshold in any vitest config I read (vitest.workspace.ts:13 has only passWithNoTests and projects; database config has none); `@vitest/coverage-v8` is installed only (package.json:51). CONFLICT with org.md:46-47 (80% for feature/mvp/enterprise/infra/classic). Decide: adopt 80% for new work or record a deviation.
- Smoke suite: every task adds >= 1 assertion in `*.smoke.test.ts(x)`; `pnpm smoke` = `vitest run --config vitest.workspace.ts smoke.test` (package.json:19); suite only grows, deleting needs an ISS row; Playwright smoke (Chromium, <= 3 min) from T-503 (04:72-74).
- Integration DB: Postgres 18 on localhost:5433, roles rk_app / rk_worker / rk_maintenance, test DB `rogikotha_test` (infra/compose/.env.example:8-11); `pnpm test:int` = vitest `--project database` (package.json:18); database project sets `fileParallelism: false` because files share one DB reset, 30 s timeout (packages/database/vitest.config.ts:14-17).
- `pnpm check` = typecheck && lint && test && i18n:check && build (package.json:22); green before `validating` and after every merge (01:224; 04:62,66).
- Gates: G1 self-check, G2 acceptance rows executed, G3 cumulative smoke, G4 diff review with 3-5 adversarial tests on M3 work, G5 human phase gate in both locales (04:62-70). Verdicts PASS / PASS WITH FOLLOW-UP / FAIL (10-validation-strategy.md:8-14; 04:76-83).
- UI tasks: `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` clean (01:177).
- Production gates and release stop conditions: 10-validation-strategy.md:74-111.

### Guard Policy
- No equivalent concept. Equivalents: 14-item hard-rule checklist in every hand-off (01:230-245); fail closed when something cannot run (01:213); M3 work needs cross-vendor validation plus human approval (ADR 0012 Decision; 04:83).
- AI-DLC facts: guard hooks fail open outside an active code-generation stage and unit claims commit as `AI-DLC Unit Claims <aidlc-unit@local>` (dependency-check-log.md 2026-10-04 entry; docs/aidlc-migration/README.md:96-100). Suggest `strict` until the identity decision is made. Not a repo statement.

### Deployment
- Demo = local-development composition: Next.js, PostgreSQL 18 in Docker, Better Auth, pg-boss worker, filesystem storage, Mailpit (00-master-plan.md:38,70,71). Commands `pnpm demo`, `pnpm infra:up/down/reset` (package.json:27-31).
- No CI/CD, staging or production exists or is in scope (00-master-plan.md:307; no .github/workflows; T-010 todo). CONFLICT with org.md:70-76 (deploy on merge to staging, manual prod approval): nothing to deploy to. Record "none yet, local demo".
- Demo and production compositions are separate; demo markers cannot be disabled (ADR 0010 Decision; ARCHITECTURE-SPINE.md:130). Garage is the deferred production storage candidate (00-master-plan.md:71).

### Code Style
- Formatter Prettier 3.9: `singleQuote: true`, `semi: true`, `printWidth: 100`, `trailingComma: 'all'` (prettier.config.mjs:3-6; package.json:56). OK with org.md:80-81. Observation: no prettier script and not part of `pnpm check`, so formatting is not enforced.
- Linter ESLint 10 flat config, typescript-eslint `recommendedTypeChecked` with `projectService`; `consistent-type-imports` error, `no-console` error (allow warn/error), `no-floating-promises` error; eslint-config-prettier last (eslint.config.mjs:28-33, 38-40, 53). Boundary rules not yet added: "T-010 adds boundaries here" (eslint.config.mjs:52); plan names eslint-plugin-boundaries 7.2, fallback dependency-cruiser 18.2 (00-master-plan.md:73).
- ESLint ignores node_modules, dist, .next, ui-design-prototype, tools, _bmad, .data, docs, .agents, .claude, .github, .impeccable (eslint.config.mjs:13-26).
- TypeScript strict and noUncheckedIndexedAccess (tsconfig.base.json:7-8); ESM (package.json:5). Relative imports across workspace packages must be extensionless (CR-005 done for contracts; CR-009 pending for database; tracker lines 207, 209).
- Naming: snake_case DB (01:47); one command per file `verb-noun.ts` via `defineCommand`, one query per file `get-noun.ts` (01:39-40); React component PascalCase named after prototype render function (01:181); fixed module-name list (01:80); UUIDv7 keys plus 10-char base32 `public_id` in URLs (01:131); `Result<T>` instead of throwing for expected failures (01:127).
- Boundaries (lint-enforced from T-010): domain imports nothing; contracts only zod; application only domain+contracts; database implements application ports; adapters instantiated only in apps/web/src/server/container.ts; worker must not import Better Auth or identity-reveal/deletion commands; components must not import database, adapters, test-support or node: modules (01:84-96).
- UI: server components by default, `'use client'` only for interaction state; forms are server actions that work without JS; ported CSS copied unchanged from prototype; no Tailwind, shadcn, Radix, CSS-in-JS, shipped fonts, icon library or animation library (01:168-188; 00-master-plan.md:39,74,76).
- Logging via logger port, structured JSON, allowlisted fields only (01:211); audit details allowlisted (01:156); time via Clock port; truncation via Intl.Segmenter (01:132-133).

### Forbidden
- Any agent, tool or model identity, Co-Authored-By, "Generated with", badges, footers in commits, author fields, PR text, docs, comments, generated files (AGENTS.md:21-43; 01:218,245). Only carve-out: model id may appear in BUILD-LOG lines, handoff and validation header tables, task run records (04:29; docs/validation/README.md). Decide whether the carve-out survives.
- Commit author must be the human's configured identity (AGENTS.md:27-28; recent commits are `Md. Al-Amin`).
- Destructive git on a dirty tree (reset --hard, checkout --, clean) and `--force` push (01:217; 11-worktree:28,77; 04:151).
- Implementer editing task files silently (04:143); implementer validating own work or same session implement+validate (04:83; 00-master-plan.md:282; ADR 0012).
- Raw inserts in seed except auth tables (01:63); localStorage for server state (01:187).
- Free text, emails, file names, review bodies in audit details or logs (01:156,211).
- A number standing for quality; "highest rated" sort; "verified"/"approved" evidence copy; showing a missing value as 0 (01:232-242; PRODUCT.md:91-112).
- Adopting too-new majors: Node 26, pnpm 12, TS 7, Vitest 5, Drizzle 1.0 RC (00-master-plan.md:52-72).
- Real patient data, real people or facilities named in negative accounts (10-validation-strategy.md:82,107; 01:244).

### Mandated
- Verify authorship after every commit: `git log -1 --format='%an <%ae>%n%B'` (04:46; LOOP.md:46-47).
- Dependency check: read docs/status/dependency-check-log.md; skip if the covering entry is < 3 days old, else verify stable release and changelog and append a dated entry before implementing (AGENTS.md:45-68). Latest entry 2026-10-04 so a new check is due. Master-plan pins were verified 2026-09-10 (00-master-plan.md:47-48).
- Research before implementing new features; surface better options, never silently deviate; save non-trivial research under docs/planning/research/ (AGENTS.md:70-91).
- Bengali/English parity: `en.json` and `bn.json` change in the same commit or the parity test fails (01:162; `node scripts/check-parity.mjs`, packages/i18n/package.json:16; `pnpm i18n:check` package.json:20); numerals follow language, month/year only in public content, no cap-transform in Bengali (01:164,243); ADR 0011.
- Synthetic data only; visible "Demo - fictional records" marker (00-master-plan.md:28-30; ARCHITECTURE-SPINE.md:130; 01:244).
- Hard-rule checklist copied into every hand-off with evidence (01:230-245, 13.4).
- Per-task artefacts: task-file Hand-off section, handoffs/T-xxx.md (<= 80 lines), ISS row per defect/workaround, NEXT.md (<= 40 lines), BUILD-LOG line (04:11-21,39-46). To be replaced by AI-DLC state/audit; decision pending (README section 3 item 2).
- Independent validation; cross-vendor for M3; human approval for high-risk (ADR 0012; 04:83; 00-master-plan.md:274-275,285).
- Secrets only via env vars listed in infra/compose/.env.example; worker gets only DATABASE_URL_WORKER (role without access to auth_*, persona_links, identity_reveals); fail closed (01:212-213).
- Every state-changing command writes an audit_events row in the same transaction; authorization only in application layer (01:115,154-156).
- Task start checklist (11-worktree-safe-execution-plan.md:30-37).
- Runtime: Node >=24 <25, pnpm >=11 <12, packageManager pnpm@11.20.0 (package.json:6-9); new native build scripts need `allowBuilds` in pnpm-workspace.yaml.
- Show AI-DLC migration warning before implementation until README says Status: DONE (AGENTS.md:3-19).

### Tech Stack (master-plan pin vs manifest on main)

| Concern | Master-plan pin (00-master-plan.md:50-74, verified 2026-09-10) | Manifest on main |
|---|---|---|
| Node | 24.x | engines >=24 <25 (package.json:8); .nvmrc 24 |
| pnpm | 11.x | pnpm@11.20.0 (package.json:6) |
| Next.js | 16.3.4 | 16.3.4 exact |
| React | 19.3.0 | 19.3.0 exact |
| TypeScript | 6.x | ~6.0.3 (package.json:58) |
| PostgreSQL | 18 | postgres:18 (docker-compose.yml:4) |
| Drizzle | 0.45.2 + kit 0.31.10 exact | exact, match |
| pg | 8.23.x | ^8.23.0 |
| pg-boss | 12.30.x | NOT in any manifest on main (lives on unmerged task/t-009 branch) |
| Better Auth | 1.7.3 | NOT on main (T-101 todo) |
| argon2 | 2.2.x | @node-rs/argon2 ^2.2.0 |
| next-intl | 4.14.x | ^4.14.4 |
| zod | 4.5.x | ^4.5.4 in one package, ^4.6.2 in another (drift from 4.5.x) |
| uuid | 13.x | ^13.0.2 |
| sharp | 0.35.x | ^0.35.4 |
| Vitest | 4.1.x | ^4.1.11 (+ coverage-v8) |
| jsdom | 30 | root ^27.0.0 (package.json:55) vs apps/web ^30.0.1 - inconsistent |
| Testing Library | 16.3 | react ^16.3.3, user-event ^14.6.7, jest-dom ^6.9.1 |
| ESLint / ts-eslint / Prettier | 10 / TS6 / 3.9 | ^10.10.0 / ^8.70.0 / ^3.9.6 |
| Playwright, axe | 1.63, 4.13 | not installed yet (T-503) |
| ClamAV | 1.5.4 | clamav/clamav:1.5.4 |
| Mailpit | current stable | axllent/mailpit:v1.31.1 |
| puppeteer-core | not in plan | ^25.10.0 (prototype tools) |
Not used in Phase 1: Tailwind, shadcn, Radix, Motion, Storybook, MSW, Matomo, Garage, LibreOffice (00-master-plan.md:76).

### Conflicts with org.md, ranked
1. Merge style: `--no-ff` task merges (LOOP.md:187) vs squash-merge Bolts (org.md:15-19).
2. Coverage floor: none in repo vs 80% (org.md:46-47).
3. Deployment: no CI/CD or environments vs deploy-on-merge to staging (org.md:70-76).
4. Commit identity: AI-DLC unit-claim commits as `AI-DLC Unit Claims <aidlc-unit@local>` vs AGENTS.md:27-28 (undecided, README section 3 item 1).
5. Model-id carve-out in logs/validation records (04:29) vs blanket no-attribution rule (AGENTS.md:21-43; global user rule).
6. Compatible: test-after methodology, Prettier/ESLint deferral to project config, short-lived task branches off main. Prettier is not enforced in `pnpm check`.
