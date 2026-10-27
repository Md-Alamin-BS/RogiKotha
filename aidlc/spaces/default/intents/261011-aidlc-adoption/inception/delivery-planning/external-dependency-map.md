# External dependency map — RogiKotha demo build

A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`). This map lists what outside the build can hold a Bolt up. The build is otherwise AI-contained: no external API, partner or other team takes part (Q7). The services listed in `components.md` are all local.

| Dependency | Owner | Lead time | Blocks | If it slips |
|---|---|---|---|---|
| Docker Desktop running (PostgreSQL 18, Mailpit, ClamAV via `pnpm infra:up`) | owner's machine | minutes | every Bolt (`pnpm check` needs PostgreSQL) | the Bolt waits; nothing is merged without a green `pnpm check` |
| ClamAV signatures loaded | local container | first start can take several minutes | Bolt 27 (U24 T-304) | the scanner fails closed (FD-035); tests use the scripted fake until it is ready |
| Mailpit | local container | minutes | Bolts 8, 10, 19 (email flows) | email tests wait; nothing else does |
| Owner's look review of the restyled shell (FD-091) | owner | one review session | Bolt 7 (U45 T-011) | patient pages wait; the enabling and backend Units can go first |
| Owner's auth-screen review on the new look (FD-053) | owner | one review session | Bolts 9 and 10 (U9 T-102, U10 T-103) | those Units stay open; Bolts that do not depend on them can go first |
| Owner's plan and Unit approvals | owner | per Bolt | every Bolt | the Bolt waits at its approval |
| Owner's written sign-off on high-risk Units | owner | per high-risk Bolt | the milestone gate after it | the milestone gate waits |
| Owner's Bengali copy review (FD-042) | owner | one session per milestone | each milestone gate | copy stays flagged in `ISSUES.md` (S3) until reviewed |
