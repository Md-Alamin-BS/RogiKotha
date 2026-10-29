# Business rules — U9 `t-102-patient-auth-screens`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-102-patient-auth-screens/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U9), `unit-of-work-story-map.md` (US3.1, US3.2), `requirements.md` (FR1–FR9, FR91, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5; AC2.3.1–AC2.3.4, AC2.4.3–AC2.4.5 and AC12.1.6 for reference), T-102 with its FD-091, FD-053 and FD-057 amendments, `auth-screens-spec.md` §1–§3, §5, §6, the D-001 prototype, the T-101 draft (actions, Actor, codes) and the T-011 draft (tokens, motion, static set), FD-024, FD-042, FD-057, FD-058, FD-059, FD-063, FD-088, FD-091 and the hard rules in `project.md`. The entities these rules govern are in `entities.md`, the components in `frontend-components.md`, and the workflows and state transitions in `functional-spec.md`.

Rules that depend on a question name it in `source`. Questions 1–3 and 5–13 are answered A on the owner's standing instruction of 2026-10-27, awaiting confirmation. **Question 4 is open for the owner**; rules that depend on it (BR5.7, BR9.2, BR13.2) follow option C until it is answered. `functional-spec.md` § 10 lists what changes under every other option.

Terms: "the wrapper" is the form-facing server action this Unit adds in `apps/web/src/server/actions/account.ts` around T-101's action (`FormData → input → T-101 action → FormState`). "Locale-free path" is a path without the `/en` or `/bn` prefix, as `@/i18n/routing` `usePathname()` returns it.

