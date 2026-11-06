# T-102 — Patient auth screens: register, sign-in, verify, reset, security, account entry, gates

| Field | Value |
|---|---|
| Story | STORY-AUTH-001, STORY-AUTH-002 (patient half) |
| Phase / Lane | 1 / B |
| Class → model | M2 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 4–6 h agent; validation 1.5 h |
| Depends on | T-101 (commands + actions), T-008 (shell; restyled by T-011, FD-091), D-001 auth-screen review (both locales, both themes, 360 px) approved by the owner and recorded in this Unit's record — an explicit gate (FD-053), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-103, T-104, T-105 (lane A, disjoint paths), T-207 |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-102 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Read first, Owned paths, the motion step and the acceptance checks.

## Amendments — owner decisions (FD-045..FD-075)

These decisions are binding and override the text below where they differ; the steps below are already corrected.

- **FD-053** — The D-001 auth-screen review (both locales, both themes, 360 px) is an explicit gate on this Unit: the owner's approval must be recorded in this Unit's record. Changes "Depends on" and the acceptance checks.
- **FD-057** — The security page ships the session list and "Sign out everywhere" only, on top of T-101's 30-day sessions. Recent successful logins and failed-login alerts are deferred and get no UI. Changes Not in scope, step 8 and the acceptance checks.

## Amendments — U9 Functional Design and build (2026-11-04 to 2026-11-06)

