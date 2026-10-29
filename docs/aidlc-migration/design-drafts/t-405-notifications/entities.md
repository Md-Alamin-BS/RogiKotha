# Entities — U34 `t-405-notifications`

Source of truth for the data shape this Unit reads and writes. Built from T-405 (with its amendments), `02-data-model.md` §2 and §12, `contract-summary.md` (C2, C15), the schema on `main` (`schema/notification.ts`, `schema/account.ts`, `contracts/src/enums.ts`) and the answers in `functional-design-questions.md`. Workflows are in `functional-spec.md`; decision logic is in `rules.md`.

The tables exist (T-005). This Unit's one forward-only migration adds `discussion` to the `email_deliveries` category check, the `provider` value to `notification_kind` (Question 5) and two indexes on `notifications`.

```yaml
entities:
  - name: Notification
    owner: Notification
    description: "One in-app notice for one account about one event (table notifications)."
    attributes:
      - { name: id, type: uuid, required: true, unique: true, constraints: "the id in NotificationVM and markRead inputs; own rows only" }
      - { name: account_id, type: uuid, required: true, references: AccountProfile.id, constraints: "ON DELETE CASCADE; the recipient" }
      - { name: kind, type: enum, required: true, allowed_values: [evidence, discussion, moderation, security, draft, provider], constraints: "provider is new (Question 5)" }
      - { name: message_key, type: text, required: true, constraints: "a notif.* key present in en and bn (BR4.1)" }
      - { name: params, type: jsonb, required: true, constraints: "the key's allowlist only: public ids, enums, counts (BR4.2)" }
      - { name: route, type: text, required: true, constraints: "locale-free path starting with a single '/' (BR4.4)" }
      - { name: read_at, type: timestamp, required: false }
      - { name: dedupe_key, type: text, required: true, unique: true, constraints: "<event>:<eventId>:<accountId> (BR2.4)" }
      - { name: expires_at, type: timestamp, required: true, constraints: "column default kept, never read (FD-068)" }
      - { name: created_at, type: timestamp, required: true, constraints: "drives the 90-day window and expiry (BR5.2, BR5.5)" }
    indexes:
      - "new: notifications (account_id, created_at desc, id desc) for the list cursor"
      - "new: notifications (account_id) where read_at is null, for the unread count"

  - name: StaffNotification
    owner: Notification
    description: "One shared staff-feed item per event (table staff_notifications). This Unit writes only newReport (Question 1)."
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [newReport, newProfile, evidence, claim, protectedChange, identityReveal, security] }
      - { name: target_code, type: text, required: false, constraints: "the case code for newReport" }
      - { name: dedupe_key, type: text, required: true, unique: true, constraints: "<event>:<eventId>" }
      - { name: acked_by, type: uuid, required: false, references: AccountProfile.id }

  - name: EmailDelivery
    owner: Notification
    description: "One queued email (table email_deliveries); U8 created the write path, this Unit extends it."
    attributes:
      - { name: category, type: text, required: true, allowed_values: [verification, reset, security, moderation, evidence, device_approval, deletion, discussion], constraints: "discussion is new: the CHECK constraint is replaced (FD-070)" }
      - { name: status, type: text, required: true, allowed_values: [queued, sent, failed, suppressed], constraints: "suppressed is first written here (BR3.3)" }
      - { name: to_email_enc, type: bytea, required: true, constraints: "encrypted with MAIL_RECIPIENT_KEY in the web tier (FD-094)" }
      - { name: dedupe_key, type: text, required: false, unique: true, constraints: "added by U8; the caller's dedupeKey" }

  - name: OutboxEvent
    owner: Notification
    description: "Read by deliver through the job envelope {eventId, name, payload}; written by every module through the Outbox port (FD-065)."

  - name: AccountPreferences
    owner: Account
    description: "Read in the web tier by RecipientDirectory and in the worker by mail.send's send-time check."
    attributes:
      - { name: email_security, type: boolean, default: true, constraints: "ignored: security is essential (BR3.1)" }
      - { name: email_moderation, type: boolean, default: true }
      - { name: email_evidence, type: boolean, default: true, constraints: "nothing queues evidence email in the demo (FD-070)" }
      - { name: email_discussion, type: boolean, default: false }
      - { name: interface_locale, type: enum, allowed_values: [en, bn] }
```

## Value objects

```yaml
value_objects:
  - name: DeliverJob
    fields: "eventId (uuid), name (event name), payload (the C15 payload of that event)"
  - name: Route
    fields: "event name -> {recipients: payload field names, kind, keyOf(payload, role), paramsOf, routeOf} | none | deferred(owner)"
  - name: Recipient
    fields: "accountId, role (author | replyTo | mention | affected | uploader | owner)"
  - name: NotificationVM
    fields: "id, kind, messageKey, params, href (route without locale), read, createdAt (ISO)"
  - name: NotificationPageVM
    fields: "items: NotificationVM[], nextCursor?"
  - name: UnreadCount
    fields: "count (integer >= 0); the menu shows it only when > 0 (T-102 BR8.6)"
  - name: QueueEmailInput
    fields: "accountId, category, messageKey, params, dedupeKey (C2, unchanged)"
```

## What the seed adds

Six synthetic notices for the demo patient account, one per kind (`security`, `discussion`, `evidence`, `moderation`, `draft`, `provider`), two of them read, all built from the corpus' synthetic ids with dedupe keys `seed:<n>`. No real person, place or file name.
