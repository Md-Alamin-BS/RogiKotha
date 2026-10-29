# Functional Design — questions (U20 `t-207-discover-emergency-about`)

Draft written ahead of the stage while another Unit builds (U3 T-010, branch `bolt/t-010-boundary-lint-and-ci`, 2026-10-28). The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-207-discover-emergency-about/functional-design/`.

**Refreshed 2026-10-29** on `main` after T-010's merge (`14c21a9`), against the refreshed T-201, T-203 and T-011 drafts, the T-105 draft and the owner's answers. Question 1 carries the owner's answer (A); Questions 3, 4 and 7 are annotated where an upstream refresh or T-010 changed their detail; the facts and the settled lists gain what T-010 and the refreshed drafts changed. Decisions taken in this refresh are marked "decided by the agent under the owner's no-questions instruction of 2026-10-29". `functional-spec.md` "Refreshed 2026-10-29" lists every change.

Context:
- Unit U20 (kind `ui`, size M, not high risk) delivers what is left of T-207 (`docs/implementation/tasks/T-207-discover-emergency-about.md`, with its FD-091 amendment) for stories US12.1, US5.1 and US4.3. `unit-of-work.md` says: "Half B only (Discover home); Half A is merged. Carries ISS-151, ISS-152, ISS-120." Bolt 26 in `bolt-plan.md` ("the front door works"; checkpoint `/en`, `/bn`), after U27 T-307 (Bolt 22) and U19 T-206 (Bolt 25). Depends on U15 T-202, U16 T-203, U19 T-206, U14 T-201, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`). U40 T-501 (PWA) and U42 T-503 build on it.
- Half A (T-207a: Emergency, About, Terms, Privacy) is on `main` (`docs/implementation/handoffs/T-207a.md`), with CR-005's follow-up on the Emergency page. This design covers the Discover home, the FD-091 pass over the four Half A pages, and the three carried rows.
- Inputs read: `unit-of-work.md` (U20), `unit-of-work-story-map.md`, `requirements.md` (FR24, FR25, FR28, FR34, FR76, FR91, FR92, FR95, FR100, NFR1, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC12.1.1–AC12.1.6, AC5.1.1–AC5.1.6, AC4.3.1–AC4.3.5, and AC2.4.3, AC2.4.4, AC2.4.6, which the task's acceptance rows name), `contract-summary.md` (C6, C7; UI-to-UI edges carry no runtime contract), `docs/status/decision-log.md` (FD-008, FD-022, FD-024, FD-032, FD-042, FD-044, FD-046, FD-089, FD-091, FD-093), `PRODUCT.md` hard rules as affirmed in `project.md`, `01-conventions.md` §3 and §6–§14, `03-routes-and-contracts.md` §1 and §4, `05-demo-storyboard.md` Part 1 step 1, and `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` (owner answers: counts with denominators only, no percentages; the nine-criteria model for facilities; each branch's own hospital name stored).
- Upstream drafts read as inputs: `design-drafts/t-202-doctor-index-and-profile/` (the shared primitives this Unit imports: `EmergencyPanel`, `AccountRow`, `MiniList`/`MiniRow`, `Avatar`; its count-phrase keys; Question 1 is the owner's answer B, no percentages), `design-drafts/t-203-facility-and-condition-pages/` (`BrowseCard`, `facilityLabel`, its Question 13 on the emergency body, its finding F1 on the seed's condition tags), `design-drafts/t-105-runtime-configuration/` (the parameterised `emergency.body`, the live Emergency page, the configuration fallback), `design-drafts/t-011-patient-design-and-motion-system/` (tokens, `RouteTransition` in the layout, the `.reveal` home hook, static groups, `check:motion`; all answered A), and the T-201 draft (queries, view models and seed; first read as committed in `c572927`, now re-read as refreshed on 2026-10-29: its Question 9 C stores each branch's hospital name, label and hue, its Question 11 B seeds the condition links, its Question 13 A adds d11 and r25, its BR2.12 adds `feedbackVisible` to facility cards). `functional-spec.md` § 14 says what changes here if any of them changes.
- T-010 as merged on `main` (`14c21a9`): `eslint.boundaries.mjs` (FD-093), `vitest.workspace.ts` (coverage per package with untested files counted), the nine-step `pnpm check`, CI before merge, `apps/web/src/app/pages.test.tsx` (the route table) and `app/root.test.tsx` (the root 404's structure test).
- Code read on the working tree: `apps/web/src/app/{layout.tsx,page.tsx,not-found.tsx,pages.test.tsx}`, `app/[locale]/layout.tsx`, `app/[locale]/(patient)/{layout.tsx,page.tsx,emergency/page.tsx,about/page.tsx,terms/page.tsx,privacy/page.tsx}`, `components/patient/{Emergency,About,Policy,ViewShell,Colophon}.tsx` and their tests (including `fd-022-lawful-placement.test.tsx` and `fd-022-lawful-key-usage.test.ts`), `lib/{titles,metadata}.ts`, `styles/patient.css`; `packages/i18n/src/{format,keys}.ts`, `package.json`, `messages/{en,bn}.json` (781 keys); `packages/contracts/src/{config-values.ts,view-models/discover.ts}`; `packages/test-support/src/corpus/{conditions,facilities,branches,reviews,facility-reviews}.ts`.
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` (`titleForView` 318, `emergencyPanel` 435, `renderDiscover` 472, `accountRow` 624, `renderEmergency` 2021 with its BMDC comment, `renderAbout` 2067, the `data-q` chip handler 2936, `state.query: 'diabetes'` at line 10) and `index.html` (the empty `#view-discover`, `#view-emergency`, `#view-about` sections). The line numbers in the task's "Read first" predate FD-089 (finding F11).
- Open `ISSUES.md` rows in this area: ISS-120 (the root 404 is English-only with inline styles; owner T-207), ISS-151 (the "Locales" acceptance command selects one Bengali test; owner T-207 Half B), ISS-152 (`/` has no `<h1>`; owner T-207 Half B), ISS-171 (the Emergency page reads the static config default; owner T-105), ISS-137 (the whole dictionary ships to the client; informational), ISS-161 (seeded text stored in Bengali only), ISS-053 (`@/i18n/routing` mocked in component tests). The register ends at ISS-271 on this tree.

## What the code and data show that the task file does not

1. **Half A is built.** `Emergency.tsx`, `About.tsx`, `Policy.tsx` and the four pages are on `main` with their tests and the FD-022 placement tests. What remains on them is FD-091 work (the look from T-011, the layout's route transition), the live configuration read (ISS-171), one inline style and one hard-coded literal (facts 9 and 10).
2. **The step-5 keys already exist.** `discover.kicker`, `discover.editorialNote`, `discover.latest`, `emergency.ambulanceLabel` and `emergency.healthLineLabel` are in both dictionaries, as are `emergency.lastVerifiedLine`, `aboutview.contactBodyProduct` and every `policy.*` key. Discover needs no new key of its own.
3. **`/` renders no `<h1>`** (ISS-152). The prototype opens Discover with `<h1 class="display">hero.title</h1>`; `titleForView('discover')` returns `''`, so `ViewShell` renders no heading.
4. **"First 5 conditions by seed order" cannot be read from the database.** `taxonomy.listConditions()` returns every canonical condition by name in the active language (T-201 WF7); no column holds the prototype's array order. The first five by name differ between `en` and `bn`, and in English they include "Gastric ulcer", which nobody has written about.
5. **The browse grid and the chips depend on the seed's condition tags.** The seed writes each review's tags with free text only and no `term_id` (T-203 finding F1); unless U14 runs its fallback, every condition count is 0, the grid is empty and storyboard step 1 ("browse by condition") fails. *Refresh 2026-10-29: resolved upstream; T-201's Question 11 B seeds one condition term tag per review.*
6. **Every seeded facility is below the limited-data threshold** (1–3 accounts each, threshold 5). The prototype's teaser rows show the bare count.
7. **The facility teaser order cannot match the prototype either.** The prototype shows f1, f2, f3 in array order; `directory.listFacilities({pageSize: 3})` returns the first three by name (T-201 WF5). *Refresh 2026-10-29: with the stored hospital names the English order starts f2 Bandar Diagnostic Centre, f9 Jolrong Diagnostic Centre — Cumilla branch, f7 Kashful Community Hospital — Kazla branch (name, then label).*
8. **The task wraps all five pages in `RouteTransition`**, while T-011 renders one keyed boundary in the patient layout (T-011 Question 4 A). A second boundary gives the document two elements named `page`, and the browser then skips every route transition (T-202 finding F4, T-203 finding F5).
9. **`Emergency.tsx` keeps the prototype's inline `style={{ marginTop: '18px' }}`** on the last-verified note. Under FD-091 the prototype no longer decides the look, so the `01-conventions.md` §7.2 carve-out ("where the prototype itself used them") no longer covers it; T-203 turned every such style into a class.
10. **The BMDC card prints a hard-coded `BMDC`** in `span.num` in both languages (`project.md` Forbidden: no hard-coded user-facing string).
11. **`emergency.body` names 999 and 16263 as fixed copy**, while the numbers are configuration a Super Admin can change (FR100, `ConfigValues.emergency`). Discover's `EmergencyPanel` shows the body and the configured numbers side by side (T-203 Question 13 raised it for U15 and U20; the T-105 draft settles it, see below).
12. **No error boundary exists under `app/`** (`error.tsx`, `global-error.tsx`). If Discover throws because one list query fails, the front door, emergency panel included, becomes Next's default error page.
13. **`packages/contracts/src/view-models/discover.ts` is a stub with `TODO(T-207)`**: `DiscoverVM {featuredConditions, featuredDoctors, featuredFacilities, emergency}` and `EmergencyPanelVM`. Nothing imports either; the prototype's Discover shows no doctors; `EmergencyPanelVM` duplicates `ConfigValues.emergency`.
14. **`app/pages.test.tsx` renders every route page**, including `/`, and expects `ViewShell`'s title semantics for it. Once Discover loads data through the container and brings its own `<h1>`, that test fails unless it mocks the container and marks `/` as owning its heading (a red `pnpm check`).
15. **FD-008 and FD-022 do not say the same thing about Terms.** FD-008: "Explain limits on anonymity against lawful disclosure only in Terms and Conditions." FD-022: "disclosed only in the Privacy Policy/Terms". T-207a put the lawful-access section on Privacy only, and the placement test asserts it is absent from `/terms`. *Refresh 2026-10-29: answered by the owner (Question 1 A).*
16. **`.emerg-card:hover` lifts the emergency card by 2 px** (`patient.css` 1553). T-011 removes the same lift on `.emergency-lines a:hover` but does not list this rule; with T-011's static set the lift happens without a transition, so it is still a jump on emergency guidance. *Refresh 2026-10-29: resolved upstream; T-011's refresh removes all 13 hover lifts, this one included.*
17. **The 404 path is English-only for every unknown or hidden URL** (ISS-120). `notFound()` thrown in a patient page and an unmatched path both reach `app/not-found.tsx`, which renders outside the locale layout with hard-coded copy and inline styles.
18. **`hero.cta` ("Share your experience") and `hero.browse` ("Browse experiences") exist in both dictionaries** but the prototype's `renderDiscover` renders neither; the masthead already has the compose button.
19. **The boundaries lint knows only `packages/i18n/src` as the `i18n` element** (`eslint.boundaries.mjs`); `packages/i18n/messages/*.json` matches no element, and `boundaries/no-unknown-dependencies` with `require: 'element'` refuses a dependency on it. A root fallback that imports the JSON would turn `pnpm lint` red. next-intl 4.14 passes an explicit locale given to `getTranslations({locale})` to the request config as `requestLocale` (`server/react-server/getConfig.js`), so the existing `packages/i18n/src/request.ts` can load either dictionary outside `[locale]`.
20. **`app/root.test.tsx` renders the root 404 with `renderToStaticMarkup` synchronously** and checks its two links (`/en`, `/bn`), the `lang="bn"` paragraph and `<html lang="en">`; an async component needs the test to await it.
21. **Tests in `apps/web` may not import `@rogikotha/test-support`** (FD-040, FD-093 (5)); a `*-test-support.ts` file is a test file for the lint and is excluded from coverage. **Coverage counts every file under `apps/web/src`**, `page.tsx` and `not-found.tsx` included, at 0% when no test loads it.
22. **`app/pages.test.tsx` has no way to render a page that calls `notFound()`**: every row is rendered and must show a view section, so the catch-all cannot be a row.
23. **T-202's draft lists `MiniRow`'s `sub` without a type**, while the teaser's sub-line ends with a `Badge`.

## Settled before this stage

Decided by FD entries, owner answers, the contracts or the upstream designs; not asked again.

- **The look follows T-011 (FD-091)**; the prototype is the source of truth for content, data, structure and behaviour. Page styles go in T-207's own section of `patient.css`, each rule marked `/* added: T-207 <reason> */`, with T-011 tokens (spacing from `--space-*`, hit areas from `--target`, focus from `--focus-ring`) and class names only. No edit to `tokens.css`, `motion.css`, T-011's token block at the top of `patient.css` or the shell styles; a missing token is asked for through an `ISSUES.md` row. T-011 applies the `.opener` wash, removes every hover lift (`.emerg-card:hover` included) and gives `.chip`, `.browse-card` and `.mini-row` press feedback; no morph (T-011 Question 10 A).
- **The lawful-access section is on both Terms and Privacy** (the owner's answer to Question 1, 2026-10-29); an FD entry reads FD-008 and FD-022 together before code (`functional-spec.md` § 17).
- **The import boundaries, coverage floor and gate are T-010's** (FD-093 and D10, as merged): components import only `contracts`, `i18n`, `web-shared`, server actions and components; nothing in `apps/*` imports `test-support`; 80% lines per package with untested files counted; `pnpm check` with `format:check` and `check:identity`; CI green on the Bolt head before the merge.
- **No percentages anywhere** (the owner's answer to T-202 Question 1). Discover shows counts only.
- **Facilities follow the nine-criteria model and each branch's own hospital name** (the owner's answers to T-203 Question 1 and finding F2). The teaser takes its row title from T-203's `facilityLabel`, whatever name U14 stores.
- **The data comes from T-201's queries and view models**: `taxonomy.listConditions()` (`ConditionCardVM {publicId, name, accountsTotal}`), `directory.listFacilities({page: 1, pageSize: 3})` (`FacilityCardVM` with the branch's own hospital name, its label and `feedbackVisible`), `review.listExperienceCards({limit: 4})` (`ExperienceCardVM`, newest first); the seed links each review to its condition term. Emergency numbers come from `(await getConfig()).emergency`, which U12 T-105 makes live before Bolt 26 and which never throws (last good values, then defaults); the threshold range is 2–50 (the owner's answer to T-105 R2).
- **The shared primitives are T-202's and T-203's**, with their answered behaviour: `EmergencyPanel` (full form, `data-static="emergency"`), `AccountRow`, `MiniList`/`MiniRow`, `Avatar` seeded by public id, `BrowseCard`, `facilityLabel`, the count-phrase key `sentiment.totalAccounts` (T-202 Question 5 A), zero accounts said in words (T-203 Question 6 A).
- **`SearchBox` is T-206's** (`variant="hero"`, GET to `/search`, its own `search.banglish` note and suggestions). Discover mounts it with an empty `initialQuery` (the task drops the prototype's `'diabetes'` prefill).
- **The FD-022 sentence never appears outside the legal pages and never as a banner.** Where exactly it sits on those pages is Question 1 (now the owner's answer: both pages).
- **The emergency numbers are live everywhere they are written** (U12 T-105 draft, its Question 5 A and finding F2): `emergency.body` gains `{ambulance}` and `{healthLine}`, and the caller passes the configured numbers through `formatDigits`; with the default numbers the sentence reads as today. T-105 also switches the Emergency page to the live configuration (its BR9.3, closing ISS-171), and its provider falls back to the last good values, then the defaults, when the database read fails (its BR4.5). This Unit checks both on Discover and on `/emergency` and makes the change itself only if a dependency merged without it.
- **No new dependency.** Next 16.3.4, React 19.3.0, next-intl 4.14 and the T-011 components cover everything; no dependency-check entry is needed unless Code Generation finds otherwise.

## Settled in this design without a question

These follow from the conventions, the upstream designs or the code; `functional-spec.md` § 13 explains each.

- **No page wraps itself in `RouteTransition`** (fact 8); the layout's one boundary covers all five pages. The task's step 7 is read as "these pages get the layout's route transition". If T-011 fell back to per-page wrappers, each page wraps itself once.
- **Discover owns its `<h1>`**: `ViewShell(view="discover", title="")`, and the opener renders `h1.display` with `hero.title` (fact 3; closes ISS-152).
- **The Emergency page reads the live configuration**: `(await getConfig()).emergency` replaces `DEFAULT_CONFIG_VALUES.emergency`; the T-105 draft makes this switch and closes ISS-171, and this Unit makes it only if T-105 merged without it. `page.parity.test.ts` keeps guarding the default's values.
- **The Emergency note's inline margin becomes a T-207 class** (`.emerg-note`, fact 9).
- **Half A markup stays as built.** About, Terms and Privacy change only through T-011's restyle and the layout's route transition; they get no reveal (reading pages, the prototype has none).
- **Metadata on all five pages**: titles as today (`documentTitle`), plus canonical `/{locale}{path}` and `en`/`bn` alternates through the metadata helper T-202 adds; all five are indexable.
- **Zero cases are said in words or left out**: a condition with no accounts is not in the grid (the prototype filters it) or among the chips; a teaser facility with no accounts reads `index.emptyTopic`; a section whose list is empty is left out with its heading (T-203 D8).
- **Count phrases use parameter keys**: `sentiment.totalAccounts` with `{count}` (formatted) and `{n}` (plural selector) for browse cards and teaser rows; no `{n} sentiment.accounts` concatenation.
- **How-it-works figures** "01"–"03" go through `formatDigits` (keeps the leading zero; Bengali digits under `bn`).
- **The editorial note is a static group**: `aside.margin-note[data-static="disclaimer"]` (T-011 BR7.2), so the route transition never fades the disclaimer. Discover has exactly one `disclaimer` and one `emergency` static name.
- **Lists are lists**: chips `ul.chips > li > a.chip`, browse `ul.browse-grid > li > BrowseCard`, how-it-works `ol.how-list`, teaser `MiniList`. T-207 adds the list resets.
- **The FD-022 rendered test gains the Discover home**; the doctor, experience and composer pages are covered by the existing source-level key scan (`fd-022-lawful-key-usage.test.ts`), which fails the day any file outside `Policy.tsx` references the keys.
- **ISS-151 is closed by test naming**: every Half A and Discover component test runs inside `describe.each(['en', 'bn'])`, so `-t "bn"` selects the whole Bengali set; the acceptance row's command stays as written.
- **`app/pages.test.tsx` is updated** (fact 14): `/` is marked `ownsHeading` and the container is mocked with builder data. A recorded owned-path addition.
- **The home page is the same for every visitor** apart from T-008's masthead, so T-501 can keep `/en` and `/bn` in its shell cache without caching anything personal.
- **The Discover data loads in parallel, once per request**, and nothing is cached between requests (counts and the latest accounts change as people write).
- **The root fallback reads its two lines through next-intl** (`getTranslations({locale: 'en'})` and `({locale: 'bn'})` in an async server component), not through a JSON import or a new package export (fact 19); `app/root.test.tsx` awaits it (fact 20). Decided by the agent under the owner's no-questions instruction of 2026-10-29.
- **Test builders are web-local** (`components/patient/discover-test-support.ts`, or T-202's or T-203's file if one exists), and every new file has a test: the Discover page's failure handling, `NotFoundView`, the patient 404, the catch-all and the root fallback (fact 21). The catch-all is not a row of `pages.test.tsx` (fact 22). Decided by the agent under the owner's no-questions instruction of 2026-10-29.
- **`MiniRow`'s `sub` takes a node** so the teaser's "Limited data" tag sits in it (fact 23); asked of U15 first and widened additively here if T-202 merged without it. Decided by the agent under the owner's no-questions instruction of 2026-10-29.
- **Teaser rows with facility feedback hidden show type and place only** (T-201 BR2.12 leaves the count and the flag out), as T-203's cards do.

## Question 1 — answered by the owner

FD-008 says the limits on anonymity against lawful disclosure are explained "only in Terms and Conditions"; FD-022 says the staff identity-access capability is disclosed "only in the Privacy Policy/Terms" (fact 15). T-207a built the lawful-access section (`policy.privacy.lawful`, `policy.privacy.lawfulBody`) on `/privacy` only, and its tests assert that `/terms` does not contain it. Where does the explanation sit?

Why this needs the owner: both entries are founder decisions, and they name different documents; any answer either changes what the Terms page says or narrows FD-008's wording, which needs a new FD entry. Counsel review of the legal copy stays a release gate either way.

A. **The same section on both legal pages** (recommended). Terms gains the existing lawful-access section as its last section, with the same keys; Privacy keeps it. Both decisions are met word for word, no new copy is needed, and the rule stays "only on the legal pages, never a banner". The placement test changes to "present on `/terms` and `/privacy`, absent everywhere else", and the source-level scan allows `Policy.tsx` as before.
B. **Privacy only, as built, with a new FD entry** stating that FD-008's "Terms and Conditions" is met by the Privacy policy, which the registration form links next to Terms. No code change.
C. **A pointer on Terms**: a short Terms section "Anonymous accounts and lawful requests" whose body says the details are in the Privacy policy, with a link to `/privacy`. Two new keys (Bengali flagged); the sentence itself stays on Privacy only.
X. Other (please specify)

[Answer]: A (the owner's answer, 2026-10-29: the same lawful-access section on both Terms and Privacy; a new FD entry settles FD-008 against FD-022)

## Question 2

Which five conditions are the **chips** under the hero search, and in what order do the chips, the browse grid and the facility teaser appear? The prototype takes the first five conditions and the first three facilities in its array order (facts 4 and 7), which the database does not hold. The hard rule allows relevance, most accounts or most recent.

A. **Chips: the five conditions with the most eligible accounts, ties broken by name in the active language; grid and teaser: the queries' own order** (recommended). The page sorts `listConditions()`'s result by `accountsTotal` descending, then name, and takes five with `accountsTotal > 0`; the grid keeps the query's alphabetical order (the same as `/topics`), and the teaser shows the first three of the facility index. On the seed (once the condition tags exist) the chips are the same five topics in both languages: Type 2 diabetes (5), Asthma (4), and High blood pressure, Migraine and Typhoid fever (3 each). The orders that differ from the prototype are recorded for the visual check.
B. **Chips: the first five of the alphabetical list.** Different topics per language, and topics nobody wrote about can appear (Gastric ulcer in English).
C. **Chips: the first five suggested terms** (`taxonomy.listSuggested({group: 'condition'})`, by `suggested_order`, T-201 Question 4). Staff-curated, but the suggestion list is built for the composer and can include topics with no accounts.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Every seeded facility has 1–3 accounts (fact 6), below the threshold of 5. The teaser rows show a count ("2 patient experiences") but no distribution; the browse cards show a count per condition. Which marks do the teaser rows and browse cards carry?

A. **Teaser rows: the short "Limited data" tag when `accountsLimitedData`, and words instead of a zero count; no "Not verified" badge. Browse cards: the count only, as on `/topics`** (recommended). The tag keeps the hard rule's sparse-sample mark next to the facility figure the row shows (`FacilityCardVM` carries the flag, as T-203's cards do). "Not verified" stays on the branch page and the facility index cards (T-203 Question 2 A): a teaser row is a link to the profile, like the facility rows on a doctor's profile, and a fourth item would wrap the row twice at 360 px. Browse cards use T-203's `BrowseCard` exactly as the topic index does; `ConditionCardVM` has no limited flag and the condition page carries the mark.
B. **Both marks on teaser rows** ("Limited data" and "Not verified"); browse cards as in A. More complete on the home page, longer rows on phones.
C. **The prototype as is**: bare counts everywhere, no tag.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

*Refresh 2026-10-29:* with facility feedback hidden, T-201 BR2.12 leaves the count and the flag out of `FacilityCardVM`, so such a row shows type and place only and no tag. The row title is `facilityLabel(card)` with the stored hospital name; like the prototype's teaser it carries no "Part of" badge.

## Question 4

How does the home page **move**? The task asks for T-011's scroll reveals on the browse grid, the facilities teaser, the how-it-works list and the latest list, "stagger capped at 6 items"; T-011 gives two primitives: the scroll-driven `.reveal` hook for home sections after the first (T-011 BR6.6) and the time-based `Reveal` stagger list (T-011 BR6.2). The prototype puts `.reveal` on each how-it-works step.

A. **Scroll reveal per item where Discover owns the markup, per block where it does not** (recommended): each browse card (`li.reveal`), each how-it-works step (`li.reveal`, as in the prototype) and each latest account (`div.reveal` around `AccountRow`) fades and rises as it scrolls in; the facilities panel reveals as one block, because its rows are T-202's `MiniRow` with no class hook. Headings and notes stay still. On wide screens the cards of one row enter together, which reads as a gentle wave. No time-based `Reveal` on this page, so nothing gets two entry animations; T-011's 6-item cap applies to `Reveal` lists only.
B. **Scroll reveal per section only**: the four blocks (heading, note and list together) each reveal once. Calmer, fewer moving parts, closest to T-011's wording.
C. **Section reveals plus `Reveal` staggers** on the grid and the latest list. The two primitives overlap on the same elements (opacity and transform twice), which T-011's rules do not cover.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

*Refresh 2026-10-29:* T-011's refreshed draft keeps `.reveal` as a class hook "on a home section after the first" (its § 5.4, BR6.6), styled in `motion.css` inside `@supports (animation-timeline: view())`; the hook works on any element below the first section, so the per-item use stays within it. Nothing in the opener carries it, and T-207's CSS adds no rule for it.

## Question 5

What happens when **one of Discover's list queries fails** (database timeout, a programming error in one query)? Other pages throw a failed result to Next's error boundary; no `error.tsx` exists (fact 12), so the home page and its emergency panel would be replaced by the default error page.

A. **Leave out only the failed section and log it** (recommended). The page loads the three lists and the configuration in parallel; a failed list result is logged through the logger port (`event: discover.section_unavailable`, the section name and the correlation id, nothing else) and its section is left out, heading included; the opener, the search box and the emergency panel always render. The configuration needs no such rule: T-105's provider already falls back to the last good values, then the defaults, when the database read fails (T-105 BR4.5); an exception from it is a programming error and throws. The error is surfaced in the log, not silent, and the person still reaches search and emergency help.
B. **Throw to the error boundary**, as the other pages do. One rule everywhere; the front door can go blank with its emergency guidance.
C. **B plus a patient `error.tsx`** in this Unit that keeps the chrome and shows the emergency link. A new shared boundary that every patient page would inherit, which is wider than this Unit.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

What happens to the **`DiscoverVM` stub** (`contracts/src/view-models/discover.ts`, `TODO(T-207)`, fact 13)?

A. **Remove the stub and compose the page from the existing queries** (recommended). `DiscoverVM` and `EmergencyPanelVM` are deleted with their barrel export; the page reads `ConditionCardVM`, `FacilityCardVM`, `ExperienceCardVM` and `ConfigValues.emergency`, which already exist. `03-routes-and-contracts.md` §4 drops `DiscoverVM` from its list. No query is added, and no `TODO(T-207)` outlives the Unit. A recorded owned-path change in `packages/contracts` (nothing imports the stub).
B. **Fill the stub**: an application query `discover.getHome` that returns one `DiscoverVM` (one call from the page). A new query and contract for data the page can already read; `featuredDoctors` has no prototype counterpart.
C. **Leave the stub** and rewrite its TODO to name a later Unit. Dead code in the contracts package.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

ISS-120 (carried by this Unit): every unknown path and every `notFound()` in a patient page renders the root `app/not-found.tsx`: English `<html lang>`, hard-coded copy, inline styles, no chrome (fact 17). How is it fixed?

A. **A localized patient 404 plus a catch-all, and a bare root fallback** (recommended): `app/[locale]/(patient)/not-found.tsx` renders inside the patient layout (masthead, demo marker, colophon) with `ViewShell(view="not-found")`, `h1` `errors.common.notFound`, a body line and two links (home, emergency help); `app/[locale]/(patient)/[...rest]/page.tsx` calls `notFound()` so unmatched patient URLs reach it with status 404. The root file stays the last resort for paths outside any locale, reads its two lines from the dictionaries (no hard-coded copy) and drops its inline styles. New keys `notFound.body` and `notFound.home` (Bengali flagged). Unknown `/{locale}/admin/*` paths would also reach the patient catch-all; a row asks U35 T-406 for a staff catch-all.
B. **The localized `not-found.tsx` only**, no catch-all: hidden or missing records get the localized page, unmatched URLs keep the root page.
C. **Leave ISS-120 for U42 T-503**, which tests parity and accessibility across the app.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

*Refresh 2026-10-29:* the root file "reads its two lines from the dictionaries" through `getTranslations({locale})` for each language, not through a JSON import, which T-010's boundaries lint refuses (fact 19, finding F18); `app/root.test.tsx` awaits the now async component (fact 20). Decided by the agent under the owner's no-questions instruction of 2026-10-29.

## Question 8

The BMDC card on `/emergency` prints the literal `BMDC` (fact 10). Is it a message key?

A. **A key with the same text in both languages**: `emergview.bmdcShort` "BMDC" / "BMDC" (recommended). It keeps the no-hard-coded-string rule, shows exactly what the prototype shows, and lets the Bengali reviewer (FD-042) choose "বিএমডিসি" later without a code change.
B. **Keep the literal** as an organisation's acronym, like the brand. One exception to the rule, recorded.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

`hero.cta` ("Share your experience") and `hero.browse` ("Browse experiences") are in the dictionaries but not on the prototype's Discover (fact 18). Does the hero get call-to-action buttons?

A. **No: the prototype's opener as is** (recommended). The masthead's "Share your experience" button is on every page, the search box is the hero's one action, and the browse grid sits two blocks below. The keys stay unused.
B. **Two buttons under the lede** (primary `hero.cta` to `/write`, ghost `hero.browse` to `/experiences`). A friendlier start, but a second write button on the same screen, a structural change from the prototype, and the buttons push the search box down on phones.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Assumptions & Open Questions

- Question 1 is answered by the owner (A, 2026-10-29): the lawful-access section is on both Terms and Privacy. The design builds it, and the FD entry of `functional-spec.md` § 17 reads FD-008 and FD-022 together before code.
- U14 T-201 merges with the condition tags, the stored branch names and hues, `feedbackVisible` on facility cards, and d11 and r25, as its refreshed draft describes (its Questions 9 C, 11 B, 12 A and 13 A, BR2.12); the seed checks run after `pnpm demo:reset`.
- U12 T-105 merges with `getConfig()` (never throws), the parameterised `emergency.body` and the live Emergency page; if it left the Emergency page on the default, this Unit switches it (BR1.5).
- U15 T-202, U16 T-203, U19 T-206 and U45 T-011 merge with the contracts their drafts describe; where a shape differs (for example `MiniRow`'s `sub`), Code Generation adapts the wiring additively and records the difference, the rules stay.
- next-intl 4.14 gives an explicit locale to the request config outside `[locale]` (read from its `getConfig.js`); Code Generation confirms it with the async root fallback and `pnpm build`, and otherwise takes `functional-spec.md` § 14's fallback.
