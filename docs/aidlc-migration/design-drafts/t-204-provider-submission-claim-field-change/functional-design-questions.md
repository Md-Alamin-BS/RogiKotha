# Functional Design — questions (U17 `t-204-provider-submission-claim-field-change`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-204-provider-submission-claim-field-change/functional-design/`. Written 2026-10-29.

Context:
- Unit U17 (kind `library`, size M in `unit-of-work.md`, L after this design, not in the high-risk class) delivers T-204 (`docs/implementation/tasks/T-204-provider-submission-claim-field-change.md`, with its FD-045..FD-075 and FD-076..FD-090 amendments) for US4.2, the Directory step of AC10.3.3 (FD-069) and the write side of AC4.1.5. Bolt 16, after U14 T-201 (Bolt 13), U15 T-202 (Bolt 14) and U16 T-203 (Bolt 15); depends on U14, U8 T-101, U10 T-103, U12 T-105 and U3 T-010 (`unit-of-work-dependency.md`). Consumers: U18 T-205, U26 T-306, U36 T-407, U39 T-410.
- Inputs read: `unit-of-work.md` (U17 and the open points carried to it: FD-061 widening, FD-067 participant, FD-069 nullable columns), `unit-of-work-story-map.md`, `stories.md` (AC4.2.1–AC4.2.5, AC4.1.5, AC4.3.2, AC10.3.3), `requirements.md` (FR13, FR15–FR21, FR23, FR25, NFR8), `components.md` (Directory), `contract-summary.md` (C7, C9, C15, the common and privacy rules), `bolt-plan.md`, `docs/status/decision-log.md` up to FD-094, `01-conventions.md` §2–§5 and §10, `02-data-model.md` §0, §4, §6, §12, §17, `03-routes-and-contracts.md` §2 and §4, `05-demo-storyboard.md` steps 23 and 26.
- Code read on `main` at `9cf860a` (T-010 merged as `14c21a9`): `packages/database/src/schema/{directory,review,notification,enums}.ts`, `repositories/{directory,not-implemented.test}.ts`, `packages/contracts/src/{schemas/directory.ts,enums.ts,errors.ts,ids.ts}`, `packages/i18n/messages/en.json`, `packages/test-support/src/{seed/seed-directory.ts,corpus/moderation.ts,corpus/doctors.ts,corpus/notifications.ts}`, `apps/web/src/proxy.ts`, `apps/web/src/components/patient/`.
- Prototype: `ui-design-prototype/shared/rogikotha-data.js` (`moderation.providers`: P-140 duplicate of d2, P-143 clean, claims C-58…C-63, field changes F-77…F-84; keys `compose.add*`, `profile.claim*`), `concepts/concept-04b-quiet-clinic-minimal/app.js` (`#claim` opens a sheet with the note only; the add-a-doctor panel), `admin/app.js` 451–525 (`renderProviders`).
- Drafts read for their ports and view models: `t-201-directory-and-taxonomy-modules` (refreshed 2026-10-29; F2, Questions 7, 9, 11, WF10), `t-101-better-auth-adapter` (refreshed 2026-10-29; `defineCommand`, `RateLimiter`, audit builders, its FD rows), `t-103-staff-access-and-devices` (capabilities), `t-105-runtime-configuration`, `t-202-doctor-index-and-profile` (Questions 9 and 10), `t-203-facility-and-condition-pages`, `t-301-review-module-core` (BR2.4, `pendingSubmissionOf`).
- Open `ISSUES.md` rows in this area: ISS-110 (status columns are text, owner T-204), ISS-162 and ISS-265 (generic submitter `shirin_88`, owner U17), ISS-168 (seeded `claimed` doctors have no claimant), ISS-179 (seed idempotency), ISS-294 (stub list).
- Owner's answers that apply: counts only, no percentages; "Deleted account" in staff views (FD-078); the no-questions instruction of 2026-10-29; parallel building of independent Units (FD-094, 2026-10-29).

## Settled before this stage

Decided by FD entries, the contracts, an earlier Unit or the owner, and not asked again.

