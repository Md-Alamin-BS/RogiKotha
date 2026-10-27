# Bolt plan — RogiKotha demo build

A **Bolt** is one build pass over one Unit of Work that ends in something that runs: a branch from `main`, the Unit built and validated, then squash-merged back as one commit named by its task id (team practices, `team-practices.md`). One Unit per Bolt (Q3), built one at a time (D13). The 45 Units and their dependencies are in `unit-of-work.md` and `unit-of-work-dependency.md`; the stories each Unit carries are in `unit-of-work-story-map.md`; the contracts between them are in `contract-summary.md`; the requirements in `requirements.md` and `stories.md`; the components in `components.md`.

Order: the patient journey first (Q1, Q8). Login and sharing an experience come first; the staff side gets only what release needs and comes after the patient side (FD-088). No scoring model (Q2): the Bolts are grouped into five milestones, each ending with something the owner can try.

## Before the first Bolt

**Bolt 0 — documentation (done in Delivery Planning).** The scope changes from Contract Design (FD-076..FD-087), Delivery Planning (FD-088..FD-090) and the redesign (FD-091) are written into the affected task files before any code (Q4), in the FD-074 format: 20 task files for FD-076..FD-090, the new T-011, T-503's performance gate, and the 11 patient UI task files (T-102, T-202, T-203, T-206, T-207, T-306, T-307, T-308, T-402, T-409, T-501), which now build on T-011 instead of the 04b styles. The expanded prototype data (FD-089) lands at the same time on its own branch, so the owner can see about 10 records per module in the prototype now.

## Definition of Done for every Bolt

Every Bolt is done only when all seven steps of the team practice have passed (`team.md`, Way of Working):

1. `pnpm check` green on the Bolt branch before building; open `ISSUES.md` rows in the Unit's area read.
2. The owner approves the code plan; the build stays inside the Unit's owned paths, adds at least one smoke assertion, and ends with `pnpm check` and `pnpm smoke` green.
3. Build and Test: a fresh `pnpm check` and the whole `pnpm smoke`; every acceptance row of the task file, including its `FD-0nn:` rows, run and recorded as expected against observed.
4. A separate reviewer reads the full diff (authorization, audit rows, Bengali/English parity, import boundaries, private data, owned paths, no tool identity).
5. High-risk Units: collaborators on, 3–5 adversarial tests by a separate agent, and the owner's written sign-off.
6. The owner approves; squash-merge into `main`, `pnpm check` on `main`, push.
7. At the end of each milestone: the owner walks the storyboard steps it unlocks in `en` and `bn` (`05-demo-storyboard.md`), and reviews the new Bengali copy (FD-042).

The column "Done when" below adds only what is specific to that Bolt.

## Milestone 1 — Sign in and share (Bolts 1–22)

Ends with the first real demo: register, sign in, find a doctor, write and publish an experience, and read it, in both languages, on the seeded data.

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| 1 | U1 CR-009 | — | `apps/web` imports `packages/database` under Turbopack | the web app can read the database at all | `pnpm dev` builds with a database import |
| 2 | U2 CR-007 | — | `pnpm test:int` finishes the same way every run | the integration suite is a trustworthy gate | two clean runs in a row |
| 3 | U3 T-010 | — | boundary lint, format check, 80% coverage floor and CI on | later Units are built under the real checks | `pnpm check` shows the new rules |
| 4 | U4 CR-011 | — | the outbox relay enqueues in the same transaction (FD-038) | events are never lost or doubled | relay test with a forced failure |
| 5 | U5 CR-006 | yes | worker has no `auth_users` grant; grants reviewed against C13/C15 and FD-080/FD-090 | the worker boundary holds before any job uses it | grant test |
| 6 | U6 CR-012 | — | storyboard corrected (FD-039) and the seed has about 10 records per module (FD-089) | every page built later has full data to show | `pnpm db:seed` counts per module |
| 7 | U45 T-011 | — | FD-091 tokens, restyled shell, CSS-first motion, reduced motion and `check:motion` in place; owner look review of the shell in `en` and `bn` | every later patient page is built on the new look, so nothing is ported twice | the restyled shell, a route transition, reduced motion on and off |
| 8 | U8 T-101 | yes | email/password, verification, reset, sessions, progressive delay, `mail.send` (FD-071, FD-072) | real accounts work end to end through Mailpit | register, verify by email, sign in |
| 9 | U9 T-102 | yes | auth screens in both languages; owner's auth-screen review passed (FD-053) | a person can create an account and sign in on the real pages | the register and sign-in screens |
| 10 | U10 T-103 | — | staff sign-in, device approval, step-up, roles; owner's auth-screen review passed (FD-053) | staff can sign in safely (needed before identity and configuration) | staff sign-in with device approval |
| 11 | U11 T-104 | yes | personas, anonymous aliases, audited reveal | anonymity holds before any review is published | two anonymous threads, two unrelated aliases |
| 12 | U12 T-105 | — | versioned settings without the retention block (FD-082) | limits and thresholds come from one place | change a setting, see its history |
| 13 | U14 T-201 | — | directory and taxonomy queries and view models, with the review-side port stubs | doctor and condition data reaches the pages | query tests on the seed |
| 14 | U15 T-202 | — | doctor index and profile pages | people can browse doctors with real data | `/en/doctors`, `/bn/doctors/…` |
| 15 | U16 T-203 | — | facility and condition pages; facility feedback never in doctor figures | the read side of the directory is complete | `/en/facilities`, `/en/topics` |
| 16 | U17 T-204 | — | add-a-doctor, claims, field changes, merges (FD-061, FD-078) | a person can add a missing doctor before writing | add-a-doctor panel |
| 17 | U21 T-301 | — | drafts, publish, projection, distributions, `repeatEpisode` flag (FD-080) | an experience can be published with every hard rule | publish from a test, read the projection |
| 18 | U23 T-303 | yes | upload to quarantine, JPEG/PNG only | files are taken in safely before the composer needs them | upload a photo, see it quarantined |
| 19 | U34 T-405 | — | in-app notifications, essential email, `queueEmail` (C2, C15) | people are told what happens to their posts | the notifications page |
| 20 | U22 T-302 | — | corrections, follow-ups, tombstones, restore | a published experience can be corrected or deleted honestly | correct and restore a review |
| 21 | U26 T-306 | — | the composer wizard at `/write` | a person can write and publish their experience | write and publish in `en` and `bn` |
| 22 | U27 T-307 | — | experience page and index | **milestone demo**: share and read | the full storyboard sharing steps |

