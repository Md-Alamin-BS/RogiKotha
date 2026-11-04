# Functional specification — U9 `t-102-patient-auth-screens`

Unit U9, kind `ui`, size L, high risk (auth). Release 1 (FD-105). Stories US3.1, US3.2 and US2.4. Built on `main` at `bc63889`, where U8 T-101, U3 T-010 and U45 T-011 are merged. This file is the source of truth for the Unit's workflows and screen states. The rules are in `rules.md`, the components and message keys in `frontend-components.md`, and the answers in `functional-design-questions.md`. U9 adds no entities and no tables, so there is no `entities.md`.

## 1. What changes

The demo slice already has working register and sign-in forms on T-101's commands. U9 adds everything else on the account path:

- **Pending screen and confirmation.** Registering now leads to a "check your email" pending screen instead of the sign-in redirect that FD-103 put in. The emailed link opens a confirm page.
- **Password reset.** A reset request screen and a "set a new password" screen.
- **Security page.** `/me/security` gets the masked address, change password, the sessions list and sign out everywhere.
- **Account entry.** The masthead entry signals "not confirmed" and gains a Security link.
- **Gate.** **`ContributionGate`**, the gate component of C16, asks a signed-out or unconfirmed person to sign in or confirm before writing or commenting. U47 mounts it in the composer and U49 in the comment form.

Every change stays inside U9's owned paths (Question 1). The patient layout, `/me` and `/write` are not touched.

## 2. Baseline on `main`

| Area | State on `main` | U9 changes |
|---|---|---|
| `server/actions/auth.ts` | `register`, `signIn` and `signOut` form actions. `register` redirects to `/sign-in` (FD-103). Rate limits use the unit-free `formErrors.auth.rateLimited` | `register` sets `rk.pending` and redirects to `/verify-email`. Adds `confirmEmail`, `resendLink`, `resendOwnLink`, `requestReset`, `setNewPassword`, `changePasswordForm` and `signOutEverywhereForm`. Adds the rate-limit unit (BR4.2) and the suspended-account wording (BR4.3) |
| `server/actions/account.ts` | One raw action per T-101 command or query, `getOwnAccount` included | Adds `getContributionAccess()` (BR8.1). Nothing else changes |
| `server/actions/auth-form.ts` | Parsers, form state, `safeNextPath` | Replaces `AuthFormState` with the extended shape (`frontend-components.md` § 3.1); the existing forms and refusal mappers move to it inside U9. Adds `PENDING_EMAIL_COOKIE` and `readPendingCookie` (BR2.2), `safeAuthNext` (BR1.5), and the reset, change-password and resend parsers |
| `register/`, `sign-in/` | Working pages | Redirect a signed-in visitor (BR1.6). `/register` gets the joining strip. `/sign-in` gets its notices (`reset=done`, `signedOut=all`, `Actor.refusal`) |
| `verify-email/`, `reset-password/`, `me/security/` | Placeholders (`shell.placeholder`) | Built |
| `components/patient/auth/` | `AccountControl`, `AuthFields`, `RegisterForm`, `SignInForm`, `use-auth-form` | Adds the new forms, panels, `JoinSteps`, `ContributionGate` and the client `ResendOwnButton`. `AccountControl` gains the unconfirmed state and the Security link |
| `Masthead.tsx` | Passes `{displayName}` to `AccountControl` | Also passes `unconfirmed: account.status === 'pending_verification'` |
| `profile/ProfileWorkspace.tsx` | No Security link | Adds one link to `/me/security` (`auth.security.nav`) |

## 3. Workflows

### WF1 — Register (BR2.1, BR2.2, BR2.6, BR1.2)
1. `/register` renders. A signed-in actor is redirected (BR1.6). Otherwise the page shows the form, with the joining strip at step 1.
2. The person submits. `parseRegistration` validates, and on refusal the form renders again with the summary and field errors.
3. `registerCommand` runs. A refusal maps through `registerRefusal` (on `main`) or the rate-limit unit (BR4.2).
4. On `ok`, the action sets `rk.pending` to `{email, next?}`, where `next` is kept only if it passes `safeAuthNext`, and redirects to `/{chosenLocale}/verify-email`, adding `?next=` when a safe `next` was posted. A new address and an existing one get exactly the same response (FD-103). The action never signs in.

