# Frontend components — U7 `cr-004-live-region-announcements`

Component-level design for `functional-spec.md` (workflows WF1–WF4) and `rules.md` (BR1.1–BR4.5). It follows answer A to Question 1 in `functional-design-questions.md` (awaiting the owner's confirmation); the option B delta is in `functional-spec.md` § 9. Upstream: `unit-of-work.md` U7, `unit-of-work-story-map.md` US12.1, `requirements.md` FR91 / FR95 / NFR6 / NFR7, `components.md` (no domain component), `contract-summary.md` (no runtime contract). No server action, route, contract or schema changes.

## 1. Hierarchy (unchanged)

```text
[locale]/layout.tsx            html lang = active locale
├── LiveRegion                 #sr-live, role=status, aria-live=polite  (unchanged)
├── patient Masthead / admin Masthead
│   └── ThemeControls          #lang, #theme, #motion (patient only)   (changed)
└── page
    └── ViewShell              section.view#view-<view>                (changed)
lib/announce.ts  useAnnounce() (unchanged)
lib/titles.ts    titleForView() (unchanged, read only)
```

## 2. `ThemeControls` (`apps/web/src/components/shared/ThemeControls.tsx`)

**Props:** unchanged (`locale`, `theme`, `motion`, `showMotion`).

**New dependencies:** `useAnnounce()`; the existing `useTranslations()` and `usePathname()`.

**Theme handler (WF1; BR1.1, BR1.2, BR1.3):**
- Keep the existing effective-theme computation and its opposite (`next`).
- Pick the message in the active locale before the write: `a11y.announce.themeDark` when `next` is dark, else `a11y.announce.themeLight`.
- Start the write as today and announce only on its successful completion. Chain the announcement to the write's success rather than awaiting it inside the transition, so a failure keeps today's path (not caught, not sent to an error screen) and announces nothing.

```text
on theme activate:
  next    = opposite(effective theme)
  message = t(next is dark ? 'a11y.announce.themeDark' : 'a11y.announce.themeLight')
  in a transition: write(next), then on success announce(message)
```

**Language handler (WF2; BR2.1, BR2.4, BR2.5):**
- Before the existing transition, store the pending note for this tab: `{ targetLocale: otherLocale, path: pathname, at: now }`, replacing any earlier one. Storage access is guarded: any failure is ignored silently (BR2.4).
- Everything else stays as is: the `Link` target, `locale`, `aria-pressed`, the `A` / `অ` glyph, and the `setLang` write (BR2.5). No announcement at the click.

**Motion handler:** unchanged; no announcement (BR4.4).

**Pending-note helpers:** one small, exported pair, read-and-decide and write, kept beside the language handler that owns the note, so the note's name, shape and 30 s lifetime are defined in one place. `ViewShell` imports them. If the Code Generation plan prefers a separate file under `apps/web/src/lib/`, that file is an owned-path addition the plan names for approval.

```text
writeNote(targetLocale, path)       -> stores {targetLocale, path, at}; ignores storage errors
decideArrival(activeLocale, path)   -> 'language' | 'view'
  note missing or unreadable                      -> 'view'
  note older than 30 s                            -> delete, 'view'
  note.targetLocale != activeLocale               -> keep, 'view'
  note.path != path                               -> delete, 'view'
  otherwise                                       -> keep, 'language'
```

## 3. `ViewShell` (`apps/web/src/components/patient/ViewShell.tsx`)

**Props:** `view` narrows from `string` to the existing `ViewName` union from `lib/titles.ts`; every current caller already passes one of its members. `title` and `children` are unchanged.

**New dependencies:** `useTranslations()`, `useLocale()`, `usePathname()` (from `@/i18n/routing`, so the path is locale-free and the same in both locales), the pending-note helpers.

**Derived values (BR3.2, BR3.3):**
- `viewName` = `titleForView(view, t)`, or `t('nav.discover')` when that is empty.
- `viewMessage` = `t('a11y.announce.view', { view: viewName })`.
- `languageMessage` = `t('a11y.announce.language')`.

**Effect (WF3; BR2.2, BR2.3, BR3.1):** runs when the view, the active locale or the path changes.
1. Set `document.body.dataset.view = view` (unchanged); the cleanup removes it (unchanged).
2. `decideArrival(locale, path)`; announce `languageMessage` on `'language'`, otherwise `viewMessage`.

The section markup, its `id`, and the heading rule (`title` renders an `h1.display` only when non-empty, ISS-121) are unchanged.

## 4. Unchanged parts

`LiveRegion.tsx`, `lib/announce.ts` (one message at a time, cleared after 1 s, no-op without the region: BR4.3), `lib/titles.ts`, the preference server actions, both mastheads, and the layout.

## 5. i18n keys

Added to both `packages/i18n/messages/en.json` and `packages/i18n/messages/bn.json` in the same commit, under the existing `a11y` group (BR4.1). `packages/i18n/src/keys.ts` is regenerated with the package's `keys` script, never hand-edited.

| Key | `en` | `bn` (draft; owner review with `ISS-050`, BR4.5) |
|---|---|---|
| `a11y.announce.language` | `Language: English` | `ভাষা: বাংলা` |
| `a11y.announce.themeDark` | `Theme: dark` | `থিম: অন্ধকার` |
| `a11y.announce.themeLight` | `Theme: light` | `থিম: আলো` |
| `a11y.announce.view` | `View: {view}` | `পাতা: {view}` |

Parity check expectations: same keys in both files, `{view}` in both values of `a11y.announce.view`, no empty value, no value identical in both languages, key list current.

## 6. Interaction flows by locale

| Action | On `/en` | On `/bn` |
|---|---|---|
| Theme to dark | `Theme: dark` | `থিম: অন্ধকার` |
| Theme to light | `Theme: light` | `থিম: আলো` |
| Language toggle | Arrives on `/bn`, which announces `ভাষা: বাংলা` | Arrives on `/en`, which announces `Language: English` |
| Open the doctors index | `View: Doctors` | `পাতা: ডাক্তারেরা` |
| Open the home view | `View: Discover` | `পাতা: খুঁজুন` |
| Motion toggle | nothing | nothing |

No form, no validation input and no API call is added; the only external effects are the existing preference writes.

## 7. Tests (test-after, per `team.md` Testing Posture)

Component tests, each in `en` and `bn` (CR-004 step 3, `01-conventions.md` §10), rendered inside the translation provider with the real dictionaries and the live region:

| Test | Asserts | Rules |
|---|---|---|
| Theme toggle announces the new theme | After the mocked write resolves, `#sr-live` holds the dark or light message of the active locale | BR1.1, BR1.2, BR4.2 |
| Theme toggle from "follow the system" | Opposite of the mocked system preference is written and announced | BR1.2 |
| Failed theme write announces nothing | Mocked write rejects; `#sr-live` stays empty | BR1.3 |
| Language toggle leaves a note and stays silent | Note holds the other locale and the path; `#sr-live` empty; link target unchanged | BR2.1, BR2.5 |
| Arrival with a matching note announces the language | `ViewShell` in the target locale with a fresh note announces the language message, not the view | BR2.2 |
| Stale, other-path and other-locale notes | Stale or other-path note is deleted and the view is announced; other-locale note is kept | BR2.3 |
| Blocked storage | Writing and reading throw; no error escapes; the view is announced | BR2.4 |
| View announcement is localized | `View: Doctors` / `পাতা: ডাক্তারেরা`; home view uses `nav.discover`; no raw identifier | BR3.1, BR3.2, BR3.3 |
| Motion toggle stays silent | `#sr-live` empty after activation | BR4.4 |

Smoke (CR-004 step 4): one new `*.smoke.test.tsx` beside the components asserting that the theme toggle fills `#sr-live` with non-empty text in both locales and the view announcement contains no raw identifier.

Existing tests to adjust: `ViewShell.test.tsx` must render inside the translation provider; tests that pass partial message sets must carry the keys the component now renders. No assertion is removed or skipped.

UI checks for this Unit: `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` stay clean (no visual change is expected).

## 8. Files touched

| Path | Change | In CR-004's owned paths |
|---|---|---|
| `apps/web/src/components/shared/ThemeControls.tsx` | Theme announcement; language note; note helpers | yes |
| `apps/web/src/components/patient/ViewShell.tsx` | Localized view name; arrival decision | yes |
| `packages/i18n/messages/en.json`, `bn.json` | Four keys, same commit | yes (option a) |
| `packages/i18n/src/keys.ts` | Regenerated | no: generated; named in the Code Generation plan |
| `ThemeControls.test.tsx`, `ViewShell.test.tsx`, one new `*.smoke.test.tsx` | Tests | implied by CR-004 steps 3–4; named in the plan |
