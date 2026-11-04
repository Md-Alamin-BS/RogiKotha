# Business rules — U46 `u46-directory`

Source of truth for the Unit's decision logic. Built from the reviewed T-201 rules (archived 2026-11-04) and the T-202 and T-203 drafts, `unit-of-work.md` (U46), the story map (US2.4, US4.1, US4.2, US4.3, US5.3, US6.4), `requirements.md` (FR15–FR18, FR24–FR27, FR36–FR37, FR48–FR52), `contract-summary.md` (C6, C7, C17, C18, C19), FD-067, FD-100, FD-101, FD-102, FD-105, the hard rules in `project.md`, and `01-conventions.md` §2–§6 and §10. Rule IDs are this Unit's own; where a rule continues a T-201 rule, `source` names it. Rules that rest on an answer in `functional-design-questions.md` name the question.

```yaml
rules:
  - id: BR1.1
    statement: "A doctor is visible only when its state is published and it has not been merged into another profile."
    category: constraint
    applies_to: "every directory query and every doctor reference in a view model"
    trigger: "Any read that loads a doctor"
    logic: "IF doctors.state = published AND merged_into_id IS NULL THEN the doctor may be projected ELSE getDoctor returns not_found and lists leave it out; a member-added doctor is published at once and shows the not-confirmed mark (BR2.13, FD-100)"
    violation: "A draft, pending, hidden, rejected or merged profile on a public page is an S1 defect"
    source: "FR15, AC4.1.1, FD-100, T-201 BR1.1"
  - id: BR1.2
    statement: "A branch is visible only when the branch and its organisation are both published; a doctor is at a branch only through a chamber linked to it."
    category: constraint
    applies_to: "getFacility, listFacilities, doctorsAtBranch, facilitiesForDoctor, every branch reference"
    trigger: "Any read that loads a branch"
    logic: "IF facility_branches.state = published AND facilities.state = published THEN the branch may be projected ELSE not_found or left out; doctors at a branch = visible doctors with a doctor_chambers row whose branch_id is that branch"
    violation: "An unpublished branch on a public page is an S1 defect"
    source: "FR24, T-201 BR1.2, T-201 Question 14, ISS-266"
  - id: BR1.3
    statement: "A review counts and shows only when it is published, not soft-deleted, has a publication time and its subject doctor is visible (BR1.1); every review read applies this one predicate in SQL."
    category: constraint
    applies_to: "every ReviewRepository read method; every count, distribution and card (topic totals, condition pages, doctor figures, listExperienceCards)"
    trigger: "Any read of reviews"
    logic: "eligible = reviews.state = published AND deleted_at IS NULL AND published_at IS NOT NULL AND the joined doctor has state published AND merged_into_id IS NULL (the predicate the merged demo pages use, topicExperienceCount and selectReviewCards included); a review of an unpublished or merged doctor counts nowhere and no card links to a profile that answers 404; a review that is hidden and later restored re-enters every figure on the next read, because figures are queries, not stored totals"
    violation: "A hidden or deleted review in any figure fails AC6.4.4; a review of a merged or unpublished doctor in a topic total or card (U46 review R-03)"
    source: "FR50, AC6.4.4, T-201 BR1.3, demo/doctors.ts isPublishedReview and topicExperienceCount, U46 review R-03"
  - id: BR1.4
    statement: "A facility review counts and shows only when it is published, not soft-deleted and has a publication time."
    category: constraint
    applies_to: "ReviewRepository facility read methods"
    trigger: "Any read of facility_reviews"
    logic: "eligible = facility_reviews.state = published AND deleted_at IS NULL AND published_at IS NOT NULL"
    violation: "A hidden or deleted visit in the criteria fails AC4.3.5"
    source: "FR49, FR50, T-201 BR1.4, demo/facilities.ts isPublishedVisit"
  - id: BR1.5
    statement: "A document count comes only from the PublicEvidenceCount port, for eligible reviews; no directory, taxonomy or review read in this Unit names evidence_items."
    category: calculation
    applies_to: "documentsCount on cards, documentCount on profiles, the Has documents filter"
    trigger: "Any document count"
    logic: "counts = PublicEvidenceCount.countPublicEvidenceByReview(eligible review ids) once per query; a review missing from the map counts 0; until U48 the binding counts today's ready states (C17 interim); the number is shown as Documents attached — not medically validated with the count, or No documents when 0"
    violation: "A direct evidence_items read breaks C17; a quarantined or failed item counted misstates the documents"
    source: "FR48, FR51, FR56, C17, Question 8, project.md Mandated (evidence wording)"
  - id: BR1.6
    statement: "Only active terms are used, and every count uses the effective term: the canonical target when canonical_id is set, else the term itself."
    category: calculation
    applies_to: "condition counts, mentions, getCondition, listConditions, resolve, listSuggested"
    trigger: "Any read that groups or looks up by term"
    logic: "effective(term) = canonical_id IF set ELSE id; a hidden term is never listed, resolved or linked; nothing sets canonical_id in release 1, so release 2's mapping counts at once without changing these reads"
    violation: "A deactivated term linked from a card, or a mapped term counted apart from its target"
    source: "FR37, FR38 (release 2), Question 11, T-201 BR1.6"
  - id: BR1.7
    statement: "A review is about a condition term when one of its condition tags points at that effective term, or its free text equals the term's English or Bengali name or one of its aliases, ignoring case and outer spaces; this one rule serves every condition figure."
    category: calculation
    applies_to: "listConditions totals, getCondition, a doctor's conditions and breakdown, the condition filter, a card's condition"
    trigger: "Any read that relates a review to a condition"
    logic: "about(review, T) = EXISTS a review_tags row of group condition with (effective(term_id) = T) OR (lower(btrim(NFC(free_text))) IN lower(NFC(name_en of T)), lower(NFC(name_bn of T)), lower(NFC(alias)) of each alias of T); T is an active condition term; a review counts once per term however many tags match"
    violation: "Topic counts that change when the merged pages switch to the module (T-201 review, Major 1), or a second counting rule anywhere in main"
    source: "FD-101 (binding), Question 2, T-201 review Major 1"
  - id: BR2.1
    statement: "No number stands for quality: view models carry exact counts and their totals only, never a percentage, average, combined score, rating or rank, and no sort by sentiment, outcome, reactions or documents exists."
    category: policy
    applies_to: "every view model, port result, query and page in the owned paths"
    trigger: "Code Generation and review of the diff"
    logic: "IF a field, label or sort derives a single quality figure from accounts THEN it is forbidden; bars may show a count against its denominator, never a percent text"
    violation: "An S1 defect against the hard rule"
    source: "project.md Forbidden (no number for quality, no highest-rated sort), FR52, AC6.4.1, AC6.4.5, the owner's answer to T-202 Question 1 (counts only)"
  - id: BR2.2
    statement: "A missing or hidden value is never shown as 0, an empty string or a blank label: view models leave it out; the page omits an empty entry of the facts list and of chamber hours, and shows Not provided (or No documents) in a slot it always has."
    category: validation
    applies_to: "view-model mappers; DoctorProfile facts and chambers; hero specialty and place line; About panel; facility address; distributions; document counts"
    trigger: "Mapping and rendering a profile"
    logic: "IF a value is null, empty or whitespace, an empty list, or its provenance entry has hidden = true THEN the VM omits it; facts list (bmdc, specialty, qualifications, languages, fee) and chamber hours: the entry is not rendered; fixed slots (specialty and place in the hero and cards, about, address, empty distribution): label.notProvided; documents: label.noDocuments"
    violation: "A 0 or blank for a missing value is an S1 defect; a hidden field shown fails AC4.1.3"
    source: "FR17, AC4.1.3, AC6.4.2, project.md Forbidden and Mandated (Not provided, No documents), Question 5, ISS-268"
  - id: BR2.3
    statement: "Every distribution carries a count for every key in render order, the total of recognised values as its denominator, the number of eligible accounts without a value, and an empty flag."
    category: calculation
    applies_to: "DistributionVM for sentiment, outcome and each facility criterion"
    trigger: "Building any distribution"
    logic: "counts has every key, 0 included; total = values in keys; notProvided = eligible accounts whose value is absent; empty = total = 0; the page shows Not provided for an empty distribution and Not provided: n under a partial one"
    violation: "A distribution without its denominator fails AC6.4.1, AC6.4.2 and AC4.3.5"
    source: "project.md Mandated (exact counts with denominators), FR48, FR51, AC4.3.5, AC6.4.1, AC6.4.2, T-201 BR2.3, T-202 Question 2"
  - id: BR2.4
    statement: "Limited data is marked from the configured threshold: on each distribution when 0 < total < threshold, and on each summary (card, hero, condition head, facility criteria panel) when 0 < eligible accounts < threshold."
    category: calculation
    applies_to: "domain/review/policies.ts isLimitedData; DistributionVM.limitedData; accountsLimitedData on doctor, facility and condition view models"
    trigger: "Building a distribution or summary"
    logic: "threshold = (await ConfigProvider.current()).limitedDataThreshold, read once per port call (5 in release 1, C18); limitedData = total > 0 AND total < threshold; the why line names the threshold"
    violation: "A constant threshold in code, or a summary below it without the mark, breaks the hard rule"
    source: "project.md Mandated (Limited data), FR51, AC4.3.5, AC6.4.2, C18, T-202 Questions 3 and 4"
  - id: BR2.5
    statement: "Every doctor view model carries registrationNotVerified true and every facility view model carries notVerified true, whatever is stored."
    category: policy
    applies_to: "DoctorCardVM, DoctorProfileVM, FacilityCardVM, FacilityProfileVM"
    trigger: "Mapping any doctor or facility"
    logic: "both are the literal true, set by domain/directory/policies.ts registrationNotVerified(), never derived from bmdc_number or any column; doctors show Registration not verified, facilities Not verified"
    violation: "Any doctor without the flag is an S1 defect; the word verified applied to a registration fails AC4.1.2"
    source: "project.md Mandated (Registration not verified), D-003, FR16, FR25, AC4.1.2, AC4.3.2, T-203 Question 2"
  - id: BR2.6
    statement: "Facility feedback never enters a doctor's figures: every doctor-side figure reads reviews by doctor_id and never reads facility_reviews; a query-level test proves it."
    category: constraint
    applies_to: "ProviderExperience.forDoctor, summariesForDoctors, review.sentimentDistribution, review.outcomeDistribution, ConditionStats"
    trigger: "Any doctor or condition figure"
    logic: "IF a figure is about a doctor or a condition THEN its rows are eligible reviews only; facility_reviews are never joined, whether or not the doctor practises at the branch"
    violation: "Any change in a doctor's figures caused by facility feedback is an S1 defect"
    source: "project.md Forbidden (facility feedback in doctor aggregates), FR26, FR49, AC4.3.3, AC6.4.3"
  - id: BR2.7
    statement: "A doctor's reviews never enter a facility's figures, and a facility's figures are its nine criteria distributions only, never a sentiment."
    category: constraint
    applies_to: "ProviderExperience.forBranch, summariesForBranches, review.criteriaDistribution"
    trigger: "Any facility figure"
    logic: "IF a figure is about a branch THEN its rows are eligible facility_reviews with that branch_id; a doctor review whose branch_id is that branch is never counted or listed on the branch page"
    violation: "Mixing the two feedback kinds fails FR26 and AC4.3.1"
    source: "FR24, FR26, FR49, AC4.3.1, AC6.4.3, the owner's answer to T-203 Question 1 (nine criteria)"
  - id: BR2.8
    statement: "Lists are ordered neutrally: indexes alphabetically by the active-locale name, accounts newest first, counted lists by count; never by sentiment, outcome, reactions or documents."
    category: policy
    applies_to: "listDoctors, listFacilities, listConditions, every account list, conditions, specialties, places, mentions, doctors and facilities on a condition page"
    trigger: "Any ordered list"
    logic: "doctor index: name in locale, tie public_id (Question 6); branch index: title, then label, tie public_id; topic index: name; accounts: published_at desc, tie public_id; counted lists: count desc, tie name"
    violation: "An order that favours positive accounts or engagement breaks the hard rule"
    source: "project.md Mandated (neutral order) and Forbidden (highest rated), FR52, AC6.4.5, prototype byName, Question 6"
  - id: BR2.9
    statement: "Every platform string in a view model is the active-locale value; user-written text stays as written; no view-model key ends in En, Bn, _en or _bn."
    category: validation
    applies_to: "every repository mapper and view model"
    trigger: "Mapping any row"
    logic: "a *_en/*_bn pair gives the actor's locale only, with no fallback to the other language (a missing value is omitted, BR2.2); titles, bodies, free-text tags, provisional wording and member-typed doctor names pass through unchanged; numbers stay numbers and the UI formats them in the locale's numerals"
    violation: "A leaked locale key or a translated user text fails AC4.1.4 and AC5.3.2"
    source: "project.md Mandated (Bengali and English equal), FD-024, ADR 0011, AC4.1.4, AC5.3.2, demo pick()"
  - id: BR2.10
    statement: "View models carry public ids and public text only: no account id, email, internal uuid, persona id, claimant, submitter, BMDC number typed by a member, seed reference or original filename; an anonymous byline carries no name, username or initials."
    category: authorization
    applies_to: "every view model and every port result that becomes one"
    trigger: "Mapping any row"
    logic: "IF a field is private or internal THEN it is not selected or is dropped in the mapper; claimed and memberAddedNotConfirmed are booleans; anonymous Byline = {personaKind: anonymous}"
    violation: "Any private key in a view model is an S1 defect"
    source: "03-routes-and-contracts.md §2, contract-summary.md privacy rules, FD-100 (BMDC only in the payload), T-201 BR2.10"
  - id: BR2.11
    statement: "Every projected profile fact and chamber carries its provenance and last-update date; a populated field without an entry is shown as Community submitted, dated by the profile's last update."
    category: calculation
    applies_to: "DoctorProfileVM.facts and chambers, FacilityProfileVM.provenance"
    trigger: "Mapping a profile"
    logic: "provenance = field_provenance[field] IF present ELSE {source: community, updatedAt: updated_at ?? created_at}; chamber = {source: chamber.provenance, updatedAt: chamber.created_at}"
    violation: "A public field without provenance fails AC4.1.4"
    source: "FR18, AC4.1.2, AC4.1.4, T-201 BR2.11"
  - id: BR2.12
    statement: "When facility feedback is turned off, no facility feedback is read or projected."
    category: policy
    applies_to: "getFacility, listFacilities, FacilityCardVM, FacilityProfileVM"
    trigger: "Any facility query"
    logic: "feedbackVisible = (await ConfigProvider.current()).featureVisibility.facilityAccounts; IF false THEN forBranch and summariesForBranches are not called and the VM has no count, limited flag, distribution or account"
    violation: "Facility figures shown with the feature off"
    source: "FR100, C18, T-201 BR2.12, T-203 Question 8"
  - id: BR2.13
    statement: "A doctor added by a member is marked Added by a member — not confirmed while its submission is pending: memberAddedNotConfirmed is derived in SQL from a pending profile_submissions row that created the doctor."
    category: policy
    applies_to: "DoctorCardVM, DoctorProfileVM; the directory repository's doctor reads"
    trigger: "Mapping any doctor card or profile"
    logic: "memberAddedNotConfirmed = EXISTS profile_submissions WHERE kind = doctor AND created_doctor_id = doctors.id AND status = pending; computed in the same query that loads the doctor (no extra round trip per row); the page shows label.memberAdded next to Registration not verified, and the profile adds label.memberAddedWhy; never derived from field_provenance"
    violation: "The mark disappearing for doctors already in a running database when the pages switch to the module (T-201 review, Major 2), or showing on a seeded or staff-confirmed doctor"
    source: "FD-100 (binding), C7 release-1 addition, Question 4, T-201 review Major 2"
  - id: BR3.1
    statement: "distribution(values, keys, threshold) counts each value in keys once, ignores values outside keys, counts absent values as not provided, and marks empty and limited data; isLimitedData(total, threshold) = total > 0 AND total < threshold."
    category: calculation
    applies_to: "domain/review/policies.ts"
    trigger: "Every distribution"
    logic: "for each value: IF in keys THEN counts[value] += 1 and total += 1; IF absent THEN notProvided += 1; ELSE ignore; empty = total = 0; limitedData = isLimitedData(total, threshold)"
    violation: "A wrong boundary (4 of 5 limited, 5 not, 0 empty and not limited)"
    source: "T-201 BR3.1, prototype distribution(), FR51"
  - id: BR3.2
    statement: "A doctor's conditions count distinct eligible reviews per condition term by BR1.7, ordered by count; cards show the top three, the profile all of them with a per-condition sentiment breakdown."
    category: calculation
    applies_to: "summariesForDoctors topConditions, forDoctor conditions and breakdown"
    trigger: "Building a doctor card or profile"
    logic: "count(distinct review) per term T where about(review, T) among the doctor's eligible reviews; breakdown = sentiment distribution of those reviews per T, each with its own limitedData"
    violation: "Double-counted reviews inflate the common condition tags (AC6.4.1)"
    source: "FR48, AC6.4.1, T-201 BR3.2, prototype conditionsFor"
  - id: BR3.3
    statement: "The doctors written about for a condition count reviews, not tags."
    category: calculation
    applies_to: "ConditionStats.forCondition doctors and doctorsTotal"
    trigger: "Building a condition page"
    logic: "count(distinct review) per visible doctor among eligible reviews about the term; doctorsTotal = number of such doctors"
    violation: "A review tagged twice counted twice"
    source: "T-201 BR3.3, prototype doctorsForCondition"
  - id: BR3.4
    statement: "Mentioned medicines, treatments and symptoms on a condition page count distinct eligible reviews per label, where the label is the effective term's name in the locale or the original free text."
    category: calculation
    applies_to: "ConditionStats.forCondition mentioned; ConditionPageVM medicines, treatments, symptoms"
    trigger: "Building a condition page"
    logic: "among the condition's eligible reviews, for each tag of the group: label = effective term name IF term ELSE free_text as written; count(distinct review) per label; not_sure tags are not mentions; each list is framed by counted from n patient experiences"
    violation: "Counting tags instead of reviews, or dropping free-text mentions"
    source: "FR48, T-201 BR3.4, prototype tagFrequency, T-203 Question 5"
  - id: BR3.5
    statement: "On a doctor profile the condition filter scopes the distributions and the scoped total; outcome, relationship and documents narrow the account cards cumulatively; showing is the number of cards left."
    category: calculation
    applies_to: "directory.getDoctor, ProviderExperience.forDoctor"
    trigger: "getDoctor with condition, outcome, relationship or docs"
    logic: "scoped = the doctor's eligible reviews, about the condition when one is given (BR1.7); sentiment and outcome use scoped; cards = scoped narrowed by outcome, relationship and (docs) at least one public document (BR1.5); scopedTotal = |scoped|; showing = |cards|; total = all eligible reviews of the doctor; a condition the doctor has no account for gives selectedCondition absent and the page drops the parameter; an unknown filter value is a validation error the page treats as absent"
    violation: "Filters that change the totals, or a wrong showing or scopedTotal"
    source: "T-201 BR3.5, prototype profileAccounts, 03-routes-and-contracts.md §1, T-202 BR1.5"
  - id: BR3.6
    statement: "A condition's places aggregate (primary chamber name, area, city) per doctor with that doctor's account count; its specialties are the top three by account count; its facilities are the visible branches named on its eligible reviews."
    category: calculation
    applies_to: "ConditionStats.forCondition places, specialties, facilities"
    trigger: "Building a condition page"
    logic: "place key = (first chamber by sort_order, area, city) of each doctor written about; count = that doctor's accounts about the term; equal keys add up; the hospital is absent when the doctor has no chamber (the page prints Not provided); specialty count = sum of accounts of doctors with that specialty, top 3; facilities = distinct visible branches of reviews.branch_id among the condition's eligible reviews, by count then title, no count shown"
    violation: "A missing hospital shown as blank or 0"
    source: "T-201 BR3.6, prototype renderCondition, C6 (facilities, districts)"
  - id: BR3.7
    statement: "A card excerpt is the first 190 graphemes of the account's text, cut with Intl.Segmenter, never by code units."
    category: calculation
    applies_to: "ExperienceCardVM.excerpt"
    trigger: "Building a card"
    logic: "text = body for a quick review, else the present sections in the order symptoms, diagnosis, treatment, after, joined by a space, whitespace collapsed; IF more than 190 graphemes THEN keep 190 and set truncated true"
    violation: "A split Bengali conjunct or emoji (01-conventions.md §4)"
    source: "T-201 BR3.7, prototype accountRow, demo EXCERPT_LENGTH"
  - id: BR3.8
    statement: "avatarHue is the stored avatar_hue when present, otherwise stableHue(publicId), the prototype's FNV-1a hash modulo 360."
    category: calculation
    applies_to: "doctor and branch references in view models; contracts/ids.ts stableHue"
    trigger: "Mapping any avatar"
    logic: "avatarHue = avatar_hue IF not null ELSE fnv1a32(publicId) mod 360; doctors read doctors.avatar_hue, branches facility_branches.avatar_hue (new); a member-added doctor stores none"
    violation: "A hue that changes between requests for one profile"
    source: "T-201 BR3.8, T-201 Questions 8 and 12, prototype hash()"
  - id: BR3.9
    statement: "A card's condition is the first of its condition tags, in tag order, that makes the review about an active term (BR1.7), with that term's public id; with no such tag, its first free-text condition tag is shown without a link; otherwise none."
    category: calculation
    applies_to: "ExperienceCardVM.condition"
    trigger: "Building a card"
    logic: "ordered by (created_at, id): a term tag gives effective(term_id) if active; a free-text tag gives the active condition term it matches by BR1.7, if exactly one; the first such gives {publicId, name in locale}; ELSE IF any free-text condition tag THEN {name: free text as written}; ELSE omitted"
    violation: "A card linking to a hidden or wrong term"
    source: "T-201 BR3.9, prototype accountRow (conditionById), Question 2"
  - id: BR3.10
    statement: "Reads are batched: a page issues a bounded number of queries, never one per row; the one exception is the interim PublicEvidenceCount binding until U48."
    category: constraint
    applies_to: "every repository and port method used by a list or profile"
    trigger: "Any list or profile query"
    logic: "rows first, then one grouped read per summary kind (summariesForDoctors, summariesForBranches, totalsForConditions) and one batched evidence count; the interim binding maps the batch onto the demo's single-review count (recorded S4 row; U48 answers it with one query)"
    violation: "N+1 queries on an index page"
    source: "T-201 BR3.10, C17, Question 8"
  - id: BR3.11
    statement: "A branch is titled by its own name when stored, else its organisation's name; its label is name_* when that differs from the title; its parent is the organisation when that differs from the title."
    category: calculation
    applies_to: "FacilityCardVM, FacilityProfileVM, sibling and doctor-profile facility rows, ConditionPageVM.facilities; domain/directory/policies.ts branchNames"
    trigger: "Mapping any branch"
    logic: "title = own_name in locale IF present ELSE facilities.name in locale; branchName = facility_branches.name in locale IF it differs from title ELSE omitted; parentName = facilities.name in locale IF it differs from title ELSE omitted; reseeded f1 gives Shefa General Hospital / Dhanmondi branch / Shefa Health Group; f2 gives Bandar Diagnostic Centre only; a database seeded before this Unit gives Shefa Health Group / Dhanmondi branch, as the merged page shows today"
    violation: "One place under two names, or a merged page whose title changes meaning under it (T-201 review, Major 1)"
    source: "FR24, AC4.3.1, the owner's answer to T-203 finding F2, Question 3"
  - id: BR4.1
    statement: "normalizeAliasKey(text) is NFC, then lowercase, keeping only letters, combining marks and digits."
    category: calculation
    applies_to: "domain/taxonomy/policies.ts; every taxonomy key"
    trigger: "Computing a name or alias key"
    logic: "key = NFC(text).toLowerCase() without characters outside \\p{L}, \\p{M}, \\p{N}; composed and decomposed Bengali give one key; vowel signs and the hasanta stay"
    violation: "Two spellings of one word giving different keys"
    source: "T-201 BR4.1, 01-conventions.md §4"
  - id: BR4.2
    statement: "Every stored and looked-up taxonomy key is produced by normalizeAliasKey before the database, in application code or the seed; the database package never computes one."
    category: constraint
    applies_to: "name_key_en, name_key_bn, alias_key; resolve, the provisional-term operation, seed-directory.ts"
    trigger: "Writing or looking up a key"
    logic: "keys are arguments to repository methods; the seed imports normalizeAliasKey from domain for taxonomy keys instead of its keyify (doctors keep theirs)"
    violation: "c2's seeded key thyroid(hypothyroidism) never matching a lookup; a key function inside packages/database fails the boundary lint"
    source: "T-201 BR4.2 and finding F2, 01-conventions.md §2 as built by T-010"
  - id: BR4.3
    statement: "taxonomy.resolve matches the normalised text exactly against active alias keys and name keys, returns the effective term, and returns none when the match is ambiguous."
    category: calculation
    applies_to: "taxonomy.resolve"
    trigger: "The composer (U47) resolves a typed wording"
    logic: "key = normalizeAliasKey(text), empty key gives validation; candidates = active terms, optionally of one kind, whose alias or name key equals key, mapped to effective terms; one gives {termId, publicId, name, matchedAlias, provisional}; none gives {}; several give {ambiguous: true}; fuzzy matching is T-205's (release 2)"
    violation: "A known wording created again as a provisional term"
    source: "T-201 BR4.3, C6"
  - id: BR4.4
    statement: "The topic index lists every active canonical condition term, those with no accounts included, each with its eligible-account total by BR1.7."
    category: policy
    applies_to: "taxonomy.listConditions"
    trigger: "The topic index and the home (U20)"
    logic: "terms of kind condition, state published, provisional false, canonical_id null; accountsTotal from ConditionStats.totalsForConditions, 0 included; the page shows No one has written about this yet. for 0"
    violation: "Dropping a zero-count topic, or counts that differ from the merged page"
    source: "T-201 BR4.4, FD-101, prototype renderTopicIndex"
  - id: BR4.5
    statement: "taxonomy.listSuggested returns the active canonical terms flagged suggested for a tag group's kind, in suggested order."
    category: calculation
    applies_to: "taxonomy.listSuggested; seed-directory.ts"
    trigger: "The composer (U47) asks for a group's suggestions"
    logic: "group -> kind; suggested = true, published, canonical_id null; order by suggested_order, then name; the seed maps the prototype's TAG_GROUPS explicitly: the condition chips flag c1, c3 and c2 in that order, and the other nine chips become canonical published terms of their kind with suggested true; no condition term is added"
    violation: "An empty suggestion list on the seed, or an eleventh condition with zero accounts in the topic index"
    source: "T-201 BR4.5 and finding F11, ISS-157, prototype TAG_GROUPS"
  - id: BR4.6
    statement: "A condition page serves an active canonical condition term or an active unmapped provisional one, marked provisional; a hidden, mapped or non-condition term is not found."
    category: policy
    applies_to: "taxonomy.getCondition"
    trigger: "A condition page is requested"
    logic: "IF kind <> condition OR state <> published OR canonical_id IS NOT NULL THEN not_found (no redirect in release 1, Question 11) ELSE build the page with provisional = term.provisional"
    violation: "A dead link on a provisional tag, or a hidden term's page"
    source: "FR37, AC5.3.2, T-201 BR4.6 and Question 10, Question 11"
  - id: BR5.1
    statement: "taxonomy.createProvisional requires an authenticated account with a verified email that is not restricted."
    category: authorization
    applies_to: "modules/taxonomy/commands/create-provisional.ts"
    trigger: "The command is called"
    logic: "IF actor.kind = account AND emailVerified AND status is not restricted THEN proceed ELSE forbidden with no side effect"
    violation: "A visitor or unverified account creating terms"
    source: "C6 (requires verified), 01-conventions.md §5, T-201 BR5.1, Question 14"
  - id: BR5.2
    statement: "Creating a provisional term is one operation on the caller's transaction, idempotent per kind and key under concurrent calls: it returns the existing effective term when one matches, else creates one provisional term with the original wording and one alias."
    category: calculation
    applies_to: "modules/taxonomy/provisional-term.ts (the operation, exported for U47's publish), commands/create-provisional.ts"
    trigger: "An unmapped wording becomes a term"
    logic: "key = normalizeAliasKey(text); IF an active term of the kind has this name or alias key THEN return its effective term, writing nothing ELSE insert {kind, name_en = name_bn = text, keys = key, provisional true, state published} ON CONFLICT on the open-provisional key DO NOTHING; inserted gives the alias {alias = text, alias_key = key, lang, provenance community}; not inserted re-reads the concurrent winner; created_by_account_id is never written; the caller's transaction is never aborted"
    violation: "Two provisional terms for one wording, an altered wording (AC5.3.2), an aborted publish, or a term tied to an account"
    source: "FR37, AC5.3.2, T-201 BR5.2 and findings F10 and F12, FD-015, FD-022"
  - id: BR5.3
    statement: "A created term writes one audit row with allowlisted details and one term.changed outbox event in the same transaction; nothing is written when an existing term is returned."
    category: policy
    applies_to: "the provisional-term operation"
    trigger: "A term is created"
    logic: "audit stream taxonomy, action term.provisional_created, details {termId, kind, lang}, never the wording; the actor is the one the caller passes (the account for the command, the publishing persona inside U47's publish); outbox term.changed {id}, no job in release 1 (C15 relay map)"
    violation: "A change without its audit row breaks 01-conventions.md §5; an account actor inside an anonymous publish links the account to that review"
    source: "C6, C15 release-1 relay map, 01-conventions.md §3 and §5, T-201 BR5.5"
  - id: BR5.4
    statement: "The taxonomy.createProvisional command allows 30 calls per account per hour, per process; the operation inside publish is not limited again."
    category: constraint
    applies_to: "modules/taxonomy/commands/create-provisional.ts"
    trigger: "The command is called, after authorization"
    logic: "decision = RateLimiter.hit('taxonomy.createProvisional:account:' + accountId, 30, 3600); IF not allowed THEN rate_limited with retryAfter and nothing written; every call counts, idempotent ones included; the limit is a module constant (C18) on T-101's in-memory limiter, so it holds per process"
    violation: "Unbounded term creation; a key outside T-101's RateLimitKey shape does not typecheck (T-201 review, Minor)"
    source: "C18, C19 (RateLimitKey shape), T-201 BR5.6 and review Minor"
  - id: BR5.5
    statement: "directory.addMemberDoctor accepts a typed name of at most 120 characters with at least three letters once a Dr./Prof./ডাঃ/ডা. title is removed, and no control or format character; an optional specialty that is an active specialty term, a practice place of at most 200 characters and a BMDC number of up to 20 letters, digits or hyphens."
    category: validation
    applies_to: "modules/directory/internal/add-member-doctor.ts; contracts AddMemberDoctorInput"
    trigger: "The calling command (U47's publish) passes the input"
    logic: "name = trim and collapse spaces; IF doctorNameLetterCount(name) < 3 OR hasControlOrFormat(name) OR length > 120 THEN validation; IF specialtyId is given and is not a published specialty term THEN validation; practiceArea and bmdcNumber by the same limits as the merged write form"
    violation: "A one-letter or invisible-character doctor published under a real-looking name"
    source: "FD-100, C7 release-1 addition, contracts/doctor-name.ts, apps/web/src/server/actions/review.ts limits"
  - id: BR5.6
    statement: "addMemberDoctor reuses a visible doctor whose name key matches when the specialties agree or one is blank, and creates one otherwise; two concurrent calls for one key create at most one doctor."
    category: calculation
    applies_to: "modules/directory/internal/add-member-doctor.ts; the directory repository"
    trigger: "addMemberDoctor runs"
    logic: "key = doctorNameKey(name); take a transaction-scoped lock on 'doctor-name:' + key; candidates = visible doctors (BR1.1) whose doctorNameKey of name_en or name_bn equals key, oldest first; IF one has specialty_id = specialtyId, or either is blank THEN return {doctorId, reused: true}, writing nothing ELSE create (BR5.7)"
    violation: "A duplicate profile for one typed name, or two different doctors merged because they share a name"
    source: "FD-100, C7 release-1 addition, demo createQuickReviewWithNewDoctor"
  - id: BR5.7
    statement: "A member-added doctor is created published with community provenance, the name as typed in both languages, an optional chamber from the practice place, and a pending profile_submissions row that keeps the BMDC number only in its payload."
    category: policy
    applies_to: "modules/directory/internal/add-member-doctor.ts"
    trigger: "addMemberDoctor finds no doctor to reuse"
    logic: "doctors {name_en = name_bn = name, name_key, specialty_id, field_provenance {name_en, name_bn, specialty_id when given: community, now}, avatar_hue null, state published}; IF practiceArea THEN doctor_chambers {name_en = name_bn = practiceArea, provenance community}; profile_submissions {kind doctor, payload {nameEn, nameBn, specialtyId, chamber, bmdc}, submitted_by_account_id = the caller's account, status pending, created_doctor_id}; bmdc_number is not written; nothing is translated"
    violation: "An unchecked BMDC number shown on a profile, or a translated name"
    source: "FD-100, FD-024, C7 release-1 addition, ISS-398 (accepted risk)"
  - id: BR5.8
    statement: "addMemberDoctor runs on the caller's transaction with the caller's actor, and writes one audit row and one doctor.changed event only when it creates a doctor."
    category: policy
    applies_to: "modules/directory/internal/add-member-doctor.ts"
    trigger: "addMemberDoctor creates a doctor"
    logic: "audit stream directory, target doctor id, action memberAdded, details {doctorId, hasSpecialty, hasChamber}, actor = the one the caller passes (U47 passes its publishing persona, BR5.3's pattern); outbox doctor.changed {id}, no job in release 1; a reuse writes nothing; the caller has checked verified and not restricted; it is an internal operation with no route and no rate limit of its own (publish's limit applies)"
    violation: "A doctor created outside the review's transaction, so a failed publish leaves an orphan profile"
    source: "C7 release-1 addition (audit, outbox, caller), C15 release-1 relay map, 01-conventions.md §5"
  - id: BR6.1
    statement: "No file under modules/directory or modules/taxonomy imports modules/review or the review repository port; their review-derived figures arrive only through ProviderExperience and ConditionStats."
    category: constraint
    applies_to: "packages/application/src/modules/{directory,taxonomy}/**"
    trigger: "Code Generation; every pnpm check"
    logic: "a static import test fails on any such import (the boundary lint does not check edges inside application)"
    violation: "A direct read re-creates the cycle FD-067 breaks"
    source: "FD-067, C6, C7, T-201 BR6.1"
  - id: BR6.2
    statement: "The directory and taxonomy repositories never read review-side tables, and no repository in this Unit reads evidence_items or community tables."
    category: constraint
    applies_to: "packages/database/src/repositories/{directory,taxonomy}.ts and the read methods of review.ts"
    trigger: "Code Generation"
    logic: "directory and taxonomy repositories name no reviews, review_tags, facility_reviews, personas, evidence_items or comments; the review read methods name no evidence_items, comments or review_versions"
    violation: "A figure computed outside Review, or a document count bypassing C17"
    source: "FD-067, C17, Question 9, T-201 BR6.2"
  - id: BR6.3
    statement: "The Review stub holds only the two port implementations, the four read queries and their tests; it adds no command."
    category: constraint
    applies_to: "packages/application/src/modules/review/** in this Unit"
    trigger: "Code Generation"
    logic: "allowed: provider-experience.ts, condition-stats.ts, index.ts, queries/{sentiment-distribution,outcome-distribution,criteria-distribution,list-experience-cards}.ts and tests; U47 adds its files beside them without rewriting them"
    violation: "A T-301 command in the stub"
    source: "T-201 BR6.3, unit-of-work.md U46 and U47"
  - id: BR6.4
    statement: "Port and contract changes against C6, C7 and C17 are additive, except the recorded amendments of ConditionStats.forCondition and ProviderExperience.forDoctor's condition parameter, where U46 is provider and sole consumer; the contract summary and 03 §4 follow them in the same Bolt; the PublicEvidenceCount signature is frozen at this Unit's merge."
    category: policy
    applies_to: "ProviderExperience, ConditionStats, PublicEvidenceCount, contracts schemas and view models"
    trigger: "Code Generation"
    logic: "a dated note on C6, C7 and C17 lists the additions and, as an amendment, the replaced ConditionStats fields (doctors, facilities, districts, mentioned) and parameters (locale added; condition taken as public id) with their new shapes (functional-spec.md section 6); 03 §4 corrected"
    violation: "A silent signature change leaves U20, U47 and U48 on the old shape; an amendment recorded as additive (U46 review R-04)"
    source: "contract-summary.md ownership rules, C17 (frozen at merge), U46 review R-04"
  - id: BR6.5
    statement: "Queries never write; the only writes in the Unit are the provisional-term operation, addMemberDoctor, the migration and the seed."
    category: constraint
    applies_to: "every query in the owned paths"
    trigger: "Code Generation"
    logic: "IF a query inserts, updates or deletes THEN it is a defect"
    violation: "A read with a side effect; summaries that depend on who looked"
    source: "01-conventions.md §3, FR52"
  - id: BR6.6
    statement: "Every file sits where T-010's boundary matrix allows its imports."
    category: constraint
    applies_to: "every file in the owned paths"
    trigger: "pnpm lint:boundaries on every pnpm check"
    logic: "domain imports nothing; application imports domain and contracts only and parses with contracts schemas; database imports application ports and contracts; keys and thresholds reach repositories as arguments; stableHue and doctorNameKey live in contracts; components import no database, adapters, test-support or node: module; only server/** imports @rogikotha/database"
    violation: "A red boundary lint blocks the merge"
    source: "01-conventions.md §2, FD-093, team.md Code Style"
  - id: BR7.1
    statement: "One directory predicate and one topic rule on main: in the same Bolt, U46 deletes the demo directory and topic functions only its pages call and switches /doctors, /facilities and /topics to the module queries."
    category: constraint
    applies_to: "packages/database/src/demo/{doctors,facilities}.ts, their tests, demo/evidence.adversarial.test.ts, demo/reviews.int.test.ts, demo/demo-slice.smoke.test.ts, apps/web/src/server/data.ts, demo/index.ts, the six route pages"
    trigger: "Code Generation"
    logic: "deleted: demo/doctors.ts listDoctors, listPublishedReviewsForDoctor, listTopics, getTopic and their helpers (taggedWithTopic, topicExperienceCount, isPublishedTopic); demo/facilities.ts whole, with facilities.int.test.ts and topics.int.test.ts and the doctor rows of doctors.int.test.ts that test deleted functions; the facilities binding line in data.ts and the export line in demo/index.ts; the demo types only those functions used, from contracts view-models/demo.ts; the pages call container queries instead of server/data. Every other test that imports a deleted function keeps its assertions and moves its read onto U46's path in the same commit: evidence.adversarial.test.ts (FD-035, never counted on the doctor page) reads PgReviewReadRepository.publishedForDoctor with the interim PublicEvidenceCount adapter; reviews.int.test.ts (FD-100 rollback) reads PgDirectoryModuleRepository.listDoctors; demo-slice.smoke.test.ts reads the directory and taxonomy repositories; no expected value changes and no assertion is removed"
    violation: "Two predicates or two topic rules on main (T-201 review, Major 1); a red typecheck from a test still importing a deleted function, or a weakened evidence adversarial test (U46 review R-01)"
    source: "Question 1, unit-of-work.md U46, unit-of-work-dependency.md shared files, T-201 review Major 1"
  - id: BR7.2
    statement: "The demo functions other Units' pages call stay unchanged until those Units switch: getDoctor (U22's edit page), listRecentPublishedReviews (U20's home, U47's experiences), listDoctorOptions and listSpecialtyOptions (U47's write page and action)."
    category: constraint
    applies_to: "packages/database/src/demo/doctors.ts"
    trigger: "Code Generation"
    logic: "their bodies, signatures, predicates and the evidence count they use stay as they are; no U46 page calls them; the file's header names the Units that retire them; U50 removes any left without a caller"
    violation: "Breaking a page U46 does not own, or the swarm colliding on another Unit's files"
    source: "Question 1, unit-of-work.md open point (demo-slice code retired by several Units)"
  - id: BR7.3
    statement: "facility_branches.name_* keeps its meaning; the branch's own name and hue are additive columns, so a database seeded before this Unit keeps today's facility titles and needs no reset to stay correct."
    category: constraint
    applies_to: "the migration, seed-directory.ts, the directory repository's branch reads"
    trigger: "Migration and seed"
    logic: "own_name_en/bn and avatar_hue are nullable; the seed writes own_name = the corpus name only for a branch with a branchLabel, avatar_hue = the corpus avatarHue, and leaves name_* = label ?? name as today; the seed fills them only for rows it creates, so an existing database shows the prototype's names after pnpm demo:reset"
    violation: "Labels shown as titles on a running database (T-201 review, Major 1)"
    source: "Question 3, T-201 review Major 1"
  - id: BR7.4
    statement: "The switched pages keep what the merged pages show and gain the full designs: every merged element stays unless this design names its replacement."
    category: policy
    applies_to: "the six pages under /doctors, /facilities, /topics"
    trigger: "Code Generation and Build and Test"
    logic: "kept: hero, Registration not verified, Added by a member — not confirmed, the write link, accounts newest first, facts, chambers, About, facility separation notice, visits with answered criteria, doctors with a chamber there and their note, sibling branches, address, topic aliases, tagged experiences, doctors in a topic, No one has written about this yet.; changed: doctor index order (Question 6), empty facts omitted (Question 5), account rows without comment counts and Edited (Question 9); added: distributions, breakdown, filters, provenance, Limited data, Not verified, Part of, criteria distributions, places, mentions, specialties, compact emergency panel"
    violation: "A merged element silently lost"
    source: "FD-099, FD-101, unit-of-work.md U46 (built on the demo pages, not beside them)"
  - id: BR8.1
    statement: "Each level is tested as 01-conventions.md §10 asks; integration tests run against the real PostgreSQL with rows they insert themselves."
    category: validation
    applies_to: "domain, application (fakes), database (*.int.test.ts), component and seed tests"
    trigger: "Code Generation"
    logic: "domain: every policy; application: each query's happy path in en and bn, the command's happy path, each refusal and one audit assertion; database: each repository method, isolation, hidden, count-once, the FD-101 match and the member-added mark; components: en and bn renders"
    violation: "A test that cannot fail, or one that depends on another test's rows"
    source: "01-conventions.md §10, team.md Testing Posture"
  - id: BR8.2
    statement: "The cumulative smoke suite grows: the Unit adds directory smoke assertions and moves the demo-slice smoke assertions that called deleted functions onto the module reads, removing none."
    category: validation
    applies_to: "pnpm smoke; packages/database/src/demo/demo-slice.smoke.test.ts"
    trigger: "Code Generation"
    logic: "new: facility isolation, Registration not verified on every doctor card, the member-added mark; moved: demo-slice smoke's listDoctors, listFacilities and listTopics calls become the directory and taxonomy repository reads with the same assertions"
    violation: "A removed or skipped smoke assertion without a recorded reason"
    source: "team.md Testing Posture"
  - id: BR8.3
    statement: "At the end of Code Generation and in Build and Test, pnpm check (its eleven steps) and pnpm smoke are green on the Bolt branch and on main after the merge; no CI runs (FD-102); every package with source stays at or above 80% line coverage, untested files counted."
    category: validation
    applies_to: "the whole repository"
    trigger: "End of Code Generation and Build and Test"
    logic: "typecheck, lint, lint:boundaries, format:check, check:identity, test:coverage, i18n:check, contrast, contrast:patient, check:motion, build; then pnpm smoke; UI also passes npx impeccable detect apps/web/src --no-advisory"
    violation: "Any red step blocks the merge; a lowered floor breaks D10"
    source: "FD-102, team.md Way of Working and Testing Posture, D10, T-201 review Minor"
  - id: BR8.4
    statement: "U46 keeps its repositories, fakes and page tests in new files of its own, so the shared stub, fake and route test files stay untouched; only the migration-count pins and the six route rows its page switch breaks are edited, each recorded in the Code Generation plan."
    category: validation
    applies_to: "packages/database/src/repositories/, packages/test-support/src/fakes/, migrations.int.test.ts, validator-probes.int.test.ts P8, apps/web/src/app/pages.test.tsx, the route page.test.tsx files"
    trigger: "Code Generation"
    logic: "real repositories in new files (repositories/{directory-module,taxonomy-module,review-reads}.ts, public-evidence-count-interim.ts) with their own *.int.test.ts; the stub files repositories/{directory,taxonomy,review}.ts, not-implemented.test.ts, fakes/repositories.ts and repositories-superset.test.ts are not edited, so the T-201 stubs and their fake mirrors stay as dead code (S4 row, functional-spec.md section 9); new fakes in fakes/directory-repositories.ts (the three repository fakes, applying BR1.3, ISS-222) and fakes/directory-ports.ts (ProviderExperience, ConditionStats, PublicEvidenceCount) with their own tests, including a superset check against the new repository files; page tests in each route's page.test.tsx; in pages.test.tsx only the six /doctors, /facilities and /topics rows and the facilities entry of its server/data mock are removed, because their pages no longer read server/data; the migration takes the next free number at merge time and both pinned counts rise by one"
    violation: "A red pnpm check as soon as a stub becomes real (ISS-294); a shared file edited outside the dependency document's shared list (U46 review R-02)"
    source: "ISS-294, T-201 BR7.6, unit-of-work-dependency.md shared files and migrations rule, U46 review R-02"
  - id: BR8.5
    statement: "The Unit closes its issue rows and records every finding as an ISS row linked to U46."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "fixed in U46: ISS-222 (the new fakes apply BR1.3; the old miscounting fake methods are dead mirrors of the dead T-201 stubs and go with them), ISS-157 (suggested flag), ISS-268 (Not provided renders on seeded d7-d10 and f6-f10); won't fix: ISS-266 (chambers are the only link); new rows from functional-spec.md § 9 with Found in U46"
    violation: "An open owned row or an unrecorded finding breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), team.md Way of Working"
  - id: BR8.6
    statement: "Seed-based acceptance rows take expected numbers from the corpus with this Unit's rules, not from literals."
    category: validation
    applies_to: "packages/test-support/src/seed/seed.int.test.ts"
    trigger: "Build and Test"
    logic: "per-condition totals = corpus reviews whose condition free text matches the term by BR1.7 (r2, r21 and r8 match none, Question 12); 10 conditions with c8 at 0; 10 doctors; 10 branches with the corpus own names, labels and hues; the TAG_GROUPS suggestions"
    violation: "A literal count that breaks without any defect"
    source: "FD-089, T-201 BR7.3, Question 12"
  - id: BR9.1
    statement: "Every new user-facing string has an English and a Bengali entry with the same key, added to both message files in the same commit; components hold no literal copy."
    category: validation
    applies_to: "packages/i18n/messages/{en,bn}.json, every component in the owned paths"
    trigger: "Code Generation; i18n:check"
    logic: "count phrases use ICU plurals with the number formatted in the active locale; no capital-letter transform in Bengali; the Part of badge takes the organisation as a parameter so Bengali word order holds"
    violation: "A key without its Bengali string is a build failure"
    source: "project.md Forbidden and Mandated (bilingual), ADR 0011, FD-024, T-202 Question 5, T-203 Question 16"
  - id: BR9.2
    statement: "The pages use T-011's tokens and motion only: the layout's route transition, Reveal on lists (first six items) and press feedback; the demo marker, disclaimer, emergency panel, Registration not verified and separation notice are never animated in."
    category: policy
    applies_to: "every component and CSS rule in the owned paths"
    trigger: "Code Generation; check:motion"
    logic: "no new transition, animation, keyframe or view-transition rule; new CSS rules only in /* added: U46 reason */ blocks of patient.css with tokens; reduced motion leaves only short fades and every step completes"
    violation: "A red check:motion, or the emergency guidance covered or moved by motion"
    source: "FD-091, US2.4, AC2.4.1-AC2.4.4, project.md Code Style, T-202 Question 11"
  - id: BR9.3
    statement: "A malformed, unknown, hidden, merged or mapped id answers the 404 page; an unknown filter value is dropped, not an error page."
    category: validation
    applies_to: "the doctor, facility and condition route pages"
    trigger: "A page is requested"
    logic: "IF the segment is not a valid public id THEN notFound() without a query; IF the query answers not_found THEN notFound(); filter parameters are parsed with the contracts schema and invalid ones are ignored; a condition the doctor has no account for redirects (307) to the URL without it"
    violation: "A database error page for a malformed id, or a crash on a bad filter"
    source: "03-routes-and-contracts.md §1, T-202 BR1.4-BR1.5, Question 11"
  - id: BR9.4
    statement: "The condition page keeps the prototype's compact emergency panel with the configured numbers, and every page keeps the layout's disclaimer and demo marker."
    category: policy
    applies_to: "ConditionPage, shared EmergencyPanel"
    trigger: "Rendering a condition page"
    logic: "EmergencyPanel compact reads (await ConfigProvider.current()).emergency (C18) and names the ambulance and health-line numbers in the active locale's numerals; it is static (data-static) and placed where the prototype has it"
    violation: "Emergency guidance missing or animated breaks the hard rule"
    source: "project.md Mandated (disclaimer and emergency guidance), C18, T-203 Questions 13 and 14"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | Doctor visible only when published and not merged | constraint |
| BR1.2 | Branch visible only when it and its organisation are published; chambers are the only doctor–branch link | constraint |
| BR1.3 | One review predicate: published, not deleted, has a publication time, doctor visible | constraint |
| BR1.4 | The same predicate for facility reviews | constraint |
| BR1.5 | Document counts only through `PublicEvidenceCount`, batched | calculation |
| BR1.6 | Active terms only; counts use the effective term | calculation |
| BR1.7 | One "about a condition" rule: term tag or FD-101 free-text match | calculation |
| BR2.1 | No number for quality; no percentage; no quality sort | policy |
| BR2.2 | Missing values omitted from VMs; facts omitted, fixed slots read Not provided | validation |
| BR2.3 | Distributions: every key, total, not provided, empty | calculation |
| BR2.4 | Limited data from the configured threshold, on distributions and summaries | calculation |
| BR2.5 | Registration not verified / Not verified always true | policy |
| BR2.6 | Facility feedback never in doctor figures (query-level test) | constraint |
| BR2.7 | Doctor reviews never in facility figures; nine criteria only | constraint |
| BR2.8 | Neutral ordering; doctor index alphabetical | policy |
| BR2.9 | Active-locale strings; user text as written; no locale keys | validation |
| BR2.10 | Public ids and public text only; anonymous byline has no name | authorization |
| BR2.11 | Provenance and date on every fact; default Community submitted | calculation |
| BR2.12 | Facility feedback off: nothing read or projected | policy |
| BR2.13 | `memberAddedNotConfirmed` derived in SQL from a pending submission | policy |
| BR3.1 | `distribution()` and `isLimitedData()` | calculation |
| BR3.2 | Doctor conditions: distinct reviews per term; top three on cards | calculation |
| BR3.3 | Doctors per condition count reviews | calculation |
| BR3.4 | Mentions count distinct reviews per label | calculation |
| BR3.5 | Profile filters: condition scopes, the rest narrow cards | calculation |
| BR3.6 | Places, specialties and facilities on a condition page | calculation |
| BR3.7 | 190-grapheme excerpt | calculation |
| BR3.8 | `avatarHue`: stored, else `stableHue(publicId)` | calculation |
| BR3.9 | Card condition: first tag that makes the review about a term | calculation |
| BR3.10 | Batched reads; the interim evidence binding is the one exception | constraint |
| BR3.11 | Branch title, label and parent without re-meaning `name_*` | calculation |
| BR4.1 | `normalizeAliasKey` | calculation |
| BR4.2 | Keys computed before the database | constraint |
| BR4.3 | `resolve`: exact key, effective term, ambiguous gives none | calculation |
| BR4.4 | Topic index lists every canonical condition, zero included | policy |
| BR4.5 | `listSuggested` from the `suggested` flag; explicit seed mapping | calculation |
| BR4.6 | Condition page: canonical or provisional; hidden or mapped not found | policy |
| BR5.1 | `createProvisional`: verified, not restricted | authorization |
| BR5.2 | Provisional-term operation: idempotent, caller's transaction, no account column | calculation |
| BR5.3 | Term creation: audit (caller's actor) and `term.changed` in one transaction | policy |
| BR5.4 | `createProvisional`: 30 per account per hour, per process, T-101 key shape | constraint |
| BR5.5 | `addMemberDoctor` input validation | validation |
| BR5.6 | `addMemberDoctor` reuse rule under a name lock | calculation |
| BR5.7 | `addMemberDoctor` creation: published, community, pending submission, BMDC in payload only | policy |
| BR5.8 | `addMemberDoctor`: caller's transaction and actor; audit and `doctor.changed` only on create | policy |
| BR6.1 | No Directory or Taxonomy import of Review | constraint |
| BR6.2 | No review-side, evidence or community table in the wrong repository | constraint |
| BR6.3 | Review stub is ports and four queries only | constraint |
| BR6.4 | Additive contract changes; `PublicEvidenceCount` frozen at merge | policy |
| BR6.5 | Queries never write | constraint |
| BR6.6 | Files placed by T-010's boundary matrix | constraint |
| BR7.1 | Demo directory and topic functions retired in the same Bolt as the switch | constraint |
| BR7.2 | Demo functions other pages call stay until their Units switch | constraint |
| BR7.3 | `name_*` meaning kept; own name and hue additive; no reset needed | constraint |
| BR7.4 | Switched pages keep every merged element unless replaced by name | policy |
| BR8.1 | Tests per level; integration tests insert their own rows | validation |
| BR8.2 | Smoke grows; demo-slice smoke assertions moved, not removed | validation |
| BR8.3 | `pnpm check` (eleven steps) and `pnpm smoke` green; no CI; 80% floor | validation |
| BR8.4 | Own new files for repositories, fakes and page tests; only migration pins and six route rows edited | validation |
| BR8.5 | ISS rows closed and recorded | policy |
| BR8.6 | Seed counts from the corpus with this Unit's rules | validation |
| BR9.1 | Bilingual strings, ICU plurals, no literal copy | validation |
| BR9.2 | T-011 tokens and motion only; never animate the safety texts | policy |
| BR9.3 | 404 for bad or invisible ids; bad filters dropped | validation |
| BR9.4 | Compact emergency panel on condition pages from the configuration | policy |
