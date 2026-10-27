# T-307 — Experience page and experiences index port (`/experiences`, `/experiences/{publicId}`)

| Field | Value |
|---|---|
| Story | STORY-REV-002, STORY-REV-003 (public side: edited marker, tombstone), STORY-REV-004 (per-account flags), STORY-IDENT-001 (byline), STORY-USER-001 (author link) |
| Phase / Lane | 3 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 5–6 h agent; validation 1.5 h |
| Depends on | T-302 (projection with follow-ups, later care, edited, tombstone), T-202 (doctor link component), T-203 (condition link), T-102 (gated controls), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-306 (shares only `ExperienceBody` — T-307 owns it; T-306 imports it), T-304, T-305, T-309 |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`, `Reveal`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-307 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, the motion step and the acceptance checks.

## Goal

Port `renderAccount` (the thirteen-section experience page) and `renderExperienceIndex` +
`accountRow` into server components reading `review.getExperience` / `review.listExperiences`,
including the lead byline rules, the follow-up spine with the latest status on top, the later-care
callout, related cards, the margin aside, the tombstone state, and 404 for hidden content. The
discussion block and the evidence section are **slots** filled by T-402 and T-308; this task renders
their headings, notes and empty states so the page is complete without them.

## Read first

1. `docs/implementation/01-conventions.md` §6, §7, §8, §9, §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/experiences`, `/experiences/{publicId}`), §4 "review" queries, §6 (`ExperiencePageVM`, `ExperienceCardVM`)
3. `docs/design/auth-screens-spec.md` §3.7 (gated controls: bookmark, report → sheet)
4. Prototype, read fully: `app.js` 479–553 (`initials`, `byline`, `doctorLink`, `facilityLink`, `accountRow`), 802 (`CHAPTER_KEYS`), 804–936 (`renderAccount`), 937–948 (`bookmarks`, `reactBtn` — reactions are T-402; render the buttons disabled/gated here with the same markup), 949–980 (`evidenceSection` — T-308 replaces; render the heading + `label.noDocuments` note now), 1060–1071 (`relatedCard`), 1745–1810 (`indexHead`, `byName`, `renderExperienceIndex`), `titleForView` case `account` (page title = title + " — written by author" unless anonymous), `setNoindex(false)`; `styles.css` blocks `.a-head`, `.a-title`, `.a-flags`, `.a-grid`, `.a-margin`, `.story`, `.story-lead`, `.chapters`, `.spine`, `.spine .when`, `.spine .current`, `.section-head`, `.related-grid`, `.related-card`, `.reviewer-label`, `.byline*`, `.acct`, `.row-flags`, `.who`, `.excerpt`, `.callout`, `.tag`, `.badge*`, `.index-head`
5. Strings: `experience.*` (37), `byline.*`, `rel.*`, `review.*`, `label.*`, `sentiment.*`, `outcome.*`, `claim.*`, `compose.identity.anon`, `compose.identity.anonNote`, `compose.symptoms|diagnosis|treatment|after`, `index.experiencesNote`, `index.beFirst`, `mine.empty`, `disclaimer.long`, `nav.account`, `profile.kicker`, `filter.condition`, `filter.evidence`, `evidence.*`, T-302's `experience.tombstone|tombstoneWhy|editedOn`
6. `rogikotha-data.js`: `reviews` (fields `title, body, timeline[{k, en, bn}], tags[{g,en,bn}], claims[], period, posted, relationship, identity, author`), `followUps`, `laterCare`, `accountsByAuthor`, `relatedByCondition`

## Owned paths

- `apps/web/src/app/[locale]/(patient)/experiences/page.tsx`, `experiences/[publicId]/page.tsx`, `experiences/[publicId]/not-found.tsx`, `loading.tsx` files
- `apps/web/src/components/patient/experience/**`: `ExperiencePage.tsx` (server), `ExperienceBody.tsx` (the `.a-head` + `.a-grid` left column minus slots — reused by T-306 preview), `ExperienceMargin.tsx`, `Byline.tsx`, `Initials.ts`, `Chapters.tsx`, `FollowUpSpine.tsx`, `LaterCare.tsx`, `RelatedCard.tsx`, `RelatedGrid.tsx`, `ReviewerLabels.tsx`, `Flags.tsx`, `Tombstone.tsx`, `EvidenceSlot.tsx` (placeholder), `DiscussionSlot.tsx` (placeholder), `ActionsRow.tsx` (report/bookmark/react buttons — gated shells), `ExperienceCard.tsx` (`accountRow`), `ExperienceIndex.tsx`, `IndexHead.tsx`
- `apps/web/src/components/shared/Badge.tsx` (if T-202 did not create it — coordinate: check first; if it exists, import)
- `apps/web/src/components/patient/experience/*.test.tsx`
- `apps/web/src/styles/patient.css` — `/* added: T-307 */` only for the tombstone block if `.callout` is insufficient (expected: none)