```yaml
rules:
  # 1. Shared form behaviour (every auth form)
  - id: BR1.1
    statement: "Every auth form is a client component that submits a server action through useActionState, and works without JavaScript: the POST re-renders the page with the returned state."
    category: constraint
    applies_to: "RegisterForm, SignInForm, ResendForm, VerifyConfirmForm, ResetRequestForm, ResetSetForm, ChangePasswordForm, SignOutEverywhereForm, SignOutForm"
    trigger: "A form is submitted, with or without JavaScript"
    logic: "<form action={formAction}> where formAction comes from useActionState(wrapper, INITIAL_STATE); the wrapper never throws for an expected failure; it returns FormState or calls redirect() on success"
    violation: "A form that needs JavaScript to submit, or an action that throws on a wrong password, fails the 'No-JS' acceptance row"
    source: "auth-screens-spec.md §2 (works without JavaScript), 01-conventions.md §8, T-102 steps 2-5, T-102 acceptance 'No-JS'"
  - id: BR1.2
    statement: "After a failed submission the form shows what the person typed again, except passwords, which always come back empty."
    category: constraint
    applies_to: "FormState.values; every non-secret field"
    trigger: "A wrapper returns an error state"
    logic: "FormState.values holds email, username, displayName, locale, ageConfirmed, termsAccepted as submitted (trimmed only); each field reads its defaultValue (or defaultChecked) from state.values; password, newPassword, confirmPassword and currentPassword are never put in values"
    violation: "React resets uncontrolled fields after an action, so without the echo every failure wipes the form; a password in state or HTML is a privacy defect (S1)"
    source: "React form action reset behaviour (react.dev <form>), FR95 (meaningful errors), 01-conventions.md §11"
  - id: BR1.3
    statement: "A failed submission shows an error summary at the top of the panel: a warn callout headed 'Please check the following', listing each problem; it is announced and receives focus."
    category: constraint
    applies_to: "ErrorSummary"
    trigger: "FormState.status is 'error'"
    logic: "Render div.callout.warn role=alert tabIndex=-1 with b{auth.errorSummary} and ul; each field error becomes li > a[href=#f-<name>] with the field's message; each non-field error (rate limit, suspended, internal, token) becomes li with plain text; on render after a submit, focus moves to the summary (effect with JavaScript; without JavaScript the summary is the first content after the heading and the document title carries the error prefix, BR1.10)"
    violation: "Errors only inline, or a summary that does not get focus, fails AC2.3.4 and the 'Focus' acceptance row"
    source: "auth-screens-spec.md §2, T-102 step 1, AC2.3.4, AC3.1.3"
  - id: BR1.4
    statement: "Each field error also appears under its field, starts with the field's name, and is tied to the input."
    category: constraint
    applies_to: "FieldError, every input with an error"
    trigger: "FormState.fieldErrors has an entry for the field"
    logic: "Render p.field-error#err-<name> under the input; the input gets aria-invalid=true and aria-describedby listing the hint id first (when there is a hint) and then err-<name>; the message is the key's text, which already starts with the field name ('Password: …')"
    violation: "An error shown only by a red border is a colour-only signal (WCAG 1.4.1) and fails AC3.1.3"
    source: "auth-screens-spec.md §2, AC3.1.3 ('labelled field error … does not rely on colour alone'), AC2.3.4"
  - id: BR1.5
    statement: "The server decides validity; the client only helps, and never validates before the person submits."
    category: policy
    applies_to: "Every auth input"
    trigger: "Rendering a field"
    logic: "Inputs carry type, autocomplete, inputmode, autocapitalize and spellcheck as in BR1.7, maxlength only on email (254), username (24) and display name (60), never on passwords; no HTML required attribute (the summary pattern replaces the browser tooltip); no validation on blur or input; required fields show the .req marker with compose.required"
    violation: "A browser tooltip instead of the summary, or an error shown before the first submit, breaks the spec's error pattern"
    source: "D-001 prototype authField() comment, auth-screens-spec.md §2, ISS-020"
  - id: BR1.6
    statement: "Field ids are fixed per page: f-email, f-password, f-username, f-display, f-locale, f-age, f-terms, f-currentPassword, f-newPassword, f-confirmPassword; error ids are err-<name>."
    category: constraint
    applies_to: "All auth forms"
    trigger: "Rendering"
    logic: "Each route renders one form with these ids (the security page's change-password form uses the three password ids; nothing else on that page reuses them); summary links point at these ids"
    violation: "A duplicated id breaks the summary links and label association"
    source: "T-102 step 1 (prototype ids), auth-screens-spec.md §2"
  - id: BR1.7
    statement: "Inputs tell browsers and password managers what they are."
    category: constraint
    applies_to: "Every auth input"
    trigger: "Rendering"
    logic: "Register: email type=email autocomplete=email; password autocomplete=new-password; username autocomplete=off autocapitalize=none spellcheck=false; display name autocomplete=nickname. Sign-in: email type=email autocomplete=username; password autocomplete=current-password. Reset set and change password: new and confirm autocomplete=new-password; current autocomplete=current-password. Resend and reset request: email type=email autocomplete=email"
    violation: "Wrong hints make password managers save or fill the wrong field"
    source: "FR95 (screen-reader-friendly controls), WHATWG autofill tokens"
  - id: BR1.8
    statement: "While a submission runs the submit button is disabled and the form is marked busy, so it cannot be sent twice."
    category: constraint
    applies_to: "SubmitButton (useFormStatus)"
    trigger: "pending is true"
    logic: "button disabled and aria-disabled; form aria-busy=true; the label does not change"
    violation: "A double submit of register would run the command twice"
    source: "auth-screens-spec.md §2 ('sets aria-busy and disables double-submit')"
  - id: BR1.9
    statement: "Focus goes to the error summary after a failed submit and to the page's h1 after a client-side arrival; on a full page load without errors focus is left alone."
    category: constraint
    applies_to: "AuthHead (h1 tabIndex=-1), ErrorSummary"
    trigger: "Mount after navigation; render of an error state"
    logic: "IF the state carries errors THEN focus the summary ELSE IF the page was reached by client navigation (not the first document load) THEN focus h1 ELSE do nothing (the skip link stays the first stop)"
    violation: "Focus left on a link that no longer exists, or stolen on first load, fails the 'Focus' acceptance row"
    source: "auth-screens-spec.md §2, T-102 acceptance 'Focus'"
  - id: BR1.10
    statement: "When a page renders with errors, its document title is prefixed with 'Error:' in the active language."
    category: constraint
    applies_to: "generateMetadata of the five auth pages; client title update after an action"
    trigger: "FormState.status is 'error'"
    logic: "title = t('auth.errorTitle', {title: documentTitle(view)}); restored to the plain title on the next success or navigation"
    violation: "A screen-reader user loading the re-rendered page without JavaScript hears nothing about the failure"
    source: "AC2.3.4 (announced to screen readers), GOV.UK error-message pattern"
  - id: BR1.11
    statement: "Every auth page and every /me/* page is noindex and keeps the shell's demo marker, disclaimer and emergency link."
    category: constraint
    applies_to: "/register, /sign-in, /verify-email, /reset-password, /me/security"
    trigger: "Rendering"
    logic: "generateMetadata spreads noindex(); the patient layout's DemoMarker and Colophon (with disclaimer.short) render unchanged"
    violation: "An indexable auth page fails the 'noindex' row; a missing disclaimer breaks a hard rule"
    source: "01-conventions.md §8, project.md Mandated (disclaimer, demo marker), T-102 hard-rule checklist"
  - id: BR1.12
    statement: "An error code is shown through its message key, never as raw text, and an unexpected error gets the common message."
    category: constraint
    applies_to: "The wrappers"
    trigger: "A T-101 action returns err(AppError)"
    logic: "messageKey = AppError.messageKey; fieldErrors map field to messageKey; codes rate_limited and auth.rate_limited render per BR4.6; internal renders errors.common.internal; a thrown exception in the wrapper is caught only for the redirect signal (rethrown), never swallowed"
    violation: "A hard-coded string, or a stack trace in the page, breaks the i18n rule and NFR10"
    source: "01-conventions.md §3 and §6, project.md Forbidden (hard-coded strings)"
  - id: BR1.13
    statement: "Each auth page renders its own a-head (kicker, h1.display, lede) and passes an empty title to ViewShell, so the page has exactly one h1."
    category: constraint
    applies_to: "The five auth pages"
    trigger: "Rendering"
    logic: "<ViewShell view=… title=''> then <AuthHead kicker=auth.kicker title=… lede=…>, as Policy and Emergency do"
    violation: "Two h1 elements, or none, is an axe failure (ISS-121 precedent)"
    source: "auth-screens-spec.md §2 layout, ViewShell ASSUMPTION(T-207a), AC12.1.6"

  # 2. Password field
  - id: BR2.1
    statement: "Every password field has a Show or Hide button whose text says what it will do; its accessible name names the password; it carries no aria-pressed; the change is announced."
    category: constraint
    applies_to: "PasswordField"
    trigger: "The person activates the button"
    logic: "type toggles password <-> text; text auth.showPassword or auth.hidePassword; aria-label auth.showPasswordAria or auth.hidePasswordAria; aria-controls=<input id>; announce auth.passwordShown or auth.passwordHidden through useAnnounce; focus stays on the button"
    violation: "Changing text and aria-pressed together gives 'Hide, pressed' (contradictory); an eye icon alone breaks spec §2"
    source: "functional-design-questions.md Q8 (A), auth-screens-spec.md §2, WCAG 2.5.3"
  - id: BR2.2
    statement: "The Show button appears only after hydration, and every password field returns to hidden before its form submits."
    category: constraint
    applies_to: "PasswordField"
    trigger: "Mount; form submit"
    logic: "Render the button only when mounted (no dead control without JavaScript); on the form's submit event set type back to password"
    violation: "A button that does nothing without JavaScript; a visible password kept in browser form history"
    source: "Q8 (A), auth-screens-spec.md §2 (works without JavaScript)"
  - id: BR2.3
    statement: "New-password fields show the hint 'At least 10 characters. A sentence you will remember works well.' and no strength meter; passwords have no maxlength."
    category: constraint
    applies_to: "Register password, reset newPassword, change-password newPassword"
    trigger: "Rendering"
    logic: "p.sub#hint-<name> with auth.passwordHint; over 256 characters the server returns errors.auth.passwordTooLong (BR3.8)"
    violation: "A maxlength silently cuts a pasted passphrase; a meter contradicts spec §2"
    source: "auth-screens-spec.md §2, FR3 (long passphrases), T-101 Q7"
  - id: BR2.4
    statement: "Where a password is entered twice, the wrapper compares the two before calling T-101; the confirmation is never sent to a command."
    category: validation
    applies_to: "ResetSetForm, ChangePasswordForm wrappers"
    trigger: "Submit"
    logic: "IF newPassword !== confirmPassword THEN fieldErrors.confirmPassword = auth.reset.mismatch and no command runs ELSE call the command with newPassword only"
    violation: "A mismatch that reaches the command changes the password to something the person did not intend"
    source: "auth-screens-spec.md §3.4 and §3.6, D-001 prototype reset-set handler"

  # 3. Register
  - id: BR3.1
    statement: "The register form has, in this order: email, password, username with its @name preview, display name, interface language, age confirmation, terms and privacy; every one is required."
    category: constraint
    applies_to: "RegisterForm"
    trigger: "Rendering /register"
    logic: "Labels from auth.email, auth.password, auth.username, auth.displayName, auth.language, auth.ageLabel, auth.termsLabel; hints auth.passwordHint, auth.usernameHint, auth.displayNameHint; submit auth.register.submit; below the panel auth.haveAccount links to /sign-in"
    violation: "A missing field fails FR2 and the 'RegisterForm renders all seven fields' test"
    source: "FR2, AC3.1.2, auth-screens-spec.md §3.1, D-001 renderRegister"
  - id: BR3.2
    statement: "The interface language is a fieldset of two native radio inputs styled as .opt, defaulting to the route locale."
    category: constraint
    applies_to: "RegisterForm, field locale"
    trigger: "Rendering; submit"
    logic: "fieldset > legend{auth.language} > two label.opt > input[type=radio][name=locale][value=en|bn]; checked = state.values.locale ?? route locale; arrow keys work natively"
    violation: "button role=radio submits no value without JavaScript (finding F9)"
    source: "auth-screens-spec.md §3.1, auth-screens-spec.md §2 (works without JavaScript), FR91"
  - id: BR3.3
    statement: "The username preview shows '@' plus what the person typed, live with JavaScript and from the echoed value without it."
    category: constraint
    applies_to: "UsernamePreview"
    trigger: "Input in f-username; render with state.values.username"
    logic: "p.sub#username-preview aria-live=off text '@' + value, empty when the value is empty; it is not announced on every keystroke"
    violation: "A live region on the preview would read every character"
    source: "auth-screens-spec.md §3.1, T-102 step 2, D-001 prototype input handler"
  - id: BR3.4
    statement: "The Terms and Privacy links inside the terms label open /terms and /privacy in a new tab and say so to screen readers."
    category: constraint
    applies_to: "RegisterForm terms label"
    trigger: "Rendering"
    logic: "auth.termsLabel with {terms} and {privacy} rich-text slots: a[href=/<locale>/terms target=_blank rel=noopener] with auth.termsLink and a span.sr-only a11y.newTab; the same for privacy"
    violation: "Same-tab links lose the typed form; links to #about are stale (ISS-028)"
    source: "auth-screens-spec.md §3.1, 03 §1 (/terms, /privacy needed by registration), ISS-028"
  - id: BR3.5
    statement: "A register result that T-101 accepts always leads to the pending screen in the chosen language, whether or not the email already had an account."
    category: policy
    applies_to: "registerFormAction"
    trigger: "T-101 registerAction returns ok"
    logic: "Set rk.pending (BR13.4) to the normalised email; set rk.lang to the chosen locale; redirect to /<chosen locale>/verify-email; the existing-email case is indistinguishable here because T-101 returns the same ok"
    violation: "Any difference between a new and an existing email in redirect, timing added by this Unit, cookie or copy is an enumeration defect (S1)"
    source: "auth-screens-spec.md §3.1, AC3.1.2, T-101 BR1.4, ISS-035, functional-design-questions.md Q3 (A)"
  - id: BR3.6
    statement: "A taken username is a real field error; no other register outcome reveals anything about an email."
    category: policy
    applies_to: "RegisterForm"
    trigger: "T-101 returns auth.username_taken"
    logic: "fieldErrors.username = errors.auth.usernameTaken; the email and every other value stay echoed"
    violation: "Showing 'email already registered' anywhere breaks FD-013 anti-enumeration"
    source: "auth-screens-spec.md §3.1 (usernames are public), T-101 BR1.3"
  - id: BR3.7
    statement: "A signed-in visitor to /register or /sign-in is sent to the sanitised next or to /me."
    category: policy
    applies_to: "/register, /sign-in pages"
    trigger: "getActor().kind is account"
    logic: "redirect(sanitiseNext(searchParams.next) ?? '/me') in the page before rendering"
    violation: "Registering a second account from a signed-in session is confusing and creates mixed state"
    source: "Design decision (functional-design-questions.md 'Settled in this design')"
  - id: BR3.8
    statement: "Register field errors map to these keys: email errors.auth.emailInvalid; password errors.auth.passwordTooShort, errors.auth.passwordTooLong or errors.auth.passwordEqualsEmail; username errors.auth.usernameInvalid or errors.auth.usernameTaken; displayName errors.auth.displayNameRequired; age errors.auth.ageRequired; terms errors.auth.termsRequired."
    category: validation
    applies_to: "registerFormAction, T-101 BR1.1 fieldErrors"
    trigger: "T-101 returns a field error"
    logic: "The wrapper renders the messageKey T-101 sends; T-101's validation field errors name exactly these keys (ENT-004); the three new keys are added to both dictionaries by this Unit"
    violation: "A field error without a key falls back to native validation (ISS-020) or to a generic message"
    source: "AC3.1.3, ISS-020, T-101 BR1.1 and Q7"

  # 4. Sign-in
  - id: BR4.1
    statement: "The sign-in page has email and password, the links 'Forgot your password?' and 'New here? Create an account', and shows one status callout when it arrives from a reset or a sign-out everywhere."
    category: constraint
    applies_to: "SignInForm, /sign-in page"
    trigger: "Rendering /sign-in"
    logic: "IF searchParams.reset = done THEN callout role=status auth.reset.done (with the confirmation tick, BR11.5); IF searchParams.signedOut = all THEN callout role=status auth.security.signedOutAll; links to /reset-password and /register (register carries next)"
    violation: "A missing confirmation leaves the person unsure the reset worked"
    source: "auth-screens-spec.md §3.3 and §3.4, T-102 step 5, Q7 (A)"
  - id: BR4.2
    statement: "Wrong email or wrong password gets one generic message, shown in the summary and under the password field; the email stays filled."
    category: policy
    applies_to: "signInFormAction"
    trigger: "T-101 returns auth.invalid_credentials"
    logic: "summary item and fieldErrors.password = errors.auth.invalidCredentials; values.email echoed; never 'account locked', never which part was wrong"
    violation: "A message that differs for unknown and known emails is an enumeration defect (S1)"
    source: "auth-screens-spec.md §3.3, FD-013, T-101 BR3.11"
  - id: BR4.3
    statement: "next is honoured only when it is a locale-free, same-origin path that is not an auth page, not staff and not an API; anything else is replaced."
    category: validation
    applies_to: "sanitiseNext() used by sign-in, sign-out, the account entry and the gate"
    trigger: "Any next value is read"
    logic: "Decode once. Accept only IF it starts with exactly one '/', the second character is not '/' or '\\', it has no control or whitespace characters, it is at most 512 characters, its path (after stripping a leading /en or /bn segment) does not start with /admin, /api, /_next, /sign-in, /register, /verify-email, /reset-password; query and fragment are kept. Otherwise return null, and the caller uses /me (after sign-in) or / (after sign-out). The redirect is built as /<locale><path>"
    violation: "An open redirect (https://evil.example, //evil.example, /\\evil.example) or a redirect into the staff console from the patient sign-in"
    source: "T-102 step 4 and acceptance 'next safety', T-102 action test table, design decision (staff sessions belong to T-103's device approval)"
  - id: BR4.4
    statement: "A successful sign-in clears the pending-email cookie and goes to the sanitised next or /me."
    category: policy
    applies_to: "signInFormAction"
    trigger: "T-101 signInAction returns ok (session cookie set by T-101)"
    logic: "delete rk.pending; redirect(/<locale> + (sanitiseNext(next) ?? '/me'))"
    violation: "Landing on an attacker-chosen URL, or a stale pending address shown later"
    source: "auth-screens-spec.md §3.3, BR4.3"
  - id: BR4.5
    statement: "A suspended or banned account that signs in with the right password sees that the account is suspended, with no appeal route and no link."
    category: policy
    applies_to: "signInFormAction"
    trigger: "T-101 returns auth.account_suspended"
    logic: "summary item errors.auth.accountSuspended (reworded copy, Q6 A); no field error; no link to /me"
    violation: "Naming an appeal route breaks FD-088; a link to /me loops back to sign-in"
    source: "functional-design-questions.md Q6 (A), FD-088, T-101 BR3.6"
  - id: BR4.6
    statement: "A rate-limit refusal names the wait in seconds under a minute and in whole minutes from a minute, with Bengali digits on Bengali pages; there is no countdown and the button stays enabled."
    category: constraint
    applies_to: "Every wrapper that can receive auth.rate_limited or rate_limited"
    trigger: "AppError.retryAfterSec is present"
    logic: "s = retryAfterSec; IF s < 60 THEN errors.auth.rateLimitedSeconds {count: s, seconds: formatNumber(s, locale)} ELSE m = ceil(s/60), errors.auth.rateLimited {count: m, minutes: formatNumber(m, locale)}; summary item only; IF retryAfterSec is missing THEN the unit-free fallback is the minutes form with 1"
    violation: "'Try again in 1 minutes' or '1 minute' for a 2-second delay misleads (finding F6)"
    source: "functional-design-questions.md Q5 (A), FD-063, T-101 F4, auth-screens-spec.md binding rules (no time-pressure traps)"
  - id: BR4.7
    statement: "Sign-in, register, resend and reset never show a message, cookie or redirect that differs between an address with an account and one without."
    category: policy
    applies_to: "All anonymous auth wrappers"
    trigger: "Any outcome"
    logic: "The wrappers add no branch on account existence; they render what T-101 returns; delays and limits come from T-101 unchanged"
    violation: "Enumeration through the UI layer (S1)"
    source: "FD-013, AC3.1.5, AC3.2.1, T-101 BR3.11"

  # 5. Verify email
  - id: BR5.1
    statement: "Without a token, /verify-email shows the pending panel: the address (from the pending cookie) or the no-address text, the 24-hour note, the Resend form and, outside production, a link to the local inbox."
    category: constraint
    applies_to: "VerifyEmail (pending state)"
    trigger: "No token in the URL"
    logic: "body = rk.pending ? auth.verify.body {email in b} : auth.verify.bodyNoEmail; callout auth.verify.expires; ResendForm; IF process.env.APP_MODE !== 'production' THEN a[href=http://localhost:8025]{auth.verify.devInbox} rendered on the server"
    violation: "A dev inbox link in production, or an address taken from the URL"
    source: "auth-screens-spec.md §3.2, T-102 step 3, Q3 (A), T-102 test 'VerifyEmail shows the dev inbox link only when APP_MODE !== production'"
  - id: BR5.2
    statement: "Resend always answers 'A new link is on its way' or the rate-limit message, never anything about the account; when the address is unknown to the page, the form shows an email field."
    category: policy
    applies_to: "ResendForm, resendVerificationFormAction"
    trigger: "Submit"
    logic: "IF rk.pending (or Q4 ownEmail) is known THEN hidden email input ELSE visible f-email input; ok -> p role=status auth.verify.resent; rate limited -> BR4.6; the pending cookie's lifetime is renewed"
    violation: "A different answer for an unknown or already-confirmed address is enumeration"
    source: "auth-screens-spec.md §3.2, AC3.1.4 (rate-limited resend), T-101 WF3"
  - id: BR5.3
    statement: "With a token, /verify-email shows a confirm panel with one button; nothing is confirmed by opening the link."
    category: constraint
    applies_to: "VerifyConfirmForm"
    trigger: "token present in the URL"
    logic: "Render auth.verify.confirmLede and a form with hidden token and button auth.verify.confirmSubmit posting verifyEmailFormAction; the page render calls no command"
    violation: "Confirming in the render cannot set the session cookie (finding F1) and lets link scanners act"
    source: "functional-design-questions.md Q2 (A), Next.js cookie-write rule"
  - id: BR5.4
    statement: "A confirmed token signs the person in and lands on /me?welcome=1; an expired or used token shows the expired panel with the Resend form."
    category: policy
    applies_to: "verifyEmailFormAction"
    trigger: "Submit of the confirm form"
    logic: "ok -> delete rk.pending; redirect /<locale>/me?welcome=1 (T-101 sets the session); auth.token_expired or auth.token_invalid -> state error with auth.verify.expired and the pending panel's ResendForm"
    violation: "A failed confirmation with no way to ask for a new link fails AC3.1.4"
    source: "AC3.1.4, auth-screens-spec.md §3.2, T-101 WF2"
  - id: BR5.5
    statement: "/me?welcome=1 shows 'Your email is confirmed' only when the signed-in Actor's email is verified."
    category: validation
    applies_to: "VerifyWelcome on /me"
    trigger: "Rendering /me"
    logic: "IF searchParams.welcome = '1' AND actor.kind = account AND actor.emailVerified THEN callout role=status auth.verify.done with the confirmation tick ELSE nothing"
    violation: "Typing ?welcome=1 would show a false confirmation (finding F10)"
    source: "auth-screens-spec.md §3.2, design decision"
  - id: BR5.6
    statement: "Pages that carry a token in the URL send no referrer and, after hydration, remove the token from the address bar."
    category: constraint
    applies_to: "/verify-email?token=, /reset-password?token="
    trigger: "Rendering with a token"
    logic: "metadata.referrer = 'no-referrer'; a client effect calls history.replaceState with the URL minus token; the token stays in the form's hidden field"
    violation: "A token leaked through Referer or left in history and screenshots"
    source: "Design decision; 01-conventions.md §11 (no secrets exposed)"
  - id: BR5.7
    statement: "A signed-in, unverified holder sees the pending banner on /me and /write; until Question 4 is answered it shows no address."
    category: constraint
    applies_to: "PendingVerificationBanner"
    trigger: "actor.kind = account AND NOT actor.emailVerified"
    logic: "callout.warn with auth.verify.bodyNoEmail (Q4 C; with Q4 A: auth.verify.body {email}) and the Resend form (email field shown, BR5.2); static, never animated"
    violation: "An email in a view model before Q4 is decided breaks 03 §2"
    source: "auth-screens-spec.md §3.2 and §3.7, functional-design-questions.md Q4 (open; C applies)"

  # 6. Reset password
  - id: BR6.1
    statement: "A reset request always shows the same neutral panel, whatever the address."
    category: policy
    applies_to: "ResetRequestForm"
    trigger: "Submit"
    logic: "ok -> replace the form with callout role=status auth.reset.sent; rate limited -> BR4.6 with the form kept; no other branch"
    violation: "A different panel for an unknown address fails AC3.2.1"
    source: "AC3.2.1, auth-screens-spec.md §3.4, T-101 WF7"
  - id: BR6.2
    statement: "With a token, /reset-password shows the new and confirm password fields; the token travels in a hidden field."
    category: constraint
    applies_to: "ResetSetForm"
    trigger: "token present"
    logic: "PasswordField newPassword (hint), PasswordField confirmPassword, hidden token, submit auth.reset.setSubmit; BR2.4 runs first; T-101 errors map per BR3.8 (password keys)"
    violation: "A token visible in an editable field invites mistakes"
    source: "auth-screens-spec.md §3.4, T-102 step 5"
  - id: BR6.3
    statement: "A successful reset goes to /sign-in?reset=done; an expired or used link shows the token message with a link to ask again, and the password is unchanged."
    category: policy
    applies_to: "resetPasswordFormAction"
    trigger: "Submit of the set form"
    logic: "ok -> redirect /<locale>/sign-in?reset=done (T-101 revoked every session); auth.token_expired -> summary errors.auth.tokenExpired plus a link to /reset-password; auth.token_invalid -> errors.auth.tokenInvalid plus the same link"
    violation: "No way forward from an expired link fails AC3.2.2"
    source: "AC3.2.2, auth-screens-spec.md §3.4, FD-059"

  # 7. Sign-out
  - id: BR7.1
    statement: "Sign-out is a POST form in the account menu that calls a server action; there is no /sign-out page."
    category: constraint
    applies_to: "SignOutForm, signOutFormAction"
    trigger: "The person chooses Sign out"
    logic: "form method=post action=signOutFormAction with hidden next = current locale-free path; GET /sign-out answers 404"
    violation: "A GET sign-out link can be triggered by any page (CSRF); ISS-124 is closed by this rule"
    source: "03 §1 (/sign-out server action, POST only), auth-screens-spec.md §3.5, ISS-124"
  - id: BR7.2
    statement: "After sign-out the person stays on the current public page; from a private page they go to the home page; the sign-out is announced."
    category: policy
    applies_to: "signOutFormAction, SignOutForm"
    trigger: "T-101 signOutAction returns ok"
    logic: "IF the path is under /me, /saved or /notifications THEN target '/' ELSE target = sanitiseNext(next) ?? '/'. With JavaScript: on a public target the action revalidates the layout and returns ok; the client closes the sheet and announces auth.signedOut; on '/' it navigates. Without JavaScript: redirect to the target"
    violation: "Sending everyone to / loses their place; staying on /me shows a signed-out workspace"
    source: "auth-screens-spec.md §3.5 ('redirect to the current public page or /'), 01-conventions.md §8 (announce what the prototype announced)"
  - id: BR7.3
    statement: "Sign-out ends only the session; the staff device cookie is untouched."
    category: constraint
    applies_to: "signOutFormAction"
    trigger: "Sign-out"
    logic: "The wrapper deletes rk.pending and nothing else; T-101 clears the session cookie; rk_staff_device is never read or written here"
    violation: "Deleting device trust forces a new approval on every staff sign-in"
    source: "auth-screens-spec.md §3.5, T-101 BR4.5"

  # 8. Account entry and menu
  - id: BR8.1
    statement: "The account entry is a .ctl in the masthead controls, before the language control, never accent-filled; the write CTA stays the only primary fill."
    category: constraint
    applies_to: "AccountEntry, Masthead"
    trigger: "Every patient page"
    logic: "Masthead renders <AccountEntry viewer=…/> as the first child of .controls; it uses .ctl and .ctl.account only"
    violation: "A filled account button competes with the write CTA (spec binding rule)"
    source: "auth-screens-spec.md §1, T-102 hard-rule checklist"
  - id: BR8.2
    statement: "Signed out, the entry is a link to /sign-in carrying the current path as next, with the person glyph and the name 'Sign in'."
    category: constraint
    applies_to: "AccountEntry (signed out)"
    trigger: "viewer.kind = anonymous"
    logic: "Link#account.ctl href=/sign-in?next=<encodeURIComponent(pathname)> title and aria-label auth.signIn.label, Icon person; on an auth page next is omitted"
    violation: "Losing the reader's place after sign-in"
    source: "auth-screens-spec.md §1, T-102 step 7"
  - id: BR8.3
    statement: "Signed in, the entry is a button showing the initials that opens the account sheet with: Confirm your email (unverified only, first), My writing, Saved, Notifications, Security, Staff console (staff only, last), then Sign out."
    category: constraint
    applies_to: "AccountEntry, AccountMenu"
    trigger: "viewer.kind = account"
    logic: "button#account.ctl.account aria-haspopup=dialog aria-expanded data-verified; Sheet title = viewer.displayName; ul of Links: /verify-email auth.verifyPending, /me nav.mine, /saved mine.bookmarks, /notifications mine.notifications, /me/security auth.security.nav, /admin nav.admin; SignOutForm button auth.signOut. A list of links, not role=menu"
    violation: "A missing Security link or an ARIA menu without arrow keys"
    source: "auth-screens-spec.md §1, D-001 #account handler, Q9 (A)"
  - id: BR8.4
    statement: "An unverified account's entry shows a small warn dot and says 'email not confirmed' in its accessible name."
    category: constraint
    applies_to: "AccountEntry"
    trigger: "viewer.verified is false"
    logic: "data-verified=false draws the dot (T-011 token --warn-ink); aria-label auth.accountMenuUnverified {name}; verified: auth.accountMenu {name}"
    violation: "A dot with no text is a colour-and-shape-only signal for screen readers"
    source: "auth-screens-spec.md §1, BR1.4 of T-011 (colour never the only signal), ISS-022"
  - id: BR8.5
    statement: "Initials are the first grapheme of the first and last words of the display name, so Bengali names never split a cluster."
    category: constraint
    applies_to: "initials() in the layout's viewer builder"
    trigger: "Building the viewer"
    logic: "Drop a leading 'Dr.' or 'ডা.'; split on whitespace; take the first grapheme (Intl.Segmenter granularity grapheme) of the first word and of the last word when there are two or more; no case transform"
    violation: "charAt(0) shows a lone vowel sign or half a conjunct in Bengali"
    source: "D-001 initials(), FD-024, project.md Mandated (no capital-letter transform in Bengali)"
  - id: BR8.6
    statement: "The menu shows an unread count only for a number above zero supplied by T-405; before T-405 nothing shows."
    category: constraint
    applies_to: "AccountMenu Notifications item"
    trigger: "viewer.unreadCount"
    logic: "IF typeof unreadCount === 'number' AND unreadCount > 0 THEN span.count formatNumber(unreadCount, locale) ELSE nothing"
    violation: "Showing 0 for a value nobody computed breaks the hard rule"
    source: "project.md Forbidden (missing value never 0), T-405 owned 'unread count hunk'"
  - id: BR8.7
    statement: "The viewer is built once per request in the patient layout from getActor() and carries no account id and no email."
    category: constraint
    applies_to: "Viewer (ENT-001), patient layout"
    trigger: "Every patient request"
    logic: "viewer = {kind, displayName, initials, verified, staff: actor.staffRole !== undefined, unreadCount?: undefined}; passed as a prop; never serialised with accountId, personaId, status or capabilities"
    violation: "An account id or email in the client payload breaks 03 §2"
    source: "T-102 step 7, 03 §2, 01-conventions.md §5"

  # 9. Security page
  - id: BR9.1
    statement: "/me/security sits under the workspace with WorkspaceNav, is noindex, and shows the gate panel to a signed-out visitor."
    category: constraint
    applies_to: "/me/security page, SecuritySettings"
    trigger: "Rendering"
    logic: "signed out -> a-head + panel with callout.warn auth.gate.title / auth.gate.body and a Sign in link to /sign-in?next=/me/security; signed in -> a-head, WorkspaceNav current=security, one .panel with four .sub sections"
    violation: "A blank or erroring page for a signed-out visitor"
    source: "auth-screens-spec.md §3.6, D-001 renderSecurity"
  - id: BR9.2
    statement: "The email section shows the confirmed state and the note that changing the email is not available; it shows the address only if Question 4 allows it."
    category: constraint
    applies_to: "SecuritySettings email section"
    trigger: "Rendering"
    logic: "h4 auth.security.email; p with auth.security.verified or auth.security.unverified (as a badge with text); p.note auth.security.emailNote; Q4 C (current): no address; Q4 A: the address before the state"
    violation: "An address in SecurityVM before the owner's FD entry"
    source: "auth-screens-spec.md §3.6, 03 §2, functional-design-questions.md Q4 (open; C applies)"
  - id: BR9.3
    statement: "Changing the password needs the current password and a new one entered twice; success says other devices were signed out."
    category: policy
    applies_to: "ChangePasswordForm, changePasswordFormAction"
    trigger: "Submit"
    logic: "BR2.4 first; T-101 auth.invalid_credentials -> fieldErrors.currentPassword errors.auth.invalidCredentials; password codes per BR3.8; rate limited per BR4.6; ok -> p role=status auth.security.passwordChanged with the confirmation tick, fields cleared"
    violation: "A change without the current password fails 03 §4"
    source: "auth-screens-spec.md §3.6, T-101 WF9, storyboard step 10"
  - id: BR9.4
    statement: "The sessions table lists active sessions only, marks this device, and shows no login history and no failed-login alert."
    category: constraint
    applies_to: "SessionsTable"
    trigger: "Rendering with SecurityVM.sessions"
    logic: "table.kv.sessions with thead device / first seen / last seen; each row: device label (BR9.7), auth.security.thisDevice badge when current, formatDate(firstSeen), current ? auth.security.justNow : formatDate(lastSeen); rows in T-101's order (current first, then most recent)"
    violation: "Any recent-login list or alert breaks FD-057; English month names on a Bengali page break FD-024"
    source: "FD-057, AC3.2.3, auth-screens-spec.md §3.6, T-102 step 8"
  - id: BR9.5
    statement: "Sign out everywhere asks for a confirmation, then ends every session including this one and lands on /sign-in with a status message."
    category: policy
    applies_to: "SignOutEverywhere"
    trigger: "The person chooses Sign out everywhere"
    logic: "confirm='inline' (default): the button reveals p.note auth.security.signOutAllNote, button auth.security.signOutAllConfirm and button auth.cancel; confirming posts signOutEverywhereFormAction; ok -> redirect /<locale>/sign-in?signedOut=all. confirm='stepUp' is T-103's: it opens the step-up sheet first. No password is asked while confirm='inline'"
    violation: "A password field checked by nothing (finding F7); a one-tap sign-out of every device"
    source: "functional-design-questions.md Q7 (A), FD-057, AC3.2.3, T-101 Q10 (A)"
  - id: BR9.6
    statement: "The 'Your data' section links to the export and delete controls on /me."
    category: constraint
    applies_to: "SecuritySettings data section"
    trigger: "Rendering"
    logic: "h4 user2.data; p.note user2.dataNote; Link /me user2.data"
    violation: "Duplicating the data-request controls here"
    source: "auth-screens-spec.md §3.6 item 4"
  - id: BR9.7
    statement: "A device is labelled from its browser and system names through a key; a missing part reads 'Unknown device'."
    category: constraint
    applies_to: "SessionsTable device cell"
    trigger: "Rendering a session"
    logic: "IF browser AND os THEN auth.security.deviceLabel {browser, os} ELSE auth.security.deviceUnknown; product names are shown as T-101 returns them"
    violation: "'Chrome on Windows' on a Bengali page (finding F8)"
    source: "functional-design-questions.md Q10 (A), FD-024"

  # 10. Gates on contribution
  - id: BR10.1
    statement: "On /write, a signed-out visitor sees the gate callout with Sign in and Create an account, and no composer."
    category: constraint
    applies_to: "WriteGateCallout"
    trigger: "/write, viewer.kind = anonymous"
    logic: "div.callout.warn.signin-note with b{auth.gate.title} and auth.gate.writeBody; two .btn.small links: auth.signIn.label to /sign-in?next=/write, auth.gate.register to /register; the composer placeholder or T-306's form is not rendered"
    violation: "A signed-out composer breaks spec §3.7 (no local-only draft)"
    source: "auth-screens-spec.md §3.7, storyboard step 8, FR1, Q1 (A)"
  - id: BR10.2
    statement: "On /write, a signed-in, unverified holder sees the pending banner; the composer renders and its Publish stays disabled with 'Confirm your email to publish'."
    category: constraint
    applies_to: "WriteGateCallout (unverified), T-306 Composer"
    trigger: "/write, viewer.verified = false"
    logic: "PendingVerificationBanner (BR5.7); WriteGateCallout exposes publishDisabledReason = auth.gate.verifyToPublish for T-306"
    violation: "Publish enabled for an unconfirmed account fails AC3.1.4"
    source: "auth-screens-spec.md §3.7, AC3.1.4, FR4"
  - id: BR10.3
    statement: "useAuthGate().guard(fn) runs fn for a verified account, and otherwise opens the gate sheet with the right message."
    category: policy
    applies_to: "useAuthGate, AuthGateProvider"
    trigger: "A contribution control calls guard(fn)"
    logic: "IF viewer.kind = account AND viewer.verified THEN fn() ELSE IF viewer.kind = account THEN open sheet 'unverified' ELSE open sheet 'signedOut' with next = current path"
    violation: "A gate that blocks a verified account, or lets an anonymous one through"
    source: "T-102 step 9, auth-screens-spec.md §3.7, AC3.1.1"
  - id: BR10.4
    statement: "The gate sheet says 'Sign in to take part'; signed out it explains why and offers Sign in and Create an account; unverified it says 'Confirm your email to do this' and links to the confirmation page."
    category: constraint
    applies_to: "AuthGateSheet"
    trigger: "Gate opened"
    logic: "Sheet title auth.gate.title; signedOut: p auth.gate.body + .btn.small links auth.signIn.label (/sign-in?next=) and auth.gate.register (/register); unverified: p auth.gate.verifyToAct + Link /verify-email auth.verifyPending"
    violation: "A redirect surprise instead of the sheet (spec §3.7)"
    source: "auth-screens-spec.md §3.7, D-001 openAuthGate"
  - id: BR10.5
    statement: "One gate sheet exists per page, provided by the patient layout; every component reaches it through useAuthGate."
    category: constraint
    applies_to: "AuthGateProvider in (patient)/layout.tsx"
    trigger: "Every patient page"
    logic: "AuthGateProvider wraps the layout's main content with the viewer; it renders one AuthGateSheet; useAuthGate outside the provider throws a programmer error"
    violation: "Two sheets, or one per control, break focus return and the single live region"
    source: "T-102 step 9, 01-conventions.md §8 (one Sheet implementation)"
  - id: BR10.6
    statement: "The gate is a convenience; the server refuses every contribution command for an anonymous or unverified Actor whatever the UI did."
    category: constraint
    applies_to: "Every gated control (T-202, T-204, T-306, T-402, T-409)"
    trigger: "A no-JavaScript submit or a bypassed gate"
    logic: "Commands keep requires.authenticated and requires.verifiedEmail (T-101 BR2.5); the page re-renders with the command's message"
    violation: "Relying on the client gate is an authorization bypass"
    source: "AC3.1.4, construction.md Security (flag code that bypasses authorization)"
  - id: BR10.7
    statement: "No public page gains a sign-in requirement; only the write, comment, react, report, bookmark, submit-profile and claim actions are gated."
    category: constraint
    applies_to: "All patient pages"
    trigger: "Any change in this Unit"
    logic: "The layout's getActor never redirects; only /me/* renders sign-in guidance"
    violation: "Breaks FR1 and AC3.1.1"
    source: "FR1, AC3.1.1, T-102 hard-rule checklist"

  # 11. Look and motion (FD-091, T-011)
  - id: BR11.1
    statement: "Auth screens use only T-011 tokens and classes; page styles live in T-102's own section of patient.css, each rule marked; a missing token is requested through an ISS row."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-102 section)"
    trigger: "Any style this Unit needs"
    logic: "Append-only section headed for T-102; every rule carries /* added: T-102 <reason> */; values are var(--…) tokens; no edits to tokens or motion rules"
    violation: "A literal colour, an edit in T-011's token block or motion file"
    source: "T-102 FD-091 amendment, project.md Code Style, T-011 BR1.1"
  - id: BR11.2
    statement: "Route transitions between auth pages come from T-011's RouteTransition in the patient layout; auth pages add no wrapper of their own."
    category: constraint
    applies_to: "The five auth pages"
    trigger: "Navigation"
    logic: "IF T-011 shipped the layout-level boundary (its Q4 A) THEN nothing to add ELSE wrap each auth page in RouteTransition (T-011 Q4 B fallback)"
    violation: "A second view-transition name 'page' on one page skips the transition"
    source: "T-102 step 12, T-011 Q4"
  - id: BR11.3
    statement: "Error summaries, inline errors, the pending banner, status messages and every callout carrying hard-rule or privacy wording appear without movement."
    category: constraint
    applies_to: "ErrorSummary, FieldError, PendingVerificationBanner, status callouts, WriteGateCallout"
    trigger: "They render"
    logic: "No Reveal, no entry class, no transition on these elements; focus and announcement are immediate"
    violation: "A sliding error delays focus and announcement (T-102 step 12)"
    source: "T-102 step 12, AC2.4.4, T-011 BR4.6"
  - id: BR11.4
    statement: "The account sheet and the gate sheet enter with T-011's sheet rise and close at once."
    category: constraint
    applies_to: "AccountMenu, AuthGateSheet (shared Sheet)"
    trigger: "Opening"
    logic: "Use the shared Sheet unchanged; T-011's motion.css owns the entry"
    violation: "A custom animation in a T-102 component"
    source: "T-102 step 12, T-011 BR6.7"
  - id: BR11.5
    statement: "The confirmations 'Your email is confirmed' and 'Password changed' show T-011's tick once beside their plain text; nothing else celebrates."
    category: constraint
    applies_to: "VerifyWelcome, ChangePasswordForm status, /sign-in?reset=done callout"
    trigger: "The confirmation renders"
    logic: "<PublishTick>{t(key)}</PublishTick> inside a role=status callout; reduced motion shows the complete tick; no confetti, badge, points or countdown"
    violation: "Gamified confirmation breaks AC2.4.5"
    source: "functional-design-questions.md Q11 (A), T-011 BR6.4 and BR8.1, AC2.4.5"
  - id: BR11.6
    statement: "With reduced motion (system setting or the in-app switch) nothing on these screens moves and every flow completes."
    category: constraint
    applies_to: "All auth screens"
    trigger: "Effective motion is reduced"
    logic: "T-011's guards apply; this Unit adds no motion rule of its own"
    violation: "A flow that needs an animation to finish fails AC2.4.3"
    source: "AC2.4.3, AC2.3.2, T-102 acceptance 'reduced-motion journey'"
  - id: BR11.7
    statement: "Every control is at least 44 by 44 px with T-011's focus ring; nothing overflows horizontally at 360 px or 200% zoom in either language."
    category: constraint
    applies_to: "All auth screens, the sessions table, the account sheet"
    trigger: "Rendering at any width"
    logic: "Buttons, links styled as buttons, checkboxes' labels, radios' labels and the Show button meet --target; below 30 rem the sessions table stacks each row as a labelled block (T-102 section)"
    violation: "Overflow at 360 px fails AC2.3.1 and the FD-053 acceptance row"
    source: "T-011 BR3.3 and BR3.5, AC2.3.1, NFR4"
  - id: BR11.8
    statement: "/register and /verify-email show a static three-step joining strip; /me?welcome=1 marks the last step."
    category: constraint
    applies_to: "JourneySteps"
    trigger: "Rendering those pages"
    logic: "nav aria-label auth.journey.label > ol > li ×3 (auth.journey.create, auth.journey.confirm, auth.journey.start); aria-current=step on the current one; a span.sr-only auth.journey.stepOf {step, total} with Bengali digits; never animated"
    violation: "A moving or timed progress indicator"
    source: "functional-design-questions.md Q12 (A)"

  # 12. Language and copy
  - id: BR12.1
    statement: "Every string on these screens is a message key present in en and bn; every new key is added to both files in one commit and flagged for the owner's Bengali review."
    category: constraint
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Any new or changed string"
    logic: "The keys in frontend-components.md § 6 are added; changed keys (errors.auth.rateLimited en plural, errors.auth.accountSuspended en and bn) are listed in the hand-off"
    violation: "A key without Bengali is a build failure (pnpm i18n:check)"
    source: "project.md Mandated (both languages, same commit), FD-042, NFR7"
  - id: BR12.2
    statement: "Numbers and dates follow the active language: formatNumber and formatDate, never hard-coded digits or month names."
    category: constraint
    applies_to: "Rate-limit copy, session dates, step counter, unread count"
    trigger: "Rendering a number or date"
    logic: "formatNumber(n, locale); formatDate(isoDate, locale) on the date part of firstSeen and lastSeen; formatRelative is not used (its words are not keys, finding F13)"
    violation: "Latin digits on a Bengali page break FD-024"
    source: "project.md Mandated (numerals follow the active language), 01-conventions.md §6"
  - id: BR12.3
    statement: "No text on these screens is uppercased or letter-spaced in Bengali."
    category: constraint
    applies_to: "Kicker, labels, table headers, badges"
    trigger: "Rendering under :lang(bn)"
    logic: "T-011's :lang(bn) resets apply; T-102's section adds no text-transform"
    violation: "Breaks the Bengali typography hard rule"
    source: "project.md Mandated (no capital-letter transform in Bengali), T-011 BR2.2"
  - id: BR12.4
    statement: "Error copy starts with the field it concerns and says how to fix it."
    category: constraint
    applies_to: "All errors.auth.* field keys"
    trigger: "Writing or changing a key"
    logic: "Pattern '<Field>: <what to do>' as the existing keys do"
    violation: "'Invalid input' gives no way forward (FR95 meaningful errors)"
    source: "auth-screens-spec.md §2 ('each starts with the field name'), FR95"

  # 13. Privacy and safety
  - id: BR13.1
    statement: "No email, password, token or form value appears in a URL (other than the emailed token link), a log line, an analytics call or a view model."
    category: constraint
    applies_to: "All wrappers and pages"
    trigger: "Any request"
    logic: "Wrappers never log input; errors are logged by T-101 with allowlisted fields; the pending address travels only in rk.pending (BR13.4); tokens are removed from the address bar after hydration (BR5.6)"
    violation: "Private data in logs or URLs (S1)"
    source: "01-conventions.md §11, 03 §2, Q3 (A)"
  - id: BR13.2
    statement: "View models on these screens carry no account id and no email; the holder's own email is shown only if the owner adopts Question 4 A or B through an FD entry."
    category: constraint
    applies_to: "Viewer, SecurityVM, PendingBannerVM"
    trigger: "Building a view model"
    logic: "Q4 C (current): no address field exists; Q4 A: ownEmail only in SecurityVM and PendingBannerVM, only for the signed-in holder, only on noindex /me/* and /write, response not cached"
    violation: "An address in a view model without the FD entry breaks 03 §2"
    source: "03 §2, functional-design-questions.md Q4 (open)"
  - id: BR13.3
    statement: "Register, resend, reset and sign-in copy never confirms whether an email is registered."
    category: policy
    applies_to: "Copy of the anonymous flows"
    trigger: "Any outcome"
    logic: "Only neutral keys: auth.verify.body / bodyNoEmail, auth.verify.resent, auth.reset.sent, errors.auth.invalidCredentials"
    violation: "Enumeration (S1)"
    source: "auth-screens-spec.md binding rules, FD-013, T-102 hard-rule checklist"
  - id: BR13.4
    statement: "The pending-address cookie rk.pending is HttpOnly, SameSite Lax, Secure on https, path /, 30 minutes, holds only the normalised address, and is cleared by sign-in, verification and sign-out."
    category: constraint
    applies_to: "registerFormAction, resendVerificationFormAction, signInFormAction, verifyEmailFormAction, signOutFormAction"
    trigger: "Set or clear"
    logic: "Set on register ok and renewed on resend ok; read only by the /verify-email page on the server; deleted on the three clearing actions"
    violation: "A readable or long-lived cookie with an address"
    source: "functional-design-questions.md Q3 (A)"
  - id: BR13.5
    statement: "Every state change on these screens is a POST to a server action; no GET request changes state."
    category: constraint
    applies_to: "All auth flows"
    trigger: "Any change"
    logic: "Verification (BR5.3), reset, sign-out (BR7.1) and sign out everywhere are form posts; Next's server-action origin check and T-101's trustedOrigins and SameSite Lax cookie stand against cross-site posts"
    violation: "A GET that signs in or out is open to link scanners and cross-site triggers"
    source: "T-101 BR4.2 (CSRF), Q2 (A)"
  - id: BR13.6
    statement: "Only synthetic data appears in tests, fixtures and screenshots of these screens."
    category: constraint
    applies_to: "Tests and records"
    trigger: "Writing a test"
    logic: "Addresses such as shirin.demo@example.test or *@demo.rogikotha.local; seeded names from the corpus"
    violation: "Real personal data breaks a hard rule"
    source: "project.md Forbidden (no real personal data)"

  # 14. Verification and records
  - id: BR14.1
    statement: "Component tests cover every form and component in en and bn; action tests cover the wrappers and the next sanitiser; every test can fail."
    category: validation
    applies_to: "apps/web/src/components/patient/auth/*.test.tsx, server/actions/account.*.test.ts"
    trigger: "Code Generation"
    logic: "The tests listed in frontend-components.md § 8, using builders and synthetic data; names read as sentences"
    violation: "A missing test level fails the definition of done"
    source: "team.md Testing Posture, 01-conventions.md §10, T-102 'Tests to write'"
  - id: BR14.2
    statement: "The Unit adds at least one smoke assertion and the Playwright register-to-welcome spec; pnpm smoke keeps every earlier assertion."
    category: validation
    applies_to: "auth.smoke.test.tsx, apps/web/e2e/smoke/auth.spec.ts"
    trigger: "Code Generation and Build and Test"
    logic: "Vitest smoke: the five auth pages render their h1 in en and bn and the account entry renders signed out; Playwright (T-011's config): register -> Mailpit API -> confirm button -> /me welcome"
    violation: "Removing or skipping a smoke assertion without a recorded reason"
    source: "team.md Testing Posture (cumulative smoke), T-102 'Smoke e2e'"
  - id: BR14.3
    statement: "The UI gates pass before the Unit is done: pnpm check, pnpm smoke, check:motion, impeccable detect and both contrast runs."
    category: validation
    applies_to: "The Unit"
    trigger: "Build and Test"
    logic: "All exit 0 with zero findings; the coverage floor applies to apps/web once T-010 enforces it"
    violation: "Any red gate blocks the merge"
    source: "team.md Way of Working steps 2-3, T-102 acceptance rows, 01-conventions.md §7.8"
  - id: BR14.4
    statement: "Before building, the dependency-check log gets a dated entry for next, react and next-intl covering useActionState forms and progressive enhancement."
    category: policy
    applies_to: "docs/status/dependency-check-log.md"
    trigger: "Start of Code Generation"
    logic: "The 2026-09-13 entries are older than 3 days; re-check stable releases and known form-action issues; append the entry; no new package is added"
    violation: "Skipping the check breaks the AGENTS.md rule"
    source: "project.md Mandated (dependency check), AGENTS.md"
  - id: BR14.5
    statement: "As a high-risk Unit it runs with collaborators on, gets 3–5 adversarial tests from a separate agent and the owner's written sign-off."
    category: policy
    applies_to: "The Unit"
    trigger: "Build and Test"
    logic: "Adversarial angles in functional-spec.md § 8.2"
    violation: "Merging without them breaks team practice step 5"
    source: "team.md Way of Working step 5, project.md Mandated"
  - id: BR14.6
    statement: "Code Generation starts only after the owner's D-001 content and flow approval is recorded in this Unit's record; the Unit closes only after the owner's review of the built screens on the T-011 look."
    category: policy
    applies_to: "The Unit's record"
    trigger: "Code Generation entry; Unit close"
    logic: "Both approvals dated, covering en and bn, both themes and 360 px (the second); recorded in the record, not in chat"
    violation: "Building without the first or closing without the second breaks FD-053 and the FD-091 acceptance row"
    source: "FD-053, T-102 acceptance rows FD-053 and FD-091, functional-design-questions.md Q13 (A)"
  - id: BR14.7
    statement: "Files changed outside the owned paths are listed in the plan and the hand-off with one ISS row; every finding, workaround and assumption gets an ISS row linked to U9."
    category: policy
    applies_to: "docs/implementation/ISSUES.md, hand-off"
    trigger: "Code Generation and Build and Test"
    logic: "Owned-path additions of functional-spec.md § 11; findings F1-F16 of functional-design-questions.md; ASSUMPTION(T-102) markers in code"
    violation: "An unrecorded change outside owned paths"
    source: "project.md Mandated (ISS rows), team.md Way of Working, Q1 (A)"
```

