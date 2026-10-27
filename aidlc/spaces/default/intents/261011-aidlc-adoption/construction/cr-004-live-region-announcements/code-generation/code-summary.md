# Code summary — U7 `cr-004-live-region-announcements` (CR-004)

## What was built

The theme toggle, the language toggle and the view change now speak to the screen-reader live region (`#sr-live`), always in the page's own language, from message keys present in both dictionaries (option (a), FD-042; closes `ISS-122`).

- **Theme toggle** (`#theme`, patient and staff mastheads): computes the opposite of the effective theme as before, picks `a11y.announce.themeDark` or `a11y.announce.themeLight` in the active locale, and announces it only once `setTheme` resolves. The announcement is chained to the write's promise rather than awaited, so a failed write announces nothing and its rejection surfaces exactly as before (BR1.1–BR1.3).
- **Language toggle** (`#lang`): before the existing transition it writes a per-tab note to `sessionStorage` (`rk.langNote`: target locale, locale-free path, time). Storage errors are ignored. Nothing is announced at the click. Link target, `aria-pressed`, glyph and the `setLang` write are unchanged (BR2.1, BR2.4, BR2.5).
- **View announcement** (`ViewShell`): `view` is narrowed to `ViewName`. The view name comes from `titleForView`, with `nav.discover` for the home view. About 150 ms after mount the effect calls `decideArrival(locale, path)` and announces `a11y.announce.language` on a matching fresh note, otherwise `a11y.announce.view`. The timer is cleared on unmount, so a development double-run announces only once (BR2.2, BR2.3, BR3.1–BR3.3).
- **Motion toggle**: unchanged and silent (BR4.4).

## Files changed

| Path | Change |
|---|---|
| `apps/web/src/components/shared/ThemeControls.tsx` | Theme announcement after a successful write; language note; exported `writeNote` and `decideArrival` |
| `apps/web/src/components/patient/ViewShell.tsx` | Localized view name, delayed arrival announcement, `view: ViewName`, effect on primitives only |
| `packages/i18n/messages/en.json`, `packages/i18n/messages/bn.json` | `a11y.announce.language`, `.themeDark`, `.themeLight`, `.view` (`{view}`) in the same change |
| `packages/i18n/src/keys.ts` | Regenerated with `pnpm --filter @rogikotha/i18n keys` (777 → 781 keys) |
| `apps/web/src/components/shared/ThemeControls.test.tsx` | Promise-returning action mocks, real dictionaries, new tests |
| `apps/web/src/components/patient/ViewShell.test.tsx` | Rendered inside the translation provider with the live region; new tests |
| `apps/web/src/components/shared/live-region-announcements.smoke.test.tsx` | New smoke file |
| `docs/implementation/ISSUES.md` | `ISS-122` closed; `ISS-227`, `ISS-228`, `ISS-229` added |

`apps/web/src/lib/announce.ts`, `LiveRegion.tsx`, `lib/titles.ts`, the server actions and the mastheads are unchanged.

## Key implementation decisions

- **Delay before the arrival announcement (design review R-01).** `ViewShell` waits `ARRIVAL_ANNOUNCE_DELAY_MS` = 150 ms, so a freshly mounted `#sr-live` is already in the page when its text changes. The decision is made inside the timer, which also makes the development double-run harmless. The running-app check (screen reader or Playwright reading `#sr-live` after a real `/en` → `/bn` switch) is still a Build and Test row.
- **The note is used up once spoken (R-02, BR2.2 tightened).** `decideArrival` removes a same-locale note on the call that returns `'language'`; `ViewShell` announces it straight after, in the same tick. Back then Forward therefore does not repeat "Language". A same-locale note on another path is removed too, a stale note (over 30 s) is removed, and a fresh note for the other locale is left alone.
- **Effect dependencies (R-03).** `[view, locale, path, viewMessage, languageMessage]`; never `t`. `announce` is a stable `useCallback([])` and is left out. A test re-renders with a fresh messages object and checks that the view is not announced again. Adding `t` to the dependencies was tried temporarily and that test failed, as it should; the change was reverted.
- **`decideArrival(activeLocale: string, …)`.** `useLocale()` returns `string`, and the function only compares the value, so the parameter is `string` rather than `Locale`. `writeNote` still takes `Locale`.
- **Dictionaries in tests.** The tests load the real `en.json`/`bn.json` through `createRequire` + `fs`, the same pattern as `Masthead.test.tsx`.
- **Failed-write test.** Vitest fails a run on any unhandled rejection. The BR1.3 test therefore swaps Vitest's `unhandledRejection` listeners out for the duration of the test, asserts that the rejection still escaped unhandled (not swallowed) and that `#sr-live` stayed empty, then restores them.

