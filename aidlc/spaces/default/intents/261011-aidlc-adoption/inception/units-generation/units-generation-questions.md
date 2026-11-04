# Units Generation — questions

Context:
- Deployment is already fixed: one Next.js web app and one worker in a modular monolith (ADR-0001, ADR-0007), local demo only (FD-031).
- Construction runs solo and serial (D13).
- The team practices tie each Unit to a task file: Build and Test executes "every acceptance row of the Unit's task file".
- 44 pieces of work remain: T-010; T-101..T-106; T-201..T-206 and T-207 Half B; T-301..T-309; T-401..T-410; T-501..T-505; CR-004, CR-006, CR-007, CR-009, CR-011; and the storyboard/seed fix (FD-039).
- Merged: T-001..T-009, T-207 Half A, D-001, CR-002/003/005/008/010.

## Question 1

How should the remaining work be cut into Units?

A. One Unit per remaining task or change request from the master plan, 44 Units. Each keeps its task file, acceptance table, owned paths and estimate, and Construction runs design, code and test per Unit (recommended: matches the team practices and the existing plan; small, reviewable Bolts)
B. Group by phase and feature area (for example "Accounts", "Directory pages", "Reviews"), about 12 larger Units with fewer approvals but large Bolts
C. One Unit per component (13 Units), each cutting across phases
X. Other (please specify)

[Answer]: A

## Question 2

What happens to the work already merged on `main` (T-001..T-009, T-207 Half A, D-001, CR-002/003/005/008/010)?

A. It is the baseline the Units build on, not a Unit. The unit document lists it as the existing foundation, and Units depend on it implicitly (recommended: Construction never re-runs finished work)
B. List it as Units marked complete
X. Other (please specify)

[Answer]: A

## Question 3

The validation-only tasks T-106 (auth and identity negative-matrix validation) and T-505 (final validation and docs) build no feature. What are they?

A. Units of kind `spec` (they produce tests and records, no runtime), kept in the DAG after the Units they validate (recommended)
B. Fold them into the Build and Test of the Units they check, and drop them as Units
X. Other (please specify)

[Answer]: A

## Revision 1 (after review-01, Request Changes)

The reviewer's findings left four ownership choices to the owner. Each answer is recorded as an FD in `docs/status/decision-log.md`.

## Question 4

Who builds the worker's `mail.send` job? T-101 needs it for verification and reset emails, and T-405 also sends email.

A. T-101 builds it against `email_deliveries.to_email_enc`, and T-405 extends it (recommended; T-101 then depends on CR-006 and CR-011)
B. T-405 owns it, and no email is sent until T-405 lands
X. Other (please specify)

[Answer]: A (FD-071)

## Question 5

How is FD-058 (progressive delay, severe-activity email and in-app notice) split, given that T-105 and T-405 come after T-101?

A. T-101 builds the delay and the email through the `ConfigProvider` port with the FD-063 defaults, and writes an outbox event that T-405 turns into the in-app notice; T-502 adds adversarial tests only (recommended)
B. Move all of FD-058 to T-502
X. Other (please specify)

[Answer]: A (FD-072)

## Question 6

Who builds the legal-hold checks for reviews and comments (FD-064)?

A. T-309, which then depends on T-302 and T-401 (recommended)
B. T-302 and T-401, which then depend on T-309
X. Other (please specify)

[Answer]: A (FD-073)

## Question 7

Where do the acceptance rows for the scope FD-045..FD-070 changed go?

A. Amend the affected task files now, correct the contradicting text, and list the changes per Unit (recommended)
B. List the changes per Unit now and write the rows in each Unit's Functional Design
X. Other (please specify)

[Answer]: A (FD-074)

## Revision 2 (after review-02, Request Changes)

## Question 8

Who adds the calls that queue discussion and moderation email in the web tier (FD-070) inside the commands that publish those events (T-302, T-401, T-403, T-404)?

A. The publishing Units come after T-405 and call its queueing directly, so each tests its own emails end to end (recommended)
B. Publishers call a queueing port that does nothing until T-405 replaces it
C. T-405 comes after the publishers and adds the call sites in their commands
X. Other (please specify)

