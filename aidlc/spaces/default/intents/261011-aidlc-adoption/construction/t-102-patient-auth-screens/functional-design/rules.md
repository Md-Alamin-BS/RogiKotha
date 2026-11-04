# Business rules — U9 `t-102-patient-auth-screens`

This file is the source of truth for the screen rules of U9. U9 is a `ui` Unit and adds no entities: it reads T-101's `Actor`, `OwnAccountVM` and `SessionVM` (C5, C19) and stores nothing of its own apart from the `rk.pending` flash cookie. The account rules themselves (password policy, limits, token lifetimes, the session cap) belong to U8 T-101 and are only used here. The workflows that apply these rules are in `functional-spec.md`, and the answers they follow are in `functional-design-questions.md`.

```yaml
rules:
  - id: BR1.1
    statement: "Every auth form works without JavaScript: it posts to a server action, and the page renders again with the result."
    category: constraint
    applies_to: "register, sign-in, resend, confirm, reset request, set new password, change password, sign out everywhere, gate resend"
    trigger: "A form is submitted"
    logic: "IF JavaScript is off THEN the native form POST reaches the same server action and the same result renders; JavaScript only adds pending state, focus and announcements"
    violation: "A form that does nothing without JavaScript is a defect (T-102 row No-JS)"
    source: "FR95, NFR6, auth-screens-spec section 2"
  - id: BR1.2
    statement: "A refused submission shows an error summary (role alert, focused) and an inline error on each field, all as message keys. The returned state never carries a value the person typed. With JavaScript, non-secret fields keep the browser's own values; without JavaScript every field comes back empty. Password fields are always empty."
    category: validation
    applies_to: "every auth form"
    trigger: "A server action returns field or form errors"
    logic: "IF the result has errors THEN render the summary in field order with links to the fields and set aria-invalid and aria-describedby on each field; the state holds keys, params and flags only (AuthFormState, frontend-components.md section 3); with JavaScript the form keeps the client's own field values through the transition (as on main); password inputs are cleared after every submission"
    violation: "Test: a refused submission's returned state contains no submitted value (no email, username, display name or password); with JavaScript the email input still shows what was typed; every password input is empty. A colour-only or unlabelled error is also a defect"
    source: "FR3, FR95, AC3.1.3, NFR3"
  - id: BR1.3
    statement: "Every visible string, accessible name and title comes from an i18n key that exists in both en.json and bn.json, and numbers and dates follow the active locale."
    category: constraint
    applies_to: "every page and component of the Unit"
    trigger: "Render"
    logic: "IF text is shown THEN it is t(key) with the key in both dictionaries; numbers go through formatNumber and dates through formatDate"
    violation: "A key missing its Bengali entry fails i18n parity in pnpm check"
    source: "project.md Mandated (both languages), FD-024, ADR 0011"
  - id: BR1.4
    statement: "Every auth page and /me/security is noindex. Pages that carry a token in the URL also send referrer no-referrer."
    category: policy
    applies_to: "/register, /sign-in, /verify-email, /reset-password, /me/security"
    trigger: "generateMetadata"
    logic: "IF the page is in this Unit THEN robots is noindex; IF the URL may carry ?token= (verify-email, reset-password) THEN referrer is no-referrer"
    violation: "An indexable auth page or a token leaking through Referer is a defect"
    source: "01-conventions.md section 8, T-102 row noindex"
  - id: BR1.5
    statement: "A next or returnTo target must be a same-site path with a locale prefix that is not an auth page, /api or /admin, checked by safeAuthNext. When next is missing or refused after sign-in, the one default is /{locale}/me; a refused returnTo on the gate or the done panel is dropped."
    category: validation
    applies_to: "next on register, sign-in and the pending screen; returnTo on ContributionGate"
    trigger: "A next or returnTo value is read"
    logic: "safeAuthNext(raw): (1) safeNextPath must accept raw; (2) percent-decode the path once, and refuse it if decoding fails or the decoded path still contains a percent sign, a backslash or a double slash; (3) lowercase the decoded path for the comparison only; (4) its first segment must be a locale in LOCALES (en, bn), otherwise refuse, so /sign-in and /admin are refused; (5) refuse when the second segment is register, sign-in, verify-email, reset-password, api or admin; (6) return the original, undecoded path. Tests: /sign-in, /admin, /en/Admin, /en/%61dmin, /bn/SIGN-IN, //x and https://evil.example are refused; /en/experiences/abc is kept"
    violation: "An open redirect, an auth-page loop or a jump into /admin is a defect"
    source: "T-102 row next safety, FD-104"
  - id: BR1.6
    statement: "A signed-in visitor who opens /register or /sign-in is sent on to next, or to /me."
    category: policy
    applies_to: "/register, /sign-in"
    trigger: "Page render with an account Actor"
    logic: "IF actor.kind is account THEN redirect to safeAuthNext(next) when it passes, otherwise to /{locale}/me (the BR1.5 default)"
    violation: "A second registration form shown to a signed-in person is a defect"
    source: "auth-screens-spec section 1"
  - id: BR2.1
    statement: "A successful register call gets the same answer for a new and for an already registered address: the rk.pending cookie, then a redirect to /{chosenLocale}/verify-email, with next kept. The action never signs in."
    category: policy
    applies_to: "register action"
    trigger: "account.register returns ok"
    logic: "IF register is ok THEN set rk.pending (with next when safeAuthNext passes it) and redirect to the pending screen in the locale chosen on the form; never call signIn"
    violation: "Any difference in response, cookie or redirect between a new and an existing address is an S1 enumeration defect"
    source: "FD-103, FR2, AC3.1.2"
  - id: BR2.2
    statement: "rk.pending holds the normalised typed address and, when present, the sanitised next. It is HttpOnly, SameSite=Lax, Secure on https, Path=/ and lives 30 minutes. It is cleared by a successful sign-in or confirmation and by sign-out and sign-out-everywhere, and it is validated on every read."
    category: constraint
    applies_to: "rk.pending cookie"
    trigger: "Set by register; read by /verify-email and confirmEmail; cleared by signIn, confirmEmail, signOut and signOutEverywhereForm"
    logic: "IF register is ok THEN set it as JSON {email, next?}; ON read IF the value does not parse, or email fails the account email schema, THEN treat the whole cookie as absent, and IF next fails safeAuthNext THEN ignore next; IF signIn or confirmEmail is ok, or signOut or signOutEverywhereForm runs, THEN delete it; it is never logged and never put in a URL"
    violation: "An address in a URL, a log line or a script-readable cookie is a defect"
    source: "Question 3, NFR3"
  - id: BR2.3
    statement: "The pending screen shows the typed address only to the signed-out browser that holds rk.pending. A signed-in, unconfirmed holder sees no address, and a browser without the cookie sees the no-address text."
    category: policy
    applies_to: "/verify-email pending panel"
    trigger: "Render without a token"
    logic: "IF signed out AND rk.pending is set THEN show auth.verify.body with that address and pre-fill Resend; IF signed out without it THEN show auth.verify.bodyNoEmail and an empty email field; IF signed in and unconfirmed THEN show auth.verify.bodyNoEmail and a Resend button that needs no address"
    violation: "Showing any address other than the person's own typed one, or a masked address outside /me/security, is a defect"
    source: "FD-096, Questions 3 and 14"
  - id: BR2.4
    statement: "A signed-out resend gets the same answer, auth.verify.resent, whether the address is unknown, unconfirmed or already confirmed. Only a rate limit changes the answer."
    category: policy
    applies_to: "resendLink action"
    trigger: "Resend submitted with an email"
    logic: "IF resendVerification returns ok or any refusal other than auth.rate_limited or validation THEN show auth.verify.resent (an internal error is logged with code and correlationId only, never shown); IF validation THEN field error on email; IF rate limited THEN apply BR4.2"
    violation: "A resend answer that reveals account existence is an S1 defect"
    source: "AC3.1.4, FR4, FD-013"
  - id: BR2.5
    statement: "A signed-in, unconfirmed holder resends through resendOwnVerification, without typing or seeing an address."
    category: policy
    applies_to: "pending panel when signed in, ContributionGate, /me/security"
    trigger: "Resend submitted by an account Actor"
    logic: "IF the actor is an account THEN call resendOwnVerification with no input and show auth.verify.resent or the rate-limit copy"
    violation: "Asking a signed-in holder for an address is a defect"
    source: "FD-096, C5"
  - id: BR2.6
    statement: "Register field errors name the field: age, terms, taken username, password length and the other schema refusals, each in the active language. No account is created."
    category: validation
    applies_to: "RegisterForm"
    trigger: "parseRegistration or account.register refuses"
    logic: "IF a field fails THEN return its key from the form parser or from registerRefusal (on main), in REGISTER_FIELD_ORDER"
    violation: "An unnamed or English-only error on a Bengali page is a defect"
    source: "AC3.1.3, FR2, FR3"
  - id: BR3.1
    statement: "Opening a confirmation link never confirms anything. The page shows one 'Confirm my email' button, which posts the token to confirmEmail."
    category: constraint
    applies_to: "/verify-email?token="
    trigger: "Render with a token"
    logic: "IF the token is present THEN render the confirm panel with the token in a hidden field; only the POST calls verifyEmail"
    violation: "A GET that confirms an address or sets a cookie is a defect"
    source: "Question 2, verify-email.ts header"
  - id: BR3.2
    statement: "After a successful confirmation the session cookie is applied, rk.pending is cleared and the browser goes to /verify-email?confirmed=1, with next carried from rk.pending. The done panel shows only when the Actor's email is verified, and adds a Continue link to next when next passes safeAuthNext."
    category: policy
    applies_to: "confirmEmail action, /verify-email done panel"
    trigger: "verifyEmail returns ok, or a render with confirmed=1"
    logic: "IF ok THEN read next from rk.pending, applySessionEffect, clear rk.pending and redirect to ?confirmed=1, adding next= when it passes safeAuthNext; ON render IF confirmed=1 AND actor.emailVerified is true THEN show auth.verify.done, plus a Continue link (auth.verify.continue) to next when safeAuthNext(next) passes again; otherwise show the panel for the actual state"
    violation: "A done panel shown to anyone who typed the parameter is a defect"
    source: "Question 17, AC3.1.4"
  - id: BR3.3
    statement: "An expired, used or invalid token shows auth.verify.expired and a Resend form. The page does not say which of the three it was."
    category: policy
    applies_to: "confirmEmail action"
    trigger: "verifyEmail returns auth.token_expired or auth.token_invalid"
    logic: "IF either code THEN render the expired panel with Resend (BR2.4 or BR2.5)"
    violation: "Telling expired from never-valid is a defect"
    source: "AC3.1.4, FR4"
  - id: BR4.1
    statement: "Every wrong email and password combination, and every malformed sign-in, gets the same message, errors.auth.invalidCredentials."
    category: policy
    applies_to: "signIn action"
    trigger: "account.signIn refuses with invalid_credentials or validation"
    logic: "IF either code THEN form error errors.auth.invalidCredentials and no field error"
    violation: "A message that says which half was wrong is an S1 enumeration defect"
    source: "AC3.1.5, FR8"
  - id: BR4.2
    statement: "A rate-limit refusal names the wait in the right unit, taken from retryAfterSec: seconds under 60, otherwise minutes rounded up. There is no countdown and the button stays enabled."
    category: calculation
    applies_to: "signIn, register, resend, reset request, change password"
    trigger: "A command returns auth.rate_limited"
    logic: "IF retryAfterSec < 60 THEN errors.auth.rateLimitedSeconds with {count, seconds} ELSE IF retryAfterSec is set THEN errors.auth.rateLimited with minutes = ceil(retryAfterSec / 60) ELSE formErrors.auth.rateLimited"
    violation: "Copy in the wrong unit, a disabled button or a timer is a defect (ISS-436)"
    source: "AC3.1.5, FD-063, Question 5"
  - id: BR4.3
    statement: "A suspended or banned account is told that it cannot sign in right now, with no appeal route and no link."
    category: policy
    applies_to: "signIn action; /sign-in when Actor.refusal is set"
    trigger: "auth.account_suspended, or a render with actor.refusal"
    logic: "IF either THEN show the reworded errors.auth.accountSuspended once above the form; the masthead stays signed out"
    violation: "Naming an appeal route or a workspace link is a defect (FD-088)"
    source: "Questions 6 and 15, FD-088"
  - id: BR4.4
    statement: "A successful sign-in applies the session, clears rk.pending and goes to next, or to /{locale}/me in the account's preferred locale (the BR1.5 default)."
    category: policy
    applies_to: "signIn action"
    trigger: "account.signIn returns ok"
    logic: "IF ok THEN applySessionEffect, delete rk.pending, redirect to safeAuthNext(next) when it passes ELSE to /{accountLocale}/me (this replaces main's redirect to the home page)"
    violation: "A redirect to an unsanitised target is a defect"
    source: "FR1, FR2.3"
  - id: BR5.1
    statement: "A reset request always shows auth.reset.sent, whether or not the address has an account. Only a rate limit or an invalid address changes the answer."
    category: policy
    applies_to: "requestReset action"
    trigger: "Reset request submitted"
    logic: "IF requestPasswordReset returns ok or internal THEN show auth.reset.sent, because a token is issued only for an existing account, so an internal error shown on screen would reveal one; the action logs internal through the logger port (code and correlationId only); IF validation THEN field error on email; IF rate limited THEN BR4.2"
    violation: "Any answer that tells an account apart from no account is an S1 defect"
    source: "AC3.2.1, FR9, FD-059"
  - id: BR5.2
    statement: "Setting a new password needs the two fields to match, checked before the command runs, and the schema's password rule."
    category: validation
    applies_to: "SetPasswordForm"
    trigger: "Set new password submitted"
    logic: "IF newPassword is not equal to confirmPassword THEN field error auth.reset.mismatch and no command call ELSE call resetPassword with {token, newPassword}"
    violation: "Calling the command with mismatched fields is a defect"
    source: "AC3.2.2, FR3"
  - id: BR5.3
    statement: "A successful reset clears the session and goes to /sign-in?reset=done. A used or expired token is refused with errors.auth.tokenExpired and a link to ask for a new reset, and the password stays unchanged."
    category: policy
    applies_to: "setNewPassword action, /sign-in notice"
    trigger: "resetPassword returns ok or a token error"
    logic: "IF ok THEN apply the clear effect and redirect; IF auth.token_expired or auth.token_invalid THEN show errors.auth.tokenExpired with a link to /reset-password"
    violation: "A reused link that changes the password is an S1 defect (U8 enforces it; the screen must not hide the refusal)"
    source: "AC3.2.2, FR9"
  - id: BR6.1
    statement: "/me/security is for signed-in accounts only. A signed-out visitor goes to /sign-in?next=/{locale}/me/security."
    category: authorization
    applies_to: "/me/security"
    trigger: "Render"
    logic: "IF the actor is not an account THEN requireAccount redirects with returnTo"
    violation: "Security data rendered for an anonymous Actor is an S1 defect (T-106 row)"
    source: "AC3.2.3, T-106 negative matrix"
  - id: BR6.2
    statement: "The security page shows the holder's address only masked (OwnAccountVM.emailMasked) and shows whether it is confirmed. The full address never reaches the page."
    category: policy
    applies_to: "/me/security email row"
    trigger: "Render"
    logic: "IF getOwnAccount is ok THEN show emailMasked and auth.security.verified or unverified; IF unverified THEN offer Resend (BR2.5)"
    violation: "A full address in the page or its payload is an S1 defect"
    source: "FD-096, Question 14"
  - id: BR6.3
    statement: "The sessions list shows each active session's device (from browser and os through a key), first seen, last seen and 'This device'. It shows no IP and no login history."
    category: policy
    applies_to: "SessionList"
    trigger: "Render with listSessions ok"
    logic: "IF both parts are present THEN auth.security.deviceLabel {browser, os} ELSE auth.security.deviceUnknown; dates in the active locale; mark current with auth.security.thisDevice"
    violation: "An English-only label on a Bengali page, an IP or a login history is a defect (FD-024, FD-057)"
    source: "AC3.2.3, FR6, FD-057"
  - id: BR6.4
    statement: "Sign out everywhere needs an explicit confirmation step and no password. It ends every session, including the current one, and goes to /sign-in?signedOut=all."
    category: policy
    applies_to: "SignOutEverywhere"
    trigger: "Confirmation submitted with confirm=yes"
    logic: "IF confirm is yes THEN call signOutEverywhere, apply the clear effect and redirect ELSE do nothing"
    violation: "A single-tap sign-out, or a password field that nothing checks, is a defect (ISS-440)"
    source: "AC3.2.3, FR6, Question 7"
  - id: BR6.5
    statement: "Change password asks for the current and the new password. A wrong current password gets errors.auth.invalidCredentials. Success applies the rotated session and shows auth.security.passwordChanged."
    category: validation
    applies_to: "ChangePasswordForm"
    trigger: "Change password submitted"
    logic: "IF changePassword is ok THEN applySessionEffect and show the notice ELSE map the error code to its key; both fields come back empty"
    violation: "Keeping a password in the returned state is a defect"
    source: "FR3, FR6"
  - id: BR7.1
    statement: "The account entry shows a sign-in link when signed out, and when signed in a button with the display name's initials (grapheme-safe). Its accessible name says 'email not confirmed' while the status is pending_verification."
    category: policy
    applies_to: "Masthead account entry, AccountControl"
    trigger: "Render with the layout's account"
    logic: "IF account is null THEN Link to /sign-in ELSE button with accountInitials(displayName) by grapheme; IF status is pending_verification THEN data-verified false and auth.accountMenuUnconfirmed as name"
    violation: "Half a Bengali conjunct, or no signal of an unconfirmed address, is a defect"
    source: "AC3.1.4, FR95, ISS-022"
  - id: BR7.2
    statement: "The account menu holds My writing (/me), Security (/me/security), 'Confirm your email' (/verify-email) while unconfirmed, and Sign out. The masthead receives only displayName and an unconfirmed flag."
    category: constraint
    applies_to: "AccountControl sheet, Masthead props"
    trigger: "Menu opened"
    logic: "IF unconfirmed THEN add the verify link; never pass ids, email or status values beyond the flag to the client"
    violation: "An account id or address in client props is an S1 defect"
    source: "FD-096, 03 section 2"
  - id: BR8.1
    statement: "getContributionAccess fails closed. It returns signed-out for an anonymous Actor, unconfirmed for pending_verification, allowed only for an active account with emailVerified true, and unavailable for every other state."
    category: authorization
    applies_to: "getContributionAccess (server/actions/account.ts)"
    trigger: "Called by ContributionGate and by U47 and U49"
    logic: "IF anonymous THEN signed-out ELSE IF status pending_verification THEN unconfirmed ELSE IF status active AND emailVerified THEN allowed ELSE unavailable"
    violation: "allowed for any other state is an S1 defect; the commands still refuse (C9 publish, C10 comment.post). Release 2 point: resolve-actor gives a restricted account emailVerified true, so C9 publish and C10 comment.post must refuse restricted accounts to match this mapping. Release 1 sets no restricted state, so for now the gate showing restricted accounts as unavailable is enough (ISS row proposed in functional-design-questions.md)"
    source: "AC3.1.1, AC3.1.4, FR1, FR4, C16"
  - id: BR8.2
    statement: "ContributionGate renders, by access and purpose: a sign-in prompt with sign-in and register links carrying returnTo; a confirm prompt with a no-address Resend and a link to /me/security; a neutral unavailable line; or nothing when allowed."
    category: policy
    applies_to: "ContributionGate {purpose, returnTo}"
    trigger: "Render"
    logic: "IF signed-out THEN title auth.gate.title, body auth.gate.writeBody (write) or auth.gate.commentBody (comment), links /sign-in?next and /register?next with BR1.5 applied to returnTo; IF unconfirmed THEN auth.verifyPending, auth.gate.verifyToAct and Resend (BR2.5); IF unavailable THEN auth.gate.unavailable; IF allowed THEN null"
    violation: "A contribution control reachable by a signed-out or unconfirmed person without the prompt is a defect"
    source: "AC3.1.1, AC3.1.4, C16"
  - id: BR8.3
    statement: "The gate never throws into its page and shows no address. An error while reading access renders the signed-out prompt."
    category: constraint
    applies_to: "ContributionGate"
    trigger: "getContributionAccess fails"
    logic: "IF the query throws or returns an error THEN render the signed-out prompt (fail closed) and log through the logger port with no personal fields"
    violation: "A broken gate that breaks the experience page or the composer is a defect (C16 rule)"
    source: "C16 rules, construction.md Error Handling"
  - id: BR9.1
    statement: "Auth styles use the T-011 tokens in plain CSS. New classes go in this Unit's section of patient.css, marked /* added: U9 T-102 reason */."
    category: constraint
    applies_to: "every component of the Unit"
    trigger: "Styling"
    logic: "IF a style is needed THEN use T-011 tokens and existing classes first; no Tailwind, CSS-in-JS, icon or animation library"
    violation: "impeccable detect, pnpm contrast or a review finding against FD-032 or FD-091"
    source: "AC2.4.1, FD-091, project.md Code Style"
  - id: BR9.2
    statement: "Motion is limited to T-011's RouteTransition, the Sheet entry, press feedback and one PublishTick beside each plain-text confirmation. Errors, notices, the disclaimer and the demo marker never move, and reduced motion keeps only short fades."
    category: constraint
    applies_to: "every page of the Unit"
    trigger: "Render and state change"
    logic: "IF a confirmation shows THEN PublishTick once beside the text; IF reduced motion THEN the tick shows complete; nothing else animates; only transform and opacity"
    violation: "pnpm check:motion failure, an animated error, or confetti, streak or countdown"
    source: "AC2.4.2, AC2.4.3, AC2.4.4, AC2.4.5, Question 11"
  - id: BR9.3
    statement: "/register and every panel of /verify-email show the static three-step joining strip with the current step marked."
    category: policy
    applies_to: "JoinSteps"
    trigger: "Render of register, pending, confirm or done"
    logic: "IF page is register THEN step 1; IF pending or confirm THEN step 2; IF done THEN step 3; aria-current step; no motion"
    violation: "A moving or timed strip is a defect"
    source: "Question 12"
  - id: BR10.1
    statement: "No password, token, full address or session id appears in a log line, a view model, a returned form state or a URL, apart from the token in the emailed link itself."
    category: constraint
    applies_to: "every action and page of the Unit"
    trigger: "Any"
    logic: "IF a value is a secret or a full address THEN it stays inside the action call; form state carries message keys, numeric params and flags only, never a submitted value"
    violation: "An S1 private-data defect"
    source: "NFR3, FD-096, FD-104"
```

