# Delivery Planning — questions

Context:
- 44 Units, one per remaining task or change request (`unit-of-work.md`); the dependency graph is in `unit-of-work-dependency.md`. This stage puts them in build order. A **Bolt** is one build pass over a piece of the work that ends in something that runs: here, one branch from `main`, squash-merged back as one commit named by its task id (team practices).
- Already decided, not asked again: one Unit at a time, no parallel work and no team ownership (D13); the walking skeleton is off, because the foundation is merged and runs end to end (team practices); the owner approves every Unit, and high-risk Units get adversarial tests and a written sign-off.
- The owner's stated priority (2026-10-27, Contract Design): the first release should be easy for people to use, and the focus is people sharing their experiences. Moderation stays in scope as planned.

## Question 1

In what order should the Units be built?

A. Value-first along the patient journey: reach the point where a person can register, find a doctor, write and publish their experience, and read it, as early as the dependency graph allows. Then discussion, notifications and the personal workspace, then reports, moderation and the staff console, then retention, export and deletion, then hardening and final validation. High-risk Units on that path are not postponed (recommended: matches the owner's priority, and every milestone ends in something the owner can try)
B. The master plan's phases in order (Phase 1 accounts, 2 directory and search, 3 reviews and evidence, 4 discussion and moderation, 5 hardening)
C. Risk-first: the high-risk Units (auth, identity, evidence, retention, deletion, moderation) as early as the graph allows, user-facing pages after
X. Other (please specify)

[Answer]: A

## Question 2

Should the order be scored with a formal model such as WSJF (Weighted Shortest Job First: value plus urgency plus risk reduction, divided by size)?

A. No. Group the Units into milestones along the chosen order and keep the dependency graph's order inside each milestone; with one person approving and one Unit at a time, a score adds work without changing much (recommended)
B. Yes, score every Unit with WSJF and order by score inside the graph's limits
X. Other (please specify)

[Answer]: A

## Question 3

How big is one Bolt?

A. One Unit per Bolt: one branch, one squash commit named by the task id, one approval (recommended: matches the team practice and keeps every change small)
B. Bundle small related Units into one Bolt (for example CR-009 + CR-007 + T-010)
X. Other (please specify)

[Answer]: A

## Question 4

Contract Design changed the scope of 15 Units (its "Task-file amendments" table, FD-076..FD-087). When are those changes written into the task files?

A. In one documentation Bolt before the first Unit, so every task file is correct before any code is written (recommended: one reviewable change, nothing forgotten)
B. Each Unit writes its own row into its task file when its Code Generation starts
X. Other (please specify)

[Answer]: A

## Question 5

Contract Design left an open question that blocks U39 (T-410) and U29 (T-309): deletion work that waits on a legal hold must run when the hold ends, and the identity step can only run in the web tier. How?

A. A narrow database function that deletes given persona links without letting the worker read them, granted to the worker (the same pattern `fn_expire_audit` uses), so the hourly job can finish held deletion steps when a hold ends; under an account hold the account still closes at once (sessions revoked, sign-in refused) while its data is kept (recommended)
B. Resume only from the web tier, when staff release a hold; holds on a pending deletion get no automatic end date
C. Treat the kept link as part of the held record and delete it together with that record's own deletion
X. Other (please specify)

[Answer]: A

## Question 6

Contract Design left an open question that blocks U21 (T-301) and U29 (T-309): drafts expire after 30 days with a warning 4 days before, but the worker has no access to `review_drafts`. How?

A. A narrow worker grant on `review_drafts` (read id, owner and expiry date; delete), with an FD entry, so the hourly job warns and purges (recommended: drafts stay encrypted, and the warning in the notification routes keeps working)
B. Treat expired drafts as gone when they are read, purge them in the web tier, and drop the 4-day warning
X. Other (please specify)

[Answer]: A

## Question 7

Is anything outside the build going to hold it up? Known so far: the owner's review of the auth screens before T-102 and T-103 close (FD-053); the owner's bilingual review of new Bengali copy at each phase gate (FD-042, ISS-050); the owner's written sign-off on each high-risk Unit; the local Docker services (PostgreSQL, Mailpit, ClamAV).

A. That is the full list (recommended)
B. There is more (please specify under Other)
X. Other (please specify)

[Answer]: A

## Question 8

What worries you most about this build, so it is tackled early?

A. That the sharing flow takes too long to become usable: put a working publish-and-read path in front of the owner as early as possible (recommended, given your priority)
B. Privacy and the hard rules: test the identity, evidence and reporter-privacy paths early
C. Bengali quality and parity: review the Bengali copy early and often
X. Other (please specify)

[Answer]: A

## Revision 2026-10-27

The workflow went back to Requirements Analysis for the owner's release-1 priorities (FD-088..FD-091). Answers 1–8 above still stand. Units Generation added U45 (T-011, the patient design and motion system).

## Question 9

Where does T-011 go in the build order, and how is the redesign kept from failing late?

A. Bolt 7, right after the seed expansion (CR-012) and before sign-in, so every patient page is built once on the new look. The owner reviews the restyled shell at Bolt 7. T-202 (Bolt 14) and T-207 (Bolt 26) gate LCP and CLS on their pages, so a speed miss shows early, and T-503 runs the full NFR13 gate. Bolt 0 also covers the 11 patient UI task files rewritten for FD-091 (recommended)
B. Build the patient pages on the old look first and restyle them all at the end
X. Other (please specify)

[Answer]: A

## Revision 2026-11-04 (FD-105)

The owner cut release 1 to the backlog's R1 plus simple comments: 10 active Units in 5 dependency levels, built in parallel where they do not collide (FD-105, FD-094). Units Generation and Contract Design were re-approved. The owner delegated approvals to the agent on 2026-11-04 (`docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`), so each question below is answered with the recommended option under that delegation; the owner can overturn any answer.

Answers 1–9 above: Q1 (value-first), Q2 (no WSJF), Q3 (one Unit per Bolt), Q7 and Q8 still stand. Q4 (Bolt 0) and Q9 (T-011) are done. Q5 and Q6 move to release 2 with U39 and U29. The earlier "one Unit at a time" (D13) is replaced by FD-094.

## Question 10

Inside the five dependency levels, which Bolts go first?

A. Critical-path-first: the chain U46 → U47 → U48 → U41 → U50 starts and merges as early as possible; U9, U11, U20, U22 and U49 fill the parallel slots beside it (recommended: the chain sets the finish date, the others do not)
B. Strict level by level: every Bolt of a level merges before the next level starts
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)

