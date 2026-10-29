# Business rules — U20 `t-207-discover-emergency-about`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U20), `unit-of-work-story-map.md` (US12.1, US5.1, US4.3), `requirements.md` (FR24, FR25, FR28, FR34, FR76, FR91, FR92, FR95, FR100, NFR1, NFR4, NFR6, NFR7, NFR13), `stories.md` (and AC2.4.3, AC2.4.4, AC2.4.6, which the task's acceptance rows name), `contract-summary.md` (C6, C7), T-207 with its FD-091 amendment and the T-207a hand-off, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §3 and §6–§14, and the upstream drafts (`t-202-doctor-index-and-profile`, `t-203-facility-and-condition-pages`, `t-011-patient-design-and-motion-system`, and T-201 as committed in `c572927`). The workflows that apply these rules are in `functional-spec.md`, the component contracts in `frontend-components.md`, and the data shapes in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 2–9 are answered A on the owner's standing instruction and await confirmation; **Question 1 needs the owner** and only BR2.9 and BR3.10 depend on it. "T-202 Qn" and "T-203 Qn" name questions of those drafts whose answers these pages inherit.

```yaml
rules:
  # 1. Data, loading, metadata and the 404 path
  - id: BR1.1
    statement: "Pages read conditions, facilities, experiences and settings only through the queries wired in the web composition root; components receive view models and plain values as props and never import database, adapters, test-support, server/container or node: modules."
    category: constraint
    applies_to: "(patient)/page.tsx, emergency/page.tsx, every component in the owned paths"
    trigger: "Any data a page renders"
    logic: "page -> container -> taxonomy.listConditions | directory.listFacilities({page: 1, pageSize: 3}) | review.listExperienceCards({limit: 4}) | config.current() -> view models -> components; a component import of @rogikotha/database, @rogikotha/adapters, @rogikotha/test-support, server/container or node:* is forbidden"
    violation: "A boundary import fails T-010's boundaries lint (FD-093) and the reviewer's diff check"
    source: "01-conventions.md §2 and §8, FD-093, team.md Code Style (Boundaries), C6, C7"
  - id: BR1.2
    statement: "The Discover page starts its three list queries and the configuration read together, once per request, renders per request, and caches nothing between requests."
    category: constraint
    applies_to: "(patient)/page.tsx"
    trigger: "Every request to /{locale}"
    logic: "await all of [listConditions, listFacilities, listExperienceCards, config.current] in parallel; no revalidate, no unstable_cache, no module-level memo"
    violation: "A stale count or a missing new account on the front door; four sequential round trips delay LCP"
    source: "AC2.4.6 (LCP), NFR1, T-203 BR1.6"
  - id: BR1.3
    statement: "A failed list query leaves out only its own section, heading included, and is logged; the opener, the search box and the emergency panel always render; the configuration read relies on T-105's own fallback, and an exception from it throws to the error boundary."
    category: constraint
    applies_to: "(patient)/page.tsx"
    trigger: "A list query returns ok = false or rejects"
    logic: "IF list result not ok THEN logger.error({event: 'discover.section_unavailable', section: 'topics' | 'facilities' | 'latest', correlationId}) AND pass [] for that section; IF the configuration helper throws (T-105 has already fallen back on a database error) THEN throw"
    violation: "The front door and its emergency guidance replaced by an error page because one list failed; or a silent failure with no log line (construction.md Error Handling)"
    source: "Question 5; T-105 BR4.5 (configuration fallback); construction.md Error Handling; 01-conventions.md §3 and §11 (allowlisted log fields); project.md Mandated (emergency guidance)"
  - id: BR1.4
    statement: "The Discover page renders the same content for every visitor, signed in or not, apart from T-008's masthead; nothing on it reads the session or a personal setting."
    category: constraint
    applies_to: "(patient)/page.tsx, Discover"
    trigger: "Any request to /{locale}"
    logic: "the actor passed to the queries is used for visibility only; no draft, bookmark, notification or name reaches the page body"
    violation: "Personal data in a page T-501 keeps in its shell cache (FR94)"
    source: "FR94, T-501 step 5 (SHELL_ROUTES includes /en and /bn)"
  - id: BR1.5
    statement: "The emergency numbers and their last-verified date on the Emergency page and in Discover's emergency panel come from the live configuration."
    category: constraint
    applies_to: "emergency/page.tsx, (patient)/page.tsx"
    trigger: "Every render of either page"
    logic: "config = (await getConfig()).emergency, T-105's helper over container.config.current() -> {ambulance, healthLine, crisisLine, lastVerified}; DEFAULT_CONFIG_VALUES is no longer read by a page"
    violation: "A number changed by a Super Admin that the public pages do not show (FR100); ISS-171 left open"
    source: "FR100, AC12.1.5, T-207 step 1, ISS-171, T-202 EmergencyPanel contract"
  - id: BR1.6
    statement: "Each of the five pages exports generateMetadata with the title titleForView gives, a canonical URL without query, and en and bn alternates; all five are indexable."
    category: constraint
    applies_to: "the five page.tsx files"
    trigger: "Metadata for /{locale}, /emergency, /about, /terms, /privacy"
    logic: "title = documentTitle(view, t) (Discover: 'RogiKotha — Patient-reported treatment experiences'); alternates via T-202's metadata helper; no robots field"
    violation: "A wrong tab title, a missing alternate, or a noindex on a public page"
    source: "01-conventions.md §8 and §9, T-207 steps 1–4, T-203 BR1.7"
  - id: BR1.7
    statement: "An unmatched patient URL and every notFound() raised under the patient group render a localized 404 page inside the patient chrome with status 404; the root not-found stays a last resort that takes its copy from the dictionaries and has no inline style."
    category: constraint
    applies_to: "app/[locale]/(patient)/not-found.tsx, app/[locale]/(patient)/[...rest]/page.tsx, app/not-found.tsx"
    trigger: "A path under /{locale}/ that matches no page, or a page calling notFound()"
    logic: "[...rest]/page.tsx -> notFound(); (patient)/not-found.tsx -> ViewShell(view='not-found', title='') > h1 errors.common.notFound, p notFound.body, links notFound.home -> /{locale} and nav.emergency -> /{locale}/emergency; root: both languages from en.json and bn.json, lang attributes, no style attribute"
    violation: "An English-only 404 with no chrome under /bn (ISS-120), hard-coded copy, or an inline style"
    source: "Question 7, ISS-120, 01-conventions.md §6 and §7.2, FD-024"

  # 2. Hard rules on these pages
  - id: BR2.1
    statement: "Nothing on these pages is a quality number: no score, rating, rank, percentage or 'top' label; counts are counts of patient experiences, written with a count-phrase key."
    category: policy
    applies_to: "Discover (chips, browse cards, teaser rows, latest rows)"
    trigger: "Any number shown"
    logic: "a number appears only as {count} inside sentiment.totalAccounts or as a date, phone number or step figure; chips carry no count"
    violation: "A figure read as quality (project.md Forbidden, S1)"
    source: "project.md Forbidden (no number for quality), owner's answer to T-202 Question 1 (no percentages), PRODUCT.md"
  - id: BR2.2
    statement: "Every list on Discover is in a neutral order: the chips by most accounts, ties by name; the browse grid and the facility teaser in their queries' order; the latest accounts newest first; there is no sort control."
    category: policy
    applies_to: "Discover"
    trigger: "Building the chips, grid, teaser and latest lists"
    logic: "chips = conditions.filter(accountsTotal > 0).sort(accountsTotal desc, then Intl.Collator(locale) by name).slice(0, 5); grid = conditions.filter(accountsTotal > 0) in query order; teaser = listFacilities order; latest = listExperienceCards order"
    violation: "An order that reads as a ranking, or a 'highest rated' anything (project.md Forbidden)"
    source: "Question 2, project.md Mandated (neutral order) and Forbidden (no highest rated sort), T-201 WF5, WF7, WF13"
  - id: BR2.3
    statement: "Nothing shows a zero or an empty panel: conditions without accounts are left out of the chips and the grid, a teaser facility without accounts reads 'No one has written about this yet.', and a section whose list is empty is left out with its heading."
    category: policy
    applies_to: "Discover"
    trigger: "accountsTotal = 0, or an empty list"
    logic: "IF facility.accountsTotal = 0 THEN sub count = t('index.emptyTopic'); IF list.length = 0 THEN render nothing for that section"
    violation: "'0 patient experiences' or an empty headed block on the front door (project.md Forbidden: never render missing as 0)"
    source: "project.md Mandated and Forbidden (Not provided, never 0), prototype renderDiscover (grid filter), T-203 Question 6 A"
  - id: BR2.4
    statement: "Each teaser row whose branch is below the limited-data threshold carries the short 'Limited data' tag; browse cards show their count only, as on the topic index."
    category: policy
    applies_to: "Discover facilities teaser, browse grid"
    trigger: "FacilityCardVM.accountsLimitedData = true"
    logic: "teaser sub = [type, place, countPhrase].join(' · ') + (accountsLimitedData ? Badge plain label.limitedData : nothing); BrowseCard sub = countPhrase only"
    violation: "A sparse facility figure on the home page without the sparse-sample mark (project.md Mandated: Limited data)"
    source: "Question 3, project.md Mandated (Limited data), AC4.3.5, PRODUCT.md ('Limited data when the sample is sparse'), T-203 Question 2 A and BrowseCard contract"
  - id: BR2.5
    statement: "The facility teaser keeps facility and doctor figures apart: its note is facility.separation, its rows show facility type, place and the branch's own facility-account count, and no doctor figure; browse cards show doctor-account counts only and no facility figure."
    category: policy
    applies_to: "Discover facilities teaser, browse grid"
    trigger: "Rendering the teaser and the grid"
    logic: "teaser note = t('facility.separation'); row count = FacilityCardVM.accountsTotal; grid count = ConditionCardVM.accountsTotal; no row combines both"
    violation: "A facility count next to a doctor summary, or facility feedback inside a condition figure (project.md Forbidden)"
    source: "project.md Forbidden (facility feedback never in doctor figures), AC4.3.3, prototype renderDiscover, T-201 BR2.6 (query-level isolation)"
  - id: BR2.6
    statement: "The persistent short disclaimer sits in the opener's margin note, which is a static group named disclaimer and never moves; the colophon's long disclaimer stays as T-008 built it."
    category: policy
    applies_to: "Discover opener"
    trigger: "Every render of /{locale}"
    logic: "aside.margin-note[data-static=disclaimer] > span.k discover.editorialNote, p disclaimer.short; no .reveal on or around it"
    violation: "A missing, moving or covered disclaimer (project.md Mandated, AC2.4.4)"
    source: "project.md Mandated (persistent disclaimer), prototype renderDiscover comment (STORY-PLAT-001), T-011 BR7.2, AC2.4.4"
  - id: BR2.7
    statement: "Emergency guidance is non-blocking and static: Discover shows T-202's full EmergencyPanel once, directly after the opener; the /emergency page's cards and note never move; nothing on these pages gates, delays or covers it."
    category: policy
    applies_to: "Discover, Emergency"
    trigger: "Every render"
    logic: "Discover block 2 = EmergencyPanel(config) with data-static=emergency, outside any .reveal; /emergency is #view-emergency (T-011 static set); call links are plain tel: anchors, no modal, no confirmation"
    violation: "Emergency guidance that is missing, animated, covered or behind an interaction (project.md Mandated, AC2.4.4, AC12.1.5)"
    source: "project.md Mandated (non-blocking emergency guidance), FD-046, AC12.1.5, AC2.4.4, T-202 BR5.5, T-011 BR7.1–BR7.3"
  - id: BR2.8
    statement: "An anonymous author in the latest accounts is never a link and never accent-coloured."
    category: policy
    applies_to: "Discover latest accounts (T-202 AccountRow, Byline)"
    trigger: "ExperienceCardVM.author is anonymous"
    logic: "rendered through T-202's Byline variant row; Discover adds no author markup of its own"
    violation: "A link from an anonymous account to a person (project.md Forbidden, ADR-0008)"
    source: "project.md Forbidden (identity in a public projection), ADR-0008, prototype byline comment, T-202 BR2.7"
  - id: BR2.9
    statement: "The lawful-access section appears only on the legal pages and never as a banner, warning or note anywhere else; today that is Privacy, and Terms too if the owner answers Question 1 with A or C."
    category: policy
    applies_to: "Policy, every other patient page"
    trigger: "Rendering any page"
    logic: "policy.privacy.lawful and lawfulBody are referenced only from Policy.tsx; rendered on kind = privacy (and kind = terms under Question 1 A); the Discover home is in the rendered placement test"
    violation: "The disclosure on a review page, the home page or as a banner (FD-022)"
    source: "FD-008, FD-022, Question 1, T-207 step 3, fd-022-lawful-placement.test.tsx, fd-022-lawful-key-usage.test.ts"
  - id: BR2.10
    statement: "The hero search box starts empty; nothing pre-fills a query."
    category: constraint
    applies_to: "Discover opener"
    trigger: "Every render of /{locale}"
    logic: "SearchBox({variant: 'hero', initialQuery: ''})"
    violation: "A suggested query ('diabetes') that steers the reader (task step 4 'Drop')"
    source: "T-207 step 4, prototype state.query"
  - id: BR2.11
    statement: "The demo marker stays visible and unchanged on every page of this Unit; nothing here presents the synthetic records as real."
    category: policy
    applies_to: "all five pages and the 404 page (through the patient layout)"
    trigger: "Every render"
    logic: "the pages render inside (patient)/layout.tsx, which renders DemoMarker; no page hides or restyles .demo"
    violation: "Synthetic content presented as real (project.md Mandated, AD-14)"
    source: "project.md Mandated (demo marker), team.md Deployment, T-207 'Not in scope'"

  # 3. Structure and content
  - id: BR3.1
    statement: "Discover's blocks appear in the prototype's order: opener, emergency panel, browse by topic, facilities teaser, how it works, latest accounts."
    category: constraint
    applies_to: "Discover"
    trigger: "Every render"
    logic: "children order fixed; a left-out section (BR1.3, BR2.3) keeps the others in this order"
    violation: "A different order fails the task's 'Discover order' check"
    source: "prototype renderDiscover, T-207 step 4, acceptance row 'Discover block order'"
  - id: BR3.2
    statement: "The opener holds, in order, the kicker discover.kicker, the h1 hero.title, and a grid of the lede hero.body, the hero SearchBox and the chips, beside the margin note."
    category: constraint
    applies_to: "Discover opener"
    trigger: "Every render"
    logic: "section.opener > span.kicker, h1.display, div.opener-grid > (div > p.lede, SearchBox hero, ul.chips) + aside.margin-note"
    violation: "A missing hero heading (ISS-152) or a search box outside the first screen"
    source: "prototype renderDiscover, T-207 step 4.1, ISS-152, FR28"
  - id: BR3.3
    statement: "The chips are up to five links to the search page with the condition's name in the active language as the query."
    category: constraint
    applies_to: "Discover chips"
    trigger: "Every render"
    logic: "li > Link.chip href {pathname: '/search', query: {q: name}}; text = name; at most five; none when no condition has accounts"
    violation: "A chip that is a button needing script, or a query in the other language"
    source: "Question 2, T-207 step 4.1 and 'Not in scope' (chip handler becomes plain links), FR28"
  - id: BR3.4
    statement: "The browse grid lists every condition with accounts as a BrowseCard to its topic page with its count phrase, under the discover.browse heading and the discover.browseNote note."
    category: constraint
    applies_to: "Discover browse block"
    trigger: "Every render with at least one condition with accounts"
    logic: "h2.section-head discover.browse; p.note discover.browseNote; ul.browse-grid > li > BrowseCard {href /topics/{publicId}, title name, sub sentiment.totalAccounts}"
    violation: "A zero-account topic on Discover (the prototype filters them), or a card that is not a link"
    source: "prototype renderDiscover (byCondition filter), T-207 step 4.3, T-203 BrowseCard contract"
  - id: BR3.5
    statement: "The facilities teaser is a panel with the discover.facilities heading, the separation note and up to three branches as MiniRow links, each with its avatar, label and a sub-line of type, place and count."
    category: constraint
    applies_to: "Discover facilities teaser"
    trigger: "Every render with at least one facility"
    logic: "section.panel.discover-facilities > h2, p.note facility.separation, MiniList > MiniRow {href /facilities/{publicId}, avatar Avatar(publicId, avatarHue, 38), title facilityLabel(card), sub [facility.type.{type}, [area, city].filter(Boolean).join(', '), countPhrase].join(' · ')}"
    violation: "A teaser row that drops the place, mixes a doctor figure in, or links nowhere"
    source: "prototype renderDiscover, T-207 step 4.4, T-202 MiniList contract, T-203 facilityLabel and the owner's answer to T-203 F2"
  - id: BR3.6
    statement: "How it works shows three steps in an ordered list, each with its figure 01–03, an h3 title and a paragraph."
    category: constraint
    applies_to: "Discover how-it-works block"
    trigger: "Every render"
    logic: "h2.section-head how.title; ol.how-list > li ×3 > span.fig formatDigits('0' + i, locale), h3 how.{i}.t, p how.{i}.b"
    violation: "Latin digits under bn, or a lost leading zero"
    source: "prototype renderDiscover, T-207 step 4.5"
  - id: BR3.7
    statement: "The latest block shows the four newest published accounts as T-202 AccountRows under the discover.latest heading."
    category: constraint
    applies_to: "Discover latest block"
    trigger: "Every render with at least one account"
    logic: "h2.section-head discover.latest; AccountRow(card) for each of listExperienceCards({limit: 4}).items"
    violation: "A hand-written row that drifts from T-202's, or more than four rows"
    source: "prototype renderDiscover, T-207 step 4.6, T-201 WF13 (newest first)"
  - id: BR3.8
    statement: "The Emergency page keeps T-207a's structure: the head panel, three tap-to-call cards with the configured number, the BMDC register card opening in a new tab, and the last-verified note."
    category: constraint
    applies_to: "Emergency"
    trigger: "Every render of /{locale}/emergency"
    logic: "a.panel.emerg-card[href=tel:{number as configured}] > .k label, .num formatDigits(number), .cta a11y.call; a.panel.emerg-card.bmdc[href=https://verify.bmdc.org.bd/][target=_blank][rel=noopener] > .k emergview.bmdc, .num emergview.bmdcShort, .cta emergview.bmdcBody; p.note.emerg-note emergency.lastVerifiedLine {date: formatDate(lastVerified)}"
    violation: "A number that differs from configuration, a hard-coded literal, or an inline style"
    source: "T-207 step 1, prototype renderEmergency (BMDC comment), Question 8, AC12.1.5"
  - id: BR3.9
    statement: "The About page keeps its five sections in the prototype's order and its foot note, as T-207a built it."
    category: constraint
    applies_to: "About"
    trigger: "Every render of /{locale}/about"
    logic: "moderation, reviewer label, privacy, limits, contact (aboutview.contactBodyProduct); p.note.about-foot aboutview.lastReviewed"
    violation: "A reordered or missing section fails the task's 'About sections' check"
    source: "prototype renderAbout, T-207 step 2"
  - id: BR3.10
    statement: "Terms and Privacy keep T-207a's section sets; Terms changes only as Question 1 decides."
    category: constraint
    applies_to: "Policy"
    trigger: "Every render of /{locale}/terms or /{locale}/privacy"
    logic: "terms = limits, reviewer, moderation, eligibility, enforcement (+ lawful under Question 1 A, + pointer under Question 1 C); privacy = identity, data, lawful"
    violation: "A legal section silently added, moved or dropped"
    source: "T-207 step 3, FD-008, FD-022, FD-044 (nav.about kicker), Question 1"
  - id: BR3.11
    statement: "Count phrases come from one parameter key with the formatted count and an English plural; nothing concatenates a number with a word or changes letter case in code."
    category: constraint
    applies_to: "Discover browse cards and teaser rows"
    trigger: "Any count shown"
    logic: "t('sentiment.totalAccounts', {n, count: formatNumber(n, locale)})"
    violation: "'1 patient experiences' or a Bengali phrase in the wrong order"
    source: "01-conventions.md §6, T-202 Question 5 A, T-203 BR3.9"
  - id: BR3.12
    statement: "Numbers, phone numbers and dates go through the i18n formatters, so digits follow the active language; phone numbers keep their hyphen and get no thousands grouping."
    category: constraint
    applies_to: "Discover, Emergency, EmergencyPanel"
    trigger: "Any digit shown"
    logic: "counts formatNumber; phone numbers and step figures formatDigits; last verified formatDate"
    violation: "Latin digits under bn, or '১৬,২৬৩' for a phone number"
    source: "project.md Mandated (numerals follow language), FD-024, ISS-136, T-207 step 1"
  - id: BR3.13
    statement: "The emergency panel's body sentence names the configured ambulance and health-line numbers, not fixed digits."
    category: constraint
    applies_to: "EmergencyPanel (T-202), as shown on Discover"
    trigger: "Every render of the panel"
    logic: "t('emergency.body', {ambulance: formatDigits(config.ambulance), healthLine: formatDigits(config.healthLine)}); the key's copy gains the two parameters in U12 T-105"
    violation: "A sentence that disagrees with the call links after a configuration change (FR100)"
    source: "T-105 Question 5 A and finding F2, FR100, T-203 Question 13 and finding F9"
  - id: BR3.14
    statement: "Discover adds no block, button or link the prototype's Discover does not have."
    category: constraint
    applies_to: "Discover"
    trigger: "Every render"
    logic: "no hero call-to-action buttons; hero.cta and hero.browse stay unused"
    violation: "A structural change from the prototype without a decision"
    source: "Question 9, FD-091 (prototype stays the source of truth for structure)"

  # 4. Accessibility and responsive behaviour
  - id: BR4.1
    statement: "Each page has exactly one h1 and headings in order: on Discover the hero title is the h1, block headings are h2, how-it-works steps and account titles are h3."
    category: constraint
    applies_to: "Discover, Emergency, About, Policy, the 404 page"
    trigger: "Every render"
    logic: "ViewShell title=''; the page's own h1; EmergencyPanel and section heads h2; li h3 and AccountRow h3"
    violation: "No h1 on the front door (ISS-152), two h1s, or a skipped level (FR95)"
    source: "FR95, NFR6, AC12.1.6, ISS-152, ISS-121"
  - id: BR4.2
    statement: "Lists are lists and regions are named: chips, browse cards and teaser rows are list items, how it works is an ordered list, the margin note is an aside named by its kicker, and the search form keeps role=search."
    category: constraint
    applies_to: "Discover"
    trigger: "Every render"
    logic: "ul.chips, ul.browse-grid, MiniList, ol.how-list; aside.margin-note[aria-labelledby=kicker id]; SearchBox form[role=search] (T-206)"
    violation: "A screen reader hears a run of unrelated links (FR95)"
    source: "FR95, NFR6, AC12.1.6, T-203 BR4.2"
  - id: BR4.3
    statement: "Every link on these pages is at least 44 px tall and shows T-011's focus ring."
    category: constraint
    applies_to: "chips, browse cards, teaser rows, emergency cards, the 404 links"
    trigger: "Keyboard focus or touch"
    logic: "min-block-size var(--target); :focus-visible outline var(--focus-ring) from T-011"
    violation: "A missed tap on a phone or an invisible focus (AC12.1.6)"
    source: "AC2.4.1 (44 px targets), AC12.1.6, T-011 BR1.4"
  - id: BR4.4
    statement: "All five pages and the 404 page work at 360 px, at 200% zoom, in both languages and without script, with no horizontal scrolling."
    category: constraint
    applies_to: "all pages of the Unit"
    trigger: "Narrow screens, zoom, script disabled"
    logic: "opener-grid one column below T-011's breakpoint; chips and teaser sub-lines wrap; long Bengali names wrap; the search form submits by GET without script; every block is server-rendered"
    violation: "Sideways scrolling or a dead search box without script (NFR4)"
    source: "NFR4, NFR6, 01-conventions.md §8 (forms work without script)"
  - id: BR4.5
    statement: "Each call link's accessible name holds its label, its number and the call hint, and the BMDC link's name says what it checks."
    category: constraint
    applies_to: "Emergency cards, EmergencyPanel lines"
    trigger: "A screen reader reaches a tel: or external link"
    logic: "the link text is .k + .num + .cta (no aria-label that hides the visible text)"
    violation: "A link read as a bare number (AC12.1.6)"
    source: "AC12.1.5, AC12.1.6, prototype renderEmergency"

  # 5. Motion
  - id: BR5.1
    statement: "No page of this Unit wraps itself in RouteTransition while the patient layout renders one."
    category: constraint
    applies_to: "the five page.tsx files and the 404 page"
    trigger: "Code Generation of the pages"
    logic: "the layout's keyed ViewTransition (T-011 Q4 A) covers them; IF T-011 fell back to per-page wrappers THEN each page wraps itself once"
    violation: "Two elements named page in one document; the browser skips every route transition (finding F1)"
    source: "T-011 Question 4 A and D5, T-202 F4, T-203 BR5.1, T-207 step 7 (FD-091)"
  - id: BR5.2
    statement: "Only blocks below the emergency panel reveal on scroll: each browse card, each how-it-works step and each latest account as an item, and the facilities panel as one block, through T-011's .reveal hook."
    category: constraint
    applies_to: "Discover"
    trigger: "An item or block entering the viewport, with motion allowed and animation-timeline supported"
    logic: "li.reveal in ul.browse-grid and ol.how-list; div.reveal around each AccountRow; section.panel.discover-facilities.reveal; headings and notes carry no hook; no Reveal (data-reveal-list) on this page"
    violation: "A reveal on the hero or the emergency panel, or two entry animations on one element (T-011 BR6.6)"
    source: "Question 4, T-011 BR6.6 and § 5.4, T-207 step 7, prototype how-list li.reveal"
  - id: BR5.3
    statement: "The opener (kicker, h1, lede, search box, chips, margin note), the emergency panel, the whole Emergency page, the disclaimer and the demo marker never animate and never sit inside a revealing element."
    category: policy
    applies_to: "Discover, Emergency"
    trigger: "Any motion"
    logic: "no .reveal or data-reveal-list on or above them; data-static on the margin note and the panel; #view-emergency in T-011's static set"
    violation: "The LCP element or hard-rule guidance animated in (AC2.4.4, AC2.4.6)"
    source: "AC2.4.4, AC2.4.6, T-011 BR4.5 and BR7.1–BR7.4, T-207 step 7"
  - id: BR5.4
    statement: "T-207's CSS declares no animation, transition, keyframes or transform; motion comes only from T-011's motion.css."
    category: constraint
    applies_to: "T-207's section of patient.css"
    trigger: "Any T-207 style rule"
    logic: "check:motion finds nothing in the T-207 section; a needed motion change (the .emerg-card hover lift) is asked of U45"
    violation: "A motion rule outside motion.css (T-011 BR4.7, check:motion)"
    source: "T-011 BR4.7 and BR9.1, T-207 FD-091 acceptance row 'motion check', finding F6"
  - id: BR5.5
    statement: "With reduced motion, from the operating system or the app's switch, nothing on these pages reveals or moves, every block is visible at once, and every step still completes."
    category: constraint
    applies_to: "all pages of the Unit"
    trigger: "prefers-reduced-motion: reduce or data-motion=reduced"
    logic: "T-011's guards switch .reveal and the route transition off; no page logic depends on an animation ending"
    violation: "A hidden block waiting for an animation (AC2.4.3)"
    source: "AC2.4.3, T-011 BR5.4, T-207 FD-091 acceptance row 'reduced-motion journey'"
  - id: BR5.6
    statement: "The largest element of the first screen (the hero title or lede) is never animated in, and nothing above it loads late or shifts it; the search suggestions open over the page, not inside its flow."
    category: constraint
    applies_to: "Discover opener"
    trigger: "First load of /en and /bn"
    logic: "no web font on the hero beyond T-011's bn heading font with swap; no image above the fold; SearchBox's listbox is positioned over the content"
    violation: "LCP over 2.5 s or CLS over 0.1 on the throttled profile (AC2.4.6)"
    source: "AC2.4.6, NFR13, NFR1, T-207 acceptance row 'early performance check', T-011 BR4.5"

  # 6. Language
  - id: BR6.1
    statement: "Every user-facing string on these pages comes from a message key with both languages; new keys go into both dictionaries in one commit, the Bengali flagged for review, and keys.ts is regenerated."
    category: constraint
    applies_to: "all components of the Unit, packages/i18n/messages/{en,bn}.json, packages/i18n/src/keys.ts"
    trigger: "Any copy"
    logic: "new keys: emergview.bmdcShort (Q8), notFound.body, notFound.home (Q7); pnpm i18n:check green"
    violation: "A literal in a component or a key without its Bengali string (project.md Forbidden and Mandated, AC12.1.4)"
    source: "project.md Forbidden and Mandated (i18n), ADR 0011, FD-024, FD-042, NFR7, AC12.1.4"
  - id: BR6.2
    statement: "No code or style transforms the letter case of Bengali text; the kicker and the margin-note label keep their Bengali as written."
    category: constraint
    applies_to: "Discover, Emergency"
    trigger: "Any label styled small caps or uppercase"
    logic: "uppercase only under :lang(en) through T-011's rules; no toUpperCase or toLowerCase in components"
    violation: "A capital-letter transform in Bengali (project.md Mandated)"
    source: "project.md Mandated (no capital-letter transform in Bengali), T-011 type rules"
  - id: BR6.3
    statement: "Stored text (account titles, excerpts, condition and facility names) is shown in the language it was stored in, without translation."
    category: constraint
    applies_to: "Discover latest rows, chips, cards"
    trigger: "Rendering stored text"
    logic: "the view model's string as given; ISS-161 (Bengali-only seed text) is a known difference under /en"
    violation: "An automatic translation (FR92)"
    source: "FR92, AC12.1.3, ISS-161"

  # 7. Styles
  - id: BR7.1
    statement: "The pages use T-011's tokens and class names; page rules go in T-207's own section of patient.css, each marked /* added: T-207 reason */, and no element carries an inline style."
    category: constraint
    applies_to: "patient.css (T-207 section), every component of the Unit"
    trigger: "Any style need"
    logic: "the Emergency note's marginTop becomes .emerg-note; the prototype's inline margins and heading sizes on Discover become T-207 classes; a missing token is an ISS row for U45"
    violation: "An inline style or a literal value outside the token set (FD-091, finding F7)"
    source: "FD-091, FD-032, project.md Code Style (FD-091 patient styles), T-207 FD-091 amendment, 01-conventions.md §7.2"
  - id: BR7.2
    statement: "The UI gates report zero findings on the Unit's pages and styles."
    category: constraint
    applies_to: "the Unit"
    trigger: "Code Generation and Build and Test"
    logic: "npx impeccable detect apps/web/src --no-advisory; pnpm contrast; pnpm contrast:patient; pnpm check:motion"
    violation: "A failed gate blocks the Unit (team.md Testing Posture)"
    source: "team.md Testing Posture (UI units), T-207 acceptance rows"

  # 8. Components and paths
  - id: BR8.1
    statement: "The Unit's components are server components that receive view models and plain values; the only client part on Discover is T-206's SearchBox, and no component fetches data."
    category: constraint
    applies_to: "Discover, Emergency, About, Policy, NotFoundView"
    trigger: "Code Generation"
    logic: "no 'use client' in the Unit's files; imports T-202 EmergencyPanel, AccountRow, MiniList, MiniRow, Avatar; T-203 BrowseCard, facilityLabel; T-206 SearchBox"
    violation: "A client bundle grown by the home page (AC2.4.6) or a fetch from a component (01-conventions.md §8)"
    source: "01-conventions.md §8, T-207 'Depends on', T-202 D10, T-203 BR8.1"
  - id: BR8.2
    statement: "A change this Unit needs in another Unit's component is asked of its owner first and, if it merged without it, made additively here and recorded."
    category: constraint
    applies_to: "components/patient/shared/EmergencyPanel.tsx (T-105 Question 5 A)"
    trigger: "A needed prop, key or behaviour missing from a primitive"
    logic: "ISS row for U15; IF absent at Bolt 26 THEN additive change in T-207's Bolt with the hand-off naming it"
    violation: "A forked primitive or a silent change to another Unit's contract"
    source: "T-203 BR8.2, team.md Way of Working step 4 (files outside owned paths)"
  - id: BR8.3
    statement: "Only the task's owned paths and the recorded additions change."
    category: constraint
    applies_to: "the Bolt's diff"
    trigger: "Every commit"
    logic: "owned: the five pages, Discover.tsx, Emergency.tsx, About.tsx, Policy.tsx, their tests, new keys, T-207's patient.css section; recorded: functional-spec.md § 12"
    violation: "A file outside the list without a recorded reason (G4)"
    source: "T-207 owned paths and FD-091 amendment, team.md Way of Working step 4"
  - id: BR8.4
    statement: "No contract stub with this Unit's TODO remains: DiscoverVM and EmergencyPanelVM are removed and 03 §4 no longer lists DiscoverVM."
    category: constraint
    applies_to: "packages/contracts/src/view-models/discover.ts, packages/contracts/src/index.ts, docs/implementation/03-routes-and-contracts.md §4"
    trigger: "Code Generation"
    logic: "delete the file and its export; grep finds no DiscoverVM or TODO(T-207)"
    violation: "Dead contract types and a stale TODO (code-comments rule)"
    source: "Question 6, 03-routes-and-contracts.md §4"

  # 9. Tests and records
  - id: BR9.1
    statement: "Every new or changed component of the Unit has component tests in both languages, run inside describe.each over en and bn so each test name carries its locale."
    category: constraint
    applies_to: "Discover, Emergency, About, Policy, NotFoundView tests"
    trigger: "Code Generation"
    logic: "describe.each(['en', 'bn']); real dictionaries; @/i18n/routing mocked (ISS-053); builders, not fixtures; no snapshot"
    violation: "A Bengali regression the acceptance command does not select (ISS-151)"
    source: "01-conventions.md §10, team.md Testing Posture, ISS-151, ISS-053"
  - id: BR9.2
    statement: "The cumulative smoke suite gains one file for the Discover home."
    category: constraint
    applies_to: "components/patient/discover.smoke.test.tsx"
    trigger: "Code Generation"
    logic: "renders Discover with builder data in en and bn: one h1, the emergency panel, the margin-note disclaimer, the six blocks in order"
    violation: "No smoke assertion for the Unit (team.md Testing Posture)"
    source: "team.md Testing Posture (cumulative smoke suite)"
  - id: BR9.3
    statement: "The Unit is done only with every gate green, the Lighthouse figures recorded, and the hard-rule evidence named in the hand-off."
    category: constraint
    applies_to: "Build and Test, hand-off"
    trigger: "Before merge"
    logic: "pnpm check, pnpm smoke, check:motion, contrast, contrast:patient, impeccable; Lighthouse LCP and CLS for /en and /bn home on the throttled profile; a miss is an ISS row before the next UI Unit; evidence names test files"
    violation: "A hard-rule claim without evidence, or a speed miss found only at T-503"
    source: "team.md Way of Working steps 2–4, T-207 acceptance rows, risk-and-sequencing-rationale.md (R-03)"
  - id: BR9.4
    statement: "The FD-022 rendered placement test includes the Discover home; the source-level key scan stays as the guard for every other page."
    category: constraint
    applies_to: "components/patient/fd-022-lawful-placement.test.tsx"
    trigger: "Code Generation"
    logic: "render Discover (builders) in en and bn and assert the lawful sentence is absent; fd-022-lawful-key-usage.test.ts unchanged"
    violation: "A disclosure on the home page that no test sees (FD-022)"
    source: "T-207 step 3, FD-022, BR2.9"
  - id: BR9.5
    statement: "Every defect, workaround or assumption found becomes an ISS row linked to U20, and the carried rows are closed with evidence."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Any finding; the end of Build and Test"
    logic: "Found in U20 T-207; ISS-120, ISS-151, ISS-152 (and ISS-171 if still open) closed with the test or check that proves it"
    violation: "An unrecorded workaround (project.md Mandated)"
    source: "project.md Mandated (ISS rows), team.md Way of Working, unit-of-work.md U20"
```

