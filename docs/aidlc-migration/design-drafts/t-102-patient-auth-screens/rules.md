# Business rules — U9 `t-102-patient-auth-screens`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-102-patient-auth-screens/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U9), `unit-of-work-story-map.md` (US3.1, US3.2), `requirements.md` (FR1–FR9, FR91, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5; AC2.3.1–AC2.3.4, AC2.4.3–AC2.4.5 and AC12.1.6 for reference), T-102 with its FD-091, FD-053 and FD-057 amendments, `auth-screens-spec.md` §1–§3, §5, §6, the D-001 prototype, the T-101 draft (actions, Actor, codes) and the T-011 draft (tokens, motion, static set), FD-024, FD-042, FD-057, FD-058, FD-059, FD-063, FD-088, FD-091 and the hard rules in `project.md`. The entities these rules govern are in `entities.md`, the components in `frontend-components.md`, and the workflows and state transitions in `functional-spec.md`.

Refreshed 2026-10-29: Question 4 is answered B by the owner (masked own email, FD-095), so BR5.2, BR5.7, BR9.2 and BR13.2 follow B. Questions 14 and 15 were decided by the agent under the owner's no-questions instruction of 2026-10-29. The T-010 boundaries and tests (FD-093, `pages.test.tsx`, `layouts.test.tsx`, coverage, CI) and the refreshed T-011 and T-101 drafts are applied. Changed rules: BR1.6, BR1.10, BR1.11, BR3.8, BR4.1, BR5.1, BR5.2, BR5.4, BR5.5, BR5.7, BR6.1, BR8.3, BR8.5, BR8.7, BR9.2, BR9.3, BR11.1, BR11.5, BR12.1, BR13.2, BR14.1, BR14.2 and BR14.3. New rules: BR1.14, BR4.8, BR14.8 and BR14.9.

Rules that depend on a question name it in `source`. Questions 1–3 and 5–13 are answered A on the owner's standing instruction of 2026-10-27, awaiting confirmation; Question 4 is answered B by the owner (2026-10-28); Questions 14 and 15 are answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29. `functional-spec.md` § 10 lists what changes under every other option.

