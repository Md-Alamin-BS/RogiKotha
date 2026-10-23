# RUNBOOK — finish the AI-DLC migration

**Temporary file.** Delete it in the last step. Background: `docs/aidlc-migration/README.md`.

The human starts a fresh session (Claude Code launched from a terminal, in the repo root) and pastes:

```text
Read docs/aidlc-migration/RUNBOOK.md and do exactly what it says.
```

---

## A. Rules for the agent running this file

1. **Resume, don't restart.** Read the progress table in §C. Start at the first step that is not
   `done`. Never redo a `done` step.
2. **Do the agent work yourself.** Stop only at a step or gate marked **HUMAN**, or when a tool
   refuses an action. When you stop, print a short numbered list of exactly what the human must do
   (commands to type, keys to press, what to reply), then wait. When the human says `done` (or
   answers), verify what you can, then continue.
3. **AI-DLC approval gates belong to the human.** At every gate: summarise the artifact in at most
   ten lines, say what you checked against the source documents, give your recommendation, and ask
   the human to reply `approve` or to name a change. Never approve a gate yourself. Never change
   the Guard Policy, never edit `aidlc-state.md` or audit files by hand.
4. **The decisions in §B are made.** Apply them; do not ask the human about them again. If a gate
   proposes something that contradicts §B, say so and steer it back to §B.
5. **After every step:** set its row in §C to `done` with the date and commit hash, commit (message
   `aidlc-migration: step <n> — <what>`), push `main`. Check every commit with
   `git log -1 --format='%an <%ae>%n%B'`: the human's identity only, no tool or model name, no
   `Co-Authored-By`, no "Generated with" (see `AGENTS.md`).
6. **If a permission check or hook blocks you,** stop and tell the human exactly which action needs
   approval and why. Do not route around it.
7. **Write paths under `aidlc/spaces/` literally** in shell commands (a guard hook refuses shell
   variables there), and onboard knowledge in batches of at most 20 documents.
8. Keep the human informed with one line per step: what you are doing, then the result.

---

## B. Decisions (made 2026-10-11 by delegation from the project owner)

The owner asked for these to be decided rather than left open. Step 2 records the product ones
in `docs/status/decision-log.md`; the owner can overturn any of them later.

