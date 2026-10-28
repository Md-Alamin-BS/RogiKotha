# Functional Design — questions (U14 `t-201-directory-and-taxonomy-modules`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-201-directory-and-taxonomy-modules/functional-design/`.

Context:
- Unit U14 (kind `library`, size M, not high risk) delivers T-201 (`docs/implementation/tasks/T-201-directory-and-taxonomy-modules.md`, with its FD-067 and C6/C7 amendments and the addendum) for stories US4.1, US4.3, US5.3 and US6.4. U14's own responsibilities also name ISS-222. Bolt 13 in `bolt-plan.md`, after U8 T-101, U10 T-103, U11 T-104 and U12 T-105.
- Inputs read: `unit-of-work.md` (U14, the decision-change table, the open point "Schema gaps: AC5.3.4 and AC11.1.5 tag-group rename and reorder (fixed enum), and the suggested-term flag (Taxonomy) → U14 Functional Design"), `unit-of-work-story-map.md`, `requirements.md` (FR15–FR18, FR24–FR27, FR36–FR38, FR48–FR52, the limited-data assumption), `stories.md` (AC4.1.1–AC4.1.5, AC4.3.1–AC4.3.5, AC5.3.1–AC5.3.5, AC6.4.1–AC6.4.5, AC11.1.5), `components.md` (Directory, Taxonomy, Review) and `contract-summary.md` (C1, C6, C7, C9, C15 and the common rules).
- Code read as it is on `main` (2026-10-28): `packages/database/src/schema/{directory,taxonomy,review,identity,evidence,enums}.ts`, the repository stubs `repositories/{directory,taxonomy,review,not-implemented}.ts`, `packages/contracts` (view models `doctor.ts`, `facility.ts`, `condition.ts`, `experience.ts`, `discover.ts`, `search.ts`; schemas `directory.ts`, `taxonomy.ts`, `review.ts`; `config-values.ts`, `ids.ts`, `page.ts`, `errors.ts`), `packages/application/src/index.ts` and `packages/domain/src/index.ts` (both still empty placeholders), `packages/test-support/src/{fakes/repositories.ts, fakes/repositories-superset.test.ts, seed/seed-directory.ts, seed/seed-content.ts, corpus/*}`, the prototype selectors in `ui-design-prototype/shared/rogikotha-data.js` (`reviewsFor`, `distribution`, `conditionsFor`, `evidenceCount`, `hash`, `criteriaDist`, `branchesOf`, `conditionAccounts`, `doctorsForCondition`, `tagFrequency`) and renderers in `concept-04b-quiet-clinic-minimal/app.js` (`accountRow`, `doctorEntry`, `facilityEntry`, `renderProfile`, `renderCondition`, `renderFacility`, the three index renderers, `byName`, `byline`, `TAG_GROUPS`).
- Open `ISSUES.md` rows in this area: ISS-157 (no `taxonomy_terms.suggested` column, owner T-201), ISS-222 (`FakeReviewRepository` distributions count every row, owner T-201), ISS-091 (stub method names may be renamed by T-201), ISS-168 (`claimed` doctors have no `claimed_by_account_id`), ISS-179 (seed guards at term granularity).
- CR-011 (U4) is being built on its own branch while this draft is written. It touches the queue, reset, outbox and worker only; nothing here depends on it.

## Settled before this stage

These are decided by FD entries or by the contracts and are not asked again.

- **Directory and Taxonomy read review-derived figures only through ports (FD-067, C6, C7).** Directory declares `ProviderExperience`, Taxonomy declares `ConditionStats`, and U14 builds Review's implementations of both in `modules/review` as a ports-only stub before T-301 exists. Neither module imports the review module or `ReviewRepository`.
- **The review read queries and policies are U14's (03 §4 ownership note, C9).** `review.sentimentDistribution`, `review.outcomeDistribution`, `review.criteriaDistribution`, `review.listExperienceCards` and `domain/review/policies.ts` (`distribution`, `isLimitedData`) are created here; T-301 extends them and may not rewrite them.
- **The limited-data threshold comes from `ConfigProvider.current().limitedDataThreshold` (requirements Assumptions; placeholder 5).** It is never a constant in code.
- **Every doctor shows "Registration not verified" (D-003, FR16).** The value is unconditional, never derived from `bmdc_number`.
- **Only public content counts (FR50).** Ineligibility marking by a Super Admin (AC6.4.4) and the summary freeze (AC6.4.5) are schema gaps owned by U33 T-404 with U22 T-302 (`unit-of-work.md` open points); U14 counts what is published and not deleted.
- **No new dependency.** Grapheme-aware truncation uses the built-in `Intl.Segmenter`; everything else uses libraries already installed. No dependency-check entry is needed unless Code Generation finds otherwise.

