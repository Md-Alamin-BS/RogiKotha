# Functional Design — questions (U32 `t-403-reports-and-thresholds`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-403-reports-and-thresholds/functional-design/`. Written 2026-10-29.

Context:
- Unit U32 (kind `library` with a small UI slice, size L, **high risk**: moderation, finding F8) delivers T-403 (`docs/implementation/tasks/T-403-reports-and-thresholds.md`, with its FD-069, FD-070/FD-075, FD-080, FD-086, FD-087 and C11 amendments) for story US9.1 (AC9.1.1–AC9.1.6; FR75, FR79–FR81). It depends on U30 T-401, U22 T-302, U12 T-105, U11 T-104, U34 T-405 and U3 T-010 (`unit-of-work-dependency.md`); U33 T-404 and U41 T-502 depend on it. Bolt 34 in `bolt-plan.md`, after U27 T-307, U28 T-308 and U31 T-402, whose components it mounts the sheet in.
- Inputs read: `unit-of-work.md` (U32 and the open points naming it: recipients in payloads, web-tier email, `set-state.ts`, the repeat-episode flag, FD-069 de-identify), `stories.md` US9.1, `requirements.md` FR75, FR79–FR82, `components.md` (Moderation), `contract-summary.md` C2, C4, C9, C10, C11, C15, the decision log up to FD-094, `01-conventions.md` §2–§5, §10, §11, `02-data-model.md` §0, §6–§9, §11, §12, §16, §17, `03-routes-and-contracts.md` §2, §4, §5, `05-demo-storyboard.md` steps 15–19 and 24.
- Code read on `main` at `9cf860a` (T-010 merged as `14c21a9`): `schema/moderation.ts` (no `case_id`, no `origin`, no open-case uniqueness; `moderation_case_seq` from 2050), `repositories/moderation.ts` (stubs), `constraints.int.test.ts` and `validator-probes.int.test.ts` (worker denials on `moderation_cases` and `reports`), `migrations.int.test.ts` (9 applied), `contracts/src/schemas/moderation.ts`, `view-models/case-tray.ts`, `config-values.ts`, `enums.ts`, `errors.ts`, the `report.*` keys in `packages/i18n/messages/{en,bn}.json`, `test-support/src/seed/seed-moderation.ts`.
- Prototype: `openReport` (seven reasons, factual note, detail, the "attach privately" callout with no control, the identity note, the raw target line), the `data-report` buttons on experiences and comments only, `moderation.cases` (MOD-2041 dangerous plus spam, MOD-2038 privacy on evidence e6, MOD-2033 six factual-majority reports with `coordinated: true`, MOD-2029 a doctor profile whose note says correcting it "is a profile action"), the `report.*` copy.
- Drafts read: U8 T-101 (`defineCommand`, ports, worker subpath), U11 T-104 (`RevealTarget`, `accountsOf`, F14), U12 T-105 (always-enabled reasons, async configuration), U14 T-201 (format, document counts), U21 T-301 (`repeatEpisode`, facility publish), U22 T-302 (`setStateOn` owns every review cell, audits threshold hides as `system`), U24 T-304 (Question 19 gives ISS-164 to this Unit), U27 T-307 (disabled Report control). U30 T-401 and U34 T-405 have no draft; their task files were read.
- Owner's answers read in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`: counts only; masked own email; "Former member"; release 1 settings narrowed; limited-data threshold 2–50; lawful-access text on Terms and Privacy; facility criteria model; one hospital name per branch; no public anonymity caveat; FR46 checkboxes deferred; text-only feedback; separate mail-only worker key; and the no-questions instruction of 2026-10-29.
- Open `ISSUES.md` rows in this area: ISS-164 (auto-hidden evidence has no state, re-owned here by T-304 Question 19), ISS-174 (fixed in CR-008), ISS-079 (always-enabled reasons, closed by U12), ISS-259 (prototype reporter notice n8), ISS-261 (r6's author in the storyboard, the owner's), ISS-294 (stub test).

## Settled before this stage

Decided by FD entries, the contracts, an earlier Unit or the owner, and not asked again.

