# Frontend components — U27 `t-307-experience-page-and-index`

Component-level design for `functional-spec.md` (workflows WF1–WF7) and `rules.md` (BR1.1–BR9.3). It follows the recommended option of every question in `functional-design-questions.md` (all decided by the agent under the owner's no-questions instruction of 2026-10-29). Upstream: U21 T-301 and U22 T-302 view models, U15 T-202's shared primitives, U16 T-203's `ConditionLink`, U17 T-204's `AddDoctorPanel`, U45 T-011's tokens, classes, press list, `Reveal` and static groups, U9 T-102's `useAuthGate()` and `AuthGateProvider`, U8 T-101's `getActor()` and container, T-008's `ViewShell` and `useAnnounce()`.

The snippets are interface-level sketches, not code to copy. Class names are the prototype's, as T-011 kept them; nothing here restyles a T-011 class.

## 1. Hierarchy

```text
(patient)/layout.tsx                  SkipLink, DemoMarker, Masthead, .progress (T-011 reading bar), main > RouteTransition > AuthGateProvider, Colophon
│
├── experiences/page.tsx              server; WF5
│   ├── loading.tsx                   static skeleton (Q12)
│   └── ViewShell view="experiences" title=""
│       └── ExperienceIndex {page, hasCursor, locale}
│           ├── IndexHead {kicker nav.discover, title nav.account, note index.experiencesNote}   h1
│           ├── p.note.count-line     "{total} patient experiences" (only with total)
│           ├── Reveal as="div" className="index-list" > AccountRow {card, headingLevel 2} ×n     (T-202)
│           │   | div.empty-state > p index.beFirst + Link.btn /write
│           └── nav.pager[aria-label] > Link "More experiences" (?cursor) · Link "Back to the newest"
│
└── experiences/[publicId]/page.tsx   server; WF1–WF4
    ├── not-found.tsx                 errors.common.notFound + Link /experiences
    └── ViewShell view="account" title=""
        ├── Tombstone {vm}                                  kind tombstone
        │   ├── section.a-head > span.kicker · h1 t(messageKey)
        │   ├── div.callout.warn.tombstone-notice[data-static=notice] > p t(whyKey)
        │   ├── DiscussionSlot {threadSlot}
        │   └── Disclaimer                                 [data-static=disclaimer]
        └── ExperiencePage {vm, locale}                     kind experience
            ├── ExperienceBody {vm, mode "page"}
            │   ├── section.a-head
            │   │   ├── span.kicker  experience.episode · condition
            │   │   ├── h1.a-title.display  RedactedText title
            │   │   ├── Byline variant=lead (T-202)
            │   │   ├── Flags {flags, sentiment}            div.a-flags
            │   │   ├── StatusNow {currentStatus}           Q17
            │   │   └── ReviewerLabels {claims, keys}
            │   └── div.a-grid
            │       ├── div.a-main
            │       │   ├── p.story.story-lead · Chapters (ol.chapters) · p.note.edited-note
            │       │   └── {mainSlots}                     page mode only, from ExperiencePage
            │       └── ExperienceMargin {margin}           aside.a-margin
            └── mainSlots (in order)
                ├── FollowUpSpine {followUps}               ol.spine
                ├── LaterCare {laterCare}                   div.callout + AddDoctorPanel (T-204)
                ├── EvidenceSlot {documentsCount, hasDocuments}   T-308 fills
                ├── DiscussionSlot {threadSlot}             T-402 fills
                ├── ActionsRow {publicId} (client)          .reactions, gated
                ├── RelatedGrid {heading relatedCond, note, cards, emptyKey mine.empty}
                ├── RelatedGrid {heading relatedDoc, cards} (only when non-empty)
                └── Disclaimer                              [data-static=disclaimer]
```

The layout's `RouteTransition` covers both pages; neither page adds one (BR8.1). `ViewShell` keeps the view announcement (`View: Experiences`) and `data-view`; its `title=""` because the page brings its own `h1`.

## 2. Files

| Path | Change | In T-307's owned paths |
|---|---|---|
| `app/[locale]/(patient)/experiences/page.tsx` | Replace the placeholder: read `searchParams.cursor`, load, redirect on an invalid cursor, render `ExperienceIndex`; `generateMetadata` | yes |
| `app/[locale]/(patient)/experiences/loading.tsx` | New: static skeleton | yes |
| `app/[locale]/(patient)/experiences/[publicId]/page.tsx` | Moved from `[id]/page.tsx` with `git mv`: parse, load (cached), branch, `generateMetadata` | yes (the `[id]` removal is a recorded change) |
| `app/[locale]/(patient)/experiences/[publicId]/not-found.tsx` | New: localised 404 inside the patient layout | yes |
| `components/patient/experience/{ExperiencePage,ExperienceBody,ExperienceMargin,Chapters,FollowUpSpine,StatusNow,LaterCare,RelatedCard,RelatedGrid,ReviewerLabels,Flags,Tombstone,EvidenceSlot,DiscussionSlot,Disclaimer,ExperienceIndex,RedactedText}.tsx` | New, server | yes |
| `components/patient/experience/ActionsRow.tsx` | New, client (`useAuthGate`) | yes |
| `components/patient/experience/LaterCareOffer.tsx` | New, client wrapper around T-204's `AddDoctorPanel` | yes |
| `components/patient/experience/*.test.tsx`, `experiences.smoke.test.tsx`, `experience-test-support.ts` | New | yes (test files) |
| `apps/web/src/lib/redaction.ts` (+ test) | New `web-shared` helper: `splitRedacted`, `plainRedacted`, `clipGraphemes` | **no**: recorded owned-path addition |
| `apps/web/src/lib/titles.ts` (+ test) | Add `experienceTitle(vm, t)` beside `titleForView` | **no**: recorded addition |
| `components/patient/shared/Byline.tsx`, `AccountRow.tsx` (+ tests) | Additive props only if T-202 merged without them (§ 5) | **no**: recorded addition |
| `components/patient/composer/ComposerPreview.tsx` | Swap its compact body for `ExperienceBody mode="preview"` (T-306 Q7 A) | **no**: recorded addition |
| `apps/web/src/app/pages.test.tsx` | The two rows (BR1.8) | **no**: T-010's file, recorded |
| `packages/i18n/messages/{en,bn}.json` | Seven new keys (`entities.md` ENT-011); `label.redacted` only if absent | yes |
| `apps/web/src/styles/patient.css` | Append the T-307 section (§ 7) | yes, by the FD-091 amendment |

No file under `apps/worker`, `packages/{domain,application,database,adapters,test-support}`, `packages/i18n/src`, `tokens`/`motion.css` or `server/container.ts` changes, unless a fallback of `functional-spec.md` § 14 applies (each recorded).

## 3. Page components

### 3.1 `experiences/[publicId]/page.tsx` (server)

```text
const load = cache(async (publicId) => container().review.getExperience({publicId}, await getActor()))

generateMetadata({params}):
  publicId = stripSlug(decodeURIComponent((await params).publicId)); null -> return {}
  r = await load(publicId); err -> return {}                    // the page answers 404
  r.kind tombstone   -> {title: documentTitle('account', t), robots: {index: false}}
  r.kind experience  -> {title: documentTitle with experienceTitle(vm, t), openGraph: {title, type: 'article'}}

Page({params}):
  setRequestLocale(locale)
  publicId = stripSlug(...); null -> notFound()                 // BR1.2
  r = await load(publicId)                                       // before any markup (BR1.3)
  err not_found -> notFound(); other err -> throw (error boundary, logged by the logger port)
  return ViewShell(view 'account', title '') > (tombstone ? Tombstone : ExperiencePage)
```

No `loading.tsx` in this folder (Q12). `experienceTitle` lives in `lib/titles.ts` and uses `plainRedacted`.

### 3.2 `experiences/page.tsx` (server)

```text
Page({searchParams}):
  cursor = first(searchParams.cursor)
  r = await container().review.listExperiences({cursor, limit: 20}, await getActor())
  err validation and cursor -> redirect('/{locale}/experiences')  // 307 (BR1.7)
  return ViewShell(view 'experiences', title '') > ExperienceIndex {page: r.value, hasCursor: !!cursor, locale}
generateMetadata: {title: documentTitle('experiences', t)}        // no robots
```

### 3.3 `not-found.tsx`

`section.a-head.index-head` > `h1.display` `errors.common.notFound` + `Link.btn` `/experiences` `nav.account`. It reads the locale through `getTranslations()`; Code Generation confirms that the request locale set by the page's `setRequestLocale` reaches this boundary on the pinned Next.js, otherwise it reads it from the `[locale]` params of the layout (risk R3).

## 4. Experience components (`components/patient/experience/`)

| Component | Props | Renders | Rules |
|---|---|---|---|
| `ExperiencePage` | `vm: ExperiencePageVM`, `locale` | `ExperienceBody` with `mainSlots` in the order of § 1 | BR4.1 |
| `ExperienceBody` | `vm`, `locale`, `mode: 'page' \| 'preview'`, `mainSlots?: ReactNode` | head and grid (§ 1). `lang` from `contentLanguage` (BR4.8). Preview mode: `h2` instead of `h1`, no `StatusNow`, no posted month, no `mainSlots` (BR4.11) | BR4.1, BR4.2, BR4.6, BR4.11 |
| `Flags` | `flags: FlagVM[]`, `sentiment`, `locale` | `div.a-flags` > `Badge` per flag: sentiment class or `plain`; condition as `span.tag`; period `review.episodeDate: {month year}` | BR2.1, BR2.9 |
| `StatusNow` | `status: {dated, body} \| null`, `locale` | `div.status-now` > `p.status-now-k` (`b` `experience.currentStatus` · `time`), `p` clipped body (200 graphemes, `clipGraphemes`), `Link.link-btn[data-press]` `#follow-up-current` `experience.readUpdate`; null → nothing | BR4.4 |
| `ReviewerLabels` | `claims`, `labelKey`, `noteKey` | `p.reviewer-labels` > `span.reviewer-label` (`b`, `i`) ×n; `p.note` why | BR2.2 |
| `Chapters` | `sections`, `lang?` | `h2.section-head` `experience.timeline` + `ol.chapters` > `li` (`span.k` `CHAPTER_KEYS[key]`, `p` `RedactedText`) | BR4.2 |
| `FollowUpSpine` | `items: FollowUpVM[]`, `locale`, `lang?` | `section` > `h2.section-head#follow-ups` `label.followUp`, `p.note` `experience.currentNote`, `ol.spine` > `li[.current#follow-up-current]` > `span.when` (`time` month · current label · kind label), `p` body; later-care items name the provider (`DoctorLink` + `NotVerified` or text) | BR4.3, BR2.3 |
| `LaterCare` | `care: LaterCareVM \| null`, `locale` | `section` > `h2.section-head` `experience.laterCare`, `div.callout.later-care` > `b` provider, body; `p.note` `experience.laterCareNote`; offer per BR4.5 through `LaterCareOffer` | BR4.5 |
| `LaterCareOffer` (client) | `providerText?` | `p.note` `experience.laterCareSubmit` + `AddDoctorPanel {initialName, pendingNoteKey: 'experience.laterCarePending', onSubmitted}`; the panel shows and announces the pending note (T-204's default `compose.addPending` says the reader's draft stays private, which is false here, F12) | BR4.5 |
| `EvidenceSlot` | `documentsCount?`, `children?` | `section[aria-labelledby]` > `h2.section-head` `filter.evidence` + children, or the pre-T-308 states of BR2.4 | BR2.4, BR5.3 |
| `DiscussionSlot` | `threadSlot`, `children?` | `section.discussion` > `h2.section-head` `experience.discussion` (no count), `p.note` `experience.providerNote`, children | BR2.5, BR5.2 |
| `ActionsRow` (client) | `publicId` | `div.reactions` > `button.react` Like, Dislike (no count), Report, Save (`aria-pressed=false`); each `onClick=guard(noop)`; confirmed viewer → `aria-disabled=true`; `p.note.reaction-note` `review.reactionNote` | BR5.1 |
| `RelatedGrid` | `headingKey`, `noteKey?`, `cards`, `emptyKey?`, `locale` | `section` > `h2.section-head`, `p.note.related-note`, `Reveal as="div" className="related-grid"` > `RelatedCard` ×n, or `p.note` empty; nothing at all when `cards` empty and no `emptyKey` | BR4.9, BR8.2 |
| `RelatedCard` | `card: ExperienceCardVM`, `locale` | `Link.related-card[aria-labelledby][aria-describedby]` > sentiment `Badge` (or `Badge plain` `label.notProvided`), `h3#rc-{publicId}` `RedactedText`, `Byline variant=row isStatic`, `p#rm-{publicId}` doctor · month year · outcome label (omitted when null) | BR4.9, BR2.1 |
| `ExperienceMargin` | `margin`, `locale` | `aside.a-margin[aria-label=experience.aboutThis]` > rows of BR4.10; tags `ul.margin-tags`; other accounts `ul.margin-links` | BR4.10, BR3.3, BR2.3, BR2.7 |
| `Tombstone` | `vm: TombstoneVM` | § 1 | BR6.1, BR6.2 |
| `Disclaimer` | — | `div.callout.warn.disclaimer-end[data-static=disclaimer]` `disclaimer.long` | BR2.6 |
| `ExperienceIndex` | `page`, `hasCursor`, `locale` | § 1; pager links carry `data-press` and `min-block-size: var(--target)` | BR7.1–BR7.3 |
| `RedactedText` | `text`, `as?` | segments from `splitRedacted`; token → `span.redacted` `label.redacted` | BR4.7 |

`CHAPTER_KEYS` = `{symptoms: 'compose.symptoms', diagnosis: 'compose.diagnosis', treatment: 'compose.treatment', after: 'compose.after'}`, ported with the prototype's comment. Every component imports only `react`, `next-intl`, `@/i18n/routing`, `@/lib/*`, `@rogikotha/contracts` (types), `@rogikotha/i18n/format`, T-202's shared primitives, T-011's `Reveal` and T-204's `AddDoctorPanel` (FD-093 `web-components`).

## 5. Additions to T-202's primitives (Q1)

| Primitive | Addition | Why |
|---|---|---|
| `Byline` | Anonymous with `alias`: lede `byline.anonSentence`, then `span.byline-name` alias, chip `compose.identity.anon`, no link (T-104 Q6 A) | AC3.3.2 |
| `Byline` | `whenDateTime?: string` (`YYYY-MM`) for `time[dateTime]` beside the visible `when` | BR9.2 |
| `AccountRow` | Title and excerpt through `RedactedText`; `headingLevel` already exists | BR4.7 |

T-202's tests gain one case each. If T-202 already has them at build time, nothing changes.

## 6. Interaction by state

| State | What the reader sees | Motion |
|---|---|---|
| Direct load of a live page | Head, story and margin painted at once; reading-progress bar (T-011) follows the scroll | none on load except the bar |
| Client navigation from a card | The layout's route fade-rise (240 ms, `--rise` 12 px); masthead, demo marker, colophon and disclaimer hold still | `RouteTransition` only |
| Related grid and index list enter | First six cards rise and fade with 40 ms stagger; the rest appear at once | `Reveal` |
| Press on a card, a reaction, a pager link | Scale 0.98 for 100 ms | T-011 press list or `data-press` |
| Reduced motion (OS or in-app) | Everything appears at once; route change is an instant swap | none |
| Signed out, presses Like | Sign-in sheet (T-102) opens; focus moves into it | sheet entry from T-011 |
| Confirmed, presses Like before T-402 | Nothing happens; the button is announced as unavailable | none |
| Hidden or unknown id | Localised "We couldn't find that." with a link to the index; status 404 | none |
| Tombstone | Notice and why, the discussion heading, the disclaimer; status 200, noindex | route fade on client navigation only |
| Index, no experiences | "Be the first to write about it" and a Write button | none |
| Index, invalid cursor | Redirect to the first page | — |
| 360 px | One column; margin after the main column; reactions wrap; cards one per row | same |

## 7. T-307's section of `patient.css`

Appended after T-011's and the earlier page Units' sections, under one comment header. Every rule carries `/* added: T-307 <reason> */`, uses only T-011 tokens and declares no motion (BR8.1, BR8.4).

| Selector | Why | Declarations (tokens only) |
|---|---|---|
| `.status-now` | The current status summary (Q17) | `--surface` fill, `--rule` hairline, `border-inline-start` 3 px `--primary`, `--radius-card`, padding `var(--space-3) var(--space-4)`, `margin-block: var(--space-3)` |
| `.status-now-k` | Its label line | small type token, `--ink-muted` |
| `.related-card h3` | The heading is now an `h3` (`.related-card h4` stays for nothing else) | the `h4` rule's size on the type scale, `margin-block: var(--space-1)` |
| `.related-card` (as a link) | An anchor needs block layout and no underline | `display: block`, `text-decoration: none`, `color: inherit`; `:focus-visible` ring `var(--focus-ring)` |
| `.margin-tags` | Replaces the inline flex style | `display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block-start: var(--space-2); list-style: none; padding: 0` |
| `.margin-links` | Replaces the inline block buttons | `list-style: none; padding: 0; display: grid; gap: var(--space-1)` |
| `.reaction-note`, `.related-note`, `.later-care + .note` | Replace inline `margin-top:10px` / `margin-bottom:14px` | `margin-block: var(--space-3)` |
| `.disclaimer-end` | Replaces inline `margin-top:26px` | `margin-block-start: var(--space-6)` |
| `.redacted` | The removed-detail marker | `color: var(--redact-ink)`, `background: var(--surface-2)`, `border-radius: var(--radius-chip)`, padding `0 var(--space-1)` (no italic, which Bengali script does not have) |
| `.tombstone-notice` | Notice spacing | `margin-block: var(--space-5)` |
| `.pager` | Pager row | `display: flex; flex-wrap: wrap; gap: var(--space-3); margin-block-start: var(--space-6)` |
| `.skeleton`, `.skeleton .bar` | Static loading blocks sized like the real rows | `--rule` fill, `--radius-card`; heights from the type tokens; no animation |
| `.a-title`, `.story` | Long words at 360 px | `overflow-wrap: anywhere` |

If no token fits, Code Generation raises an `ISSUES.md` row for U45 instead of a literal (FD-091 amendment). The exact token names follow T-011 as merged.

## 8. Tests (test-after, `team.md` Testing Posture)

Component tests (Vitest, Testing Library, jsdom), each in `en` and `bn`, inside `NextIntlClientProvider` with the real dictionaries, `@/i18n/routing` mocked to a plain anchor (ISS-053), `ActionsRow` and `LaterCareOffer` inside T-102's `AuthGateProvider` with a stubbed actor. View models come from builders in `components/patient/experience/experience-test-support.ts` (`anExperiencePage()`, `aTombstone()`, `aFollowUp()`, `aLaterCare()`, `aCard()`, `aByline()`), never from `@rogikotha/test-support`.

| Test | Asserts | Rules |
|---|---|---|
| ExperiencePage shows its headings in the prototype's order | `h1` title, then `h2`s: timeline, follow-up, later care, documents, discussion, related condition, related doctor (task row "Section order") | BR4.1 |
| A quick review shows the story and no timeline heading | no `ol.chapters`, no `experience.timeline` | BR4.2 |
| A detailed review lists its filled chapters in order as an ordered list | `ol.chapters > li` ×3 for three filled, keys in symptoms → after order | BR4.2 |
| Missing sentiment and outcome read Not provided, never 0 | badge texts `label.notProvided`; no `0` in `.a-flags` (task row "Not provided") | BR2.1 |
| Claims show the Reviewer's label and the why-note | `<i>` text `label.reviewerLabel` per claim; note present | BR2.2 |
| The spine keeps the view model's order and marks only the current item | VM May, Jun, Aug with `isCurrent` on Aug → `li` order May, Jun, Aug, one `li.current`, it is Aug and holds `experience.currentStatus` (task row "Latest on top", rewritten) | BR4.3 |
| The current status is summarised at the top and links to its entry | `.status-now` inside `.a-head`, before the grid; 300-grapheme body cut to 200 + "…"; link `#follow-up-current`; null → absent | BR4.4 |
| A clip never cuts a redaction token | token at graphemes 195–210 → clip ends before it | BR4.7 |
| A redaction token reads as private detail removed | title and story with the token → `span.redacted` with `label.redacted`; no U+2063 in the text content | BR4.7 |
| Later care links a visible doctor and offers a profile otherwise | `doctor` → link + "Registration not verified"; `offerProfileSubmission` → `experience.laterCareSubmit` and the panel | BR4.5, BR2.3 |
| An edited review shows its month | `editedAt` → `experience.editedOn` with the month in Bengali digits under `bn`; null → absent | BR4.6 |
| The evidence slot never claims No documents over documents | count 0 → `label.noDocuments`; 2 → `evidence.status` notice and "2 documents" (`২`); absent → heading only | BR2.4 |
| The discussion and reactions print no count | no digit in the discussion heading or the react buttons | BR2.5 |
| The controls open the gate for a signed-out viewer | Like → sign-in sheet; confirmed → `aria-disabled=true`, no request | BR5.1 |
| Bylines follow identity | named: no `<a>`; pseudonymous: `href=/authors/{username}`; anonymous: `byline.anonSentence`, the alias, no `<a>`; Former member: `byline.formerMember`, no `<a>` (task row "Byline rules", rewritten) | BR3.2 |
| An anonymous page links nowhere else by the author | `otherAccounts: []` → no other-accounts block; no `/authors/` href in the page | BR3.3 |
| The HTML holds no private field | builder seeded with a uuid, `accountId`, `personaId`, an exact date and a file name in fields the VM must not carry → none appears in `container.innerHTML` | BR3.4 |
| The margin shows Registration not verified under the doctor | margin test (task row "Doctor not verified") | BR2.3, BR4.10 |
| The page has no anonymity caveat | anonymous builder → no `compose.identity.anonNote` text | BR2.7 |
| Author text in the other language carries `lang` | `contentLanguage: 'en'` on `bn` → `lang="en"` on title and story; `mixed` → none | BR4.8 |
| Related cards are links titled by an `h3` | `a.related-card` accessible name equals the title; `h3` present; same-doctor block absent when empty | BR4.9 |
| The tombstone shows no trace of the review | no title `h1` text from any review field, no `.byline`, no `.a-margin`; discussion slot and disclaimer present; notice has `data-static` (task row "Tombstone") | BR6.1, BR6.2 |
| Exactly one disclaimer group per page | one `[data-static=disclaimer]` on page and tombstone | BR2.6 |
| The preview mode renders the same head and story without page-only parts | `mode="preview"`: `h2` title, no status, no slots | BR4.11 |
| The index lists cards in order with a total count line | order equals input; count line `sentiment.totalAccounts` in Bengali digits; no total → no line | BR7.1, BR7.2 |
| The index pager and empty state | `nextCursor` → "More experiences" `?cursor=`; with a cursor → "Back to the newest"; empty → `index.beFirst` and a Write link, no count | BR1.7, BR7.3 |
| The experience page answers 404 for a hidden or malformed id | container fake `not_found` and segment `ilou000000` → `notFound` mock called; no markup rendered first (task row "Hidden → 404") | BR1.2, BR1.3 |
| The tombstone page is noindex and the live page sets no robots | `generateMetadata` outputs | BR1.6 |
| The document title names only visible authors | named "{title} — Written by {name}"; pseudonymous "@user"; anonymous and Former member the title alone; token → label text | BR1.5 |
| An invalid cursor redirects to the first page | `redirect('/en/experiences')` called | BR1.7 |
| The loading skeleton never animates | no `[data-reveal-list]`, `aria-hidden` blocks, one `role=status` line | BR7.4 |
| `lib/redaction` rebuilds its input | property test over generated strings with tokens: join(split) = input | ENT-010 |

Smoke (`experiences.smoke.test.tsx`): the experience page from a builder and the index render in `en` and `bn` with their `h1`, the disclaimer, "Registration not verified" and no raw token. Route table (`app/pages.test.tsx`): the two rows of BR1.8. Detector and contrast: `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` with zero findings; `pnpm check:motion` passes on the new section.
