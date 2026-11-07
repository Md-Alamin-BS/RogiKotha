# Code Generation plan — U20 `t-207-discover-emergency-about` (T-207)

## Summary

- Builds: the release-1 Discover home on U46's module queries and shared primitives (opener with one `h1`, three browse links in place of the search box, up to five topic chips, the editorial note, the shared emergency panel, the browse grid, the three-row facility teaser, how it works, the four newest accounts), section-level failure with a logged `discover.section_unavailable`, the Emergency page read from the `ConfigProvider`, the lawful-access section on Terms, and a localized patient 404 with a catch-all and a dictionary-backed root fallback
- Touches: U20's owned paths only (`apps/web/src/app/[locale]/(patient)/page.tsx`, `(patient)/{emergency,about,terms,privacy}/`, `apps/web/src/components/patient/home/`, `apps/web/src/components/patient/{Emergency,About,Policy}.tsx`), the recorded additions of design § 5 (the 404 files, `app/not-found.tsx`, the contracts stub deletion), plus the append-only shared files below (`en.json`, `bn.json`, the regenerated `keys.ts`, U20's section of `patient.css`, the contracts barrel, the `/` row of `pages.test.tsx`, `ISSUES.md`, `decision-log.md`, `03-routes-and-contracts.md`) and the records
- Tests: the pure `pickChips` and `teaserSub` helpers, the `(patient)/page.tsx` data path with a mocked container (parallel calls, a failing list logged and omitted), component tests of `Home`, `TeaserRow`, `Emergency`, `Policy`, `About` and the 404 views in `describe.each(['en', 'bn'])`, the FD-022 placement test on both legal pages, one new smoke file for the home; no integration test (no database change) and no adversarial tests (not a high-risk Unit)

## Inputs

- Functional Design (reviewed READY, iteration 1): `construction/t-207-discover-emergency-about/functional-design/`: `functional-spec.md` (WF1–WF5, §§ 4–10), `rules.md` (BR1.1–BR6.3), `frontend-components.md` (tree, `Home` props, keys, tests), `functional-design-questions.md` (Q1 the owner's answer; Q2–Q10 decided under the owner's delegation of 2026-11-04), `traceability.json`, and `reviews/review-01.md` (seven Minor findings, all settled in the design; see below).
- Unit entry U20 in `inception/units-generation/unit-of-work.md` (owned paths, stories US12.1 and US4.3, depends on U46, FD-046, FD-105).
- Task file `docs/implementation/tasks/T-207-discover-emergency-about.md`, and `main` as merged with U46 (batch 2: U20 is built only after U46 merges).

## Review points already settled in the design

1. **R-01:** the FD row has no fixed number; it takes the next free FD number at rebase and every reference is renumbered in the same commit if U47 merged first (Step 2, Step 22).
2. **R-02:** U46's `MiniRow` is not edited; the Limited data tag is rendered by the U20-owned `home/TeaserRow.tsx` wrapper (Step 9).
3. **R-03:** the browse nav is named by the new key `discover.browseAll` (Step 4).
4. **R-04:** browse-card counts reuse `profile.experienceCount {n, count}`; no new key (Step 10).
5. **R-05:** BR4.1 is narrowed to the lists U20 owns (browse links `ul`, chips `ul`, browse grid `ul`, how-it-works `ol`) (Step 10).
6. **R-06:** "no cross-unit contract (C1–C18) changes; one unused view-model stub is retired" (Step 19).
7. **R-07:** the T-105 configuration fallback is an S4 row (Step 22).

## Where it runs

- The Unit runs in its own git worktree on its own Bolt branch `bolt/t-207-discover-emergency-about`, cut from `main` after U46 merges, under the swarm (FD-094). The orchestrator assigns one test database; `DATABASE_URL_TEST` in the worktree points at that one database only (the reset guard accepts names ending in `_test`, so use the `rogikotha_wN_test` form U9 used). Never another worktree's database.
- Run only one database-touching command at a time in the worktree (`pnpm check`, `pnpm test`, `pnpm test:coverage`, `pnpm test:int`, `pnpm smoke`).
- There is no GitHub Actions workflow and no CI (FD-102). The gate is local only: `pnpm check` and `pnpm smoke` on the Bolt branch, then `pnpm check` again on `main` after the squash merge.
- Commits carry only the human's own git identity. Never run `git reset --hard`, `git checkout --` or `git clean`. Commit only owned paths and the listed shared files, after reading `git diff --cached`.
- U20 runs in parallel with U47. They share no owned path; the shared files below are append-only and the swarm merges one Unit at a time, each rebasing first.