| # | Question | Decision | Why | Applied in |
|---|---|---|---|---|
| D1 | CR-011 / `ISS-201`: relay can enqueue duplicate jobs | **Transactional relay**: enqueue with pg-boss `send(..., { db })` inside the same transaction that sets `processed_at`; keep `singletonKey`; handlers stay idempotent | Removes the duplicate window instead of narrowing it. Verified: pg-boss 12.31.0 `SendOptions = JobOptions & QueueOptions & ConnectionOptions`, `ConnectionOptions.db?: IDatabase` (`dist/types.d.ts:425,459`) | CR-011 unit |
| D2 | `ISS-158` + `ISS-176` + `ISS-221`: storyboard vs prototype data | **Correct the storyboard to match the data** (code is right): alias-isolation proof uses an anonymous review (r2/r8/r12), MOD-2041 is in the critical lane; MOD-2033's three extra reports cite `factual` so the case reads as a factual disagreement, matching its summary — verify against the prototype data before changing the seed | The prototype is the source of truth for demo data (`rogikotha-dev-spec.md`) | a small storyboard/seed unit in the delivery plan |
| D3 | `ISS-226`: seed files import `@rogikotha/database` against conventions §2 | **Allow it as a dev-only edge**: `packages/test-support/src/seed/** → database`, written into `01-conventions.md` §2 and T-010's boundary lint; nothing in `apps/*` may import `test-support` | Seeding writes the database by definition; the narrow, reversible option | T-010 unit |
| D4 | `ISS-140` / CR-006: `rk_worker` granted `auth_users(id, email)` | **Revoke** it; the worker reads recipients from `email_deliveries.to_email_enc` as designed | Matches `02-data-model.md` §16 and conventions §11 (least privilege) | CR-006 unit |
| D5 | CR-004: theme/language toggles silent to screen readers | **Localize** the announcements; draft the Bengali copy, flag it for the owner's bilingual review at the phase gate together with `ISS-050` | Equal-language rule (ADR 0011) forbids English-only strings | CR-004 unit |
| D6 | CR-007: `test:int` hang | **Queue it** | Cause known, no decision needed | delivery plan |
| D7 | `ISS-135`: Terms/Privacy reuse `nav.about` as kicker | **Keep as is** (matches the ported prototype); close as won't fix | Prototype is the visual source of truth; ships either way | step 2 |
| D8 | Model ids in committed records (`LOOP.md` §0.1 vs `AGENTS.md`) | **`AGENTS.md` wins**: no tool or model identity in any committed file from now on. Existing records are history; do not rewrite them | The owner has repeatedly asked for no attribution; AI-DLC's audit trail does not need model ids | Practices Discovery (`team.md` Forbidden) |
| D9 | Merge style (repo: `--no-ff` task merges; AI-DLC org default: squash per Bolt) | **Adopt AI-DLC's squash-per-Bolt** for new work; past merges stay | AI-DLC's Bolt merge squashes anyway; `team.md` may not contradict `org.md` | Practices Discovery |
| D10 | Coverage floor (repo: none; org default for `classic`: 80 % lines + CI before merge) | **Adopt 80 % line coverage**, per package, with Vitest `coverage-v8` (already installed); T-010 adds the thresholds and CI and raises any package below 80 % | It is the org floor for this scope and may not be weakened; CI is T-010's job anyway | Practices Discovery; T-010 unit |
| D11 | Deployment (org default: deploy on merge to staging) | **Local Docker demo only in this intent** — no staging or production; Operation phase stays out of scope (`classic` skips it) | The approved demo plan (FD-031..035) is a locally runnable demo | Practices Discovery (`project.md`) |
| D12 | Independent / cross-vendor validation (ADR 0012) | AI-DLC's reviewer agents on every stage (default); for M3 units (auth, identity, evidence, moderation, retention, deletion) also `/aidlc --collaborators on`, and a Codex `$aidlc` review when Codex is available — otherwise the human's approval at the gate is the fallback | Keeps ADR 0012's intent inside AI-DLC gates | Practices Discovery; M3 units |
| D13 | Unit ownership / execution | `solo`, serial (defaults). Never team ownership or parallel swarm while the no-identity rule stands | Avoids the tool-identity claim and swarm commits | whole intent |
| D14 | BMAD, grill-me and other planning skills, `_bmad/` | **Keep installed, not part of the process.** No deletion | User-owned and harmless; AI-DLC is the process | step 6 (README note) |
| D15 | `LOOP.md`, `NEXT.md`, `04-handoff-and-validation.md`, `08-agent-prompts.md`, `BUILD-LOG.md`, `ISSUES.md`, `handoffs/` | **Freeze** with a one-line "superseded by AI-DLC" banner; keep as history. **Except `ISSUES.md`, which stays live (FD-054)**; the delivery plan links its open `S1`/`S2` rows per unit | Nothing is lost; one process at a time | step 6 |
| D16 | `../rogikotha-gate4` worktree (275 untracked files, early Gate 4 Next.js prototype, ~21 MB, no secrets) | **Archive** to `C:\Users\BS01395\Documents\GitHub\rogikotha-archive\gate4-prototype-2026-10-11.zip`, verify the file count, then remove the worktree and the merged local branch `task/gate4-foundation` | Recoverable, keeps the repo light | step 2 |
| D17 | Impeccable agents' `display_name` | Leave it | Works under 2.11.0; reinstalling Impeccable removes it anyway | — |
| D18 | Puku CLI | Not used for AI-DLC work | No AI-DLC harness | — |
| D19 | Delivery order after migration | CR-009 (alone) → T-010 (with D3, D10) → CR-011 (D1) → CR-006 (D4) → CR-007 → D2 storyboard/seed fix → CR-004 (D5) → Phase 1 per `00-master-plan.md` §8 | Same order the old queue had; CR-009 must not share a Bolt with other `packages/database` work | Delivery Planning |

---

## C. Progress

| Step | What | Who | State |
|---|---|---|---|
| 1 | Preflight checks | agent (+ HUMAN only if a check fails) | done 2026-10-11 — 2.11.0, doctor 0 problems, hooks firing, Postgres up; Codex not used (owner, 2026-10-12) — `4f05dc0` |
| 2 | Housekeeping and record the decisions | agent | done 2026-10-11 (`4f05dc0`) — FD-038..FD-044, ISSUES/CR rows, NEXT.md; gate4 zip verified 275/275; worktree removal left to the owner (permission check blocked it) |
| 3 | Start the intent; Practices Discovery | agent + HUMAN gates | done 2026-10-15 — intent `261011-aidlc-adoption` created 2026-10-12; Practices Discovery affirmed (`c785706`) |
| 4 | Reverse Engineering | agent + HUMAN gate | done 2026-10-12 — approved; codekb in `aidlc/spaces/default/codekb/rogikotha/` (`cfa5d30`) |
| 5 | Requirements, Stories, Domain, Units, Contracts, Delivery Planning | agent + HUMAN gates | in progress — readiness check done 2026-10-23 (`docs/planning/research/aidlc-migration-2026-10-23/readiness-report.md`; owner decisions FD-045..FD-055; PRD/BRD extracted and onboarded; knowledge re-indexed under LF). Requirements Analysis next. If the engine asks to redo Reverse Engineering, answer no (FD-055) |
| 6 | Close the migration and delete this file | agent | todo |

