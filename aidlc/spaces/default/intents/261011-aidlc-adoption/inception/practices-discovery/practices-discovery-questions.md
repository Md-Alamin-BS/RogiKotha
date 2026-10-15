# Practices Discovery — Questions

Brownfield run. The lead draft (`team-practices.md`, `discovered-rules.md`, `evidence.md`) already answers most of the five areas from the team's written conventions and the owner's decisions in `docs/aidlc-migration/RUNBOOK.md` §B (decided 2026-10-11 by delegation from the owner, "do not ask the human about them again"). Those answers are recorded below with their source. Only the questions the evidence and §B leave open are put to the owner.

## Way of Working

### Q1. How does finished work reach `main`?
A. Squash-merge one commit per Bolt into `main` (AI-DLC default; D9)
B. Keep `--no-ff` merge commits per task
C. Rebase and fast-forward
X. Other (please specify)

[Answer]: A — decided in RUNBOOK §B D9.

### Q2. Who owns Units and how does Construction run?
A. Solo ownership, serial execution (D13)
B. Team ownership
C. Parallel swarm
X. Other (please specify)

[Answer]: A — decided in RUNBOOK §B D13.

### Q3. How is independent validation done?
A. AI-DLC reviewer on every stage; collaborators on for high-risk (auth, identity, evidence, moderation, retention, deletion) units; the owner's gate approval is the cross-vendor fallback (D12; Codex not used — owner, 2026-10-12)
B. A second vendor's tool reviews every high-risk unit
X. Other (please specify)

[Answer]: A — decided in RUNBOOK §B D12; the owner said on 2026-10-12 that Codex is not used.

### Q4. Is a GitHub pull request opened for each Bolt, or is the squash merge done locally and pushed?
A. Squash-merge locally into `main` and push; no pull request (solo, trunk-based; `01-conventions.md` §12 "one task = one PR" is retired)
B. Open one pull request per Bolt and squash-merge it on GitHub
X. Other (please specify)

[Answer]: A — the owner chose local squash-merge and push, no pull request (2026-10-15).

## Walking Skeleton

### Q5. Build a thin end-to-end slice first? A walking skeleton is a minimal version that runs the whole way through, built first to prove the pieces connect before the real features go in.
A. No — the merged Phase 0 foundation (T-001..T-009) already runs end to end; no skeleton step in this intent; future greenfield work follows its scope's setting
B. Yes — run a skeleton checkpoint before the first Bolt
X. Other (please specify)

[Answer]: A — the `classic` scope declares `skeleton: off`, and Phase 0 already runs end to end on `main` (reverse-engineering evidence).

## Testing Posture

### Q6. When are tests written?
A. Test-after: implement each testable layer, then write and run its unit tests, integration tests on the isolated test database, and extend the cumulative smoke suite
B. Test-first (TDD)
X. Other (please specify)

[Answer]: A — `01-conventions.md` §10/§13 and `04-handoff-and-validation.md` §3.1; matches the org default for `classic`.

### Q7. What coverage floor applies?
A. 80 % line coverage per package with Vitest `coverage-v8`; T-010 adds thresholds and CI and raises any package below 80 % (D10)
B. No floor
X. Other (please specify)

[Answer]: A — decided in RUNBOOK §B D10.

### Q7a. Until T-010 adds coverage measurement, how is the 80 % floor handled?
A. Work before T-010 (CR-009) records "coverage not measured yet" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (empty `domain`/`application`/`adapters` are exempt until then)
B. Run T-010's coverage setup first, before CR-009
X. Other (please specify)

[Answer]: A — the owner asked for the recommendation (2026-10-15): record "coverage not measured yet" before T-010, enforce the floor from T-010 on.

### Q8. Does the owner's phase-gate walk through the demo storyboard in both languages continue?
A. Yes — it becomes the Build and Test acceptance check at each phase gate (`05-demo-storyboard.md`, `10-validation-strategy.md`)
B. No — the automated suites are enough
X. Other (please specify)

[Answer]: A — `docs/aidlc-migration/README.md` §5 maps the storyboard and validation strategy to Build and Test acceptance.

## Deployment

### Q9. Where does this work deploy?
A. Local Docker demo only (`pnpm infra:up`, `pnpm demo`); no staging or production in this intent; Operation out of scope (D11)
B. Deploy on merge to a staging environment
X. Other (please specify)

[Answer]: A — decided in RUNBOOK §B D11.

## Code Style

### Q10. Should formatting be enforced by the gate?
A. Yes — T-010 adds a `format:check` script (Prettier `--check`) to `pnpm check` and CI
B. No — Prettier stays an editor convenience; the linter is the gate
X. Other (please specify)

[Answer]: A — the owner asked for the recommendation (2026-10-15): T-010 adds `format:check` to `pnpm check` and CI.

## Implementation and validation (added at the gate, 2026-10-15)

The owner approved with a change: the team is AI agents directed by one owner, so the implementation and validation process must be documented in the practices. These follow-up questions settle how the old process (`LOOP.md`, `04-handoff-and-validation.md`) carries into AI-DLC.

### Q11. How do the old validation gates G1–G5 carry into AI-DLC?
A. Keep all five, each placed in an AI-DLC stage (G1 and G3 at Code Generation and Build and Test, G2 acceptance rows executed at Build and Test, G4 diff review by the AI-DLC reviewer, G5 storyboard walk by the owner at each phase gate)
B. Keep only the automated parts (`pnpm check`, smoke suite, reviewer)
X. Other (please specify)

[Answer]: A

### Q12. Where are defects tracked from now on?
A. Keep `ISSUES.md` live with S1–S4; open S1 blocks Build and Test, open S2 blocks the phase gate (changes migration decision 2)
B. Freeze `ISSUES.md`; problems live only in per-unit AI-DLC records
X. Other (please specify)

[Answer]: A, with a change from the owner: every issue is linked to its unit/Bolt, so the AI-DLC record shows which unit or Bolt had which issues.

### Q13. Extra checking for high-risk units?
A. Reviewer + collaborators + 3–5 adversarial tests written by a separate agent + the owner's written sign-off before the phase gate
B. Reviewer + collaborators only
X. Other (please specify)

[Answer]: A

### Q14. When is a plain process guide for the owner written?
A. Now (`docs/implementation/AIDLC-PROCESS.md`)
B. At migration step 7, when `LOOP.md` is retired; `team.md` only for now
X. Other (please specify)

[Answer]: B
