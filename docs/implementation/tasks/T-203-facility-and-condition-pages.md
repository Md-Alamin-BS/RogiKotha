# T-203 — Facility index/profile and condition index/page (port)

| Field | Value |
|---|---|
| Story | STORY-DIR-003, STORY-SRCH-003, STORY-REV-004 |
| Phase / Lane | 2 / B |
| Class → model | M2 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1–1.5 h |
| Depends on | T-201, T-008, **T-202** (shared primitives `Byline`, `DistBlock`, `OutcomeBlock`, `AccountRow`, `Avatar`, `MiniList`, `IndexHead`, `Badge`), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-204, T-205, T-207 (T-207 must not touch `components/patient/shared`) |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`, `Reveal`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-203 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Read first, the motion step and the acceptance checks.

## Amendments — release 1 (FD-105)

These decisions are binding and override the text below where they differ. Release 1 builds this task inside Unit U46 `u46-directory`, together with T-201 and T-202 (FD-105; record: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/`).

- **Paths as built** — routes `apps/web/src/app/[locale]/(patient)/{facilities,topics}/page.tsx` and `…/[id]/page.tsx`, each reading a `cache()`d loader in `load.ts` beside it; components in `apps/web/src/components/patient/{facilities,topics}/` (`FacilityIndex`, `FacilityEntry`, `FacilityProfile`, `FacilityAccountRow`, `TopicIndex`, `ConditionPage`, `PlacesPanel`, `FreqList`) and `BrowseCard` and `EmergencyPanel` (with `compact`) in `components/patient/shared/`. Changes: Owned paths and Steps.
- **FD-107** — facility feedback is the nine criteria, each a good, mixed and poor distribution with its denominator; no facility sentiment, and it never enters a doctor's figures. **FD-106** — counts, never percentages.
- **FD-108** — a branch is titled by its own name (`facility_branches.own_name_*`), else its organisation; `name` shows as the label when it differs, and "Part of" the organisation when it differs. Changes: steps 1 and 3.
- **FD-101** — condition figures count a review when a tag links the term or its free text equals a name or alias. The topic index lists the 10 seeded conditions (not 8), zero counts included. Changes: the "Empty topics listed" acceptance row.
- **Deferred to release 2 (FD-105)** — the facility visit composer entry ("Describe your visit", `facility.write`), the parent organisation's aggregate page (AC4.3.1 "may"), redirects for mapped terms (F4) and paging (F3).

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
6. `styles.css` (FD-091: only to see which class names T-011 kept; do not copy its rules): `.crit-grid`, `.crit`, `.places-panel`, `.places`, `.pl-*`, `.specs-tag`, `.spec-pill`, `.freq-list`, `.index-grid`, `.browse-card`

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
9. **Motion (FD-091).** Wrap the four pages in `RouteTransition`. `FacilityEntry` lists, `BrowseCard` grids and the frequency panels use `Reveal` (stagger capped at 6 items). The `--w` bars show final values at once. The small emergency panel and the facility-separation callout are never animated (AC2.4.4).

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
| Visual (FD-091) | compare `/en/facilities/{f1}`, `/en/topics/{c1}` with prototype `#facilities/f1`, `#topics/c1` at 1280/390 px | same content, order and states; the look follows T-011 |
| Full check | `pnpm check` | green |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |

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
