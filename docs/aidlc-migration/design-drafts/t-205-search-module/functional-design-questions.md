# Functional Design — questions (U18 `t-205-search-module`)

Draft written ahead of the stage, on 2026-10-29. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-205-search-module/functional-design/`.

Context:
- Unit U18 (kind `library`, size XL, not high risk) delivers T-205 (`docs/implementation/tasks/T-205-search-module.md`, with its FD-076..FD-090 amendments) for US5.1, US5.2 and US5.3. It depends on U14 T-201, U17 T-204, U3 T-010 and U4 CR-011 (`unit-of-work-dependency.md`); U19 T-206 and U39 T-410 depend on it.
- Inputs read: `unit-of-work.md` (U18), `requirements.md` (FR28–FR38, FR58, NFR8), `stories.md` (US5.1–US5.3), `components.md` (Search), `contract-summary.md` (C12, C14 `/api/search/suggest`, C15 and the common rules), `docs/status/decision-log.md` (FD-035, FD-037, FD-038, FD-067, FD-076, FD-084, FD-092, FD-093, FD-094), `01-conventions.md` §2–§4, §10, §11, `02-data-model.md` §0, §4–§7, §13, §16, §17, `03-routes-and-contracts.md` §3, §4 "search", §5.
- Code read on `main` at `9cf860a`: `packages/database/src/schema/search.ts`, `search/index.ts` (the `PgSearchIndex` stub), `migrations/0001_grants_part1.sql`, `0002_content.sql` (the search DDL and indexes), `0005_grants_part2.sql`, `queue/queue-declaration.ts` (`search.refresh` exclusive), `repositories/not-implemented.test.ts` (lists `PgSearchIndex`), `grants.smoke.test.ts` (probes `review_tags` as closed to `rk_worker`), `migrations.int.test.ts` (pins 9 migrations), `packages/contracts/src/schemas/search.ts` and `view-models/search.ts` (stubs), `packages/test-support/src/fakes/search-index.ts` (`NaiveSearchIndex`), `apps/worker/src/{container,registry}.ts`, `handlers/outbox-relay.ts` (`RELAY`, `jobKey`, `planEvent`), `eslint.boundaries.mjs`, `infra/compose/postgres-init/02-extensions.sql` (`pg_trgm`).
- Prototype: `ui-design-prototype/shared/rogikotha-data.js` `resolveQuery`, `search`, `searchFacilities`, the conditions with aliases; `concepts/concept-04b-quiet-clinic-minimal/app.js` `filterFields`, `renderResults`, `doctorEntry`, `facilityEntry`.
- Upstream drafts: `t-201-directory-and-taxonomy-modules` (eligibility, `normalizeAliasKey`, branch names and labels, view models, finding F16), `t-301-review-module-core` (Question 13 on `reviews.language`), `t-101-better-auth-adapter` (the `@rogikotha/application/worker` subpath, `RateLimiter.hit`, the client-address helper), `t-207-discover-emergency-about` (chips link to `/search?q={name}`). T-204 and T-206 have no draft; their task files were read.
- Open `ISSUES.md` rows for this Unit: ISS-146 (`search_aliases.lang` has no CHECK), ISS-233 (`search.refresh` lacks worker reads), ISS-253 (queue policy rules), ISS-074 (closed `gender` enum), ISS-240 (worker can read `exact_date_enc`; not this Unit's to fix).

## Settled before this stage

- **Neutral ranking is a hard rule** (PRODUCT.md, FR32): relevance, most accounts, most recent (and alphabetical, Question 6) only; no sentiment, outcome, evidence or reaction input; no highest-rated sort.
- **PostgreSQL search is real in the demo** (FD-035): FTS, trigram and aliases; no external engine, vectors, personalisation or Near Me (task "Not in scope", FR34).
- **Evidence filters read Search's own columns** (FD-084, C12): `evidence_groups` and `has_documents`, written by `search.refresh`; `EvidencePresence` ships with a no-evidence default until U25 T-305.
- **Jobs and the relay** (FD-038, FD-076, CR-011): the relay is transactional, every job is idempotent, keys are `<job>:<eventId>`, queues are `exclusive`, 5 retries with backoff.
- **Worker boundary** (FD-037, FD-092, FD-093): default-deny grants; every new worker read needs an FD entry; the worker reaches application code only through `@rogikotha/application/worker` and never imports `drizzle-orm` or `pg`.
- **Eligibility is T-201's** (BR1.1–BR1.6 of that draft): this Unit applies the same predicates.
- **Owner answers that touch this Unit:** counts only, never percentages (cards are T-201's view models); the limited-data threshold range 2–50 (cards); each branch stores its own hospital name with an optional label (aliases, BR3.2); facility feedback is the nine criteria only (no facility sentiment, so no facility sentiment filter).
- **Agents decide every open point by recommendation** (the owner's instruction of 2026-10-29). Each question below is answered that way and is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it.

## Settled in this design without a question

- **Keys are computed in application code** (FD-093: `database` may not import `domain`). The document builders and `reindexAll` live in `modules/search`; the database adapter loads sources, takes the lock and writes what it is given (F3).
- **Contract names win over task text** (`contract-summary.md`): `keepOriginalUrl`, not `keepOriginalHref`.
- **Resolved notes:** a query equal to a condition's name gives `exactCondition`; an exact or prefix alias match gives `alias` or `banglish` by the alias's `lang`; a close spelling gives `typo` (F13).
- **One migration** instead of the task's two (`00xx_search_indexes.sql`, `00xx_search_evidence_columns.sql`): the GIN indexes already exist from `0002`, and one file means one bump of the migration-count pins.
- **No new copy in the module:** it returns keys and data; T-206 owns the labels. Error codes are the existing `validation` and `rate_limited`.
- **No new dependency.** `Intl.Segmenter` is built in; `pg_trgm` is installed.

## Question 1

**How does `search.refresh` read the tables it needs?** The worker cannot read `review_tags`, `doctor_chambers` or `facility_reviews` (FD-037; ISS-233; FD-092 R3). Without them a doctor document has no chamber names and no condition links, a review document has no tag labels, a condition has no count, and a branch has no count: the job fails with `permission denied` on its first run.

A. **Column-level SELECT for `rk_worker`** on `review_tags (review_id, "group", term_id, free_text, not_sure)`, `doctor_chambers (doctor_id, name_en, name_bn)` and `facility_reviews (branch_id, state, deleted_at, published_at)`, plus full DML on the new `search_document_terms`, in this Unit's migration, with an FD entry (recommended). Narrowest grant that makes the documents complete; no content of facility feedback is readable.
B. **Build documents in the web tier**, inside each producing command's transaction. Removes the grant, but couples every Directory, Taxonomy, Review, Evidence and Moderation command to Search and breaks C12's job design.
C. **Build only from tables already granted.** No chamber names, tag labels, condition counts or branch counts: AC5.1.1 (search by condition, symptom, treatment, medicine) and the condition constraint of step 5 cannot pass.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; a data-boundary change, so FD entry (a) in `functional-spec.md` § 17)

## Question 2

**Where do the filters and the condition constraint read from?** The task's SQL uses `EXISTS` subqueries on `reviews`, `review_tags` and `doctors` at query time; FD-084 and C12 say the evidence filters read Search's own columns.

A. **Search's own tables only**: facet columns on `search_documents` (sentiments, outcomes, gender, language keys, facility type, claimed, provenance, specialty public id) and the new `search_document_terms` table, all written by the refresh (recommended). One-table queries, no read of other modules' tables in the web tier, the same pattern FD-084 set, and the relevant count FR32 asks for is stored.
B. **`EXISTS` on the owner tables** as the task sketches. No new columns, but every search reads four modules' tables, the eligibility predicate is repeated in the search SQL, and FD-084's "queries stay inside Search" holds for evidence only.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; recorded in FD entry (b))

## Question 3

**What happens to a document when its source stops being public?**

A. **Delete the document, its aliases and its term rows** (recommended). Nothing hidden or deleted stays in a derived copy; T-410's `search.removeAccountContent` becomes a plain delete plus parent refresh. The `published = true` predicate stays in every statement as a guard.
B. **Keep the row with `published = false`** (the schema's original intent). One update instead of a delete, but the title and text of hidden and deleted accounts stay in the search tables.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; recorded in FD entry (b))

## Question 4

**Where are the resolution similarities computed?** `pg_trgm` and the `simple` text parser treat letters by the database's libc locale; whether Bengali vowel signs count as word characters there is unverified (F12), and condition resolution is the behaviour the prototype demonstrates.

A. **Condition resolution in domain code** over the condition alias set (about 60 rows on the seed), with a pg_trgm-compatible code-point trigram function; document matching (tier 3) stays in SQL with the indexed operators; Code Generation probes `show_trgm` and `ts_debug` on Bengali words and records the result (recommended). Resolution is deterministic and locale-independent; the alias set is read once per query.
B. **Everything in SQL with `similarity()`.** One code path, but Bengali typo resolution depends on the image's locale, and the task's `similarity(...) > x` form cannot use the GIN index (F2).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**Which tabs does the module serve?** FR30 asks for All, Doctors, Facilities, Conditions/Tags and Reviews; the prototype and T-206 render Doctors and Facilities only.

A. **Four kind tabs plus `all`** (up to three results of each kind in a fixed order, never ranked against each other), with counts for all four kinds (recommended). The module meets FR30; T-206 renders the two prototype tabs now and the rest is a recorded UI follow-up.
B. **The four kind tabs only.** Smaller; the All tab needs a later contract change.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**Which sorts?** AC5.2.2 offers relevance, newest, most reviewed and alphabetical; the prototype and T-206 show relevance, most accounts and most recent.

A. **Add `alphabetical`** (title in the active language, then public id) to the three (recommended). Neutral, required by AC5.2.2, and already the browse order of an empty query.
B. **The prototype's three only.** AC5.2.2 stays unmet.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**What does an ambiguous query do?** The prototype returns the first condition in array order whose name or alias matches by prefix; AC5.1.3 asks for Did you mean suggestions for an ambiguous Banglish query, with the query kept.

A. **No resolution and up to three Did you mean conditions** when the best tier holds more than one condition (recommended). Meets AC5.1.3 and never guesses.
B. **First match wins**, as the prototype. Deterministic only by seed order; AC5.1.3 unmet.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**How are symptoms, treatments and medicines searchable** (FR28, AC5.1.1)? `search_kind` has no tag kind, and only conditions have pages.

A. **Through existing kinds**: review documents carry every tag label (terms in both languages, free text as written); doctor documents carry each distinct term name of their eligible accounts once; term filters (symptom, treatment, medicine) use `search_document_terms` (recommended). A medicine query finds the accounts and the doctors; the Conditions/Tags tab lists condition terms, which are the ones with pages.
B. **A new `tag` kind** with its own documents and a results row per term. Needs an enum change, a target page that does not exist, and a UI the prototype lacks.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**How does a branch's account count stay current?** It counts facility reviews (task step 3), but C15 has no facility-review event, so publishing, hiding or deleting facility feedback refreshes nothing (F4).

A. **A new event `facilityReview.changed {facilityReviewId, branchId}`**, appended by every facility-review state change (U21 T-301 publish, U22 T-302 delete and restore, U33 T-404 hide and restore, U39 T-410), routed to `search.refresh` here (recommended). An additive C15 change; until the producers exist, `facility.changed` and `reindexAll` keep the seed right.
B. **Refresh the branch on review events that carry `branchId`.** Covers doctor reviews at a branch, not facility feedback.
C. **No count on facility documents.** The facilities tab loses the most-accounts sort.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**Who builds the result cards?** `SearchResultVM` carries `DoctorCardVM`, `FacilityCardVM` and `ExperienceCardVM`, which Directory and Review build (U14 T-201).

A. **A `ResultCards` port declared by Search and implemented in `modules/directory` and `modules/review`**, as thin wrappers over T-201's card mappers, wired in the web container; condition results are built from the document (recommended). Cards are identical to every other list, the FD-067 port pattern holds, and Search reads no other module's tables.
B. **Return hits only and let T-206 fetch cards.** Simpler here, but every consumer repeats the hydration and the VM no longer matches C12.
C. **Store card data in the documents.** Stale between refreshes and duplicates T-201's mapping rules.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**How are concurrent and repeated refreshes kept correct?** One event touches several documents (a review event touches the review, its doctor and its conditions), and two events can touch one doctor at once. The task's key `kind:refId` does not fit the C15 envelope, and delete-then-insert races on the unique key (F5, F6).

A. **One job per event under the C15 key `search.refresh:<eventId>` on the exclusive queue; each document rebuilt in its own transaction under an advisory lock on (kind, ref_id), reading the source inside that transaction, then an upsert** (recommended). No duplicate jobs, no unique-key failures, and the last rebuild always reads the newest committed source.
B. **A `stately` queue keyed by document**, one job per document (ISS-253's alternative). Coalesces work, but the relay would have to fan one event into several jobs with computed keys, which C15 and CR-011 do not provide.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**Where does the full reindex run?** The task puts `pnpm search:reindex` in `packages/database`, but the builders that compute keys must be in application code (F3); T-007 left no `// HOOK(T-205)` in the seed.

