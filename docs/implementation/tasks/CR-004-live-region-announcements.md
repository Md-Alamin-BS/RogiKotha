# CR-004 — Live-region announcements: decide the language policy, then finish the port

| Field | Value |
|---|---|
| Story | STORY-NFR-006 (aria-live region) |
| Phase / Lane | 0 / B |
| Class → model | M2 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor |
| Effort setting | high |
| Estimate | ≤ 1 h agent once the founder answers the question below |
| Depends on | T-008 (merged) |
| Parallel-safe with | anything outside `apps/web/src/components/shared/` and `apps/web/src/components/patient/ViewShell.tsx` |
| Status | **needs queueing — blocked on a founder decision** |

## Why this exists

`ISS-122` (S3, found by T-008's validator). The ported language and theme controls
(`apps/web/src/components/shared/ThemeControls.tsx`) call their server actions and nothing else.
The prototype announced both changes to the `#sr-live` region:

- `concept-04b-quiet-clinic-minimal/app.js:151` — `announce('Language: ' + (lang === 'bn' ? 'Bengali' : 'English'))`
- `concept-04b-quiet-clinic-minimal/app.js:173` — `announce('Theme: ' + (currentIsDark() ? 'dark' : 'light'))`

Theme is the worse loss: toggling it changes nothing focusable and nothing navigable, so a
screen-reader user currently gets **no feedback at all** that anything happened. `01-conventions.md`
§8 and T-008's own step 10 ask the port to mirror `announce()`.

This was not fixed when it was found because a validator never fixes code, and because the obvious
fix is not mechanical — see the question.

## The question for the founder (this is what blocks it)

The prototype's announcement strings are **hard-coded English**, in a product that must work fully in
Bengali. The already-merged port reproduces that precedent: `ViewShell.tsx:27` announces
`` `View: ${view}` `` — hard-coded English, on every patient view change, in both locales.
`01-conventions.md` §6 says no hard-coded user-facing strings; a live-region announcement is
user-facing. So the two rules point in opposite directions and a call is needed:

- **(a) Localize them.** Add `a11y.announce.language`, `a11y.announce.theme`, `a11y.announce.view`
  (or similar) to **both** `packages/i18n/messages/en.json` and `bn.json`, and use them in
  `ThemeControls` and `ViewShell`. Correct per §6, and the right experience for a Bengali screen-reader
  user — but it means **inventing new Bengali copy**, which is exactly what `ISS-050` already asks the
  founder to review for T-006's invented strings. Needs the wording signed off.
- **(b) Keep them English-only**, matching the prototype and the existing `ViewShell` precedent, and
  log an explicit exemption from §6 for live-region text.
- **(c) Drop the announcements entirely** and accept the regression. Not recommended — it leaves the
  theme toggle silent.

Recommendation: **(a)**, batched into the same bilingual review as `ISS-050` so the founder signs off
one set of Bengali strings rather than two.

## Read first

1. This file's "Why this exists", then `ISSUES.md` row `ISS-122` (and `ISS-050` for the bilingual-review context).
2. `docs/implementation/01-conventions.md` §6 (i18n — no hard-coded user-facing strings), §8 (React port rules).
3. `apps/web/src/lib/announce.ts` — the `useAnnounce()` hook already exists and already works
   (`LiveRegion.test.tsx` covers it). Nothing new is needed in the plumbing.
4. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` lines 144-175.

## Owned paths

Modify: `apps/web/src/components/shared/ThemeControls.tsx`,
`apps/web/src/components/patient/ViewShell.tsx`,
and — only under option (a) — `packages/i18n/messages/en.json` + `packages/i18n/messages/bn.json`
(both in the same commit, per `01-conventions.md` §6).

## Not in scope

The motion toggle: the prototype does not announce it either (`app.js:176-186`), so leaving it silent
is fidelity, not a defect. Do not add an announcement there without asking.

## Steps

1. Read the founder's answer to the question above (it will be in `NEXT.md` under "Questions for the
   human", or in `docs/status/decision-log.md` as an FD). **Do not guess it.** If it is still
   unanswered, stop and say so — this task is not startable without it.
2. Under (a): add the three keys to both dictionaries in one commit; call `useAnnounce()` in
   `ThemeControls`'s two click handlers and switch `ViewShell`'s hard-coded string to the key.
   Under (b): call `useAnnounce()` in the two handlers with the prototype's exact English strings and
   add the §6 exemption note to `01-conventions.md` §6 as a one-line exception.
3. Add a component test per control asserting the live region receives the expected text, in `en`
   and in `bn` (`01-conventions.md` §10 requires both locales).
4. Add one `*.smoke.test.tsx` assertion so the cumulative suite catches a future regression — this
   defect is exactly the kind a smoke assertion would have caught at implementation time.
5. Close `ISS-122` as `fixed in CR-004` with which option was taken and why.

## Acceptance checks

| Check | How | Expected |
|---|---|---|
| Theme toggle announces | render the patient masthead, click `#theme`, read `#sr-live` | non-empty text naming the new theme, in the page's locale under option (a) |
| Language toggle announces | same, click `#lang` | non-empty text naming the new language |
| Bengali | repeat both under `/bn` | option (a): Bengali strings; option (b): the English strings, deliberately |
| i18n parity | `pnpm check` | passes; under (a) both dictionaries carry the new keys |
| No regression | `pnpm check` and `pnpm smoke` | green, nothing skipped |
| Motion toggle untouched | grep `ThemeControls.tsx` | no announcement added for motion |
