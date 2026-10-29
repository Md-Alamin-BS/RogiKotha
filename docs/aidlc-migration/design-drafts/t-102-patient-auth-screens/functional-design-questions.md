# Functional Design — questions (U9 `t-102-patient-auth-screens`)

Draft written ahead of the stage, while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-102-patient-auth-screens/functional-design/`.

Context:
- Unit U9 (kind `ui`, size L, **high risk**: authentication) delivers T-102 (`docs/implementation/tasks/T-102-patient-auth-screens.md`, with the FD-091 amendment and the FD-053 and FD-057 amendments) for stories US3.1 and US3.2 (`unit-of-work-story-map.md`). It depends on U8 T-101 (commands, actions, `getActor`), U3 T-010 (boundary lint, coverage floor) and U45 T-011 (the FD-091 design and motion system). Its two owner gates are the D-001 auth-screen review (FD-053) before Code Generation and the auth-screen review on the T-011 look before the Unit closes (FD-091 acceptance row).
- Inputs read: `unit-of-work.md` (U9 and the decision-change table), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `requirements.md` (FR1–FR9, FR91, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5, and for reference AC2.3.1–AC2.3.4, AC2.4.1–AC2.4.5, AC12.1.6), `docs/status/decision-log.md` (FD-013, FD-022, FD-024, FD-034, FD-042, FD-053, FD-057, FD-058, FD-059, FD-063, FD-088, FD-091), `docs/implementation/01-conventions.md` §5–§9, `03-routes-and-contracts.md` §1, §2, §4, §6, `docs/design/auth-screens-spec.md` (all), `05-demo-storyboard.md` (Part 2, steps 8–10), the D-001 prototype (`ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js`: `authField`, `authPasswordField`, `authErrorSummary`, `renderRegister`, `renderSignin`, `renderVerify`, `renderReset`, `renderSecurity`, `renderAccountEntry`, `openAuthGate`, `openStepUp`, `workspaceNav`, the `#account` click handler and the auth submit handlers), the sibling drafts `design-drafts/t-101-better-auth-adapter/` (the actions and Actor this Unit consumes) and `design-drafts/t-011-patient-design-and-motion-system/` (tokens, `RouteTransition`, sheet entry, the static set), and `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` (owner answers on T-101: R1 the worker holds a separate mail-only key; R2 FR90 feedback is text only).
- Code read on the CR-012 Bolt branch (no file in this Unit's area differs from `main`): `apps/web/src/app/[locale]/layout.tsx`, `app/[locale]/(patient)/layout.tsx`, the placeholder pages `register`, `sign-in`, `verify-email`, `reset-password`, `me/security`, `me`, `write`, the finished `terms` and `privacy` pages, `components/patient/{Masthead,Tabs,ViewShell,Policy}.tsx`, `components/shared/{Sheet,LiveRegion,Icon,ThemeControls}.tsx`, `lib/{announce,cookies,metadata,titles}.ts`, `proxy.ts`, `server/actions/preferences.ts`, `styles/patient.css` (`.field-error`, `.ctl.account`, `.link-btn`, `.check`, `.opt-row`, `.kv`), `packages/contracts/src/{actor,errors}.ts`, `schemas/account.ts`, `view-models/security.ts`, `packages/i18n/src/format.ts` and every `auth.*`, `errors.auth.*`, `policy.*`, `mine.*`, `nav.*` and `user2.*` key in both dictionaries.
- Open `ISSUES.md` rows in this area: ISS-020 (no email or display-name error key), ISS-021 (dev "simulate link" copy), ISS-022 (account entry's signed-in title), ISS-028 (Terms/Privacy links point at `#about`), ISS-029 (owner T-102: `/me` not session-aware in the prototype), ISS-030 (prototype has no `?token=`), ISS-031, ISS-032 (rate-limit and suspended copy unwired), ISS-033 (password equals email, T-101 Q7), ISS-035 (register language switches the interface), ISS-036 (demo session toggle, not ported), ISS-097 (invented person glyph), ISS-124 (`/sign-out` has no route), ISS-137 (the whole dictionary ships to the client), ISS-227 (preference write failures are silent).
- Dependency check: T-102 adds no package. It is the first Unit to use React 19.3 `useActionState` with server actions and `Intl.Segmenter`, so Code Generation re-checks `next` 16.3.4, `react` 19.3.0 and `next-intl` ^4.14.4 (latest log entry 2026-09-13, older than 3 days) for form-action and progressive-enhancement issues and appends a dated entry (BR14.4).

## What the inputs show that the task file does not

These facts shape the questions below.

1. **A server component cannot set a cookie.** Next.js allows cookie writes only in server actions and route handlers. Task step 3 ("With token → call the verify action; success → redirect") runs in the page render, so the session cookie that T-101's `account.verifyEmail` creates could not be set there.
2. **The owned paths miss three files the steps need.** The viewer prop and the one `AuthGateSheet` live in `app/[locale]/(patient)/layout.tsx` (steps 7 and 9; T-011 now also edits this file). The welcome callout `auth.verify.done` shows on `/me` (`me/page.tsx`, a T-409 placeholder). The `/write` gate (step 9, storyboard step 8) shows on `write/page.tsx`, a T-306 placeholder. None of the three is in T-102's owned paths.
3. **Echoing the email in the URL puts an address in browser history and access logs.** Step 2 redirects to `/verify-email?email=…`.
4. **03 §2 says view models never contain emails**, but spec §3.2 and §3.6 show the signed-in holder's own address on the pending banner (on `/me` and `/write`) and on `/me/security`. T-101's draft raised this as F5 for this Unit.
5. **The suspended-account copy names an appeal route that does not exist.** `errors.auth.accountSuspended` reads "You can appeal from your workspace", and step 4 links to `/me`. A suspended account gets no session (T-101 BR3.6), so it cannot reach `/me`, and FD-088 defers appeals and says decision notices name no appeal route until appeals exist.
6. **The sign-in delay is in seconds, the copy in minutes.** From the 3rd failure the refusal carries `retryAfterSec` of 1–30 s (FD-063); `errors.auth.rateLimited` says "Try again in {minutes} minutes". T-101's draft raised this as F4. The English copy also has no plural form ("1 minutes").
7. **T-101's `signOutEverywhere` takes no password** (T-101 Q10 A, `SignOutEverywhereInput` is `{}`). An inline password field in front of it, as step 8 and spec §3.6 describe, would be checked by nothing.
8. **The prototype's language "radios" are `<button role="radio">`.** Buttons submit no value without JavaScript, but the register form must work without it (spec §2).
9. **The session label is English.** T-101's `SessionListItem.label` is one string such as "Chrome on Windows"; in a Bengali page the word "on" would stay English (FD-024).
10. **`/terms` and `/privacy` are already built** (T-207a, `Policy`, with the FD-022 sentence and its tests). Step 10 needs no new code, only the register links pointing at them (closes ISS-028).
11. **Most copy exists.** Every `auth.*` key in spec §5 is in both dictionaries (spec `auth.signIn` is `auth.signIn.label` in code). The new keys this design needs are listed in `frontend-components.md` § 6, each flagged for the owner's bilingual review (FD-042).

## Settled before this stage

- **The screens, fields, copy and flows** of `auth-screens-spec.md` §1–§3 and §5 and the D-001 prototype (FD-034, FD-053); the prototype stays the source of truth for content, data and behaviour, and the look is FD-091's (T-102 amendment).
- **Session scope (FD-057):** the session list and Sign out everywhere only; no recent-login list and no failed-login alert anywhere.
- **Recovery (FD-059):** self-service email reset only; no manual recovery path in the UI.
- **No CAPTCHA (FD-058)**; the delay arrives as `auth.rate_limited` with `retryAfterSec` (FD-063, T-101 WF4).
- **Unconfirmed accounts sign in, browse and edit settings, but cannot contribute** (FR4, AC3.1.4, T-101 Q2 A): the signed-in-unverified state of spec §1 exists.
- **No step-up in T-101** (T-101 Q10 A); T-103 brings `account.stepUp` and swaps it into `SecuritySettings` later.
- **Motion and look come from T-011** (FD-091): tokens, `RouteTransition` in the patient layout (T-011 Q4 A), the sheet entry, press feedback, the static set; page styles go in T-102's own section of `patient.css`, marked `/* added: T-102 reason */`.

## Settled in this design without a question

These follow from the decisions, the contracts, the hard rules or the code. `functional-spec.md` § 9 explains each.

- **Pages render their own `a-head`** (kicker, `h1.display`, lede) and pass `title=""` to `ViewShell`, as `Policy` and `Emergency` do (ISS-121 precedent), so each page has exactly one `h1` and that heading is the focus target after navigation.
- **Native form controls everywhere.** The interface-language choice is a `fieldset` of two real radio inputs styled as `.opt` (fact 8); checkboxes are real checkboxes; nothing relies on `role="radio"` buttons.
- **The server decides; the client only helps.** Validation runs in the command; the client adds `type`, `autocomplete`, `maxlength` (not on passwords) and the live `@username` preview. No `required` attribute, so the browser's own tooltip never replaces the summary pattern (prototype comment). No validation on blur.
- **Every form keeps what the person typed, except passwords.** React resets uncontrolled fields after a form action; the form state echoes the non-secret values and the fields read them as `defaultValue`. Password fields always come back empty.
- **Email and display-name errors get their own keys** (`errors.auth.emailInvalid`, `errors.auth.displayNameRequired`), and a password over 256 characters gets `errors.auth.passwordTooLong`. T-101's `validation` field errors name these keys (cross-Unit point, `entities.md` ENT-004). Closes ISS-020.
- **`next` is a locale-free, same-origin, non-auth, non-staff path** (BR4.3): starts with one `/`, no `//` or `/\`, no control characters, at most 512 characters, not under `/admin` or `/api`, not an auth page; anything else becomes `/me` (after sign-in) or `/` (after sign-out).
- **Signed-in visitors to `/register` or `/sign-in` go to `next` or `/me`.** `/reset-password?token=` and the verification link still work while signed in.
- **`/me?welcome=1` shows `auth.verify.done` only when the Actor's email is verified**, so the untrusted parameter cannot claim a confirmation.
- **Token pages send `Referrer-Policy: no-referrer`** and, after hydration, drop the token from the address bar with `history.replaceState`.
- **Sign-out keeps you where you are.** With JavaScript, signing out on a public page stays on that page, re-renders the masthead and announces `auth.signedOut` (the prototype announces "Signed out"); on a private page (`/me/*`, `/saved`, `/notifications`) it goes to `/`. Without JavaScript the POST redirects to the same rule's target. There is no `/sign-out` page; the action is the route (closes ISS-124).
- **The account menu is a list of links, not an ARIA `menu`**, so Tab works as everywhere else; the trigger is a button with `aria-haspopup="dialog"` and an accessible name built from the display name and, when unverified, "email not confirmed" (closes ISS-022).
- **Initials use grapheme clusters** (`Intl.Segmenter`), so a Bengali name never shows half a conjunct or a lone vowel sign.
- **The unread count is never invented.** T-102 renders `.count` only for a number above 0 that T-405 supplies later; before T-405 nothing shows (hard rule: a missing value is never 0).
- **The gate sheet is an enhancement**; every command still checks `requires`, so a no-JavaScript submission is refused by the server with its own message.
- **The unverified gate sheet adds a link to `/verify-email`** using the existing `auth.verifyPending` text, so the person can act on the message.
- **The Terms and Privacy links in the register form open in a new tab with a hidden "(opens in a new tab)" note**, so following them does not lose the typed form (the one accepted reason to open a new tab).
- **The interface language chosen at registration is used at once** (ISS-035): the verification email is sent in it and the redirect goes to that locale's `/verify-email`.
- **`/terms` and `/privacy` stay as built**; the register links point at them (fact 10, closes ISS-028).
- **`WorkspaceNav` is created here with its four links** (`nav.mine`, `mine.bookmarks`, `mine.notifications`, `auth.security.nav`) as `Link`s with `aria-current="page"` (not the prototype's `aria-pressed` buttons); T-409 owns it afterwards (both task files name it).
- **Errors appear without movement; nothing auth-specific is animated** beyond the T-011 primitives and the choices in Question 11.
- **ISS-021, ISS-030 and ISS-036 do not apply to the React port** (no simulate controls, real `?token=` links, no demo session toggle): closed as "not applicable after T-102". ISS-029 is handed to T-409, which builds the session-aware `/me`.

## Question 1

The steps need three files outside T-102's owned paths (fact 2): the patient layout (viewer and gate sheet), `/me` (welcome callout and pending banner) and `/write` (the gate callout, storyboard step 8). What does T-102 do?

A. **Add one small, marked change to each and record it** (recommended). The layout computes the viewer from `getActor()` and wraps the page in `AuthGateProvider`; `/me` renders `VerifyWelcome` and `PendingVerificationBanner` above T-409's placeholder; `/write` renders `WriteGateCallout` for signed-out and unverified visitors above T-306's placeholder. Each change is listed in the Code Generation plan and the hand-off with an ISS row (T-101 F7 precedent). T-306 and T-409 keep the components when they replace their pages. The phase-gate walk of storyboard steps 8–10 works as soon as T-102 merges.
B. **Touch none of them.** The components are exported only; the viewer and gate sheet wait for a layout change by T-011 or a later Unit, the welcome waits for T-409 and the `/write` gate for T-306. The T-102 acceptance rows "Spec §6 flow" (welcome on `/me`) and storyboard step 8 cannot pass until then.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 2

How does the confirmation link from the email finish? (fact 1)

A. **The link opens a page with one button, "Confirm my email"** (recommended). `/verify-email?token=` shows a short panel and one button (outline, like every patient form button; the write CTA keeps the only accent fill) that posts the token to the verify server action; the action confirms, signs the person in (it may set the cookie) and redirects to `/me?welcome=1`. It works without JavaScript. Mail-security scanners that open links (common in work email) cannot confirm or sign anyone in by opening it. Cost: one extra tap, and two new keys.
B. **A route handler confirms on opening the link** (`/verify-email/confirm?token=` as `route.ts`), sets the cookie and redirects. One tap less, but a GET request changes state: a link scanner that opens the mail first confirms the address and receives a session cookie, and if T-101's spike finds the token single-use, the person's own click then fails with "already used".
C. **The page submits the form by itself with JavaScript**, with the button as the no-JavaScript fallback. Feels like B for most people, but scanners that run JavaScript behave as in B, and an auto-submit is surprising for screen-reader users.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 3

After registering, the pending screen shows the address the person typed (spec §3.1, "with the email echoed"). How does the address reach `/verify-email`? (fact 3)

A. **A short-lived, HttpOnly flash cookie** (recommended). The register action sets `rk.pending` (the normalised address, `SameSite=Lax`, `Secure` on https, `Path=/`, 30 minutes) and redirects to `/<locale>/verify-email`; the page reads it to show the address and to pre-fill the Resend form. Successful sign-in or verification clears it. The address never enters a URL, browser history, a log line or a `Referer` header. Without the cookie (expired, another browser), the page shows the no-address text and an empty email field in the Resend form.
B. **The query string, as step 2 says** (`/verify-email?email=…`). Simplest, but the address lands in browser history, in any request log and in links copied from the address bar.
C. **No redirect: the register form swaps to the pending panel in place**, with the address in the form state. No cookie and no URL, but a refresh asks to resubmit the form, the URL stays `/register`, and spec §3.1's "navigate to `/verify-email`" is not met.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 4 — needs the owner (data boundary: the 03 §2 view-model rule)

Spec §3.2 and §3.6 show a signed-in holder their own email address (on the pending banner on `/me` and `/write`, and on `/me/security`). 03 §2 says view models never contain emails (fact 4). Changing that rule needs an FD entry, so this question is not pre-filled. Until it is answered, the design follows C (the rule as written).

A. **Show the holder their own full address, as a named exception** (recommended). One read-only field, `ownEmail`, appears only in `SecurityVM` and the pending-banner view model, only for the signed-in holder, only on `noindex` pages under `/me/*` and `/write`, never cached, never logged and never in any public or staff projection. 03 §2 gains one sentence, recorded in an FD entry. People can check which address the account uses, which is what most sites show.
B. **Show a masked address** (`s****@example.test`). It helps people recognise the address with less exposure, but it is still part of the address in a view model, so it needs the same FD entry, and a masked address is harder to check for typos.
C. **Show no address while signed in.** The pending banner uses a new no-address text (`auth.verify.bodyNoEmail`) and `/me/security` shows only "Confirmed" or "Not confirmed". No rule changes; people cannot see which address the account uses. The pending screen right after registration still shows the typed address (Question 3), because that is the person's own input, not a view model.
X. Other (please specify)

[Answer]: B (the owner's answer, 2026-10-28: show the holder's own address masked; needs a new FD entry amending 03 §2 before this Unit's code)

## Question 5

How is a rate-limit refusal worded, now that the sign-in delay is 1–30 seconds and the other limits are minutes? (fact 6)

A. **Choose the unit from `retryAfterSec`, with real plurals** (recommended). Under 60 seconds: a new key `errors.auth.rateLimitedSeconds` ("Too many attempts. Try again in 5 seconds."); 60 seconds or more: the existing `errors.auth.rateLimited`, rounded up to whole minutes. Both English strings use ICU plural forms ("1 second", "2 seconds"); the Bengali strings need none. Numbers go through `formatNumber`, so Bengali pages show Bengali digits. No countdown, no disabled button (spec: no time-pressure traps); an early retry is simply refused again with the new time.
B. **One unit-free message** ("Too many attempts. Please wait a little and try again."). Short, but the person does not know whether to wait 2 seconds or 15 minutes.
C. **Keep the minutes copy and round up** (a 2-second wait reads "1 minute"). No new key, but the copy is wrong for every delay under a minute.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

Proposed copy (Bengali flagged for the owner's review, FD-042): `errors.auth.rateLimitedSeconds` en "Too many attempts. Try again in {count, plural, one {{seconds} second} other {{seconds} seconds}}." / bn "অনেকবার চেষ্টা হয়েছে। {seconds} সেকেন্ড পর আবার চেষ্টা করুন।"; `errors.auth.rateLimited` en becomes "Too many attempts. Try again in {count, plural, one {{minutes} minute} other {{minutes} minutes}}." (bn unchanged). `count` is the raw number for the plural choice, `seconds`/`minutes` the formatted digits.

## Question 6

What does a suspended or banned account see when it signs in with the right password? (fact 5)

A. **A reworded `errors.auth.accountSuspended` with no appeal route and no link** (recommended): en "This account is suspended, so it can't sign in right now." / bn "এই অ্যাকাউন্টটি স্থগিত, তাই এখন সাইন ইন করা যাবে না।" (Bengali flagged). This follows FD-088 ("decision notices name no appeal route until appeals exist") and does not send the person to a workspace they cannot open. Step 4's "link to `/me`" is dropped and recorded. When appeals ship, their Unit rewords the key.
B. **Keep the current copy and the link to `/me`.** It promises an appeal that does not exist in release 1, and the link leads back to the sign-in page.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 7

What stands in front of **Sign out everywhere** on `/me/security`, given that T-101's command takes no password? (fact 7)

A. **A confirmation step without a password** (recommended). The button reveals the note `auth.security.signOutAllNote` ("This signs out every device, including this one.") with **Yes, sign out everywhere** and **Cancel**; confirming calls `signOutEverywhereAction` and lands on `/sign-in` with `auth.security.signedOutAll`. The confirmation sits behind a `confirm` prop (`'inline' | 'stepUp'`), so T-103 swaps in its step-up sheet with a one-line change once `account.stepUp` exists. Signing yourself out is protective, so a confirmation is enough until then.
B. **Wait for T-103**: ship the button without any confirmation now. One mistaken tap signs out every device.
C. **Ask for the password inline, as spec §3.6 says**, and send it to a command that ignores it. Never: it looks like a check and is not one.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 8

How does the password **Show** control tell people and screen readers what it does? The prototype changes the text to "Hide" *and* sets `aria-pressed`, so a screen reader says "Hide, toggle button, pressed", which reads as "hidden".

A. **The text says the action, without `aria-pressed`** (recommended; the GOV.UK pattern, tested with users). The button reads **Show** or **Hide** (`auth.showPassword`, `auth.hidePassword`), its accessible name is "Show password" or "Hide password" (new keys; the visible word is part of the name, WCAG 2.5.3), it carries `aria-controls`, and the change is announced politely ("Your password is shown." / "…hidden."). The field goes back to hidden before the form submits, so browsers never keep it in form history. The button is rendered only after hydration, so nobody without JavaScript sees a button that does nothing. Task step 1 and its test change from "flips `aria-pressed`" to "flips the type and the name".
B. **A fixed label with `aria-pressed`** (the WAI-ARIA toggle pattern): the button always reads **Show**, and its pressed look and state carry the change. Matches the task text, but sighted people see "Show" while the password is already shown.
C. **The prototype as it is** (text and `aria-pressed` both change). Ports 1:1, but gives screen-reader users the contradictory "Hide, pressed".
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 9

What opens when a signed-in person activates the account entry? Spec §1 says "a sheet on mobile, a small popover panel ≥ 760 px"; the approved D-001 prototype opens the same sheet at every width.

A. **The shared `Sheet` at every width** (recommended), as the prototype the owner reviewed in D-001. One focus model (the existing focus trap and focus return), T-011's sheet entry motion, and one layout to check at 360 px and on desktop. A desktop popover can follow later as polish.
B. **`Sheet` below 760 px and an anchored popover panel from 760 px** (spec §1). Lighter on desktop, but two code paths, a second focus and dismissal model, and anchor positioning that not every target browser supports yet (a positioned fallback is needed).
C. **A disclosure dropdown** at every width. Light, but it differs from both the spec and the prototype and needs its own keyboard and dismissal rules.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 10

How is a session's device shown on a Bengali page? (fact 9)

A. **T-101 returns the parts; T-102 builds the label from a key** (recommended). `SessionListItem` carries `browser` and `os` (family names such as "Chrome", "Windows", kept as written because they are product names) instead of one English `label`; T-102 renders `auth.security.deviceLabel` (en "{browser} on {os}", bn "{os}-এ {browser}") and `auth.security.deviceUnknown` when a part is missing. T-101 is not built yet, so this is a draft-to-draft change in its WF10 and `SessionVM`, recorded in both hand-offs.
B. **Show T-101's English label as it is.** No cross-Unit change, but every Bengali security page shows English words, against FD-024's equal status.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 11

The owner wants the patient side rich and alive (FD-091), and the auth screens are the first thing a new contributor meets. Which motion do these screens use?

A. **T-011's primitives plus one confirmation tick** (recommended). Route transitions between the auth pages (from `RouteTransition`), the sheet entry for the account menu and the gate sheet, press feedback on every button, and T-011's `PublishTick` drawn once beside the plain-text confirmations "Your email is confirmed" (`/me?welcome=1`) and "Password changed" (`/me/security`, `/sign-in?reset=done`). Errors, error summaries, the pending banner, the disclaimer and every hard-rule or privacy callout appear without movement. Reduced motion shows the tick complete at once. No confetti, no badge, no countdown (AC2.4.5).
B. **T-011's primitives only**, with every confirmation as plain text. Calmer, but the moment an account becomes usable passes without any sign.
C. **Extra auth motion** such as a shake on a wrong password or fields rising one by one. Livelier, but a shake moves an error (task step 12 forbids movement on errors), and staggered fields delay reading a form.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 12

Should `/register` and `/verify-email` show where the person is in joining?

A. **Yes: a short, static three-step strip** (recommended): "Create account · Confirm email · Start writing", as an ordered list with `aria-current="step"` on the current step and a hidden "Step 1 of 3" text, above the heading on `/register` (step 1) and `/verify-email` (step 2); `/me?welcome=1` marks step 3 beside the welcome. It tells a first-time contributor that one email step remains, which is where people drop off. It never moves and has no timer. Five new keys, Bengali flagged. It adds structure the prototype does not have, so it is part of the owner's auth-screen review on the T-011 look.
B. **No strip**: the prototype 1:1. Nothing new to review; the lede and the pending panel carry the explanation.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised)

## Question 13

FD-053 makes the D-001 auth-screen review a gate before T-102 builds, but that review was of the 04b look, which FD-091 replaced. The task now has two owner gates: the D-001 approval recorded before Code Generation, and a review on the T-011 look before the Unit closes.

A. **Keep both gates, with the first one read as a content and flow approval** (recommended). Before Code Generation the owner records, in this Unit's record, that the D-001 prototype's screens, fields, copy and flows are approved in `en` and `bn` (the look is not part of it any more); before the Unit closes the owner reviews the built screens on the T-011 look in both languages, both themes, at 360 px. This changes no decision, and Code Generation cannot start until the first approval is recorded.
B. **Drop the pre-build gate and keep only the post-build review.** Faster, because the build would not wait for the owner, but it changes FD-053 and needs a new FD entry from the owner.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change when this draft is finalised). Option B would change FD-053 and needs the owner. Under A the two reviews themselves are the owner's to give.

## Raised for the owner, not decided in this stage

- **Question 4 (own email on signed-in pages).** A data-boundary change to 03 §2; needs an FD entry. The design follows C until it is answered.
- **The two FD-053/FD-091 reviews (Question 13).** Only the owner can give them; Code Generation waits for the first.

## Findings for the ISS register (proposed rows, each `Found in U9 T-102`)

| Id | Sev | Finding | Owner (suggested) |
|---|---|---|---|
| F1 | S2 | Task step 3 verifies the email during the page render, where Next.js cannot set the session cookie T-101's verify creates; the flow as written cannot sign the person in (Question 2) | U9 T-102 |
| F2 | S2 | The owned paths omit `(patient)/layout.tsx`, `me/page.tsx` and `write/page.tsx`, which steps 7 and 9, the "Spec §6 flow" row and storyboard step 8 need (Question 1) | U9 T-102 |
| F3 | S2 | `errors.auth.accountSuspended` and step 4 name an appeal route; FD-088 defers appeals and forbids naming one, and a suspended account cannot reach `/me` (Question 6) | U9 T-102 |
| F4 | S2 | Step 2's `/verify-email?email=` puts the address in the URL, browser history and request logs (Question 3) | U9 T-102 |
| F5 | S3 | 03 §2 forbids emails in view models; spec §3.2 and §3.6 show the holder's address while signed in (Question 4; T-101 F5) | founder (FD entry) |
| F6 | S3 | `errors.auth.rateLimited` says minutes and has no English plural; the FD-063 delay is 1–30 s (Question 5; T-101 F4) | U9 T-102 |
| F7 | S3 | Spec §3.6's inline password before Sign out everywhere would be checked by nothing (T-101 Q10 A; Question 7; T-101 F13) | U9 T-102, U10 T-103 |
| F8 | S3 | T-101's single English session label breaks FD-024 on Bengali pages (Question 10) | U8 T-101, U9 T-102 |
| F9 | S3 | The prototype's language choice is `button role="radio"`, which submits nothing without JavaScript | U9 T-102 |
| F10 | S3 | `/me?welcome=1` would show "Your email is confirmed" to anyone who types the parameter, unless it also checks the Actor | U9 T-102 |
| F11 | S4 | Acceptance row "Rate limit copy: 11 failed sign-ins" and spec §6 "wrong password 6×" predate FD-063 and C5 (delay from the 3rd failure, limit at 10); the row needs rewording to "after 3 failures, seconds copy; after 10 in 15 min, minutes copy" | U9 T-102 |
| F12 | S4 | Task step 1 and its test ask for `aria-pressed` and changing text together (Question 8) | U9 T-102 |
| F13 | S4 | `formatRelative` in `packages/i18n` builds "minutes ago" from hard-coded words, not keys; T-102 avoids it (dates via `formatDate`, "Just now" via a key) | T-006 owner (debt) |
| F14 | S4 | `ASSUMPTION(T-102)`: the token may stay in Next's development request log line; the production log rule is T-502's | U41 T-502 |
| F15 | S4 | Dependency re-check due for `next`, `react`, `next-intl` (entries 2026-09-13) before the first `useActionState` forms | U9 T-102 (Code Generation) |
| F16 | S4 | ISS-021, ISS-030, ISS-036 no longer apply after the React port; ISS-028 and ISS-124 close with T-102; ISS-029 moves to T-409 | U9 T-102 (register update) |
