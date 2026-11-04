# Functional specification — U34 `t-405-notifications`

Draft written ahead of the stage, 2026-10-29. Questions are in `functional-design-questions.md`, data in `entities.md`, decision logic in `rules.md`.

## 1. What changes

A signed-in patient gets an in-app list of notices at `/<locale>/notifications` and an unread count in the account menu. Notices are created by the worker's `notification.deliver` job from outbox events: replies, comments and mentions on their writing, moderation outcomes on their content, evidence processing, security events, provider decisions, data requests and draft expiry. Each event gives each recipient exactly one notice. The worker never sends or queues email (FD-070). The optional discussion and moderation emails are queued by the publishing command in the web tier, through `queueEmail`, which this Unit extends with the preference check. `mail.send` gets a send-time re-check. Staff views are T-408's; this Unit writes only the `newReport` staff row and two thin staff queries that C2 binds here (Question 1).

## 2. As is (`main` at `19fff92`) and what U8 and U9 leave

- The four tables exist (T-005); `notifications` has only its unique `dedupe_key`, and the `email_deliveries.category` CHECK lacks `discussion`.
- `RELAY` still routes every `review.*`, `comment.changed` and `appeal.decided` to `notification.deliver`. `NotificationDeliverJobInput` is `z.unknown()` and `NotificationVM` carries `TODO(T-405)`. The page is a placeholder. Five prototype `notif.*` keys exist (retired, Question 8).
- U8 T-101 leaves `defineCommand` (`sendsMail`), `UnitOfWork`, `Outbox`, the first `queueEmail` (`contactFor`, allowlist, dedupe, insert, enqueue), `RecipientDirectory.contactFor`, `mail.send` with retries to 6 attempts and params clearing, and `account.securityEvent {kind: severeSignInActivity}` (FD-072). U9 T-102 leaves `AccountMenu` with `viewer.unreadCount` (its BR8.6) and `WorkspaceNav current="notifications"`.

## 3. Workflows

### WF1 — Code Generation order

Domain (`routing.ts`, `policies.ts`, `params.ts`) → contracts (`DeliverJobInput` and the routed payload schemas, `ids.max(50)`, `NotificationVM.href`, `provider`) → migration and repository → application (queries, `markRead`, `expire`, `deliver` exported through `@rogikotha/application/worker`, the `queueEmail` and `sendEmailDelivery` extensions, staff list/ack) → worker handler, registry, `RELAY` → web (action, page, island, menu hunk, keys) → seed, smoke, `pnpm check`, `pnpm smoke`.

### WF2 — `notification.deliver {eventId, name, payload}` (worker)

1. Parse the envelope; look up `ROUTES[name]`. `none` or `deferred` → finish. Unknown name or payload failing its schema → log `notification.deliver_skipped`, finish (BR2.7).
2. Collect recipients from the fields the route names; drop nulls; one entry per account, role by precedence (BR2.1, BR2.2).
3. Resolve params: public ids of the review, comment or evidence item through worker-readable reads. For `comment.posted`, skip everything when the comment or its review is no longer published (BR2.6).
4. Drop recipients whose account status is `deleted`.
5. One transaction: insert each notice with `ON CONFLICT (dedupe_key) DO NOTHING`; for `report.filed` also the `newReport` staff row (BR2.3, BR2.4).
6. No email work of any kind (BR2.5). Log `notification.delivered {eventId, name, inserted}`.

### WF3 — `queueEmail` extension (web tier)

U8's steps stay. Between `contactFor` and the allowlist check: `emailAllowed(category, prefs)` false → `ok({suppressed: true})`, nothing written (BR3.2). For `discussion` and `moderation` set `params.link = APP_URL/<prefs locale>/notifications`. Allowlists for the four new email keys are added (BR3.4). The signature is unchanged (C2).

### WF4 — `mail.send` extension (worker)

After loading a `queued` row and before decrypting: read the account's preferences; `emailAllowed` false → `suppressed`, params cleared, finish (BR3.3). U8's retries already meet the task's retry row (sent on the 3rd attempt, `attempts = 3`); this Unit adds that test only.

