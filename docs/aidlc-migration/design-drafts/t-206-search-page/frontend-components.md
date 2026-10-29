# Frontend components — U19 `t-206-search-page`

Component-level design for `functional-spec.md` (workflows WF1–WF8) and `rules.md` (BR1.1–BR8.5). It follows answer A to Q1–Q15 of `functional-design-questions.md`, each decided by the agent under the owner's no-questions instruction of 2026-10-29. **Refreshed 2026-10-29** to the T-205 draft's names (one All call, `alphabetical`, `didYouMean`, `keepOriginalUrl`, the topic, claimed and provenance fields), `getConfig()` and `featureVisibility.compareTray` (BR5.10). Upstream: U18 T-205's view models, queries and suggest route (its draft § 8, plus the § 12 addition `search.filterOptions`), U15 T-202's `DoctorEntry` and primitives, U16 T-203's `FacilityEntry` and `BrowseCard`, U45 T-011's tokens, classes, press list, `Reveal` and `.tray` / `.sheet` entry, T-101's `getActor()` and container, T-008's `ViewShell`, `Sheet` and `useAnnounce()`.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                         T-008/T-011: SkipLink, DemoMarker, Masthead, main > RouteTransition, Colophon
│
└── search/page.tsx                          server; WF1
    └── ViewShell view="results" title=""
        └── CompareProvider {enabled, initialPinned, initialCards, threshold}   client; pins, toggle, clear, cards cache, max sheet
            ├── SearchResults {state, vm, options, threshold, compareOn, sortOptions}   server
            │   ├── section.panel.results-head
            │   │   ├── span.kicker nav.results
            │   │   ├── h1.query-line         search.didYouMean <em>q</em> | nav.results
            │   │   ├── ResolvedNote {note, didYouMean, showKeepOriginal, state}
            │   │   ├── SearchBox variant="inline" initialQuery=q       client
            │   │   ├── form#search-state (GET; hidden q, tab, exact, compare)
            │   │   ├── nav.seg > SearchLink[data-press][aria-current] ×5   "{label} ({count})"
            │   │   ├── div.meta-row > span count phrase + SortMenu    client
            │   │   └── details.why > summary sort.why + p sort.whyBody
            │   ├── div.results-body          (doctors, facilities, reviews)
            │   │   ├── FilterRail {tab, state, options}                client
            │   │   └── div.entry-list
            │   │       ├── h2.sr-only {tab label}
            │   │       ├── Reveal key={resultsKey} as="div"
            │   │       │   └── DoctorEntry {card, 3, threshold, pinSlot: compareOn ? PinButton : undefined} | FacilityEntry | AccountRow   ×n
            │   │       ├── EmptyResults      (when none)
            │   │       └── SearchPager {page, pageSize, total, state}
            │   ├── Reveal key as="ul" className="index-grid" > li > BrowseCard ×n     (conditions)
            │   ├── section.result-group ×(kinds with results) > h2 + Reveal + SearchLink results.showAll   (all)
            │   └── ResultsAnnouncer {resultsKey, text}                 client
            ├── CompareTray                   client; portal into document.body; spacer in the page   (compareOn only)
            └── CompareSheet                  client; Sheet; getCompareCards on open                   (compareOn only)
