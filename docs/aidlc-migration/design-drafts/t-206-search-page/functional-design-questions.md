# Functional Design — questions (U19 `t-206-search-page`)

Draft written ahead of the stage while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-206-search-page/functional-design/`.

Written 2026-10-29 against `main` at `9cf860a`; **refreshed the same day** against the U18 T-205 draft (now written), the T-105 draft (`featureVisibility.compareTray`, release-1 settings) and T-010 as merged. Questions 1–15, every one answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when this draft is finalised. Questions 1–5, 8 and 15 change requirement scope or contract C12, so one FD entry records them (`functional-spec.md` § 17). Q2, Q3, Q4 and Q8 were reworded in the refresh to T-205's names and data (claimed status and provenance are now stored by T-205, so Q3 A includes them); their answers stay A. Q14 and Q15 are new.

Context:
- Unit U19 (kind `ui`, size L, not high risk) delivers T-206 (`docs/implementation/tasks/T-206-search-page.md`, with its FD-091 amendment) for US5.1 and US5.2. Bolt 25. Depends on U18 T-205, U15 T-202, U16 T-203, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`); U20 T-207 depends on it for `SearchBox`.
- Inputs read: `unit-of-work.md` (U19), `unit-of-work-story-map.md`, `requirements.md` (FR28–FR35, FR58, NFR4, NFR6–NFR8, NFR13), `stories.md` (AC5.1.1–AC5.1.6, AC5.2.1–AC5.2.6), `contract-summary.md` (C12, C14), `decision-log.md` (to FD-094), `PRODUCT.md`, `01-conventions.md`, `03-routes-and-contracts.md` § 1, the prototype, `ISSUES.md` (no open row names this Unit), the owner queue.
- Upstream drafts read: T-205 (§ 8 contracts), T-202, T-203, T-201, T-105, T-207 and T-011's record.

## What the code and data show that the task file does not

1. **The requirements ask for more than the prototype.** FR30 names five tabs, FR32 four sorts, FR31 and FR58 more filters (type, condition, symptom, treatment, medicine, language, five evidence values, claimed status, provenance). All are Must and "In". The task builds two tabs, three sorts and five filters, and T-205's draft leaves the rest to "a UI follow-up for T-206 and T-505", but T-505 is a validation Unit.
2. **`SearchQueryInput.q` is `min(1)`** on `main`: the browse page would fail validation (T-205 § 8 fixes it).
3. **`router.replace` per pin** (task step 6) is a server navigation: each pin would re-run the search.
4. **No query lists specialties, cities, languages or terms.** T-201 has none, and T-205's F16 confirms there is no city list.
5. **`results.count` is "doctors match"** on every tab, and "1 doctors match" in English.
6. **The prototype's rail is identical on the facility tab**, where four of five fields do nothing.
7. **The press list has `.seg button`**; accessible tabs are links.
8. **The results page has no search box** in the prototype, while AC5.1.3 speaks of the query staying "in the search box".
9. **`featureVisibility.compareTray`** is on `main` (`config-values.ts`) and T-105's draft says U19 reads it; the task never mentions it.
10. **FR30 says result-card fields are "dynamically configurable"**; no setting exists, and the owner narrowed the release-1 settings (T-105 R1).
11. **The route-table row** renders the page with no `searchParams` and no container, and expects `h1` "Results" and no `robots`.

## Settled before this stage

- The look follows T-011, with page rules in T-206's own section of `patient.css`, marked `/* added: T-206 … */`; no edit of `tokens.css` or `motion.css` (FD-091 amendment).
- Ranking, filter semantics, the resolved note, Did you mean and suggestions are T-205's; the page renders the VM in its order.
- The cards and primitives are T-202's and T-203's.
- Counts with denominators only, no percentage (owner); "Former member" (owner, T-104 Q15); each branch's own hospital name (owner, T-201/T-203); threshold 2–50 (owner, T-105 R2); release-1 settings narrowed (owner, T-105 R1).
- T-010's boundaries, the 80% line floor with untested files counted, `format:check`, `check:identity`, CI before merge; T-011's eleven-step gate. No new dependency.

