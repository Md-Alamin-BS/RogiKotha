# RogiKotha AI-DLC migration: readiness report for Requirements Analysis through Delivery Planning

> **Owner answers, 2026-10-23:** Q1 and Q2 PRD text, 115 requirements (FD-045). Q3 retire FR-COM-003 (FD-046). Q4 email categories in Phase 1 (FD-047). Q5 to Q14 recommendations accepted (FD-048 to FD-055, and the stage instructions in section 4). Q15 (gate4 worktree on the work PC) is unconfirmed and left pending.
>
> Blocker fixes applied the same day: B1, the PRD and BRD extracted to `docs/planning/source-extracts/` and onboarded as knowledge. B2, the runbook count check is now 115. B3, the decision-log knowledge copy was refreshed. B4 and B5 are stage instructions (section 4).
>
> Method: read-only check by six area readers, each finding re-checked independently against the cited files, then a synthesis. Run on `main` at `c785706`.


## 1. Overall verdict

**The remaining Inception stages cannot transcribe the documents as they are.** Most counts check out. Two problems would still make the stages write wrong content, and neither is covered by RUNBOOK §B:

- **Requirement wording would be wrong.** In the traceability matrix, the short "Confirmed outcome" label for many requirements says something different from what the PRD says for that ID. The PRD itself (a .docx) is the one source the knowledge base cannot read.
- **Decisions and scope would be wrong.** The knowledge copy of the decision log stops at FD-037. The FD-036 images-only rule and the later superseding decisions are not written into the baseline, the backlog or the spine.

Three things must happen before Requirements Analysis:
1. Make the PRD text readable to the stages.
2. Refresh the decision-log copy in the knowledge set.
3. Get the owner's answers to Q1–Q4 below.

Everything else can be handled through instructions to each stage, or answered at the later gates.

Re-checked for this report (read-only; the scratch extraction was kept outside the repo and deleted afterwards):
- The PRD has 103 FR + 12 NFR. The three IDs missing from the matrix are FR-A11Y-001, FR-I18N-001 and FR-I18N-002.
- The knowledge decision log has 37 FD rows; the original has 44.
- I compared PRD text with matrix labels for FR-AUTH-003/004/009, FR-NOT-002, FR-MOD-008, FR-REV-006, FR-USER-003 and NFR-008/009/011/012.
- Confirmed: admin has no `retention.bulk` in the code; `DecideCaseInput` is strict; the worker grants go beyond §16; email-category preferences exist in the code.
- The engine is still holding its "redo Reverse Engineering?" question.

## 2. Blockers

**B1. Many matrix labels give the wrong meaning for their ID, and the PRD text is not readable by the stages.**
- At least 35 rows are confirmed wrong; the checker estimated about 45. Examples:

  | ID | Matrix label | PRD meaning |
  |---|---|---|
  | FR-AUTH-003 (`06-requirement-traceability-matrix.md:16`) | "Confirmation and resend" | Argon2id passwords |
  | FR-AUTH-009 (`:22`) | "Role/capability enforcement" | manual admin recovery |
  | FR-NOT-002 (`:91`) | "Email notification preferences" | general email notifications are future scope |
  | NFR-008, NFR-009, NFR-011, NFR-012 (`:121-125`) | Security, Auditability, Backup, "Synthetic demo safety" | SEO, Scalability, Maintainability, Recoverability |

- The backlog's "Sources" lines inherit the same drift: `08-product-backlog.md:117` (FR-REV-006), `:273` (FR-MOD-008), `:320` (FR-USER-003).
- The PRD and BRD are `unsupported_type` in the catalog (`documentkb/01a12a9c-4a9d-…/metadata.json`). The baseline only cites ID ranges (for example `01-requirement-baseline.md:41`). So the wrong labels are the only per-ID meaning the stages can see.
- **Fix:**
  - Make the PRD readable: configure a docx extractor for aidlc-knowledge and sync, or onboard a plain-text extraction of the PRD.
  - Requirements Analysis takes each ID's wording from the PRD, with FD overrides applied (for example FD-013/FD-034 put password reset in Phase 1, overriding PRD FR-AUTH-009). It keeps the matrix's owning story only where the label matches, and lists every row it re-keys.
  - User Stories corrects the backlog Sources the same way.
  - This depends on Q1.

