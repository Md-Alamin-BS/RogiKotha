# Functional Design — questions (U15 `t-202-doctor-index-and-profile`)

Draft written ahead of the stage while another Unit builds. The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-202-doctor-index-and-profile/functional-design/`.

Context:
- Unit U15 (kind `ui`, size L, not high risk) delivers T-202 (`docs/implementation/tasks/T-202-doctor-index-and-profile.md`, with its FD-091 amendment) for stories US4.1, US6.4 and US4.2 (claim entry point only). Bolt 14 in `bolt-plan.md`, after U14 T-201 (Bolt 13) and U45 T-011; U17 T-204 (claims) follows in Bolt 16. Depends on U14 T-201, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`).
- Inputs read: `unit-of-work.md` (U15), `unit-of-work-story-map.md`, `requirements.md` (FR15–FR23, FR48–FR52, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC4.1.1–AC4.1.5, AC4.2.1–AC4.2.5, AC6.4.1–AC6.4.5), `contract-summary.md` (C7 and the common rules; "FD-091 and U45: presentation only"), `docs/status/decision-log.md` (FD-024, FD-032, FD-042, FD-060, FD-067, FD-089, FD-091), `PRODUCT.md` hard rules, `01-conventions.md` §3–§9 and §14–§15, `03-routes-and-contracts.md` §1, §4 and §6, `05-demo-storyboard.md` Part 1, and `docs/status/dependency-check-log.md`.
- Upstream drafts read as inputs: `design-drafts/t-201-directory-and-taxonomy-modules/` (the view models and queries these pages read; all its answers A) and `design-drafts/t-011-patient-design-and-motion-system/` (tokens, `RouteTransition`, `Reveal`, static groups, `check:motion`; all its answers A). Both await the owner's confirmation; § 14 of `functional-spec.md` says what changes here if either changes.
- Code read on the working tree (branch `bolt/cr-012-storyboard-seed-correction`, 2026-10-28): `apps/web/src/app/[locale]/(patient)/doctors/{page.tsx,[id]/page.tsx}` (T-008 placeholders), `(patient)/layout.tsx`, `components/patient/{ViewShell,Tabs,Emergency}.tsx`, `components/shared/{Sheet,DemoMarker}.tsx`, `lib/{titles,metadata,cookies}.ts`, `i18n/routing.ts`, `styles/patient.css`, `next.config.ts`, `packages/i18n/src/{format,index}.ts` and `messages/{en,bn}.json`, the corpus in `packages/test-support/src/corpus/{doctors,reviews}.ts` (CR-012's d1–d10 and r1–r24).
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` (`badge`, `notVerified`, `docCount`, `distBlock`, `sentimentBlock`, `outcomeBlock`, `emergencyPanel`, `initials`, `byline` with its comment block, `doctorLink`, `facilityLink`, `accountRow`, `doctorEntry`, `profileAccounts`, `renderProfile`, `indexHead`, `byName`, `renderDoctorIndex`, the `data-pcond`/`data-pfilter`/`#claim` handlers, `titleForView`) and `ui-design-prototype/shared/rogikotha-data.js` (`distribution`, `avatar`). The line numbers in the task's "Read first" predate FD-089 and are stale (finding F12).
- Open `ISSUES.md` rows in this area: ISS-268 (the "Not provided" rendering check deferred to T-202 and T-203), ISS-266 (d3's chamber has no branch link), ISS-168 (claimed doctors have no `claimed_by_account_id`), ISS-161 (seeded review text stored in Bengali only), ISS-137 (the whole dictionary is shipped to the client), ISS-053 (`@rogikotha/i18n`'s routing barrel fails to load in plain Vitest), ISS-120 (the root 404 is English-only, owner T-207), ISS-271 (a pre-FD-089 facility name matches a real hospital; accepted by the owner on 2026-10-28, and d1's chamber shows that name).

## What the code and data show that the task file does not

1. **The step-2 keys already exist.** `emergency.ambulanceLabel`, `emergency.healthLineLabel`, `label.documentsWord`, `filter.gender.*`, `profile.total` and the three `discover.*` keys are in both dictionaries already (T-207a). Step 2 is done.
2. **The route folder is `doctors/[id]`.** T-008 created `[id]` placeholders; T-202's owned path is `doctors/[publicId]`. Next.js refuses two different slug names at one level, so the placeholder must be renamed, not added beside. T-203 and T-307 name `[publicId]` too.
3. **`RouteTransition` sits in the patient layout.** The T-011 design (its Q4 A) renders one keyed `RouteTransition` in `(patient)/layout.tsx`. Step 9's "wrap both pages in `RouteTransition`" would give the document two elements named `page`, and the browser then skips every route transition.
4. **`aria-pressed` on a link is invalid ARIA.** Step 5 makes the condition and filter pills links (so they work without script) with `aria-pressed`. axe reports that as `aria-allowed-attr`, a critical violation, which T-503's gate refuses.
5. **The requirement asks for percentages; the task and the prototype show none.** FR48 and AC6.4.1 say "counts and percentages with their denominators". The prototype's capsules show counts only, and its data file says a percentage without its count is "exactly the kind of number this product refuses to publish". T-202's checklist says "no percentage text".
6. **The compact distribution on index cards drops "Limited data".** The prototype's `distBlock(…, compact)` prints the denominator and capsules but no limited-data line. On the corrected seed 9 of the 10 doctors have fewer than 5 accounts (only d1 has 5).
7. **"Limited data" copy hard-codes the threshold.** `label.limitedDataWhy` reads "Fewer than 5 experiences…" while the threshold is `ConfigProvider.current().limitedDataThreshold`, a setting a Super Admin can change (FR100).
8. **Concatenated count phrases break Bengali word order and English plurals.** `sentiment.of` + total + `sentiment.accounts` gives "এর মধ্যে ৫ জনের অভিজ্ঞতা" (the postposition comes first) and `1 documents` in English. `01-conventions.md` §6 asks for "a denominator string built from a key with `{count}` and `{total}` params".
9. **The byline view model has no username for real-name authors.** T-201's `BylineVM` carries `displayName` for named authors and `username` only for pseudonymous ones, so a real-name author cannot link to `/authors/{username}` as the prototype's name button does.
10. **The avatar's seed is the English name.** The prototype calls `avatar(d.name.en, hue, size)`; the view models carry only active-locale strings (T-201 BR2.9).
11. **Server components cannot take function props.** `DoctorEntry({card, pinned?, onPin?})` would force the index card to be a client component for T-206's pin button.
12. **The seed cannot show "Not provided" on a doctor page.** All ten doctors have every rendered field (BMDC, specialty, qualifications, languages, fee, area, city, chamber hours), every doctor has at least one account, and every review has a sentiment and an outcome. The fields left empty under FD-089 (`about` on d7–d10) are not rendered on the profile (the prototype's fact list has no "about").
13. **The claim sheet in the prototype shows one paragraph.** For a verified visitor, `#claim` opens a sheet with `profile.claimNote` only; there is no form. T-204 replaces `ClaimSheet`'s body with the real form and action (its owned paths).
14. **`/write`, `/experiences/[id]`, `/authors/[username]` and `/facilities/[id]` exist as placeholders**, so every link the profile renders resolves today; their pages arrive in T-306, T-307, T-409 and T-203.

## Settled before this stage

Decided by FD entries, the contracts or the upstream designs; not asked again.

- **The look follows T-011 (FD-091)**; the prototype is the source of truth for content, data, structure and behaviour. Page styles go in T-202's own section of `patient.css`, each rule marked `/* added: T-202 <reason> */`, with T-011 tokens and class names only. No edit to `tokens.css`, `motion.css` or the shell styles; a missing token is asked for through an `ISSUES.md` row.
- **The data comes from T-201's queries and view models** (`directory.listDoctors`, `directory.getDoctor`, `directory.resolvePublicId`; `DoctorCardVM`, `DoctorProfileVM`, `DistributionVM` with `keys`, `counts`, `total`, `notProvided`, `empty`, `limitedData`, `ExperienceCardVM`, `BylineVM`, `ProvenanceVM`). The flag is `limitedData`, not the task's `limited` (T-201 § 13). Facility feedback isolation is enforced and tested at query level by T-201 (BR2.6 there); these pages show what the view model says.
- **Every doctor shows "Registration not verified"** (D-003, FR16); `registrationNotVerified` is always true in the view model.
- **Public doctor profiles are indexable** (`01-conventions.md` §8; the prototype's `setNoindex(true)` was an artefact).
- **The claim command is T-204's** (U17, Bolt 16, after this Unit). The auth gate is T-102's `useAuthGate().guard()` with one `AuthGateSheet` in the patient layout (T-102 step 9), so no inline gate copy is needed here.
- **No new dependency.** Everything uses Next 16.3.4, React 19.3.0, next-intl 4.14 (ICU plurals are built in), and the T-011 components. `permanentRedirect` returns 308 in a Server Component (Next.js docs, `permanentRedirect`, updated 2026-08-18). No dependency-check entry is needed unless Code Generation finds otherwise.
- **CSP**: T-502 accepts `style-src 'unsafe-inline'` for the prototype's own `style=""` attributes, so the capsule weight `--g` and the outcome track `--w` may stay as inline custom properties.

## Settled in this design without a question

These follow from the conventions, the upstream designs or the code; `functional-spec.md` § 13 explains each.

- **The `[id]` placeholder folder is renamed to `[publicId]`** (fact 2), as a recorded owned-path change. The segment holds `<publicId>` with an optional `-slug` that is ignored (`01-conventions.md` §9); links are written without a slug.
- **No page wraps itself in `RouteTransition`** (fact 3): the layout's one boundary covers both pages. If T-011's spike fell back to per-page wrappers (its Q4 B), each page wraps itself once; Code Generation checks which before building.
- **`ViewShell` gets `title=""` on both pages.** Each page brings its own `<h1>` (`IndexHead` on the index, the doctor's name on the profile), as T-207a did for Emergency and About.
- **One query call per request.** `generateMetadata` and the page share a `cache()`-wrapped loader, so `getDoctor` runs once.
- **No caching of figures.** Both pages render per request (they read cookies, headers and search parameters), so a hidden or restored account changes the figures on the next view (AC6.4.4).
- **Filter parameters are cleaned before the query.** Unknown `outcome` or `relationship` values and any `docs` other than `1` are dropped; a `condition` the doctor has no accounts for redirects (307) to the same URL without it.
- **The page trusts the query's order.** `listDoctors` returns visible doctors alphabetically in the active language (T-201 BR2.8); the page does not re-sort, and the index test asserts the order with `Intl.Collator(locale)`.
- **Provenance shows its last-update date** (AC4.1.4): every fact and chamber chip reads "<source> · <Month Year>" from `ProvenanceVM.updatedAt`, through `formatMonthYear`. The prototype has the source only; AC4.1.4 requires the date.
- **A missing part is skipped, not blanked.** `.p-spec` and `.doc-sub` join only the parts present ("Endocrinology · Dhanmondi, Dhaka", "Endocrinology", "Dhaka"); the excerpt gets "…" only when `truncated` is true.
- **`DoctorEntry` takes a `pinSlot?: ReactNode`** instead of `onPin` (fact 11), so it stays a server component; T-206 passes its own client pin button.
- **Heading order.** One `<h1>` per page; doctor names on the index are `<h2>` (`DoctorEntry` takes `headingLevel: 2 | 3`, default 3 for T-206's results under their `<h2>`); profile panels are `<h2>`, account titles `<h3>`.
- **Accessible names and tables.** `.doc-entry[role=group]` is labelled by its heading; `aside.p-side` gets a label; the breakdown table gets a visually hidden caption, `scope` on its headers, a visually hidden "Limited data" beside each `⚠` (which is `aria-hidden`), and a focusable, labelled scroll region so it never widens the page at 360 px.
- **A filter change is announced.** After a pill changes the URL, `ProfileFilters` speaks the new "showing x / y" line through the existing `useAnnounce()` (WCAG 4.1.3; FR95), and pill links keep the scroll position (`scroll={false}`).
- **`EmergencyPanel`** is built for T-203 and T-207 (the profile and the index do not show it; the prototype does not either). It takes its numbers as a prop that its page reads from `ConfigProvider.current().emergency`, carries `data-static="emergency"` (T-011's static group) and never sits inside `Reveal`.
- **Byline initials come from `BylineVM.initials`** (T-201 builds them); the component does not recompute them. Code Generation checks they match the prototype's `initials()` (`@` + first letter for a username).
- **`Reveal` wraps the index list and the profile's account list only.** Distributions, bars and capsules show their final values at once; there are no count-ups and no animated widths (T-011 BR6.10). The pills take T-011's press feedback and an instant pressed-colour change; step 9's "press fade" is replaced, because T-011 animates only `transform` and `opacity` (its Q5 A).
- **T-202 adds no motion declaration.** `check:motion`'s `M6-file` rule would fail on any `transition` or `animation` in `patient.css`. If a pill or card needs the press primitive and T-011's selector list does not cover it, an `ISSUES.md` row asks U45 (finding F7).
- **Account lists show every card the view model returns** (at most 5 per doctor on the seed). Paging is raised as an S4 row for when real volume arrives.

## Question 1 — needs the owner

FR48 and AC6.4.1 say the doctor summary shows sentiment and outcome **"counts and percentages with their denominators"**. The prototype shows counts only and its comment calls a bare percentage a number "this product refuses to publish"; T-202's checklist says "no percentage text". The hard rule is "No number ever stands for quality. Distributions always carry exact counts and denominators." Do the profile's summaries show percentages?

Why this needs the owner: the two sources disagree on a point next to a hard rule. Showing "60 % positive" can read like a quality figure, which is what the hard rule guards against; leaving percentages out departs from a Must requirement of the founder's PRD.

A. **Show each percentage after its count, never alone, and only where the sample is not limited** (recommended). On the profile's sentiment capsules and outcome rows (the "doctor summary" of AC6.4.1), each value reads count first, then a smaller "60%" (Bengali digits under `bn`); the denominator line and the `aria-label` sentence carry both. When a distribution is marked Limited data (0 < total < threshold), or is empty, no percentage shows, because "1 of 1 = 100%" overstates a single account. Index cards and the breakdown table stay counts-only (space at 360 px, and the breakdown already has its Total column). Rounding is the prototype's `pct()`: `Math.round(count / total × 100)`. On the seed only d1's overall summary (5 accounts) shows percentages. Meets FR48 and keeps every count and denominator visible.
B. **No percentages, as the prototype and the task show.** The AC6.4.1 percentage clause becomes a recorded gap with an `ISSUES.md` row; FR48 needs a new FD entry that narrows it to counts and denominators.
C. **Percentages everywhere a distribution shows**, including limited samples and the compact card. Most seeded summaries would show 100 % or 50 % from one or two accounts.
X. Other (please specify)

[Answer]: B (the owner's answer, 2026-10-28: counts only; FR48 and AC6.4.1 are narrowed to counts and denominators by a new FD entry written at this Unit's Functional Design, with an ISSUES.md row for the gap)

## Question 2

AC6.4.2: a doctor with 3 eligible accounts, **two of them without a sentiment**, shows "missing sentiment and outcome as Not provided". T-201 gives each distribution `notProvided` (eligible accounts with no value). The prototype shows "Not provided" only when a distribution is entirely empty and says nothing about the accounts that left a value out. How does a partial distribution show its missing values?

A. **A short line under the denominator: "Not provided: 2"** (recommended), from a new key with a `{count}` parameter, shown whenever `notProvided` > 0 and the distribution is not empty. An empty distribution still reads "Not provided" alone (prototype). The full sentence for screen readers ends with the same phrase. The visitor sees why "of 1 patient experience" is smaller than the "3 patient experiences" in the hero.
B. **Prototype behaviour only**: partial distributions say nothing about missing values. The hero's 3 and the capsules' 1 then disagree without explanation, and AC6.4.2's "Not provided" is met only for fully empty distributions.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Where does **"Limited data"** show beyond the prototype's per-distribution line? The hard rule says it appears "when the number of eligible accounts is below the configured threshold". The prototype prints it under full distributions only: not on the compact distribution of an index card (fact 6) and not in the profile's hero, where "3 patient experiences" stands alone. T-201 gives `accountsLimitedData` on both view models.

A. **Also on the index card and in the profile hero** (recommended). The compact card adds a small `Limited data` badge after its denominator when `accountsLimitedData` is true; the hero's flags add the same badge beside the account count. The why-text stays with the full distributions on the profile. On the seed nine index cards carry the badge, which is the honest state of the demo data.
B. **Prototype placement only** (full distributions). Nine of ten index cards show sentiment capsules for one to three accounts with no mark, which reads against the hard rule.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

`label.limitedDataWhy` says **"Fewer than 5 experiences…"** in both languages (fact 7), while the threshold is a runtime setting. How is the copy kept true?

A. **Give the key a `{threshold}` parameter** (recommended): "Fewer than {threshold} experiences. Too few to show a pattern — read them individually." / "{threshold}টির কম অভিজ্ঞতা। ধরন বোঝার মতো যথেষ্ট নয় — আলাদা করে পড়ুন।". The page reads `ConfigProvider.current().limitedDataThreshold` once and passes it down; the number is formatted for the locale. Both dictionaries change in one commit and the Bengali is flagged for review (FD-042). Every later page that shows the line (T-203, T-206, T-307) passes the same value.
B. **Keep the fixed copy** and add an S3 row: the sentence is wrong as soon as a Super Admin changes the threshold.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

The prototype builds count phrases by joining a number and a word (fact 8): "of {n} patient experiences", "{n} patient experiences" (hero, lowercased by script), "{n} documents", "showing {n} / {m}". In Bengali the postposition "এর মধ্যে" lands before the number; in English "1 documents" and "1 patient experiences" appear. How are these phrases built?

A. **One key per phrase with `{count}`/`{total}` parameters and an English plural form** (recommended), as `01-conventions.md` §6 asks: `sentiment.ofTotal` ("of {total} patient experiences" / "{total} জনের অভিজ্ঞতার মধ্যে"), `sentiment.totalAccounts` (compact card), `profile.accountsCount` (hero badge, no script lowercasing), `label.documentsCount`, `profile.showingCount`, `label.notProvidedCount` (Question 2). English uses ICU `plural` on a numeric parameter while the visible number is passed pre-formatted through `formatNumber`, so Bengali digits and the project's grouping rule stay the same everywhere. The old keys stay for other pages until those Units switch. New Bengali copy is flagged for review (FD-042).
B. **Keep the prototype's concatenation** verbatim (`01-conventions.md` §15 "do not improve copy"); the Bengali word order and English plurals stay wrong and are logged as S3.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

The condition and filter pills must change the URL (`?condition=&outcome=&relationship=&docs=1`) and show which are on. The task makes them links with `aria-pressed`, which is invalid on a link (fact 4). Which element and state attribute?

A. **Links with `aria-current="true"` on the selected pills** (recommended). They work without script, can be opened in a new tab and shared, and carry a valid state that screen readers announce as "current". The selected style adds a non-colour cue (a check mark drawn in CSS and a heavier border) on T-011 tokens; `.pillrow a` rules are added in T-202's section beside the prototype's `.pillrow button` rules. `ProfileFilters` (client) only makes the pressed state instant and announces the new count.
B. **`<button aria-pressed>` driven by client navigation**, as in the prototype's DOM. Valid ARIA, but filters stop working without script and the filtered views cannot be bookmarked from the pill itself.
C. **Links with `role="button"` and `aria-pressed`.** Valid, but the Space key does nothing without a script handler, and a toggle that navigates mixes two patterns.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

In the prototype a **real-name author's name** is a button to their public profile, as a username is. T-201's `BylineVM` gives a username only for pseudonymous authors (fact 9), and `/authors/{username}` is keyed by username. What does a real-name byline do?

Why this is open: exposing a username for a real-name byline could let a reader tie a person's real name to their username, and so to their pseudonymous writing, if the two personas share a username. That is an identity question for T-104 and the public-profile Unit, not for this page.

A. **Real-name author names render as plain text; pseudonymous names link to `/authors/{username}`; anonymous is never a link** (recommended). The narrower, reversible choice. An `ISSUES.md` row asks U11 T-104 and U38 T-409 whether a real-name persona has a public profile route and which identifier it uses; adding the link later is a change to `Byline` only.
B. **Add `username` for named authors to `BylineVM`** (a T-201 change) and link them as the prototype does. This widens the public projection of identity, so it needs the owner and, per the project rule, an FD entry first.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

What seeds the generated **avatar** (fact 10)? Its rings and dots come from `hash(seed)`, its colour from `avatarHue`.

A. **The public id**, with `avatarHue` from the view model and the prototype's SVG geometry ported exactly (recommended). Stable for the same profile in both languages and needs no view-model change. The pattern differs from the prototype's picture for the same doctor, which is a look difference that FD-091 allows; the colour stays the prototype's.
B. **Add `avatarSeed` (the English name) to the view models** (a T-201 change) so the pattern matches the prototype exactly. It puts an English string into `bn` view models, against T-201's locale rule.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

What does **`ClaimSheet`** contain before T-204 lands (fact 13)? The task asks for a form (method, private evidence note) with a disabled submit; the prototype's sheet has one paragraph; T-204 replaces the body.

A. **The prototype's content only** (recommended): "Is this you?" opens, through `useAuthGate().guard()`, the T-102 gate for signed-out and unverified visitors, and for a verified visitor a `Sheet` titled `profile.claimThis` with `profile.claimNote` and a close button, marked `// TODO(T-204): claim form and claimProfileAction`. No invented field labels, no new keys, no dead control. T-204 adds its form with its own copy and validation.
B. **The task's disabled form**: two labelled fields and a disabled submit, which needs three or four new keys now, and T-204 rewrites them anyway.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

The task's acceptance row expects a **301** when an old public id is opened (merged profile, AC4.2.5; storyboard step 23). In a Server Component, Next.js sends 308 for `permanentRedirect()` and 307 for `redirect()`; a 301 needs the proxy or a route handler.

A. **`permanentRedirect()` (308)** to the target under the same locale, with the query string kept (recommended). 308 is the permanent redirect search engines treat like 301, it needs no database read in `proxy.ts`, and the acceptance row is reworded to "308 (permanent)". The page must not get a `loading.tsx` above it, because inside a stream the redirect becomes a client-side meta refresh instead of a status code.
B. **A 301 from `proxy.ts`** by resolving the id there: a database read on every doctor request before rendering, in a file owned by T-502.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

Step 9 says **"the not-verified wording is never animated"**. T-011's never-animated set is the demo marker, the disclaimer and the emergency guidance (AC2.4.4, T-011 BR7.1). The "Registration not verified" badge sits inside each index card and in the profile hero, and both move with their container: the card rises with `Reveal`, the hero fades in with the page on a route change. How is the step read?

A. **No motion targets the badge itself** (recommended): no entrance, pulse or emphasis of its own, and it is never shown after a delay. It may move only as part of its card or page, at the same moment as the doctor's name, so it is never missing when the name is visible. This keeps the hard-rule wording present in every frame without making every card a static group.
B. **Keep the badge completely still**: no `Reveal` on the index list (cards carry the badge), and the hero would need a static view-transition group per page, which T-011's design does not provide.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 12

The owner asked for a rich, futuristic patient UI with motion. Within FD-091 these pages get the page transition, the list reveal and press feedback from T-011. A further, visible touch would be a **shared-element morph**: the doctor's avatar on an index card flying into the profile hero.

Why this is open: a morph needs a per-doctor `view-transition-name`, which T-011 does not offer, and T-202 may not edit `motion.css`. A per-element name is set through a style property, which T-011's BR9.2 keeps out of components.

A. **Use only T-011's primitives now, and propose the morph to U45 as an `ISSUES.md` row** (recommended, S4, suggested owner U45 T-011 or a later polish Unit). Nothing breaks if it never comes; if T-011 adds an "avatar morph" primitive, T-202 adds one attribute.
B. **Ask T-011 to add the primitive before it builds** (it has not started): a scope change for U45 that touches its BR9.2 and its spike.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 13

Below 1040 px the prototype's profile becomes one column and the side panel (where the information came from, practice locations, where they practise) comes **after every account**. On a phone, chamber hours sit at the bottom of a long page.

A. **Keep the prototype's order** (recommended). The prototype is the source of truth for structure, the order matches the DOM (no focus-order mismatch), and the panels stay reachable through the headings. Raise an S4 row proposing a "Practice locations" jump link for the owner to decide with the experience page's layout (T-307).
B. **Move the side panel above the condition panel on narrow screens** by changing the DOM order. A structural change from the prototype that the owner has not seen.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

- **R1 — Question 1 (percentages)** needs the owner's answer before Code Generation builds the summaries; `functional-spec.md` § 14 gives both variants.
- **R2 — The seed shows no "Not provided" on a doctor page** (fact 12; finding F1). FD-089 says some records keep missing fields so "Not provided" stays demonstrable, and ISS-268 defers the rendering check to this Unit, but nothing a doctor page renders is missing on the seed. Suggested: U6 CR-012 (being built now) leaves `fee` and `languages` empty on one new doctor (for example d9), and one new review without sentiment or outcome (for AC6.4.2). If CR-012 has merged without it, the check runs on builder data only and the demo cannot show it.
- **R3 — Real-name author links** (Question 7) wait for T-104 and T-409.
