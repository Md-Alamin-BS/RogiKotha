# Business rules — U32 `t-403-reports-and-thresholds`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U32), `stories.md` (US9.1, AC9.1.1–AC9.1.6), `requirements.md` (FR75, FR79–FR82), `components.md` (Moderation), `contract-summary.md` (C2, C4, C9, C10, C11, C15), T-403 with its amendments, FD-009, FD-017, FD-069, FD-078, FD-080, FD-086, FD-087, FD-088, FD-092, FD-093, the project hard rules (`project.md`) and `01-conventions.md` §2–§5, §10, §11. Workflows, ports and the screen are in `functional-spec.md`; the data shape is in `entities.md`.

This Unit is **high risk** (moderation): every authorization and audit rule is written out (BR1, BR4, BR9.6), and § 12 of `functional-spec.md` lists the adversarial tests. Rules that depend on an answer name the question in `source`; every question was answered A by the agent under the owner's no-questions instruction of 2026-10-29.

```yaml
rules:
  # BR1 — who may report what
  - id: BR1.1
    statement: "report.file requires an authenticated account with a verified email whose status is not restricted, suspended or banned."
    category: authorization
    applies_to: "report.file (defineCommand requires: authenticated, verifiedEmail, notRestricted)"
    trigger: "Every call"
    logic: "signed out -> forbidden (the sheet opens the sign-in sheet first); unverified -> auth.email_unverified (the sheet opens the confirm sheet); status restricted, suspended or banned -> forbidden with errors.auth.accountRestricted or accountSuspended (U33's resolve-actor sets the status); refusals write nothing (no onRefused)"
    violation: "An unverified or restricted account adding to a threshold breaks 'five distinct confirmed accounts' (AC9.1.4) and lets an enforced account keep weaponising reports"
    source: "AC9.1.1, AC9.1.6, FR79, C11 requires verified, Question 9"
  - id: BR1.2
    statement: "An account may file at most 20 reports per rolling day; every attempt that passes authorization counts, duplicates included."
    category: constraint
    applies_to: "report.file"
    trigger: "After authorization, before any read"
    logic: "RateLimiter.hit('report:account:' + actor.accountId, 20, 86400); not allowed -> rate_limited with retryAfterSec; the key is held in memory only and is never logged"
    violation: "Unlimited reports let one account flood the queue"
    source: "T-403 step 4, threat notes (by account, not IP), C11"
  - id: BR1.3
    statement: "The reason must be one of the reasons enabled in the current configuration."
    category: validation
    applies_to: "report.file"
    trigger: "After the rate limit"
    logic: "values = await config.current(); IF reason NOT IN values.reportReasons THEN validation with fieldErrors.reason = errors.moderation.reasonDisabled; the enum itself is checked by FileReportInput; privacy, threat, unsafeFile, dangerous and other are always enabled (U12 T-105)"
    violation: "A disabled reason accepted, or a reason outside the enum, fails the threat note 'Reasons outside the enabled list: refuse'"
    source: "AC9.1.1, FD-018, T-403 step 4, ISS-079 (closed by U12)"
  - id: BR1.4
    statement: "The target is found by its public id through its owning module and must be visible or hidden pending review; anything else answers not_found."
    category: validation
    applies_to: "report.file, report.status; loaders modules/{review,community,evidence,directory}/moderation-target.ts"
    trigger: "After the reason check"
    logic: "loader[targetKind].byPublicId(tx, publicId) -> ReportTarget | null; IF null OR visibility = other THEN not_found (same code and message for unknown, draft, pending, hidden, deleted, tombstone, rejected, merged, failed or removed targets); after lockTarget the loader is read again under the lock"
    violation: "Reporting a deleted or draft target, or a response that tells an unknown id from a hidden one, is an existence oracle"
    source: "T-403 step 4, components.md Moderation depends_on (loads targets through the owners)"
  - id: BR1.5
    statement: "A profile target is a doctor profile; facility branches cannot be reported in release 1."
    category: constraint
    applies_to: "report.file, modules/directory/moderation-target.ts"
    trigger: "targetKind = profile"
    logic: "the directory loader resolves only doctor public ids (visible = published and not merged); a branch public id -> not_found"
    violation: "An ambiguous profile id could open a case on the wrong record"
    source: "02-data-model.md §0 seed mapping, MOD-2029 (doctor d3), Question 4"
  - id: BR1.6
    statement: "An account reports a target once, ever; a repeat by the same account returns moderation.duplicate_report and changes nothing."
    category: constraint
    applies_to: "report.file"
    trigger: "Under the target lock, before the case is touched"
    logic: "IF alreadyReported(tx, kind, id, actor.accountId) THEN err moderation.duplicate_report (rolled back); the INSERT also runs ON CONFLICT (target_kind, target_id, reporter_account_id) DO NOTHING RETURNING id, and no row -> the same error; this holds across cases (an earlier closed case included), whatever the reason"
    violation: "A second report from one account counting again fails AC9.1.4 and the 'Duplicate' acceptance row"
    source: "AC9.1.4, FR81, 02-data-model.md §9 unique key, Question 1"
  - id: BR1.7
    statement: "A block between two accounts never stops a report, and an author may report their own content."
    category: policy
    applies_to: "report.file"
    trigger: "Every call"
    logic: "report.file reads no blocks; a report by the target's author is counted like any other (BR5.2 removes the author notice)"
    violation: "A blocked user unable to report the person harassing them"
    source: "Question 10, FD-086"
  - id: BR1.8
    statement: "report.status tells the actor only whether the actor has reported the target, plus the enabled reasons."
    category: authorization
    applies_to: "report.status (query)"
    trigger: "The sheet opens"
    logic: "requires authenticated; unknown or unreportable target -> {alreadyReported: false, reasons} (never not_found, so it is no oracle); never a count, a case code or another account"
    violation: "Any other field would leak who or how many reported"
    source: "T-403 step 5"

  # BR2 — the case and its counts
  - id: BR2.1
    statement: "Every report.file on a target runs under one transaction-scoped advisory lock on (target_kind, target_id), taken before any row lock."
    category: constraint
    applies_to: "report.file; U33 moderation.decide and moderation.restore (cross-Unit)"
    trigger: "After BR1.4's first lookup"
    logic: "pg_advisory_xact_lock(hashtextextended(target_kind || ':' || target_id, 0)) through ModerationRepository.lockTarget; then re-read the target; every later lock (setStateOn's row lock) comes after it; U33 takes the same lock first"
    violation: "Without it, parallel reports can open two cases or hide twice (the 'Concurrency' acceptance row); taking it after a row lock risks deadlock"
    source: "T-403 acceptance 'Concurrency', finding F12"
  - id: BR2.2
    statement: "A target has at most one open case per origin; report.file counts into the open report-origin case or creates one."
    category: constraint
    applies_to: "report.file, migration (moderation_cases_open_target_unique)"
    trigger: "After BR1.6"
    logic: "findOpenCase(tx, kind, id, 'report'); none -> createCase {origin report, status open, lane laneFor([reason]), opened_at now, sla_due_at BR2.7}, caseOpened = true; a decided, appealed or closed case is never reused; the partial unique index is the backstop (a violation is a programmer error under BR2.1)"
    violation: "Two open cases on one target split the counts"
    source: "T-403 step 4, Question 11"
  - id: BR2.3
    statement: "Each counted report adds one to report_count, distinct_reporters and its reason chip; the counts are never recomputed from report rows."
    category: calculation
    applies_to: "report.file"
    trigger: "After insertReport"
    logic: "report_count += 1; distinct_reporters += 1 (BR1.6 makes every counted report a new account in this case); moderation_case_reasons (case_id, reason) upsert count += 1"
    violation: "A recount after U33's de-identification would lower distinct_reporters, against FD-069"
    source: "FD-069, T-403 amendment FD-069, 02-data-model.md §9"
  - id: BR2.4
    statement: "A report belongs to exactly one case: the open case it was counted in."
    category: constraint
    applies_to: "insertReport (reports.case_id)"
    trigger: "Insert"
    logic: "case_id = the case of BR2.2; the migration backfills seeded rows from the case on the same target and then sets NOT NULL"
    violation: "Reports without a case let an old report count again after a moderator restore (finding F3)"
    source: "Question 1"
  - id: BR2.5
    statement: "The eligible reporters of a case are its reports whose reason is not factual."
    category: calculation
    applies_to: "domain/moderation/report-policy.ts eligibleReporters"
    trigger: "Before the hide decision"
    logic: "eligibleReporters(reasonCounts) = sum(count) over reasons <> factual"
    violation: "Counting factual reporters lets disagreement push content over the threshold (finding F4, AC9.1.5)"
    source: "FR81, AC9.1.4, AC9.1.5, Question 2"
  - id: BR2.6
    statement: "A case's lane is critical when any of its reasons is critical or dangerous, otherwise standard, and it is never downgraded."
    category: calculation
    applies_to: "laneFor(reasons), report.file"
    trigger: "Case creation and every counted report"
    logic: "laneFor(reasons) = critical IF any reason IN {privacy, threat, unsafeFile, dangerous} ELSE standard; newLane = critical IF current = critical OR laneFor = critical ELSE standard"
    violation: "A dangerous-advice case in the standard lane misses the 24-hour target"
    source: "T-403 step 1, FR82, FR75"
  - id: BR2.7
    statement: "SLA: critical = opened_at + criticalHours; standard = opened_at + standardDays business days; an upgrade to critical sets the earlier of the current due time and now + criticalHours."
    category: calculation
    applies_to: "slaDueAt, addBusinessDays (domain/moderation/report-policy.ts), report.file, the repetition job"
    trigger: "Case creation; lane upgrade"
    logic: "addBusinessDays(t, n): step one calendar day at a time in Asia/Dhaka (UTC+06:00, no daylight saving), counting a day only when its weekday is Sunday-Thursday, until n are counted; time of day kept; public holidays ignored (ASSUMPTION(T-403)); thresholds read from await config.current()"
    violation: "A standard case due on a Friday, or a critical upgrade keeping a three-day due time"
    source: "T-403 step 1, FR82, Questions 13 and 16"
  - id: BR2.8
    statement: "A case carries the coordination signal when 3 or more of its reports arrived within 10 minutes from accounts younger than 24 hours at report time, or 5 or more came from accounts created in the same ISO week; once set it stays set and it never hides anything."
    category: calculation
    applies_to: "coordinationSignal (domain), reportsForCoordination (repository), report.file"
    trigger: "Every counted report while coordinated_signal is false"
    logic: "samples = reportsForCoordination(tx, caseId) -> [{reportCreatedAt, reporterCreatedAt|null}] (last 500); rule A: some 10-minute window holds >= 3 samples with reportCreatedAt - reporterCreatedAt < 24 h; rule B: >= 5 samples share the ISO week (Asia/Dhaka) of reporterCreatedAt; null reporterCreatedAt counts for neither"
    violation: "A signal that hides content would be automated classification (FD-009); one that flips back hides history from the moderator"
    source: "AC9.1.4, components.md Moderation, T-403 step 1, MOD-2033 fixture"

  # BR3 — the temporary hide
  - id: BR3.1
    statement: "A critical reason (privacy, threat, unsafeFile) hides a visible target on the first report."
    category: policy
    applies_to: "hideDecision, report.file"
    trigger: "A counted report with a critical reason"
    logic: "IF reason IN CRITICAL AND target.visibility = visible AND NOT case.auto_hidden AND target.kind <> profile THEN hide_now with event hideCritical, reasonCode auto_critical"
    violation: "A privacy leak staying public until five reports is an S1 hard-rule breach (AC9.1.6)"
    source: "FR81, AC9.1.6, FD-017, project.md hard rules"
  - id: BR3.2
    statement: "Any other enabled reason except factual hides a visible target once the case's eligible reporters reach thresholds.fiveAccountHide."
    category: policy
    applies_to: "hideDecision, report.file"
    trigger: "A counted report with a non-critical, non-factual reason"
    logic: "IF reason <> factual AND eligibleReporters >= values.thresholds.fiveAccountHide (2-50) AND target.visibility = visible AND NOT case.auto_hidden AND target.kind <> profile THEN hide_now with event hideThreshold, reasonCode auto_threshold; dangerous counts here like any eligible reason (until then the comment shows its dangerous-advice warning through ModerationSignals); a threshold lowered in the configuration takes effect at the next report"
    violation: "Missing hide at the configured count fails AC9.1.4 and 'Threshold from config'"
    source: "FR81, AC9.1.4, FD-017, FD-018, Question 2"
  - id: BR3.3
    statement: "A factual report never hides anything and never counts toward a hide."
    category: policy
    applies_to: "hideDecision"
    trigger: "reason = factual"
    logic: "hideDecision returns no_change; BR2.5 leaves it out of eligibleReporters; the case is still opened or updated in its lane"
    violation: "Any hide from disagreement is an S1 hard-rule breach (AC9.1.5)"
    source: "FR81, AC9.1.5, project.md hard rules"
  - id: BR3.4
    statement: "report.file hides a target at most once per case, and only through the owner's state command."
    category: constraint
    applies_to: "report.file"
    trigger: "hide_now"
    logic: "call the owner's internal (BR3.5-BR3.7) with actor system; IF it returns changed THEN auto_hidden = true, hidden = true, audit case:<code> action hide actor system:auto details {event} ELSE (already hidden, or the owner refused the pair) hidden = false and auto_hidden stays false; a report on hidden-pending-review content adds to the case and never calls setState"
    violation: "A second hide call, a second hide email, or a direct UPDATE of another module's table"
    source: "AC9.1.4 (exactly once), T-403 threat note (re-trigger), C9, C10"
  - id: BR3.5
    statement: "Reviews and comments are hidden through review.setState and comment.setState with hideThreshold or hideCritical, which queue no email and create no notice."
    category: policy
    applies_to: "setStateOn (U22), comment.setState (U30)"
    trigger: "hide_now on a review or comment"
    logic: "review: setStateOn(tx, {reviewId, event, reasonCode}, system) (U22, audits review:<id> as system); comment: comment.setState internal with the same events (U30 builds all events, Question 14); both append their own outbox (review.hidden / comment.changed)"
    violation: "An email or notice from setState is a second email for one outcome (FD-087)"
    source: "C9, C10, FD-087, T-302 draft WF8"
  - id: BR3.6
    statement: "Facility feedback is hidden through facilityReview.setState, built here, with the same table as reviews."
    category: policy
    applies_to: "modules/review/commands/facility-review-set-state.ts"
    trigger: "hide_now on a facility_review; U33's hide, restore, remove"
    logic: "events hideThreshold | hideCritical -> hidden_pending_review, hide -> hidden, restore -> published, remove -> deleted_tombstone, on the publication table of 02-data-model.md §17; same state -> changed false; refused pair -> conflict; writes hidden_at (kept if set) and hidden_reason_code, clears both on restore; audit facility_review:<id> action facility_review_state_changed {event, from, to, reasonCode} actor system for the threshold events, the staff actor otherwise; no outbox event (facility feedback publishes none, U21), no email, no notice; requires {system: true} | {staffRole: any}; never a server action"
    violation: "A facility review hidden by a direct UPDATE, or one that emails its author from setState"
    source: "C9 (built by U32), FD-087, Question 15"
  - id: BR3.7
    statement: "An evidence item is hidden by setting evidence_items.hidden_at through Evidence's internal hide; every public evidence read excludes hidden items."
    category: policy
    applies_to: "modules/evidence/internal/set-hidden.ts (owned-path addition), evidence public reads and the file route (U25, U28), document counts (U14), search.refresh (U18)"
    trigger: "hide_now on an evidence item; U33's restore"
    logic: "events hideThreshold | hideCritical set hidden_at = now and hidden_reason_code (kept if set); restore clears both; the item's pipeline state is untouched; public predicate = state = published AND hidden_at IS NULL; audit evidence:<id> action evidence_hidden | evidence_shown actor system or staff; outbox review.changed {reviewId, doctorId, branchId?} so search refreshes (no evidence.stateChanged, which would notify the uploader); the pipeline and retention never write the columns"
    violation: "A reported privacy leak in a document staying public is an S1 hard-rule breach (AC9.1.6, ISS-164)"
    source: "Question 3, FD entry (b), ISS-164, T-304 draft Question 19"
  - id: BR3.8
    statement: "A doctor profile is never hidden by reports; its case waits for a moderator."
    category: policy
    applies_to: "hideDecision"
    trigger: "target.kind = profile"
    logic: "hideDecision returns no_change for a profile whatever the reason; a critical reason still makes the case critical"
    violation: "One account removing a doctor's page with one report"
    source: "Question 4, FD entry (a), MOD-2029 note"

  # BR4 — reporter privacy
  - id: BR4.1
    statement: "reports.reporter_account_id is never selected or returned except by RevealTarget(report) and U33's de-identify; other moderation methods may use it only in WHERE or JOIN clauses that return booleans, counts or timestamps."
    category: constraint
    applies_to: "packages/database/src/repositories/moderation.ts; a grep test over packages/"
    trigger: "Any query"
    logic: "allowlist of entities.md 'Reporter-column readers'; the grep test fails when reporter_account_id (or reporterAccountId) appears outside schema/moderation.ts, migrations, repositories/moderation.ts, the seed, U33's de-identify file and tests; inside repositories/moderation.ts it may appear only in the allowlisted methods; insertReport returns id only"
    violation: "Any other reader is a reporter leak (AC9.1.3, FD-069 acceptance row)"
    source: "AC9.1.3, FR80, T-403 step 6, FD-069, 01-conventions.md §5"
  - id: BR4.2
    statement: "No view model, outbox payload, notice param, email param, dedupe key or error carries a reporter's account id, username, persona or email."
    category: constraint
    applies_to: "ReportSheetVM, CaseTrayVM (reporter: 'restricted'), report.filed, notification params, email_deliveries.params and dedupe_key, AppError"
    trigger: "Any output"
    logic: "report.filed keys exactly {caseCode, caseOpened, hidden, affectedAccountId?}; affectedAccountId is never the reporter (BR5.2); params {caseCode} only; dedupe keys use the case code"
    violation: "S1 (FD-086, hard rule on reporter identity)"
    source: "FD-086, C11, C15, AC9.1.2"
  - id: BR4.3
    statement: "The report audit row's actor is the literal reporter:restricted and its details hold only the reason, counts and booleans."
    category: audit
    applies_to: "report.file audit (stream case:<code>)"
    trigger: "Every counted report"
    logic: "AuditWriter allowlist builder report: {reason, distinctReporters, caseOpened, hidden, coordinated}; actor 'reporter:restricted'; target_kind/target_id = case target; a hide adds a second row action hide actor system:auto; never detail, evidence_note or any id of the reporter"
    violation: "A reporter id or free text in audit (01-conventions.md §5)"
    source: "C11 audit, T-403 step 4, prototype auditLog a2"
  - id: BR4.4
    statement: "Hides caused by reports are audited on the target's stream as system, never as the reporter."
    category: audit
    applies_to: "setStateOn, comment.setState, facilityReview.setState, evidence hide"
    trigger: "hideThreshold, hideCritical"
    logic: "report.file passes the system actor; the owners audit actor system for these events"
    violation: "The reporter's account linked to the content's stream (T-302 draft F6)"
    source: "FD-086, T-302 draft BR8.4"
  - id: BR4.5
    statement: "report.file and report.status log no account id; their log lines carry event, correlationId, the case code, enums, booleans and durations only."
    category: constraint
    applies_to: "defineCommand logging (logActor: false), server actions fileReport and getReportSheet, the RateLimiter"
    trigger: "Any log line"
    logic: "the command declares logActor: false; the action's error path logs correlationId and the error code; the limiter never logs keys"
    violation: "A reporter id in a log line breaks FD-086 (finding F9)"
    source: "FD-086, 01-conventions.md §11"
  - id: BR4.6
    statement: "The reported person and every public projection never learn who reported, how many reported or why beyond the generic notice."
    category: constraint
    applies_to: "every public and author-facing output"
    trigger: "Any read"
    logic: "author notices name the case code and the outcome only; report counts, reasons, detail and evidence notes are staff-only (U33 renders them); the hide reason code shown to an author (if any) is auto_threshold or auto_critical"
    violation: "AC9.1.2 'neither notice nor any public projection shows the reporter's identity'"
    source: "AC9.1.2, AC9.1.3, FR80"

  # BR5 — notices and the one email per outcome
  - id: BR5.1
    statement: "report.file gives the affected author one notice and one moderation email per outcome: Content reported when the case opens, Hidden pending review when it hides, one of each when both happen in one report."
    category: policy
    applies_to: "report.file, report.filed routing (U34)"
    trigger: "caseOpened or hidden"
    logic: "outcome = hidden ? hiddenPending : (caseOpened ? reported : none); none -> no affectedAccountId, no email; the in-app notice is created by notification.deliver from report.filed (U34's routing); the email is queued here"
    violation: "Two notices for one report, or none, fails the FD-087 acceptance rows"
    source: "FD-087, AC9.1.2, C11, T-405 routing table"
  - id: BR5.2
    statement: "affectedAccountId is set only when there is an outcome, the target is not a profile, the author's account resolves, and that account is not the reporter."
    category: constraint
    applies_to: "report.file"
    trigger: "Outcome not none"
    logic: "personaId = target.authorPersonaId; accountId = identity.accountsOf({personaIds: [personaId]})[0]?.accountId; IF accountId AND accountId <> actor.accountId THEN set ELSE omit (no email either)"
    violation: "A self-report would put the reporter's id in report.filed (finding F10, FD-086)"
    source: "FD-086, FD-087, C11, Question 10"
  - id: BR5.3
    statement: "The author of an evidence item is its review's author; of a comment, the comment's author; of a facility review, its author."
    category: calculation
    applies_to: "moderation-target loaders"
    trigger: "Loading a target"
    logic: "evidence -> evidence_items.review_id -> the review's author persona; comment -> comments.author_persona_id; facility_review -> facility_reviews.author_persona_id; review -> reviews.author_persona_id"
    violation: "Notifying the wrong account, or reading uploaded_by_account_id (a planned worker revoke, PR3)"
    source: "C11, FD-087 'every target kind'"
  - id: BR5.4
    statement: "The moderation email goes through notification.queueEmail in the same transaction, category moderation, keyed so an outcome can never email twice."
    category: policy
    applies_to: "report.file (sendsMail: true)"
    trigger: "affectedAccountId set"
    logic: "queueEmail(tx, {accountId, category: moderation, messageKey: notif.moderation.hiddenPending | notif.moderation.reported, params: {caseCode}, dedupeKey: 'report:' + caseCode + (hidden ? ':hidden' : ':opened')}); suppressed (preference off, deleted account) is success; an err rolls the report back"
    violation: "An email from setState, or a second email on a sixth report"
    source: "FD-075, FD-087, C2, AC10.1.4, AC10.1.5"
  - id: BR5.5
    statement: "The reporter gets no notice and no email, ever."
    category: constraint
    applies_to: "report.file, report.filed routing"
    trigger: "Always"
    logic: "no recipient field for the reporter exists; the sheet's sent message promises no update (BR8.4)"
    violation: "FD-086"
    source: "FD-086"

  # BR6 — the repetition case (FD-080)
  - id: BR6.1
    statement: "moderation.openRepetitionCase acts only on review.published with repeatEpisode true and a review that is still visible or hidden pending review."
    category: policy
    applies_to: "packages/application/src/modules/moderation/jobs/open-repetition-case.ts, apps/worker/src/handlers/open-repetition-case.ts"
    trigger: "The job runs"
    logic: "repeatEpisode false -> ok, nothing written; review missing, deleted or in another state -> ok, nothing written, log moderation.repetition_skipped {reviewId}"
    violation: "A case for an ordinary publish (FD-080 no-op row)"
    source: "FD-080, C11, C15"
  - id: BR6.2
    statement: "The repetition case is a standard-lane open case on the review with origin repeat_episode, no reports, no hide and no author notice."
    category: policy
    applies_to: "the job"
    trigger: "BR6.1 passes"
    logic: "insert {origin repeat_episode, lane standard, status open, target review, review_id, report_count 0, distinct_reporters 0, sla_due_at BR2.7}; audit case:<code> action repetitionFlag actor system details {origin}; staff notice newReport, key notif.staff.repetition, params {caseCode}, dedupe repetition:<reviewId>; never setState, never reports or appeals, never the author"
    violation: "A hide or an author notice for a repetition (FD-080)"
    source: "FD-080, C11"
  - id: BR6.3
    statement: "A review gets at most one repetition case, ever; a replayed event writes nothing."
    category: constraint
    applies_to: "the job, moderation_cases_repetition_unique"
    trigger: "Insert"
    logic: "INSERT … ON CONFLICT (target_id) WHERE origin = 'repeat_episode' DO NOTHING RETURNING id, code; no row -> ok, no audit, no notice; singletonKey repetition:<reviewId> stops parallel runs"
    violation: "Two repetition cases on one review"
    source: "FD-080 acceptance row"
  - id: BR6.4
    statement: "The repetition case names no earlier review."
    category: constraint
    applies_to: "the job, the case row, the staff notice"
    trigger: "Always"
    logic: "the payload carries no earlier review; the job stores and sends nothing about one; U33 shows only the flag text"
    violation: "Linking two reviews by one author (FD-015, FD-080)"
    source: "FD-080, FD-015"
  - id: BR6.5
    statement: "The worker holds only SELECT, INSERT, UPDATE on moderation_cases and USAGE on moderation_case_seq among the moderation objects."
    category: constraint
    applies_to: "migration, validator-probes, constraints.int.test.ts"
    trigger: "Migration"
    logic: "no DELETE on moderation_cases; nothing on reports, moderation_case_reasons, moderation_decisions, appeals; the job imports application code only through @rogikotha/application/worker and no drizzle-orm or pg"
    violation: "Any wider grant is an unrecorded data-boundary change (02-data-model.md §16)"
    source: "FD-080, FD-092, FD-093 (2)(3)"

  # BR7 — ports and internals for other modules
  - id: BR7.1
    statement: "ModerationSignals.dangerousFlags returns the comment ids that have an open case with reason dangerous."
    category: calculation
    applies_to: "modules/moderation/signals.ts (Community's port)"
    trigger: "community.thread"
    logic: "input <= 200 internal comment ids; SELECT c.target_id FROM moderation_cases c JOIN moderation_case_reasons r ON r.case_id = c.id WHERE c.target_kind = 'comment' AND c.status = 'open' AND r.reason = 'dangerous' AND c.target_id = ANY($1); returns a Set"
    violation: "A warning on a comment nobody reported as dangerous, or none on one that was"
    source: "C10, T-403 C11 amendment"
  - id: BR7.2
    statement: "RevealTarget for report resolves one report row to its reporter account, or null once de-identified, and is reachable only through identity.reveal."
    category: authorization
    applies_to: "modules/moderation/reveal-target.ts"
    trigger: "identity.reveal {targetKind: report, targetId: reportId}"
    logic: "SELECT r.reporter_account_id, c.code FROM reports r JOIN moderation_cases c ON c.id = r.case_id WHERE r.id = $1 -> ok({subject: account, accountId | null, targetCode: code}); none -> err not_found; registered in the web container's identity registry only; never exported to a server action or the worker"
    violation: "Any other caller is a reporter leak"
    source: "C4, T-104 draft § 6, FD-078"
  - id: BR7.3
    statement: "reportRefsOf gives U33 the report ids, reasons and times of a case, never the reporter."
    category: constraint
    applies_to: "modules/moderation/internal/report-refs.ts"
    trigger: "U33's reveal and case view"
    logic: "SELECT id, reason, created_at FROM reports WHERE case_id = $1 ORDER BY created_at, id"
    violation: "Revealing 'the reporter' of a multi-report case cannot name one row (T-104 F14)"
    source: "Question 12"
  - id: BR7.4
    statement: "The internal state commands are exported under internal only and are callable by report.file and U33's commands, never by a server action."
    category: authorization
    applies_to: "facilityReview.setState, evidence hide, the moderation index"
    trigger: "Import"
    logic: "requires {system: true} | {staffRole: any}; a test asserts no file under apps/web/src/server/actions imports modules/*/internal or the set-state files"
    violation: "A patient-reachable path that hides content without a case"
    source: "T-403 step 3, C9"

  # BR8 — the report sheet
  - id: BR8.1
    statement: "The report control is gated like every contribution control and opens the sheet only for a confirmed account."
    category: authorization
    applies_to: "ReportSheet, its mount points"
    trigger: "Click Report"
    logic: "guard(fn) from useAuthGate (U9): signed out -> sign-in sheet; unconfirmed -> confirm sheet; confirmed -> getReportSheet then the sheet"
    violation: "A sheet that submits and then fails for an unconfirmed account"
    source: "prototype openReport (spec §3.7), U27 draft BR5.1"
  - id: BR8.2
    statement: "The sheet lists the enabled reasons in the prototype's order, then the rest of the enum, Other last."
    category: calculation
    applies_to: "report.status (ReportSheetVM.reasons)"
    trigger: "Sheet opens"
    logic: "REPORT_SHEET_ORDER filtered by values.reportReasons"
    violation: "A disabled reason offered, or an order that differs between the two languages"
    source: "AC9.1.1, T-403 step 7, prototype openReport"
  - id: BR8.3
    statement: "The sheet ports the prototype's content and structure, with the release 1 copy changes of Questions 6-8."
    category: policy
    applies_to: "apps/web/src/components/patient/ReportSheet.tsx"
    trigger: "Render"
    logic: "title report.title; reasons as .opt buttons in a role=radiogroup labelled report.reason, each role=radio with aria-checked and arrow-key movement; report.factualNote; textarea report.detail; the private field (label report.evidence, hint report.evidenceNote, text only); warn callout report.identityNote; submit report.submit; a target line report.target.<kind> instead of the prototype's raw id; no reason chosen -> report.reasonRequired on the group, nothing sent"
    violation: "A raw internal id on screen, or a file control that does not exist"
    source: "T-403 step 7, prototype openReport, Questions 6-8"
  - id: BR8.4
    statement: "After a report the sheet body becomes the sent message; a duplicate shows the duplicate message; other errors show their message key."
    category: policy
    applies_to: "ReportSheet"
    trigger: "Result"
    logic: "ok -> report.sent in a role=status region and focus moves to it; moderation.duplicate_report -> errors.moderation.duplicateReport (also shown at open when alreadyReported); rate_limited -> the AppError messageKey with retryAfterSec formatted in the active language; validation -> field errors; the sheet never states a count or an outcome"
    violation: "A promise of an outcome update to the reporter (finding F2, FD-086)"
    source: "T-403 step 7, Question 6"
  - id: BR8.5
    statement: "Report controls exist on experiences, comments and published evidence items; facility feedback and doctor profiles have none in release 1."
    category: constraint
    applies_to: "ExperiencePage (U27), Comment (U31), the evidence viewer (U28)"
    trigger: "Render"
    logic: "mounts: review.report button in the reactions row (review), Comment onReport (comment), a link-btn review.report on each published evidence item (evidence); none on facility pages or doctor profiles"
    violation: "Adding a profile button the prototype does not have (T-403 step 7)"
    source: "Question 5, FD entry (c)"
  - id: BR8.6
    statement: "Every new or changed string has an en and a bn entry in the same commit; numerals follow the active language; Bengali copy is flagged for the owner's review."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Build"
    logic: "new: errors.moderation.reasonDisabled, report.reasonRequired, report.target.review, report.target.comment, report.target.evidence, notif.staff.repetition (and notif.moderation.reported, notif.moderation.hiddenPending if U34 has not added them); changed: report.sent, report.threat, report.spam; i18n:check green"
    violation: "A key without its Bengali string is a build failure (ADR 0011)"
    source: "project.md Mandated, FD-024, FD-042"

  # BR9 — boundaries, tests, records
  - id: BR9.1
    statement: "Files sit where T-010's boundary matrix allows."
    category: constraint
    applies_to: "every file of the Unit"
    trigger: "pnpm lint:boundaries"
    logic: "domain policies import nothing (the Dhaka offset is a constant, Intl not needed); application imports domain and contracts only; the database repository imports no domain (every decision is made before it); the worker handler imports @rogikotha/application/worker and database only; the sheet imports server actions only"
    violation: "lint red"
    source: "FD-093, 01-conventions.md §2"
  - id: BR9.2
    statement: "Tests per level, each able to fail, with at least one new smoke assertion."
    category: validation
    applies_to: "domain, application, database, worker, web"
    trigger: "Build and Test"
    logic: "domain tables for every policy function; application tests on fakes for every acceptance row; database int tests for both partial unique indexes, the backfill, the advisory lock under 10 parallel reports and the reporter-column grep; worker int test as rk_worker; component tests in en and bn; smoke: a critical report on a seeded comment hides it and the reporter id appears in no outbox row"
    violation: "team.md Testing Posture"
    source: "team.md, 01-conventions.md §10"
  - id: BR9.3
    statement: "The pins move in the same commit: not-implemented stubs, the two migration counts, the worker-denial assertion and the fake superset."
    category: validation
    applies_to: "not-implemented.test.ts, validator-probes.int.test.ts P8, migrations.int.test.ts, constraints.int.test.ts, repositories-superset.test.ts"
    trigger: "Code Generation"
    logic: "fileReport stub replaced; queue and getCase relabelled T-404 (C11 gives them to U33, finding F17); migration count +1 in both pins; constraints.int.test.ts 'denied on moderation_cases' becomes allowed SELECT/INSERT/UPDATE and denied DELETE, and its report inserts carry case_id; FakeModerationRepository mirrors the new method names"
    violation: "pnpm check red"
    source: "ISS-294, T-010"
  - id: BR9.4
    statement: "The nine-step pnpm check (eleven after U45), pnpm smoke and CI are green on the Bolt branch; 80% lines per package with untested files counted."
    category: validation
    applies_to: "the Unit"
    trigger: "Before merge"
    logic: "as team.md steps 1-7; collaborators on; adversarial tests by a separate agent; the owner's written sign-off"
    violation: "No merge"
    source: "team.md Way of Working, D10, FD-093"
  - id: BR9.5
    statement: "Every finding, workaround and assumption gets an ISS row linked to U32."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Code Generation, Build and Test"
    logic: "ISS-164 fixed in U32; new rows for findings F1, F14-F21 as listed in functional-spec.md § 9"
    violation: "project.md Mandated"
    source: "project.md Mandated, team.md"
  - id: BR9.6
    statement: "Every state change of this Unit writes its audit row in the same transaction."
    category: audit
    applies_to: "report.file, facilityReview.setState, evidence hide, the repetition job"
    trigger: "Any write"
    logic: "report.file: case:<code> report (+ hide); facilityReview.setState: facility_review:<id>; evidence hide: evidence:<id>; job: case:<code> repetitionFlag; nothing is written by report.status or ModerationSignals"
    violation: "01-conventions.md §5"
    source: "01-conventions.md §5, C11"
```

