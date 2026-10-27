# Unit test instructions — U7 `cr-004-live-region-announcements`

## Framework

Vitest 4 with React Testing Library and jsdom, as configured in `apps/web` (existing). Components render inside the next-intl provider with the real `en.json` and `bn.json` dictionaries and the `LiveRegion` component, so tests read the real `#sr-live` text.

## Run this Unit's tests

```bash
pnpm --filter @rogikotha/web exec vitest run src/components/shared/ThemeControls.test.tsx src/components/patient/ViewShell.test.tsx src/components/shared/live-region-announcements.smoke.test.tsx
```

Then the project gates: `pnpm check` and `pnpm smoke` (run by Build and Test and by the Unit checkpoint).

## What to cover (Minimal strategy: one test per rule group, in both locales)

| Test | Rules |
|---|---|
| Theme toggle announces the new theme after the write succeeds (`en`, `bn`) | BR1.1, BR1.2, BR4.2 |
| Theme toggle from "follow the system" writes and announces the opposite of the system preference | BR1.2 |
| A failed theme write announces nothing | BR1.3 |
| Language toggle writes the note, stays silent, keeps the link target | BR2.1, BR2.5 |
| Arrival with a matching note announces the language in the new locale, once, then deletes the note | BR2.2 |
| Stale, other-path and other-locale notes | BR2.3 |
| Blocked storage: no error escapes; the view is announced | BR2.4 |
| View announcement uses the localized name; home falls back to `nav.discover`; no raw identifier (`en`, `bn`) | BR3.1–BR3.3 |
| Motion toggle stays silent | BR4.4 |

Smoke: `live-region-announcements.smoke.test.tsx`: the theme toggle fills `#sr-live` with non-empty text in both locales, and the view announcement contains no raw view identifier.

## Coverage

The 80% line-coverage floor arrives with T-010 (U3), which has not run yet. Record "coverage not measured yet" at Build and Test (team practice).

## Mocking

- Mock the preference server actions (`setTheme`, `setLang`) to return a resolved promise; use a rejected promise for the failure test.
- Use fake timers for the delayed arrival announcement and the live region's 1 s clear.
- Stub `sessionStorage` to throw for the blocked-storage test.
- Do not assert on internal calls or class names; assert on `#sr-live` text and the stored note.

## Test data

No fixtures beyond the real dictionaries; paths such as `/doctors` and view names from the `ViewName` union.
