# T-203 — Facility index/profile and condition index/page (port)

| Field | Value |
|---|---|
| Story | STORY-DIR-003, STORY-SRCH-003, STORY-REV-004 |
| Phase / Lane | 2 / B |
| Class → model | M2 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1–1.5 h |
| Depends on | T-201, T-008, **T-202** (shared primitives `Byline`, `DistBlock`, `OutcomeBlock`, `AccountRow`, `Avatar`, `MiniList`, `IndexHead`, `Badge`) |
| Parallel-safe with | T-204, T-205, T-207 (T-207 must not touch `components/patient/shared`) |

## Goal

Port `renderFacilityIndex`, `renderFacility`, `renderTopicIndex` and `renderCondition` into
`/{locale}/facilities`, `/{locale}/facilities/{publicId}`, `/{locale}/topics`, `/{locale}/topics/{publicId}`,
reading `FacilityCardVM`, `FacilityProfileVM`, `TopicIndexVM`, `ConditionPageVM` from T-201.

## Read first

1. `docs/implementation/01-conventions.md` §6–§9, §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (facilities/topics rows)
3. `docs/implementation/tasks/T-202-doctor-index-and-profile.md` step 1 (the primitives you import — do not re-implement)
4. Prototype `app.js`: `facilityEntry` 636–652, `renderFacility` 1227–1330, `renderCondition` 1076–1226 (including the two comments about places and specialties — port them), `renderFacilityIndex` 1765, `renderTopicIndex` 1779–1797 (port its comment), `titleForView` cases `facilities`, `facility`, `topics`, `condition`
5. `rogikotha-data.js`: `criteriaDist` 1573 (comment: "no path from this function to a doctor's summaries"), `branchesOf` 1595, `tagFrequency` 1647 (comment), `CRITERIA`, `CRIT_VALUES`
6. `styles.css`: `.crit-grid`, `.crit`, `.places-panel`, `.places`, `.pl-*`, `.specs-tag`, `.spec-pill`, `.freq-list`, `.index-grid`, `.browse-card`

## Owned paths

- `apps/web/src/app/[locale]/(patient)/facilities/page.tsx`, `facilities/[publicId]/page.tsx`
- `apps/web/src/app/[locale]/(patient)/topics/page.tsx`, `topics/[publicId]/page.tsx`
- `apps/web/src/components/patient/{FacilityIndex.tsx,FacilityProfile.tsx,FacilityEntry.tsx,FacilityAccountRow.tsx,TopicIndex.tsx,ConditionPage.tsx,FreqList.tsx,PlacesPanel.tsx,BrowseCard.tsx}`
- `packages/i18n/messages/{en,bn}.json` — new keys only if a literal has no key (none expected; report if found)
- Component tests for the above

## Not in scope

