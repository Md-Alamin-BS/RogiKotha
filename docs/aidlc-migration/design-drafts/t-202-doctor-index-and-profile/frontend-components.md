# Frontend components — U15 `t-202-doctor-index-and-profile`

Component-level design for `functional-spec.md` (workflows WF1–WF7) and `rules.md` (BR1.1–BR9.4). It follows the recommended option of every question in `functional-design-questions.md`; Question 1 (percentages) awaits the owner, and the parts it touches are marked **[Q1]**. Upstream: U14 T-201's view models and queries, U45 T-011's tokens, classes, `Reveal`, `RouteTransition` and static groups, T-102's `useAuthGate()`, T-008's `ViewShell`, `Sheet` and `useAnnounce()`.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                      T-008/T-011: SkipLink, DemoMarker, Masthead, main > RouteTransition, Colophon, AuthGateSheet (T-102)
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
            │       └── section.panel  facilities (only when non-empty): h2, MiniList > MiniRow ×n, p.note facilitySep
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
| `packages/i18n/messages/{en,bn}.json` | Seven new keys and one changed key (`entities.md` ENT-012) | yes (new keys); the `label.limitedDataWhy` change is listed in the hand-off (Question 4) |
| `packages/i18n/src/format.ts` (+ test) | Add `formatPercent(pct, locale)` **[Q1]** | the task allows it ("prefer adding to `packages/i18n/src/format.ts` and note it") |
| `apps/web/src/styles/patient.css` | Append the T-202 section (§ 7) | yes, by the FD-091 amendment |
| `apps/web/src/server/container.ts` | Wire `directory` queries with Review's `ProviderExperience` implementation (T-201 F6) and expose an anonymous-or-session `Actor` for pages, if T-101/T-104 have not | **no**: recorded owned-path addition |

No file under `apps/worker`, `packages/{domain,application,database,contracts}`, `tokens.css` or `motion.css` changes.

## 3. Page components

### 3.1 `doctors/page.tsx` (server)

```text
generateMetadata(): title documentTitle('doctors', t); robots index; alternates {canonical /{locale}/doctors, languages}
DoctorIndexPage():
  locale  = getLocale()
  actor   = container.actor(locale)
  result  = container.directory.listDoctors({page: 1, pageSize: 50}, actor)    // 10 on the seed (pageSize: ISS row)
  if !result.ok -> throw (programmer/infra error; Next error boundary)
  threshold = container.config.current().limitedDataThreshold
  return ViewShell(view='doctors', title='') > DoctorIndex({cards: result.data.items, total: result.data.total, threshold})
```

### 3.2 `doctors/[publicId]/page.tsx` (server)

```text
loadProfile = cache(async (locale, segment, rawParams) => {
  publicId = parseSegment(segment)                        // BR1.2; null -> notFound()
  resolved = directory.resolvePublicId({kind: 'doctor', publicId})
  if not_found -> notFound()                              // BR1.4
  if resolved.redirected -> permanentRedirect(`/${locale}/doctors/${resolved.publicId}` + query(rawParams))   // 308, BR1.3
  filters = cleanFilters(rawParams)                       // BR1.5
  vm = directory.getDoctor({publicId, ...filters}, actor)
  if not_found -> notFound()
  if filters.condition && !vm.selectedCondition -> redirect(urlWithout('condition'))                         // 307
  return {vm, filters, threshold: config.current().limitedDataThreshold}
})
generateMetadata({params, searchParams}): {vm} = loadProfile(...); title `${vm.name} — ${t('brand.name')}`; canonical without slug and filters
Page({params, searchParams}): data = loadProfile(...); ViewShell(view='profile', title='') > DoctorProfile(data)
```

`params` and `searchParams` are promises in Next 16. No `loading.tsx` is added under `doctors/` (Question 10: a stream would turn the 308 into a meta refresh).

## 4. Shared primitives (`components/patient/shared/`)

