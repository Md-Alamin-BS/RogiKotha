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
