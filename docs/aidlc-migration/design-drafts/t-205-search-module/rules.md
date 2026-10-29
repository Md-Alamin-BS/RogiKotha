# Business rules — U18 `t-205-search-module`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U18), `unit-of-work-story-map.md` (US5.1, US5.2, US5.3), `requirements.md` (FR28–FR35, FR36–FR38, FR58, NFR8), `stories.md` (AC5.1.1–AC5.1.6, AC5.2.1–AC5.2.6, AC5.3.2, AC5.3.3), `components.md` (Search), `contract-summary.md` (C12, C15 and the common rules), T-205 with its FD-076..FD-090 amendments, FD-035, FD-084, FD-092 (R3), FD-093, the project hard rules (`project.md`), `01-conventions.md` §2–§4, §10, §11, `02-data-model.md` §5, §6, §13, §16, §17, the prototype (`rogikotha-data.js` `resolveQuery`, `search`, `searchFacilities`; concept 04b `renderResults`, `filterFields`) and the U14 T-201 draft (eligibility BR1.1–BR1.6, `normalizeAliasKey` BR4.1–BR4.2, view models). The workflows that apply these rules, the port signatures and the view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. Every question was answered A under the owner's no-questions instruction of 2026-10-29; `functional-spec.md` § 14 lists what changes if the owner reverses one.

