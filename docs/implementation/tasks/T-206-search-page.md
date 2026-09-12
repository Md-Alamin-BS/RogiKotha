# T-206 — Search page, filters, neutral sort, compare tray and sheet (port)

| Field | Value |
|---|---|
| Story | STORY-SRCH-001, STORY-SRCH-002 |
| Phase / Lane | 2 / B |
| Class → model | M2 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–6 h agent; validation 1–1.5 h |
| Depends on | T-205 (`search.query`, `search.suggest`, `SearchResultsVM` — may start against the fake index once the contracts file is committed), T-202 (`DoctorEntry`, `SentimentBlock`, `OutcomeBlock`, `NotVerified`, `Sheet`), T-203 (`FacilityEntry`, `BrowseCard`) |
| Parallel-safe with | T-204, T-207 (T-207 owns the hero search form on Discover; both use `SearchBox` from this task — commit `SearchBox` first and tell T-207's lane) |

## Goal

Port `renderResults`, `filterFields`, `renderTray`, `openCompare` and the search input behaviour into
`/{locale}/search`, server-rendered from `search.query`, with the compare tray as client state mirrored
in the URL, both locales, faithful to 04b.

## Read first

1. `docs/implementation/01-conventions.md` §6–§9, §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/search` row and its query params), §4 "search"
3. `docs/implementation/tasks/T-205-search-module.md` step 1 (the VM you render) and step 5 (the three note shapes)
4. Prototype `app.js`: `filterFields` 351–374, `renderResults` 554–614, `doctorEntry` 615 (pin button), `facilityEntry` 636, `renderTray` 653–667, `openCompare` 2442–2467, handlers 2517–2540 (`data-q`, `data-tab`, `data-pin` with the max-3 sheet, `data-unpin`, `#open-compare`, `#clear-compare`), 2733–2734 (`#clear-filters`, `#keep-exact`), the `change` listener 2760–2768 (`#sort`, `[data-filter]`), the search form in `renderDiscover` 390–399 (`.search`, `.search-shell`, `.search-icon`, `#q`, note `search.banglish`), `titleForView` case `results`
5. `index.html` lines 108–118 (`#tray` markup) and `styles.css`: `.results-head`, `.query-line`, `.resolved`, `.seg`, `.meta-row`, `.sort`, `.why`, `.results-body`, `.filters`, `.fset`, `.entry-list`, `.empty-state`, `.tray*`, `.compare-grid`, `.compare-col`, `.search*`

## Owned paths

- `apps/web/src/app/[locale]/(patient)/search/page.tsx`
- `apps/web/src/components/patient/{SearchResults.tsx,SearchBox.tsx (client),FilterRail.tsx (client),SortMenu.tsx,CompareTray.tsx (client),CompareSheet.tsx (client),ResolvedNote.tsx,EmptyResults.tsx}`
- `apps/web/src/components/patient/shared/CompareProvider.tsx` (client context: pinned ids ↔ `?compare=` URL param, max 3)
- `apps/web/src/components/patient/DoctorEntry.tsx` — **only** wire the existing `onPin` prop (no other changes)
- Component tests

## Not in scope

- Ranking, filters semantics, suggestions backend → T-205. Discover page → T-207 (imports `SearchBox`). Facility-type filter UI (the prototype shows no facility filters beyond the shared rail; keep the rail identical on both tabs as the prototype does).
- Any new visual element not in the prototype (e.g. active-filter chips).

## Steps

1. **`/search` page** (server): parse `searchParams` → `SearchQueryInput` (invalid values dropped, not 400); call `search.query`; `generateMetadata` title = `q ? '{q} — nav.results' : nav.results`. Render `SearchResults` with the VM. The page must work with JavaScript disabled: tabs, sort and filters are plain links / a GET form.
2. **`SearchBox({initialQuery, variant: 'hero'|'inline'})`** (client, progressive): the `.search` form (`role=search`, GET to `/search`, `name=q`, `.search-shell` with the inline SVG icon, `.btn search.submit`, note `search.banglish`). Enhancement: `type=search` input with `list`-less custom suggestions — on input (debounced 150 ms, ≥ 2 chars) fetch `/api/search/suggest?q=`, render a `<ul role="listbox">` of ≤ 8 `<li role="option">` (`{title}` + small kind label `results.tabDoctors|results.tabFacilities|nav.condition`), arrow-key navigation, Enter navigates to the entity page, Escape closes; `aria-expanded`, `aria-activedescendant`. No suggestions when offline/fetch fails (silently). Add classes `.suggest`, `.suggest li[aria-selected]` to `patient.css` with `/* added: T-206 suggestions */` — style: `.panel` surface, hairline rule between rows, `--accent-soft` on the selected row. T-207 mounts `variant='hero'` with the condition chips below it (chips are T-207's).
3. **`SearchResults`** — port `renderResults` in order:
   1. `.panel.results-head`: kicker `nav.results`; `<h1 class="query-line">` = `search.didYouMean <em>{q}</em>` or `nav.results` when empty; `ResolvedNote`; `.seg` with two links (`aria-pressed` → use `aria-current="true"` on links; keep class) `results.tabDoctors ({counts.doctors})`, `results.tabFacilities ({counts.facilities})` — the prototype shows only these two tabs; the conditions/reviews tabs from the VM are **not** rendered in this task (record as follow-up for T-307/T-505 — keep the two-tab UI faithful); `.meta-row` = `{count} results.count` + `SortMenu`; `<details class="why"><summary>sort.why</summary><p>sort.whyBody</p></details>`.
   2. `.results-body`: `FilterRail` (`aside.panel.filters`, `<h2>filter.title`, then the `.fset` selects exactly as `filterFields`: `filter.specialty` (options from all specialties in the directory — server provides `facets` on the VM? **No** — T-205's VM has no facets; build options from `taxonomy.listTerms('specialty')` and `directory.listCities()`; if `listCities` does not exist, derive from `directory.listDoctors` in the page and note it), `filter.location`, `filter.sentiment`, `filter.outcome`, `filter.gender` (`filter.gender.female|male`), each with `filter.any` first; note `filter.note`; `.btn.small.ghost` `filter.clear` → link to `/search?q=&tab=`), then `.entry-list` of `DoctorEntry` (with `onPin`) or `FacilityEntry`, or `EmptyResults` (`.empty-state > h3 results.none + p results.noneBody`).
   Filters submit on change via `router.push` when JS is on; the rail is wrapped in a GET `<form>` with a visually-hidden submit button so it works without JS.
4. **`ResolvedNote`** — three shapes from the VM: (a) `matchedAlias` differs from `q` → `{resolvedTo.name} — search.alsoSearched “{matchedAlias}”. <a class="link-btn" href={keepOriginalHref}>search.keepOriginal</a>`; (b) exact condition → `{name} — <a class="link-btn" href="/topics/{publicId}">condition.accounts</a>`; (c) none → nothing. `<p class="resolved">`.
5. **`SortMenu`** — `<label class="sort">sort.label <select id="sort">` with `sort.relevance|volume|recent`; `onChange` pushes `?sort=`; inside the GET form for no-JS.
6. **Compare** — `CompareProvider` reads `?compare=a,b,c` (public ids, max 3, unknown ids dropped) and exposes `pinned`, `toggle(id)`, `clear()`; `toggle` beyond 3 opens a `Sheet` titled `compare.title` with `compare.max` (exactly the prototype). URL updates with `router.replace` (no history spam). `DoctorEntry` pin button text `compare.add|remove`. `CompareTray` (`#tray` markup: `.tray > .tray-inner > .tray-label compare.title + .tray-items (.tray-chip name + ✕ button aria-label compare.remove) + .tray-actions (.btn.small #open-compare compare.open, .btn.small.ghost #clear-compare compare.clear)`) rendered only on `/search` and only when pinned ≥ 1; announce `compare.pinned`-style changes via `useAnnounce` (the prototype announces nothing here; keep silent unless T-503 asks). `CompareSheet`: `Sheet` titled `compare.title`; body = `.callout.warn <b>compare.notRanking</b>` + `.compare-grid` of `.compare-col` per pinned doctor (`<h3>name`, `.doc-sub specialty · city`, `NotVerified`, `SentimentBlock`, `OutcomeBlock`, `.breakdown` table of conditions with counts, `.btn.small.ghost.block` link `nav.viewDoctor`), or `compare.empty` when none. The sheet needs doctor data for pinned ids: fetch via a server action `getCompareCards(publicIds)` (owned here, calls `directory.getDoctor` per id — ≤ 3 calls) when the sheet opens.
7. **Metadata/robots**: indexable when `q` is empty (a "browse" page); `noindex` when `q` is present (search result pages are not for crawlers).
8. `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`, `pnpm check`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| No-JS baseline | `pnpm vitest run apps/web -t "no-js"` (render without providers) | tabs, sort, filters, clear are links/forms with correct hrefs |
| Resolved note shapes | `pnpm vitest run apps/web -t "ResolvedNote"` | three cases render the exact copy; keep-original link carries `exact=1` |
| Compare max 3 | `pnpm vitest run apps/web -t "compare max"` | fourth pin opens the sheet with `compare.max`; URL has 3 ids |
| Tray visibility | `pnpm vitest run apps/web -t "tray"` | absent with 0 pinned; present with 1; `clear` empties URL param |
| Compare sheet | `pnpm vitest run apps/web -t "CompareSheet"` | `compare.notRanking` callout first; columns in pin order; each column has `NotVerified` |
| Suggestions a11y | `pnpm vitest run apps/web -t "suggest"` | listbox roles, arrow keys move `aria-activedescendant`, Escape closes, fetch failure renders nothing |
| Empty state | `pnpm vitest run apps/web -t "empty"` | `results.none` + `results.noneBody` |
| Locales | `pnpm vitest run apps/web -t "bn"` | Bengali counts in tabs and meta row |
| Impeccable + contrast | `npx impeccable detect apps/web/src --no-advisory && pnpm contrast` | zero findings (the historical `.search-shell` dark-glow warning is already ignored in `.impeccable/config.json`; do not add ignores) |
| Visual | `/en/search?q=diabetes` vs prototype `#search` with query `diabetes`, 1280/390 px; tray visible with two pins | faithful |
| Full check | `pnpm check` | green |

## Tests to write

Component tests for `SearchResults` (order, two tabs with counts, sort options, why-details), `FilterRail` (options + selected from URL, clear link), `ResolvedNote`, `CompareProvider` (URL round trip, max 3, unknown ids dropped), `CompareTray`, `CompareSheet`, `SearchBox` (form GET, suggestions keyboard model, no fetch under 2 chars), `EmptyResults`.

## Hard-rule checklist

- [ ] Sort menu offers exactly relevance / most accounts / most recent; the "why" copy is present.
- [ ] Nothing on the page combines counts into a score; the compare sheet leads with `compare.notRanking`.
- [ ] Original query is never silently replaced: the note + keep-original link render whenever the VM says so.
- [ ] `NotVerified` on every doctor entry and every compare column.
- [ ] Anonymous/author rules untouched (no author rendering on this page).
- [ ] Both locales; numerals via formatter; no inline literals.
- [ ] Works without JavaScript.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