## Settled in this design without a question

- **Tabs are links with `aria-current`** and `data-press`, not buttons with `aria-pressed` (valid ARIA, works without script).
- **One GET form `#search-state`** carries the hidden state; the selects join it through the `form` attribute.
- **`SearchLink`** (client) adds the live compare list to every in-page link.
- **`ResultsAnnouncer`** speaks the count once per in-page change (CR-004's single live region).
- **No page-level `RouteTransition`**; `Reveal` keyed by the results key.
- **Compare cards through a server action** (`getCompareCards`, ≤ 3 `getDoctor` reads), seeded by the server's validated pins.
- **The `q` cut at 200 code points**, never dropped. **The keep-original link is built from the page's state** (T-205's `keepOriginalUrl` would drop filters and pins).
- **On the facilities tab with facility feedback hidden** the sort menu offers relevance and alphabetical only (T-205 BR5.8 makes the other two act as relevance).

## Question 1 — which result tabs the page renders

FR30 lists All, Doctors, Facilities, Conditions/Tags and Reviews; the VM counts all four kinds and T-205 serves the All tab in one call; T-202 and T-203 ship the cards.

A. **Five tabs in FR30's order, Doctors the default** (recommended): All shows up to three per kind with "Show all {n}" links; Health topics lists `BrowseCard`s; Experiences lists `AccountRow`s. The prototype's first screen stays.
B. **The prototype's two tabs.** FR30 and AC5.1.1 need an FD narrowing, and the conditions and reviews search T-205 builds would have no page.
C. **Five tabs with All as the default.** Common on search sites, but it changes the prototype's first screen and where the note's doctor constraint shows.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2 — the sort options

AC5.2.2: "only relevance (default), newest, most reviewed and alphabetical are offered". T-205 serves `relevance|volume|recent|alphabetical`.

A. **Four options: the prototype's three plus "Alphabetical"** (recommended). Neutral by construction; T-205's ORDER BY guard covers it.
B. **Keep three.** FR32 and AC5.2.2 need an FD narrowing, and a sort T-205 builds goes unused.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3 — which filters each tab shows

FR31 and AC5.2.4 list specialty, location, language, sentiment, outcome, claimed status, provenance, evidence (five FR58 values), type, condition, symptom, treatment, medicine, gender, and fee or schedule "when available". T-205 stores claimed status and provenance and applies different filters per tab (its BR7.1).

A. **A rail per tab with what Search applies** (recommended): doctors — the prototype's five, then one topic field (condition, symptom, treatment or medicine, grouped), consultation language, documents (has / none), claimed status, information source; facilities — location, type, claimed status, information source; experiences — topic, sentiment, outcome and the five document-presence values; Health topics and All — no rail. Claimed status sits beside "Claiming a profile does not verify registration". Fee and schedule are not offered (no structured data, FR31's "when available").
B. **The prototype's five fields on every rail.** Four fields do nothing on facilities; FR31 and FR58 need a wider FD narrowing.
C. **Option A without claimed status and provenance.** Less on the rail, but FR31 needs a narrowing for two filters T-205 already builds.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4 — where the filter options come from

The options must list only values that can match published records. The task names `taxonomy.listTerms` and `directory.listCities()`; neither is a query.

A. **A new C12 query `search.filterOptions({tab, locale})`** (recommended), built by T-205 from published search documents (specialties, cities, consultation languages, terms by kind), alphabetical in the active language. One read, Search-owned, never lists a value that matches nothing.
B. **Derive in the page** from `directory.listDoctors({pageSize: 100})`. No contract change, but capped at 100 doctors, no facility cities, no terms.
C. **T-201 adds `listSpecialties` and `listCities`.** Reopens a Unit ahead in the order; still no terms or languages.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5 — a search box on the results page

AC5.1.3: the query "stays exactly as typed in the search box". The prototype's results view has no box.

A. **An inline `SearchBox` in the results head, prefilled with `q` exactly as typed** (recommended), keeping the tab and the pins on submit; the same component T-207 mounts.
B. **No box**, as the prototype: the heading alone echoes the query.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6 — how a pin updates the URL