## Rules summary

| Group | Rules | What they decide |
|---|---|---|
| BR1 Common | BR1.1–BR1.6 | Forms work without JavaScript, error summary and inline errors, both languages, noindex and no-referrer, safe `next`, and signed-in visitors redirected away from the forms |
| BR2 Register and pending | BR2.1–BR2.6 | One answer for every address (FD-103), the `rk.pending` cookie, which address the pending screen shows, resend without enumeration |
| BR3 Confirm | BR3.1–BR3.3 | Confirmation by POST only, the done panel checked against the Actor, one expired message for every bad token |
| BR4 Sign in | BR4.1–BR4.4 | A neutral wrong-credentials message, the rate-limit unit, suspended accounts with no appeal route, where a successful sign-in goes |
| BR5 Reset | BR5.1–BR5.3 | The same answer for every request, matching passwords, a used or expired token refused |
| BR6 Security page | BR6.1–BR6.5 | Signed-in only, the address masked, the session list, sign out everywhere with a confirmation, change password |
| BR7 Account entry | BR7.1–BR7.2 | Initials, the unconfirmed signal, menu links, minimal client props |
| BR8 Gate | BR8.1–BR8.3 | `getContributionAccess` fails closed, `ContributionGate` renders by access, never throws |
| BR9 Look and motion | BR9.1–BR9.3 | T-011 tokens, the motion limits, the joining strip |
| BR10 Privacy | BR10.1 | No secret or full address leaves the action |

## Sources

- `functional-design-questions.md` (answers), `inception/contract-design/contract-summary.md` C5, C16, C19, `inception/user-stories/stories.md` US2.4, US3.1, US3.2
- `docs/status/decision-log.md` FD-013, FD-024, FD-057, FD-059, FD-063, FD-088, FD-091, FD-096, FD-103, FD-104
- `main` at `bc63889`: `apps/web/src/server/actions/{auth,account,auth-form}.ts`, `packages/application/src/modules/account/commands/*`, `packages/contracts/src/{actor,errors}.ts`, `view-models/security.ts`