### WF5 — `notification.list`, `unreadCount`, `markRead` (web tier)

As BR5.1–BR5.4. The server action `markNotificationsRead(ids)` wraps `markRead` and revalidates the layout so the menu count updates on the next navigation.

### WF6 — `notification.expire {before}` (internal)

As BR5.5. T-309's `retention.expire` calls it with `now − notificationDays`.

### WF7 — Patient page and menu

`page.tsx` (server): `notification.list` → `Notifications` with `ViewShell` and `WorkspaceNav current="notifications"`; heading `mine.notifications`, note `mine.notifNote`; a `.panel` list of `.notif` rows (`.notif.unread` with `.dot`), the text from `t(messageKey, params)`, `.when` relative time from the shared formatter, the row a `Link` to `/<locale><href>`; "Show older" (`notif.more`) when `nextCursor`; empty → `mine.empty`. `MarkVisibleRead` (client) calls the action for the unread ids after mount and announces `notif.markedRead` (BR6.2). Styles: the FD-091 patient tokens, plain CSS, no animation library. Layout: `notification.unreadCount` → `viewer.unreadCount` for `AccountMenu`.

## 4. Routing table (patient routes, release 1)

| Event (C15 payload) | Recipients (role) | kind | message_key | params | route |
|---|---|---|---|---|---|
| `account.securityEvent {accountId, kind}` | `accountId` | `security` | `notif.security.<kind>` (six kinds incl. `severeSignInActivity`, FD-072) | `{}` | `/me/security` |
| `comment.posted {commentId, reviewId, reviewAuthorAccountId?, mentionedAccountIds, replyToAccountId?}` | the three fields (mention > reply > comment) | `discussion` | `notif.discussion.{mention,reply,comment}` | `{reviewPublicId, commentPublicId}` | `/experiences/<reviewPublicId>#comment-<commentPublicId>` |
| `evidence.stateChanged {itemId, reviewId?, state, uploaderAccountId}` | `uploaderAccountId` | `evidence` | `notif.evidence.<state>` for `preview_ready, published, failed, rejected, removed`; other states none | `{itemPublicId, reviewPublicId?}` | `/experiences/<reviewPublicId>` or `/me` |
| `report.filed {caseCode, caseOpened, hidden, affectedAccountId?}` | `affectedAccountId` | `moderation` | `notif.moderation.hiddenPending` or `.reported` (BR2.3) | `{caseCode}` | `/me` |
| `case.decided {caseCode, action, affectedAccountId?}` | `affectedAccountId` | `moderation` | `notif.moderation.<action>` (eleven, incl. `restore`, `none`) | `{caseCode, action}` | `/me` |
| `directory.{submission,claim,fieldChange}Decided {…, decision, recipientAccountId}` | `recipientAccountId` | `provider` | `notif.provider.{submission,claim,fieldChange}Decided` | `{decision}` | `/me` |
| `dataRequest.ready {requestId, accountId}` | `accountId` | `security` | `notif.data.ready` | `{}` | `/me` |
| `dataRequest.completed {requestId, accountId}` | `accountId` | `security` | `notif.data.completed` | `{}` | `/me` |
| `draft.expiring {draftId, accountId, days}` (published by T-309) | `accountId` | `draft` | `notif.draft.expiring` | `{days}` | `/write` |

Everything else: `none` or `deferred` per BR1.3 and BR1.4. `report.filed` also writes one shared staff row `newReport` (`notif.staff.newReport`, `{caseCode}`, route `/admin`).

## 5. Relay map changes (`RELAY`, `notification.deliver` entries only)

Remove `notification.deliver` from `review.published`, `review.changed`, `review.hidden`, `review.restored`, `review.deleted`, `comment.changed`, `appeal.decided`. Add it to `directory.submissionDecided`, `directory.claimDecided`, `directory.fieldChangeDecided`, `dataRequest.ready`, `dataRequest.completed`, `draft.expiring`. Keep it on `account.securityEvent`, `evidence.stateChanged`, `comment.posted`, `report.filed`, `case.decided`. Entries for other jobs, and the `dataRequest.created` entry (T-410, FD-052), are not touched.