## Question 11

How many Bolts run at the same time?

A. At most three, the widest level, with the full `pnpm check` runs staggered (recommended: one 12-core PC also runs PostgreSQL, ClamAV and Mailpit; more parallel builds would slow every one of them)
B. Up to six, one per test database
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)

## Question 12

In what order are the Bolts of a batch merged?

A. One at a time, first ready first merged, except that a critical-path Bolt merges the moment it is ready; each rebases on the current `main`, takes the next free migration number, and reruns `pnpm check` before and after the squash merge (recommended)
B. All Bolts of a batch together in a fixed order at the end of the batch
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)

## Question 13

U47 reviews is XL (14–18 h build) and on the critical path. Split it?

A. Keep it as one Bolt, as Units Generation approved; settle its open points in Functional Design first, and commit in internal steps (module core, composer, experience page) on its branch; if it overruns by more than a day, propose a split as a Units Generation revision (recommended: a split now reopens two approved stages)
B. Split it now into a module Bolt and a pages Bolt
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)

## Question 14

Who signs off the high-risk Units (U9, U11, U48, U41)?

A. The agent writes the sign-off after the adversarial tests, labelled "delegated by the owner on 2026-11-04", never presented as the owner's own; the owner can reopen it (recommended: matches the delegation)
B. Hold each high-risk merge for the owner's own sign-off
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)

## Question 15

Is anything outside the build going to hold it up now?

A. Only the local machine: Docker with PostgreSQL, Mailpit and ClamAV, the six test databases, the PC staying on; the owner's Bengali copy review stays with the owner and does not block the build (recommended; see `external-dependency-map.md`)
B. There is more (please specify under Other)
X. Other (please specify)

[Answer]: A (delegated by the owner on 2026-11-04)
