# Frontend components — U46 `u46-directory`

Component design for the six directory pages, built on the merged demo pages and components (FD-099, FD-101), not beside them. It merges the T-202 and T-203 drafts' component designs, minus the parts that need T-204 or search (claim sheet, "Is this you?", "Describe your visit", pin slots), and applies `functional-design-questions.md` Questions 5, 6, 9, 10, 11 and 13. Upstream: U45 T-011's tokens, classes, press list, `Reveal` and `RouteTransition`; T-008's `ViewShell`; T-101's `getActor()` and container; the view models of `functional-spec.md` § 7. Snippets are interface sketches.

## 1. Hierarchy

```text
(patient)/layout.tsx                         merged: SkipLink, DemoMarker, Masthead, main > RouteTransition, Colophon (disclaimer)
│
├── doctors/page.tsx                         server (WF13)
│   └── ViewShell view="doctors" title=""
│       └── DoctorIndex {cards, total, threshold}
│           ├── IndexHead {kicker nav.discover, title nav.profile, note index.doctorsNote}      h1.display
│           ├── p.note.count-line            profile.list.count {total}
│           └── Reveal as="div" className="index-list"
│               └── DoctorEntry {card, headingLevel 2} ×n
│                   ├── span.doc-av > Avatar 48
│                   ├── h2 > DoctorLink · p.doc-sub (specialty · area, city | Not provided) · p.doc-treats (top conditions)
│                   ├── span.doc-flags > NotVerified · [MemberAdded] · documents badge · [Limited data]
│                   └── span.doc-side > SentimentBlock compact
│
├── doctors/[id]/page.tsx                    server (WF13)
│   └── ViewShell view="profile" title=""
│       └── DoctorProfile {vm, filters, threshold}
│           ├── section.panel > div.p-hero
│           │   ├── span.p-av > Avatar 118 · span.kicker · h1 name · p.p-spec (specialty · place | Not provided)
│           │   ├── div.p-flags > NotVerified(describedBy) · [MemberAdded] · accounts badge · [Limited data] · [prov.provider when claimed]
│           │   ├── [p.note label.memberAddedWhy]
│           │   └── div.p-actions > Link.btn profile.writeAbout → /write?doctor={publicId}
│           ├── div.p-grid
│           │   ├── div (main)
│           │   │   ├── section.panel conditions: h2 · p.note · ConditionPills · SentimentBlock · div.dist-gap > OutcomeBlock
│           │   │   ├── [section.panel breakdown: h2 · div.table-scroll > table.breakdown · p.denominator why]
│           │   │   ├── section.panel filters: h2 · ProfileFilters (client) · p.denominator showing
│           │   │   ├── h2.section-head profile.accounts
│           │   │   └── Reveal as="div" > AccountRow ×n | div.empty-state profile.noExperiences
│           │   └── aside.p-side [aria-label prov.title]
│           │       ├── section.panel provenance + About: h2 · p.note about | Not provided · ul.facts (populated facts only, each with .prov)
│           │       ├── section.panel chambers: h2 · ul.facts (name · [hours] · .prov) | p.note Not provided
│           │       └── [section.panel facilities: h2 · MiniList > MiniRow (facilityLabel) ×n · p.note profile.facilitySep]
│
├── facilities/page.tsx                      server
│   └── ViewShell view="facilities" title=""
│       └── FacilityIndex {cards, total, threshold}
│           ├── IndexHead {nav.discover, nav.facilities, index.facilitiesNote} · p.note.count-line facility.listCount
│           └── Reveal as="div" className="index-list" > FacilityEntry {card, headingLevel 2} ×n
│               (Avatar 48 · h2 FacilityLink facilityLabel · p.doc-sub type · area, city ·
│                flags: Not verified · [accounts | facility.noVisits] · [Limited data] · [Part of {parent}] ·
│                doc-side: [DistBlock overall compact] — figures only when feedbackVisible)
│
├── facilities/[id]/page.tsx                 server
│   └── ViewShell view="facility" title=""
│       └── FacilityProfile {vm, threshold}
│           ├── section.panel > div.p-hero: Avatar 118 · kicker type · h1 name · p.p-spec [label ·] area, city ·
│           │   flags: Not verified(describedBy) · [accounts badge] · [Limited data] · prov chip · [Part of {parent}]
│           ├── div.callout.warn > b facility.separation                                 (static, never in Reveal)
│           └── div.p-grid
│               ├── div (main)
│               │   ├── [section.panel criteria: h2 · p.limited once · div.crit-grid > div.crit ×9]
│               │   ├── [h2.section-head facility.accounts · Reveal > FacilityAccountRow ×n | empty-state facility.noVisits]
│               └── aside.p-side
│                   ├── section.panel address: h2 facility.address · p.note address | Not provided
│                   ├── [section.panel doctors here: MiniList · p.note facility.doctorsNote]
│                   └── [section.panel other branches: MiniList (label ?? name, area)]
│
├── topics/page.tsx                          server
│   └── ViewShell view="topics" title=""
│       └── TopicIndex {cards, total}
│           ├── IndexHead {nav.discover, nav.condition, index.topicsNote} · p.note.count-line condition.listCount
│           └── Reveal as="ul" className="index-grid" > li > BrowseCard {href, title, sub: experiences | index.emptyTopic} ×n
│
└── topics/[id]/page.tsx                     server
    └── ViewShell view="condition" title=""
        └── ConditionPage {vm, threshold, emergency}
            ├── section.a-head: kicker · [Badge warn condition.provisional] · h1.display · [p.note condition.alsoCalled] ·
            │   p.lede counts line | index.emptyTopic · [Limited data] · [p.specs-tag condition.specialtyTag + pills ≤3]
            ├── [PlacesPanel {places, total}]
            └── div.p-grid
                ├── div (main): section.panel acrossAll (SentimentBlock · OutcomeBlock) · [FreqList ×3] ·
                │   div.callout condition.provisional + provNote · h2.section-head · Reveal > AccountRow ×n | empty-state
                └── aside.p-side: [doctors MiniList] · [facilities MiniList] · EmergencyPanel compact (static)
```