### WF2 — Pending screen and resend (BR2.3, BR2.4, BR2.5)
1. `/verify-email` with no `token` and no `confirmed` parameter renders the pending panel at step 2. The heading is `auth.verify.title`, followed by `auth.verify.expires`.
2. The text depends on the visitor:
   - signed out with `rk.pending`: `auth.verify.body` with the typed address;
   - signed out without it: `auth.verify.bodyNoEmail`;
   - signed in and unconfirmed: `auth.verify.bodyNoEmail`.
   A signed-in, confirmed actor is redirected to `/me`.
3. The Resend form also depends on the visitor. Signed out, it is an email field pre-filled from `rk.pending` and posting to `resendLink`. Signed in, it is one button posting to `resendOwnLink`. Either way the answer is `auth.verify.resent`, unless the request is rate limited (BR4.2).
4. A "Sign in" link carries `next`. In development only, `auth.verify.devInbox` links to the local Mailpit inbox (`APP_MODE` is not production).

### WF3 — Confirm the email (BR3.1, BR3.2, BR3.3)
1. The emailed link opens `/verify-email?token=…`. The page sends `referrer: no-referrer` and renders the confirm panel: one sentence, a hidden `token` field and a **Confirm my email** button (`auth.verify.confirm`). Nothing is confirmed when the link is opened.
2. The person presses the button and `confirmEmail` calls `verifyEmail`.
3. On `ok`, the action reads `next` from `rk.pending`, applies the session effect, deletes `rk.pending` and redirects to `/verify-email?confirmed=1`. When `next` passes `safeAuthNext`, it is added as `&next=`.
4. That render shows the done panel (`auth.verify.done` with a `PublishTick`, at step 3, with links to `/write` and `/me`). When `next` passes `safeAuthNext` again, the panel also shows a **Continue** link (`auth.verify.continue`). This brings a person who started at the gate back to that page, but only if `getOwnAccount` returns `emailVerified: true`. Otherwise the page falls back to the panel for the real state.
5. `auth.token_expired` or `auth.token_invalid` shows the expired panel (`auth.verify.expired` and the Resend form from WF2 step 3).

### WF4 — Sign in (BR4.1–BR4.4, BR1.5, BR1.6)
1. `/sign-in` renders. A signed-in actor is redirected. Above the form the page shows at most one notice, chosen in this order:
   - `Actor.refusal` set: the suspended message;
   - `?reset=done`: `auth.reset.done`;
   - `?signedOut=all`: `auth.security.signedOutAll`.
2. The person submits. The refusals are mapped as follows:
   - wrong combination or malformed input: one neutral message;
   - suspended: the reworded message;
   - rate limited: the seconds or minutes copy.
3. On `ok`, the action applies the session and deletes `rk.pending`. It then redirects to `next` if it passes `safeAuthNext`, and otherwise to `/{accountLocale}/me`. That is the one default (BR1.5) and it replaces `main`'s redirect to the home page.

### WF5 — Request a reset (BR5.1)
`/reset-password` with no token shows the email form. `requestReset` always answers `auth.reset.sent`, except for a field error on a malformed email or a rate limit. An `internal` result is logged and shown as "sent".

### WF6 — Set a new password (BR5.2, BR5.3)
1. `/reset-password?token=…` sends `referrer: no-referrer` and shows the new and confirm password fields with a hidden `token`.
2. If the two fields differ, the form shows `auth.reset.mismatch` on the confirm field and no command runs.
3. Otherwise `resetPassword` runs. On `ok`, the action clears the session and redirects to `/sign-in?reset=done`. A token error shows `errors.auth.tokenExpired` and a link to `/reset-password`. A password error shows the schema key on the new password field.

