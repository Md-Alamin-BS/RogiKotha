# Frontend components — U9 `t-102-patient-auth-screens`

Component-level design for `functional-spec.md` (workflows WF0–WF13) and `rules.md` (BR1.1–BR14.9). It follows answer A to Questions 1–3 and 5–13 in `functional-design-questions.md`, which await the owner's confirmation; option B of Question 4, the owner's answer (the holder's own email shown masked); and answer A to Questions 14 and 15, decided by the agent under the owner's no-questions instruction of 2026-10-29. The deltas for other options are in `functional-spec.md` § 10. Upstream: `unit-of-work.md` U9, `unit-of-work-story-map.md` US3.1 and US3.2, `requirements.md` FR1–FR9, FR91, FR95, NFR4, NFR6, NFR7, NFR13, `auth-screens-spec.md`, the D-001 prototype, the T-101 draft refreshed 2026-10-29 (actions, `getActor`, `OwnAccountVM`, `resendOwnVerification`) and the T-011 draft refreshed 2026-10-29 (tokens with spacing, `RouteTransition`, `PublishTick`, `data-press`, the sheet entry).

Refreshed 2026-10-29: § 1 adds `viewer.ts`. § 2 drops `view-models/security.ts`, which is T-101's, and adds the `lib/` helpers and the T-010 test files. § 3 builds the Viewer from `getActor()` and `account.getOwnAccount`. § 4 adds the resend modes, the masked address, `StatusCallout` without a live-region role and the own-resend wrapper. § 5 uses T-011's spacing tokens and `data-press`. § 6 drops the three field-error keys T-101 adds. § 8 adds the harness, mock and masking tests and the `smoke:e2e` split.

The snippets below are interface-level sketches, not code to copy.

## 1. Hierarchy

```text
app/[locale]/layout.tsx                      (T-011's font and motion attributes; <html>, LiveRegion, NextIntlClientProvider)
├── app/[locale]/(patient)/viewer.ts         (new: loadViewer(), loadOwnAccount(), toViewer(); cache() per request)   [addition]
└── app/[locale]/(patient)/layout.tsx        (+ viewer = await loadViewer(); + AuthGateProvider)   [owned-path addition, Q1]
    ├── SkipLink, DemoMarker                 (unchanged)
    ├── Masthead                             (+ <AccountEntry viewer/> first in .controls)
    │   └── AccountEntry (client)            Link#account (signed out) | button#account → Sheet AccountMenu
    │       └── AccountMenu                  ul of Links + SignOutForm
    ├── main#main
    │   └── RouteTransition (T-011)
    │       └── AuthGateProvider (client)    one AuthGateSheet per page; useAuthGate()
    │           └── page
    │               ├── /register            ViewShell title="" > JourneySteps(1) > AuthHead > .panel > RegisterForm
    │               ├── /sign-in             ViewShell > AuthHead > StatusCallout? > .panel > SignInForm
    │               ├── /verify-email        ViewShell > JourneySteps(2)? > AuthHead > .panel > VerifyEmail
    │               │                         (pending: PendingPanel + ResendForm | token: VerifyConfirmForm)
    │               ├── /reset-password      ViewShell > AuthHead > .panel > ResetRequestForm | ResetSetForm
    │               ├── /me/security         ViewShell > AuthHead > WorkspaceNav > .panel > SecuritySettings (masked own address)
    │               ├── /me (T-409's)        + VerifyWelcome (+ JourneySteps(3)) + PendingVerificationBanner (masked)   [addition, Q1]
    │               └── /write (T-306's)     + WriteGateCallout (banner without address, Q14)                          [addition, Q1]
    └── Colophon                             (unchanged; disclaimer.short)
```

## 2. Files

| Path | Change | In T-102's owned paths |
|---|---|---|
| `app/[locale]/(patient)/{register,sign-in,verify-email,reset-password}/page.tsx` | Replace the placeholders: server pages with `generateMetadata` (plain `documentTitle(view)`, `noindex()`, `referrer: 'no-referrer'` always on the two token pages; no argument needed), signed-in redirect for register and sign-in, the suspended callout on sign-in (BR4.8), data for the forms | yes |
| `app/[locale]/(patient)/me/security/page.tsx` | `SecuritySettings` with `SecurityVM` from `loadOwnAccount()` (masked address, verified) and `account.listSessions` | yes |
| `app/[locale]/(patient)/{terms,privacy}/page.tsx` | **No change** (built by T-207a) | yes, untouched |
| `components/patient/auth/**` | New: the components of § 4 and their tests | yes |
| `components/patient/AccountEntry.tsx` (+ `AccountMenu`) | New | yes |
| `components/patient/Masthead.tsx` | Insert `AccountEntry` in place of the static `#account` link; new `viewer` prop | yes |
| `components/patient/WorkspaceNav.tsx` | New with the four links (T-409 owns it afterwards) | yes |
| `server/actions/account.ts` | Add the ten form wrappers beside T-101's actions, as async exports only (a `'use server'` module, BR1.14); command calls untouched | yes |
| `lib/next-path.ts`, `lib/auth-form-state.ts`, `lib/initials.ts` (+ tests) | New `web-shared` helpers: `sanitiseNext`; `AuthFormState`, `INITIAL_AUTH_FORM_STATE`, `toFormState`; `initials()` (BR1.14) | **no**: addition, listed |
| `lib/cookies.ts` (+ test) | `PENDING_EMAIL_COOKIE` and `readPendingEmail()` beside the preference cookies | **no**: addition, listed |
| `app/[locale]/(patient)/viewer.ts` (+ test) | New: `loadViewer()`, `loadOwnAccount()` (`cache()`), `toViewer()` (BR8.7) | **no**: addition, listed |
| `styles/patient.css` | Append T-102's section (§ 5) | yes (append-only) |
| `packages/i18n/messages/{en,bn}.json` | New and changed keys of § 6 | yes |
| `app/[locale]/(patient)/layout.tsx` | Two hunks: `viewer = await loadViewer()`, wrap in `AuthGateProvider`; pass `viewer` to `Masthead` | **no**: addition (Q1 A), plan and ISS row |
| `app/[locale]/(patient)/me/page.tsx` | One hunk: `VerifyWelcome` and `PendingVerificationBanner` (masked address) above T-409's placeholder | **no**: addition (Q1 A) |
| `app/[locale]/(patient)/write/page.tsx` | One hunk: `WriteGateCallout` above T-306's placeholder; metadata unchanged (indexable) | **no**: addition (Q1 A) |
| `app/pages.test.tsx`, `app/layouts.test.tsx` | Harness: mocks of `@/server/auth`, `@/server/actions/account`, `next/headers`; `searchParams`; rows kept (BR14.8) | **no**: T-010's files, listed |
| `components/patient/Masthead.test.tsx`, `shell.smoke.test.tsx` | The new `viewer` prop and the account-action mock | **no**: listed |
| `components/patient/Composer.tsx` | Not created (T-306 has not started; it imports `WriteGateCallout`) | yes, unused |
| `apps/web/e2e/smoke/auth.spec.ts` | New Playwright spec on T-011's config | **no** (T-011 created `e2e/smoke/`): addition, listed |
| `packages/contracts/src/view-models/security.ts` | **No change here.** T-101 makes `SessionVM {browser, os}`, `SecurityVM.emailVerified`, `SecurityVM.ownEmailMasked` and `OwnAccountVM` (its WF0 step 5) | — |

## 3. Viewer and layout (server)

```text
(patient)/viewer.ts  (element web: may import server/auth.ts and server/actions/account.ts; BR1.14)
  loadOwnAccount = cache(async () => {             // one call per request, shared by the layout, /me, /me/security
    actor = await getActor()                       // T-101, server/auth.ts, cache() per request
    if (actor.kind !== 'account') return null
    r = await getOwnAccountAction()                // T-101: OwnAccountVM {username, displayName, emailVerified, emailMasked}
    return r.ok ? r.data : null                    // a failure is logged by T-101; the chrome falls back (BR8.5)
  })
  loadViewer = cache(async () => toViewer(await getActor(), await loadOwnAccount()))

  toViewer(actor, own):                            // BR8.7: emailMasked and username are dropped here
    anonymous → {kind:'anonymous', staff:false}
    account   → {kind:'account', displayName: own?.displayName, initials: own ? initials(own.displayName) : undefined,
                 verified: actor.emailVerified === true, staff: actor.staffRole !== undefined}   // unreadCount: T-405

(patient)/layout.tsx:
  viewer = await loadViewer()
  <Masthead … viewer={viewer}/>
  <main id="main"><RouteTransition><AuthGateProvider viewer={viewer}>{children}</AuthGateProvider></RouteTransition></main>

lib/initials.ts  initials(name):                   // BR8.5
  words = name.replace(/^(Dr\.?|ডা\.?)\s+/, '').trim().split(/\s+/)
  g = (w) => first grapheme of w via new Intl.Segmenter(undefined, {granularity:'grapheme'})
  return g(words[0]) + (words.length > 1 ? g(words.at(-1)) : '')
```

`getActor()` in the layout makes every patient page dynamic, which they already are (theme and motion cookies). `AuthGateProvider` sits inside the keyed `RouteTransition`, so a navigation remounts it and an open gate sheet never survives the page it was opened on.

## 4. Components

### 4.1 Form primitives (`components/patient/auth/`)

| Component | Kind | Props | Behaviour (rules) |
|---|---|---|---|
| `AuthHead` | client (focus effect) | `kicker`, `title`, `lede?` | `section.a-head` > `span.kicker`, `h1.display tabIndex=-1`, `p.lede`; focuses the `h1` after a client-side arrival (BR1.9, BR1.13) |
| `ErrorSummary` | client | `state: AuthFormState`, `fieldOrder: string[]`, `view: ViewName` | `div.callout.warn role=alert tabIndex=-1` > `b{auth.errorSummary}` > `ul`; field items as `a[href=#f-…]` in `fieldOrder`, then the form error as text; focuses itself when a submitted state has errors (BR1.3); renders `<title>{auth.errorTitle {title: documentTitle(view)}}</title>`, which React hoists into the head with and without JavaScript (BR1.10) |
| `FieldError` | server-compatible | `name`, `messageKey?` | `p.field-error#err-<name>` (BR1.4) |
| `TextField` | server-compatible | `field: FormField`, `label`, `hintKey?`, `defaultValue?`, `error?` | `div.field` > `label[for]` (+ `.req`) > `p.sub#hint-<name>`? > `input` with BR1.7 hints, `aria-invalid`, `aria-describedby="hint-… err-…"` > `FieldError` |
| `PasswordField` | client | as `TextField`, plus `autocomplete: 'new-password' \| 'current-password'` | input `type` from `PasswordVisibility`; after hydration a `button.link-btn` with `auth.showPassword`/`auth.hidePassword`, `aria-label` `auth.showPasswordAria`/`auth.hidePasswordAria`, `aria-controls`; announces `auth.passwordShown`/`auth.passwordHidden`; listens to the form's `submit` to hide again (BR2.1–BR2.3) |
| `CheckField` | server-compatible | `field`, `labelNode`, `defaultChecked`, `error?` | `div.field > label.check > input[type=checkbox] + span`; error under it (BR1.4) |
| `LanguageChoice` | server-compatible | `defaultLocale` | `fieldset.field > legend.lbl{auth.language} > div.opt-row > label.opt × 2 > input[type=radio][name=locale]` with `user2.lang.en`/`user2.lang.bn` (BR3.2) |
| `SubmitButton` | client (`useFormStatus`) | `labelKey`, `variant: 'ghost' \| 'small ghost'` | `button.btn` outline; `disabled` and `aria-disabled` while pending; the form gets `aria-busy` (BR1.8) |
| `StatusCallout` | client | `messageKey`, `tick?: boolean`, `mode: 'arrival' \| 'inPlace'` | `div.callout` with no live-region role; `arrival`: `tabIndex=-1`, focused on mount after a client arrival instead of the `h1`; `inPlace`: `useAnnounce()(text)` once on mount; with `tick`, the text sits inside T-011's `PublishTick`, which does not announce (BR4.1, BR11.5) |
| `JourneySteps` | server-compatible | `current: 1 \| 2 \| 3` | `nav.journey[aria-label=auth.journey.label] > ol > li × 3`, `aria-current="step"`, hidden `auth.journey.stepOf` (BR11.8) |

### 4.2 Page components

| Component | Kind | Props | Wrapper (server action) | Notes |
|---|---|---|---|---|
| `RegisterForm` | client | `locale` | `registerFormAction` | fields per BR3.1; `UsernamePreview` (client, `aria-live=off`) under the username; terms label with new-tab links (BR3.4); link `auth.haveAccount` |
| `SignInForm` | client | `next?` | `signInFormAction` | hidden `next`; email + `PasswordField current-password`; links `auth.forgot`, `auth.noAccount` |
| `SuspendedNotice` | server | — | — | `div.callout.warn` `errors.auth.accountSuspended`, rendered by the sign-in page above `SignInForm` only when the Actor carries `refusal` (BR4.8) |
| `VerifyEmail` | server | `pendingEmail?` (anonymous only), `signedIn: boolean`, `token?`, `devInbox: boolean`, `locale` | — | chooses `PendingPanel` or `VerifyConfirmForm`; `devInbox` computed on the server from `APP_MODE` (BR5.1); a signed-in holder's address, masked or not, is never passed (FD-095) |
| `PendingPanel` | server | `email?`, `mode: ResendMode` | — | body `auth.verify.body` (`<b>` typed email) or `auth.verify.bodyNoEmail`; `callout auth.verify.expires`; `ResendForm mode`; dev inbox link |
| `ResendForm` | client | `mode: 'pending' \| 'typed' \| 'own'`, `email?` (pending only) | `resendVerificationFormAction` (pending, typed) or `resendOwnVerificationFormAction` (own) | `pending`: hidden email; `typed`: a visible `f-email`; `own`: no field and no hidden address; done → `StatusCallout inPlace auth.verify.resent` (BR5.2, BR4.1) |
| `VerifyConfirmForm` | client | `token` | `verifyEmailFormAction` | `p.lede auth.verify.confirmLede`, hidden token, `SubmitButton auth.verify.confirmSubmit`; on token error swaps to `auth.verify.expired` + `ResendForm` (BR5.3, BR5.4) |
| `ResetRequestForm` | client | — | `requestPasswordResetFormAction` | done → `StatusCallout inPlace auth.reset.sent` replaces the form (BR6.1) |
| `ResetSetForm` | client | `token` | `resetPasswordFormAction` | new + confirm `PasswordField`s, hidden token; token errors link back to `/reset-password` (BR6.2, BR6.3) |
| `TokenUrlCleaner` | client | — | — | on mount `history.replaceState` without `token` (BR5.6) |
| `SecuritySettings` | server | `vm: SecurityVM`, `stepUp?: 'inline' \| 'stepUp'` | — | four `.sub` sections (BR9.1–BR9.6); the email section shows `vm.ownEmailMasked` as plain text before the state badge (BR9.2) |
| `ChangePasswordForm` | client | — | `changePasswordFormAction` | current, new, confirm; done → `StatusCallout inPlace auth.security.passwordChanged tick` and empty fields (BR9.3) |
| `SessionsTable` | server | `sessions: SessionVM[]`, `locale` | — | `table.kv.sessions`; device label per BR9.7; dates per BR9.4; stacks below 30 rem (§ 5) |
| `SignOutEverywhere` | client | `confirm: 'inline' \| 'stepUp'` (default `inline`) | `signOutEverywhereFormAction` | Q7 A; without JavaScript the first POST returns `status: 'confirm'` and renders the confirm buttons (ENT-013) |
| `WorkspaceNav` | server | `current: 'mine' \| 'saved' \| 'notifications' \| 'security'` | — | `nav.mine-tabs[aria-label=nav.mine]` > four `Link`s with `data-press`, `aria-current="page"` on the current one |
| `AccountEntry` | client | `viewer: Viewer` | — | BR8.1–BR8.5; opens the shared `Sheet` titled `viewer.displayName` (`auth.kicker` when absent) |
| `AccountMenu` | client | `viewer`, `pathname` | `signOutFormAction` | `ul.account-menu` of `Link`s with `data-press` per ENT-010 and `SignOutForm` (hidden `next` = pathname); announces `auth.signedOut` when it stays on the page (BR7.2) |
| `AuthGateProvider` | client | `viewer`, `children` | — | context `{guard}`; renders one `AuthGateSheet` (BR10.3, BR10.5) |
| `AuthGateSheet` | client | `state: GateState`, `onClose` | — | shared `Sheet` titled `auth.gate.title`; content per BR10.4 |
| `useAuthGate()` | hook | — | — | returns `{guard(fn)}`; throws outside the provider (programmer error) |
| `WriteGateCallout` | server | `viewer` | — | signed out: `div.callout.warn.signin-note` + two `.btn.small` links (`/sign-in?next=/write`, `/register`); unverified: `PendingVerificationBanner` without `ownEmailMasked` (Q14 A); exports `publishDisabledReason` for T-306 (BR10.1, BR10.2) |
| `PendingVerificationBanner` | server | `vm: PendingBannerVM`, `locale` | (uses `ResendForm mode=own`) | static `div.callout.warn`; `auth.verify.body {email: vm.ownEmailMasked}` as plain text when present (`/me`), else `auth.verify.bodyNoEmail` (BR5.7) |
| `VerifyWelcome` | server | `show: boolean` | — | `StatusCallout arrival auth.verify.done tick` and `JourneySteps current=3` when `show` (BR5.5) |

### 4.3 Wrappers (`server/actions/account.ts`, `'use server'`)

```text
type FormAction = (prev: AuthFormState, form: FormData) => Promise<AuthFormState>   // or redirect()
// AuthFormState, INITIAL_AUTH_FORM_STATE, toFormState: lib/auth-form-state.ts; sanitiseNext: lib/next-path.ts (BR1.14)

registerFormAction       → T-101 register; ok: set rk.pending, set rk.lang, redirect /<chosen>/verify-email
signInFormAction         → T-101 signIn;   ok: delete rk.pending, redirect /<locale>(sanitiseNext(next) ?? /me)
resendVerificationFormAction → T-101 resendVerification {email}; ok: renew rk.pending, {status:'done', doneKey:'auth.verify.resent'}
resendOwnVerificationFormAction → T-101 resendOwnVerification {}; ok: {status:'done', doneKey:'auth.verify.resent'}; reads no field
verifyEmailFormAction    → T-101 verifyEmail; ok: delete rk.pending, redirect /<locale>/me?welcome=1
requestPasswordResetFormAction → T-101 requestPasswordReset; ok: {status:'done', doneKey:'auth.reset.sent'}
resetPasswordFormAction  → mismatch check; T-101 resetPassword; ok: redirect /<locale>/sign-in?reset=done
changePasswordFormAction → mismatch check; T-101 changePassword; ok: {status:'done', doneKey:'auth.security.passwordChanged'}
signOutFormAction        → T-101 signOut; delete rk.pending; public target: revalidatePath + {status:'done'} (JS) or redirect (no JS)
signOutEverywhereFormAction → first POST without 'confirmed' (no JS): {status:'confirm'}; with 'confirmed': T-101 signOutEverywhere, redirect /<locale>/sign-in?signedOut=all

every error: toFormState(appError, echoedValues)     // BR1.2, BR1.12, BR4.6
sanitiseNext(raw): string | null                     // BR4.3, ENT-005
```

A wrapper knows whether JavaScript ran from a hidden `js=1` field that the client component adds after hydration; the no-JavaScript path always redirects or returns a full state. The file has `'use server'` at the top, so every export is an async function; `sanitiseNext`, the state type's initial value and the cookie name are imported from `lib/`, never exported from here (BR1.14).

## 5. Styles (T-102's section of `patient.css`)

Appended at the end of `patient.css`, each rule with `/* added: T-102 <reason> */`, values only from T-011 tokens (BR11.1). Expected rules:

| Selector | Purpose | Tokens |
|---|---|---|
| `.auth-panel` | the centred `.panel` at `max-inline-size: min(35rem, 100%)` (spec's 560 px), full width below it | padding `--space-4`, from 48 rem `--space-5` |
| `.field-error` (restyle of the D-001 rule) | `--danger-ink` text, body-small size; a leading text label is already in the copy (no icon needed) | `margin-block-start: var(--space-1)`, `--fs-small` |
| `.ctl.account`, `.ctl.account[data-verified="false"]::after` (restyle) | initials on `--primary-soft`; the warn dot in `--warn-ink` with a 2 px `--surface` ring | `--target`, `--radius-control` |
| `.account-menu` | vertical list of link rows inside the sheet (`min-block-size: var(--target)`); Sign out separated by a `--rule` | gap `--space-1`, row padding `--space-2` `--space-3` |
| `.opt:has(input:checked)`, `.opt:has(input:focus-visible)` | `--primary-soft` fill plus `--primary` border when checked; the radio input visually hidden but focusable; `outline: var(--focus-ring)` on the label | gap `--space-2` |
| `.journey` | three steps in one row with `--rule` connectors; current step bold with an underline (non-colour cue); wraps at 360 px | gap `--space-2`, `margin-block-end: var(--space-4)` |
| `.kv.sessions` below 30 rem | `thead` visually hidden; each `tr` a block with `td::before` labels from `data-label` attributes (the attribute text comes from keys) | row gap `--space-3` |
| `.own-email` | the masked address on one line, `overflow-wrap: anywhere` so a long domain wraps at 360 px | `margin-block-end: var(--space-2)` |
| `.verify-inbox`, `.auth-links` | spacing only | `--space-3`, `--space-4` |

Constraints on the section (checked by `pnpm check`):
- **Motion.** No `transition`, `animation`, `@keyframes`, `@starting-style` or view-transition rule (`check:motion` M6-file).
- **Hover.** No `:hover` rule that sets `transform`, `translate`, `scale` or `rotate` (M9-hover). Hover changes colour, background or border at once.
- **Press.** Press feedback comes from `data-press` on the menu rows and workspace links, and from T-011's list for `.btn`, `.ctl` and `.opt`.
- **Bengali.** No `text-transform` and no `letter-spacing` (BR12.3, M8-bangla).
- **Dark theme.** No column-0 `:root[data-theme="dark"] {` block: the tokens switch, and a component dark rule would continue its selector (M10-tokens).
- **Format.** Formatted by Prettier with double-quoted attribute selectors (T-011's CSS override, `format:check`).

A spacing step that no token covers is an `ISSUES.md` row for U45, never a literal length (T-011 BR3.6).

## 6. Message keys

Existing keys used as they are: every `auth.*` key of spec §5 (spec `auth.signIn` is `auth.signIn.label`), `errors.auth.{invalidCredentials,passwordTooShort,usernameTaken,usernameInvalid,ageRequired,termsRequired,emailUnverified,tokenInvalid,tokenExpired}`, `errors.common.internal`, `nav.mine`, `nav.admin`, `mine.bookmarks`, `mine.notifications`, `user2.lang.en`, `user2.lang.bn`, `user2.data`, `user2.dataNote`, `compose.required`, `disclaimer.short`.

New or changed keys (Bengali drafted here and flagged for the owner's bilingual review, FD-042):

| Key | en | bn | Why |
|---|---|---|---|
| `auth.verify.confirmLede` | One more step: confirm that this is your email. | আর এক ধাপ: নিশ্চিত করুন যে এটি আপনার ইমেইল। | Q2 |
| `auth.verify.confirmSubmit` | Confirm my email | আমার ইমেইল নিশ্চিত করুন | Q2 |
| `auth.verify.bodyNoEmail` | We sent a confirmation link to your email address. Open it to finish creating your account. | আমরা আপনার ইমেইল ঠিকানায় একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। অ্যাকাউন্ট তৈরি শেষ করতে সেটি খুলুন। | Q3; used where no address is shown (another browser, `/write`, a signed-in `/verify-email`, Q14) |
| `errors.auth.rateLimitedSeconds` | Too many attempts. Try again in {count, plural, one {{seconds} second} other {{seconds} seconds}}. | অনেকবার চেষ্টা হয়েছে। {seconds} সেকেন্ড পর আবার চেষ্টা করুন। | Q5 |
| `errors.auth.rateLimited` (changed, en only) | Too many attempts. Try again in {count, plural, one {{minutes} minute} other {{minutes} minutes}}. | (unchanged) অনেকবার চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন। | Q5 |
| `errors.auth.accountSuspended` (changed) | This account is suspended, so it can't sign in right now. | এই অ্যাকাউন্টটি স্থগিত, তাই এখন সাইন ইন করা যাবে না। | Q6, FD-088; also the suspended-session callout (BR4.8) |
| `auth.showPasswordAria` | Show password | পাসওয়ার্ড দেখান | Q8 |
| `auth.hidePasswordAria` | Hide password | পাসওয়ার্ড লুকান | Q8 |
| `auth.passwordShown` | Your password is shown. | আপনার পাসওয়ার্ড দেখা যাচ্ছে। | Q8 |
| `auth.passwordHidden` | Your password is hidden. | আপনার পাসওয়ার্ড লুকানো আছে। | Q8 |
| `auth.errorTitle` | Error: {title} | ত্রুটি: {title} | BR1.10 |
| `auth.accountMenu` | Account menu for {name} | {name}-এর অ্যাকাউন্ট মেনু | ISS-022 |
| `auth.accountMenuUnverified` | Account menu for {name}, email not confirmed | {name}-এর অ্যাকাউন্ট মেনু, ইমেইল নিশ্চিত হয়নি | BR8.4 |
| `auth.signedOut` | You're signed out. | আপনি সাইন আউট করেছেন। | BR7.2 (prototype announces it) |
| `auth.cancel` | Cancel | বাতিল | Q7 |
| `auth.security.signOutAllConfirm` | Yes, sign out everywhere | হ্যাঁ, সব জায়গা থেকে সাইন আউট করুন | Q7 |
| `auth.security.signedOutAll` | You've been signed out on every device. Sign in again to continue. | সব ডিভাইস থেকে সাইন আউট হয়েছে। চালিয়ে যেতে আবার সাইন ইন করুন। | Q7 |
| `auth.security.deviceLabel` | {browser} on {os} | {os}-এ {browser} | Q10 |
| `auth.security.deviceUnknown` | Unknown device | অজানা ডিভাইস | Q10 |
| `auth.security.justNow` | Just now | এইমাত্র | BR9.4 (prototype text) |
| `a11y.newTab` | (opens in a new tab) | (নতুন ট্যাবে খোলে) | BR3.4 |
| `auth.journey.label` | Steps to join | যোগ দেওয়ার ধাপ | Q12 |
| `auth.journey.create` | Create account | অ্যাকাউন্ট খুলুন | Q12 |
| `auth.journey.confirm` | Confirm email | ইমেইল নিশ্চিত করুন | Q12 |
| `auth.journey.start` | Start writing | লেখা শুরু করুন | Q12 |
| `auth.journey.stepOf` | Step {step} of {total} | ধাপ {step}/{total} | Q12 |

Added by T-101 before this Unit, with this Unit's proposed copy (T-101 § 8): `errors.auth.emailInvalid` (ISS-020), `errors.auth.displayNameRequired` (ISS-020), `errors.auth.passwordTooLong` (T-101 Q7) and `errors.auth.passwordEqualsEmail` (T-101 Q7). WF0 step 3 checks that all four are in both files.

The masked address needs no new key: the `/me` banner reuses `auth.verify.body {email}` with the masked value, and the security page shows it under the existing `auth.security.email` heading.

## 7. Interaction by state

| Action | Signed out | Signed in, unverified | Signed in, verified |
|---|---|---|---|
| Account entry | link to `/sign-in?next=` | sheet: Confirm your email first, dot, "email not confirmed" in the name | sheet without the Confirm item |
| `/register`, `/sign-in` | the form (sign-in: plus the suspended callout when the Actor carries `refusal`) | redirect to `next` or `/me` | redirect to `next` or `/me` |
| `/verify-email` | pending panel (typed address if the cookie has it) | pending panel without an address; Resend needs no address (`own`) | pending panel without an address (harmless; nothing to resend) |
| `/verify-email?token=` | confirm button | confirm button | confirm button (T-101 keeps an active account unchanged) |
| `/write` | gate callout, no composer | pending banner without an address and an `own` Resend, composer with Publish disabled (T-306) | composer |
| `/me` | (T-409's sign-in guidance) | pending banner with `s****@example.test` and an `own` Resend | welcome after `?welcome=1` |
| React, comment, bookmark, report, claim | gate sheet: sign in or register | gate sheet: confirm your email, with the link | runs |
| `/me/security` | gate panel with Sign in | full page; email section `s****@example.test` · "Not confirmed" | full page; email section `s****@example.test` · "Confirmed" |
| Sign out (account menu) | — | stays on a public page (announced) or goes to `/` | same |

| Action | Full motion | Reduced motion |
|---|---|---|
| Move between auth pages | T-011 route transition | instant |
| Open the account or gate sheet | T-011 sheet rise | at once |
| Press a button | scale 0.98 (T-011) | colour only |
| Email confirmed, password changed | tick draws once beside the text | complete tick at once |
| An error appears | no movement, focus to the summary | same |

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, jsdom), each in `en` and `bn`, inside the translation provider, with synthetic data. Builders (`aViewer()`, `anAuthFormState()`, `aSecurityVM()`, `anOwnAccount()`, `anActor()`) live in `components/patient/auth/auth-test-support.ts`. That file is in the test category of `eslint.boundaries.mjs` and excluded from coverage. Nothing imports `@rogikotha/test-support` (FD-040). Every test that renders a form mocks `@/server/actions/account`. The page and viewer tests mock `@/server/auth`, `next/headers` and `next/navigation`. `@/i18n/routing` is mocked as T-010's tests do (ISS-053).

| Test | Asserts | Rules |
|---|---|---|
| RegisterForm renders every field in order with required markers | seven fields (email, password, username, display name, a fieldset of two radios, two checkboxes) with `.req`; radios are inputs; default radio = route locale | BR3.1, BR3.2 |
| RegisterForm shows the summary and inline errors from a failed state | summary first, links to `#f-…` in field order, `aria-invalid` and `aria-describedby` with hint then error, focus on the summary, email and username echoed, password empty | BR1.2–BR1.4, BR1.9 |
| The Show button says what it will do | appears after mount only; flips `type`, text and accessible name; no `aria-pressed`; announces; hidden again on submit | BR2.1, BR2.2 |
| The username preview follows the input | `@shirin_88` while typing; empty when cleared | BR3.3 |
| The terms links open the policy pages in a new tab | `href` `/en/terms`, `/bn/privacy`; `target=_blank`; hidden note present | BR3.4 |
| SignInForm keeps the email after a wrong password | one generic message; email echoed | BR4.2 |
| Rate-limit copy picks the unit | 5 s → "5 seconds" / "৫ সেকেন্ড"; 1 s → "1 second"; 61 s → "2 minutes"; 900 s → "15 minutes" / "১৫ মিনিট" | BR4.6 |
| Suspended sign-in shows no appeal route | the reworded text; no link to `/me` | BR4.5 |
| VerifyEmail shows the dev inbox link only outside production | present for `APP_MODE=development`, absent for `production` | BR5.1 |
| VerifyEmail with a token shows a confirm button and calls nothing on render | button present; the action spy not called | BR5.3 |
| ResendForm posts the right resend for each mode | `pending`: hidden email, anonymous wrapper; `typed`: a visible field; `own`: no field and no hidden input, the own wrapper; done is announced once through the `useAnnounce` mock and the callout has no `role` | BR5.2, BR4.1 |
| A signed-in holder never sees an address on `/verify-email` | `signedIn` with no `pendingEmail` → `auth.verify.bodyNoEmail` and `own` mode; no `@` in the panel's text | BR5.1, BR13.2 |
| The welcome shows only for a verified Actor | `welcome=1` + verified → callout, focused, no `role`; `welcome=1` + unverified or anonymous → nothing | BR5.5, BR4.1 |
| The pending banner shows the masked address only where it is given | `ownEmailMasked: 's****@example.test'` → that text; absent → `auth.verify.bodyNoEmail`; never a field | BR5.7 |
| AccountEntry has three states | signed out link with `next`; unverified button with dot and "email not confirmed" name; verified; staff item last; without a display name the glyph and `auth.kicker` | BR8.2–BR8.5 |
| Initials keep Bengali clusters | "শিরিন রহমান" → "শি" + "র" (the vowel sign stays with its consonant); "Dr. Farhana Rahman" → "FR"; one word → one grapheme | BR8.5 |
| The viewer never carries an address | `toViewer(anActor(), anOwnAccount({emailMasked}))` serialised has no `@`, no `emailMasked`, no `username`, no `accountId`; `loadOwnAccount` runs once per request for the layout and the page | BR8.7, BR13.2 |
| The unread count never shows 0 | undefined and 0 → no `.count`; 3 → "3" / "৩" | BR8.6 |
| AuthGateSheet opens with the right copy | signed out → `auth.gate.body` and two links; unverified → `auth.gate.verifyToAct` and the confirm link; verified → `fn` runs and no sheet | BR10.3, BR10.4 |
| SecuritySettings marks the current session and shows no history | "This device" on the current row; "Just now"; Bengali dates; no element for logins or alerts; device label from parts; "Unknown device"; the email section shows `s****@example.test` before the state | BR9.2, BR9.4, BR9.7 |
| The sign-in page explains a suspended session | Actor with `refusal: 'suspended'` → the reworded callout above the form, no link; without `refusal` → none | BR4.8 |
| The error title comes from the summary | a failed state renders a `<title>` with "Error: …"; `generateMetadata()` returns the plain title | BR1.10 |
| Sign out everywhere asks first | the first activation shows the note, confirm and cancel; cancel restores; no password field | BR9.5 |
| WorkspaceNav marks the current page | `aria-current="page"` on Security | BR9.1 |
| WriteGateCallout | signed out: callout and two links, no form slot; unverified: banner and `publishDisabledReason` | BR10.1, BR10.2 |

Action tests (`server/actions/account.*.test.ts`, with T-101's actions faked):

| Test | Asserts | Rules |
|---|---|---|
| `sanitiseNext` table | `/x` ok; `//x`, `/\x`, `https://x`, `/admin/queue`, `/api/health`, `/sign-in`, a 513-character path, a path with a newline → null; `/x?y=1#z` kept; `/bn/doctors` → `/doctors` | BR4.3 |
| Register ok redirects in the chosen language and sets the pending cookie | `rk.pending` attributes; `rk.lang`; target `/bn/verify-email` when `bn` chosen on `/en` | BR3.5, BR13.4 |
| Register existing email behaves exactly like a new one | identical redirect and cookie for both of T-101's ok results | BR4.7 |
| Mismatched passwords never reach the command | `auth.reset.mismatch`; the T-101 fake not called | BR2.4 |
| No password in any returned state | every error path's state has no password-like value | BR1.2 |
| Sign-out targets | public path kept; `/me/security` → `/`; device cookie untouched | BR7.2, BR7.3 |
| The own resend sends no address | `resendOwnVerificationFormAction` calls the T-101 fake with `{}` whatever the form holds; a rate limit gives BR4.6's copy | BR5.2 |

T-010 harness (BR14.8):
- **`app/pages.test.tsx`.** It gains the mocks and `searchParams`. Every replaced row keeps its assertions: one `h1` with `titleForView(view)`, `metadata.title === documentTitle(view)`, `robots` equal to `{ index: false }` on `noindex` rows and absent on `/write`.
- **`app/layouts.test.tsx`.** It gains the two server mocks and one case: a signed-in, unverified viewer renders the account button with the dot, and no `@` appears in the masthead.

Smoke: `auth.smoke.test.tsx` (the five auth pages render their `h1` in `en` and `bn`; the signed-out account entry links to `/sign-in`), run by `pnpm smoke`. The Playwright `e2e/smoke/auth.spec.ts`: register a synthetic `newuser.<run>@demo.rogikotha.local` → read the link through Mailpit's API → press Confirm → `/me?welcome=1` shows the confirmation. It runs with `pnpm --filter @rogikotha/web smoke:e2e`, not with `pnpm smoke` (BR14.2).

UI gates: `pnpm check` (eleven steps, including `contrast`, `contrast:patient` and `check:motion`), `pnpm smoke`, `smoke:e2e`, `npx impeccable detect apps/web/src --no-advisory`, all clean, and CI green on the Bolt head (BR14.3). `apps/web` stays at or above 80% lines (BR14.9).
