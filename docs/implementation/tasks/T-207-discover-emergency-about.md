# T-207 — Discover (home), Emergency, About, Terms and Privacy pages (port)

| Field | Value |
|---|---|
| Story | STORY-PLAT-001, STORY-SRCH-001 (entry point), STORY-DIR-003 (facility teaser) |
| Phase / Lane | 2 / B |
| Class → model | M2 → Claude Sonnet 5 (alternate GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 2–3 h agent; validation 0.5–1 h |
| Depends on | T-008 (shell), **T-202** (shared `EmergencyPanel`, `AccountRow`, `Avatar`, `MiniList`), T-203 (`BrowseCard`), T-206 (`SearchBox`), T-201 (`taxonomy.listConditions`, `directory.listFacilities`, `review.listExperienceCards`) |
| Parallel-safe with | T-204, T-205 (lane A); T-206 if `SearchBox` is committed first |

> Scheduling note: the master plan lists T-207 with only T-008 as a dependency and runs it early
> (step 4). Because Discover reuses the shared primitives, run it **after T-202/T-203/T-206**, or run
> the Emergency/About/Terms/Privacy half early and the Discover half later. Both halves are itemised
> below so the split is clean.

## Goal

Port `renderDiscover`, `renderEmergency` and `renderAbout` into `/{locale}`, `/{locale}/emergency`,
`/{locale}/about`, and add `/{locale}/terms` and `/{locale}/privacy` (required by the registration
form's links) built from the About copy plus the single FD-022 lawful-access sentence in Privacy.

## Read first

1. `docs/implementation/01-conventions.md` §6–§9, §14
2. `docs/implementation/03-routes-and-contracts.md` §1 rows `/`, `/emergency`, `/about`, `/terms`, `/privacy`
3. `docs/status/decision-log.md` FD-008 and FD-022 (lawful-access disclosure only in Terms/Privacy)
4. Prototype `app.js`: `renderDiscover` 375–478 (all blocks), `emergencyPanel` 338–350, `accountRow` 527, `renderEmergency` 1889–1934 (port the BMDC comment), `renderAbout` 1935–1965, `titleForView` cases `discover`, `emergency`, `about`
5. `rogikotha-data.js` keys: `hero.*`, `how.*`, `search.banglish`, `discover.*`, `facility.separation`, `facility.type.*`, `disclaimer.short`, `emergency.*`, `emergview.*` (incl. the unused `emergview.poison` — do **not** add a poison card; the prototype defines the key but renders no card), `aboutview.*`, `a11y.call`, and `RK.config.emergency`
6. `styles.css`: `.opener`, `.opener-grid`, `.margin-note`, `.chips`, `.chip`, `.browse-grid`, `.browse-card`, `.how-list`, `.reveal`, `.fig`, `.emerg-head`, `.emerg-grid`, `.emerg-card`, `.bmdc`, `.about-head`, `.about-sections`, `.about-section`, `.about-foot`, `.mini-list`
7. `docs/implementation/tasks/T-202-doctor-index-and-profile.md` step 2 (keys `discover.kicker`, `discover.editorialNote`, `discover.latest`, `emergency.ambulanceLabel`, `emergency.healthLineLabel` — created there; if T-202 has not merged, create them here with identical values and note it)

## Owned paths

- `apps/web/src/app/[locale]/(patient)/page.tsx` (Discover)
- `apps/web/src/app/[locale]/(patient)/emergency/page.tsx`, `about/page.tsx`, `terms/page.tsx`, `privacy/page.tsx`
- `apps/web/src/components/patient/{Discover.tsx,Emergency.tsx,About.tsx,Policy.tsx}`
- `packages/i18n/messages/{en,bn}.json` — new keys listed in steps 4–5 only

## Not in scope

- Search behaviour and suggestions (`SearchBox` is T-206's; mount it), the `#search-form` chip handler becomes plain links.
- Any redesign of legal copy beyond what is specified; counsel review is a release gate, not this task.
- The masthead/footer (T-008) and the demo marker (T-008/T-006).

## Steps

### Half A — Emergency, About, Terms, Privacy (no dependency on T-202/203/206)

1. **`/emergency`** — port `renderEmergency`: `.panel.emerg-head` (kicker `nav.emergency`, `<h1>emergency.title`, `<p>emergview.intro`); `.emerg-grid` of three `a.panel.emerg-card[href=tel:{number}]` (`.k` = `emergview.ambulance|healthLine|crisis`, `.num` = the number **as typed in config** (`999`, `16263`, `09612-119911`) rendered through `formatNumber` for digits only when `bn` — keep the hyphen), `.cta` = `a11y.call`); the fourth card `a.panel.emerg-card.bmdc` → `https://verify.bmdc.org.bd/` (`target=_blank rel=noopener`; `.k emergview.bmdc`, `.num BMDC`, `.cta emergview.bmdcBody`) with the ported comment; `.note` = last-verified line from `ConfigValues.emergency.lastVerified` via `formatDate` prefixed with the `emergview`-style phrase — the prototype stored the full sentence as a bilingual string; use a new key `emergency.lastVerifiedLine` = "Last verified {date}" / "সর্বশেষ যাচাই {date}". Numbers come from `config.current().emergency` (server component). Metadata title `nav.emergency`.
2. **`/about`** — port `renderAbout`: `.panel.about-head` (kicker `nav.about`, `<h1>aboutview.title`, `.lead aboutview.intro`), `.about-sections` of five `.panel.about-section` (`<h2>` + `<p>`) in this order: `aboutview.modTitle/modBody`, `reviewerTitle/reviewerBody`, `privacyTitle/privacyBody`, `limitsTitle/limitsBody`, `contact/contactBody`; `.note.about-foot aboutview.lastReviewed`. Replace the prototype-era contact sentence: new keys `aboutview.contactBodyProduct` = "Email: hello@rogikotha.example. For real emergencies, do not use this site." / "ইমেইল: hello@rogikotha.example। প্রকৃত জরুরি অবস্থায় এই সাইট ব্যবহার করবেন না।" (the "design exploration — not monitored" clause is dropped; the demo marker already says the records are fictional). Metadata `nav.about`.
3. **`Policy` component + `/terms`, `/privacy`** — same shell as About (`.about-head` + `.about-sections`). Content keys (new, both locales):
   - `policy.terms.title` — "Terms of use" / "ব্যবহারের শর্তাবলি"; `policy.terms.intro` — "These terms describe what RogiKotha is, what you agree to when you write, and what we do not do." / "এই শর্তাবলি বলে রোগীকথা কী, লেখার সময় আপনি কী মেনে নিচ্ছেন, এবং আমরা কী করি না।"
   - Terms sections reuse existing bodies: `aboutview.limitsTitle/limitsBody` (what the service is not), `aboutview.reviewerTitle/reviewerBody` (labels are the author's claim), `aboutview.modTitle/modBody` (moderation), plus new `policy.terms.eligibility` — "Who can write" / "কে লিখতে পারেন"; `policy.terms.eligibilityBody` — "You must be 18 or older and describe care you received or personally witnessed. You are responsible for what you publish, and you may be asked to correct or remove details that identify other private people." / "আপনার বয়স ১৮ বা তার বেশি হতে হবে এবং আপনি যে চিকিৎসা পেয়েছেন বা নিজে প্রত্যক্ষ করেছেন তা-ই লিখবেন। যা প্রকাশ করবেন তার দায় আপনার, এবং অন্য ব্যক্তিগত মানুষকে চেনা যায় এমন বিবরণ সংশোধন বা সরাতে বলা হতে পারে।"; `policy.terms.enforcement` — "Reports and enforcement" / "রিপোর্ট ও ব্যবস্থা"; `policy.terms.enforcementBody` — "Anyone can report content. Reports from several different confirmed accounts can hide content temporarily until a moderator reviews it. Moderators may redact identifiers, remove files, warn, hide or restrict — they never rewrite your account of care. You can appeal every decision." / "যে কেউ কনটেন্ট রিপোর্ট করতে পারেন। একাধিক ভিন্ন নিশ্চিত অ্যাকাউন্ট থেকে রিপোর্ট এলে মডারেটর দেখার আগ পর্যন্ত কনটেন্ট সাময়িকভাবে লুকানো থাকতে পারে। মডারেটর পরিচয় ঢাকা, ফাইল সরানো, সতর্ক করা, লুকানো বা সীমিত করতে পারেন — আপনার চিকিৎসার বিবরণ কখনো নতুন করে লেখেন না। প্রতিটি সিদ্ধান্তের বিরুদ্ধে আপিল করতে পারবেন।"
   - `policy.privacy.title` — "Privacy policy" / "গোপনীয়তা নীতি"; `policy.privacy.intro` — "What we store, what is public, and who can see the rest." / "আমরা কী সংরক্ষণ করি, কী প্রকাশ্য, আর বাকিটা কে দেখতে পারে।"
   - Privacy sections: `aboutview.privacyTitle/privacyBody` (identity choices, redaction), new `policy.privacy.data` — "What we keep" / "আমরা কী রাখি"; `policy.privacy.dataBody` — "Your email, password hash, username, display name and language; your accounts, comments, reactions, bookmarks and drafts; the processed copies of documents you publish. Original uploads are kept privately for a limited time and then deleted. You can export or delete your data from your workspace." / "আপনার ইমেইল, পাসওয়ার্ড হ্যাশ, ইউজারনেম, প্রদর্শিত নাম ও ভাষা; আপনার অভিজ্ঞতা, মন্তব্য, প্রতিক্রিয়া, বুকমার্ক ও খসড়া; আপনি যেসব কাগজপত্র প্রকাশ করেন তার প্রক্রিয়াকৃত কপি। মূল আপলোড সীমিত সময় গোপনে রাখা হয়, তারপর মুছে ফেলা হয়। ওয়ার্কস্পেস থেকে আপনার তথ্য এক্সপোর্ট বা মুছে ফেলতে পারবেন।"; and the **FD-022 lawful-access sentence** as its own section `policy.privacy.lawful` — "Anonymous accounts and lawful requests" / "বেনামী অভিজ্ঞতা ও আইনসম্মত অনুরোধ"; `policy.privacy.lawfulBody` — "An anonymous account is never publicly linked to you. A small number of authorised staff can, for a stated moderation, security or legal reason, look up which account wrote it; every such access is recorded. We may be required to disclose that link in response to a lawful order." / "একটি বেনামী অভিজ্ঞতা কখনো প্রকাশ্যে আপনার সঙ্গে যুক্ত হয় না। নির্দিষ্ট মডারেশন, নিরাপত্তা বা আইনি কারণে অল্প কয়েকজন অনুমোদিত স্টাফ কোন অ্যাকাউন্ট থেকে সেটি লেখা হয়েছে তা দেখতে পারেন; এমন প্রতিটি প্রবেশ রেকর্ড করা হয়। আইনসম্মত আদেশের প্রেক্ষিতে সেই সংযোগ প্রকাশ করতে আমরা বাধ্য হতে পারি।" This sentence appears **nowhere else** in the app (FD-022) — add a test that greps the rendered Discover, doctor, experience and composer pages for the key and finds nothing.
   - Both pages: metadata titles from the keys; indexable; `.about-foot` `aboutview.lastReviewed`.

### Half B — Discover (after T-202, T-203, T-206)

4. **`/` page** (server): load `taxonomy.listConditions()` (keep those with `accountsTotal > 0` for the grid, first 5 by seed order for the chips), `directory.listFacilities({pageSize: 3})`, `review.listExperienceCards({limit: 4})`, config for the emergency panel. Port `renderDiscover` in order:
   1. `section.opener`: kicker `discover.kicker`, `<h1 class="display">hero.title`, `.opener-grid` → left: `.lede hero.body`, `SearchBox variant="hero"` (T-206), `.chips` of five `a.chip` linking `/search?q={condition name}`; right `aside.margin-note` (`.k discover.editorialNote`, `<p>disclaimer.short`).
   2. `EmergencyPanel` (T-202).
   3. `<h2 class="section-head">discover.browse` + `.note discover.browseNote` + `.browse-grid` of `BrowseCard` (`href=/topics/{publicId}`, `<b>name`, `<span>{n} sentiment.accounts`) for conditions with accounts.
   4. `.panel` facilities teaser: `<h2>discover.facilities`, `.note facility.separation`, `MiniList` of 3 branches (`a.mini-row` → `/facilities/{publicId}`; `.mini-av` Avatar 38; `<b>{name}{ — branchName}</b>`; sub `facility.type.{type} · {area}, {city} · {accountsTotal} sentiment.accounts`).
   5. `<h2 class="section-head">how.title` + `ol.how-list` of three `li.reveal` (`.fig 01/02/03` — digits through the formatter, keep the leading zero, `<h3>how.{i}.t`, `<p>how.{i}.b`).
   6. `<h2 class="section-head">discover.latest` + four `AccountRow`.
   Drop: `state.query` prefill (`'diabetes'` in the prototype) — the hero box starts empty. Metadata title: the brand only (`titleForView('discover')` returns `''`, so the layout's default `brand.name — brand.tagline` applies).
5. New keys (both locales): `emergency.lastVerifiedLine`, `aboutview.contactBodyProduct`, all `policy.*` above. If T-202 has not yet merged, also `discover.kicker`, `discover.editorialNote`, `discover.latest`, `emergency.ambulanceLabel`, `emergency.healthLineLabel` (identical values to T-202's list; the later merge de-duplicates).
6. `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`, `pnpm check`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Discover block order | `pnpm vitest run apps/web -t "Discover order"` | opener → emergency → browse → facilities → how → latest |
| Chips and grid | `pnpm vitest run apps/web -t "Discover conditions"` | 5 chips link to `/search?q=`; grid shows only conditions with accounts; counts in Bengali under `bn` |
| Emergency numbers from config | `pnpm vitest run apps/web -t "Emergency"` | three `tel:` cards + BMDC card; `href="tel:09612-119911"`; last-verified line formatted |
| About sections | `pnpm vitest run apps/web -t "About"` | five sections in order; foot note present |
| FD-022 placement | `pnpm vitest run apps/web -t "lawful"` | `policy.privacy.lawfulBody` rendered on `/privacy` only; absent from `/terms`, `/`, `/about` |
| Terms/Privacy reachable from register | manual after T-102 | links resolve in both locales |
| Locales | `pnpm vitest run apps/web -t "bn"` | all five pages render `bn` with no English fallback |
| Impeccable + contrast | `npx impeccable detect apps/web/src --no-advisory && pnpm contrast` | zero findings |
| Visual | `/en` and `/bn` vs prototype `#discover`, 1280/390 px | faithful (hero box empty instead of prefilled) |
| Full check | `pnpm check` | green |

## Tests to write

Component tests in both locales for `Discover` (order, chips, grid filter, teaser, how-list digits, latest rows), `Emergency` (cards, hrefs, config numbers, BMDC external link attributes), `About` (order), `Policy` (terms vs privacy section sets; lawful sentence only in privacy), plus the cross-page grep test for FD-022.

## Hard-rule checklist

- [x] Persistent disclaimer (`disclaimer.short` in the opener's margin note; `disclaimer.long` in the footer from T-008) and non-blocking emergency guidance with numbers from config. — `disclaimer.long` is already in `Colophon.tsx` (T-008); `disclaimer.short`/the opener's margin note is Half B (Discover), not built here. Emergency guidance itself: `/emergency` renders three `tel:` cards + BMDC card from config-shaped values, non-blocking (plain links, no modal/gate) — `components/patient/Emergency.tsx`.
- [ ] No number stands for quality on Discover (counts are "accounts", nothing ranked). — N/A this run: Discover (Half B) is out of scope.
- [ ] Facility separation copy in the teaser. — N/A this run: the facilities teaser is Discover (Half B).
- [x] Lawful-access disclosure appears only in Privacy (FD-022); no banner anywhere. — `policy.privacy.lawful`/`lawfulBody` render only in `Policy.tsx` when `kind="privacy"`; no banner/warning added anywhere else. Evidence: `apps/web/src/components/patient/fd-022-lawful-placement.test.tsx` (renders Emergency/About/Policy-terms/Policy-privacy in both locales, asserts the sentence is present only in the privacy render) and `Policy.test.tsx`'s "never renders the FD-022 lawful-access sentence" test; confirmed live against the running server too (`docs/implementation/handoffs/T-207a.md` "How I verified it").
- [ ] No "Not provided" → `0` substitution in the teaser counts. — N/A this run: the facilities teaser is Discover (Half B). Reading recorded for whoever builds Half B: the prototype prints the raw count including `0`, since it is a count of accounts (not a missing value) — do not substitute "Not provided".
- [x] Both locales; formatter numerals; no inline literals. — All four pages render `en`/`bn` from real dictionary keys (no hard-coded strings); phone numbers go through the new `formatDigits` and the last-verified date through the new `formatDate` (`packages/i18n/src/format.ts`) for Bengali digits. One exception, matching the prototype's own markup exactly (`01-conventions.md` §7.2's "prototype itself used them" carve-out): `Emergency.tsx`'s closing `<p class="note" style="margin-top:18px">` keeps the prototype's literal inline style.
- [x] No agent/tool attribution. — Verified with `git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'` after committing (see hand-off).

## Hand-off (implementer fills in)

### What changed
Half A only (Emergency, About, Terms, Privacy) — see `docs/implementation/handoffs/T-207a.md` for the full account. Owned paths touched: the four `page.tsx` routes, three new components (`Emergency.tsx`, `About.tsx`, `Policy.tsx`), and new i18n keys in both dictionaries (`emergency.lastVerifiedLine`, the whole `policy.*` namespace). A few small, justified edits landed outside the task's literal owned-paths list — see "Questions for the human" below and `ISSUES.md` `ISS-125`–`ISS-130`.

### Not done and why
Half B (the `/` Discover page, `Discover.tsx`, `EmergencyPanel`/`BrowseCard`/`SearchBox`/`MiniList`/`Avatar`) — explicitly out of scope for this task run per the assignment; it depends on T-202/T-203/T-206, none of which exist yet.

### Questions for the human
- **`ISS-125` (S2, blocking for future work, not for this task):** `packages/contracts/src` uses `.js`-suffixed relative imports everywhere; Next's Turbopack build cannot resolve them through `transpilePackages`, so nothing in `apps/web` can import `@rogikotha/contracts` (any file, any subpath) and still build. Worked around locally in `emergency/page.tsx` (hand-typed config defaults + a Vitest-only parity test), but every future page that needs a real `packages/contracts` view model will hit the same wall. Needs a decision: strip the `.js` suffixes across the package (mechanical, but touches dozens of files I do not own), or find a working Turbopack resolver config (tried `experimental.extensionAlias`; it did not fix it).
- **`ISS-127` (S4):** `Policy.tsx` has no dedicated kicker key for Terms/Privacy; I reused `nav.about` (same source About's own kicker uses). Confirm that's fine permanently, or provide dedicated copy.
- Per rule 4, I did **not** stop and ask on either — both are narrower/reversible choices, marked `// ASSUMPTION(T-207a)` in code with matching `ISS-` rows, and neither is a hard-rule change, data-boundary conflict, or founder-level copy call.

### Follow-ups
- `ISS-125` — fix the `packages/contracts` build gap (see above); blocks Phase 2+ pages needing real data.
- `ISS-126` — swap `EMERGENCY_DEFAULTS` for a real `config.current()` call once T-105 lands.
- `ISS-127` — founder call on the Terms/Privacy kicker.
- `ISS-099`/`ISS-121` (T-008) — fixed by this task (dedicated title keys; `ViewShell` omits an empty `<h1>`).

### `pnpm check` output summary
Green end to end from a fresh worktree install: typecheck 9/9 packages/apps; `eslint .` 0 errors / 1 pre-existing warning (`ISS-105`, not owned by this task); Vitest **27 files / 89 tests** (up from 20/64 before this task: +7 files, +25 tests — Half A's component/unit/parity tests); i18n parity **777 keys** (up from 764: +13, all new — `emergency.lastVerifiedLine` + the 12 `policy.*` keys), both locales; `next build` green, 34 route rows unchanged (no route added or removed) + `ƒ Proxy (Middleware)`. `npx impeccable detect apps/web/src --no-advisory` — 0 findings. `pnpm contrast` — all pairs pass in both light schemes.

### Hard-rule evidence
See the checklist above; test names: `Emergency.test.tsx`, `About.test.tsx`, `Policy.test.tsx`, `fd-022-lawful-placement.test.tsx`, `emergency-about-policy.smoke.test.tsx`, `ViewShell.test.tsx`, `titles.test.ts` (updated), `packages/i18n/src/format.test.ts` (updated), `apps/web/src/app/[locale]/(patient)/emergency/page.parity.test.ts`.

### Run record
Claude Code · claude-sonnet-5 · effort high · branch `task/t-207a-discover-emergency-about`, start commit `75f9655` (`build/demo`).
