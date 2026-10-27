# T-205 — Search module (PostgreSQL FTS + trigram + aliases, neutral ranking)

| Field | Value |
|---|---|
| Story | STORY-SRCH-001, STORY-SRCH-002, STORY-SRCH-003 (alias redirect) |
| Phase / Lane | 2 / A |
| Class → model | M1 (XL) → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: the other vendor's mid-tier. Escalate to Opus 5 / Sol after one FAIL — relevance work is the phase's biggest correctness risk |
| Effort setting | `high` |
| Estimate | 5–7 h agent; validation 1.5–2 h |
| Depends on | T-201 (directory/taxonomy reads, `normalizeAliasKey`), T-005 (`search_documents`, `search_aliases`), T-009 (worker + `JobQueue`), T-204 merged first (outbox event names `doctor.changed`/`facility.changed` are consumed here) |
| Parallel-safe with | T-202, T-203, T-206 (T-206 consumes this module's contracts; it can start against the fake `SearchIndex` once `SearchResultsVM` is committed — commit the contracts file in your first hour), T-207 |

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-084 / C12 — evidence columns** — A migration in this task adds `evidence_groups evidence_group[] not null default '{}'` and `has_documents boolean not null default false` (doctor documents) to `search_documents`. `search.refresh` writes them; the `hasEvidence` and `evidenceGroup` filters read these columns only, labelled document presence, never a sentiment or quality signal. The queries stay inside Search and read no evidence table. Changes: Owned paths, steps 3, 4 and 7 and the acceptance rows.
- **C12 `EvidencePresence` port** — Search declares `EvidencePresence.forReview(reviewId): Promise<{groups: EvidenceGroup[]}>` and wires a no-evidence default (empty groups) until T-305 provides the Evidence implementation (`evidence.presenceForReview`), the same pattern T-101 uses for `ConfigProvider`. Review documents get `evidence_groups` from the port; doctor documents get `has_documents`.
- **C12 / C15 — refresh triggers** — `search.refresh` is triggered by `doctor.changed`, `facility.changed`, `term.changed`, `review.published`, `review.changed`, `review.hidden`, `review.restored`, `review.deleted` and `evidence.stateChanged`. This task adds the relay entries for the job it builds; T-305 adds the producer of `evidence.stateChanged` payload fields it needs.
- **C12 `search.removeAccountContent`** — The deletion step (kind: internal, worker, input `{reviewIds}`) is built by T-410 in `modules/search`, not here.

## Goal

Implement `search.query`, `search.suggest` and the `search.refresh` job on PostgreSQL so that Bengali,
English and Banglish queries — exact, alias, typo — find doctors, facilities, conditions and published
accounts, with publication filtering **before** ranking and an ordering that no engagement, sentiment,
outcome or evidence signal can move. Reproduce the prototype's "resolved note / keep original"
behaviour.

## Read first

1. `docs/architecture/ARCHITECTURE-SPINE.md` AD-8 and `docs/planning/05-recommended-architecture.md` "Search and bilingual behavior" (the ranking order is binding)
2. `docs/implementation/02-data-model.md` §13 (tables, generated `tsv`, indexes, refresh events), §5 (`taxonomy_aliases`)
3. `docs/implementation/03-routes-and-contracts.md` §3 (`SearchIndex`, `JobQueue`, `Outbox`), §4 "search", §5 events → `search.refresh`
4. `docs/implementation/01-conventions.md` §4 (text keys), §10, §11 (no raw queries in logs)
5. Prototype `rogikotha-data.js`: `resolveQuery` 1480–1496 (prefix match either way across `name.en`, `name.bn`, aliases), `search` 1497–1544 (filters; the comment "Ordering is neutral by construction"), `searchFacilities` 1662–1678, `conditions` array with `aliases` (8 conditions × ~5 aliases incl. Banglish: e.g. `dayabetis`, `sugar`, `চিনি রোগ`), `doctors` names/specialties/cities
6. Prototype `app.js` `renderResults` 554–614 for the three `resolvedNote` shapes and `filterFields` 351–374 for the filter keys the UI sends
7. PostgreSQL docs you will need: `to_tsvector('simple', …)`, `websearch_to_tsquery`, `pg_trgm` `similarity()` / `word_similarity()`, GIN `gin_trgm_ops`

## Owned paths

- `packages/domain/src/search/{normalize.ts,ranking.ts,resolve.ts}` (+ tests) — `normalize.ts` re-exports `normalizeAliasKey` from `domain/taxonomy` and adds `normalizeQuery`, `tokenize`
- `packages/contracts/src/schemas/search.ts`, `packages/contracts/src/view-models/search.ts` (`SearchResultsVM`, `SearchResultVM` union by kind, `ResolvedNoteVM`, `SuggestionVM`)
- `packages/application/src/modules/search/{queries/query.ts,queries/suggest.ts,jobs/refresh.ts,index.ts}`
- `packages/application/src/ports/search.ts` (`SearchIndex` port)
- `packages/application/src/modules/search/ports.ts` (`EvidencePresence` port with its no-evidence default, FD-084)
- `packages/database/src/search/{index.ts,sql.ts,documents.ts,aliases.ts}` and migrations `00xx_search_indexes.sql` (GIN on `tsv`, GIN `gin_trgm_ops` on `key_nfc`, btree on `(kind, published, accounts_count)`, `(kind, published, recent_at)`) and `00xx_search_evidence_columns.sql` (`evidence_groups`, `has_documents`, FD-084)
- `packages/test-support/src/fakes/search-index.ts` (naive in-memory implementation of the same port)
- `packages/test-support/src/corpus/search-corpus.ts` — the labelled query set (≥ 40 rows)
- `apps/worker/src/handlers/search-refresh.ts`
- `apps/web/src/app/api/search/suggest/route.ts`
- Tests under the same packages

## Not in scope

- The search page UI, compare tray, filter rail rendering → T-206 (this task ships the VM + query only)
- Reviews tab content beyond published `reviews` (facility accounts are not searched in Phase 1 demo — note in hand-off if you disagree)
- External search engines, vectors, personalisation, "near me"

## Steps

1. **Contracts.** `SearchQueryInput` `{q: string (≤ 200), tab: 'doctors'|'facilities'|'conditions'|'reviews' = 'doctors', sort: 'relevance'|'volume'|'recent' = 'relevance', exact?: boolean, page = 1, pageSize = 20, specialty?, condition?, city?, sentiment?, outcome?, hasEvidence?, gender?, language?, facilityType?}`. Filters apply per kind: doctors ← specialty, condition, city, sentiment, outcome, hasEvidence, gender, language; facilities ← city, facilityType; conditions ← none; reviews ← condition, sentiment, outcome, hasEvidence. Unknown filters for a tab are ignored, not errors. `SearchResultsVM` `{q, tab, sort, counts: {doctors, facilities, conditions, reviews}` (counts for **all** tabs so the segmented control can show them), `results: SearchResultVM[]`, `resolvedNote?: {kind: 'alias'|'banglish'|'typo'|'exactCondition', original, resolvedTo: {publicId, name}, matchedAlias?}`, `keepOriginalHref?`, `meta: PageMeta}`. `SearchResultVM` = `{kind:'doctor', card: DoctorCardVM} | {kind:'facility', card: FacilityCardVM} | {kind:'condition', publicId, name, accountsTotal} | {kind:'review', card: ExperienceCardVM}`.
2. **Normalisation** (`domain/search/normalize.ts`): `normalizeQuery(q)` = NFC, trim, collapse whitespace, lowercase (Latin), strip zero-width joiners **except** inside Bengali conjuncts (keep U+200D when both neighbours are Bengali letters), remove punctuation except hyphen inside BMDC-like tokens (`A-41287`). `tokenize` splits on whitespace. Unit-test with composed vs decomposed Bengali (`ডায়াবেটিস` typed with a decomposed য় must equal the NFC form).
3. **Documents.** `documents.ts` builds one `search_documents` row per entity: doctor → title = name (both langs), body = specialty + qualifications + city + area + chamber names, `key_nfc` = normalised concatenation of name_en, name_bn, bmdc, specialty, area, city; facility branch → org + branch names, type label, city, area; condition → name_en, name_bn, all `taxonomy_aliases`; review (published only) → title + body first 2000 chars + tag labels; `published` from the entity state; `accounts_count` (doctor: published reviews; branch: facility_reviews; condition: reviews tagged; review: 1); `recent_at` (latest published review at / published_at); `evidence_groups` (review documents, from `EvidencePresence.forReview`, empty by default) and `has_documents` (doctor documents: true when any of the doctor's published reviews has a group) (FD-084). `aliases.ts` fills `search_aliases`: conditions from `taxonomy_aliases`; doctors: full name, name without `Dr.`/`ডা.`, BMDC number, `lang` per script; facilities: org name, branch name.
4. **SQL** (`sql.ts`, parameterised, one statement per tab). Shape:
   ```sql
   WITH q AS (SELECT $1::text AS raw, $2::text AS key, websearch_to_tsquery('simple', $1) AS tsq),
   cand AS (
     SELECT d.*, 
       CASE WHEN d.key_nfc = q.key OR EXISTS (SELECT 1 FROM search_aliases a WHERE a.kind=d.kind AND a.ref_id=d.ref_id AND a.alias_key = q.key) THEN 0
            WHEN EXISTS (SELECT 1 FROM search_aliases a WHERE a.kind=d.kind AND a.ref_id=d.ref_id AND (a.alias_key LIKE q.key || '%' OR q.key LIKE a.alias_key || '%')) THEN 1
            WHEN d.tsv @@ q.tsq THEN 2
            WHEN similarity(d.key_nfc, q.key) > 0.3 OR EXISTS (SELECT 1 FROM search_aliases a WHERE a.kind=d.kind AND a.ref_id=d.ref_id AND similarity(a.alias_key, q.key) > 0.45) THEN 3
            ELSE NULL END AS tier,
       ts_rank(d.tsv, q.tsq) AS rank
     FROM search_documents d, q
     WHERE d.kind = $3 AND d.published = true            -- publication filter BEFORE ranking
       AND (<filters for this kind>)
   )
   SELECT * FROM cand WHERE tier IS NOT NULL
   ORDER BY tier ASC, rank DESC, accounts_count DESC, recent_at DESC, public_id ASC   -- relevance
   LIMIT $n OFFSET $m;
   ```
   `sort='volume'` → `ORDER BY accounts_count DESC, tier, rank DESC, public_id`; `sort='recent'` → `ORDER BY recent_at DESC, tier, rank DESC, public_id`. An empty `q` returns all published rows of the kind in the chosen sort (alphabetical by title for `relevance`). **No column derived from sentiment, outcome, reactions or evidence may appear in any `ORDER BY`** — add a unit test that parses the generated SQL and asserts this.
   Doctor-tab filters: `specialty` → `specialty_id`; `city` → `city_key`; `condition`, `sentiment`, `outcome`, `gender`, `language` → `EXISTS` subqueries against `reviews`/`review_tags`/`doctors`; `hasEvidence` → `has_documents` on the doctor document (FD-084), and on the reviews tab `hasEvidence` and `evidenceGroup` read `evidence_groups` (no query touches `evidence_items`) (filters narrow the set; they never reorder).
5. **Resolved note** (`domain/search/resolve.ts`, applied in the query before the SQL): find a condition whose `name_key_en`, `name_key_bn` or any alias key equals the query key (`exactCondition`), or is a prefix of it / has it as prefix (`alias`; `banglish` when the matched alias `lang = 'banglish'`), else the closest alias by trigram `similarity ≥ 0.6` (`typo`). If found and the matched text ≠ the raw query → `resolvedNote` with `matchedAlias`, `keepOriginalHref = ?q=<raw>&exact=1`, and the doctors tab is **additionally** constrained to doctors with a published review tagged with that condition (this is what the prototype does: `search()` filters doctors by the resolved condition). With `exact=1`, skip resolution and run tiers 0–2 only (no trigram). When the query resolves to a condition exactly, the note offers the condition page link (`condition.accounts`), matching the prototype's second branch.
6. **Suggestions.** `search.suggest({q})` → ≤ 8 rows: exact/prefix alias matches first, then trigram; kinds mixed but conditions before doctors before facilities on ties; each `{kind, publicId, title}`; never includes unpublished. Route handler `/api/search/suggest` with `Cache-Control: no-store`, rate-limited `search.suggest:net:<hash>` 60/min; **do not log the query** (conventions §11).
7. **Refresh job.** `search.refresh {kind, refId}` handler in the worker: rebuild that document + its aliases (delete + insert in one transaction); idempotent by `singletonKey = kind:refId`. Wire outbox consumers: `doctor.changed`, `facility.changed`, `term.changed`, `evidence.stateChanged` (FD-084), `review.published|changed|hidden|restored|deleted` → also refresh the review's doctor, branch and tagged conditions (counts change). Add `pnpm search:reindex` (script in `packages/database`) that rebuilds everything from scratch — T-007's seed calls it at the end (coordinate: add the call in `packages/test-support/src/seed/seed.ts` **only if** T-007 left a `// HOOK(T-205)` marker; otherwise list it under Questions).
8. **Corpus** (`search-corpus.ts`): ≥ 40 entries `{q, tab, expectTopPublicIdSeedRef, expectNote?: kind}` derived from the seed — for each of the 8 conditions: name_en, name_bn, one Banglish alias, one typo (drop/swap a letter), one prefix (`diab`); for 6 doctors: full name en, full name bn, surname only, BMDC; for facilities: name en/bn; plus 4 no-result queries (`xyzzy`, a random Bengali string) expecting empty results and no note. Mark rows whose expectation the implementer had to relax (`relaxed: 'reason'`) so the validator sees them.
9. **Metamorphic neutrality test** (integration): snapshot doctor ordering for 5 queries; then mutate the seed (flip sentiments of 3 reviews, add 50 reactions to one doctor's reviews, mark 2 evidence items `published`, add `dislikes`); reindex; ordering must be identical for `relevance` and `volume`; for `recent` it may change only if `published_at` changed (it did not).
10. **Hidden-record probe** (integration): hide r1 → `search.query({q: r1 title})` on the reviews tab returns nothing; the doctor's `accounts_count` drops by one after refresh; suggestions never return it.
11. `pnpm check`, `EXPLAIN ANALYZE` the doctor-tab query on the seed and paste the plan into the hand-off (index usage is the acceptance evidence for AD-8).

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Corpus | `pnpm vitest run packages/database -t "search corpus"` | ≥ 38 of 40+ rows pass; every failing row is listed with its `relaxed` reason in the hand-off |
| Banglish | `pnpm vitest run -t "dayabetis"` | `resolvedNote.kind = 'banglish'`, `resolvedTo` = Type 2 diabetes, doctors tab lists only doctors with a diabetes-tagged published review, `keepOriginalHref` present |
| Keep original | `pnpm vitest run -t "exact=1"` | with `exact: true` no note, tiers 0–2 only |
| Typo | `pnpm vitest run -t "typo"` | `diabetis` → note kind `typo` (or `alias` if an alias covers it — either passes, must be one of them) |
| Neutrality | `pnpm vitest run packages/database -t "metamorphic"` | identical ordering before/after engagement mutations |
| SQL never orders by engagement | `pnpm vitest run packages/database -t "order by"` | generated SQL for all sorts contains no `sentiment`, `outcome`, `reaction`, `evidence` in `ORDER BY` |
| Publication filter precedes ranking | `pnpm vitest run -t "hidden"` | hidden review absent from results, counts and suggestions |
| Suggest endpoint | `curl -s "localhost:3000/api/search/suggest?q=ডায়া"` | ≤ 8 JSON rows, condition first; 429 after 60/min |
| Query plan | paste in hand-off | doctor-tab plan shows the GIN indexes used; P95 over 100 runs on seed < 30 ms |
| FD-084: evidence columns and filters (C12) | integration test: publish a review with a `document` group evidence item, run `search.refresh`, query reviews with `hasEvidence` and `evidenceGroup=document`, and doctors with `hasEvidence` | the review appears with `evidence_groups = {document}`; the doctor document has `has_documents = true`; a review with none is excluded; the SQL for these filters reads `search_documents` only |
| FD-084: no-evidence default | refresh a review document before T-305's implementation is wired | `evidence_groups = '{}'` and `has_documents = false`; no error |
| FD-084: `evidence.stateChanged` refreshes | emit `evidence.stateChanged` for an item of a published review, run the relay | one `search.refresh` job with `singletonKey` per event; the document is rebuilt once |
| Full check | `pnpm check` | green |

## Tests to write

- domain: `normalizeQuery` (NFC, ZWJ handling, BMDC hyphen), `resolve` (all four note kinds; no note when raw equals matched), tokenizer.
- application (fake index): filters ignored for the wrong tab; `exact` bypasses resolution; counts for all tabs computed.
- database: corpus; metamorphic; hidden; refresh idempotency (run job twice → one row); alias generation (`Dr.` stripped, BMDC present); SQL order-by guard.
- worker: handler registers `singletonKey`.

## Hard-rule checklist

- [ ] Ordering is neutral: relevance / most accounts / most recent only; test proves no engagement or sentiment column in any `ORDER BY`.
- [ ] Publication filter is in `WHERE` before ranking; hidden/deleted never appear in results, counts or suggestions.
- [ ] Original query is never replaced silently: the note names what matched and offers "keep original".
- [ ] Raw queries never logged (grep the logger calls in owned paths).
- [ ] Bengali and English documents indexed together; native-script exact match outranks alias and fuzzy.
- [ ] No private data in `search_documents` (no exact dates, no evidence text, no author account ids).
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