A. **`window.history.replaceState`** (recommended): Next 16 keeps `useSearchParams` in step; no request, no repeated search, no list re-entry.
B. **`router.replace`** as written: every pin re-runs `search.query` and re-renders the list.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7 — compare without script

A. **Compare is a script feature** (recommended), as in the prototype: pin buttons render invisible but holding their space until hydration (no shift, no dead button); tray and sheet render on the client. The rest of the page works without script.
B. **Progressive pins**: pin, ✕ and Clear as GET-form buttons with a server-rendered tray; the sheet still needs script. Heavier markup for a feature the prototype never offered without script.
C. **Render pins only after mount.** Simple, but the entries shift when the buttons appear (CLS).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8 — how "Did you mean" items behave

AC5.1.3: an ambiguous Banglish query shows "Did you mean" suggestions without replacing the query. T-205 returns up to three `didYouMean` items when nothing resolved.

A. **Links that search each item's name normally** (recommended): a name search resolves as an exact condition and shows its note, so the reader lands on the constrained list and nothing is replaced silently.
B. **Links that search the name with `exact=1`**: no condition constraint, only text matches.
C. **Links straight to each topic page.** Leaves search; the reader loses the tab and the pins.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9 — the count copy per tab

A. **One key per tab with a plural** (`results.countDoctors`, `…Facilities`, `…Conditions`, `…Reviews`, `…All`) (recommended).
B. **The prototype's `results.count`** on every tab ("1 doctors match", "doctors match" on facilities).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10 — results beyond one page

T-205 pages at 20; the seed has 25 experiences. The prototype shows every result.

A. **A pager** (recommended): "{from}–{to} of {total}" with previous and next links, only past one page; plain links.
B. **`pageSize` 50 and no pager**: fine on the seed, silently cut on real volume.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11 — which search URLs are indexable

A. **Indexable only as the canonical browse page** (no `q`, default tab and sort, no filter, page 1; `compare` ignored); every other state `{index: false}` (recommended).
B. **The task's rule**: any URL without `q` is indexable, filtered and paged ones included (many near-duplicate URLs).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12 — what "Clear all" keeps

A. **Keep `q`, tab, sort, `exact` and the pins; drop filters and page** (recommended; the prototype's behaviour).
B. **The task's link** (`/search?q=&tab=`): the sort resets too.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13 — where the tray lives

The prototype's `#tray` sits after `main`, fixed at the bottom, and can cover the colophon's disclaimer; page content sits inside `.page-frame` (`view-transition-name: page`).

A. **A portal into `document.body`, with a spacer reserving the tray's height while it shows** (recommended): outside the route-transition snapshot, and the disclaimer is never covered.
B. **Inside the page**, verified in Build and Test; fixed positioning during a transition is unproven and the disclaimer can be covered.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14 — what `featureVisibility.compareTray = false` hides

T-105 keeps this setting in release 1 and says U19 reads it ("hides the compare tray").

A. **The whole compare feature** (recommended): no pin buttons, no tray, no sheet; the `compare` parameter is dropped and the action refuses. Nothing is left that does nothing.
B. **Only the tray**: pin buttons stay but their pins can never be seen or compared.
C. **Ignore the setting** in this Unit: the Super Admin's switch has no effect (FR100, FD-018).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15 — FR30's "dynamically configurable" result-card fields

No setting holds card fields, T-105's release-1 `ConfigValues` has none, and the owner chose to build only the settings the demo uses (T-105 R1).

A. **Fixed default cards in release 1** (recommended): the cards show FR30's default fields (identity, type or specialty, location, verification and provenance mark, condition match, review summary); configurable card fields move to release 2 with the other unbuilt settings, recorded in this Unit's FD entry. Nothing half-built.
B. **Add a `searchCards` block to `ConfigValues`** now: reopens U12's schema and U37's admin screen for a setting no demo step uses.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Raised for the owner, not decided in this stage

None. Every open point is decided under the no-questions instruction; the FD entry of `functional-spec.md` § 17 records the ones that change requirement scope or contract C12.
