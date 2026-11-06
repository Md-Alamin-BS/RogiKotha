# T-202 — Doctor index and doctor profile pages (port)

| Field | Value |
|---|---|
| Story | STORY-DIR-001, STORY-REV-004, STORY-DIR-002 (claim entry point only) |
| Phase / Lane | 2 / B |
| Class → model | M2 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 4–5 h agent; validation 1–1.5 h |
| Depends on | T-201 (VMs + queries), T-008 (shell, `useAnnounce`, `Sheet`), T-011 (tokens, classes, motion; FD-091), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-203 after this task's shared components land (T-203 imports them) — sequence T-202 first; T-204, T-205 (lane A) |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`, `Reveal`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-202 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Goal, Read first, Not in scope, the motion step and the acceptance checks.

## Amendments — release 1 (FD-105)

These decisions are binding and override the text below where they differ. Release 1 builds this task inside Unit U46 `u46-directory`, together with T-201 and T-203 (FD-105; record: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u46-directory/`).

- **Paths as built** — routes `apps/web/src/app/[locale]/(patient)/doctors/page.tsx` and `doctors/[id]/page.tsx`, each reading a `cache()`d loader in `doctors/load.ts` (404 for a malformed or non-public id, 307 for a condition the doctor has no account for); components in `apps/web/src/components/patient/doctors/` (`DoctorIndex`, `DoctorEntry`, `DoctorProfile`, `ConditionPills`, `ProfileFilters`) and the shared primitives in `components/patient/shared/`. URL filters are parsed by `apps/web/src/lib/doctor-filters.ts`. Changes: Owned paths and Steps.
- **FD-106** — distributions show exact counts with their denominator, never a percentage. Changes: the distribution steps and acceptance rows.
- **FD-100** — a member-added doctor shows "added by a member, not confirmed" next to "Registration not verified".
- **Deferred to release 2 (FD-105)** — the "Redirect" acceptance row (merged profiles, F4), the claim sheet and "Is this you?", field changes and photo suggestions (T-204), search filters and the compare tray (T-205, T-206), and paging (F3).

## Goal

Port `renderDoctorIndex` and `renderProfile` (and the helpers they use) into React pages under
`/{locale}/doctors` and `/{locale}/doctors/{publicId}`, faithful to the prototype's content, data, structure and behaviour, on the T-011 look (FD-091), in both locales, reading
`DoctorCardVM` / `DoctorProfileVM` from T-201. This task also creates the **shared patient
primitives** every later patient page reuses (`Byline`, `AccountRow`, `DistBlock`, `SentimentBlock`,
`OutcomeBlock`, `Badge`, `NotVerified`, `EmergencyPanel`, `Avatar`, `MiniList`, `IndexHead`).

## Read first

1. `docs/implementation/01-conventions.md` §6–§9 (i18n, CSS port, React port, routing) and §14
2. `docs/implementation/03-routes-and-contracts.md` §1 (patient rows for `/doctors`), §6
3. `docs/implementation/02-data-model.md` §17 (publication states → 404)
4. Prototype `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js`, read **fully**: `badge` 271, `notVerified` 273, `docCount` 277, `distBlock` 286–316, `sentimentBlock` 317, `outcomeBlock` 321–337, `emergencyPanel` 338–350, `initials` 479, `byline` 485–515 (and the two comment blocks above it — port the comments), `doctorLink` 516, `facilityLink` 521, `accountRow` 527–553, `doctorEntry` 615–635, `profileAccounts` 669–678, `renderProfile` 679–803, `indexHead` 1745, `renderDoctorIndex` 1754–1763; handlers at 2519 (`data-doctor`), 2542–2553 (`data-pcond`, `data-pfilter`, `#claim`); `titleForView` 226 (`profile`, `doctors` cases)
5. `ui-design-prototype/shared/rogikotha-data.js` `avatar` 1451–1477 (port the SVG generation exactly)
6. `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/styles.css` — search for `.p-hero`, `.p-grid`, `.p-side`, `.facts`, `.prov`, `.pillrow`, `.breakdown`, `.doc-entry`, `.dist`, `.capsules`, `.cap`, `.outcome-row`, `.acct`, `.byline`, `.index-head`, `.index-list`, `.count-line` (FD-091) only to see which class names T-011 kept; do not copy its rules, and use the T-011 class names where they differ

## Owned paths

- `apps/web/src/app/[locale]/(patient)/doctors/page.tsx`
- `apps/web/src/app/[locale]/(patient)/doctors/[publicId]/page.tsx`
- `apps/web/src/components/patient/DoctorIndex.tsx`, `DoctorProfile.tsx`, `DoctorEntry.tsx`, `ProfileFilters.tsx` (client), `ClaimSheet.tsx` (client)
- `apps/web/src/components/patient/shared/{Byline.tsx,AccountRow.tsx,DistBlock.tsx,SentimentBlock.tsx,OutcomeBlock.tsx,Badge.tsx,NotVerified.tsx,EmergencyPanel.tsx,Avatar.tsx,MiniList.tsx,IndexHead.tsx,DoctorLink.tsx,FacilityLink.tsx}`
- `apps/web/src/lib/format.ts` additions only if `packages/i18n` lacks a formatter you need (prefer adding to `packages/i18n/src/format.ts` and note it)
- `packages/i18n/messages/{en,bn}.json` — **new keys only**, listed in step 2
- Component tests `apps/web/src/components/patient/**/*.test.tsx`

## Not in scope

- Facility, condition, topic pages → T-203. Search results and compare → T-206. Discover → T-207.
- The claim **command** and its server action → T-204. This task ships `ClaimSheet` with the copy and form fields and calls `claimProfileAction` if it exists; if T-204 has not merged, render the sheet with `// TODO(T-204)` and a disabled submit.
- The "Write about this doctor" button targets `/write?doctor={publicId}`; the composer is T-306.
- (FD-091) Any change to `tokens.css`, `motion.css` or the T-011 shell styles; this Unit adds only `/* added: T-202 reason */` rules in its own section of `patient.css`.

## Steps

1. **Shared primitives first** (they are the contract for T-203/T-206/T-207/T-307):
   - `Avatar({seed, hue, size})` — port `avatar()` verbatim as JSX; `role="img" aria-hidden focusable="false"`.
   - `Badge({cls, children})` → `<span class="badge {cls}">`. `NotVerified()` → `.badge.warn` with `title=label.notVerifiedWhy`, text `label.notVerified`.
   - `DistBlock({dist, prefix, title?, compact?})` — port `distBlock` exactly: empty → `<p class="denominator">label.notProvided`; capsules `<span class="cap c-{key}" style="--g:{count||0.4}"><b>{n}</b><em>{label}</em>` with `role="img"` + `aria-label` = the plain sentence (`"3 positive, 1 mixed, 1 negative — of 5 accounts"`); denominator line `sentiment.of {total} sentiment.accounts · {title}`; `limited` line `label.limitedData — label.limitedDataWhy`. `compact` variant as in the prototype. Numbers through `formatNumber(n, locale)`.
   - `SentimentBlock({dist, compact})` = `DistBlock` with keys `['positive','mixed','negative']`, prefix `sentiment.`, title `sentiment.title`. `OutcomeBlock({dist})` — port `outcomeBlock`: heading `outcome.title`, rows for `helped, none, worse, uncertain` with `.track > i style="--w:{count/total}"` and `.n` = `{n}/{total}`, `outcome.selfReported` denominator, limited line.
   - `Byline({author: BylineVM, variant, when?, static?, relationship?})` — port `byline` including the long comment. Anonymous: avatar glyph `—`, name = `byline.anonSentence`, chip `compose.identity.anon`, **never a link, never accent**. Named/pseudonymous: lede key by variant (`experience.writtenBy` / `byline.commentBy` / `byline.yourIdentity`), name is a `<Link href="/authors/{username}">` with `aria-label = byline.otherBy {name}` unless `static`; chip `byline.identity.{named|pseudonymous}` (map `named→'real'`, `pseudonymous→'pseudo'` to the existing keys `byline.identity.real|pseudo`); relationship chip `rel.{relationship}` (not for `comment`); `when` as `<time>`. `initials` port: strip `Dr.`/`ডা.` prefix; pseudonymous → `@` + first char.
   - `DoctorLink({publicId, name})`, `FacilityLink({publicId, label})` → `<Link class="link-btn name-link" title=nav.viewDoctor|nav.viewFacility>`.
   - `AccountRow({card: ExperienceCardVM})` — port `accountRow`: `.row-flags` = sentiment badge (`badge {sentiment}` text `sentiment.{s}`; omit when undefined), outcome `badge plain`, condition `.tag`, documents badge (`warn` with `{n} label.documentsWord` or `plain label.noDocuments`), `<h3>` title, `Byline variant="row"`, `.who` line (`review.episodeDate: {period}` + `DoctorLink`), `.excerpt` (VM already truncated; append `…`), `.btn.small.ghost` → `<Link href="/experiences/{publicId}">review.readFull`.
   - `EmergencyPanel()` — port `emergencyPanel`; numbers from `ConfigValues.emergency` (server component reads `config.current`); `tel:` hrefs; labels from the **new keys** below; last-verified line via `formatDate`.
   - `MiniList` / `MiniRow({href, avatar, title, sub, loc?})` → `.mini-list > a.mini-row` (the prototype used `<button>`; a navigation is a link — keep the classes).
   - `IndexHead({kicker, title, note})`.
2. **New i18n keys** (both files, same commit): `emergency.ambulanceLabel` (Ambulance / অ্যাম্বুলেন্স), `emergency.healthLineLabel` (Health guidance / স্বাস্থ্য পরামর্শ), `label.documentsWord` (documents / কাগজপত্র), `filter.gender.female` (Female / নারী), `filter.gender.male` (Male / পুরুষ), `profile.total` (Total / মোট), `discover.kicker` (Bangladesh · Public beta / বাংলাদেশ · পাবলিক বেটা), `discover.editorialNote` (Editorial note / সম্পাদকীয় নোট), `discover.latest` (From the latest accounts / সাম্প্রতিক বিবরণ). These replace inline `state.lang === 'bn' ? … : …` literals in the prototype; T-207 reuses the `discover.*` ones.
3. **`/doctors` page** — server component: `directory.listDoctors` sorted by localized name (`localeCompare` with the locale); render `IndexHead(nav.discover, nav.profile, index.doctorsNote)`, `.count-line` `{n} · nav.profile`, `.index-list` of `DoctorEntry`. `generateMetadata` title = `nav.profile`.
4. **`DoctorEntry({card, pinned?, onPin?})`** — port `doctorEntry`: `.doc-entry[role=group]` → `.doc-av` Avatar 48, `<h3>DoctorLink`, `.doc-sub` `{specialty} · {area}, {city}`, `.doc-treats` up to 3 `{condition} ({count})` joined by ` · `, `.doc-flags` NotVerified + documents badge, `.doc-side` compact SentimentBlock + the pin button. The pin button is only rendered when `onPin` is provided (T-206 supplies it); on the index it is absent.
5. **`/doctors/[publicId]` page** — server component: resolve redirect (`directory.resolvePublicId`, `redirect()` 301 on change), load `directory.getDoctor` with URL params `?condition=&outcome=&relationship=&docs=1`; not found or unpublished → `notFound()`. Render `DoctorProfile` exactly in the prototype's block order:
   1. `.panel > .p-hero`: Avatar 118, kicker `profile.kicker`, `<h1>` name, `.p-spec`, `.p-flags` (NotVerified, `{accountsTotal} profile.accounts` lowercased, `prov.provider` badge if `claimed`), `.p-actions` (`.btn` Link to `/write?doctor=` with `profile.write`; `.btn.ghost.small` `profile.claimThis` opens `ClaimSheet`).
   2. `.p-grid` left: conditions panel (`profile.conditions`, note `profile.byCondition`, `.pillrow` with "all" pill `profile.allConditions ({accountsTotal})` + one per condition `({count})`, `aria-pressed` from URL param — these are links that set `?condition=`), then `SentimentBlock(scopedSentiment)` and `OutcomeBlock(scopedOutcome)`.
   3. breakdown panel: `profile.breakdown` table `.breakdown` with headers `filter.condition`, `sentiment.positive|mixed|negative`, `profile.total`; rows per condition; ` ⚠` after total when limited; denominator `label.limitedDataWhy`.
   4. filter panel `profile.filterAccounts`: `.pillrow` of outcome pills (`outcome.{k}`), `profile.hasDocuments`, relationship pills (`rel.{k}`), all as links toggling URL params (`ProfileFilters` is a client component only to keep the pressed state instantaneous; it must still work as plain links); denominator `profile.showing {showing} / {scopedTotal}`.
   5. `<h2 class="section-head">profile.accounts` + `AccountRow` list or `.empty-state` `mine.empty`.
   6. `aside.p-side`: provenance panel (`prov.title`, `ul.facts` li = `.k` key, value, `.prov[data-p]` `prov.{provenance}`) rendering **only** the `facts` the VM provides; chambers panel (`profile.chambers`) with `data-p` provenance; facilities panel (`profile.facilities`, MiniList of branches, note `profile.facilitySep`) only when non-empty.
   Keys for facts labels: `profile.bmdc`, `profile.specialty`, `profile.qualifications`, `profile.languages`, `profile.fee`.
6. **Metadata & a11y**: `generateMetadata` title = doctor name (both locales); `robots: index` (the prototype's `setNoindex(true)` on the profile is a prototype-era guard — public doctor profiles **are** indexable; note this in hand-off). `useAnnounce` "View: profile" equivalent on navigation is handled by the layout; nothing extra here.
7. **`ClaimSheet`** — `Sheet` titled `profile.claimThis`, body `profile.claimNote`, then (signed-in only) a form: method (`text`), evidence note (`textarea`, private) → `claimProfileAction` (T-204). Signed-out: the auth gate copy `auth.gate.title/body` with the two buttons (T-102 owns the gate component `AuthGate`; import it if present, else inline the two links with `// TODO(T-102)`).
8. Run `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`, `pnpm check`.
9. **Motion (FD-091).** Wrap both pages in `RouteTransition`. The doctor index list and the profile's account list use `Reveal` (stagger capped at 6 items). The distribution bars and capsules show their final values at once: no count-up and no animated width. Filter pills change the pressed state with a press fade only. The emergency panel and the not-verified wording are never animated (AC2.4.4).

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Index renders both locales | `pnpm vitest run apps/web -t "DoctorIndex"` | 6 entries alphabetical by localized name; Bengali digits in counts under `bn` |
| Profile block order | `pnpm vitest run apps/web -t "DoctorProfile order"` | headings appear in the order of step 5 |
| Not provided semantics | `pnpm vitest run apps/web -t "omits"` | a doctor with no `fee` shows no fee row; a doctor with zero accounts shows `label.notProvided` in both blocks, never `0` |
| Filters via URL | `pnpm vitest run apps/web -t "filters"` | `?condition=&outcome=helped&docs=1` yields pressed pills and `showing x / y` |
| Redirect | manual: visit an old public id after a T-204 merge (or a seeded redirect) | 301 to the new URL |
| Anonymous byline | `pnpm vitest run apps/web -t "anonymous byline"` | no `<a>` inside `.byline` for an anonymous card; text = `byline.anonSentence` |
| Impeccable + contrast | `npx impeccable detect apps/web/src --no-advisory && pnpm contrast` | zero findings |
| Visual (FD-091) | open `/en/doctors/{d1}` and `/bn/doctors/{d1}` beside the prototype `#doctors/d1` at 1280 and 390 px | same content, fields, order and states as the prototype; the look follows T-011 |
| Full check | `pnpm check` | green |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |
| FD-091: early performance check (NFR13, AC2.4.6) | Lighthouse on a throttled mid-range Android profile (slow 4G, 4x CPU) for the doctor profile page | LCP <= 2.5 s and CLS <= 0.1 recorded in the hand-off; any miss becomes an ISSUES.md row before the next UI Unit starts |

## Tests to write

- Component tests (Testing Library, `en` and `bn`) for `DistBlock` (empty, limited, compact, aria-label sentence), `OutcomeBlock`, `Byline` (three identity modes; `static`), `AccountRow`, `DoctorEntry` (no pin button without `onPin`), `DoctorProfile` (block order, facts omission, filters, claim sheet opens), `DoctorIndex`.
- A snapshot-free DOM assertion that every `.cap` has a `<b>` count and the parent has `role="img"`.

## Hard-rule checklist

- [ ] Distributions show count + denominator; capsules carry their own count; no percentage text, no score.
- [ ] "Not provided" / "No documents" for missing values; no `0`.
- [ ] "Limited data" line when `dist.limited`.
- [ ] `NotVerified` rendered on every entry and on the profile hero.
- [ ] Facility separation note (`profile.facilitySep`) present where the prototype had it.
- [ ] Anonymous author never linked or accent-coloured.
- [ ] Neutral ordering: index is alphabetical; nothing sorts by sentiment.
- [ ] Both locales; numerals via formatter; no inline literals left (grep for `=== 'bn'`).
- [ ] Emergency panel numbers from config; `tel:` links.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