```yaml
rules:
  # BR1 — what the projection holds
  - id: BR1.1
    statement: "A doctor document exists only while the doctor is published and not merged into another profile."
    category: constraint
    applies_to: "search.refresh (doctor), reindexAll"
    trigger: "Rebuilding a doctor document"
    logic: "IF doctors.state = published AND merged_into_id IS NULL THEN upsert the document, its aliases and its term rows ELSE delete all three (BR1.5)"
    violation: "A pending, rejected, hidden or merged profile in results, counts or suggestions fails AC5.1.6"
    source: "FR15, FR35, AC5.1.6, T-201 BR1.1, Question 3"
  - id: BR1.2
    statement: "A facility document is one branch, and exists only while the branch and its organisation are both published."
    category: constraint
    applies_to: "search.refresh (facility), reindexAll"
    trigger: "Rebuilding a branch document"
    logic: "kind facility, ref_id = facility_branches.id, public_id = the branch public id; IF branch.state = published AND facilities.state = published THEN upsert ELSE delete"
    violation: "An unpublished branch in results fails AC5.1.6"
    source: "FR24, AC5.1.6, T-201 BR1.2, 02-data-model.md §4"
  - id: BR1.3
    statement: "A condition document exists for each published condition term that is not mapped onto another term; an unmapped provisional term is indexed and flagged provisional."
    category: constraint
    applies_to: "search.refresh (condition), reindexAll"
    trigger: "Rebuilding a condition document"
    logic: "IF term.kind = condition AND term.state = published AND canonical_id IS NULL THEN upsert with provisional = term.provisional ELSE delete; a mapped term's aliases reach its canonical document because mapProvisional copies them (T-201 BR5.4)"
    violation: "A new provisional tag that cannot be found (AC5.3.2), or a mapped alias that still opens the provisional term (AC5.3.3)"
    source: "FR37, AC5.3.2, AC5.3.3, T-201 BR1.6, BR4.6"
  - id: BR1.4
    statement: "A review document exists only while the review is published, has no deleted_at, and its doctor is visible."
    category: constraint
    applies_to: "search.refresh (review), reindexAll"
    trigger: "Rebuilding a review document"
    logic: "IF reviews.state = published AND deleted_at IS NULL AND the review's doctor satisfies BR1.1 THEN upsert ELSE delete"
    violation: "A hidden, deleted or tombstoned review, or a review of a hidden profile, in results, counts or suggestions fails the hidden-record probe and AC5.1.6"
    source: "FR35, FR50, AC5.1.6, T-201 BR1.3, T-205 step 10"
  - id: BR1.5
    statement: "When a source stops being public, its document, aliases and term rows are deleted in one transaction; nothing non-public stays in the search tables."
    category: constraint
    applies_to: "SearchIndex.rebuild, search.refresh"
    trigger: "A rebuild finds the source ineligible or missing"
    logic: "delete from search_document_terms, search_aliases and search_documents where kind and ref_id match, in the rebuild's transaction; the published column stays and is always true for stored rows"
    violation: "The title and text of a hidden or deleted review kept in a derived table"
    source: "Question 3, FR35, 02-data-model.md §13"
  - id: BR1.6
    statement: "Every search, count and suggestion statement filters published = true in WHERE, before any ranking."
    category: constraint
    applies_to: "packages/database/src/search/sql.ts"
    trigger: "Any read of search_documents"
    logic: "WHERE d.kind = $kind AND d.published = true AND <filters> is in the candidate CTE; tiers, ranks and ORDER BY are computed only over that set"
    violation: "A statement without the predicate fails the SQL guard test"
    source: "02-data-model.md §13, T-205 step 4 and hard-rule checklist, components.md Search"
  - id: BR1.7
    statement: "accounts_count is the number of eligible accounts: doctor = distinct eligible reviews; branch = eligible facility reviews; condition = distinct eligible reviews tagged with the term as effective term; review = 1."
    category: calculation
    applies_to: "search.refresh"
    trigger: "Computing a document"
    logic: "eligible review = T-201 BR1.3 (state published, deleted_at null); eligible facility review = T-201 BR1.4; effective term = canonical_id when set else id (T-201 BR1.6); every count is count(distinct id)"
    violation: "A hidden review still counted, so the doctor's count does not drop after hide (step 10)"
    source: "T-205 step 3, T-201 BR1.3, BR1.4, BR1.6"
  - id: BR1.8
    statement: "recent_at is the newest published_at of the document's eligible accounts (the review's own published_at for a review); a document without accounts has none."
    category: calculation
    applies_to: "search.refresh"
    trigger: "Computing a document"
    logic: "doctor: max(reviews.published_at) over eligible reviews; branch: max(facility_reviews.published_at) over eligible ones; condition: max over eligible tagged reviews; review: published_at; never exact_date_enc or a period"
    violation: "A private treatment date used for ordering"
    source: "T-205 step 3, 02-data-model.md §6"
  - id: BR1.9
    statement: "Term rows record, per doctor or review document, each effective term of an eligible review's tags with its distinct-review count."
    category: calculation
    applies_to: "search_document_terms, search.refresh"
    trigger: "Rebuilding a doctor or review document"
    logic: "for every review_tags row with term_id of an eligible review: term = effective(term_id) if that term is published; row (kind, ref_id, term_id, term_public_id, term_kind, accounts_count = count(distinct review_id)); free-text and not_sure tags give no row"
    violation: "A doctor filtered by a mapped alias's term missing (AC5.3.3), or counted twice for one review"
    source: "Question 2, FR31, T-201 BR1.6"

  # BR2 — normalisation
  - id: BR2.1
    statement: "Every key, stored or looked up, is normalizeAliasKey of its text, computed in application or domain code, never in the database package."
    category: constraint
    applies_to: "domain/search/normalize.ts, modules/search, search_documents.key_nfc, search_aliases.alias_key, city_key, language_keys"
    trigger: "Writing or matching any key"
    logic: "key = normalizeAliasKey(text) (T-201 BR4.1: NFC, lowercase, letters, marks and digits only); normalize.ts re-exports it; the database adapter receives keys as parameters (FD-093: database may not import domain)"
    violation: "A key function inside packages/database fails the boundary lint; two spellings of one word giving different keys fail the domain tests"
    source: "T-205 step 2, T-201 BR4.1, BR4.2, 01-conventions.md §2 and §4"
  - id: BR2.2
    statement: "normalizeQuery(q) is NFC, trimmed, with whitespace collapsed, Latin letters lowercased, zero-width characters removed except a ZWJ between two Bengali letters, and punctuation removed except a hyphen between letters and digits (A-41287)."
    category: calculation
    applies_to: "domain/search/normalize.ts; the full-text query and the stored title and body text"
    trigger: "Preparing the text side of a query or a stored document"
    logic: "the same function prepares stored title and body text (normalizeStoredText = normalizeQuery without punctuation removal), so a ZWJ kept or dropped on one side is kept or dropped on the other; composed and decomposed Bengali give the same string"
    violation: "A decomposed য় query not matching the stored NFC text fails the domain test"
    source: "T-205 step 2, 01-conventions.md §4"
  - id: BR2.3
    statement: "tokenize(text) splits normalised text on whitespace and drops empty tokens."
    category: calculation
    applies_to: "domain/search/normalize.ts"
    trigger: "Splitting a query or a language list"
    logic: "split on /\\s+/u after normalizeQuery; no stemming, no stop words"
    violation: "An empty token reaching the full-text query"
    source: "T-205 step 2"
  - id: BR2.4
    statement: "The query text is at most 200 characters after trimming; an empty query is allowed and means browse."
    category: validation
    applies_to: "SearchQueryInput, SearchSuggestInput"
    trigger: "Parsing search input"
    logic: "q: string, trimmed length 0..200; longer → err('validation'); empty → BR4.3"
    violation: "A 10 000-character query reaching SQL, or an empty query refused"
    source: "T-205 step 1 and step 4 (empty q), F8"
  - id: BR2.5
    statement: "Stored review text is cut to 2 000 graphemes with Intl.Segmenter, never by code units."
    category: calculation
    applies_to: "modules/search/build-documents.ts"
    trigger: "Building a review document body"
    logic: "graphemes(text).slice(0, 2000).join(''); Intl.Segmenter is a built-in, not an import"
    violation: "A Bengali conjunct cut in half (01-conventions.md §4: never slice)"
    source: "T-205 step 3, 01-conventions.md §4"

  # BR3 — aliases
  - id: BR3.1
    statement: "A doctor's aliases are the name in each language, the name without its title prefix, and the BMDC number with and without its letter prefix."
    category: calculation
    applies_to: "modules/search/build-documents.ts (doctor)"
    trigger: "Rebuilding a doctor document"
    logic: "aliases = {name_en, name_bn, name_en without leading 'Dr.'/'Dr', name_bn without leading 'ডা.'/'ডাঃ', bmdc_number, bmdc digits only}; lang = bn when the text has Bengali letters else en; provenance from field_provenance.name.source (community when absent)"
    violation: "A doctor not found by surname-plus-given-name without 'Dr.' or by BMDC (corpus rows)"
    source: "T-205 step 3"
  - id: BR3.2
    statement: "A branch's aliases are its own name, its label, its name with its label, and its organisation's name, in each language."
    category: calculation
    applies_to: "modules/search/build-documents.ts (facility)"
    trigger: "Rebuilding a branch document"
    logic: "aliases = {branch name_en/bn, branch_label_en/bn when present, name + ' ' + label, facilities.name_en/bn}; f1 is found by 'Shefa General Hospital', 'Dhanmondi branch' and 'Shefa Health Group'"
    violation: "A branch not found by its organisation's name (T-201 finding F16)"
    source: "T-205 step 3, T-201 BR3.11 and finding F16"
  - id: BR3.3
    statement: "A condition's aliases are its name in each language and every taxonomy alias of the term, with the alias's own lang."
    category: calculation
    applies_to: "modules/search/build-documents.ts (condition)"
    trigger: "Rebuilding a condition document"
    logic: "aliases = {name_en (lang en), name_bn (lang bn)} ∪ taxonomy_aliases of the term (lang en | bn | banglish, as stored)"
    violation: "dayabetis not resolving to Type 2 diabetes as banglish (acceptance row)"
    source: "T-205 step 3 and step 5"
  - id: BR3.4
    statement: "Review documents have no aliases; they are found by full-text and trigram matching only."
    category: constraint
    applies_to: "search.refresh (review), search.suggest"
    trigger: "Rebuilding a review document"
    logic: "no search_aliases rows with kind review; suggestions therefore never contain reviews"
    violation: "A review title offered as a suggestion"
    source: "T-205 step 6"
  - id: BR3.5
    statement: "Aliases are unique per document by key, and lang is one of en, bn, banglish, enforced by a CHECK constraint."
    category: constraint
    applies_to: "search_aliases"
    trigger: "Writing aliases"
    logic: "dedupe by alias_key before insert (first written wins); CHECK (lang IN ('en','bn','banglish')) added by this Unit's migration"
    violation: "ISS-146 stays open; duplicate alias rows inflate the alias tier"
    source: "ISS-146, 02-data-model.md §13"

  # BR4 — matching
  - id: BR4.1
    statement: "A document matches at the best of four tiers: 0 exact alias key, 1 alias prefix either way, 2 full-text match, 3 trigram similarity; a document at no tier is not a result."
    category: calculation
    applies_to: "packages/database/src/search/sql.ts"
    trigger: "Any non-empty query"
    logic: "tier 0: an alias with alias_key = key; tier 1 (key length ≥ 3): an alias with alias_key LIKE key||'%' or key LIKE alias_key||'%' (alias length ≥ 3); tier 2: tsv @@ websearch_to_tsquery('simple', text); tier 3: key <% key_nfc (word similarity) or an alias with alias_key % key; tier 3 uses the indexed operators with SET LOCAL pg_trgm thresholds, never similarity() > x in WHERE"
    violation: "A native-script exact match ranked below a fuzzy match (hard-rule checklist), or a sequential scan of the trigram index (F2)"
    source: "T-205 step 4, components.md Search, Question 4"
  - id: BR4.2
    statement: "With exact = true, resolution is skipped and only tiers 0–2 apply."
    category: policy
    applies_to: "search.query"
    trigger: "keepOriginalUrl followed, or exact=1 sent"
    logic: "IF exact THEN no resolvedNote, no didYouMean, no condition constraint, no tier 3"
    violation: "The 'keep original' link still showing the resolved results (acceptance row exact=1)"
    source: "T-205 step 5, AC5.1.3"
  - id: BR4.3
    statement: "An empty query returns every published document of the tab's kind in the chosen order; relevance means alphabetical in the active language."
    category: policy
    applies_to: "search.query"
    trigger: "q is empty after trimming"
    logic: "every candidate gets tier 0 and rank 0; relevance order = BR5.4; no resolution"
    violation: "The browse page empty, or ordered by count"
    source: "T-205 step 4"
  - id: BR4.4
    statement: "The tuning constants are named constants in domain/search/ranking.ts, set from the labelled corpus in Code Generation; they are not runtime configuration."
    category: constraint
    applies_to: "domain/search/ranking.ts"
    trigger: "Code Generation"
    logic: "SEARCH_TUNING = {prefixMinLength: 3, typoMinLength: 4, typoSimilarity: 0.6, ambiguityMargin: 0.05, aliasTrigram: 0.45, wordSimilarity: 0.6}; starting values from the task, each change recorded with the corpus result"
    violation: "A threshold changed to make one corpus row pass without the change being recorded"
    source: "T-205 steps 4, 5 and 8, Question 4"

  # BR5 — neutral ordering
  - id: BR5.1
    statement: "Relevance orders by tier, then text rank, then the relevant account count, then recency, then public id."
    category: calculation
    applies_to: "sql.ts"
    trigger: "sort = relevance with a non-empty query"
    logic: "ORDER BY tier ASC, rank DESC, relevant_count DESC, recent_at DESC NULLS LAST, public_id ASC; relevant_count per BR5.6"
    violation: "Any other key in the relevance order"
    source: "FR32, T-205 step 4"
  - id: BR5.2
    statement: "Most accounts orders by the relevant account count, then tier, text rank and public id."
    category: calculation
    applies_to: "sql.ts"
    trigger: "sort = volume"
    logic: "ORDER BY relevant_count DESC, tier ASC, rank DESC, public_id ASC"
    violation: "Volume order changed by sentiment, outcome, documents or reactions (metamorphic test)"
    source: "FR32, AC5.2.2, T-205 step 4"
  - id: BR5.3
    statement: "Most recent orders by recent_at, newest first, then tier, text rank and public id."
    category: calculation
    applies_to: "sql.ts"
    trigger: "sort = recent"
    logic: "ORDER BY recent_at DESC NULLS LAST, tier ASC, rank DESC, public_id ASC"
    violation: "Documents without accounts listed first"
    source: "FR32, AC5.2.2, T-205 step 4"
  - id: BR5.4
    statement: "Alphabetical orders by the title in the active language, then public id."
    category: calculation
    applies_to: "sql.ts"
    trigger: "sort = alphabetical, or relevance with an empty query"
    logic: "ORDER BY coalesce(title_<locale>, title_en) COLLATE the ICU root collation when available (T-201's check), public_id ASC"
    violation: "AC5.2.2's alphabetical option missing"
    source: "FR32, AC5.2.2, Question 6"
  - id: BR5.5
    statement: "No ORDER BY may contain a column or expression derived from sentiment, outcome, reactions, comments, evidence or documents; the ORDER BY clause is built only from a closed list of sort keys."
    category: constraint
    applies_to: "sql.ts, domain/search/ranking.ts, the SQL guard test"
    trigger: "Building any statement"
    logic: "ORDER_BY = {relevance, volume, recent, alphabetical} → fixed fragments over tier, rank, relevant_count, recent_at, title, public_id; the guard test renders every statement for every tab and sort and asserts that its ORDER BY contains none of sentiment, outcome, reaction, comment, evidence, document, has_documents"
    violation: "Hard rule: no number stands for quality; no highest-rated sort; the guard test fails"
    source: "FR32, AC5.2.1, AC5.2.2, PRODUCT.md hard rules, T-205 step 4 and acceptance row 'order by'"
  - id: BR5.6
    statement: "The relevant account count is the term count when the results are constrained to one term, else accounts_count."
    category: calculation
    applies_to: "sql.ts"
    trigger: "A resolved condition (BR6.9) or a single term filter (BR7.4) on the doctors tab"
    logic: "relevant_count = search_document_terms.accounts_count for that term ELSE d.accounts_count; the text rank is computed on a body where every label appears once (BR5.7)"
    violation: "Default condition search ordered by a doctor's total instead of the 'relevant public-review count' (FR32)"
    source: "FR32, AC5.2.1"
  - id: BR5.7
    statement: "A doctor body lists each term label once, so the text rank cannot grow with the number of accounts that carry a label."
    category: constraint
    applies_to: "modules/search/build-documents.ts (doctor)"
    trigger: "Rebuilding a doctor document"
    logic: "body = specialty names, qualifications, city, area, chamber names, and the distinct names of the effective terms of eligible reviews; no free-text tags, no review text, no sentiment or outcome words"
    violation: "Two doctors with equal relevance reordered after one gains accounts mentioning a word (AC5.2.1)"
    source: "AC5.2.1, Question 8"
  - id: BR5.8
    statement: "With facility feedback turned off, the facilities tab orders most accounts and most recent as relevance."
    category: policy
    applies_to: "search.query"
    trigger: "featureVisibility.facilityAccounts = false and tab facilities or all"
    logic: "sort volume or recent → the relevance fragment for the facility statement; the VM's sort echoes the requested sort"
    violation: "Hidden facility feedback leaking through the order"
    source: "Question 15, T-201 BR2.12"

  # BR6 — resolution
  - id: BR6.1
    statement: "Resolution compares the query key with the condition alias set loaded from the published condition documents, in domain code."
    category: calculation
    applies_to: "domain/search/resolve.ts, modules/search/queries/query.ts"
    trigger: "A non-empty query with exact = false"
    logic: "aliases = SearchIndex.conditionAliases() (alias, alias_key, lang, term publicId, name_en, name_bn); resolve(key, aliases, SEARCH_TUNING) is pure and uses a code-point trigram similarity of its own (pg_trgm-compatible padding)"
    violation: "Bengali typo resolution depending on the database locale (F12)"
    source: "Question 4, T-205 step 5"
  - id: BR6.2
    statement: "A query whose key equals a condition's English or Bengali name key resolves to it with note kind exactCondition, which offers the condition page and no keep-original link."
    category: calculation
    applies_to: "domain/search/resolve.ts"
    trigger: "Resolution"
    logic: "name candidates = condition name aliases (lang en or bn written from name_en / name_bn) with alias_key = key; one condition → exactCondition; an exact match on any other alias is handled by BR6.3"
    violation: "A topic chip from Discover (T-207 BR3.3) not offering the condition page"
    source: "T-205 step 5, prototype renderResults second branch, finding F13"
  - id: BR6.3
    statement: "Otherwise a query that equals an alias, is a prefix of an alias, or has an alias as prefix, resolves to that condition with note kind banglish when the alias lang is banglish, else alias."
    category: calculation
    applies_to: "domain/search/resolve.ts"
    trigger: "No exact candidate and key length ≥ prefixMinLength"
    logic: "candidates: aliases with alias_key = key first, then prefix either way (both keys ≥ prefixMinLength); one distinct condition at the best of the two → resolved with matchedAlias = the alias as written; several → BR6.5"
    violation: "dayabetis resolving with kind alias instead of banglish"
    source: "T-205 step 5, prototype resolveQuery"
  - id: BR6.4
    statement: "Otherwise the closest alias with trigram similarity of at least typoSimilarity resolves with note kind typo."
    category: calculation
    applies_to: "domain/search/resolve.ts"
    trigger: "No exact or prefix candidate and key length ≥ typoMinLength"
    logic: "best = max similarity(key, alias_key); IF best ≥ typoSimilarity AND no other condition within ambiguityMargin THEN typo note ELSE BR6.5 or no resolution"
    violation: "diabetis giving no note (acceptance row: typo or alias)"
    source: "T-205 step 5"
  - id: BR6.5
    statement: "When the best tier has more than one condition, nothing is resolved and up to three Did you mean suggestions are returned; the query stays as typed."
    category: policy
    applies_to: "domain/search/resolve.ts, SearchResultsVM.didYouMean"
    trigger: "Ambiguous prefix or typo candidates"
    logic: "didYouMean = the distinct conditions of the best tier, ordered by similarity then name, at most 3, each {publicId, name in locale}; no resolvedNote; results are the plain tiered search"
    violation: "An ambiguous Banglish query silently resolved to the first condition (AC5.1.3)"
    source: "FR29, AC5.1.3, Question 7"
  - id: BR6.6
    statement: "No condition resolution happens when a doctor or facility alias matches the query key exactly."
    category: policy
    applies_to: "modules/search/queries/query.ts"
    trigger: "Before resolution"
    logic: "IF SearchIndex has a doctor or facility alias with alias_key = key THEN skip resolution"
    violation: "A doctor's exact name hidden behind a condition note"
    source: "components.md Search (exact native-script match first), T-205 hard-rule checklist"
  - id: BR6.7
    statement: "The query is never replaced: the VM echoes q exactly as received, and the note names the original and what matched."
    category: constraint
    applies_to: "SearchResultsVM"
    trigger: "Any resolution"
    logic: "vm.q = input q (untrimmed text shown by the page); resolvedNote = {kind, original: q, resolvedTo: {publicId, name}, matchedAlias?}"
    violation: "Hard-rule checklist: the original query silently replaced"
    source: "FR29, AC5.1.3, T-205 hard-rule checklist"
  - id: BR6.8
    statement: "A resolved note other than exactCondition carries keepOriginalUrl, the same search with exact = 1."
    category: calculation
    applies_to: "SearchResultsVM.keepOriginalUrl"
    trigger: "resolvedNote.kind in alias, banglish, typo"
    logic: "keepOriginalUrl = '/search?' + query string of {q, tab, sort, exact: 1}, locale-free (the page's router adds the locale); absent for exactCondition and for no note"
    violation: "Keep-original link losing the tab or the sort"
    source: "T-205 step 5, C12, T-206 step 4"
  - id: BR6.9
    statement: "A resolved condition constrains the doctors and reviews tabs to documents carrying that term; the facilities and conditions tabs are not constrained."
    category: policy
    applies_to: "search.query"
    trigger: "A resolution (exactCondition, alias, banglish or typo)"
    logic: "doctors and reviews: EXISTS a search_document_terms row with the resolved term; the text tiers are not applied to these two tabs (every constrained document gets tier 0); facilities and conditions run the plain tiered search"
    violation: "dayabetis listing doctors without a diabetes-tagged account (acceptance row)"
    source: "T-205 step 5, prototype search()"

  # BR7 — filters
  - id: BR7.1
    statement: "Each filter applies only to the tabs listed for it; a filter sent for another tab is ignored, not an error."
    category: validation
    applies_to: "search.query"
    trigger: "Parsing filters"
    logic: "doctors: specialty, term (condition, symptom, treatment, medicine), city, sentiment, outcome, hasEvidence, gender, language, claimed, provenance; facilities: city, facilityType, claimed, provenance; reviews: term, sentiment, outcome, hasEvidence, evidenceGroup; conditions: none"
    violation: "A doctors-only filter emptying the facilities count"
    source: "T-205 step 1, FR31, Question 14"
  - id: BR7.2
    statement: "Filters read only Search's own tables; no query touches a directory, taxonomy, review or evidence table."
    category: constraint
    applies_to: "sql.ts"
    trigger: "Building a filter predicate"
    logic: "scalar and array columns of search_documents and EXISTS on search_document_terms; the SQL guard test asserts that the rendered statements name no table other than search_documents, search_aliases and search_document_terms"
    violation: "FD-084 'queries stay inside Search' broken; the reviews-tab evidence filter reading evidence_items"
    source: "FD-084, C12, Question 2"
  - id: BR7.3
    statement: "Filters narrow the set and never change the order."
    category: constraint
    applies_to: "sql.ts"
    trigger: "Any filter"
    logic: "filter predicates sit in WHERE only; the one order input a filter can select is the term count of BR5.6"
    violation: "A sentiment filter that reorders (AC5.2.1)"
    source: "FR32, AC5.2.4"
  - id: BR7.4
    statement: "Doctor filters: specialty is a specialty term public id; a term filter is a public id matched through term rows; city is a city key; sentiment and outcome mean at least one eligible account with that value; gender is the stored value; language is a consultation-language key."
    category: calculation
    applies_to: "sql.ts (doctor)"
    trigger: "Doctors tab with filters"
    logic: "specialty → specialty_public_id = $v (stored on the doctor document next to specialty_id); term → EXISTS term row with term_public_id; city → city_key = key; sentiment → $v = ANY(sentiments); outcome → $v = ANY(outcomes); gender → gender = $v; language → $v = ANY(language_keys); claimed → claimed; provenance → provenance = $v"
    violation: "A filter value that never matches because the stored form differs from the page's value"
    source: "FR31, AC5.2.4, prototype filterFields, Question 13"
  - id: BR7.5
    statement: "Evidence filters are document presence only: hasEvidence true means at least one published document, false means none; evidenceGroup reviewed, later, outcome or both selects review documents by group."
    category: calculation
    applies_to: "sql.ts (doctor, review)"
    trigger: "hasEvidence or evidenceGroup"
    logic: "doctor: has_documents = $v; review: (evidence_groups <> '{}') = $v; evidenceGroup g → g = ANY(evidence_groups); both → evidence_groups @> '{reviewed,later}'; no label in the module calls it verified"
    violation: "An evidence filter presented as verification (AC5.2.4, hard rule)"
    source: "FR31, FR58, AC5.2.4, FD-084, C12"
  - id: BR7.6
    statement: "Fee and schedule filters are not offered: the data has no structured fee or schedule."
    category: policy
    applies_to: "SearchQueryInput"
    trigger: "Contract definition"
    logic: "no fee or schedule filter key; AC5.2.4 allows them only where the data exists"
    violation: "A filter that can never match"
    source: "AC5.2.4, 01-conventions.md §4 (fee display string only)"
  - id: BR7.7
    statement: "Location is a manually chosen city; there is no coordinate, distance or Near Me input."
    category: constraint
    applies_to: "SearchQueryInput"
    trigger: "Contract definition"
    logic: "city key only; the module reads no device position and stores no coordinates"
    violation: "A geolocation input (FR34)"
    source: "FR28, FR34, AC5.1.5"
  - id: BR7.8
    statement: "An unknown public id or key in a filter gives an empty result, not an error; a value outside an enum is a validation error."
    category: validation
    applies_to: "SearchQueryInput, search.query"
    trigger: "Parsing filters"
    logic: "enums (sentiment, outcome, facilityType, gender, provenance, evidenceGroup, tab, sort) are closed zod enums; ids and keys are strings matched as given"
    violation: "A stale bookmarked filter URL turning into a 500"
    source: "01-conventions.md §3, T-206 step 1 (the page drops invalid values first)"

  # BR8 — results
  - id: BR8.1
    statement: "Counts are returned for all four kinds, each with the same query, resolution and the filters that apply to that kind."
    category: calculation
    applies_to: "search.query"
    trigger: "Every query"
    logic: "counts = {doctors, facilities, conditions, reviews}, each a count(*) over the candidate set of BR1.6 and BR4.1 for that kind"
    violation: "Tab counts that disagree with the tab's list"
    source: "T-205 step 1"
  - id: BR8.2
    statement: "The all tab returns up to three results of each kind, in the fixed order doctors, facilities, conditions, reviews, each list in its own order; kinds are never ranked against each other."
    category: policy
    applies_to: "search.query"
    trigger: "tab = all"
    logic: "results = first 3 of each kind statement concatenated in that order; meta.total = sum of counts; pagination applies to single-kind tabs only"
    violation: "A cross-kind score (FR30, no combined score)"
    source: "FR30, Question 5"
  - id: BR8.3
    statement: "Result cards come from the owning modules through the ResultCards port, in the order of the hits; a hit without a card is dropped."
    category: constraint
    applies_to: "modules/search/queries/query.ts"
    trigger: "Mapping hits"
    logic: "doctor hits → ResultCards.doctors(ids, locale) (DoctorCardVM); facility → branches (FacilityCardVM); review → reviews (ExperienceCardVM); condition results are built from the document {publicId, name, accountsTotal, provisional}; order follows the hit list; a missing card (changed since the refresh) is left out of the page"
    violation: "Cards showing a score or rating (AC5.1.4), or out of the search order"
    source: "AC5.1.4, FR30, Question 10, T-201 view models"
  - id: BR8.4
    statement: "Pages are 1-based with 20 results by default and at most 50."
    category: validation
    applies_to: "SearchQueryInput"
    trigger: "Parsing page and pageSize"
    logic: "page int ≥ 1 default 1; pageSize int 1..50 default 20; a page past the end returns no results with the real total"
    violation: "An unbounded page size"
    source: "T-205 step 1, 03-routes-and-contracts.md §2"
  - id: BR8.5
    statement: "The VM carries public ids and display text only, with no internal id, account id, score, rank or tier."
    category: constraint
    applies_to: "SearchResultsVM, SuggestionVM"
    trigger: "Mapping"
    logic: "tier and rank stay inside the adapter; ids are public ids"
    violation: "A number that can be read as quality (hard rule) or an internal id in the page"
    source: "contract-summary.md privacy rules, PRODUCT.md hard rules"

  # BR9 — suggestions
  - id: BR9.1
    statement: "search.suggest returns at most 8 suggestions from aliases of published doctor, facility and condition documents, one per document; reviews are never suggested."
    category: calculation
    applies_to: "search.suggest, sql.ts"
    trigger: "A suggest call"
    logic: "key length < 2 → []; candidates: tier 0, then tier 1, then alias trigram (key % alias_key); per document the best tier; ORDER BY tier, kind (condition, doctor, facility), title in locale, public_id; LIMIT 8; title = title_<locale>"
    violation: "More than 8 rows, an unpublished record, or doctors before an equally good condition (acceptance row)"
    source: "T-205 step 6, C12, AC5.1.6"
  - id: BR9.2
    statement: "The suggest route answers GET with q and locale, sends Cache-Control no-store, allows 60 calls per minute per network key, and never logs the query."
    category: constraint
    applies_to: "apps/web/src/app/api/search/suggest/route.ts"
    trigger: "A request"
    logic: "key = 'search.suggest:net:' + HMAC(client address) from T-101's client-address helper; over the limit → 429 AppError rate_limited with Retry-After; invalid input → 400 AppError validation; the access log line carries the route, status and duration only"
    violation: "A raw query in a log (01-conventions.md §11), or a cached suggestion list"
    source: "T-205 step 6, C14, 01-conventions.md §11, 03-routes-and-contracts.md §3"

  # BR10 — refresh job
  - id: BR10.1
    statement: "search.refresh takes the C15 envelope {eventId, name, payload} and runs under the job key search.refresh:<eventId> on the exclusive queue."
    category: constraint
    applies_to: "apps/worker/src/handlers/search-refresh.ts, modules/search/jobs/refresh.ts"
    trigger: "A relayed event"
    logic: "the relay's jobKey(job, eventId) and the exclusive declaration stay as CR-011 built them; SearchRefreshJobInput becomes the envelope schema"
    violation: "Two jobs for one event (FD-038, ISS-201)"
    source: "C15, FD-038, CR-011, ISS-253, Question 11"
  - id: BR10.2
    statement: "Each event rebuilds a fixed set of documents."
    category: calculation
    applies_to: "modules/search/jobs/refresh.ts (targetsFor)"
    trigger: "A search.refresh job"
    logic: "review.published|changed|hidden|restored|deleted {reviewId, doctorId, branchId?}: the review, its doctor, the condition documents of its tagged terms; evidence.stateChanged {reviewId?}: when reviewId is present, the review and its doctor, else nothing; doctor.changed {id}: the doctor and each of its reviews; facility.changed {id}: the branch when id is a branch, every branch of the facility when id is a facility; term.changed {id}: the term, its canonical term, every review tagged with it and those reviews' doctors; facilityReview.changed {branchId}: the branch; unknown name: nothing"
    violation: "A doctor's count that does not drop after a hide (step 10), or a stale branch count"
    source: "T-205 step 7, C12, C15, Question 9"
  - id: BR10.3
    statement: "A document is rebuilt in one transaction that takes an advisory lock on (kind, ref_id), reads the source, then upserts or deletes the document with its aliases and term rows."
    category: constraint
    applies_to: "SearchIndex.rebuild (packages/database/src/search/index.ts)"
    trigger: "Every rebuild"
    logic: "BEGIN; pg_advisory_xact_lock(hashtext(kind || ':' || ref_id)); source = loadSource(tx, kind, ref_id); doc = build(source) (application callback); IF doc THEN INSERT ... ON CONFLICT (kind, ref_id) DO UPDATE, delete and insert aliases and term rows ELSE delete all three; COMMIT"
    violation: "Two concurrent jobs failing on the unique key or the older one overwriting the newer (F5)"
    source: "Question 11, T-205 step 7"
  - id: BR10.4
    statement: "A rebuild is idempotent: running the same job twice leaves one row with the same content."
    category: constraint
    applies_to: "search.refresh"
    trigger: "A retry or a duplicate"
    logic: "the document is a function of the committed source; no counters are incremented"
    violation: "Refresh idempotency test (two runs, one row)"
    source: "T-205 step 7 and tests, C15 common rules"
  - id: BR10.5
    statement: "Review documents take evidence_groups from EvidencePresence.forReview; until U25 wires the Evidence implementation the default returns no groups; a doctor's has_documents is true when one of its stored review documents has a group."
    category: calculation
    applies_to: "modules/search/ports.ts, build-documents.ts"
    trigger: "Rebuilding review and doctor documents"
    logic: "noEvidencePresence.forReview(_) → {groups: []}; review rebuilds run before the doctor rebuild in one job (BR10.6); has_documents = EXISTS review document of this doctor with evidence_groups <> '{}'"
    violation: "FD-084 rows: the review with a document group not found, or a refresh error before T-305"
    source: "FD-084, C12"
  - id: BR10.6
    statement: "Inside one job, review documents are rebuilt before doctor documents, and those before condition documents."
    category: constraint
    applies_to: "modules/search/jobs/refresh.ts"
    trigger: "A job with several targets"
    logic: "targets sorted by kind order review, facility, doctor, condition; each target its own transaction"
    violation: "has_documents computed from a stale review document"
    source: "BR10.5"
  - id: BR10.7
    statement: "A failed rebuild throws, so pg-boss retries the job (5 times with backoff); the targets already rebuilt are rebuilt again harmlessly."
    category: constraint
    applies_to: "search.refresh"
    trigger: "A database error"
    logic: "no catch-and-continue for infrastructure errors; a missing source is not an error (BR1.5 deletes)"
    violation: "A silently skipped document (construction guardrail: no silent failures)"
    source: "C15 common rules, FD-076"
  - id: BR10.8
    statement: "The job logs ids, kinds, counts and durations only; never text, keys or the uploaderAccountId of evidence.stateChanged."
    category: constraint
    applies_to: "search.refresh, the worker logger"
    trigger: "Logging"
    logic: "log 'search.refreshed' {eventId, eventName, documents: n, deleted: m, ms}"
    violation: "Private data or content in logs (01-conventions.md §11, FD-086)"
    source: "01-conventions.md §11, C15"
  - id: BR10.9
    statement: "reindexAll rebuilds every doctor, branch, condition term and review, then deletes documents whose source no longer exists."
    category: calculation
    applies_to: "modules/search/jobs/reindex.ts, pnpm search:reindex, the seed"
    trigger: "Seed, demo reset or the script"
    logic: "for kind in review, facility, doctor, condition: for each source id: rebuild; then delete documents whose ref_id has no source row; reports counts"
    violation: "An empty search after pnpm demo:reset"
    source: "T-205 step 7, Question 12"

  # BR11 — privacy
  - id: BR11.1
    statement: "Search tables hold public data only: no author, persona or account id, no exact date, no evidence text, label or filename, no claims, follow-ups or comments."
    category: constraint
    applies_to: "search_documents, search_aliases, search_document_terms"
    trigger: "Building documents"
    logic: "review documents: title, body (2 000 graphemes), tag labels, published_at, sentiment and outcome values, evidence groups; nothing else from the review"
    violation: "Hard-rule checklist: private data in search_documents"
    source: "T-205 hard-rule checklist, contract-summary.md privacy rules, FR35"
  - id: BR11.2
    statement: "Only provider profiles, facility branches, condition terms and public reviews are searchable; user profiles, drafts, documents, evidence text and staff records never are."
    category: constraint
    applies_to: "search_kind, build-documents.ts"
    trigger: "Any document"
    logic: "search_kind stays {doctor, facility, condition, review}"
    violation: "FR35, AC5.2.5"
    source: "FR35, AC5.2.5, NFR8"

  # BR12 — placement and pins
  - id: BR12.1
    statement: "Code sits where T-010's matrix allows: domain pure; application imports domain and contracts only; the database adapter receives keys and a build callback; the worker uses @rogikotha/application/worker; adapters are built in the two composition roots."
    category: constraint
    applies_to: "every owned path"
    trigger: "Code Generation"
    logic: "domain/search: normalize, ranking, resolve (no contracts types in signatures); modules/search: queries, jobs, ports, build-documents; database/search: index, sql, sources, aliases helpers; web container and worker container construct PgSearchIndex"
    violation: "pnpm lint:boundaries red"
    source: "FD-093, eslint.boundaries.mjs, F3"
  - id: BR12.2
    statement: "The tests that pin what this Unit changes are updated in the same commit."
    category: constraint
    applies_to: "not-implemented.test.ts, migrations.int.test.ts, validator-probes.int.test.ts P8, grants.smoke.test.ts, fakes/fakes.test.ts, contracts schemas tests, outbox-relay.test.ts"
    trigger: "Code Generation"
    logic: "PgSearchIndex leaves STUB_REPOSITORIES; the migration count goes up by one; the review_tags probe becomes a column probe plus a closed table probe; NaiveSearchIndex implements the new port; the RELAY tests know the new routes"
    violation: "pnpm check red (ISS-294 pattern)"
    source: "T-010, ISS-294, F11"
```