## Milestone 2 — Find, prove and discuss (Bolts 23–33)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| 23 | U13 T-106 | yes | auth and identity negative matrix passes | the accounts built in milestone 1 resist misuse | the validation report |
| 24 | U18 T-205 | — | search with neutral ranking and `evidence_groups` (FD-084) | people find doctors in Bengali, English and Banglish | search tests |
| 25 | U19 T-206 | — | search page, filters, compare tray | search is usable on the real page | `/en/search?q=…` |
| 26 | U20 T-207 | — | Discover home page | the front door works | `/en`, `/bn` |
| 27 | U24 T-304 | yes | validate, scan (fail closed), sanitise, preview | hostile files never get through | upload a bad file, see it fail |
| 28 | U25 T-305 | yes | preview, redaction, confirmation, publication | evidence is published only as the author approved | redact and publish a photo |
| 29 | U28 T-308 | yes | evidence viewer | readers see documents with the right wording | the viewer on an experience |
| 30 | U30 T-401 | — | comments, replies, mentions, reactions, blocks | discussion works under the block rules | API tests |
| 31 | U31 T-402 | — | discussion UI | people can talk about an experience | comment and reply on a page |
| 32 | U7 CR-004 | — | localized live-region announcements (FD-042) | screen-reader users hear both languages | toggle theme and language with a screen reader |
| 33 | U40 T-501 | — | PWA shell, safe caching, sign-out purge | the app installs on a phone without caching private data | install on a phone |

## Milestone 3 — Keep it safe (Bolts 34–40)

The staff side, narrowed to what release needs (FD-088): no appeals, no bulk actions, no retention bulk tools, no staff-notification triage view.

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| 34 | U32 T-403 | — | reports, five-account and critical hides, repetition case (FD-080), one email per outcome (FD-087) | harmful posts are hidden without a classifier | five reports hide a post |
| 35 | U33 T-404 | yes | decisions, restore, enforcement, reporter restricted; appeals and bulk deferred (FD-088) | staff can act on a case with a reason and a record | decide a case |
| 36 | U35 T-406 | — | staff console shell and queue | staff work the queue on the real console | `/en/admin/queue` |
| 37 | U38 T-409 | — | personal workspace, saved, public profile (no appeal sheet, FD-088) | people manage their own posts and settings | `/en/me` |
| 38 | U29 T-309 | yes | retention policy, expiry, holds, custody, demo clock, FD-090 grants | records expire on schedule and holds really hold | move the demo clock, see expiry |
| 39 | U36 T-407 | yes | evidence quarantine with holds, provider approvals (no retention bulk, FD-088) | staff handle files and provider changes | `/en/admin/evidence`, `/en/admin/providers` |
| 40 | U37 T-408 | — | configuration view and Beta metrics (no triage view, FD-088) | the founder can tune the platform | `/en/admin/config` |

## Milestone 4 — Your data (Bolt 41)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| 41 | U39 T-410 | yes | export and deletion with the web/worker split (FD-077) and held deletions (FD-079, FD-090) | a person can take their data or leave for good | export, then delete an account |

## Milestone 5 — Release check (Bolts 42–45)

| Bolt | Unit | High risk | Done when | What shipping it proves | Demo |
|---|---|---|---|---|---|
| 42 | U41 T-502 | — | CSP, origin checks, rate limits, cookies, log scrubbing | the whole app holds under basic attacks | the hardening tests |
| 43 | U42 T-503 | — | parity, accessibility and viewport end-to-end runs | every journey works in both languages and for everyone | Playwright report |
| 44 | U43 T-504 | — | one-command demo, reset, storyboard walk-through | anyone can run the demo from a clean clone | `pnpm demo` from a fresh clone |
| 45 | U44 T-505 | — | final validation matrix and docs | the release can be signed off | the validation matrix |

## Deferred until after release 1 (FD-088)

Appeals (`appeal.file`, `appeal.decide`, `moderation.myAppealable`, the appeals lane, the workspace appeal sheet), moderation bulk preview/apply, retention bulk preview/execute and its staff controls, and the staff-notification triage view. They become follow-up tasks outside this intent.