**B2. The requirement count check is wrong.**
- The PRD has 103 FR + 12 NFR = 115.
- The matrix has 100 FR. It includes FR-PWA-001/002 and FR-ONB-001 and leaves out FR-A11Y-001 and FR-I18N-001/002 (`matrix:5`, `:10` "Every PRD requirement ID appears below").
- The baseline's 100 is a different subset: it includes A11Y and I18N (`baseline:203`, `:211`) and never mentions PWA or ONB.
- `RUNBOOK.md:151` sets "100 FR + 12 NFR" as the check, and V-023 (`validation-log.md:32`) wrongly passed it.
- STORY-PLAT-001 cites FR-ONB-001 but describes FR-I18N-001 (`backlog:351`). The real FR-ONB-001 (an optional three-step intro) has no story and no task.
- **Fix:** carry 115 with the original IDs (Q2) and change `RUNBOOK.md:151` to match.

**B3. The knowledge copy of the decision log is stale.**
- The copy says "As of 2026-09-12", ends at FD-037 and has 37 rows. The original has 44 rows and adds round 5 (FD-038..FD-044) at `docs/status/decision-log.md:118-131`.
- `README.md:160-161` requires a re-sync whenever an original changes. Step 2 (`4f05dc0`) did not do it.
- `README.md:122` and `:143` still say "FD-001..FD-037".
- The Units and Delivery inputs are not in the 35-file snapshot at all: the README §5 tracker, `06-change-requests.md`, `ISSUES.md`, `NEXT.md` and `tasks/*.md`. Yet `README.md:132` and the intent's Project line say to transcribe "from the knowledge documents".
- **Fix:**
  - Copy from `git show HEAD:docs/status/decision-log.md` (LF line endings), not from the working tree, and run `aidlc engine knowledge sync`. Expect line-ending hash drift on up to 30 rows; keep each batch to 20 files or fewer.
  - Change README:122 and :143 to "FD-001 onward".
  - Tell the Units and Delivery stages to read `docs/implementation/{README.md,06-change-requests.md,ISSUES.md,tasks/*.md}` straight from the repo, and to say in their gate summaries which source they used.

**B4. FD-036 (JPEG/PNG only) is not written into the documents the stages transcribe.**
- `baseline:139` lists HEIC, PDF, Office, TXT and RTF as accepted Phase 1 types; `:141` and `:143-144` cover rasterising, page navigation and processed-PDF download.
- STORY-EVID-001/002 (`backlog:224`, `:226`, `:233`, `:236`) promise PDF, encrypted-file handling, multi-page viewing and download.
- `ARCHITECTURE-SPINE.md:82`, `:183` and `decisions/0005-…:9`, `:14` say Phase 1 accepts PDF.
- `02-data-model.md:230` treats `too_many_pages|encrypted` as live failure reasons, though `:34` reserves them for Phase 2.
- `00-master-plan.md:297` (step 7 gate) still says "rasterised".
- The code and `03-routes-and-contracts.md` already follow FD-036 (`packages/contracts/src/schemas/evidence.ts:10-11`).
- **Fix (no owner decision; FD-036 is binding):** each stage applies FD-036 as an overlay. Keep the PRD and story text, and add "Phase 1: JPEG/PNG only (FD-036); the rest is Phase 2 per `07-phase-2-document-evidence.md`". This applies to FR-FILE-001/003/004/006, FR-EVD-007, EVID-001/002, AD-6 and ADR 0005. Do not rewrite the ADRs.