- Facility-account composer ("Write about this facility" → `/write?facility={publicId}`; composer T-306).
- Search/compare (T-206), discover (T-207), experience page (T-307).
- Any VM change (ask T-201's owner via the hand-off; do not edit `packages/contracts`).

## Steps

1. **`FacilityEntry({card})`** — port `facilityEntry`: `.doc-entry[role=group]`, `.doc-av` Avatar 48 (seed = `publicId`), `<h3>FacilityLink label = name + (branchName ? ' — ' + branchName : '')`, `.doc-sub` `facility.type.{type} · {area}, {city}`, `.doc-flags` = `badge plain {accountsTotal} sentiment.accounts` + (`parentName` ? `badge plain facility.parent {parentName}`), `.doc-side` = `DistBlock(overall, prefix 'crit.', title crit.overall, compact)` with keys `['good','mixed','poor']`.
2. **`/facilities`** — `IndexHead(nav.discover, nav.facilities, index.facilitiesNote)`, `.count-line {n} · nav.facilities`, `.index-list` of `FacilityEntry` sorted by localized name. Metadata title `nav.facilities`.
3. **`/facilities/[publicId]`** — resolve redirect; `directory.getFacility`; 404 when missing/unpublished. Port `renderFacility` in order:
   1. `.panel > .p-hero`: Avatar 118, kicker `facility.type.{type}`, `<h1>` name, `.p-spec` `(branchName · )area, city`, `.p-flags` (`badge plain {accountsTotal} sentiment.accounts`, `.prov[data-p]` `prov.{provenance.name}`, parent badge), `.btn` Link `/write?facility=` `facility.write`.
   2. `.callout.warn` **`facility.separation`** in bold (the hard-rule sentence).
   3. `.p-grid` left: criteria panel `facility.criteria` → `.crit-grid` of nine `.crit` blocks in enum order, each `<h4>crit.{key}` + `DistBlock(dist, 'crit.', null)` (non-compact, no title) + for `reportTrust` the denominator `crit.reportTrustNote`.
   4. `<h2 class="section-head">facility.accounts` then `FacilityAccountRow` per account: `.acct` → `.row-flags` (overall badge `badge {overall}` text `crit.{overall}` or `badge plain label.notProvided`; `badge plain review.episodeDate: {period}`), `Byline variant="row" when={posted}`, `.excerpt` full body, then the tag row (`<span class="tag">crit.{k}: crit.{v}</span>` for each criterion present — keep the prototype's inline flex style as an added class `.crit-tags` in `patient.css` with `/* added: T-203 */`).
   5. `aside.p-side`: doctors-here panel (`facility.doctorsHere`, MiniList of `{name, specialty}`, note `facility.doctorsNote`) when non-empty; siblings panel (`facility.branch`, MiniList `{branchName, area}`) when non-empty.
4. **`BrowseCard({href, title, sub})`** → `a.browse-card > b + span` (prototype used `<button data-condition>`; it navigates, so it is a link). T-207 reuses it for the discover grid — export from `components/patient/BrowseCard.tsx`.
5. **`/topics`** — `IndexHead(nav.discover, nav.condition, index.topicsNote)`, `.count-line {n} · nav.condition`, `.index-grid` of `BrowseCard` for **every** term of kind `condition` (including zero counts → sub = `index.emptyTopic`), sorted by localized name. Port the comment explaining why empty topics are listed.
6. **`/topics/[publicId]`** — `taxonomy.getCondition`; 404 when missing. Port `renderCondition` in order:
   1. `.a-head`: kicker `nav.condition`, `<h1 class="display">` name, `.note` `condition.alsoCalled: a · b · c` (aliases as given), `.lede` `{accountsTotal} sentiment.accounts · {doctorsTotal} condition.doctors(lowercased)`, `.specs-tag` row (kicker `condition.specialtyTag` + `.spec-pill {name} · {count}` for top 3) when non-empty.
   2. `PlacesPanel` (`.panel.places-panel`, `condition.treatedAt`, note `condition.treatedAtNote`, `ul.places` li = `.pl-name` hospital or `.pl-name.pl-unk label.notProvided`, `.pl-loc` area `·` city, `.pl-n` count) when non-empty.
   3. `.p-grid` left: across-all panel (`condition.acrossAll`, `SentimentBlock`, `OutcomeBlock`); `FreqList` for medicines (`condition.medicines`), treatments (`condition.treatments`), symptoms (`condition.symptoms`) — each `.panel` with `ul.freq-list` li = label, `.track > i style="--w:{count/max}"`, `.n` count, denominator `condition.mentionNote`; omitted when empty; `.callout` `<b>condition.provisional</b>condition.provNote`; `<h2 class="section-head">condition.accounts` + `AccountRow` list.
   4. `aside.p-side`: doctors panel (`condition.doctors`, MiniList rows with `{name}`, sub `{specialty} · {count} sentiment.accounts`, `.mini-loc` `(primaryChamber · )area · city`, note `sort.whyBody`); facilities panel (`condition.facilities`) when non-empty; the small emergency panel (`.panel` with danger border, `<h2>emergency.title`, `.note emergency.body`) — reuse `EmergencyPanel` with a `compact` prop added in `components/patient/shared/EmergencyPanel.tsx` (`/* added: T-203 */` if a class is needed).
7. Metadata titles: facility name / condition name / `nav.facilities` / `nav.condition`; all indexable.
8. `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`, `pnpm check`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Nine criteria always rendered | `pnpm vitest run apps/web -t "nine criteria"` | 9 `.crit` blocks in enum order even when all are empty (each shows `label.notProvided`) |
| Facility separation callout | `pnpm vitest run apps/web -t "separation"` | `.callout.warn` text = `facility.separation` present on every branch page |
| Siblings exclude self | `pnpm vitest run apps/web -t "siblings"` | branch page of a multi-branch facility lists the other branches only |
| Empty topics listed | `pnpm vitest run apps/web -t "TopicIndex"` | 8 cards; zero-count ones show `index.emptyTopic` |
| Places sorted, unknown hospital | `pnpm vitest run apps/web -t "places"` | descending by count; missing hospital renders `label.notProvided` with class `pl-unk` |
| Freq bars relative to max | `pnpm vitest run apps/web -t "FreqList"` | first row `--w:1`; panel absent when list empty |
| Locales | `pnpm vitest run apps/web -t "bn"` | all four pages render in `bn` with Bengali digits and no English fallback text |
| Impeccable + contrast | `npx impeccable detect apps/web/src --no-advisory && pnpm contrast` | zero findings |
| Visual | compare `/en/facilities/{f1}`, `/en/topics/{c1}` with prototype `#facilities/f1`, `#topics/c1` at 1280/390 px | faithful |
| Full check | `pnpm check` | green |

## Tests to write

Component tests in both locales for `FacilityEntry`, `FacilityProfile` (order, nine criteria, separation callout, siblings, doctors-here), `FacilityAccountRow` (overall missing → not provided badge; criteria tags only for present keys), `TopicIndex`, `ConditionPage` (order, specs row, places, freq lists, provisional callout, emergency aside), `BrowseCard`.

## Hard-rule checklist

- [ ] Facility criteria come from `criteriaDistribution` (facility accounts) only; nothing on a facility page reads doctor sentiment and nothing on a doctor page reads criteria.
- [ ] Every distribution has count + denominator; frequency lists say `condition.mentionNote`.
- [ ] Missing overall/hospital → "Not provided".
- [ ] Neutral ordering (alphabetical indexes; places/frequency by count are *mentions*, labelled as such).
- [ ] Provisional-term callout present on condition pages.
- [ ] Anonymous byline rules preserved via the shared `Byline`.
- [ ] Both locales; formatter numerals.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
