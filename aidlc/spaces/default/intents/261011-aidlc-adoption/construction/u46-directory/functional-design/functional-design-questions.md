# Functional Design — questions (U46 `u46-directory`)

U46 merges T-201 (directory and taxonomy modules), T-202 (doctor index and profile) and T-203 (facility and condition pages) into one Unit (FD-105). Start material: the reviewed T-201 design (`archive/2026-11-04-t-201-functional-design/`, verdict READY with two Major and two Minor findings) and the T-202 and T-203 drafts (`docs/aidlc-migration/design-drafts/`). Their answers carry over unless a question below changes them. Every question here was answered by the agent with the recommended option, under the owner's delegation of 2026-11-04 ("answer every open question yourself by the recommended option"). The owner can reverse any answer at the gate; `functional-spec.md` § 13 says what changes.

Baseline: `main` at `bc63889` (T-101 merged as `87a87c5`, the demo slice as `55d1173`, FD-102 removed CI, FD-105 re-plan).

## Settled before this stage

These are binding and are not asked again:

- FD-067: Directory and Taxonomy get review figures only through `ProviderExperience` and `ConditionStats`, implemented in a read-only Review stub (C6, C7).
- FD-100: member-added doctors are `published` at once with `community` provenance and a `pending` `profile_submissions` row; the list and profile show "Added by a member — not confirmed" while the submission is pending (C7 `directory.addMemberDoctor`, built here, called by U47).
- FD-101: the `/facilities` and `/topics` pages on `main`; a review is about a topic when a condition tag points at the term or its free text equals the term's name or an alias, ignoring case and outer spaces.
- FD-102: no CI. The gate is `pnpm check` (eleven steps) and `pnpm smoke`, run locally.
- FD-105 and C6: `taxonomy.mapProvisional`, claims, merges, field changes, profile redirects, search filters and the compare tray are release 2.
- C17: document counts only through the `PublicEvidenceCount` port, declared here and bound to today's behaviour until U48.
- C18: `limitedDataThreshold` (5), `emergency.*` and `featureVisibility.facilityAccounts` through the defaults-only `ConfigProvider`; the provisional-term limit is a taxonomy constant, 30 per account per hour per process, key `taxonomy.createProvisional:account:<accountId>`.
- C19: `defineQuery`, `defineCommand`, `RateLimiter`, `ConfigProvider` and `getActor()` exist on `main` as T-101 built them; module factories are wired in `container.ts`.
- The owner's answers of 2026-10-28: counts with denominators and no percentages (T-202 Question 1 B); facility feedback is the nine criteria with no sentiment (T-203 Question 1 A); each branch keeps its own hospital name (T-203 finding F2). None of them has an FD row yet; § 17 of `functional-spec.md` proposes them.
- T-201 answers kept: Questions 1 (commands per C6, now only `createProvisional`), 2 (ports carry display-ready data), 3 (distribution shape with `notProvided`), 4 (the `suggested` flag with the explicit prototype mapping), 5 (fixed tag groups), 6 and 7 (provenance default and hidden flag), 8 and 12 (stored hues, else `stableHue`), 10 (provisional terms have their own page), 14 (chambers are the only doctor–branch link).
- T-202 and T-203 answers kept, apart from parts that need T-204 or search: Limited data also on cards and heroes (T-202 Q3), counts phrased with ICU plurals (Q5), filter pills as links with `aria-current` (Q6), no avatar morph (Q12), the side panel after the accounts (Q13), the shared primitives with T-203's additions (Q14), facility rows named "name — label" (Q15); "Not verified" on facilities (T-203 Q2), one panel-level Limited data line on facility criteria (Q4), counted lists framed with "counted from n" (Q5), zero-account pages (Q6), the compact emergency panel on condition pages (Q13, Q14), which lists reveal (Q15), the "Part of" badge with a parameter (Q16).

## Question 1 — Which demo-slice directory code does U46 replace, and when? (T-201 review, Major 1)

The demo slice serves `/doctors`, `/facilities` and `/topics` from `packages/database/src/demo/doctors.ts` and `demo/facilities.ts` through `apps/web/src/server/data.ts`. Some of those functions are also called by pages other Units own: the home (`listRecentPublishedReviews`, U20), `/experiences` (the same, U47), `/write` and its action (`listDoctorOptions`, `listSpecialtyOptions`, U47) and the edit page (`getDoctor` by uuid, U22).