## Steps (test-after, per the Testing Contract)

**Phase A — baseline, decision row and runner**

- [x] **Step 1** — Baseline in the worktree on `bolt/t-207-discover-emergency-about`, rebased on `main` with U46 merged. Confirm U46's exports exist: `taxonomy.listConditions`, `directory.listFacilities`, `review.listExperienceCards` on the container, and `components/patient/shared/{EmergencyPanel,BrowseCard,AccountRow,Avatar,MiniList}.tsx` with `facilityLabel`. Confirm `DATABASE_URL_TEST` names the assigned database. Run `pnpm infra:up`; on a fresh worktree run `pnpm build` once first (typed routes), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record file and test counts and the `apps/web` line coverage. Read the open `ISSUES.md` rows ISS-120, ISS-151, ISS-152, ISS-171 and any open row in web/shell, web/data and testing. An open `S1` in the area stops the Unit. No dependency is added, so no dependency-check entry (design WF1 step 1).
  - Note (2026-11-06): worktree `rk-u20` on `bolt/t-207-discover-emergency-about` at `main` `153a65c` (U9, U11, U46 merged). U46 exports present: `taxonomy.listConditions`, `directory.listFacilities`, and `listExperienceCards` on the container's `reviewReads` (not `review`; Step 13 calls `getContainer().reviewReads.listExperienceCards`), and `components/patient/shared/{EmergencyPanel,BrowseCard,AccountRow,Avatar,MiniList}.tsx` with `facilityLabel` in `shared/FacilityLink.tsx`. `DATABASE_URL_TEST` names `rogikotha_test_w5` (accepted by the reset guard `/_test(_b|_w[1-9])?$/`). `pnpm build` once (typed routes), then `pnpm check` green: 269 test files, 2767 tests passed plus 2 expected fail, all-package lines 95.08% (6506/6842), `apps/web` lines 96.82% (2069/2137), i18n parity 913 keys; `pnpm smoke` green: 21 files, 41 tests; 3308 tracked files. ISSUES rows read: ISS-120 (S3, open), ISS-151 (S3, open), ISS-152 (S4, open), ISS-171 (S4, open); other open rows in web/shell, web/data and testing: ISS-227 (S4, needs a product decision, outside U20). No open `S1` in the area (ISS-200, S1, is repo/lint, outside U20). No dependency added, so no dependency-check entry.