Terms: "the wrapper" is the form-facing server action this Unit adds in `apps/web/src/server/actions/account.ts` around T-101's action (`FormData → input → T-101 action → FormState`). "Locale-free path" is a path without the `/en` or `/bn` prefix, as `@/i18n/routing` `usePathname()` returns it. "Announced" means spoken once through the existing `useAnnounce()` live region (CR-004 BR4.3), never through a second live region.

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
    logic: "Each route renders one form with these ids (the security page's change-password form uses the three password ids; nothing else on that page reuses them; the pending banner's own resend has no field); summary links point at these ids"
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
    logic: "IF the state carries errors THEN focus the summary ELSE IF the page was reached by client navigation (not the first document load) THEN focus its arrival callout when it has one (BR4.1), else its h1 ELSE do nothing (the skip link stays the first stop)"
    violation: "Focus left on a link that no longer exists, or stolen on first load, fails the 'Focus' acceptance row"
    source: "auth-screens-spec.md §2, T-102 acceptance 'Focus'"
  - id: BR1.10
    statement: "When a form renders with errors, the document title is prefixed with 'Error:' in the active language; generateMetadata always returns the plain title."
    category: constraint
    applies_to: "ErrorSummary (renders the title); generateMetadata of the five auth pages (plain title)"
    trigger: "FormState.status is 'error'"
    logic: "generateMetadata returns documentTitle(view) and takes no argument it needs (pages.test.tsx calls it with none and asserts the plain title); ErrorSummary renders <title>{t('auth.errorTitle', {title: documentTitle(view)})}</title> while the state has errors, which React 19 hoists into the head on the server render (no JavaScript) and on the client; the plain title returns when the summary unmounts; IF the WF0 spike shows the metadata title winning THEN the summary sets document.title in an effect only, and the no-JavaScript gap is an ISS row"
    violation: "A screen-reader user loading the re-rendered page without JavaScript hears nothing about the failure; a prefix in generateMetadata cannot see the action's state and turns pages.test.tsx red"
    source: "AC2.3.4 (announced to screen readers), GOV.UK error-message pattern, apps/web/src/app/pages.test.tsx (T-010), functional-spec.md D15"
  - id: BR1.11
    statement: "Every auth page and every /me/* page is noindex and keeps the shell's demo marker, disclaimer and emergency link."
    category: constraint
    applies_to: "/register, /sign-in, /verify-email, /reset-password, /me/security"
    trigger: "Rendering"
    logic: "generateMetadata spreads noindex() so robots equals {index: false} exactly (pages.test.tsx); /verify-email and /reset-password also set referrer 'no-referrer' always, so their metadata reads no searchParams (BR5.6); /write keeps no robots field (indexable, Q14); the patient layout's DemoMarker and Colophon (with disclaimer.short) render unchanged"
    violation: "An indexable auth page fails the 'noindex' row; a robots value other than {index: false} fails the route-table test; a missing disclaimer breaks a hard rule"
    source: "01-conventions.md §8, project.md Mandated (disclaimer, demo marker), T-102 hard-rule checklist, apps/web/src/app/pages.test.tsx (T-010)"
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
    logic: "<ViewShell view=… title=''> then <AuthHead kicker=auth.kicker title=titleForView(view, t) lede=…>, so the one h1 reads auth.register.title, auth.signIn.title, auth.verify.title, auth.reset.title or auth.security.title (the security page's signed-out panel too), which the route-table test asserts for these rows"
    violation: "Two h1 elements, or none, is an axe failure (ISS-121 precedent); an h1 with other text fails pages.test.tsx"
    source: "auth-screens-spec.md §2 layout, ViewShell ASSUMPTION(T-207a), AC12.1.6, apps/web/src/app/pages.test.tsx (T-010)"
  - id: BR1.14
    statement: "Every file sits where the T-010 boundaries allow: components import server actions and nothing else under server/; a 'use server' module exports only async functions; the synchronous helpers live in apps/web/src/lib/; the viewer is built in an app/ module."
    category: constraint
    applies_to: "server/actions/account.ts, lib/{next-path,auth-form-state,initials,cookies}.ts, app/[locale]/(patient)/viewer.ts, every component in the owned paths"
    trigger: "Code Generation and pnpm lint"
    logic: "server/actions/account.ts ('use server', element web-actions): the ten wrappers as async exports, plus non-exported helpers; type exports are allowed. lib/next-path.ts: sanitiseNext. lib/auth-form-state.ts: the AuthFormState type, INITIAL_AUTH_FORM_STATE and toFormState. lib/initials.ts: initials(). lib/cookies.ts: PENDING_EMAIL_COOKIE and readPendingEmail(). These lib files are element web-shared, which imports contracts and i18n only and carries the component limits. app/[locale]/(patient)/viewer.ts (element web): loadViewer() and loadOwnAccount(), cache()-wrapped, which may import server/auth.ts and the actions. Components receive the viewer, the view models and the cookie value as props and never import server/auth.ts, container.ts, database, adapters or test-support. Builders sit in *-test-support.ts files beside the tests"
    violation: "A non-async export from a 'use server' file fails next build; a component importing server/auth.ts fails pnpm lint (FD-093 (1)); an import of @rogikotha/test-support in apps/web fails lint (FD-040)"
    source: "FD-093 (1), (5), (6), eslint.boundaries.mjs, Next.js server-action module rule, functional-spec.md D13"

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
    logic: "The wrapper renders the messageKey T-101 sends; T-101's validation field errors name exactly these keys (ENT-004, T-101 BR1.1); T-101 adds errors.auth.emailInvalid, passwordTooLong, passwordEqualsEmail and displayNameRequired to both dictionaries with this Unit's proposed copy, so this Unit adds none of them and checks they are present (WF0 step 3)"
    violation: "A field error without a key falls back to native validation (ISS-020) or to a generic message"
    source: "AC3.1.3, ISS-020, T-101 BR1.1 and Q7, T-101 functional-design-questions.md (field-error keys)"

  # 4. Sign-in
  - id: BR4.1
    statement: "The sign-in page has email and password, the links 'Forgot your password?' and 'New here? Create an account', and shows one confirmation callout when it arrives from a reset or a sign-out everywhere. Confirmation callouts on every auth screen are plain callouts: one that greets an arrival takes focus, one that replaces a form after an action is announced, and none carries a live-region role."
    category: constraint
    applies_to: "SignInForm, /sign-in page, StatusCallout everywhere (reset done, signed out everywhere, welcome, resent, reset sent, password changed)"
    trigger: "Rendering /sign-in; a confirmation renders"
    logic: "IF searchParams.reset = done THEN StatusCallout auth.reset.done (with the confirmation tick, BR11.5); IF searchParams.signedOut = all THEN StatusCallout auth.security.signedOutAll; links to /reset-password and /register (register carries next). StatusCallout = div.callout without role; arrival mode (reset done, signed out everywhere, welcome on /me): tabIndex=-1 and focused on mount instead of the h1 (BR1.9); in-place mode (resent, reset sent, password changed, the sign-out on a public page): useAnnounce()(text) once when the done state appears; without JavaScript the re-rendered page shows the callout as the first content after the heading"
    violation: "A missing confirmation leaves the person unsure the reset worked; role=status adds a second live region beside CR-004's (T-011 BR6.4)"
    source: "auth-screens-spec.md §3.3 and §3.4, T-102 step 5, Q7 (A), CR-004 BR4.3, T-011 BR6.4 and WF6, functional-spec.md D14"
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
  - id: BR4.8
    statement: "When the request's Actor carries a refusal (a session of an account that was suspended or banned after it signed in), /sign-in shows the suspended message above the form; nothing else changes."
    category: policy
    applies_to: "/sign-in page"
    trigger: "getActor() returns an anonymous Actor with refusal set"
    logic: "IF actor.kind = anonymous AND actor.refusal is set THEN render div.callout.warn errors.auth.accountSuspended (the Q6 A copy, no appeal route, no link) above SignInForm; the masthead shows the signed-out entry; no account detail, name or date is shown; the form works as usual"
    violation: "A person whose session silently ended does not know why; naming an appeal route breaks FD-088"
    source: "T-101 entities Actor.refusal and BR4.3, FD-088, functional-design-questions.md Q15 (A), functional-spec.md D16"

  # 5. Verify email
  - id: BR5.1
    statement: "Without a token, /verify-email shows the pending panel: the typed address (from the pending cookie, anonymous visitors only) or the no-address text, the 24-hour note, the Resend form and, outside production, a link to the local inbox."
    category: constraint
    applies_to: "VerifyEmail (pending state)"
    trigger: "No token in the URL"
    logic: "body = (viewer anonymous AND readPendingEmail()) ? auth.verify.body {email in b} : auth.verify.bodyNoEmail; a signed-in holder's masked address is not shown here (FD-095 allows it only in SecurityVM and the /me banner); callout auth.verify.expires; ResendForm in the mode of BR5.2; IF process.env.APP_MODE !== 'production' THEN a[href=http://localhost:8025]{auth.verify.devInbox} rendered on the server"
    violation: "A dev inbox link in production, an address taken from the URL, or a masked address outside the two FD-095 places"
    source: "auth-screens-spec.md §3.2, T-102 step 3, Q3 (A), Q4 (B, owner), FD-095, T-102 test 'VerifyEmail shows the dev inbox link only when APP_MODE !== production'"
  - id: BR5.2
    statement: "Resend always answers 'A new link is on its way' or the rate-limit message, never anything about the account; an anonymous visitor resends to the cookie's or a typed address, a signed-in holder to the account's own address without typing it."
    category: policy
    applies_to: "ResendForm, resendVerificationFormAction, resendOwnVerificationFormAction"
    trigger: "Submit"
    logic: "mode pending (anonymous, rk.pending known): hidden email input, resendVerificationFormAction; mode typed (anonymous, no cookie): visible f-email input, same wrapper; mode own (account Actor): no address field and no hidden address, resendOwnVerificationFormAction -> account.resendOwnVerification {} (T-101 WF15, 3 per hour per account); ok -> the auth.verify.resent callout, announced (BR4.1); rate limited -> BR4.6; the pending cookie's lifetime is renewed in the two anonymous modes only"
    violation: "A different answer for an unknown or already-confirmed address is enumeration; posting the masked address to the anonymous resend would get the neutral ok and send nothing (T-101 F24, S2)"
    source: "auth-screens-spec.md §3.2, AC3.1.4 (rate-limited resend), T-101 WF3, WF15 and BR2.7, Q4 (B, owner), FD-095"
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
    logic: "ok -> delete rk.pending; redirect /<locale>/me?welcome=1 (T-101's verify action sets the session cookie); auth.token_expired or auth.token_invalid -> state error with auth.verify.expired and a ResendForm in the mode BR5.2 picks for the viewer"
    violation: "A failed confirmation with no way to ask for a new link fails AC3.1.4"
    source: "AC3.1.4, auth-screens-spec.md §3.2, T-101 WF2"
  - id: BR5.5
    statement: "/me?welcome=1 shows 'Your email is confirmed' only when the signed-in Actor's email is verified."
    category: validation
    applies_to: "VerifyWelcome on /me"
    trigger: "Rendering /me"
    logic: "IF searchParams.welcome = '1' AND actor.kind = account AND actor.emailVerified THEN StatusCallout auth.verify.done in arrival mode (focused, BR4.1) with the confirmation tick ELSE nothing"
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
    statement: "A signed-in, unverified holder sees the pending banner on /me and /write; on /me it shows the holder's own address masked, on /write no address, and in both a Resend button that needs no address."
    category: constraint
    applies_to: "PendingVerificationBanner"
    trigger: "actor.kind = account AND NOT actor.emailVerified"
    logic: "/me: PendingBannerVM.ownEmailMasked = loadOwnAccount().emailMasked; callout.warn with auth.verify.body {email: ownEmailMasked} (plain text, no b, never a link). /write: ownEmailMasked absent; auth.verify.bodyNoEmail (Q14 A: /write is indexable and FD-095 allows the mask only on noindex pages). Both: ResendForm in own mode (BR5.2); static, never animated (BR11.3); IF loadOwnAccount fails THEN the /me banner falls back to the /write form"
    violation: "A full address, or a masked address on an indexable page, breaks 03 §2 as amended by FD-095 (S1, private data); a banner whose Resend needs a typed address cannot use the mask it shows"
    source: "auth-screens-spec.md §3.2 and §3.7, functional-design-questions.md Q4 (B, owner, 2026-10-28) and Q14 (A), FD-095, T-101 BR2.7 and BR4.10"

  # 6. Reset password
  - id: BR6.1
    statement: "A reset request always shows the same neutral panel, whatever the address."
    category: policy
    applies_to: "ResetRequestForm"
    trigger: "Submit"
    logic: "ok -> replace the form with StatusCallout auth.reset.sent, announced (BR4.1); rate limited -> BR4.6 with the form kept; no other branch"
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
    logic: "button#account.ctl.account aria-haspopup=dialog aria-expanded data-verified; Sheet title = viewer.displayName (auth.kicker when absent, BR8.5); ul of Links, each with data-press (T-011 BR6.11): /verify-email auth.verifyPending, /me nav.mine, /saved mine.bookmarks, /notifications mine.notifications, /me/security auth.security.nav, /admin nav.admin (only when viewer.staff, which stays false until T-103 sets staffRole behind its device gate); SignOutForm button auth.signOut. A list of links, not role=menu"
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
    statement: "Initials are the first grapheme of the first and last words of the holder's display name, so Bengali names never split a cluster; without a display name the entry shows the person glyph."
    category: constraint
    applies_to: "initials() in lib/initials.ts, used by toViewer() in viewer.ts"
    trigger: "Building the viewer"
    logic: "displayName = OwnAccountVM.displayName (AccountProfile.display_name; the Actor carries no persona, T-101 BR4.3 and BR4.10); drop a leading 'Dr.' or 'ডা.'; split on whitespace; take the first grapheme (Intl.Segmenter granularity grapheme) of the first word and of the last word when there are two or more; no case transform. IF account.getOwnAccount returned err THEN displayName and initials are absent: the button shows Icon person, its name is auth.accountMenu {name: t('auth.kicker')} (auth.accountMenuUnverified when unverified) and the sheet title is auth.kicker"
    violation: "charAt(0) shows a lone vowel sign or half a conjunct in Bengali; a failed own-account read must not break every patient page"
    source: "D-001 initials(), FD-024, project.md Mandated (no capital-letter transform in Bengali), T-101 BR4.10, T-104 F9"
  - id: BR8.6
    statement: "The menu shows an unread count only for a number above zero supplied by T-405; before T-405 nothing shows."
    category: constraint
    applies_to: "AccountMenu Notifications item"
    trigger: "viewer.unreadCount"
    logic: "IF typeof unreadCount === 'number' AND unreadCount > 0 THEN span.count formatNumber(unreadCount, locale) ELSE nothing"
    violation: "Showing 0 for a value nobody computed breaks the hard rule"
    source: "project.md Forbidden (missing value never 0), T-405 owned 'unread count hunk'"
  - id: BR8.7
    statement: "The viewer is built once per request from getActor() and the holder's own account view, and carries no account id and no email in any form, masked included."
    category: constraint
    applies_to: "Viewer (ENT-001), viewer.ts loadViewer(), patient layout"
    trigger: "Every patient request"
    logic: "loadViewer = cache(async () => {actor = await getActor(); own = actor.kind === 'account' ? await getOwnAccountAction() : null; return toViewer(actor, own)}); toViewer -> {kind, displayName: own?.displayName, initials, verified: actor.emailVerified === true, staff: actor.staffRole !== undefined, unreadCount?: undefined}; own.emailMasked and own.username are dropped here; loadOwnAccount() returns the same cached own view to /me and /me/security; the viewer is passed as a prop and never serialised with accountId, personaId, status, capabilities, refusal or an address"
    violation: "An account id or any form of the email in the client payload of every page breaks 03 §2 and FD-095"
    source: "T-102 step 7, 03 §2, FD-095, 01-conventions.md §5, T-101 BR4.3 and BR4.10"

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
    statement: "The email section shows the holder's own address masked, the confirmed state and the note that changing the email is not available."
    category: constraint
    applies_to: "SecuritySettings email section"
    trigger: "Rendering"
    logic: "h4 auth.security.email; p.own-email with SecurityVM.ownEmailMasked as plain text (for example s****@example.test: first grapheme of the local part, ****, @, the domain; made by T-101's account.getOwnAccount, never by this Unit); then auth.security.verified or auth.security.unverified (as a badge with text) from SecurityVM.emailVerified; p.note auth.security.emailNote. The full address never reaches the page, its props or its payload; the response is rendered per request, noindex, never cached"
    violation: "A full address, or another account's address, in SecurityVM breaks 03 §2 as amended by FD-095 (S1)"
    source: "auth-screens-spec.md §3.6, 03 §2, FD-095, functional-design-questions.md Q4 (B, owner, 2026-10-28), T-101 BR4.10"
  - id: BR9.3
    statement: "Changing the password needs the current password and a new one entered twice; success says other devices were signed out."
    category: policy
    applies_to: "ChangePasswordForm, changePasswordFormAction"
    trigger: "Submit"
    logic: "BR2.4 first; T-101 auth.invalid_credentials -> fieldErrors.currentPassword errors.auth.invalidCredentials; password codes per BR3.8; rate limited per BR4.6; ok -> StatusCallout auth.security.passwordChanged with the confirmation tick, announced (BR4.1), fields cleared"
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
    statement: "Auth screens use only T-011 tokens and classes; page styles live in T-102's own section of patient.css, each rule marked; a missing token is requested through an ISS row; pressable rows get press feedback through data-press, never a rule of their own."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-102 section); AccountMenu rows, WorkspaceNav links"
    trigger: "Any style this Unit needs"
    logic: "Append-only section headed for T-102; every rule carries /* added: T-102 <reason> */; colours, radii, targets and the focus ring are var(--…) tokens; every margin, padding and gap uses --space-1…--space-8 (a calc() or clamp() of them), reading widths --measure (T-011 BR3.6); no edits to tokens or motion rules; no transition, animation, keyframes or view-transition rule (check:motion M6-file); no :hover rule with transform, translate, scale or rotate (M9-hover); no column-0 :root[data-theme=\"dark\"] { block: a dark variant continues its selector (:root[data-theme=\"dark\"] .x {) or, better, needs none because the tokens switch (M10-tokens); the section is Prettier-formatted with double-quoted attribute selectors (T-011 BR9.8, pnpm format:check); the account-menu rows and the WorkspaceNav links carry data-press (T-011 BR6.11); .btn, .ctl and .opt already get the press primitive"
    violation: "A literal colour or spacing, an edit in T-011's token block or motion file, a hover lift, a second dark token block or an unformatted rule turns check:motion, contrast:patient or format:check red"
    source: "T-102 FD-091 amendment, project.md Code Style, T-011 BR1.1, BR1.8, BR3.6, BR4.7, BR6.5, BR6.11 and BR9.8"
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
    logic: "<PublishTick>{t(key)}</PublishTick> inside StatusCallout (no live-region role); PublishTick does not announce, so the callout speaks or takes focus as BR4.1 says (password changed: announced; email confirmed and reset done: focused on arrival); reduced motion shows the complete tick; no confetti, badge, points or countdown"
    violation: "Gamified confirmation breaks AC2.4.5; a second live region breaks T-011 BR6.4 and CR-004 BR4.3"
    source: "functional-design-questions.md Q11 (A), T-011 BR6.4, WF6 and BR8.1, AC2.4.5"
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
    logic: "The keys in frontend-components.md § 6 are added, with both files formatted by Prettier; changed keys (errors.auth.rateLimited en plural, errors.auth.accountSuspended en and bn) are listed in the hand-off; the four field-error keys of ENT-004 that are missing on main are T-101's (BR3.8)"
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
    statement: "View models on these screens carry no account id and no full email; the holder's own address appears only masked, only in SecurityVM on /me/security and in PendingBannerVM on /me, as FD-095 allows."
    category: constraint
    applies_to: "Viewer, SecurityVM, PendingBannerVM, every other view model and prop of this Unit"
    trigger: "Building a view model"
    logic: "ownEmailMasked comes only from T-101's account.getOwnAccount (OwnAccountVM.emailMasked), for the signed-in holder's own account, on noindex pages rendered per request and never cached (/me/security and /me); the Viewer, the masthead, /write, /verify-email and every public page carry no form of the address; this Unit never masks, slices or logs an address itself; FD-095 (T-101's masked-own-email row, under whatever number it is appended with) must be in docs/status/decision-log.md before this Unit's code (WF0 step 1)"
    violation: "A full address, a masked address outside the two places, or another account's address in a view model breaks 03 §2 as amended by FD-095 (S1, private data)"
    source: "03 §2, FD-095 (proposed by T-101, appended before its code), functional-design-questions.md Q4 (B, owner, 2026-10-28) and Q14 (A)"
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
    logic: "Name PENDING_EMAIL_COOKIE and reader readPendingEmail() in lib/cookies.ts (BR1.14); set on register ok and renewed on an anonymous resend ok; read only by the /verify-email page on the server; deleted on the three clearing actions"
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
    logic: "The tests listed in frontend-components.md § 8, using builders and synthetic data; names read as sentences; builders live in *-test-support.ts files beside the tests (test category, excluded from coverage), never in @rogikotha/test-support (FD-040); a component test that renders a form mocks @/server/actions/account, so no T-101 server module loads under jsdom; the T-011 next/font/local mock in vitest.setup.ts covers any test that renders the locale layout"
    violation: "A missing test level fails the definition of done; a test-support import in apps/web fails lint"
    source: "team.md Testing Posture, 01-conventions.md §10, T-102 'Tests to write', FD-040, FD-093 (5), T-011 BR9.9"
  - id: BR14.2
    statement: "The Unit adds at least one smoke assertion and the Playwright register-to-welcome spec; pnpm smoke keeps every earlier assertion."
    category: validation
    applies_to: "auth.smoke.test.tsx, apps/web/e2e/smoke/auth.spec.ts"
    trigger: "Code Generation and Build and Test"
    logic: "Vitest smoke (run by pnpm smoke, which stays Vitest-only): the five auth pages render their h1 in en and bn and the account entry renders signed out; Playwright (T-011's apps/web/playwright.config.ts, linted with apps/web/e2e/tsconfig.json, excluded from the Vitest web project, formatted by Prettier): register -> Mailpit API -> confirm button -> /me welcome, run with pnpm --filter @rogikotha/web smoke:e2e at Build and Test (not in CI until T-503)"
    violation: "Removing or skipping a smoke assertion without a recorded reason; a spec Vitest collects turns test:coverage red"
    source: "team.md Testing Posture (cumulative smoke), T-102 'Smoke e2e', T-011 WF8 step 3 and BR9.9"
  - id: BR14.3
    statement: "The UI gates pass before the Unit is done: the eleven-step pnpm check, pnpm smoke, smoke:e2e, impeccable detect, and CI green on the Bolt head."
    category: validation
    applies_to: "The Unit"
    trigger: "Build and Test and merge"
    logic: "pnpm check after T-011 = typecheck (with tsc -p e2e), lint, lint:boundaries, format:check, check:identity, test:coverage, i18n:check, contrast, contrast:patient, check:motion, build; all exit 0 with zero findings, as do pnpm smoke, smoke:e2e and npx impeccable detect apps/web/src --no-advisory; the Bolt branch is pushed and the check workflow is green on its head before the squash merge, with the run URL in the Build and Test record"
    violation: "Any red gate, or a merge without a green CI run, blocks the merge"
    source: "team.md Way of Working steps 2-3, T-102 acceptance rows, 01-conventions.md §7.8, T-010 (CI before merge), T-011 WF8 and BR9.4"
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
    logic: "Owned-path additions of functional-spec.md § 11; findings F1-F16 of functional-design-questions.md and F17-F26 of functional-spec.md § 14; ASSUMPTION(T-102) markers in code"
    violation: "An unrecorded change outside owned paths"
    source: "project.md Mandated (ISS rows), team.md Way of Working, Q1 (A)"
  - id: BR14.8
    statement: "When the placeholders go, the T-010 route-table and layout tests are updated in the same commit, so they keep proving what they proved without reaching T-101's server code."
    category: validation
    applies_to: "apps/web/src/app/pages.test.tsx, apps/web/src/app/layouts.test.tsx, Masthead.test.tsx, shell.smoke.test.tsx"
    trigger: "Code Generation"
    logic: "pages.test.tsx: vi.mock('@/server/auth') with an anonymous Actor builder (an account case per page test, not here), vi.mock('@/server/actions/account') with resolved fakes, vi.mock('next/headers') with empty cookies and headers; renderRoute passes params and searchParams (Promise.resolve({})) to page.default and generateMetadata; the rows /register, /sign-in, /verify-email, /reset-password, /me/security, /me and /write keep their view, noindex and heading assertions, which the pages meet by BR1.10, BR1.11 and BR1.13. layouts.test.tsx: the same two server mocks and an account-viewer case. Masthead tests pass a viewer. No existing assertion is removed or weakened; a page that cannot meet one is a design defect to fix, not a row to drop"
    violation: "A red route-table or layout test, or a weakened assertion, breaks pnpm check and team.md Testing Posture"
    source: "apps/web/src/app/pages.test.tsx and layouts.test.tsx (T-010), team.md Testing Posture, functional-spec.md D17 and § 14 F18, F19"
  - id: BR14.9
    statement: "apps/web stays at or above 80% line coverage with every new file counted."
    category: validation
    applies_to: "Every new file of this Unit in apps/web/src"
    trigger: "pnpm test:coverage (inside pnpm check) and CI"
    logic: "Each new component, wrapper, lib helper and viewer.ts arrives with its test; pages are covered by their own tests and the route table; IF apps/web falls below 80% THEN tests are added, never an exclusion and never a lower floor (D10); the figure before and after goes into the hand-off"
    violation: "test:coverage exits 1 (red check); a lowered floor breaks D10"
    source: "team.md Testing Posture (80% floor, D10), vitest.workspace.ts (T-010), T-011 BR9.9"
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
| BR1.10 | "Error:" title prefix from `ErrorSummary`; metadata keeps the plain title |
| BR1.11 | `noindex`; shell marker and disclaimer kept |
| BR1.12 | Errors shown through message keys |
| BR1.13 | Own `a-head`, one `h1` with the view's title |
| BR1.14 | Helpers in `lib/`, viewer in `app/`, async-only `'use server'` exports (FD-093) |
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
| BR4.1 | Sign-in page and its confirmation callouts; no second live region |
| BR4.2 | One generic credentials error |
| BR4.3 | `next` sanitiser |
| BR4.4 | Success clears the pending cookie, goes to `next` or `/me` |
| BR4.5 | Suspended copy without appeal route |
| BR4.6 | Rate-limit copy in seconds or minutes |
| BR4.7 | No outcome differs by account existence |
| BR4.8 | Suspended-session callout on `/sign-in` |
| BR5.1 | Pending panel |
| BR5.2 | Neutral resend in three modes; signed-in holders resend without an address |
| BR5.3 | Confirm button; nothing on opening the link |
| BR5.4 | Success to `/me?welcome=1`; expired offers resend |
| BR5.5 | Welcome only for a verified Actor |
| BR5.6 | Token pages: no referrer, token removed from the address bar |
| BR5.7 | Pending banner for signed-in unverified: masked address on `/me`, none on `/write` |
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
| BR8.5 | Grapheme initials from the own display name; glyph fallback |
| BR8.6 | Unread count only when real |
| BR8.7 | Viewer without id or any form of the email |
| BR9.1 | Security page structure; gate panel when signed out |
| BR9.2 | Email section with the masked own address |
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
| BR11.1 | T-011 tokens and spacing only; own CSS section; `data-press`; Prettier |
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
| BR13.2 | No id or full email in view models; masked own address in two places (FD-095) |
| BR13.3 | Anti-enumeration copy |
| BR13.4 | `rk.pending` cookie |
| BR13.5 | No state change on GET |
| BR13.6 | Synthetic data only |
| BR14.1 | Component and action tests |
| BR14.2 | Smoke and Playwright spec (`smoke:e2e`, separate from `pnpm smoke`) |
| BR14.3 | Eleven-step gate, smoke, detector; CI green on the Bolt head |
| BR14.4 | Dependency re-check |
| BR14.5 | High-risk extras |
| BR14.6 | Two owner gates |
| BR14.7 | Records and ISS rows |
| BR14.8 | Route-table and layout tests updated with the pages |
| BR14.9 | `apps/web` at 80% lines or more |