### WF7 — Security page (BR6.1–BR6.5)
1. `requireAccount({returnTo: '/me/security'})` runs first. The page renders per request, with `getOwnAccount({})` and `listSessions({})` called in parallel.
2. **Email row:** `emailMasked`, then `auth.security.verified` or `auth.security.unverified`. When the address is not confirmed, the row adds `ResendOwnButton`. `auth.security.emailNote` follows.
3. **Password:** `ChangePasswordForm` with the current and new password. On `ok`, the rotated session is applied and the form is replaced by `auth.security.passwordChanged` with a `PublishTick`.
4. **Sessions:** a table with the device, `auth.security.firstSeen` and `auth.security.lastSeen`. The current session carries `auth.security.thisDevice`.
5. **Sign out everywhere:** a `<details>` disclosure that opens to show `auth.security.signOutAllNote` and the **Yes, sign out everywhere** button (`confirm=yes`). On `ok`, the session is cleared and the browser goes to `/sign-in?signedOut=all`.
6. If either query fails, that section shows `errors.common.internal` and the rest of the page still renders.

### WF8 — Account entry (BR7.1, BR7.2)
1. Signed out, the entry is the person icon linking to `/sign-in`, as on `main`.
2. Signed in, it is the initials button. While unconfirmed, it carries `data-verified="false"` and the accessible name `auth.accountMenuUnconfirmed`.
3. The `Sheet` lists My writing, Security, **Confirm your email** (only while unconfirmed) and Sign out. Sign out stays on `main`'s `signOut` action, which goes to home (this closes ISS-124: the action is the route).

### WF9 — Gate (BR8.1–BR8.3, C16)
1. A consumer renders `<ContributionGate purpose="write" | "comment" returnTo="/{locale}/…" />`. To decide whether to render its own form, it awaits `getContributionAccess()` and renders the form only when the result is `allowed`.
2. The gate awaits `getContributionAccess()`. An error is treated as `signed-out`.
3. The gate then renders by access:

   | Access | What the gate renders |
   |---|---|
   | `signed-out` | callout `auth.gate.title`, then `auth.gate.writeBody` (write) or `auth.gate.commentBody` (comment), with `auth.signIn.label` linking to `/sign-in?next=` and `auth.gate.register` linking to `/register?next=`, both using the sanitised `returnTo` |
   | `unconfirmed` | `auth.verifyPending` and `auth.gate.verifyToAct`, with `ResendOwnButton` and a link to `/me/security` |
   | `unavailable` | `auth.gate.unavailable` |
   | `allowed` | `null` |

4. No address is ever shown. The commands still refuse on their own (C9 publish, C10 `comment.post`).

## 4. State transitions

### 4.1 `/verify-email` panels

| From | Event | To |
|---|---|---|
| (render) | `token` present | confirm |
| (render) | `confirmed=1` and the actor is verified | done |
| (render) | otherwise; a signed-in, verified actor is redirected to `/me` | pending |
| confirm | `confirmEmail` ok | done (after the redirect) |
| confirm | token expired or invalid | expired |
| pending, expired | resend ok, or any non-rate-limit refusal | the same panel with `auth.verify.resent` |
| pending, expired | rate limited | the same panel with the rate-limit copy |

### 4.2 Every auth form (`useAuthForm`, on `main`)
The form moves from **idle** to **submitting** (`aria-busy`, the button guarded against a double submit). It then ends in one of three states:
- **refused:** the summary takes focus and non-secret fields are refilled;
- **redirected:** the new page's `h1` takes focus;
- **replaced:** a confirmation replaces the form and is announced through `useAnnounce()`.

### 4.3 Gate access (per request)
The gate's access follows the account status:
- an anonymous actor is **signed-out**;
- an account in `pending_verification` is **unconfirmed** and becomes **allowed** after `emailVerified` (via `nextAccountState`);
- `active` with `emailVerified` is **allowed**;
- any other status is **unavailable**.

## 5. Interfaces

