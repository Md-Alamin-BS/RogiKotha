# Functional Design — questions (U16 `t-203-facility-and-condition-pages`)

Draft written ahead of the stage while another Unit builds (U3 T-010, branch `bolt/t-010-boundary-lint-and-ci`, 2026-10-28). The lead finalises it when the workflow reaches this Unit's Functional Design; then it moves to `<record>/construction/t-203-facility-and-condition-pages/functional-design/`.

Context:
- Unit U16 (kind `ui`, size L, not high risk) delivers T-203 (`docs/implementation/tasks/T-203-facility-and-condition-pages.md`, with its FD-091 amendment) for stories US4.3, US5.3 and US6.4. Bolt 15 in `bolt-plan.md` ("facility feedback never in doctor figures"; checkpoint `/en/facilities`, `/en/topics`), after U14 T-201 (Bolt 13) and U15 T-202 (Bolt 14). Depends on U14 T-201, U15 T-202, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`). U19 T-206 (`FacilityEntry`), U20 T-207 (`BrowseCard`) and U27 T-307 (a condition link) build on it.
- Inputs read: `unit-of-work.md` (U16: "Facility feedback never enters doctor aggregates (hard rule)"), `unit-of-work-story-map.md`, `requirements.md` (FR24–FR27, FR36–FR38, FR48–FR52, FR95, FR100, NFR4, NFR6, NFR7, NFR13), `stories.md` (AC4.3.1–AC4.3.5, AC5.3.1–AC5.3.5, AC6.4.1–AC6.4.5), `contract-summary.md` (C6, C7, the common rules), `docs/status/decision-log.md` (FD-024, FD-032, FD-042, FD-089, FD-091, FD-093), `PRODUCT.md` hard rules as affirmed in `project.md`, `01-conventions.md` §6–§9 and §14–§15, `03-routes-and-contracts.md` §1 and §4, `05-demo-storyboard.md` Part 1 step 5, and `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.
- Upstream drafts read as inputs: `design-drafts/t-201-directory-and-taxonomy-modules/` (view models, queries, Question 8 hue, Question 9 names, Question 10 provisional pages, Question 11 seed condition tags; all answered A), `design-drafts/t-202-doctor-index-and-profile/` (the shared primitives this Unit imports; its Question 1 is the **owner's answer B: counts with denominators only, no percentages**; Questions 2–13 answered A) and `design-drafts/t-011-patient-design-and-motion-system/` (tokens, `RouteTransition` in the layout, `Reveal`, static groups, `check:motion`; all answered A). `functional-spec.md` § 14 says what changes here if any of them changes.
- Code read on the working tree: `apps/web/src/app/[locale]/(patient)/{layout.tsx,facilities/page.tsx,facilities/[id]/page.tsx,topics/page.tsx,topics/[id]/page.tsx}` (T-008 placeholders), `components/patient/{Tabs,Masthead,Colophon,ViewShell}.tsx`, `lib/titles.ts`, `styles/patient.css`, `packages/i18n/src/format.ts` and `messages/{en,bn}.json`, `packages/contracts/src/view-models/{facility,condition}.ts` (stubs with `TODO(T-203)`), `packages/database/src/schema/{directory,review,taxonomy}.ts`, `packages/test-support/src/corpus/{facilities,branches,facility-reviews,conditions,reviews,doctors}.ts` and `seed/{seed-directory,seed-content}.ts` (as merged by U6 CR-012, commit `7cce9bd`).
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` (`titleForView` 318, `distBlock` 383, `outcomeBlock` 418, `byline` 582, `facilityLink` 618, `facilityEntry` 733, `renderCondition` 1173 with its two comments on places and specialties, `renderFacility` 1324, `indexHead` 1874, `byName` 1881, `renderFacilityIndex` 1894, `renderTopicIndex` 1908 with its comment) and `ui-design-prototype/shared/rogikotha-data.js` (`CRITERIA` and `CRIT_VALUES` 1575, `distribution` 2423, `criteriaDist` 2589 with its comment, `branchesOf` 2611, `doctorsForCondition` 2655, `tagFrequency` 2663 with its comment). The line numbers in the task's "Read first" predate FD-089 and are stale (finding F14).
- Open `ISSUES.md` rows in this area: ISS-268 (the "Not provided" rendering check deferred to T-202 and T-203), ISS-266 (d3's chamber does not link to f4), ISS-271 (f1 and f4 use the name "Shefa General Hospital", which matches a real hospital; **accepted by the owner on 2026-10-28: keep the name**), ISS-161 (seeded text stored in Bengali only), ISS-137 (the whole dictionary ships to the client), ISS-053 (`@/i18n/routing` mocked in component tests), ISS-120 (the root 404 is English-only, owner T-207).

## What the code and data show that the task file does not

1. **The route folders are `facilities/[id]` and `topics/[id]`.** T-008 created `[id]` placeholders; T-203's owned paths are `[publicId]`. Next.js refuses two slug names at one level, so the folders are renamed, as T-202 does for `doctors/[id]`.
2. **The seed links no review to its condition term.** `seed-content.ts` (after CR-012) writes each review's tags with `free_text` only; no `review_tags` row carries `term_id`. T-201's Question 11 routed the fix to CR-012 with a fallback in U14; CR-012 merged without it and no `ISSUES.md` row was opened. Unless U14 runs its fallback, every condition page shows no accounts and every topic card reads "No one has written about this yet" (finding F1, S2).
3. **The hospital name is not stored.** The corpus has three names per branch (f1: hospital "Shefa General Hospital", label "Dhanmondi branch", organisation "Shefa Health Group"); the seed stores the label as the branch name and the organisation as the facility. Under T-201's Question 9 A the view model has `name` (organisation) and `branchName?`, and no `parentName`. Cards read "Shefa Health Group — Dhanmondi branch"; the prototype reads "Shefa General Hospital — Dhanmondi branch" with a "Part of Shefa Health Group" badge, and d1's chamber still reads "Shefa General Hospital".
4. **Every seeded facility is below the limited-data threshold.** The 19 facility accounts are spread 3, 2, 1, 1, 1, 3, 2, 2, 2, 2 over f1–f10; the threshold is 5. Every card and every facility page is "Limited data", and each of the nine criteria distributions would print the full limited-data sentence.
5. **"Not provided" shows on facility pages from the seed, but not everywhere.** Criteria nobody answered: f1 reportTime and reportTrust; f2 admission; f3 and f4 reportTime, reportTrust and admission; f5 billing, reportTime, reportTrust and admission. Every facility account has an `overall`, every doctor has a chamber, and **no branch has an address** (the corpus has no address field; ISS-268 names only f6–f10). The overall "Not provided" badge and the unknown-hospital place show on builder data only.
6. **No facility page says "Not verified".** FR25 and AC4.3.2 require it in both languages; the prototype's facility card and page have no such badge, the task does not mention it, and no message key exists (`label.notVerified` is the doctor's "Registration not verified"). T-201 gives `notVerified: true` on both facility view models.
7. **FR49 and AC6.4.3 speak of "the same optional sentiment model" for facilities.** Facility feedback in the prototype, the corpus and the schema (`facility_reviews.criteria`) has nine criteria with good, mixed and poor, and no sentiment field.
8. **The prototype's criterion headings skip a level** (`<h4>` inside an `<h2>` panel).
9. **`.index-grid`, `.index-list` and `.count-line` have no CSS** in the prototype or in `patient.css`; the topic grid would render as unstyled stacked links.
10. **The condition lede concatenates and lowercases.** `{n} sentiment.accounts · {m} condition.doctors.toLowerCase()` gives "1 patient experiences · 3 doctors people wrote about" in English and "৩ যেসব ডাক্তার নিয়ে লেখা হয়েছে" (ungrammatical) in Bengali.
11. **T-202's primitive contract does not cover facility values.** Its `Badge` classes have no `good` or `poor`, `DistBlock`'s `prefix` is `'sentiment.' | 'outcome.'` only, and `EmergencyPanel` has no compact form. The CSS already has `.badge.good`, `.badge.poor`, `.cap.c-good` and `.cap.c-poor`.
12. **`RouteTransition` sits in the patient layout** (T-011 Question 4 A). Step 9's "wrap the four pages in `RouteTransition`" would give the document two elements named `page`, and the browser then skips every route transition (T-202 finding F4).
13. **Counted lists carry no denominator in the prototype.** "Where this condition is treated", the "Usually seen by" pills and the three mention lists show counts with a note but no "of n" figure.
14. **The emergency body names 999 and 16263 as fixed copy** (`emergency.body`), while the numbers are configuration (FR100, `ConfigValues.emergency`).
15. **`FacilityCardVM` has no `feedbackVisible`.** When `featureVisibility.facilityAccounts` is off, the profile hides feedback (T-201 WF4), but the index cards would still show the overall distribution.
16. **The topic index has 10 terms, not 8** (FD-089); c8 "Gastric ulcer" has no accounts and is the zero-count case.
17. **T-307 depends on T-203 for "condition link"**, but T-203's owned paths name no such component.

## Settled before this stage

Decided by FD entries, owner answers, the contracts or the upstream designs; not asked again.

- **The look follows T-011 (FD-091)**; the prototype is the source of truth for content, data, structure and behaviour. Page styles go in T-203's own section of `patient.css`, each rule marked `/* added: T-203 <reason> */`, with T-011 tokens and class names only. No edit to `tokens.css`, `motion.css` or the shell styles; a missing token is asked for through an `ISSUES.md` row.
- **No percentages anywhere** (the owner's answer to T-202 Question 1, 2026-10-28). FR48 names "doctor and condition summaries", so the FD entry that T-202's Functional Design writes to narrow FR48 and AC6.4.1 covers the condition summary too; Code Generation checks the FD wording names both.
- **The data comes from T-201's queries and view models** (`directory.listFacilities`, `directory.getFacility`, `directory.resolvePublicId({kind: 'facility'})`, `taxonomy.listConditions`, `taxonomy.getCondition`, `taxonomy.resolvePublicId`; `FacilityCardVM`, `FacilityProfileVM`, `FacilityAccountVM`, `ConditionCardVM`, `ConditionPageVM`, `DistributionVM` with `keys`, `counts`, `total`, `notProvided`, `empty`, `limitedData`). Names follow T-201 Question 9 A (`name`, `branchName?`, no `parentName`), hues Question 8 A (`stableHue(publicId)` for branches), provisional pages Question 10 A.
- **Facility feedback isolation is enforced and tested at query level by T-201** (BR2.6 "never enters doctor" and BR2.7 reverse isolation there). These pages show only what their view model carries; this Unit adds the page-level rules (BR2.2, BR2.3) and names T-201's tests as hard-rule evidence in its hand-off.
- **Routing follows T-202**: `[publicId]` segments with an optional ignored slug; a merged facility or a mapped condition term answers `permanentRedirect` (308) with the query kept (T-202 Question 10 A); a hidden one is a 404; pages render per request.
- **The shared primitives are T-202's** (`Avatar`, `Badge`, `NotVerified`, `DistBlock`, `SentimentBlock`, `OutcomeBlock`, `Byline`, `DoctorLink`, `FacilityLink`, `AccountRow`, `EmergencyPanel`, `MiniList`, `IndexHead`), with T-202's answered behaviour: "Not provided: n" under partial distributions (its Q2), "Limited data" badges on cards and heroes (its Q3), the threshold in the limited-data copy (its Q4), parameter keys for count phrases (its Q5), avatars seeded by public id (its Q8), no motion of their own for hard-rule wording (its Q11).
- **The facility-account composer is out of scope** ("Describe your visit" links to `/write?facility={publicId}`, a T-008 placeholder until T-306).
- **No new dependency.** Next 16.3.4, React 19.3.0, next-intl 4.14 and the T-011 components cover everything; no dependency-check entry is needed unless Code Generation finds otherwise.
- **CSP**: T-502 accepts `style-src 'unsafe-inline'` for the prototype's own `style=""` attributes, so the frequency track `--w` and the capsule weight `--g` stay inline custom properties.

## Settled in this design without a question

These follow from the conventions, the upstream designs or the code; `functional-spec.md` § 13 explains each.

- **The `[id]` placeholder folders are renamed to `[publicId]`** (fact 1), as recorded owned-path changes.
- **No page wraps itself in `RouteTransition`** (fact 12); the layout's one boundary covers all four pages. If T-011 fell back to per-page wrappers, each page wraps itself once.
- **`ViewShell` gets `title=""` on all four pages**; each page brings its own `<h1>` (`IndexHead` on the indexes, the name on the profile and condition pages).
- **One query call per request**: `generateMetadata` and the page share a `cache()`-wrapped loader; nothing is cached between requests (AC6.4.4).
- **The pages trust the queries' order**: indexes alphabetical in the active language, counted lists by count (T-201 BR2.8). No page re-sorts and no page has a sort control.
- **A missing part is skipped, not blanked**: `.doc-sub`, `.p-spec`, `.pl-loc` and `.mini-loc` join only the parts present.
- **Criterion headings are `<h3>`** (fact 8), styled by a T-203 rule that mirrors T-011's `.crit h4`; `FacilityEntry` takes `headingLevel: 2 | 3` (default 3) like `DoctorEntry`, and the index passes 2.
- **`BrowseCard` is a link inside a list**: `ul.index-grid > li > a.browse-card`, so the topic index reads as "list, 10 items"; T-203 adds `.index-grid` (mirroring the prototype's `.browse-grid`) and the `a.browse-card` reset (fact 9).
- **Count phrases use parameter keys** (T-202 Question 5 A, fact 10): T-202's `sentiment.totalAccounts` and `sentiment.ofTotal`, and a new `condition.countsLine` with English plurals for the condition lede. No script lowercasing of copy.
- **A facility account's posted date** reads "Posted {Month Year}" from a new key `facility.posted` with `formatMonthYear`; the prototype's corpus stored the whole phrase per language.
- **The hero provenance chip** reads "<source> · <Month Year>" through T-202's `prov.updatedOn`, the same chip as on doctor pages, for the facility's `name` provenance (the prototype shows the source only).
- **The separation callout** (`facility.separation`, bold, `.callout.warn`) is on every branch page, directly under the hero, never inside `Reveal` and with no motion of its own (T-202 Question 11 A applied to this hard-rule sentence).
- **The doctors-here and facilities lists carry no figures**: names, specialty or type only, so nothing on one side can be read as a summary of the other.
- **Counts in lists get a hidden unit** for screen readers (places, specialty pills, mention lists, mini rows): the visible number stays as the prototype shows it.
- **The container wires Taxonomy**: `apps/web/src/server/container.ts` gains `taxonomy.listConditions`, `getCondition` and `resolvePublicId` with Review's `ConditionStats` implementation (T-201 finding F6), unless T-202 already did; a recorded owned-path addition.
- **The pages need no client component**: nothing on them filters, toggles or opens a sheet. `Reveal` is server-compatible.
- **The prototype's inline styles become T-203 classes** (`.crit-tags`, `.places-note`, `.callout.facility-sep`, `.freq-head`), each with its `/* added: T-203 */` reason.

## Question 1 — needs the owner

FR49 says "Facility profiles use **the same optional sentiment model** and non-scored structured feedback", and AC6.4.3 says "the facility summary uses the same optional sentiment model". In the prototype, the corpus and the schema, facility feedback has nine optional criteria (staff, waiting, cleanliness, billing, report time, report reliability, admission, recommendation, overall), each good, mixed or poor, and **no sentiment field** (fact 7). What does the facility page show?

Why this needs the owner: the founder's PRD requirement and the approved prototype disagree. Reading FR49 literally adds a field to facility feedback (schema, composer, corpus, view model), which is a data-model change; reading it as the criteria model narrows a Must requirement's wording, which needs an FD entry either way.

A. **Read FR49 as the criteria model, with a new FD entry that rewords FR49 and AC6.4.3** (recommended). Each criterion is optional and shows a good / mixed / poor distribution with exact counts and its denominator; `overall` is the facility's own optional summary item, shown on the card and as the ninth criterion. No data change; the page is built as the prototype shows it.
B. **Add an optional sentiment (positive / mixed / negative) to facility feedback**, as on doctor accounts: a `facility_reviews.sentiment` column and migration, a composer field (T-306), corpus and prototype values, a T-201 view-model field, and a `SentimentBlock` on facility pages next to the criteria. A data-model change that needs an FD entry before any code.
C. **Keep FR49 as written and record a gap**: build as the prototype shows and open an S2 row for the missing sentiment.
X. Other (please specify)

[Answer]: A (the owner's answer, 2026-10-28: the criteria model; a new FD entry rewords FR49 and AC6.4.3 at this Unit's Functional Design)

## Question 2

FR25 and AC4.3.2 require **"Not verified"** on every unverified facility profile, in both languages (fact 6). The prototype shows no such badge on facility cards or pages and no key exists. How is it shown?

A. **A "Not verified" badge in the facility hero and on every facility card** (recommended), beside the account count, styled like the doctor's badge (`badge warn`), with an explanation reachable without a pointer (`title` plus a visually hidden sentence on the profile). Two new keys, both dictionaries in one commit, Bengali flagged for review (FD-042): `facility.notVerified` "Not verified" / "যাচাই করা হয়নি" and `facility.notVerifiedWhy` "RogiKotha does not verify hospitals, clinics or diagnostic centres. These details come from the community, staff or the facility itself." / "রোগীকথা হাসপাতাল, ক্লিনিক বা ডায়াগনস্টিক সেন্টার যাচাই করে না। এই তথ্য এসেছে সম্প্রদায়, কর্মী বা প্রতিষ্ঠানের কাছ থেকে।". The badge never reads a column (T-201 BR2.5).
B. **The hero only**: cards stay as in the prototype. A reader comparing facilities on the index does not see the status.
C. **Prototype as is**: no badge; AC4.3.2 becomes a gap with an S2 row.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

Under T-201's Question 9 A a branch's `name` is its **organisation** and `branchName` its own name; there is no `parentName` (fact 3). The task's hero and card add a "Part of {parentName}" badge. What do the title and the parent badge show?

A. **Title "{name} — {branchName}" (branch name only when it differs), branch name first in the hero's sub-line, and no parent badge** (recommended). The organisation already is the title, so "Part of Shefa Health Group" under "Shefa Health Group" would repeat it; the siblings panel shows the other branches. The differences from the prototype (titles, the missing hospital name, colours) are recorded for the visual check, and an S3 row asks U6 and U14 whether to store the hospital name (finding F2).
B. **Keep the badge** as "Part of {name}" whenever the organisation has two or more branches. It repeats the title on f1, f4 and f6–f8.
C. **Store the hospital name** (a new `facility_branches` column, seed and view-model change, T-201 Question 9 B): titles match the prototype and the badge returns. A data-model change for U14 and U6, outside this Unit.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Every seeded facility has 1–3 accounts (fact 4), so all nine criteria distributions on every facility page are below the threshold. The prototype's full distribution prints "Limited data — Fewer than 5 experiences. Too few to show a pattern — read them individually." under each one: nine times per page. How is limited data shown on the criteria panel?

A. **Once at the panel, and a short mark on each limited criterion** (recommended). When `accountsLimitedData` is true, the criteria panel opens with one line "Limited data — {why with the configured threshold}"; each criterion whose own distribution is limited still carries a short "Limited data" tag after its denominator, so the mark stays on every sparse distribution as the hard rule asks. The hero badge (T-202 Question 3 A) stays. A criterion that is limited while the facility is not (more accounts, few answers) gets the short tag and the why-text under it.
B. **The prototype's full line under every limited criterion.** Nine identical sentences per page on the demo.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

The condition page's counted lists ("Where this condition is treated", "Usually seen by", medicines, treatments, symptoms) show counts without a denominator (fact 13). The hard rule says distributions always carry exact counts and their denominators. How are these lists framed?

A. **Add a denominator line to the places panel and each mention list, keeping the prototype's notes** (recommended): "Counted from {total} patient experiences" (new key `condition.countedFrom`, English plural, Bengali flagged) under each list, beside `condition.treatedAtNote` or `condition.mentionNote`. The "Usually seen by" pills sit directly under the lede that states the same total, so they get no extra line. One account can mention several medicines, so the line says "counted from", not "of".
B. **The prototype's notes only.** The total is visible in the lede at the top of the page, not next to the lists.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

What do a **condition, a facility card or a facility with no eligible accounts** show? On the seed, c8 "Gastric ulcer" has none (fact 16); a newly added branch has none. The prototype prints "0 patient experiences · 0 doctors people wrote about", an empty doctors panel and an empty account list.

A. **The topic index's wording, and nothing empty** (recommended). Where a whole topic or facility has no eligible accounts, the count reads `index.emptyTopic` ("No one has written about this yet.") in the condition lede, the topic card (as the task asks), the facility card and the facility hero; distributions read "Not provided"; panels with no rows (places, mentions, doctors, facilities, doctors here, branches) are left out; the accounts section shows the empty state with `index.beFirst` linking to `/write`. No new key.
B. **The prototype's zero counts**, empty doctors panel and empty list. A true count, but the page looks broken and reads "0" where the topic index says "No one has written about this yet."
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

Under T-201's Question 10 A an **unmapped provisional term** (a reviewer's own wording, AC5.3.2) has its own condition page with `provisional: true`; the prototype has no such page. The prototype's provisional callout ("Submitted wording, not yet mapped" + `condition.provNote`) appears on every condition page as general information. How is a provisional page marked?

A. **A "Submitted wording, not yet mapped" badge in the head, the name exactly as written, and no "Also written as" line when the only alias repeats the name** (recommended). The badge reuses `condition.provisional`; the general callout stays where the prototype has it. The page is otherwise the same; the topic index does not list provisional terms (T-201 BR4.4). No new key.
B. **No mark**: a provisional page looks canonical, so a reader cannot tell it is one person's wording.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

A Super Admin can turn **facility feedback off** (`featureVisibility.facilityAccounts`, FR100); `FacilityProfileVM` then has `feedbackVisible: false`, no criteria and no accounts (T-201 WF4). The task's "nine criteria always rendered" row does not cover this. What does the facility page show?

A. **Leave the feedback out without new copy** (recommended): no criteria panel, no accounts section, no account-count or limited-data badge and no "Describe your visit" button. The hero, "Not verified", the separation callout, doctors here and other branches stay. An S3 row asks U14 to add `feedbackVisible` to `FacilityCardVM` so the index hides the overall distribution too (fact 15).
B. **Nine criteria reading "Not provided"**, as the acceptance row literally says. It tells readers nobody wrote, which is not true.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

ISS-268 defers the "renders 'Not provided', never 0" check for the facility **address** to this Unit, and CR-012 chose the address as the facility's "Not provided" case. The prototype's facility page shows no address, and no branch has one (fact 5). Is an address row added?

A. **No address row; prototype structure kept** (recommended). "Not provided" is shown on facility pages by the unanswered criteria of f1–f5, which the demo walks in storyboard step 5; ISS-268's facility half is closed by that, with a note that no seeded branch has an address. When real addresses arrive, an address line is a small addition to the hero.
B. **An address line in the hero** ("Address: Not provided" with its provenance chip; new key `facility.address`). On the seed every one of the ten pages shows the same empty line.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

AC4.3.1 and FR24 say the **parent organisation "may show an aggregate summary"**, and 03 §1 says "parent aggregates disclose denominators". There is no parent page in the prototype or in any task, and T-201's view models carry no parent aggregate. Does a branch page show one?

A. **No parent aggregate in this release** (recommended). Each branch page shows only its own accounts (AC4.3.1's "only reviews of that visited branch"), and the other branches are listed for navigation. The optional aggregate is raised as an S4 row for the owner to schedule with a parent page.
B. **A parent summary panel on each branch page** (the organisation's overall distribution with its denominator): a T-201 view-model and port change and new copy.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

T-203 needs four small additions to T-202's shared primitives (fact 11): `Badge` classes `good` and `poor`; `DistBlock` `prefix: 'crit.'` (keys good, mixed, poor), its `title` in the compact image sentence (so the card's capsules are announced as "Overall visit") and an optional `limitedNote: 'full' | 'tag'` for Question 4's short tag; `EmergencyPanel` `compact`; and the segment parser and the facility label helper exported for reuse. T-202's files are T-202's owned paths, and T-202 has not been built.

A. **Ask U15 to include them in T-202's design now; T-203 makes them only if T-202 merges without them** (recommended). All four are additive (a wider union, an optional prop, two exports), so no consumer breaks. An S4 row for U15 records the request; T-203's hand-off records any of them it had to make itself, with the reason, as owned-path additions (the task already allows the `EmergencyPanel` one).
B. **T-203 always makes them** in T-202's files during its own Bolt.
C. **T-203 builds its own facility distribution component** beside `DistBlock`. Two components with one job; the task says not to re-implement the primitives.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 12

T-307 (experience page) depends on "T-203 (condition link)", but T-203's owned paths name no such component (fact 17). Who builds it?

A. **T-203 adds `components/patient/ConditionLink.tsx`** (recommended): `Link.link-btn.name-link` to `/topics/{publicId}` with the name, and plain text when the condition has no public id (a free-text tag); server component with tests in both languages, recorded as an owned-path addition. T-203's pages do not use it themselves; T-307 and later Units do.
B. **Leave it to T-307**, and correct T-307's dependency line.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 13

What does the **small emergency panel** on the condition page contain? The prototype's aside shows the emergency title and body only (no call buttons, no "last verified"); the full `EmergencyPanel` (Discover) adds the three tap-to-call lines and the last-verified date. The body names 999 and 16263 as fixed copy (fact 14).

A. **The prototype's compact content: title and body**, as `EmergencyPanel compact`, in T-011's static group (`data-static="emergency"`) and never inside `Reveal` (recommended). The fixed numbers in `emergency.body` are raised as an S3 row for U15 and U20 (the copy should take the configured numbers, as T-202 Question 4 did for the threshold); the Emergency page and the colophon link keep the full lines one tap away.
B. **The full panel** with the three call lines and the last-verified date in the aside. More useful on a phone, but larger than the prototype's design and it repeats Discover's panel.
C. **Title, body and the three call lines without the date.** A middle form the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 14

Below 1040 px the condition page becomes one column and its aside (doctors, facilities, the emergency panel) comes **after every account**, so on a phone the emergency guidance sits at the bottom of a long page. The project rule says to keep the emergency guidance "where the prototype has them".

A. **Keep the prototype's order** (recommended). The hard rule names the prototype's placement, the DOM order equals the visual order, and the colophon's Emergency link is on every page. An S4 row proposes a narrow-screen jump link to the doctors and emergency panels for the owner to decide with T-202's similar proposal.
B. **Move the aside above the accounts on narrow screens** (DOM order change). Changing where the emergency guidance sits needs the owner's decision, because the hard rule ties it to the prototype's placement.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 15

The owner asked for a rich patient UI with motion. Within FD-091 these pages get the layout's page transition, T-011's `Reveal` (first six items rise and fade when a list arrives after load) and press feedback. The task names three lists for `Reveal`: facility entries, topic cards and the mention panels. Which lists reveal?

A. **The task's three plus the two account lists** (recommended): the facility index list, the topic grid, each mention list, the condition page's account rows and the facility page's visit rows, as T-202 does for the profile's accounts. Not revealed: the criteria grid, the distributions and their bars (static at their final values, T-011 BR6.10), the places list and the specialty pills (in the first screen of the page), the separation callout and the emergency panel. If T-011's press selectors do not cover `a.browse-card`, `.mini-row` or the entry links, an S4 row asks U45 (T-203 adds no motion of its own).
B. **Only the task's three lists.**
C. **Also a shared-element morph** from a topic card into the condition head: needs a per-item view-transition name, which T-011 does not offer (the same proposal as T-202's Question 12, raised again as an S4 row).
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

- **R1 — Question 1 (FR49's sentiment model for facilities)** needs the owner's answer before Code Generation; options A and C build the same pages, option B adds a data-model change in U14, U6 and U26 first. `functional-spec.md` § 14 gives the variants.
- **R2 — The seed has no condition links** (fact 2, finding F1, S2). U14's Question 11 fallback must add one `review_tags` row with `term_id` per seeded review before this Unit's Build and Test, or the condition pages, the topic counts and storyboard step 2's resolved condition stay empty. Suggested: open the S2 row for U14 T-201 now.
- **R3 — The hospital name is not stored** (fact 3, Question 3, finding F2). The facility titles differ from the prototype and from the doctors' chamber names until U6 and U14 decide whether to store it; that decision is a data-model change.