[Answer]: A (FD-075)

## Revision 2026-10-27 (after the Requirements, Stories and Domain revisions)

## Question 9

How does the FD-091 patient redesign (US2.4) enter the Units?

A. A new Unit U45 (T-011, kind `ui`): the design and motion system, built right after T-010 and before every patient UI Unit, which all depend on it. T-503 gains the NFR13 performance gate and the reduced-motion and motion checks. The Unit list is also reordered into the patient-journey build order; the dependencies are otherwise unchanged (recommended: one place owns the look, so no page ports the old 04b styles first)
B. No new Unit; each UI Unit restyles its own pages
X. Other (please specify)

[Answer]: A

## Revision 2026-11-04 (FD-105: release 1 in 10 Units)

Context:
- The owner chose release 1 = the backlog's R1 plus simple comments, in 10 Units, built in parallel where they do not collide (FD-105). The 9 merged Units stay as they are; Unit IDs are frozen (project.md Corrections).
- The owner's standing instruction of 2026-11-04 is to decide by recommendation and ask only on big business changes. Each answer below is the recommended option, chosen under that instruction; the owner can change any of them at the plan approval or the stage gate.
- The answers to Questions 1–9 still hold where FD-105 does not change them: one Unit per task for the Units that stay whole (Q1), merged work as the baseline (Q2), and FD-071, FD-072, FD-073, FD-074, FD-075 and FD-091 (Q4–Q9). Q3 changes: T-106 is deferred and its checks move into Build and Test (Q14), and T-505 is part of U50.

## Question 10

How are the tasks FD-105 combines represented, given that Unit IDs are frozen?

A. Five new Units take the next free IDs, U46–U50 (directory, reviews, evidence, comments, release check), with kebab-case names `u46-directory`, `u47-reviews`, `u48-evidence`, `u49-comments`, `u50-release-check`. The Units they replace keep their IDs with the status "merged into U4x (FD-105)", and their task files stay the specification of their part (recommended: no ID is renumbered or reused, and the trace from task to Unit stays readable)
B. Keep the lowest old ID of each group (for example U14 for the directory) and fold the others into it
X. Other (please specify)

[Answer]: A

## Question 11

What does the DAG list, and what happens to edges that point at merged or deferred Units?

A. The DAG lists only the 10 active Units. Merged Units are the baseline and get no edge. Every edge to a deferred Unit is cut, and `unit-of-work-dependency.md` lists each cut with how release 1 satisfies it: a constant, a dropped part, or an edge turned the other way (recommended: the swarm builds exactly the release-1 Units, and nothing waits on a release-2 Unit)
B. Keep the deferred Units in the DAG so the topology stays complete
X. Other (please specify)

[Answer]: A

## Question 12

The project rule forbids building two Units in parallel when they touch the same files. Almost every Unit appends to the i18n message files and `container.ts`, and several add a migration. What does "the same files" mean for the DAG?

A. Owned paths must not overlap between Units that run in parallel; where two Units would edit the same file, the DAG has an edge between them. A short list of shared registry files (the i18n message files, `container.ts` wiring, `data.ts` bindings, `patient.css` `added:` blocks, package barrels, the worker registry, `ISSUES.md` rows) is append-only and not owned by any Unit, so touching it is not a collision; the swarm merges one Unit at a time and each rebases first. Migrations take the next free number at merge time (recommended: this is how the 2026-10-29 parallel batches were planned, and reading the rule literally would make every Unit serial)
B. Treat every shared file as a collision and add an edge for it, so release 1 is built one Unit at a time
X. Other (please specify)

[Answer]: A. Written into `unit-of-work-dependency.md` ("Shared files and the collision rule"); listed as a point for the owner to confirm, because it reads a project rule.

## Question 13

Evidence (U48) attaches documents to a review, and the composer (U47) shows the upload. Which comes first?

A. U48 after U47. Evidence attaches to the author's own review by `review_id`, and the intake checks authorship through the review module U47 builds. U47 keeps mounting the evidence components already on `main`, and U48 replaces their internals later without editing U47's files (recommended: the authorship check on a high-risk Unit never rests on a stub)
B. U48 in parallel with U47, through an authorship port that U48 declares and a stub answers until U47 lands
X. Other (please specify)

