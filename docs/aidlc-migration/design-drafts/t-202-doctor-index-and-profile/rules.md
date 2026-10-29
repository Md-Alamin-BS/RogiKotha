# Business rules — U15 `t-202-doctor-index-and-profile`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U15), `unit-of-work-story-map.md` (US4.1, US6.4, US4.2), `requirements.md` (FR15–FR23, FR48–FR52, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md`, `contract-summary.md` (C7), T-202 with its FD-091 amendment, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §3–§9 and §14, and the two upstream drafts (`t-201-directory-and-taxonomy-modules`, `t-011-patient-design-and-motion-system`). The workflows that apply these rules are in `functional-spec.md`, the component contracts in `frontend-components.md`, and the data shapes in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 2–13 are answered A on the owner's standing instruction and await confirmation; **Question 1 needs the owner**, and BR3.3 is written for its recommended option A with the option-B form beside it. `functional-spec.md` § 14 lists what changes under each other option.

```yaml
rules:
  # 1. Routing, loading and freshness
  - id: BR1.1
    statement: "Pages read doctors only through the directory queries wired in the web composition root; components receive view models as props and never import database, adapters, test-support or node: modules."
    category: constraint
    applies_to: "doctors/page.tsx, doctors/[publicId]/page.tsx, every component in the owned paths"
    trigger: "Any data a page renders"
    logic: "page -> container (server/container.ts) -> directory.listDoctors | directory.getDoctor | directory.resolvePublicId -> view model -> components; IF a component imports @rogikotha/database, @rogikotha/adapters, @rogikotha/test-support or node:* THEN the import is forbidden"
    violation: "A boundary import fails lint once T-010's boundaries rule lands and fails the reviewer's diff check (team.md Code Style)"
    source: "01-conventions.md §2 and §8, team.md Code Style (Boundaries), C7"
  - id: BR1.2
    statement: "The profile segment holds a public id with an optional trailing slug; a malformed id is a 404, the slug is ignored, and every link the app writes has no slug."
    category: validation
    applies_to: "doctors/[publicId]/page.tsx, DoctorLink"
    trigger: "A request to /{locale}/doctors/{segment}"
    logic: "match segment against ^([a-z2-7]{10})(?:-[^/]*)?$; no match -> notFound(); match -> publicId = group 1; links = /doctors/{publicId}"
    violation: "A slug treated as part of the id makes every slugged URL a 404; a 500 on a malformed id is an S1 (red demo)"
    source: "01-conventions.md §4 and §9, 03-routes-and-contracts.md §1"
  - id: BR1.3
    statement: "Before loading a profile the page resolves the public id; a merged or old id answers a permanent redirect to its target under the same locale with the query string kept."
    category: constraint
    applies_to: "doctors/[publicId]/page.tsx"
    trigger: "Every profile request"
    logic: "r = directory.resolvePublicId({kind: doctor, publicId}); IF r is not_found THEN notFound(); IF r.redirected THEN permanentRedirect('/{locale}/doctors/' + r.publicId + query) (308); ELSE load the profile"
    violation: "An old URL that 404s fails AC4.2.5 and storyboard step 23"
    source: "FR23, AC4.2.5, T-201 BR1.7, Question 10"
  - id: BR1.4
    statement: "A doctor that is missing, unpublished, hidden, rejected or merged without a resolvable target renders the 404 page; no part of the profile is shown."
    category: constraint
    applies_to: "doctors/[publicId]/page.tsx and its generateMetadata"
    trigger: "getDoctor returns not_found"
    logic: "IF result.ok = false AND error.code = not_found THEN notFound() before any markup is produced"
    violation: "A non-public profile visible to the public fails AC4.1.1 (S1)"
    source: "FR15, AC4.1.1, 01-conventions.md §9, 02-data-model.md §17"
  - id: BR1.5
    statement: "Filter parameters are cleaned before the query: an unknown outcome or relationship and any docs value other than 1 are dropped; a condition the doctor has no accounts for redirects (307) to the same URL without it."
    category: validation
    applies_to: "doctors/[publicId]/page.tsx (searchParams), ProfileFilters"
    trigger: "A profile request with search parameters"
    logic: "outcome in OUTCOMES else drop; relationship in RELATIONSHIPS else drop; docs = '1' else drop; condition matches the public-id pattern else drop; IF condition given AND vm.selectedCondition is absent THEN redirect to the URL without condition (307); a repeated parameter keeps its first value"
    violation: "A validation error surfacing as a 500, or an empty 'zero accounts' view for a mistyped condition, breaks the reading journey"
    source: "03-routes-and-contracts.md §1 (profile filters), T-201 WF2 (validation, BR3.5)"
  - id: BR1.6
    statement: "Filters combine: the condition pill sets or clears condition and keeps the other filters; an outcome or relationship pill sets its value or clears it when it is already selected; the documents pill toggles docs=1."
    category: calculation
    applies_to: "ProfileFilters, the condition pill row, the filter pill row"
    trigger: "Building each pill's href"
    logic: "next = current; condition pill c: next.condition = c (all: delete); outcome pill o: next.outcome = (current.outcome = o ? delete : o); relationship pill r: same; docs pill: next.docs = (current.docs ? delete : '1'); href = path + '?' + params in the fixed order condition, outcome, relationship, docs"
    violation: "A pill that resets the other filters, or one that cannot be turned off, departs from the prototype's data-pcond / data-pfilter behaviour"
    source: "Prototype handlers data-pcond and data-pfilter, T-202 step 5, Question 6"
  - id: BR1.7
    statement: "Both pages render per request; no figure is cached between requests, so hiding, deleting or restoring an account changes the figures on the next view."
    category: constraint
    applies_to: "Both pages"
    trigger: "Any request"
    logic: "no export const revalidate, no 'use cache', no static generation for these routes; the pages read cookies, headers and searchParams, which keeps them dynamic"
    violation: "A stale count after a hide or restore fails AC6.4.4"
    source: "FR50, AC6.4.4"
  - id: BR1.8
    statement: "Each page sets its metadata from the same data it renders: the index title is 'Doctors — RogiKotha' in the active language; the profile title is the doctor's name with the brand; both are indexable and carry a canonical URL without slug or filters and language alternates."
    category: policy
    applies_to: "generateMetadata of both pages"
    trigger: "Page render"
    logic: "index: documentTitle('doctors', t); profile: '{name} — {brand.name}'; robots index; alternates.canonical = /{locale}/doctors[/{publicId}]; alternates.languages en and bn; a 404 gets the not-found metadata"
    violation: "A generic title on a profile departs from titleForView ('profile' case); a filter URL as canonical splits search indexing"
    source: "01-conventions.md §8 and §9, prototype titleForView, T-202 step 6"
  - id: BR1.9
    statement: "The profile is loaded once per request: generateMetadata and the page share one cached loader keyed by locale, public id and cleaned filters."
    category: constraint
    applies_to: "doctors/[publicId]/page.tsx"
    trigger: "Every profile request"
    logic: "loadProfile = cache(async (locale, publicId, filters) => ...); both callers use it"
    violation: "Two query runs per view double the database work counted by the Lighthouse check"
    source: "T-201 BR3.10 (batched reads), NFR13 performance check"

  # 2. Hard rules in what the pages render
  - id: BR2.1
    statement: "No number stands for quality: the pages show exact counts with their denominators; no star, score, rating, rank, average or 'highest rated' order exists, and no control sorts by sentiment or outcome."
    category: policy
    applies_to: "Every component in the owned paths"
    trigger: "Code Generation and the reviewer's diff check"
    logic: "IF markup, copy or a sort derives one quality figure from accounts THEN it is forbidden; percentages appear only under BR3.3"
    violation: "Any such figure is an S1 against the hard rule"
    source: "project.md Forbidden (number for quality, highest-rated sort), FR48, FR52, AC6.4.1, AC6.4.5"
  - id: BR2.2
    statement: "An empty distribution renders 'Not provided' in place of its capsules or rows, never a 0 count."
    category: validation
    applies_to: "DistBlock, SentimentBlock, OutcomeBlock (full and compact)"
    trigger: "dist.empty is true"
    logic: "IF dist.empty THEN render label.notProvided (with its heading for OutcomeBlock) and nothing else ELSE render the distribution"
    violation: "A '0 positive' capsule for a doctor with no sentiment is an S1 (hard rule)"
    source: "project.md Mandated and Forbidden (Not provided, never 0), FR51, AC6.4.2, prototype distBlock"
  - id: BR2.3
    statement: "A distribution with some accounts missing a value adds the line 'Not provided: n' under its denominator."
    category: validation
    applies_to: "DistBlock (full), OutcomeBlock"
    trigger: "dist.empty is false AND dist.notProvided > 0"
    logic: "render label.notProvidedCount {count: formatNumber(notProvided)}; the aria sentence ends with the same phrase"
    violation: "A partial distribution with no mention of the missing values fails AC6.4.2's 'missing sentiment and outcome as Not provided'"
    source: "FR51, AC6.4.2, T-201 BR2.3 (notProvided), Question 2"
  - id: BR2.4
    statement: "'Limited data' shows wherever the eligible accounts or a distribution's values are below the configured threshold: the full distribution's line, the outcome block's line, a badge on the compact card and a badge in the profile hero."
    category: policy
    applies_to: "DistBlock, OutcomeBlock, DoctorEntry (compact), DoctorProfile hero, breakdown rows"
    trigger: "dist.limitedData or vm.accountsLimitedData is true"
    logic: "full: p.limited 'label.limitedData — label.limitedDataWhy'; outcome: p.limited 'label.limitedData'; compact card and hero: badge 'label.limitedData' when accountsLimitedData; breakdown row: '⚠' (aria-hidden) plus visually hidden label.limitedData after the total"
    violation: "Sparse figures without the mark break the hard rule (S1); on the seed nine of ten cards are below the threshold"
    source: "project.md Mandated (Limited data), FR51, AC6.4.2, T-201 BR2.4, Question 3"
  - id: BR2.5
    statement: "The limited-data explanation states the configured threshold, read once per request from ConfigProvider and formatted for the locale."
    category: calculation
    applies_to: "label.limitedDataWhy wherever it renders"
    trigger: "A page renders a full distribution or the breakdown"
    logic: "threshold = ConfigProvider.current().limitedDataThreshold; t('label.limitedDataWhy', {threshold: formatNumber(threshold, locale)}); never a literal number in copy or code"
    violation: "Copy that names 5 after the setting changed misinforms the reader (S3)"
    source: "project.md Mandated (configured threshold), FR100, requirements Assumptions, Question 4"
  - id: BR2.6
    statement: "Every doctor card and the profile hero carry the 'Registration not verified' badge, unconditionally; the word verified is never applied to a registration anywhere else on these pages."
    category: policy
    applies_to: "DoctorEntry, DoctorProfile hero, NotVerified"
    trigger: "Rendering any doctor"
    logic: "NotVerified renders whenever a doctor renders; it does not read bmdc or claimed; a claimed profile adds 'Provider confirmed' beside it, never in place of it"
    violation: "A doctor without the badge is an S1 (hard rule); 'verified' near a registration fails AC4.1.2 and AC4.2.1"
    source: "project.md Mandated (Registration not verified), D-003, FR15, FR16, FR20, AC4.1.2, AC4.2.1, AC4.2.2"
  - id: BR2.7
    statement: "A document count of zero reads 'No documents'; a positive count reads '{n} documents' with the correct plural; '0 documents' never appears."
    category: validation
    applies_to: "DoctorEntry flags, AccountRow flags"
    trigger: "Rendering documentsCount"
    logic: "IF documentsCount > 0 THEN badge (warn on rows, plain on cards) label.documentsCount ELSE badge plain label.noDocuments"
    violation: "'0 documents' breaks the hard rule (S1)"
    source: "project.md Mandated (No documents), FR51, AC6.4.2, prototype accountRow and doctorEntry, Question 5"
  - id: BR2.8
    statement: "Only the profile fields the view model carries render: the facts list shows the present facts in the prototype's order, chambers show hours only when present, and joined lines skip absent parts; nothing renders as a blank label or 0."
    category: validation
    applies_to: "DoctorProfile facts and chambers panels, .p-spec, .doc-sub"
    trigger: "Rendering a profile or card"
    logic: "facts = vm.facts (already filtered by T-201's omitEmptyFields) mapped to profile.{key} labels; .p-spec / .doc-sub = join(' · ', [specialty?, join(', ', [area?, city?])]) over present parts; IF nothing is present THEN the line is omitted"
    violation: "An empty fee row or a stray ' · ' fails AC4.1.3 and the 'omits' acceptance row"
    source: "FR17, AC4.1.3, T-201 BR2.2, prototype renderProfile facts"
  - id: BR2.9
    statement: "Every fact and chamber shows its provenance as text and its last-update month and year in the active language."
    category: policy
    applies_to: "DoctorProfile facts and chambers panels"
    trigger: "Rendering a fact or chamber"
    logic: ".prov[data-p={source}] = prov.{source} + ' · ' + formatMonthYear(updatedAt) through the key prov.updatedOn"
    violation: "A fact without its source or date fails AC4.1.4"
    source: "FR18, AC4.1.4, T-201 BR2.11"
  - id: BR2.10
    statement: "The facilities panel shows the separation note whenever it shows at least one facility; the panel is omitted when the doctor has no visible facility."
    category: policy
    applies_to: "DoctorProfile facilities panel"
    trigger: "vm.facilities is non-empty"
    logic: "IF facilities.length > 0 THEN render the MiniList and p.note profile.facilitySep ELSE omit the panel"
    violation: "A facility list without the note fails the hard-rule checklist item and weakens AC6.4.3's message"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, FR49, AC6.4.3, prototype renderProfile"
  - id: BR2.11
    statement: "Lists keep a neutral order: the index in the query's alphabetical order, conditions and breakdown rows by account count, accounts newest first; the page never re-sorts, and offers no sort control."
    category: policy
    applies_to: "DoctorIndex, condition pills, breakdown, account list"
    trigger: "Rendering any list"
    logic: "render vm order unchanged; IF code sorts a list by sentiment, outcome, reactions or documents THEN forbidden"
    violation: "A favourable-first order breaks the neutral-ordering hard rule (S1)"
    source: "project.md Mandated (neutral order) and Forbidden (highest rated), FR52, AC6.4.5, T-201 BR2.8"
  - id: BR2.12
    statement: "An anonymous author is never a link and never accent-coloured; a real-name author renders as plain text; a pseudonymous author links to /authors/{username}."
    category: authorization
    applies_to: "Byline"
    trigger: "Rendering any author"
    logic: "anonymous: avatar glyph '—', name byline.anonSentence, chip compose.identity.anon, no <a>; named: displayName as text, chip byline.identity.real; pseudonymous: <Link href=/authors/{username} aria-label=byline.otherBy>, chip byline.identity.pseudo; static=true renders every name as text"
    violation: "A link inside an anonymous byline is an S1 privacy defect (ADR-0008); linking a real-name author by a username widens identity exposure"
    source: "project.md Forbidden (identity in public projection), ADR-0008, prototype byline comment block, T-201 BR2.10, Question 7"

  # 3. Calculations and presentation
  - id: BR3.1
    statement: "Each sentiment capsule states its own count and label; its width weight is the count, or 0.4 when the count is 0."
    category: calculation
    applies_to: "DistBlock capsules"
    trigger: "Rendering a non-empty distribution"
    logic: "for k in dist.keys: span.cap.c-{k} style --g = (counts[k] || 0.4); b = formatNumber(counts[k]); em = t(prefix + k)"
    violation: "A capsule without its count can be read as a single score (prototype comment)"
    source: "Prototype distBlock comment, T-202 step 1"
  - id: BR3.2
    statement: "Each outcome row shows its label, a static track filled to count/total, and the text '{count}/{total}'."
    category: calculation
    applies_to: "OutcomeBlock"
    trigger: "Rendering a non-empty outcome distribution"
    logic: "for k in OUTCOMES (helped, none, worse, uncertain): track i style --w = counts[k] / total; .n = formatNumber(counts[k]) + '/' + formatNumber(total); track aria-hidden"
    violation: "A bar without its count, or a bar that grows from 0, misstates the value"
    source: "Prototype outcomeBlock, T-011 BR6.10"
  - id: BR3.3
    statement: "Under Question 1 A, the profile's full sentiment and outcome distributions show each value's percentage after its count, rounded to a whole number, only when the distribution is neither empty nor limited; cards and the breakdown never show percentages. Under Question 1 B no percentage renders anywhere."
    category: calculation
    applies_to: "DistBlock (full), OutcomeBlock, formatPercent"
    trigger: "Rendering a full distribution with dist.empty false and dist.limitedData false"
    logic: "pct(k) = Math.round(counts[k] / total * 100); text = formatPercent(pct, locale) ('60%' / '৬০%'); shown in a small element after the count; included in the aria sentence; IF compact OR limited OR empty THEN no percentage"
    violation: "A percentage without its count, or a percentage for one or two accounts, reads as a quality figure (hard rule)"
    source: "FR48, AC6.4.1, prototype distribution().pct, project.md Forbidden, Question 1 (needs the owner)"
  - id: BR3.4
    statement: "An account excerpt shows the view model's grapheme-safe excerpt and adds an ellipsis only when it was truncated."
    category: calculation
    applies_to: "AccountRow"
    trigger: "Rendering a card"
    logic: "p.excerpt = card.excerpt + (card.truncated ? '…' : '')"
    violation: "An ellipsis on a complete short text misleads the reader"
    source: "01-conventions.md §4 (Intl.Segmenter), T-201 BR3.7"
  - id: BR3.5
    statement: "Numbers use formatNumber, digit strings use formatDigits, and the treatment period and update dates use formatMonthYear, so numerals follow the active language."
    category: calculation
    applies_to: "Every component in the owned paths"
    trigger: "Rendering any number or date"
    logic: "no String(n) or template number in markup; all counts, totals and percentages through @rogikotha/i18n/format"
    violation: "Latin digits on a bn page break the equal-language hard rule (index acceptance row)"
    source: "project.md Mandated (numerals follow language), FD-024, 01-conventions.md §6"
  - id: BR3.6
    statement: "The avatar is the prototype's generated SVG, seeded by the public id and coloured by avatarHue, decorative and hidden from assistive technology."
    category: calculation
    applies_to: "Avatar"
    trigger: "Rendering a doctor or facility avatar"
    logic: "Avatar({seed: publicId, hue: avatarHue, size}) = port of rogikotha-data.js avatar() with hash = FNV-1a (stableHue's hash); svg aria-hidden true, focusable false"
    violation: "A different avatar per locale, or an announced avatar, adds noise; a photo shown without approval breaks AC4.2.4"
    source: "Prototype avatar(), T-201 BR3.8, FR19, AC4.2.4, Question 8"
  - id: BR3.7
    statement: "A card's treated conditions are at most three, each with its account count, joined by ' · '; the line is omitted when there are none."
    category: calculation
    applies_to: "DoctorEntry .doc-treats"
    trigger: "Rendering a card"
    logic: "card.topConditions.slice(0, 3).map(c => name + ' (' + formatNumber(count) + ')').join(' · '); empty -> no element"
    violation: "An empty '()' line or more than three conditions departs from the prototype"
    source: "Prototype doctorEntry, T-201 BR3.9"
  - id: BR3.8
    statement: "The hero and the 'All conditions' pill count every eligible account of the doctor; the distributions and the 'showing' line count the scoped and filtered accounts."
    category: calculation
    applies_to: "DoctorProfile"
    trigger: "Rendering a profile"
    logic: "hero badge and all-pill = vm.accountsTotal; sentiment and outcome = vm.scopedSentiment / vm.scopedOutcome; showing line = profile.showingCount {count: vm.showing, total: vm.scopedTotal}"
    violation: "Mixing scoped and unscoped totals gives denominators that do not match their numerators"
    source: "Prototype renderProfile (all, scoped, shown), T-201 WF2, AC6.4.1"

  # 4. Accessibility
  - id: BR4.1
    statement: "Each page has exactly one h1: the index's IndexHead title and the profile's doctor name; ViewShell is given an empty title."
    category: constraint
    applies_to: "Both pages, ViewShell, IndexHead, DoctorProfile"
    trigger: "Rendering a page"
    logic: "ViewShell title=''; index h1.display = nav.profile; profile h1 = vm.name"
    violation: "Two h1 elements or an empty h1 are axe findings (ISS-121 precedent)"
    source: "FR95, NFR6, ViewShell T-207a note"
  - id: BR4.2
    statement: "Headings never skip a level: index card names are h2, profile panels and the accounts heading are h2, account titles and the outcome title are h3."
    category: constraint
    applies_to: "DoctorEntry (headingLevel), DoctorProfile, AccountRow, OutcomeBlock"
    trigger: "Rendering headings"
    logic: "DoctorEntry headingLevel = 2 on the index, 3 by default; profile panels h2; rows h3; OutcomeBlock h3 inside its h2 panel"
    violation: "h1 -> h3 on the index breaks heading navigation for screen-reader users"
    source: "FR95 (semantic headings), NFR6"
  - id: BR4.3
    statement: "Each capsule group is one image with a plain-language sentence naming every count, label and the total, plus the not-provided count and, under BR3.3, the percentages."
    category: constraint
    applies_to: "DistBlock"
    trigger: "Rendering a non-empty distribution"
    logic: "div.capsules role=img aria-label = join(', ', counts and lowercased labels [with percentages]) + ' — ' + sentiment.ofTotal [+ notProvided phrase]; lowercasing uses toLocaleLowerCase(locale), a no-op in Bengali"
    violation: "A capsule group that reads as 'image' or as separate numbers fails FR95"
    source: "Prototype distBlock aria-label, T-202 step 1 and Tests, FR95"
  - id: BR4.4
    statement: "Selected pills are links with aria-current=true and a visible non-colour cue; every pill is at least 44 by 44 px."
    category: constraint
    applies_to: "Condition and filter pill rows"
    trigger: "Rendering pills"
    logic: ".pillrow a[aria-current=true] gets a CSS check mark and a heavier border on T-011 tokens; min-block-size var(--target)"
    violation: "aria-pressed on a link is an axe critical violation (aria-allowed-attr); a colour-only state fails WCAG 1.4.1"
    source: "FR95, NFR6, T-011 BR1.4 and BR3.3, Question 6"
  - id: BR4.5
    statement: "After a pill changes the filters, the new 'showing x / y' line is announced once through the existing live region and the scroll position stays."
    category: constraint
    applies_to: "ProfileFilters"
    trigger: "Client navigation caused by a pill"
    logic: "Link scroll=false; on the new vm.showing, useAnnounce()(t('profile.showingCount', ...)) once; no new live region"
    violation: "A silent result change fails WCAG 4.1.3; a jump to the top loses the reader's place"
    source: "FR95 (screen-reader-friendly controls), CR-004 (one live region)"
  - id: BR4.6
    statement: "The breakdown table has a visually hidden caption, header scopes and a labelled, focusable scroll region, so it never widens the page."
    category: constraint
    applies_to: "DoctorProfile breakdown panel"
    trigger: "Rendering the breakdown"
    logic: "div.table-scroll[role=region][tabindex=0][aria-labelledby=breakdown heading] > table.breakdown > caption.sr-only, th[scope=col], first cell th[scope=row]"
    violation: "Horizontal page overflow at 360 px fails NFR4"
    source: "NFR4, NFR6, FR95"
  - id: BR4.7
    statement: "Landmarks and groups are named: the side panel is labelled, each card group is labelled by its heading, and decorative SVG is hidden."
    category: constraint
    applies_to: "DoctorProfile aside, DoctorEntry, Avatar"
    trigger: "Rendering"
    logic: "aside.p-side aria-label = prov.title; .doc-entry role=group aria-labelledby = its heading id; svg aria-hidden"
    violation: "Unnamed groups add noise to screen-reader navigation"
    source: "FR95, NFR6"
  - id: BR4.8
    statement: "The 'Registration not verified' explanation is available without a pointer: the badge keeps its title and, on the profile hero, is described by a visually hidden copy of label.notVerifiedWhy."
    category: constraint
    applies_to: "NotVerified, DoctorProfile hero"
    trigger: "Rendering the hero"
    logic: "span.badge.warn title=label.notVerifiedWhy; hero: aria-describedby -> span.sr-only label.notVerifiedWhy"
    violation: "A title-only explanation is unreachable by keyboard and touch"
    source: "FR16, FR95"
  - id: BR4.9
    statement: "Both pages work at 360 px and at 200% zoom in both languages with no horizontal overflow, and every reading step works without script."
    category: constraint
    applies_to: "Both pages and their styles"
    trigger: "Build and Test viewport run"
    logic: "no fixed widths; long Bengali names wrap; pills wrap; links not buttons for every navigation; only the claim sheet needs script"
    violation: "Overflow or a dead control fails NFR4 and AC2.3.1"
    source: "NFR4, NFR6, AC2.3.1, 01-conventions.md §8 (works without JavaScript)"

  # 5. Motion (T-011)
  - id: BR5.1
    statement: "The pages do not wrap themselves in RouteTransition while the patient layout renders it; if T-011 fell back to per-page wrappers, each page wraps itself exactly once."
    category: constraint
    applies_to: "Both pages"
    trigger: "Code Generation reads (patient)/layout.tsx"
    logic: "IF layout renders RouteTransition THEN pages add none ELSE each page returns RouteTransition > ViewShell"
    violation: "Two elements named page make the browser skip every route transition (T-011 BR7.3)"
    source: "T-011 Q4 A and D5, T-202 step 9 (superseded wording)"
  - id: BR5.2
    statement: "Reveal wraps the index list and the profile's account list only; it never wraps the hero, a distribution, the breakdown, the side panel or EmergencyPanel."
    category: constraint
    applies_to: "DoctorIndex, DoctorProfile"
    trigger: "Rendering lists"
    logic: "Reveal as=div className=index-list > DoctorEntry*; Reveal as=div > AccountRow*"
    violation: "A revealed static block breaks T-011 BR7.4; a revealed distribution breaks BR6.10"
    source: "T-011 BR6.2, BR7.4, BR6.10, T-202 step 9"
  - id: BR5.3
    statement: "No motion targets the 'Registration not verified' badge or any hard-rule wording on its own; it moves only with its card or page and is visible in every frame its doctor's name is visible."
    category: policy
    applies_to: "NotVerified, DoctorEntry, DoctorProfile"
    trigger: "Any motion"
    logic: "no animation, transition or delay selector names .badge.warn or .p-flags; the badge is in the same element tree as the name"
    violation: "A badge that appears after the name, or pulses, treats the hard-rule wording as decoration"
    source: "T-202 step 9, AC2.4.4, Question 11"
  - id: BR5.4
    statement: "T-202 adds no motion declaration: no transition, animation, keyframes, @starting-style or view-transition rule in its section of patient.css."
    category: constraint
    applies_to: "T-202's section of patient.css"
    trigger: "pnpm check:motion"
    logic: "IF the T-202 section holds any motion declaration THEN check:motion M6-file fails; a needed primitive is asked of U45 through an ISSUES.md row"
    violation: "check:motion fails (red check, S1 for the Unit)"
    source: "T-011 BR4.7 and BR9.1, T-202 FD-091 amendment, Question 12"
  - id: BR5.5
    statement: "EmergencyPanel carries the static group data-static='emergency', is never inside Reveal, and appears at most once per page."
    category: constraint
    applies_to: "EmergencyPanel"
    trigger: "Any page that renders it (T-203, T-207)"
    logic: "section.panel.emergency-panel[data-static=emergency]; one per page"
    violation: "An animated or covered emergency block fails AC2.4.4; two static names on a page skip the route transition"
    source: "project.md Mandated (emergency guidance), T-011 BR7.1–BR7.3, AC2.4.4"
  - id: BR5.6
    statement: "With reduced motion, from the operating system or the in-app switch, every step on both pages completes with no movement."
    category: constraint
    applies_to: "Both pages"
    trigger: "Reduced-motion journey"
    logic: "all motion comes from T-011's guarded primitives; nothing in T-202 depends on an animation event"
    violation: "A step that waits for an animation end fails AC2.4.3"
    source: "AC2.4.3, T-011 BR5.4 and BR5.5"

  # 6. Language
  - id: BR6.1
    statement: "Every user-facing string comes from packages/i18n keys; each new key is added to en.json and bn.json in the same commit and its Bengali text is flagged for the owner's review."
    category: constraint
    applies_to: "Every component in the owned paths, packages/i18n/messages"
    trigger: "Code Generation"
    logic: "no literal copy in JSX or server code; no state.lang === 'bn' or locale === 'bn' ternary for copy; new keys listed in the hand-off with an FD-042 flag"
    violation: "A hard-coded string or a key without Bengali breaks the build and the hard rule"
    source: "project.md Mandated and Forbidden (i18n), ADR 0011, FD-024, FD-042, 01-conventions.md §6"
  - id: BR6.2
    statement: "Count phrases come from one key with parameters, with an English plural form; the visible number is passed pre-formatted."
    category: constraint
    applies_to: "sentiment.ofTotal, sentiment.totalAccounts, profile.accountsCount, label.documentsCount, profile.showingCount, label.notProvidedCount"
    trigger: "Rendering any count phrase"
    logic: "t(key, {n: number, count: formatNumber(n, locale), total: formatNumber(total, locale)}); English messages use {n, plural, one {...} other {...}} around {count}"
    violation: "'1 documents' or a Bengali postposition before its number misrenders the copy (S3)"
    source: "01-conventions.md §6 (count keys), Question 5"
  - id: BR6.3
    statement: "No capital-letter transform reaches Bengali text: kicker and table-header uppercase stays Latin-only, and no script lowercases or uppercases copy except the aria sentence's label lowercasing, which is a no-op in Bengali."
    category: constraint
    applies_to: "T-202's styles, DistBlock aria sentence"
    trigger: "Rendering in bn"
    logic: "every uppercase or letter-spacing rule in T-202's section has a :lang(bn) reset; check:motion M8-bangla passes"
    violation: "A capital transform on Bengali breaks the hard rule"
    source: "project.md Mandated (no capital-letter transform in Bengali), T-011 BR2.2"

  # 7. Styling
  - id: BR7.1
    statement: "Pages use T-011's tokens and class names; new rules live in T-202's own section of patient.css, each marked '/* added: T-202 <reason> */'; the only inline styles are the prototype's custom properties --g and --w."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-202 section), every component"
    trigger: "Code Generation and review"
    logic: "IF a rule uses a literal colour, an unlisted class, or edits tokens.css, motion.css or the shell styles THEN rejected; style attributes other than --g / --w are rejected"
    violation: "A look outside FD-091 fails the visual row; a token edit outside the Unit breaks T-011's ownership"
    source: "FD-091, FD-032, T-202 FD-091 amendment, project.md Code Style, T-502 step 1 (style-src)"

  # 8. Shared primitives and the claim entry
  - id: BR8.1
    statement: "The shared primitives are server components that take view models and plain values as props, fetch nothing and keep the prototype's class names; only ProfileFilters and ClaimSheet are client components."
    category: constraint
    applies_to: "components/patient/shared/*, DoctorEntry, DoctorIndex, DoctorProfile"
    trigger: "Code Generation"
    logic: "no 'use client' in primitives; slots (ReactNode) instead of callbacks (DoctorEntry pinSlot); EmergencyPanel takes config as a prop"
    violation: "A callback prop forces a primitive to the client and breaks server rendering for T-203, T-206, T-207 and T-307"
    source: "01-conventions.md §8 (server by default), T-202 step 1 (primitives are the contract), C7"
  - id: BR8.2
    statement: "'Is this you?' runs through the T-102 gate: a signed-out or unverified visitor sees the gate sheet; a verified visitor sees the claim sheet with the prototype's note and no form until T-204."
    category: authorization
    applies_to: "ClaimSheet, DoctorProfile hero"
    trigger: "Activating #claim"
    logic: "onClick = useAuthGate().guard(() => open ClaimSheet); ClaimSheet = Sheet(title profile.claimThis) > p profile.claimNote; // TODO(T-204) marks the form slot"
    violation: "A claim control that skips the gate departs from STORY-AUTH-001; a dead form invents copy T-204 replaces"
    source: "Prototype #claim handler, T-102 step 9, T-204 owned paths (ClaimSheet), FD-060, AC4.2.1, Question 9"

  # 9. Verification and records
  - id: BR9.1
    statement: "Component tests render every primitive and both pages in en and bn with builders for the view models, and assert the hard-rule behaviour named in § 11 of the spec."
    category: constraint
    applies_to: "apps/web/src/components/patient/**/*.test.tsx"
    trigger: "Code Generation"
    logic: "Vitest + Testing Library + jsdom; next-intl provider with both dictionaries; @/i18n/routing mocked (ISS-053); no snapshot; no class-name assertions except the task's '.cap > b' DOM check"
    violation: "A missing locale or hard-rule test fails G2"
    source: "01-conventions.md §10, team.md Testing Posture, T-202 Tests to write"
  - id: BR9.2
    statement: "The Unit adds at least one smoke assertion: the doctor index renders every card with the 'Registration not verified' badge, and a profile renders its sections in the prototype's order."
    category: constraint
    applies_to: "doctors.smoke.test.tsx"
    trigger: "pnpm smoke"
    logic: "builder data for 10 doctors; assert 10 entries, 10 badges, alphabetical order; one profile: headings in order"
    violation: "No new smoke assertion breaks the cumulative-suite rule"
    source: "team.md Testing Posture (cumulative smoke)"
  - id: BR9.3
    statement: "Before done: pnpm check, pnpm smoke, pnpm check:motion, pnpm contrast, pnpm contrast:patient and npx impeccable detect apps/web/src --no-advisory are clean, and the throttled Lighthouse run on the profile is recorded."
    category: constraint
    applies_to: "The Unit"
    trigger: "Build and Test"
    logic: "all exit 0; LCP and CLS of /en and /bn doctor profile recorded; a miss is an ISSUES.md row before the next UI Unit"
    violation: "A red gate blocks the merge"
    source: "team.md Way of Working steps 2-3 and Testing Posture, T-202 acceptance rows, NFR13"
  - id: BR9.4
    statement: "Every finding, workaround, assumption and owned-path addition of this Unit is an ISSUES.md row linked to U15, and the Build and Test record lists them."
    category: constraint
    applies_to: "docs/implementation/ISSUES.md, the Unit's records"
    trigger: "Any finding"
    logic: "rows proposed in functional-spec.md § 9 are added with Found in U15 T-202; ISS-268's rendering check is run and its status set"
    violation: "An unrecorded deviation breaks the project rule on ISS rows"
    source: "project.md Mandated (ISS rows), team.md Way of Working, ISS-268"
```