Square brackets mark a block left out when it has nothing to show. The layout's `RouteTransition` covers all six pages; none adds one.

## 2. Files

| Path | Change |
|---|---|
| `app/[locale]/(patient)/doctors/page.tsx`, `doctors/[id]/page.tsx` | switch from `@/server/data` to `getContainer().directory` queries; keep the `[id]` segment and `cache()`d loader |
| `app/[locale]/(patient)/facilities/page.tsx`, `facilities/[id]/page.tsx` | switch to `directory.listFacilities`, `getFacility` |
| `app/[locale]/(patient)/topics/page.tsx`, `topics/[id]/page.tsx` | switch to `taxonomy.listConditions`, `getCondition`; read `emergency` from config |
| `components/patient/doctors/{DoctorList→DoctorIndex,DoctorEntry,DoctorProfile,ProfileFilters,ConditionPills}.tsx` | rewritten on the VMs; `ProfileFilters` is the one client component; `MemberAddedBadge` and `NotVerifiedBadge` move to `shared/` |
| `components/patient/facilities/{FacilityIndex,FacilityEntry,FacilityProfile,FacilityAccountRow}.tsx` | rewritten on the VMs |
| `components/patient/topics/{TopicIndex,ConditionPage,PlacesPanel,FreqList}.tsx` | rewritten on the VMs |
| `components/patient/shared/{Avatar,Badge,NotVerified,MemberAdded,DistBlock,SentimentBlock,OutcomeBlock,AccountRow,DoctorLink,FacilityLink,ConditionLink,MiniList,BrowseCard,IndexHead,EmergencyPanel}.tsx` | new; `Avatar` replaces `doctors/DoctorAvatar.tsx` (one import path updated in FacilityProfile, which U46 owns) |
| `components/patient/doctors/directory-test-support.ts` | kept; adds VM builders (`aDoctorCard`, `aDoctorProfile`, `aDistribution`, `anExperienceCard`, `aFacilityProfile`, `aConditionPage`); existing exports stay for the home and pages tests |
| `app/[locale]/(patient)/{doctors,facilities,topics}/page.test.tsx`, `…/[id]/page.test.tsx` | new: U46's page tests (404, 307, metadata in both locales), instead of rows in the shared `app/pages.test.tsx` |
| `apps/web/src/lib/doctor-filters.ts` (+ test) | `parseProfileFilters`, `filterHref` (recorded addition, `web-shared`) |
| `styles/patient.css` | `/* added: U46 … */` rules (§ 7) |

