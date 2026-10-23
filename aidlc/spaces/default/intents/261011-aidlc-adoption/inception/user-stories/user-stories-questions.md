# User Stories — plan and questions

## Story plan

- **Source:** the approved backlog `docs/planning/08-product-backlog.md` (34 stories, 12 epics), checked against `requirements.md` (115 requirements with keys FR1..FR103, NFR1..NFR12).
- **Keys:** each story gets a stable key `US<epic>.<n>` in backlog order (epics numbered 1..12 as the backlog lists them), with its original `STORY-…` ID kept beside it. Criteria get `AC<epic>.<n>.<m>`. Keys are frozen once assigned (project practice).
- **Breakdown:** by epic, exactly as the backlog groups them; no story is split or merged here.
- **Priority:** MoSCoW from the requirements each story covers: Must when it covers an `In` PRD Must; Won't Have (this time) when everything it covers is deferred or out of demo scope.
- **Demo status per story:** the statuses accepted at the readiness check: STORY-PROT-002 superseded (FD-025, FD-027, FD-029); STORY-PROT-001 partial (synthetic corpus and reset in T-007/T-504; the read-only composition is deferred, ADR-0010, FD-031); STORY-PROT-003 partial (T-503 on concept 04b only); STORY-OPS-001 local subset only; STORY-OPS-002 deferred (FD-019).
- **Traceability:** every FR and NFR key maps to one or more `US` keys, or is marked Deferred or N/A with the reason (`traceability.json`).

## Question 1

The backlog gives each story one compound acceptance line. AI-DLC wants 3–6 separate Given/When/Then criteria per story, and at Requirements Analysis you chose to write them here (Q1 there). Where should the criteria come from?

A. Derive them only from sources already approved: the PRD's own "Acceptance:" lines and requirement text (with the FD decisions applied), the backlog story, and the acceptance tables in the task files. No new behaviour is invented (recommended)
B. Keep only the backlog's single acceptance line per story
C. Write fresh criteria from the requirements without using the task files
X. Other (please specify)

[Answer]: X. Other: "do aidlc way, from now on do everything aidlc way". Applied as: the criteria are written from `requirements.md` (the approved requirements, decisions applied) following AI-DLC story practice: 3–6 Given/When/Then per story, at least one error or edge case each, no new requirements, and not sourced from the old task files.

## Question 2

Who should the personas be?

A. The user types the PRD already defines (§3.1 and §3.4): visitor, patient, caregiver/family (incl. parent or guardian), doctor or facility representative claiming a profile, moderator, admin and super admin. No invented personas (recommended)
B. Fewer, merged personas (public user, provider, staff)
X. Other (please specify)

[Answer]: B

## Follow-up questions from the review

The product lead found four places where the PRD text and the approved design (routes, data model, prototype) disagree, or where a number is missing. Each answer is recorded as a decision (FD) before the stories are revised.

## Question 3

Doctor profile claim. The PRD (FR18, FR-DOC-006) has the doctor enter a code sent to a publicly listed chamber phone or professional email, with manual evidence review as fallback. The design (`03-routes-and-contracts.md`: `directory.claimProfile {method, evidenceNote}`, decided by staff with `directory.decideClaim`; storyboard step 23) has staff decide every claim from the evidence, and the demo has no SMS channel.

A. Follow the design: staff decide each claim from the submitted method and evidence; the code-by-phone/email path is deferred (recommended)
B. Follow the PRD: build the code step (email code in the demo, phone code later)
X. Other (please specify)

[Answer]: A

## Question 4

Protected profile fields after a claim. The PRD (FR19, FR-DOC-007) holds identity, BMDC number, degrees and specialty changes for Admin approval. The contract (`03-routes-and-contracts.md`) protects only `name` and `bmdc_number`.

A. Follow the PRD: degrees and specialty are protected too; Contract Design widens the protected-field list (recommended: safer for trust, small change)
B. Follow the contract: only name and BMDC number are protected
X. Other (please specify)

[Answer]: A

## Question 5

Reactions on comments. The PRD (FR77, FR-REA-001) allows Like or Dislike on a review or a comment. The data model (`02-data-model.md` line 145) and the prototype allow only Like on comments; reviews take both.

A. Follow the design and prototype: comments take Like only (recommended: the prototype is the visual source of truth)
B. Follow the PRD: comments take Like and Dislike
X. Other (please specify)

[Answer]: B

## Question 6

Sign-in brute-force numbers (FD-058). The progressive delay and the severe-activity notice need concrete values, and no source gives them. Today only a fixed limit exists (the 11th attempt in a minute is refused).

A. Make them runtime settings (FD-018 allows thresholds) with demo defaults: delay doubles from 1 s after the 3rd failed attempt in 15 minutes, capped at 30 s; 10 failures in 15 minutes count as severe and send the email/in-app notice (recommended)
B. Fixed values in code, same numbers
X. Other (please specify)

[Answer]: A