A. **Retire in this Unit's Bolt everything only U46's pages call; leave the four functions other pages call, unchanged, until their Units switch** (recommended). U46 deletes `listDoctors`, `listPublishedReviewsForDoctor`, `listTopics`, `getTopic` and their helpers from `demo/doctors.ts`, deletes `demo/facilities.ts`, and switches the three routes to the module queries in the same commit. `main` then has one doctor-list and branch query, one topic-counting rule and one review-eligibility predicate for directory pages. The retained functions keep the same predicates and go when U20, U47 and U22 switch their pages (U50 removes any left without a caller).
B. Retire all of `demo/doctors.ts` now and edit the home, experiences, write and edit pages to call the new queries. U46 would touch four other Units' files, and those Units would collide with it in the swarm.
C. Build the modules beside the demo code and switch nothing. `main` keeps two predicates and two topic rules, which the review rejected.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 2 — Does FD-101's free-text topic match carry into the module? (T-201 review, Major 1)

The merged topic pages count a review for a topic when a condition tag points at the term or its free text equals the term's name or an alias (FD-101). The seed writes only free-text condition tags, so 21 of 24 seeded reviews reach their topic only through this match. T-201's design counted term tags only and planned to seed a term tag per review (its Question 11 B).

A. **Keep the match as the one "about a condition" rule, used by every condition figure** (recommended): topic index totals, the condition page, a doctor's conditions and condition filter, and a card's condition link. Counts on the merged pages do not change, no FD row is needed, and the seed keeps writing reviews as authors wrote them, so T-201's Question 11 B (seeded term tags in `seed-content.ts`, a block U47 owns) is dropped.
B. Drop the match and seed one term tag per review. Needs an FD row superseding part of FD-101 and an edit to the review block of the seed.
C. Keep the match for topic pages only and count term tags elsewhere. Two counting rules again.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 3 — How does a branch keep its own name without changing `facility_branches.name_*` under the merged pages? (T-201 review, Major 1; T-201 Question 9 C)

Today `facility_branches.name_*` holds the branch's label when it has one ("Dhanmondi branch") and its full name otherwise ("Bandar Diagnostic Centre"); the merged page shows the organisation as the title. The owner chose to store each branch's own name ("Shefa General Hospital"). T-201 put that name into `name_*` and moved the label to a new column, which changes what the column means for every running database.

A. **Keep `name_*` as it is and add a nullable `own_name_en/bn` pair (both or neither), filled only for a branch whose `name_*` is a label; add `avatar_hue` in the same migration** (recommended). Title = own name, else the organisation's name; label = `name_*` when it differs from the title; parent = the organisation when it differs from the title. A database seeded before this Unit has no own names and shows exactly what the merged page shows today ("Shefa Health Group", "Dhanmondi branch"); after `pnpm demo:reset` it shows the prototype's "Shefa General Hospital", "Dhanmondi branch", "Part of Shefa Health Group". Additive, reversible, no data migration, no reset required for correctness.
B. T-201's Question 9 C: `name_*` becomes the hospital name, new `branch_label_*`; the seed, the migration and the pages change in one Bolt, and every existing database needs `pnpm demo:reset` or it shows labels as titles.
C. No schema change: keep the organisation as the title. "Shefa General Hospital" never appears, against the owner's answer.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 4 — How do the view models carry FD-100's "not confirmed" mark? (T-201 review, Major 2)

A. **A boolean `memberAddedNotConfirmed` on `DoctorCardVM` and `DoctorProfileVM`, derived in SQL in the directory repository as "a `profile_submissions` row of kind `doctor` with `created_doctor_id` = this doctor and `status` = `pending` exists"** (recommended). It is false once staff decide the submission (release 2). The list and profile show "Added by a member — not confirmed" next to "Registration not verified", with the why note on the profile. A database test covers pending, decided and no submission.
B. The same flag on every doctor reference (condition page, facility page, experience cards). More surface for the same fact; the demo shows it on the list and the profile only, as C7 states.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 5 — Empty profile facts: omit, or show "Not provided"?

The merged profile prints every fact with "Not provided" when it is empty. AC4.1.3 says empty fields are omitted entirely; the hard rule says a missing value reads "Not provided", never 0. CR-012 left `about` empty on d7–d10 and `address` empty on f6–f10 as the seed's "Not provided" cases (ISS-268).

