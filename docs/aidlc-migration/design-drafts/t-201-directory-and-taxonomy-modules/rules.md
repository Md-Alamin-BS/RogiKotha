# Business rules — U14 `t-201-directory-and-taxonomy-modules`

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U14), `unit-of-work-story-map.md` (US4.1, US4.3, US5.3, US6.4), `requirements.md` (FR15–FR18, FR24–FR27, FR36–FR38, FR48–FR52), `stories.md`, `components.md`, `contract-summary.md` (C6, C7, C9), T-201 with its amendments, FD-067, the project hard rules (`project.md`) and `01-conventions.md` §2–§5, §10. The workflows that apply these rules, the port signatures and the view models are in `functional-spec.md`; the data shape is in `entities.md`.

Rules that depend on an answer in `functional-design-questions.md` name the question in `source`. All answers were recorded on the owner's standing instruction and await the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`; `functional-spec.md` § 14 lists what changes if the owner reverses one.

```yaml
rules:
  - id: BR1.1
    statement: "A doctor profile is visible only when its state is published and it has not been merged into another profile."
    category: constraint
    applies_to: "directory.getDoctor, directory.listDoctors, directory.doctorsAtBranch, every doctor reference in a view model"
    trigger: "Any directory or taxonomy query that loads a doctor"
    logic: "IF doctors.state = published AND merged_into_id IS NULL THEN the doctor may be projected ELSE getDoctor returns not_found and lists leave it out"
    violation: "A pending_review, rejected, hidden or merged profile reaching a public view model is an S1 defect (AC4.1.1)"
    source: "FR15, AC4.1.1, 02-data-model.md §17"
  - id: BR1.2
    statement: "A facility branch is visible only when the branch and its organisation are both published."
    category: constraint
    applies_to: "directory.getFacility, directory.listFacilities, every branch reference in a view model"
    trigger: "Any query that loads a branch"
    logic: "IF facility_branches.state = published AND facilities.state = published THEN the branch may be projected ELSE getFacility returns not_found and lists leave it out"
    violation: "An unpublished branch on a public page is an S1 defect"
    source: "FR24, 02-data-model.md §17"
  - id: BR1.3
    statement: "A review counts, and appears on a card, only when its state is published and it has no deleted_at; this one predicate is applied in SQL by every review read."
    category: constraint
    applies_to: "ReviewRepository read methods; every distribution, count and card"
    trigger: "Any read of reviews"
    logic: "IF reviews.state = published AND reviews.deleted_at IS NULL THEN the review is eligible ELSE it is excluded from every figure and list (draft, pending_review, hidden_pending_review, hidden, deleted_tombstone, rejected, soft-deleted)"
    violation: "A hidden or deleted review in any count or card fails the 'Hidden content excluded' acceptance row and AC6.4.4"
    source: "FR50, AC6.4.4, T-201 step 2 and hard-rule checklist, ISS-222"
  - id: BR1.4
    statement: "A facility review counts only when its state is published and it has no deleted_at."
    category: constraint
    applies_to: "ReviewRepository facility read methods; facility criteria and accounts"
    trigger: "Any read of facility_reviews"
    logic: "IF facility_reviews.state = published AND deleted_at IS NULL THEN it is eligible ELSE excluded"
    violation: "A hidden or deleted facility review in the criteria fails AC4.3.5 and the hidden-content row"
    source: "FR49, FR50"
  - id: BR1.5
    statement: "A document counts only when the evidence item is in state published and belongs to an eligible review."
    category: calculation
    applies_to: "documentsCount on cards, documentCount on profiles, the docs filter"
    trigger: "Any document count"
    logic: "IF evidence_items.state = published AND its review is eligible (BR1.3) THEN it counts as one document ELSE it does not"
    violation: "A quarantined, failed or private item counted as a document misstates the document count (FR48, FR51)"
    source: "FR48, FR51, AC6.4.1, AC6.4.2, T-201 step 2"
  - id: BR1.6
    statement: "A taxonomy term is active only when published; a term with a canonical_id is a redirect, and every count uses the effective term (the canonical target)."
    category: calculation
    applies_to: "Condition counts, tag frequency, resolve, getCondition, listConditions"
    trigger: "Any read that groups or looks up by term"
    logic: "effective(term) = term IF canonical_id IS NULL ELSE the term canonical_id points to; reviews tagged with a mapped provisional term count for its canonical term; a hidden term is deactivated and is never listed or resolved"
    violation: "A mapped alias whose reviews do not count on the canonical page fails AC5.3.3"
    source: "FR37, FR38, AC5.3.3, Question 5, Question 10"
  - id: BR1.7
    statement: "An old or merged public id resolves to its current target: directory.resolvePublicId follows profile_redirects, taxonomy.resolvePublicId follows canonical_id."
    category: constraint
    applies_to: "directory.resolvePublicId, taxonomy.resolvePublicId"
    trigger: "A page is requested by public id"
    logic: "IF the id names a visible profile or active canonical term THEN {publicId, redirected: false}; ELSE IF a redirect exists THEN follow it, at most five hops, and return {publicId: target, redirected: true}; a cycle, a dead end or an invisible target returns not_found"
    violation: "A merged profile or redirected tag that does not land on its target fails AC5.2.6 and AC5.3.4"
    source: "T-201 step 6, FR23, FR38, AC5.3.4, AC5.2.6, Question 10"
  - id: BR2.1
    statement: "No number stands for quality: view models carry exact counts and their totals only, never a percentage, average, combined score, rating or rank, and no sort by sentiment or outcome exists."
    category: policy
    applies_to: "Every view model, port result and query in the owned paths"
    trigger: "Code Generation and review of the diff"
    logic: "IF a field or sort derives a single quality figure from accounts (pct, average, score, rating, highest rated) THEN it is forbidden"
    violation: "Any such field is an S1 defect against the PRODUCT.md hard rule"
    source: "project.md Forbidden (no number for quality, no highest-rated sort), FR48, FR52, AC6.4.1, AC6.4.5, AC4.3.4"
  - id: BR2.2
    statement: "A missing or hidden profile field is omitted from the view model; it is never replaced by 0, an empty string or a blank label."
    category: validation
    applies_to: "domain/directory/policies.ts omitEmptyFields; facts, chambers, optional card and profile fields"
    trigger: "Mapping a profile to a view model"
    logic: "IF a field value is null, an empty or whitespace-only string, or an empty list, OR its provenance entry has hidden = true THEN the field is left out ELSE it is projected"
    violation: "A 0 or blank label for a missing field is an S1 defect (hard rule); a hidden field shown fails AC4.1.3"
    source: "FR17, AC4.1.3, project.md Forbidden (missing value as 0), Question 7"
  - id: BR2.3
    statement: "Every distribution carries a count for every key in render order, the total of recognised values as its denominator, the number of eligible accounts without a value, and an empty flag."
    category: calculation
    applies_to: "DistributionVM for sentiment, outcome and each facility criterion"
    trigger: "Building any distribution"
    logic: "counts has every key (0 included); total = values in keys; notProvided = eligible accounts whose value is absent; empty = (total = 0); IF empty THEN the UI shows Not provided instead of counts"
    violation: "A distribution without its denominator, or a missing value rendered as a count, fails AC6.4.1, AC6.4.2 and AC4.3.5"
    source: "project.md Mandated (exact counts with denominators, Not provided), FR48, FR51, AC6.4.1, AC6.4.2, AC4.3.5, Question 3"
  - id: BR2.4
    statement: "Limited data is marked from the configured threshold: on each distribution when 0 < total < threshold, and on each summary when 0 < eligible accounts < threshold."
    category: calculation
    applies_to: "domain/review/policies.ts isLimitedData; DistributionVM.limitedData; summary-level limitedData on doctor, facility and condition view models"
    trigger: "Building a distribution or summary"
    logic: "threshold = ConfigProvider.current().limitedDataThreshold; limitedData = total > 0 AND total < threshold"
    violation: "A constant threshold, or a summary below the threshold without the mark, breaks the hard rule (AC6.4.2)"
    source: "project.md Mandated (Limited data), FR51, AC6.4.2, AC4.3.5, requirements Assumptions, Question 3"
  - id: BR2.5
    statement: "Every doctor view model carries registrationNotVerified true and every facility view model carries notVerified true, whatever the stored data says."
    category: policy
    applies_to: "DoctorCardVM, DoctorProfileVM, FacilityCardVM, FacilityProfileVM"
    trigger: "Mapping any doctor or facility"
    logic: "registrationNotVerified = true and notVerified = true are literal values, never derived from bmdc_number or any column"
    violation: "Any doctor without the flag is an S1 defect (hard rule); the word verified applied to a registration fails AC4.1.2"
    source: "project.md Mandated (Registration not verified), D-003, FR16, FR25, AC4.1.2, AC4.3.2"
  - id: BR2.6
    statement: "Facility feedback never enters a doctor's figures: every doctor-side figure reads reviews by doctor_id and never reads facility_reviews."
    category: constraint
    applies_to: "ProviderExperience.forDoctor, summariesForDoctors, review.sentimentDistribution, review.outcomeDistribution, ConditionStats"
    trigger: "Any doctor or condition figure"
    logic: "IF a figure is about a doctor or a condition THEN its source rows are eligible reviews only; facility_reviews are not joined, whether or not the doctor practises at the branch"
    violation: "Any change to a doctor's figures caused by facility feedback is an S1 defect; the query-level test 'never enters doctor' fails"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, FR49, AC4.3.3, AC6.4.3"
  - id: BR2.7
    statement: "A doctor's reviews never enter a facility's figures: a branch's criteria and accounts read facility_reviews of that branch only."
    category: constraint
    applies_to: "ProviderExperience.forBranch, summariesForBranches, review.criteriaDistribution"
    trigger: "Any facility figure"
    logic: "IF a figure is about a branch THEN its source rows are eligible facility_reviews with that branch_id; a doctor review whose branch_id is that branch is never counted or listed there"
    violation: "Doctor reviews on a facility page mix the two feedback kinds (FR26, AC4.3.1)"
    source: "FR24, FR26, FR49, AC4.3.1, AC6.4.3"
  - id: BR2.8
    statement: "Lists are ordered neutrally: indexes alphabetically by the active-locale name, accounts newest first, and conditions, specialties, places and mentions by account count; never by sentiment, outcome, reactions or documents."
    category: policy
    applies_to: "listDoctors, listFacilities, listConditions, every account list, conditions, specialties, places, mentioned tags"
    trigger: "Any ordered list"
    logic: "index: name in actor.locale, tie public_id; accounts: published_at desc, tie public_id; counted lists: count desc, tie name; no ordering reads sentiment, outcome, reactions or evidence"
    violation: "An order that favours positive accounts or engagement breaks the neutral-ordering hard rule (AC5.2.1, AC6.4.5)"
    source: "project.md Mandated (neutral order), FR33, FR52, AC5.2.2, AC5.2.3, AC6.4.5, prototype byName"
  - id: BR2.9
    statement: "Every platform string in a view model is the active-locale value; user-written text stays in its original wording; no view model key ends in En, Bn, _en or _bn."
    category: validation
    applies_to: "Every repository mapper and view model"
    trigger: "Mapping any row"
    logic: "IF a column pair *_en/*_bn exists THEN the mapper picks the one for actor.locale; review titles, bodies, free-text tags and provisional wording are passed through unchanged; numbers stay numbers (formatted in the UI)"
    violation: "A leaked locale key or the wrong language fails the 'Locale mapping' row; a translated user text misrepresents the author (AC5.3.2)"
    source: "project.md Mandated (Bengali and English equal), FD-024, ADR 0011, AC4.1.4, AC5.3.2, T-201 step 5"
  - id: BR2.10
    statement: "View models carry public ids and public text only: no account id, email, reporter, original filename, claimant, creator, persona id, seed reference or internal UUID; an anonymous byline carries no name, username or initials."
    category: authorization
    applies_to: "Every view model and every port result that becomes one"
    trigger: "Mapping any row"
    logic: "IF a field is private or internal THEN it is not selected or is dropped in the mapper; claimed is a boolean; anonymous Byline = {personaKind: anonymous}"
    violation: "Any private key in a view model is an S1 defect; the 'projection' deep assertion fails"
    source: "03-routes-and-contracts.md §2, contract-summary.md privacy rules, AD-3, T-201 hard-rule checklist"
  - id: BR2.11
    statement: "Every projected profile fact and chamber carries its provenance source and last-update date; a populated field without a provenance entry is shown as Community submitted, dated by the profile's last update."
    category: calculation
    applies_to: "DoctorProfileVM.facts, chambers, FacilityProfileVM provenance"
    trigger: "Mapping a profile"
    logic: "provenance = field_provenance[field] IF present ELSE {source: community, updatedAt: profile updated_at or created_at}; chamber provenance = {source: chamber.provenance, updatedAt: chamber.created_at}"
    violation: "A public field without provenance fails AC4.1.4"
    source: "FR18, AC4.1.2, AC4.1.4, Question 6"
  - id: BR3.1
    statement: "distribution(values, keys, threshold) counts each value in keys once, ignores values outside keys, counts absent values as not provided, and marks empty and limited data."
    category: calculation
    applies_to: "domain/review/policies.ts"
    trigger: "Every distribution"
    logic: "for each value: IF value in keys THEN counts[value] += 1 and total += 1; IF value is absent THEN notProvided += 1; ELSE ignore; empty = total = 0; limitedData = isLimitedData(total, threshold) = total > 0 AND total < threshold"
    violation: "A wrong boundary fails the 'Limited data threshold' row (total 4 of 5 limited, 5 not, 0 empty and not limited)"
    source: "T-201 step 1, prototype distribution(), FR51, Question 3"
  - id: BR3.2
    statement: "A doctor's conditions count distinct eligible reviews per effective condition term, ordered by count; cards show the top three."
    category: calculation
    applies_to: "conditionCountsForDoctor, DoctorProfileVM.conditions and breakdown, DoctorCardVM.topConditions"
    trigger: "Building a doctor profile or card"
    logic: "count(distinct review) per effective term of review_tags with group = condition and a term; a review tagged twice for the same term counts once; free-text condition tags have no term and are not grouped here"
    violation: "Double-counted reviews inflate the 'common condition tags' (AC6.4.1)"
    source: "T-201 steps 2-4, prototype conditionsFor, FR48, AC6.4.1"
  - id: BR3.3
    statement: "The doctors written about for a condition count reviews, not tags."
    category: calculation
    applies_to: "doctorCountsForTerm, ConditionStats doctors"
    trigger: "Building a condition page"
    logic: "count(distinct review) per doctor among eligible reviews that carry the effective condition term"
    violation: "A review tagged twice counting twice fails the doctorCountsForTerm integration test"
    source: "T-201 step 3, prototype doctorsForCondition"
  - id: BR3.4
    statement: "Mentioned medicines, treatments and symptoms on a condition page count distinct eligible reviews per label, where the label is the effective term's name in the active locale or the original free text."
    category: calculation
    applies_to: "tagFrequencyForTerm, ConditionStats mentioned, ConditionPageVM medicines, treatments, symptoms"
    trigger: "Building a condition page"
    logic: "among the condition's eligible reviews, for each tag of the group: label = effective term name in locale IF term ELSE free_text; count(distinct review) per label; not_sure tags are not mentions"
    violation: "Counting tags instead of reviews, or dropping free-text mentions, misstates what authors wrote"
    source: "T-201 step 2, prototype tagFrequency, FR48, AC6.4.1, Question 2"
  - id: BR3.5
    statement: "On a doctor profile the condition filter scopes the distributions and the scoped total; outcome, relationship and documents narrow the account cards cumulatively; showing is the number of cards left."
    category: calculation
    applies_to: "directory.getDoctor, ProviderExperience.forDoctor"
    trigger: "getDoctor with any of condition, outcome, relationship, docs"
    logic: "scoped = eligible reviews of the doctor, narrowed to the effective condition when given; sentiment and outcome distributions use scoped; cards = scoped narrowed by outcome, relationship and (docs) at least one published document; scopedTotal = |scoped|; showing = |cards|; total = all eligible reviews of the doctor; an unknown condition yields scopedTotal 0, not an error"
    violation: "Filters that change the totals, or the wrong showing / scopedTotal, fail the getDoctor filter tests"
    source: "T-201 steps 4-5, prototype profileAccounts and renderProfile, 03-routes-and-contracts.md §1"
  - id: BR3.6
    statement: "A condition's places aggregate (primary chamber name, area, city) per doctor with the doctor's account count, and its specialties are the top three by account count."
    category: calculation
    applies_to: "ConditionStats places and specialties, ConditionPageVM"
    trigger: "Building a condition page"
    logic: "place key = (first chamber name by sort_order, area, city) of each doctor written about; count = that doctor's accounts for the condition; equal keys add up; hospital is absent when the doctor has no chamber; specialty count = sum of accounts of doctors with that specialty; top 3"
    violation: "A missing hospital shown as blank or 0 breaks the hard rule; the UI prints Not provided"
    source: "T-201 step 4, prototype renderCondition, Question 2"
  - id: BR3.7
    statement: "A card excerpt is the first 190 graphemes of the account's text, cut with Intl.Segmenter, never by code units."
    category: calculation
    applies_to: "ExperienceCardVM.excerpt"
    trigger: "Building a card"
    logic: "text = body for a quick review, else the present sections in the order symptoms, diagnosis, treatment, after joined by a space; IF more than 190 graphemes THEN keep 190 and set truncated true"
    violation: "A split Bengali conjunct or emoji in an excerpt (01-conventions.md §4)"
    source: "T-201 step 4, 01-conventions.md §4"
  - id: BR3.8
    statement: "avatarHue is the stored avatar_hue when present, otherwise stableHue(publicId), the prototype's FNV-1a hash modulo 360."
    category: calculation
    applies_to: "Doctor, facility and branch references in view models; contracts/ids.ts stableHue"
    trigger: "Mapping any avatar"
    logic: "avatarHue = avatar_hue IF not null ELSE fnv1a(publicId) mod 360; branches always use stableHue(branch publicId)"
    violation: "A hue that changes between requests for the same profile"
    source: "T-201 step 4 and addendum, prototype hash(), Question 8"
  - id: BR3.9
    statement: "A card's condition is its first condition tag by tag order: the effective term with its public id, or the original free text without a link."
    category: calculation
    applies_to: "ExperienceCardVM.condition"
    trigger: "Building a card"
    logic: "IF the review has a condition tag THEN the first by created_at gives {publicId, name} for a term or {name} for free text; a hidden term gives {name} only; IF none THEN condition is omitted"
    violation: "A card linking to a deactivated or wrong term"
    source: "T-201 step 4, prototype accountRow, Question 5"
  - id: BR3.10
    statement: "Reads are batched: a list page issues a bounded number of queries, never one per row."
    category: constraint
    applies_to: "Every repository read method and port method used by a list"
    trigger: "Any list query"
    logic: "list queries load their rows, then their summaries with one grouped read per kind (summariesForDoctors, summariesForBranches), never in a loop"
    violation: "N+1 queries on an index page (T-201 step 3)"
    source: "T-201 step 3, Question 2"
  - id: BR4.1
    statement: "normalizeAliasKey(text) is NFC, then lowercase, then only letters, combining marks and digits are kept."
    category: calculation
    applies_to: "domain/taxonomy/policies.ts; every taxonomy key"
    trigger: "Computing any name or alias key"
    logic: "key = NFC(text).toLowerCase() with every character outside Unicode letters, marks and numbers removed (spaces, punctuation, symbols, zero-width joiners); composed and decomposed Bengali give the same key"
    violation: "Bengali vowel signs or the hasanta stripped, or two spellings of the same word giving different keys, fail the domain key tests"
    source: "T-201 step 1, 01-conventions.md §4, components.md Taxonomy"
  - id: BR4.2
    statement: "Every stored name and alias key is produced by normalizeAliasKey, so a lookup and a stored key always agree."
    category: constraint
    applies_to: "taxonomy_terms.name_key_en, name_key_bn, taxonomy_aliases.alias_key; createProvisional, mapProvisional, seed-directory.ts"
    trigger: "Writing a term or alias"
    logic: "IF a key is written THEN it is normalizeAliasKey of its text; the seed imports the same function instead of its own keyify"
    violation: "The seeded key 'thyroid(hypothyroidism)' never matches a lookup of 'Thyroid (hypothyroidism)' (proposed ISS row)"
    source: "T-201 step 1 (T-205 imports the same function), Question 4"
  - id: BR4.3
    statement: "taxonomy.resolve matches the normalised text exactly against active alias keys and then term name keys, returns the effective term, and returns no term when the match is ambiguous."
    category: calculation
    applies_to: "taxonomy.resolve"
    trigger: "The composer or a page resolves free text"
    logic: "key = normalizeAliasKey(text); candidates = active terms (optionally of the given kind) whose alias_key or name key equals key, mapped to their effective term; one distinct candidate gives {termId, publicId, name, matchedAlias, provisional}; none gives {}; several give {ambiguous: true}; fuzzy matching is T-205's"
    violation: "A redirected alias resolving to the provisional term instead of its canonical target fails AC5.3.3"
    source: "T-201 step 5, 03-routes-and-contracts.md §4 taxonomy, FR37, AC5.3.3"
  - id: BR4.4
    statement: "The topic index lists every active canonical condition term, including those with no accounts, each with its eligible-account total."
    category: policy
    applies_to: "taxonomy.listConditions"
    trigger: "The topic index"
    logic: "terms of kind condition, state published, provisional false, canonical_id null; accountsTotal from ConditionStats summaries, 0 included; provisional and hidden terms are not listed"
    violation: "Dropping zero-count topics fails the 'Zero-count topics listed' row"
    source: "T-201 step 4 and acceptance row, prototype renderTopicIndex, Question 10"
  - id: BR4.5
    statement: "taxonomy.listSuggested returns the active canonical terms flagged suggested for the group's kind, in suggested order."
    category: calculation
    applies_to: "taxonomy.listSuggested"
    trigger: "The composer asks for a group's suggestions"
    logic: "group -> kind (symptom, condition, treatment, medicine); terms with suggested = true, state published, canonical_id null; order by suggested_order, then name in locale"
    violation: "An empty or unordered suggestion list for a seeded group"
    source: "T-201 addendum, 03-routes-and-contracts.md §4 taxonomy, ISS-157, Question 4"
  - id: BR4.6
    statement: "A condition page serves an active canonical term or an unmapped provisional term, marked provisional; a mapped term answers with its redirect target; a hidden term is not found."
    category: policy
    applies_to: "taxonomy.getCondition, taxonomy.resolvePublicId"
    trigger: "A condition page is requested"
    logic: "IF canonical_id IS NOT NULL THEN resolvePublicId redirects; IF state = hidden THEN not_found; ELSE build the page with provisional = term.provisional"
    violation: "A dead link on a provisional tag, or a mapped tag not opening its canonical page (AC5.3.3)"
    source: "FR37, AC5.3.2, AC5.3.3, Question 10"
  - id: BR5.1
    statement: "taxonomy.createProvisional requires an authenticated account with a verified email that is not restricted."
    category: authorization
    applies_to: "modules/taxonomy/commands/create-provisional.ts"
    trigger: "The command is called"
    logic: "IF actor is an account AND emailVerified AND status is not restricted THEN proceed ELSE return forbidden with no side effect"
    violation: "An anonymous visitor creating taxonomy terms"
    source: "C6 (requires verified), 03-routes-and-contracts.md §4, 01-conventions.md §5, Question 1"
  - id: BR5.2
    statement: "createProvisional is idempotent per kind and key: it returns the existing effective term when one matches, and otherwise creates one provisional term holding the original wording, with one alias."
    category: calculation
    applies_to: "modules/taxonomy/commands/create-provisional.ts"
    trigger: "A reviewer tags an unmapped wording"
    logic: "key = normalizeAliasKey(text); IF an active term of that kind has this name or alias key THEN return its effective term ELSE insert a term {kind, name_en = name_bn = text, keys = key, provisional true, state published, created_by_account_id = actor} and an alias {alias = text, alias_key = key, lang, provenance community}"
    violation: "Duplicate provisional terms for one wording, or a translated or altered wording (AC5.3.2)"
    source: "FR37, AC5.3.2, components.md Taxonomy, Question 1"
  - id: BR5.3
    statement: "taxonomy.mapProvisional requires a Super Admin; anyone else is refused server-side and nothing changes."
    category: authorization
    applies_to: "modules/taxonomy/commands/map-provisional.ts"
    trigger: "The command is called"
    logic: "IF actor.staffRole = super_admin THEN proceed ELSE return forbidden; no row, audit or outbox entry is written"
    violation: "An Admin or Moderator mapping a term fails AC5.3.5"
    source: "C6 (super_admin, FR38), FR38, AC5.3.5, Question 1"
  - id: BR5.4
    statement: "mapProvisional maps a provisional, unmapped, active term to an active canonical term of the same kind, and copies its aliases to the target."
    category: validation
    applies_to: "modules/taxonomy/commands/map-provisional.ts"
    trigger: "A Super Admin maps a term"
    logic: "IF either term is missing THEN not_found; IF term is not provisional OR already has a canonical_id OR target is provisional, mapped, hidden, of another kind, or the same term THEN conflict; ELSE set canonical_id and insert each alias of the term onto the target (skipping keys the target has); reviews keep their tags and wording"
    violation: "A chain of mappings, a cross-kind mapping, or lost submitted wording fails AC5.3.3"
    source: "FR37, FR38, AC5.3.3, AC11.1.5, Question 1"
  - id: BR5.5
    statement: "Each taxonomy command writes its change, one audit row with allowlisted details and one term.changed outbox event in the same transaction."
    category: policy
    applies_to: "createProvisional, mapProvisional"
    trigger: "A command succeeds"
    logic: "audit stream taxonomy, details {termId, kind, lang} or {termId, canonicalId}, never the wording; outbox term.changed {id} for the new term, or for both terms on a mapping; all in one transaction"
    violation: "A change without its audit row breaks 01-conventions.md §5; a missing term.changed leaves search stale (C15)"
    source: "01-conventions.md §3 and §5, C6, C15, FR38, AC5.3.4, AC5.3.5"
  - id: BR6.1
    statement: "No file under modules/directory or modules/taxonomy imports modules/review or ReviewRepository; their review-derived figures arrive only through ProviderExperience and ConditionStats."
    category: constraint
    applies_to: "packages/application/src/modules/directory/**, modules/taxonomy/**"
    trigger: "Code Generation; every pnpm check"
    logic: "IF a directory or taxonomy file imports the review module or the review repository port THEN the static import test and the boundary lint fail"
    violation: "A direct read re-creates the cycle FD-067 breaks"
    source: "FD-067, C6, C7, T-201 FD-067 acceptance row"
  - id: BR6.2
    statement: "The Directory and Taxonomy repositories never read review-side tables (reviews, review_tags, facility_reviews, evidence_items, personas)."
    category: constraint
    applies_to: "packages/database/src/repositories/directory.ts, taxonomy.ts"
    trigger: "Code Generation"
    logic: "IF a directory or taxonomy repository query names a review-side table THEN it is a defect; those reads live only in the review repository's read methods"
    violation: "A review figure computed outside Review bypasses the eligibility and isolation rules"
    source: "FD-067, components.md (Review implements the ports), T-201 step 2"
  - id: BR6.3
    statement: "The Review module stub holds only the two port implementations, the four read queries and their tests; it adds no command."
    category: constraint
    applies_to: "packages/application/src/modules/review/**"
    trigger: "Code Generation; Build and Test"
    logic: "allowed files: provider-experience.ts, condition-stats.ts, index.ts, queries/{sentiment-distribution,outcome-distribution,criteria-distribution,list-experience-cards}.ts and their tests"
    violation: "Any T-301 command in the stub fails the FD-067/C6/C7 acceptance row"
    source: "T-201 FD-067/C6/C7 amendment and acceptance row"
  - id: BR6.4
    statement: "Port and input changes are additive, and the documents follow them in the same Bolt."
    category: policy
    applies_to: "ProviderExperience, ConditionStats, contracts/schemas/{directory,taxonomy,review}.ts, 03-routes-and-contracts.md §4, contract-summary.md C6 and C7"
    trigger: "Code Generation"
    logic: "new fields and methods are added, none is removed; 03 §4 is corrected and a dated note is added to C6 and C7"
    violation: "A silent signature change leaves consumers on the old shape"
    source: "contract-summary.md common rules (versioning), Question 2"
  - id: BR6.5
    statement: "Queries never write; the only writes in the Unit are the two taxonomy commands and the migration."
    category: constraint
    applies_to: "Every query in the owned paths"
    trigger: "Code Generation"
    logic: "IF a query inserts, updates or deletes THEN it is a defect"
    violation: "A read with a side effect breaks 01-conventions.md §3 and makes summaries depend on who looked"
    source: "01-conventions.md §3, FR52 (no administrator rewrite of sentiment)"
  - id: BR7.1
    statement: "Each level is tested as 01-conventions.md §10 asks, and integration tests run against the real PostgreSQL with rows they insert themselves."
    category: validation
    applies_to: "domain, application (fakes) and database (*.int.test.ts) tests"
    trigger: "Code Generation"
    logic: "domain: every policy; application: every query happy path in both locales, each command's happy path, each refusal and one audit assertion; database: each repository method, the isolation, hidden and count-once cases; tests insert their own rows because the test database is reset once per run"
    violation: "A test that cannot fail, or one that depends on another test's rows"
    source: "01-conventions.md §10, team.md Testing Posture, CR-007"
  - id: BR7.2
    statement: "The cumulative smoke suite gains at least one assertion for this Unit and loses none."
    category: validation
    applies_to: "pnpm smoke"
    trigger: "Code Generation"
    logic: "IF the Unit lands THEN smoke includes the facility-isolation assertion and the Registration not verified assertion"
    violation: "Breaks team.md Testing Posture"
    source: "team.md Testing Posture"
  - id: BR7.3
    statement: "Acceptance rows that count seeded records take the expected numbers from the corpus, not from literals."
    category: validation
    applies_to: "T-201 acceptance rows (topic index, d1 profile, forCondition, forDoctor on the seed)"
    trigger: "Build and Test"
    logic: "expected counts are computed from packages/test-support/src/corpus; the corpus grows under FD-089 in U6 CR-012"
    violation: "A literal '8 conditions, two with zero' fails after CR-012 without any defect"
    source: "FD-089, T-201 acceptance rows"
  - id: BR7.4
    statement: "pnpm check, pnpm smoke and pnpm test:int exit 0, and every package with source stays at or above the 80% line-coverage floor."
    category: validation
    applies_to: "The whole repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "IF the Unit is complete THEN the three commands exit 0 and coverage is at or above 80% per package"
    violation: "Any red check blocks the merge (team.md Way of Working)"
    source: "team.md Way of Working and Testing Posture, D10"
  - id: BR7.5
    statement: "ISS-222 and ISS-157 close in this Unit, and every finding of this design is an ISS row linked to U14 T-201."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "ISS-222 fixed (fake eligibility); ISS-157 fixed (Question 4); the rows of functional-spec.md § 9 added with Found in U14 T-201"
    violation: "An open owned row or an unrecorded finding breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), unit-of-work.md U14 (ISS-222), ISS-157"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Doctor visible only when published and not merged | constraint |
| BR1.2 | Branch visible only when it and its organisation are published | constraint |
| BR1.3 | One eligibility predicate: review published and not deleted | constraint |
| BR1.4 | Same predicate for facility reviews | constraint |
| BR1.5 | A document is a published evidence item of an eligible review | calculation |
| BR1.6 | Active terms only; counts use the effective (canonical) term | calculation |
| BR1.7 | Old and redirected public ids resolve to their target | constraint |
| BR2.1 | No number stands for quality; no highest-rated sort | policy |
| BR2.2 | Missing or hidden fields omitted, never 0 or blank | validation |
| BR2.3 | Distributions: every key, total, not provided, empty | calculation |
| BR2.4 | Limited data from the configured threshold, on distributions and summaries | calculation |
| BR2.5 | Registration not verified / Not verified always true | policy |
| BR2.6 | Facility feedback never in doctor figures | constraint |
| BR2.7 | Doctor reviews never in facility figures | constraint |
| BR2.8 | Neutral ordering everywhere | policy |
| BR2.9 | Active-locale strings; user text in original wording; no locale keys | validation |
| BR2.10 | Public ids and public text only; anonymous byline has no name | authorization |
| BR2.11 | Provenance and date on every fact; default Community submitted | calculation |
| BR3.1 | `distribution()` and `isLimitedData()` | calculation |
| BR3.2 | Doctor conditions count distinct reviews; top three on cards | calculation |
| BR3.3 | Doctors per condition count reviews, not tags | calculation |
| BR3.4 | Mentions count distinct reviews per label | calculation |
| BR3.5 | Profile filters: condition scopes, the rest narrow cards | calculation |
| BR3.6 | Places and top specialties on a condition page | calculation |
| BR3.7 | 190-grapheme excerpt with `Intl.Segmenter` | calculation |
| BR3.8 | `avatarHue`: column, else `stableHue(publicId)` | calculation |
| BR3.9 | Card condition: first condition tag | calculation |
| BR3.10 | Batched reads, no N+1 | constraint |
| BR4.1 | `normalizeAliasKey`: NFC, lowercase, letters, marks, digits | calculation |
| BR4.2 | Every stored key uses `normalizeAliasKey` | constraint |
| BR4.3 | `resolve`: exact key, effective term, ambiguous gives none | calculation |
| BR4.4 | Topic index lists every canonical condition, zero included | policy |
| BR4.5 | `listSuggested` from the `suggested` flag, in order | calculation |
| BR4.6 | Provisional pages; mapped terms redirect; hidden not found | policy |
| BR5.1 | `createProvisional`: verified, not restricted | authorization |
| BR5.2 | `createProvisional`: idempotent, original wording | calculation |
| BR5.3 | `mapProvisional`: Super Admin only, refusal changes nothing | authorization |
| BR5.4 | `mapProvisional`: validations, aliases copied | validation |
| BR5.5 | Change, audit and `term.changed` in one transaction | policy |
| BR6.1 | No Directory or Taxonomy import of Review | constraint |
| BR6.2 | Directory and Taxonomy repositories read no review tables | constraint |
| BR6.3 | Review stub is ports-only | constraint |
| BR6.4 | Additive port changes; documents follow | policy |
| BR6.5 | Queries never write | constraint |
| BR7.1 | Tests per level; integration tests insert their own rows | validation |
| BR7.2 | At least one new smoke assertion; none removed | validation |
| BR7.3 | Seed counts come from the corpus | validation |
| BR7.4 | `pnpm check`, `pnpm smoke`, `pnpm test:int` green; 80% floor | validation |
| BR7.5 | ISS-222 and ISS-157 closed; findings recorded | policy |