## Test results

| Run | Result |
|---|---|
| Baseline before any change: `pnpm check` | green: 45 files, 184 passed, 4 expected fail; i18n parity 777 keys |
| Baseline before any change: `pnpm smoke` | green: 8 files, 11 tests |
| Unit-scoped command (`unit-test-instructions.md`) | 3 files, 37 tests passed (`ThemeControls.test.tsx` 15, `ViewShell.test.tsx` 18, smoke 4) |
| Final `pnpm check` | green: typecheck, lint (0 errors; 1 warning in `packages/i18n/src/routing.ts:17` that is also in the baseline), 46 files, 216 passed, 4 expected fail, i18n parity 781 keys, build |
| Final `pnpm smoke` | green: 9 files, 15 tests (11 → 15; nothing removed or skipped) |
| `npx impeccable detect apps/web/src --no-advisory` | exit 0, no findings (87 files, regex rules only, as the tool states) |
| `pnpm contrast` | all pairs pass AA and 3:1, both modes |

The first final `pnpm check` failed on three `no-unused-vars` lint errors in the new `ThemeControls.test.tsx` mocks. They were fixed by typing the mocks with `vi.fn<PreferenceWrite>()`; the rerun above is green.

New and adjusted tests (each locale-sensitive one runs in `en` and `bn`):
- `ThemeControls.test.tsx`: the 3 existing tests kept, with no assertion removed. Theme announces after the write resolves and not before (4 cases). "Follow the system" in dark mode writes and announces light (2). A failed write announces nothing and the rejection still surfaces (1). Language toggle leaves the note, stays silent, and keeps link, `aria-pressed` and glyph (2). Blocked storage still switches (1). Motion stays silent (2).
- `ViewShell.test.tsx`: the 2 existing heading tests kept, now inside the provider. Localized view name with no raw identifier for `doctors`, `signin` and `admin-security` (6). Home view uses `nav.discover` (2). Nothing is announced before the delay (1). Language announced once on arrival, note deleted, next arrival announces the view (2). Stale note (1). Other-path note (1). Other-locale note kept (1). Blocked storage (1). No re-announcement when the layout re-renders with fresh messages (1).
- Smoke: the theme toggle fills `#sr-live` with non-empty text in `en` and `bn` (2). The `doctors` view announcement is non-empty and holds no raw identifier in `en` and `bn` (2).

Coverage: not measured yet. The 80% floor arrives with T-010 (U3), per team practice.

## Issues

- `ISS-122`: closed as fixed in CR-004 (option (a), FD-042; Question 1 = A awaiting the owner's confirmation).
- `ISS-227` (S4): a failed preference write gives the reader no feedback (predates CR-004; found in U7 Functional Design).
- `ISS-228` (S3): the four Bengali announcement strings await the owner's bilingual review, together with `ISS-050`.
- `ISS-229` (S4): CR-004's "Bengali" acceptance row reads differently for the language toggle under Q1 = A (announced on arrival).

## Deviations and assumptions

- No `ASSUMPTION(CR-004)` marker was needed; every step was built as planned.
- More test cases than the plan's "about 10" estimate: the Minimal one-per-rule-group set runs in both locales, and the R-03 re-render test was added. The smoke file holds 4 assertions instead of 1.
- The existing `apps/web/src/components/patient/shell.smoke.test.tsx` (outside this plan's files) was left unchanged. It renders `ViewShell` with a partial message set that lacks the new `a11y.announce.*` keys. It still passes and printed no warnings in this run.
- `decideArrival` takes `activeLocale: string` (see Key implementation decisions).
