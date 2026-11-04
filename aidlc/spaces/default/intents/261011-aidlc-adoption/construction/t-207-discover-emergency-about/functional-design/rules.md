# Business rules — U20 `t-207-discover-emergency-about`

The YAML block below is the source of truth. The table after it is a summary. Question numbers refer to `functional-design-questions.md`.

```yaml
rules:
  - id: BR1.1
    statement: "The home reads its data only through U46's module queries and the ConfigProvider; it makes no server/data demo read."
    category: constraint
    applies_to: "app/[locale]/(patient)/page.tsx"
    trigger: "A request for /{locale}"
    logic: "IF the home needs conditions, facilities, latest accounts or emergency numbers THEN it calls taxonomy.listConditions(), directory.listFacilities({page: 1, pageSize: 3}), review.listExperienceCards({limit: 4}) and ConfigProvider.current() once each, in parallel"
    violation: "A demo read or a second data path on the front door; the reviewer rejects the diff"
    source: "unit-of-work.md U20, C6, C7, C9, C18, Question 10"
  - id: BR1.2
    statement: "Topic chips are up to five conditions with at least one account, ordered by most accounts, then by name in the active language; each links to its topic page."
    category: calculation
    applies_to: "Home chips"
    trigger: "Rendering the opener"
    logic: "IF accountsTotal > 0 THEN eligible; sort by accountsTotal descending, then name by the locale collator; take 5; href /topics/{publicId}. IF none are eligible THEN the chip list is left out"
    violation: "An empty topic, or an order that is not one the hard rule allows"
    source: "project.md Mandated (neutral order), Question 3"
  - id: BR1.3
    statement: "The browse grid lists every condition with at least one account, in the query's order (by name), and leaves out the ones with none."
    category: calculation
    applies_to: "Home browse grid"
    trigger: "Rendering the browse section"
    logic: "IF accountsTotal > 0 THEN show a BrowseCard linking to /topics/{publicId} with the count phrase; IF the filtered list is empty THEN leave the section out, heading included"
    violation: "A zero card, or a reordered grid"
    source: "prototype renderDiscover (byCondition filter), project.md Mandated (neutral order)"
  - id: BR1.4
    statement: "The facility teaser shows the first three branches of the facility index in the index's order, under the separation sentence."
    category: constraint
    applies_to: "Home facility panel"
    trigger: "Rendering the facility panel"
    logic: "Rows are listFacilities page 1, pageSize 3, unchanged in order; IF the list is empty THEN leave the panel out"
    violation: "Reordering by a figure"
    source: "prototype renderDiscover, U46 WF5, project.md Forbidden (no highest rated sort)"
  - id: BR1.5
    statement: "The latest section shows the four newest published accounts as AccountRows; with none it shows discover.latestEmpty."
    category: constraint
    applies_to: "Home latest section"
    trigger: "Rendering the latest section"
    logic: "IF cards.length > 0 THEN render them in the query's order (newest first) ELSE render the empty state"
    violation: "Older accounts first, or a blank section"
    source: "prototype renderDiscover, U46 WF12, Question 10"
  - id: BR1.6
    statement: "A failed list query leaves out only its own section and is logged; the opener, browse links and emergency panel always render."
    category: policy
    applies_to: "app/[locale]/(patient)/page.tsx"
    trigger: "A list query returns err or throws"
    logic: "IF a list result is not ok THEN log discover.section_unavailable {section, correlationId} through the logger port and omit that section with its heading; the configuration read is unguarded in release 1 (defaults-only provider; a throw is a programmer error); BR6.3 records the S4 row that makes the home and /emergency fall back to DEFAULT_CONFIG_VALUES.emergency once live configuration arrives (T-105, release 2)"
    violation: "The front door replaced by the error page, or a silent omission"
    source: "Question 6, construction.md Error Handling"
  - id: BR2.1
    statement: "No number stands for quality on these pages: only counts of accounts, no percentage, score, rating or rated sort."
    category: constraint
    applies_to: "Home, Emergency, About, Terms, Privacy"
    trigger: "Any rendered figure"
    logic: "IF a figure is shown THEN it is a count with its phrase; never a percentage, average, star or rank"
    violation: "Hard-rule breach (S1)"
    source: "project.md Forbidden (no quality number, no highest rated sort), FD-106"
  - id: BR2.2
    statement: "A missing or zero value is said in words, never 0."
    category: validation
    applies_to: "Teaser rows, latest rows"
    trigger: "A count of 0 or an absent field"
    logic: "IF a teaser branch has accountsTotal 0 THEN show facility.noVisits; IF an account has no documents THEN AccountRow shows label.noDocuments"
    violation: "A rendered 0 (S1)"
    source: "project.md Forbidden (missing as 0), Mandated (Not provided / No documents)"
  - id: BR2.3
    statement: "Teaser rows carry the Limited data tag when accountsLimitedData; with facility feedback hidden they show type and place only."
    category: policy
    applies_to: "Home facility panel"
    trigger: "Rendering a teaser row"
    logic: "IF feedbackVisible AND accountsLimitedData THEN the U20-owned TeaserRow wrapper renders a label.limitedData tag next to the MiniRow (U46's MiniRow is not edited); IF NOT feedbackVisible THEN no count and no tag"
    violation: "A sparse count shown without its mark"
    source: "project.md Mandated (Limited data), Question 4, U46 BR2.12"
  - id: BR2.4
    statement: "The teaser keeps facility figures apart from doctor figures."
    category: constraint
    applies_to: "Home facility panel, browse grid"
    trigger: "Rendering both sections"
    logic: "The panel carries facility.separation; teaser rows show facility visit counts only; browse cards show doctor-account counts only (U46 counts them apart)"
    violation: "Facility feedback presented as part of a topic or doctor figure"
    source: "project.md Forbidden (facility feedback in doctor aggregates), AC4.3.3, U46 BR2.6"
  - id: BR2.5
    statement: "The persistent disclaimer and the demo marker stay: the home's editorial note is a static disclaimer group, and the layout's disclaimer and marker are untouched."
    category: policy
    applies_to: "Home opener, patient layout"
    trigger: "Every render"
    logic: "aside.margin-note[data-static=disclaimer] with disclaimer.short; this Unit does not edit the layout, Masthead or Colophon"
    violation: "Disclaimer or marker missing or animated"
    source: "project.md Mandated (disclaimer, demo marker), AC2.4.4"
  - id: BR2.6
    statement: "Emergency guidance (999, 16263, crisis line, last verified) shows on the home directly after the opener and on /emergency, from ConfigProvider.current().emergency, without sign-in, never animated and never blocking."
    category: policy
    applies_to: "Shared EmergencyPanel on the home, Emergency page"
    trigger: "Rendering either page"
    logic: "Numbers and lastVerified come from the provider; each line is a tel: link; the panel is data-static=emergency (the Emergency page is #view-emergency); no reveal, transition or hover lift on it; no flow redirects to it or waits on it"
    violation: "Guidance missing, stale, animated or gating (S1)"
    source: "project.md Mandated (emergency guidance), FD-046, C18, AC12.1.5, AC2.4.4"
  - id: BR2.7
    statement: "An anonymous author is never named on the home."
    category: authorization
    applies_to: "Home latest section"
    trigger: "Rendering an AccountRow"
    logic: "AccountRow reads BylineVM; IF personaKind is anonymous THEN no name, initials or link"
    violation: "Identity leak in a public projection (S1)"
    source: "project.md Forbidden (identity in a public projection), ADR-0008, U46 AccountRow"
  - id: BR2.8
    statement: "The lawful-access section appears on Terms and on Privacy and nowhere else, never as a banner; its keys are referenced only from Policy.tsx."
    category: policy
    applies_to: "Policy.tsx, every other page"
    trigger: "Rendering any page"
    logic: "TERMS_SECTIONS gains the policy.privacy.lawful section last; PRIVACY_SECTIONS keeps it; the placement test asserts presence on /terms and /privacy and absence from /, /about and /emergency; the FD row is appended before code"
    violation: "The sentence elsewhere, or missing from either legal page"
    source: "FD-008, FD-022, Question 1 (the owner's answer)"
  - id: BR3.1
    statement: "Every new string has an en and a bn entry with the same key, added in one commit."
    category: validation
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Adding a key"
    logic: "IF a key lacks either language THEN pnpm i18n:check fails the build; new keys: discover.browseAll, discover.browseFacilities, discover.browseTopics, emergview.bmdcShort, notFound.body, notFound.home; reused plural key for browse-card counts: profile.experienceCount {n, count}"
    violation: "Red gate"
    source: "project.md Mandated (both languages), AC12.1.4"
  - id: BR3.2
    statement: "Numerals and dates follow the active language through the i18n formatters; Bengali gets no capital-letter transform."
    category: calculation
    applies_to: "All five pages, the 404 pages"
    trigger: "Rendering a count, phone number, step figure or date"
    logic: "Counts use formatNumber; phone numbers and the 01-03 step figures use formatDigits; dates use formatDate; no text-transform rule applies under :lang(bn)"
    violation: "Latin digits in bn, or an uppercased Bengali string"
    source: "project.md Mandated (equal languages, numerals), FD-024"
  - id: BR3.3
    statement: "No user-facing literal stays in these components; BMDC becomes a key and the root 404 reads the dictionaries."
    category: constraint
    applies_to: "Emergency.tsx, app/not-found.tsx"
    trigger: "Code Generation"
    logic: "Replace the BMDC literal with emergview.bmdcShort; the root fallback calls getTranslations({locale}) for en and bn"
    violation: "Hard-coded string"
    source: "project.md Forbidden (hard-coded strings), Questions 8 and 9"
  - id: BR4.1
    statement: "Each page has exactly one h1, landmarks from the layout, the lists U20 owns marked as lists, and visible focus on every link."
    category: validation
    applies_to: "Home, Emergency, About, Terms, Privacy, patient 404"
    trigger: "Rendering"
    logic: "Home h1 = hero.title in the opener (closes ISS-152); the U20-owned lists are the browse links ul, chips ul, browse grid ul and how-it-works ol (U46's MiniList and the latest Reveal are not U20's markup); the browse-links nav is named by discover.browseAll; tel: links name the label and the number; focus from --focus-ring; targets at least --target"
    violation: "A missing or second h1, an unnamed call link, or an invisible focus"
    source: "AC12.1.6, ISS-152, T-011 tokens"
  - id: BR4.2
    statement: "Unknown or missing patient URLs render a localized 404 inside the patient chrome with status 404; paths outside a locale get a bilingual fallback with no inline style."
    category: policy
    applies_to: "app/[locale]/(patient)/not-found.tsx, [...rest]/page.tsx, app/not-found.tsx"
    trigger: "notFound() or an unmatched path"
    logic: "The patient 404 shows errors.common.notFound, notFound.body, links home and to /emergency, with the layout's lang; the catch-all calls notFound(); the root fallback renders both languages with lang on each line"
    violation: "An English-only 404 under /bn (ISS-120)"
    source: "Question 8, ISS-120"
  - id: BR5.1
    statement: "The look is T-011's: plain CSS with tokens in a U20 section of patient.css, each rule marked /* added: U20 reason */; no inline style remains in this Unit's files."
    category: constraint
    applies_to: "Home, Emergency, patient.css"
    trigger: "Code Generation"
    logic: "Emergency's note margin becomes .emerg-note; the home panel's inline styles go with home/EmergencyPanel (the shared panel uses .emergency-panel); no edit to tokens.css, motion.css or T-011's token block"
    violation: "Inline style, new library or token edit"
    source: "FD-091, FD-032, project.md Code Style, AC2.4.1"
  - id: BR5.2
    statement: "Motion comes only from T-011: the layout's route transition, .reveal hooks below the emergency panel, and the merged Reveal on the latest list; the opener, disclaimer and emergency guidance never move."
    category: policy
    applies_to: "Home and the four Half A pages"
    trigger: "Rendering and navigation"
    logic: "li.reveal per how-it-works step; .reveal on the browse grid and the facility panel blocks; Reveal (cap 6) on the latest list; no page wraps itself in RouteTransition; reduced motion turns all of it off (T-011)"
    violation: "An animated LCP heading, emergency panel or disclaimer, or a doubled entry animation"
    source: "Question 5, AC2.4.2, AC2.4.3, AC2.4.4, AC2.4.6"
  - id: BR6.1
    statement: "The Unit edits only its owned paths and the recorded additions, and removes superseded code only when nothing imports it."
    category: constraint
    applies_to: "Code Generation"
    trigger: "Each file change"
    logic: "Delete home/ExperienceRow(.test).tsx, home/EmergencyPanel.tsx, home/format.ts only IF grep finds no importer after the U46 rebase; delete view-models/discover.ts and its barrel line; U46's shared primitives are used, not edited"
    violation: "A collision with U47 or U46 files; a broken import"
    source: "team.md Way of Working (owned paths), Questions 7 and 10"
  - id: BR6.2
    statement: "Tests cover both languages in describe.each(['en','bn']), add a smoke assertion, and keep pnpm check and pnpm smoke green with the 80% floor."
    category: validation
    applies_to: "Tests of the five pages, the 404s"
    trigger: "Build and Test"
    logic: "Every component and page test runs per locale, so -t bn selects the Bengali set (closes ISS-151); the home smoke asserts h1, emergency numbers and browse links in both locales"
    violation: "Red gate or missing locale"
    source: "team.md Testing Posture, ISS-151"
  - id: BR6.3
    statement: "Carried and found issues are recorded: ISS-120, ISS-151, ISS-152 and ISS-171 close with U20; release-2 debt gets S4 rows."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Build and Test"
    logic: "Close the four rows naming U20; add S4 rows for emergency.body's fixed numbers (parameterise with T-105), for the T-105 dependency (once live configuration arrives in release 2, the home and /emergency fall back to DEFAULT_CONFIG_VALUES.emergency instead of failing), and for the patient catch-all also answering unknown /{locale}/admin/* paths"
    violation: "An untracked workaround"
    source: "project.md Mandated (ISS rows), C18"
```

