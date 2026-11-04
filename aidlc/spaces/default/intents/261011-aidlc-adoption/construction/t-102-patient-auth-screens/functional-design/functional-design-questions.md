# Functional Design — questions (U9 `t-102-patient-auth-screens`)

Unit U9 (kind `ui`, size L, high risk: auth) builds T-102 for US3.1, US3.2 and US2.4, release 1 (FD-105), on `main` at `bc63889`. T-101 (U8) is merged. This file carries over the draft in `docs/aidlc-migration/design-drafts/t-102-patient-auth-screens/` (refreshed 2026-10-29) and updates it to what is now on `main`:

- **Registering no longer signs in (FD-103).** `register` in `server/actions/auth.ts` redirects to `/sign-in` for every address. This Unit replaces that redirect with the "check your email" pending screen at `/verify-email` (Question 3).
- **The library's HTTP routes are closed (FD-104).** No screen calls `/api/auth/*`. Every session read goes through `getActor()`, and every change goes through the server actions in `server/actions/{account,auth}.ts`.
- **The owned paths are narrower than in the draft** (`unit-of-work.md` U9). The patient layout, `/me` and `/write` are not this Unit's files. U47 mounts the gate in the composer and U49 mounts it in the comment form (C16). So the draft's Question 1 is replaced by Question 1 below.
- **T-101's shapes are on `main`:** `OwnAccountVM` and `SecurityVM` (masked address, FD-096), `SessionVM {browser, os}`, `Actor.refusal`, `retryAfterSec` on `auth.rate_limited`, `account.resendOwnVerification`, and `signOutEverywhere` with no password.

The draft's Question 4 (own address masked) was answered by the owner on 2026-10-28 and is now FD-096, so it is not asked again. The draft's Question 10 (device label from `browser` and `os`) is settled, because T-101 merged those fields, so it is not asked again either. Every answer below except Question 13 was decided by the agent under the owner's delegation of 2026-11-04, and each one is the recommended option. Question 13 keeps two reviews that only the owner can give.

## Question 1 — files outside the owned paths

The draft edited the patient layout, `/me` and `/write`. None of them is in U9's owned paths now. What does U9 do?

A. **Stay inside the owned paths** (recommended). The gate reads the actor itself, so it needs no layout provider (C16). The confirmation lands on `/verify-email`, not `/me` (Question 17). The masthead works out "not confirmed" from the `account.status` that the layout already passes. Nothing is added to `/me` or `/write`, and U47 and U49 mount the gate.
B. Edit the three files with marked changes. This would collide with U47 (which owns `/write` and the own-review list on `/me`) inside the same parallel wave.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 2 — how the email link confirms

A. **The link opens `/verify-email?token=`, which shows one "Confirm my email" button that posts the token** (recommended). It works without JavaScript, and a mail scanner that opens the link confirms nothing. A server component cannot set the session cookie anyway.
B. A GET route handler confirms when the link is opened. Scanners would then confirm the address and take the session.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 3 — the pending screen and the typed address

After registering, the pending screen shows the address the person typed. How does that address reach the screen?

A. **A 30-minute HttpOnly flash cookie `rk.pending`, set by the register action** (recommended). It is set the same way for a new and for an existing address (FD-103). It never goes into a URL, browser history or a log line, and it pre-fills the Resend form.
B. In the query string (`?email=`), where the address would land in history and in logs.
C. No redirect, with the register form swapping to the pending panel in place. Refreshing would then re-submit the form.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 5 — rate-limit wording

A. **The unit comes from `retryAfterSec`** (recommended). Under 60 s the new key `errors.auth.rateLimitedSeconds` is used. From 60 s on, `errors.auth.rateLimited` is used, rounded up to whole minutes. Both use ICU plurals in English, numbers go through `formatNumber`, and there is no countdown and no disabled button. This closes ISS-436.
B. Keep `main`'s unit-free `formErrors.auth.rateLimited`. People would not know whether to wait 2 seconds or 15 minutes.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 6 — a suspended or banned account signing in

A. **Reword `errors.auth.accountSuspended` without an appeal route or link** (recommended). FD-088 defers appeals, and a suspended account cannot open `/me`.
B. Keep "You can appeal from your workspace".
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 7 — what stands before Sign out everywhere