**B5. Some stories describe work that later decisions superseded or deferred.**
- STORY-PROT-001 (`backlog:70-72`) says all writes fail closed. FD-031 (`decision-log.md:103`) enables real writes.
- STORY-PROT-002 (`:76-83`) describes an unselected three-concept comparison. FD-025, FD-027 and FD-029 replaced it, and no task implements it.
- OPS-002 and the production half of OPS-001 are out of scope (`00-master-plan.md:307`).
- `backlog:395` still waits for a Gate 4 selection that has already been made.
- **Fix:** keep all 34 stories and their text, and add a "status in this intent" line to each. Owner confirms in Q5.

## 3. Owner questions

Recommended answer first.

**Before Requirements Analysis**
1. **Where does each requirement ID's meaning come from?** PRD text with FD overrides, re-keying the matrix's owning story where the label drifted. The matrix labels are wrong for at least 35 rows, so keeping them breaks "original IDs kept, nothing invented".
2. **How many requirements: 115 or 112?** 115 (103 FR + 12 NFR).
   - Map FR-I18N-001/002 to STORY-PLAT-001, and FR-A11Y-001 to STORY-PLAT-001 and STORY-PROT-003.
   - Record the real FR-ONB-001 (three-step intro) as a PRD Must that is deferred from the demo, as a new FD; no task delivers it.
   - The baseline already describes the three A11Y/I18N requirements, so carrying them invents nothing.
3. **FR-COM-003: emergency-language banner or not?** Retire it for the demo. The static `/emergency` page is the whole requirement, and FD-009/FD-017 rule out a classifier. Record it as FD-045. Comment edit and delete stay under FR-EDIT-005, which is their PRD meaning.
4. **Optional email categories (emailDiscussion, emailEvidence, emailModeration): Phase 1 or Phase 2?** Phase 1, recorded as a new FD.
   - They are already in `packages/database/src/schema/account.ts:36-38` and `packages/contracts/src/schemas/account.ts:59-61`, in STORY-NOTIF-001 (`backlog:302`) and in T-405 (`00-master-plan.md:183`).
   - The PRD's FR-NOT-002 calls general email notifications future scope, so this needs a recorded decision.

**User Stories gate**

5. **Story statuses:**
   - PROT-002: superseded or complete (FD-025, FD-027, FD-029).
   - PROT-001: partial (corpus and reset in T-007/T-504; the read-only composition is deferred per ADR-0010 and FD-031).
   - PROT-003: partial (T-503 on concept 04b only).
   - OPS-001: local subset only.
   - OPS-002: deferred.

   Recommend confirming all five as written. They follow directly from FD-025..FD-031 and master plan §9.

**Domain and Contract gates**

6. **How is an author's soft-delete stored?** Domain-only state: the stored state is unchanged and `deleted_at`/`restore_until` are set (T-302:51). Close ISS-147 (`ISSUES.md:130`), which proposed adding a `deleted` enum value. This needs no migration and fits the existing columns.
7. **The worker role's privileges go beyond `02-data-model.md` §16 (`:205`).** The code (`0005_grants_part2.sql:66-86`, specified in T-005:48) also grants:
   - UPDATE(state, deleted_at) on reviews;
   - INSERT on review_versions;
   - SELECT and UPDATE on comments;
   - column SELECT on reports and account_profiles, and SELECT on legal_holds.

   Recommend recording these as a known deviation and reviewing them in CR-006, which already touches the worker's grants. The reviews UPDATE sits uneasily with AD-6's "no public-delete credentials" for the worker.
8. **Can admin run retention bulk actions?** No; keep it super_admin only, as `03-routes-and-contracts.md:76` and `packages/contracts/src/actor.ts:74` already do. Fix the T-103:50 text. The contract and the merged code agree, and the action is destructive.
9. **Should `dataRequest.created` queue both export and delete jobs?** No; route by the request's kind, fixed in the T-410 unit (ISS-188). Today `outbox-relay.ts:82` queues both.

**Units and Delivery gates**

10. **Open S3/S4 issues that name an owning task:** copy them into that unit's "carries" list. Reassign the rows whose owner task is already merged: ISS-144 and ISS-145 go to CR-011, and ISS-080, ISS-179, ISS-224 and ISS-225 become accepted debt or a named unit.
11. **D-001 auth-screen review (both locales, both themes, 360 px):** make it an explicit gate on the T-102 and T-103 units, unless you confirm now that it is approved. Nothing records the approval (`README.md:159`, `NEXT.md:33`).