Nothing under `components/patient/{home,experience,compose,evidence,comments}/` changes. `home/ExperienceRow` and `home/EmergencyPanel` stay for U20 until it switches to the shared primitives.

## 3. Page loaders

```text
DoctorIndexPage():
  actor = await getActor(); locale = await getLocale()
  page  = await container.directory.listDoctors({page: 1, pageSize: 100}, actor)     // !ok -> throw (error boundary)
  threshold = (await container.config.current()).limitedDataThreshold
  ViewShell(view 'doctors', title '') > DoctorIndex({cards: page.items, total: page.total, threshold})

loadProfile = cache(async (locale, id, rawSearch) => {
  if !isPublicId(id) -> notFound()
  filters = parseProfileFilters(rawSearch)             // invalid values dropped (BR9.3)
  r = await container.directory.getDoctor({publicId: id, ...filters}, await getActor())
  if r is not_found -> notFound()
  if filters.condition && !r.data.selectedCondition -> redirect(filterHref(id, {...filters, condition: undefined}))
  return {vm: r.data, filters, threshold}
})
```

The facility and topic loaders follow the same pattern; `ConditionPage` also receives `(await config.current()).emergency`. `generateMetadata` reads the same cached loader (title `{name} — {brand}`), so status codes are set before the first byte. No `loading.tsx` is added (a streamed shell would turn the 307 into a client redirect).

## 4. Shared primitives (`components/patient/shared/`)

| Component | Props | Renders | Rules |
|---|---|---|---|
| `Avatar` | `seed`, `hue`, `size` | the prototype's `avatar()` SVG (as the merged `DoctorAvatar`), `aria-hidden` | BR3.8 |
| `Badge` | `cls: warn \| plain \| positive \| mixed \| negative \| good \| poor`, `children` | `span.badge.{cls}` | — |
| `NotVerified` | `kind: doctor \| facility`, `describedById?` | `span.badge.warn` `label.notVerified` (doctor) or `facility.notVerified` (facility), `title` the why text; with `describedById`, an `sr-only` why span | BR2.5 |
| `MemberAdded` | `withWhy?` | `span.badge.plain` `label.memberAdded`; the profile passes `withWhy` for `p.note` `label.memberAddedWhy` | BR2.13 |
| `DistBlock` | `dist`, `prefix: sentiment. \| outcome. \| crit.`, `title?`, `compact?`, `threshold`, `limitedNote?: full \| tag` | empty → `p.denominator` `label.notProvided`; else `div.capsules[role=img][aria-label]` with each key's count and label, `p.denominator` `sentiment.ofTotal {total}`, `p.not-provided` `label.notProvidedCount {n}` when `notProvided > 0`, the limited line (`full`) or tag (`tag`); compact: denominator and capsules only. No percentage | BR2.1–BR2.4 |
| `SentimentBlock` / `OutcomeBlock` | `dist`, `threshold`, `compact?` | `DistBlock` with keys and titles; `OutcomeBlock` rows draw `count/total` bars and `outcome.selfReported` | BR2.3, BR2.4 |
| `AccountRow` | `card: ExperienceCardVM`, `showDoctor?` (default true), `headingLevel?` | the prototype's `accountRow`: flags (sentiment badge when present, outcome badge when present, condition `ConditionLink` tag when present, `evidence.status` + `review.card.documents {n}` or `label.noDocuments`), `h3` title link to `/experiences/{publicId}`, byline (the merged `experience/Byline` with the persona mapping; no name or link for anonymous), `p.who` episode date · `DoctorLink`, `p.excerpt` (+ "…" when truncated), "Read the full experience" | BR1.5, BR2.10, BR3.7, BR3.9, Question 9 |
| `DoctorLink` / `FacilityLink` / `ConditionLink` | `publicId?`, `label` | `Link.link-btn.name-link` to `/doctors/{id}`, `/facilities/{id}`, `/topics/{id}`; `ConditionLink` without an id renders a `span`. `FacilityLink`'s module exports `facilityLabel({name, branchName?})` = name + " — " + branchName | BR3.11 |
| `MiniList` / `MiniRow` | children / `href`, `avatar`, `title`, `sub`, `loc?` | `div.mini-list` > `Link.mini-row` | — |
| `BrowseCard` | `href`, `title`, `sub` | `Link.browse-card` > `b` + `span`; U20 reuses it on the home | — |
| `IndexHead` | `kicker`, `title`, `note` | `section.a-head.index-head` > kicker, `h1.display`, `p.lead` | — |
| `EmergencyPanel` | `config`, `compact?` | full: title, body, three `tel:` lines, last-verified date (as the merged home panel, inline styles replaced by `.emergency-panel`); compact: title and a sentence naming the configured ambulance and health-line numbers; both `data-static="emergency"` | BR9.4 |