## Summary

| ID | Rule in short | Category |
|---|---|---|
| BR1.1 | Home reads U46 queries and ConfigProvider only | constraint |
| BR1.2 | Chips: up to 5 topics with accounts, most accounts then name, link to topic | calculation |
| BR1.3 | Browse grid: topics with accounts, by name | calculation |
| BR1.4 | Teaser: first 3 of the facility index, index order | constraint |
| BR1.5 | Latest: 4 newest AccountRows or the empty state | constraint |
| BR1.6 | Failed list omits its section and logs it | policy |
| BR2.1 | Counts only, no quality number | constraint |
| BR2.2 | Zero and missing in words | validation |
| BR2.3 | Limited data tag; hidden feedback shows no figure | policy |
| BR2.4 | Facility figures kept apart | constraint |
| BR2.5 | Disclaimer and demo marker stay | policy |
| BR2.6 | Emergency guidance configured, static, non-blocking | policy |
| BR2.7 | Anonymous authors never named | authorization |
| BR2.8 | Lawful-access section on Terms and Privacy only | policy |
| BR3.1 | en and bn for every key | validation |
| BR3.2 | Numerals and dates by locale | calculation |
| BR3.3 | No literals (BMDC, root 404) | constraint |
| BR4.1 | One h1, U20-owned lists, focus | validation |
| BR4.2 | Localized 404 and catch-all | policy |
| BR5.1 | T-011 look, no inline styles | constraint |
| BR5.2 | T-011 motion; safety texts static | policy |
| BR6.1 | Owned paths; safe deletions | constraint |
| BR6.2 | Both-locale tests, smoke, gate | validation |
| BR6.3 | ISS rows closed and added | policy |