**Migration housekeeping**

12. **The engine asks whether to redo Reverse Engineering. Answer no.** It is a false positive caused by the letter case of the folder path; the bytes are identical. The hash using the `codekb/rogikotha/` path matches the earlier audit receipts, and the hash using `RogiKotha/` does not. Pick one canonical folder name, lowercase `rogikotha`, which matches the existing receipts. Otherwise every receipt written here re-triggers the warning on the other machine.
13. **ISSUES.md: frozen or live?** Live. Your 2026-10-15 decision (`team.md:26`) overrides D15 (`RUNBOOK.md:60`). Remove ISSUES.md from the step 6.1 banner list, and have the delivery plan link open S1/S2 rows per unit instead of copying them.
14. **project.md Tech Stack and Decided sections:** fill them through the Requirements learnings step. Use the resolved versions: pg-boss 12.31, Zod 4.6, jsdom 27 at the root and 30 in web. Summarise FD-001..FD-044 under Decided. RUNBOOK:134 requires both sections, and both are empty (`project.md:40-47`).
15. **Was the gate4 worktree and `task/gate4-foundation` branch removed on the other machine?** Please confirm. It cannot be checked from here; origin has only `main`. Then record it in RUNBOOK row 2.

## 4. Fixes that need no owner input

**Instructions to put in the stages**

*Requirements Analysis*
- FR-AUTH-009: self-service reset is in Phase 1 per FD-013 (`decision-log.md:39`) and FD-034. `baseline:50` and `:278` are overridden.
- Replace STORY-I18N-001 (`matrix:120`, `:140`) with STORY-PLAT-001; V-023's "all trace story IDs exist" is false.
- Add FD-025..FD-044 to the decision trace as an addendum, and mark scope only where an FD changes it.
- Treat the baseline's CQ-04..CQ-11 references as historical. Record the limited-data default of 5 as a runtime-configurable assumption (FD-018; `config-values.ts:68`).
- Cite the PRD as `docs/RogiKotha_PRD_v1.0.docx`; `00-source-inventory.md:18` uses the old filename.

*User Stories*
- The story set is exactly the 34 in the backlog. Group stories by the `### EPIC-` headings; the ID prefixes would give 15 groups. STORY-NFR-* are annotation tags, not stories.
- Use the backlog Sources as the story trace. 26 of the 112 requirements have a different owning story in the matrix; record those as "also touches".
- STORY-MOD-001: add the rule that critical reasons hide on the first report (PRD FR-MOD-003, `baseline:163`). STORY-MOD-002: add the review-time targets (FR-MOD-004, `baseline:165`). The FD-017 attribution in `02-data-model.md:54` and T-403 is imprecise.
- Carry only the size letter and an M3 high-risk flag. Drop the M1/M2 model names (D8; `backlog:50`).

*Domain Design*
- Take table owners from the section headings of `02-data-model.md`, not from the 13-module list in the codekb. Data-requests is the AD-17 orchestrating module; Operations owns no table.
- Evidence state machine: use §17 plus FD-035. The diagram in `05-recommended-architecture.md:137-145` is superseded.
- The build is the FD-031 local-development composition (`APP_MODE=development`, `.env:1`). ADR-0010's read-only demo is unbuilt, and `05:18`'s "disabled" column is overridden. `APP_MODE=demo` has no documented meaning yet; note that.
- `demo_clock` lives in the shared migrations. `02:200` says otherwise, and the code wins.
- Describe worker privileges with FD-041/CR-006.