A. **Omit empty entries of the facts list (BMDC number, specialty, qualifications, languages, fee) and chamber hours, as AC4.1.3 says; a slot the page always has (the hero's specialty and place line, the About panel, the facility address, every distribution, the document count) reads "Not provided" or "No documents"** (recommended). The view models leave every missing value out; the page decides between omitting and the fixed text. ISS-268 closes on the seeded d7–d10 and f6–f10.
B. Keep the merged behaviour: every fact row shows "Not provided". Contradicts AC4.1.3.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 6 — Doctor index order

The merged `/doctors` lists most published experiences first, then name (its note `profile.list.orderNote`). The prototype lists by name (`byName`, note `index.doctorsNote`), as T-201 BR2.8 and the T-202 draft do. Both orders are neutral under the hard rule.

A. **Alphabetical by the active-locale name, then public id, with `index.doctorsNote`** (recommended): the prototype is the source of truth for behaviour, and facilities and topics are already alphabetical (FD-101).
B. Keep the merged order (most accounts, then name).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 7 — The two demo records of T-201 Question 13 (d11 without fee and languages, r25 without sentiment and outcome)

They were added so "Not provided" shows on a doctor page from seed data. They need edits to the prototype data, the corpus port and the corpus tests, and an FD row against FD-089.

A. **Drop them** (recommended). Seed pages already show "Not provided" in the About panel (d7–d10), the facility address (f6–f10) and unanswered facility criteria; the distribution and partial "Not provided: n" cases are proven on builder rows in the query and component tests. No prototype edit, no FD row.
B. Add them as T-201 designed.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 8 — `PublicEvidenceCount`: add the batched form?

C17 allows U46 to add `countPublicEvidenceByReview(reviewIds)` if its design needs it. Card document counts, profile totals and the "Has documents" filter need a count for every review on a page.

A. **Add it; a review absent from the map counts 0** (recommended). The Review stub calls it once per page. The interim binding in `container.ts` maps it onto the demo's single-review `countReadyEvidence` for each id (a few dozen small queries on the seed, recorded as an S4 row), and U48's implementation answers it with one grouped query.
B. Single-review form only: the stub loops, and U48 cannot batch later without a breaking change, because the signature is frozen at U46's merge.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 9 — Account rows on doctor and topic pages

The merged pages reuse the home's `ExperienceRow`, which also shows the comment count and the Edited tag. The prototype's `accountRow` shows sentiment, outcome, condition and documents, the title, the byline, the episode date with the doctor link, an excerpt and "Read the full experience".

A. **A shared `AccountRow` that ports the prototype's `accountRow` over `ExperienceCardVM`, with the evidence wording "Documents attached — not medically validated" and the count, or "No documents"** (recommended). Comments (U49) and versions (U22) stay off the directory's cards, so the Review stub reads no community table; the home and `/experiences` keep their own rows until U20 and U47 switch.
B. Keep the home's row with comment counts; the stub would read `comments` and `review_versions` for the directory pages.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 10 — Index size

`listDoctors` and `listFacilities` return a bounded page. The seed has 10 doctors and 10 branches; member-added doctors grow the list.

A. **One page of up to 100, with `total`; no paging UI in release 1; an S4 row for paging with search in release 2** (recommended).
B. Add `?page=` with previous and next links now.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 11 — Profile redirects and condition redirects

T-201 built `directory.resolvePublicId` (profile_redirects) and `taxonomy.resolvePublicId` (canonical_id) for 308 redirects. In release 1 nothing writes a redirect: merges (T-204) and `mapProvisional` are deferred.

A. **Do not build them in release 1; reads still use the effective term (`canonical_id` when set) so release 2's mapping counts at once; an unknown, hidden, merged or mapped id answers 404** (recommended).
B. Build them now for data nothing creates.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 12 — Seeded reviews whose free text matches no topic

Under Question 2 A, r2 and r21 ("হাইপোথাইরয়েড") do not match c2 "Thyroid (hypothyroidism)" or its aliases, and r8 ("ছত্রাক সংক্রমণ", fungal infection) does not match c4 "Eczema". The merged pages already count them this way.

A. **Keep the counts as the authors' words give them; record an S4 row naming the three reviews, so the owner can add an alias to the prototype data later** (recommended). Seed-based acceptance rows take their expected counts from the corpus with the same matching rule.
B. Add "Hypothyroidism / হাইপোথাইরয়েড" as a c2 alias in the prototype data now (r8 stays unmatched, because fungal infection is not eczema).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 13 — Doctor `about`

The prototype's profile has no About text; the merged profile shows it ("Not provided" on d7–d10).

A. **Keep it as an optional `about` field, shown in the side panel, "Not provided" when empty** (recommended): it is visible on `main` today and closes ISS-268's doctor half on seed data.
B. Drop it to match the prototype.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 14 — Who may call `taxonomy.createProvisional` directly?

U47's composer creates terms at publish through the provisional-term operation on its own transaction with its persona actor (T-201 F12). The command adds a direct path for a verified, unrestricted account.

A. **Build the command as C6 states (verified, not restricted, 30 per hour per account, per process), but nothing in release 1's UI calls it; the composer uses the operation at publish** (recommended).
B. Do not build the command; C6 is amended.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)