## Rules at a glance

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Verified, not restricted/suspended/banned | authorization |
| BR1.2 | 20 reports per account per day, duplicates counted | constraint |
| BR1.3 | Reason enabled in the configuration | validation |
| BR1.4 | Target via its owner, visible or hidden pending; else not_found | validation |
| BR1.5 | Profile = doctor only | constraint |
| BR1.6 | One report per account per target, ever | constraint |
| BR1.7 | Blocks never stop a report; self-reports allowed | policy |
| BR1.8 | report.status: own flag and reasons only | authorization |
| BR2.1 | Advisory lock on the target first | constraint |
| BR2.2 | One open case per target and origin | constraint |
| BR2.3 | Counts by increment, never recomputed | calculation |
| BR2.4 | reports.case_id | constraint |
| BR2.5 | Eligible reporters exclude factual | calculation |
| BR2.6 | Lane critical for critical or dangerous; never downgraded | calculation |
| BR2.7 | SLA hours / business days (Sun–Thu, Dhaka); upgrade takes the earlier | calculation |
| BR2.8 | Coordination signal, monotonic, never hides | calculation |
| BR3.1 | Critical reason hides on first report | policy |
| BR3.2 | Threshold of eligible reporters hides | policy |
| BR3.3 | Factual never hides or counts | policy |
| BR3.4 | At most one hide per case, through the owner | constraint |
| BR3.5 | Review and comment setState, silent | policy |
| BR3.6 | facilityReview.setState built here | policy |
| BR3.7 | Evidence hide by hidden_at; public reads exclude it | policy |
| BR3.8 | Profiles never auto-hide | policy |
| BR4.1 | Reporter column readers allowlisted | constraint |
| BR4.2 | No reporter id in any output | constraint |
| BR4.3 | Audit actor reporter:restricted, allowlisted details | audit |
| BR4.4 | Report-caused hides audited as system | audit |
| BR4.5 | No account id in logs | constraint |
| BR4.6 | Author and public learn nothing about reporters | constraint |
| BR5.1 | One notice and one email per outcome | policy |
| BR5.2 | affectedAccountId conditions (not the reporter) | constraint |
| BR5.3 | Author per target kind | calculation |
| BR5.4 | queueEmail in the transaction, dedupe per outcome | policy |
| BR5.5 | Nothing to the reporter | constraint |
| BR6.1 | Job acts only on repeatEpisode and a live review | policy |
| BR6.2 | Repetition case shape | policy |
| BR6.3 | One repetition case per review | constraint |
| BR6.4 | No earlier review named | constraint |
| BR6.5 | Narrow worker grant | constraint |
| BR7.1 | ModerationSignals | calculation |
| BR7.2 | RevealTarget(report) via identity.reveal only | authorization |
| BR7.3 | reportRefsOf for U33 | constraint |
| BR7.4 | Internals never reachable from server actions | authorization |
| BR8.1 | Gated control | authorization |
| BR8.2 | Reason order | calculation |
| BR8.3 | Sheet content and semantics | policy |
| BR8.4 | Sent and error states | policy |
| BR8.5 | Mount points in release 1 | constraint |
| BR8.6 | en and bn for every string | constraint |
| BR9.1 | Boundary matrix | constraint |
| BR9.2 | Tests per level, smoke | validation |
| BR9.3 | Pins in the same commit | validation |
| BR9.4 | Gate, CI, coverage, high-risk steps | validation |
| BR9.5 | ISS rows | policy |
| BR9.6 | Audit in the same transaction | audit |
