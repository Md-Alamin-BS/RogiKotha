# Functional specification — U27 `t-307-experience-page-and-index`

**Written 2026-10-29** against `main` at `14c21a9` (T-010 merged), the working tree of `bolt/t-011-patient-design-and-motion-system` (T-011 phase A committed as `1401e06`: tokens, `motion.css`, `RouteTransition`, `Reveal`, `PublishTick`, layout wiring), and the refreshed drafts of every Unit this one reads. What this draft settles:
- **The T-302 draft is the interface for follow-ups and tombstones.** Spine in date order with one current item, `currentStatus` for the summary at the top, `laterCare.doctor` and `offerProfileSubmission`, `editedAt` for every author correction, `TombstoneVM` with the public id as thread slot and `noindex: true`, and the redaction token rendered here (Questions 6–10, 14, 17).
- **T-202's primitives, not copies.** `Byline`, `AccountRow`, `Badge`, `NotVerified`, `DoctorLink`, `IndexHead` are reused with two additive props (Question 1); a named author is plain text (Question 2).
- **Nothing false on the page.** "No documents" only when there are none (Question 3); no comment or reaction count before T-402 (Question 4).
- **T-010 applied.** Boundary matrix, the route-table rows for the moved route, 80 % lines with untested files counted, `format:check`, `check:identity`, CI before merge. The Unit touches no repository, so `not-implemented.test.ts` (ISS-294) and the migration-count assertions are unchanged.
- **FD-091 and T-011 applied.** No `RouteTransition` in pages, `Reveal` on lists only, press from T-011's list or `data-press`, the reading-progress bar from the layout, no motion in `patient.css`, no morph (Question 16).
- **Owner answers applied:** counts only; "Former member"; no public anonymity caveat; FR46 checkboxes deferred; release 1's three Reviewer's labels. **No FD entry** (§ 15).

| Field | Value |
|---|---|
| Unit | U27 `t-307-experience-page-and-index` (kind `ui`, size L, not high risk); Bolt 22, the milestone demo "share and read"; depends on U22 T-302, U15 T-202, U16 T-203, U9 T-102, U3 T-010, U45 T-011; U28 T-308, U31 T-402 and U42 T-503 depend on it; U26 T-306 and U38 T-409 reuse its components |
| Source | T-307 (`docs/implementation/tasks/T-307-experience-page-and-index.md`, with the FD-091 amendment) |
| Stories | US6.2, US6.3, US6.4, US3.3, US10.2 (`unit-of-work-story-map.md`); motion rows AC2.4.3, AC2.4.4, AC2.4.6 |
| Requirements | FR10, FR11, FR39, FR41, FR42, FR45–FR47, FR55, FR69–FR71, FR78, FR95, NFR1, NFR4, NFR6, NFR7, NFR13 |
| Decisions | FD-008, FD-015, FD-022 (no staff-access banner), FD-024 (equal languages), FD-032 (plain CSS), FD-042 (Bengali review), FD-049 (soft delete), FD-089, FD-091 (redesign and motion), FD-093 (boundaries), FD-094 (parallel Units); D-003 (Registration not verified) |
| Upstream design | `contract-summary.md` C9 (review queries) and "edges between UI Units share components, not domain contracts"; drafts `t-301`, `t-302`, `t-202`, `t-203`, `t-104`, `t-201`, `t-204`, `t-305`, `t-306`, `t-102`, `t-011` |
| Questions | Q1–Q17 in `functional-design-questions.md`, all answered A, decided by the agent under the owner's no-questions instruction of 2026-10-29; each is added to `OWNER-REVIEW-QUEUE.md` when this draft is finalised; § 13 lists the changes under each other option |
| Status | Draft written ahead of the stage on 2026-10-29; none of the upstream Units except T-010 is merged, so their drafts are the interface |

This file is the source of truth for the Unit's workflows and state transitions. `entities.md` holds the data shapes, `rules.md` the numbered rules, and `frontend-components.md` the component props, files, styles and tests.

## 1. What changes, in one paragraph