```

`ViewShell` keeps the view announcement and `data-view="results"`. The layout's `RouteTransition` covers arrival from another path; the page adds none (BR6.1).

## 2. Files

| Path | Change | In T-206's owned paths |
|---|---|---|
| `app/[locale]/(patient)/search/page.tsx` | Replace the placeholder: parse, load (one cached loader), render; `generateMetadata` | yes |
| `components/patient/SearchResults.tsx` | New, server: results head, tabs, lists, All groups | yes |
| `components/patient/SearchBox.tsx` | New, client: GET form + suggestion combobox | yes |
| `components/patient/FilterRail.tsx` | New, client: per-tab fields, push on change | yes |
| `components/patient/SortMenu.tsx` | New, client: labelled select, push on change | yes |
| `components/patient/CompareTray.tsx`, `CompareSheet.tsx` | New, client | yes |
| `components/patient/ResolvedNote.tsx`, `EmptyResults.tsx` | New, server | yes |
| `components/patient/shared/CompareProvider.tsx` | New, client context (`usePinned`, `toggle`, `clear`, `cards`) | yes |
| `components/patient/DoctorEntry.tsx` | **No change**: T-202 replaced `onPin` with `pinSlot`; T-206 passes `PinButton` | yes (only the pin wiring; nothing to edit) |
| `components/patient/{SearchLink,PinButton,ResultsAnnouncer}.tsx` (client), `SearchPager.tsx` (server) | New | **no**: recorded additions (F15) |
| `lib/search-params.ts` (+ test) | New, `web-shared`: `parseSearchParams`, `searchHref`, `resultsKey`, `isCanonicalBrowse` | **no**: recorded addition |
| `server/actions/compare.ts` (+ test) | New, `web-actions`: `getCompareCards`, `CompareCardVM` | **no**: recorded addition (the task names the action, not its path) |
| `components/patient/search-test-support.ts` | New: builders (test category, excluded from coverage) | **no**: recorded addition |
| `components/patient/search.smoke.test.tsx` and component tests | New | yes |
| `app/pages.test.tsx` | The `/search` row's harness (container, config and actor mocks) | **no**: recorded addition (BR1.7) |
| `styles/patient.css` | T-206's own section, appended | yes (FD-091 amendment) |
| `packages/i18n/messages/{en,bn}.json` | ENT-012 keys | yes (01-conventions §6) |
| `docs/status/decision-log.md` | The FD entry of `functional-spec.md` § 17 | records |

No file of `packages/{domain,application,database,contracts,test-support}`, `apps/worker`, `tokens.css`, `motion.css` or another Unit's component is edited.

## 3. Page sketch (`search/page.tsx`)

```text
const load = cache(async (raw, locale) => {
  actor = await getActor(); config = await getConfig()            // threshold, featureVisibility (BR2.1, BR5.10)
  tab = parseTab(raw.tab)
  options = hasRail(tab) ? unwrap(await container.search.filterOptions({tab, locale}, actor)) : EMPTY
  state = parseSearchParams(raw, options, config.featureVisibility)   // BR1.2 (options bound the data-backed values)
  vm = unwrap(await container.search.query(toQueryInput(state), actor))   // one call, All included (BR3.2); error throws (BR1.8)
  pinned = config.featureVisibility.compareTray ? await validatePinned(state.compare, actor) : []   // BR5.1
  return {state, vm, options, pinned, threshold: config.limitedDataThreshold, compareOn: config.featureVisibility.compareTray}
})
generateMetadata({searchParams}): data = await load((await searchParams) ?? {}, locale)
  title = state.q ? `${state.q} — ${t('nav.results')} — ${t('brand.name')}` : documentTitle('results', t)
  isCanonicalBrowse(state) ? {title, alternates} : {title, robots: {index: false}}       // BR1.5
Page({searchParams}): data = await load(...)                  // first statement
  ViewShell(view='results', title='') > CompareProvider(enabled=compareOn, initialPinned, initialCards) > SearchResults(data) + CompareTray + CompareSheet
```

`searchParams` is a promise in Next 16 and absent in the route-table harness. The filter options are read before parsing so a URL value that is not an option is dropped. No `loading.tsx` under `search/`.

## 4. Components

### 4.1 `SearchBox` (client)

**Props:** `initialQuery: string`, `variant: 'hero' | 'inline'`.

Markup per BR4.1 (the prototype's `.search` form, inline icon SVG, `.btn` submit, `p.note search.banglish`). The `inline` variant adds class `search--inline` and, inside `CompareProvider`, hidden `tab` (when not default) and `compare` inputs (BR4.5); it reads the provider through an optional hook that returns `null` outside it, so Discover needs no provider.

```text
state: text, options[], active (-1), open
onInput: text = value; clearTimeout; if codePoints(trim(text)) < 2 -> close; else timer 150 ms -> abort prev; fetch(`/api/search/suggest?q=${enc}&locale=${locale}`, {signal, cache: 'no-store'})
         ok && Array -> options = body.slice(0, 8); open = options.length > 0; else close (silent)
