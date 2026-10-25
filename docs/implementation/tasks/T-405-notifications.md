# T-405 — Notifications: outbox relay, in-app rows, essential email, patient page

| Field | Value |
|---|---|
| Story | STORY-NOTIF-001 |
| Phase / Lane | 4 / A (page port is a small B slice) |
| Class → model | M1 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1.5 h |
| Depends on | T-009 (worker + pg-boss), T-101 (mail port → Mailpit, `account_preferences`, the worker's `mail.send` handler this task extends (FD-071), the severe sign-in activity outbox event (FD-072)), T-005 (tables §12), T-008 (shell, account menu), T-102 (the patient account menu and pages this task adds the unread count and notifications page to) |
| Parallel-safe with | T-409 (agree event names from 03 §5 — they are fixed; do not rename). T-302, T-401, T-403 and T-404 come after this task (FD-075) |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-047** — The optional email categories (`emailDiscussion`, `emailEvidence`, `emailModeration`) are Phase 1, not future scope; essential email stays content-free. Step 2 marks them so.
- **FD-052** — `dataRequest.created` is routed by the request's kind (`data.export` or `data.delete`), not to both jobs (`ISS-188`). T-410 makes that change in the relay's event → job map; step 3 notes it.
- **FD-065** — `notification` owns `outbox_events`. Every module writes its outbox rows through the outbox port in the same transaction as its change; step 3 says so.
- **FD-070** — `notification.deliver` in the worker creates in-app items only and never queues email. Discussion and moderation email is queued from the web tier, with `to_email_enc` filled there. The evidence email category sends nothing in the demo, and AC10.1.5 covers the discussion and moderation categories only. The export-ready email is dropped or queued from the web tier, as decided in Contract Design. `email_deliveries.category` needs a discussion value, named in Contract Design. Changes: Goal, the routing table's email column (step 1), step 2, step 4, Owned paths and new acceptance rows.
- **FD-075** (with FD-070) — The commands that publish discussion and moderation events call this task's web-tier email queueing directly, in the same transaction as their change: T-401 (`comment.post`), T-302 and T-403 (`review.setState` hide and restore), and T-404 (`moderation.decide`, `moderation.restore` and `appeal.decide`). Those four Units therefore come after T-405, and each tests its own emails end to end. T-405 builds the queueing internal and its tests but edits no publishing command. Changes: Parallel-safe with, step 4 and a new acceptance row. Those publishers also put the recipient account ids into their event payloads, so `notification.deliver` (step 4) takes them from the payload instead of resolving persona links; T-102 is added to Depends on because this task adds the unread count to the patient account menu and the notifications page.
- **FD-071** — T-101 builds the worker's `mail.send` handler (`apps/worker/src/handlers/mail-send.ts`), which reads the recipient from `email_deliveries.to_email_enc` and never from `auth_users` (FD-041). T-405 extends it with the preference check, the `suppressed` status, the per-key params allowlist and retries, and no longer creates it. Changes: Depends on, Owned paths, step 5.
- **FD-072** — T-405 consumes the severe sign-in activity outbox event that T-101 writes and creates the in-app `security` notification for the account; T-101 sends the severe-activity email itself. Contract Design names the event. Changes: Depends on, a new routing-table row in step 1, a new acceptance row.

## Goal

Turn outbox events into durable in-app notifications (one row per event per recipient, deduplicated, 90-day expiry), essential emails obeying preferences (never carrying content; queued by the web tier, never by the worker — FD-070), and staff notifications; port the patient `/notifications` page and the unread count in the account menu.

## Read first

1. `docs/implementation/01-conventions.md` §3, §6, §11
2. `docs/implementation/02-data-model.md` §12 (all four tables), §2 (`account_preferences`)
3. `docs/implementation/03-routes-and-contracts.md` §3 (`Mailer`, `JobQueue`, `Outbox`), §4 "notification", §5 events/jobs
4. `ARCHITECTURE-SPINE.md` AD-13 (nothing sensitive leaves approved boundaries)
5. Prototype: `app.js` 1824–1842 (`renderNotifications`), 1843–1851 (`workspaceNav`); fixtures `RK.user.notifications` (five kinds: `evidence, discussion, moderation, security, draft`), `RK.moderation.notifications` (six staff kinds); `styles.css` `.notif`, `.notif.unread`, `.dot`, `.when`
6. `docs/design/auth-screens-spec.md` §1 (account menu with unread count), §5 `email.*` keys already defined (do not duplicate)
7. `docs/status/decision-log.md` FD-041, FD-047, FD-052, FD-065, FD-070, FD-071, FD-072; ADR-003 and ADR-013 in `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/domain-design/decisions.md`; T-101's hand-off for the `mail.send` handler and the severe sign-in activity event

## Owned paths

- `packages/domain/src/notification/` (`routing.ts` — the event → recipients/keys table as data, `policies.ts` — `emailAllowed(category, preferences)`, tests)
- `packages/application/src/modules/notification/**` (`queries/list.ts`, `unread-count.ts`, `commands/mark-read.ts`, `staff-list.ts`, `staff-ack.ts`, `internal/deliver.ts` (in-app only, FD-070), `internal/send-mail.ts` (extends what T-101 builds, FD-071), the web-tier email-queueing internal for discussion and moderation email (file named with its signature in Contract Design, FD-070), `authorization.ts`)
- `packages/application/src/ports/repositories/notification.ts`
- `packages/contracts/src/schemas/notification.ts`, `view-models/notification.ts` (`NotificationVM`, `StaffNotificationsVM`)
- `packages/database/src/repositories/notification.ts`, `packages/database/src/queue/outbox-relay.ts` (if T-009 left it as a stub)
- `apps/worker/src/handlers/outbox-relay.ts` (except the `dataRequest.created` routing entry, which T-410 changes — FD-052), `notification-deliver.ts`; `mail-send.ts` is created by T-101 — T-405 extends it with the preference check, `suppressed`, the per-key params allowlist and retries (FD-071)
- `apps/web/src/components/patient/Notifications.tsx`, `apps/web/src/app/[locale]/(patient)/notifications/page.tsx`, `apps/web/src/server/actions/notification.ts`; the unread `.count` inside the account menu component from T-102 (one hunk)
- `packages/test-support/src/fakes/notification-repository.ts`, `fakes/mailer.ts` (if absent)
- `packages/i18n/messages/{en,bn}.json` — `notif.*` keys

## Not in scope

Producing events (owning modules already do), staff notification **views** (T-408), push/SMS/digests (excluded by scope), retention of notifications past 90 days (T-309's `retention.expire` deletes them — expose `deleteExpired(before)` in the repository).

## Steps

1. **Routing table** (`domain/notification/routing.ts`) — data, one entry per event in 03 §5. Params are ids, enums and counts only; `message_key` resolves in both locales with those params:

   | Event | Recipients | kind | message_key | params | email category (queued by the web tier, never by the worker — FD-070) |
   |---|---|---|---|---|---|
   | `account.registered` | the account | — (email only) | `email.verify.*` | `{link}` | `verification` (always; queued by T-101's web command, FD-071) |
   | `account.securityEvent {kind: passwordChanged|newSignIn|signOutAll|deviceApproved|existingEmailRegister}` | the account | `security` | `notif.security.<kind>` | `{when}` | `security` (always; queued by the web command that emits the event) |
   | severe sign-in activity (event from T-101, named in Contract Design, FD-072) | the account | `security` | `notif.security.<key named with the event in Contract Design>` | `{when}` | none from this row — T-101 queues the severe-activity email itself (FD-072) |
   | `evidence.stateChanged {state}` | uploader | `evidence` | `notif.evidence.<state>` (`preview_ready`, `failed`, `published`, `original_expired`, `removed`) | `{itemPublicId, reviewPublicId, failReason?}` | none in the demo: the event starts in the worker, so it is in-app only (FD-070) |
   | `comment.posted` | review author (unless self or blocked) + mentioned accounts (unless blocked) | `discussion` | `notif.discussion.comment` / `.mention` / `.reply` | `{reviewPublicId, commentPublicId}` | `discussion` (default off; queued from the web tier, FD-070) |
   | `comment.changed` | none | — | — | — | — |
   | `review.published` | author | `draft`? no — none (author knows) | — | — | — |
   | `review.hidden {reason}` | author | `moderation` | `notif.moderation.hidden` | `{reviewPublicId, reasonCode, appealRoute}` | `moderation` |
   | `review.restored` | author | `moderation` | `notif.moderation.restored` | `{reviewPublicId}` | `moderation` |
   | `case.decided {action}` | affected author | `moderation` | `notif.moderation.<action>` | `{caseCode, action, reasonCode, appealRoute}` | `moderation` |
   | `appeal.decided {status}` | appellant | `moderation` | `notif.moderation.appeal.<status>` | `{caseCode}` | `moderation` |
   | `report.filed` | staff (all) | staff `newReport` | `notif.staff.newReport` | `{caseCode, reasons[], hidden}` | — |
   | `appeal.filed` | staff | staff `newReport`? → use kind `newReport` with key `notif.staff.appeal` | `{caseCode}` | — |
   | `evidence.stateChanged {preview_ready|scan_unavailable|failed}` | staff | staff `evidence` | `notif.staff.evidence.<state>` | `{itemPublicId}` | — |
   | `directory.claimFiled` / `directory.fieldChangeProposed{protected}` / `directory.submissionFiled` | staff | `claim` / `protectedChange` / `claim` | `notif.staff.*` | `{targetPublicId}` | — |
   | `identity.revealed` | staff (super_admin) | `identityReveal` | `notif.staff.identityReveal` | `{caseCode}` | — |
   | `moderation.bulkBurst` | staff (super_admin) | `security` | `notif.staff.bulkBurst` | `{count, minutes}` | — |
   | `draft.expiring` (from `retention.expire`, 4 days before) | draft owner | `draft` | `notif.draft.expiring` | `{draftId, days}` | — |
   | `dataRequest.ready|completed` | account | `security` | `notif.data.<kind>.<status>` | `{requestId}` | none from the worker (FD-070); the export-ready email is dropped or queued from the web tier, as decided in Contract Design |

   The `moderation` rows' email is queued from the web tier as well (FD-070). The email column says which category the web tier queues for an event; `notification.deliver` never queues email. If an event in 03 §5 is missing here, add it to this table rather than handling it ad hoc. Emit `directory.*` events from T-204 if they do not exist yet — note it as a follow-up for T-204's owner rather than editing their module.
2. **`emailAllowed(category, prefs)`**: `verification, reset, security, device_approval, deletion` always; `moderation`, `evidence`, `discussion` by preference — these optional categories are Phase 1 (FD-047). In the demo nothing queues `evidence` email (FD-070), so AC10.1.5 is tested for `discussion` and `moderation` only. `email_deliveries.category` needs a `discussion` value; Contract Design names it (FD-070).
3. **Outbox relay** (worker job `outbox.relay`, every 2 s, `singletonKey: 'outbox'`): select unprocessed rows in batches of 100 `FOR UPDATE SKIP LOCKED`, enqueue `notification.deliver {eventId}` (+ `search.refresh`, `evidence.process`, `data.*` for their events — the relay is generic: map by event name to job names from 03 §5), mark `processed_at`. `notification` owns `outbox_events`; every module writes its rows through the outbox port in the same transaction as its change, never directly (FD-065). `dataRequest.created` maps to `data.export` or `data.delete` by the request's kind; T-410 changes that entry (FD-052, `ISS-188`).
4. **`notification.deliver` job (in-app only, FD-070)**: load the event; take the recipient **account ids** from the event payload, where the publishing command resolved them in the web tier (the worker cannot read `persona_links`; Contract Design adds the account-id fields to the 03 §5 payloads, for example `affectedAccountId` on `case.decided` and `reviewAuthorAccountId` and `mentionedAccountIds` on `comment.posted`; T-302, T-401, T-403 and T-404 come after this task and fill them, FD-075); apply the routing table's rules (no notification to the actor, none across a block, using the block list the payload or a worker-readable query supplies, as Contract Design decides); insert `notifications` with `dedupe_key = <event>:<eventId>:<accountId>` (`ON CONFLICT DO NOTHING`), `expires_at` from the notification period in `retention_policies` (FD-068; how `deliver` reads it is decided in Contract Design); for staff kinds insert `staff_notifications` with `dedupe_key = <event>:<eventId>`. The job never resolves an email address, never inserts `email_deliveries` and never enqueues `mail.send` (FD-070, FD-041). **Web-tier email queueing (FD-070)**: for the `discussion` and `moderation` categories, the web tier inserts `email_deliveries (status queued)` with `to_email_enc` filled from the recipient's account (through Account's `RecipientDirectory` port, FD-067) when `emailAllowed`, and enqueues `mail.send {deliveryId}`. T-405 builds that queueing internal and its tests, and edits no publishing command: the publishing Units (T-401, T-302, T-403, T-404) call it directly in the same transaction as their change (FD-075). Contract Design names the call and its signature.
5. **`mail.send` job (extends T-101's handler, FD-071)**: T-101 already loads the delivery, reads the recipient from `email_deliveries.to_email_enc` (never from `auth_users`, FD-041), renders subject/body from `message_key` in the recipient's `interface_locale` with params → `Mailer.send` and records `sent` / `failed`. T-405 adds the preference check at send time (`suppressed` when the preference changed between queue and send), `attempts` and `last_error_code`, and retryLimit 5 with backoff. Body never includes review text, file names, or other users' names — enforce with a params allowlist per key (test).
6. **Queries/commands**: `notification.list {cursor}` (newest first, unexpired), `notification.unreadCount`, `notification.markRead {ids|all}`; `staffNotification.list`, `staffNotification.ack {id}` (T-408 renders).
7. **Patient page port** (`Notifications.tsx`): `indexHead(nav.mine, mine.notifications, mine.notifNote)` + `workspaceNav('notifications')` + `.panel` list of `.notif[.unread]` rows with `.dot`, message text from `message_key`+params, `.when` relative time; empty state `mine.empty`; each row links to `route`; opening the page marks visible rows read (server action) — the prototype had no explicit control; keep it implicit and announce the count read.
8. **Account menu**: unread `.count` from `notification.unreadCount` (server component; no polling).
9. **i18n**: every `notif.*` key in both files, written in the prototype's register (mirror the five seeded texts for the five kinds, generalised with params).
10. `pnpm check`; hand-off.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Idempotent delivery | worker handler test: run `notification.deliver` for the same event 3× | exactly one `notifications` row per recipient |
| Preferences | test | `discussion` email suppressed by default; `security` sent regardless |
| Payload hygiene | test iterating every `message_key` | params keys ⊆ allowlist; no key named `body|text|filename|email|reporter*` |
| Mailpit round-trip | manual after `pnpm infra:up` | password change → mail visible at `:8025` in the account's locale |
| Blocked/self | test with synthetic `comment.posted` events (the real comment commands arrive later, with T-401) | an event whose actor is the review author yields no notification; an event from a blocked account yields none for the blocker; T-401 repeats the check with real comments in its own Build and Test |
| Page | component test `en`/`bn` | five kinds render, unread dot, empty state |
| Retry | test with failing FakeMailer twice | delivery `sent` on 3rd attempt, `attempts = 3` |
| FD-070: Worker is in-app only | worker handler test: run `notification.deliver` for every event in the routing table, with every optional email category on | in-app rows appear as routed; zero `email_deliveries` rows inserted and zero `mail.send` jobs enqueued by the handler (AC10.1.1) |
| FD-070: Evidence email inert | worker test: `evidence.stateChanged {failed}` for an uploader with `emailEvidence` on | one `evidence` in-app item; no email queued or sent (AC10.1.5, narrowed by FD-070) |
| FD-070: Discussion and moderation email from the web tier | application test: `comment.posted` and `case.decided` with the category off, then on | off → no `email_deliveries` row, in-app item still appears; on → one `email_deliveries` row queued by the web tier with `to_email_enc` filled and content-free params, category `discussion` / `moderation` (AC10.1.5, AC10.1.4) |
| FD-075: Queueing internal, called by the publishing Units | application test of the queueing internal with `comment.posted` and `case.decided` inputs, preference off then on | off → no row; on → one `email_deliveries` row with `to_email_enc` filled and content-free params; this task edits no command in T-302, T-401, T-403 or T-404 (their own FD-075 rows test the calls end to end) |
| FD-071: Extended `mail.send` | worker test: queue a `moderation` email, turn the preference off, then run `mail.send` | delivery `suppressed`, nothing sent; the handler never queries `auth_users` (recipient from `to_email_enc` only) |
| FD-072: Severe sign-in notice | worker test: deliver T-101's severe sign-in activity event (name from Contract Design) 3× | exactly one `security` in-app notification for that account; no email queued by the worker (AC3.1.5) |

## Tests to write

Domain: routing table completeness (every event in 03 §5 has an entry or an explicit `none`), `emailAllowed` table. Application/worker: rows above, including the FD-070, FD-071 and FD-072 rows. Component: page.

## Hard-rule checklist

- [ ] No medical text, file names, reporter identity, or other users' identities in notification params or email bodies.
- [ ] One user-visible item per event under retry.
- [ ] Email only for allowed categories; security categories always.
- [ ] Both locales; numerals follow language; no attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