`account.signOutEverywhere` takes no password (ISS-440).

A. **An inline confirmation step with no password** (recommended). A native `<details>` disclosure, "Sign out everywhere", opens to show the note and a **Yes, sign out everywhere** submit button, which posts `confirm=yes`; closing the disclosure cancels. This works without JavaScript. T-103 can later swap in step-up.
B. No confirmation.
C. A password field that nothing checks. Never.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 8 — the password Show control

A. **The visible text names the action (Show or Hide), with no `aria-pressed`** (recommended). The accessible name is "Show password" or "Hide password". The control is rendered only after hydration, and the field goes back to hidden before submit.
B. A fixed "Show" label with `aria-pressed`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 9 — what the account entry opens

A. **The shared `Sheet` at every width**, as in the approved prototype (recommended).
B. A sheet on mobile and a popover from 760 px.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 11 — motion on the auth screens

A. **T-011's primitives plus one `PublishTick`** beside the plain-text confirmations "Your email is confirmed", "Password changed" and "Signed out everywhere" (recommended). Errors and notices never move. With reduced motion the tick shows complete at once.
B. Primitives only.
C. Extra motion, such as a shake on a wrong password. Never, because it moves an error.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 12 — a joining-steps strip

A. **A static three-step strip, "Create account · Confirm email · Start writing"**, on `/register` (step 1), the pending and confirm panels of `/verify-email` (step 2) and the done panel (step 3) (recommended). It is an ordered list with `aria-current="step"`, and nothing in it moves.
B. No strip.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 13 — the FD-053 / FD-091 owner reviews

A. **Keep both owner gates** (recommended). Before Code Generation, the owner's approval of the D-001 screens, fields, copy and flows (content, not look) is recorded in this Unit's record. Before the Unit closes, the owner reviews the built screens on the T-011 look in `en` and `bn`, in both themes, at 360 px. The delegation covers design questions, not these reviews.
B. Drop the pre-build gate. That changes FD-053 and needs a new FD entry from the owner.
X. Other (please specify)