onKeyDown: ArrowDown/ArrowUp -> move active with wrap (open only); Enter -> active >= 0 ? (preventDefault, router.push(href(options[active]))) : (submit); Escape -> close; Tab -> close
onBlur: close (after pointer selection has run)
href(o): doctor -> /doctors/{id}; facility -> /facilities/{id}; condition -> /topics/{id}
render: input[role=combobox][aria-autocomplete=list][aria-expanded=open][aria-controls=listId][aria-activedescendant=active option id]
        ul#listId.suggest[role=listbox][hidden=!open] > li#opt-i[role=option][aria-selected=i===active] > span title + span.suggest-kind label
```

### 4.2 `SearchResults` (server)

**Props:** `state: SearchState`, `vm: SearchResultsVM`, `options`, `threshold`, `compareOn`, `sortOptions`, `locale`. Renders § 1's head and body (WF2). The tab counts come from `vm.counts`; `All` = the sum; on All the results are grouped by `kind` in the fixed order. The count phrase uses the active tab's key (BR2.5). The sr-only list heading is the tab label. Lists sit in `Reveal key={resultsKey(state)}`; on All, each group's `Reveal` takes the same key plus the kind.

### 4.3 `ResolvedNote` (server)

**Props:** `note?: ResolvedNoteVM`, `didYouMean?: {publicId, name}[]`, `showKeepOriginal: boolean` (`keepOriginalUrl` present), `state`. The shapes of WF4: alias, Banglish and typo with the keep-original link built by `searchHref(state, {exact: true})`; exact condition with the topic link; Did you mean links to `searchHref(state, {q: name})`. Links through `SearchLink` and next-intl `Link` (topic page).

### 4.4 `FilterRail` (client)

**Props:** `tab`, `state`, `options`, `labels` (resolved on the server: field labels and option labels, so the client set gains no key).

`aside.panel.filters` > `h2` `filter.title` · per field (BR3.3): `div.fset > label[for] > span label + select#f-{key}[name={key}][form=search-state]` (`filter.any` first, options per BR3.4, selected from `state`; the topic select `name=term` groups its options in one `optgroup` per kind, and the server reads the kind from `filterOptions`) · `p.note` `filter.note` · `p.note` `evidence.status` when a documents field shows · `p.note` `filter.claimedNote` when the claimed field shows · `button.sr-only-focusable[type=submit][form=search-state]` `filter.apply` · `SearchLink.btn.small.ghost` `filter.clear` (BR3.6). `onChange`: `router.push(searchHref(state, {[key]: value || undefined}), {scroll: false})`.

### 4.5 `SortMenu` (client)

**Props:** `state`, `labels`. `label.sort` > `sort.label` + `select#sort[name=sort][form=search-state]` with the `sortOptions` the page passes: `relevance`, `volume`, `recent`, `alphabetical`, or `relevance` and `alphabetical` on facilities while facility feedback is hidden (BR2.1) and a hidden submit for no-script; `onChange` pushes.

### 4.6 `SearchLink` (client)

**Props:** next-intl `Link` props + `state`, `change`. `href = searchHref(state, {...change, compare: usePinnedIds() ?? state.compare})`; `scroll={false}`, `prefetch={false}` for in-page links. Server components render it with plain props.

### 4.7 `CompareProvider` (client)

**Props:** `enabled: boolean`, `initialPinned: PinnedDoctor[]`, `initialCards: CompareCardVM[]`, `threshold`, `children`. With `enabled` false it renders `children` only and `usePinnedIds()` returns `[]` (BR5.10).