**Consumed (C5, C19, all on `main`).** U9 uses these unchanged:
- commands: `registerCommand`, `signInCommand`, `signOutCommand`, `verifyEmailCommand`, `resendVerificationCommand`, `resendOwnVerificationCommand`, `requestPasswordResetCommand`, `resetPasswordCommand`, `changePasswordCommand`, `signOutEverywhereCommand`;
- queries: `getOwnAccountQuery` and `listSessionsQuery`;
- web helpers: `runCommand`, `runSessionCommand`, `applySessionEffect`, `getActor`, `requireAccount` and `getCurrentAccount`.

**Exposed (C16, frozen when U9 merges):**

```ts
// apps/web/src/components/patient/auth/ContributionGate.tsx
export async function ContributionGate(props: {
  purpose: 'write' | 'comment';
  returnTo: string;
}): Promise<ReactElement | null>;

// apps/web/src/server/actions/account.ts ('use server')
export async function getContributionAccess(): Promise<ContributionAccess>;
// ContributionAccess = 'signed-out' | 'unconfirmed' | 'unavailable' | 'allowed'
// (type exported from apps/web/src/server/actions/auth-form.ts)
```

## 6. Edge cases and failure behaviour

| Case | Behaviour |
|---|---|
| The address is already registered | The same redirect and cookie as for a new address (BR2.1). The "someone tried" email is U8's |
| The link is opened in another browser | The confirm panel works there too. After `ok` that browser is signed in, with no Continue link because it has no `rk.pending`. The registering browser's `rk.pending` expires after 30 minutes |
| A shared device after the person leaves | `signOut` and `signOutEverywhereForm` delete `rk.pending` (BR2.2) |
| `rk.pending` has been tampered with | An invalid address makes the cookie count as absent, and an invalid `next` is dropped (BR2.2) |
| A mail scanner opens the link | Nothing happens, because only the POST confirms (BR3.1) |
| `confirmed=1` is typed by hand | The done panel needs a verified actor (BR3.2) |
| The reset link is reused | Refused, and the password is unchanged (BR5.3, the T-106 row) |
| A signed-out visitor opens `/me/security` | Redirected to sign in with `next` (BR6.1, the T-106 row) |
| An unconfirmed account tries to publish or comment | The gate shows the confirm prompt and the commands refuse anyway (BR8.1, the T-106 row) |
| A session is suspended after signing in | The next request is anonymous, and `/sign-in` shows the message once (BR4.3) |
| `getOwnAccount` or `listSessions` fails | That section shows `errors.common.internal` and the page stays up |
| The gate's query throws | The sign-in prompt is shown (fail closed) and the error is logged with no personal fields (BR8.3) |
| JavaScript is off | Every form posts natively. The Show control is not rendered. `<details>` works natively (BR1.1) |
| `next` is `https://evil.example`, `//x`, `/sign-in`, `/admin`, `/en/Admin`, `/en/%61dmin` or `/bn/SIGN-IN` | Refused by `safeAuthNext`, and the default `/{locale}/me` is used (BR1.5) |
| A `restricted` account (none in release 1) | The gate shows it as unavailable. C9 and C10 must refuse it in release 2 (BR8.1) |

## 7. Security view (high-risk Unit)

**Threats covered:**
- account enumeration through register, resend, reset request and sign-in (BR2.1, BR2.4, BR5.1, BR4.1);
- link scanners (BR3.1);
- open redirects (BR1.5);
- addresses leaking into URLs, logs or client props (BR2.2, BR7.2, BR10.1);
- tokens leaking through `Referer` (BR1.4);
- a gate that fails open (BR8.1, BR8.3).

**Adversarial angles for the separate agent (3–5 tests).** The T-106 rows are executed here:
1. Register and resend give byte-identical results for a new, an unconfirmed and a confirmed address: status, `Set-Cookie` names and attributes, redirect target and page text.
2. A used or expired reset token leaves the password unchanged.
3. Signed out, `/me/security` returns no session data.
4. An unconfirmed actor gets `getContributionAccess() !== 'allowed'`, and the publish and comment commands refuse it.
5. A GET of `/verify-email?token=` changes no account state and sets no cookie.