*Contract Design*
- Read `03:62` as the capability `evidence.original`.
- Take the error-key rule from `errors.ts` `errorMessageKey()` (common prefix plus camelCase), not from `03:78`.
- Add an FD-038 note on `JobQueue.enqueue` and `outbox.relay`; the relay currently runs as an in-process poller (ISS-187).
- List the event-to-job payload mappings as open gaps with owners rather than inventing them: search.refresh (T-205), mail.send `{deliveryId}` (T-405), data.export/delete (T-410).
- Treat review.setState, review.redact, comment.setState, comment.redact and evidence.remove as referenced internal commands owned by T-302, T-401/T-403 and T-305.
- The `moderation.decide` extension in T-404:66 (redaction, 10–1000 character reason) belongs to T-404; today `moderation.ts:30-38` is strict.
- For `/admin`, transcribe URLs and roles only, with `/admin/security` requiring a staff session. Note for T-103: the guard must sit in a group layout, because `admin/layout.tsx` wraps sign-in too.

*Units and Delivery*
- CR-006: use migration `0007` (0006 is taken by T-009) and option (a) per FD-041.
- CR-009: the acceptance check is 133 specifiers at HEAD, not 124.
- CR-011: add `repositories/outbox.ts` and `outbox.int.test.ts` to its owned paths, take on ISS-144 and ISS-185, and replace its design-choice section with D1. Add a transaction timeout and a "crash leaves exactly one job" acceptance row.
- Give the D2 storyboard/seed unit an ID. Its scope: storyboard lines 15, 39 and 59; the acceptance text at T-106:65, T-401:69 and T-409:59/:61 (the MOD-2011 appellant is `r_ahmed`); the MOD-2033 report reasons, keeping CR-008's 6/6/6/6 counts.
- Sequence T-204 before T-205. Build dependencies as the union of master plan §5 and the task files' Depends-on rows.
- Split T-207 into T-207a (complete) and T-207b, which carries ISS-151, ISS-152 and ISS-120.
- T-010: add D3, D10 and the ISS-205 decision, and re-estimate.
- The `Status` lines in CR-004/006/007/011 are superseded by the "queued" rows in `06-change-requests.md`.
- ISS-200 and ISS-220 are closed (fixed in CR-010). The real open S2 set is ISS-108, 112, 139, 140, 141, 158, 183 and 201.
- The task count is 47, not 46. Write "task D-001" to tell it apart from the decision-log row D-001.

**Documentation fixes (docs-only commit)**
- RUNBOOK progress table: step 3 done (`c785706`), step 4 hash `cfa5d30`, step 5 in progress (`:74-76`). Also update README line 4 and rows 5–6, `RUNBOOK.md:151`, and README `:122`/`:143`.
- Before deleting RUNBOOK, record D8–D19 under the next free FD numbers so the labels used in team.md and project.md still resolve.
- Add the AGENTS.md:36-40 audit-cost exception to project.md through the next learnings step.
- Fix the stale migration filenames at `02-data-model.md:161`, `:202` and `:208` (ISS-142).
- Fix the codekb nits: contracts has 8 test files, not 9; five migrations are hand-written, not four; reword the auth_users grant entry.
- Close ISS-145.
- Mark CR-009 "alone" in `06-change-requests.md`.

## 5. What was checked and found clean

Requirement IDs are unique and contiguous: the matrix has 112 (100 FR + 12 NFR, NFR-001..012), every one exists in the PRD, and there are no duplicates. The BRD has 53 BR IDs, matching the baseline. The backlog has 34 stories in 12 epics, matching backlog.yaml, which has 104 tasks and no duplicate IDs. The decision log runs FD-001..FD-044 with no gaps or duplicates, and FD-038..FD-044 match D1–D7.

The data model's 58 tables and 36 enums match the code exactly, as do the 6 append-only triggers and the 7 migrations (0000–0006). There are 13 ADRs with no conflict between them. The contracts match on all 39 error codes, 8 capabilities, the config ranges, 25 patient and 10 staff URLs, 21 outbox events and 8 job names.

Of the 35 knowledge documents, 34 are content-identical to the originals; 5 differ only in line endings. Merged work is consistent between git, the README tracker, NEXT.md and `06-change-requests.md`: T-001..T-009, T-207a, D-001 and CR-002/003/005/008/010. The D19 order breaks no dependency. No code changed after Reverse Engineering. There are 0 open S1 issues, and lint shows 0 errors.