- **No automated classification; five distinct confirmed accounts; logged restore** (FD-009, FD-017). Every hide follows a human report.
- **Critical reasons are `privacy`, `threat`, `unsafeFile`** (`02-data-model.md` §0, `CRITICAL_REPORT_REASONS`); `factual` never auto-hides (FR81).
- **The threshold and SLA come from `thresholds`** (`fiveAccountHide` 2–50, `criticalHours`, `standardDays`), read with `await config.current()` (FD-018, U12 Question 2). Release 1 adds no setting (the owner's answer): the coordination windows and the rate limit are code constants.
- **`privacy`, `threat`, `unsafeFile`, `dangerous`, `other` are always enabled** (U12 T-105 BR1.4, closes ISS-079).
- **The deciding command queues the one email and notice; `setState` is silent** (FD-087). `report.file` queues for a hide and for an opened case; the in-app notice comes from `report.filed` through U34's routing.
- **The reporter gets nothing and appears nowhere** (FD-086): no notice, no email, no id in any payload, view model or log.
- **The repetition case is opened by the worker with a narrow grant** (FD-080): `origin`, SELECT/INSERT/UPDATE on `moderation_cases`, USAGE on the sequence, nothing on `reports` or `appeals` (FD-092).
- **De-identification is U33's** (FD-069, FD-078): it clears `reporter_account_id`, makes the column nullable, and the counts stay as counted.
- **U22's `setStateOn` owns every review cell**, including `hideThreshold` and `hideCritical`, audited as `system` (T-302 draft Question 11, F6). This Unit calls it and does not edit `set-state.ts`.
- **`facilityReview.setState` is built here** (C9).
- **Decision notices carry no appeal route** (FD-088); appeals are not built in release 1.
- **Counts only, no percentages** (the owner's answer): nothing here shows a count to an author or the public.
- **T-010 boundaries and gate** (FD-093, D10).
- **Since 2026-10-29 agents decide every open point by recommendation without asking** (the owner's instruction). Every question below is decided that way and is listed in `OWNER-REVIEW-QUEUE.md` when the stage finalises it.

## Settled in this design without a question

- **`dangerous` counts toward the threshold.** AC9.1.4 says every eligible reason except factual; until the threshold, the comment shows the dangerous-advice warning through `ModerationSignals`. FR75's switch for that visibility policy is not a release 1 setting.
- **Both coordination heuristics apply** (components.md's 3-in-10-minutes rule and T-403's same-week rule, which the MOD-2033 fixture needs). The signal is monotonic and never hides.
- **The case code sequence stays `moderation_case_seq` from 2050** (F11): the seed ends at MOD-2047.
- **The target's internal id never crosses the wire**: inputs carry public ids.
- **One `not_found` for every unreportable target**, so the command is no existence oracle; `report.status` never errors.
- **Hides caused by reports are audited as `system`** on the target's stream and as `system:auto` on the case stream, matching the prototype's audit log.
- **Radio semantics for the reason chips** (`role=radiogroup`, `role=radio`, `aria-checked`, arrow keys) instead of the prototype's `aria-pressed`, for WCAG 2.2 (D-007); the class names stay `.opt`.
- **The existing duplicate message stays** (F21).
- **`queue` and `getCase` stubs are relabelled T-404** (C11 gives them to U33; ISS-091 precedent).

## Question 1

How are reports counted toward a hide? `reports` has no link to a case, so "distinct reporters" today means every report ever filed on the target.

A. **Per case: `reports.case_id`, counts kept by increment, a decided case never reused** (recommended). After a moderator restores content and the case is decided, the next report opens a new case that counts only its own reports; each account still reports a target once ever. A case can list its reports for U33's reveal (T-104 F14). Costs one column, a backfill and an index.
B. **Per target, all time.** No schema change, but one new report after a restore brings the count back over the threshold and re-hides the content at once (finding F3); a moderator's restore would not stick.
C. **Per target since the last decision**, by comparing report times with the case's decision time. No column, but the window logic is easy to get wrong and U33's reveal still cannot name a case's reports.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

Which reports count toward the five-account threshold?

A. **The case's reports whose reason is not `factual`** (recommended). Factual reports still open and update the case and show in its chips, but four spam reports plus any number of factual ones never hide anything (AC9.1.5).
B. **All distinct reporters, whenever the current report is not factual** (the task's literal `hideDecision`). Four spam and one factual report, then any non-factual report, hides: disagreement pushes content over the line (finding F4).
C. **Only reports that share one reason.** Stricter, but five accounts reporting the same post for spam, harassment and hate would never hide it, which FD-017 does not intend.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

How is an evidence item hidden on a privacy or unsafe-file report (ISS-164)? `evidence_state` has no hidden value, and the item has its own processing state machine.

A. **New `evidence_items.hidden_at` and `hidden_reason_code`, written only by an Evidence internal that moderation calls; every public evidence read requires `published` and `hidden_at is null`** (recommended). The pipeline and retention tables stay as they are; the hide is reversible by U33's restore. Every public reader (viewer, file route, document counts, search) must use the predicate (§ 18 lists them).
B. **A new `evidence_state` value `hidden_pending_review`.** Mixes visibility into the processing machine; retention's `published → original_expired` and the worker pipeline would need new cells.
C. **Hide the whole review when its document is reported.** Simple, but it removes a whole experience for one attachment.
D. **No automatic hide for evidence; open a critical case only.** Breaks the hard rule that a privacy leak or unsafe file hides on the first credible report.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (b))

## Question 4

What happens when a doctor profile is reported? FD-087 already says a profile target gets no notice.

A. **The command accepts doctor profiles, opens or updates a case (critical lane for a critical reason), and never hides the profile** (recommended). Profile facts are directory data; the prototype's MOD-2029 note says correcting them "is a profile action, not a content action". A branch cannot be reported in release 1.
B. **Profiles hide like content.** One privacy report would take a doctor's page, and every experience's context, offline.
C. **Refuse profile targets in release 1.** Simplest, but FR79 lists profiles and the seed already has a profile case.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (a))

## Question 5

Where does the report control appear? The prototype has it on experiences and comments only; the task adds evidence items and a profile button only if the prototype has one (it does not).

A. **Experiences, comments and published evidence items** (recommended). Matches the task and the evidence case MOD-2038; the evidence viewer gains a small `review.report` link per item. Facility feedback and doctor profiles stay reportable by the command but have no control in release 1.
B. **Experiences and comments only**, as the prototype. Evidence is then reported through its experience, and "unsafe file" hides the whole experience.
C. **All five kinds.** Adds two controls the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (c))

## Question 6

The sent message reads "Report sent. You will be told the outcome, without private enforcement details." FD-086 says the reporter gets no notice.

A. **Reword it: "Report sent. A moderator will look at it. To keep you private, we do not send updates about reports."** (recommended), in both languages, in the prototype and the message files; the Bengali goes to the owner's copy review.
B. **Keep the prototype's copy.** It promises something the product never does.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (c))

## Question 7

The default configuration enables all 13 reasons, so the sheet shows "Threat or harassment" (the critical `threat`, which hides on one report) beside "Harassment", and "Spam or duplicate" beside "Duplicate". The prototype also prints the raw target (`account:r1`).

A. **Relabel `threat` "Threat to someone's safety" and `spam` "Spam"; show a localised target line ("You are reporting this experience / comment / document")** (recommended). Harassment then waits for five accounts, as FD-017 intends; no option overlaps.
B. **Show only the prototype's seven reasons plus Other.** Hides six reasons AC9.1.1 lists.
C. **Keep the labels.** Plain harassment hides on one report (finding F7).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (c))

