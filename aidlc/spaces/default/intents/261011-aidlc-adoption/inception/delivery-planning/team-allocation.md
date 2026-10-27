# Team allocation — RogiKotha demo build

A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`). A **mob** would be a group building one Bolt together; this build has none.

## Who builds

Team Formation did not run in the `classic` scope, and there is no human team (`team.md`, Way of Working; `team-practices.md`). Every Bolt is built by the developer agent (AI), one Bolt at a time (D13). Unit ownership is solo; no team owns a Unit and no Bolts run in parallel.

| Role | Who | In every Bolt |
|---|---|---|
| Builder | developer agent (AI) | writes the code plan, builds inside the Unit's owned paths, runs `pnpm check` and `pnpm smoke` |
| Tester | quality agent (AI) | Build and Test: every acceptance row run and recorded |
| Reviewer | a separate reviewer agent (AI) | reads the full diff for the review checklist |
| Adversarial tester | a separate agent (AI) | high-risk Units only: 3–5 tests that try to break the Unit |
| Specialists | collaborator agents (AI) | high-risk Units only (auth, identity, evidence, moderation, retention, deletion) |
| Approver | the owner (human) | approves each code plan and each Unit; signs off high-risk Units; walks each milestone in `en` and `bn` |

## Bolts per role

All 45 Bolts: builder, tester and reviewer as above. High-risk Bolts, with collaborators and adversarial tests: 5 (U5), 8 (U8), 9 (U9), 11 (U11), 18 (U23), 23 (U13), 27 (U24), 28 (U25), 29 (U28), 35 (U33), 38 (U29), 39 (U36), 41 (U39).

## What the owner is asked for

- A plan approval and a Unit approval in every Bolt; a written sign-off in the 13 high-risk Bolts.
- A look review of the restyled shell in Bolt 7 (T-011, FD-091), and the auth-screen review on the new look in Bolts 9 and 10 (FD-053).
- A milestone walk and a Bengali copy review at the end of each of the five milestones (FD-042).
