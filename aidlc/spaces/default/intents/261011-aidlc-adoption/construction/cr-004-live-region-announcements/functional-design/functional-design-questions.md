# Functional Design — questions (U7 `cr-004-live-region-announcements`)

Context:
- Unit U7 (kind `ui`, size S) delivers CR-004 (`docs/implementation/tasks/CR-004-live-region-announcements.md`) for story US12.1. Inputs read: `unit-of-work.md` (U7), `unit-of-work-story-map.md` (US12.1 → U7, U20, U40, U42), `requirements.md` (FR91, FR95, NFR6, NFR7), `components.md` (no domain component owns the web shell) and `contract-summary.md` (edges to U7 carry no runtime contract).
- Code read as it is on `main`: `apps/web/src/components/shared/ThemeControls.tsx`, `apps/web/src/components/patient/ViewShell.tsx`, `apps/web/src/lib/announce.ts`, `apps/web/src/components/shared/LiveRegion.tsx`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/lib/titles.ts`, `packages/i18n/messages/en.json` and `bn.json`, and the prototype's `concept-04b-quiet-clinic-minimal/app.js` (lines 144–186 and 313).

## Settled before this stage

- **Language policy (CR-004's "question for the founder")**: settled by **FD-042**, option (a). The announcements are localized: new keys go into both `en.json` and `bn.json` in the same change, and the Bengali copy is drafted in this Unit and flagged for the owner's bilingual review at the phase gate, together with `ISS-050`. Not asked again.

## Settled in this design without a question

These follow from FD-042, the Mandated rules in `project.md` or the code, so they are design decisions, not open points. Each is explained in `functional-spec.md` § Decisions.

- **View names are localized.** The view announcement speaks the page's localized name (the same mapping the page titles use), not the raw view identifier such as `signin`. A raw identifier is English text inside a Bengali announcement, which the equal-language rule (ADR 0011, FD-024) forbids.
- **Theme announcement timing.** The theme is announced once the preference write has succeeded, so a screen-reader user never hears a change that did not happen. This matches the prototype's order (apply, then announce).
- **Full-sentence keys.** Each announcement is one whole message key (with a `{view}` placeholder for the view name), not a sentence assembled from fragments, and not an ICU `select` (the parity check reads `{word}` inside a `select` as a placeholder and would fail it).
- **Motion toggle stays silent.** CR-004 puts it out of scope; the prototype does not announce it either.
- **Generated key file.** Adding keys means regenerating `packages/i18n/src/keys.ts` (the parity check fails when it is stale). That is a generated file outside CR-004's listed owned paths; the Code Generation plan names it, with the test files, as a mechanical addition for the owner's plan approval.

## Question 1

In which language, and at what moment, is the **language toggle** announced?

Why this is open: in the prototype the language switches in place, and `app.js:151` announces after the new language is applied. In the port, `#lang` is a link to the same page under the other locale: the page is rebuilt in the new locale, and the live region (rendered once in `[locale]/layout.tsx`) is expected to be replaced along with it. CR-004 step 2 says to call `useAnnounce()` in the click handler, and its acceptance row "Bengali" expects Bengali strings under `/bn`. For the language toggle, only a click-time announcement delivers that literally, and a click-time message is in the language being left, sits under the old `lang`, and is likely removed before a screen reader reads it. The two sources point different ways, so the owner decides.

A. **Announce after the switch, in the new language** (recommended). The click leaves a short-lived note. The newly rendered page reads it and announces `Language: English` on `/en` or `ভাষা: বাংলা` on `/bn`, in its own language, in place of the view announcement. This works whether or not the live region is replaced, the screen reader speaks it with the matching voice, and it keeps the prototype's order (apply, then announce). Cost: about one extra hour in Code Generation. CR-004 acceptance row 3 then reads, for the language toggle: "switching to `/bn` announces in Bengali; switching to `/en` announces in English". The theme rows are unchanged.
B. **Announce at the click, in the language being left** (the literal CR-004 step 2): `Language: Bengali` on `/en`, `ভাষা: ইংরেজি` on `/bn`. This is the smallest change and matches acceptance row 3 word for word. But the message is likely cut off by the page change, so in the running app a screen-reader user may hear only the view announcement in the new language. A component test passes either way; only the running app shows the difference.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)
