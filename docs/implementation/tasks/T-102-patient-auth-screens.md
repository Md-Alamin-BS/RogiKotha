# T-102 — Patient auth screens: register, sign-in, verify, reset, security, account entry, gates

| Field | Value |
|---|---|
| Story | STORY-AUTH-001, STORY-AUTH-002 (patient half) |
| Phase / Lane | 1 / B |
| Class → model | M2 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-101 (commands + actions), T-008 (shell, ported CSS), D-001 auth-screen review (both locales, both themes, 360 px) approved by the owner and recorded in this Unit's record — an explicit gate (FD-053) |
| Parallel-safe with | T-103, T-104, T-105 (lane A, disjoint paths), T-207 |

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-053** — The D-001 auth-screen review (both locales, both themes, 360 px) is an explicit gate on this Unit: the owner's approval must be recorded in this Unit's record. Changes "Depends on" and the acceptance checks.
- **FD-057** — The security page ships the session list and "Sign out everywhere" only, on top of T-101's 30-day sessions. Recent successful logins and failed-login alerts are deferred and get no UI. Changes Not in scope, step 8 and the acceptance checks.

## Goal

Implement the patient-side auth screens and the masthead account entry exactly as `docs/design/auth-screens-spec.md` §1–§3 and the D-001 prototype show them, on top of the T-101 actions: `/register`, `/sign-in`, `/verify-email`, `/reset-password`, `/sign-out`, `/me/security`, the gate callout on `/write`, and a reusable gate sheet that later tasks trigger from comment/react/bookmark/report/claim controls.

## Read first

