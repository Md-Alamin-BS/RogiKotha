# Business rules — U19 `t-206-search-page`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U19), `unit-of-work-story-map.md` (US5.1, US5.2), `requirements.md` (FR28–FR32, FR34, FR35, FR58, NFR4, NFR6–NFR8, NFR13), `stories.md`, `contract-summary.md` (C12, C14), T-206 with its FD-091 amendment, the U18 T-205 draft (§ 8 contracts, BR5.8, BR6.8, BR7.1, BR8.2), the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §3, §6–§9, §11, §14, the drafts of T-202, T-203, T-201, T-105, T-207 and T-011's record. Workflows are in `functional-spec.md`, component contracts in `frontend-components.md`, data shapes in `entities.md`.

**Refreshed 2026-10-29** with the spec: T-205's names (`alphabetical`, `term`/`termKind`, `hasEvidence`, `evidenceGroup`, `claimed`, `provenance`, `keepOriginalUrl`, `didYouMean`), one call for the All tab, `getConfig()`, the claimed and provenance filters, and two new rules: BR2.12 (fixed result-card fields, Q15) and BR5.10 (the `compareTray` setting, Q14). Every question is answered A by the agent under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 14 lists what changes under each other option.

```yaml
rules:
  # 1. Routing, loading, URL state and metadata
  - id: BR1.1
    statement: "Only the search page (element web) and the compare action (element web-actions) call the server; components receive view models and plain values as props."
    category: constraint
    applies_to: "search/page.tsx, server/actions/compare.ts, every component in the owned paths"
    trigger: "Any data the page renders"
    logic: "page -> getActor(), (await getConfig()), container.search.query | search.filterOptions, container.directory.getDoctor; CompareSheet -> getCompareCards (server action); components import only contracts, i18n, web-shared (src/lib, src/i18n) and server actions; SearchBox fetches /api/search/suggest from the browser"
    violation: "A component importing server/container.ts, database, adapters, test-support or node:* fails pnpm lint (eslint.boundaries.mjs, FD-093 (1))"
    source: "01-conventions.md §2 and §8, FD-093, C12, eslint.boundaries.mjs (T-010 merged)"
  - id: BR1.2
    statement: "The page parses the URL into a clean search state: invalid values are dropped, never a 400; a repeated parameter keeps its first value; q is kept as typed up to 200 code points; an empty q is a browse request."
    category: validation
    applies_to: "lib/search-params.ts parseSearchParams; search/page.tsx"
    trigger: "Every request to /{locale}/search"
    logic: "tab in [all, doctors, facilities, conditions, reviews] else doctors; sort in [relevance, volume, recent, alphabetical] else relevance (on facilities with featureVisibility.facilityAccounts false only relevance, alphabetical); exact only '1'; page integer >= 1 else 1; specialty and term only when isPublicId and among filterOptions (a legacy condition parameter is read as term); city and language only among filterOptions keys; sentiment, outcome, gender, facilityType, provenance only in their enums; claimed only yes|no; documents only in the tab's set (doctors has|none; reviews none|reviewed|later|both|outcome); a filter the tab does not apply is dropped (BR3.3); q = Array.from(q).slice(0, 200).join(''); compare = comma list, isPublicId, deduplicated, first three, and empty when featureVisibility.compareTray is false (BR5.10)"
    violation: "A malformed parameter reaching search.query returns validation and the page throws (a 500 on a user-typed URL, S1); a q cut inside a surrogate pair renders a broken character"
    source: "T-206 step 1, T-205 § 8 and BR7.1, 01-conventions.md §3, construction.md Security, Question 3"
  - id: BR1.3
    statement: "Every href the page writes for the search state is built by one function in a fixed parameter order, with defaults omitted, and carries the live compare list."
    category: computation
    applies_to: "lib/search-params.ts searchHref; tabs, pager, Clear all, keep-original, Did you mean, All-tab show-all links, SortMenu, FilterRail"
    trigger: "Rendering any in-page search link or navigating on change"
    logic: "order: q, tab, sort, exact, page, then filters in rail order, then compare; omit tab=doctors, sort=relevance, page=1 and empty values; locale prefix through next-intl Link; compare from CompareProvider at render (SearchLink) or from the server state without script"
    violation: "Two hrefs for one state split canonical URLs; a stale compare list drops or restores pins on the next click (F4)"
    source: "T-206 steps 3 and 6, 03-routes-and-contracts.md §1, Question 6"
  - id: BR1.4
    statement: "A change of q, tab, sort, exact or any filter resets the page to 1; only a pager link changes the page."
    category: constraint
    applies_to: "searchHref"
    trigger: "Building a link or a form submission that changes the state"
    logic: "IF change touches q | tab | sort | exact | a filter THEN page removed"
    violation: "Page 3 of a narrower set is empty and the reader sees the empty state for results that exist"
    source: "Question 10"
  - id: BR1.5
    statement: "The page is indexable only as the canonical browse page; any query, non-default tab, sort, filter, exact flag or page answers noindex."
    category: constraint
    applies_to: "search/page.tsx generateMetadata"
    trigger: "Every request"
    logic: "IF isCanonicalBrowse(state) (compare ignored) THEN no robots field, canonical /{locale}/search with language alternates ELSE robots {index: false}; title = q ? '{q} — ' + nav.results + ' — ' + brand.name : documentTitle('results')"
    violation: "Indexed result pages for arbitrary typed text (AC5.2.5); robots on the browse page turns the T-010 route table red"
    source: "T-206 step 7, FR35, NFR8, AC5.2.5, app/pages.test.tsx, Question 11"
  - id: BR1.6
    statement: "Each request runs one cached loader shared by the page and its metadata, with no revalidation, so a hidden or unpublished record disappears on the next request."
    category: constraint
    applies_to: "search/page.tsx"
    trigger: "Every request"
    logic: "load = cache(async (raw, locale) => ...); generateMetadata and Page call it, Page first; no revalidate, no loading.tsx under search/"
    violation: "A cached list can show a hidden record (AC5.1.6); a second query run doubles the server time"
    source: "AC5.1.6, T-202 D3 and F21"
  - id: BR1.7
    statement: "The /search row of the T-010 route table is updated in the same commit as the page, keeping its checks."
    category: constraint
    applies_to: "apps/web/src/app/pages.test.tsx"
    trigger: "Replacing the placeholder page"
    logic: "row keeps view 'results', one h1 equal to titleForView('results') with no q, title documentTitle('results'), robots undefined; the harness mocks container.search, getConfig and getActor and passes no searchParams (treated as empty)"
    violation: "The route table turns red, or a weakened row hides a page error (team.md: no assertion removed)"
    source: "T-010 pages.test.tsx, team.md Testing Posture"
  - id: BR1.8
    statement: "A failed search, options or config read is thrown to Next's error boundary; a not-found pinned doctor is dropped."
    category: constraint
    applies_to: "search/page.tsx loader, validatePinned"
    trigger: "A Result with ok false"
    logic: "search.query or filterOptions error -> throw (validation cannot happen after BR1.2); getDoctor not_found -> drop the id; any other getDoctor error -> throw"
    violation: "A silent empty page for an infrastructure failure looks like 'Nothing matched yet'"
    source: "01-conventions.md §3, construction.md Error Handling"

  # 2. Hard rules and content
  - id: BR2.1
    statement: "The sort control offers exactly relevance (default), most experiences, most recent and alphabetical; no highest-rated option exists; the page keeps the query's order and shows the 'Why can't I sort by best?' details."
    category: constraint
    applies_to: "SortMenu, SearchResults"
    trigger: "Every render of the results head"
    logic: "options = [relevance: sort.relevance, volume: sort.volume, recent: sort.recent, alphabetical: sort.alphabetical]; on facilities with facility feedback hidden only relevance and alphabetical (T-205 BR5.8); results rendered in VM order; details.why > summary sort.why + p sort.whyBody"
    violation: "A best or rating sort, a client re-sort, or an option that silently does nothing"
    source: "PRODUCT.md hard rules (no highest-rated sort, neutral order), FR32, AC5.2.1, AC5.2.2, T-205 BR5.8, Question 2"
  - id: BR2.2
    statement: "Nothing on the page combines counts into a score; the compare sheet leads with the not-a-ranking callout and shows its columns in pin order."
    category: constraint
    applies_to: "CompareSheet, SearchResults"
    trigger: "Rendering figures"
    logic: "div.callout.warn > b compare.notRanking is the first child of the sheet body when at least one pin exists; columns in pin order; no total, average, score or rank anywhere"
    violation: "A combined number or an ordered comparison reads as a quality ranking"
    source: "PRODUCT.md hard rules, prototype openCompare"
  - id: BR2.3
    statement: "The visitor's query is never replaced silently: the heading and the box show it exactly as typed, a resolved note names what matched and offers the exact search, and Did you mean items are links that replace nothing."
    category: constraint
    applies_to: "SearchResults results-head, ResolvedNote, SearchBox inline"
    trigger: "Any q; a VM with resolvedNote or didYouMean"
    logic: "h1 = search.didYouMean + em(q); IF note.kind in [alias, banglish, typo] AND lower(matchedAlias) != lower(q) THEN '{resolvedTo.name} — search.alsoSearched “{matchedAlias}”.' + (keepOriginalUrl present ? SearchLink search.keepOriginal to searchHref(state, {exact: true}) : nothing); IF note.kind = exactCondition THEN '{resolvedTo.name} — ' + Link condition.accounts to /topics/{publicId}; ELSE IF didYouMean non-empty THEN search.didYouMeanPrompt + SearchLink per item to searchHref(state, {q: item.name}) (filters, page, exact dropped); with exact=1 no note"
    violation: "Results for another term with no note break 'original query never silently replaced' (FR29, AC5.1.3); using keepOriginalUrl as the href drops the filters and pins (F18)"
    source: "FR29, AC5.1.2, AC5.1.3, prototype renderResults, T-205 § 8 and BR6.8, Questions 5 and 8"
  - id: BR2.4
    statement: "Every doctor entry and every compare column shows 'Registration not verified'; every facility entry shows its not-verified mark."
    category: constraint
    applies_to: "DoctorEntry (T-202), FacilityEntry (T-203), CompareSheet"
    trigger: "Rendering a doctor or facility"
    logic: "DoctorEntry and FacilityEntry render their badges unconditionally; each compare-col renders NotVerified after its sub-line"
    violation: "A doctor without the mark breaks the hard rule"
    source: "PRODUCT.md hard rule, T-206 hard-rule checklist, prototype openCompare"
  - id: BR2.5
    statement: "Counts on tabs, the meta row, All-tab group heads and the pager follow the active language's numerals and use per-tab plural keys; no percentage."
    category: computation
    applies_to: "SearchResults, SearchPager, ResultsAnnouncer"
    trigger: "Rendering any count"
    logic: "'{label} ({formatNumber(count, locale)})'; results.count{All|Doctors|Facilities|Conditions|Reviews} with {n, count}; All count = sum of the four counts"
    violation: "Latin digits under bn, '1 doctors match', or a percentage (owner: counts only)"
    source: "project.md Mandated (numerals follow the language), 01-conventions.md §6, owner's T-202 Q1 answer, Question 9"
  - id: BR2.6
    statement: "Filters narrow and never reorder; the rail says so; document filters are labelled as document presence only and the claimed filter as claiming only, never as verification."
    category: constraint
    applies_to: "FilterRail"
    trigger: "Rendering the rail"
    logic: "p.note filter.note under the fields; with a documents field p.note evidence.status; with the claimed field p.note filter.claimedNote; document option labels label.noDocuments, filter.documents.has, evidence.group.reviewed | later | outcome, filter.documents.both; provenance option labels prov.community | provider | admin; no option or note says verified or approved"
    violation: "'Verified documents' or 'verified profile' wording breaks the hard rules; a filter that reorders breaks neutral order"
    source: "PRODUCT.md hard rules, FR31, FR58, AC5.2.4, profile.claimNote, Question 3"
  - id: BR2.7
    statement: "Location is a manually chosen field; the page offers no geolocation, 'near me', distance, fee or schedule filter."
    category: constraint
    applies_to: "FilterRail"
    trigger: "Rendering the rail"
    logic: "filter.location is a select of filterOptions.cities; no navigator.geolocation call in the owned paths; no fee or schedule field (no structured data; FR31 'when available')"
    violation: "A device-location feature contradicts FR34 and AC5.1.5"
    source: "FR28, FR31, FR34, AC5.1.5, T-205 BR7.6"
  - id: BR2.8
    statement: "'Not provided', 'No documents' and 'Limited data' come from the shared primitives and the view models; the page never prints 0 for a missing value and never compares counts with the threshold itself."
    category: constraint
    applies_to: "DoctorEntry, FacilityEntry, CompareSheet (SentimentBlock, OutcomeBlock)"
    trigger: "Rendering a distribution or a document count"
    logic: "threshold = (await getConfig()).limitedDataThreshold (2-50) passed to the primitives; compare columns show the Limited data badge when accountsLimitedData; an empty distribution -> label.notProvided"
    violation: "A 0 for a missing value, or a sparse distribution without the mark"
    source: "PRODUCT.md hard rules, T-202 BR2.2-BR2.7, T-105 R2 (owner)"
  - id: BR2.9
    statement: "Authors appear only through T-202's Byline inside AccountRow; anonymous authors are never linked and a deleted account's personas read 'Former member'."
    category: constraint
    applies_to: "AccountRow on the Experiences and All tabs"
    trigger: "Rendering an experience card"
    logic: "AccountRow(card) unchanged; no author field read by T-206 code"
    violation: "A page-made author link could expose an anonymous author"
    source: "PRODUCT.md hard rules, T-202 BR2.12, owner's T-104 Q15 answer"
  - id: BR2.10
    statement: "Doctor entries and compare columns carry no facility figure; facility entries show their own figures only when facility feedback is visible."
    category: constraint
    applies_to: "CompareSheet, getCompareCards, FacilityEntry"
    trigger: "Rendering a doctor or facility"
    logic: "CompareCardVM maps only DoctorProfileVM doctor fields (no facilities); FacilityEntry applies feedbackVisible (T-203 BR3.11)"
    violation: "Facility feedback beside a doctor's figures breaks the separation hard rule"
    source: "PRODUCT.md hard rule (facility feedback never in a doctor's summaries), FR26"
  - id: BR2.11
    statement: "The page shows only what the search VM and the directory return; a pinned id that is unpublished, hidden or merged away is dropped."
    category: constraint
    applies_to: "search/page.tsx, getCompareCards"
    trigger: "Rendering results or pins"
    logic: "no client-side injection of records; validatePinned and getCompareCards keep only ok getDoctor results"
    violation: "A hidden profile reachable through a shared compare URL fails AC5.1.6"
    source: "FR35, AC5.1.6"
  - id: BR2.12
    statement: "Result cards show the fixed default field set of FR30 (identity, type or specialty, location, verification and provenance mark, condition match, review summary); release 1 has no runtime card-field setting."
    category: constraint
    applies_to: "DoctorEntry, FacilityEntry, AccountRow, BrowseCard as used by SearchResults"
    trigger: "Rendering any result"
    logic: "the page passes the cards unchanged; no config key is read for card fields; the FD entry of functional-spec.md § 17 (6) records the narrowing beside T-105's release-1 settings"
    violation: "A half-built configurable card, or FR30's configurable clause silently unmet"
    source: "FR30, owner's T-105 R1 answer (release 1 settings narrowed), Question 15"

  # 3. Tabs, filters, sort, paging
  - id: BR3.1
    statement: "The tab row has five links in the order All, Doctors, Facilities, Health topics, Experiences, each with its count; Doctors is the default; the active one has aria-current."
    category: constraint
    applies_to: "SearchResults nav.seg"
    trigger: "Every render"
    logic: "nav.seg[aria-label=nav.results] > SearchLink[data-press][aria-current=true when active] x 5; labels results.tabAll, results.tabDoctors, results.tabFacilities, nav.condition, results.tabReviews"
    violation: "aria-pressed on a link is an axe critical; a missing tab fails FR30"
    source: "FR30, AC5.1.1, T-011 press list, Question 1"
  - id: BR3.2
    statement: "The All tab shows, per kind with results, its entries under a heading with its count and a link to the full tab; it has no rail and no pager."
    category: computation
    applies_to: "SearchResults (All)"
    trigger: "tab = all"
    logic: "one search.query call with tab all (T-205 returns up to three per kind, BR8.2 there); group by kind in order doctors, facilities, conditions, reviews; IF counts[kind] > 0 THEN section.result-group > h2 '{label} ({count})' + entries + SearchLink results.showAll {count} (tab = kind); IF every count = 0 THEN EmptyResults"
    violation: "Empty groups or a rail whose fields do nothing confuse the reader; kinds ranked against each other"
    source: "FR30, T-205 BR8.2, Question 1"
  - id: BR3.3
    statement: "The filter rail shows, per tab, only the fields Search applies to that tab."
    category: constraint
    applies_to: "FilterRail"
    trigger: "Rendering the rail"
    logic: "doctors: specialty, location, sentiment, outcome, gender, term, language, documents(has|none), claimed, provenance; facilities: location, facilityType, claimed, provenance; reviews: term, sentiment, outcome, documents(none|reviewed|later|both|outcome); conditions, all: no rail"
    violation: "A field that changes nothing misleads (F7); a missing field fails FR31 or FR58"
    source: "FR31, FR58, AC5.2.4, T-205 BR7.1, functional-spec.md § 17, Question 3"
  - id: BR3.4
    statement: "Filter options come from search.filterOptions or the enums, 'Any' first, the URL's value selected; the topic field groups its options by kind."
    category: computation
    applies_to: "FilterRail"
    trigger: "Rendering the rail"
    logic: "specialty <- filterOptions.specialties; location <- cities; language <- languages; term <- terms in optgroups compose.tagGroup.condition | symptom | treatment | medicine (the chosen option sets termKind); sentiment <- SENTIMENTS (sentiment.*); outcome <- OUTCOMES (outcome.*); gender <- [female, male] (filter.gender.*); facilityType <- FACILITY_TYPES (facility.type.*); provenance <- PROVENANCES (prov.*); claimed <- yes (filter.claimed.yes), no (filter.claimed.no); first option filter.any value ''"
    violation: "An option that matches no published document yields an empty list with no explanation"
    source: "Question 4, prototype filterFields, F21"
  - id: BR3.5
    statement: "With script, a change of sort or filter navigates at once; without script, the same fields submit one GET form."
    category: constraint
    applies_to: "FilterRail, SortMenu, form#search-state"
    trigger: "A select change or a submit"
    logic: "form#search-state[method=get][action=/{locale}/search] in the results head with hidden q, tab, exact, compare; every select carries form=search-state; a visually hidden submit filter.apply in the rail and beside the sort; onChange -> router.push(searchHref(state, change), {scroll: false})"
    violation: "A page that needs script to filter fails 'Works without JavaScript'"
    source: "T-206 steps 1, 3 and 5, 01-conventions.md §8"
  - id: BR3.6
    statement: "'Clear all' removes the filters and the page and keeps q, tab, sort, exact and compare."
    category: computation
    applies_to: "FilterRail clear link"
    trigger: "Rendering the link"
    logic: "href = searchHref({q, tab, sort, exact, compare})"
    violation: "Resetting the sort deviates from the prototype (state.filters = {sort})"
    source: "prototype #clear-filters, Question 12"
  - id: BR3.7
    statement: "The sort menu sits in the meta row with its visible label and belongs to the search-state form."
    category: constraint
    applies_to: "SortMenu"
    trigger: "Every render"
    logic: "label.sort > 'sort.label' + select#sort[name=sort][form=search-state]"
    violation: "An unlabelled select fails NFR6"
    source: "prototype renderResults meta-row, NFR6"
  - id: BR3.8
    statement: "When a single tab's total exceeds one page, a pager shows the range and previous and next links."
    category: computation
    applies_to: "SearchPager"
    trigger: "meta.total > meta.pageSize (20) on a single tab"
    logic: "nav[aria-label=results.pager.label] > p results.pager.range {from, to, total} + SearchLink rel=prev results.pager.prev when page > 1 + SearchLink rel=next results.pager.next when to < total"
    violation: "A count of 25 above a list of 20 with no way to reach the rest"
    source: "Question 10, seed (25 experiences)"
  - id: BR3.9
    statement: "An empty result list shows the prototype's empty state."
    category: constraint
    applies_to: "EmptyResults"
    trigger: "No results on a single tab, or every count 0 on All"
    logic: "div.empty-state > h3 results.none + p results.noneBody"
    violation: "A blank list area"
    source: "prototype renderResults, T-206 acceptance 'Empty state'"

  # 4. Search box and suggestions
  - id: BR4.1
    statement: "SearchBox is a GET form to the search page with the prototype's markup, label and Banglish note, and works without script."
    category: constraint
    applies_to: "SearchBox"
    trigger: "Every render (Discover hero, results inline)"
    logic: "form.search[role=search][method=get][action=/{locale}/search] > label.sr-only[for] search.label > div.search-shell > svg[aria-hidden] + input[type=search][name=q][autocomplete=off][placeholder=search.placeholder][value=initialQuery] + button.btn[type=submit] search.submit; p.note search.banglish; ids from useId so two boxes never clash"
    violation: "A box that needs script, or a duplicate id, fails NFR6 and the no-script rule"
    source: "prototype renderDiscover search form, T-206 step 2, T-207 BR2.10"
  - id: BR4.2
    statement: "Suggestions follow the WAI-ARIA combobox pattern: at least two characters, 150 ms idle, at most eight options, arrow keys, Enter, Escape."
    category: constraint
    applies_to: "SearchBox"
    trigger: "Typing with script"
    logic: "IF trimmed code-point length >= 2 AND 150 ms idle THEN abort the previous request; fetch /api/search/suggest?q&locale; ul.suggest[role=listbox] > li[role=option][id][aria-selected] (title + kind label); input[role=combobox][aria-expanded][aria-controls][aria-activedescendant][aria-autocomplete=list]; ArrowDown/ArrowUp move with wrap; Enter on an active option -> router.push(entity href); Enter without one -> submit; Escape, Tab, blur -> close, text kept; pointer selection navigates"
    violation: "A list keyboard users cannot reach or leave fails NFR6; a fetch per keystroke loads the server"
    source: "T-206 step 2 and acceptance 'Suggestions a11y', WAI-ARIA APG combobox"
  - id: BR4.3
    statement: "A suggestion failure renders nothing and says nothing, and the query is never logged."
    category: constraint
    applies_to: "SearchBox"
    trigger: "Fetch error, offline, non-200 (429 included), malformed body"
    logic: "catch -> close the list; no console call; no announcement; the form still submits"
    violation: "An error message for an optional aid, or a logged query (01-conventions §11)"
    source: "T-206 step 2, T-205 WF3, 01-conventions.md §11"
  - id: BR4.4
    statement: "Each suggestion shows its title as text and a kind label from existing keys."
    category: constraint
    applies_to: "SearchBox options"
    trigger: "Rendering an option"
    logic: "doctor -> results.tabDoctors, facility -> results.tabFacilities, condition -> nav.condition; title rendered as a text node"
    violation: "Rendering the title as HTML opens an injection path"
    source: "T-206 step 2, construction.md Security"
  - id: BR4.5
    statement: "On the search page the inline box carries the active tab and the compare list as hidden fields."
    category: constraint
    applies_to: "SearchBox variant inline"
    trigger: "Submitting a new query on /search"
    logic: "hidden tab when not default; hidden compare from CompareProvider when present; filters, exact and page are not carried"
    violation: "A new query that drops the pins or jumps back to Doctors"
    source: "prototype (state.compare kept across queries), Question 5"

  # 5. Compare
  - id: BR5.1
    statement: "Pins in the URL are validated on the server: at most three, public ids only, each found by the directory, order kept."
    category: validation
    applies_to: "search/page.tsx validatePinned"
    trigger: "A request with compare (and compareTray on)"
    logic: "for id in state.compare (<= 3): r = directory.getDoctor({publicId: id}); keep {publicId, name} and its CompareCardVM when ok; drop not_found"
    violation: "Unknown or hidden ids in the tray (AC5.1.6), or more than three columns"
    source: "T-206 step 6, AC5.1.6"
  - id: BR5.2
    statement: "Toggling a pin updates client state and the URL with history.replaceState; a fourth pin opens the max sheet and changes nothing."
    category: computation
    applies_to: "CompareProvider"
    trigger: "PinButton or a tray ✕"
    logic: "IF pinned has id THEN remove ELSE IF size < 3 THEN append ELSE open Sheet(compare.title) > p.note compare.max; history.replaceState(null, '', searchHref(current state, {compare: ids}))"
    violation: "router.replace re-runs the search and re-renders the list on every pin (F3)"
    source: "prototype data-pin handler, T-206 step 6, Question 6"
  - id: BR5.3
    statement: "A pin button says what it does, for whom, and its state."
    category: constraint
    applies_to: "PinButton"
    trigger: "Rendering a doctor entry with pins"
    logic: "button.btn.small.ghost[type=button][aria-pressed] > compare.add | compare.remove + span.sr-only ' — {name}'"
    violation: "Eleven identical 'Add to compare' buttons are ambiguous for screen-reader users"
    source: "NFR6, WCAG 2.4.6"
  - id: BR5.4
    statement: "The tray shows only on the search page with at least one pin, outside main, with chips, Compare and Clear."
    category: constraint
    applies_to: "CompareTray"
    trigger: "pinned.length >= 1 after hydration"
    logic: "createPortal(div#tray.tray > div.tray-inner > span.tray-label compare.title + div.tray-items (span.tray-chip name + button ✕ aria-label 'compare.remove — {name}') + div.tray-actions (button.btn.small compare.open, button.btn.small.ghost compare.clear), document.body); Clear -> pinned = [] and compare removed"
    violation: "A tray on other pages or with nothing in it"
    source: "prototype renderTray and #tray markup, T-206 step 6, Question 13"
  - id: BR5.5
    statement: "While the tray shows, the page reserves its height so the colophon's disclaimer is never covered."
    category: constraint
    applies_to: "CompareTray, T-206 CSS"
    trigger: "Tray visible"
    logic: "div.tray-spacer at the end of the page content with block-size var(--tray-h) from a ResizeObserver on the tray, present only while the tray shows"
    violation: "The persistent medical-advice disclaimer hidden behind a fixed bar breaks a hard rule"
    source: "project.md Mandated (persistent disclaimer), Question 13"
  - id: BR5.6
    statement: "The compare sheet leads with the callout and shows one column per pin with the prototype's fields."
    category: constraint
    applies_to: "CompareSheet"
    trigger: "Compare activated"
    logic: "0 pins -> p.note compare.empty; else callout first, div.compare-grid > div.compare-col x n: h3 name, p.doc-sub specialty · city, NotVerified, SentimentBlock(sentiment, threshold), OutcomeBlock(outcome, threshold), Limited data badge when accountsLimitedData, table.breakdown (caption.sr-only name) rows condition name + formatNumber(count), Link.btn.small.ghost nav.viewDoctor; loading -> p.note[aria-busy=true] and no figures; error -> p.note errors.common.internal, callout kept"
    violation: "Figures without the callout read as a ranking; a column without NotVerified breaks the hard rule"
    source: "prototype openCompare, T-206 step 6 and acceptance 'Compare sheet'"
  - id: BR5.7
    statement: "getCompareCards accepts at most three public ids, reads each doctor, drops not-found ones and returns doctor-only cards."
    category: validation
    applies_to: "server/actions/compare.ts"
    trigger: "Sheet opened with uncached pins"
    logic: "IF compareTray off OR !Array.isArray(ids) OR ids.length > 3 OR some !isPublicId THEN err('validation'); dedupe; actor = getActor(); each getDoctor -> ok map | not_found skip; ok({cards, threshold}); a throw -> err('internal') with correlationId, logged by action name only"
    violation: "An unbounded action is a cheap amplification endpoint; a card for a hidden doctor fails AC5.1.6"
    source: "01-conventions.md §3 and §11, construction.md Security"
  - id: BR5.8
    statement: "Compare needs script, as in the prototype: pin buttons hold their space invisibly until hydration; tray and sheet render only on the client."
    category: constraint
    applies_to: "PinButton, CompareTray, CompareSheet"
    trigger: "Server render and hydration"
    logic: "server renders PinButton with data-pin-pending (visibility hidden, space kept); the hydrated CompareProvider clears it; no tray or sheet markup on the server"
    violation: "Dead buttons without script, or a layout shift when they appear (NFR13 CLS <= 0.1)"
    source: "prototype (script-only compare), NFR13, Question 7"
  - id: BR5.9
    statement: "The compare list survives every in-page navigation and a new query."
    category: constraint
    applies_to: "SearchLink, FilterRail, SortMenu, SearchBox inline"
    trigger: "Any navigation within /search"
    logic: "SearchLink and router.push add compare from CompareProvider; the inline box adds the hidden field"
    violation: "Pins lost on a tab change (F4)"
    source: "prototype (state.compare global), F4"
  - id: BR5.10
    statement: "With featureVisibility.compareTray false the whole compare feature is absent: no pin buttons, tray, sheet or compare parameter."
    category: policy
    applies_to: "search/page.tsx, SearchResults, CompareProvider, getCompareCards, searchHref"
    trigger: "(await getConfig()).featureVisibility.compareTray is false"
    logic: "no pinSlot passed to DoctorEntry; CompareProvider renders children only; no validatePinned reads; parseSearchParams empties compare, so no href carries it; getCompareCards returns err('validation'); the next request after a change applies the new value"
    violation: "The Super Admin's setting does not take effect (FR100, FD-018), or pins remain with no tray to show them"
    source: "T-105 draft BR1.6 (compareTray false hides the compare tray; U19 reads it), FD-018, packages/contracts/src/config-values.ts, Question 14"

  # 6. Motion
  - id: BR6.1
    statement: "The page adds no RouteTransition; the layout's one boundary runs only when the path changes."
    category: constraint
    applies_to: "search/page.tsx"
    trigger: "Navigation"
    logic: "no RouteTransition import in the owned paths"
    violation: "Two 'page' names make the browser skip every route transition (T-202 F4)"
    source: "T-011 RouteTransition (patient layout), T-202 BR5.1"
  - id: BR6.2
    statement: "Each result list is wrapped in Reveal keyed by the results key, so a new query, tab, sort, filter or page lists its first six items once and a pin never does."
    category: constraint
    applies_to: "SearchResults lists"
    trigger: "Rendering a list"
    logic: "<Reveal key={resultsKey(state)} as='div'>; resultsKey excludes compare; each All-tab group keys the same way plus its kind"
    violation: "Re-entry on every pin (T-206 step 9) or no entry on a new query"
    source: "T-206 step 9, T-011 BR6.2, components/patient/motion/Reveal.tsx"
  - id: BR6.3
    statement: "The tray and the compare sheet use T-011's entry; suggestions open without movement; presses use T-011's press list or data-press."
    category: constraint
    applies_to: "CompareTray, CompareSheet, SearchBox, tab links"
    trigger: "Opening, pressing"
    logic: ":is(.sheet, .tray) entry from motion.css; .suggest has no motion; tab links carry data-press (the list has .seg button only); .btn covers pins and tray buttons"
    violation: "Own motion rules fail check:motion (M6-file)"
    source: "T-206 step 9, motion.css (T-011)"
  - id: BR6.4
    statement: "T-206's CSS declares no transition or animation, and the LCP element (the query heading) is never animated in; with reduced motion every step completes."
    category: constraint
    applies_to: "T-206 section of patient.css"
    trigger: "pnpm check:motion; Lighthouse; the reduced-motion journey"
    logic: "no transition*, animation* or @keyframes in T-206's rules; h1.query-line outside Reveal"
    violation: "check:motion fails; LCP over 2.5 s on the throttled profile"
    source: "FD-091, NFR13, AC2.4.3, AC2.4.6"
  - id: BR6.5
    statement: "The disclaimer, the emergency guidance and the demo marker stay in T-011's static set; nothing in T-206 wraps them."
    category: constraint
    applies_to: "every T-206 component"
    trigger: "Rendering"
    logic: "no Reveal, tray or sheet around the colophon, the demo marker or emergency blocks"
    violation: "An animated disclaimer or emergency strip breaks AC2.4.4"
    source: "AC2.4.4, T-011 BR7.1-BR7.4"

  # 7. Accessibility, language and style
  - id: BR7.1
    statement: "One h1 (the query line); h2 for the rail title, the hidden list heading and the All groups; h3 for entries."
    category: constraint
    applies_to: "SearchResults, FilterRail"
    trigger: "Every render"
    logic: "h1.query-line; aside h2 filter.title; div.entry-list > h2.sr-only {tab label}; DoctorEntry, FacilityEntry, AccountRow headingLevel 3"
    violation: "Skipped levels or two h1 fail NFR6 and the route table"
    source: "FR95, NFR6, T-202 headingLevel default 3"
  - id: BR7.2
    statement: "After an in-page change the tab's count phrase is announced once; nothing is announced on first load."
    category: constraint
    applies_to: "ResultsAnnouncer"
    trigger: "resultsKey changes after mount"
    logic: "effect on key: skip the first; announce(count phrase) via useAnnounce"
    violation: "A silent list change leaves screen-reader users unsure; an announcement on load duplicates ViewShell's"
    source: "CR-004 (one live region), WCAG 4.1.3, T-202 BR4.5"
  - id: BR7.3
    statement: "At 360 px and at 200% zoom nothing scrolls sideways except the labelled breakdown tables, and every control is at least 44 px."
    category: constraint
    applies_to: "every T-206 component and its CSS"
    trigger: "Viewport and zoom checks"
    logic: "rail above the list in one column; tab row wraps; tray chips wrap and both tray buttons stay visible; compare columns stack; --target for hit areas"
    violation: "Horizontal overflow fails NFR4"
    source: "NFR4, NFR6, T-011 tokens"
  - id: BR7.4
    statement: "All copy comes from keys present in both languages, Bengali flagged for review, with no inline literal and no capital transform on Bengali."
    category: constraint
    applies_to: "every T-206 component; packages/i18n/messages"
    trigger: "Any visible or announced text"
    logic: "ENT-012 keys in en.json and bn.json in one commit; numerals through formatNumber"
    violation: "A key without Bengali is a build failure (i18n:check)"
    source: "project.md Mandated and Forbidden, FD-024, FD-042, NFR7"
  - id: BR7.5
    statement: "Page styles live in T-206's own section of patient.css, use only T-011 tokens and class names, mark each rule, and are Prettier-formatted."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-206 section)"
    trigger: "Adding a rule"
    logic: "/* added: T-206 <reason> */ on each rule; var(--*) tokens only; no edit of tokens.css or motion.css; a missing token is an ISSUES.md row for U45"
    violation: "Edited T-011 files or literal colours fail review and contrast:patient"
    source: "T-206 FD-091 amendment, project.md Code Style, team.md Code Style"

  # 8. Build and test
  - id: BR8.1
    statement: "Every component has tests in en and bn with builders from search-test-support.ts, never @rogikotha/test-support."
    category: constraint
    applies_to: "apps/web tests"
    trigger: "Code Generation"
    logic: "describe.each(['en', 'bn']); builders in components/patient/search-test-support.ts (test category); @/i18n/routing and next/navigation mocked"
    violation: "An apps import of test-support fails lint (FD-040, FD-093 (5))"
    source: "team.md Testing Posture, FD-040, FD-093"
  - id: BR8.2
    statement: "The Unit adds one smoke file."
    category: constraint
    applies_to: "components/patient/search.smoke.test.tsx"
    trigger: "Code Generation"
    logic: "renders SearchResults for a builder VM with a note and two pins; asserts the h1, five tabs, the note and NotVerified in each column of the opened sheet"
    violation: "The cumulative smoke suite must grow per Unit"
    source: "team.md Testing Posture"
  - id: BR8.3
    statement: "The Unit passes the eleven-step pnpm check, pnpm smoke, impeccable detect, contrast:patient and CI on the Bolt head, and records a Lighthouse run for /en and /bn search."
    category: constraint
    applies_to: "Build and Test"
    trigger: "Before merge"
    logic: "pnpm check && pnpm smoke; npx impeccable detect apps/web/src --no-advisory; Lighthouse slow 4G, 4x CPU: LCP <= 2.5 s, INP <= 200 ms, CLS <= 0.1 recorded; a miss is an ISS row"
    violation: "Merge without a green gate breaks team.md Way of Working"
    source: "team.md Way of Working, NFR13, FD-091"
  - id: BR8.4
    statement: "apps/web stays at 80% lines or more with every new file counted."
    category: constraint
    applies_to: "apps/web"
    trigger: "pnpm test:coverage"
    logic: "each new file, the page and the action included, ships with tests"
    violation: "The coverage floor fails pnpm check (D10)"
    source: "team.md Testing Posture, vitest.workspace.ts (T-010)"
  - id: BR8.5
    statement: "Every finding, workaround or assumption gets an ISS row naming U19 and is listed in the Build and Test record."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Any finding"
    logic: "rows of functional-spec.md § 9 plus any found while building"
    violation: "An unrecorded defect"
    source: "project.md Mandated, team.md Way of Working"
```