## 6. Copy (`packages/i18n/messages/{en,bn}.json`)

| Key | en | bn |
|---|---|---|
| `notif.security.passwordChanged` | Your password was changed. If this was not you, reset it now. | আপনার পাসওয়ার্ড বদলানো হয়েছে। এটি আপনি না করে থাকলে এখনই রিসেট করুন। |
| `notif.security.newSignIn` | New sign-in to your account. If this was not you, change your password. | আপনার অ্যাকাউন্টে নতুন সাইন-ইন হয়েছে। এটি আপনি না হলে পাসওয়ার্ড বদলান। |
| `notif.security.signOutAll` | You were signed out on all devices. | সব ডিভাইস থেকে আপনাকে সাইন আউট করা হয়েছে। |
| `notif.security.deviceApproved` | A staff device was approved for your account. | আপনার অ্যাকাউন্টের জন্য একটি স্টাফ ডিভাইস অনুমোদন পেয়েছে। |
| `notif.security.existingEmailRegister` | Someone tried to register with your email address. No new account was created. | কেউ আপনার ইমেইল ঠিকানা দিয়ে নিবন্ধনের চেষ্টা করেছে। নতুন কোনো অ্যাকাউন্ট তৈরি হয়নি। |
| `notif.security.severeSignInActivity` | Many failed sign-in attempts on your account. If this was not you, reset your password. | আপনার অ্যাকাউন্টে অনেকবার ব্যর্থ সাইন-ইন চেষ্টা হয়েছে। এটি আপনি না হলে পাসওয়ার্ড রিসেট করুন। |
| `notif.discussion.comment` | Someone commented on your experience. | আপনার অভিজ্ঞতায় কেউ মন্তব্য করেছেন। |
| `notif.discussion.reply` | Someone replied to your comment. | কেউ আপনার মন্তব্যের উত্তর দিয়েছেন। |
| `notif.discussion.mention` | Someone mentioned you in a discussion. | একটি আলোচনায় কেউ আপনাকে উল্লেখ করেছেন। |
| `notif.evidence.preview_ready` | The privacy preview of your document is ready to check. | আপনার নথির গোপনীয়তা প্রিভিউ দেখার জন্য তৈরি। |
| `notif.evidence.published` | Your document is now attached to your experience. | আপনার নথি এখন আপনার অভিজ্ঞতার সঙ্গে যুক্ত। |
| `notif.evidence.failed` | Your document could not be processed. Nothing was attached. | আপনার নথিটি প্রক্রিয়া করা যায়নি। কিছুই যুক্ত হয়নি। |
| `notif.evidence.rejected` | Your document was not attached after review. | পর্যালোচনার পর আপনার নথিটি যুক্ত করা হয়নি। |
| `notif.evidence.removed` | A document was removed from your experience. | আপনার অভিজ্ঞতা থেকে একটি নথি সরানো হয়েছে। |
| `notif.moderation.reported` | Your writing was reported. A moderator will look at it; it stays visible meanwhile (case {caseCode}). | আপনার লেখা রিপোর্ট করা হয়েছে। একজন মডারেটর দেখবেন; ততক্ষণ এটি দেখা যাবে (কেস {caseCode})। |
| `notif.moderation.hiddenPending` | Your writing is hidden while a moderator reviews a report (case {caseCode}). | একটি রিপোর্ট মডারেটর পর্যালোচনা না করা পর্যন্ত আপনার লেখা লুকানো আছে (কেস {caseCode})। |
| `notif.moderation.warn` | A moderator sent you a warning (case {caseCode}). | একজন মডারেটর আপনাকে সতর্ক করেছেন (কেস {caseCode})। |
| `notif.moderation.redact` | A moderator removed private details from your writing (case {caseCode}). | একজন মডারেটর আপনার লেখা থেকে ব্যক্তিগত তথ্য সরিয়েছেন (কেস {caseCode})। |
| `notif.moderation.removeFile` | A moderator removed a document from your writing (case {caseCode}). | একজন মডারেটর আপনার লেখা থেকে একটি নথি সরিয়েছেন (কেস {caseCode})। |
| `notif.moderation.lock` | A moderator closed the discussion on your writing (case {caseCode}). | একজন মডারেটর আপনার লেখার আলোচনা বন্ধ করেছেন (কেস {caseCode})। |
| `notif.moderation.hide` | A moderator hid your writing (case {caseCode}). | একজন মডারেটর আপনার লেখা লুকিয়েছেন (কেস {caseCode})। |
| `notif.moderation.remove` | A moderator removed your writing (case {caseCode}). | একজন মডারেটর আপনার লেখা সরিয়ে দিয়েছেন (কেস {caseCode})। |
| `notif.moderation.restrict` | Your account cannot post for now (case {caseCode}). | আপাতত আপনার অ্যাকাউন্ট থেকে পোস্ট করা যাবে না (কেস {caseCode})। |
| `notif.moderation.suspend` | Your account was suspended (case {caseCode}). | আপনার অ্যাকাউন্ট স্থগিত করা হয়েছে (কেস {caseCode})। |
| `notif.moderation.ban` | Your account was closed (case {caseCode}). | আপনার অ্যাকাউন্ট বন্ধ করা হয়েছে (কেস {caseCode})। |
| `notif.moderation.restore` | A moderator restored your writing (case {caseCode}). | একজন মডারেটর আপনার লেখা ফিরিয়ে দিয়েছেন (কেস {caseCode})। |
| `notif.moderation.none` | A moderator reviewed a report about your writing and took no action (case {caseCode}). | একজন মডারেটর আপনার লেখা নিয়ে একটি রিপোর্ট দেখেছেন এবং কোনো ব্যবস্থা নেননি (কেস {caseCode})। |
| `notif.provider.submissionDecided` | {decision, select, approved {The provider profile you suggested was added.} other {The provider profile you suggested was not added.}} | {decision, select, approved {আপনার প্রস্তাবিত প্রোভাইডার প্রোফাইল যোগ করা হয়েছে।} other {আপনার প্রস্তাবিত প্রোভাইডার প্রোফাইল যোগ করা হয়নি।}} |
| `notif.provider.claimDecided` | {decision, select, approved {Your claim of a provider profile was accepted.} other {Your claim of a provider profile was not accepted.}} | {decision, select, approved {প্রোভাইডার প্রোফাইলে আপনার দাবি গ্রহণ করা হয়েছে।} other {প্রোভাইডার প্রোফাইলে আপনার দাবি গ্রহণ করা হয়নি।}} |
| `notif.provider.fieldChangeDecided` | {decision, select, approved {Your suggested change to a provider profile was applied.} other {Your suggested change to a provider profile was not applied.}} | {decision, select, approved {প্রোভাইডার প্রোফাইলে আপনার প্রস্তাবিত পরিবর্তন করা হয়েছে।} other {প্রোভাইডার প্রোফাইলে আপনার প্রস্তাবিত পরিবর্তন করা হয়নি।}} |
| `notif.data.ready` | Your data export is ready to download. | আপনার ডেটা এক্সপোর্ট ডাউনলোডের জন্য তৈরি। |
| `notif.data.completed` | Your data request is complete. | আপনার ডেটা অনুরোধ সম্পন্ন হয়েছে। |
| `notif.draft.expiring` | A draft will be removed in {days} days if you do not finish it. | আপনি শেষ না করলে {days} দিনের মধ্যে একটি খসড়া মুছে যাবে। |
| `notif.staff.newReport` | New report (case {caseCode}). | নতুন রিপোর্ট (কেস {caseCode})। |
| `notif.markedRead` | {count, plural, one {# notification marked read} other {# notifications marked read}} | {count}টি নোটিফিকেশন পড়া হয়েছে বলে চিহ্নিত |
| `notif.unread` | Unread | অপঠিত |
| `notif.more` | Show older | আগেরগুলো দেখুন |
| `email.discussion.{comment,reply,mention}.subject` | Someone commented on your experience / replied to your comment / mentioned you | আপনার অভিজ্ঞতায় কেউ মন্তব্য করেছেন / কেউ আপনার মন্তব্যের উত্তর দিয়েছেন / কেউ আপনাকে উল্লেখ করেছেন |
| `email.discussion.*.body` (one text, three keys) | There is new activity in a discussion on RogiKotha. Sign in to read it: {link}. You can turn these emails off in your settings. | রোগীকথায় একটি আলোচনায় নতুন কার্যকলাপ আছে। পড়তে সাইন ইন করুন: {link}। সেটিংসে গিয়ে এই ইমেইল বন্ধ করতে পারেন। |
| `email.moderation.update.subject` | An update about your writing on RogiKotha | রোগীকথায় আপনার লেখা নিয়ে একটি আপডেট |
| `email.moderation.update.body` | There is an update about your writing. Sign in to see it: {link}. You can turn these emails off in your settings. | আপনার লেখা নিয়ে একটি আপডেট আছে। দেখতে সাইন ইন করুন: {link}। সেটিংসে গিয়ে এই ইমেইল বন্ধ করতে পারেন। |

Retired (Question 8): `notif.draftExpiring`, `notif.evidenceReady`, `notif.moderationOutcome`, `notif.replyReceived`, `notif.securityNewDevice`. Bengali numerals: `{days}` and `{count}` go through the locale formatter.

## 7. Migration (one, forward-only, the next free number)

1. Drop and re-add `email_deliveries_category_check` with `discussion`; `EMAIL_CATEGORIES` in `schema/notification.ts` gains it.
2. `ALTER TYPE notification_kind ADD VALUE 'provider'` (Question 5); `NOTIFICATION_KINDS` gains it.
3. `CREATE INDEX notifications_account_created_idx ON notifications (account_id, created_at DESC, id DESC)` and `CREATE INDEX notifications_unread_idx ON notifications (account_id) WHERE read_at IS NULL`.

No grant change. `migrations.int.test.ts`'s count goes up by one.

## 8. Findings and proposed ISS rows (each `Found in U34 T-405`)

| # | Sev | Finding | Owner |
|---|---|---|---|
| F1 | S2 | `notif.replyReceived {name}`, `notif.evidenceReady {label}`, `notif.securityNewDevice {city}` carry a name, a file label and a place | Fixed here (Question 8) |
| F2 | S3 | `MODERATION_ACTIONS` lacks `restore`, which `case.decided` carries (C11, FD-087) | U33 T-404 adds it; this Unit's key exists already |
| F3 | S4 | `draft.expiring` and `moderation.bulkBurst` are in the task's table but not in C15 | T-309 / T-404 add them to C15; route here is data only |
| F4 | S4 | The task's `original_expired` evidence notice has no state in `EVIDENCE_STATES` | T-309 names the event; no route until then |
| F5 | S4 | The task expects "one staff item per staff recipient"; `staff_notifications` has no account column, so it is one shared row | Informational; T-408 renders the shared feed |
| F6 | S4 | The 90-day window is a constant until T-309 (Question 2), `ASSUMPTION(t-405)` | U29 T-309 |

## 9. FD entries the build appends before code

- **FD-<next> (a) — Provider notice kind (T-405 Question 5)**: `notification_kind` gains `provider`, used by the three `directory.*Decided` notices; amends `02-data-model.md` §12 and `NOTIFICATION_KINDS`. Decided by the agent under the owner's no-questions instruction of 2026-10-29.
- **FD-<next> (b) — No reaction or publication notices in release 1 (T-405 Question 6)**: narrows FR87 / AC10.1.1; no event exists for reactions and `review.published` routes none. Decided by the agent under the owner's no-questions instruction of 2026-10-29.

## 10. Tests

| Level | File | Covers |
|---|---|---|
| domain | `routing.test.ts` | every C15 name has an entry (BR1.1); review events and `comment.changed` are `none`; appeals `deferred`; no route names a reporter field; every key exists in both message files (BR4.1) |
| domain | `policies.test.ts`, `params.test.ts` | `emailAllowed` table; cutoff at 90 days; every key's params inside its allowlist, no forbidden names (BR4.2) |
| application | `deliver.test.ts` | 3× same event → one row per recipient; self and blocked are absent because the payload omits them; mention > reply > comment; `report.filed` both flags → one `hiddenPending`, `caseOpened` only → one `reported`, no reporter notice; deleted comment → none; deleted account → none; review events → zero rows; every routed event with all email categories on → zero `email_deliveries`, zero `mail.send` |
| application | `queue-email.test.ts` | `discussion` off → suppressed, nothing written; on → one queued row with `to_email_enc`, `link` added, one job; same `dedupeKey` twice → one; `contactFor` null → suppressed; `security` always queued |
| application | `send-email-delivery.test.ts` | preference turned off after queueing → `suppressed`, nothing sent, no `auth_users` read; failing FakeMailer twice → `sent`, `attempts = 3` |
| application | `list.test.ts`, `mark-read.test.ts`, `expire.test.ts` | own rows only; foreign ids unchanged; window hides old rows before expiry; expire deletes by `created_at` though `expires_at` is in the future |
| database | `notification.int.test.ts` | `ON CONFLICT DO NOTHING`; category `discussion` inserts; kind `provider` inserts; cursor order |
| worker | `notification-deliver.test.ts`, `outbox-relay.test.ts` | the handler hands the envelope to the use case; `severeSignInActivity` 3× → one `security` notice; the relay map matches § 5 |
| component | `Notifications.test.tsx` | `en` and `bn`: six kinds render, unread dot, empty state, Bengali numerals; menu count hidden at 0 |
| smoke | `notifications.smoke.test.ts` | a synthetic `comment.posted` delivered → the list shows one unread `discussion` notice |

Manual: after `pnpm infra:up`, a password change shows the email in Mailpit (`:8025`) in the account's locale and a `security` notice on the page.

## 11. Owned paths and recorded additions

The task's owned paths, plus (recorded in the hand-off): `packages/domain/src/notification/params.ts`; `packages/database/src/{schema/notification.ts, schema/enums.ts (one value), migrations/**, migrations.int.test.ts}`; `packages/contracts/src/enums.ts` (one value); `packages/i18n/src/keys.ts`; `packages/application/src/worker.ts` (one export); `apps/worker/src/registry.ts`; `apps/web/src/components/patient/MarkVisibleRead.tsx`; `apps/web/src/app/[locale]/(patient)/layout.tsx` (one hunk for `unreadCount`); `packages/test-support/src/seed/seed-notifications.ts` and one line in `seed/seed.ts`; `docs/implementation/ISSUES.md`, `docs/status/decision-log.md`. Every person and account in tests and seed is synthetic.

## 12. Fit with the neighbouring drafts

- **t-401**: `comment.posted` fields, recipient filtering in the web tier, and the email role precedence match. `t-401` names its `messageKey` only as "the role key"; this Unit fixes the names `email.discussion.{comment,reply,mention}` and adds `{link}` inside `queueEmail`, so t-401's params pass unchanged. When the blocker is anonymous in a thread, t-401 already drops them from the payload, so the worker cannot re-introduce them.
- **t-302**: it writes `review.changed`, `review.hidden`, `review.restored` and `review.deleted` with no recipients and no `queueEmail` call; this Unit routes all of them to none and removes their `notification.deliver` relay entries.
- **t-101**: it builds the first `queueEmail`, `RecipientDirectory` and `mail.send` with retries; the task file still says this Unit builds `RecipientDirectory`, so this Unit extends instead of creating.