| Component | Props | Renders | Rules |
|---|---|---|---|
| `Avatar` | `seed: string`, `hue: number`, `size: number` | The prototype's `avatar()` SVG verbatim as JSX (background disc, 3–5 dashed rings, 4–8 dots), `aria-hidden="true" focusable="false"`; `seed` is the public id | BR3.6, Q8 |
| `Badge` | `cls: 'warn' \| 'plain' \| 'positive' \| 'mixed' \| 'negative'`, `children` | `span.badge.{cls}` | — |
| `NotVerified` | `describedById?: string` | `span.badge.warn[title=label.notVerifiedWhy]` "Registration not verified"; when `describedById` is given, also `span.sr-only#{id}` with the why-text | BR2.6, BR4.8 |
| `DistBlock` | `dist: DistributionVM`, `prefix: 'sentiment.' \| 'outcome.'`, `title?: string`, `compact?: boolean`, `threshold: number`, `showPercent?: boolean` **[Q1]** | Empty → `p.denominator` "Not provided". Otherwise `div.dist` > `div.capsules[role=img][aria-label]` > `span.cap.c-{k}[style=--g]` > `b` count, `em` label, `small.pct` **[Q1]**; then `p.denominator` `sentiment.ofTotal · {title}`; `p.not-provided` when `notProvided > 0` (Q2); `p.limited` "Limited data — {why}" when `limitedData`. Compact: `span.denominator` `sentiment.totalAccounts` + capsules, no limited line (the card adds its badge) | BR2.2–BR2.5, BR3.1, BR3.3, BR4.3 |
| `SentimentBlock` | `dist`, `compact?`, `threshold`, `showPercent?` | `DistBlock` with keys positive, mixed, negative and title `sentiment.title` | — |
| `OutcomeBlock` | `dist`, `threshold`, `showPercent?` **[Q1]** | `h3` `outcome.title`; empty → "Not provided"; else `div.outcome-rows` > `div.outcome-row` (label, `span.track[aria-hidden] > i[style=--w]`, `span.n` "{count}/{total}" [+ " · 60%" **[Q1]**]) ×4; `p.denominator` `outcome.selfReported`; `p.not-provided`; `p.limited` "Limited data" | BR2.2–BR2.4, BR3.2, BR3.3 |
| `Byline` | `author: BylineVM`, `variant: 'row' \| 'lead' \| 'comment' \| 'mine'`, `when?: string`, `isStatic?: boolean`, `relationship?: Relationship` | `p.byline.byline--{variant}` (or `span` when static) > `span.byline-av[data-identity][aria-hidden]` (initials or "—"), lede (`experience.writtenBy` / `byline.commentBy` / `byline.yourIdentity`; none when anonymous), name, `span.byline-id[data-identity]` chip, `span.byline-rel` (not for comments), `time.byline-when`. The prototype's two comment blocks above `byline()` are ported as comments | BR2.12, Q7 |
| `DoctorLink` | `publicId`, `name` | `Link.link-btn.name-link[title=nav.viewDoctor]` to `/doctors/{publicId}` | BR1.2 |
| `FacilityLink` | `publicId`, `label` | `Link.link-btn.name-link[title=nav.viewFacility]` to `/facilities/{publicId}` | — |
| `AccountRow` | `card: ExperienceCardVM`, `headingLevel?: 3 \| 2` | `article.acct` > `div.row-flags` (sentiment Badge when present, outcome `Badge plain` when present, `span.tag` condition when present, documents Badge) · `h3` title · `Byline variant=row` · `p.who` (`review.episodeDate`: month-year · `DoctorLink`) · `p.excerpt` (+ "…" when truncated) · `Link.btn.small.ghost` `review.readFull` to `/experiences/{publicId}` | BR2.7, BR3.4, BR3.5 |
| `EmergencyPanel` | `config: EmergencyConfig`, `locale` | `section.panel.emergency-panel[data-static=emergency]` > `h2` `emergency.title`, `p.lede` `emergency.body`, `div.emergency-lines` > `a[href=tel:…]` (number via `formatDigits`, label `emergency.ambulanceLabel` / `emergency.healthLineLabel` / `emergency.crisis`) ×3, `p.note` `emergency.lastVerifiedLine` with `formatDate`. The prototype's inline `style` attributes become the T-202 class `.emergency-panel` | BR5.5 |
| `MiniList` / `MiniRow` | `children` / `href`, `avatar: ReactNode`, `title`, `sub`, `loc?` | `div.mini-list` > `Link.mini-row` > `span.mini-av`, `span > b title + span sub` | — |
| `IndexHead` | `kicker`, `title`, `note` | `section.a-head.index-head` > `span.kicker`, `h1.display`, `p.lead` | BR4.1 |

