# External dependency map — RogiKotha demo build, release 1

Revision of 2026-11-04 for FD-105. A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`). This map lists what outside the build can hold a Bolt up. The build is otherwise AI-contained: no external API, partner or other team takes part (Q7), and all services are local. No CI exists (FD-102).

| Dependency | Owner | Lead time | Blocks | If it slips |
|---|---|---|---|---|
| Docker Desktop running (PostgreSQL 18, Mailpit, ClamAV via `pnpm infra:up`) | owner's machine | minutes | every Bolt (`pnpm check` needs PostgreSQL) | the Bolt waits; nothing is merged without a green `pnpm check` |
| Test databases `rogikotha_test_w1` to `w6` | local PostgreSQL | already created | every parallel Bolt | a Bolt without its own database waits for a free slot; two Bolts never share one |
| The owner's PC staying on, awake and connected | owner | — | every batch | work resumes from the record and the Bolt branch; the finish date moves by the time lost |
| ClamAV signatures loaded | local container | first start can take several minutes | R1-6 (U48), its fail-closed tests | the scanner fails closed (FD-035); tests use the scripted fake until it is ready |
| Mailpit | local container | minutes | R1-2 (U9: confirm and reset by email) | email tests wait; nothing else does |
| The D-001 auth-screen review (FD-053) | owner, delegated to the agent on 2026-11-04 | inside U9's review | R1-2 (U9) | recorded as a delegated approval; the owner can reopen it |
| Plan and Unit approvals | owner, delegated to the agent on 2026-11-04 | per Bolt | every Bolt | the agent approves with the recommended option; it asks the owner only where it does not know the recommendation |
| High-risk sign-offs | owner, delegated to the agent on 2026-11-04 | per high-risk Bolt | R1-2, R1-3, R1-6, R1-9 merges | agent-written, labelled as delegated |
| The owner's Bengali copy review (FD-042) | owner (not delegated) | one session after release 1 | nothing in the build | new copy stays an S3 row in `ISSUES.md` until reviewed |
| Dependency-check log entries under 3 days old | the builder agent | under an hour | the first Bolt that adds or first uses a dependency (expected U48, U41) | the check runs and the entry is appended before building |
