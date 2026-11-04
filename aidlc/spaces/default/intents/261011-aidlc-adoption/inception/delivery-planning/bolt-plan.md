# Bolt plan — RogiKotha demo build, release 1

Revision of 2026-11-04 for FD-105 (release 1 is the backlog's R1 plus simple comments, 10 active Units built in parallel where they do not collide). The plan of 2026-10-27 is archived in `archive/2026-11-04-delivery-planning/`.

A **Bolt** is one build pass over one Unit of Work that ends in something that runs: a branch and git worktree from `main`, the Unit built and validated, then squash-merged back as one commit named by the Bolt slug and its task id (`team.md`, Way of Working). One Unit per Bolt (Q3). A **batch** is a group of Bolts built at the same time, each in its own worktree with its own test database (`rogikotha_test_w1` to `w6`), and merged into `main` one at a time (FD-094, `Construction Execution: swarm`). The batches follow the five dependency levels of `unit-of-work-dependency.md`; the Units, sizes and owned paths are in `unit-of-work.md`, their stories in `unit-of-work-story-map.md`, and the contracts between them in `contract-summary.md`.

No walking skeleton (the first Bolt built as the thinnest end-to-end slice): the foundation is merged and runs end to end, and the `classic` scope has `skeleton: off` (`team.md`, Walking Skeleton).

## Definition of Done for every Bolt

A Bolt is done only when all seven steps of the team practice have passed (`team.md`, Way of Working):

1. `pnpm check` green on the Bolt branch before building, against the Bolt's own test database; open `ISSUES.md` rows in the Unit's area read.
2. The code plan is approved; the build stays inside the Unit's owned paths (the shared registry files only by appending the Unit's own block), adds at least one smoke assertion, and ends with `pnpm check` and `pnpm smoke` green.
3. Build and Test: a fresh `pnpm check` and the whole `pnpm smoke`; every acceptance row of the Unit, including the `FD-0nn:` rows and any T-106 rows it took over, run and recorded as expected against observed; `ISS-` ids listed.
4. A separate reviewer agent reads the full diff (authorization, audit rows, Bengali/English parity, import boundaries, private data, owned paths, no tool or model identity).
5. High-risk Units (U9, U11, U48, U41): collaborators on, 3–5 adversarial tests by a separate agent, and a written sign-off in the Unit's record, agent-written and labelled "delegated by the owner on 2026-11-04".
6. The Unit is approved (under the owner's delegation of 2026-11-04); the branch rebases on the current `main`, takes the next free migration number if it adds one, runs `pnpm check` again, is squash-merged, then `pnpm check` runs on `main`, and `main` is pushed. One merge at a time.
7. After the last batch: the release-1 storyboard is walked in `en` and `bn` (U50); new Bengali copy stays flagged for the owner's own review (FD-042).

No CI exists (FD-102): the gate is the local `pnpm check` and `pnpm smoke`, run through the recorded verification command `pnpm infra:up && pnpm check && pnpm smoke`. The column "Done when" below adds only what is specific to each Bolt.

## Done before release 1 (merged on `main`)

| Bolt | Unit | Status |
|---|---|---|
| 0 | documentation of FD-076..FD-091 into the task files | done |
| 1 | U1 CR-009 | merged |
| 2 | U2 CR-007 | merged |
| 3 | U3 T-010 | merged |
| 4 | U4 CR-011 | merged |
| 5 | U5 CR-006 | merged |
| 6 | U6 CR-012 | merged |
| 7 | U45 T-011 | merged |
| 8 | U8 T-101 | merged (2026-11-04) |
| 32 | U7 CR-004 | merged |
| — | demo slice (FD-099..FD-101) | merged (2026-11-04), the base the active Units replace piece by piece |

## Before the first batch: Functional Design for all ten Units

Construction runs stage-major (each Construction stage runs for every Unit before the next stage), so Functional Design runs for all ten Units first, up to four at a time, each with its reviewer pass. U47's open points (`unit-of-work.md`) are settled here, before any code, because U47 is the longest Bolt and every level-3 Unit builds on its seams.

## Batch 1 — level 1 (3 Bolts in parallel)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| R1-1 | U46 directory (T-201 + T-202 + T-203) | — | directory and taxonomy modules, doctor, facility and topic pages on the module queries, FD-100 member-added doctors in the Directory module, `PublicEvidenceCount` port with its interim binding, the review-side stub (FD-067); facility feedback never in doctor figures; LCP and CLS within budget on the doctor page | the read side runs on real modules instead of the demo slice | `/en/doctors`, `/bn/doctors/…`, `/en/facilities`, `/en/topics` |
| R1-2 | U9 T-102 | yes | verify-email and reset screens, `/me/security`, masthead account entry, the gate sheet and callout; the D-001 auth-screen review (FD-053) recorded; T-106's auth rows pass | a person can create, confirm and secure an account on the real pages | register, confirm by Mailpit, sign in, sign out everywhere |
| R1-3 | U11 T-104 | yes | named and pseudonymous personas, thread-scoped anonymous alias, private linkage, no reveal; T-106's identity rows pass | anonymity holds before any review is written on it | two anonymous threads show two unrelated aliases |

Merge order: whichever finishes first; U46 is the critical-path Bolt, so it merges the moment it is ready.

## Batch 2 — level 2 (2 Bolts in parallel)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| R1-4 | U47 reviews (T-301 + T-306 + T-307) | — | review module core, composer at `/write` (mounting U9's gate and the existing evidence components), experience page and index, the three self-fetching slots, `isReviewAuthor` and `isReviewPublished`, the edit link; replaces the demo slice's review code; LCP and CLS within budget on the experience page | a person can write, publish and read an experience under every hard rule | write and publish in `en` and `bn`, read it back |
| R1-5 | U20 T-207 | — | Discover home with browse entry points (no search box while T-206 is deferred), Emergency, About; LCP and CLS within budget on the home | the front door works on the module queries | `/en`, `/bn` |

U20 can also start late and run alongside batch 3; it has no Bolt after it but U50.

## Batch 3 — level 3 (3 Bolts in parallel)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| R1-6 | U48 evidence (T-303 + T-304) | yes | upload to quarantine, JPEG/PNG only, `evidence.process` enqueued in the item's transaction, worker validate and scan, fail closed (FD-035); `PublicEvidenceCount` binding swapped; public pages show only the note and the count | hostile or unscanned files never advance | upload a photo, see it scanned; stop ClamAV, see it held |
| R1-7 | U22 T-302 | — | corrections with versions, the edited mark and `<ReviewHistory>` | a published experience can be corrected honestly | correct a review, see its versions |
| R1-8 | U49 comments (T-401 + T-402) | — | comments with one reply level and owner delete, through personas and the thread alias, behind U9's gate | people can talk about an experience | comment and reply on an experience page |

U48 is the critical-path Bolt here: U41 starts the moment U48 merges, even while U22 or U49 are still open.

## Batch 4 — level 4

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| R1-9 | U41 T-502 | yes | security headers and CSP with nonce, origin checks including U48's upload route, upload limits, cookie flags, log scrubbing | the release-1 app holds under basic attacks | the hardening tests |

## Batch 5 — level 5

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| R1-10 | U50 release check (T-503 + T-504 + T-505) | — | bilingual end-to-end walk of the release-1 storyboard with accessibility and viewport runs, deferred steps marked "release 2", one-command demo and reset, final validation matrix and docs; the full NFR13 speed gate | release 1 can be signed off and run from a clean clone | `pnpm demo` from a fresh clone, the walk-through record |

## Estimated wall-clock time

Hours of active agent work, from the size estimates in `unit-of-work.md` (build plus validation), plus the adversarial tests for high-risk Units, the serial merges (rebase, two `pnpm check` runs, about 30–45 minutes each) and a 1.2× slowdown when three Bolts share the machine. These estimates matched the merged XL Units (T-011 and T-101) when built alone.

| Step | Bolts | Critical Bolt | Wall clock |
|---|---|---|---|
| Functional Design | all 10 | U47 | 4–6 h |
| Batch 1 | U46, U9, U11 | U46 | 14–19 h |
| Batch 2 | U47, U20 | U47 | 19–25 h |
| Batch 3 | U48, U22, U49 | U48 | 11–15 h |
| Batch 4 | U41 | U41 | 6–8 h |
| Batch 5 | U50, then the Build and Test pass over all Units | U50 | 12–15 h |
| **Total** | | | **66–88 h** |

The critical path U46 → U47 → U48 → U41 → U50 is most of that total; parallel batches save time only beside it (U9, U11, U20, U22, U49). Starting on the evening of 2026-11-04 with about 12 working hours a day, release 1 is expected on **2026-11-11**; about 2026-11-09 if the build runs almost around the clock, and 2026-11-14 if U47 needs a second review round or a red check repeats.

## Deferred to release 2 (FD-105)

These Units keep their frozen IDs and are not built in this intent: U10 T-103, U12 T-105, U13 T-106 (its auth and identity rows run in U9 and U11), U17 T-204, U18 T-205, U19 T-206, U25 T-305, U28 T-308, U29 T-309, U32 T-403, U33 T-404, U34 T-405, U35 T-406, U36 T-407, U37 T-408, U38 T-409, U39 T-410, U40 T-501. With them go the release-2 parts of the active Units (the identity reveal, tombstones and restore, sanitise and preview, mentions, reactions and blocks, rate-limit tables, the PWA CSP) and the FD-088 deferrals (appeals, bulk moderation and retention tools, the staff-notification triage view).

Merged into the active Units, not built separately: U14, U15, U16 into U46; U21, U26, U27 into U47; U23, U24 into U48; U30, U31 into U49; U42, U43, U44 into U50.
