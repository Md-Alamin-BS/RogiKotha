# Business rules — U34 `t-405-notifications`

Source of truth for the Unit's decision logic. Built from T-405 with its amendments, `contract-summary.md` (C2, C15), `stories.md` (AC10.1.1–AC10.1.5, AC3.1.5), FD-047, FD-065, FD-068, FD-070, FD-071, FD-072, FD-075, FD-081, FD-086, FD-087, FD-088, FD-094, the project hard rules and `01-conventions.md` §5, §6, §11. Rules that depend on an answer name the question in `source`; every question was answered A under the owner's no-questions instruction of 2026-10-29.

```yaml
rules:
  # BR1 — routing table (domain/notification/routing.ts)
  - id: BR1.1
    statement: "Every C15 event has exactly one routing entry: a route, none, or deferred with its owner."
    category: constraint
    logic: "ROUTES keys == C15 channel names plus draft.expiring; a test fails on a missing or extra name"
    violation: "An event handled ad hoc, or silently dropped"
    source: "T-405 step 1, C15"
  - id: BR1.2
    statement: "Patient routes in release 1 are account.securityEvent, comment.posted, evidence.stateChanged, report.filed (author part), case.decided, directory.*Decided, dataRequest.ready, dataRequest.completed and draft.expiring."
    category: calculation
    logic: "see functional-spec.md § 4 for recipients, kind, key, params and route of each"
    source: "T-405 step 1, AC10.1.1, Question 5"
  - id: BR1.3
    statement: "Review events, comment.changed, account.registered and the config, hold and retention events route none."
    category: constraint
    logic: "review.published|changed|hidden|restored|deleted, comment.changed, account.registered, config.applied, hold.changed, retention.policyChanged, dataRequest.created, evidence.received, doctor|facility|term.changed -> none"
    violation: "A notice on review.hidden doubles the moderation notice (FD-087); a notice on delete tells repliers the author left"
    source: "FD-087, C15, t-302 BR (no notice), t-401 BR8.4, Question 6"
  - id: BR1.4
    statement: "Appeal events are deferred with appeals; staff-only events are deferred to T-408."
    category: constraint
    logic: "appeal.filed, appeal.decided -> deferred(FD-088); directory.submissionFiled|claimFiled|fieldChangeProposed, identity.revealed, evidence.stateChanged staff states, moderation.bulkBurst -> deferred(T-408)"
    source: "FD-088, Question 1"

  # BR2 — notification.deliver (worker, in-app only)
  - id: BR2.1
    statement: "deliver takes recipients only from the payload fields its route names."
    category: calculation
    logic: "recipients = distinct non-null account ids from those fields; no persona_links read, no block re-check (already filtered in the web tier)"
    violation: "A worker read of persona_links breaks C15; a reporter id cannot be read because no route names one"
    source: "C15, FD-075, FD-086, t-401 BR8.1"
  - id: BR2.2
    statement: "One recipient gets one notice per event; for comment.posted the key follows mention > reply > comment."
    category: calculation
    logic: "role = mention if in mentionedAccountIds, else reply if == replyToAccountId, else comment (reviewAuthorAccountId); the same precedence t-401 uses for the email key"
    source: "t-401 BR8.3, AC10.1.2"
  - id: BR2.3
    statement: "report.filed gives the affected author one notice: hiddenPending when hidden, else reported; never the reporter."
    category: calculation
    logic: "IF affectedAccountId absent THEN no author notice; key = hidden ? notif.moderation.hiddenPending : (caseOpened ? notif.moderation.reported : none); staff row newReport with target_code caseCode"
    violation: "Two notices for one report, or any notice to the reporter (hard rule)"
    source: "FD-086, FD-087, T-405 C11 amendment"
  - id: BR2.4
    statement: "Delivery is idempotent."
    category: constraint
    logic: "insert notifications ... dedupe_key = <name>:<eventId>:<accountId> ON CONFLICT DO NOTHING; staff rows <name>:<eventId>; a retried or repeated job adds nothing"
    violation: "Two items for one event fails AC10.1.2"
    source: "AC10.1.2, T-405 step 4"
  - id: BR2.5
    statement: "deliver never touches email."
    category: constraint
    logic: "no read of email addresses, no email_deliveries insert, no mail.send enqueue from the handler"
    source: "FD-070, FD-041, AC10.1.1 worker row"
  - id: BR2.6
    statement: "No notice when the target or the recipient is gone."
    category: constraint
    logic: "comment.posted: skip if the comment or its review is not published or has deleted_at; any route: skip a recipient whose account_profiles.status is deleted"
    source: "Question 7"
  - id: BR2.7
    statement: "An unknown event name or a payload that fails its schema is logged and finished, not retried."
    category: error
    logic: "log notification.deliver_skipped {eventId, name, reason}; no row"
    source: "construction guardrails (no silent failure)"

  # BR3 — email (queueEmail and mail.send extensions)
  - id: BR3.1
    statement: "emailAllowed: verification, reset, security, device_approval and deletion always; moderation, evidence and discussion by preference."
    category: policy
    logic: "pure function in domain/notification/policies.ts over {emailModeration, emailEvidence, emailDiscussion}; emailSecurity is ignored"
    source: "FD-047, T-405 step 2, AC10.1.5"
  - id: BR3.2
    statement: "queueEmail checks emailAllowed before writing; a disallowed category returns {suppressed: true} and writes nothing."
    category: calculation
    logic: "after contactFor (null -> suppressed) and before the dedupe check; for discussion and moderation it sets params.link = APP_URL/<recipient locale>/notifications"
    source: "C2, Question 4"
  - id: BR3.3
    statement: "mail.send re-checks the preference at send time and marks the row suppressed when it is now off."
    category: calculation
    logic: "read account_preferences (worker SELECT, 0008); IF NOT emailAllowed THEN status suppressed, params cleared, nothing sent; never reads auth_users"
    source: "FD-071, T-405 step 5"
  - id: BR3.4
    statement: "Discussion and moderation email params follow a per-key allowlist and the templates render only {link}."
    category: validation
    logic: "email.discussion.*: {reviewPublicId, commentPublicId, link}; email.moderation.update: {caseCode, link}; anything else -> queueEmail err('validation'), mail.send failed params_invalid"
    source: "FD-047, AC10.1.4, U8 BR6.2, Question 4"
  - id: BR3.5
    statement: "Nothing queues evidence email in the demo."
    category: constraint
    logic: "category evidence accepted by queueEmail; no caller in release 1"
    source: "FD-070, AC10.1.5 (narrowed)"

  # BR4 — content hygiene
  - id: BR4.1
    statement: "Every message key a route can produce exists in en and bn."
    category: validation
    logic: "a test enumerates every route's keys and checks both message files"
    source: "project.md Mandated (bilingual), T-405 step 9"
  - id: BR4.2
    statement: "Params hold public ids, enums and counts only."
    category: constraint
    logic: "per-key allowlist; a test iterates every key: params keys within the allowlist and none named body, text, filename, email, name, city or reporter*"
    violation: "Another user's name, a file name, review text or a reporter in a notice is an S1 defect"
    source: "AD-13, hard rule (reporter identity), T-405 payload hygiene row, Question 8"
  - id: BR4.3
    statement: "Copy never names who acted and never says verified or approved about evidence."
    category: constraint
    logic: "discussion notices say 'Someone'; evidence notices say attached, not verified"
    source: "project.md Forbidden, FD-015 (anonymity)"
  - id: BR4.4
    statement: "A route is a locale-free internal path."
    category: validation
    logic: "matches ^/(?!/)[A-Za-z0-9/_#-]*$; the page prefixes /<locale>; a failing route is not inserted (BR2.7)"
    violation: "An open redirect from a notice link"
    source: "construction guardrails (input validation)"

  # BR5 — queries and commands (web tier)
  - id: BR5.1
    statement: "notification.list, unreadCount and markRead need an authenticated account and act on its own rows only."
    category: authorization
    logic: "requires {authenticated}; pending accounts allowed (security notices); every query filters account_id = actor.accountId"
    source: "C2"
  - id: BR5.2
    statement: "list returns own items newest first, 20 per page, hiding items older than the window."
    category: calculation
    logic: "created_at >= notificationCutoff(now) ordered by (created_at desc, id desc); opaque cursor of the last (created_at, id)"
    source: "C2, AC10.1.3, Question 2"
  - id: BR5.3
    statement: "unreadCount counts own unread items inside the window."
    category: calculation
    logic: "read_at is null AND created_at >= cutoff"
    source: "C2, task step 8"
  - id: BR5.4
    statement: "markRead sets read_at on own unread rows only and is not audited."
    category: calculation
    logic: "ids (1..50) or all: update ... where account_id = actor and read_at is null; foreign or unknown ids change nothing and are not reported; returns {updated}"
    source: "C2, Question 3"
  - id: BR5.5
    statement: "notification.expire deletes rows created before the cutoff it is given."
    category: calculation
    logic: "delete where created_at < before; returns {expired}; expires_at is not read"
    source: "FD-068, C2"

  # BR6 — patient UI
  - id: BR6.1
    statement: "The page renders each notice from its key and params in the active locale, with an unread dot and a relative time."
    category: constraint
    logic: "numerals follow the locale; unread dot from the loaded state; empty list -> mine.empty; persistent note mine.notifNote"
    source: "T-405 step 7, FD-024"
  - id: BR6.2
    statement: "Opening the page marks the visible unread rows read after paint and announces the count."
    category: calculation
    logic: "client island calls markRead {ids}; announce notif.markedRead in the polite live region; no announcement when zero"
    source: "Question 3"
  - id: BR6.3
    statement: "The account menu shows the unread count only above zero."
    category: constraint
    logic: "viewer.unreadCount from notification.unreadCount; T-102 BR8.6 renders it"
    source: "T-102 BR8.6, hard rule (no 0 for a missing value)"
```