- **Claims are decided by staff from the method and the private evidence note; no code is sent** (FD-060).
- **Protected fields**: doctor name, BMDC number, degrees (`qualifications_*`) and specialty; facility names. Schedule, fee, booking contact, languages and chamber details publish at once with history (FD-061, C7).
- **Review-side work goes through `ProfileMergeParticipant`**, declared by Directory and implemented by Review in `modules/review/profile-merge-participant.ts`, built here (FD-067, C7).
- **De-identification**: the three account columns become nullable and are set to `NULL`; a deleted account's claim ends; rows stay; staff read "Deleted account" (FD-069, FD-078). T-410 checks holds first; there are no per-row holds on these tables (FD-079).
- **Events**: the six names and payloads of C15, appended in the change's transaction; in-app notices and staff notifications are T-405's routes (C15, FD-065, FD-070). The staff triage view is deferred (FD-088), staff notifications are still created.
- **Every command**: parse → authorize → load → decide → persist, with one audit row and its outbox rows in one transaction; expected failures return `Result` (FD-076).
- **Boundaries and gate** (FD-093, D10): `application` imports only `domain` and `contracts`; `database` may not import `domain`; adapters only in `container.ts`; components import server actions only; 80% line floor per package with untested files counted; `not-implemented.test.ts` and the migration pins change with the code.
- **"Registration not verified" on every doctor** (D-003, FR16); claims never verify.
- **No new dependency.** No dependency-check entry is needed.
- **Since 2026-10-29 agents decide every open point by recommendation without asking** (the owner's instruction). Every question below is decided that way; each is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it.

## Settled in this design without a question

- **`staff_notification_kind` already has `newProfile`**: the task's enum migration is dropped (finding F10).
- **The provenance of a change is the row's `provenance` column**, not text in `reason` (finding F11).
- **The three status columns become the `submission_status` enum** in this Unit's migration (ISS-110, owner T-204).
- **Contract field names stay** (`targetId`, `mergeIntoId`, `submissionId`); their values are public ids (BR10.4).
- **A name typed once fills both name columns as written** (BR3.2), because both are `NOT NULL` and a person's name is not translated.
- **Doctor keys are this Unit's** (T-201 F2): `doctorNameKey` and `bmdcKey` in `domain`, used by the commands and the seed (BR3.3).
- **Staff proposals need a source** (AC4.1.5, handed over by T-201); who among staff may propose is Question 18.
- **The approved claimant's notices and the drafts' unblocking are proved at the event here**; the delivered notices are proved in U34 T-405's Build and Test.

## Question 1

Does a community submission **create its profile at once** (state `pending_review`, invisible) or **only when staff approve it**?

Why this is open: T-204 step 3 says approve "creates the doctor/facility `published`". But its own merge acceptance row expects the merged source's chambers to be appended and `GET /en/doctors/{oldId}` to redirect, storyboard step 23 says "merge P-140 into d2 (redirect works: old URL → new)", `02-data-model.md` §17 says community submissions start `pending_review`, and `components.md` says the same. Under create-on-approval a merged submission has no URL and no chamber (finding F1).

A. **Create the profile at submission in `pending_review`** (recommended). The profile, its chamber and its public id exist from the start; approve publishes it, reject rejects it, merge runs the normal profile merge with a redirect. Public reads already show only `published` profiles (T-201 BR1.1). The seed gives its 8 pending submissions their pending profiles. Cost: pending rows in `doctors`; every later public read (T-205's search included) must keep filtering on state, as they already must.
B. **Create on approval, as the task text says.** Simpler rows, but the submission merge only closes the submission and moves drafts; there is nothing to redirect, and storyboard step 23 and the task's merge row must be rewritten.
C. **Create on approval and drop the submission merge** (staff reject duplicates). Loses the prototype's "Merge into canonical" action on new profiles.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

FR23 and AC4.2.5 ask Admin to **merge two confirmed duplicate profiles** (reviews, tags, chambers and claims transfer; the old URL redirects). C7 only has the merge inside `decideSubmission`. How are two published duplicates merged?

A. **Add `directory.mergeProfiles {kind, sourceId, targetId, reason}`** (`providers.decide`) with a server action, using the same `planMerge` and participant (recommended). No release 1 staff screen calls it (the prototype's console has none); T-407 can add a control later. AC4.2.5 is covered fully by tests. Cost: one small command.
B. **Only the submission merge.** AC4.2.5 holds only for a pending source, which never has reviews; FR23 is partly unbuilt.
C. **Add the command and ask U36 T-407 to add a "Merge into…" control** to the providers page now. Grows a staff Unit with a screen the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

How does an old or merged profile id **redirect**? Task step 4 offers a `proxy.ts` lookup or a page-level lookup, and its acceptance row says 301.

A. **Page-level, through T-201's `directory.resolvePublicId`, answering 308 with `permanentRedirect()`** (recommended). T-202 (Question 10) and T-203 already do this; this Unit only writes redirect rows; `proxy.ts` leaves the owned paths; the acceptance row reads "308 (permanent)". Search engines treat 308 like 301.
B. **A 301 from `proxy.ts`**: a database read on every profile request before rendering, in a file that has no database access today.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

The add-a-doctor panel and field changes take the **specialty as free text**, but `doctors.specialty_id` references a taxonomy term, and the seeded changes F-77 and F-84 name specialties that are not terms. What happens to specialty text?

A. **Exact match at submission; on staff approval, find or create a canonical specialty term** through a Taxonomy operation `ensureSpecialtyTerm` on the same transaction (recommended). Staff checking the submission is the check the term needs; the term records no account (T-201 F12); `term.changed` refreshes search. Storyboard step 23 can approve F-77.
B. **Leave `specialty_id` empty until staff pick an existing term** in the console: U36 T-407 needs a term picker, and F-77/F-84 can only be rejected.
C. **Refuse submissions whose specialty is not a term**: a member who writes "Cardiology" in Bengali spelling cannot add a doctor.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

FR21, AC4.2.3 and FD-061 list **booking contact** among the facts a claimant publishes at once, but `doctors` has no column for it and no Unit adds one (finding F4).

A. **Add `doctors.booking_contact_en/bn`** in this Unit's migration, as an unprotected field and a `bookingContact` fact on the doctor profile (omitted when empty), with the label `profile.bookingContact` (recommended). T-202's facts list renders it by key.
B. **Defer booking contact to release 2** by an FD entry; AC4.2.3 holds without it.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

No screen lets an **approved claimant change their facts**; the prototype's "Is this you?" sheet shows a note only, and the approval notice says "You can now correct the facts" (finding F5). Where do claimants edit?

A. **Inside the claim sheet**: on open, `getMyClaimStateAction` returns the account's claim state; the approved claimant sees a facts editor (one row per field, add / edit / remove chamber, hide / show), with the protected-field note (recommended). No new route, no change to T-202's page, and nothing claimant-only enters the public profile view model.
B. **Server actions only**; the editor moves to release 2 by an FD entry, and the approval notice is reworded.
C. **A new workspace page `/me/profile`**: a new route and navigation entry the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

The task's rejection notices put the staff's **free-text reason** into the notice (`{reason}`), but notification params and outbox payloads may carry ids, enums and counts only (`02-data-model.md` §12, C15; finding F6). How does the person see why?

A. **A reason code** from a fixed list (duplicate, not enough to check, could not confirm, details did not match, breaks the rules, other) carried in the event and shown in the notice; staff may add a private note kept on the row (recommended). AC4.2.2's "the claimant sees the reason" holds; no content crosses into a notice.
B. **Free text in params**, as the task wrote: breaks the data rule and puts staff wording into the worker's tables.
C. **No reason in the notice**: AC4.2.2 fails.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**Facility claims**: FR25 says facility claims use public business contact or Admin-controlled evidence, but the prototype has no claim button on a facility page, and `claimed_by_account_id` is on the organisation while a page is a branch.

A. **Commands support facilities (a claim on a branch's page targets its organisation; facility name, organisation name and address changes); no facility entry point in release 1**, recorded by FD entry (c) (recommended).
B. **Add an "Is this your facility?" button** to T-203's facility page, with new copy: a screen the prototype does not have.
C. **Doctors only**; FR25's claim half moves to release 2.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

Who builds the staff list queries **`listSubmissions`, `listClaims`, `listFieldChanges`**? The repository stub names T-407; C7 names U17; T-407's task says "if T-204 did not add them, add them".

A. **This Unit, per C7**, with the staff view models U36 T-407 renders (recommended); moderators may read, only `providers.decide` acts.
B. **U36 T-407**: the staff Unit designs the queries against rows it did not write.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

The task's new keys `claim.method`, `claim.evidenceNote`, `claim.submit`, `claim.sent` go into the **`claim.*` namespace**, which holds the reviewer labels (`claim.wrongDx`…) that the composer reads by code (finding F17).

A. **Use `profileClaim.*`** for the claim form and `profileEdit.*` for the editor (recommended); the reviewer-label namespace stays clean.
B. **Keep `claim.*`** as written: a later reviewer-label code could collide with a form key.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

The claim form asks "How can we reach you to confirm?", so `profile_claims.method` (and often the evidence note) holds the **claimant's own contact details**. FD-069 keeps the rows after account deletion (finding F12).

A. **De-identification also clears `method` and `evidence_note`** (`method` becomes nullable); status, decision and reason stay (recommended). Recorded by FD entry (b) because it touches a data boundary.
B. **Keep the text**: a deleted person's phone number or email stays in the staff console indefinitely.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

FR17 says fields are **individually hideable**; T-201 reads a `hidden` flag on a field's provenance entry and leaves the writer to this Unit. Who may hide a field?

A. **The claimant hides or shows an unprotected field at once; hiding a protected field waits for staff; staff hide through a sourced proposal; the name can never be hidden** (recommended). Same rules as any change.
B. **Staff only.**
C. **Nobody in release 1**; AC4.1.3's hidden half has no writer.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

FR19 and AC4.2.4 (**profile photos**: community suggestions with an approved source, a claimed doctor's own photo) are "In", but T-204 says Phase 1 omits photos and no Unit builds them (finding F15).

A. **Move photos to release 2** by FD entry (c); every profile keeps its generated initials avatar (recommended). A photo needs a new public upload path, like the feedback screenshot that U8 T-101's draft defers.
B. **Build photo suggestions here**: an upload path, a scan, an approval queue and a staff screen, far beyond this Unit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

Only submissions have a rate (5 per day). **Claims and claimant field changes** have none in 03 or C7.

A. **Claims 5 per account per day; a claimant's field changes 30 per account per day; staff unlimited** (recommended), through the same `RateLimiter` port, refused as `rate_limited` with nothing written.
B. **No limits**; U41 T-502 adds them if its abuse tests need them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

May a staff member **decide a field change they proposed** themselves?

A. **Yes, in release 1, with both actions audited** (recommended): the demo has one Admin and one Super Admin; a four-eyes rule would stall single-staff demos.
B. **No: another staff member must decide** (four-eyes): stronger, but needs two acting staff for every sourced edit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 16

U21 T-301 blocks a draft on the author's own pending submission named by **`doctorSubmissionPublicId`**, but `profile_submissions` has no public id (finding F8).

A. **Add `profile_submissions.public_id`** (unique, backfilled) and return `{submissionPublicId}` from `submitProfile` (recommended); patient inputs keep carrying public ids only.
B. **Use the submission's UUID** in the composer: an internal id in a patient-facing payload, against `01-conventions.md` §4.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 17

Under **FD-094** the swarm builds Units that have no dependency edge between them at the same time. This Unit has no edge to U15 T-202 although it rewrites T-202's `ClaimSheet.tsx`, and none to U21 T-301 although both write `repositories/review.ts`, the review fakes, a migration (number and pins) and `not-implemented.test.ts` (finding F13).

A. **Add the edges `t-202 → t-204` and `t-204 → t-301`** to `unit-of-work-dependency.md` (or at the next Units revision) before the swarm plans its batches (recommended). Both match the serial Bolt order already (Bolts 14, 16, 17), so nothing is delayed.
B. **Leave the graph and resolve conflicts when the swarm merges**: two worktrees would pick the same migration number and both raise the same pins.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 18

FR18 and AC4.1.5 speak of **Admin- or Moderator-created sourced data**, and 03 §4 lets "claimant or staff" propose a field change, but Moderators lack `providers.decide` (T-103) (finding F22). May a Moderator propose a sourced field change?

A. **Any staff role proposes; every staff proposal pends with its source, and only `providers.decide` decides it** (recommended). FR18 and AC4.1.5 hold as written, a Moderator never publishes a fact alone, and `/admin/providers` stays read-only for Moderators because no release 1 screen offers the proposal (the command and action exist).
B. **Only `providers.decide` staff propose**: simpler, but the Moderator half of FR18 and AC4.1.5 is unbuilt and needs an FD entry narrowing them.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## If the owner changes an answer

- **Q1 → B**: no pending rows; the submission merge closes the submission and moves drafts only; storyboard step 23 and the merge acceptance row are reworded; the seed keeps submissions without profiles; FD (a) changes. **→ C**: drop the merge decision from `DecideSubmissionInput`.
- **Q2 → B**: drop `mergeProfiles`; AC4.2.5's published-duplicate half becomes a gap row. **→ C**: T-407 gains a control.
- **Q3 → B**: `proxy.ts` returns to the owned paths with a database-backed lookup; T-202 and T-203 drop their 308.
- **Q4 → B**: no `ensureSpecialtyTerm`; T-407 gains a term picker. **→ C**: submissions validate the specialty against terms.
- **Q5 → B**: no booking columns; FD (a) and AC4.2.3's coverage change.
- **Q6 → B**: the sheet keeps the claim form and states only; FD entry for the editor; `notif.claim.approved` reworded. **→ C**: a new route, owned by this Unit or U38 T-409.
- **Q7 → B** needs a new FD entry against `02-data-model.md` §12. **→ C**: AC4.2.2 becomes a gap.
- **Q8 → B**: T-203's page gains `ClaimButton` with `targetKind facility`. **→ C**: facility branches leave the commands.
- **Q11 → B**: FD (b) is dropped; `method` stays `NOT NULL`.
- **Q12 → B or C**: the `visibility` field is staff-only or removed.
- **Q13 → B**: a new Unit-sized scope; FD (c) loses its photo half.
- **Q15 → B**: `decideFieldChange` refuses `decided_by = proposed_by`.
- **Q16 → B**: no `public_id` column; T-301 reads the UUID.
- **Q17 → B**: no dependency edits; the swarm's merge order must serialise the three Units by hand.
- **Q18 → B**: BR2.4 checks `providers.decide`; an FD entry narrows FR18 and AC4.1.5 to Admin.