```text
pinned = useState(initialPinned); cards = useRef(Map(initialCards)); maxOpen; sheetOpen; hydrated = true after mount
toggle({publicId, name}): pinned has id ? remove : pinned.length < 3 ? append : maxOpen = true
clear(): pinned = []
effect(pinned): history.replaceState(null, '', searchHref(currentState(), {compare: ids}))   // no request (BR5.2)
openSheet(): sheetOpen = true; missing = ids not in cards -> getCompareCards(missing) -> cache
renders: children + Sheet(open=maxOpen, title=compare.title) > p.note compare.max
```

`currentState()` reads `useSearchParams()`, so the URL stays the single source of the search state.

### 4.8 `PinButton` (client)

**Props:** `publicId`, `name`, `labels {add, remove}`. `button.btn.small.ghost[type=button][aria-pressed][data-pin-pending until hydrated]` > label + `span.sr-only` ` — {name}` (BR5.3). Passed as `DoctorEntry`'s `pinSlot`.

### 4.9 `CompareTray` (client)

Renders `null` until hydrated or with no pins. Otherwise `createPortal(…, document.body)` with the prototype's `#tray` markup (BR5.4), plus a `div.tray-spacer` inside the page with `style={cssVars({'--tray-h': height})}` from a `ResizeObserver` on the tray (BR5.5). `#open-compare` → `openSheet()`; `#clear-compare` → `clear()`; ✕ → `toggle`.

### 4.10 `CompareSheet` (client)

`Sheet(open=sheetOpen, title=compare.title, onClose)` > BR5.6's body. `SentimentBlock`, `OutcomeBlock` and `NotVerified` are T-202's server-compatible primitives (no `'use client'`, no hooks), so they render inside this client component with props; if T-202 made any of them server-only, CompareSheet receives pre-rendered columns from the action's data through the same props and the difference is recorded.

### 4.11 `EmptyResults`, `SearchPager` (server), `ResultsAnnouncer` (client)

- `EmptyResults`: `div.empty-state > h3 results.none + p results.noneBody`.
- `SearchPager`: BR3.8; `nav[aria-label=results.pager.label] > p range + SearchLink rel=prev / rel=next`.
- `ResultsAnnouncer({resultsKey, text})`: skips the first mount; on a new key calls `announce(text)` once (BR7.2).

### 4.12 `getCompareCards` (server action)

`'use server'`; BR5.7. Returns `Result<{cards: CompareCardVM[], threshold: number}>`. Map from `DoctorProfileVM`: `name`, `specialty`, `city`, `scopedSentiment` → `sentiment`, `scopedOutcome` → `outcome`, `conditions` → `{name, count}`, `accountsLimitedData`.