A. **`reindexAll` in `modules/search`, exported through `@rogikotha/application/worker`; `pnpm search:reindex` runs a worker script (`apps/worker/src/scripts/search-reindex.ts`) with `DATABASE_URL_WORKER`; the seed calls `reindexAll` at its end with the seed's own database handle** (recommended). The seed and `pnpm demo:reset` leave a searchable demo, and the script uses the worker's grants.
B. **A script in `packages/database`** importing the application builder. Allowed by the matrix (database → application), but it puts a use case behind an adapter package.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29; `seed.ts` becomes a recorded owned-path addition)

## Question 13

**What does the `language` filter mean?** The contract stub types it as review language (`en`, `bn`, `mixed`), the task applies it to doctors, FR31 means the languages a doctor consults in, and the prototype has no language filter.

A. **Consultation language on the doctors tab**: keys from `doctors.languages_en` split on commas (`bangla`, `english`, `chittagonian` on the seed); no review-language filter (recommended). Matches FR31; `reviews.language` (T-301 Question 13) is not used by search.
B. **Review language on the reviews tab.** Not asked for by any requirement.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Which filters does the module accept?** FR31 and AC5.2.4 list more than the task (claimed status, provenance, symptom, treatment, medicine, no documents, both evidence paths, fee and schedule where available).

A. **The task's set plus `claimed`, `provenance`, term filters for symptom, treatment and medicine, `hasEvidence: false` for "no documents" and `evidenceGroup: both`; no fee or schedule filter, because no structured data exists** (recommended). Provenance is read as the source of the profile's name (`field_provenance.name.source`), marked `ASSUMPTION(T-205)`. T-206 renders what the prototype shows; the rest is ready for a later UI.
B. **The task's set only.** Smaller; FR31 and AC5.2.4 stay partly unmet.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**Can the facilities tab be ordered by facility feedback when facility feedback is turned off** (`featureVisibility.facilityAccounts = false`)?

A. **No: most accounts and most recent fall back to relevance** on the facilities tab while the setting is off (recommended). The hidden feedback cannot leak through the order.
B. **Keep the order.** Simpler, but the order reveals which branches have more feedback.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
