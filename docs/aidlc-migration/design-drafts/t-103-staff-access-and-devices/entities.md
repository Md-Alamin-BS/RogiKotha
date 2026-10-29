# Entities — U10 `t-103-staff-access-and-devices`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-103-staff-access-and-devices/functional-design/`.

Source of truth for the data shape this Unit works on. Built from T-103 (with FD-051 and FD-053), `02-data-model.md` §0, §2, §11, §12 and §16, `contract-summary.md` (C2, C5, C15), the code on `main` (`packages/database/src/schema/{account,notification}.ts`, `packages/contracts/src/{actor,config-values,errors,enums}.ts`, `schemas/{staff,account}.ts`, `view-models/security.ts`) and U8's draft entities (`design-drafts/t-101-better-auth-adapter/entities.md`), which this file extends and does not repeat. Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

Three kinds of entity appear here: **persisted** rows (existing tables; this Unit adds one column and one partial unique index and no table), **cookies** (state the browser holds, with no server-side copy except a hash), and **value objects** that cross a boundary. Logical types only; the physical columns are the ones on `main` plus the migration of `functional-spec.md` § 10.3.

```yaml
entities:
  - name: AccountProfile (staff fields)
    kind: persisted
    table: account_profiles
    owner: "Account module (U8 builds the repository; this Unit reads staff_role and writes it only through staff.setStaffRole)"
    description: "The domain account. A staff member is an ordinary account whose staff_role is set (FD-034)."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true }
      - { name: staff_role, type: enum, required: false, allowed_values: [super_admin, admin, moderator], constraints: "set by the seed for mod_rashid, admin_nadia, sa_founder; changed only by staff.setStaffRole (BR8.1)" }
      - { name: status, type: enum, required: true, allowed_values: [pending_verification, active, restricted, suspended, banned, deleted], constraints: "only active carries staff powers (BR3.1); this Unit performs no status transition" }
    constraints:
      - "Staff powers in the Actor need staff_role, status active and an approved StaffDevice for this account (BR3.1)"
    relationships:
      - { to: StaffDevice, cardinality: "one-to-many", direction: "AccountProfile trusts devices" }

  - name: StaffDevice
    kind: persisted
    table: staff_devices
    owner: "Account module, database/repositories/staff.ts (U10)"
    description: "One browser trusted, or waiting to be trusted, by one staff account. Identified by the hash of the rk_staff_device secret."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true, constraints: "internal id; shown to the owner only as TrustedDeviceVM.id for revoke" }
      - { name: account_id, type: uuid-v7, required: true, references: AccountProfile.id, constraints: "cascade delete" }
      - { name: device_hash, type: hex-sha256, required: true, constraints: "sha256 of the 32-byte cookie secret; never the secret (BR2.1); the same hash may appear under several accounts (one browser, several staff accounts)" }
      - { name: label, type: text, required: true, constraints: "browser family and OS from the user agent by U8's label helper; a fixed key-free fallback such as 'Unknown browser' is rendered from i18n, not stored" }
      - { name: first_seen_at, type: timestamp, required: true }
      - { name: last_seen_at, type: timestamp, required: true, constraints: "moved at staff sign-in and approval only (ASSUMPTION(T-103), F13)" }
      - { name: approved_at, type: timestamp, required: false, constraints: "set once by staff.approveDevice" }
      - { name: revoked_at, type: timestamp, required: false, constraints: "set by staff.revokeDevice or staff.setStaffRole; a revoked row is never reused (BR2.2)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Partial unique index (account_id, device_hash) WHERE revoked_at IS NULL (new migration, BR2.4)"
      - "State derived per request: approved, pending, revoked or unknown (BR2.3; functional-spec.md § 5.1)"
      - "rk_worker has no privilege on this table and gets none (02-data-model.md §16, FD-037)"
    relationships:
      - { to: AccountProfile, cardinality: "many-to-one", direction: "StaffDevice belongs to AccountProfile" }
      - { to: StaffDeviceApproval, cardinality: "one-to-many", direction: "StaffDevice has approval tokens over time" }

  - name: StaffDeviceApproval
    kind: persisted
    table: staff_device_approvals
    owner: "Account module, database/repositories/staff.ts (U10)"
    description: "One emailed approval token for one device."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true, constraints: "the dedupe key of its email is device-approval:<id>" }
      - { name: device_id, type: uuid-v7, required: true, references: StaffDevice.id, constraints: "cascade delete" }
      - { name: token_hash, type: hex-sha256, required: true, unique: true, constraints: "sha256 of a 32-byte random token; the token itself exists only in the email link (BR5.1)" }
      - { name: expires_at, type: timestamp, required: true, constraints: "created_at + 30 minutes" }
      - { name: used_at, type: timestamp, required: false, constraints: "set on success, on supersede by a newer token and on device revoke (BR5.5)" }
      - { name: failed_attempts, type: integer, required: true, default: 0, min: 0, max: 3, constraints: "new column (Question 5); at 3 the token is refused as invalid (BR5.2)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "At most one usable token per device: issuing a new one marks the others used (BR5.5)"
      - "rk_worker has no privilege on this table and gets none"
    relationships:
      - { to: StaffDevice, cardinality: "many-to-one", direction: "StaffDeviceApproval approves StaffDevice" }

  - name: AuthSession (staff use)
    kind: persisted
    table: auth_sessions
    owner: "Better Auth through the account repository (U8)"
    description: "A staff session is an ordinary session; it carries no device column. Its id binds the step-up cookie."
    constraints:
      - "Created from the staff screens only by staff.signIn (approved device) and staff.approveDevice, through the library (BR4.5, Question 2)"
      - "A session alone never gives staff powers: BR3.1 adds the device check on every request"
      - "Absolute 30 days from creation, as every session (U8 BR4.1; AC3.2.4 'normal or administrative')"

  - name: EmailDelivery (device approval)
    kind: persisted
    table: email_deliveries
    owner: "Notification module; queued through queueEmail (U8 first version, extended here)"
    attributes:
      - { name: category, type: enum, required: true, allowed_values: [device_approval], constraints: "the value this Unit writes; always sent (essential), like verification, reset and security (BR9.1)" }
      - { name: message_key, type: i18n-key, required: true, allowed_values: [email.staff.deviceApproval] }
      - { name: params, type: object, required: true, constraints: "{link} only, an absolute URL APP_URL/<locale>/admin/approve-device?token=<token>; cleared to {} at the final status (U8 BR6.8)" }
      - { name: to_email_enc, type: ciphertext, required: true, constraints: "encrypted with the mail-only recipient key (owner's answer to U8 R1) through RecipientDirectory" }
      - { name: dedupe_key, type: text, required: true, constraints: "device-approval:<approvalId>" }

  - name: AuditEvent (staff actions)
    kind: persisted
    table: audit_events
    owner: "Administration (FD-065) through the AuditWriter port"
    attributes:
      - { name: stream, type: text, required: true, constraints: "account:<accountId> (the staff account concerned; for staff_role_changed, the target account)" }
      - { name: action, type: enum, required: true, allowed_values: [staff_signed_in, staff_device_requested, staff_device_approval_failed, staff_device_approved, staff_device_revoked, step_up, step_up_failed, staff_role_changed] }
      - { name: actor, type: text, required: true, constraints: "account:<id>; anonymous for staff_device_approval_failed and staff_device_approved, which happen before the session exists" }
      - { name: details, type: object, required: true, constraints: "ids, enums, counts only: {deviceId}, {deviceId, attempt}, {deviceId, current}, {purpose}, {from, to, step_up}; never a token, secret, hash, email, user agent or IP (BR10.2)" }

  - name: OutboxEvent (device approved)
    kind: persisted
    table: outbox_events
    owner: "Notification module (FD-065); appended by staff.approveDevice"
    attributes:
      - { name: name, type: enum, required: true, allowed_values: [account.securityEvent] }
      - { name: payload, type: object, required: true, constraints: "{accountId, kind: deviceApproved} (C15); routed to notification.deliver, which U34 builds" }

  - name: StaffDeviceCookie
    kind: cookie
    name_in_browser: rk_staff_device
    attributes:
      - { name: value, type: base64url, required: true, constraints: "32 random bytes (43 characters)" }
      - { name: flags, type: text, required: true, constraints: "HttpOnly; SameSite=Lax; Secure iff APP_URL is https; Path=/; Max-Age 90 days (BR2.1)" }
    constraints:
      - "Set only after a correct password for an active staff account (BR4.6); kept on sign-out (U8 BR4.5); cleared on revoking the current device (BR6.3)"
      - "Read on every request of an account with a staff_role (BR3.1)"

  - name: StepUpCookie
    kind: cookie
    name_in_browser: rk_stepup
    attributes:
      - { name: payload, type: object, required: true, constraints: "{a: accountId, s: sessionId, u: until (epoch seconds)}, base64url JSON" }
      - { name: mac, type: base64url, required: true, constraints: "HMAC-SHA256 with the HKDF-derived key (BR7.2)" }
      - { name: flags, type: text, required: true, constraints: "HttpOnly; SameSite=Strict; Secure iff https; Path=/; Max-Age 300 (BR7.1)" }
    constraints:
      - "No server-side copy; valid only for the same account and session and before until (BR7.3)"
      - "Cleared on sign-out"

  - name: StaffContext
    kind: value object (request scope)
    source: "apps/web/src/server/auth.ts getStaffContext()"
    attributes:
      - { name: role, type: enum, required: false, allowed_values: [super_admin, admin, moderator], constraints: "the profile's staff_role when status is active; undefined otherwise" }
      - { name: device, type: enum, required: true, allowed_values: [approved, pending, unknown, revoked] }
    constraints:
      - "Used only by layouts and screens to choose a redirect; never by commands (BR3.4)"

  - name: Actor (changes)
    kind: value object
    source: "packages/contracts/src/actor.ts (shape unchanged; one field's meaning narrowed)"
    attributes:
      - { name: staffRole, type: enum, required: false, allowed_values: [super_admin, admin, moderator], constraints: "set only with an approved device and status active (BR3.1)" }
      - { name: capabilities, type: list<Capability>, required: true, default: [], constraints: "resolveCapabilities(staffRole, config); empty without staff powers" }
      - { name: stepUp, type: object, required: false, constraints: "{rechecked_at} only after BR7.3 passes" }
    constraints:
      - "Carries no device hash, no cookie value and no email"

  - name: CapabilityTable
    kind: value object (code)
    source: "packages/contracts/src/actor.ts capabilitiesForRole"
    attributes:
      - { name: super_admin, type: list<Capability>, required: true, constraints: "all eight: reports.read, content.act, identity.reveal, evidence.original, providers.decide, config.write, retention.bulk, holds.manage" }
      - { name: admin, type: list<Capability>, required: true, constraints: "reports.read, content.act, providers.decide, holds.manage (+ identity.reveal, evidence.original by toggle)" }
      - { name: moderator, type: list<Capability>, required: true, constraints: "reports.read, content.act (+ identity.reveal, evidence.original by toggle)" }

  - name: CapabilityToggles
    kind: value object (runtime configuration)
    source: "ConfigValues.capabilities (packages/contracts/src/config-values.ts), read through ConfigProvider"
    attributes:
      - { name: admin.revealIdentity, type: boolean, required: true, default: false }
      - { name: admin.originalEvidence, type: boolean, required: true, default: false }
      - { name: moderator.revealIdentity, type: boolean, required: true, default: false }
      - { name: moderator.originalEvidence, type: boolean, required: true, default: false }
    constraints:
      - "Strict object: no other key (BR1.5); U12 T-105 owns editing (out of scope here)"

  - name: StepUpPurpose
    kind: value object (enum)
    source: "packages/contracts/src/enums.ts STEP_UP_PURPOSES (new)"
    attributes:
      - { name: value, type: enum, required: true, allowed_values: [config.apply, config.rollback, identity.reveal, evidence.original, moderation.enforce, staff.setRole, retention.bulk, account.delete], constraints: "retention.bulk is listed for after release 1 (FD-088); purposes are written into audit details only" }

  - name: StaffSignInInput
    kind: value object (command input)
    source: "packages/contracts/src/schemas/staff.ts (new)"
    attributes:
      - { name: email, type: email-address, required: true }
      - { name: password, type: text, required: true, min: 1, max: 256 }
    constraints:
      - ".strict(); the device secret is read from the cookie, never from the input"

  - name: StepUpInput (changed)
    kind: value object (command input)
    source: "packages/contracts/src/schemas/account.ts"
    attributes:
      - { name: password, type: text, required: true, min: 1, max: 256 }
      - { name: purpose, type: enum, required: true, constraints: "STEP_UP_PURPOSES (Question 7); no caller exists yet, so the change breaks nothing" }

  - name: TrustedDeviceVM (changed)
    kind: value object (view model)
    source: "packages/contracts/src/view-models/security.ts"
    attributes:
      - { name: id, type: uuid-v7, required: true, constraints: "StaffDevice.id, for revoke" }
      - { name: label, type: text, required: true }
      - { name: firstSeen, type: iso8601, required: true, constraints: "new (spec §4.3)" }
      - { name: lastSeen, type: iso8601, required: true, constraints: "renamed use of the existing lastSeenAt; the field name is kept as lastSeenAt if a consumer exists at Code Generation" }
      - { name: approvedAt, type: iso8601, required: false }
      - { name: current, type: boolean, required: true, constraints: "new: this browser's device" }
    constraints:
      - "No hash, no account id, no secret (03 §2)"

  - name: RateLimitBucket (staff keys)
    kind: in-memory (web process)
    owner: "adapters/rate-limit-memory behind the RateLimiter port (U8)"
    attributes:
      - { name: key, type: text, required: true, constraints: "signin:email:<hmac> and signin:net:<hmac> (shared with account.signIn); action:account:<id>:device-approval (3 / h); action:net:<hmac>:device-approve (10 / 15 min); action:account:<id>:step-up (5 failures / 15 min)" }
    constraints:
      - "Per process and lost on restart (U8's ASSUMPTION(T-101)); the 3-strike counter is not here but in StaffDeviceApproval.failed_attempts"
```

## Summary

- **Two existing staff tables** carry the device trust: `StaffDevice` (one row per account and cookie hash while open, history kept after revoke) and `StaffDeviceApproval` (one 30-minute token at a time per device, now with a strike counter). Neither stores a secret; the worker cannot read either.
- **A staff session is an ordinary session.** The `Actor` gets `staffRole` and `capabilities` only when the profile is active, has a role and the request carries an approved device for that account; the capability table stays in `contracts/actor.ts` and the four toggles in `ConfigValues.capabilities`.
- **Two cookies** hold the browser's side: `rk_staff_device` (the device secret, 90 days, Lax) and `rk_stepup` (a signed 5-minute proof bound to the account and the session, Strict).
- **Records**: eight audit actions on the `account:<id>` stream with allowlisted details, one `account.securityEvent {deviceApproved}` outbox event, and one `device_approval` email per approval through `queueEmail` with the recipient encrypted under the mail-only key.
- **Contract changes break no consumer**: `StaffSignInInput`, `STEP_UP_PURPOSES`, `auth.device_mismatch` and two `TrustedDeviceVM` fields are additive; `StepUpInput.purpose` is a new required field on an input nothing calls yet.