[Answer]: A

## Question 14

What happens to the checks of T-106 (deferred) and the settings of T-105 (deferred)?

A. T-106's auth rows run in U9's Build and Test and its identity rows in U11's; its staff-access and configuration rows are deferred with T-103 and T-105. Every T-105 setting a release-1 Unit reads stays a constant: `DEFAULT_CONFIG_VALUES` through the defaults-only `ConfigProvider` U8 wired, or a named constant in its module; each is listed in `unit-of-work.md` and recorded as an `S4` row (recommended: no check is lost, and release 2 can find every constant)
B. Keep T-106 as a validation Unit after U9 and U11
X. Other (please specify)

[Answer]: A

## Question 15

How does FD-100's "Add a doctor who isn't listed" work in release 1 while T-204 is deferred?

A. The command that creates the member-added doctor moves from the demo slice into U46's Directory module, which owns the doctors and submissions tables; U47's composer calls it, and U46's pages keep the "Added by a member — not confirmed" mark (recommended: one module writes its own tables, and the T-201 review's Major 2 is closed in the same Unit)
B. Leave the demo slice's code in place until T-204
X. Other (please specify)

[Answer]: A

## Question 16

Does FD-101's free-text topic match carry into the taxonomy counting rules of U46 (T-201 review, Major 1)?

A. Yes. FD-101 is binding, and dropping the match would change the counts on pages already on `main`; dropping it later needs an FD entry first (recommended)
B. No; count only term tags and record a new FD entry
X. Other (please specify)

[Answer]: A

## Question 17

Which kind does each Unit get?

A. U9 and U20 `ui`, U11 and U41 `library`, U50 `spec`; U22, U46, U47, U48 and U49 untagged, because each carries a domain module and its pages and needs the full Functional Design set (entities, rules, functional spec and frontend components) (recommended)
B. Tag every Unit with its main kind
X. Other (please specify)

[Answer]: A

## Question 18

How much of T-503's end-to-end scope does U50 keep?

A. The release-1 storyboard parts walked in `en` and `bn` on Chromium at 360 px and desktop, axe on every walked page, keyboard runs of register, sign-in and the composer, reduced motion and `check:motion`, and the NFR13 gate on the home and experience pages (FD-091 made it a gate; removing it needs an FD). Deferred: Firefox and WebKit, the full viewport and screenshot matrix, the staff and workspace journeys, the search page, and `e2e.yml` (FD-102) (recommended)
B. Keep all of T-503's suites, with steps for deferred pages marked as skipped
X. Other (please specify)

[Answer]: A

## Question 19

What do the narrowed Units leave out where the brief did not say?

A. U9 keeps all of T-102 (its Terms and Privacy pages stay U20's, already merged). U11 also defers `identity.deidentify`, whose only caller is T-410. U22 has no review deletion at all in release 1 (deletion with comments needs the deferred tombstone). U49 shows URLs as plain text, without the warned-link step. U20 drops the home search box. U41 also defers `assertAppMode` and the per-command rate-limit table; release-1 limits are module constants on T-101's limiter. U48's pipeline ends after a clean scan; originals stay in quarantine with no expiry job until T-309, recorded as an `S4` row (recommended: each is the narrower, reversible choice)
X. Other (please specify)

[Answer]: A

## Question 20

Is U41 (security hardening) high risk?

A. Yes: it changes the session cookie attributes and guards the evidence upload route, both in the high-risk classes, so it runs with collaborators on, 3–5 adversarial tests and the owner's sign-off (recommended)
B. No, as in the earlier plan
X. Other (please specify)

[Answer]: A

## Question 21

How is the demo slice's code retired when several Units replace parts of it?

A. Each Unit retires the demo functions inside its owned paths once nothing outside them calls them, and removes only its own binding line in `data.ts`; U50 removes any demo function left without a caller (recommended: no Unit edits another Unit's files to delete code)
X. Other (please specify)

[Answer]: A
