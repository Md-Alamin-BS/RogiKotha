# Frontend components — U20 `t-207-discover-emergency-about`

Component-level design for `functional-spec.md` (workflows WF1–WF7) and `rules.md` (BR1.1–BR9.7). It follows the answers in `functional-design-questions.md`: Question 1 the owner's A (2026-10-29: the lawful-access section on both Terms and Privacy, so `Policy`'s Terms list changes), the others A. Upstream: U14 T-201's view models, queries and seed, U15 T-202's shared primitives, U16 T-203's `BrowseCard` and `facilityLabel`, U19 T-206's `SearchBox`, U45 T-011's token block, spacing scale, classes, press list, `.opener` wash, `.reveal` hook, `RouteTransition` in the layout and static groups, U12 T-105's `getConfig()` and `emergency.body` parameters, T-008's `ViewShell`, T-207a's `Emergency`, `About` and `Policy`, and T-010's boundaries, coverage floor and route-table test as merged.

Refreshed 2026-10-29: the hierarchy, files, page sketches, `Discover`, `Policy`, the root fallback, the interaction table, the CSS section and the tests follow those inputs (see `functional-spec.md` "Refreshed 2026-10-29").

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                         T-008/T-011: SkipLink, DemoMarker, Masthead, main > RouteTransition, Colophon
│
├── page.tsx (Discover)                      server; WF1–WF2
│   └── ViewShell view="discover" title=""
│       └── Discover {chips, topics, facilities, latest, emergency, locale}
│           ├── section.opener                                        never animated (BR5.3); static wash from T-011
│           │   ├── span.kicker discover.kicker
│           │   ├── h1.display hero.title                             the page's only h1 (BR4.1)
│           │   └── div.opener-grid
│           │       ├── div
│           │       │   ├── p.lede hero.body
│           │       │   ├── SearchBox variant="hero" initialQuery=""   T-206, client (BR2.10)
│           │       │   └── ul.chips > li > Link.chip /search?q={name}  ×0–5 (BR3.3)
│           │       └── aside.margin-note[data-static=disclaimer][aria-labelledby]
│           │           ├── span.k#discover-note-k discover.editorialNote
│           │           └── p disclaimer.short                         (BR2.6)
│           ├── EmergencyPanel {config: emergency, locale}             T-202; data-static=emergency (BR2.7)
│           ├── [topics.length > 0]
│           │   ├── h2.section-head discover.browse
│           │   ├── p.note.discover-note discover.browseNote
│           │   └── ul.browse-grid > li.reveal > BrowseCard {href /topics/{publicId}, title, sub count}  ×n
│           ├── [facilities.length > 0]
│           │   └── section.panel.discover-facilities.reveal
│           │       ├── h2 discover.facilities
│           │       ├── p.note.discover-note facility.separation
│           │       └── MiniList > MiniRow {href /facilities/{publicId}, Avatar 38, facilityLabel ("Jolrong Diagnostic Centre — Cumilla branch"), sub (type · place [· count] [+ Limited data])}  ×≤3
│           ├── h2.section-head how.title
│           │   └── ol.how-list > li.reveal > span.fig 01–03, h3 how.{i}.t, p how.{i}.b  ×3
│           └── [latest.length > 0]
│               ├── h2.section-head discover.latest
│               └── div.reveal > AccountRow {card}  ×≤4                T-202
│
├── emergency/page.tsx                       server; WF3
│   └── ViewShell view="emergency" title=""  → section#view-emergency (T-011 static set)
│       └── Emergency {config: (await getConfig()).emergency, locale}
│           ├── section.panel.emerg-head > span.kicker nav.emergency, h1 emergency.title, p emergview.intro
│           ├── div.emerg-grid > a.panel.emerg-card[href=tel:…] ×3, a.panel.emerg-card.bmdc[target=_blank]
│           └── p.note.emerg-note emergency.lastVerifiedLine
│
├── about/page.tsx                           server; unchanged markup (About)
├── terms/page.tsx, privacy/page.tsx         server; Policy kind=terms (six sections, lawful last; Question 1 A) | kind=privacy (three, lawful last)
│
├── not-found.tsx                            server; WF5 (Question 7)
│   └── ViewShell view="not-found" title=""
│       └── NotFoundView
│           └── section.panel.notfound-head > h1 errors.common.notFound, p notFound.body,
│               p.notfound-links > Link /{locale} notFound.home · Link /{locale}/emergency nav.emergency
└── [...rest]/page.tsx                       server; calls notFound()

