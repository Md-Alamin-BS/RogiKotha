# Risk and sequencing rationale — RogiKotha demo build, release 1

Revision of 2026-11-04 for FD-105. A **Bolt** is one build pass over one Unit of Work that ends in something that runs (`bolt-plan.md`); a **batch** is a group of Bolts built at the same time, each in its own git worktree, and merged one at a time.

## Heuristic

**Value-first along the patient journey, scheduled critical-path-first.** The value judgment of Q1 and Q8 still stands: release 1 is the contribution core, centred on people sharing their experiences. FD-105 already cut the scope to that core, so the ten active Units are all on the journey, and the dependency graph in `unit-of-work-dependency.md` fixes most of the order. What remains to choose is how to use the parallel batches. The longest chain of dependent Bolts, the **critical path** (critical-path method: the chain that sets the earliest finish), is U46 → U47 → U48 → U41 → U50, about 55–75 hours on its own. Every Bolt on it starts and merges as early as possible; the shorter Bolts (U9, U11, U20, U22, U49) fill the parallel slots beside it. No scoring model such as WSJF (Weighted Shortest Job First, value and urgency divided by size) is used (Q2): with ten Units in five forced levels, a score would not change the order.

## Order against the graph

The batches are exactly the graph's five dependency levels, and no Bolt starts before every Unit it depends on is merged on `main`. Two allowed deviations from strict level-by-level work, both inside the graph: U20 (level 2) may run alongside batch 3, and U41 (level 4) starts the moment U48 merges, while U22 or U49 may still be open. Neither has an edge to the Bolts it overlaps.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Parallel merge conflicts**: Bolts in one batch append to the same registry files (`en.json`, `bn.json`, `container.ts`, the seed orchestrator, barrels, `patient.css`) and may add migrations with the same number | High | Medium | the collision rule of `unit-of-work-dependency.md`: no two parallel Units own the same path; registry files only by appending the Unit's own block; one merge at a time; every Bolt rebases on the current `main` and reruns `pnpm check` before its squash merge; a migration takes the next free number, snapshot and pinned count at rebase. A conflict outside a registry block stops the merge and becomes an `ISS-` row, never a guess |
| **U47 is XL** (14–18 h build, 3–4 h validation), the longest Bolt and on the critical path; everything in batch 3 waits on it | High | High | its Functional Design runs first and settles its open points before code; the Bolt branch commits in internal steps (module core, composer, experience page and index) so a dropped session loses little; its seams (three self-fetching slots, `isReviewAuthor`, `isReviewPublished`, the edit link) are checked at its review because U22, U48 and U49 depend on them; if it overruns by more than a day, splitting it is a Units Generation revision for the owner, not a silent change |
| **High-risk Units** U9 (auth), U11 (identity), U48 (evidence, fail closed), U41 (CSP, origin checks, cookies): a defect leaks private data or lets an account or a file through | Medium | High | collaborators on, 3–5 adversarial tests by a separate agent, T-106's auth and identity rows run in U9 and U11, agent-written sign-off labelled as delegated by the owner on 2026-11-04; U48 tested with ClamAV stopped to prove it fails closed |
| **Machine load**: three worktrees each running `pnpm check` (typecheck, Next build, the integration suite) on one 12-core PC with PostgreSQL, ClamAV and Mailpit in Docker | High | Medium | at most three Bolts at a time; one test database each (`w1`–`w3`, `w4`–`w6` spare); stagger the full `pnpm check` runs so two builds do not start together; the estimates carry a 1.2× slowdown; a timeout under load is rerun once alone before it counts as red |
| **Connection or session drops** in the middle of a Bolt | Medium | Medium | worktrees and Bolt branches survive a drop; the builder commits after each step on its branch; the record and `docs/aidlc-migration/RESUME.md` name the resume point; a resumed session rereads the record and reruns `pnpm check` before continuing |
| No CI (FD-102): a merge is only as good as the local gate | Medium | Medium | `pnpm check` on the branch and again on `main` after every merge; `pnpm smoke` cumulative; nothing pushed red |
| Docker not running; ClamAV signatures still loading when U48 starts | Medium | Medium | `pnpm infra:up` is step 1 of every Bolt; U48 uses the scripted fake until signatures load |
| Delegated approvals miss something the owner would have caught | Medium | Medium | every approval names the delegation and its recommendation; the owner can reopen any gate; Bengali copy stays flagged for the owner (FD-042) |
| The speed budget is missed on the new pages (NFR13) | Medium | Medium | U46, U47 and U20 check LCP and CLS on their pages; a miss is an `ISS-` row before the next batch; U50 runs the full gate |
| Persona-to-account linkage through outbox payloads (Contract Design review R-02) | Low in release 1 | High | only U48 adds a job in release 1; U11's and U48's adversarial tests cover the payloads |
| Release 1 has no moderation (FD-105) | Certain | Medium | it is not for unrestricted public launch; the demo marker stays visible |
| The estimate is wrong: 66–88 h assumes the size estimates hold | Medium | Medium | re-estimate after batch 1 against actual hours, and record the new finish date in the record |