These are binding and override the text below where they differ. The design is in `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-102-patient-auth-screens/functional-design/` (Q1–Q18 and review points R-01 to R-08, decided under the owner's delegation of 2026-11-04). The rows labelled `FD-0nn:` at the end of the acceptance table replace the original rows of the same name (FD-074).

- **FD-103 / Q17, Q18** — registering does not sign in. The pending screen is `/verify-email` with the typed address carried in the `rk.pending` cookie, and the emailed link opens a Confirm button (POST), whose done panel is `/verify-email?confirmed=1`, not `/me?welcome=1`.
- **Q7 / BR6.4** — "Sign out everywhere" asks for an explicit `<details>` confirmation, not a password: `account.signOutEverywhere` takes `{}` (ISS-440).
- **Q5 / BR4.2** — the rate-limit copy follows `retryAfterSec`: seconds under 60 s, whole minutes from 60 s (ISS-436).
- **Q16 / C16** — `ContributionGate {purpose, returnTo}` and `getContributionAccess()` are the one contribution rule; the demo write actions also refuse an unconfirmed account (`requireContributor`, ISS-484).
- **Q13** — the owner's FD-053 content review and FD-091 look review of these screens move to the U50 release check and stay on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.

## Goal

Implement the patient-side auth screens and the masthead account entry exactly as `docs/design/auth-screens-spec.md` §1–§3 and the D-001 prototype show them, on top of the T-101 actions: `/register`, `/sign-in`, `/verify-email`, `/reset-password`, `/sign-out`, `/me/security`, the gate callout on `/write`, and a reusable gate sheet that later tasks trigger from comment/react/bookmark/report/claim controls.

## Read first

1. `docs/implementation/01-conventions.md` §6 (i18n), §7 (CSS port rules; FD-091: for patient pages the T-011 rule replaces them), §8 (React port rules: server actions, `useActionState`, Sheet, LiveRegion, noindex), §9.
2. `docs/implementation/03-routes-and-contracts.md` §1 patient rows for `/register` … `/me/security`, `/sign-out`; §2 error codes `auth.*`.
3. `docs/design/auth-screens-spec.md` — §1, §2, §3 (all), §5 (keys), §6 (acceptance).
4. The D-001 prototype output: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` functions `renderRegister`, `renderSignin`, `renderVerify`, `renderReset`, `renderSecurity`, `renderAccountEntry`, `openAuthGate`, `openStepUp` (find with `grep -n "STORY-AUTH"`), and `index.html` `.controls` + the new views. Port their DOM and behaviour 1:1; the look comes from T-011 (FD-091).
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
- `apps/web/src/styles/patient.css` (append-only: `.field-error`, `.ctl.account` if D-001 added them — FD-091: restyle them on T-011 tokens in this Unit's section, marked `/* added: T-102 reason */`)
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
12. **Motion (FD-091).** Wrap the auth pages in T-011 `RouteTransition`. Error summaries and inline errors appear without movement so focus and announcements are not delayed. `AuthGateSheet` uses the T-011 sheet entry. Nothing animates the callouts that carry hard-rule or privacy wording. Reduced motion (AC2.4.3) turns every movement off and each flow still completes.

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
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |
| FD-091: auth screens re-reviewed on the T-011 look | the owner reviews `/register`, `/sign-in`, `/verify-email`, `/reset-password` and `/me/security` in `en` and `bn`, in both themes, at 360 px, on the T-011 look | explicit gate before T-102 closes: the owner's approval is recorded in this Unit's record with its date; the earlier D-001 approval (FD-053) was given on the 04b look and does not cover it |
| FD-103: Spec §6 flow (Q17, replaces "Spec §6 flow") | manual in browser + Mailpit | register → pending screen showing the address → Mailpit → Confirm (POST) → `/verify-email?confirmed=1` with `auth.verify.done` |
| FD-103: same-email register (replaces "Same-email register") | register twice with one address | identical pending screen, redirect and `rk.pending` cookie; no sign-in; "someone tried" mail |
| FD-074: `next` safety (BR1.5, R-03, R-04, replaces "`next` safety") | `/sign-in?next=https://evil.example`; `next=/sign-in`, `/en/Admin`, `/en/%61dmin`; `next=/en/experiences/abc` | the first four go to `/{locale}/me`; the last is honoured |
| FD-063: rate limit copy (Q5, replaces "Rate limit copy") | failed sign-ins from the 3rd, then past the 10-in-15-minutes limit | the seconds copy (`formErrors.auth.rateLimitedSeconds`) under 60 s; the minutes copy (`errors.auth.rateLimited`) from 60 s, in the active language's numerals |
| FD-057: sign out everywhere (Q7, replaces the password wording above) | two browsers, `/me/security`, open "Sign out everywhere" and confirm | both browsers are signed out; no password is asked |
| FD-053, FD-091: owner reviews (Q13) | the two owner review rows above | moved to the U50 release check; on `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` |

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

Filled in by U9 `t-102-patient-auth-screens` on 2026-11-06. The full record is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/t-102-patient-auth-screens/code-generation/code-summary.md`.

### What changed

- The patient account path on T-101's commands: the `/verify-email` pending screen and POST-only confirm, the done and expired panels; `/reset-password` request and set-new-password; `/me/security` (masked address, change password, sessions, sign out everywhere); the account entry with grapheme-safe initials and Security and Confirm links; `ContributionGate` and `getContributionAccess()` (C16) for U47 and U49.
- Register no longer signs in (FD-103); `next` goes through `safeAuthNext`; the rate-limit copy follows `retryAfterSec`.
- The demo comment, publish and edit actions refuse an unconfirmed account through `requireContributor` (ISS-484).
- 902 i18n keys in `en` and `bn`; U9's section of `patient.css`.

### Not done and why

- The browser-only acceptance rows (live Mailpit flow, No-JS, focus, two-browser sessions, 360 px overflow, reduced-motion journey) were not walked in the worktree, because the development database and ports belong to the other worktrees (ISS-498). Build and Test or U50 walks them.
- The owner's FD-053 content review and FD-091 look review move to the U50 release check (Q13).

### Questions for the human

- Confirm the severity of ISS-484 (an unconfirmed account could comment and publish, fixed in U9). It is recorded as S1, following BR8.1's violation wording.

### Follow-ups

- ISS-482 (`/me` not session-aware, FD-096 banner), ISS-483 (release 2 `restricted` in C9 and C10), ISS-486, ISS-493, ISS-498; the unused `auth.gate.body` key (ISS-481) for U50.

### `pnpm check` output summary

2026-11-06 on `bolt/t-102-patient-auth-screens`: `pnpm check` exit 0, 230 test files, 2,541 passed and 2 expected fail; i18n parity 902 keys; contrast, `contrast:patient` and `check:motion` pass; one lint warning outside U9 (ISS-493). Line coverage: all files 97.75%, `apps/web` 97.09%. `pnpm smoke` exit 0, 18 files, 36 tests. At Step 13: `pnpm test:int` 41 files, 284 passed and 2 expected fail; `npx impeccable detect apps/web/src --no-advisory` no findings.

### Hard-rule evidence

- Every string in both languages: i18n parity passes at 902 keys; every component test runs in `en` and `bn`, with numerals in the active language.
- noindex on all auth and `/me/*` pages: asserted by the five page tests; `no-referrer` on `/verify-email` and `/reset-password`.
- Anti-enumeration: register, resend and reset give the same answer for any address (adversarial test 1, `register-enumeration.adversarial.test.ts`).
- Errors are text, summary and inline; no typed value is returned in the form state (BR1.2, BR10.1).
- Reading unaffected: no public page gained an auth requirement; only the contribution actions refuse.
- Synthetic data only (`example.test` addresses); no tool, model or agent identity in any file or commit.