`DoctorLink`, `FacilityLink`, `Byline` and `MiniRow` use next-intl's `Link` from `@/i18n/routing`, which keeps the locale. Under `typedRoutes`, dynamic hrefs use the object form (`{pathname: '/doctors/[publicId]', params: {publicId}}`).

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
2. **Conditions panel.** `h2` `profile.conditions`; `p.note` `profile.byCondition`; `ConditionPills`: "All conditions ({accountsTotal})" and one pill per `vm.conditions` "({count})", each a link (BR1.6), `aria-current="true"` on the selected one (Q6); `SentimentBlock(vm.scopedSentiment, showPercent [Q1])`; `div.dist-gap` then `OutcomeBlock(vm.scopedOutcome)`.
3. **Breakdown panel.** `h2#breakdown-h` `profile.breakdown`; `div.table-scroll[role=region][tabindex=0][aria-labelledby=breakdown-h]` > `table.breakdown` > `caption.sr-only` · head `th[scope=col]` `filter.condition`, `sentiment.positive|mixed|negative`, `profile.total` · rows `th[scope=row]` condition, three counts, total + (`span[aria-hidden] ⚠` + `span.sr-only` "Limited data" when `limitedData`); `p.denominator` `label.limitedDataWhy {threshold}` (BR4.6, Q4).
4. **Filter panel.** `h2` `profile.filterAccounts`; `ProfileFilters` with outcome pills (`outcome.{k}` ×4), `profile.hasDocuments`, relationship pills (`rel.{k}` ×4); `p.denominator` `profile.showingCount {showing, scopedTotal}`.
5. **Accounts.** `h2.section-head` `profile.accounts`; `Reveal as="div"` > `AccountRow` per `vm.accounts`, or `div.empty-state > p` `mine.empty` when there are none.
6. **Side panel.** `aside.p-side[aria-label=prov.title]`: provenance panel (`h2` `prov.title`; `ul.facts` > `li` > `span.k` `profile.{key}`, value, `span.prov[data-p={source}]` `prov.updatedOn`); chambers panel (`h2` `profile.chambers`; `li` > name, `span.k` hours when present, `.prov`); facilities panel only when `vm.facilities` is non-empty (`h2` `profile.facilities`; `MiniList` of `MiniRow` with `Avatar(publicId, hue, 38)`, title "{name} — {branchName}" when a branch name exists, sub `facility.type.{type}`; `p.note` `profile.facilitySep`, BR2.10).

### 5.4 `ProfileFilters` (client)

**Props:** `filters`, `showing`, `scopedTotal`, `labels` (the pill texts, resolved on the server so the client bundle needs no new keys).

- Renders `div.pillrow[role=group][aria-labelledby=filter heading]` of `Link` pills with the hrefs of BR1.6, `scroll={false}` and `prefetch={false}`.
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

If T-102's `useAuthGate` is missing when Code Generation starts, the button opens the sheet for everyone with the note only and an `ASSUMPTION(T-202)` marker, and an S3 row is raised.

## 6. Interaction by state

| Action | Result | Rules |
|---|---|---|
| Open `/bn/doctors` | 10 cards in Bengali alphabetical order, Bengali digits, every card with "রেজিস্ট্রেশন যাচাই করা হয়নি"; nine with "সীমিত তথ্য" | BR2.4, BR2.6, BR2.11, BR3.5 |
| Activate a doctor name | Route transition (layout), profile loads | BR5.1 |
| Open an old or merged id | 308 to the current id, same locale and filters | BR1.3 |
| Open `/en/doctors/abcdefghij-any-slug` | Same profile as without the slug; canonical without slug | BR1.2, BR1.8 |
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

Appended after T-011's rules, under one comment header; every rule carries `/* added: T-202 <reason> */`, uses only T-011 tokens, and declares no motion (BR5.4, BR7.1).

| Selector | Why | Declarations (tokens only) |
|---|---|---|
| `.pillrow a` | Pills are links (Q6); mirror T-011's `.pillrow button` look | inline-flex, `min-block-size: var(--target)`, padding, `--radius-chip`, `--rule-strong` border, `--ink` text |
| `.pillrow a[aria-current="true"]` | Selected state with a non-colour cue (BR4.4) | `--primary` text and border, `--primary-soft` fill, heavier border width, `::before` check mark drawn with borders |
| `.pillrow a:focus-visible` | Focus ring | `outline: var(--focus-ring)` |
| `.dist .pct`, `.outcome-row .n .pct` **[Q1]** | Percentage after the count, smaller and muted | `font-size: var(--fs-small)`, `color: var(--ink-muted)` |
| `.dist .not-provided` | The partial "Not provided" line (Q2) | denominator style |
| `.table-scroll` | Breakdown never widens the page (BR4.6) | `overflow-x: auto`, `max-inline-size: 100%`; `:focus-visible` ring |
| `.emergency-panel` | Replaces the prototype's inline `style` on the panel and its heading | `--danger-line` border, `--danger-ink` heading |
| `.dist-gap` | Replaces the prototype's inline `margin-top: 22px` | `margin-block-start` from T-011's spacing |

