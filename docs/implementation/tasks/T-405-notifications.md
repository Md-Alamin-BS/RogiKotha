# T-405 — Notifications: outbox relay, in-app rows, essential email, patient page

| Field | Value |
|---|---|
| Story | STORY-NOTIF-001 |
| Phase / Lane | 4 / A (page port is a small B slice) |
| Class → model | M1 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1.5 h |
| Depends on | T-009 (worker + pg-boss), T-101 (mail port → Mailpit, `account_preferences`), T-005 (tables §12), T-008 (shell, account menu) |
| Parallel-safe with | T-401, T-403, T-404, T-409 (agree event names from 03 §5 — they are fixed; do not rename) |

## Goal

Turn outbox events into durable in-app notifications (one row per event per recipient, deduplicated, 90-day expiry), essential emails obeying preferences (never carrying content), and staff notifications; port the patient `/notifications` page and the unread count in the account menu.

## Read first

1. `docs/implementation/01-conventions.md` §3, §6, §11
2. `docs/implementation/02-data-model.md` §12 (all four tables), §2 (`account_preferences`)
3. `docs/implementation/03-routes-and-contracts.md` §3 (`Mailer`, `JobQueue`, `Outbox`), §4 "notification", §5 events/jobs
4. `ARCHITECTURE-SPINE.md` AD-13 (nothing sensitive leaves approved boundaries)
5. Prototype: `app.js` 1824–1842 (`renderNotifications`), 1843–1851 (`workspaceNav`); fixtures `RK.user.notifications` (five kinds: `evidence, discussion, moderation, security, draft`), `RK.moderation.notifications` (six staff kinds); `styles.css` `.notif`, `.notif.unread`, `.dot`, `.when`
6. `docs/design/auth-screens-spec.md` §1 (account menu with unread count), §5 `email.*` keys already defined (do not duplicate)

## Owned paths

- `packages/domain/src/notification/` (`routing.ts` — the event → recipients/keys table as data, `policies.ts` — `emailAllowed(category, preferences)`, tests)
- `packages/application/src/modules/notification/**` (`queries/list.ts`, `unread-count.ts`, `commands/mark-read.ts`, `staff-list.ts`, `staff-ack.ts`, `internal/deliver.ts`, `internal/send-mail.ts`, `authorization.ts`)
- `packages/application/src/ports/repositories/notification.ts`
- `packages/contracts/src/schemas/notification.ts`, `view-models/notification.ts` (`NotificationVM`, `StaffNotificationsVM`)
- `packages/database/src/repositories/notification.ts`, `packages/database/src/queue/outbox-relay.ts` (if T-009 left it as a stub)
- `apps/worker/src/handlers/outbox-relay.ts`, `notification-deliver.ts`, `mail-send.ts`
- `apps/web/src/components/patient/Notifications.tsx`, `apps/web/src/app/[locale]/(patient)/notifications/page.tsx`, `apps/web/src/server/actions/notification.ts`; the unread `.count` inside the account menu component from T-102 (one hunk)
- `packages/test-support/src/fakes/notification-repository.ts`, `fakes/mailer.ts` (if absent)
- `packages/i18n/messages/{en,bn}.json` — `notif.*` keys

## Not in scope

Producing events (owning modules already do), staff notification **views** (T-408), push/SMS/digests (excluded by scope), retention of notifications past 90 days (T-309's `retention.expire` deletes them — expose `deleteExpired(before)` in the repository).

## Steps

1. **Routing table** (`domain/notification/routing.ts`) — data, one entry per event in 03 §5. Params are ids, enums and counts only; `message_key` resolves in both locales with those params:

   | Event | Recipients | kind | message_key | params | email category |
   |---|---|---|---|---|---|
   | `account.registered` | the account | — (email only) | `email.verify.*` | `{link}` | `verification` (always) |
   | `account.securityEvent {kind: passwordChanged|newSignIn|signOutAll|deviceApproved|existingEmailRegister}` | the account | `security` | `notif.security.<kind>` | `{when}` | `security` (always) |
   | `evidence.stateChanged {state}` | uploader | `evidence` | `notif.evidence.<state>` (`preview_ready`, `failed`, `published`, `original_expired`, `removed`) | `{itemPublicId, reviewPublicId, failReason?}` | `evidence` (if preference) |
   | `comment.posted` | review author (unless self or blocked) + mentioned accounts (unless blocked) | `discussion` | `notif.discussion.comment` / `.mention` / `.reply` | `{reviewPublicId, commentPublicId}` | `discussion` (default off) |
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
   | `dataRequest.ready|completed` | account | `security` | `notif.data.<kind>.<status>` | `{requestId}` | `deletion`/`security` (always) |

   If an event in 03 §5 is missing here, add it to this table rather than handling it ad hoc. Emit `directory.*` events from T-204 if they do not exist yet — note it as a follow-up for T-204's owner rather than editing their module.
2. **`emailAllowed(category, prefs)`**: `verification, reset, security, device_approval, deletion` always; `moderation`, `evidence`, `discussion` by preference.
3. **Outbox relay** (worker job `outbox.relay`, every 2 s, `singletonKey: 'outbox'`): select unprocessed rows in batches of 100 `FOR UPDATE SKIP LOCKED`, enqueue `notification.deliver {eventId}` (+ `search.refresh`, `evidence.process`, `data.*` for their events — the relay is generic: map by event name to job names from 03 §5), mark `processed_at`.
4. **`notification.deliver` job**: load the event; resolve recipients through the routing table (recipient resolution needs private links for "review author" — use `identity.accountsOf`, worker-safe read-only query that returns account ids for personas; confirm the worker DB role can read the view T-104 exposes for this; if not, the web process must precompute `affectedAccountId` into the payload — T-404 already does for `case.decided`; do the same for `comment.posted` (T-401 emits `mentionedAccountIds`; add `reviewAuthorAccountId` as a follow-up request to T-401's owner if missing); insert `notifications` with `dedupe_key = <event>:<eventId>:<accountId>` (`ON CONFLICT DO NOTHING`), `expires_at = now + notificationDays`; for staff kinds insert `staff_notifications` with `dedupe_key = <event>:<eventId>`; enqueue `mail.send {deliveryId}` after inserting `email_deliveries (status queued)` when `emailAllowed`.
5. **`mail.send` job**: load delivery; render subject/body from `message_key` in the recipient's `interface_locale` with params → `Mailer.send`; `sent` / `failed` (+ `attempts`, `last_error_code`); retryLimit 5 with backoff; `suppressed` when preference changed between queue and send. Body never includes review text, file names, or other users' names — enforce with a params allowlist per key (test).
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
| Blocked/self | test | author commenting on own review gets no notification; blocked user's comment yields none for the blocker |
| Page | component test `en`/`bn` | five kinds render, unread dot, empty state |
| Retry | test with failing FakeMailer twice | delivery `sent` on 3rd attempt, `attempts = 3` |

## Tests to write

Domain: routing table completeness (every event in 03 §5 has an entry or an explicit `none`), `emailAllowed` table. Application/worker: rows above. Component: page.

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