Primitives import only `react`, `next-intl`, `@/i18n/routing`, `@/lib/*`, `@rogikotha/contracts` types and `@rogikotha/i18n/format` (FD-093 `web-components`), plus the existing `experience/Byline` and `experience/people` for bylines (import only, no edit).

## 5. Page-level components

### 5.1 `DoctorEntry` and `DoctorIndex` (server)

`DoctorEntry {card, headingLevel, threshold}`: `div.doc-entry[role=group][aria-labelledby]` > Avatar · heading > `DoctorLink` · `p.doc-sub` "specialty · area, city" from present parts, `label.notProvided` for a missing part · `p.doc-treats` top conditions "name (count)" when any · flags: `NotVerified kind=doctor`, `MemberAdded` when `memberAddedNotConfirmed`, `review.card.documents {documentsCount}` or `label.noDocuments`, `label.limitedData` when `accountsLimitedData` · `SentimentBlock compact`. `DoctorIndex` lists entries in the query's order with `index.doctorsNote` (Question 6).

### 5.2 `DoctorProfile` (server)

Block order is the prototype's `renderProfile`, with the merged hero:

1. **Hero.** Avatar 118, kicker, `h1` name, `p.p-spec`; flags: `NotVerified describedById`, `MemberAdded` when marked, `profile.experienceCount {accountsTotal}`, `label.limitedData` when limited, `prov.provider` when `claimed`; `label.memberAddedWhy` note when marked; the write link (merged).
2. **Conditions.** `h2` `profile.conditions`, `p.note` `profile.byCondition`, `ConditionPills` ("All conditions ({total})" and one pill per condition with its count, links with `aria-current="true"` on the selected one), `SentimentBlock(scopedSentiment)`, `OutcomeBlock(scopedOutcome)`.
3. **Breakdown** (when conditions exist). `table.breakdown` in `div.table-scroll[role=region][tabindex=0][aria-labelledby]`: condition, positive, mixed, negative, total, a `⚠` plus `sr-only` "Limited data" on limited rows; `p.denominator` `label.limitedDataWhy {threshold}`.
4. **Filters.** `ProfileFilters`: outcome pills (four), `profile.hasDocuments`, relationship pills (four); `p.denominator` `profile.showingCount {showing, scopedTotal}`.
5. **Accounts.** `AccountRow showDoctor={false}` per account, newest first; empty → `profile.noExperiences`.
6. **Aside.** Provenance panel: About (`about` or `label.notProvided`), then `ul.facts` of the populated facts only, each with its `span.prov[data-p]` `prov.updatedOn {source, date}`; chambers with hours when present and their provenance, or `label.notProvided` when there are none; facilities ("Where they practise") with `facilityLabel` rows and `profile.facilitySep`.

### 5.3 `ProfileFilters` and `ConditionPills` (client)

Links built by `filterHref` (`?condition=&outcome=&relationship=&docs=1`), `scroll={false}`, `prefetch={false}`; selecting the selected pill again clears it; `aria-current="true"` marks the pressed pill (a link cannot carry `aria-pressed`). On a new `showing` value from the server it announces `profile.showingCount` once through `useAnnounce()`; nothing is announced on first render. Without script the links still navigate and the server renders the pressed state. Pill labels are resolved on the server and passed as props, so the client bundle needs no messages.

### 5.4 `FacilityEntry`, `FacilityIndex`, `FacilityProfile`, `FacilityAccountRow` (server)