If T-011 has no spacing or percentage token that fits, Code Generation raises an `ISSUES.md` row instead of adding a literal value.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, Testing Library, jsdom), each in `en` and `bn`, inside `NextIntlClientProvider` with the real dictionaries, `@/i18n/routing` mocked to a plain anchor (ISS-053), view models from builders:

| Test | Asserts | Rules |
|---|---|---|
| DistBlock renders "Not provided" for an empty distribution and never a 0 capsule | text, no `.cap` | BR2.2 |
| DistBlock shows every count inside its capsule and one image with the full sentence | each `.cap` has a `<b>` count; parent `role=img`; aria-label lists counts and the total | BR3.1, BR4.3 |
| DistBlock marks limited data with the configured threshold | `threshold: 7` gives "Fewer than 7" (`৭` in bn) | BR2.4, BR2.5 |
| DistBlock adds "Not provided: 2" for a partial distribution | text present when notProvided 2; absent when 0 | BR2.3 |
| DistBlock shows percentages only when not limited **[Q1]** | 3/1/1 of 5 at threshold 5 shows 60%, 20%, 20%; 2/1 of 3 shows none; compact shows none | BR3.3 |
| OutcomeBlock shows "{count}/{total}" per row and its self-reported note | four rows, text, track hidden | BR3.2 |
| Byline never links an anonymous author | no `<a>` in `.byline`; text `byline.anonSentence` (task row "anonymous byline") | BR2.12 |
| Byline links a username and leaves a real name as text | pseudonymous `href=/authors/{username}`; named no `<a>`; `isStatic` none | BR2.12 |
| AccountRow says "No documents" for zero and pluralises one document | "1 document" (en), no "0 documents" | BR2.7, BR6.2 |
| AccountRow adds an ellipsis only to a truncated excerpt | — | BR3.4 |
| DoctorEntry has no pin control without a slot | no button in `.doc-side` | BR8.1 |
| DoctorEntry always shows Registration not verified and a limited-data badge when sparse | — | BR2.6, BR2.4 |
| DoctorIndex lists cards in the order given, with Bengali digits under bn | order equals input, `Intl.Collator` sorted; count line in Bengali digits (task row "Index renders both locales", 10 entries) | BR2.11, BR3.5 |
| DoctorProfile shows its blocks in the prototype's order | heading sequence: name, conditions, breakdown, filter, accounts, where it came from, practice locations, where they practise (task row "DoctorProfile order") | BR4.1, BR4.2 |
| DoctorProfile omits missing facts and never renders 0 | builder without `fee`: no fee row; no accounts: both blocks "Not provided" (task row "omits") | BR2.2, BR2.8 |
| DoctorProfile marks the selected filters from the URL | `?outcome=helped&docs=1`: those pills `aria-current=true`; "showing x / y" (task row "filters") | BR1.6, BR4.4 |
| DoctorProfile shows provenance with its month and year | "Community submitted · March 2026" / Bengali month and digits | BR2.9 |
| DoctorProfile shows the facility note only with facilities | — | BR2.10 |
| ProfileFilters announces the new count once and not on mount | `useAnnounce` mock called once after a `showing` change | BR4.5 |
| ClaimButton runs through the gate | signed-out `guard` mock opens the gate; verified opens the sheet with the note | BR8.2 |
| parseSegment and cleanFilters | slug ignored; malformed → null; invalid values dropped | BR1.2, BR1.5 |

Smoke: `components/patient/doctors.smoke.test.tsx` renders `DoctorIndex` with ten builder cards and `DoctorProfile` with one builder profile, in both languages: ten entries, ten "Registration not verified" badges, headings in order (BR9.2).

Gates: `pnpm check`, `pnpm smoke`, `pnpm check:motion`, `pnpm contrast`, `pnpm contrast:patient`, `npx impeccable detect apps/web/src --no-advisory` (BR9.3). Build and Test also walks `/en` and `/bn` `doctors` and `doctors/{d1}` beside the prototype's `#doctors/d1` at 1280 and 390 px, runs the reduced-motion journey, the 360 px and 200% zoom run, and the throttled Lighthouse run on the profile.
