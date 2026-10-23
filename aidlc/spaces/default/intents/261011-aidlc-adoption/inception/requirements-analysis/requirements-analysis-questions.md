# Requirements Analysis — Questions

Most of this stage is already decided. The 103 functional and 12 non-functional requirements come from the PRD (`docs/planning/source-extracts/RogiKotha_PRD_v1.0.md`), and the owner's decisions FD-045 to FD-055 settle what changed since. Two points are left for you.

## Question 1

The PRD gives an explicit "Acceptance:" line for only some of its 103 functional requirements. The rest are one-sentence rules (for example, FR-AUTH-004: "Email verification links expire after 24 hours and support rate-limited resend"). The User Stories stage will later write Given/When/Then criteria for each story. How should the requirements document treat requirements that have no "Acceptance:" line?

A. Keep the PRD wording as it is and leave the Given/When/Then criteria to User Stories (recommended: no new text is added to the requirements, so nothing is invented)
B. Add a derived pass/fail check to every requirement that lacks one, now
C. Add derived checks only for the high-risk groups (accounts, identity, evidence, moderation, retention, deletion)
X. Other (please specify)

[Answer]: A

## Question 2

Several of the 12 non-functional requirements are qualitative: for example NFR-006 ("keyboard, labels, focus, contrast…") and NFR-011 ("TypeScript strict mode, migrations, automated tests…"). The phase rules ask for a measurable test where possible. What should be written next to each one?

A. Keep the PRD wording and add the way the demo will check it, taken from the existing validation strategy and test plan, with no new numeric targets (recommended)
B. Keep the PRD wording only; the checks are decided later, at Build and Test
C. Propose new numeric targets for the vague ones, for your approval
X. Other (please specify)

[Answer]: A

## Requested Changes Feedback

The owner chose Request Changes at the first gate (2026-10-23) to fix the product lead's review findings (`reviews/review-01.md`). Four of them are scope decisions only the owner can make; no task in `docs/implementation/` builds these parts today.

## Question 3

FR-AUTH-005: "Unverified and inactive verified accounts are not automatically deleted by default. Super Admin may enable and configure separate cleanup policies…" No task builds the optional cleanup policy or its notices. The default (no automatic deletion) already holds.

A. Defer the optional cleanup policy and its notices to a later phase; the demo keeps "no automatic deletion" (recommended)
B. Build it: add the policy setting, the job and the in-app/email notices to the retention and notification tasks
X. Other (please specify)

[Answer]: A

## Question 4

FR-AUTH-006: sessions last 30 days and the security page lists sessions with "Sign out everywhere" (T-101, T-102). The PRD also asks for recent successful logins and failed-login alerts, which no task builds.

A. Defer recent logins and failed-login alerts; the demo ships the session list and sign out everywhere (recommended)
B. Build them: add a recent sign-ins list and failed-login alerts to T-102 and T-101
X. Other (please specify)

[Answer]: A

## Question 5

FR-AUTH-008: repeated login failures should trigger a progressive delay, a challenge (CAPTCHA) when activity looks suspicious, and an email/in-app notice when it is severe. FD-013 also says "challenge only after suspicious repeated attempts". Today T-101/T-502 build a fixed limit (the 11th attempt in a minute is refused).

A. Add the progressive delay and the severe-activity notice to T-101/T-502 now; defer the challenge to the production release, recorded as a new decision that narrows FD-013 for the demo (recommended)
B. Build all three, including a self-hosted challenge (no paid service)
C. Keep the fixed limit only and defer the rest
X. Other (please specify)

[Answer]: A

## Question 6

FR-AUTH-009: the PRD's Phase 1 recovery is a manual Admin process backed by a verified recovery phone or secondary email. FD-013 and FD-034 added self-service email reset, which T-101/T-102 build, but no decision drops the manual path and no task builds it.

A. Defer manual Admin recovery and the recovery phone/secondary email to a later phase; self-service reset covers the demo (recommended)
B. Build it: add an audited Admin recovery action and the recovery contacts to T-103
X. Other (please specify)

[Answer]: A