[Answer]: X — keep both owner reviews, but do not block the build on them (decided by the agent under the owner's delegation of 2026-11-04, "all the permission need from me or approval do it yourself"). Code Generation builds the D-001 screens, fields, copy and flows as specified. Both owner reviews (content per FD-053, look per FD-091, in `en` and `bn`, both themes, 360 px) move to the U50 release check, where the owner walks the built screens. They are listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`. Any change the owner asks for there becomes an `ISS-` row fixed before release. FD-053 itself is unchanged: the review still happens and is still the owner's; only its timing moves.

## Question 14 — where the masked address shows

FD-096 allows the mask in `SecurityVM` and in the pending banner on `/me` and `/write`. U9 owns neither of those two pages.

A. **Only on `/me/security`** (recommended). The gate and a signed-in `/verify-email` show no address, and the signed-in resend uses `resendOwnVerification`, which needs none. If a later Unit that owns `/me` wants the banner, FD-096 already allows it.
B. Also show it on the gate. `/write` is indexable, so FD-096 forbids that.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 15 — a session ended by a suspension

A. **When `Actor.refusal` is set, `/sign-in` shows the reworded suspended message once, above the form** (recommended). The masthead stays signed out and no appeal route is shown.
B. Show nothing.
C. Show a banner on every page.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 16 — the gate component's name and how consumers decide (new, C16)

C16 freezes the props `{purpose: 'write' | 'comment', returnTo: string}` and leaves the exported name to U9. The consumer (composer or comment form) also needs to know whether to show its own form.

A. **`ContributionGate` (named export) in `apps/web/src/components/patient/auth/ContributionGate.tsx`, an async server component with exactly the frozen props, plus a `'use server'` query `getContributionAccess(): Promise<'signed-out' | 'unconfirmed' | 'unavailable' | 'allowed'>` in `server/actions/account.ts`** (recommended). The gate renders nothing for `allowed`. A consumer calls the same query to decide whether to show its form, so one rule decides both. Components may import server actions (FD-093).
B. A gate that wraps the form as `children`. That changes C16's frozen props.
C. The gate only, with each consumer deriving access from the actor itself. Two places would then decide the same thing.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 17 — where a confirmed person lands (new)

A. **`/verify-email?confirmed=1`** (recommended). It shows the done panel only when the actor's email is verified, and links on to `/write` and `/me`. The page is owned, and the parameter cannot claim a confirmation by itself.
B. `/me?welcome=1`, as in the draft. `/me` is not owned.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 18 — the pending screen's route (new)

A. **`/verify-email` without a token** (recommended). It is the spec's route and an owned path, and the pending, confirm, done and expired states are panels of one page.
B. A new `/register/check-email` route.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Findings for the ISS register (rows to add at Code Generation, `Found in U9 T-102`)

| Finding | Sev |
|---|---|
| `safeNextPath` accepts auth pages, `/api` and `/admin` as a `next` target, so a crafted link could loop or bounce into staff routes (BR1.5) | S3 |
| `errors.auth.accountSuspended` names an appeal route that FD-088 defers (Question 6) | S2 |
| The `auth.gate.body` copy lists reactions, bookmarks and reports, which are deferred in release 1, so the comment gate uses a new `auth.gate.commentBody` | S3 |
| ISS-029 (`/me` not session-aware) and the FD-096 `/me` banner stay with whichever Unit owns `/me` | S4 |
| Release 2: `resolve-actor` gives a `restricted` account `emailVerified: true`, so C9 publish and C10 `comment.post` must refuse `restricted` accounts to match `getContributionAccess`, which returns `unavailable` for them. Release 1 sets no `restricted` state (BR8.1) | S4 |

## Review 01 findings (decided under the owner's delegation of 2026-11-04, by recommendation)

- **R-01:** `AuthFormState` gains `status`, `{key, params}` messages, `notice` and `expired`. The form formats the numbers, and U9 moves the existing forms to the new type (`frontend-components.md` § 3.1).
- **R-02:** `main`'s behaviour is kept: the returned state never carries a typed value, and with JavaScript the browser keeps its own field values. BR1.2 is rewritten so that it can be tested.
- **R-03, R-04:** `safeAuthNext` is defined exactly (decode once, compare in lower case, require a locale prefix, refuse the auth pages, `/api` and `/admin`) and tested on `/sign-in`, `/en/Admin` and `/en/%61dmin`. The one default after sign-in is `/{locale}/me` (BR1.5, BR1.6, BR4.4).
- **R-05:** `rk.pending` is also cleared on sign-out and sign-out everywhere, and is validated on every read (BR2.2).
- **R-06:** `next` travels in `rk.pending` to the done panel, which shows a "Continue" link after the same check (BR3.2).
- **R-07:** the `restricted` mapping is recorded as a release-2 point, with the ISS row above (BR8.1).
- **R-08:** U9's page tests go in its own files, `pages.test.tsx` is not edited, and `keys.ts` is regenerated on rebase (`frontend-components.md` § 5, § 7).

## Sources

- `inception/units-generation/unit-of-work.md` (U9, U47, U49), `unit-of-work-story-map.md` (US2.4, US3.1, US3.2), `requirements-analysis/requirements.md`, `user-stories/stories.md`, `domain-design/components.md`, `contract-design/contract-summary.md` (C5, C16, C19)
- `docs/status/decision-log.md` FD-053, FD-057, FD-088, FD-091, FD-093, FD-096, FD-099 to FD-105
- `main` at `bc63889`: `apps/web/src/server/actions/{auth,account,auth-form}.ts`, `server/auth.ts`, `server/auth/session.ts`, `app/[locale]/(patient)/{layout,register,sign-in,verify-email,reset-password,me}/`, `components/patient/{Masthead.tsx,auth/,profile/ProfileWorkspace.tsx}`, `packages/contracts/src/{actor,errors}.ts`, `schemas/account.ts`, `view-models/security.ts`, `packages/i18n/messages/{en,bn}.json`
- The draft at `docs/aidlc-migration/design-drafts/t-102-patient-auth-screens/`; `docs/implementation/tasks/T-102-patient-auth-screens.md`; `docs/implementation/ISSUES.md` (ISS-029, ISS-124, ISS-436, ISS-440, ISS-449)