app/not-found.tsx                            root last resort (outside any locale): async; copy from getTranslations({locale: 'en'}) and ({locale: 'bn'}); no style attribute, no JSON import
```

## 2. Files

| Path | Change | In T-207's owned paths |
|---|---|---|
| `app/[locale]/(patient)/page.tsx` | Replace the T-008 placeholder: load in parallel, build the home model, render `Discover`; `generateMetadata` with alternates | yes |
| `app/[locale]/(patient)/emergency/page.tsx` | Read `(await getConfig()).emergency` instead of `DEFAULT_CONFIG_VALUES` and remove the `ASSUMPTION(CR-005)` comment (both done by U12 T-105 per its draft; checked here, done here only if missing); alternates | yes |
| `app/[locale]/(patient)/{about,terms,privacy}/page.tsx` | Alternates in `generateMetadata`; nothing else | yes |
| `components/patient/Discover.tsx` | New, server; exports `Discover`, `pickChips`, `browseTopics` | yes |
| `components/patient/Emergency.tsx` | `.emerg-note` class instead of the inline style; `emergview.bmdcShort` instead of the literal (Question 8) | yes |
| `components/patient/About.tsx` | No change | yes |
| `components/patient/Policy.tsx` | `TERMS_SECTIONS` gains `{key: 'lawful', titleKey: 'policy.privacy.lawful', bodyKey: 'policy.privacy.lawfulBody'}` last; the comments above both lists name the two legal pages; the kicker comment cites FD-044 (Question 1 A, the owner's answer) | yes |
| `components/patient/{Discover,Emergency,About,Policy}.test.tsx`, `components/patient/discover.smoke.test.tsx`, `components/patient/fd-022-lawful-placement.test.tsx` | New or re-structured under `describe.each(['en','bn'])` (ISS-151); the FD-022 test expects the sentence on `/terms` and `/privacy` and gains Discover (finding F23) | yes |
| `components/patient/discover-test-support.ts` | New: web-local builders for `ConditionCardVM`, `FacilityCardVM`, `ExperienceCardVM` and the emergency settings (BR9.1); extends T-202's or T-203's web builders file instead if one exists | **no**: recorded (FD-040: `apps/*` may not import `test-support`) |
| `packages/i18n/messages/{en,bn}.json` | Three new keys (`entities.md` ENT-011) | yes ("new keys listed in steps 4–5"; reported in the hand-off) |
| `packages/i18n/src/keys.ts` | Regenerated with `pnpm --filter @rogikotha/i18n keys` (generated file, excluded from coverage and Prettier) | **no**: recorded (generated from the dictionaries) |
| `apps/web/src/styles/patient.css` | Append the T-207 section (§ 7) | yes, by the FD-091 amendment |
| `app/[locale]/(patient)/page.test.tsx` | New: the Discover page's failure handling and the configuration read (BR1.3, BR9.7) | **no**: recorded (tests of an owned page; the coverage floor counts `page.tsx`) |
| `app/[locale]/(patient)/not-found.tsx`, `app/[locale]/(patient)/[...rest]/page.tsx`, `components/patient/NotFoundView.tsx`, each with its test | New (Question 7, ISS-120) | **no**: recorded owned-path addition (U20 carries ISS-120) |
| `app/not-found.tsx` | Async; copy from `getTranslations({locale})` for `en` and `bn`, no inline style, no JSON import (Question 7, finding F18) | **no**: recorded |
| `app/root.test.tsx` | The not-found test awaits the async component with `next-intl/server` mocked, keeps its link and `lang` checks, and asserts the copy equals both dictionaries' values | **no**: recorded |
| `lib/titles.ts` | `ViewName` gains `'not-found'`; `titleForView` returns `errors.common.notFound` for it | **no**: recorded |
| `app/pages.test.tsx` | `/` gains `ownsHeading: true`; the container and `getConfig()` are mocked with builder data; no row for the catch-all (BR9.6) | **no**: recorded (finding F10) |
| `components/patient/shared/EmergencyPanel.tsx` (+ test) | Pass `{ambulance, healthLine}` (through `formatDigits`) to `emergency.body`, as T-105 Question 5 A asks of the panel, only if T-202 merged without it | **no**: recorded, asked of U15 first |
| `components/patient/shared/MiniList.tsx` (+ test) | `MiniRow`'s `sub` widened to `ReactNode`, only if T-202 typed it as a string (finding F21) | **no**: recorded, asked of U15 first |
| `packages/contracts/src/view-models/discover.ts`, `packages/contracts/src/index.ts`, `docs/implementation/03-routes-and-contracts.md` §4 | Remove the stub and its export; drop `DiscoverVM` from the list (Question 6) | **no**: recorded |
| `docs/status/decision-log.md` | The FD entry of `functional-spec.md` § 17 | **no**: recorded |

No file under `apps/worker`, `packages/{domain,application,database,adapters,test-support}`, `packages/i18n/package.json`, `packages/i18n/src/request.ts`, `tokens.css`, `motion.css` or T-011's token block at the top of `patient.css` changes.

## 3. Page components

### 3.1 `(patient)/page.tsx` (server, WF1)

```text
generateMetadata(): title documentTitle('discover', t); alternates {canonical /{locale}, languages en, bn}; indexable
DiscoverPage():
  locale = getLocale(); actor = await getActor()      // T-101, server/auth.ts (anonymous or session)
  [conditions, facilities, latest, config] = await Promise.all([
      container.taxonomy.listConditions({}, actor),
      container.directory.listFacilities({page: 1, pageSize: 3}, actor),
      container.review.listExperienceCards({limit: 4}, actor),
      getConfig(),                                     // T-105: never throws; last good values, then defaults (BR1.3)
  ])
  for each failed list: container.logger.error({event: 'discover.section_unavailable', section, correlationId}); use []
  topics = browseTopics(conditions)                    // accountsTotal > 0, query order
  chips  = pickChips(conditions, locale)               // most accounts, then name; ≤ 5
  return ViewShell(view='discover', title='') > Discover({chips, topics, facilities: items, latest: items,
                                                           emergency: config.emergency, locale})
```

A rejected promise (an exception rather than an `err` result) is treated like a failed list for the three lists and as fatal for the configuration; Code Generation uses `Promise.allSettled` or per-call wrappers to get that behaviour. The page imports `@/server/container` and `@/server/config` (element `web-server`), which FD-093 allows for pages and refuses for components; `Discover` gets everything as props.

### 3.2 `emergency/page.tsx` (server, WF3)

```text
generateMetadata(): title documentTitle('emergency', t); alternates /{locale}/emergency
EmergencyPage():
  locale = getLocale()
  config = await getConfig()                           // T-105 helper; never throws (last good values, then defaults)
  return ViewShell(view='emergency', title='') > Emergency({config: config.emergency, locale})
```

### 3.3 `about`, `terms`, `privacy` pages

Unchanged apart from alternates in `generateMetadata`. The Terms page renders the lawful-access section as its last section (the owner's answer to Question 1): a `Policy` constant change, not a page change.

### 3.4 `not-found.tsx` and `[...rest]/page.tsx` (server, WF5)

```text
[...rest]/page.tsx: export default function CatchAll() { notFound() }          // no metadata, no data
(patient)/not-found.tsx: NotFound() -> ViewShell(view='not-found', title='') > NotFoundView()
```

The patient layout renders around `not-found.tsx`, so the masthead, demo marker and colophon are there. Next answers 404 and adds `noindex` itself. Whether `not-found.tsx` may export `generateMetadata` on the pinned Next is checked in Code Generation; if not, the tab keeps the layout's default title (risk § 16).

## 4. Shared primitives used

| Component | From | How Discover uses it | Rules |
|---|---|---|---|
| `EmergencyPanel` | T-202 | `config` from the page, full form, once, right after the opener; its body sentence `emergency.body` with the configured numbers (T-105 Question 5 A) | BR2.7, BR3.13 |
| `AccountRow` | T-202 | default `headingLevel` 3, one per latest card, each wrapped in `div.reveal` | BR3.7, BR2.8, BR5.2 |
| `MiniList` / `MiniRow` | T-202 | three teaser rows; `avatar = Avatar(publicId, avatarHue, 38)`; `title = facilityLabel(card)`; `sub` = the joined line plus the limited tag, so `sub` must take a node (finding F21); `.mini-row` is in T-011's press list | BR3.5, BR2.4 |
| `BrowseCard` | T-203 | `href {pathname: '/topics/[publicId]', params}`, `title name`, `sub` count phrase | BR3.4 |
| `facilityLabel` | T-203 | the teaser row title | BR3.5 |
| `SearchBox` | T-206 | `variant="hero"`, `initialQuery=""` | BR2.10, BR3.2 |
| `Badge` | T-202 | `Badge plain` `label.limitedData` inside a teaser row's sub-line | BR2.4 |

## 5. Page-level components (`components/patient/`)

### 5.1 `Discover` (server)

**Props:** `chips: ConditionCardVM[]`, `topics: ConditionCardVM[]`, `facilities: FacilityCardVM[]`, `latest: ExperienceCardVM[]`, `emergency: EmergencySettings`, `locale: Locale`.

**Exports beside it:** `pickChips(conditions, locale): ConditionCardVM[]` and `browseTopics(conditions): ConditionCardVM[]`, pure, tested directly.

Renders § 1's tree in the prototype's order (BR3.1). Details:
- The opener is `section.opener`; T-011 gives it the static `--hero-wash` (T-011's refresh applies it to `.opener`, so T-207 adds no rule for it).
- Chip link: `Link className="chip" href={{pathname: '/search', query: {q: c.name}}}`. No count on chips (BR2.1). `.chip` is in T-011's press list.
- Browse card sub: `t('sentiment.totalAccounts', {n, count: formatNumber(n, locale)})` (BR3.11).
- Teaser sub: `[t('facility.type.' + type), [area, city].filter(Boolean).join(', '), feedbackVisible ? (n > 0 ? countPhrase : t('index.emptyTopic')) : null].filter(Boolean).join(' · ')`, then `Badge plain label.limitedData` when `feedbackVisible && accountsLimitedData` (BR2.3, BR2.4). No "Part of" badge: the prototype's teaser has none.
- How figure: `formatDigits('0' + i, locale)` for i = 1..3 (BR3.6).
- The prototype's comment on the editorial note (STORY-PLAT-001) is ported as a code comment; the prototype's inline `style` attributes (`.note` margin, the teaser panel's top margin, its `h2` size) become the T-207 classes of § 7.

### 5.2 `Emergency` (server, changed)

As built by T-207a, with two changes: the closing note is `p.note.emerg-note` (no `style`), and `span.num` of the BMDC card reads `t('emergview.bmdcShort')`. The BMDC comment and the `rel="noopener"` new-tab link stay. Props unchanged (`config: EmergencyConfig`, `locale`); the page now passes the live configuration.

### 5.3 `About` (server, unchanged) and `Policy` (server, changed)

`About` does not change. `Policy`'s `TERMS_SECTIONS` gains the lawful-access section (`policy.privacy.lawful`, `policy.privacy.lawfulBody`) as its sixth and last entry, the same section `PRIVACY_SECTIONS` already ends with (the owner's answer to Question 1); the comment above `TERMS_SECTIONS` names the new section and the comment above `PRIVACY_SECTIONS` says the sentence appears on the two legal pages and nowhere else. `Policy`'s ported kicker comment (`ASSUMPTION(T-207a)`, ISS-135) is rewritten to cite FD-044, which closed ISS-135, since the assumption is now a decision. `fd-022-lawful-key-usage.test.ts` keeps its allow-list: the keys are still referenced from `Policy.tsx` only.

### 5.4 `NotFoundView` (server, new, Question 7)

No props. `section.panel.notfound-head` > `h1` `errors.common.notFound`, `p` `notFound.body`, `p.notfound-links` > `Link href="/"` `notFound.home` and `Link href="/emergency"` `nav.emergency` (both locale-prefixed by next-intl's `Link`).

### 5.5 Root `app/not-found.tsx` (changed, Question 7)

Async server component outside the locale tree. It calls `getTranslations({locale: 'en'})` and `getTranslations({locale: 'bn'})`; next-intl 4.14 hands the explicit locale to `packages/i18n/src/request.ts` as `requestLocale`, which loads that dictionary, so no JSON is imported and no package export is added (a JSON import from `packages/i18n/messages/` would be an unknown element for the boundaries lint, finding F18). It renders `<html lang="en">` with one paragraph per language (`lang="bn"` on the Bengali one): `errors.common.notFound` and a link `notFound.home` to `/en` and `/bn`. No `style` attribute, no stylesheet (the boundary stays self-contained, as its existing comment explains). The `ASSUMPTION(T-008)` comment is removed; ISS-120 closes. `app/root.test.tsx` awaits the component with `next-intl/server` mocked by a translator built from the real files (as `pages.test.tsx` does), keeps its checks of the two links and the `lang` attributes, and asserts the copy equals both dictionaries' values.

## 6. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn` (seed after T-201, `pnpm demo:reset`) | Kicker, `h1` "রোগীরা আসলে কী অভিজ্ঞতার মধ্য দিয়ে গেছেন, পড়ুন।", empty search box, five chips, editorial note; emergency panel with ৯৯৯, ১৬২৬৩, ০৯৬১২-১১৯৯১১ and "সর্বশেষ যাচাই ২১ আগস্ট ২০২৬"; nine topic cards with Bengali counts; three facility rows titled with the hospital and its label, each with "সীমিত তথ্য"; three steps ০১–০৩; four latest accounts | BR3.1–BR3.7, BR3.12, BR2.4 |
| Open `/en` | The same blocks; the teaser lists Bandar Diagnostic Centre, Jolrong Diagnostic Centre — Cumilla branch and Kashful Community Hospital — Kazla branch, "2 patient experiences" and "Limited data" on each | BR3.5, BR2.4 |
| Facility feedback turned off | The teaser rows show type and place only: no count, no "No one has written", no tag | BR2.3, BR2.4 |
| Tap a chip | `/bn/search?q={name}` opens (T-206) with the query as written | BR3.3 |
| Submit the hero search without script | GET `/bn/search?q=…` | BR4.4 |
| One list query fails | Its section is gone with its heading; a log line `discover.section_unavailable`; the opener and emergency panel remain | BR1.3 |
| The configuration helper throws (a programming error; a database error is covered by T-105's fallback) | Error boundary (Next's default page) | BR1.3 |
| A condition has no accounts | Not among the chips or the cards | BR2.3 |
| A teaser facility has no accounts | "No one has written about this yet." in its row, no tag | BR2.3 |
| Scroll down on a phone with motion on | Each topic card, the facility panel, each step and each account fades and rises once as it enters; headings stay still; the opener and emergency panel never move | BR5.2, BR5.3 |
| Reduced motion (OS or switch) | Everything visible at once; instant route swap | BR5.5 |
| Open `/en/emergency` | Three call cards with the configured numbers, the BMDC card (new tab), "Last verified 21 August 2026"; nothing moves on a route change or on hover (T-011 removes the `.emerg-card:hover` lift; finding F6 closed) | BR3.8, BR2.7 |
| Open `/en/terms` | T-207a's five sections, then the lawful-access section; `/en/privacy` ends with the same section | BR2.9, BR3.10 |
| Open `/bn/no-such-page` | Patient chrome, `h1` "এটি খুঁজে পাওয়া যায়নি।", two links; status 404; `<html lang="bn">` | BR1.7 |
| Open `/xx/anything` | Proxy redirects into a locale; an unmatched path ends on the localized 404; only paths outside any locale reach the root fallback, which shows both languages from the dictionaries | BR1.7 |

## 7. T-207's section of `patient.css`

Appended after T-011's, T-202's and T-203's rules, under one comment header; every rule carries `/* added: T-207 <reason> */`, uses only T-011 tokens, declares no motion and no press or hover transform, and is Prettier-formatted with double quotes (`patient.css` is in Prettier's scope after T-011, Q9 A) (BR5.4, BR7.1).

| Selector | Why | Declarations (tokens only) |
|---|---|---|
| `ul.chips` | Chips are now a list (BR4.2) | `list-style: none`, `padding: 0`, `margin: 0`; T-011's `.chips` layout stays |
| `a.chip` | Chips are links, not buttons (task "Not in scope") | `text-decoration: none`, `min-block-size: var(--target)`, inline-flex centring; `:focus-visible` `outline: var(--focus-ring)`; press feedback from T-011's `.chip` entry, no rule here |
| `ul.browse-grid` | The grid is a list (BR4.2) | `list-style: none`, `padding: 0`, `margin: 0`; T-011's `.browse-grid` columns (`--grid-min`) stay |
| `.discover-note` | Replaces the prototype's inline `margin-bottom: 14px` on the browse and teaser notes | `margin-block-end: var(--space-3)` (T-011's mapping of 14 px) |
| `.panel.discover-facilities`, `.discover-facilities h2` | Replace the prototype's inline `margin-top: 26px` and `font-size: 17px` | `margin-block-start: var(--space-6)` (T-011's mapping of 26 px); T-011's panel-heading type token |
| `.emerg-note` | Replaces T-207a's inline `margin-top: 18px` (finding F7) | `margin-block-start: var(--space-4)` (T-011's mapping of 18 px) |
| `.notfound-head`, `.notfound-links` | The 404 page (Question 7) | T-011 panel tokens; gaps from `--space-3`; links wrap at 360 px with `min-block-size: var(--target)` |

T-011 BR3.6 gives the spacing scale (`--space-1` 4 px to `--space-8` 64 px), `--grid-min` and `--measure`; a step that is missing is an `ISSUES.md` row for U45, never a literal value. `.reveal` is T-011's hook and gets no T-207 rule. T-011 applies `--hero-wash` to `.opener` and removes the `.emerg-card:hover` lift (findings F6 and F15 closed), so T-207 adds neither. Nothing here edits T-011's token block at the top of `patient.css` or selects a static hook (`[data-static]`, `#view-emergency`, `.emergency-lines`, `.demo`, `.colophon`).

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, Testing Library, jsdom), each inside `describe.each(['en', 'bn'])` so every name carries its locale (ISS-151), inside `NextIntlClientProvider` with the real dictionaries, `@/i18n/routing` mocked to a plain anchor (ISS-053), `SearchBox` rendered as T-206 ships it, view models and settings from the web-local builders in `components/patient/discover-test-support.ts` (never `@rogikotha/test-support`, which the boundaries lint refuses in `apps/*`, FD-040, FD-093 (5)):