## Not in scope

Comments/reactions/bookmark behaviour (T-402 fills `DiscussionSlot` and wires `ActionsRow`), evidence groups and the viewer (T-308 fills `EvidenceSlot`), report sheet (T-403), the `/me` entry points (T-409), search-result cards (T-206 reuses `ExperienceCard`? — no: results render doctors/facilities; the experiences **index** is here).

## Steps

1. **Route** `experiences/[publicId]/page.tsx`: `review.getExperience({publicId})`; `not_found` → `notFound()`; `kind: 'tombstone'` → `<Tombstone/>` (kicker `nav.account`, `.callout warn` with `experience.tombstone` + `experience.tombstoneWhy`, then `DiscussionSlot` so replies keep context, then `disclaimer.long`); else `<ExperiencePage vm/>`. `generateMetadata`: title per `titleForView` (`{title} — {experience.writtenBy} {author}` unless anonymous → title only); `robots` default (public), `openGraph` minimal; `html lang` handled by layout.
2. **`Byline`**: pure port of `byline(r, variant, opts)` with variants `lead|row|comment|mine`, `static` (span + name text) vs interactive (name as a `<Link href="/authors/{username}">` — the prototype used a button; use a link, same class `byline-name`), `initials()` ported incl. the `Dr.`/`ডা.` strip and the `@` prefix for pseudonymous; anonymous → `—` avatar + `byline.anonSentence`, no lede, no name, chip `compose.identity.anon`; relationship chip except in `comment`; `when` as `<time>`; `data-identity` attributes kept for CSS.
3. **`ExperienceBody`** in the prototype's order: `section.a-head` (kicker `experience.episode · {condition}`, `h1.a-title.display`, `Byline lead` with `when = postedMonthYear`, `.a-flags` [sentiment badge or `badge plain label.notProvided`, outcome badge or `label.notProvided`, condition `.tag`, `badge plain review.episodeDate: {period}`], `ReviewerLabels` when claims (`.reviewer-label` `<b>` label `<i>` `label.reviewerLabel` + `label.reviewerLabelWhy` note)) → `div.a-grid` → left column: `p.story.story-lead` body (quick) **or** body + `h2.section-head experience.timeline` + `ul.chapters` (detailed; `CHAPTER_KEYS` order `symptoms, diagnosis, treatment, after`; empty sections omitted), `editedOn` note when `editedAt` (`experience.editedOn {date}` under the story), `FollowUpSpine` (heading `label.followUp`, `experience.currentNote`, `ul.spine` where the **first** item is `.current` with `experience.currentStatus` — note the prototype marks the *last* item current because its fixture is ascending; the product VM arrives newest-first, so first is current; keep DOM order newest-first), `LaterCare` (heading `experience.laterCare`, `.callout` `<b>providerText</b>` body, `experience.laterCareNote`), `EvidenceSlot`, `DiscussionSlot` (heading `experience.discussion` + count placeholder `0` rendered through the numeral formatter — T-402 replaces), `ActionsRow` (`.reactions`: helpful/not-helpful `.react` buttons with counts `0` disabled until T-402, `review.report` button gated per auth spec §3.7, bookmark button gated; `review.reactionNote`), related by condition (`experience.relatedCond`, `experience.relatedNote`, `.related-grid` of `RelatedCard` or `mine.empty`), same doctor (`experience.relatedDoc`), `.callout warn disclaimer.long`.
4. **`ExperienceMargin`** (`aside.a-margin`): anon note block when anonymous; period; published (`experience.published` — add key? The prototype used an inline literal `Published/প্রকাশ`; **add** `experience.publishedLabel` in both dictionaries); doctor (`profile.kicker` + link + `label.notVerified`); condition (`filter.condition` + link); tags; other accounts by the same public persona (`experience.otherAccounts`) — `[]` for anonymous.
5. **`RelatedCard`**: port (a `<Link>` styled as `.related-card` — the prototype used a `<button>`; use an anchor so middle-click works, keep the class): sentiment badge, `h4` title, static row byline, `doctor · period · outcome`.
6. **Index** `experiences/page.tsx` + `ExperienceIndex`: `indexHead(nav.account, index.experiencesNote)` + list of `ExperienceCard` (port of `accountRow`: `.row-flags` sentiment/outcome/condition/`documents` count badge or `label.noDocuments`, `h3`, `Byline row`, `.who` episode date + doctor link, `.excerpt` (grapheme-truncated by the query), `review.readFull` link) ordered by `recent` (neutral), page size 20 with a simple "more" link; empty → `index.beFirst`.
7. **Numerals**: every count through `formatNumber(n, locale)`; every month/year through `formatMonthYear`.
8. **Announce** page title on navigation via the layout's `LiveRegion` (already global).
9. Tests in both locales: sections present/absent per VM shape; anonymous byline has no link and no name; spine first item current; tombstone renders no title/author; detailed review renders four chapters and omits empty ones; index empty state; `not_found` → 404.
10. `npx impeccable detect apps/web/src/components/patient/experience --no-advisory`; `pnpm check`; hand-off.
11. **Motion (FD-091).** Wrap the pages in `RouteTransition`. The experiences index and the related cards use `Reveal` (stagger capped at 6 items). The follow-up spine, later-care callout and the experience body are never animated in, so the LCP element is not delayed (AC2.4.6). The advice warning, the tombstone notice and the demo marker are never animated (AC2.4.4). The editorial reading layout follows `design-direction-research.md` §4 through T-011 classes.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Section order | `pnpm --filter @rk/web test ExperiencePage` | headings appear in the order: (title) → timeline → follow-up → later care → evidence → discussion → related condition → related doctor |
| Byline rules | `… test Byline` | named → display name link; pseudonymous → `@username` initial; anonymous → `—` + `byline.anonSentence`, no link |
| Latest on top | `… test FollowUpSpine` | VM `[Aug, Jun, May]` → first `li.current`, text contains `experience.currentStatus` |
| Not provided | `… test Flags` | `sentiment: null` → badge text `label.notProvided`; never "0" |
| Reviewer's label | `… test ReviewerLabels` | claims render `<i>` with `label.reviewerLabel` and the why-note |
| Tombstone | `… test Tombstone` | no `h1` with a title, no byline, `DiscussionSlot` present |
| Hidden → 404 | page test | `getExperience` returning `not_found` → `notFound()` called |
| Doctor not verified | margin test | `label.notVerified` present under the doctor link |
| Numerals | bn test | comment count and page counts render Bengali digits |
| Detector | `npx impeccable detect …` | 0 findings |
| Tree | `pnpm check` | green |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |

## Tests to write

`Byline.test.tsx`, `ExperienceBody.test.tsx`, `FollowUpSpine.test.tsx`, `ExperienceMargin.test.tsx`, `RelatedCard.test.tsx`, `ExperienceCard.test.tsx`, `ExperienceIndex.test.tsx`, `Tombstone.test.tsx`, `page.test.tsx` (404 + metadata title) — each run in `en` and `bn` via a `renderWithLocale` helper (create in `apps/web/src/test/render.tsx` if T-008 did not).

## Threat notes

Not M3. UI-level assertions: the DOM never contains `accountId`, `personaLinks`, `exact_date`, or an original filename (assert via snapshot grep in `ExperienceBody.test.tsx`); anonymous authors have no `href` to a profile.

## Hard-rule checklist

- [ ] Distribution badges show labels only; no score; `label.notProvided` for missing values.
- [ ] "Reviewer's label" framing on claims.
- [ ] Doctor link carries "Registration not verified".
- [ ] Latest reported status on top; cannot be pinned (VM order respected, no UI control).
- [ ] Persistent disclaimer at the end of the column; evidence notice slot reserved.
- [ ] Anonymous author unlinkable; other-accounts list empty for anonymous.
- [ ] Both locales; numerals follow language.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