## Settled in this design without a question

These follow from the contracts, the project rules or the code, so they are design decisions, not open points. Each is explained in `functional-spec.md` § 13.

- **The contract names win over the task text where they differ.** `contract-summary.md` states that it wins over 03, and T-201's FD-076..FD-090 amendment quotes C6/C7. So the distribution flag is named `limitedData` (C6, C7, 03 §4 and the existing view-model stub), not `limited`; the T-201 acceptance row "limited" is read as `limitedData`.
- **Public ids only in view models.** Every reference in a view model is a `publicId`; internal UUIDs, `seed_ref`, persona ids and every account id (including `claimed_by_account_id` and `created_by_account_id`) stay out. `claimed` is a boolean.
- **Locale comes from the Actor.** Queries read `actor.locale` (01-conventions §5), which the web tier sets from the route segment, and the repository mappers pick the `*_en` or `*_bn` column. User-written text (review title, body, free-text tags, a provisional term's wording) is shown in its original wording in both locales.
- **Index lists are alphabetical in the active language** (the prototype's `byName`, an allowed neutral order under AC5.2.2), with the public id as tie-break; account lists are newest first (AC5.2.3 default). Nothing is ordered by sentiment, outcome, reactions or evidence.
- **Facility "Not verified" is a constant**, like the doctor flag: no facility verification exists (FR25), so `notVerified: true` on every facility view model.
- **Facility feedback visibility follows `featureVisibility.facilityAccounts`.** When the setting is off, the facility profile carries no accounts and no criteria and says so with a flag; the setting exists for exactly this.
- **`ExperienceCardVM` moves to `view-models/experience-card.ts`** (the file T-201's owned paths name). The stub of the same name in `experience.ts` (T-307's file) is removed and re-exported from the new file, so `search.ts` keeps compiling; this is a recorded owned-path addition.
- **Repository stub methods are renamed to the port names** (ISS-091 allows it). The T-201 stubs in `repositories/{directory,taxonomy,review}.ts` are replaced; the stubs owned by T-204, T-301, T-302 and T-407 stay untouched. The fakes in `test-support` are renamed to match, so `repositories-superset.test.ts` stays green, and `FakeReviewRepository` gets the eligibility filter (closes ISS-222).
- **Integration tests insert their own rows.** `pnpm test:int` resets the test database once per run (CR-007), so each test builds its own doctor, branch and reviews with builders and never assumes an empty table; seed-based rows read their expected counts from the corpus (FD-089 changes the corpus size in U6 CR-012).

## Question 1

C6 lists two commands as built by U14: **`taxonomy.createProvisional`** (`{kind, text, lang} → {termId}`, verified account, outbox `term.changed`) and **`taxonomy.mapProvisional`** (`{termId, canonicalId}`, Super Admin, audit `taxonomy`, outbox `term.changed`). T-201's own text says it has no commands, and the repository stubs name both methods as T-201's. Who builds them?

Why this is open: the contract summary says it wins over 03 and names U14; the task file was written before Contract Design and says "commands are T-204", which refers to the directory commands. U26 T-306 calls `createProvisional` from the composer, and AC5.3.2/AC5.3.3 (provisional tags, canonical mapping) trace to these two commands. No other Unit's owned paths include `modules/taxonomy/commands/`.

A. **Build both in U14, as C6 says** (recommended). Two small commands in `modules/taxonomy/commands/`, with `authorization.ts`, their audit row and their outbox row in one transaction (01-conventions §3). They need only the Actor (U8, U10), the `AuditWriter` and the `Outbox` port, which exist by Bolt 13. The Unit grows by about an hour; AC5.3.2, AC5.3.3 and AC5.3.5 get a builder.
B. **Build only `createProvisional`** (the composer needs it) and leave `mapProvisional` to a staff-side Unit. C6 would have to be amended and no Unit owns the mapping today.
C. **Build neither**; record an ISS row and let the owner assign them. U26 would reach Code Generation with no command to call.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

The pinned port signatures do not carry everything the view models need. **`ProviderExperience.forDoctor`** returns `{cards, sentiment, outcome, documentCount, total}`, but the doctor profile also needs the per-condition counts and breakdown, the condition-scoped total and the filtered count, and the doctor index needs summaries for many doctors at once. **`ConditionStats.forCondition`** returns `doctors: [{doctorId, count}]`, `facilities: [{branchId, count}]` and `districts`, but Taxonomy cannot turn a doctor id into a name: Directory already depends on Taxonomy (it reads the specialty term), so Taxonomy reading Directory would be a cycle. `mentioned: [{kind, termId, count}]` also cannot carry free-text tags, which have no term id (and the seed's tags are all free text). How are the ports completed?

Why this is open: C6/C7 are the contract, and the common rules allow additive changes ("a new optional field ... consumers ignore unknown fields"). Review sits above Directory, Taxonomy, Identity and Evidence in the dependency graph, so Review's implementation may read their tables; Directory and Taxonomy may not read Review's.

A. **Extend both ports additively, so Review returns display-ready data** (recommended). `forDoctor` adds `conditions`, `scopedTotal`, `showing` and `limitedData`; a new `summariesForDoctors(ids)` and `summariesForBranches(ids)` serve the index pages in one query each; `forCondition` takes the locale and returns doctor, facility and place rows with names, `mentioned` with labels (term name or original free text), `specialties`, and `limitedData`. `districts` is delivered as `places` (hospital, area, city), the level the prototype shows. Code Generation corrects 03 §4 and adds a dated note to C6/C7. No consumer exists yet, so nothing breaks.
B. **Keep the ports as pinned and let the web page compose** the condition page from `taxonomy.getCondition` plus Directory lookups. The `ConditionPageVM` would no longer be one query's result, and every page Unit (U16, U20) would repeat the composition.
C. **Keep the ports and give Taxonomy a read of Directory's tables.** This creates the cycle FD-067 exists to prevent.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

How do the view models express **"Not provided"** and **"Limited data"**? AC6.4.2 wants a doctor with 3 eligible reviews, two without sentiment, to show "the exact count 3 with Limited data, missing sentiment and outcome as Not provided". The prototype's `distribution()` counts only the reviews that have a value, ignores the rest, and marks `limited` on its own total.

Why this is open: the hard rule says "Limited data" shows when the number of **eligible accounts** is below the threshold, while the prototype tests each distribution's own total. Without a count of the accounts that gave no value, the UI cannot show "Not provided" next to a partial distribution without subtracting numbers itself.

A. **Distribution carries `counts` (every key, in render order), `total` (recognised values), `notProvided` (eligible accounts with no value), `empty` (`total` is 0), `limitedData` (0 < `total` < threshold) and `keys`; every summary also carries its eligible-account total with its own `limitedData`** (recommended). The profile shows "3 accounts · Limited data" from the summary and "Not provided" for the two missing values; a distribution with few values is also marked, which is stricter than the hard rule asks and never weaker. Percentages stay a rendering concern beside their count (AC6.4.1), and nothing in the VM is a percentage.
B. **Prototype shape only**: `counts`, `total`, `empty`, `limitedData` on the distribution's own total; the UI derives "Not provided" from the account total it gets elsewhere.
C. **Limited data only on the eligible-account total**, none on distributions. A distribution of 2 out of 9 accounts would show without a limited-data mark.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

**ISS-157: `taxonomy_terms.suggested` does not exist**, so `taxonomy.listSuggested` (the task addendum) has no data. The prototype's composer suggestions (`TAG_GROUPS` in `app.js`, 12 items across the four groups) are not in the corpus at all: only the eight conditions and the specialties are seeded as terms. How is the gap closed?

Why this is open: the column needs a forward-only migration and a schema edit, outside T-201's listed owned paths. ISS-157 names T-201 as its owner. U6 CR-012 (the seed Unit) runs earlier and cannot seed a column that does not exist yet.

A. **U14 adds the column and seeds the suggestions** (recommended). Migration `0009` (the next free number at the time of writing) adds `suggested boolean not null default false` and `suggested_order smallint null` to `taxonomy_terms`; `schema/taxonomy.ts` gets the two columns; `seed-directory.ts` flags the existing condition terms that match a suggestion and inserts the other suggestions as canonical, published terms of their kind. All three are recorded owned-path additions; `rk_worker`'s table-level SELECT on `taxonomy_terms` covers the new columns, so no grant changes. Closes ISS-157.
B. **Ship `listSuggested` returning an empty list** and leave ISS-157 open. The composer (U26) shows no suggestion chips.
C. **Derive suggestions from use** (the most-tagged canonical terms per group). This changes what "suggested" means, and on the seed it returns nothing (Question 11).
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

The Units Generation open point assigns the **AC5.3.4 and AC11.1.5 schema gap** to this design: a Super Admin "renames, merges, redirects, deactivates or reorders a tag group or value" with audit history. Tag groups are a fixed database enum (`tag_group`: symptom, condition, treatment, medicine); terms have no order column and no deactivated state of their own. How does U14 settle it?

Why this is open: FR38 is Must. FD-018 allows taxonomies to be runtime configuration but does not require it, and keeps structural data boundaries deployment-controlled; today the tag groups are a schema enum, so changing them is a data-model change. No Unit's task file builds term management beyond `mapProvisional`; FD-088 keeps the staff side of release 1 to what release needs and does not name taxonomy management.

A. **Groups stay a fixed enum; U14 builds the read side for values and raises the rest** (recommended). Group labels are i18n strings and their display order is the enum order. For values, U14 makes every read honour a redirect (`canonical_id`, so merged or redirected terms land on their target) and treats a term in state `hidden` as deactivated (out of lists and `resolve`; its tags keep their wording without a link). `mapProvisional` is the one management command (Question 1). Rename, merge of two canonical terms, deactivate and reorder commands are raised as an ISS row for the owner to assign (suggested U37 T-408).
B. **U14 builds all the value-management commands now** (rename, merge, redirect, deactivate, reorder, each Super Admin with audit). The Unit roughly doubles and builds staff commands with no staff screen in release 1.
C. **Turn tag groups into a table** with a migration and management commands. FD-018 permits it, but it is a data-model change (`02-data-model.md` §0, every `tag_group` column) with no Unit to build the screens.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

AC4.1.4 wants **every public field to show its provenance and last-update date**. On the seed, `languages` has no entry in `field_provenance` (the prototype hard-codes `community` for it), and a profile edited later may have other populated fields without an entry. What does such a field show?

Why this is open: omitting the field would hide real data; inventing a source could overstate it.

A. **Default to Community submitted with the profile's last update** (recommended): the lowest-trust source, which is what the prototype shows for languages, dated by `doctors.updated_at`. T-204's field changes write real entries from then on.
B. **Omit the field** until it has an entry. Languages would disappear from every seeded profile.
C. **Show the value with no provenance**. AC4.1.4 would fail for that field.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

AC4.1.3 and FR17 say profile fields are **individually hideable** and a populated, hidden field does not render. No column or setting records a hidden field today.

Why this is open: the read side is U14's; the write side (a provider or staff hiding a field) belongs to U17 T-204 or a later staff Unit. A read-only convention costs no migration because `field_provenance` is JSON.

A. **Honour a `hidden: true` flag on a field's provenance entry in the read path** (recommended). `omitEmptyFields` drops hidden fields as it drops empty ones; nothing writes the flag yet, and the domain test proves the behaviour with a builder. T-204's Functional Design decides who may set it.
B. **Defer hiding entirely** and mark the hidden half of AC4.1.3 as a gap with an ISS row.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

Where does **`avatarHue`** come from? Step 4 says `hash(publicId) % 360` (the prototype's FNV-1a, ported as `stableHue` in `contracts/ids.ts`); the addendum says "from the new `avatar_hue` columns". On the seed, doctors have `avatar_hue`, facilities have the column but it is not seeded, and branches have no column (the corpus has a hue per branch that is dropped).

A. **The column when it has a value, otherwise `stableHue(publicId)`** (recommended). Seeded doctors keep the prototype's colours; facilities, branches and any later profile get a stable colour that never changes for the same profile. `stableHue` is a pure function in `contracts/ids.ts` (owned-path addition), tested against the prototype's `hash`.
B. **Always `stableHue(publicId)`.** The seeded doctors lose the prototype's colours.
C. **Column only**; null goes to the UI as a default hue. Every facility looks the same.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

How are **facility names** projected? The prototype has three names per branch (for f1: hospital "Shefa General Hospital", branch "Dhanmondi branch", parent "Shefa Health Group"). The database has two: `facilities.name` (the organisation, seeded "Shefa Health Group") and `facility_branches.name` (seeded with the branch label "Dhanmondi branch"). The hospital name is not stored anywhere. T-201's VM names `name`, `branchName?` and `parentName?`.

A. **`name` = organisation name, `branchName` = the branch's own name, omitted when it equals the organisation name; no separate `parentName`** (recommended). The organisation is the parent in the two-level model (FR24), so a third name would repeat `name`. Cards read "Shefa Health Group — Dhanmondi branch". The lost hospital name is proposed as an ISS row for U6 CR-012 and the owner.
B. **Three names as in the task**: `parentName` = organisation name when it has two or more branches, `name` = branch name. Seeded f1 would read "Dhanmondi branch" as its title.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

Does a **provisional condition term get a condition page**? `createProvisional` makes a term the moment a reviewer tags an unmapped condition (FR37). AC5.3.3 says that once mapped, clicking the alias opens the canonical page.

A. **An unmapped provisional term has its own page, marked provisional; a mapped term redirects to its canonical page; the topic index lists canonical terms only** (recommended). The tag on the review is never a dead link, the original wording stays visible (AC5.3.2), and the index is not filled with one-off wordings. `taxonomy.resolvePublicId` gives the page its redirect, the same way `directory.resolvePublicId` does for merged profiles.
B. **Provisional terms get no page until mapped** (`not_found`); their tags render as plain text.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

**The seed never links a review to its condition term.** Every corpus review carries `conditionSeedRef`, but `seed-content.ts` writes only the review's free-text tags (`review_tags.free_text`) and no `review_tags` row with `group = condition` and `term_id`. On the seed, every doctor's condition list, every condition page and the topic index counts are therefore 0, and the T-201 acceptance rows ("facts ... d1", "two with `accountsTotal: 0`", "`forCondition` ... exact counts for the seed") cannot pass. Who fixes it?

Why this is open: T-201 says a missing seed column goes to the human instead of being edited here. U6 CR-012 is the seed-correction Unit, it runs before U14 (Bolt 6 against Bolt 13) and it has not started.

A. **Route it to U6 CR-012 as an S2 ISS row now, with a fallback** (recommended): CR-012 adds one `review_tags` row per review (`group condition`, `term_id` from `conditionSeedRef`). If CR-012 has merged without it when U14's Code Generation starts, U14 adds that one loop to `seed-content.ts` as a recorded owned-path addition, with a seed integration assertion.
B. **U14 fixes the seed itself** regardless of CR-012.
C. **Rewrite the acceptance rows** to use builder data only, and leave the demo seed without condition links. The storyboard's condition pages would be empty.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

None of the points below changes a hard rule or a data boundary, so none needs an FD entry before Code Generation. Each is proposed as an `ISS-` row (`functional-spec.md` § 9) so the owner can rule on it.

- **R1 — FR38 term management has no owner** after Question 5: rename, merge of two canonical terms, deactivate and reorder of tag values.
- **R2 — Branch display names and hues are lost in the seed** (Question 9, Question 8): the hospital name of branch f1 and every branch hue exist only in the corpus.
- **R3 — `taxonomy.createProvisional` has no rate limit** in 03 or C6; any verified account can create terms without bound. Suggested: T-502 adds it to `RATE_LIMITS`.
