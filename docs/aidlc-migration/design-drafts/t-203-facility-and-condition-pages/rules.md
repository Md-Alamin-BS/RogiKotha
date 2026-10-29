# Business rules — U16 `t-203-facility-and-condition-pages`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U16), `unit-of-work-story-map.md` (US4.3, US5.3, US6.4), `requirements.md` (FR24–FR27, FR36–FR38, FR48–FR52, FR95, FR100, NFR4, NFR6, NFR7, NFR13), `stories.md`, `contract-summary.md` (C6, C7), T-203 with its FD-091 amendment, the hard rules in `project.md` and `PRODUCT.md`, `01-conventions.md` §6–§9 and §14, and the three upstream drafts (`t-201-directory-and-taxonomy-modules`, `t-202-doctor-index-and-profile`, `t-011-patient-design-and-motion-system`). The workflows that apply these rules are in `functional-spec.md`, the component contracts in `frontend-components.md`, and the data shapes in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Questions 2–15 are answered A on the owner's standing instruction and await confirmation; **Question 1 needs the owner** and changes no rule below under its options A and C (option B adds a sentiment block, `functional-spec.md` § 14). "T-202 Qn" names a question of the T-202 draft whose answer these pages inherit.

```yaml
rules:
  # 1. Routing, loading and freshness
  - id: BR1.1
    statement: "Pages read facilities and conditions only through the directory and taxonomy queries wired in the web composition root; components receive view models and plain values as props and never import database, adapters, test-support, server/container or node: modules."
    category: constraint
    applies_to: "facilities/page.tsx, facilities/[publicId]/page.tsx, topics/page.tsx, topics/[publicId]/page.tsx, every component in the owned paths"
    trigger: "Any data a page renders"
    logic: "page -> container -> directory.listFacilities | directory.getFacility | directory.resolvePublicId(kind facility) | taxonomy.listConditions | taxonomy.getCondition | taxonomy.resolvePublicId -> view model -> components; a component import of @rogikotha/database, @rogikotha/adapters, @rogikotha/test-support, server/container or node:* is forbidden"
    violation: "A boundary import fails T-010's boundaries lint (FD-093) and the reviewer's diff check"
    source: "01-conventions.md §2 and §8, FD-093, team.md Code Style (Boundaries), C6, C7"
  - id: BR1.2
    statement: "The facility and condition segments hold a public id with an optional trailing slug; a malformed id is a 404, the slug is ignored, and every link the app writes has no slug."
    category: validation
    applies_to: "facilities/[publicId]/page.tsx, topics/[publicId]/page.tsx, FacilityLink, ConditionLink, BrowseCard hrefs"
    trigger: "A request to /{locale}/facilities/{segment} or /{locale}/topics/{segment}"
    logic: "parseSegment (T-202 BR1.2, shared under Question 11): match ^([a-z2-7]{10})(?:-[^/]*)?$; no match -> notFound(); match -> publicId = group 1"
    violation: "A slugged URL that 404s, or a 500 on a malformed id (S1, red demo)"
    source: "01-conventions.md §9, 03-routes-and-contracts.md §1, T-202 BR1.2, Question 11"
  - id: BR1.3
    statement: "Before loading a facility the page resolves its public id; a merged or old id answers a permanent redirect (308) to the current branch under the same locale."
    category: constraint
    applies_to: "facilities/[publicId]/page.tsx"
    trigger: "Every facility request"
    logic: "r = directory.resolvePublicId({kind: facility, publicId}); not_found -> notFound(); r.redirected -> permanentRedirect('/{locale}/facilities/' + r.publicId); else load"
    violation: "An old facility URL that 404s after a merge (FR23 applies to facility profiles too)"
    source: "FR23, T-201 BR1.7 and WF10, T-202 Question 10 A"
  - id: BR1.4
    statement: "Before loading a condition the page resolves its public id; a term mapped to a canonical term answers a permanent redirect (308) to the canonical page; a hidden term is a 404."
    category: constraint
    applies_to: "topics/[publicId]/page.tsx"
    trigger: "Every condition request"
    logic: "r = taxonomy.resolvePublicId({publicId}); not_found -> notFound(); r.redirected -> permanentRedirect('/{locale}/topics/' + r.publicId); else getCondition"
    violation: "Clicking a mapped alias that does not open its canonical page fails AC5.3.3 and AC5.3.4"
    source: "FR37, FR38, AC5.3.3, AC5.3.4, T-201 BR1.6, BR1.7, BR4.6"
  - id: BR1.5
    statement: "A facility branch that is missing, unpublished, or whose organisation is unpublished, and a condition term that is missing, hidden or not a condition, render the 404 page; no part of the page is shown."
    category: constraint
    applies_to: "facilities/[publicId]/page.tsx, topics/[publicId]/page.tsx and their generateMetadata"
    trigger: "getFacility or getCondition returns not_found"
    logic: "IF result.ok = false AND error.code = not_found THEN notFound() before any markup"
    violation: "A non-public branch or term on a public page is an S1"
    source: "FR24, 01-conventions.md §9, T-201 BR1.2 and BR4.6"
  - id: BR1.6
    statement: "All four pages render per request; no figure is cached between requests, so hiding, deleting or restoring an account changes the figures on the next view."
    category: constraint
    applies_to: "All four pages"
    trigger: "Any request"
    logic: "no export const revalidate, no 'use cache', no static generation; the pages read cookies, headers and params, which keeps them dynamic"
    violation: "A stale count after a hide or restore fails AC6.4.4"
    source: "FR50, AC6.4.4, T-202 BR1.7"
  - id: BR1.7
    statement: "Each page sets its metadata from the data it renders: the indexes are titled with nav.facilities and nav.condition, the facility page with its label, the condition page with its name, each followed by the brand; all four are indexable with a canonical URL without slug and with language alternates."
    category: policy
    applies_to: "generateMetadata of the four pages"
    trigger: "Page render"
    logic: "facilities: documentTitle('facilities', t); topics: documentTitle('topics', t); facility: facilityLabel(vm) + ' — ' + brand.name; condition: vm.name + ' — ' + brand.name; robots index; alternates.canonical = /{locale}/{facilities|topics}[/{publicId}]; alternates.languages en and bn"
    violation: "A placeholder title departs from titleForView; a slugged canonical splits search indexing"
    source: "01-conventions.md §8 and §9, prototype titleForView (facilities, facility, topics, condition), T-203 step 7"
  - id: BR1.8
    statement: "A detail page loads once per request: generateMetadata and the page share one cached loader keyed by locale and public id."
    category: constraint
    applies_to: "facilities/[publicId]/page.tsx, topics/[publicId]/page.tsx"
    trigger: "Every detail request"
    logic: "load = cache(async (locale, publicId) => ...); both callers use it"
    violation: "Two query runs per view double the database work"
    source: "T-202 BR1.9, T-201 BR3.10"

  # 2. Hard rules in what the pages render
  - id: BR2.1
    statement: "No number stands for quality: the pages show exact counts with their denominators and no star, score, rating, rank, average, percentage or 'highest rated' order; no control sorts by sentiment, outcome or criteria."
    category: policy
    applies_to: "Every component in the owned paths"
    trigger: "Code Generation and the reviewer's diff check"
    logic: "IF markup, copy or a sort derives one quality figure from accounts THEN it is forbidden; no percentage text is rendered anywhere (the owner's answer to T-202 Question 1)"
    violation: "Any such figure is an S1 against the hard rule"
    source: "project.md Forbidden (number for quality, highest-rated sort), FR48, FR52, AC6.4.1, AC6.4.5, OWNER-REVIEW-QUEUE 2026-10-28 (T-202 Q1 = B)"
  - id: BR2.2
    statement: "A facility page's figures come only from the facility's own feedback: the criteria distributions and the visit rows of FacilityProfileVM; no facility component renders a sentiment or outcome distribution, and the doctors-here rows carry no figure."
    category: constraint
    applies_to: "FacilityProfile, FacilityEntry, FacilityAccountRow, FacilityIndex"
    trigger: "Rendering any facility"
    logic: "facility components import DistBlock with prefix 'crit.' only and never SentimentBlock or OutcomeBlock; the doctorsHere MiniRows show name and specialty only; IF a facility component renders a doctor figure or a sentiment distribution THEN the build is refused by the component test"
    violation: "A doctor figure on a facility page, or facility figures beside doctor figures, mixes the two feedback kinds (S1)"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, FR49, AC4.3.1, AC4.3.3, AC6.4.3, T-203 hard-rule checklist, T-201 BR2.7"
  - id: BR2.3
    statement: "The condition page's sentiment, outcome, counts and lists come only from ConditionPageVM, which T-201 builds from eligible doctor reviews; its facilities panel is a reference list with names and types only, and no facility feedback is read or shown on it."
    category: constraint
    applies_to: "ConditionPage, PlacesPanel, FreqList"
    trigger: "Rendering a condition"
    logic: "every figure on the page is a field of ConditionPageVM; the facilities MiniRows show label and type only; no facility criterion appears on a condition page"
    violation: "Facility feedback counted in a condition's or a doctor's summary is an S1; the query-level test 'never enters doctor' (T-201 BR2.6) fails"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, AC4.3.3, AC6.4.3, T-201 BR2.6"
  - id: BR2.4
    statement: "Every branch page shows the separation sentence facility.separation in bold in a warning callout directly under the hero, whatever the data."
    category: policy
    applies_to: "FacilityProfile"
    trigger: "Rendering any facility page, feedback visible or not"
    logic: "div.callout.warn.facility-sep > b {facility.separation} is the second block of the page; it is not conditional and not inside Reveal"
    violation: "A branch page without the sentence fails the task row 'Facility separation callout' and storyboard step 5"
    source: "T-203 step 3.2 and acceptance row, prototype renderFacility, FR26, 05-demo-storyboard.md step 5"
  - id: BR2.5
    statement: "Every facility card and the facility hero carry the 'Not verified' badge, unconditionally, with its explanation available without a pointer."
    category: policy
    applies_to: "FacilityEntry, FacilityProfile hero"
    trigger: "Rendering any facility"
    logic: "render span.badge.warn[title=facility.notVerifiedWhy] {facility.notVerified} whenever a facility renders; on the profile also a visually hidden sentence referenced by aria-describedby; it reads vm.notVerified (always true) and no column"
    violation: "A facility without the mark fails FR25 and AC4.3.2 (S2)"
    source: "FR25, AC4.3.2, T-201 BR2.5, Question 2"
  - id: BR2.6
    statement: "An empty distribution renders 'Not provided' and never a 0 count; a distribution with some accounts missing a value adds 'Not provided: n'."
    category: validation
    applies_to: "Each criterion in the criteria grid, the facility card's overall distribution, the condition page's sentiment and outcome"
    trigger: "dist.empty, or dist.notProvided > 0"
    logic: "empty -> label.notProvided only (T-202 BR2.2); not empty AND notProvided > 0 -> label.notProvidedCount {count} under the denominator (T-202 BR2.3)"
    violation: "'0 good' on an unanswered criterion is an S1 (hard rule); AC4.3.5 fails"
    source: "project.md Mandated and Forbidden (Not provided, never 0), FR51, AC4.3.5, AC6.4.2, T-202 Question 2"
  - id: BR2.7
    statement: "'Limited data' shows wherever eligible accounts or a distribution's values are below the configured threshold: a badge on the facility card, in the facility hero and in the condition head; one panel line on the criteria panel; a short tag on each limited criterion; the full line on the condition page's distributions."
    category: policy
    applies_to: "FacilityEntry, FacilityProfile (hero, criteria panel, each criterion), ConditionPage (head, SentimentBlock, OutcomeBlock)"
    trigger: "vm.accountsLimitedData or dist.limitedData is true"
    logic: "card and hero and condition head: Badge plain label.limitedData when accountsLimitedData; criteria panel: p.limited 'label.limitedData — label.limitedDataWhy {threshold}' once when accountsLimitedData; each criterion with dist.limitedData: span.limited-tag label.limitedData after its denominator, plus the why line when the facility itself is not limited; condition distributions: T-202 DistBlock and OutcomeBlock behaviour"
    violation: "Sparse figures without the mark break the hard rule (S1); on the seed every facility and nine of ten conditions are limited"
    source: "project.md Mandated (Limited data), FR51, AC4.3.5, AC6.4.2, T-201 BR2.4, T-202 Question 3, Question 4"
  - id: BR2.8
    statement: "The limited-data explanation states the configured threshold, read once per request from ConfigProvider and formatted for the locale."
    category: calculation
    applies_to: "label.limitedDataWhy wherever these pages render it"
    trigger: "A page renders a limited-data explanation"
    logic: "threshold = config.current().limitedDataThreshold; t('label.limitedDataWhy', {threshold: formatNumber(threshold, locale)}); no literal number in copy or code"
    violation: "Copy that names 5 after a Super Admin changed the setting misinforms the reader (S3)"
    source: "project.md Mandated (configured threshold), FR100, T-202 Question 4"
  - id: BR2.9
    statement: "A missing value is never blank and never 0: a facility account without an overall gets the badge 'Not provided'; a place without a hospital reads 'Not provided' in the unknown style; missing area, city, specialty or branch parts are left out of their line."
    category: validation
    applies_to: "FacilityAccountRow, PlacesPanel, FacilityEntry, FacilityProfile, ConditionPage mini rows"
    trigger: "An optional field is absent in the view model"
    logic: "overall absent -> Badge plain label.notProvided; place.hospital absent -> span.pl-name.pl-unk label.notProvided; line parts joined with their separators only from present parts; an absent field is never rendered as 0 or ''"
    violation: "A blank hospital or a '0' for a missing value breaks the hard rule (S1)"
    source: "project.md Mandated and Forbidden (Not provided), FR51, T-203 acceptance row 'Places sorted, unknown hospital', T-201 BR3.6, ISS-268"
  - id: BR2.10
    statement: "Lists are ordered neutrally and the pages keep the query's order: indexes alphabetically by the active-locale name; places, specialties, mentions and doctors by account count, labelled as mentions; accounts newest first; no sort control exists."
    category: policy
    applies_to: "FacilityIndex, TopicIndex, PlacesPanel, FreqList, ConditionPage, FacilityProfile"
    trigger: "Rendering any list"
    logic: "render in the order the view model gives (T-201 BR2.8); counted lists carry condition.mentionNote or condition.treatedAtNote and the doctors panel sort.whyBody; no select or pill reorders anything"
    violation: "An order by sentiment, criteria or reactions breaks the neutral-ordering hard rule (S1)"
    source: "project.md Mandated (neutral order) and Forbidden (highest rated), FR33, FR52, AC6.4.5, T-201 BR2.8, prototype byName"
  - id: BR2.11
    statement: "Anonymous authors of facility and condition accounts are never linked or named; bylines go through T-202's shared Byline."
    category: policy
    applies_to: "FacilityAccountRow, ConditionPage account rows"
    trigger: "Rendering a byline"
    logic: "Byline(author, variant row) only; no component builds a byline itself; anonymous -> byline.anonSentence and no <a>"
    violation: "A linked or named anonymous author is an S1 (identity in a public projection)"
    source: "project.md Forbidden (identity in public projection), ADR-0008, T-202 BR2.12, T-203 hard-rule checklist"
  - id: BR2.12
    statement: "Report reliability is framed as the visitor's impression: the reportTrust criterion always carries crit.reportTrustNote under its distribution."
    category: policy
    applies_to: "FacilityProfile criteria grid"
    trigger: "Rendering the reportTrust criterion"
    logic: "IF key = reportTrust THEN p.denominator crit.reportTrustNote after its distribution, also when the distribution is empty"
    violation: "Report reliability read as a technical finding fails FR27 and AC4.3.4"
    source: "FR27, AC4.3.4, prototype renderFacility, T-203 step 3.3"
  - id: BR2.13
    statement: "Condition names, aliases and mention labels are shown exactly as the view model gives them: aliases as written (any script), provisional wording unchanged and marked as submitted wording, not yet mapped."
    category: policy
    applies_to: "ConditionPage head, FreqList, BrowseCard"
    trigger: "Rendering a condition or a mention"
    logic: "aliases joined with ' · ' as given; IF vm.provisional THEN Badge warn condition.provisional in the head; the 'Also written as' line is left out when there is no alias other than the name; labels are never translated, normalised or case-changed by the page"
    violation: "Rewritten wording fails AC5.3.2; an unmarked provisional page reads as a canonical topic"
    source: "FR37, AC5.3.2, T-201 BR3.4 and BR4.6, Question 7"
  - id: BR2.14
    statement: "The condition page keeps the prototype's framing copy: condition.mentionNote under every mention list, condition.treatedAtNote under the places heading, and the provisional callout (condition.provisional + condition.provNote) before the accounts."
    category: policy
    applies_to: "ConditionPage, FreqList, PlacesPanel"
    trigger: "Rendering a condition page"
    logic: "each present mention list ends with condition.mentionNote; the places panel has condition.treatedAtNote; div.callout > b condition.provisional + condition.provNote always renders"
    violation: "A frequency list without its note can read as a treatment recommendation (FR48 'common condition tags', hard rule on medical advice)"
    source: "Prototype renderCondition and tagFrequency comment, T-203 step 6.3 and hard-rule checklist"

  # 3. Calculations and mapping
  - id: BR3.1
    statement: "When facility feedback is visible, the criteria panel renders all nine criteria in the enum order, each with its heading and a good / mixed / poor distribution, even when every one is empty."
    category: calculation
    applies_to: "FacilityProfile criteria grid"
    trigger: "vm.feedbackVisible is true"
    logic: "for key in [staff, waiting, cleanliness, billing, reportTime, reportTrust, admission, recommend, overall]: div.crit > h3 crit.{key} + DistBlock(vm.criteria[key].dist, prefix 'crit.', title none); a missing entry in vm.criteria renders as an empty distribution"
    violation: "Fewer than nine blocks, or another order, fails the task row 'Nine criteria always rendered'"
    source: "FR27, AC4.3.4, AC4.3.5, T-203 step 3.3 and acceptance row, T-201 § 10 (facility criteria)"
  - id: BR3.2
    statement: "A mention bar's length is its count divided by the list's largest count, shown at its final value at once; a list with no rows is left out."
    category: calculation
    applies_to: "FreqList"
    trigger: "Rendering a mention list"
    logic: "max = rows[0].count (the view model's order is by count); each li: label, span.track[aria-hidden] > i style='--w: count / max', span.n count; IF rows is empty THEN render nothing"
    violation: "The first bar not at full length, or an empty panel, fails the task row 'Freq bars relative to max'"
    source: "Prototype renderCondition freq(), T-203 step 6.3 and acceptance row, T-011 BR6.10"
  - id: BR3.3
    statement: "Places show in the view model's order (most accounts first), each with its hospital or 'Not provided', its present location parts and its count; the panel is left out when there are no places."
    category: calculation
    applies_to: "PlacesPanel"
    trigger: "Rendering a condition page"
    logic: "li > span.pl-name (hospital) | span.pl-name.pl-unk label.notProvided; span.pl-loc (area · city, present parts only); span.pl-n count; places empty -> no panel"
    violation: "An unsorted list or a blank hospital fails the task row 'Places sorted, unknown hospital'"
    source: "Prototype renderCondition (places comment), T-201 BR3.6, T-203 step 6.2 and acceptance row"
  - id: BR3.4
    statement: "The 'Usually seen by' row shows at most three specialties as '{name} · {count}', and is left out when there are none."
    category: calculation
    applies_to: "ConditionPage head"
    trigger: "vm.specialties is non-empty"
    logic: "p.specs-tag > span.kicker condition.specialtyTag + span.spec-pill '{name} · {formatNumber(count)}' for each of the first three"
    violation: "More than three, or an empty row with only its label, departs from the prototype"
    source: "Prototype renderCondition (specialties comment), T-201 BR3.6, T-203 step 6.1"
  - id: BR3.5
    statement: "The places panel and each mention list state their denominator: 'Counted from {total} patient experiences', beside the prototype's note."
    category: calculation
    applies_to: "PlacesPanel, FreqList"
    trigger: "Rendering a present places panel or mention list"
    logic: "p.denominator t('condition.countedFrom', {total: formatNumber(vm.accountsTotal), n: vm.accountsTotal}) after the list"
    violation: "Counts without their denominator break the hard rule (S1)"
    source: "project.md Mandated (exact counts with denominators), Question 5"
  - id: BR3.6
    statement: "Numerals, dates and periods are formatted for the active language: counts with formatNumber, periods and posted dates with formatMonthYear, provenance dates with formatMonthYear."
    category: calculation
    applies_to: "Every visible number and date"
    trigger: "Rendering a number or date"
    logic: "never String(n) or Date#toLocaleString in a component; Bengali digits under bn; no exact day for content"
    violation: "Latin digits under bn fail the task row 'Locales' and the equal-languages hard rule"
    source: "project.md Mandated (numerals follow the language), FD-024, 01-conventions.md §6, T-202 BR3.5"
  - id: BR3.7
    statement: "A facility's label is its name, followed by ' — ' and its branch name when one is present; the hero puts the branch name first in its sub-line; no parent badge is shown."
    category: calculation
    applies_to: "FacilityEntry, FacilityProfile, ConditionPage facilities panel, metadata"
    trigger: "Rendering a facility name"
    logic: "facilityLabel(vm) = name + (branchName ? ' — ' + branchName : ''); hero h1 = name; p.p-spec = [branchName, area + ', ' + city] present parts joined with ' · '"
    violation: "Two branches with the same visible title; a parent badge that repeats the title"
    source: "T-201 Question 9 A, T-203 steps 1 and 3.1, Question 3"
  - id: BR3.8
    statement: "The other-branches panel lists the facility's other visible branches only, each as '{branchName}' with its area, and is left out when there are none."
    category: calculation
    applies_to: "FacilityProfile aside"
    trigger: "vm.siblings is non-empty"
    logic: "MiniList of MiniRow(href /facilities/{publicId}, Avatar(publicId, hue, 38), title branchName, sub area when present); the current branch is never listed (the view model excludes it; the component also filters on publicId)"
    violation: "A branch listing itself fails the task row 'Siblings exclude self'"
    source: "Prototype branchesOf and renderFacility, T-203 step 3.5 and acceptance row"
  - id: BR3.9
    statement: "Count phrases come from parameter keys with English plurals, the visible number formatted for the locale; no copy is built by joining a number and a word, and no copy is lowercased by script."
    category: calculation
    applies_to: "Account counts on cards, heroes and topic cards; the condition lede; mini-row subs; the denominator lines"
    trigger: "Rendering a count with a noun"
    logic: "sentiment.totalAccounts {count, n}; condition.countsLine {accounts, a, doctors, d}; condition.countedFrom {total, n}; sentiment.ofTotal {total, n}; the separator ' · ' joins independent phrases only"
    violation: "'1 patient experiences' in English or a postposition before its number in Bengali (S3)"
    source: "01-conventions.md §6, T-202 Question 5"
  - id: BR3.10
    statement: "A topic or facility with no eligible accounts says so in words and shows no empty panel."
    category: calculation
    applies_to: "TopicIndex cards, ConditionPage, FacilityEntry, FacilityProfile"
    trigger: "accountsTotal = 0"
    logic: "count text -> index.emptyTopic; distributions -> Not provided (BR2.6); panels with no rows are left out; the accounts section shows div.empty-state > p index.emptyTopic + Link index.beFirst to /write (with ?facility={publicId} on a facility)"
    violation: "A '0 patient experiences · 0 doctors' head or empty panels make the page look broken"
    source: "Prototype renderTopicIndex comment, T-203 step 5, Question 6"
  - id: BR3.11
    statement: "When facility feedback is hidden by configuration, the page leaves out every feedback element and adds no copy."
    category: calculation
    applies_to: "FacilityProfile"
    trigger: "vm.feedbackVisible is false"
    logic: "omit the criteria panel, the visits section, the account-count and limited-data badges and the 'Describe your visit' button; keep the hero, Not verified, the separation callout, doctors here and other branches"
    violation: "Nine 'Not provided' criteria would tell readers nobody wrote"
    source: "FR100 (feature visibility), T-201 WF4, Question 8"
  - id: BR3.12
    statement: "Avatars are the prototype's generated SVG seeded by the public id with the view model's hue, at 48 px on cards, 118 px in the hero and 38 px in mini rows."
    category: calculation
    applies_to: "FacilityEntry, FacilityProfile, ConditionPage mini rows"
    trigger: "Rendering an avatar"
    logic: "Avatar(seed = publicId, hue = avatarHue, size); aria-hidden"
    violation: "An avatar that changes between languages for the same profile"
    source: "T-202 Question 8, T-201 Question 8"

  # 4. Accessibility and responsive behaviour
  - id: BR4.1
    statement: "Each page has one h1 and its headings follow in order: index entries h2; panels h2; criteria h3; account titles h3."
    category: constraint
    applies_to: "All four pages"
    trigger: "Rendering"
    logic: "IndexHead h1 on the indexes; the name h1 on the detail pages; FacilityEntry headingLevel 2 on the index; criterion headings h3 (not the prototype's h4); OutcomeBlock's h3 sits inside its h2 panel"
    violation: "A skipped level fails axe 'heading-order' in T-503's run"
    source: "FR95, NFR6, T-202 BR4.1 and BR4.2"
  - id: BR4.2
    statement: "Landmarks and groups are named: each entry is a group labelled by its heading; the aside is labelled; card grids and mini lists are lists."
    category: constraint
    applies_to: "FacilityEntry, FacilityProfile, ConditionPage, TopicIndex"
    trigger: "Rendering"
    logic: "div.doc-entry[role=group][aria-labelledby]; aside.p-side[aria-label]; ul.index-grid > li; avatars and bars aria-hidden"
    violation: "Unlabelled groups and regions fail FR95's screen-reader-friendly controls"
    source: "FR95, NFR6, T-202 BR4.7"
  - id: BR4.3
    statement: "Every capsule group is one image with a full sentence; every bare count in a list carries a visually hidden unit."
    category: constraint
    applies_to: "DistBlock (criteria), PlacesPanel, FreqList, spec pills, mini-row subs"
    trigger: "Rendering a count"
    logic: "capsules role=img with the T-202 sentence (criteria labels, the total, the title when given); .pl-n, .n and spec-pill counts followed by span.sr-only sentiment.totalAccounts"
    violation: "A screen reader hears 'Shefa General Hospital, 3' without knowing what 3 counts"
    source: "FR95, NFR6, T-202 BR4.3"
  - id: BR4.4
    statement: "Topic cards are links, not buttons, with the topic name as their accessible name and a visible focus ring."
    category: constraint
    applies_to: "BrowseCard"
    trigger: "Rendering a topic card"
    logic: "a.browse-card[href=/topics/{publicId}] > b name + span sub; focus-visible ring from T-011; 44 px minimum height"
    violation: "A button that navigates breaks open-in-new-tab and the no-script path (T-203 step 4)"
    source: "T-203 step 4, FR95, NFR6, T-011 BR1.4"
  - id: BR4.5
    statement: "The pages work at 360 px and 200% zoom in both languages without horizontal scrolling, and every page and link works without script."
    category: constraint
    applies_to: "All four pages"
    trigger: "Build and Test viewport runs"
    logic: "p-grid one column below 1040 px; crit-grid one column at 360 px; pills, flags and places lines wrap; long Bengali names wrap; no client component is required to read"
    violation: "Horizontal overflow at 360 px fails NFR4"
    source: "NFR4, NFR6, 01-conventions.md §8"
  - id: BR4.6
    statement: "The 'Not verified' explanation is reachable without a pointer on the facility page."
    category: constraint
    applies_to: "FacilityProfile hero"
    trigger: "Rendering the hero"
    logic: "the badge has aria-describedby pointing at span.sr-only with facility.notVerifiedWhy; title stays for pointer users"
    violation: "Keyboard and screen-reader users miss why the facility is not verified"
    source: "FR95, T-202 BR4.8, Question 2"
  - id: BR4.7
    statement: "The emergency panel on the condition page and the separation callout on the facility page keep the prototype's place in the document; on narrow screens the order equals the DOM order."
    category: constraint
    applies_to: "ConditionPage aside, FacilityProfile"
    trigger: "Rendering at any width"
    logic: "no CSS order or grid placement moves them; the aside follows the main column below 1040 px"
    violation: "Visual order that differs from focus order fails WCAG 1.3.2; moving the emergency guidance departs from the hard rule's 'where the prototype has them'"
    source: "project.md Mandated (emergency guidance where the prototype has it), Question 14"

  # 5. Motion (FD-091, T-011)
  - id: BR5.1
    statement: "No page wraps itself in RouteTransition while the patient layout renders one."
    category: constraint
    applies_to: "The four pages"
    trigger: "Code Generation"
    logic: "IF (patient)/layout.tsx renders RouteTransition THEN pages render none; ELSE each page wraps its content once"
    violation: "Two elements named 'page' make the browser skip every route transition"
    source: "T-011 Question 4 A, T-202 BR5.1 and finding F4, T-203 step 9"
  - id: BR5.2
    statement: "Reveal wraps the facility index list, the topic grid, each mention list and the two account lists, and nothing else."
    category: policy
    applies_to: "FacilityIndex, TopicIndex, FreqList, ConditionPage accounts, FacilityProfile visits"
    trigger: "Rendering those lists"
    logic: "Reveal as='div' className='index-list' | as='ul' className='index-grid' | as='ul' className='freq-list' | as='div' for account rows; never around the criteria grid, a distribution, the places list, the specialty row, the separation callout or the emergency panel"
    violation: "Animated figures break T-011 BR6.10; a revealed hard-rule block breaks AC2.4.4"
    source: "T-203 step 9, T-011 BR6.2 and BR6.10, Question 15"
  - id: BR5.3
    statement: "The separation callout and the 'Not verified' badge have no motion of their own and are never shown after a delay; they move only with the whole page."
    category: constraint
    applies_to: "FacilityProfile, FacilityEntry"
    trigger: "Any motion"
    logic: "no animation, transition or Reveal targets them; they are present in the first frame their page is"
    violation: "Hard-rule wording missing from a frame (AC2.4.4 by extension)"
    source: "T-203 step 9, T-202 Question 11, AC2.4.4"
  - id: BR5.4
    statement: "The condition page's emergency panel is a T-011 static group and never inside Reveal."
    category: constraint
    applies_to: "EmergencyPanel compact on ConditionPage"
    trigger: "Rendering the condition aside"
    logic: "section.panel.emergency-panel[data-static=emergency]; T-011's static set gives it animation none and its own view-transition name"
    violation: "Animated emergency guidance breaks AC2.4.4 and FD-091"
    source: "project.md Mandated (emergency guidance), FD-091, AC2.4.4, T-011 BR7.1–BR7.3, Question 13"
  - id: BR5.5
    statement: "T-203's section of patient.css declares no transition, animation or keyframes; press feedback and entries come only from T-011."
    category: constraint
    applies_to: "apps/web/src/styles/patient.css (T-203 section)"
    trigger: "pnpm check:motion"
    logic: "IF a T-203 rule declares transition*, animation* or @keyframes THEN check:motion's file rule fails; a missing press selector is an ISSUES.md row for U45"
    violation: "check:motion fails (FD-091 acceptance row)"
    source: "T-011 BR4.7 and BR9.1, T-203 FD-091 amendment and acceptance row 'FD-091: motion check'"
  - id: BR5.6
    statement: "Under reduced motion (OS setting or data-motion=reduced) every step of the four pages completes with no slide, scale, stagger, route movement or reveal."
    category: constraint
    applies_to: "The four pages"
    trigger: "The reduced-motion journey"
    logic: "T-011's reduced overrides apply; nothing in T-203 depends on an animation end event"
    violation: "A blocked or missing step fails AC2.4.3"
    source: "AC2.4.3, T-203 acceptance row 'FD-091: reduced-motion journey'"

  # 6. Language
  - id: BR6.1
    statement: "Every visible string comes from a key in both dictionaries; new keys land in en.json and bn.json in one commit and the Bengali is flagged for the owner's review."
    category: constraint
    applies_to: "All components and pages in the owned paths"
    trigger: "Code Generation"
    logic: "new keys: facility.notVerified, facility.notVerifiedWhy, facility.posted, condition.countsLine, condition.countedFrom; T-202's sentiment.totalAccounts, sentiment.ofTotal, label.notProvidedCount, prov.updatedOn and label.limitedDataWhy {threshold} are reused; i18n:check stays green"
    violation: "A literal in a component or a key without its Bengali entry fails the build (project.md Mandated)"
    source: "project.md Mandated and Forbidden (i18n), ADR 0011, FD-024, FD-042, NFR7, T-203 owned paths ('report if found')"
  - id: BR6.2
    statement: "No text is transformed by script or CSS: no toLowerCase or toUpperCase on copy, and no capital-letter transform on Bengali."
    category: constraint
    applies_to: "ConditionPage lede and every component"
    trigger: "Rendering copy"
    logic: "the prototype's condition.doctors.toLowerCase() is replaced by condition.countsLine; text-transform is never applied under :lang(bn)"
    violation: "Script lowercasing is a no-op in Bengali and breaks parity; a capital transform on Bengali breaks the hard rule"
    source: "project.md Mandated (no capital-letter transform in Bengali), T-202 BR6.3"
  - id: BR6.3
    statement: "Stored wording is shown in its original language: account bodies, condition names in the active language from the view model, aliases and free-text mentions as written."
    category: policy
    applies_to: "FacilityAccountRow, FreqList, ConditionPage"
    trigger: "Rendering user content"
    logic: "no machine translation and no fallback to the other language's copy keys for user content; the seed stores Bengali only (ISS-161), so /en shows Bengali bodies and mention labels"
    violation: "Translated user content misrepresents what the author wrote"
    source: "T-201 BR2.9, ISS-161, AC5.3.2"

  # 7. Styles
  - id: BR7.1
    statement: "Pages use T-011's tokens and kept class names; T-203's own rules sit in its section of patient.css, each marked '/* added: T-203 <reason> */'; the only inline styles are the --w and --g custom properties."
    category: constraint
    applies_to: "All components; apps/web/src/styles/patient.css"
    trigger: "Code Generation and review"
    logic: "new selectors: .crit h3, .crit .limited-tag, .crit-tags, .callout.facility-sep, .index-grid, a.browse-card, .places-note, .freq-head; tokens only, no literal colour, size or time; a missing token is an ISSUES.md row for U45"
    violation: "Literal values or edits to tokens.css or motion.css break FD-091's ownership split"
    source: "FD-091, FD-032, project.md Code Style, T-203 FD-091 amendment, T-502 (style-src)"
  - id: BR7.2
    statement: "The pages pass the impeccable detector, the contrast checks and the motion check with zero findings."
    category: constraint
    applies_to: "The owned paths"
    trigger: "Build and Test"
    logic: "npx impeccable detect apps/web/src --no-advisory; pnpm contrast; pnpm contrast:patient; pnpm check:motion"
    violation: "Any finding blocks the Unit"
    source: "team.md Testing Posture (UI units), T-203 acceptance rows"

  # 8. Components
  - id: BR8.1
    statement: "All T-203 components are server components that take view models, plain values and slots; FacilityEntry, BrowseCard and ConditionLink are exported for T-206, T-207 and T-307."
    category: constraint
    applies_to: "components/patient/{FacilityIndex,FacilityProfile,FacilityEntry,FacilityAccountRow,TopicIndex,ConditionPage,FreqList,PlacesPanel,BrowseCard,ConditionLink}.tsx"
    trigger: "Code Generation"
    logic: "no 'use client'; no function props; FacilityEntry {card, headingLevel?, threshold, pinSlot?}; BrowseCard {href, title, sub}; ConditionLink {publicId?, name}"
    violation: "A client component without need grows the bundle; a function prop forces consumers to the client"
    source: "01-conventions.md §8, T-202 BR8.1, T-206 and T-207 dependencies, Question 12"
  - id: BR8.2
    statement: "T-203 imports T-202's primitives and does not re-implement them; the four additive changes it needs are asked of U15 first and made in T-202's files only if T-202 merged without them."
    category: constraint
    applies_to: "components/patient/shared/{Badge,DistBlock,EmergencyPanel,FacilityLink}.tsx, the segment parser"
    trigger: "Code Generation"
    logic: "Badge cls adds good | poor; DistBlock prefix adds 'crit.', uses title in the compact image sentence and takes an optional limitedNote 'full' | 'tag'; EmergencyPanel adds compact; parseSegment and facilityLabel exported; each one T-203 makes is listed in its hand-off"
    violation: "A second distribution component, or an unrecorded edit to another Unit's files"
    source: "T-203 'Read first' 3 and step 6.4, T-202 ENT-011, Question 11"
  - id: BR8.3
    statement: "Only the four pages, the T-203 components, their tests, the T-203 CSS section, the new keys and the recorded additions change."
    category: constraint
    applies_to: "The Bolt's diff"
    trigger: "Review"
    logic: "recorded additions: the two [id] -> [publicId] moves, container.ts taxonomy wiring, ConditionLink, the shared-primitive changes of BR8.2 when needed; nothing in packages/{domain,application,database,contracts,test-support}, apps/worker, tokens.css or motion.css"
    violation: "Files outside owned paths fail the reviewer's diff check (team.md step 4)"
    source: "T-203 owned paths and 'Not in scope', team.md Way of Working"

  # 9. Verification and records
  - id: BR9.1
    statement: "Every T-203 component has tests that render it in en and bn with builder view models and the real dictionaries."
    category: constraint
    applies_to: "components/patient/**/*.test.tsx (T-203's)"
    trigger: "Code Generation"
    logic: "Vitest, Testing Library, jsdom, NextIntlClientProvider; @/i18n/routing mocked (ISS-053); names read as sentences; each test can fail"
    violation: "A component without a bn test fails NFR7 and the task row 'Locales'"
    source: "team.md Testing Posture, 01-conventions.md §10, T-203 'Tests to write'"
  - id: BR9.2
    statement: "The Unit adds one smoke file to the cumulative suite."
    category: constraint
    applies_to: "components/patient/facilities-topics.smoke.test.tsx"
    trigger: "Code Generation"
    logic: "renders FacilityIndex, FacilityProfile, TopicIndex and ConditionPage from builders in both languages: nine criteria, the separation callout, Not verified, ten topic cards with one empty"
    violation: "No smoke assertion for the Unit (team.md step 2)"
    source: "team.md Testing Posture (cumulative smoke suite)"
  - id: BR9.3
    statement: "Build and Test runs every gate and records the hard-rule evidence: T-201's query-level isolation tests are named and green."
    category: constraint
    applies_to: "Build and Test"
    trigger: "Build and Test"
    logic: "pnpm check, pnpm smoke, pnpm check:motion, pnpm contrast, pnpm contrast:patient, impeccable; the hand-off names T-201's 'never enters doctor' and reverse-isolation integration tests as passing in the same pnpm check run"
    violation: "A hard-rule claim without evidence fails G2/G4"
    source: "team.md Way of Working steps 3–4, T-203 'Hard-rule evidence', unit-of-work.md U16"
  - id: BR9.4
    statement: "Every defect, workaround or assumption found becomes an ISS row linked to U16."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "Any finding"
    logic: "Found in U16 T-203; the Build and Test record lists the ISS ids found and fixed"
    violation: "An unrecorded workaround (project.md Mandated)"
    source: "project.md Mandated (ISS rows), team.md Way of Working, ISS-268"
```

