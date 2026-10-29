# Functional Design — questions (U14 `t-201-directory-and-taxonomy-modules`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-201-directory-and-taxonomy-modules/functional-design/`. Refreshed on 2026-10-29 (see `functional-spec.md`, "Refreshed 2026-10-29").

Context:
- Unit U14 (kind `library`, size M in `unit-of-work.md`, L after this refresh, not high risk) delivers T-201 (`docs/implementation/tasks/T-201-directory-and-taxonomy-modules.md`, with its FD-067 and C6/C7 amendments and the addendum) for stories US4.1, US4.3, US5.3 and US6.4. U14's own responsibilities also name ISS-222. Bolt 13 in `bolt-plan.md`, after U8 T-101, U10 T-103, U11 T-104 and U12 T-105, and after U3 T-010.
- Inputs read: `unit-of-work.md` (U14, the decision-change table, the open point "Schema gaps: AC5.3.4 and AC11.1.5 tag-group rename and reorder (fixed enum), and the suggested-term flag (Taxonomy) → U14 Functional Design"), `unit-of-work-story-map.md`, `requirements.md` (FR15–FR18, FR24–FR27, FR36–FR38, FR48–FR52, the limited-data assumption), `stories.md` (AC4.1.1–AC4.1.5, AC4.3.1–AC4.3.5, AC5.3.1–AC5.3.5, AC6.4.1–AC6.4.5, AC11.1.5), `components.md` (Directory, Taxonomy, Review) and `contract-summary.md` (C1, C6, C7, C9, C15 and the common rules).
- Code read on `main` at `f91c9de` (2026-10-29, after CR-012 `7cce9bd`): `packages/database/src/schema/{directory,taxonomy,review,identity,evidence,enums}.ts`, the repository stubs `repositories/{directory,taxonomy,review,not-implemented}.ts`, `packages/contracts` (view models `doctor.ts`, `facility.ts`, `condition.ts`, `experience.ts`, `discover.ts`, `search.ts`; schemas `directory.ts`, `taxonomy.ts`, `review.ts`; `config-values.ts`, `ids.ts`, `page.ts`, `errors.ts`), `packages/application/src/index.ts` and `packages/domain/src/index.ts` (both still empty placeholders), `packages/test-support/src/{fakes/repositories.ts, fakes/rate-limiter.ts, fakes/repositories-superset.test.ts, seed/seed-directory.ts, seed/seed-content.ts, seed/seed.int.test.ts, corpus/*, scripts/port-corpus.mjs}`, the prototype data in `ui-design-prototype/shared/rogikotha-data.js` (`doctors`, `facilities` with `name`, `branch`, `parent`, `accent`, `doctors`; `reviews` with `conditionId`; `reviewsFor`, `distribution`, `conditionsFor`, `evidenceCount`, `hash`, `criteriaDist`, `branchesOf`, `facilitiesForDoctor`, `conditionAccounts`, `doctorsForCondition`, `tagFrequency`) and the renderers in `concept-04b-quiet-clinic-minimal/app.js` (`accountRow`, `doctorEntry`, `facilityEntry`, `renderProfile` and its `facts` list, `renderCondition`, `renderFacility`, the three index renderers, `byName`, `byline`, `TAG_GROUPS`).
- T-010 as built on `bolt/t-010-boundary-lint-and-ci` (read with `git show`, not merged at the time of writing): `eslint.boundaries.mjs` and `01-conventions.md` §2 (the element matrix, FD-093), `vitest.workspace.ts` (coverage `include` over every source root, the 80% line threshold per package, the `test-support-seed` project in `sequence.groupOrder` 2), `packages/database/vitest.config.ts` (group 1), `packages/database/src/repositories/not-implemented.test.ts` (ISS-294), `validator-probes.int.test.ts` P8 and `migrations.int.test.ts` (both pin 9 applied migrations), `packages/test-support/src/fakes/repositories.test.ts` (tests the fake distribution methods by their current names), `package.json` (the nine-step `pnpm check`).
- Owner's answers read in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`: T-203 F2 (store each branch's own hospital name), T-202 Q1 (counts only, no percentages), T-203 Q1 (the nine-criteria facility model), ISS-271 kept, T-105 R2 (threshold 2–50). Upstream drafts read for what they need from this Unit: `t-202-doctor-index-and-profile` (F1: the seed shows no "Not provided" on a doctor page), `t-203-facility-and-condition-pages` (F1 condition links, F2 hospital name, F8 `feedbackVisible` on cards), `t-207-discover-emergency-about` (F2 condition links, chip counts), `t-105-runtime-configuration` (Q2: `current()` returns a Promise), `t-301-review-module-core` (the provisional-term operation on the caller's transaction, the migration-count pins).
- Open `ISSUES.md` rows in this area: ISS-157 (no `taxonomy_terms.suggested` column, owner T-201), ISS-222 (`FakeReviewRepository` distributions count every row, owner T-201), ISS-091 (stub method names may be renamed by T-201), ISS-168 (`claimed` doctors have no `claimed_by_account_id`), ISS-179 (seed guards at term granularity), ISS-266 (d3's chamber does not link to f4, owner U14 T-201), ISS-268 (the "Not provided" mapping half deferred to U14 T-201), ISS-271 (f1 and f4 "Shefa General Hospital", accepted by the owner), ISS-294 (each Unit that implements a stub repository updates `not-implemented.test.ts`).

## Settled before this stage

These are decided by FD entries, the contracts, an earlier Unit or the owner's answers, and are not asked again.

- **Directory and Taxonomy read review-derived figures only through ports (FD-067, C6, C7).** Directory declares `ProviderExperience`, Taxonomy declares `ConditionStats`, and U14 builds Review's implementations of both in `modules/review` as a ports-only stub before T-301 exists. Neither module imports the review module or `ReviewRepository`.
- **The review read queries and policies are U14's (03 §4 ownership note, C9).** `review.sentimentDistribution`, `review.outcomeDistribution`, `review.criteriaDistribution`, `review.listExperienceCards` and `domain/review/policies.ts` (`distribution`, `isLimitedData`) are created here; T-301 extends them and may not rewrite them.
- **The limited-data threshold comes from the configuration, read with `await config.current()`.** `ConfigProvider.current()` returns `Promise<ConfigValues>` (T-105 Question 2, defined by U8 T-101); the threshold's range is 2–50 (the owner's answer to T-105 R2, 2026-10-29), so "Limited data" can never be switched off. It is never a constant in code.
- **Every doctor shows "Registration not verified" (D-003, FR16).** The value is unconditional, never derived from `bmdc_number`.
- **Only public content counts (FR50).** Ineligibility marking by a Super Admin (AC6.4.4) and the summary freeze (AC6.4.5) are schema gaps owned by U33 T-404 with U22 T-302 (`unit-of-work.md` open points); U14 counts what is published and not deleted.
- **No percentage anywhere** (the owner's answer to T-202 Question 1, 2026-10-28). View models carry exact counts and their denominators; FR48 and AC6.4.1 are narrowed by the FD entry T-202's Functional Design writes.
- **Facility feedback is the nine-criteria model, with no sentiment** (the owner's answer to T-203 Question 1, 2026-10-28). FR49 and AC6.4.3 are reworded by the FD entry T-203's Functional Design writes; nothing in this Unit adds a facility sentiment.
- **Each branch stores its own hospital name from the prototype** (the owner's answer to T-203 finding F2, 2026-10-28). This Unit owns the data change (Question 9, answer C).
- **"Shefa General Hospital" stays the name of f1 and f4** (ISS-271, accepted by the owner on 2026-10-28; the risk stays noted for any public showing of the demo).
- **Import boundaries and coverage are T-010's (FD-093, D10).** `domain` imports nothing; `contracts` only `zod` and `uuid`; `application` only `domain` and `contracts`, with no external package; `database` only `application` and `contracts` (not `domain`); seed code may import `database` (FD-040); test files in `packages/*` may import `test-support`. Every source file counts toward the 80% line floor, so a new file without a test counts at 0%; `packages/application` and `packages/domain` are measured once they hold code. The seed integration test runs in its own project after the database project.
- **No new dependency.** Grapheme-aware truncation uses the built-in `Intl.Segmenter`; everything else uses libraries already installed. No dependency-check entry is needed unless Code Generation finds otherwise.
- **Since 2026-10-29 agents decide every open point by recommendation without asking** (the owner's instruction). Questions 12–14 and the former R1–R3 below are decided that way; each is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it.

## Settled in this design without a question

These follow from the contracts, the project rules, the code or a later Unit's design, so they are design decisions, not open points. Each is explained in `functional-spec.md` § 13.

- **The contract names win over the task text where they differ.** `contract-summary.md` states that it wins over 03, and T-201's FD-076..FD-090 amendment quotes C6/C7. So the distribution flag is named `limitedData` (C6, C7, 03 §4 and the existing view-model stub), not `limited`; the T-201 acceptance row "limited" is read as `limitedData`.
- **Public ids only in view models.** Every reference in a view model is a `publicId`; internal UUIDs, `seed_ref`, persona ids and every account id (including `claimed_by_account_id` and `created_by_account_id`) stay out. `claimed` is a boolean.
- **Locale comes from the Actor.** Queries read `actor.locale` (01-conventions §5), which the web tier sets from the route segment, and the repository mappers pick the `*_en` or `*_bn` column. User-written text (review title, body, free-text tags, a provisional term's wording) is shown in its original wording in both locales.
- **Index lists are alphabetical in the active language** (the prototype's `byName`, an allowed neutral order under AC5.2.2), with the public id as tie-break; account lists are newest first (AC5.2.3 default). Nothing is ordered by sentiment, outcome, reactions or evidence.
- **Facility "Not verified" is a constant**, like the doctor flag: no facility verification exists (FR25), so `notVerified: true` on every facility view model.
- **Facility feedback visibility follows `featureVisibility.facilityAccounts`, on cards too.** When the setting is off, facility profiles and facility cards carry `feedbackVisible: false` and no count, flag, distribution or account, and the summaries are not read (T-203 finding F8).
- **`ExperienceCardVM` moves to `view-models/experience-card.ts`** (the file T-201's owned paths name). The stub of the same name in `experience.ts` (T-307's file) is removed and re-exported from the new file, so `search.ts` keeps compiling; this is a recorded owned-path addition.
- **Repository stub methods are renamed to the port names** (ISS-091 allows it). The T-201 stubs in `repositories/{directory,taxonomy,review}.ts` are replaced; the stubs owned by T-204, T-301, T-302 and T-407 stay untouched. The fakes in `test-support` and their tests are renamed to match, so `repositories-superset.test.ts` stays green, and `FakeReviewRepository` gets the eligibility filter (closes ISS-222). `not-implemented.test.ts` keeps proving the stubs that remain (ISS-294).
- **One provisional-term operation, two callers.** `createProvisional`'s work is one Taxonomy operation that runs on the caller's transaction: the command wraps it, and U21's `review.publish` calls it inside its own transaction with its persona actor (T-301 draft). The operation never writes `created_by_account_id`, so taxonomy data never ties an account to a wording that may appear on an anonymous review.
- **Keys are computed before the database.** `normalizeAliasKey` lives in `domain`, which `database` may not import (T-010), so commands and the seed compute every key and the repositories receive it.
- **A card's condition prefers a condition term tag** over a free-text one, so a review that carries both (the seed after Question 11) links to its term, as the prototype's `conditionId` does.
- **Seed-based acceptance rows run in `seed.int.test.ts`**, the one file of the `test-support-seed` project, which may import `database` and `application` (FD-040) and runs after the database project.
- **Integration tests insert their own rows.** `pnpm test:int` resets the test database once per run (CR-007), so each test builds its own doctor, branch and reviews and never assumes an empty table; seed-based rows read their expected counts from the corpus (FD-089 changed the corpus size in U6 CR-012).

## Question 1

C6 lists two commands as built by U14: **`taxonomy.createProvisional`** (`{kind, text, lang} → {termId}`, verified account, outbox `term.changed`) and **`taxonomy.mapProvisional`** (`{termId, canonicalId}`, Super Admin, audit `taxonomy`, outbox `term.changed`). T-201's own text says it has no commands, and the repository stubs name both methods as T-201's. Who builds them?

Why this is open: the contract summary says it wins over 03 and names U14; the task file was written before Contract Design and says "commands are T-204", which refers to the directory commands. U26 T-306 calls `createProvisional` from the composer, and AC5.3.2/AC5.3.3 (provisional tags, canonical mapping) trace to these two commands. No other Unit's owned paths include `modules/taxonomy/commands/`.

A. **Build both in U14, as C6 says** (recommended). Two small commands in `modules/taxonomy/commands/`, with `authorization.ts`, their audit row and their outbox row in one transaction (01-conventions §3). They need only the Actor (U8, U10), the `AuditWriter` and the `Outbox` port, which exist by Bolt 13. The Unit grows by about an hour; AC5.3.2, AC5.3.3 and AC5.3.5 get a builder.
B. **Build only `createProvisional`** (the composer needs it) and leave `mapProvisional` to a staff-side Unit. C6 would have to be amended and no Unit owns the mapping today.
C. **Build neither**; record an ISS row and let the owner assign them. U26 would reach Code Generation with no command to call.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 2

The pinned port signatures do not carry everything the view models need. **`ProviderExperience.forDoctor`** returns `{cards, sentiment, outcome, documentCount, total}`, but the doctor profile also needs the per-condition counts and breakdown, the condition-scoped total and the filtered count, and the doctor index needs summaries for many doctors at once. **`ConditionStats.forCondition`** returns `doctors: [{doctorId, count}]`, `facilities: [{branchId, count}]` and `districts`, but Taxonomy cannot turn a doctor id into a name: Directory already depends on Taxonomy (it reads the specialty term), so Taxonomy reading Directory would be a cycle. `mentioned: [{kind, termId, count}]` also cannot carry free-text tags, which have no term id (and the seed's tags are all free text). How are the ports completed?

Why this is open: C6/C7 are the contract, and the common rules allow additive changes ("a new optional field ... consumers ignore unknown fields"). Review sits above Directory, Taxonomy, Identity and Evidence in the dependency graph, so Review's implementation may read their tables; Directory and Taxonomy may not read Review's.

A. **Extend both ports additively, so Review returns display-ready data** (recommended). `forDoctor` adds `conditions`, `scopedTotal`, `showing` and `limitedData`; a new `summariesForDoctors(ids)` and `summariesForBranches(ids)` serve the index pages in one query each; `forCondition` takes the locale and returns doctor, facility and place rows with names, `mentioned` with labels (term name or original free text), `specialties`, and `limitedData`. `districts` is delivered as `places` (hospital, area, city), the level the prototype shows. Code Generation corrects 03 §4 and adds a dated note to C6/C7. No consumer exists yet, so nothing breaks.
B. **Keep the ports as pinned and let the web page compose** the condition page from `taxonomy.getCondition` plus Directory lookups. The `ConditionPageVM` would no longer be one query's result, and every page Unit (U16, U20) would repeat the composition.
C. **Keep the ports and give Taxonomy a read of Directory's tables.** This creates the cycle FD-067 exists to prevent.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 3

How do the view models express **"Not provided"** and **"Limited data"**? AC6.4.2 wants a doctor with 3 eligible reviews, two without sentiment, to show "the exact count 3 with Limited data, missing sentiment and outcome as Not provided". The prototype's `distribution()` counts only the reviews that have a value, ignores the rest, and marks `limited` on its own total.

Why this is open: the hard rule says "Limited data" shows when the number of **eligible accounts** is below the threshold, while the prototype tests each distribution's own total. Without a count of the accounts that gave no value, the UI cannot show "Not provided" next to a partial distribution without subtracting numbers itself.

A. **Distribution carries `counts` (every key, in render order), `total` (recognised values), `notProvided` (eligible accounts with no value), `empty` (`total` is 0), `limitedData` (0 < `total` < threshold) and `keys`; every summary also carries its eligible-account total with its own `limitedData`** (recommended). The profile shows "3 accounts · Limited data" from the summary and "Not provided" for the two missing values; a distribution with few values is also marked, which is stricter than the hard rule asks and never weaker. Nothing in the VM is a percentage, and no page renders one (the owner's answer to T-202 Question 1).
B. **Prototype shape only**: `counts`, `total`, `empty`, `limitedData` on the distribution's own total; the UI derives "Not provided" from the account total it gets elsewhere.
C. **Limited data only on the eligible-account total**, none on distributions. A distribution of 2 out of 9 accounts would show without a limited-data mark.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 4

**ISS-157: `taxonomy_terms.suggested` does not exist**, so `taxonomy.listSuggested` (the task addendum) has no data. The prototype's composer suggestions (`TAG_GROUPS` in `app.js`, 12 items across the four groups) are not in the corpus at all: only the ten conditions and the specialties are seeded as terms. How is the gap closed?

Why this is open: the column needs a forward-only migration and a schema edit, outside T-201's listed owned paths. ISS-157 names T-201 as its owner. U6 CR-012 (the seed Unit) ran earlier and could not seed a column that did not exist yet.

A. **U14 adds the column and seeds the suggestions** (recommended). The Unit's migration (the next free number at build time) adds `suggested boolean not null default false` and `suggested_order smallint null` to `taxonomy_terms`; `schema/taxonomy.ts` gets the two columns; `seed-directory.ts` seeds `TAG_GROUPS` through an explicit mapping: the three condition suggestions flag the existing condition terms (Type 2 diabetes → c1, High blood pressure → c3, Hypothyroidism → c2, whose name and aliases do not match "Hypothyroidism" by key), and the nine symptom, treatment and medicine suggestions become canonical, published terms of their kind; no new condition term is created. All three files are recorded owned-path additions; `rk_worker`'s table-level SELECT on `taxonomy_terms` covers the new columns, so no grant changes. Closes ISS-157.
B. **Ship `listSuggested` returning an empty list** and leave ISS-157 open. The composer (U26) shows no suggestion chips.
C. **Derive suggestions from use** (the most-tagged canonical terms per group). This changes what "suggested" means and counts only condition terms on the seed (Question 11).
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; the explicit mapping refined in the refresh of 2026-10-29; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 5

The Units Generation open point assigns the **AC5.3.4 and AC11.1.5 schema gap** to this design: a Super Admin "renames, merges, redirects, deactivates or reorders a tag group or value" with audit history. Tag groups are a fixed database enum (`tag_group`: symptom, condition, treatment, medicine); terms have no order column and no deactivated state of their own. How does U14 settle it?

Why this is open: FR38 is Must. FD-018 allows taxonomies to be runtime configuration but does not require it, and keeps structural data boundaries deployment-controlled; today the tag groups are a schema enum, so changing them is a data-model change. No Unit's task file builds term management beyond `mapProvisional`; FD-088 keeps the staff side of release 1 to what release needs and does not name taxonomy management.

A. **Groups stay a fixed enum; U14 builds the read side for values and the mapping command** (recommended). Group labels are i18n strings and their display order is the enum order. For values, U14 makes every read honour a redirect (`canonical_id`, so merged or redirected terms land on their target) and treats a term in state `hidden` as deactivated (out of lists and `resolve`; its tags keep their wording without a link). `mapProvisional` is the one management command (Question 1). Rename, merge of two canonical terms, deactivate and reorder commands move to release 2 by an FD entry (decision R1 below).
B. **U14 builds all the value-management commands now** (rename, merge, redirect, deactivate, reorder, each Super Admin with audit). The Unit roughly doubles and builds staff commands with no staff screen in release 1.
C. **Turn tag groups into a table** with a migration and management commands. FD-018 permits it, but it is a data-model change (`02-data-model.md` §0, every `tag_group` column) with no Unit to build the screens.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 6

AC4.1.4 wants **every public field to show its provenance and last-update date**. On the seed, `languages` has no entry in `field_provenance` for d1–d6 (the prototype hard-codes `community` for it), and a profile edited later may have other populated fields without an entry. What does such a field show?

Why this is open: omitting the field would hide real data; inventing a source could overstate it.

A. **Default to Community submitted with the profile's last update** (recommended): the lowest-trust source, which is what the prototype shows for languages, dated by `doctors.updated_at`. T-204's field changes write real entries from then on.
B. **Omit the field** until it has an entry. Languages would disappear from every seeded profile.
C. **Show the value with no provenance**. AC4.1.4 would fail for that field.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 7

AC4.1.3 and FR17 say profile fields are **individually hideable** and a populated, hidden field does not render. No column or setting records a hidden field today.

Why this is open: the read side is U14's; the write side (a provider or staff hiding a field) belongs to U17 T-204 or a later staff Unit. A read-only convention costs no migration because `field_provenance` is JSON.

A. **Honour a `hidden: true` flag on a field's provenance entry in the read path** (recommended). `omitEmptyFields` drops hidden fields as it drops empty ones; nothing writes the flag yet, and the domain test proves the behaviour with a builder. T-204's Functional Design decides who may set it.
B. **Defer hiding entirely** and mark the hidden half of AC4.1.3 as a gap with an ISS row.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 8

Where does **`avatarHue`** come from? Step 4 says `hash(publicId) % 360` (the prototype's FNV-1a, ported as `stableHue` in `contracts/ids.ts`); the addendum says "from the new `avatar_hue` columns". On the seed, doctors have `avatar_hue`, facilities have the column but it is not seeded, and branches have no column (the corpus has a hue per branch that is dropped; Question 12 adds the branch column).

A. **The column when it has a value, otherwise `stableHue(publicId)`** (recommended). Seeded doctors and branches keep the prototype's colours; any later profile gets a stable colour that never changes for the same profile. `stableHue` is a pure function in `contracts/ids.ts` (owned-path addition), tested against the prototype's `hash`.
B. **Always `stableHue(publicId)`.** The seeded doctors lose the prototype's colours.
C. **Column only**; null goes to the UI as a default hue. Every later profile looks the same.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 9

How are **facility names** projected? The prototype has three names per branch (for f1: hospital "Shefa General Hospital", branch "Dhanmondi branch", parent "Shefa Health Group"), and the corpus carries all three (`branches.ts` `name` and `branchLabel`, `facilities.ts` the organisation). The database stores two: `facilities.name` (the organisation, seeded "Shefa Health Group") and `facility_branches.name` (seeded with the branch label "Dhanmondi branch", or the hospital name when a branch has no label). The hospital name of a labelled branch is stored nowhere. T-201's VM names `name`, `branchName?` and `parentName?`.

A. **`name` = organisation name, `branchName` = the branch's stored name, omitted when it equals the organisation name; no separate `parentName`.** Cards read "Shefa Health Group — Dhanmondi branch", while d1's chamber reads "Shefa General Hospital": one place under two names (T-203 finding F2).
B. **Three names over the stored data**: `parentName` = organisation name when it has two or more branches, `name` = the stored branch name. Seeded f1 would read "Dhanmondi branch" as its title.
C. **Store each branch's own name and its label** (the owner's answer). `facility_branches.name_en/bn` holds the branch's own name (the hospital as the prototype names it, "Shefa General Hospital"), a new `branch_label_en/bn` holds the label ("Dhanmondi branch", both or neither), and the view models carry `name` = the branch's own name, `branchName?` = the label, `parentName?` = the organisation when it differs from `name`. Titles read as the prototype's ("Shefa General Hospital — Dhanmondi branch", "Part of Shefa Health Group"), and the chamber and condition-page names match. A data-model change in this Unit's migration and seed (FD entry, `functional-spec.md` § 17).
X. Other (please specify)

[Answer]: C (the owner's answer of 2026-10-28 to T-203 finding F2: store each branch's own hospital name from the prototype, so facility pages, chambers and condition pages show one name; recorded in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md)

## Question 10

Does a **provisional condition term get a condition page**? `createProvisional` makes a term the moment a reviewer tags an unmapped condition (FR37). AC5.3.3 says that once mapped, clicking the alias opens the canonical page.

A. **An unmapped provisional term has its own page, marked provisional; a mapped term redirects to its canonical page; the topic index lists canonical terms only** (recommended). The tag on the review is never a dead link, the original wording stays visible (AC5.3.2), and the index is not filled with one-off wordings. `taxonomy.resolvePublicId` gives the page its redirect, the same way `directory.resolvePublicId` does for merged profiles.
B. **Provisional terms get no page until mapped** (`not_found`); their tags render as plain text.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md when the stage finalises it)

## Question 11

**The seed never links a review to its condition term.** Every corpus review carries `conditionSeedRef` (the prototype's `conditionId`), but `seed-content.ts` writes only the review's free-text tags (`review_tags.free_text`, in Bengali) and no `review_tags` row with `group = condition` and `term_id`. On the seed, every doctor's condition list, every condition page, the topic index counts and Discover's chips and browse grid are therefore 0, and the T-201 acceptance rows ("facts ... d1", "zero-count topics", "`forCondition` ... exact counts for the seed") cannot pass. Who fixes it?

Why this is open: T-201 says a missing seed column goes to the human instead of being edited here. U6 CR-012, the seed-correction Unit, ran first. **Refresh 2026-10-29:** CR-012 merged (`7cce9bd`) without the links and no `ISSUES.md` row was opened (T-203 finding F1, T-207 finding F2), so option A's fallback condition has occurred.

A. **Route it to U6 CR-012 as an S2 ISS row, with a fallback in U14.** Overtaken: CR-012 is merged.
B. **U14 fixes the seed itself** (the plan of record). In `seed-content.ts`, for every corpus review with a `conditionSeedRef`, one `review_tags` row `{group: 'condition', term_id: <the condition term of that seed ref>}` is inserted before the review's free-text tags, inside the same new-review branch, so a re-run stays a no-op. The free-text tags stay exactly as they are: they are the author's wording, which the prototype shows under "Tags" while its `conditionId` gives the card and page link (r8's "Fungal skin infection" under Eczema, r2's "Hypothyroidism" under c2). `seed.int.test.ts` proves that every seeded review has exactly one condition term tag and that the eligible-account count per condition equals the corpus count (c1 5, c2 2, c3 3, c4 1, c5 2, c6 1 before Question 13, c7 3, c8 0, c9 4, c10 3). One `ISSUES.md` row records the finding, fixed in U14 T-201.
C. **Rewrite the acceptance rows** to use builder data only, and leave the demo seed without condition links. The storyboard's condition pages and Discover's first step would be empty.
X. Other (please specify)

[Answer]: B (the plan of record since CR-012 merged without the links on 2026-10-28; decided by the agent under the owner's no-questions instruction of 2026-10-29; replaces the earlier answer A)

## Question 12

Does **each branch keep its own colour** from the prototype? The corpus has a hue per branch (`avatarHue`, the prototype's `accent`), but `facility_branches` has no hue column, so under Question 8 every branch gets `stableHue(publicId)` and no facility avatar matches the prototype (T-203 records "titles and colours" as known visual differences). The migration of Question 9 C changes `facility_branches` anyway.

A. **Add `facility_branches.avatar_hue`** (nullable `smallint`, checked 0–359) in the same migration, seeded from the corpus; Question 8's rule then applies to branches as to doctors (recommended). The colours match the prototype; a branch added later gets its stable hue.
B. **Keep `stableHue(publicId)` for branches.** No column; the colours stay a recorded difference.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

Can **"Not provided" be shown on a doctor page from the seed** (T-202 finding F1, S2)? All ten seeded doctors have every rendered fact, every doctor has accounts, and all 24 reviews have sentiment and outcome; the fields CR-012 leaves empty (`about` on d7–d10, the branch addresses) are not on the doctor profile. FD-089 wants "Not provided" demonstrable, and ISS-268 defers the rendering check to the page Units. The prototype is the source of the demo data (FD-039), and its renderers show a missing fact as a blank value and a missing sentiment as a broken badge.

A. **Add one doctor and one review that leave fields empty, through the prototype** (recommended). The prototype data gains doctor d11 (fictional, Gastroenterology, a city with no other doctor, one chamber linked to no branch, no consultation fee and no languages) and review r25 on d11 (published, condition c6, no sentiment, no outcome, no documents, an existing pseudonymous author); the prototype's profile and account renderers omit an empty fact and show "Not provided" for a missing sentiment or outcome; the corpus types and the port allow the four empty fields; the port is re-run and the seed follows. On the seed, d11's profile then shows its facts without fee and languages, "1 account" with Limited data, sentiment and outcome as "Not provided" and "No documents"; c6's page shows a partial distribution with "Not provided: 1". Counts become 11 doctors, 14 chambers and 25 reviews (storyboard line updated); Discover's chips are unchanged (c6 goes from 1 to 2). An FD entry records the two records against FD-089's "every field filled on the new records".
B. **A hand-written seed supplement** outside the prototype. Smaller, but the seed no longer mirrors the prototype (FD-039 needs its own FD entry, and `cr-012-corpus.test.ts`'s one-to-one check no longer describes the demo).
C. **Builder data only.** T-202's S2 stays open as an ISS row, and ISS-268's rendering check runs only on builder data.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**ISS-266: may a doctor link to a branch other than through a chamber?** The prototype lists d3 on f4 (`facilities[f4].doctors`), but d3's only chamber, "Uttara Skin Care", matches no branch name, label or composite name, so the seed links d3 to no branch: f4 shows no doctors here and d3 no facility. ISS-266 names U14 T-201 as the owner.

A. **Chambers stay the only link between a doctor and a branch** (`02-data-model.md` §4) (recommended). d3 and f4 stay unlinked; the difference from the prototype is recorded for the T-202 and T-203 visual checks; ISS-266 closes as designed. Nothing is invented, and the real-matching f4 name (ISS-271) is not repeated in another chamber.
B. **Seed a second chamber for d3 at f4** ("Shefa General Hospital — Uttara branch", no hours, provenance community). f4 gets its doctor, but the chamber and its provenance are invented.
C. **A doctor–branch affiliation table** seeded from `facilities[].doctors`. A data-model change and a second source for "doctors here" beside the chambers.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Decided under the owner's no-questions instruction of 2026-10-29

These were raised for the owner in the first draft. Since 2026-10-29 the agent decides them by recommendation; the FD entry texts the build appends are in `functional-spec.md` § 17.

- **R1 — FR38 term management (Question 5).** Release 1 builds `mapProvisional` only; creating, renaming, merging two canonical terms, redirecting, deactivating and reordering tag groups and values move to release 2 by a new FD entry that narrows FR38, AC5.3.4 and AC11.1.5 for release 1, as FD-088 does for the staff side. Alternatives considered: assign the commands to U37 T-408 now (a staff Unit grows with commands no release 1 screen uses), or build them here (Question 5 B). Reads already honour redirects and hidden terms, so the later commands need no read change.
- **R2 — Branch display names and hues** were lost in the seed. Resolved: the owner's answer stores the hospital name (Question 9 C), and Question 12 A stores the hue.
- **R3 — `taxonomy.createProvisional` had no rate limit** in 03 or C6. Decided: 30 calls per hour per account through the `RateLimiter` port (the rate `comment.post` uses), refused as `rate_limited` with nothing written; the operation that `review.publish` calls is not limited again, because publish carries its own 5 per day. 03 §4 gains the rate. Alternative considered: leave it to U41 T-502.
