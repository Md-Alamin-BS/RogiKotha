# Practices Discovery — Evidence (lead draft)

Brownfield run. The collaborators switch is off for the `classic` scope, so this is a lead-only draft: no support-agent contributions exist. The interview and the final integration come later; this file records what the lead draft rests on.

## Sources

### Reverse-engineering artifacts (consumed)

- `aidlc/spaces/default/codekb/rogikotha/code-structure.md`: test file kinds (`*.test.ts(x)`, `*.int.test.ts`, `*.smoke.test.ts(x)`), code patterns (Result instead of throw, stub-with-owner, allowlisted logging, `ASSUMPTION(T-xxx)` breadcrumbs, fixed module names), and an inconsistency in relative-import suffixes.
- `aidlc/spaces/default/codekb/rogikotha/technology-stack.md`: resolved tool versions (TypeScript 6.0.3, ESLint 10.10.0, typescript-eslint 8.70.0, Prettier 3.9.6, Vitest 4.1.11, `@vitest/coverage-v8` 4.1.11 installed but not configured). `eslint-plugin-boundaries` and Playwright are not installed. No CI, no cloud and no IaC.
- `aidlc/spaces/default/codekb/rogikotha/dependencies.md`: observed import edges compared with `01-conventions.md` §2. The `test-support → database` edge is the deviation that FD-040 now allows as dev-only. The worker's forbidden-import rule is checked by a grep test.
- `aidlc/spaces/default/codekb/rogikotha/code-quality-assessment.md`: 46 test files and about 174 cases. The database project resets `DATABASE_URL_TEST` and runs files serially. No coverage is measured. No boundary lint exists. Prettier is not part of `pnpm check`. There is no CI: `.github/` holds only agent persona files.
- `aidlc/spaces/default/codekb/rogikotha/architecture.md`: the code follows FD-032, FD-033 and FD-036, not the spine's older seed and stack table. AD-6, AD-7 and AD-14 are implemented for the current surface. Boundary lint and CI are planned in T-010.
- `aidlc/spaces/default/codekb/rogikotha/business-overview.md`: the build is a locally runnable demo (FD-031). Phase 0 is largely in place. Some product hard rules are already encoded in schema, contracts and tests.

### Team's written conventions (human-stated, authoritative)

- `AGENTS.md`, the text above the `BEGIN AI-DLC` marker: no agent identity anywhere; the dependency-version check and its 3-day log rule; research before implementing or changing something.
- `PRODUCT.md`, "Hard rules": twelve rules, each turned into its own ALWAYS or NEVER line in `discovered-rules.md`.
- `docs/implementation/01-conventions.md`: §1 layout, §2 dependency direction, §3 Result and commands, §6 i18n, §7 CSS port and UI checks, §10 test levels, §11 logging and secrets, §12 git, §13 definition of done, §14 hard-rule checklist.
- `docs/implementation/04-handoff-and-validation.md` §3 and §3.1: gates G1 to G5 and the cumulative smoke suite. D15 freezes this file as history, but its testing content carries into the Testing Posture.
- `docs/implementation/00-master-plan.md` §3 (version pins: Node 24.x, pnpm 11.x, TypeScript 6.x, Vitest 4.1.x, ESLint 10, `eslint-plugin-boundaries` 7.2, Prettier 3.9), §7 (the earlier per-class routing of implementer and validator sessions; replaced for this intent by D12), §8 (one branch per task from `main`, merged in dependency order) and §10 (a change to a hard rule, data boundary or founder decision needs a new FD first).
- `docs/status/decision-log.md`: FD-001 to FD-044, binding. Directly relevant here: FD-024 (equal languages), FD-031 (local composition), FD-032 (plain CSS), FD-033 (trimmed monorepo), FD-035 (fail closed), FD-040 (dev-only seed edge).
- `docs/status/dependency-check-log.md`: the newest entry is 2026-10-11 (AI-DLC 2.11.0). The most recent application-dependency entry is 2026-09-14 (T-009), older than 3 days, so the next first-time integration must re-check.
- `docs/aidlc-migration/RUNBOOK.md` §B: owner decisions D8 to D13 (below).
- `docs/architecture/decisions/0011-treat-bengali-and-english-equally.md` and `0012-require-independent-validation.md`.

### Workspace configuration inspected

- `package.json` scripts: `check = typecheck && lint && test && i18n:check && build`; `test:int` runs the database project; `smoke` runs `smoke.test` files; `infra:up` and `demo` start the local composition. There is no `format` or `format:check` and no `coverage` script.
- `eslint.config.mjs`: `recommendedTypeChecked`, three extra rules, `eslint-config-prettier` last, and the `// T-010 adds boundaries here` slot.
- `prettier.config.mjs`, `tsconfig.base.json` (strict plus four stricter flags) and `vitest.workspace.ts` (`test.projects`).
- `packages/database/vitest.config.ts` and `src/test-setup.ts`: integration tests reset `DATABASE_URL_TEST` (`rogikotha_test`, see `infra/compose/.env.example`) to an empty, migrated schema, with `fileParallelism: false`.
- `.claude/scopes/aidlc-classic.md`: `skeleton: off`.
- `aidlc/spaces/default/intents/261011-aidlc-adoption/aidlc-state.md`: Brownfield, `classic`, Depth Minimal, Test Strategy Minimal, Collaborators off, Construction unit-major, serial, checkpoints enabled.

### Git history

