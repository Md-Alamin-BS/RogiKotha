# Risk and sequencing rationale — RogiKotha demo build

A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`).

## Heuristic

**Value-first along the patient journey** (Q1, Q8). The owner's priority is that the first release is easy to use and centred on people sharing their experiences. So the first milestone ends at the earliest point where a person can register, find a doctor, write, publish and read an experience. Everything after follows the journey outward: finding and proof, discussion, then the staff side, then data rights, then the release check.

No scoring model such as WSJF (Weighted Shortest Job First, value and urgency divided by size) is used (Q2). With one approver and one Unit at a time, a score would add work without changing the order much. Inside each milestone the order follows the dependency graph in `unit-of-work-dependency.md`.

High-risk Units on the sharing path (auth, identity, evidence intake) are not postponed: they sit where the journey needs them, with their full validation. The one validation Unit for auth (U13 T-106) runs at the start of milestone 2 (Bolt 23), after the first demo and before anything is built on top of the accounts.

## Why each milestone sits where it does

| Milestone | Why here |
|---|---|
| 1 Sign in and share | The owner's first priority. The enabling change requests come first because every database Unit needs them (CR-009), the checks must be real before feature code (T-010, CR-007), and the relay and worker boundary must hold before the first job (CR-011, CR-006). The seed expansion (CR-012, FD-089) comes before the pages so every page shows full data, and the design and motion system (T-011, FD-091) comes right after it, so every patient page is built once, on the new look. T-103 sits on this path only because T-104 and T-105 depend on it; it also gives staff their sign-in. T-405 comes before T-302 because the graph requires it. |
| 2 Find, prove and discuss | Search, evidence and discussion make shared experiences findable and trustworthy. The evidence pipeline is high risk; it starts once intake (milestone 1) is proven. |
| 3 Keep it safe | The staff side, narrowed to what release needs (FD-088). Reports need comments to exist (T-401); the staff console needs the moderation module. |
| 4 Your data | Export and deletion depend on almost every module, so they come last among features. |
| 5 Release check | Hardening, parity and the demo composition check the whole app. |

## Deviations from the graph's listed order

The order respects every dependency edge (checked: no Unit is placed before a Unit it depends on). It differs from the order the Units are listed in `unit-of-work-dependency.md`: T-011 (new) is Bolt 7, CR-004 moves to Bolt 32 (after T-011, since both touch the shell), T-106 moves to Bolt 23, T-405 comes before T-302, and the staff Units come after the patient Units. The build engine walks the Units from that graph file, not from this plan, so it may offer a different ready Unit at some point. Then the plan's order is chosen at that Unit's start. If the engine cannot take that choice, the listed order in the graph file is changed in a small Units Generation revision, and the dependencies stay the same.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| The first demo comes late: milestone 1 is 22 Units, about 70–100 agent hours plus approvals | Medium | High | smaller sub-demos along the way (the new look after Bolt 7, sign-in after Bolt 9, doctor pages after Bolt 14); one Unit per Bolt keeps every step small |
| Docker is not running on the work PC; `pnpm check` needs PostgreSQL | High today | High | start Docker Desktop before Bolt 1; `pnpm infra:up` is step 1 of every Bolt |
| The engine's walk order differs from this plan | Medium | Low | choose the plan's Unit at the start, or reorder the graph's list (see above) |
| Task-file amendments miss a contract change | Low | Medium | Bolt 0 writes them all at once against the contract summary's table; each Unit's reviewer checks the `FD-0nn:` rows |
| Narrowed staff scope (FD-088) leaves a release need unmet, for example appeals | Medium | Medium | decision notices name no appeal route; appeals are the first follow-up task after release |
| Persona-to-account linkage through outbox payloads (Contract Design review R-02, accepted at the gate) | Medium | High | covered by the adversarial tests of T-104, T-401 and T-404; revisit before release |
| The redesign misses the speed budget, found only at the end (Units review R-03) | Medium | High | T-011 records a shell baseline; T-202 (Bolt 14) and T-207 (Bolt 26) gate LCP ≤ 2.5 s and CLS ≤ 0.1 on their pages, and a miss becomes an ISSUES row before the next patient Unit; T-503 runs the full NFR13 gate |
| The look does not please the owner | Medium | Medium | the owner reviews the restyled shell at Bolt 7, before any page is built on it |
| Bengali copy quality | Medium | Medium | the owner's Bengali review at each milestone (FD-042) |
| Expanded demo data drifts from the storyboard | Low | Medium | FD-089 keeps every existing record; CR-012's acceptance rows re-run the storyboard checks |