## 5. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn/search` | "ফলাফল" heading; five tabs with Bengali counts (doctors 11, facilities 10, topics 10, experiences 25, All their sum after T-201's seed); doctors list alphabetical; rail with "যেকোনো"; indexable | BR1.5, BR2.5, BR3.1 |
| Open `/en/search?q=dayabetis` | "Showing results for *dayabetis*"; note "Type 2 diabetes — also matched as “dayabetis”. Search the exact words instead"; doctors with a diabetes-tagged account only; noindex | BR2.3, BR1.5 |
| Activate "Search the exact words instead" | `?q=dayabetis&exact=1`; no note; tiers 0–2 only | BR2.3 |
| Open `?q=ডায়াবেটিস` (exact condition) | note "Type 2 diabetes — Experiences about this health topic" linking `/topics/{id}` | BR2.3 |
| Change the sort to Alphabetical | URL `sort=alphabetical`, page reset; the list re-enters once; count announced | BR1.4, BR6.2, BR7.2 |
| Pick "Female" in Doctor gender | `gender=female`; list narrows, order unchanged | BR2.6 |
| Facilities tab | rail shows Location, Facility type, Profile claimed and Information source, with the claiming note; entries show their not-verified mark | BR3.3, BR2.4, BR2.6 |
| `compareTray` switched off | no pin buttons, tray or sheet; `?compare=` dropped from every link | BR5.10 |
| Health topics tab | no rail; topic cards with "{n} patient experiences" or "No one has written about this yet." | WF2 |
| Experiences tab, 25 results | 20 rows, pager "1–20 of 25", Next page link | BR3.8 |
| Pin two doctors | buttons read "Remove — {name}", pressed; tray with two chips; URL `compare=a,b`; no request | BR5.2, BR5.4 |
| Pin a fourth | "Side by side" sheet: "You can compare up to three at a time."; URL unchanged | BR5.2 |
| Compare | sheet: callout first, two columns in pin order, each with "Registration not verified" | BR5.6, BR2.2 |
| Change tab with pins | pins kept in the new URL | BR5.9 |
| Type "di" with script | after 150 ms up to 8 options, Health topics first; ArrowDown, Enter opens the topic page | BR4.2 |
| Suggest returns 429 | nothing shown; Enter submits the search | BR4.3 |
| No script | tabs, sort and filters through links and the GET form; pin buttons invisible, space kept | BR3.5, BR5.8 |
| Reduced motion | no stagger, tray and sheet appear at once; every step completes | BR6.4 |

## 6. Message keys

ENT-012 in `entities.md`: 24 new keys, both files in one commit, Bengali flagged (FD-042). Count keys take `{n}` (plural selector) and `{count}` (formatted), as T-202's pattern.

## 7. Styles (T-206 section of `patient.css`)

Appended at the end under `/* T-206 — search page */`; each rule carries `/* added: T-206 <reason> */`; only T-011 tokens; no `transition`, `animation`, `@keyframes` or `:hover` transform (`check:motion` M6, M9); Prettier-formatted.

| Selector | Reason | Tokens |
|---|---|---|
| `.suggest`, `.suggest li`, `.suggest li[aria-selected="true"]`, `.suggest-kind` | suggestions (task step 2): `.panel` surface, hairline between rows, selected row on `--accent-soft` with a 2 px `--primary` inline-start bar (non-colour cue) | `--surface`, `--rule`, `--accent-soft`, `--primary`, `--elev-2`, `--radius-card`, `--space-*`, `--target` |
| `.search--inline` | inline box in the results head: full measure, no hero spacing | `--space-*` |
| `.seg a` | tab links look like T-011's `.seg button`; `[aria-current="true"]` mirrors its pressed state | as T-011's `.seg button` |
| `.result-group`, `.result-group > h2` | All-tab sections | `--space-*`, `--rule` |
| `.pager`, `.pager a` | pager row; 44 px links | `--space-*`, `--target` |
| `.tray-spacer` | `block-size: var(--tray-h, 0px)` | — |
| `[data-pin-pending]` | `visibility: hidden` until hydration | — |
| `.compare-col .badge` spacing, `.compare-col .breakdown` margin | replaces the prototype's inline `style` margins | `--space-*` |
| `@media (max-width: …)` for `.results-body` | the rail above the list at 360 px if T-011's restyle keeps two columns there | T-011's breakpoint |

A token T-011 lacks is an `ISSUES.md` row for U45, never a literal (FD-091 amendment).

## 8. Tests

Vitest with Testing Library in `describe.each(['en', 'bn'])`, inside `NextIntlClientProvider` with the real dictionaries; `@/i18n/routing` mocked to a plain anchor (ISS-053); `next/navigation` mocked (`useRouter().push`, `useSearchParams`); builders from `search-test-support.ts`. Names read as sentences.