## Question 8

The sheet's "Attach something privately — Only moderators see this" callout has no control in the prototype; the schema has `reports.evidence_note` (text).

A. **A second optional textarea, labelled by `report.evidence` with `report.evidenceNote` as its hint, stored in `evidence_note`** (recommended). Text only, matching the owner's text-only answer for feedback; no file storage for reports.
B. **Keep the callout without a control.** It invites something the reporter cannot do.
C. **Drop the callout.** Loses the private channel the prototype offers.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

C11 says `report.file` requires a verified account. May a restricted, suspended or banned account with a live session report?

A. **No: add `notRestricted`** (recommended). An enforcement for abusive reporting would otherwise not stop it; the account's existing reports still count. Their message keys come from U33's actor resolution.
B. **Yes, as C11 reads.** A restricted account keeps the ability to report harassment, but also to keep weaponising reports.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (a))

## Question 10

What if the reporter is the target's author?

A. **Allow and count it, but send no author notice or email** (recommended). An author can flag their own privacy slip at once; omitting `affectedAccountId` keeps the reporter's id out of `report.filed` (finding F10).
B. **Refuse with a new error `moderation.own_content`.** Needs a new code in 03 §2 and leaves the author only delete.
C. **Allow and notify the author.** Puts the reporter's own id in the payload, against FD-086.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

A review may have an open repetition case (FD-080) when someone reports it.