## 8. Decisions

| Decision | Why | Question |
|---|---|---|
| Stay inside the owned paths | U47 and U49 are built in the same wave | Q1 |
| Confirm by POST from a button | Scanners; a server component cannot set cookies | Q2 |
| `rk.pending` flash cookie | The address stays out of URLs and logs | Q3 |
| Wait unit from `retryAfterSec` | The delay is 1–30 s, the limits are minutes | Q5 |
| No appeal route in the suspended copy | FD-088 | Q6 |
| `<details>` confirmation, no password | The command takes `{}` | Q7 |
| Show/Hide wording without `aria-pressed` | No contradictory screen-reader output | Q8 |
| `Sheet` at every width | The approved prototype | Q9 |
| `PublishTick` on confirmations only | FD-091 within AC2.4.5 | Q11 |
| Joining strip | One step remains after registering | Q12 |
| Two owner reviews kept | FD-053, FD-091 | Q13 |
| Masked address on `/me/security` only | FD-096 and the owned paths | Q14 |
| Refusal notice on `/sign-in` | The person learns why | Q15 |
| `ContributionGate` and `getContributionAccess` | C16 props frozen; one access rule | Q16 |
| Done panel on `/verify-email` | An owned path; checked against the actor | Q17 |
| Pending screen at `/verify-email` | The spec's route | Q18 |

## 9. Acceptance mapping (T-102 rows, updated)

| T-102 row | Now reads |
|---|---|
| Spec §6 flow | register → pending screen (address shown) → Mailpit → Confirm → `/verify-email?confirmed=1` with `auth.verify.done` (Q17 replaces `/me?welcome=1`) |
| Same-email register | identical pending screen and cookie |
| No-JS | as written |
| Focus | as written |
| `next` safety | `/sign-in?next=https://evil.example` → `/{locale}/me`; `/sign-in`, `/en/Admin` and `/en/%61dmin` refused; `next=/en/experiences/abc` honoured |
| Rate limit copy | from the 3rd failure the seconds copy; after the 10-in-15-minutes limit the minutes copy |
| Sessions, FD-057 rows | as written. The password confirmation becomes the `<details>` confirmation (Q7) |
| Both locales, noindex, detector and contrast, `pnpm check`, FD-091 rows | as written |
| FD-053 rows | the owner's two reviews (Q13) |

Every changed row is written into T-102's amendments section with an `FD-0nn:` label at Code Generation (FD-074).

## 10. Risks to verify

- Calling the `getContributionAccess` server action from a server component, rather than from a form, must keep the request's cookies. Code Generation proves this with an integration test.
- `ContributionGate` is async. U47's and U49's tests must mock `@/server/actions/account`, as the page tests already do.
- The dependency log entry for `next`, `react` and `next-intl` is older than 3 days. Code Generation re-checks `useActionState` and progressive-enhancement issues and appends a dated entry.

## Rules summary (derived from `rules.md`)

The rule groups are BR1 (common form behaviour), BR2 (register and pending), BR3 (confirm), BR4 (sign in), BR5 (reset), BR6 (security page), BR7 (account entry), BR8 (gate), BR9 (look and motion) and BR10 (privacy). `rules.md` is the source of truth. There is no entity-relationship view, because the Unit adds no entities.

## Sources

- `inception/units-generation/unit-of-work.md` (U9, U47, U49), `unit-of-work-story-map.md`, `requirements-analysis/requirements.md` (FR1–FR9, FR95, NFR3, NFR6, NFR13), `user-stories/stories.md` (AC2.4.1–AC2.4.6, AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5), `domain-design/components.md` (Account), `contract-design/contract-summary.md` (C5, C16, C19)
- `docs/status/decision-log.md` FD-053, FD-057, FD-063, FD-088, FD-091, FD-093, FD-096, FD-099 to FD-105
- `docs/implementation/tasks/T-102-patient-auth-screens.md`; the draft in `docs/aidlc-migration/design-drafts/t-102-patient-auth-screens/`
- The code on `main` at `bc63889` listed in § 2