As T-203's draft § 5.1–5.4, minus "Describe your visit": title by `facilityLabel`; `NotVerified kind=facility`; the "Part of" badge `facility.parentOf {parent}` when `parentName`; figures only when `feedbackVisible`. The criteria panel prints one `p.limited` line ("Limited data — why") when `accountsLimitedData`, then nine `div.crit` blocks in enum order (`h3` `crit.{key}`, `DistBlock prefix=crit. limitedNote=tag`, `crit.reportTrustNote` under `reportTrust`); an unanswered criterion reads "Not provided". `FacilityAccountRow`: overall badge or "Not provided", episode date, byline, full body, a tag per answered criterion (the merged `VisitRow`, now on `FacilityAccountVM`). The address panel and the separation callout are kept from the merged page.

### 5.5 `TopicIndex`, `ConditionPage`, `PlacesPanel`, `FreqList` (server)

As T-203's draft § 5.6–5.9: every topic listed, zero ones with `index.emptyTopic`; the condition head with the provisional badge, "Also written as", the counts line `condition.countsLine {accounts, doctors}` or `index.emptyTopic`, Limited data, up to three specialty pills; `PlacesPanel` with `label.notProvided` for a missing hospital and `condition.countedFrom {total}`; three `FreqList`s (absent when empty), bars drawn relative to the largest count, framed by `condition.mentionNote` and `condition.countedFrom {total}`; the provisional callout; accounts or the empty state with `index.beFirst`; the aside with doctors, facilities and the compact `EmergencyPanel`. The prototype's comments above `renderTopicIndex`, the places code and `tagFrequency` are ported as code comments.

## 6. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn/doctors` | 10 entries in Bengali alphabetical order, Bengali digits, each "রেজিস্ট্রেশন যাচাই করা হয়নি"; Limited data on every entry below 5 accounts | BR2.4, BR2.5, BR2.8 |
| A member-added doctor in the list or opened | "Added by a member — not confirmed" beside "Registration not verified"; the profile adds the why note | BR2.13 |
| Open d7 | About reads "Not provided"; facts list only populated facts | BR2.2 |
| Doctor with 3 accounts, 2 without sentiment | "of 1 patient experience", "Not provided: 2", Limited data with the why line naming 5 | BR2.3, BR2.4 |
| Doctor with no accounts | sentiment and outcome "Not provided"; "All conditions (0)"; no breakdown; empty accounts state | BR2.2 |
| Select a condition pill | URL gains `condition=`, other filters kept; distributions and accounts scoped; "showing x of y" announced once | BR3.5 |
| `?outcome=great` | ignored; unfiltered page | BR9.3 |
| `?condition=<a term this doctor has no account for>` | 307 to the URL without it | BR9.3 |
| Open a malformed, unknown, hidden or merged id | 404 page | BR9.3 |
| Open `/en/facilities` after `pnpm demo:reset` | "Shefa General Hospital — Dhanmondi branch", "Bandar Diagnostic Centre", …; seven with "Part of …" | BR3.11 |
| Open `/en/facilities` on a database seeded before U46 | "Shefa Health Group — Dhanmondi branch", as today | BR7.3 |
| Open f1 | hero, Not verified, accounts, Limited data, provenance, Part of; separation callout; one limited line; nine criteria with unanswered ones "Not provided"; visits; doctors here; other branches; address | BR2.7, BR2.12, BR3.11 |
| Open f6 | address "Not provided" | BR2.2 |
| Facility feedback off | no counts, criteria, visits or overall capsules; separation, doctors here and branches stay | BR2.12 |
| Open `/en/topics` | 10 topics alphabetical; c8 "No one has written about this yet."; the counts the merged page shows | BR4.4, BR1.7 |
| Open c1 | counts line, specialties, places with "counted from", distributions with denominators, mentions, accounts, doctors, facilities, compact emergency panel naming 999 and 16263 | BR3.3–BR3.6, BR9.4 |
| Open a provisional term | its page with "Submitted wording, not yet mapped" | BR4.6 |
| Reduced motion | instant route swap, no reveal; every step completes | BR9.2 |

## 7. U46's section of `patient.css`

Appended under one header; each rule carries `/* added: U46 <reason> */`, uses T-011 tokens only and declares no motion (BR9.2).

| Selector | Why |
|---|---|
| `.pillrow a`, `.pillrow a[aria-current="true"]`, `.pillrow a:focus-visible` | filter pills are links; selected state with a non-colour cue (check mark, heavier border) |
| `.dist .not-provided` | the partial "Not provided: n" line |
| `.table-scroll` (+ `:focus-visible`) | the breakdown never widens the page |
| `.emergency-panel`, `.emergency-panel--compact` | replaces the merged panel's inline styles |
| `.dist-gap` | replaces the prototype's inline margin |
| `.crit-grid .limited-tag` | the short Limited data tag under one panel-level line |

