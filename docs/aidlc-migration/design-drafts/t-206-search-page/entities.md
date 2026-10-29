# Entities — U19 `t-206-search-page`

Source of truth for the data shapes this Unit reads and the state it holds. The Unit stores nothing and adds no table, column or migration. Its entities are the search view models it receives from U18 T-205 (the T-205 draft § 8 is their definition; `search.filterOptions` is the addition of `functional-spec.md` § 12), the cards inside them (U14 T-201's), the search state in the URL, the client compare state, two web-local view models, the runtime settings it reads and the message keys it adds. Decision logic is in `rules.md`; workflows in `functional-spec.md`; component props in `frontend-components.md`.

**Refreshed 2026-10-29** to T-205's draft: `keepOriginalUrl`, `didYouMean`, `alphabetical`, `term`/`termKind`, `hasEvidence`, `evidenceGroup`, `claimed`, `provenance`, the All tab as one call; `getConfig()` with `featureVisibility`; the key list grown for the claimed, provenance and topic fields.

```yaml
entities:
  - id: ENT-001
    name: SearchResultsVM
    owner: Search (U18 T-205; contracts/src/view-models/search.ts)
    description: "One tab's results for one search state (the All tab: up to three per kind). Read only."
    attributes:
      - { name: q, type: string, required: true, constraints: "as received; may be empty (browse)" }
      - { name: tab, type: "enum all|doctors|facilities|conditions|reviews", required: true }
      - { name: sort, type: "enum relevance|volume|recent|alphabetical", required: true }
      - { name: exact, type: boolean, required: true }
      - { name: counts, type: "{doctors, facilities, conditions, reviews: integer >= 0}", required: true, constraints: "every kind on every tab; the All count is the page's sum" }
      - { name: results, type: "list<SearchResultVM>", required: true, constraints: "in ranking order; never re-sorted by the page" }
      - { name: resolvedNote, type: ResolvedNoteVM, required: false }
      - { name: didYouMean, type: "list<{publicId, name}>", required: false, constraints: "1-3, only when nothing resolved" }
      - { name: keepOriginalUrl, type: string, required: false, constraints: "present with an alias, banglish or typo note; the page uses its presence only (F18)" }
      - { name: meta, type: "PageMeta {page, pageSize, total}", required: true }
    relationships:
      - { to: SearchResultVM, cardinality: "one-to-many", direction: "SearchResultsVM lists results" }
      - { to: ResolvedNoteVM, cardinality: "one-to-zero-or-one", direction: "SearchResultsVM may carry a note" }

  - id: ENT-002
    name: SearchResultVM
    owner: Search (U18 T-205)
    description: "One result, a union by kind. Cards are T-201's view models."
    attributes:
      - { name: kind, type: "enum doctor|facility|condition|review", required: true }
      - { name: card, type: "DoctorCardVM | FacilityCardVM | ExperienceCardVM", required: true, constraints: "doctor, facility and review kinds" }
      - { name: "publicId, name, accountsTotal, provisional", type: "string, string, integer, boolean", required: true, constraints: "condition kind" }
    relationships:
      - { to: DoctorCardVM, cardinality: "one-to-one", direction: "a doctor result wraps a DoctorCardVM (registrationNotVerified true, accountsLimitedData)" }
      - { to: FacilityCardVM, cardinality: "one-to-one", direction: "a facility result wraps a FacilityCardVM (not-verified mark, feedbackVisible)" }
      - { to: ExperienceCardVM, cardinality: "one-to-one", direction: "a review result wraps an ExperienceCardVM (BylineVM author)" }

  - id: ENT-003
    name: ResolvedNoteVM
    owner: Search (U18 T-205)
    description: "What the query also matched. Read only."
    attributes:
      - { name: kind, type: "enum alias|banglish|typo|exactCondition", required: true }
      - { name: original, type: string, required: true }
      - { name: resolvedTo, type: "{publicId, name}", required: true, constraints: "a canonical condition, active-language name" }
      - { name: matchedAlias, type: string, required: false, constraints: "absent for exactCondition" }

  - id: ENT-004
    name: SuggestionVM
    owner: Search (U18 T-205; /api/search/suggest)
    description: "One suggestion row from the browser fetch."
    attributes:
      - { name: kind, type: "enum condition|doctor|facility", required: true }
      - { name: publicId, type: string, required: true }
      - { name: title, type: string, required: true, constraints: "active-language title (locale parameter); rendered as text" }
    constraints: "at most 8; published only"

  - id: ENT-005
    name: SearchFilterOptionsVM
    owner: Search (U18 T-205; new query search.filterOptions, functional-spec.md § 12)
    description: "The values each data-backed filter may take for a tab, from published search documents only, alphabetical in the active language."
    attributes:
      - { name: specialties, type: "list<{publicId, label}>", required: true, constraints: "doctors tab" }
      - { name: cities, type: "list<{key, label}>", required: true, constraints: "doctors and facilities tabs; key = document city_key" }
      - { name: languages, type: "list<{key, label}>", required: true, constraints: "doctors tab; consultation-language keys" }
      - { name: terms, type: "list<{publicId, label, kind: condition|symptom|treatment|medicine}>", required: true, constraints: "doctors and reviews tabs; terms with at least one published account" }

  - id: ENT-006
    name: CompareCardVM
    owner: U19 T-206 (web-local; server/actions/compare.ts)
    description: "One compare column, mapped from DoctorProfileVM on the server. Doctor fields only."
    attributes:
      - { name: publicId, type: string, required: true }
      - { name: name, type: string, required: true }
      - { name: specialty, type: string, required: false }
      - { name: city, type: string, required: false }
      - { name: sentiment, type: DistributionVM, required: true, constraints: "unscoped" }
      - { name: outcome, type: DistributionVM, required: true }
      - { name: conditions, type: "list<{name, count}>", required: true, constraints: "may be empty" }
      - { name: accountsLimitedData, type: boolean, required: true }

  - id: ENT-007
    name: PinnedDoctor
    owner: U19 T-206 (CompareProvider client state)
    description: "A pinned doctor in the tray."
    attributes:
      - { name: publicId, type: string, required: true }
      - { name: name, type: string, required: true, constraints: "from the result card or the server's validated pins" }
    constraints: "at most 3, unique, in pin order; mirrored in ?compare= with history.replaceState; none when compareTray is off"

  - id: ENT-008
    name: SearchState
    owner: U19 T-206 (the URL; lib/search-params.ts)
    description: "The clean state parsed from searchParams, the only input of every href."
    attributes:
      - { name: q, type: string, required: true, constraints: "as typed, at most 200 code points; empty = browse" }
      - { name: tab, type: "enum all|doctors|facilities|conditions|reviews", required: true, constraints: "default doctors" }
      - { name: sort, type: "enum relevance|volume|recent|alphabetical", required: true, constraints: "default relevance" }
      - { name: exact, type: boolean, required: true, constraints: "URL '1' only" }
      - { name: page, type: integer, required: true, min: 1 }
      - { name: filters, type: "{specialty?, city?, language?, gender?, term?, sentiment?, outcome?, facilityType?, documents?, claimed?, provenance?}", required: true, constraints: "only the active tab's fields (BR3.3)" }
      - { name: compare, type: "list<publicId>", required: true, constraints: "at most 3; empty when compareTray is off" }
    relationships:
      - { to: SearchResultsVM, cardinality: "one-to-one", direction: "SearchState requests results" }

  - id: ENT-009
    name: SearchQueryInput (as sent by toQueryInput)
    owner: Search (U18 T-205; contracts/src/schemas/search.ts)
    description: "What the page sends: one call per request."
    attributes:
      - { name: "q, tab, sort, exact, page", type: "as SearchState", required: true }
      - { name: pageSize, type: integer, required: false, constraints: "20 (the default)" }
      - { name: "filters.specialty, city, language, gender, sentiment, outcome, facilityType, provenance", type: "as SearchState", required: false }
      - { name: "filters.term, filters.termKind", type: "publicId, enum", required: false, constraints: "termKind from the chosen option's kind" }
      - { name: filters.hasEvidence, type: boolean, required: false, constraints: "doctors documents=has -> true, none -> false; reviews documents=none -> false" }
      - { name: filters.evidenceGroup, type: "enum reviewed|later|outcome|both", required: false, constraints: "reviews tab only" }
      - { name: filters.claimed, type: boolean, required: false, constraints: "claimed=yes|no" }

  - id: ENT-010
    name: Runtime settings read
    owner: Administration (U12 T-105; getConfig())
    description: "Read once per request with (await getConfig())."
    attributes:
      - { name: limitedDataThreshold, type: integer, required: true, min: 2, max: 50, constraints: "default 5; passed to the primitives" }
      - { name: featureVisibility.facilityAccounts, type: boolean, required: true, constraints: "false narrows the facilities sort menu (BR2.1)" }
      - { name: featureVisibility.compareTray, type: boolean, required: true, constraints: "false removes the compare feature (BR5.10)" }

  - id: ENT-011
    name: Shared component contracts used
    owner: "U15 T-202, U16 T-203, U45 T-011, T-008"
    description: "Props this Unit passes; their files are not edited here."
    attributes:
      - { name: DoctorEntry, type: "{card, headingLevel: 3, threshold, pinSlot?: ReactNode}", required: true }
      - { name: FacilityEntry, type: "{card, headingLevel: 3, threshold}", required: true }
      - { name: AccountRow, type: "{card, headingLevel: 3}", required: true }
      - { name: BrowseCard, type: "{href, title, sub: string}", required: true }
      - { name: "NotVerified, SentimentBlock, OutcomeBlock", type: "{} / {dist, threshold}", required: true }
      - { name: Reveal, type: "{as, className, children}", required: true, constraints: "components/patient/motion/Reveal.tsx; keyed by the results key" }
      - { name: "Sheet, useAnnounce", type: "{open, title, onClose, children} / () => (text) => void", required: true }

  - id: ENT-012
    name: Message keys added (en and bn, one commit, Bengali flagged per FD-042)
    owner: U19 T-206 (packages/i18n/messages)
    description: "Exact English; the Bengali is drafted at Code Generation and flagged for the owner's bilingual review."
    attributes:
      - { name: results.tabAll, type: key, required: true, constraints: "All / সব" }
      - { name: results.tabReviews, type: key, required: true, constraints: "Experiences / অভিজ্ঞতা" }
      - { name: results.countAll, type: "key {n, count}", required: true, constraints: "{n, plural, one {{count} result} other {{count} results}} / {count}টি ফলাফল" }
      - { name: results.countDoctors, type: "key {n, count}", required: true, constraints: "{n, plural, one {{count} doctor matches} other {{count} doctors match}} / {count} জন ডাক্তার মিলেছে" }
      - { name: results.countFacilities, type: "key {n, count}", required: true, constraints: "{n, plural, one {{count} facility matches} other {{count} facilities match}} / {count}টি প্রতিষ্ঠান মিলেছে" }
      - { name: results.countConditions, type: "key {n, count}", required: true, constraints: "{n, plural, one {{count} health topic matches} other {{count} health topics match}} / {count}টি স্বাস্থ্য বিষয় মিলেছে" }
      - { name: results.countReviews, type: "key {n, count}", required: true, constraints: "{n, plural, one {{count} experience matches} other {{count} experiences match}} / {count}টি অভিজ্ঞতা মিলেছে" }
      - { name: results.showAll, type: "key {count}", required: true, constraints: "Show all {count} / সব {count}টি দেখুন" }
      - { name: results.pager.label, type: key, required: true, constraints: "Result pages / ফলাফলের পাতা" }
      - { name: results.pager.prev, type: key, required: true, constraints: "Previous page / আগের পাতা" }
      - { name: results.pager.next, type: key, required: true, constraints: "Next page / পরের পাতা" }
      - { name: results.pager.range, type: "key {from, to, total}", required: true, constraints: "{from}–{to} of {total} / {total}টির মধ্যে {from}–{to}" }
      - { name: sort.alphabetical, type: key, required: true, constraints: "Alphabetical / বর্ণানুক্রমে" }
      - { name: search.didYouMeanPrompt, type: key, required: true, constraints: "Did you mean: / আপনি কি এটি খুঁজছেন:" }
      - { name: filter.term, type: key, required: true, constraints: "Health topic, symptom, treatment or medicine / স্বাস্থ্য বিষয়, উপসর্গ, চিকিৎসা বা ওষুধ" }
      - { name: filter.facilityType, type: key, required: true, constraints: "Facility type / প্রতিষ্ঠানের ধরন" }
      - { name: filter.documents.has, type: key, required: true, constraints: "Has documents / কাগজপত্র আছে" }
      - { name: filter.documents.both, type: key, required: true, constraints: "Both treatment paths documented / দুই চিকিৎসারই কাগজপত্র আছে" }
      - { name: filter.claimed, type: key, required: true, constraints: "Profile claimed / প্রোফাইল দাবি করা হয়েছে" }
      - { name: filter.claimed.yes, type: key, required: true, constraints: "Claimed / দাবি করা হয়েছে" }
      - { name: filter.claimed.no, type: key, required: true, constraints: "Not claimed / দাবি করা হয়নি" }
      - { name: filter.claimedNote, type: key, required: true, constraints: "Claiming a profile does not verify registration. / প্রোফাইল দাবি করলে নিবন্ধন যাচাই হয় না।" }
      - { name: filter.provenance, type: key, required: true, constraints: "Information source / তথ্যের উৎস" }
      - { name: filter.apply, type: key, required: true, constraints: "Apply filters / ফিল্টার প্রয়োগ করুন" }
    constraints: "24 new keys. Reused unchanged: search.*, results.tabDoctors, results.tabFacilities, results.none, results.noneBody, nav.results, nav.condition, nav.viewDoctor, brand.name, filter.* (title, note, clear, any, specialty, location, sentiment, outcome, gender.*, language, evidence), sort.*, compare.*, condition.accounts, condition.provisional, label.noDocuments, label.limitedData, evidence.status, evidence.group.*, facility.type.*, prov.*, compose.tagGroup.* (topic optgroups), sentiment.*, outcome.*, errors.common.internal; T-202's sentiment.totalAccounts; T-203's index keys. filter.condition stays (the legacy label); results.count stays unused (S4 row)."
```

## Sources

- T-205 draft `functional-spec.md` § 8 and `entities.md`; `packages/contracts/src/schemas/search.ts`, `view-models/search.ts`, `enums.ts` (`PROVENANCES`, `FACILITY_TYPES`, `SENTIMENTS`, `OUTCOMES`, `EVIDENCE_GROUPS`), `ids.ts`, `config-values.ts` on `main`.
- T-201 draft § 7 (cards, `DoctorProfileVM`); T-202 and T-203 drafts `frontend-components.md`; T-105 draft `entities.md` (`featureVisibility`); T-011 `Reveal`; `components/shared/Sheet.tsx`.
- `packages/i18n/messages/{en,bn}.json` (existing keys listed above).