---

## D. Steps

### Step 1 — Preflight

1. `git switch main && git pull --ff-only origin main`; working tree must be clean.
2. `aidlc --version` → 2.11.0; `aidlc doctor` → 0 problems.
3. Check the hooks are live in this session: run `/aidlc --doctor` through the `aidlc` skill and
   confirm it reports hooks active.
4. If 2 or 3 fails, **HUMAN**: tell them to (1) exit this session, (2) open a terminal in
   `C:\Users\BS01395\Documents\GitHub\rogikotha` (work PC) or `D:\git_repos\RogiKotha` (lelin-pc), (3) run
   `claude`, (4) paste the runbook line again. On a machine new to the project, run `aidlc config --pin 2.11.0`
   first, or every hook fails with "pin is not registered on this machine".
   If the first AI-DLC turn offers to write `settings.local.json` because "hooks are off", decline
   it (upstream bug #2263).
5. **HUMAN (only if they use Codex):** ask "Do you use Codex in this repo?" If yes: (1) run
   `codex` in the repo, (2) type `/hooks`, (3) press `t`, (4) press Esc, (5) type `$aidlc --doctor`,
   (6) reply `done`. If no, skip.
6. Docker Postgres up (`docker ps` shows `rogikotha-postgres-1`); if not, `pnpm infra:up`.

### Step 2 — Housekeeping and decisions

1. **D16:** create `C:\Users\BS01395\Documents\GitHub\rogikotha-archive\`, zip the untracked files of
   `..\rogikotha-gate4` (list them with `git -C ..\rogikotha-gate4 status --short -uall`) into
   `gate4-prototype-2026-10-11.zip`, confirm the zip holds the same file count (275 at the time of
   writing), then `git worktree remove --force ..\rogikotha-gate4` and
   `git branch -d task/gate4-foundation` (it is fully merged; `-d` refuses otherwise — if it refuses, stop and report).
2. **D2, D4, D5, D6, D7, D1, D3:** append one dated entry per product decision to
   `docs/status/decision-log.md` (next free `FD-` ids, after FD-037), each saying "decided by
   delegation from the owner, 2026-10-11", the decision and the reason from §B. Update the matching
   `ISSUES.md` rows' status/owner (ISS-135 → won't fix; ISS-158/176/221 → storyboard correction
   unit; ISS-226 → T-010 per D3; ISS-140 → CR-006 revoke; ISS-201..203 → CR-011 with D1) and
   `06-change-requests.md` rows (CR-004, CR-006, CR-007 → queued). Remove the answered questions from
   `NEXT.md` (keep its migration banner).
3. Commit, push.

### Step 3 — Start the intent; Practices Discovery

1. Run the `aidlc` skill with:

   ```text
   --project-type brownfield --scope classic --depth minimal --skip refined-mockups,nfr-requirements,nfr-design,infrastructure-design Adopt AI-DLC for the RogiKotha demo build already in progress. Reverse-engineer apps/, packages/ and infra/ on main. Requirements, stories, architecture, data model and contracts already exist and are authoritative: transcribe them from the knowledge documents (start with docs/planning/01-requirement-baseline.md, then 08-product-backlog.md, ARCHITECTURE-SPINE.md with ADRs 0001-0013, 02-data-model.md, 03-routes-and-contracts.md, decision-log.md FD-001 onward) instead of re-deriving them. Delivery planning continues docs/implementation/00-master-plan.md from where it stands: T-001..T-009, T-207a, D-001, CR-002/003/005/008/010 merged; next CR-009 alone, then T-010, CR-011 and Phase 1.
   ```

   If the engine rejects the combined flags, use `compose` with the same description and set the
   same EXECUTE/SKIP grid at its gate (**HUMAN** approves the grid).
2. Answer the engine's setup questions yourself from §B where they are covered. Anything not
   covered and genuinely the owner's call: **HUMAN** — ask it as one short question with your
   recommendation first.
3. **Practices Discovery:** feed it `01-conventions.md`, the `AGENTS.md` rules and §B. The affirmed
   `team.md` / `project.md` must contain: test-after with the cumulative smoke suite and integration
   tests on an isolated database (conventions, `04-handoff-and-validation.md` §3.1); D9, D10, D11;
   Code Style (Prettier, ESLint flat config with boundaries, TypeScript strict, `pnpm check` as the
   gate); Forbidden: tool/model identity anywhere (D8), real personal data (synthetic only),
   hard-coded user-facing strings; Mandated: Bengali/English parity, the dependency-check log rule,
   research before new work, `PRODUCT.md` hard rules, `docs/status/decision-log.md` decisions;
   Tech Stack with the pins from `00-master-plan.md` §3; Decided: FD-001 onward. **HUMAN gate.**
4. Commit, push, mark step 3 done.

### Step 4 — Reverse Engineering

1. Let the stage scan `apps/`, `packages/`, `infra/`. Before the gate, check its component list
   against the real tree (`apps/web`, `apps/worker`, `packages/{adapters,application,contracts,database,domain,i18n,test-support}`,
   `infra/compose`) and against `ARCHITECTURE-SPINE.md`; fix omissions through the stage, not by hand.
2. **HUMAN gate.** Commit, push, mark done.

### Step 5 — Inception stages (one gate each)

For each stage below: run it, check its output against the named source, then **HUMAN gate**,
then commit and push. Mark step 5 done only after Delivery Planning is approved.

Before each stage, give it that stage's instructions from §4 of
`docs/planning/research/aidlc-migration-2026-10-23/readiness-report.md` and the decisions FD-045..FD-055.
The two that change every stage:
- **FD-036 overlay:** keep the source text, and mark PDF, HEIC and Office intake as Phase 2.
- **Requirement meaning:** take it from `docs/planning/source-extracts/RogiKotha_PRD_v1.0.md`, never from
  the matrix labels.

The Units and Delivery inputs (`docs/implementation/README.md` §5, `06-change-requests.md`, `ISSUES.md`,
`tasks/*.md`) are not in the knowledge snapshot. Those stages read them from the repo and say so in their
gate summary.

| Stage | Must match | Check |
|---|---|---|
| Requirements Analysis | PRD extract, `01-requirement-baseline.md`, `06-requirement-traceability-matrix.md` | 115 requirements (103 FR + 12 NFR, FD-045), original IDs kept, PRD wording, nothing invented; re-keyed matrix rows listed |
| User Stories | `08-product-backlog.md` | 34 stories / 12 epics, original story IDs kept |
| Domain Design | `ARCHITECTURE-SPINE.md`, ADRs 0001–0013, `02-data-model.md` | no new architecture decision; ADRs referenced, not rewritten |
| Units Generation | `00-master-plan.md` §5/§8, task files | units follow the task graph; merged work marked complete; D19 order |
| Contract Design | `03-routes-and-contracts.md` | routes and commands transcribed, not redesigned |
| Delivery Planning | D19, open `S1`/`S2` rows in `ISSUES.md`, `06-change-requests.md` | every remaining task and decided CR has a Bolt; CR-009 alone |

Before any later Code Generation gate (not part of this runbook): delete `.vitest/`,
`*.tsbuildinfo`, `test-results/` and `.data/` caches (upstream bug #2244).

### Step 6 — Close the migration

1. **D15:** add at the top of `LOOP.md`, `NEXT.md`, `04-handoff-and-validation.md`,
   `08-agent-prompts.md`, `BUILD-LOG.md` (not `ISSUES.md`, FD-054): `> Frozen 2026-xx-xx — superseded by AI-DLC
   (see docs/aidlc-migration/README.md). Kept as history.` Remove the old migration-gate block from
   `LOOP.md` §0 and the banner from `NEXT.md`.
2. **D14:** note in `docs/aidlc-migration/README.md` §5 that BMAD/grill skills stay installed as
   optional helpers outside the process.
3. Rewrite `docs/status/current-status.md` to today's reality (code on `main`, AI-DLC intent and its
   current stage, where state lives).
4. `CLAUDE.md` (root): replace the line "Build work: start from `docs/implementation/NEXT.md` …" with
   "Build work: run `/aidlc` (it resumes the active intent)."
5. `AGENTS.md`: delete the "⚠️ STOP — AI-DLC migration pending" section (outside the AI-DLC markers only).
6. `docs/aidlc-migration/README.md`: set **Status: DONE** with the date, tick every row of its §1,
   remove its warning block, add one line naming the intent record directory.
7. Delete this file (`git rm docs/aidlc-migration/RUNBOOK.md`), commit
   (`aidlc-migration: done`), push.
8. Tell the human, in three lines: the migration is done, the intent is waiting at Construction for
   its first Bolt (CR-009), and from now on they just type `/aidlc` to continue.
