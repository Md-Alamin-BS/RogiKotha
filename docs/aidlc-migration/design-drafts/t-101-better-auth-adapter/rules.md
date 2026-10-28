# Business rules — U8 `t-101-better-auth-adapter`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-101-better-auth-adapter/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U8), `unit-of-work-story-map.md` (US3.1, US3.2), `requirements.md` (FR1–FR9, NFR3, NFR10, NFR11), `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5, AC10.1.4, AC10.3.6), `components.md` (Account), `contract-summary.md` (C1, C2, C5, C14, C15 and the ownership rules), T-101 with its amendments (FD-056, FD-057, FD-058, FD-059, FD-063, FD-071, FD-072, C5, C15, review R-14), FD-041 and FD-092, `auth-screens-spec.md` §3 and §5, and the open `ISSUES.md` rows ISS-032, ISS-033, ISS-078, ISS-111, ISS-112, ISS-113, ISS-155, ISS-180, ISS-223, ISS-243, ISS-253 and ISS-255.

The rules that depend on a question follow the answers in `functional-design-questions.md`, recorded on the owner's standing instruction of 2026-10-27 and awaiting the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. `functional-spec.md` § 14 lists what changes if the owner reverses an answer. "Normalised email" always means NFC, trimmed, lowercase.

```yaml
rules:
  # Group 1 — Registration (account.register)
  - id: BR1.1
    statement: "Registration input is validated in full before any account lookup, and every problem is reported as a field error in the active language."
    category: validation
    applies_to: "account.register, RegisterInput"
    trigger: "account.register is called"
    logic: "IF email is not a valid address THEN fieldErrors.email; IF password has fewer than 10 or more than 256 characters THEN auth.password_too_short or validation; IF the normalised password equals the normalised email THEN auth.password_equals_email; IF username does not match ^[a-z0-9_]{3,24}$ THEN auth.username_invalid; IF displayName trimmed is empty or longer than 60 THEN validation; IF ageConfirmed is false THEN auth.age_required; IF termsAccepted is false THEN auth.terms_required. One problem returns its own code; several return validation with one fieldErrors entry each"
    violation: "No row is written; the result is err with the code and fieldErrors; nothing reveals whether the email exists"
    source: "FR2, FR3, AC3.1.3, auth-screens-spec.md §3.1, Question 7, ISS-033"
  - id: BR1.2
    statement: "Sign-up is limited to 5 attempts per hour per network key."
    category: policy
    applies_to: "account.register"
    trigger: "Before validation results are acted on"
    logic: "IF the network key has 5 hits within the last hour THEN refuse with auth.rate_limited and retryAfterSec ELSE record the hit"
    violation: "auth.rate_limited; nothing is written"
    source: "03 §4 rate limits, T-101 step 4"
  - id: BR1.3
    statement: "A taken username is reported whatever the email is, so the username check can never reveal whether an email has an account."
    category: validation
    applies_to: "account.register"
    trigger: "Input passed BR1.1"
    logic: "IF a profile with this username exists (case-insensitive) THEN return auth.username_taken, for a new email and for an existing email alike, before the email branch is chosen; a unique-violation on insert maps to the same code"
    violation: "Checking the username only on the new-email branch would let username_taken versus neutral success reveal the email (enumeration)"
    source: "auth-screens-spec.md §3.1 (usernames are public), AC3.1.3, AC3.1.5 (no reveal), T-101 threat 1"
  - id: BR1.4
    statement: "An email that already has an account gets the same success result as a new one; the existing owner is told by email and no account row is created."
    category: policy
    applies_to: "account.register, existing-email branch"
    trigger: "The normalised email belongs to an AuthUser"
    logic: "IF the email exists THEN return ok({accountId}) with a new random id that is never persisted; IF that account has a profile whose status is not deleted THEN in one transaction queue email.existing (category security, {link} = the sign-in page), append account.securityEvent {accountId, kind: existingEmailRegister} and write audit existing_email_register"
    violation: "A different shape, status or error for an existing email is an enumeration defect (S1)"
    source: "03 §4 account.register, auth-screens-spec.md §3.1, T-101 step 5, C15 securityEvent kinds"
  - id: BR1.5
    statement: "A new email creates the library user and credential, then the domain rows, audit, outbox event and verification email in one application transaction."
    category: constraint
    applies_to: "account.register, new-email branch"
    trigger: "The normalised email has no AuthUser"
    logic: "Inside the account.register command context: the library creates AuthUser and AuthCredential (no session, no library email); THEN one transaction inserts AccountProfile (pending_verification, username_key, terms_version from TERMS_VERSION, age_confirmed_at, terms_accepted_at), AccountPreference (interface_locale = locale), the named and pseudonymous personas and their links, audit registered, outbox account.registered {accountId}, and the verification EmailDelivery with its mail.send job; IF that transaction fails THEN the library user is deleted (cascade) and the result is err internal"
    violation: "An AuthUser without a profile is a defect: getActor treats it as anonymous and logs auth.profile_missing; the integration test asserts one row of each kind"
    source: "T-101 step 5 and acceptance row 'Register creates domain rows', Question 4, C2 queueEmail"
  - id: BR1.6
    statement: "The new-email and existing-email branches cost the same and return no earlier than the same floor."
    category: constraint
    applies_to: "account.register"
    trigger: "Either branch runs"
    logic: "Both branches run exactly one Argon2id hash with the production parameters (the existing branch hashes the submitted password and discards it) and one email-queueing transaction or an equivalent no-op; THEN the response waits until a fixed floor measured in Code Generation has passed"
    violation: "A median timing difference of 15 % or more over 20 calls fails the T-101 timing row"
    source: "T-101 step 5 and acceptance row 'Timing', threat 1"
  - id: BR1.7
    statement: "The library may create a user only inside account.register."
    category: authorization
    applies_to: "Better Auth databaseHooks.user.create.before"
    trigger: "The library is about to insert an AuthUser"
    logic: "IF the current CommandContext is not account.register THEN the hook returns false and logs auth.unexpected_user_create (no address in the line)"
    violation: "A direct auth.api.signUpEmail outside the command that creates a row is an S1 defect (policy bypass, threat 7)"
    source: "T-101 step 5 and threat 7, AD-4"
  - id: BR1.8
    statement: "Passwords are normalised to NFC and hashed with Argon2id m=65536 KiB, t=3, p=1 through the PasswordHasher port; plaintext is never stored or logged."
    category: constraint
    applies_to: "PasswordHasher, every command that hashes or verifies a password"
    trigger: "A password is hashed or verified"
    logic: "IF a password is hashed or verified THEN it is NFC-normalised first and the port's PHC output is stored; the library's password.hash and password.verify call the same port"
    violation: "A non-Argon2id credential or a stored plaintext fails AC3.1.2 (S1)"
    source: "FR3, AC3.1.2, T-101 step 3, 03 §3 PasswordHasher"
  - id: BR1.9
    statement: "No job, schedule or query deletes or selects unverified or inactive accounts for deletion."
    category: policy
    applies_to: "apps/worker registry, application modules"
    trigger: "Any scheduled job runs"
    logic: "IF T-101 registers a job THEN it is mail.send only; no cleanup policy exists"
    violation: "Any automatic deletion fails AC3.1.6"
    source: "FD-056, FR5, AC3.1.6"
  - id: BR1.10
    statement: "Registration creates exactly two personas: named (display name) and pseudonymous (username), each with a private link to the account."
    category: constraint
    applies_to: "account.register"
    trigger: "The new-email transaction"
    logic: "IF the account is created THEN insert one named persona (display_name = displayName, username = username) and one pseudonymous persona (display_name = username, username = username) and one persona_link each, in the account module with TODO(T-104)"
    violation: "Missing or extra personas fail the register acceptance row"
    source: "02 §3 rules, T-101 step 5, 03 §4"

  # Group 2 — Email verification
  - id: BR2.1
    statement: "The verification link is valid for 24 hours and points to the app's own verify page in the account's locale."
    category: constraint
    applies_to: "Verification email"
    trigger: "A verification email is queued"
    logic: "Token lifetime 86400 s; link = APP_URL/<locale>/verify-email?token=<token>, built from the token the library hands to its email callback; the library's own verify URL is not used"
    violation: "A longer lifetime or a library URL fails AC3.1.4 and Question 1"
    source: "FR4, AC3.1.4, T-101 step 4, Question 1"
  - id: BR2.2
    statement: "Verifying an email activates only a pending account and never changes a suspended, banned or deleted one."
    category: constraint
    applies_to: "account.verifyEmail"
    trigger: "The library accepted the token"
    logic: "IF status is pending_verification THEN set active and write audit email_verified in one transaction, then sign the holder in; IF status is active or restricted THEN change nothing and return ok; IF status is suspended, banned or deleted THEN change nothing, start no session and return auth.token_invalid"
    violation: "A replayed or late token that reactivates a suspended account is an S1 defect"
    source: "AC3.1.4, 02 §17 Account, T-101 step 6"
  - id: BR2.3
    statement: "An expired token is refused with auth.token_expired and an invalid or used one with auth.token_invalid, with the same shape whether or not the token's account exists."
    category: validation
    applies_to: "account.verifyEmail, account.resetPassword"
    trigger: "A token is presented"
    logic: "IF expired THEN auth.token_expired; IF unknown, malformed or already used THEN auth.token_invalid; nothing changes"
    violation: "Accepting a used or expired token fails AC3.1.4 and AC3.2.2"
    source: "AC3.1.4, AC3.2.2, T-101 threats 2 and 3"
  - id: BR2.4
    statement: "Resending a verification email always returns the same neutral result and is limited to 3 per hour per email key."
    category: policy
    applies_to: "account.resendVerification"
    trigger: "A resend is requested"
    logic: "IF the email key has 3 hits in the last hour THEN auth.rate_limited with retryAfterSec (for every address alike) ELSE record the hit; IF the address belongs to a pending_verification account THEN queue a new verification email; in every case return ok({}) no earlier than the resend floor"
    violation: "A different result for an unknown, verified or deleted address is an enumeration defect"
    source: "FR4, AC3.1.4, 03 §4, auth-screens-spec.md §3.2"
  - id: BR2.5
    statement: "An unconfirmed account can sign in, browse and change its settings, but every contribution command refuses it."
    category: authorization
    applies_to: "getActor, every command with requires.verifiedEmail"
    trigger: "A pending_verification account acts"
    logic: "The Actor of a pending account has kind account and emailVerified false; IF a command requires verifiedEmail THEN it returns auth.email_unverified; settings commands (updatePreferences, changePassword, listSessions, signOut, signOutEverywhere) do not require it"
    violation: "A pending account that can contribute, or that cannot reach its settings, fails AC3.1.4 and FR4"
    source: "FR4, AC3.1.4, components.md Account, auth-screens-spec.md §1 and §3.7, Question 2"
  - id: BR2.6
    statement: "The library sends no email on its own; every email goes through queueEmail."
    category: constraint
    applies_to: "Better Auth options"
    trigger: "Library configuration"
    logic: "sendOnSignUp false, sendOnSignIn false, autoSignIn false at sign-up; the sendVerificationEmail and sendResetPassword callbacks only hand the token to the running command (BR7.9)"
    violation: "An email sent outside queueEmail has no EmailDelivery row and bypasses FD-071"
    source: "FD-071, C2, T-101 step 6"

  # Group 3 — Sign-in, limits, progressive delay, severe notice
  - id: BR3.1
    statement: "Every sign-in limit and counter uses the normalised email, so case, spacing and Unicode form variants of one address share one counter."
    category: calculation
    applies_to: "account.signIn"
    trigger: "A sign-in attempt arrives"
    logic: "key = HMAC-SHA256(normalised email); the same key whether or not the address has an account"
    violation: "Two counters for variants of one address let an attacker double the allowed attempts"
    source: "C5 (NFC, trim, lowercase), unit-of-work.md open point (sign-in counter normalisation), AC3.1.5"
  - id: BR3.2
    statement: "A sign-in attempt is checked against the network limit, the per-email limit and the progressive delay, in that order, before any database read or password check."
    category: policy
    applies_to: "account.signIn"
    trigger: "A sign-in attempt arrives"
    logic: "IF the network key has 30 failures within 15 min THEN refuse; ELSE IF the email key has 10 failures within 15 min THEN refuse with retryAfterSec = oldest counted failure + 15 min - now; ELSE IF the progressive delay of BR3.3 has not passed THEN refuse; every refusal is auth.rate_limited with retryAfterSec, records nothing and checks no password"
    violation: "Checking the password on a refused attempt, or reading the database before refusing, fails the C5 'refusal, not wait' row and leaks timing"
    source: "C5 fixed limit and progressive delay, T-101 step 4 and step 10, acceptance rows 'Rate limit' and 'refusal, not wait'"
  - id: BR3.3
    statement: "The progressive delay starts at the delayAfterFailures-th failure, starts at firstDelaySeconds, doubles per further failure and stops at maxDelaySeconds."
    category: calculation
    applies_to: "account.signIn, sign-in-delay policy"
    trigger: "The email key has n failures within windowMinutes"
    logic: "IF n >= delayAfterFailures THEN delay = min(firstDelaySeconds * 2^(n - delayAfterFailures), maxDelaySeconds), measured from the latest failure; retryAfterSec = ceil(latest failure + delay - now), at least 1; failures older than windowMinutes do not count"
    violation: "With the defaults, 9 failures must give refusals with retryAfterSec 1, 2, 4, 8, 16, 30, 30 (FD-063 row); any other sequence is a defect"
    source: "FD-058, FD-063, C5, AC3.1.5"
  - id: BR3.4
    statement: "The delay and severe-notice numbers are read through ConfigProvider.current().signIn on every attempt."
    category: constraint
    applies_to: "account.signIn"
    trigger: "A sign-in attempt arrives"
    logic: "The command reads delayAfterFailures, windowMinutes, firstDelaySeconds, maxDelaySeconds and severeFailures from the provider; no constant in code; the web composition root wires a defaults-only provider returning DEFAULT_CONFIG_VALUES until T-105"
    violation: "A hard-coded value fails the FD-063 'settings through ConfigProvider' row"
    source: "FD-063, FD-072, review R-14, AC3.1.5"
  - id: BR3.5
    statement: "A wrong password, an unknown email and a deleted account each count as one failure on the email key and the network key; a success clears the email key; a refused attempt counts as nothing."
    category: calculation
    applies_to: "account.signIn"
    trigger: "An attempt that passed BR3.2 finishes"
    logic: "IF the credential check fails (including unknown or deleted) THEN record a failure on both keys and return auth.invalid_credentials; IF it succeeds THEN clear the email key's failures; refusals under BR3.2 record nothing"
    violation: "Counting refusals would extend the delay forever; not counting unknown emails would let the delay reveal existence"
    source: "C5, AC3.1.5, T-101 step 10"
  - id: BR3.6
    statement: "A suspended or banned account gets auth.account_suspended only after its password was verified, and never receives a session."
    category: authorization
    applies_to: "account.signIn, Better Auth databaseHooks.session.create.before"
    trigger: "The credential check succeeds for a suspended or banned account"
    logic: "IF status is suspended or banned THEN refuse with auth.account_suspended and create no session (the session hook refuses it and the command revokes any session the library returned); the attempt is not a failure"
    violation: "Showing the suspension before the password check reveals account status without a credential; a session for a suspended account fails threat 9"
    source: "03 §4 account.signIn, C5, auth-screens-spec.md §3.3, ISS-078, ISS-032"
  - id: BR3.7
    statement: "A deleted account is refused exactly like a wrong password."
    category: authorization
    applies_to: "account.signIn"
    trigger: "The address belongs to an account whose status is deleted"
    logic: "IF status is deleted THEN return auth.invalid_credentials with the same shape and timing, start no session and count a failure"
    violation: "Any difference fails the C5 'deleted account refused' row"
    source: "C5, T-101 acceptance row 'deleted account refused'"
  - id: BR3.8
    statement: "A pending_verification account signs in normally and receives an Actor with emailVerified false."
    category: authorization
    applies_to: "account.signIn"
    trigger: "The credential check succeeds for a pending account"
    logic: "IF status is pending_verification THEN create the session; auth.email_unverified is never returned by sign-in"
    violation: "Refusing sign-in to a pending account fails FR4 (edit settings before confirmation)"
    source: "Question 2, FR4, AC3.1.4"
  - id: BR3.9
    statement: "When an address that has an account reaches severeFailures inside the window, one security email and one securityEvent are written in one transaction, at most once per account per window; nothing is written for an address without an account."
    category: policy
    applies_to: "account.signIn severe-activity notice"
    trigger: "A failure makes n equal severeFailures"
    logic: "IF n = severeFailures AND the address belongs to a profile whose status is not deleted AND no EmailDelivery with message key email.security.severeSignInActivity exists for that account with created_at newer than now - windowMinutes THEN in one transaction queue email.security.severeSignInActivity (category security, {link} = the reset-request page), append account.securityEvent {accountId, kind: severeSignInActivity} and write audit severe_sign_in_activity {failures: n}; this work runs after the response is sent (Question 9)"
    violation: "Two notices inside one window, or any row for an address without an account, fails the C5 severe rows"
    source: "FD-058, FD-063, FD-072, C5 severe notice, AC3.1.5, Question 9"
  - id: BR3.10
    statement: "No challenge (CAPTCHA or other) is shown or returned in the demo."
    category: policy
    applies_to: "account.signIn"
    trigger: "Any attempt"
    logic: "No response carries a challenge field or step"
    violation: "Fails the FD-058 'no CAPTCHA' row"
    source: "FD-058, AC3.1.5"
  - id: BR3.11
    statement: "Every sign-in refusal has the same shape and status whether or not the address has an account."
    category: constraint
    applies_to: "account.signIn result"
    trigger: "A refusal is returned"
    logic: "The result is AppError {code, messageKey, correlationId, retryAfterSec?} with no other field; the median timing difference between a real and an unknown address stays under 15 %"
    violation: "Any extra field, different status or timing gap fails AC3.1.5"
    source: "AC3.1.5, C5, threat 11"
  - id: BR3.12
    statement: "Counter state stays in the web process's memory and holds keyed hashes only, never the raw email or client address."
    category: constraint
    applies_to: "adapters/rate-limit-memory"
    trigger: "Any counter write"
    logic: "Keys are HMAC-SHA256 with a key derived from BETTER_AUTH_SECRET; state is lost on restart (ASSUMPTION(T-101), demo); timestamps come from the Clock port"
    violation: "A raw address in a key could reach a heap dump or a debug log"
    source: "C5 (in-memory limiter), 01-conventions §11, BR8.1"

  # Group 4 — Sessions, sign-out, Actor
  - id: BR4.1
    statement: "A session is accepted for at most 30 days from its creation, however often it was refreshed."
    category: constraint
    applies_to: "Better Auth session options, getActor, account.listSessions"
    trigger: "A request carries a session"
    logic: "Library expiresIn 30 days, updateAge 24 h, cookie cache off; IF created_at + 30 days <= now THEN getActor revokes the session and returns anonymous, and listSessions omits it"
    violation: "A refreshed session accepted after 30 days fails AC3.2.4"
    source: "FR6, FD-057, AC3.2.4, T-101 step 4"
  - id: BR4.2
    statement: "Session cookies are HttpOnly, SameSite=Lax and Secure exactly when APP_URL uses https; only APP_URL is a trusted origin."
    category: constraint
    applies_to: "Better Auth advanced.cookies, trustedOrigins"
    trigger: "Library configuration"
    logic: "httpOnly true, sameSite lax, secure iff APP_URL starts with https, path /; trustedOrigins [APP_URL]; server actions keep Next's own origin check"
    violation: "Fails the 'Sessions 30 d' cookie row and threat 8"
    source: "T-101 step 4 and threat 8"
  - id: BR4.3
    statement: "getActor maps a session to the application Actor from the profile status on every request."
    category: authorization
    applies_to: "apps/web/src/server/auth.ts getActor"
    trigger: "Any server request that needs an Actor"
    logic: "No valid session THEN anonymous; profile missing THEN anonymous and log auth.profile_missing; pending_verification THEN account, emailVerified false; active THEN account, emailVerified true; restricted THEN account, status restricted; suspended or banned THEN anonymous with refusal set; deleted THEN anonymous. personaId = the named persona; capabilities = resolveCapabilities stub ([] unless super_admin, TODO(T-103)); locale from the route; correlationId from a valid incoming x-correlation-id or a new uuid; cached per request"
    violation: "An account Actor for a suspended, banned or deleted profile fails threat 9 and the 'Suspended cannot act' row"
    source: "T-101 step 8, 01-conventions §5, Question 6"
  - id: BR4.4
    statement: "Session reads are never made inside a cached scope."
    category: constraint
    applies_to: "apps/web/src/server/auth.ts"
    trigger: "Code that reads the session"
    logic: "getActor and the session helpers are never called inside a 'use cache' scope; a comment and a test enforce it"
    violation: "A cached session read would serve one person's session to another"
    source: "T-101 step 1, dependency-check-log 2026-09-10 (getServerSession vs 'use cache')"
  - id: BR4.5
    statement: "Sign-out revokes the current session only and writes an audit row."
    category: constraint
    applies_to: "account.signOut"
    trigger: "An authenticated account signs out"
    logic: "Revoke the current session; audit signed_out; the staff device cookie is kept"
    violation: "A session still accepted after sign-out is a defect"
    source: "03 §4, auth-screens-spec.md §3.5"
  - id: BR4.6
    statement: "Sign out everywhere revokes every session of the account, including the current one."
    category: constraint
    applies_to: "account.signOutEverywhere"
    trigger: "An authenticated account asks for it"
    logic: "Revoke all sessions; audit signed_out_everywhere {revoked: count}; append account.securityEvent {accountId, kind: signOutAll}; no step-up in T-101 (Question 10)"
    violation: "Any listed session that is still accepted fails AC3.2.3"
    source: "FR6, FD-057, AC3.2.3, C15 kinds, Question 10"
  - id: BR4.7
    statement: "The session list shows only the account's active sessions with a device label, first seen, last seen and the current marker."
    category: constraint
    applies_to: "account.listSessions"
    trigger: "An authenticated account opens its sessions"
    logic: "Return SessionListItem for each session that is not expired and inside the 30-day cap: {id, current, label, firstSeen = created_at, lastSeen = updated_at}; label from the user agent by a small regex helper, null when unknown; no IP, no token, no login history, no failed-login list"
    violation: "History or failed-login data fails FD-057; a token or IP in the result fails BR8.3"
    source: "FR6, FD-057, AC3.2.3, 03 §4, T-101 step 7"
  - id: BR4.8
    statement: "A session of an account that became suspended or banned stops working on its next request."
    category: authorization
    applies_to: "getActor"
    trigger: "The profile status changes while a session exists"
    logic: "Status is read on every request (BR4.3); no session state caches the status"
    violation: "Fails threat 9"
    source: "T-101 threat 9, acceptance row 'Suspended cannot act'"
  - id: BR4.9
    statement: "Sessions store no IP address; the network counter key is a keyed hash of the client address held in memory only."
    category: constraint
    applies_to: "Better Auth advanced.ipAddress, account.signIn, account.register"
    trigger: "A session is created or a network key is computed"
    logic: "IP tracking is disabled in the library; the client address is read once per request by one helper, hashed (BR3.12) and dropped; when no address is available the shared key signin:net:unknown is used"
    violation: "A stored IP is private data the session list never needs"
    source: "Question 5, FD-019 (no analytics), 01-conventions §11"

  # Group 5 — Password reset and change
  - id: BR5.1
    statement: "A reset request always returns the same neutral result, is limited to 3 per hour per email key, and sends a single-use link valid for 1 hour only to an existing account."
    category: policy
    applies_to: "account.requestPasswordReset"
    trigger: "A reset is requested"
    logic: "IF the email key has 3 hits in the last hour THEN auth.rate_limited with retryAfterSec, for every address alike; ELSE record the hit; IF the address belongs to a profile whose status is not deleted THEN queue email.reset with {link} = APP_URL/<locale>/reset-password?token=<token> (1 h); return ok({}) no earlier than the reset floor"
    violation: "A different result or timing for an unknown address fails AC3.2.1"
    source: "FR9, FD-059, AC3.2.1, 03 §4, auth-screens-spec.md §3.4"
  - id: BR5.2
    statement: "A completed reset changes the password, revokes every session, writes an audit row, appends a securityEvent and sends the password-changed email."
    category: constraint
    applies_to: "account.resetPassword"
    trigger: "A valid, unexpired, unused token and a new password that meets BR1.1's password rules"
    logic: "The library consumes the token and rotates the password (revokeSessionsOnPasswordReset on); THEN one transaction writes audit password_reset (no email, no token), account.securityEvent {accountId, kind: passwordChanged} and queues email.security.passwordChanged ({link} = the reset-request page), and every remaining session is revoked; the app transaction is retried up to 3 times and a final failure is logged at error level as auth.reset_record_failed with the account id (Question 4)"
    violation: "A reset with no audit row fails FD-059 and AC3.2.2; an old session still accepted fails threat 4"
    source: "FR9, FD-059, AC3.2.2, T-101 step 6, threat 4"
  - id: BR5.3
    statement: "Changing a password requires the current password, is limited to 5 failures per 15 minutes per account, and revokes every other session."
    category: authorization
    applies_to: "account.changePassword"
    trigger: "An authenticated account changes its password"
    logic: "IF the action:account:<id> key has 5 failures in 15 min THEN auth.rate_limited; IF the current password does not verify THEN auth.invalid_credentials and record a failure; IF the new password breaks BR1.1's password rules THEN its code; ELSE rotate the password, revoke the other sessions, audit password_changed, append securityEvent passwordChanged and queue email.security.passwordChanged"
    violation: "A change without the current password, or other sessions left alive, is a defect"
    source: "03 §4 account.changePassword, auth-screens-spec.md §3.6, T-101 step 7"
  - id: BR5.4
    statement: "A completed reset on a pending account also confirms its email, because opening the link proves control of the inbox."
    category: policy
    applies_to: "account.resetPassword"
    trigger: "BR5.2 succeeds for a pending_verification account"
    logic: "IF status is pending_verification THEN set email verified and status active in the same transaction and write audit email_verified {via: reset}"
    violation: "Without it, a holder who resets before confirming stays unconfirmed although the inbox is proven; with BR5.2's revocation it also ends any session of someone who registered the address first"
    source: "Question 2 (answer A, second part), FR4"

  # Group 6 — Email queueing and mail.send
  - id: BR6.1
    statement: "Every T-101 email is queued by notification.queueEmail on the caller's transaction: the recipient comes from RecipientDirectory as ciphertext, and the mail.send job is enqueued on the same transaction with its own key."
    category: constraint
    applies_to: "packages/application/src/modules/notification/internal/queue-email.ts, RecipientDirectory (modules/account)"
    trigger: "A command needs to send an essential email"
    logic: "queueEmail(tx, {accountId, category, messageKey, params, dedupeKey?}): contactFor(tx, accountId) returns {locale = interface_locale, prefs, toEmailEnc} or null for a deleted account (THEN nothing is queued and ok({suppressed: true}) is returned); categories verification, reset and security are always allowed; IF dedupeKey already exists THEN nothing is queued; ELSE insert the EmailDelivery (queued) and enqueue mail.send {deliveryId} with key mail.send:<deliveryId> on the same transaction; the mail.send queue is ensured before the transaction opens"
    violation: "A delivery without its job, a job without its delivery, a key-less job or a queue created inside the transaction is a defect (ISS-253)"
    source: "C2 notification.queueEmail and RecipientDirectory, FD-071, ISS-253, Question 3"
  - id: BR6.2
    statement: "Email params follow an allowlist per message key; every T-101 email carries exactly one absolute link and nothing else."
    category: validation
    applies_to: "queueEmail, mail.send"
    trigger: "An email is queued or rendered"
    logic: "For email.verify, email.reset, email.existing, email.security.passwordChanged and email.security.severeSignInActivity the only param is link, an absolute https or http URL under APP_URL; any other key is refused (queue side: InternalError; worker side: failed params_invalid)"
    violation: "Content in params fails AC10.1.4"
    source: "AC10.1.4, FD-047, auth-screens-spec.md §5 (one link, absolute), C2"
  - id: BR6.3
    statement: "mail.send loads its delivery by id, decrypts the recipient, renders the localized subject and body, sends over SMTP and records the outcome; it never reads auth_users."
    category: constraint
    applies_to: "apps/worker/src/handlers/mail-send.ts"
    trigger: "A mail.send job runs"
    logic: "Parse {deliveryId}; load the row; IF status is not queued THEN finish without sending; decrypt to_email_enc (failure THEN failed decrypt_failed, no retry); render <message_key>.subject and .body from packages/i18n in row.locale, replacing {link} (missing key THEN failed template_missing); send through the MailTransport port (SMTP, 30 s timeout, MAIL_FROM); success THEN sent, sent_at, attempts + 1; transient error THEN attempts + 1 and last_error_code, and rethrow for retry while attempts < 6, ELSE failed"
    violation: "A read of auth_users is impossible as rk_worker and fails the FD-071 rows; a resend of a sent row is a defect"
    source: "FD-071, FD-041, C2 mail.send, C15, T-101 step 6, FD-076 (5 retries, SMTP 30 s)"
  - id: BR6.4
    statement: "The relay routes no account event to mail.send: account.registered routes to no job and account.securityEvent to notification.deliver only."
    category: constraint
    applies_to: "apps/worker/src/handlers/outbox-relay.ts RELAY"
    trigger: "Code Generation edits the relay map"
    logic: "account.registered -> []; account.securityEvent -> [notification.deliver]; no other entry changes"
    violation: "Any account.* -> mail.send entry fails the FD-071/C15 row"
    source: "C15, FD-071, T-101 amendment 'C15 relay routes'"
  - id: BR6.5
    statement: "The worker gets APP_ENCRYPTION_KEY, refuses to start without a valid 32-byte key, and still never imports Better Auth."
    category: constraint
    applies_to: "apps/worker/src/env.ts, container.ts"
    trigger: "Worker start"
    logic: "IF APP_ENCRYPTION_KEY is missing or does not decode to 32 bytes THEN exit 1 with a message that names the variable but not its value; the worker container wires Crypto, MailTransport and the mail.send handler only"
    violation: "A worker that starts without the key fails every delivery; a Better Auth import breaks AD-6"
    source: "FD-071, AD-6, 01-conventions §2"
  - id: BR6.6
    statement: "No job payload and no outbox payload ever contains an email address."
    category: constraint
    applies_to: "pgboss.job.data, outbox_events.payload"
    trigger: "Any T-101 flow"
    logic: "mail.send carries {deliveryId}; account.registered {accountId}; account.securityEvent {accountId, kind}; a test scans every job and event the flows write for the address and for '@'"
    violation: "A plain address in a payload reaches the worker without touching auth_users (ISS-243, S1)"
    source: "ISS-243, FD-041, C15 privacy rule, AC10.1.4"
  - id: BR6.7
    statement: "Every email T-101 sends is plain text, content-free and has an English and a Bengali subject and body."
    category: validation
    applies_to: "packages/i18n messages email.*"
    trigger: "Code Generation adds or uses an email key"
    logic: "Each message key used has .subject and .body in en.json and bn.json; bodies contain exactly one {link} and no platform content"
    violation: "A missing locale fails pnpm i18n:check; content fails AC10.1.4"
    source: "AC10.1.4, project.md Mandated (Bengali and English), auth-screens-spec.md §5"
  - id: BR6.8
    statement: "Once a delivery is sent or finally failed, its params are cleared, so no live reset or verification link stays at rest."
    category: policy
    applies_to: "mail.send"
    trigger: "A delivery reaches sent or failed"
    logic: "IF status becomes sent or failed THEN params is set to {} in the same update"
    violation: "A reset link kept in email_deliveries.params is readable by anyone who can read the table, including rk_worker, until it expires"
    source: "Design decision (functional-spec.md § 13), FD-071, AC10.1.4"

  # Group 7 — Library boundary, configuration, composition
  - id: BR7.1
    statement: "Only an allowlist of library HTTP paths is reachable; every flow the commands own goes through server actions."
    category: authorization
    applies_to: "apps/web/src/app/api/auth/[...all]/route.ts, Better Auth disabledPaths"
    trigger: "Any request to /api/auth/*"
    logic: "The route wraps the library handler and answers 404 for any path not on the allowlist (get-session and ok only); disabledPaths also lists sign-up, sign-in, request-password-reset, reset-password, verify-email, send-verification-email, change-password, change-email, update-user, delete-user, revoke-session(s), list-sessions as a second layer"
    violation: "A reachable sign-in or sign-up endpoint bypasses the delay, the limits, the timing floor and the domain rows (S1)"
    source: "Question 1, AD-4, T-101 threats 5 and 7, C14"
  - id: BR7.2
    statement: "The web tier refuses to start without a valid BETTER_AUTH_SECRET, APP_URL, APP_ENCRYPTION_KEY and TERMS_VERSION."
    category: validation
    applies_to: "apps/web server start (auth.ts, container.ts)"
    trigger: "Start-up"
    logic: "IF BETTER_AUTH_SECRET is missing or shorter than 32 characters, APP_URL is not an absolute URL, APP_ENCRYPTION_KEY does not decode to 32 bytes or TERMS_VERSION is empty THEN fail with a message naming the variable, never its value; .env.example lists every variable with an empty value"
    violation: "A default or hard-coded secret is a defect against the construction Security rule"
    source: "T-101 step 4, construction.md Security, infra/compose/.env.example"
  - id: BR7.3
    statement: "The library maps to the four auth_* tables by aliasing the schema object under the library's model names, with no fields block; three indexes are added and nothing is renamed."
    category: constraint
    applies_to: "apps/web/src/server/auth.ts, packages/database/src/schema/auth.ts, a new forward-only migration"
    trigger: "Code Generation wires the adapter"
    logic: "The schema passed to the adapter maps user, session, account and verification to authUsers, authSessions, authAccounts and authVerifications; the misleading comment block in schema/auth.ts is corrected; indexes on auth_sessions.user_id, auth_accounts.user_id and auth_verifications.identifier come in the next free migration; a schema test diffs the library's expected columns"
    violation: "Following the old comment block makes the library throw at start (ISS-112)"
    source: "ISS-112, ISS-113, T-101 step 2"
  - id: BR7.4
    statement: "ConfigValues gains exactly the signIn block with the FD-063 defaults and the C5 ranges and cross-field checks, and no other key."
    category: validation
    applies_to: "packages/contracts/src/config-values.ts, DEFAULT_CONFIG_VALUES, apps/web/src/server/container.ts"
    trigger: "Code Generation"
    logic: "signIn {delayAfterFailures 1-20 default 3, windowMinutes 1-1440 default 15, firstDelaySeconds 1-60 default 1, maxDelaySeconds 1-300 default 30 and >= firstDelaySeconds, severeFailures 2-100 default 10 and > delayAfterFailures}, strict; the web container wires a defaults-only ConfigProvider returning DEFAULT_CONFIG_VALUES"
    violation: "Fails the FD-063 'C5 settings block and ranges' row"
    source: "C1 config_values_changes, C5, review R-14, FD-063"
  - id: BR7.5
    statement: "The library's own rate limiter stays on as defence in depth; the RateLimiter port is the limit that is specified and tested."
    category: policy
    applies_to: "Better Auth rateLimit options"
    trigger: "Library configuration"
    logic: "rateLimit enabled in every APP_MODE, memory storage, custom rules no stricter than the port's limits so the port's answer always decides"
    violation: "A library limit that answers first would return a library error shape instead of AppError"
    source: "T-101 step 4"
  - id: BR7.6
    statement: "The PasswordHasher port backs the library's hash and verify, and the Argon2 benchmark is run and its median recorded."
    category: constraint
    applies_to: "packages/adapters/src/password-argon2, bench.ts"
    trigger: "Code Generation"
    logic: "emailAndPassword.password.hash and .verify call the port; pnpm --filter adapters bench:argon2 prints the median of 5 hashes; a median above 500 ms keeps the parameters and is noted"
    violation: "Fails the 'Argon2 bench' row"
    source: "T-101 step 3, FR3"
  - id: BR7.7
    statement: "No Better Auth plugin is enabled."
    category: constraint
    applies_to: "Better Auth plugins option"
    trigger: "Library configuration"
    logic: "plugins is empty: no MFA, passkeys, OAuth, organisations or admin plugin"
    violation: "Out of scope (T-101 Not in scope)"
    source: "T-101 Not in scope"
  - id: BR7.8
    statement: "Before installing, Code Generation re-checks Better Auth, nodemailer and @node-rs/argon2 for the current stable release and known advisories and appends a dated entry."
    category: policy
    applies_to: "docs/status/dependency-check-log.md"
    trigger: "Start of Code Generation"
    logic: "The Better Auth entry (2026-09-10) and the @node-rs/argon2 entry (2026-09-13) are older than 3 days and nodemailer has none, so each is checked: latest stable 1.7.x patch, advisories since 1.7.3, peer compatibility with Next 16.3.4; the capabilities this design relies on are confirmed on the pinned version (functional-spec.md § 16)"
    violation: "Installing without the entry breaks the project's Mandated dependency rule"
    source: "AGENTS.md, project.md Mandated, T-101 read-first item 7"
  - id: BR7.9
    statement: "Library callbacks act only inside a command context: the email callbacks hand their token to the running command, and outside a command they send nothing."
    category: authorization
    applies_to: "sendVerificationEmail, sendResetPassword callbacks"
    trigger: "The library calls an email callback"
    logic: "IF a CommandContext is active THEN pass {token} to it and return; ELSE log auth.callback_outside_command (no address) and do nothing"
    violation: "A callback that queues mail on its own could send to an address no command authorised"
    source: "FD-071, Question 1, threat 7"
  - id: BR7.10
    statement: "Public reading still needs no account: T-101 changes no page route, and every visitor without a valid session is an anonymous Actor."
    category: policy
    applies_to: "apps/web routes"
    trigger: "Code Generation"
    logic: "Only /api/auth/[...all], server actions, auth.ts, container.ts and the health route's db probe change in apps/web; getActor returns anonymous for any visitor without a valid session"
    violation: "A public page that starts requiring a session fails AC3.1.1"
    source: "FR1, AC3.1.1, T-101 hard-rule checklist"

  # Group 8 — Privacy, logging, i18n, boundaries
  - id: BR8.1
    statement: "Logs carry only allowlisted fields: never an email, password, token, link, params, user agent or client address."
    category: constraint
    applies_to: "Logger port in web and worker"
    trigger: "Any log line from T-101 code"
    logic: "Fields: event, correlationId, opaque ids, enums, counts, durations, error codes; an integration test captures logs over the full register-verify-sign-in-reset cycle and finds none of the forbidden values"
    violation: "Secrets in logs fail threat 10 (S1)"
    source: "01-conventions §11, T-101 threat 10, ISS-111 item 1"
  - id: BR8.2
    statement: "Audit details hold ids, enums and counts only."
    category: constraint
    applies_to: "AuditWriter calls in the account module"
    trigger: "Any audit row"
    logic: "No email, token, link, password, IP or user agent in details; actor is account:<id> or anonymous"
    violation: "Fails the hard-rule checklist 'no email/token in details' and the FD-059 row"
    source: "01-conventions §5, FD-059, AC3.2.2"
  - id: BR8.3
    statement: "No result of a T-101 command or query carries an email, a session token, an IP or the internal auth user id."
    category: constraint
    applies_to: "Actor, SessionListItem, every Result"
    trigger: "Any command or query returns"
    logic: "Only the fields in entities.md; register returns {accountId} only"
    violation: "Fails 03 §2 view-model rule"
    source: "03 §2, contract-summary privacy rules"
  - id: BR8.4
    statement: "Every new user-facing string has an English and a Bengali entry in the same commit, and new Bengali copy is flagged for the owner's review."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation adds a key"
    logic: "New keys: email.security.severeSignInActivity.subject and .body, errors.auth.passwordEqualsEmail (Question 7); each listed in the hand-off as Bengali awaiting review"
    violation: "A key without Bengali fails the build (project.md Mandated)"
    source: "project.md Mandated, ADR 0011, FD-024, FD-042 precedent"
  - id: BR8.5
    statement: "Every address and person in code, fixtures and tests is synthetic."
    category: policy
    applies_to: "tests, fixtures"
    trigger: "Code Generation"
    logic: "Addresses use the example.test domain (shirin.demo@example.test, nobody.demo@example.test); builders, not hand-written fixture objects"
    violation: "Real personal data breaks a hard rule (S1)"
    source: "project.md Forbidden (real personal data), team.md Testing Posture"
  - id: BR8.6
    statement: "The worker imports no Better Auth, no identity-reveal and no deletion command; the forbidden-import test covers the new handler."
    category: constraint
    applies_to: "apps/worker/src/**"
    trigger: "Code Generation"
    logic: "container.test.ts's grep stays green with mail-send.ts added; the handler imports adapters, database, contracts and i18n messages only"
    violation: "Breaks AD-6"
    source: "AD-6, team.md Code Style boundaries"

  # Group 9 — Verification
  - id: BR9.1
    statement: "Tests cover every level the Unit touches: domain transitions and the delay policy, each command's happy path, refusals and audit row, the repository and migration, the adapters, and the worker handler."
    category: validation
    applies_to: "packages/domain, packages/application, packages/adapters, packages/database, apps/web, apps/worker tests"
    trigger: "Code Generation"
    logic: "The test list in functional-spec.md § 11; each test can fail; names read as sentences"
    violation: "A missing level fails team.md Testing Posture"
    source: "team.md Testing Posture, 01-conventions §10, T-101 'Tests to write'"
  - id: BR9.2
    statement: "The cumulative smoke suite gains at least one assertion for this Unit and loses none."
    category: validation
    applies_to: "pnpm smoke"
    trigger: "Code Generation"
    logic: "At least: register then verify then getActor returns an account Actor; and the route allowlist answers 404 for /api/auth/sign-up/email"
    violation: "Breaks the cumulative smoke rule"
    source: "team.md Testing Posture"
  - id: BR9.3
    statement: "pnpm check, pnpm smoke and pnpm test:int exit 0 with the compose stack running."
    category: validation
    applies_to: "repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "All three exit 0; every T-101 acceptance row is executed and recorded as expected against observed"
    violation: "A red check blocks the merge"
    source: "team.md Way of Working, project.md Mandated"
  - id: BR9.4
    statement: "As a high-risk Unit, a separate agent writes and runs 3 to 5 adversarial regression tests from the angles in functional-spec.md § 12, and the owner signs off in writing."
    category: validation
    applies_to: "U8 Build and Test"
    trigger: "After Code Generation"
    logic: "The angles cover enumeration, limit bypass, token and session abuse, library policy bypass and private-data leaks"
    violation: "Missing adversarial tests or sign-off blocks the phase gate"
    source: "team.md Way of Working step 5, project.md Mandated"
  - id: BR9.5
    statement: "The packages that gain source code meet the 80 % line-coverage floor from T-010."
    category: validation
    applies_to: "packages/application, packages/adapters, packages/domain"
    trigger: "Build and Test"
    logic: "Measured with @vitest/coverage-v8 once T-010's thresholds exist; never lowered to pass"
    violation: "Below the floor blocks the merge (D10)"
    source: "team.md Testing Posture, org.md classic scope floor"

  # Group 10 — Records and scope
  - id: BR10.1
    statement: "Every file the Unit changes outside T-101's literal owned paths is listed, with its reason, in the hand-off and in one ISS row."
    category: policy
    applies_to: "Owned paths"
    trigger: "Code Generation"
    logic: "The additions in functional-spec.md § 15 (application infrastructure, Crypto port and adapter, domain account state, notification queueEmail, contracts errors, worker env/container/registry/relay, the health route's db probe, the auth index migration, test-support fixes for ISS-223, NotImplemented for ISS-111)"
    violation: "An unrecorded file outside the owned paths fails the reviewer's diff review (G4)"
    source: "team.md Way of Working, ISS-248 precedent"
  - id: BR10.2
    statement: "The reference documents are corrected where this design changes them, in the same Bolt."
    category: policy
    applies_to: "03-routes-and-contracts.md, 02-data-model.md, 01-conventions.md"
    trigger: "Code Generation"
    logic: "03 §2 gains auth.password_equals_email first (before contracts); 03 §3 Mailer becomes MailTransport plus queueEmail; 03 §4 sign-in limits read as C5; 03 §5 account routes read as C15; 02 §1 sessions read as absolute 30 days; 01 §11 lists APP_ENCRYPTION_KEY for the worker"
    violation: "Leaving the old text recreates the source drift ISS-140 came from"
    source: "contract-summary.md ('this summary wins; the Unit that builds the operation corrects 03'), errors.ts header"
  - id: BR10.3
    statement: "The open ISS rows in this area are closed or updated, and every new finding gets a row linked to U8 T-101."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "Closed or updated: ISS-032, ISS-033, ISS-078, ISS-111 (1), ISS-112, ISS-113, ISS-223, ISS-243, ISS-253 (the mail.send part), ISS-255; informational: ISS-155, ISS-180; new rows as listed in functional-spec.md § 9 and § 10"
    violation: "An unrecorded defect breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), team.md Way of Working"
  - id: BR10.4
    statement: "A change to a data boundary, a worker grant or a hard rule that no FD entry authorises is raised to the owner, not decided here."
    category: policy
    applies_to: "R1 (worker key scope), R2 (FR90 feedback fields)"
    trigger: "The design finds such a change"
    logic: "Record it as raised, propose an ISS row, keep the design on the FD as written"
    violation: "Deciding it would break the project rule on data boundaries"
    source: "project.md Mandated (decision log binding), contract ownership rules"

  # Group 11 — Settings and feedback
  - id: BR11.1
    statement: "An account, confirmed or not, can update its preferences; the essential security category stays sent whatever email_security says."
    category: authorization
    applies_to: "account.updatePreferences"
    trigger: "An authenticated account saves preferences"
    logic: "requires authenticated (not verifiedEmail); partial update of the given fields; audit preferences_updated {fields: names only}"
    violation: "A pending account refused here fails FR4"
    source: "FR4, 03 §4, T-101 step 7"
  - id: BR11.2
    statement: "Feedback is a body of 1 to 2000 characters in the actor's locale, limited to 5 per day per account."
    category: policy
    applies_to: "account.submitFeedback"
    trigger: "An authenticated account submits feedback"
    logic: "IF the action:account:<id> feedback key has 5 hits in 24 h THEN rate_limited; ELSE insert Feedback {body, locale} and audit feedback_submitted (no body); AC10.3.6's extra fields are not built here (Question 11)"
    violation: "A sixth submission in a day accepted fails the T-101 test row"
    source: "03 §4, T-101 step 7 and tests, Question 11"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Full input validation before any lookup; all problems as field errors | validation |
| BR1.2 | Sign-up 5 per hour per network | policy |
| BR1.3 | Username check independent of the email | validation |
| BR1.4 | Existing email: same success, owner emailed, nothing created | policy |
| BR1.5 | New email: library credential, then one app transaction for every domain row | constraint |
| BR1.6 | Both branches cost the same and wait for the same floor | constraint |
| BR1.7 | Library creates users only inside `account.register` | authorization |
| BR1.8 | NFC + Argon2id (64 MiB, t=3, p=1) through the port | constraint |
| BR1.9 | No automatic deletion | policy |
| BR1.10 | Two default personas with private links | constraint |
| BR2.1 | 24 h link to the app's own verify page | constraint |
| BR2.2 | Verify activates only a pending account | constraint |
| BR2.3 | Expired vs invalid token codes, same shape | validation |
| BR2.4 | Neutral resend, 3 per hour per email | policy |
| BR2.5 | Unconfirmed: settings yes, contributions no | authorization |
| BR2.6 | Library sends no email itself | constraint |
| BR3.1 | One counter per normalised email | calculation |
| BR3.2 | Network, email, delay checks before any read or password check | policy |
| BR3.3 | Delay formula 1, 2, 4 … capped | calculation |
| BR3.4 | Settings through `ConfigProvider` | constraint |
| BR3.5 | What counts as a failure; success clears the email key | calculation |
| BR3.6 | Suspended/banned: message only after the password, no session | authorization |
| BR3.7 | Deleted = wrong password | authorization |
| BR3.8 | Pending accounts sign in | authorization |
| BR3.9 | Severe notice: one per account per window, real accounts only, after the response | policy |
| BR3.10 | No CAPTCHA | policy |
| BR3.11 | Identical refusal shape and timing | constraint |
| BR3.12 | In-memory, hashed keys only | constraint |
| BR4.1 | Absolute 30-day session | constraint |
| BR4.2 | Cookie attributes, trusted origin | constraint |
| BR4.3 | `getActor` mapping per status | authorization |
| BR4.4 | No session read in a cached scope | constraint |
| BR4.5 | Sign-out | constraint |
| BR4.6 | Sign out everywhere | constraint |
| BR4.7 | Session list without history, IP or token | constraint |
| BR4.8 | Status re-read every request | authorization |
| BR4.9 | No IP stored | constraint |
| BR5.1 | Neutral reset request, 3 per hour, 1 h link | policy |
| BR5.2 | Completed reset: revoke, audit, event, email | constraint |
| BR5.3 | Change password with current password, 5 failures per 15 min | authorization |
| BR5.4 | Reset confirms a pending email | policy |
| BR6.1 | `queueEmail` on the caller's transaction, job keyed per delivery | constraint |
| BR6.2 | Params allowlist: one link | validation |
| BR6.3 | `mail.send` handler behaviour | constraint |
| BR6.4 | Relay routes no account event to `mail.send` | constraint |
| BR6.5 | Worker key, start check, no Better Auth | constraint |
| BR6.6 | No address in any payload | constraint |
| BR6.7 | Plain-text bilingual content-free emails | validation |
| BR6.8 | Params cleared after a final status | policy |
| BR7.1 | Library HTTP allowlist | authorization |
| BR7.2 | Start-up secret checks | validation |
| BR7.3 | Model mapping by alias, three indexes | constraint |
| BR7.4 | `signIn` config block only | validation |
| BR7.5 | Library limiter as defence in depth | policy |
| BR7.6 | Hasher port in the library, bench recorded | constraint |
| BR7.7 | No plugins | constraint |
| BR7.8 | Dependency re-check before install | policy |
| BR7.9 | Library callbacks act only inside a command | authorization |
| BR7.10 | No page route changed; public reading open | policy |
| BR8.1 | Log allowlist | constraint |
| BR8.2 | Audit allowlist | constraint |
| BR8.3 | No email, token, IP in results | constraint |
| BR8.4 | `en` + `bn` together, Bengali flagged | policy |
| BR8.5 | Synthetic data only | policy |
| BR8.6 | Worker import boundary | constraint |
| BR9.1 | Tests per level | validation |
| BR9.2 | Smoke grows | validation |
| BR9.3 | All checks green | validation |
| BR9.4 | Adversarial tests and owner sign-off | validation |
| BR9.5 | Coverage floor | validation |
| BR10.1 | Owned-path additions recorded | policy |
| BR10.2 | Reference documents corrected | policy |
| BR10.3 | ISS rows closed and added | policy |
| BR10.4 | Data-boundary changes raised, not decided | policy |
| BR11.1 | Preferences for every account | authorization |
| BR11.2 | Feedback body, 5 per day | policy |