| Test | Proves | Rules |
|---|---|---|
| `parseSearchParams` drops unknown tabs, sorts, enum values, ids and repeated values, cuts q at 200 code points, keeps an empty q | clean state | BR1.2 |
| `searchHref` writes one order, omits defaults, resets the page, carries compare | one URL per state | BR1.3, BR1.4 |
| `isCanonicalBrowse` true only for the bare browse state, compare ignored | noindex policy | BR1.5 |
| no-js: rendered without providers, tabs, pager and Clear all are anchors with the right hrefs; selects carry `form="search-state"`; the form has hidden q, tab, exact, compare | works without script | BR3.5, BR3.6 |
| SearchResults renders the heading with q as typed, five tabs with counts in order, `aria-current` on the active one, four sort options, the why-details | head order | BR2.1, BR3.1 |
| bn: tab and meta counts use Bengali digits | numerals | BR2.5 |
| ResolvedNote: alias, banglish and typo shape with the keep-original link built from the state (`exact=1`, filters and compare kept), absent without `keepOriginalUrl`; exactCondition shape with the topic link; Did you mean links searching each name; nothing | note shapes | BR2.3 |
| FilterRail: doctor, facility and experience rails show exactly their fields; options and selection from the URL; topic optgroups; `evidence.status` and `filter.claimedNote` notes; no "verified" text | per-tab rail | BR3.3, BR3.4, BR2.6 |
| SortMenu: four options; two on facilities with facility feedback hidden; no rating option | sort | BR2.1 |
| compareTray off: no PinButton, tray or sheet; the parser empties compare; the action refuses | setting honoured | BR5.10 |
| All tab: groups in kind order from one VM, show-all links, empty kinds left out, all-empty empty state | All tab | BR3.2, BR3.9 |
| SearchPager: range and links only past one page | paging | BR3.8 |
| compare max: a fourth pin opens the sheet with `compare.max` and the URL keeps three ids | max 3 | BR5.2 |
| compare toggle uses `history.replaceState`, never `router.replace` or `push` | no request | BR5.2 |
| tray: absent with 0, present with 1 (in `document.body`), Clear empties the URL parameter, spacer present while shown | tray | BR5.4, BR5.5 |
| CompareSheet: callout first, columns in pin order, `NotVerified` in each, empty text with 0, error text on a failed action | sheet | BR5.6, BR2.2, BR2.4 |
| getCompareCards: more than 3 ids or a bad id → validation error; a not-found id dropped; cards carry no facility field | action | BR5.7, BR2.10, BR2.11 |
| PinButton: `aria-pressed`, hidden name, pending attribute before hydration | pin | BR5.3, BR5.8 |
| SearchLink keeps the live compare list after a client pin | compare kept | BR5.9 |
| suggest: no fetch under 2 characters; listbox and option roles; arrows move `aria-activedescendant` with wrap; Enter navigates; Enter without an option submits; Escape closes; a rejected fetch and a 429 render nothing and call no console method | combobox | BR4.2, BR4.3 |
| SearchBox hero and inline: GET form to `/{locale}/search`, label, note; inline prefilled and carrying tab and compare | form | BR4.1, BR4.5 |
| ResultsAnnouncer: silent on mount, one announcement on a new key | announcement | BR7.2 |
| empty: `results.none` and `results.noneBody` | empty state | BR3.9 |
| page: robots absent on the bare page and `{index: false}` with q; a failed query throws; an unknown pinned id is dropped | page | BR1.5, BR1.8, BR5.1 |
| route table (T-010 row) green with its harness | route table | BR1.7 |
| smoke (`search.smoke.test.tsx`) | cumulative smoke | BR8.2 |

## 9. Owned-path additions (recorded in the hand-off)

`components/patient/{SearchLink,PinButton,ResultsAnnouncer,SearchPager}.tsx`, `lib/search-params.ts` (+ test), `server/actions/compare.ts` (+ test), `components/patient/search-test-support.ts`, the `/search` row harness in `app/pages.test.tsx`, and the § 17 entry in `docs/status/decision-log.md` — each for the reason given in `functional-spec.md` § 9 F15.
