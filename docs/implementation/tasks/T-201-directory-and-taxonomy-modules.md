# T-201 — Directory and taxonomy modules (queries, repositories, view models)

| Field | Value |
|---|---|
| Story | STORY-DIR-001, STORY-DIR-003, STORY-SRCH-003 (read side), STORY-REV-004 (aggregate policy) |
| Phase / Lane | 2 / A |
| Class → model | M1 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: the other vendor's mid-tier |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-005 (schema), T-007 (seed corpus), T-003 (contracts) |
| Parallel-safe with | T-101, T-102, T-103, T-104, T-207 (no shared files); **not** with T-204 (same module folders) |

## Goal

Make every doctor, facility, branch and condition readable from PostgreSQL through typed queries and
view models that reproduce exactly what the prototype's `renderProfile`, `renderFacility`,
`renderCondition`, `doctorEntry`, `facilityEntry` and the three index renderers need — including
per-field provenance, omission of empty fields, the unconditional "Registration not verified" flag,
and distributions that always carry a denominator. Commands (submit/claim/merge) are T-204.

## Read first

1. `docs/implementation/01-conventions.md` §1–§5, §10
2. `docs/implementation/02-data-model.md` §0, §4, §5, §6 (only the aggregate note under the table), §17 (publication state)
3. `docs/implementation/03-routes-and-contracts.md` §2, §3 (Repositories, ConfigProvider), §4 "directory", "taxonomy", and the `review.sentimentDistribution / outcomeDistribution / criteriaDistribution` lines under "review" (these three queries are yours — see Owned paths)
4. Prototype data selectors, `ui-design-prototype/shared/rogikotha-data.js`: `reviewsFor` (1397), `distribution` (1407), `sentimentOf/outcomeOf` (1424), `conditionsFor` (1427), `evidenceCount` (1434), `hash`/`avatar` (1439–1477), `criteriaDist` (1573), `facilitiesForDoctor`, `doctorsForFacility`, `branchesOf` (1588–1600), `relatedByCondition` (1620), `conditionAccounts`, `doctorsForCondition`, `tagFrequency` (1635–1660)
5. Prototype renderers that consume the VMs (read only for field lists): `renderProfile` 679–803, `renderFacility` 1227–1330, `renderCondition` 1076–1226, `doctorEntry` 615, `facilityEntry` 636, `accountRow` 527, `renderDoctorIndex/FacilityIndex/TopicIndex` 1754–1797 in `…/concept-04b-quiet-clinic-minimal/app.js`
6. `PRODUCT.md` "Hard rules"

## Owned paths

Create/modify only:

- `packages/domain/src/directory/{doctor.ts,facility.ts,policies.ts,index.ts}`
- `packages/domain/src/taxonomy/{term.ts,policies.ts,index.ts}`
- `packages/domain/src/review/policies.ts` — **only** `isLimitedData(total, threshold)` and `distribution(values, keys)`; T-301 owns the rest of `domain/review`
- `packages/application/src/modules/directory/queries/*.ts`, `packages/application/src/modules/directory/index.ts`
- `packages/application/src/modules/taxonomy/queries/*.ts`, `…/taxonomy/index.ts`
- `packages/application/src/modules/review/queries/{sentiment-distribution.ts,outcome-distribution.ts,criteria-distribution.ts,list-experience-cards.ts}` (T-301 must not rewrite these; it may add siblings)
- `packages/application/src/ports/repositories/{directory.ts,taxonomy.ts}` and the read methods of `review.ts` listed in Steps 3
- `packages/contracts/src/view-models/{doctor.ts,facility.ts,condition.ts,experience-card.ts}` (fill the `TODO(T-201)` markers T-003 left)
- `packages/database/src/repositories/{directory.ts,taxonomy.ts}` and the read methods of `review.ts`
- Tests under the same packages (`*.test.ts`, `*.int.test.ts`)

## Not in scope

- Any command (`directory.submitProfile`, `claimProfile`, merges, field changes) → T-204
- Search documents, aliases table refresh, ranking → T-205
- `ExperiencePageVM` and everything on the single experience page → T-301/T-307
- React components → T-202, T-203
- Seeding (T-007 already loads the corpus; if a column you need is not seeded, add it to the "Questions for the human" section instead of editing the seed)

## Steps

