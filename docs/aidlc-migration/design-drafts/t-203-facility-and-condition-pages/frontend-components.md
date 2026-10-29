# Frontend components — U16 `t-203-facility-and-condition-pages`

Component-level design for `functional-spec.md` (workflows WF1–WF8) and `rules.md` (BR1.1–BR9.4). It follows the recommended option of every question in `functional-design-questions.md`; Question 1 (FR49's sentiment model) awaits the owner and changes nothing here under its options A and C. Upstream: U14 T-201's view models and queries, U15 T-202's shared primitives (with the four additive changes of Question 11), U45 T-011's tokens, classes, `Reveal`, `RouteTransition` in the layout and static groups, T-008's `ViewShell`.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                         T-008/T-011: SkipLink, DemoMarker, Masthead, main > RouteTransition, Colophon
│
├── facilities/page.tsx                      server; WF1
│   └── ViewShell view="facilities" title=""
│       └── FacilityIndex {cards, total, threshold}
│           ├── IndexHead {nav.discover, nav.facilities, index.facilitiesNote}       h1.display
│           ├── p.note.count-line            "{n} · Hospitals & clinics"
│           └── Reveal as="div" className="index-list"
│               └── FacilityEntry {card, headingLevel: 2, threshold}  ×n
│                   ├── span.doc-av > Avatar 48
│                   ├── h2 > FacilityLink (label "{name} — {branchName}")
│                   ├── p.doc-sub            "{type} · {area}, {city}"
│                   ├── span.doc-flags > Badge "Not verified" · Badge "{n} patient experiences" | "No one has written…" · [Badge Limited data]
│                   └── span.doc-side > DistBlock(overall, 'crit.', compact, title crit.overall) · {pinSlot}
│
├── facilities/[publicId]/page.tsx           server; WF2–WF3
│   └── ViewShell view="facility" title=""
│       └── FacilityProfile {vm, threshold, locale}
│           ├── section.panel > div.p-hero
│           │   ├── span.p-av > Avatar 118
│           │   ├── span.kicker type · h1 name · p.p-spec "{branchName} · {area}, {city}"
│           │   ├── div.p-flags > Badge Not verified (+ sr-only why) · [Badge accounts] · [Badge Limited data] · span.prov "{source} · {Month Year}"
│           │   └── [Link.btn "Describe your visit" → /write?facility={publicId}]
│           ├── div.callout.warn.facility-sep > b facility.separation                         (static; never in Reveal)
│           └── div.p-grid
│               ├── div (main)
│               │   ├── [section.panel criteria: h2, p.limited (once), div.crit-grid > div.crit ×9 (h3, DistBlock, [limited tag], [reportTrust note])]
│               │   ├── [h2.section-head facility.accounts]
│               │   └── [Reveal as="div" > FacilityAccountRow ×n | div.empty-state]
│               └── aside.p-side [aria-label]
│                   ├── [section.panel doctors here: h2, MiniList > MiniRow ×n, p.note facility.doctorsNote]
│                   └── [section.panel other branches: h2 facility.branch, MiniList > MiniRow ×n]
│
├── topics/page.tsx                          server; WF4
│   └── ViewShell view="topics" title=""
│       └── TopicIndex {cards, total}
│           ├── IndexHead {nav.discover, nav.condition, index.topicsNote}
│           ├── p.note.count-line            "{n} · Health topics"
│           └── Reveal as="ul" className="index-grid"
│               └── li > BrowseCard {href /topics/{publicId}, title name, sub "{n} patient experiences" | index.emptyTopic}  ×n
│
└── topics/[publicId]/page.tsx               server; WF5–WF6
    └── ViewShell view="condition" title=""
        └── ConditionPage {vm, threshold, locale}
            ├── section.a-head
            │   ├── span.kicker nav.condition · [Badge warn condition.provisional] · h1.display name
            │   ├── [p.note "Also written as: a · b · c"]
            │   ├── p.lede condition.countsLine | index.emptyTopic · [Badge Limited data]
            │   └── [p.specs-tag > span.kicker condition.specialtyTag + span.spec-pill ×≤3]
            ├── [PlacesPanel {places, total}]
            └── div.p-grid
                ├── div (main)
                │   ├── section.panel  h2 condition.acrossAll · SentimentBlock · div.dist-gap > OutcomeBlock
                │   ├── [FreqList medicines] · [FreqList treatments] · [FreqList symptoms]
                │   ├── div.callout > b condition.provisional + condition.provNote
                │   ├── h2.section-head condition.accounts
                │   └── Reveal as="div" > AccountRow ×n | div.empty-state (index.emptyTopic + index.beFirst)
                └── aside.p-side [aria-label]
                    ├── [section.panel doctors: h2 condition.doctors, MiniList > MiniRow (sub, loc) ×n, p.note sort.whyBody]
                    ├── [section.panel facilities: h2 condition.facilities, MiniList > MiniRow ×n]
                    └── EmergencyPanel compact                                                  (data-static="emergency")
```

Square brackets mark a block that is left out when it has nothing to show (BR3.10, BR3.11). The layout's `RouteTransition` covers all four pages; none adds one (BR5.1).

## 2. Files

| Path | Change | In T-203's owned paths |
|---|---|---|
| `app/[locale]/(patient)/facilities/page.tsx` | Replace the T-008 placeholder: load `listFacilities`, read the threshold, render `FacilityIndex` | yes |
| `app/[locale]/(patient)/facilities/[publicId]/page.tsx` | New (moved from `[id]/page.tsx`): parse, resolve, load, render `FacilityProfile`; `generateMetadata` | yes |
| `app/[locale]/(patient)/topics/page.tsx` | Replace the placeholder: load `listConditions`, render `TopicIndex` | yes |
| `app/[locale]/(patient)/topics/[publicId]/page.tsx` | New (moved from `[id]/page.tsx`): parse, resolve, load, render `ConditionPage`; `generateMetadata` | yes |
| `app/[locale]/(patient)/{facilities,topics}/[id]/page.tsx` | Removed by `git mv` | **no**: recorded owned-path change (Next.js forbids two slug names at one level) |
| `components/patient/{FacilityIndex,FacilityProfile,FacilityEntry,FacilityAccountRow,TopicIndex,ConditionPage,FreqList,PlacesPanel,BrowseCard}.tsx` | New, server | yes |
| `components/patient/ConditionLink.tsx` | New, server (Question 12) | **no**: recorded owned-path addition |
| `components/patient/**/*.test.tsx` (T-203's), `components/patient/facilities-topics.smoke.test.tsx` | New | yes |
| `components/patient/shared/{Badge,DistBlock,EmergencyPanel,FacilityLink}.tsx`, `lib/public-id.ts` | Additive changes of Question 11, only if T-202 merged without them | `EmergencyPanel` compact: yes (the task allows it); the rest **no**, recorded |
| `packages/i18n/messages/{en,bn}.json` | Five new keys (`entities.md` ENT-012) | yes ("new keys only if a literal has no key"; reported in the hand-off) |
| `apps/web/src/styles/patient.css` | Append the T-203 section (§ 7) | yes, by the FD-091 amendment |
| `apps/web/src/server/container.ts` | Wire `taxonomy` queries with Review's `ConditionStats` (T-201 F6), if T-202 did not | **no**: recorded owned-path addition |

No file under `apps/worker`, `packages/{domain,application,database,contracts,test-support}`, `tokens.css` or `motion.css` changes.

## 3. Page components

### 3.1 `facilities/page.tsx` (server)

```text
generateMetadata(): title documentTitle('facilities', t); robots index; alternates {canonical /{locale}/facilities, languages}
FacilityIndexPage():
  locale    = getLocale(); actor = container.actor(locale)
  result    = container.directory.listFacilities({page: 1, pageSize: 50}, actor)    // 10 on the seed
  if !result.ok -> throw (programmer or infrastructure error; Next error boundary)
  threshold = container.config.current().limitedDataThreshold
  return ViewShell(view='facilities', title='') > FacilityIndex({cards: result.data.items, total: result.data.total, threshold})
```

### 3.2 `facilities/[publicId]/page.tsx` (server)

```text
loadFacility = cache(async (locale, segment) => {
  publicId = parseSegment(segment)                          // BR1.2; null -> notFound()
  r = directory.resolvePublicId({kind: 'facility', publicId})
  if not_found -> notFound()                                // BR1.5
  if r.redirected -> permanentRedirect(`/${locale}/facilities/${r.publicId}`)   // 308, BR1.3
  vm = directory.getFacility({publicId}, actor); not_found -> notFound()
  return {vm, threshold: config.current().limitedDataThreshold}
})
generateMetadata({params}): {vm} = loadFacility(...); title `${facilityLabel(vm)} — ${t('brand.name')}`; canonical without slug
Page({params}): ViewShell(view='facility', title='') > FacilityProfile(loadFacility(...))
```

### 3.3 `topics/page.tsx` (server)

```text
generateMetadata(): documentTitle('topics', t); robots index; canonical /{locale}/topics
TopicIndexPage(): result = container.taxonomy.listConditions({}, actor); !ok -> throw
  return ViewShell(view='topics', title='') > TopicIndex({cards: result.data, total: result.data.length})
```

### 3.4 `topics/[publicId]/page.tsx` (server)

```text
loadCondition = cache(async (locale, segment) => {
  publicId = parseSegment(segment)                          // null -> notFound()
  r = taxonomy.resolvePublicId({publicId}); not_found -> notFound()
  if r.redirected -> permanentRedirect(`/${locale}/topics/${r.publicId}`)       // 308, BR1.4 (mapped term)
  vm = taxonomy.getCondition({publicId}, actor); not_found -> notFound()
  return {vm, threshold}
})
generateMetadata: title `${vm.name} — ${t('brand.name')}`
Page: ViewShell(view='condition', title='') > ConditionPage(loadCondition(...))
```

`params` is a promise in Next 16. No `loading.tsx` is added under `facilities/` or `topics/` (a stream would turn the 308 into a meta refresh, T-202 Question 10).

## 4. Shared primitives used (T-202, `components/patient/shared/`)

| Primitive | Used by | With | Change needed (Question 11) |
|---|---|---|---|
| `Avatar` | entries, hero, mini rows | `seed = publicId`, `hue`, 48 / 118 / 38 | — |
| `Badge` | flags, visit rows | `warn` (Not verified, provisional), `plain`, `good`, `mixed`, `poor` | add `good`, `poor` |
| `DistBlock` | criteria grid, facility card | `prefix 'crit.'`, `threshold`, `compact` on the card with `title crit.overall`, `limitedNote 'tag'` in the grid | add `'crit.'`; compact sentence names the title; optional `limitedNote: 'full' \| 'tag'` (default `'full'`) |
| `SentimentBlock`, `OutcomeBlock` | condition page only | `threshold` | — |
| `Byline` | visit rows, account rows | `variant row`, `when` (visit rows) | — |
| `FacilityLink` | `FacilityEntry`, facilities mini rows | `label = facilityLabel(vm)` | export `facilityLabel` |
| `AccountRow` | condition page accounts | `headingLevel 3` | — |
| `MiniList` / `MiniRow` | doctors here, other branches, condition doctors and facilities | `href`, `avatar`, `title`, `sub`, `loc` | — |
| `IndexHead` | both indexes | kicker, title, note | — |
| `EmergencyPanel` | condition aside | `compact` | add `compact` |

`parseSegment` moves to `apps/web/src/lib/public-id.ts` (or wherever T-202 put it) and is imported, not copied.

## 5. Page-level components (`components/patient/`)

### 5.1 `FacilityEntry` (server)

**Props:** `card: FacilityCardVM`, `headingLevel?: 2 | 3` (default 3), `threshold: number`, `pinSlot?: ReactNode`.

`div.doc-entry[role=group][aria-labelledby={headingId}]` > `span.doc-av > Avatar(publicId, avatarHue, 48)` · `span` > `h{level}#{headingId} > FacilityLink(publicId, facilityLabel(card))` · `p.doc-sub` (`facility.type.{type}` · area, city; present parts, BR2.9) · `span.doc-flags` > `Badge warn` `facility.notVerified` with `title` (BR2.5), `Badge plain` `sentiment.totalAccounts` or `index.emptyTopic` when 0 (BR3.10), `Badge plain` `label.limitedData` when `accountsLimitedData` (BR2.7) · `span.doc-side` > `DistBlock(card.overall, 'crit.', title crit.overall, compact, threshold)` + `pinSlot`. No parent badge (Question 3).

### 5.2 `FacilityIndex` (server)

**Props:** `cards`, `total`, `threshold`. `IndexHead`, `p.note.count-line` `{formatNumber(total)} · nav.facilities`, `Reveal as="div" className="index-list"` of `FacilityEntry headingLevel=2`, in the query's order (BR2.10).

### 5.3 `FacilityProfile` (server)

**Props:** `vm: FacilityProfileVM`, `threshold: number`, `locale: Locale`.

Block order is the prototype's (`renderFacility`):

1. **Hero.** `Avatar` 118; `span.kicker` `facility.type.{type}`; `h1` `vm.name`; `p.p-spec` branch name · area, city (BR3.7); `div.p-flags`: `Badge warn` `facility.notVerified` with `aria-describedby` to `span.sr-only` `facility.notVerifiedWhy` (BR4.6); when feedback is visible, `Badge plain` account count (or `index.emptyTopic`) and `Badge plain` `label.limitedData` when `accountsLimitedData`; `span.prov[data-p={source}]` `prov.updatedOn {source: prov.{name.source}, date: Month Year}`; when feedback is visible, `Link.btn` `facility.write` to `/write?facility={publicId}`.
2. **Separation callout.** `div.callout.warn.facility-sep > b` `facility.separation` (BR2.4, BR5.3).
3. **Criteria panel** (feedback visible). `h2` `facility.criteria`; `p.limited` "label.limitedData — label.limitedDataWhy {threshold}" once when `accountsLimitedData` (Question 4); `div.crit-grid` > nine `div.crit` in enum order: `h3` `crit.{key}`, `DistBlock(dist, 'crit.', threshold)` with the panel-level why suppressed (`limitedNote: 'tag'`), `span.limited-tag` `label.limitedData` when `dist.limitedData`, the why line under it only when the facility is not limited, `p.denominator` `crit.reportTrustNote` for `reportTrust` (BR2.12, BR3.1).
4. **Visits** (feedback visible). `h2.section-head` `facility.accounts`; `Reveal as="div"` > `FacilityAccountRow` per account; or `div.empty-state` with `index.emptyTopic` and `index.beFirst` to `/write?facility={publicId}` (BR3.10).
5. **Aside** (only when one of its panels renders). `aside.p-side[aria-labelledby={first panel heading}]`: doctors here when non-empty (`h2` `facility.doctorsHere`; `MiniList` of `MiniRow(href /doctors/{publicId}, Avatar 38, title name, sub specialty when present)`; `p.note` `facility.doctorsNote`); other branches when non-empty (`h2` `facility.branch`; `MiniRow(href /facilities/{publicId}, Avatar 38, title branchName, sub area)`; the current id filtered out, BR3.8).

`DistBlock`'s `limitedNote` is part of the Question 11 widening: `'full'` (default, T-202 behaviour) or `'tag'` (short tag; the caller places the why-text). If U15 prefers not to add it, `FacilityProfile` renders the criteria with `DistBlock` and hides the per-criterion why line through the T-203 rule `.crit .limited { display: none }` when the panel line is present, and adds the tag itself.

### 5.4 `FacilityAccountRow` (server)

**Props:** `account: FacilityAccountVM`, `locale`.

`article.acct[aria-label]` > `div.row-flags` (`Badge {overall}` `crit.{overall}`, or `Badge plain` `label.notProvided`; `Badge plain` `review.episodeDate`: Month Year) · `Byline(author, 'row', when = t('facility.posted', {date: formatMonthYear(posted)}))` · `p.excerpt` full body · `div.crit-tags` > `span.tag` "`crit.{k}`: `crit.{v}`" for each answered criterion (BR2.9). The `article` is labelled with the episode date phrase, because visit rows have no title.

### 5.5 `BrowseCard` (server)

**Props:** `href` (typed route object), `title: string`, `sub: string`.

`Link.browse-card[href]` > `b` title + `span` sub. Used inside `li` by `TopicIndex`; T-207 uses it in its Discover grid (BR4.4, BR8.1).

### 5.6 `TopicIndex` (server)

**Props:** `cards: ConditionCardVM[]`, `total`. `IndexHead`; `p.note.count-line` `{n} · nav.condition`; `Reveal as="ul" className="index-grid"` > `li > BrowseCard` with sub `sentiment.totalAccounts {count}` or `index.emptyTopic` when 0. Every term is listed. The prototype's comment above `renderTopicIndex` ("Unlike the Discover tile grid, this lists EVERY topic including the ones with nothing written about them yet - an empty topic is the strongest invitation to write, and hiding it hides the gap.") is ported as a code comment.

### 5.7 `ConditionPage` (server)

**Props:** `vm: ConditionPageVM`, `threshold`, `locale`.

1. **Head** (`section.a-head`). `span.kicker` `nav.condition`; `Badge warn` `condition.provisional` when `vm.provisional` (Question 7); `h1.display` name; `p.note` `condition.alsoCalled`: aliases joined with " · " when an alias other than the name exists; `p.lede` `condition.countsLine {accounts, doctors}` or `index.emptyTopic` when 0, plus `Badge plain` `label.limitedData` when `accountsLimitedData`; `p.specs-tag` when specialties exist (BR3.4, hidden unit per pill).
2. **`PlacesPanel`** when places exist.
3. **Main column.** Across-all panel (`h2` `condition.acrossAll`, `SentimentBlock(vm.sentiment, threshold)`, `div.dist-gap > OutcomeBlock(vm.outcome, threshold)`); `FreqList` for medicines, treatments, symptoms; the provisional callout (`div.callout > b condition.provisional` + `condition.provNote`); `h2.section-head` `condition.accounts`; `Reveal as="div"` > `AccountRow` per account, or the empty state.
4. **Aside** (`aside.p-side[aria-labelledby={first panel heading}]`; the emergency panel keeps it present on every condition page). Doctors panel when non-empty (`MiniRow` title name, sub "{specialty} · " + `sentiment.totalAccounts {count}`, loc primaryChamber · area · city from present parts; `p.note` `sort.whyBody`); facilities panel when non-empty (title `facilityLabel`, sub `facility.type.{type}`); `EmergencyPanel compact`.

The prototype's two comments above the places and specialties code in `renderCondition` are ported as comments in `PlacesPanel` and in the head's specialty row.

### 5.8 `PlacesPanel` (server)

**Props:** `places`, `total`. `section.panel.places-panel` > `h2` `condition.treatedAt` · `p.note.places-note` `condition.treatedAtNote` · `ul.places` > `li` (`span.pl-name` hospital or `span.pl-name.pl-unk` `label.notProvided`; `span.pl-loc` area, `span.pl-sep` ·, city from present parts; `span.pl-n` count + `span.sr-only` unit) · `p.denominator` `condition.countedFrom {total}` (BR3.3, BR3.5).

### 5.9 `FreqList` (server)

**Props:** `title: string`, `rows: {label, count}[]`, `total: number`. Returns nothing when `rows` is empty. `section.panel` > `h2.freq-head` title · `Reveal as="ul" className="freq-list"` > `li` (`span` label, `span.track[aria-hidden] > i style={cssVars({'--w': count / max})}`, `span.n` count + sr-only unit) · `p.denominator` `condition.mentionNote` · `p.denominator` `condition.countedFrom {total}` (BR3.2, BR3.5). The data file's comment above `tagFrequency` ("Counted from what authors actually wrote. Frequency is not a recommendation and is never presented as one.") is ported.

### 5.10 `ConditionLink` (server, Question 12)

**Props:** `publicId?: string`, `name: string`. With a public id: `Link.link-btn.name-link[title=nav.condition]` to `/topics/{publicId}`; without one: `span` with the name. Not used on T-203's pages; exported for T-307.

## 6. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn/facilities` | 10 cards in Bengali alphabetical order, Bengali digits, each with "যাচাই করা হয়নি" and "সীমিত তথ্য" | BR2.5, BR2.7, BR2.10, BR3.6 |
| Open f1 | Hero "Shefa Health Group", sub "Dhanmondi branch · Dhanmondi, Dhaka", Not verified, "3 patient experiences", Limited data, provenance chip; separation callout; one panel limited line; nine criteria, reportTime and reportTrust "Not provided"; three visits (one anonymous, unlinked); doctors here d1; other branches "Uttara branch" | BR2.4–BR2.7, BR3.1, BR3.8, BR2.11 |
| Open f4 | No doctors-here panel (ISS-266); other branches "Dhanmondi branch" | BR3.8 |
| Open an old or merged facility id | 308 to the current branch, same locale | BR1.3 |
| Open `/en/facilities/abcdefghij-any-slug` | Same page as without the slug; canonical without slug | BR1.2, BR1.7 |
| Facility feedback turned off | Hero, Not verified, separation callout, doctors here, other branches only | BR3.11 |
| Open `/en/topics` | 10 cards, alphabetical; c8 "No one has written about this yet." | BR3.10, BR2.10 |
| Open c1 | "5 patient experiences · 2 doctors" (no Limited data), "Usually seen by Endocrinology · 5", places Shefa General Hospital 3 and Jolrong Diagnostic Centre — Cumilla branch 2 with "Counted from 5 patient experiences", distributions with their denominators, mention lists, provisional callout, five accounts, doctors d1 and d9, facilities, emergency panel | BR2.3, BR3.3–BR3.5, BR5.4 |
| Open c8 | "No one has written about this yet." in the head; "Not provided" in both blocks; no places, mentions, doctors or facilities panels; empty state with "Be the first to write about it" | BR3.10 |
| Open a mapped term | 308 to the canonical term's page | BR1.4 |
| Open a provisional term | Its own page with the "Submitted wording, not yet mapped" badge | BR2.13 |
| Reduced motion | Instant route swap, no reveal; every step completes | BR5.6 |

The c1 row assumes the seed's condition tags (finding F1).

## 7. T-203's section of `patient.css`

Appended after T-011's and T-202's rules, under one comment header; every rule carries `/* added: T-203 <reason> */`, uses only T-011 tokens, and declares no motion (BR5.5, BR7.1).

| Selector | Why | Declarations (tokens only) |
|---|---|---|
| `.index-grid` | The topic grid has no rule in the prototype (fact 9); mirrors `.browse-grid` | `display: grid`, `repeat(auto-fit, minmax(…, 1fr))` from T-011's sizing, gap; `list-style: none`, no padding |
| `a.browse-card` | Topic cards are links (step 4) | `display: block`, `text-decoration: none`, `min-block-size: var(--target)`; `:focus-visible` `outline: var(--focus-ring)` |
| `.crit h3` | Criterion headings are h3 (BR4.1); mirror T-011's `.crit h4` | the same type tokens as `.crit h4` |
| `.crit .limited-tag` | Short limited-data mark per criterion (Question 4) | small type, `--ink-muted` |
| `.crit-tags` | Replaces the prototype's inline flex style on the visit tag row (task step 3.4) | `display: flex`, `flex-wrap: wrap`, gap and top margin from T-011 spacing |
| `.callout.facility-sep` | Replaces the prototype's inline `margin-bottom: 18px` | `margin-block-end` from T-011 spacing |
| `.places-note`, `.freq-head` | Replace the prototype's inline margins and `font-size: 15px` on panel headings | T-011 type and spacing tokens |
| `.mini-row .sr-only`, `.pl-n .sr-only` | Hidden units (BR4.3) | none; uses the existing `.sr-only` utility |

If T-011 has no spacing token that fits, Code Generation raises an `ISSUES.md` row for U45 instead of adding a literal value. `.dist-gap` and `.emergency-panel` are T-202's.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, Testing Library, jsdom), each in `en` and `bn`, inside `NextIntlClientProvider` with the real dictionaries, `@/i18n/routing` mocked to a plain anchor (ISS-053), view models from builders:

| Test | Asserts | Rules |
|---|---|---|
| FacilityProfile renders nine criteria in enum order even when all are empty | 9 `.crit` headings in order; each "Not provided" (task row "nine criteria") | BR3.1, BR2.6 |
| FacilityProfile shows the separation sentence under the hero on every branch page | text `facility.separation`, second block, with feedback on and off (task row "separation") | BR2.4 |
| FacilityProfile lists the other branches without itself | builder with three sibling entries including self: two rows (task row "siblings") | BR3.8 |
| FacilityProfile shows Not verified with its explanation | badge text and `aria-describedby` target | BR2.5, BR4.6 |
| FacilityProfile shows limited data once at the panel and a tag on each limited criterion | one `p.limited`, nine tags, threshold 7 gives "Fewer than 7" (৭ in bn) | BR2.7, BR2.8 |
| FacilityProfile shows no doctor figure | no sentiment or outcome labels; doctors-here rows contain no digits | BR2.2 |
| FacilityProfile without feedback leaves out criteria, visits and the write button | — | BR3.11 |
| FacilityProfile notes report reliability as the visitor's impression | `crit.reportTrustNote` after `reportTrust`, also when empty | BR2.12 |
| FacilityAccountRow shows Not provided for a missing overall and tags only answered criteria | badge text; tag count equals answered keys | BR2.9 |
| FacilityAccountRow never links an anonymous author | no `<a>` in `.byline` | BR2.11 |
| FacilityEntry has no pin control without a slot and shows Not verified and Limited data | — | BR8.1, BR2.5, BR2.7 |
| FacilityIndex lists cards in the order given with Bengali digits under bn | order equals input (`Intl.Collator` sorted builders); count line in Bengali digits | BR2.10, BR3.6 |
| TopicIndex lists every topic and says when nobody has written yet | 10 cards; the zero one shows `index.emptyTopic` (task row "TopicIndex", 10 not 8: FD-089) | BR3.10 |
| BrowseCard is a link with the topic name | `role=link`, name, href | BR4.4 |
| ConditionPage shows its blocks in the prototype's order | heading sequence: name, treated at, across all, mentions, accounts, doctors, facilities, emergency | BR4.1 |
| ConditionPage builds the lede from one key with plurals | "1 patient experience · 1 doctor" (en); Bengali digits (bn); no lowercase transform | BR3.9, BR6.2 |
| ConditionPage marks a provisional term | badge present when `provisional`, absent otherwise | BR2.13 |
| ConditionPage with no accounts shows no empty panel | c8-like builder: emptyTopic text, Not provided, empty state with `index.beFirst` | BR3.10 |
| PlacesPanel keeps the given order and says Not provided for a missing hospital | order; `.pl-unk` text (task row "places"); denominator line | BR3.3, BR3.5, BR2.9 |
| FreqList bars are relative to the largest count and the panel is absent when empty | first `--w` is 1; nothing rendered for `[]` (task row "FreqList") | BR3.2 |
| The emergency panel on the condition page is a static group outside any reveal list | `data-static="emergency"`; no `[data-reveal-list]` ancestor | BR5.4 |
| The separation callout and Not verified badge are outside any reveal list | no `[data-reveal-list]` ancestor | BR5.3 |
| ConditionLink links a term and leaves free text as text | — | BR8.1 |
| Facility components never import the sentiment or outcome blocks | static scan of the four facility files' imports | BR2.2 |

Smoke: `components/patient/facilities-topics.smoke.test.tsx` renders `FacilityIndex` (10 builder cards), `FacilityProfile` (one builder branch), `TopicIndex` (10 cards, one empty) and `ConditionPage` (one builder condition), in both languages: ten Not verified badges, nine criteria, the separation sentence, ten topic cards (BR9.2).

Gates: `pnpm check`, `pnpm smoke`, `pnpm check:motion`, `pnpm contrast`, `pnpm contrast:patient`, `npx impeccable detect apps/web/src --no-advisory` (BR7.2, BR9.3). Build and Test also walks `/en` and `/bn` `facilities`, `facilities/{f1}`, `topics` and `topics/{c1}` beside the prototype's `#facilities/f1` and `#topics/c1` at 1280 and 390 px, runs the reduced-motion journey and the 360 px and 200% zoom run, and records T-201's isolation tests as hard-rule evidence.
