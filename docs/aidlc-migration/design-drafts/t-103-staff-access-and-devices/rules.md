# Business rules — U10 `t-103-staff-access-and-devices`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-103-staff-access-and-devices/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U10), `unit-of-work-story-map.md` (US3.2, US11.1), `requirements.md` (FR6, FR7, FR100, FR102), `stories.md` (AC3.2.4, AC3.2.5, AC11.1.2, AC11.1.6, AC7.3.3, AC7.3.4), `contract-summary.md` (C2, C5, C15 and the ownership rules), T-103 with its amendments (FD-051, FD-053), FD-016, FD-018, FD-022, FD-034, FD-035, FD-065, FD-071, FD-088, `auth-screens-spec.md` §4 and §5, the D-001 prototype (`ui-design-prototype/admin/`), U8's draft (`design-drafts/t-101-better-auth-adapter/`) and the open `ISSUES.md` rows ISS-021, ISS-023, ISS-025, ISS-034, ISS-054, ISS-100 and ISS-108.

The rules that depend on a question follow the answers in `functional-design-questions.md`, chosen on the owner's standing instruction of 2026-10-27 and awaiting the owner's confirmation. `functional-spec.md` § 14 lists what changes if the owner reverses an answer. "Approved device" always means: the request carries `rk_staff_device`, and the open `staff_devices` row for (the actor's account, `sha256` of that secret) has `approved_at` set and `revoked_at` null. "Staff powers" means a `staffRole` and a non-empty `capabilities` list in the `Actor`.

**Authorization and audit at a glance** (each line is a rule below):

- Staff powers need all three: a `staff_role`, status `active`, an approved device for that account (BR3.1).
- `requires` order in every command: `authenticated` → `staffRole` / `capability` → `stepUp` → owner (BR7.4).
- Super Admin: all eight capabilities, fixed in code. Admin: `reports.read`, `content.act`, `providers.decide`, `holds.manage` (+ `identity.reveal` / `evidence.original` only by toggle). Moderator: `reports.read`, `content.act` (+ the same two toggles). Nobody but Super Admin holds `retention.bulk` or `config.write` (BR1.1–BR1.4).
- Audit actions on `account:<id>`: `staff_signed_in`, `staff_device_requested`, `staff_device_approval_failed`, `staff_device_approved`, `staff_device_revoked`, `step_up`, `step_up_failed`, `staff_role_changed`; details are ids, enums and counts only (BR10.2).

```yaml
rules:
  # Group 1 — Capabilities
  - id: BR1.1
    statement: "Capabilities come from one table in code, capabilitiesForRole in packages/contracts/src/actor.ts; resolveCapabilities in the application only wraps it."
    category: calculation
    applies_to: "packages/contracts/src/actor.ts capabilitiesForRole, packages/application/src/authorization/capabilities.ts resolveCapabilities"
    trigger: "getActor resolves an Actor, or a test asks for a role's capabilities"
    logic: "resolveCapabilities(staffRole, config): IF staffRole is undefined or null THEN [] ELSE capabilitiesForRole(staffRole, config.capabilities); U8's stub is replaced; no other file lists role capabilities"
    violation: "A second table can drift from the first; a capability granted outside the table is an escalation (S1)"
    source: "T-103 step 1, C5 capabilitiesOf, actor.ts on main, Question 3"
  - id: BR1.2
    statement: "super_admin holds all eight capabilities whatever the configuration says, and is the only role that holds retention.bulk and config.write."
    category: authorization
    applies_to: "capabilitiesForRole"
    trigger: "Role super_admin"
    logic: "IF role = super_admin THEN ALL_CAPABILITIES, independent of every toggle"
    violation: "A super_admin without retention.bulk fails AC7.3.3's FD-051 row; config able to change it breaks FD-018"
    source: "FD-051, FD-018, 02-data-model.md §11 (Super Admin capabilities fixed in code), AC7.3.3"
  - id: BR1.3
    statement: "admin holds reports.read, content.act, providers.decide and holds.manage, plus identity.reveal and evidence.original only when config.capabilities.admin.revealIdentity and .originalEvidence are true; never retention.bulk or config.write."
    category: authorization
    applies_to: "capabilitiesForRole"
    trigger: "Role admin"
    logic: "base = [reports.read, content.act, providers.decide, holds.manage]; IF admin.revealIdentity THEN + identity.reveal; IF admin.originalEvidence THEN + evidence.original"
    violation: "retention.bulk for admin fails AC7.3.4's FD-051 row; a reveal capability with the toggle off breaks FD-016"
    source: "FD-051, FD-016, FD-022, 03 §2, AC7.3.4, AC3.3.5"
  - id: BR1.4
    statement: "moderator holds reports.read and content.act, plus the same two toggled capabilities read from config.capabilities.moderator; never retention.bulk, config.write, providers.decide or holds.manage."
    category: authorization
    applies_to: "capabilitiesForRole"
    trigger: "Role moderator"
    logic: "base = [reports.read, content.act]; IF moderator.revealIdentity THEN + identity.reveal; IF moderator.originalEvidence THEN + evidence.original"
    violation: "Fails the 12-combination capability table test"
    source: "T-103 step 1 and acceptance rows 'Capabilities', FD-051"
  - id: BR1.5
    statement: "Configuration can only switch the four admin and moderator toggles; any other key under capabilities is rejected."
    category: validation
    applies_to: "packages/contracts/src/config-values.ts"
    trigger: "A config value is parsed"
    logic: "capabilities stays a strict object {admin: {revealIdentity, originalEvidence}, moderator: {revealIdentity, originalEvidence}}, all booleans, default false; a test proves an extra key (for example admin.retentionBulk) fails parsing"
    violation: "A config key that adds a capability is role escalation by configuration (threat T10)"
    source: "FD-018, T-103 threat 6, AC11.1.3"

  # Group 2 — Device cookie and trust
  - id: BR2.1
    statement: "The device cookie rk_staff_device holds 32 random bytes in base64url, is HttpOnly, SameSite=Lax, Secure exactly when APP_URL is https, Path=/, and lives 90 days; the database stores only its SHA-256."
    category: constraint
    applies_to: "apps/web/src/server/actions/staff.ts, StaffRepository"
    trigger: "A device secret is minted or read"
    logic: "secret = Crypto.randomToken(32); staff_devices.device_hash = hex(sha256(secret)); the cookie is set only on a staff sign-in response after the right password (BR4.6); the secret is never logged, audited or returned"
    violation: "A stored or logged secret lets anyone with database or log access impersonate the device"
    source: "T-103 step 2, 02-data-model.md §2, threat notes"
  - id: BR2.2
    statement: "A browser without a device cookie, or whose cookie belongs to a revoked row for this account, gets a new secret and a new pending row; a revoked row is never reused."
    category: policy
    applies_to: "staff.signIn, staff.beginDeviceApproval"
    trigger: "A staff account signs in with the right password from a device that is not approved"
    logic: "IF no cookie OR the newest row for (accountId, hash) is revoked THEN mint a new secret and insert a new row; IF an open row exists THEN reuse it; revoked rows stay as history"
    violation: "Reusing a revoked row would let a revoke be undone by a fresh approval of the same secret without the owner noticing"
    source: "T-103 acceptance row 'Revoke', design decision (functional-spec.md § 5.1)"
  - id: BR2.3
    statement: "Device trust is per account: a device is looked up by the actor's account id and the cookie hash together, so the same cookie on another account is unknown."
    category: authorization
    applies_to: "getStaffContext, getActor, StaffRepository.findOpenDevice"
    trigger: "Any request of a staff account"
    logic: "state = approved IF an open row (account_id, device_hash) has approved_at set; pending IF an open row has no approved_at; revoked IF the newest row for the pair is revoked; unknown otherwise"
    violation: "A cookie copied to another staff account that grants trust fails the 'Cookie per account' row (threat T4)"
    source: "T-103 step 2 and threat 3, acceptance row 'Cookie per account'"
  - id: BR2.4
    statement: "At most one open (not revoked) device row exists per account and cookie hash."
    category: constraint
    applies_to: "staff_devices, the new migration"
    trigger: "A device row is inserted"
    logic: "Unique index on staff_devices (account_id, device_hash) WHERE revoked_at IS NULL; inserts go through findOpenDevice first; a unique violation maps to reuse of the existing row"
    violation: "Two open rows make the device state ambiguous"
    source: "Question 5, F11"

  # Group 3 — Actor and console guard
  - id: BR3.1
    statement: "getActor puts staffRole and capabilities into the Actor only when the account has a staff_role, its status is active and the request carries an approved device for that account; otherwise staffRole is undefined and capabilities is empty."
    category: authorization
    applies_to: "apps/web/src/server/auth.ts getActor"
    trigger: "Every request that resolves an Actor"
    logic: "IF profile.staff_role AND profile.status = active AND getStaffDevice(accountId, cookie) = approved THEN Actor.staffRole = role, Actor.capabilities = resolveCapabilities(role, ConfigProvider.current()) ELSE Actor.staffRole = undefined, Actor.capabilities = []; the device state and the role are read on every request, never cached across requests"
    violation: "Staff powers from a role alone let a stolen password act as staff through the patient route or direct server-action calls (S1 if built, threat T5)"
    source: "Question 3, FR7, AC3.2.5, T-103 threat 5, F2"
  - id: BR3.2
    statement: "Every console page, staff query, staff command and staff route handler checks the Actor itself; the layout guard only redirects."
    category: authorization
    applies_to: "apps/web/src/app/[locale]/admin/(console)/**, (account)/**, every staff query and command"
    trigger: "Any staff page render, server action or route handler call"
    logic: "Staff pages load data only through queries with requires.staffRole or requires.capability; staff commands declare their requires; no page renders staff data from a layout-level check"
    violation: "Layouts do not re-run on client navigation and do not protect server actions (Next.js authentication guide); a check only in the layout is bypassable"
    source: "Next.js authentication guide (Layouts and auth checks, Server Actions), 01-conventions §5, T-103 threats 5 and 8"
  - id: BR3.3
    statement: "The console layout redirects a visitor with no session or no staff role to the staff sign-in page with next, and a staff account on a device that is not approved to the approve-device page."
    category: policy
    applies_to: "apps/web/src/app/[locale]/admin/(console)/layout.tsx, (account)/layout.tsx"
    trigger: "A request under the guarded segments"
    logic: "no session OR getStaffContext().role undefined THEN redirect /<locale>/admin/sign-in?next=<current path>; role set AND device != approved THEN redirect /<locale>/admin/approve-device; ELSE render"
    violation: "Fails the 'Guard' acceptance row (302 to /en/admin/sign-in?next=/en/admin/queue)"
    source: "T-103 step 3 and acceptance row 'Guard'"
  - id: BR3.4
    statement: "getStaffContext is a redirect helper for layouts and screens only and is never an authorization input to a command."
    category: constraint
    applies_to: "apps/web/src/server/auth.ts getStaffContext"
    trigger: "Code reads the staff context"
    logic: "getStaffContext returns {role?, device} cached per request; commands and queries read only the Actor; a lint-free grep test asserts no application module imports it"
    violation: "Two authorization sources can disagree"
    source: "Design decision (functional-spec.md § 13), Question 3"
  - id: BR3.5
    statement: "The next parameter is honoured only for a same-origin path under /<locale>/admin/; anything else goes to /<locale>/admin/queue."
    category: validation
    applies_to: "staff.signIn redirect, staff.approveDevice redirect"
    trigger: "A redirect after sign-in or approval"
    logic: "IF next starts with '/' AND not '//' AND matches ^/(en|bn)/admin(/|$) AND has no scheme or backslash THEN redirect to next ELSE /<locale>/admin/queue"
    violation: "An open redirect from the staff sign-in is a phishing aid (threat T14)"
    source: "Design decision, construction.md Security (validate inputs at boundaries)"
  - id: BR3.6
    statement: "/admin/security is guarded like the console but rendered without the console navigation; /admin/sign-in and /admin/approve-device are unguarded."
    category: authorization
    applies_to: "apps/web/src/app/[locale]/admin/(account)/security, (public)/sign-in, (public)/approve-device"
    trigger: "Route structure"
    logic: "(public) has no guard and no nav chrome; (account) has the BR3.3 guard and no nav chrome; (console) has the guard and the full chrome; all load admin.css and noindex"
    violation: "An unguarded security page would list devices and sessions to any session; full chrome on the auth screens keeps ISS-100 open"
    source: "03-routes-and-contracts.md §1 (security: any staff), T-103 step 3 (corrected), ISS-100, prototype route() isAuthView"

  # Group 4 — Staff sign-in
  - id: BR4.1
    statement: "Staff sign-in applies the same refusals, delay and generic error as patient sign-in, before any read or password check."
    category: policy
    applies_to: "staff.signIn"
    trigger: "A staff sign-in attempt"
    logic: "Network limit 30 failures / 15 min, email limit 10 / 15 min, progressive delay from ConfigProvider.signIn, each auth.rate_limited with retryAfterSec, exactly as U8 BR3.2 and BR3.3"
    violation: "A softer staff route is the cheaper way to guess staff passwords (threat T11)"
    source: "auth-screens-spec.md §4.1 ('same generic error and rate limit as §3.3'), U8 BR3.2, FD-058, FD-063"
  - id: BR4.2
    statement: "Staff and patient sign-in share one email counter and one network counter, so attempts on both routes add up."
    category: calculation
    applies_to: "staff.signIn, account.signIn"
    trigger: "Any failed sign-in on either route"
    logic: "Both commands use the keys signin:email:<HMAC(normalised email)> and signin:net:<HMAC(address)>; a failure on either route records on both keys; the severe notice of U8 BR3.9 counts both"
    violation: "Separate counters double the attempts before the delay and the severe notice (threat T12)"
    source: "FD-058 (per normalised email), U8 BR3.1, design decision"
  - id: BR4.3
    statement: "The password is checked once through the PasswordHasher port before any session exists, against a fixed dummy hash when the address has no credential."
    category: constraint
    applies_to: "staff.signIn"
    trigger: "An attempt that passed BR4.1"
    logic: "Read credential and profile through the account repository by normalised email; verify(NFC(password), phc or DUMMY_PHC); unknown, deleted or wrong THEN record a failure on both keys and return auth.invalid_credentials"
    violation: "Calling the library sign-in first would create a session row for non-staff and unknown devices (Question 1)"
    source: "Question 1, T-103 step 4, AC3.2.5, acceptance row 'Non-staff refused'"
  - id: BR4.4
    statement: "A correct password on an account without a staff role, or whose status is not active, returns forbidden with messageKey staff.notStaff and creates no session, no device cookie and no row; a wrong password never reveals whether the account is staff."
    category: authorization
    applies_to: "staff.signIn"
    trigger: "The password verifies and staff_role is null or status is pending_verification or restricted"
    logic: "Return err forbidden with messageKey staff.notStaff (field email); clear the email key; suspended or banned THEN auth.account_suspended (U8 BR3.6); no audit row (no state change), log staff.sign_in_refused {reason} with no address"
    violation: "A session for a non-staff account on this route fails the 'Non-staff refused' row; staff.notStaff before the password check reveals staff emails (threat T11)"
    source: "auth-screens-spec.md §4.1, T-103 step 4 and threat 7, acceptance row 'Non-staff refused'"
  - id: BR4.5
    statement: "Only the staff.signIn and staff.approveDevice commands may create a session from the staff screens, and only after they have decided to."
    category: authorization
    applies_to: "U8's Better Auth databaseHooks.session.create.before, CommandContext"
    trigger: "The library is about to create a session inside a staff command"
    logic: "IF CommandContext.command is staff.signIn or staff.approveDevice AND ctx.staffSessionAllowed is true THEN allow (U8's status check still applies) ELSE IF the command is one of these two THEN refuse; other commands keep U8's rules"
    violation: "A library call that creates a session before the device decision bypasses AC3.2.5"
    source: "Question 2, U8 BR1.7 and BR3.6 pattern, AD-4"
  - id: BR4.6
    statement: "A staff account on a device that is not approved gets no session from staff sign-in: only a device cookie and a pending approval."
    category: authorization
    applies_to: "staff.signIn"
    trigger: "The password verifies for an active staff account and the device is unknown, pending or revoked"
    logic: "Run staff.beginDeviceApproval; the response carries rk_staff_device and no session cookie; redirect to /<locale>/admin/approve-device"
    violation: "Fails AC3.2.5 and the 'Unknown device' row (no session cookie yet)"
    source: "FR7, AC3.2.5, T-103 step 4, acceptance row 'Unknown device'"

  # Group 5 — Device approval
  - id: BR5.1
    statement: "A device approval creates or reuses the pending device row and a fresh 32-byte single-use token valid for 30 minutes, stored only as its SHA-256, and queues the approval email with the link to the app's own approve page."
    category: constraint
    applies_to: "staff.beginDeviceApproval"
    trigger: "BR4.6"
    logic: "One transaction: device row (label from the user agent, first_seen_at, last_seen_at); staff_device_approvals {device_id, token_hash = sha256(token), expires_at = now + 30 min, failed_attempts 0}; queueEmail(device_approval, email.staff.deviceApproval, {link: APP_URL/<locale>/admin/approve-device?token=<token>}, dedupeKey device-approval:<approvalId>); audit staff_device_requested {deviceId}"
    violation: "A longer lifetime, a stored token or a missing email fails the 'Unknown device' and 'Approve' rows"
    source: "T-103 step 5, 02-data-model.md §2, auth-screens-spec.md §4.2"
  - id: BR5.2
    statement: "An approval token is refused when unknown, used, superseded or struck out three times (auth.token_invalid) or expired (auth.token_expired); each wrong password adds one strike and the third ends the token."
    category: validation
    applies_to: "staff.approveDevice"
    trigger: "A token is presented"
    logic: "IF no row for sha256(token) OR used_at set OR failed_attempts >= 3 THEN auth.token_invalid; IF expires_at <= now THEN auth.token_expired; after BR5.3 passes, a wrong password THEN failed_attempts + 1 and audit staff_device_approval_failed {deviceId, attempt}; IF the new count = 3 THEN auth.token_invalid ELSE auth.invalid_credentials"
    violation: "A fourth password guess or a reused link that is accepted fails the 'Approve' row (threat T3)"
    source: "T-103 step 6 and threat 2, auth-screens-spec.md §4.2, Question 5"
  - id: BR5.3
    statement: "The approval succeeds only in the browser that holds the device cookie the token was issued for; another browser gets auth.device_mismatch before any password check, and the token is unchanged."
    category: authorization
    applies_to: "staff.approveDevice"
    trigger: "A token passed BR5.2's lookup"
    logic: "IF sha256(rk_staff_device) != device.device_hash THEN auth.device_mismatch, no strike, no hasher call, nothing written"
    violation: "Without it, a staff member who opens the link on their own browser approves the attacker's device (S1 if built, threat T2, F1)"
    source: "Question 4, email.staff.deviceApproval copy ('open this link on that device'), staff.device.body ('Open it on this device')"
  - id: BR5.4
    statement: "At approval time the device must not be revoked and the account must still be an active staff account."
    category: authorization
    applies_to: "staff.approveDevice"
    trigger: "A token passed BR5.2"
    logic: "IF device.revoked_at set OR profile.staff_role null OR profile.status != active THEN auth.token_invalid and nothing written"
    violation: "A demoted or suspended account that still completes an approval gets a session it should not"
    source: "Design decision, U8 BR3.6"
  - id: BR5.5
    statement: "Only the newest approval link of a device works: issuing a new one, or revoking the device, marks every older unused token used."
    category: policy
    applies_to: "staff.beginDeviceApproval, staff.revokeDevice"
    trigger: "A new token is issued for a device, or the device is revoked"
    logic: "UPDATE staff_device_approvals SET used_at = now WHERE device_id = d AND used_at IS NULL, in the same transaction"
    violation: "Several live links for one device widen the interception window"
    source: "Design decision, T-103 threat 2"
  - id: BR5.6
    statement: "At most 3 approval emails per hour are sent for one account."
    category: policy
    applies_to: "staff.beginDeviceApproval"
    trigger: "A new approval is about to be issued"
    logic: "IF action:account:<id>:device-approval has 3 hits in 60 min THEN auth.rate_limited with retryAfterSec on the sign-in screen and nothing written ELSE record the hit"
    violation: "Repeated sign-ins with a known password could flood the staff inbox (threat T13)"
    source: "Design decision, auth-screens-spec.md §4.2 ('no resend button (rate limits)')"
  - id: BR5.7
    statement: "The pending screen shows only the device label and first-seen time of a pending approval for this browser's cookie; with nothing pending it redirects to staff sign-in."
    category: constraint
    applies_to: "apps/web/src/app/[locale]/admin/(public)/approve-device/page.tsx without token"
    trigger: "GET without token"
    logic: "IF the cookie hash has an open device row with an unused, unexpired approval THEN render staff.device.title, staff.device.body {minutes}, a .kv with label and first seen, and outside production the dev inbox link ELSE redirect /<locale>/admin/sign-in"
    violation: "Showing an account name or email on an unauthenticated page leaks staff identities"
    source: "auth-screens-spec.md §4.2, prototype renderApprove, ISS-021"
  - id: BR5.8
    statement: "Approval attempts are limited to 10 per 15 minutes per network key."
    category: policy
    applies_to: "staff.approveDevice"
    trigger: "A POST to approve"
    logic: "IF action:net:<hmac>:device-approve has 10 hits in 15 min THEN auth.rate_limited ELSE record the hit"
    violation: "Unbounded attempts make the endpoint a password-guessing oracle beside the 3 strikes"
    source: "Design decision, 03 §3 RateLimiter keys"
  - id: BR5.9
    statement: "A right password on the matching device approves the device, uses the token, writes the audit row and the securityEvent in one transaction, and signs the holder in; if that transaction fails, the new session is revoked."
    category: constraint
    applies_to: "staff.approveDevice"
    trigger: "BR5.2–BR5.4 passed and the library sign-in accepted the password"
    logic: "One transaction: staff_devices.approved_at = now, last_seen_at = now; approval.used_at = now; audit staff_device_approved {deviceId}; outbox account.securityEvent {accountId, kind: deviceApproved}; IF it fails THEN revoke the session the library returned and return internal; redirect /<locale>/admin/queue"
    violation: "An approved device without its audit row, or a session without an approved device, breaks the 'Approve' row"
    source: "T-103 step 6, Question 2, Question 6, C15"
  - id: BR5.10
    statement: "Approving signs out any other account's session already open in that browser."
    category: policy
    applies_to: "staff.approveDevice"
    trigger: "The approval succeeds and the request carries a session for a different account"
    logic: "Revoke that session before forwarding the new session cookie"
    violation: "Two accounts mixed in one browser confuse the Actor and the audit trail"
    source: "Design decision"
  - id: BR5.11
    statement: "The approval page sends Referrer-Policy: no-referrer and keeps the token out of logs and results."
    category: constraint
    applies_to: "approve-device page and staff.approveDevice"
    trigger: "Any request with ?token="
    logic: "The page sets the header; the token reaches the server action as a hidden field; logs record approvalId only after lookup, never the token"
    violation: "A token leaking through a referrer or a log line can be replayed within 30 minutes (threat T15)"
    source: "Design decision, 01-conventions §11"

  # Group 6 — Trusted devices
  - id: BR6.1
    statement: "The trusted-device list shows the actor's open devices with label, first seen, last seen, approved time and a this-device marker, and never a hash or a secret."
    category: constraint
    applies_to: "staff.listDevices, TrustedDeviceVM"
    trigger: "/admin/security renders"
    logic: "requires staffRole; rows of the actor's account where revoked_at IS NULL; current = (device_hash = sha256(request cookie)); TrustedDeviceVM {id, label, firstSeen, lastSeen, approvedAt?, current}"
    violation: "A hash or an account id in the view model breaks 03 §2's view-model rule"
    source: "auth-screens-spec.md §4.3, prototype renderSecurity, view-models/security.ts"
  - id: BR6.2
    statement: "A staff member can revoke only their own devices; revoking supersedes the device's open approvals and is audited."
    category: authorization
    applies_to: "staff.revokeDevice"
    trigger: "Revoke is chosen"
    logic: "requires staffRole; IF the device's account_id != actor.accountId THEN not_found (no existence leak); ELSE one transaction: revoked_at = now, open approvals used_at = now (BR5.5), audit staff_device_revoked {deviceId, current}"
    violation: "Revoking another person's device is a privilege defect"
    source: "T-103 step 7, 03 §4 staff.revokeDevice"
  - id: BR6.3
    statement: "Revoking the current device also ends the current session and clears the device cookie; a revoked device stops giving staff powers on its next request everywhere."
    category: constraint
    applies_to: "staff.revokeDevice, getActor"
    trigger: "The revoked device is the request's device, or any later request carries a revoked device"
    logic: "IF current THEN revoke the session, delete rk_staff_device, redirect /<locale>/admin/sign-in; BR3.1 refuses staff powers for a revoked device on every request"
    violation: "Fails the 'Revoke' row (signed out; next sign-in requires approval) and threat 8"
    source: "auth-screens-spec.md §4.3, T-103 step 7 and threat 8, acceptance row 'Revoke'"
  - id: BR6.4
    statement: "The security page reuses U9's session list and change-password components and U8's commands; this Unit adds no session or password logic."
    category: constraint
    applies_to: "components/admin/auth/StaffSecurity.tsx"
    trigger: "/admin/security renders"
    logic: "StaffSecurity renders Trusted devices (BR6.1), then U9's SessionsTable and ChangePasswordForm with the admin stylesheet; IF U9 has not merged THEN the two parts are a follow-up ISS row, not a re-implementation"
    violation: "A second session or password implementation drifts from U8's rules"
    source: "T-103 step 7 and Not in scope, auth-screens-spec.md §4.3"

  # Group 7 — Step-up
  - id: BR7.1
    statement: "A successful step-up sets rk_stepup to an HMAC-SHA256-signed payload {accountId, sessionId, until = now + 300 s}, HttpOnly, SameSite=Strict, Secure exactly when https, Path=/, maxAge 300."
    category: constraint
    applies_to: "account.stepUp, apps/web/src/server/actions/step-up.ts"
    trigger: "The step-up password verifies"
    logic: "value = base64url(JSON {a, s, u}) + '.' + base64url(HMAC-SHA256(key, payloadBytes)); size under 4 KB; the cookie is not stored server-side"
    violation: "An unsigned, unbound or longer-lived cookie fails the 'Step-up' and 'Cookie flags' rows (threat T8)"
    source: "T-103 step 8 and threat 4, acceptance rows 'Step-up' and 'Cookie flags'"
  - id: BR7.2
    statement: "The step-up key is derived from BETTER_AUTH_SECRET with HKDF under its own label and is used for nothing else."
    category: constraint
    applies_to: "packages/application/src/authorization/step-up.ts, web container"
    trigger: "Process start"
    logic: "key = HKDF-SHA256(BETTER_AUTH_SECRET, salt 'rogikotha', info 'rk_stepup', 32 bytes); the web tier refuses to start without a valid BETTER_AUTH_SECRET (U8 BR7.2)"
    violation: "Reusing the raw secret couples two mechanisms; a hard-coded key breaks the construction Security rule"
    source: "T-103 threat 4 ('BETTER_AUTH_SECRET-derived key'), construction.md Security"
  - id: BR7.3
    statement: "getActor sets Actor.stepUp only when the signature verifies in constant time, the account and the session match the request, and until is still in the future by the Clock port."
    category: authorization
    applies_to: "apps/web/src/server/auth.ts getActor, verifyStepUp"
    trigger: "A request carries rk_stepup"
    logic: "Split into exactly two base64url parts; timingSafeEqual on the MAC before parsing; IF a = actor.accountId AND s = current session id AND u > now THEN Actor.stepUp = {rechecked_at: u - 300 s} ELSE no stepUp; any error THEN no stepUp"
    violation: "Accepting a tampered, foreign, replayed or expired cookie fails the 'Step-up' row (refused at 5:01)"
    source: "T-103 step 8, acceptance row 'Step-up', threat 4"
  - id: BR7.4
    statement: "requires.stepUp is checked after authenticated, staffRole, capability and before owner checks; a missing or stale step-up returns auth.step_up_required and runs the command's onRefused hook if it has one."
    category: authorization
    applies_to: "packages/application/src/command.ts defineCommand"
    trigger: "A command declares requires.stepUp"
    logic: "authorize order: authenticated → verifiedEmail → notRestricted → staffRole → capability → stepUp → owner; IF actor.stepUp absent THEN onRefused(ctx) if declared, then err auth.step_up_required, nothing else written"
    violation: "Prompting for a password before the capability check tells an unauthorised actor what exists; skipping onRefused breaks T-104's 'every reveal attempt recorded'"
    source: "01-conventions §3 (onRefused) and §5, T-305 acceptance row 'Original route', T-104 acceptance row 'Reveal always recorded'"
  - id: BR7.5
    statement: "A command that ran under requires.stepUp writes step_up: true into its own audit details."
    category: constraint
    applies_to: "defineCommand, AuditWriter calls"
    trigger: "A step-up-gated command writes its audit row"
    logic: "defineCommand passes stepUp: true to the command's audit helper, which adds step_up: true to details"
    violation: "Fails auth-screens-spec.md §4.4 ('The audit row for the action carries step_up: true')"
    source: "auth-screens-spec.md §4.4, prototype auditPreview, F15"
  - id: BR7.6
    statement: "Every step-up attempt is audited with its purpose: step_up on success, step_up_failed on a wrong password."
    category: policy
    applies_to: "account.stepUp"
    trigger: "account.stepUp finishes"
    logic: "input {password, purpose} with purpose in STEP_UP_PURPOSES = [config.apply, config.rollback, identity.reveal, evidence.original, moderation.enforce, staff.setRole, retention.bulk, account.delete]; success THEN audit step_up {purpose}; wrong password THEN record a failure and audit step_up_failed {purpose}, return auth.invalid_credentials"
    violation: "A failed recheck that is not recorded fails AC11.1.2"
    source: "AC11.1.2, FR102, T-103 step 8 (details {purpose}), Question 7"
  - id: BR7.7
    statement: "Step-up allows 5 failures per 15 minutes per account."
    category: policy
    applies_to: "account.stepUp"
    trigger: "A step-up attempt"
    logic: "IF action:account:<id>:step-up has 5 failures in 15 min THEN auth.rate_limited with retryAfterSec, no password check"
    violation: "Unlimited rechecks turn step-up into a password oracle for a hijacked session (threat T9)"
    source: "03 §4 rate limits ('step-up 5 failures/15 min/account')"
  - id: BR7.8
    statement: "useStepUp().withStepUp(fn) runs fn, opens StepUpSheet on auth.step_up_required, re-runs fn once after a successful step-up, and returns the original error on cancel."
    category: constraint
    applies_to: "apps/web/src/components/shared/StepUpSheet.tsx"
    trigger: "A client component calls a step-up-gated action"
    logic: "One pending call at a time; the password field is cleared on close; the sheet uses Sheet.tsx and only the classes both stylesheets define (.overlay, .sheet, .field, .btn, .note); purpose is passed by the caller"
    violation: "Re-running more than once could repeat a sensitive action; a stored password is a secret at rest in memory"
    source: "T-103 step 8, auth-screens-spec.md §4.4"

  # Group 8 — Staff roles
  - id: BR8.1
    statement: "staff.setStaffRole is a Super Admin command that needs a step-up; it has no UI in this Unit."
    category: authorization
    applies_to: "staff.setStaffRole"
    trigger: "Any call"
    logic: "requires {staffRole: [super_admin], stepUp: true}; SetStaffRoleInput {accountId, role | null}; exported as a server action for tests and later Units"
    violation: "A role change without Super Admin and step-up is escalation (S1)"
    source: "03 §4 staff.setStaffRole, C5, AC11.1.2, AC11.1.6, Question 8"
  - id: BR8.2
    statement: "A Super Admin cannot change their own role, and only an active account can receive a role."
    category: validation
    applies_to: "staff.setStaffRole"
    trigger: "Input passed BR8.1"
    logic: "IF accountId = actor.accountId THEN forbidden; IF the target is not active THEN conflict; IF the role is unchanged THEN ok with no write"
    violation: "A self-demotion can lock the console; a role on an unverified address makes its approval email untrusted"
    source: "Design decision"
  - id: BR8.3
    statement: "Changing or removing a role revokes every device of the target and is audited with before and after values."
    category: constraint
    applies_to: "staff.setStaffRole"
    trigger: "A role actually changes"
    logic: "One transaction: account_profiles.staff_role = role; staff_devices.revoked_at = now for the target's open devices; audit account:<target> staff_role_changed {from, to, step_up: true}"
    violation: "A demoted account whose approved device still carries its old trust breaks BR3.1's intent (threat T7)"
    source: "FR102 (actor, time, previous and new value), design decision"

  # Group 9 — Email and notices
  - id: BR9.1
    statement: "The approval email goes through queueEmail with category device_approval, which is always sent like the other essential categories, and its recipient travels only encrypted."
    category: constraint
    applies_to: "packages/application/src/modules/notification/internal/queue-email.ts, RecipientDirectory"
    trigger: "BR5.1 queues the email"
    logic: "device_approval joins verification, reset and security as always-allowed categories; RecipientDirectory encrypts the address with the mail-only recipient key the owner chose for U8 R1; the mail.send payload is {deliveryId}"
    violation: "An address in a payload or a key the worker should not hold breaks FD-071, FD-041 and the owner's R1 answer"
    source: "C2 (U10 device_approval), FD-071, OWNER-REVIEW-QUEUE.md U8 R1 answer"
  - id: BR9.2
    statement: "email.staff.deviceApproval carries exactly one param, an absolute link under APP_URL, on the queue side and the worker side."
    category: validation
    applies_to: "queue-email.ts allowlist, apps/worker/src/handlers/mail-send.ts"
    trigger: "The approval email is queued or rendered"
    logic: "Allowlist entry email.staff.deviceApproval: [link]; any other key refused (InternalError when queueing, failed params_invalid when sending)"
    violation: "Content in params fails AC10.1.4's content-free rule"
    source: "U8 BR6.2, AC10.1.4"
  - id: BR9.3
    statement: "An approved device is announced by appending account.securityEvent {accountId, kind: deviceApproved}; this Unit writes no notifications or staff_notifications rows."
    category: constraint
    applies_to: "staff.approveDevice"
    trigger: "BR5.9"
    logic: "Outbox append in the approval transaction; U34 T-405's notification.deliver creates the in-app notice; until then the acceptance row reads the outbox row"
    violation: "Writing Notification's tables here breaks FD-065's ownership and duplicates U34's notice"
    source: "Question 6, C15 (deviceApproved), FD-065, F12"
  - id: BR9.4
    statement: "The relay map gains no entry: account.securityEvent already routes to notification.deliver."
    category: constraint
    applies_to: "apps/worker/src/handlers/outbox-relay.ts"
    trigger: "Code Generation"
    logic: "No change to RELAY; the worker never imports Better Auth or any staff command"
    violation: "A new route or import breaks C15 or AD-6"
    source: "C15, U8 BR6.4, AD-6"

  # Group 10 — Privacy, audit, logging, i18n, UI
  - id: BR10.1
    statement: "No device secret, approval token, step-up cookie value, password or email appears in a log line, audit detail, outbox payload, job payload or result."
    category: constraint
    applies_to: "Every T-103 command, action and page"
    trigger: "Any log, audit, outbox or result write"
    logic: "Logs carry event, correlationId, opaque ids (accountId, deviceId, approvalId), enums and counts; an integration test captures logs over the full cycle and finds none of the forbidden values"
    violation: "A secret in a log or audit row lets anyone with read access impersonate a staff device (S1)"
    source: "01-conventions §5 and §11, T-103 hard-rule checklist"
  - id: BR10.2
    statement: "Audit rows for this Unit use the account:<id> stream and details limited to ids, enums and counts."
    category: constraint
    applies_to: "AuditWriter calls in modules/account"
    trigger: "Any T-103 audit row"
    logic: "staff_signed_in {deviceId}; staff_device_requested {deviceId}; staff_device_approval_failed {deviceId, attempt}; staff_device_approved {deviceId}; staff_device_revoked {deviceId, current}; step_up {purpose}; step_up_failed {purpose}; staff_role_changed {from, to, step_up}; actor account:<id> (anonymous for the approval failures, account:<id of the token's account> as target stream)"
    violation: "Fails the hard-rule checklist 'every device/step-up event audited with allowlisted details' and ISS-108's intent"
    source: "01-conventions §5, T-103 hard-rule checklist, ISS-108"
  - id: BR10.3
    statement: "Every staff screen is noindex, shows no patient chrome and loads admin.css only."
    category: constraint
    applies_to: "apps/web/src/app/[locale]/admin/**"
    trigger: "Any staff route"
    logic: "metadata.robots = noindex on the shared admin layout; the patient layout is never used; StepUpSheet on staff pages styled by admin.css"
    violation: "Fails the hard-rule checklist 'Console pages noindex; no patient chrome'"
    source: "T-103 hard-rule checklist, 01-conventions §7.3 and §8"
  - id: BR10.4
    statement: "Every new or changed user-facing string has an English and a Bengali entry in the same commit; numbers on screen come from the formatter."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation adds or changes a key"
    logic: "New: errors.auth.deviceMismatch, staff.account.menu; changed: staff.device.body gains {minutes} rendered with formatNumber(30, locale); Bengali flagged for the owner's review"
    violation: "A key without Bengali fails the build (project.md Mandated); a hard-coded digit fails spec §5"
    source: "project.md Mandated, auth-screens-spec.md §5, T-103 hard-rule checklist, Question 10"
  - id: BR10.5
    statement: "On every staff form the single solid accent is the primary commit button; secondary actions are ghost or small buttons."
    category: constraint
    applies_to: "StaffSignInForm, ApproveDeviceRecheck, StepUpSheet, StaffSecurity"
    trigger: "Rendering a staff form"
    logic: ".btn.primary only on Sign in, Trust this device, Continue (step-up); Show password, Revoke and Change password use .btn.ghost.small or .btn.small as the prototype does"
    violation: "Fails the hard-rule checklist (Chart Tray single accent)"
    source: "auth-screens-spec.md §4.1, T-103 hard-rule checklist, ISS-024"
  - id: BR10.6
    statement: "The built staff screens match the D-001 review the owner approved, in en and bn, both themes and at 360 px, with no horizontal or Bengali text overflow."
    category: validation
    applies_to: "/admin/sign-in, /admin/approve-device (pending, recheck), /admin/security, StepUpSheet"
    trigger: "Build and Test"
    logic: "Each screen is compared with the approved prototype screen; the comparison and its date are recorded; impeccable detect and pnpm contrast are clean"
    violation: "Fails the FD-053 'screens match the approved review' row"
    source: "FD-053, T-103 acceptance rows, 01-conventions §7.8"
  - id: BR10.7
    statement: "The read-only RoleChip replaces the prototype's role switcher: it shows SA, AD or MO with title staff.role.chipTitle {role} and opens StaffAccountMenu with Security and Sign out; nothing can switch roles."
    category: constraint
    applies_to: "components/admin/auth/RoleChip.tsx, StaffAccountMenu.tsx, components/admin/Masthead.tsx"
    trigger: "Console chrome renders"
    logic: "role from the Actor (BR3.1); label SA / AD / MO; title from staff.role.chipTitle with admin.role.sa / admin / mod; menu items link /<locale>/admin/security and post account.signOut; no role control"
    violation: "Any role switch in the shipped console breaks FD-034"
    source: "FD-034, auth-screens-spec.md §4, T-103 step 9"

  # Group 11 — Verification
  - id: BR11.1
    statement: "Tests cover every level the Unit touches: the capability table, step-up signing, each command's happy path, refusals and audit row, the repository and migration, the web flow, and the four screens in both languages."
    category: validation
    applies_to: "packages/contracts, packages/application, packages/database, apps/web tests"
    trigger: "Code Generation"
    logic: "The test list in functional-spec.md § 11; each test can fail; names read as sentences"
    violation: "A missing level fails team.md Testing Posture"
    source: "team.md Testing Posture, 01-conventions §10, T-103 'Tests to write'"
  - id: BR11.2
    statement: "The cumulative smoke suite gains at least one assertion for this Unit and loses none."
    category: validation
    applies_to: "pnpm smoke"
    trigger: "Code Generation"
    logic: "At least: admin with every toggle on lacks retention.bulk; a capability-gated command refuses an account Actor whose device is not approved"
    violation: "Breaks the cumulative smoke rule"
    source: "team.md Testing Posture"
  - id: BR11.3
    statement: "pnpm check, pnpm smoke and pnpm test:int exit 0 with the compose stack running, and the UI checks are clean."
    category: validation
    applies_to: "repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "All exit 0; npx impeccable detect apps/web/src --no-advisory and pnpm contrast clean; every T-103 acceptance row executed and recorded as expected against observed"
    violation: "A red check blocks the merge"
    source: "team.md Way of Working, project.md Mandated, 01-conventions §7.8"
  - id: BR11.4
    statement: "As a high-risk Unit, a separate agent writes and runs 3 to 5 adversarial regression tests from functional-spec.md § 12.2, collaborators are on, and the owner signs off in writing."
    category: validation
    applies_to: "U10 Build and Test"
    trigger: "After Code Generation"
    logic: "The angles cover device-trust bypass, approval link abuse, cookie and token storage, step-up forgery and order, escalation and enumeration"
    violation: "Missing adversarial tests or sign-off blocks the phase gate"
    source: "team.md Way of Working step 5, project.md Mandated, R2"
  - id: BR11.5
    statement: "The packages that gain code keep the 80 % line-coverage floor."
    category: validation
    applies_to: "packages/application, packages/contracts, packages/database"
    trigger: "Build and Test"
    logic: "Measured with @vitest/coverage-v8 from T-010's thresholds; never lowered to pass"
    violation: "Below the floor blocks the merge (D10)"
    source: "team.md Testing Posture"

  # Group 12 — Records and scope
  - id: BR12.1
    statement: "Every file changed outside T-103's literal owned paths is listed, with its reason, in the hand-off and in one ISS row."
    category: policy
    applies_to: "Owned paths"
    trigger: "Code Generation"
    logic: "The additions in functional-spec.md § 15 (contracts, command.ts, queue-email.ts, schema and migration, admin route groups, container, test-support fake, reference docs)"
    violation: "An unrecorded file fails the reviewer's diff review (G4)"
    source: "team.md Way of Working"
  - id: BR12.2
    statement: "The reference documents are corrected where this design changes them, in the same Bolt."
    category: policy
    applies_to: "03-routes-and-contracts.md, 02-data-model.md, 01-conventions.md, auth-screens-spec.md"
    trigger: "Code Generation"
    logic: "03 §2 gains auth.device_mismatch first (before errors.ts); 03 §1 shows the admin route groups; 03 §4 reads staff.signIn, StepUpInput.purpose and the staff sign-in limits as this design; 02 §2 gains failed_attempts and the partial unique index; 01 §5 says staff powers need an approved device; spec §5 shows staff.device.body with {minutes}"
    violation: "Leaving the old text recreates source drift"
    source: "contract-summary.md (the building Unit corrects 03), errors.ts header"
  - id: BR12.3
    statement: "The open ISS rows in this area are closed or updated, and every new finding gets a row linked to U10 T-103."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "Closed: ISS-100 (chrome-less auth screens), ISS-023 and ISS-025 (prototype-only assumptions superseded by real sign-in); updated: ISS-054 (admin.role.current stays removed; RoleChip uses staff.role.chipTitle), ISS-034 (the ported .kv keeps the prototype's columns); new rows as in functional-spec.md § 9"
    violation: "An unrecorded defect breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), team.md Way of Working"
  - id: BR12.4
    statement: "Before relying on server-side session creation and password verification in Better Auth, Code Generation reuses or renews the dependency-check entry."
    category: policy
    applies_to: "docs/status/dependency-check-log.md"
    trigger: "Start of Code Generation"
    logic: "IF U8's Better Auth entry is under 3 days old THEN reuse it ELSE re-check the current stable 1.7.x and its advisories and append an entry; confirm the capabilities in functional-spec.md § 16"
    violation: "Breaks the project's Mandated dependency rule"
    source: "AGENTS.md, project.md Mandated"
  - id: BR12.5
    statement: "Code Generation does not start before the owner's approval of the D-001 auth-screen review is recorded in this Unit's record."
    category: policy
    applies_to: "U10 Code Generation"
    trigger: "Before Code Generation"
    logic: "The record holds the approval date and that it covers en, bn, both themes and 360 px; ELSE the Unit waits (R1)"
    violation: "Fails the FD-053 'D-001 gate recorded' row"
    source: "FD-053, T-103 acceptance row"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | One capability table in code; `resolveCapabilities` wraps it | calculation |
| BR1.2 | super_admin: all eight, fixed | authorization |
| BR1.3 | admin: four plus two toggles, never bulk or config | authorization |
| BR1.4 | moderator: two plus two toggles | authorization |
| BR1.5 | Config only switches four toggles; strict schema | validation |
| BR2.1 | Device cookie: 32 bytes, flags, 90 days, hash at rest | constraint |
| BR2.2 | New secret for no cookie or a revoked pair; never reuse a revoked row | policy |
| BR2.3 | Trust per account and hash | authorization |
| BR2.4 | One open row per account and hash | constraint |
| BR3.1 | Staff powers need role, active status and approved device | authorization |
| BR3.2 | Checks at the data, not the layout | authorization |
| BR3.3 | Guard redirects | policy |
| BR3.4 | Staff context never authorizes | constraint |
| BR3.5 | Safe `next` | validation |
| BR3.6 | Security page guarded, auth screens chrome-less | authorization |
| BR4.1 | Same refusals as patient sign-in | policy |
| BR4.2 | Shared counters across both routes | calculation |
| BR4.3 | Password through the port before any session | constraint |
| BR4.4 | `staff.notStaff` only after the right password, nothing created | authorization |
| BR4.5 | Only the staff commands create staff sessions | authorization |
| BR4.6 | Unknown device: no session, device cookie and pending approval | authorization |
| BR5.1 | 30-minute single-use token, hashed, emailed | constraint |
| BR5.2 | Token refusals and three strikes | validation |
| BR5.3 | Link bound to the device cookie | authorization |
| BR5.4 | Device and staff status re-checked at approval | authorization |
| BR5.5 | Newest link only | policy |
| BR5.6 | 3 approval emails per hour per account | policy |
| BR5.7 | Pending screen without identity data | constraint |
| BR5.8 | 10 approval attempts per 15 min per network | policy |
| BR5.9 | Approve, audit, event in one transaction; compensation | constraint |
| BR5.10 | One account per browser after approval | policy |
| BR5.11 | No-referrer, no token in logs | constraint |
| BR6.1 | Device list without hashes | constraint |
| BR6.2 | Revoke own devices only, audited | authorization |
| BR6.3 | Revoke current signs out; revoked stops at once | constraint |
| BR6.4 | Reuse U9's session and password parts | constraint |
| BR7.1 | Signed, bound, 5-minute step-up cookie | constraint |
| BR7.2 | HKDF-derived step-up key | constraint |
| BR7.3 | Constant-time verification, account and session match | authorization |
| BR7.4 | `requires` order; `onRefused` on missing step-up | authorization |
| BR7.5 | `step_up: true` in the action's audit | constraint |
| BR7.6 | Every step-up attempt audited with a purpose | policy |
| BR7.7 | 5 step-up failures per 15 min | policy |
| BR7.8 | `withStepUp` re-runs once | constraint |
| BR8.1 | `setStaffRole`: Super Admin + step-up, no UI | authorization |
| BR8.2 | No self-change; active targets only | validation |
| BR8.3 | Role change revokes devices, audited before/after | constraint |
| BR9.1 | Approval email through `queueEmail`, always sent, recipient encrypted | constraint |
| BR9.2 | One-link params allowlist | validation |
| BR9.3 | `deviceApproved` outbox event, no notification rows | constraint |
| BR9.4 | No relay change | constraint |
| BR10.1 | No secrets or emails anywhere | constraint |
| BR10.2 | Audit actions and allowlisted details | constraint |
| BR10.3 | `noindex`, no patient chrome | constraint |
| BR10.4 | `en` + `bn` together; formatter digits | policy |
| BR10.5 | Single solid accent per staff form | constraint |
| BR10.6 | Screens match the approved D-001 review | validation |
| BR10.7 | Read-only role chip and account menu | constraint |
| BR11.1 | Tests per level | validation |
| BR11.2 | Smoke grows | validation |
| BR11.3 | All checks green | validation |
| BR11.4 | Adversarial tests, collaborators, sign-off | validation |
| BR11.5 | Coverage floor | validation |
| BR12.1 | Owned-path additions recorded | policy |
| BR12.2 | Reference documents corrected | policy |
| BR12.3 | ISS rows closed and added | policy |
| BR12.4 | Dependency check | policy |
| BR12.5 | D-001 gate before Code Generation | policy |