## Rules summary

| ID | Rule in one line |
|---|---|
| BR1.1 | Server-action forms with `useActionState`; work without JavaScript |
| BR1.2 | Typed values come back after a failure; passwords never |
| BR1.3 | Error summary at the top, announced and focused |
| BR1.4 | Inline error under the field, named and linked |
| BR1.5 | Server decides; no `required`, no blur validation |
| BR1.6 | Fixed field and error ids |
| BR1.7 | `type` and `autocomplete` hints |
| BR1.8 | No double submit |
| BR1.9 | Focus: summary after failure, `h1` after client arrival |
| BR1.10 | "Error:" title prefix |
| BR1.11 | `noindex`; shell marker and disclaimer kept |
| BR1.12 | Errors shown through message keys |
| BR1.13 | Own `a-head`, one `h1` |
| BR2.1 | Show/Hide text, named, announced, no `aria-pressed` |
| BR2.2 | Toggle after hydration; hidden again on submit |
| BR2.3 | Password hint; no meter; no `maxlength` |
| BR2.4 | Confirmation compared before the command |
| BR3.1 | Seven register fields in order |
| BR3.2 | Native language radios, default route locale |
| BR3.3 | `@username` preview |
| BR3.4 | Terms and Privacy open in a new tab |
| BR3.5 | Always the pending screen, in the chosen language |
| BR3.6 | Username taken is the only real conflict |
| BR3.7 | Signed-in visitors leave register and sign-in |
| BR3.8 | Field error key catalogue |
| BR4.1 | Sign-in page and its status callouts |
| BR4.2 | One generic credentials error |
| BR4.3 | `next` sanitiser |
| BR4.4 | Success clears the pending cookie, goes to `next` or `/me` |
| BR4.5 | Suspended copy without appeal route |
| BR4.6 | Rate-limit copy in seconds or minutes |
| BR4.7 | No outcome differs by account existence |
| BR5.1 | Pending panel |
| BR5.2 | Neutral resend |
| BR5.3 | Confirm button; nothing on opening the link |
| BR5.4 | Success to `/me?welcome=1`; expired offers resend |
| BR5.5 | Welcome only for a verified Actor |
| BR5.6 | Token pages: no referrer, token removed from the address bar |
| BR5.7 | Pending banner for signed-in unverified (no address until Q4) |
| BR6.1 | Neutral reset request |
| BR6.2 | Set form with hidden token |
| BR6.3 | Success to sign-in; expired offers a new request |
| BR7.1 | Sign-out is a POST server action |
| BR7.2 | Stay on the public page; announce |
| BR7.3 | Device cookie untouched |
| BR8.1 | Account entry placement and style |
| BR8.2 | Signed out: link with `next` |
| BR8.3 | Signed in: sheet with the menu |
| BR8.4 | Unverified dot plus text |
| BR8.5 | Grapheme initials |
| BR8.6 | Unread count only when real |
| BR8.7 | Viewer without id or email |
| BR9.1 | Security page structure; gate panel when signed out |
| BR9.2 | Email section (no address until Q4) |
| BR9.3 | Change password |
| BR9.4 | Active sessions only (FD-057) |
| BR9.5 | Sign out everywhere with confirmation |
| BR9.6 | Data link to `/me` |
| BR9.7 | Localised device label |
| BR10.1 | `/write` signed out: gate callout, no composer |
| BR10.2 | `/write` unverified: banner, Publish disabled |
| BR10.3 | `guard(fn)` |
| BR10.4 | Gate sheet content |
| BR10.5 | One gate sheet from the layout |
| BR10.6 | Server stays the authority |
| BR10.7 | Reading never gated |
| BR11.1 | T-011 tokens only; own CSS section |
| BR11.2 | Route transition from the layout |
| BR11.3 | Errors and hard-rule callouts never move |
| BR11.4 | Sheet entry from T-011 |
| BR11.5 | One tick beside two confirmations |
| BR11.6 | Reduced motion: still, and complete |
| BR11.7 | 44 px targets; no overflow |
| BR11.8 | Static joining strip |
| BR12.1 | Both dictionaries; Bengali flagged |
| BR12.2 | Numbers and dates by locale |
| BR12.3 | No Bengali uppercase |
| BR12.4 | Error copy names the field |
| BR13.1 | No private data in URLs, logs or view models |
| BR13.2 | No id or email in view models (Q4 open) |
| BR13.3 | Anti-enumeration copy |
| BR13.4 | `rk.pending` cookie |
| BR13.5 | No state change on GET |
| BR13.6 | Synthetic data only |
| BR14.1 | Component and action tests |
| BR14.2 | Smoke and Playwright spec |
| BR14.3 | UI gates |
| BR14.4 | Dependency re-check |
| BR14.5 | High-risk extras |
| BR14.6 | Two owner gates |
| BR14.7 | Records and ISS rows |
