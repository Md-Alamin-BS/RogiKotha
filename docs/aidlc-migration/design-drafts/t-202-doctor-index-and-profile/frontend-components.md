# Frontend components — U15 `t-202-doctor-index-and-profile`

Component-level design for `functional-spec.md` (workflows WF1–WF7) and `rules.md` (BR1.1–BR9.5). It follows the owner's answer B to Question 1 (counts only, no percentages) and the recommended option of every other question in `functional-design-questions.md`; Questions 14 and 15 were decided by the agent under the owner's no-questions instruction of 2026-10-29. Upstream: U14 T-201's view models and queries, U45 T-011's tokens (spacing included), classes, press list, `Reveal`, `RouteTransition` and static groups, T-102's `useAuthGate()` and `AuthGateProvider`, T-101's `getActor()` and container, T-008's `ViewShell`, `Sheet` and `useAnnounce()`.

Refreshed 2026-10-29. Every **[Q1]** part is removed: there is no `showPercent`, no `formatPercent` and no `.pct`. § 2 adds the `lib/` helpers and `pages.test.tsx`. § 3 uses `getActor()`, `await config.current()` and `stripSlug`. § 4 adds T-203's additions (Q14), `facilityLabel` (Q15) and the former-member byline. § 7 uses spacing tokens and adds no hover transform. § 8 adds the route-table, Crockford and no-percentage tests and the local builders.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                      T-008/T-011/T-102: SkipLink, DemoMarker, Masthead, main > RouteTransition > AuthGateProvider (one AuthGateSheet), Colophon
│
├── doctors/page.tsx                      server; WF1
│   └── ViewShell view="doctors" title=""
│       └── DoctorIndex {cards, threshold}
│           ├── IndexHead {kicker: nav.discover, title: nav.profile, note: index.doctorsNote}   h1.display
│           ├── p.note.count-line         "{n} · Doctors"
│           └── Reveal as="div" className="index-list"
│               └── DoctorEntry {card, headingLevel: 2}  ×n
│                   ├── span.doc-av > Avatar 48
│                   ├── h2 > DoctorLink
│                   ├── p.doc-sub · p.doc-treats
│                   ├── span.doc-flags > NotVerified, documents Badge, [Limited data Badge]
│                   └── span.doc-side > SentimentBlock compact, {pinSlot}
│
└── doctors/[publicId]/page.tsx           server; WF2–WF5
    └── ViewShell view="profile" title=""
        └── DoctorProfile {vm, filters, threshold, locale}
            ├── section.panel > div.p-hero
            │   ├── span.p-av > Avatar 118
            │   ├── span.kicker · h1 · p.p-spec
            │   ├── div.p-flags > NotVerified, Badge accountsCount, [Badge Limited data], [Badge prov.provider]
            │   └── div.p-actions > Link.btn (/write?doctor=) · ClaimButton (client) → ClaimSheet
            ├── div.p-grid
            │   ├── div (main column)
            │   │   ├── section.panel  conditions: h2, p.note, ConditionPills, SentimentBlock, OutcomeBlock
            │   │   ├── section.panel  breakdown: h2, div.table-scroll > table.breakdown, p.denominator
            │   │   ├── section.panel  filters: h2, ProfileFilters (client) > FilterPills, p.denominator showing
            │   │   ├── h2.section-head  profile.accounts
            │   │   └── Reveal as="div" > AccountRow ×n   |   div.empty-state > p mine.empty
            │   └── aside.p-side [aria-label=prov.title]
            │       ├── section.panel  provenance: h2, ul.facts > li (.k, value, .prov)
            │       ├── section.panel  chambers: h2, ul.facts > li (name, .k hours, .prov)
            │       └── section.panel  facilities (only when non-empty): h2, MiniList > MiniRow (title facilityLabel) ×n, p.note facilitySep
            └── (no EmergencyPanel: the prototype's profile has none)
```

The layout's `RouteTransition` covers both pages; neither page adds one (BR5.1). `ViewShell` keeps the view announcement and `data-view`.

## 2. Files

| Path | Change | In T-202's owned paths |
|---|---|---|
| `app/[locale]/(patient)/doctors/page.tsx` | Replace the T-008 placeholder: load `listDoctors`, read the threshold, render `DoctorIndex` | yes |
| `app/[locale]/(patient)/doctors/[publicId]/page.tsx` | New (moved from `[id]/page.tsx`): parse, resolve, clean filters, load, render `DoctorProfile`; `generateMetadata` | yes |
| `app/[locale]/(patient)/doctors/[id]/page.tsx` | Removed by `git mv` to `[publicId]` | **no**: recorded owned-path change (Next.js forbids two slug names at one level) |
| `components/patient/{DoctorIndex,DoctorProfile,DoctorEntry}.tsx` | New, server | yes |
| `components/patient/ProfileFilters.tsx` | New, client: pressed state and the announcement | yes |
| `components/patient/ClaimSheet.tsx` | New, client: `ClaimButton` and the sheet body (Question 9) | yes |
| `components/patient/shared/{Avatar,Badge,NotVerified,DistBlock,SentimentBlock,OutcomeBlock,Byline,DoctorLink,FacilityLink,AccountRow,EmergencyPanel,MiniList,IndexHead}.tsx` | New, server | yes |
| `components/patient/**/*.test.tsx`, `components/patient/doctors.smoke.test.tsx` | New | yes |
| `components/patient/doctor-test-support.ts` | New: view-model builders (`aDoctorCard()`, `aDoctorProfile()`, `aDistribution()`, `anExperienceCard()`, `aByline()`); test category, excluded from coverage; never imports `@rogikotha/test-support` | yes (test file) |
| `apps/web/src/lib/doctor-filters.ts`, `lib/css-vars.ts` (+ tests) | New `web-shared` helpers: `cleanFilters`, `filterHref`; `cssVars` | **no**: recorded owned-path addition |
| `apps/web/src/app/pages.test.tsx` | The `/doctors` row and the `/doctors/[id]` → `/doctors/[publicId]` row; harness: `searchParams`, mocks of `@/server/container` and `@/server/auth`, `AuthGateProvider` around the profile (BR1.10) | **no**: T-010's file, recorded |
| `packages/i18n/messages/{en,bn}.json` | Seven new keys and one changed key (`entities.md` ENT-012) | yes (new keys); the `label.limitedDataWhy` change is listed in the hand-off (Question 4) |
| `apps/web/src/styles/patient.css` | Append the T-202 section (§ 7) | yes, by the FD-091 amendment |
| `apps/web/src/server/container.ts` (+ its test case) | Wire `directory` queries with Review's `ProviderExperience` implementation (T-201 F6), lazily like the rest of the container; the Actor comes from T-101's `getActor()` in `server/auth.ts` | **no**: recorded owned-path addition |
| `docs/status/decision-log.md` | The FD entry of `functional-spec.md` § 17 (counts only) | **no**: recorded (project.md Mandated) |

No file under `apps/worker`, `packages/{domain,application,database,contracts,test-support}`, `packages/i18n/src`, `tokens.css` or `motion.css` changes.

## 3. Page components

### 3.1 `doctors/page.tsx` (server)

```text
generateMetadata(): title documentTitle('doctors', t); no robots field (indexable); alternates {canonical /{locale}/doctors, languages}
DoctorIndexPage():
  locale  = await getLocale()
  actor   = await getActor()                                                    // T-101, server/auth.ts
  result  = await container.directory.listDoctors({page: 1, pageSize: 50}, actor)  // 11 on the seed after T-201 (pageSize: ISS row)
  if !result.ok -> throw (programmer/infra error; Next error boundary)
  threshold = (await container.config.current()).limitedDataThreshold          // 2-50
  return ViewShell(view='doctors', title='') > DoctorIndex({cards: result.data.items, total: result.data.total, threshold})
```

### 3.2 `doctors/[publicId]/page.tsx` (server)

```text
loadProfile = cache(async (locale, segment, rawParams) => {
  publicId = stripSlug(decodeURIComponent(segment))       // @rogikotha/contracts, Crockford base32; BR1.2; null -> notFound()
  actor    = await getActor()                             // T-101
  resolved = await container.directory.resolvePublicId({kind: 'doctor', publicId}, actor)
  if not_found -> notFound()                              // BR1.4
  filters  = cleanFilters(rawParams)                      // lib/doctor-filters.ts; BR1.5; docs '1' -> true; condition via isPublicId
  if resolved.redirected -> permanentRedirect(`/${locale}/doctors/${resolved.publicId}` + filterHref(filters))   // 308, BR1.3
  vm = await container.directory.getDoctor({publicId, ...filters}, actor)
  if not_found -> notFound()
  if filters.condition && !vm.selectedCondition -> redirect(filterHref({...filters, condition: undefined}))     // 307
  return {vm, filters, threshold: (await container.config.current()).limitedDataThreshold}                      // 2-50
})
generateMetadata({params, searchParams}): {vm} = await loadProfile(...); title `${vm.name} — ${t('brand.name')}`; no robots field; canonical without slug and filters
Page({params, searchParams}): data = await loadProfile(...)   // first statement: status set before the first byte (F21)
  ViewShell(view='profile', title='') > DoctorProfile(data)
```

`params` and `searchParams` are promises in Next 16. No `loading.tsx` is added under `doctors/` (Question 10: a stream would turn the 308 into a meta refresh).

## 4. Shared primitives (`components/patient/shared/`)

| Component | Props | Renders | Rules |
|---|---|---|---|
| `Avatar` | `seed: string`, `hue: number`, `size: number` | The prototype's `avatar()` SVG verbatim as JSX (background disc, 3–5 dashed rings, 4–8 dots), `aria-hidden="true" focusable="false"`; `seed` is the public id | BR3.6, Q8 |
| `Badge` | `cls: 'warn' \| 'plain' \| 'positive' \| 'mixed' \| 'negative' \| 'good' \| 'poor'`, `children` | `span.badge.{cls}` (`good` and `poor` for T-203's visit rows, Q14) | BR8.3 |
| `NotVerified` | `describedById?: string` | `span.badge.warn[title=label.notVerifiedWhy]` "Registration not verified"; when `describedById` is given, also `span.sr-only#{id}` with the why-text | BR2.6, BR4.8 |
| `DistBlock` | `dist: DistributionVM`, `prefix: 'sentiment.' \| 'outcome.' \| 'crit.'`, `title?: string`, `compact?: boolean`, `threshold: number`, `limitedNote?: 'full' \| 'tag'` (default `'full'`) | Empty → `p.denominator` "Not provided". Otherwise `div.dist` > `div.capsules[role=img][aria-label]` > `span.cap.c-{k}[style=--g]` > `b` count, `em` label (keys from `dist.keys`); then `p.denominator` `sentiment.ofTotal · {title}`; `p.not-provided` when `notProvided > 0` (Q2); when `limitedData`: `p.limited` "Limited data — {why}" (`full`) or the short "Limited data" tag (`tag`, the caller places the why line). Compact: `span.denominator` `sentiment.totalAccounts` + capsules, the `title` first in the image sentence, no limited line (the card adds its badge). No percentage (Q1 B) | BR2.2–BR2.5, BR3.1, BR3.3, BR4.3, BR8.3 |
| `SentimentBlock` | `dist`, `compact?`, `threshold` | `DistBlock` with keys positive, mixed, negative and title `sentiment.title` | — |
| `OutcomeBlock` | `dist`, `threshold` | `h3` `outcome.title`; empty → "Not provided"; else `div.outcome-rows` > `div.outcome-row` (label, `span.track[aria-hidden] > i[style=--w]`, `span.n` "{count}/{total}") ×4; `p.denominator` `outcome.selfReported`; `p.not-provided`; `p.limited` "Limited data". No percentage (Q1 B) | BR2.2–BR2.4, BR3.2, BR3.3 |
| `Byline` | `author: BylineVM`, `variant: 'row' \| 'lead' \| 'comment' \| 'mine'`, `when?: string`, `isStatic?: boolean`, `relationship?: Relationship` | `p.byline.byline--{variant}` (or `span` when static) > `span.byline-av[data-identity][aria-hidden]` (initials or "—"), lede (`experience.writtenBy` / `byline.commentBy` / `byline.yourIdentity`; none when anonymous), name, `span.byline-id[data-identity]` chip, `span.byline-rel` (not for comments), `time.byline-when`. `author.formerMember` → glyph "—", `byline.formerMember` as text, no chip, no link (T-104 Q15 B). The prototype's two comment blocks above `byline()` are ported as comments | BR2.12, Q7 |
| `DoctorLink` | `publicId`, `name` | `Link.link-btn.name-link[title=nav.viewDoctor]` to `/doctors/{publicId}` | BR1.2 |
| `FacilityLink` (+ `facilityLabel`) | `publicId`, `label` | `Link.link-btn.name-link[title=nav.viewFacility]` to `/facilities/{publicId}`; the same module exports `facilityLabel({name, branchName?})` = `name` + (`branchName` ? ' — ' + `branchName` : ''), used by T-202's facility rows and T-203's cards (Q14, Q15) | BR2.13, BR8.3 |
| `AccountRow` | `card: ExperienceCardVM`, `headingLevel?: 3 \| 2` | `article.acct` > `div.row-flags` (sentiment Badge when present, outcome `Badge plain` when present, `span.tag` condition when present, documents Badge) · `h3` title · `Byline variant=row` · `p.who` (`review.episodeDate`: month-year · `DoctorLink`) · `p.excerpt` (+ "…" when truncated) · `Link.btn.small.ghost` `review.readFull` to `/experiences/{publicId}` | BR2.7, BR3.4, BR3.5 |
| `EmergencyPanel` | `config: EmergencyConfig`, `locale` | `section.panel.emergency-panel[data-static=emergency]` > `h2` `emergency.title`, `p.lede` `emergency.body`, `div.emergency-lines` > `a[href=tel:…]` (number via `formatDigits`, label `emergency.ambulanceLabel` / `emergency.healthLineLabel` / `emergency.crisis`) ×3, `p.note` `emergency.lastVerifiedLine` with `formatDate`. The prototype's inline `style` attributes become the T-202 class `.emergency-panel`. T-011's static set and press exclusion cover `.emergency-lines a`, so nothing here moves. T-203 adds its `compact` prop (its task owns it) | BR5.5 |
| `MiniList` / `MiniRow` | `children` / `href`, `avatar: ReactNode`, `title`, `sub`, `loc?` | `div.mini-list` > `Link.mini-row` > `span.mini-av`, `span > b title + span sub` | — |
| `IndexHead` | `kicker`, `title`, `note` | `section.a-head.index-head` > `span.kicker`, `h1.display`, `p.lead` | BR4.1 |

`DoctorLink`, `FacilityLink`, `Byline` and `MiniRow` use next-intl's `Link` from `@/i18n/routing` (`web-shared`), which keeps the locale. Under `typedRoutes`, dynamic hrefs use the object form (`{pathname: '/doctors/[publicId]', params: {publicId}}`). Every primitive imports only `react`, `next-intl`, `@/i18n/routing`, `@/lib/*`, `@rogikotha/contracts` (types) and `@rogikotha/i18n/format`, which FD-093 allows for `web-components`.

## 5. Page-level components (`components/patient/`)

### 5.1 `DoctorEntry` (server)

**Props:** `card: DoctorCardVM`, `headingLevel?: 2 | 3` (default 3), `threshold: number`, `pinSlot?: ReactNode`.

`div.doc-entry[role=group][aria-labelledby={headingId}]` > `span.doc-av > Avatar 48` · `span` > `h{level}#{headingId} > DoctorLink` · `p.doc-sub` (BR2.8) · `p.doc-treats` (BR3.7) · `span.doc-flags` > `NotVerified`, documents `Badge plain` (BR2.7), `Badge plain` "Limited data" when `accountsLimitedData` (Q3) · `span.doc-side` > `SentimentBlock compact` + `pinSlot`. No pin control unless `pinSlot` is passed (T-206 passes its client button).

### 5.2 `DoctorIndex` (server)

**Props:** `cards: DoctorCardVM[]`, `total: number`, `threshold: number`. Renders § 1's index branch. `p.count-line` reads `{formatNumber(total)} · nav.profile`. Order is the query's (BR2.11).

### 5.3 `DoctorProfile` (server)

**Props:** `vm: DoctorProfileVM`, `filters: ProfileFilterState`, `threshold: number`, `locale: Locale`.

Block order is the prototype's (`renderProfile`), each block a T-011 class:

1. **Hero.** Avatar 118; `span.kicker` `profile.kicker`; `h1` name; `p.p-spec` (BR2.8); `div.p-flags`: `NotVerified describedById` (BR4.8), `Badge plain` `profile.accountsCount` (vm.accountsTotal), `Badge plain` "Limited data" when `accountsLimitedData` (Q3), `Badge plain` `prov.provider` when `claimed`; `div.p-actions`: `Link.btn` `profile.write` to `/write?doctor={publicId}`, `ClaimButton` `profile.claimThis` (`.btn.ghost.small`).
2. **Conditions panel.** `h2` `profile.conditions`; `p.note` `profile.byCondition`; `ConditionPills`: "All conditions ({accountsTotal})" and one pill per `vm.conditions` "({count})", each a link (BR1.6), `aria-current="true"` on the selected one (Q6); `SentimentBlock(vm.scopedSentiment)`; `div.dist-gap` then `OutcomeBlock(vm.scopedOutcome)`. Counts and denominators only (Q1 B).
3. **Breakdown panel.** `h2#breakdown-h` `profile.breakdown`; `div.table-scroll[role=region][tabindex=0][aria-labelledby=breakdown-h]` > `table.breakdown` > `caption.sr-only` · head `th[scope=col]` `filter.condition`, `sentiment.positive|mixed|negative`, `profile.total` · rows `th[scope=row]` condition, three counts, total + (`span[aria-hidden] ⚠` + `span.sr-only` "Limited data" when `limitedData`); `p.denominator` `label.limitedDataWhy {threshold}` (BR4.6, Q4).
4. **Filter panel.** `h2` `profile.filterAccounts`; `ProfileFilters` with outcome pills (`outcome.{k}` ×4), `profile.hasDocuments`, relationship pills (`rel.{k}` ×4); `p.denominator` `profile.showingCount {showing, scopedTotal}`.
5. **Accounts.** `h2.section-head` `profile.accounts`; `Reveal as="div"` > `AccountRow` per `vm.accounts`, or `div.empty-state > p` `mine.empty` when there are none.
6. **Side panel.** `aside.p-side[aria-label=prov.title]`: provenance panel (`h2` `prov.title`; `ul.facts` > `li` > `span.k` `profile.{key}`, value, `span.prov[data-p={source}]` `prov.updatedOn`); chambers panel (`h2` `profile.chambers`; `li` > name, `span.k` hours when present, `.prov`); facilities panel only when `vm.facilities` is non-empty (`h2` `profile.facilities`; `MiniList` of `MiniRow` with `Avatar(publicId, avatarHue, 38)`, title `facilityLabel(row)` ("Shefa General Hospital — Dhanmondi branch"), sub `facility.type.{type}`, no figures; `p.note` `profile.facilitySep`, BR2.10, BR2.13).

### 5.4 `ProfileFilters` (client)

**Props:** `filters`, `showing`, `scopedTotal`, `labels` (the pill texts, resolved on the server so the client bundle needs no new keys).

- Renders `div.pillrow[role=group][aria-labelledby=filter heading]` of `Link` pills with the hrefs `filterHref` builds (BR1.6, `lib/doctor-filters.ts`), `scroll={false}` and `prefetch={false}`; `.pillrow a` is in T-011's press list, so the pills need no `data-press`.
- On click it flips the clicked pill's `aria-current` at once (optimistic), then lets the navigation run.
- When the server returns a new `showing` value, it announces `profile.showingCount` once through `useAnnounce()` (BR4.5). It does nothing on first mount, so the page load stays quiet (CR-004's arrival announcement belongs to `ViewShell`).
- Without script the same links navigate and the server renders the pressed state.

`ConditionPills` is the same component in its condition mode (one selected or "all").

### 5.5 `ClaimSheet` and `ClaimButton` (client, Question 9)

```text
ClaimButton({doctorName}):
  [open, setOpen] = useState(false)
  guard = useAuthGate().guard                 // T-102: signed out -> gate (auth.gate.body); unverified -> gate (auth.gate.verifyToAct)
  return button.btn.ghost.small#claim type=button onClick=guard(() => setOpen(true)) > profile.claimThis
         + ClaimSheet(open, onClose)
ClaimSheet({open, onClose}): Sheet(open, title=profile.claimThis, onClose) > p profile.claimNote
  // TODO(T-204): claim form (method, private evidence note) and claimProfileAction replace this body.
```

`useAuthGate()` throws outside T-102's `AuthGateProvider`; the patient layout renders the provider, and every test that renders the button wraps it (BR1.10, T-102 F26). If T-102's `useAuthGate` is missing when Code Generation starts, the button opens the sheet for everyone with the note only and an `ASSUMPTION(T-202)` marker, and an S3 row is raised.

## 6. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn/doctors` | 11 cards in Bengali alphabetical order, Bengali digits, every card with "রেজিস্ট্রেশন যাচাই করা হয়নি"; ten with "সীমিত তথ্য" (all but d1); d11's compact distribution reads "জানানো হয়নি" | BR2.2, BR2.4, BR2.6, BR2.11, BR3.5 |
| Activate a doctor name | Route transition (layout), profile loads | BR5.1 |
| Open an old or merged id | 308 to the current id, same locale and cleaned filters | BR1.3 |
| Open `/en/doctors/a1b2c3d4e5-any-slug` | Same profile as without the slug; canonical without slug | BR1.2, BR1.8 |
| Open `/en/doctors/abcdefghiu` (a `u`, outside Crockford base32) | 404 page | BR1.2 |
| Open d11's profile | No fee and no languages row; sentiment and outcome read "Not provided"; hero "1 patient experience · Limited data"; r25's row has no sentiment or outcome badge and reads "No documents" | BR2.2, BR2.4, BR2.7, BR2.8 |
| Open a hidden or unknown id | 404 page | BR1.4 |
| Select a condition pill | URL gains `condition=`, other filters kept; distributions and accounts scoped; "showing x / y" announced; no scroll jump | BR1.6, BR3.8, BR4.5 |
| Select the selected outcome pill again | It turns off | BR1.6 |
| `?outcome=great` | Ignored; page renders unfiltered | BR1.5 |
| `?condition=<another doctor's condition>` | 307 to the URL without `condition` | BR1.5 |
| Filters leave no accounts | Distributions still for the scoped set; "showing 0 / y"; empty state `mine.empty` | BR3.8 |
| A doctor with 3 accounts, 2 without sentiment | "of 1 patient experience · …", "Not provided: 2", "Limited data — Fewer than 5 …"; hero "3 patient experiences · Limited data" | BR2.3, BR2.4, BR2.5 |
| A doctor with no accounts | Sentiment and outcome read "Not provided"; condition list is "All conditions (0)"; breakdown has no rows; accounts empty state | BR2.2, BR2.8 |
| "Is this you?" signed out | T-102 gate sheet | BR8.2 |
| "Is this you?" verified | Sheet with the claim note | BR8.2 |
| Reduced motion | Instant route swap, no stagger; every step completes | BR5.6 |

## 7. T-202's section of `patient.css`

Appended after T-011's rules, under one comment header. Every rule carries `/* added: T-202 <reason> */`, uses only T-011 tokens, and declares no motion (BR5.4, BR7.1).

| Selector | Why | Declarations (tokens only) |
|---|---|---|
| `.pillrow a` | Pills are links (Q6); mirror T-011's `.pillrow button` look | inline-flex, `min-block-size: var(--target)`, padding `var(--space-2) var(--space-4)`, `--radius-chip`, `--rule-strong` border, `--ink` text |
| `.pillrow a[aria-current="true"]` | Selected state with a non-colour cue (BR4.4) | `--primary` text and border, `--primary-soft` fill, heavier border width, `::before` check mark drawn with borders, gap `--space-1` |
| `.pillrow a:focus-visible` | Focus ring | `outline: var(--focus-ring)` |
| `.dist .not-provided` | The partial "Not provided" line (Q2) | denominator style, `margin-block-start: var(--space-1)` |
| `.table-scroll` | Breakdown never widens the page (BR4.6) | `overflow-x: auto`, `max-inline-size: 100%`; `:focus-visible` ring |
| `.emergency-panel` | Replaces the prototype's inline `style` on the panel and its heading | `--danger-line` border, `--danger-ink` heading |
| `.dist-gap` | Replaces the prototype's inline `margin-top: 22px` | `margin-block-start: var(--space-5)` (T-011 maps 22 px to `--space-5`) |

Constraints on the section (checked by `pnpm check`):
- **Motion.** No `transition`, `animation`, `@keyframes`, `@starting-style` or view-transition rule (`check:motion` M6-file, M11-vt-name).
- **Hover.** No `:hover` rule with `transform`, `translate`, `scale` or `rotate` (M9-hover); hover changes colour, background or border at once.
- **Press.** Press feedback comes from T-011's list: `.pillrow a`, `.doc-entry`, `.mini-row` and `.btn` are in it.
- **Bengali.** No `text-transform` or `letter-spacing` without a `:lang(bn)` reset (M8-bangla).
- **Dark theme.** No column-0 `:root[data-theme="dark"] {` block: the tokens switch, and a component dark rule continues its selector (M10-tokens).
- **Format.** Formatted by Prettier with double-quoted attribute selectors (`format:check`, T-011's CSS override).

No percentage rules exist (Q1 B). If T-011 has no spacing token that fits, Code Generation raises an `ISSUES.md` row instead of adding a literal value.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, Testing Library, jsdom), each in `en` and `bn`, inside `NextIntlClientProvider` with the real dictionaries, `@/i18n/routing` mocked to a plain anchor (ISS-053). View models come from the builders in `components/patient/doctor-test-support.ts`. That file is in the test category of `eslint.boundaries.mjs` and excluded from coverage, and it never imports `@rogikotha/test-support` (FD-040). Page tests mock `@/server/container`, `@/server/auth` and `next/navigation`, and wrap the profile in T-102's `AuthGateProvider`:

| Test | Asserts | Rules |
|---|---|---|
| DistBlock renders "Not provided" for an empty distribution and never a 0 capsule | text, no `.cap` | BR2.2 |
| DistBlock shows every count inside its capsule and one image with the full sentence | each `.cap` has a `<b>` count; parent `role=img`; aria-label lists counts and the total | BR3.1, BR4.3 |
| DistBlock marks limited data with the configured threshold | `threshold: 7` gives "Fewer than 7" (`৭` in bn) | BR2.4, BR2.5 |
| DistBlock adds "Not provided: 2" for a partial distribution | text present when notProvided 2; absent when 0 | BR2.3 |
| DistBlock and OutcomeBlock never render a percentage | 3/1/1 of 5 at threshold 5, full and compact: no `%` in the text or the `aria-label`, no element beyond count, label and denominator | BR3.3 |
| DistBlock takes T-203's criteria and its limited tag | `prefix 'crit.'` renders `crit.good`, `crit.mixed`, `crit.poor`; compact with `title crit.overall` starts the image sentence with "Overall visit"; `limitedNote 'tag'` gives the short tag and no why line | BR8.3, BR4.3 |
| OutcomeBlock shows "{count}/{total}" per row and its self-reported note | four rows, text, track hidden | BR3.2 |
| Byline never links an anonymous author | no `<a>` in `.byline`; text `byline.anonSentence` (task row "anonymous byline") | BR2.12 |
| Byline links a username and leaves a real name as text | pseudonymous `href=/authors/{username}`; named no `<a>`; `isStatic` none | BR2.12 |
| Byline shows a former member as text | `formerMember: true` with a stale `username` → `byline.formerMember`, no `<a>`, no username, no chip | BR2.12 |
| Badge and facilityLabel serve T-203 | `cls 'good'` and `'poor'` render their classes; `facilityLabel({name, branchName})` gives "{name} — {branchName}" and `{name}` alone without a label | BR8.3, BR2.13 |
| AccountRow says "No documents" for zero and pluralises one document | "1 document" (en), no "0 documents" | BR2.7, BR6.2 |
| AccountRow adds an ellipsis only to a truncated excerpt | — | BR3.4 |
| DoctorEntry has no pin control without a slot | no button in `.doc-side` | BR8.1 |
| DoctorEntry always shows Registration not verified and a limited-data badge when sparse | — | BR2.6, BR2.4 |
| DoctorIndex lists cards in the order given, with Bengali digits under bn | order equals input, `Intl.Collator` sorted; count line in Bengali digits (task row "Index renders both locales", 11 entries) | BR2.11, BR3.5 |
| DoctorProfile shows its blocks in the prototype's order | heading sequence: name, conditions, breakdown, filter, accounts, where it came from, practice locations, where they practise (task row "DoctorProfile order") | BR4.1, BR4.2 |
| DoctorProfile omits missing facts and never renders 0 | builder without `fee`: no fee row; no accounts: both blocks "Not provided" (task row "omits") | BR2.2, BR2.8 |
| DoctorProfile marks the selected filters from the URL | `?outcome=helped&docs=1`: those pills `aria-current=true`; "showing x / y" (task row "filters") | BR1.6, BR4.4 |
| DoctorProfile shows provenance with its month and year | "Community submitted · March 2026" / Bengali month and digits | BR2.9 |
| DoctorProfile shows the facility note only with facilities, and labels each branch | rows titled `facilityLabel(row)`; note present with facilities, panel absent without | BR2.10, BR2.13 |
| ProfileFilters announces the new count once and not on mount | `useAnnounce` mock called once after a `showing` change | BR4.5 |
| ClaimButton runs through the gate | inside `AuthGateProvider`: a signed-out viewer opens the gate; a verified one opens the sheet with the note | BR8.2 |
| The segment parser follows the contracts' alphabet | `stripSlug('a1b2c3d4e5-dr-x')` → `a1b2c3d4e5`; an id with `0`, `1`, `8` or `9` is accepted; one with `i`, `l`, `o` or `u` → 404; `?condition=` with a non-Crockford value is dropped | BR1.2, BR1.5 |
| cleanFilters and filterHref | invalid values dropped; `docs=1` → `docs: true`; a repeated parameter keeps its first value; hrefs in the fixed order; toggling a selected pill removes it | BR1.5, BR1.6 |
| The profile page answers 404, 308 and 307 | container fakes return `not_found`, `redirected` and an absent `selectedCondition`; the `next/navigation` mocks see `notFound`, `permanentRedirect('/en/doctors/{target}?…')` and `redirect` | BR1.3, BR1.4, BR1.5 |
| The pages read the threshold asynchronously | an async config fake with threshold 7 → "Fewer than 7" (`৭`) in the breakdown note; the limited marks follow the VM's flags, which T-201 computes | BR2.5 |

Route table (`app/pages.test.tsx`, BR1.10): the `/doctors` row keeps its three assertions with the container mock; the `/doctors/[publicId]` row loads the moved page with `{publicId: 'a1b2c3d4e5'}`, is `ownsHeading`, checks the builder doctor's name and the title "{name} — {brand}", and runs inside `AuthGateProvider`.

Smoke: `components/patient/doctors.smoke.test.tsx` renders `DoctorIndex` with eleven builder cards (one with an empty distribution) and `DoctorProfile` with one builder profile, in both languages: eleven entries, eleven "Registration not verified" badges, "Not provided" on the empty card, headings in order (BR9.2). It runs under `pnpm smoke`.

Gates: `pnpm check` (eleven steps: `contrast`, `contrast:patient` and `check:motion` included), `pnpm smoke`, `npx impeccable detect apps/web/src --no-advisory`, CI green on the Bolt head, `apps/web` at 80% lines or more (BR9.3, BR9.5). Build and Test also walks `/en` and `/bn` `doctors`, `doctors/{d1}` and `doctors/{d11}` beside the prototype's `#doctors/d1` at 1280 and 390 px. It also runs the reduced-motion journey, the 360 px and 200% zoom run, the `curl -sI` redirect check with a browser and a bot user agent, and the throttled Lighthouse run on the profile.