## Sources

- `docs/implementation/tasks/T-206-search-page.md`; prototype `concept-04b-quiet-clinic-minimal/app.js` (`filterFields`, `renderResults`, `doctorEntry`, `facilityEntry`, `renderTray`, `openCompare`, handlers), `index.html` (`#tray`).
- `requirements.md` FR28–FR35, FR58, NFR4, NFR6–NFR8, NFR13; `stories.md` US5.1, US5.2; `contract-summary.md` C12, C14; `decision-log.md` FD-018, FD-024, FD-035, FD-040, FD-042, FD-084, FD-091, FD-093; `PRODUCT.md`; `project.md`; `team.md`.
- Drafts of T-205 (§ 8, BR5.8, BR6.8, BR7.1, BR8.2), T-202 (BR2.2–BR2.12, BR4.5, BR5.1, `DoctorEntry`, `AccountRow`), T-203 (`FacilityEntry`, `BrowseCard`, BR3.11), T-201 (view models), T-105 (`getConfig()`, `featureVisibility`, R1, R2), T-207 (`SearchBox` use), T-011's record.
- `apps/web/src/app/pages.test.tsx`, `components/shared/Sheet.tsx`, `components/patient/motion/Reveal.tsx`, `styles/motion.css`, `eslint.boundaries.mjs`, `packages/contracts/src/{config-values,enums}.ts`, `packages/i18n/messages/*.json`.