No `transition`, `animation`, `@keyframes`, `@starting-style` or view-transition rule; no hover transform; no `text-transform` or `letter-spacing` without a `:lang(bn)` reset; no column-0 dark-theme block (`check:motion`, T-011). If a needed spacing token is missing, an ISS row is raised instead of a literal value.

## 8. New and changed message keys

Both `en.json` and `bn.json`, in the same commit (BR9.1). New: `facility.notVerified` ("Not verified"), `facility.notVerifiedWhy`, `facility.parentOf` ("Part of {parent}", Bengali in its own word order), `sentiment.ofTotal` (ICU plural "of {count} patient experience(s)"), `label.notProvidedCount` ("Not provided: {count}"), `profile.showingCount` ("Showing {showing} of {total}"), `prov.updatedOn` ("{source} · updated {date}"), `condition.countsLine`, `condition.countedFrom`, `emergency.compactLine` (the sentence with `{ambulance}` and `{healthLine}`). Changed: `label.limitedDataWhy` takes `{threshold}` (no caller renders it on `main` today). Unused after the switch: `profile.list.orderNote` and `facility.orderNote` stay in the files until U50's clean-up (the i18n check requires parity, not use). The final list is fixed in Code Generation and listed in the hand-off.

## 9. Tests (test-after)

Component tests (Vitest, Testing Library, jsdom), each in `en` and `bn` with the real dictionaries inside `NextIntlClientProvider`, `@/i18n/routing` mocked to a plain anchor; VMs from `directory-test-support.ts` builders (test category, never importing `@rogikotha/test-support`). Page tests live in each route's own `page.test.tsx` (`doctors/page.test.tsx`, `doctors/[id]/page.test.tsx`, and the same for `facilities/` and `topics/`) and mock `@/server/container` and `@/server/auth`. In the shared `app/pages.test.tsx` U46 only removes the six directory rows and the `facilities` entry of its `@/server/data` mock, because those pages no longer read `server/data`; this is recorded in the Code Generation plan (BR8.4).

| Test | Asserts | Rules |
|---|---|---|
| `DoctorIndex` renders both locales | entries in the given order, Bengali digits, Registration not verified on each | BR2.5, BR9.1 |
| member-added mark | badge on a marked card and profile with the why note; absent when false | BR2.13 |
| `DoctorProfile` order | headings in § 5.2's order | — |
| omits | no fee row for a doctor without a fee; About "Not provided"; empty distributions "Not provided"; documents "No documents"; nothing renders `0` for a missing value | BR2.2 |
| distributions | counts and "of n" from `counts` and `total`; "Not provided: n"; Limited data line and tag; no `%` anywhere in the rendered text | BR2.1, BR2.3, BR2.4 |
| filters | `?condition=&outcome=helped&docs=1` gives `aria-current` pills and "Showing x of y"; announcement once on change, none on mount | BR3.5 |
| anonymous byline | no link and no name inside an anonymous card's byline | BR2.10 |
| nine criteria | nine `.crit` blocks in enum order even when all are empty | BR2.7 |
| separation | the callout on every branch page | BR2.6 |
| siblings | a branch lists the other branches only | BR1.2 |
| facility names | "name — label", "Part of {parent}" present only when different | BR3.11 |
| feedback off | no figures on cards or profile | BR2.12 |
| `TopicIndex` | every topic, zero ones with the empty text | BR4.4 |
| places, `FreqList` | descending by count; missing hospital "Not provided"; first bar full width; panel absent when empty | BR3.4, BR3.6 |
| emergency compact | names the configured numbers in the active numerals; `data-static="emergency"` | BR9.4 |
| pages | 404 for a malformed id without calling the container; 307 for a foreign condition; metadata titles in both locales | BR9.3 |
| smoke | `components/patient/directory.smoke.test.tsx`: the profile renders Registration not verified and, for a marked VM, the member-added badge | BR8.2 |

Build and Test also runs `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`, `pnpm contrast:patient`, `pnpm check:motion`, the reduced-motion walk and the side-by-side check against the prototype at 1280 and 390 px.