- `git log --oneline -40` and `git log --merges --oneline -20`. Every task and change request landed as a `--no-ff` merge commit (`Merge T-009: ...`, `Merge CR-010: ...`) from a `task/<id>-<slug>` branch: 16 task and change-request merges from T-001 onward, plus two branch-sync merges. `build/demo` was merged into `main` and retired (`17cb98b`). There are no squash merges so far.
- All 40 recent commits carry one human author identity and no attribution trailers (checked for `Co-Authored-By`, `Generated with` and `Signed-off-by`).
- Merged `task/*` branches remain locally and on `origin`. The local `task/gate4-foundation` worktree removal is still left to the owner (RUNBOOK step 2, D16).
- HEAD at drafting: `cfa5d30`.

## Interview decisions (2026-10-15)

Q4 local squash and push, no pull request (A); Q7a record then enforce coverage (A, owner asked for the recommendation); Q10 enforce `format:check` in the gate (A, owner asked for the recommendation). Q1-Q3, Q5-Q9 were settled earlier by RUNBOOK §B.

## Gate follow-up (2026-10-15)

At the approval gate the owner approved with a change: the team is AI agents directed by one owner, so the implementation and validation process must be documented. Sources read: `docs/implementation/LOOP.md` §1.2–§2, `04-handoff-and-validation.md` §3–§4, `docs/aidlc-migration/README.md` §3, §5, and `ISSUES.md` (header and columns). Answers: Q11 A (keep G1–G5, each mapped to an AI-DLC stage); Q12 A with the owner's change (`ISSUES.md` stays live, every row linked to its Unit/Bolt; this overrides migration decision 2); Q13 A (adversarial tests and owner sign-off for high-risk Units); Q14 B (plain guide at migration step 7). Landed in Way of Working and three new Mandated rules.

## After approval: model names in audit cost entries (2026-10-15)

The pre-commit check found `By Model` / `Tokens By Model` lines in AI-DLC's automatic stage-completion cost entries, written by `.claude/tools/aidlc-usage.ts`. They name models, so they conflict with the affirmed Forbidden rule on tool and model identity. The only switch is `AIDLC_DISABLE_USAGE_TRACKING=1`, which drops all cost tracking. The owner kept tracking on and kept the existing entries as append-only history. The exception was added to `AGENTS.md` and is to be added to `project.md` through the next stage's learnings step.

## Owner decisions applied (binding, not re-opened)

| # | Decision | Where it lands in the draft |
|---|---|---|
| D8 | No tool or model identity in any committed file; `AGENTS.md` wins over `LOOP.md` §0.1; existing records stay as history | Forbidden rule 1; Way of Working (commit identity) |
| D9 | Squash-merge one commit per Bolt into `main` for new work; past `--no-ff` merges stay | Way of Working |
| D10 | 80% line coverage per package with `@vitest/coverage-v8`; T-010 adds thresholds and CI and raises any package below 80% | Testing Posture (coverage bullet, stated as not yet measurable) |
| D11 | Local Docker demo only in this intent; no staging or production; Operation out of scope | Deployment, worded as a specialisation of the `org.md` default |
| D12 | Reviewer agents on every stage; collaborators on for the high-risk class; the human's gate approval is the cross-vendor fallback; no second vendor used | Way of Working |
| D13 | `solo` ownership, `serial` execution; never team ownership or a parallel swarm while the no-identity rule stands | Way of Working; Forbidden rule 10 |

Also reflected: D3 / FD-040 (the dev-only seed edge, in Code Style) and D15 (the frozen hand-off doc, used only as evidence).

## Inferences

- **Branching**: trunk-based on `main` with short-lived per-task branches. This matches the org default, so the only change D9 brings is the merge style (merge commit to squash).
- **Testing methodology**: test-after. Tests are committed with the implementation in the same task commit; conventions §10 states minimums per level, not an order. Nothing in the sources requires tests before code.
- **Gate**: `pnpm check` is the single local gate (conventions §13, gate G1). `pnpm smoke` is the regression gate (G3).
- **Deployment cadence**: none beyond the local demo; `main` after merge is what runs locally.
- **Walking skeleton**: already demonstrated by the merged Phase 0 work. The `classic` scope declares it off.

## Unresolved uncertainty

- **Coverage is not measurable until T-010 lands.** No Vitest config has a coverage block, and `domain`, `application` and `adapters` have no tests yet (`passWithNoTests`). CR-009 runs before T-010, so its Build and Test cannot verify the 80% floor. Resolved 2026-10-15 (Q7a): it records "coverage not measured yet"; enforcement starts at T-010.
- **No CI exists.** "CI execution before merge", the `classic` scope floor, starts with T-010's workflow. Until then the gate is the local `pnpm check`.
- **Boundary rules are not machine-checked yet.** They are kept by convention and by one grep test until `eslint-plugin-boundaries` lands in T-010.
- **Prettier is configured but not enforced.** No `format:check` script exists, and `pnpm check` does not run it. Resolved 2026-10-15 (Q10): T-010 adds it to the gate.
- **Integration-test isolation** is one dedicated test database reset at the start of each run, not a fresh database per run. `test:int` has a known hang (CR-007, queued per FD-043).
- **The pull-request step**: conventions §12 says "one task = one PR into `main`", while the AI-DLC Bolt merge squashes locally. Resolved 2026-10-15 (Q4): no pull request; squash-merge locally and push.
- **The fate of the old validation gates**: G2 acceptance tables, G4 review checklist, G5 phase-gate storyboard walk in both locales, and `docs/validation/` records. D12 replaces the second-vendor validator, but none of D8 to D19 says whether the human's phase-gate walk in both locales continues. Resolved (Q8): it continues as the Build and Test acceptance check.
- **Doc drift outside this stage**: the "Technical context" in `PRODUCT.md` still describes a static-prototype-only repo. It does not affect the hard rules taken from that file.