A. **Separate cases: the open-case key includes `origin`** (recommended). The repetition case keeps `report_count` 0 and its flag meaning; reports open their own case. The queue may show two cases on one review.
B. **Reports join the open repetition case.** One case per review, but its counts and lane then mix two meanings, and the "no hide" rule of the repetition case would block threshold hides.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (a))

## Question 12

`RevealTarget` for `report` resolves one report row, but a case can hold many (T-104 F14).

A. **This Unit gives U33 `reportRefsOf(caseId)` (report id, reason, time; never the reporter); U33's `revealReporter` names one report** (recommended). U33 keeps its "first report" default or lets staff pick; each reveal is one audited row.
B. **Reveal every reporter of a case at once.** One action exposes many people.
C. **Always the first report, with no way to choose.** Simple, but a staff member investigating a later report cannot reach it.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

When a standard case becomes critical (a later critical or dangerous report), what is its due time?

A. **The earlier of the current due time and now + `criticalHours`** (recommended). A critical report is never given more than 24 hours, and an upgrade never extends a due time.
B. **Keep the original due time.** A critical report could wait three business days.
C. **Recompute from `opened_at`.** A case opened two days ago becomes overdue at once.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

The task lets T-403 add `hideThreshold`/`hideCritical` to `comment.setState`, which T-401 builds.

A. **T-401 builds every event, as T-302 does for reviews; T-403 only calls it** (recommended). One owner per file; no parallel edits (FD-094). If T-401 merged without them, this Unit adds them as a recorded addition.
B. **T-403 adds the two events.** Two Units edit one file.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

`facility_reviews` has no `hidden_at` or `hidden_reason_code`; `reviews` has both.

A. **Add both columns, written only by `facilityReview.setState`** (recommended). The facility hide and U33's restore work as for reviews.
B. **Change only the state.** U33 loses the hide time and reason on facility feedback.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; FD entry (b))

## Question 16

What is a business day for the standard SLA?

A. **Sunday to Thursday in Asia/Dhaka (UTC+06:00), public holidays ignored**, marked `ASSUMPTION(T-403)` (recommended). Matches the Bangladesh working week; a holiday list would be a new setting, which release 1 does not add.
B. **Sunday to Thursday plus a configured holiday list.** A new setting.
C. **Calendar days.** Simpler, but "three business days" (FR82) would read three days.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 17

When one report both opens the case and hides the content (a first critical report), FD-087 allows one notice and one email. Which?

A. **"Hidden pending review"** (recommended). It tells the author what actually happened to the post.
B. **"Content reported".** Understates what happened.
C. **A combined message key.** One more key in both languages for no gain.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 18

Storyboard step 16 reports comment `k3`, which the seed already hides under MOD-2041 with reports from `reporter_1` and `reporter_2` (finding F1).

A. **Point step 16 at `k1` (published on r1, no case)** (recommended). Corrects the storyboard to match the data, as FD-039 rules; the five-account flip, the duplicate and the factual report all demonstrate as written.
B. **Change the seed so `k3` is published and MOD-2041 has no reports.** Breaks the prototype's MOD-2041, which the queue steps use.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Decided under the owner's no-questions instruction of 2026-10-29

| Q | Decision | Changes | FD entry |
|---|---|---|---|
| 1 | per-case counting with `reports.case_id` | schema, FR81 reading | (a) |
| 2 | factual reports never count | FR81 reading | (a) |
| 3 | evidence `hidden_at` | data model, hard-rule coverage, ISS-164 | (b) |
| 4 | profiles never auto-hide | FR81 for profiles | (a) |
| 5 | controls on experiences, comments, evidence | AC9.1.1 entry points | (c) |
| 6 | sent message reworded | prototype copy | (c) |
| 7 | labels split, target line localised | prototype copy | (c) |
| 8 | private note as text | — | — |
| 9 | `notRestricted` | C11 requirement | (a) |
| 10 | self-report counted, no author notice | — | — |
| 11 | separate repetition and report cases | schema key | (a) |
| 12 | `reportRefsOf` for U33 | C11 internal | — |
| 13 | earlier due time on upgrade | — | — |
| 14 | T-401 builds every comment event | U30 scope | — |
| 15 | facility-review hide columns | data model | (b) |
| 16 | Sunday–Thursday, Dhaka, no holidays | — | — |
| 17 | "Hidden pending review" when both | — | — |
| 18 | storyboard step 16 → `k1` | storyboard (FD-039 rule) | — |