| Test | Asserts | Rules |
|---|---|---|
| Discover shows its blocks in the prototype's order | heading sequence: hero title, emergency, browse, facilities, how, latest (task row "Discover order") | BR3.1 |
| Discover has one h1, the hero title | one `h1`, text `hero.title`; no `h1.display` from ViewShell (closes ISS-152) | BR4.1 |
| Discover starts with an empty search box | the search input's value is `''` | BR2.10 |
| pickChips takes the five conditions with most accounts, ties by name | builder of 10 with ties and a zero: 5 results, zero excluded, tie order by `Intl.Collator` per locale | BR2.2, BR2.3 |
| Discover chips link to search with the condition name | 5 links, `href` `/search?q=` + name (task row "Chips and grid") | BR3.3 |
| Discover's grid lists only conditions with accounts, with Bengali counts under bn | 9 cards from 10 builders; `bn` digits; plural English phrase for 1 | BR3.4, BR2.3, BR3.11, BR3.12 |
| Discover's facility rows say Limited data and keep facility figures apart | the tag on limited rows only; the separation note; no sentiment or outcome label; 0 accounts gives `index.emptyTopic`; the row title is `facilityLabel(card)` | BR2.4, BR2.5, BR2.3, BR3.5 |
| Discover's facility rows show no figure when facility feedback is hidden | card builders with `feedbackVisible: false` and no count or flag: sub-line "type · place" only, no tag, no "0" | BR2.3, BR2.4 |
| Discover's how-it-works figures follow the language with the leading zero | "01" / "০১" | BR3.6 |
| Discover leaves out an empty section with its heading | each of topics, facilities, latest = []: no heading, no list; opener and emergency panel still present | BR2.3, BR1.3 |
| The editorial note and the emergency panel are static and outside any reveal | `data-static` values; no `.reveal` ancestor or descendant; no `.reveal` in the opener | BR2.6, BR2.7, BR5.3 |
| Only the blocks below the emergency panel carry the reveal hook | `.reveal` count = cards + 1 panel + 3 steps + accounts | BR5.2 |
| Discover never links an anonymous author | no `<a>` inside an anonymous `.byline` | BR2.8 |
| The Discover page leaves out a failed section and logs it | page test with a mocked container returning `err` for one list: section absent, one logger call with the allowlisted fields only | BR1.3 |
| The Discover page throws when the configuration helper throws | — | BR1.3 |
| Emergency shows the configured numbers and the BMDC card from keys | three `tel:` hrefs as configured, `tel:09612-119911`, Bengali digits under bn, BMDC `target=_blank rel=noopener`, `.num` from `emergview.bmdcShort`, last-verified line formatted, no `style` attribute (task row "Emergency numbers from config") | BR3.8, BR1.5, BR7.1 |
| About lists its five sections in order with the foot note | (task row "About sections") | BR3.9 |
| Policy renders the Terms and Privacy section sets | Terms: six headings, the lawful-access one last; Privacy: three, the same one last | BR3.10 |
| The lawful-access sentence appears on the two legal pages only | rendered Terms and Privacy contain it; Emergency, About and Discover do not, in both locales (task row "FD-022 placement", changed by the owner's answer to Question 1) | BR2.9, BR9.4 |
| NotFoundView shows the localized message and the two links | `h1` text, `href`s `/{locale}` and `/{locale}/emergency` | BR1.7 |
| The patient 404 renders inside the shell's view section | `section#view-not-found`, one `h1`, no generic heading above it | BR1.7, BR4.1 |
| The catch-all page raises notFound | calling it throws Next's not-found error | BR1.7 |
| The root fallback offers a way home in both languages from the dictionaries | `root.test.tsx`: awaited component, links `/en` and `/bn`, a `lang="bn"` paragraph, `<html lang="en">`, copy equal to `errors.common.notFound` and `notFound.home` in each dictionary, no `style` attribute | BR1.7 |
| EmergencyPanel names the configured numbers in its sentence | (only if T-207 makes the change) a changed configuration changes the sentence | BR3.13 |
| The route table knows the Discover home | `app/pages.test.tsx`: `/` owns its heading, with the container and `getConfig()` mocked | BR9.6 |

Smoke: `components/patient/discover.smoke.test.tsx` renders `Discover` with builder data in both languages: one `h1`, the emergency panel with three call links, the margin-note disclaimer, and the six blocks in order (BR9.2). The existing `emergency-about-policy.smoke.test.tsx` stays.

Gates: `pnpm check` (eleven steps: typecheck, lint with the boundaries rules, lint:boundaries, format:check, check:identity, test:coverage with `apps/web` at or above 80% lines counting untested files, i18n:check, contrast, contrast:patient, check:motion, build), `pnpm smoke`, `npx impeccable detect apps/web/src --no-advisory`, and CI green on the pushed Bolt head before the squash merge (BR7.2, BR9.3, BR9.7). Build and Test also walks `/en` and `/bn` home, emergency, about, terms, privacy and a missing page on the seed after `pnpm demo:reset`, beside the prototype's `#discover`, `#emergency` and `#about` at 1280 and 390 px, runs the reduced-motion journey and the 360 px and 200% zoom run, and records Lighthouse LCP and CLS for `/en` and `/bn` home on the throttled mid-range Android profile.