## Rule groups at a glance

| Group | Rules | Theme |
|---|---|---|
| 1 | BR1.1–BR1.7 | Data through the container; parallel per-request loading; a failed section left out and logged; same page for everyone; live emergency configuration; metadata; the localized 404 |
| 2 | BR2.1–BR2.11 | No quality number; neutral order; no zeros or empty panels; Limited data on teaser rows; facility and doctor figures apart; static disclaimer; static, non-blocking emergency guidance; anonymous bylines; lawful-access placement; empty hero box; demo marker |
| 3 | BR3.1–BR3.14 | Block order; opener; chips; browse grid; facilities teaser; how it works; latest; Emergency, About, Terms and Privacy structure; count phrases; formatters; live emergency sentence; nothing beyond the prototype |
| 4 | BR4.1–BR4.5 | One h1 and heading order; lists and named regions; 44 px targets and focus; 360 px, zoom, no script; call-link names |
| 5 | BR5.1–BR5.6 | Layout transition only; scroll reveals below the emergency panel; static hard-rule blocks; no motion in T-207 CSS; reduced motion; LCP and CLS |
| 6 | BR6.1–BR6.3 | Keys in both languages; no text transforms; stored text as written |
| 7 | BR7.1–BR7.2 | T-011 tokens and classes, no inline style; UI gates |
| 8 | BR8.1–BR8.4 | Server components and imports; additive primitive changes; owned paths; the contract stub removed |
| 9 | BR9.1–BR9.5 | Tests in both languages; smoke; gates and evidence; FD-022 test; ISS rows |