## Rule groups at a glance

| Group | Rules | Theme |
|---|---|---|
| 1 | BR1.1–BR1.8 | Data through the container; public-id segments; facility and condition redirects; 404; per-request figures; metadata; one loader |
| 2 | BR2.1–BR2.14 | No quality number or percentage; facility and doctor feedback kept apart on the page; separation sentence; Not verified; Not provided; Limited data; neutral order; anonymous bylines; report reliability; wording as written; framing copy |
| 3 | BR3.1–BR3.12 | Nine criteria; bars; places; specialties; denominators on counted lists; formatting; facility label; other branches; count phrases; zero cases; hidden feedback; avatars |
| 4 | BR4.1–BR4.7 | Headings; landmarks; hidden units; topic links; 360 px; Not verified explanation; prototype placement |
| 5 | BR5.1–BR5.6 | Layout transition only; Reveal on five lists; static hard-rule blocks; no motion in T-203 CSS; reduced motion |
| 6 | BR6.1–BR6.3 | Keys in both languages; no text transforms; original wording |
| 7 | BR7.1–BR7.2 | T-011 tokens and classes; UI gates |
| 8 | BR8.1–BR8.3 | Server components and exports; primitive changes; owned paths |
| 9 | BR9.1–BR9.4 | Tests in both languages; smoke; gates and hard-rule evidence; ISS rows |