The two T-008 placeholders become the public experience page (`/{locale}/experiences/{publicId}`) and the experiences index (`/{locale}/experiences`), ported from the prototype's `renderAccount`, `relatedCard`, `indexHead` and `renderExperienceIndex` with the same content, fields and block order, on T-011's "Warm Paper, Soft Depth" look. The page reads U21/U22's `ExperiencePageVM` or `TombstoneVM` through the web composition root and shows, in order: the head (kicker, title, the one lead byline, the flags with "Not provided", the newest status summary, the claims under "Reviewer's label"), the story and its ordered chapters, "Edited {month}", the follow-up spine with the current item marked, the later-care callout (the later doctor linked with "Registration not verified", or an offer to submit a profile), the evidence slot, the discussion slot, the gated actions, related experiences by condition and by doctor, and the persistent disclaimer; the margin beside it holds the period, published month, doctor, condition, tags and the author's other experiences (none for anonymous or former members). A tombstone shows only the removal notice, why the thread is kept, the discussion slot and the disclaimer, and is `noindex`; anything not eligible is a localised 404. The index lists T-202's `AccountRow` cards newest first with a total count line and URL paging. Motion is T-011's: the layout's route transition, the reveal on the index list and the related grids, press feedback, the reading-progress bar; the head, story and spine paint at once so the title stays the LCP element. Seven message keys are added, no query, command, table, migration or FD entry.

## 2. As is and what Bolt 22 can count on

| Element | Today (2026-10-29) | By Bolt 22 |
|---|---|---|
| Routes | `experiences/page.tsx` and `experiences/[id]/page.tsx` render `ViewShell` with `shell.placeholder`; metadata `documentTitle('account')` | unchanged until this Unit |
| Route-table test (T-010) | rows `/experiences` (view `experiences`) and `/experiences/[id]` (`params: {id: 'exp-synthetic-1'}`, view `account`) | updated here (BR1.8) |
| Layout | `(patient)/layout.tsx`: `SkipLink`, `DemoMarker`, `Masthead`, `.progress` bar, `main > RouteTransition`, `Colophon` | U9 T-102 adds `AuthGateProvider` inside `main` |
| Data | No query, no container | U8 T-101 container and `getActor()`; U21 T-301 `review.getExperience`, `review.listExperiences`, `ExperiencePageVM`; U22 T-302 follow-ups, current status, later care, `editedAt`, tombstone; U14 T-201 `ExperienceCardVM` in `experience-card.ts`; evidence stays empty until U25 (Bolt 28) |
| View models | `view-models/experience.ts` T-003 stub (`likes`, `dislikes`, `identityLabel`, `tombstone: boolean`) | T-301/T-302 shapes (`entities.md`) |
| Shared components | `ViewShell`, `Sheet`, `LiveRegion`/`useAnnounce`, `Emergency` | U15 T-202 `components/patient/shared/*`; U16 T-203 `ConditionLink`; U17 T-204 `AddDoctorPanel`; U45 T-011 `Reveal`, `PublishTick` |
| Look and motion | T-011 phase A on its branch: tokens, `motion.css` (press list incl. `.related-card`, `.react`, `.btn`; `[data-static]`; reading bar), 04b classes still verbatim in `patient.css` (`.related-card h4`, hover lifts) | T-011 merged: restyled classes, hover lifts removed, `check:motion` M1–M11, `contrast:patient` |
| Keys | 781 keys; `experience.*` (37), `experience.publishedLabel` exists; no `label.redacted`, `experience.tombstone*`, `experience.editedOn`, `experience.laterCareSubmit` | + T-302's seven keys, T-202's `label.documentsCount` and `sentiment.totalAccounts`, T-104's `byline.formerMember` |
| Seed | 25 reviews (after T-201), follow-up chains on about 15, later care, six published evidence items, comments on several (r1) | anonymous personas with their own aliases (T-104 F6) |

## 3. Settled before this stage

See `functional-design-questions.md` § "Settled before this stage": T-011's look in this Unit's own CSS section; the data is T-301's and T-302's; T-102's gate; indexable pages; the owner's answers; T-010's boundaries and gate. The decisions taken without a question are explained in § 12.

## 4. Workflows

### WF1 — Experience request (`/{locale}/experiences/{segment}`)

