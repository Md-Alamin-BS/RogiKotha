# Team allocation — RogiKotha demo build, release 1

Revision of 2026-11-04 for FD-105. A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`). A **mob** would be a group building one Bolt together; this build has none. A **batch** is a group of Bolts built at the same time in separate git worktrees.

## Who builds

Team Formation did not run in the `classic` scope, and there is no human team (`team.md`, Way of Working). AI agents do all building, reviewing and testing. Unit ownership is solo: one developer agent per Bolt, and up to three Bolts run at the same time, each in its own worktree, Bolt branch and test database (FD-094). Commits carry only the human's own git identity.

| Role | Who | In every Bolt |
|---|---|---|
| Builder | developer agent (AI), one per Bolt | writes the code plan, builds inside the Unit's owned paths in its own worktree, runs `pnpm check` and `pnpm smoke` against its own test database |
| Tester | quality agent (AI) | Build and Test: every acceptance row run and recorded as expected against observed |
| Reviewer | a separate reviewer agent (AI) | reads the full diff for the review checklist |
| Adversarial tester | a separate agent (AI) | high-risk Units only: 3–5 tests that try to break the Unit |
| Specialists | collaborator agents (AI) | high-risk Units only |
| Merge steward | the orchestrating agent (AI) | merges one Bolt at a time: rebase on `main`, next free migration number, `pnpm check`, squash merge, `pnpm check` on `main`, push |
| Approver | the owner (human), the sole approver | delegated to the agent on 2026-11-04 (`docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`): the agent approves gates and checkpoints with the recommended option and names the delegation in each approval; it still asks the owner when it does not know the recommended option or a permission is denied. The owner can take the gates back at any time ("ask me at the gates again") |

## Bolts per batch and test database

| Batch | Bolt | Unit | Builder | Test database | High risk |
|---|---|---|---|---|---|
| 1 | R1-1 | U46 directory | developer agent A | `rogikotha_test_w1` | — |
| 1 | R1-2 | U9 T-102 | developer agent B | `rogikotha_test_w2` | yes |
| 1 | R1-3 | U11 T-104 | developer agent C | `rogikotha_test_w3` | yes |
| 2 | R1-4 | U47 reviews | developer agent A | `rogikotha_test_w1` | — |
| 2 | R1-5 | U20 T-207 | developer agent B | `rogikotha_test_w2` | — |
| 3 | R1-6 | U48 evidence | developer agent A | `rogikotha_test_w1` | yes |
| 3 | R1-7 | U22 T-302 | developer agent B | `rogikotha_test_w2` | — |
| 3 | R1-8 | U49 comments | developer agent C | `rogikotha_test_w3` | — |
| 4 | R1-9 | U41 T-502 | developer agent A | `rogikotha_test_w1` | yes |
| 5 | R1-10 | U50 release check | developer agent A | `rogikotha_test_w1` | — |

"Agent A, B, C" are slots, not persistent agents: each session starts without memory and reads everything from the record. `w4` to `w6` are spare, for the adversarial testers and for a rerun while a slot's database is in use.

## High-risk sign-offs

U9 (auth), U11 (identity), U48 (evidence) and U41 (security hardening) get collaborators, 3–5 adversarial tests by a separate agent, and a written sign-off in the Unit's record. Under the owner's delegation that sign-off is written by the agent and labelled "delegated by the owner on 2026-11-04"; it is never presented as the owner's own, and the owner can reopen it.

## What stays with the owner

- Any point where the agent does not know the recommended option, or a permission is denied.
- The Bengali copy review (FD-042): the agent drafts the Bengali copy, and new copy stays flagged as an S3 row in `ISSUES.md` until the owner reviews it.
- Taking any delegated approval back, at any gate.