1. `docs/implementation/01-conventions.md` §6 (i18n), §7 (CSS port rules), §8 (React port rules: server actions, `useActionState`, Sheet, LiveRegion, noindex), §9.
2. `docs/implementation/03-routes-and-contracts.md` §1 patient rows for `/register` … `/me/security`, `/sign-out`; §2 error codes `auth.*`.
3. `docs/design/auth-screens-spec.md` — §1, §2, §3 (all), §5 (keys), §6 (acceptance).
4. The D-001 prototype output: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` functions `renderRegister`, `renderSignin`, `renderVerify`, `renderReset`, `renderSecurity`, `renderAccountEntry`, `openAuthGate`, `openStepUp` (find with `grep -n "STORY-AUTH"`), and `index.html` `.controls` + the new views. Port their DOM 1:1.
5. `apps/web/src/server/actions/account.ts` and `apps/web/src/server/auth.ts` from T-101 (what each action returns).
6. `apps/web/src/components/shared/Sheet.tsx`, `LiveRegion`/`useAnnounce`, the masthead component from T-008.

## Owned paths

- `apps/web/src/app/[locale]/(patient)/register/page.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/page.tsx`
- `apps/web/src/app/[locale]/(patient)/verify-email/page.tsx`
- `apps/web/src/app/[locale]/(patient)/reset-password/page.tsx`
- `apps/web/src/app/[locale]/(patient)/me/security/page.tsx`
- `apps/web/src/app/[locale]/(patient)/terms/page.tsx`, `privacy/page.tsx` (content = the about-page policy sections; Privacy adds the FD-022 sentence)
- `apps/web/src/components/patient/auth/**` (`RegisterForm`, `SignInForm`, `VerifyEmail`, `ResetRequestForm`, `ResetSetForm`, `SecuritySettings`, `PasswordField` (Show toggle), `ErrorSummary`, `AuthGateSheet`, `WriteGateCallout`)
- `apps/web/src/components/patient/AccountEntry.tsx` (+ its menu)
- `apps/web/src/components/patient/Masthead.tsx` (insert `AccountEntry` only)
- `apps/web/src/components/patient/Composer.tsx` — **only** if T-306 has not started: add the gate callout wrapper; otherwise hand the callout to T-306 (note in hand-off)
- `apps/web/src/components/patient/WorkspaceNav.tsx` (add the Security link)
- `apps/web/src/server/actions/account.ts` (form-facing wrappers returning `useActionState`-friendly state only; command calls stay as T-101 wrote them)
- `apps/web/src/styles/patient.css` (append-only: `.field-error`, `.ctl.account` if D-001 added them — copy verbatim)
- `packages/i18n/messages/{en,bn}.json` (`auth.*` keys if not yet present)
- tests under `apps/web/src/components/patient/auth/*.test.tsx`

## Not in scope

- Staff screens, step-up sheet, role chip (T-103). Wiring the gate sheet into comment/react/bookmark/report/claim controls (T-402, T-409, T-202/T-204 do that; you export `useAuthGate()` and `AuthGateSheet`). Email-change. Workspace tabs other than the Security link.
- A list of recent successful logins and any failed-login alert on `/me/security` (deferred, FD-057).

## Steps

1. **Form primitives.** `PasswordField` (label, input `type` toggled by a `.link-btn` with `aria-pressed`, hint via `.sub`, `aria-describedby` chaining hint + error), `ErrorSummary` (`.callout warn`, `role="alert"`, `tabIndex=-1`, list of `<a href="#f-<name>">` from `fieldErrors`, receives focus on mount when errors exist), `FieldError` (`<p class="field-error" id="err-<name>">`). Field `id`s follow the prototype (`f-email`, `f-password`, `f-username`, `f-display`, `f-age`, `f-terms`).
2. **Register page.** Server component page with `metadata.robots = { index: false }` and the a-head; `RegisterForm` is a client component using `useActionState(registerAction)`; on `ok` → `redirect('/[locale]/verify-email?email=…')` performed by the action (so no-JS works). Interface-language radiogroup defaults to the route locale. Username preview `@name` updates as you type (client) and renders statically without JS.
3. **Verify page.** Reads `email` (echo only, never trusted) and `token`. Without token → pending panel + Resend form (`resendVerificationAction`, shows `auth.verify.resent` or `errors.auth.rateLimited` with `{minutes}`) + dev inbox link when `process.env.APP_MODE !== 'production'` (`http://localhost:8025`, label `auth.verify.devInbox`, rendered server-side). With token → call the verify action; success → `redirect('/me?welcome=1')`; failure → `auth.verify.expired` + Resend.
4. **Sign-in page.** `SignInForm` with `next` hidden field; the action validates `next` is a same-origin path starting with `/` and not `//`, else `/me`. Generic error, rate-limit error with minutes, suspended error with a link to `/me` (appeal lives there). Links `auth.forgot`, `auth.noAccount`.
5. **Reset page.** Two forms by presence of `token`; neutral `auth.reset.sent`; set form validates equality (`auth.reset.mismatch`) and length; success → `redirect('/sign-in?reset=done')` and the sign-in page renders `auth.reset.done`.
6. **Sign-out.** A server action bound to a `<form method="post">` button in the account menu; redirect to `next` (current public path) or `/`.
7. **Account entry.** `AccountEntry` (client) rendered in `Masthead` before the language control: three states from a small `viewer` prop `{ kind, initials, verified, unreadCount, staff }` computed in the layout from `getActor()`; signed-out → link to `/sign-in?next=<pathname>`; signed-in → opens `Sheet` with the §1 menu (`auth.verifyPending` first when unverified with the warn dot; `nav.admin` last for staff; `.count` on Notifications). Match the prototype's glyph SVG and `initials()`.
8. **Security page.** `/me/security` under the workspace layout, `noindex`; sections per §3.6: email + verified badge, change-password form, sessions `.kv` table from `account.listSessions` (format dates with `packages/i18n`; active sessions only, with no recent-login history and no failed-login alerts, FD-057), **Sign out everywhere** revealing an inline password field then calling `signOutEverywhereAction` (T-103 will swap this for the shared step-up sheet; keep the inline version behind a prop so the swap is one line). Add `auth.security.nav` to `WorkspaceNav`.
9. **Gates.** `WriteGateCallout` (signed out: callout + two `.btn small`; unverified: pending banner) exported for the Composer; `AuthGateSheet` + `useAuthGate()` hook returning `guard(fn)` that runs `fn` when verified, opens the sheet with `auth.gate.body` when signed out, or `auth.gate.verifyToAct` when unverified. Render one `AuthGateSheet` in the patient layout so any component can call it.
10. Policy pages (`/terms`, `/privacy`) reuse the About component's sections (from T-207 if landed; otherwise a minimal page reading the `aboutview.*` keys) — keep short; T-207 may replace.
11. Tests, `pnpm check`, `npx impeccable detect apps/web/src --no-advisory`, hand-off, commit `T-102: …`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Spec §6 flow | manual in browser + Mailpit | register → Mailpit → confirm → `/me?welcome=1` with `auth.verify.done` |
| Same-email register | repeat | identical pending screen; "someone tried" mail |
| No-JS | disable JS, submit register with 9-char password | full-page re-render with summary + inline error |
| Focus | failed submit | focus on the summary; after navigation focus on `h1` |
| `next` safety | `/sign-in?next=https://evil.example` | redirect to `/me`; `next=/experiences/abc` → honoured |
| Rate limit copy | 11 failed sign-ins | `errors.auth.rateLimited` with minutes |
| Sessions | two browsers, `/me/security` | two rows, one `auth.security.thisDevice`; sign out everywhere kills both |
| Both locales | every page under `/bn/` | Bengali strings, Bengali digits in dates/minutes, cap-drop, no overflow at 360 px |
| noindex | curl each auth page | `<meta name="robots" content="noindex">` |
| Detector + contrast | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | clean |
| FD-053: D-001 gate recorded | read this Unit's record before Code Generation starts | the owner's approval of the D-001 auth-screen review is recorded with its date and covers `en` and `bn`, both themes and 360 px width |
| FD-053: built screens match the approved review | every auth page and `/me/security` in `en` and `bn`, in both themes, at 360 px | each matches the approved D-001 screen; no horizontal or Bengali text overflow |
| FD-057: security page scope (AC3.2.3) | open `/me/security` signed in from two browsers | a sessions table with both sessions and a Sign out everywhere control; no recent-logins list and no failed-login alert anywhere on the page |
| FD-057: sign out everywhere (AC3.2.3) | choose Sign out everywhere and confirm the password, then reload the other browser | both browsers are signed out; the next request in each is treated as signed out |
| Checks | `pnpm check` | exit 0 |

## Tests to write

- Component tests (jsdom, both locales): `RegisterForm` renders all seven fields with `.req` markers; shows summary + inline errors from a failing action state; Show toggle flips `type` and `aria-pressed`; `AccountEntry` three states; `AuthGateSheet` opens with the right copy for signed-out vs unverified; `SecuritySettings` marks the current session; `VerifyEmail` shows the dev inbox link only when `APP_MODE !== 'production'`.
- Action tests: `next` sanitiser table (`/x` ok, `//x` no, `https://` no, `/x?y=1#z` ok).
- Smoke e2e (Playwright, one spec): register → verify via Mailpit API → `/me` welcome; kept small (T-503 expands).

## Hard-rule checklist

- [ ] Write CTA remains the single accent fill; account entry and form buttons are outline/ghost.
- [ ] Errors are text + summary + inline; never colour alone.
- [ ] Anti-enumeration copy on register/reset/resend.
- [ ] Reading unaffected: no public page gained an auth requirement.
- [ ] Every string in both languages; numerals follow language.
- [ ] Persistent disclaimer in colophon on auth pages.
- [ ] noindex on all auth and `/me/*` pages.
- [ ] No attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
