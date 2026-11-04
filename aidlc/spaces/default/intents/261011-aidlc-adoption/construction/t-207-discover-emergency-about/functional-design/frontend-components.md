# Frontend components — U20 `t-207-discover-emergency-about`

All components are server components (no client state). Rules: `rules.md`. Workflows: `functional-spec.md`.

## 1. Tree

```text
(patient)/layout.tsx  (merged: masthead, demo marker, RouteTransition, colophon with disclaimer)
├── page.tsx → ViewShell view=discover title="" > Home
│   ├── section.opener
│   │   ├── span.kicker discover.kicker · h1.display hero.title
│   │   └── div.opener-grid
│   │       ├── div: p.lede hero.body
│   │       │   ├── nav.home-browse[aria-label=discover.browseAll] > ul > li > Link.btn.ghost.small ×3
│   │       │   │     (/doctors discover.browseDoctors · /facilities discover.browseFacilities · /topics discover.browseTopics)
│   │       │   └── [ul.chips > li > Link.chip /topics/{publicId} ×≤5]
│   │       └── aside.margin-note[data-static=disclaimer]: span.k discover.editorialNote · p disclaimer.short
│   ├── shared/EmergencyPanel config (full form, data-static=emergency)
│   ├── [h2.section-head discover.browse · p.note discover.browseNote ·
│   │    ul.browse-grid.reveal > li > shared/BrowseCard {href /topics/{id}, title name, sub profile.experienceCount {n, count}}]
│   ├── [section.panel.reveal: h2 discover.facilities · p.note facility.separation ·
│   │    shared/MiniList > home/TeaserRow ×≤3
│   │      (div.teaser-row > MiniRow {href /facilities/{id}, avatar Avatar(publicId, avatarHue), title facilityLabel(card), sub teaserSub(card)} · [span.tag label.limitedData])]
│   ├── h2.section-head how.title · ol.how-list > li.reveal (span.fig formatDigits("0n") · h3 · p) ×3
│   └── h2.section-head discover.latest · Reveal as=div > shared/AccountRow ×≤4 | div.empty-state discover.latestEmpty
├── emergency/page.tsx → ViewShell view=emergency > Emergency {config from ConfigProvider, locale}
│     (merged markup; span.num emergview.bmdcShort; p.note.emerg-note lastVerifiedLine)
├── about/page.tsx → About (merged)
├── terms/page.tsx, privacy/page.tsx → Policy kind (Terms: six sections, lawful last)
├── not-found.tsx → ViewShell view=not-found > NotFoundView
└── [...rest]/page.tsx → notFound()
app/not-found.tsx → bilingual fallback (async; getTranslations({locale}) ×2)
```

`[...]` marks a section that BR1.3, BR1.4 or BR1.6 may leave out.

## 2. `Home` props

| Prop | Type | Source |
|---|---|---|
| `chips` | `ConditionCardVM[]` (≤ 5) | `pickChips(conditions, locale)`: BR1.2 |
| `browse` | `ConditionCardVM[] \| null` | conditions with `accountsTotal > 0`, or `null` if the query failed |
| `facilities` | `FacilityCardVM[] \| null` | `listFacilities` page 1, size 3, or `null` |
| `latest` | `ExperienceCardVM[] \| null` | `listExperienceCards({limit: 4})`, or `null` |
| `emergency` | `ConfigValues['emergency']` | `ports.config.current()` |

`null` means "section unavailable", so the section is left out. `[]` for `latest` means the empty state. `pickChips` is a pure function in `components/patient/home/pick-chips.ts`: it filters `accountsTotal > 0`, sorts by `accountsTotal` descending and then by `Intl.Collator(locale)` on `name`, and slices to 5.

`teaserSub(card)` returns the sub-line as a string: `facility.type.{type}` · `area, city` (present parts only), then by BR2.2 either `facility.visitCount {n, count: formatNumber}` or `facility.noVisits`, and nothing more when `feedbackVisible` is false. `home/TeaserRow.tsx` (U20-owned) wraps U46's unchanged `MiniRow` and renders the `label.limitedData` tag next to it when `feedbackVisible` and `accountsLimitedData` (BR2.3, BR6.1).

Browse-card counts use the existing plural key `profile.experienceCount` (en `{n, plural, one {{count} patient experience} other {{count} patient experiences}}`, bn `{n, plural, one {{count}টি রোগীর অভিজ্ঞতা} other {{count}টি রোগীর অভিজ্ঞতা}}`), with `n` the raw count and `count` its `formatNumber` form.

## 3. Interaction

- All actions are plain links. There are no forms, client state or validation on these pages.
- Chips, browse cards, mini rows and browse links get T-011 press feedback and focus styles. There are no hover lifts.
- `tel:` links on the emergency surfaces carry the label and the number in their accessible name.

## 4. New keys (en / bn; the Bengali text is for the FD-042 review)

| Key | en | bn |
|---|---|---|
| `discover.browseAll` | Browse doctors, hospitals and topics | ডাক্তার, হাসপাতাল ও বিষয় দেখুন |
| `discover.browseFacilities` | Browse hospitals & clinics | হাসপাতাল ও ক্লিনিক দেখুন |
| `discover.browseTopics` | Browse health topics | স্বাস্থ্য বিষয় দেখুন |
| `emergview.bmdcShort` | BMDC | BMDC |
| `notFound.body` | The page may have moved, or the address may be mistyped. | পাতাটি হয়তো সরানো হয়েছে, অথবা ঠিকানায় ভুল আছে। |
| `notFound.home` | Go to the home page | হোম পাতায় যান |

Existing keys reused: `discover.*`, `hero.title`, `hero.body`, `how.*`, `disclaimer.short`, `facility.separation`, `facility.visitCount`, `facility.noVisits`, `label.limitedData`, `errors.common.notFound`, `nav.emergency`. `hero.cta` and `hero.browse` stay unused on the home.

## 5. Tests (Vitest and Testing Library, `describe.each(['en', 'bn'])`)

| File | Proves |
|---|---|
| `home/Home.test.tsx` | block order and one h1; three browse links; chips are links; grid without zero topics; teaser rows: count, Limited data tag from `TeaserRow`, `noVisits`, hidden feedback; the browse nav named by `discover.browseAll`; browse-card plural counts; `facility.separation`; Bengali digits in the step figures and counts; static groups on the note and panel; `.reveal` never in the opener; anonymous `AccountRow` unnamed; null sections absent; empty latest state |
| `home/pick-chips.test.ts` | the filter, most accounts first, the tie broken by name per locale, the cap of 5, an empty input |
| `(patient)/home-page.test.tsx` | the container is mocked: parallel calls with the right inputs; a failing list logs `discover.section_unavailable` with only `section` and `correlationId`, and the emergency panel still renders |
| `Emergency.test.tsx` | the provider's numbers in both digit sets, `tel:` hrefs, the `emergview.bmdcShort` text, no `style` attribute |
| `Policy.test.tsx`, `fd-022-lawful-placement.test.tsx` | Terms has six sections with the lawful one last; present on `/terms` and `/privacy`, absent from `/`, `/about` and `/emergency` |
| `(patient)/not-found.test.tsx`, `[...rest]/page.test.tsx`, `app/root.test.tsx` | localized 404 copy and links; the catch-all calls `notFound`; the root fallback in both languages with `lang`, no `style` |
| `home/home.smoke.test.tsx` | the cumulative smoke: h1, emergency numbers and browse links in both locales |

Builders come from the web-local `doctors/directory-test-support.ts` (U46 extends it), never from `@rogikotha/test-support`. `@/i18n/routing` is mocked (ISS-053). No snapshots.