1. **Domain policies.** In `domain/review/policies.ts` write `distribution(values: string[], keys: readonly string[]) → { counts, total, empty, limited? }` reproducing `distribution()` in the data file (a value outside `keys` is ignored; `total` counts only recognised values) and `isLimitedData(total, threshold) → total > 0 && total < threshold`. `pct` is **not** exported — the UI never shows a percentage without its count. In `domain/directory/policies.ts` write `omitEmptyFields(fields)` (drops `null`, `''`, empty arrays) and `registrationNotVerified = () => true as const` with a comment citing D-003/FD binding. In `domain/taxonomy/policies.ts` write `normalizeAliasKey(text)` = NFC → lowercase → strip spaces/punctuation (the same function T-205 will import; do not duplicate it later).
2. **Repository ports.** `DirectoryRepository`: `findDoctorByPublicId`, `listDoctors({page, pageSize, sort:'name'})`, `findBranchByPublicId`, `listBranches`, `branchesOfFacility(facilityId)`, `doctorsAtBranch(branchId)`, `branchesForDoctor(doctorId)` (via `doctor_chambers.branch_id`), `chambersOf(doctorId)`, `findRedirect(fromPublicId)` (read only; T-204 writes). `TaxonomyRepository`: `findTermByPublicId`, `listTerms(kind)`, `aliasesOf(termId)`, `findByAlias(aliasKey)`. `ReviewRepository` read methods: `publishedForDoctor(doctorId, {termId?})`, `publishedForBranch(branchId)` (facility_reviews), `publishedForTerm(termId)`, `conditionCountsForDoctor(doctorId)` (group by review_tags.term_id where group='condition'), `doctorCountsForTerm(termId)`, `tagFrequencyForTerm(termId, group)` (counts distinct review per tag label: `coalesce(term name, free_text)`), `readyEvidenceCountForDoctor(doctorId)` (evidence_items.state = 'published' joined through reviews), `listRecentCards(limit)`. Every read applies `state = 'published'` in SQL.
3. **Drizzle repositories.** Implement the ports in `packages/database/src/repositories/`. Use joins, not N+1 loops. `doctorCountsForTerm` must count reviews, not tags (a review with the condition tagged twice counts once).
4. **View models** (fill T-003's stubs):
   - `DoctorCardVM` — `{publicId, name, specialty, area, city, avatarHue, topConditions: [{publicId, name, count}] (max 3), documentsCount, sentiment: DistributionVM, registrationNotVerified: true}`. `avatarHue = hash(publicId) % 360` using the FNV-1a `hash` from the data file, ported into `contracts/ids.ts` as `stableHue(seed)`.
   - `DistributionVM` — `{counts: Record<key, number>, total, empty, limited, keys: readonly string[]}` (keys in render order, e.g. `['positive','mixed','negative']`).
   - `DoctorProfileVM` — card fields plus `accountsTotal`, `claimed`, `facts: [{key: 'bmdc'|'specialty'|'qualifications'|'languages'|'fee', value, provenance}]` **only for populated fields**, `chambers: [{name, hours, provenance, branchPublicId?}]`, `conditions: [{publicId, name, count}]` sorted by count desc, `breakdown: [{condition, sentiment: DistributionVM}]`, `facilities: [{publicId, name, type}]` (branches where the doctor has a chamber), `accounts: ExperienceCardVM[]` (filtered — see step 5), `scopedSentiment`, `scopedOutcome` (for the selected condition), `showing`, `scopedTotal`.
   - `FacilityCardVM` — `{publicId, name, branchName?, parentName?, type, area, city, avatarHue, accountsTotal, overall: DistributionVM}` (`overall` = `criteria_distribution(branchId,'overall')`).
   - `FacilityProfileVM` — card fields plus `provenance.name`, `criteria: [{key, dist: DistributionVM}]` for all nine `criterion` values in enum order, `accounts: FacilityAccountVM[]` (`{publicId, author: BylineVM, period, posted, body, overall?, criteria: [{key, value}]}`), `doctorsHere: [{publicId, name, specialty, avatarHue}]`, `siblings: [{publicId, branchName, area, avatarHue}]`.
   - `ConditionPageVM` — `{publicId, name, aliases: string[], accountsTotal, doctorsTotal, specialties: [{name, count}] (top 3 by account count), places: [{hospital?: string, area, city, count}] sorted desc (hospital = the doctor's first chamber name, `undefined` → the UI prints "Not provided"), sentiment, outcome, medicines/treatments/symptoms: [{label, count}] (tagFrequency per group; `max` computed in UI), accounts: ExperienceCardVM[], doctors: [{publicId, name, specialty, count, primaryChamber?, area, city, avatarHue}], facilities: [{publicId, name, type, avatarHue}]}`.
   - `ExperienceCardVM` — what `accountRow` needs: `{publicId, title, excerpt (190 graphemes, Intl.Segmenter), sentiment?, outcome?, condition: {publicId, name}, documentsCount, author: BylineVM, relationship, period: {year, month}, doctor: {publicId, name}}`. `BylineVM = {personaKind: identity_mode, displayName?, username?, initials?}` — for `anonymous` the VM carries **no** name at all.
   - `TopicIndexVM` — `[{publicId, name, accountsTotal}]` including zero-count topics (the prototype deliberately lists empty topics).
5. **Queries** (`defineQuery`, all locale-aware: pass `locale` and pick `*_en`/`*_bn` in the repository mapper; VMs carry the resolved string, never both):
   `directory.getDoctor({publicId, condition?, outcome?, relationship?, docs?})`, `directory.listDoctors({page})`, `directory.getFacility({publicId})`, `directory.listFacilities({page})`, `taxonomy.getCondition({publicId})`, `taxonomy.listConditions()`, `taxonomy.resolve({text})` (exact alias-key match only here; fuzzy is T-205), `review.sentimentDistribution({doctorId, termId?})`, `review.outcomeDistribution({doctorId, termId?})`, `review.criteriaDistribution({branchId, key})`, `review.listExperienceCards({limit, cursor?, doctorId?, termId?})`. `limited` is computed with `ConfigProvider.current().limitedDataThreshold`.
6. **Redirect lookup.** `directory.resolvePublicId({kind, publicId}) → {publicId, redirected: boolean}` reading `profile_redirects` so T-202/T-203 pages can 301.
7. **Tests** (see below), then `pnpm check`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Seeded doctor d1 profile | `pnpm vitest run packages/application -t "doctor profile"` | facts list omits empty fields; `registrationNotVerified === true`; `facts` provenance matches seed `field_provenance` |
| Facility feedback isolation | `pnpm vitest run packages/database -t "never enters doctor"` | adding 20 `facility_reviews` at a branch where d1 practises leaves `review.sentimentDistribution(d1)` unchanged |
| Limited data threshold | `pnpm vitest run packages/domain -t "limited"` | total 4 with threshold 5 → `limited: true`; total 5 → false; total 0 → `empty: true, limited: false` |
| Hidden content excluded | `pnpm vitest run packages/database -t "hidden"` | a review set to `hidden_pending_review` disappears from `publishedForDoctor`, counts and `listRecentCards` |
| Zero-count topics listed | `pnpm vitest run -t "topic index"` | `taxonomy.listConditions` returns all 8 seed conditions, two with `accountsTotal: 0` |
| Locale mapping | `pnpm vitest run -t "locale"` | `getDoctor` in `bn` returns Bengali names and no `_en` keys anywhere in the VM (deep assertion) |
| No private data in VMs | `pnpm vitest run -t "projection"` | JSON of every VM contains no `accountId`, `email`, `reporter`, `originalFilename` keys |
| Full check | `pnpm check` | green |

## Tests to write

- domain: `distribution` table tests (all keys zero, unknown values ignored, limited boundary); `omitEmptyFields`; `normalizeAliasKey` on Bengali (NFC composed vs decomposed input yield the same key) and Banglish.
- application (fakes): each query happy path in both locales; `getDoctor` filters (`condition`, `outcome`, `relationship`, `docs`) applied cumulatively and `showing/scopedTotal` correct.
- database (`.int.test.ts` against compose PostgreSQL): repositories against the seed; facility isolation; hidden exclusion; `doctorCountsForTerm` counts reviews once; `tagFrequencyForTerm` groups by label.

## Hard-rule checklist

- [ ] No number stands for quality: `DistributionVM` exposes counts + total only; no `pct`, no average, no combined score anywhere in owned paths.
- [ ] Missing values are omitted from `facts`/`chambers` (UI renders "Not provided"); no `0` substituted.
- [ ] `limited` derives from the configured threshold, not a constant.
- [ ] `registrationNotVerified` is `true` for every doctor regardless of `bmdc_number`.
- [ ] Facility feedback never touches doctor aggregates (SQL-level test).
- [ ] Only `published` content enters any VM.
- [ ] `BylineVM` for anonymous personas carries no name, username or account link.
- [ ] Both locales resolved in the mapper; no `_en`/`_bn` leaks.
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence


## Addendum

Also own `taxonomy.listSuggested` (`03-routes-and-contracts.md` §4 "taxonomy") reading `taxonomy_terms.suggested = true`, and the `avatarHue` field on doctor/facility view models (from the new `avatar_hue` columns, `02-data-model.md` §4).