1. `publicId = stripSlug(decodeURIComponent(segment))`; null → `notFound()` (BR1.2).
2. `r = await load(publicId)`, a React `cache()` wrapper around `container().review.getExperience({publicId}, actor)`, so `generateMetadata` and the page share one query per request (BR1.5). The page awaits it before producing markup; there is no `loading.tsx` under the segment, so `notFound()` sets status 404 before the first byte (BR1.3, Q12).
3. `err not_found` → `notFound()` → `[publicId]/not-found.tsx` inside the patient layout. Any other error is thrown to the error boundary.
4. `kind: 'tombstone'` → WF3. `kind: 'experience'` → WF2.
5. Metadata: experience → `experienceTitle(vm)` (title alone for anonymous and former members) and `openGraph {title, type: 'article'}`, no `robots`; tombstone → `documentTitle('account')` and `robots: {index: false}` (BR1.5, BR1.6).

### WF2 — Live experience rendering (prototype block order)

1. **Head** (`ExperienceBody`): kicker `experience.episode · {condition}`; `h1.a-title` (redaction-aware, `lang` when the text's language differs); `Byline variant=lead` with the posted month; `Flags` (sentiment or Not provided, outcome or Not provided, condition, treatment period); `StatusNow` when `currentStatus` (Q17); `ReviewerLabels` when claims.
2. **Main column**: story (`p.story.story-lead`), chapters (`ol.chapters`, detailed only, empty omitted), `experience.editedOn` when `editedAt` (Q9).
3. **Main slots** (`ExperiencePage`): `FollowUpSpine` (VM order, `.current` on `isCurrent`, Q6) → `LaterCare` (Q7, Q8) → `EvidenceSlot` (Q3) → `DiscussionSlot` (no count, Q4) → `ActionsRow` (gated, Q5) → related by condition (always headed; `mine.empty` when none) → same doctor (only when any) → `Disclaimer` (`data-static="disclaimer"`).
4. **Margin** (`aside.a-margin`): period, published month, doctor + "Registration not verified", condition, tags, other experiences by the same persona (left out when empty). No anonymity caveat (BR2.7).
5. Motion: none on the head, story, status, spine, later care or disclaimer; `Reveal` on the two related grids; press on cards and controls (BR8.2, BR8.3).

### WF3 — Tombstone

`section.a-head` > kicker `nav.account`, `h1` `t(messageKey)` ("deleted by its author" or "removed by moderators"); `div.callout.warn.tombstone-notice[data-static=notice]` with `t(whyKey)`; `DiscussionSlot {threadSlot}` so replies keep their context (T-402 fills it); `Disclaimer`. Status 200, `noindex` (Q10). Nothing of the removed review appears (BR6.1).

### WF4 — A gated control is pressed

`ActionsRow` (client) calls `useAuthGate().guard(fn)`. Signed out → T-102's sign-in sheet; signed in but unconfirmed → its confirm-email sheet; confirmed → `fn`. Until T-402 (Like, Dislike, Save) and T-403 (Report) replace `fn`, it is a no-op and the button carries `aria-disabled="true"` for a confirmed viewer (`TODO(T-402)`, `TODO(T-403)`, S3 row F13). The same pattern runs the later-care offer: `AddDoctorPanel` gates itself.

### WF5 — Index request (`/{locale}/experiences?cursor=`)

1. `cursor` = the first `cursor` value or none; `listExperiences({cursor, limit: 20})`.
2. `err validation` with a cursor → `redirect('/{locale}/experiences')` (307, BR1.7).
3. `IndexHead(nav.discover, nav.account, index.experiencesNote)`; count line `sentiment.totalAccounts` with `total` when the result carries it (Q13); `Reveal .index-list` of `AccountRow` (headingLevel 2) in the VM order; empty first page → `index.beFirst` and a Write link; `nav.pager` with "More experiences" (`?cursor=nextCursor`) and, on a later page, "Back to the newest".
4. `loading.tsx`: static skeleton of the head and three rows, a screen-reader status line, no animation (BR7.4).

### WF6 — Composer preview (U26 T-306, Q7 of its draft)

`ExperienceBody mode="preview"` renders the head and the main column from T-306's preview VM with `h2` for the title (the composer owns the page `h1`), no posted month, no status summary and no main slots. This Unit swaps `ComposerPreview`'s compact body for it as a recorded addition, so preview and public page share one rendering (BR4.11).

### WF7 — Code Generation order

1. Baseline `pnpm check` green on the Bolt branch; read open `ISSUES.md` rows in the area; check the dependency-check log (no new dependency expected).
2. `git mv experiences/[id] experiences/[publicId]`; update `pages.test.tsx` rows.
3. `lib/redaction.ts` with its tests; `experienceTitle` in `lib/titles.ts`.
4. T-202 additions if missing (§ 5 of `frontend-components.md`), with tests.
5. Components bottom-up: `RedactedText`, `Flags`, `ReviewerLabels`, `Chapters`, `StatusNow`, `FollowUpSpine`, `LaterCare`/`LaterCareOffer`, slots, `ActionsRow`, `RelatedCard`/`RelatedGrid`, `ExperienceMargin`, `ExperienceBody`, `ExperiencePage`, `Tombstone`, `ExperienceIndex`; then the pages, `not-found.tsx`, `loading.tsx`.
6. Keys in both dictionaries; T-307's CSS section.
7. `ComposerPreview` swap (if U26 has merged).
8. Tests and the smoke file; `pnpm check`, `pnpm smoke`, `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`; hand-off with the ISS rows of § 9.

## 5. State transitions

### Experience request outcome

| Segment / result | Page | Status | robots |
|---|---|---|---|
| Not a public id | 404 page | 404 | — |
| `not_found` (missing, draft, pending, hidden, rejected, soft-deleted) | 404 page | 404 | — |
| `tombstone` | Tombstone | 200 | `index: false` |
| `experience` | Experience page | 200 | absent |
| Other error | error boundary | 500 | — |

### What the page shows per view-model state

| VM state | Shown |
|---|---|
| `sentiment` / `outcome` null | "Not provided" badge |
| `sections` empty | no timeline heading |
| `currentStatus` null | no summary in the head |
| `followUps` empty | no follow-up section |
| `laterCare` null | no later-care section |
| `laterCare.doctor` set | doctor link + "Registration not verified" |
| `laterCare.offerProfileSubmission` | provider text, `experience.laterCareSubmit`, `AddDoctorPanel` |
| `editedAt` set | "Edited {month year}" |
| `documentsCount` 0 / > 0 / absent | "No documents" / notice + "{n} documents" / heading only (S2 row) |
| `relatedByCondition` empty | heading, note, "Nothing here yet." |
| `sameDoctor` empty | no section |
| `margin.otherAccounts` empty | no block |
| byline anonymous | "Written anonymously", alias, chip, no link |
| byline former member | "Former member", no link, no chip |

### Control state (Like, Dislike, Report, Save, before T-402/T-403)

| Viewer | Press |
|---|---|
| Signed out | sign-in sheet |
| Signed in, unconfirmed | confirm-email sheet |
| Confirmed | nothing; `aria-disabled="true"` |

### Index page

| Request | Shown |
|---|---|
| No cursor, items | head, count line (with total), list, "More experiences" when `nextCursor` |
| Cursor, items | head, count line, list, "More experiences" when `nextCursor`, "Back to the newest" |
| No cursor, no items | head, `index.beFirst`, Write link |
| Invalid cursor | 307 to the first page |

## 6. Ports and data access

The Unit calls two queries and nothing else, from server components in `app/` (element `web`): `review.getExperience({publicId})` and `review.listExperiences({cursor?, limit?})` through `server/container.ts`, with the Actor from `server/auth.ts`. Components import neither. No server action is added; T-402, T-403 and T-204 bring theirs. `AddDoctorPanel` calls T-204's action itself.

## 7. View models

See `entities.md` ENT-001–ENT-009. Two fields are asked of U21 T-301 (`ExperiencePageVM.documentsCount`, `listExperiences(...).total`); the build adds them as recorded additions with their tests if U21 merged without them (§ 14).

## 8. Developer view — mapping details

- **Months.** `MonthYear {year, month}` → `formatMonthYear`; `time[dateTime]` is `YYYY-MM` in ASCII digits. `Byline` shows the posted month on the lead byline.
- **Redaction.** `splitRedacted(text)` splits on `/\u2063\[redacted\]\u2063/g` (U+2063 written as an escape); `plainRedacted(text, label)` replaces each token with the label for the title; `clipGraphemes(text, max)` uses `Intl.Segmenter(locale, {granularity: 'grapheme'})` and backs off to before a token it would cut.
- **Language.** `lang` on author text when `contentLanguage` is `en` or `bn` and differs from the locale (Q15); `:lang(bn)` type rules then follow the text.
- **Anchors.** `FollowUpSpine` gives `id="follow-ups"` to its heading and `id="follow-up-current"` to the current item; `StatusNow` links to the latter. The anchors carry no data.
- **Ids in the DOM.** Only public ids appear, in hrefs and in `id`/`aria-labelledby` pairs of related cards (`rc-{publicId}`).
- **Slots.** `EvidenceSlot` and `DiscussionSlot` take `children`; T-308 and T-402 change only the lines in `ExperiencePage.tsx` that pass children (T-402 names that hunk in its hand-off), so their edits do not collide.
- **Card byline.** `RelatedCard` and `AccountRow` render `Byline variant=row isStatic` inside a link (no nested link); `AccountRow`'s byline is interactive as T-202 defines.

## 9. Findings and proposed ISS rows

Each becomes an `ISS-` row (next free id at build time) with `Found in` U27 T-307.

| # | Sev | Area | Finding and decision | Owner |
|---|---|---|---|---|
| F1 | S2 | web/routing | A `loading.tsx` beside `[publicId]/page.tsx` streams before `notFound()`, turning every hidden review into a soft 404 (200). Designed out: no loading boundary under the segment (Q12) | U27 |
| F2 | S2 | web/evidence | From Bolt 22 to Bolt 28 the page model has `hasDocuments: false` while cards count six published documents; "No documents" would be false. Designed out with `documentsCount` (Q3); needs one additive field | U27; U21 T-301 |
| F3 | S2 | web/copy | Task step 3 prints `0` for comments and reactions that exist. Designed out: no count until T-402 (Q4) | U27; U31 T-402 |
| F4 | S2 | web/motion | Task step 11 wraps pages in `RouteTransition`; with the layout's one, two `page` elements make the browser skip every route transition. Designed out (BR8.1) | U27 |
| F5 | S2 | web/identity | Task step 4 puts `compose.identity.anonNote` (legal disclosure) in the margin, against FD-022 and AC3.3.6. Designed out (BR2.7, T-301 BR6.13) | U27 |
| F6 | S2 | identity/contracts | T-301 Q18 A gives named bylines `profileUsername` for a link; T-104 Q17 and T-202 Q7 A make named names plain text. The page reads no `profileUsername` (Q2); T-301 and T-104 must agree when finalised | U21 T-301, U11 T-104 |
| F7 | S2 | web/redaction | Nothing renders T-302's token; readers would see `[redacted]` with invisible separators. Designed out with `lib/redaction.ts` and `RedactedText` (Q14); excerpts must not be cut inside a token | U27; U14 T-201, U21 T-301 |
| F8 | S3 | process/task-file | Follow-up order: the task says newest first, T-302 decided date order with a summary at the top. Followed T-302 (Q6, Q17); acceptance row rewritten | U27 |
| F9 | S3 | web/a11y | The prototype's related card is a `button` with an `h4` under an `h2`. Now a link with an `h3`, styled in T-307's section (BR4.9) | U27 |
| F10 | S3 | web/a11y | AC6.2.1 asks for ordered content; the prototype's chapters and spine are `ul`. Now `ol` (BR4.2, BR4.3) | U27 |
| F11 | S3 | web/index | The prototype's count line counts every review; T-301's list has no total. Asked of T-301; left out when absent (Q13) | U21 T-301 |
| F12 | S2 | directory/copy | `AddDoctorPanel`'s pending note `compose.addPending` ("Your experience stays a private draft until then") is false for a reader on an experience page. Designed out: T-204's panel takes `pendingNoteKey` and `initialName`; the page passes `experience.laterCarePending` | U17 T-204; U27 |
| F13 | S3 | web/engagement | Like, Dislike, Save and Report do nothing for a confirmed viewer until T-402 and T-403 (Q5); they must land before the milestone gate | U31 T-402, U32 T-403 |
| F14 | S4 | process/task-file | Task-text drift settled here: the owned `Byline.tsx`, `Initials.ts`, `ExperienceCard.tsx`, `IndexHead.tsx`, `Badge.tsx` (T-202's); the `[id]` folder; kicker `nav.account` (prototype: `nav.discover`); "add `experience.publishedLabel`" (exists); "RouteTransition" step; acceptance rows "named → display name link", "VM [Aug, Jun, May] → first current", "comment count in Bengali digits"; stale prototype line numbers; T-402 and T-409 name T-307's `Byline` and `AccountRow` (T-202's) | U27 (hand-off) |
| F15 | S4 | web/motion | The card-to-story move stays deferred (Q16); T-011's S4 row remains open until U42 measures frame cost | U45 T-011, U42 T-503 |
| F16 | S3 | web/i18n | `not-found.tsx` gets no params; whether the request locale reaches it must be checked on the pinned Next.js (R3) | U27 |

**S1 problems in the inputs:** none remains open. Built as the task reads, F5 and a named-name link without T-104's agreement would each break a founder decision; both are designed out.

## 10. Developer view — accessibility and responsive details

- One `h1` per page: the title, the tombstone message, or `IndexHead`'s. Section heads `h2`; related card titles `h3`; index rows `h2` (T-202 `headingLevel`).
- The margin is `aside[aria-label=experience.aboutThis]`; the pager is `nav[aria-label=experience.pagerLabel]`; the discussion and evidence sections are `section[aria-labelledby]`.
- `aria-disabled` controls stay focusable; the gate sheet moves focus in and back (T-102).
- `ViewShell` announces the view on arrival; the page adds no second live region. `LaterCareOffer` speaks the pending note through `useAnnounce()`.
- 360 px: T-011's single-column `.a-grid` below its breakpoint with a static margin; `.reactions` wraps; 44 px targets (`--target`) on reactions, pager links and the status link; `overflow-wrap: anywhere` on the title and story.
- Bengali: no uppercase or letter-spacing without a `:lang(bn)` reset; the drop cap is already off for Bengali in T-011's `.story-lead`; numerals through `formatNumber` and `formatMonthYear`.

## 11. Developer view — tests

See `frontend-components.md` § 8: 31 component and page tests in `en` and `bn`, the smoke file, the two route-table rows, the detector and contrast runs. Builders live in `experience-test-support.ts`. Every test can fail: the mutation check in Build and Test reorders the spine, prints a `0` reaction count and removes the 404 branch, and expects red.

## 12. Owned paths and recorded additions; decisions without a question

Owned (task file): both routes, `[publicId]/not-found.tsx`, the index `loading.tsx`, `components/patient/experience/**` and its tests, the T-307 section of `patient.css`, the keys. Recorded additions: the `[id]` → `[publicId]` move; `lib/redaction.ts`; `experienceTitle` in `lib/titles.ts`; T-202 primitive props if missing; the `ComposerPreview` swap; `pages.test.tsx` rows; `experience.ts` or `listExperiences` fields only under § 14's fallbacks.

Decided without a question (each is the narrower, reversible reading):
- **`git mv` to `[publicId]`**: Next.js refuses two slug names at one level; T-202 does the same for doctors.
- **No page `RouteTransition`**: the layout's one is the only `page` element (F4).
- **`ol` for chapters and spine**: AC6.2.1; the look is unchanged because `list-style` is already reset.
- **Index kicker `nav.discover`**: the prototype is the source of truth for content.
- **Related card as a link with an `h3`**: middle-click, sharing, heading order (F9).
- **Inline styles to classes**: FD-091 amendment, T-011 spacing tokens.
- **Reuse `experience.publishedLabel`**: it exists.
- **One cached loader, called first by the page**: one query per request and the status set before streaming.
- **Title without anonymous alias or "Former member"**: the tab title is shared in history and bookmarks; the prototype also omits the anonymous author.
- **Localised `not-found.tsx`**: the root one renders outside the locale tree with hard-coded lines.

## 13. If the owner changes an answer

| Question → option | Change |
|---|---|
| Q1 → B | `Byline.tsx`, `Initials.ts`, `ExperienceCard.tsx`, `IndexHead.tsx` under `experience/`; two bylines to keep in step; T-402 and T-409 must choose one |
| Q2 → B | `Byline` links `displayName` through `profileUsername`; T-104 and T-202 change; an FD entry first (T-104's draft) |
| Q3 → B / C | B: "No documents" until Bolt 28 on reviews with documents; C: no evidence section until T-308 |
| Q4 → B / C | B: `0` counts; C: no discussion heading and no actions until T-402 |
| Q5 → B / C | B: `disabled` buttons, no gate check here; C: `ActionsRow` moves to T-402 |
| Q6 → B | The page re-sorts T-302's list newest first; `experience.currentNote` reworded |
| Q7 → B / C | B: text only and a deferral row for AC6.2.5; C: link to `/write` |
| Q8 → B / C | B: a second directory read per page; C: no link, AC6.2.5 fails |
| Q9 → B | T-302 changes `editedAt` to material edits only; AC6.3.1 fails |
| Q10 → B / C | B: robots absent on tombstones; C: status 410 and no thread |
| Q11 → B / C | B: T-011 adds a `notice` static group; C: an escape in `RouteTransition` |
| Q12 → B / C | B: `[publicId]/loading.tsx` and soft 404s; C: no index skeleton |
| Q13 → B / C | B: no count line; C: offset paging in T-301 |
| Q14 → B | the raw token shows until another Unit renders it |
| Q15 → B | no `lang` attributes |
| Q16 → B | T-011 allows per-card names and a size animation (FD note first); U42 measures before release |
| Q17 → B / C | B: the summary heads the follow-up section; C: the full body in the head |

## 14. Fallbacks when a dependency is not merged (FD-094 parallel build)

| Missing at build time | Build does |
|---|---|
| T-202 `Byline` alias form or `whenDateTime` | adds them to T-202's file with tests (recorded) |
| `ExperiencePageVM.documentsCount` | adds it in U21's projection with a test (recorded) if U21 has merged and U22 is not building; otherwise renders the heading only and raises an S2 row |
| `listExperiences(...).total` | leaves the count line out; S3 row for U21 |
| `laterCare.doctor` / `offerProfileSubmission` | provider text only; S2 row for U22 |
| `label.redacted` | adds it to both dictionaries |
| T-204 `AddDoctorPanel` or its `pendingNoteKey` | shows `experience.laterCareSubmit` without the panel; S3 row for U17 |
| T-203 `ConditionLink` | condition as text in the margin; S3 row |
| U26 `ComposerPreview` | no swap; T-306 does it when it merges (its § 15) |

## 15. FD entries

None. No answer changes a hard rule, a data boundary or a founder decision: Q2 keeps T-104's and T-202's reading, Q3 shows a count cards already show, Q10 narrows indexing only for removed content, as T-302's `noindex` already says.

## 16. Risks to verify in Code Generation and Build and Test

- **R1 — field names drift.** T-301 and T-302 may finalise different names (`dated` vs `date`, `laterProvider` shape). The components adapt their props and keep the rules; the reviewer checks the mapping.
- **R2 — `cache()` and metadata.** Confirm on the pinned Next.js that `generateMetadata` and the page share the cached call and that `notFound()` from the page body yields status 404 with streamed metadata (as T-202's F21).
- **R3 — `not-found.tsx` locale.** Confirm the request locale reaches the segment's `not-found.tsx`; otherwise make it a small client component that reads the messages the `[locale]` layout already provides through `useTranslations()`.
- **R4 — `Intl.Segmenter` in jsdom.** Node 24 has it; the test environment must not polyfill it differently.
- **R5 — collisions.** `ExperiencePage.tsx` is edited later by T-402 and T-308 only at their slot lines; `patient.css`, the dictionaries and `pages.test.tsx` are append-only shared files that need a rebase when Units merge in parallel (FD-094).
- **R6 — LCP.** The title stays the LCP element: nothing in the head is revealed, and the Bengali heading font is T-011's `swap` subset. U42 T-503 measures FD-091's release checks on the experience page.

## 17. Acceptance mapping (T-307 acceptance checks)

| Task row | Test or rule | Change |
|---|---|---|
| Section order | ExperiencePage heading order | evidence and discussion headings included; same doctor only when non-empty |
| Byline rules | Bylines follow identity | "named → display name link" reads "named → display name as text" (Q2); anonymous shows the alias |
| Latest on top | spine order + status summary | rewritten: VM May, Jun, Aug → `li.current` Aug, summary Aug at the top (Q6, Q17) |
| Not provided | Missing sentiment and outcome | unchanged |
| Reviewer's label | Claims show the Reviewer's label | unchanged |
| Tombstone | The tombstone shows no trace | plus `noindex` and the static notice |
| Hidden → 404 | 404 for hidden or malformed | plus no loading boundary (F1) |
| Doctor not verified | margin test | plus later care |
| Numerals | Bengali digits | "comment count" replaced by documents count, index count and months (Q4) |
| Detector, Tree | `impeccable detect`, `pnpm check` | unchanged |
| FD-091 motion check | `pnpm check:motion` | T-307's section has no motion at all (M6) |
| FD-091 reduced-motion journey | manual walk | unchanged |
| FD-091 detector and contrast | `impeccable`, `pnpm contrast` | unchanged |

## 18. Cross-Unit changes other drafts must pick up

| Unit | Change |
|---|---|
| U21 T-301 | Add `ExperiencePageVM.documentsCount` (published items, T-201 BR1.5) and `total` on `listExperiences`; drop `profileUsername` from `PageBylineVM` or leave it unread (Q2, F6); keep the redaction token whole when cutting excerpts |
| U22 T-302 | Keep `laterProvider.doctor`, `laterCare.doctor`, `offerProfileSubmission`, `currentStatus`, `editedAt` and `TombstoneVM` as drafted; its BR7.3 consumer is this Unit's `RedactedText` |
| U14 T-201 | Card excerpts never end inside a redaction token; the card byline is T-104's `BylineVM` without alias |
| U11 T-104 | Unchanged; this page follows its Q17 shape |
| U15 T-202 | `Byline`: anonymous alias form and `whenDateTime`; `AccountRow`: title and excerpt through `RedactedText` |
| U17 T-204 | `AddDoctorPanel` gains `initialName?` and `pendingNoteKey?` (F12) |
| U26 T-306 | Imports `ExperienceBody mode="preview"`; this Unit swaps `ComposerPreview`'s body |
| U28 T-308 | Renders `EvidenceSection` as `EvidenceSlot` children; keeps "Documents attached — not medically validated" |
| U31 T-402 | Renders its thread as `DiscussionSlot` children (live and tombstone), replaces `ActionsRow`'s no-ops and adds counts; reuses T-202's `Byline` |
| U32 T-403 | Mounts `ReportSheet` from `ActionsRow`'s Report with target `review:{publicId}` |
| U38 T-409 | `/saved` uses T-202's `AccountRow` |
| U42 T-503 | Experience and index journeys at 360 px and 1280 px in both languages, reduced motion, axe; FD-091 release checks on the experience page; the deferred morph measurement |

## Rules summary

See the table at the end of `rules.md` (BR1.1–BR9.3): routing and metadata (BR1), hard rules on the page (BR2), byline and identity (BR3), body structure (BR4), gated controls and slots (BR5), tombstone (BR6), index (BR7), look, motion and layout (BR8), copy, accessibility and tests (BR9).

## Sources

- `docs/implementation/tasks/T-307-experience-page-and-index.md`; neighbours `T-204`, `T-306`, `T-308`, `T-402`, `T-403`, `T-409`, `T-503`.
- `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/`: `units-generation/{unit-of-work,unit-of-work-dependency,unit-of-work-story-map}.md`, `delivery-planning/bolt-plan.md`, `user-stories/stories.md`, `requirements-analysis/requirements.md`, `contract-design/`.
- `docs/status/decision-log.md` (FD-008 to FD-094); `docs/implementation/01-conventions.md`, `02-data-model.md`, `03-routes-and-contracts.md`; `docs/design/auth-screens-spec.md` §3.7; `docs/planning/research/ui-direction-2026-10-27/design-direction-research.md` §4; `PRODUCT.md`.
- Drafts under `docs/aidlc-migration/design-drafts/`: `t-301-review-module-core`, `t-302-review-changes-and-tombstones`, `t-202-doctor-index-and-profile`, `t-203-facility-and-condition-pages`, `t-104-identity-module`, `t-201-directory-and-taxonomy-modules`, `t-204-provider-submission-claim-field-change`, `t-305-privacy-preview-redaction-publish`, `t-306-composer-wizard`, `t-102-patient-auth-screens`, `t-011-patient-design-and-motion-system`; `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.
- Code: `apps/web/src/app/[locale]/(patient)/{layout.tsx,experiences/**}`, `app/{pages.test.tsx,not-found.tsx}`, `components/patient/{ViewShell.tsx,motion/*}`, `lib/titles.ts`, `styles/{patient,motion}.css`, `packages/contracts/src/{ids,page}.ts`, `view-models/experience.ts`, `packages/i18n/src/format.ts`, `messages/{en,bn}.json`, `eslint.boundaries.mjs`.
- Prototype: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` (`titleForView`, `byline`, `CHAPTER_KEYS`, `renderAccount`, `reactBtn`, `evidenceSection`, `relatedCard`, `indexHead`, `renderExperienceIndex`); `ui-design-prototype/shared/rogikotha-data.js`.
- `docs/implementation/ISSUES.md` (ISS-053, ISS-083, ISS-161, ISS-268, ISS-294).