- [x] **Step 2** — Append the FD row of design § 7 ("The lawful-access explanation is on both legal pages", Question 1, the owner's answer of 2026-10-29) to `docs/status/decision-log.md`, with the next free FD number on the rebased branch, before any code. Write the number into this step's note.
  - Note: the row is **FD-109**, the next free number after FD-108 on the branch. If U47 merges an FD row first, U20 renumbers it at rebase together with every reference (R-01).
- [x] **Step 3** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`, the `web` jsdom project) and record the exact unit-scoped commands in `unit-test-instructions.md`. Run the existing U20-area tests with the unit-scoped command (`components/patient/home/`, `Emergency.test.tsx`, `Policy.test.tsx`, `About.test.tsx`, `fd-022-*.test.ts(x)`, `emergency-about-policy.smoke.test.tsx`, `(patient)/home-page.test.tsx`, `(patient)/emergency/page.parity.test.ts`, `app/root.test.tsx`) and record the count before any change.
  - Note: runner verified (Vitest 4.1.11, the `web` jsdom project through `vitest.workspace.ts`); the commands are in `unit-test-instructions.md`. Existing U20-area tests before any change: 12 files, 60 tests, all green.

**Phase B — lower layers**

- [x] **Step 4** — Keys (BR3.1): add `discover.browseAll`, `discover.browseFacilities`, `discover.browseTopics`, `emergview.bmdcShort`, `notFound.body`, `notFound.home` with the en and bn text of `frontend-components.md` § 4 to `packages/i18n/messages/en.json` and `bn.json` in the same commit. The Bengali copy is flagged for the owner's copy review at U50 (FD-042). Regenerate `packages/i18n/src/keys.ts` with its script, never by hand, and again after every rebase. Run `timeout 300 pnpm i18n:check`.
  - Note: the six keys are appended to `en.json` and `bn.json` (`discover.browseAll`, `discover.browseFacilities` and `discover.browseTopics` at the end of `discover`; `emergview.bmdcShort` at the end of `emergview`; a new top-level `notFound` block between `nav` and `notif`). `keys.ts` regenerated with `pnpm --filter @rogikotha/i18n keys` (919 keys); `pnpm i18n:check` passed (919 keys); the `packages/i18n` tests pass (7 files, 41 tests). ASSUMPTION(U20): `emergview.bmdcShort` is `বিএমডিসি` in Bengali instead of the design's `BMDC`, because the parity check refuses identical en and bn values outside its empty allowlist, and `profile.bmdc` already writes `বিএমডিসি নম্বর`; the check script stays unchanged. Flagged with the other new Bengali copy for the owner's FD-042 review at U50.
- [x] **Step 5** — Contracts, domain, application, database and adapters: no change except the stub retirement in Step 19. U20 adds no entity, table, command, query or port, so no migration and no migration number. Verify later with `git diff --stat main -- packages/domain packages/application packages/database packages/adapters packages/test-support` (empty). If the build finds a missing piece in a U46 query or primitive, do not add it inside U20: record an `ISS-` row and take the narrower option inside the owned paths, marked `ASSUMPTION(U20): ...`.
  - Note: `git diff --stat main -- packages/domain packages/application packages/database packages/adapters packages/test-support packages/contracts` is empty after Steps 1–4; no migration. Re-run after Step 19, where only the contracts stub and its barrel line change.

**Phase C — home business logic (pure helpers)**

- [x] **Step 6** — Implement `apps/web/src/components/patient/home/pick-chips.ts`: `pickChips(conditions: ConditionCardVM[], locale: Locale): ConditionCardVM[]` filters `accountsTotal > 0`, sorts by `accountsTotal` descending, then `Intl.Collator(locale)` on `name`, slices to 5 (BR1.2). Add `browseConditions(conditions)` (filter `accountsTotal > 0`, query order kept, BR1.3) in the same file.
- [x] **Step 7** — Write and run `apps/web/src/components/patient/home/pick-chips.test.ts`: the zero filter, most accounts first, a tie broken by name in `en` and in `bn`, the cap of 5, an empty input; `browseConditions` keeps the query order and drops zeros.
- [x] **Step 8** — Implement `apps/web/src/components/patient/home/teaser-sub.ts`: `teaserSub(card: FacilityCardVM, t, locale): string` returns `facility.type.{type}` · `area, city` (present parts only), then `facility.visitCount {n, count: formatNumber}` when `feedbackVisible` and the count is above 0, `facility.noVisits` when it is 0, and nothing more when `feedbackVisible` is false (BR2.2, BR2.3, BR3.2). Write and run `home/teaser-sub.test.ts` for the three states in `en` and `bn` (Bengali digits, never `0`).

**Phase D — home frontend behaviour**

- [x] **Step 9** — Implement `apps/web/src/components/patient/home/TeaserRow.tsx`: `div.teaser-row` wrapping U46's unchanged `MiniRow {href /facilities/{publicId}, avatar Avatar(publicId, avatarHue), title facilityLabel(card), sub teaserSub(card)}` plus `span.tag label.limitedData` when `feedbackVisible && accountsLimitedData` (BR2.3, BR6.1).
- [x] **Step 10** — Rewrite `apps/web/src/components/patient/home/Home.tsx` to the tree in `frontend-components.md` § 1 with the props of § 2 (`chips`, `browse | null`, `facilities | null`, `latest | null`, `emergency`): opener (`span.kicker`, `h1.display hero.title`, `p.lede`, `nav.home-browse[aria-label=discover.browseAll] > ul` with three `Link.btn.ghost.small`, `ul.chips` when non-empty, `aside.margin-note[data-static=disclaimer]`); shared `EmergencyPanel config` directly after; browse grid `ul.browse-grid.reveal` of `BrowseCard` with `profile.experienceCount {n, count}`, left out when `null` or empty; facility `section.panel.reveal` with `facility.separation` and `MiniList > TeaserRow` ×≤3, left out when `null` or empty; `ol.how-list > li.reveal` ×3 with `formatDigits('0n')`; latest `Reveal as=div > AccountRow` ×≤4, or `div.empty-state discover.latestEmpty` for `[]`, left out for `null`. No `.reveal` in the opener; no inline style; no `RouteTransition` (BR1.2–BR1.5, BR2.1–BR2.7, BR4.1, BR5.2).
- [x] **Step 11** — Rewrite `apps/web/src/components/patient/home/Home.test.tsx` (`describe.each(['en', 'bn'])`, builders from `components/patient/doctors/directory-test-support.ts`, `@/i18n/routing` mocked): block order and one `h1`; three browse links and the nav named by `discover.browseAll`; chips are links to `/topics/{id}`; grid without zero topics and with plural counts; teaser rows with count, Limited data tag, `noVisits` and hidden feedback; `facility.separation`; Bengali digits in step figures and counts; `data-static` on the note and panel; no `.reveal` inside the opener; an anonymous `AccountRow` unnamed; `null` sections absent with their headings; the empty latest state.
- [x] **Step 12** — Add U20's section to `apps/web/src/styles/patient.css`: list resets for the U20 lists, `.home-browse`, `.teaser-row`, `.emerg-note`, `.notfound`, each rule marked `/* added: U20 reason */`, on T-011 tokens, no `text-transform` under `:lang(bn)`, no hover lift, no edit to `tokens.css` or `motion.css` (BR5.1).
  - Note (Steps 6–12, 2026-11-06): `pick-chips.ts` (`pickChips`, `browseConditions`), `teaser-sub.ts` (pure: the place parts are inlined rather than importing `placeText` from `doctors/DoctorEntry`, which pulls in the routing module), `TeaserRow.tsx`, the rewritten `Home.tsx` (props `chips`, `browse`, `facilities`, `latest`, `emergency`, exported as `HomeProps`) and `Home.test.tsx`, and U20's section at the end of `patient.css` (every rule marked `/* added: U20 ... */`, tokens only, no `text-transform`, no hover rule). Unit-scoped run of `apps/web/src/components/patient/home/`: 5 files, 54 tests, all green (`pick-chips.test.ts` 9, `teaser-sub.test.ts` 8, `Home.test.tsx` 24 in `en` and `bn`, plus the untouched `ExperienceRow` and `format` tests). ESLint clean on `components/patient/home`. Expected until Step 13–14: `tsc` reports one error in `(patient)/page.tsx` (it still passes `DemoReviewCard[]` and no `chips`/`browse`/`facilities`), and the `/` rows of `pages.test.tsx` and `home-page.test.tsx` fail; Step 13 rewrites the page and Step 14 its tests. `home/ExperienceRow`, `home/EmergencyPanel` and `home/format` are no longer imported by `Home.tsx`; their deletion stays with BR6.1's grep step.

**Phase E — home page (API / endpoint)**

- [x] **Step 13** — Rewrite `apps/web/src/app/[locale]/(patient)/page.tsx` per WF2: `getActor()` and `locale`; `Promise.allSettled` over `taxonomy.listConditions()`, `directory.listFacilities({page: 1, pageSize: 3})`, `review.listExperienceCards({limit: 4})`, plus `ports.config.current()` awaited unguarded; a list that is `err` or rejected logs `discover.section_unavailable {section, correlationId}` through the logger port and becomes `null`; derive `chips`, `browse`, `facilities`, `latest`; render `ViewShell view="discover" title=""` > `Home`. No `server/data` import, no caching (BR1.1, BR1.6).
- [x] **Step 14** — Rewrite `apps/web/src/app/[locale]/(patient)/home-page.test.tsx` with a mocked container (no `server/data` mock): the four calls made once each with the right inputs; each list failing in turn (an `err` and a throw) leaves out only its section, logs `discover.section_unavailable` with exactly `section` and `correlationId`, and the opener, browse links and emergency panel still render; per locale. Then run `apps/web/src/app/pages.test.tsx` and change only its `/` row and that row's data mock; record the edit in this step's note.
  - Note (Steps 13–14, 2026-11-06): `page.tsx` reads `getActor()` (locale and correlation id), runs the three queries through `runCommand` in one `Promise.allSettled` and awaits `ports.config.current()` unguarded; `ViewShell view="discover" title=""`. `ASSUMPTION(U20)`: the closed `LogFields` port has no `section` field and the web logger's allowlist drops unknown fields, so the event is `discover.section_unavailable {kind: <section>, correlationId}` with sections `conditions`, `facilities`, `latest`; adding `section` to the port (packages/application) is left to the owner (proposed S4 row). `home-page.test.tsx`: 18 tests (per locale: the calls and inputs, all sections present, each list failing by `err` and by a throw, chips absent when conditions fail). `pages.test.tsx` edit: the `/` row is unchanged; its data mock is new `@/server/container` and `@/server/command-call` stand-ins (empty lists, `DEFAULT_CONFIG_VALUES`), which the `/emergency` row also uses since Step 15. 223 tests green.

**Phase F — Half A pages**

- [x] **Step 15** — Emergency (WF3, BR2.6, BR3.3, BR5.1): `apps/web/src/app/[locale]/(patient)/emergency/page.tsx` reads `(await getContainer().ports.config.current()).emergency` instead of `DEFAULT_CONFIG_VALUES` and drops its `ASSUMPTION` comment (closes ISS-171 for release 1); in `apps/web/src/components/patient/Emergency.tsx` the inline style becomes `className="note emerg-note"` and the `BMDC` literal becomes `t('emergview.bmdcShort')`. Update `emergency/page.parity.test.ts` if it reads the old constant.
- [x] **Step 16** — Write and run `apps/web/src/components/patient/Emergency.test.tsx` (extended, `describe.each`): the provider's numbers in both digit sets, `tel:` hrefs whose accessible name has label and number, the `emergview.bmdcShort` text, the last-verified line, no `style` attribute.
- [x] **Step 17** — Policy (BR2.8): in `apps/web/src/components/patient/Policy.tsx` `TERMS_SECTIONS` gains the `policy.privacy.lawful` / `policy.privacy.lawfulBody` section last (six sections); comments name both legal pages and the new FD row. Update `Policy.test.tsx` (Terms has six sections, lawful last; Privacy unchanged) and `fd-022-lawful-placement.test.tsx` (present on `/terms` and `/privacy`, absent from `/`, `/about`, `/emergency`); keep `fd-022-lawful-key-usage.test.ts` green (keys referenced only from `Policy.tsx`). Convert `About.test.tsx` and `emergency-about-policy.smoke.test.tsx` to `describe.each(['en', 'bn'])` so `-t bn` selects the Bengali set (closes ISS-151; the smoke suite keeps every assertion).

**Phase G — 404**

- [x] **Step 18** — Implement `apps/web/src/app/[locale]/(patient)/not-found.tsx` (`ViewShell view="not-found"` > `div.notfound` with `errors.common.notFound`, `notFound.body`, a link home `notFound.home` and to `/emergency` `nav.emergency`), `apps/web/src/app/[locale]/(patient)/[...rest]/page.tsx` (calls `notFound()`), and the root `apps/web/src/app/not-found.tsx` as an async component reading `getTranslations({locale: 'en'})` and `({locale: 'bn'})`, each line with its own `lang`, no inline style (BR3.3, BR4.2; closes ISS-120). Write and run `(patient)/not-found.test.tsx`, `(patient)/[...rest]/page.test.tsx` (calls `notFound`) and update `apps/web/src/app/root.test.tsx` (awaits the async component; both languages with `lang`; no `style`).

**Phase H — clean-up, smoke and gate**

- [x] **Step 19** — Clean-up (BR6.1): run `git grep -n "home/ExperienceRow\|home/EmergencyPanel\|home/format\|DiscoverVM\|view-models/discover"` on the rebased branch. Delete only what has no importer left outside the files being deleted: `components/patient/home/ExperienceRow.tsx` and `ExperienceRow.test.tsx`, `home/EmergencyPanel.tsx`, `home/format.ts` and `format.test.ts`, `packages/contracts/src/view-models/discover.ts` and its line in `packages/contracts/src/index.ts`. Anything still imported stays, gets an `ISS-` S4 row, and U50 removes it. Edit the `DiscoverVM` row out of `docs/implementation/03-routes-and-contracts.md` §4 ("no cross-unit contract C1–C18 changes; one unused view-model stub is retired").
  - Note (Steps 15–19, 2026-11-06): Emergency reads `getContainer().ports.config.current()`; `page.parity.test.ts` does not read the page and stays as is. `Emergency.test.tsx` gains a `describe.each` block (17 tests). Terms lists six sections with `LAWFUL_SECTION` last, shared with Privacy; the placement test now renders `/` (`Home` with empty lists), `/about` and `/emergency` per locale; `About.test.tsx` and the smoke file run per locale (`-t bn` on `components/patient` selects 155 tests). 404: `(patient)/not-found.tsx`, `(patient)/[...rest]/page.tsx`, async root `not-found.tsx`. `ASSUMPTION(U20)`: `ViewName` gains `'not-found'` in `lib/titles.ts` (title `errors.common.notFound`), a two-line append outside the owned paths. Step 19 grep: no importer outside the deleted files, so all five web files, `view-models/discover.ts` and its barrel line are deleted; the `DiscoverVM` entry sits in `03-routes-and-contracts.md` §6 (not §4) and is removed there. Unit-scoped run of `apps/web/src/{app,components/patient,lib}`: 74 files, 972 tests green; `tsc` and ESLint clean on `apps/web` and `packages/contracts`.
- [x] **Step 20** — Smoke: add `apps/web/src/components/patient/home/home.smoke.test.tsx` asserting, in `en` and `bn`, the one `h1`, the configured emergency numbers (`tel:` links) and the three browse links. Run `timeout 600 pnpm smoke`; the suite only grows.
  - Note (2026-11-06): one `describe.each(['en', 'bn'])` block renders `Home` with every list section `null` and the web-local `EMERGENCY_CONFIG`; it asserts one `h1`, the three `tel:` hrefs in the emergency panel equal to the configured numbers, and the nav named `discover.browseAll` linking `/doctors`, `/facilities`, `/topics`. `pnpm smoke`: 22 files, 43 tests green (was 21 files, 41 tests); nothing removed or skipped.
- [x] **Step 21** — Gate: `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green, plus `timeout 300 pnpm format:check`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. `apps/web` stays at or above 80% lines (never lowered, D10). Run the acceptance rows of design § 8 and record expected against observed for Build and Test; rows that need a browser (reduced-motion walk, live 404 status) are marked "not walked here" unless run.
  - Note (2026-11-06): `pnpm check` exit 0 (typecheck, lint with 0 errors and one existing unused-directive warning in `packages/i18n/src/routing.ts` outside U20's paths, boundaries fixture 18 expected violations, `format:check`, identity check, coverage run 272 files / 2836 passed + 2 expected fail, i18n parity 919 keys, `contrast` and `contrast:patient` all pass, motion M1–M11 OK, `next build`). `pnpm smoke` 22 files / 43 tests green; `format:check` clean; `impeccable detect apps/web/src --no-advisory` exit 0 with no findings (324 files, regex rules only). Lines: `apps/web` 96.97% (2082/2147), `packages/contracts` 100% (391/391), total 95.21%. `-t bn` on the home and `(patient)` tests selects only the Bengali blocks (17 run, 26 skipped).
  - Acceptance rows (design § 8), expected → observed:
    - Home order, `en` and `bn`: opener (one h1, browse links, chips, note) → emergency → browse grid → facilities → how → latest → as expected (`Home.test.tsx` "has one h1 and its blocks in the prototype order", `home-page.test.tsx` "renders every section under one h1", both locales).
    - Chips: five topics, most accounts first, each linking `/topics/{id}` → as expected on builder data (`pick-chips.test.ts`, `Home.test.tsx` "links each chip to its topic page"); the same check on the seeded database is not walked here.
    - Teaser: three rows in index order, Limited data tags, separation sentence, no 0 → as expected (`Home.test.tsx` teaser test, `teaser-sub.test.ts` count-0 case, `home-page.test.tsx` `{page: 1, pageSize: 3}` call).
    - Failure: a failing list leaves out only its section; the log line carries `kind` (the section), `command` (the query name), `errorCode` (the err code, or the exception name for a throw) and `correlationId`; a returned err logs at warn, a throw at error → as expected for an `err` and a throw on each list (`home-page.test.tsx`).
    - Emergency: configured numbers in the active digits, last-verified date, `tel:` links, static → as expected (`Emergency.test.tsx`, `Home.test.tsx` static-panel test, `home.smoke.test.tsx`); signed-out rendering on a live server not walked here.
    - Legal pages: lawful section on `/terms` and `/privacy`, absent from `/`, `/about`, `/emergency` → as expected (`fd-022-lawful-placement.test.tsx`, both locales).
    - 404: `/bn/nope` → Bengali 404 in the patient chrome; root fallback has no inline style → as expected at component level (`not-found.test.tsx`, `[...rest]/page.test.tsx`, `root.test.tsx`); the live HTTP 404 status is not walked here.
    - Motion: reduced-motion walk → not walked here (needs a browser); the static contract (`data-static` on the note and panel, no `.reveal` in the opener) passes in `Home.test.tsx`, and `check:motion` passes.
    - Gate: `pnpm check`, `pnpm smoke`, impeccable, contrast, `-t "bn"` → all green as above.
  - `ISS-` found in Steps 20–21: none new. Proposed for Step 22 (not written here, `ISSUES.md` is a Step 22 record): none.

**Phase I — records**

- [x] **Step 22** — Records:
  - `docs/implementation/ISSUES.md`: close ISS-120, ISS-151, ISS-152 and ISS-171 with `Status` naming U20; add S4 rows for the fixed numbers in `emergency.body` (parameterise with T-105), the T-105 configuration fallback (home and `/emergency` fall back to `DEFAULT_CONFIG_VALUES.emergency` once live configuration lands, R-07), and the patient catch-all also answering unknown `/{locale}/admin/*` paths; plus every defect, workaround or `ASSUMPTION(U20)` found in Steps 1–21. Each row says `Found in U20 t-207-discover-emergency-about`. Take the next free `ISS-` numbers at merge time.
  - On rebase, if U47 merged an FD row first, renumber U20's FD row and every reference to it in the same commit (R-01).
  - the T-207 task file: release-1 scope amendment (no search box, FD-105), the changed acceptance rows, and the Hand-off.
  - `construction/t-207-discover-emergency-about/code-generation/code-summary.md` (files, before and after counts and coverage, `ISS-` ids found and fixed, the bracketed route paths), `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`).
  - Note (2026-11-06): ISSUES.md closes ISS-120, ISS-151, ISS-152 and ISS-171 naming U20 and adds ISS-600 to ISS-606 (numbers from ISS-600 because U47 numbers from ISS-517 in parallel; they are final and were merged unchanged, so `main` keeps a gap ISS-517 to ISS-599 reserved for U47): `emergency.body` fixed numbers (T-105), the T-105 configuration fallback (R-07), the catch-all answering unknown `/{locale}/admin/*`, the Bengali review and the `emergview.bmdcShort` ASSUMPTION, the `kind` log field ASSUMPTION, the small ASSUMPTION choices, and the three acceptance rows left for Build and Test. FD-109 keeps its number: no FD row was merged on `main` after FD-108, so no renumbering (R-01). The T-207 task file gains `## Amendments — release 1 (FD-105)` and a release-1 hand-off. `code-summary.md`, `traceability.json` (41 upstream ids) and `source-manifest.json` (28 literal paths; the 7 bracketed route paths are listed in `code-summary.md`) written. Final gate: `format:check` clean, `pnpm check` exit 0 (272 files, 2836 passed plus 2 expected to fail, `apps/web` lines 96.97%, total 95.21%, parity 919 keys), `pnpm smoke` 22 files, 43 tests.

## Story and rule traceability

| Step | Rules | Stories (acceptance criteria) |
|---|---|---|
| 1–3 | — (baseline); BR2.8 (FD row) | — |
| 4 | BR3.1 | US12.1 (AC12.1.1, AC12.1.4) |
| 5 | BR6.1 | — |
| 6–7 | BR1.2, BR1.3 | US12.1 (AC12.1.1) |
| 8 | BR2.2, BR2.3, BR3.2 | US4.3 (AC4.3.5) |
| 9–11 | BR1.2–BR1.5, BR2.1–BR2.7, BR3.2, BR4.1, BR5.2 | US12.1 (AC12.1.1, AC12.1.5, AC12.1.6), US4.3 (AC4.3.3, AC4.3.5), US2.4 (AC2.4.2–AC2.4.4, AC2.4.6) |
| 12 | BR5.1, BR3.2 | US2.4 (AC2.4.1) |
| 13–14 | BR1.1, BR1.6, BR2.6 | US12.1 (AC12.1.5) |
| 15–16 | BR2.6, BR3.2, BR3.3, BR5.1 | US12.1 (AC12.1.5), US2.4 (AC2.4.1, AC2.4.4) |
| 17 | BR2.8, BR6.2 | US12.1 (AC12.1.1) |
| 18 | BR3.3, BR4.1, BR4.2 | US12.1 (AC12.1.1, AC12.1.6) |
| 19 | BR6.1 | — |
| 20–21 | BR6.2, BR5.1, BR5.2 | US12.1, US4.3, US2.4 |
| 22 | BR6.3 | — |

Not covered by U20 (design `traceability.json`): AC12.1.2 (merged T-008 shell), AC12.1.3 and AC4.3.4 (U47), AC4.3.1 and AC4.3.2 (U46), AC2.4.5 (no confirmation on these pages); the axe run in both locales and the gated Lighthouse run are U50's.

## Owned paths

- `apps/web/src/app/[locale]/(patient)/page.tsx` and `home-page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/emergency/`, `about/`, `terms/`, `privacy/`
- `apps/web/src/components/patient/home/`
- `apps/web/src/components/patient/Emergency.tsx`, `About.tsx`, `Policy.tsx` and their tests, `fd-022-lawful-placement.test.tsx`, `emergency-about-policy.smoke.test.tsx`
- Recorded additions (design § 5): `apps/web/src/app/[locale]/(patient)/not-found.tsx`, `apps/web/src/app/[locale]/(patient)/[...rest]/page.tsx` and their tests; `apps/web/src/app/not-found.tsx`, `apps/web/src/app/root.test.tsx`; `packages/contracts/src/view-models/discover.ts` (deleted)

Not touched: the patient layout, `Masthead`, `Colophon`, `RouteTransition`, `tokens.css`, `motion.css`, and U46's `components/patient/shared/` primitives (used, never edited).

## Shared files (append-only)

| File | U20 use |
|---|---|
| `packages/i18n/messages/en.json`, `packages/i18n/messages/bn.json` | append the six keys (Step 4) |
| `packages/i18n/src/keys.ts` | generated; regenerate after every rebase, never merge by hand |
| `apps/web/src/styles/patient.css` | append U20's section (Step 12) |
| `packages/contracts/src/index.ts` | remove the one `discover` barrel line only (Step 19) |
| `apps/web/src/app/pages.test.tsx` | only the `/` row and its data mock (Step 14) |
| `apps/web/src/server/container.ts`, `apps/web/src/server/data.ts` | not expected; append-only if needed |
| seed (`packages/test-support/src/seed/**`) | not expected |
| `docs/implementation/ISSUES.md` | append rows; update `Status` of the four rows U20 closes |
| `docs/status/decision-log.md` | append the one FD row (Step 2) |
| `docs/implementation/03-routes-and-contracts.md` | remove the `DiscoverVM` row from §4 (Step 19) |
| `docs/implementation/tasks/T-207-discover-emergency-about.md` | amendments and Hand-off |

Merge rules: on rebase, keep both sides of every append-only file and regenerate `keys.ts`. U20 adds no migration; if one were ever needed, it takes the next free number at merge time, not at build time. Shared demo code is deleted only when a grep shows no caller left on the rebased branch; otherwise it stays and U50 removes it.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "team",
  "ordering": "Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.",
  "scope": "classic",
  "test_strategy": "minimal",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    },
    {
      "layer": "team",
      "text": "- **Methodology**: test-after\n- **Methodology evidence**: `01-conventions.md` §10 sets per-level test minimums that each task delivers together with its code, and §13's definition of done requires them green before hand-off. In git history, tests land in the same task commit as the implementation (for example T-007 and T-009). No source asks for tests to be written before the code, and test-after is the `org.md` default for the `classic` scope.\n- **Ordering**: Implement each testable layer, then write and run its unit tests, its integration tests against the isolated PostgreSQL test database (reset to a freshly migrated schema on every run), and extend the cumulative smoke suite.\n- Test levels follow `01-conventions.md` §10: domain (every state-transition table and policy function), application (each command's happy path, each authorization refusal and one audit assertion, using `test-support` fakes), database (`*.int.test.ts`, each repository method, migrations apply from empty), component (renders in both `en` and `bn`), and end-to-end with Playwright and axe from T-503.\n- Cumulative smoke suite: each unit adds at least one smoke assertion for what it delivered (`*.smoke.test.ts(x)`, and from T-503 also `apps/web/e2e/smoke/*.spec.ts`). `pnpm smoke` runs the whole suite every time. The suite only grows: removing or skipping a smoke assertion needs a recorded reason.\n- Integration tests: `pnpm test:int` runs the database project against `DATABASE_URL_TEST` (the `rogikotha_test` database, separate from the development database). It resets that database to an empty, freshly migrated schema and runs test files serially. It needs the compose PostgreSQL running.\n- Coverage: an 80% line-coverage floor per package, measured with Vitest `@vitest/coverage-v8` (already installed). T-010 adds the thresholds and the CI run before merge, and raises any package below 80%. Until T-010 lands, the floor cannot be measured: no Vitest config has a coverage block yet. Work before T-010 (CR-009) records \"coverage not measured yet\" at Build and Test; from T-010 on the floor is enforced, and it applies to a package once that package has source code (the empty `domain`, `application` and `adapters` packages are exempt until then). We do not claim a coverage figure we have not measured, and once the floor exists it is never lowered to make a step pass (D10).\n- Existing suites stay green: `pnpm check` (typecheck, lint, unit and integration tests, i18n parity, build) and `pnpm smoke` must pass after every unit, with no assertion removed or skipped. In brownfield work we run the full suite before changing anything, to record a baseline.\n- Test names read as sentences. We use builders, not hand-written fixture objects, and we never assert on implementation details (class names, internal calls). A test must be able to fail.\n- UI units also pass `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast` cleanly before they are done (`01-conventions.md` §7.8)."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:eb26df65a70c60644a0bdc6b6fa19a28a2583bae7b61a57b814612d8ad43ebb9",
  "contract_sha256": "sha256:57d068825625cb257445b363810a0b4bbe01d375329dd0df119f640f95c1c9f4"
}
```
