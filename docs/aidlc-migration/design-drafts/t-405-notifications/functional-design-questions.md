# Functional Design — questions (U34 `t-405-notifications`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-405-notifications/functional-design/`. Drafted on 2026-10-29.

Context:
- Unit U34 delivers T-405 (`docs/implementation/tasks/T-405-notifications.md`, with its FD-045..FD-075 and FD-076..FD-090 amendments) for US10.1 (AC10.1.1–AC10.1.5) and the in-app half of AC3.1.5. It depends on U8 T-101, U9 T-102, U3 T-010, U4 CR-011 and U5 CR-006; U22 T-302, U30 T-401, U32 T-403, U33 T-404, U37 T-408 and U39 T-410 depend on it.
- This draft covers the patient path for release 1: the in-app list, the unread count, in-app notices from domain events, and the optional discussion and moderation email through the existing mail path. Staff views and configuration are T-408's.
- Inputs read: the task file, `unit-of-work-dependency.md`, US10.1 and AC3.1.5, FR87/FR88, C2 and C15, the decision log, the `t-101`, `t-102`, `t-302` and `t-401` drafts, and the notification schema, contracts, relay, migrations `0005`/`0008` and message files on `main`.

## Settled before this stage

- **The worker is in-app only**; discussion and moderation email is queued by the publishing command in the web tier through `notification.queueEmail` (FD-070, FD-075, C2).
- **Recipients arrive as account ids in the event payload**, already filtered for self and blocks in the web tier; a reporter's id never appears (C15, FD-086).
- **Review events route no notice** (FD-087); appeal events are not routed in release 1 (FD-088); no export-ready email (FD-081).
- **U8 T-101 builds the first `queueEmail`, `RecipientDirectory.contactFor` and the `mail.send` use case with retries** (FD-071, FD-094, FD-097); this Unit extends them.
- **Expiry deletes by `created_at`** through `notification.expire {before}` (FD-068, C2).
- **The worker's grants are enough**: it reads `comments`, `reviews`, `account_profiles (status)` and `account_preferences` (FD-092, `0008`).

## Settled in this design without a question

- **Security notices carry no `{when}` param**: the row's `created_at` is the time shown, so the param would only repeat it.
- **Case codes are identifiers**, shown as stored in both languages; numerals inside them are not localised.
- **The unread count is computed on every server render** of the account menu; no polling (task step 8).

## Question 1

**How much staff-side work does this Unit carry?** C2 binds `staffNotification.list` and `staffNotification.ack` to this Unit, and the `report.filed` acceptance row expects a staff `newReport` item. The brief puts staff views and configuration in T-408.

A. **The binding minimum** (recommended). `notification.deliver` writes the `newReport` staff row for `report.filed`; `staffNotification.list` and `staffNotification.ack` are built as thin queries with no UI; every other staff-only route (directory filings, `identity.revealed`, staff evidence states, `moderation.bulkBurst`) is marked `deferred: T-408` in the routing table.
B. Defer all staff work, including the two queries, to T-408. Needs a new FD row, because C2 binds them here.
C. Build every staff route now. Larger Unit, nobody reads the rows before T-408.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**Where does the 90-day window come from before T-309 exists?** C2 says `notification.list` hides items older than `notification_days`; the retention policy that holds it is T-309's, which comes later.

A. **One domain function** (recommended): `notificationCutoff(now, days = 90)` in `domain/notification/policies.ts`, used by `list` and `unreadCount`. T-309 passes the policy value in when it builds `retention.expire`. Marked `ASSUMPTION(t-405)`.
B. Read `retention_policies` now. Couples this Unit to a table T-309 has not shaped yet.
C. A new `ConfigProvider` key. Duplicates a retention value in runtime config.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**How are notices marked read?** The prototype has no control; the task says opening the page marks visible rows read and announces it.

A. **Implicit, after paint** (recommended). The page renders the rows with their unread dots as loaded; a small client island then calls `notification.markRead {ids}` for the unread rows on screen and announces "3 notifications marked read" in the polite live region. The account menu's count updates on the next navigation.
B. An explicit "Mark all read" button. One more control the prototype does not have.
C. Mark a row read on click only. The count never clears for notices the user has seen but not opened.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**What do the discussion and moderation emails say?** `t-401` passes `messageKey` "the role key by precedence mention > reply > comment" with `{reviewPublicId, commentPublicId}`; T-403 and T-404 pass moderation outcomes. U8's mail rule allows one absolute link and nothing else.

A. **Content-free, one link** (recommended). Three discussion keys `email.discussion.{comment,reply,mention}` and one moderation key `email.moderation.update`. `queueEmail` adds `{link}` (the notifications page in the recipient's locale) for these categories; the callers' ids pass the allowlist, the templates render only `{link}`. The in-app notice carries the detail.
B. One email key per moderation action (eleven keys). More copy, no extra safety.
C. No link. Harder to act on, no privacy gain.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**Which kind do provider decisions use?** `directory.{submission,claim,fieldChange}Decided {…, recipientAccountId}` are patient-facing (FR87 "provider profile approval/claim"), but `notification_kind` has only `evidence, discussion, moderation, security, draft`.

A. **Add the kind `provider`** (recommended): one `ALTER TYPE … ADD VALUE` in this Unit's migration and one value in `NOTIFICATION_KINDS`. Needs an FD row (an enum change in a data boundary).
B. Reuse `moderation`. A claim decision would read as a moderation action.
C. Defer provider notices. Leaves part of AC10.1.1 open.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**Do reactions and review publication notify?** AC10.1.1 lists both, but C15 has no reaction event and routes `review.published` to no notice.

A. **No notice in release 1** (recommended): the author already sees publication on screen, and a notice per Like is noise. Recorded as a narrowing of FR87 in a new FD row.
B. Add a `reaction.set` event and a notice. Changes T-401, which is past its draft.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**What if the target is gone when the job runs?** A comment can be deleted or hidden between `comment.post` and `notification.deliver`.

A. **Skip the notice** (recommended): `deliver` checks that the comment and its review are still published and not deleted; if not, it writes nothing and finishes. A notice never links to removed content.
B. Notify anyway. The link leads to a tombstone or a not-found page.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**What happens to the five prototype `notif.*` keys?** `notif.replyReceived {name}`, `notif.evidenceReady {label}` and `notif.securityNewDevice {city}` carry another user's name, a file label and a location, which the params rule forbids.

A. **Retire all five and replace them** (recommended) with the content-free keys in `functional-spec.md` § 6; remove them from `packages/i18n/src/keys.ts` and both message files. Nothing in code renders them today.
B. Keep them for the seed. They would fail the payload-hygiene test.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Decided under the owner's no-questions instruction of 2026-10-29

All eight questions above. Questions 5 and 6 change a data boundary or narrow a requirement, so `functional-spec.md` § 9 gives the two FD entries the build appends before code. Each becomes a row in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it.
