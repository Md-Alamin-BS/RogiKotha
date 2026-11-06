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

- [ ] **Step 1** — Baseline in the worktree on `bolt/t-207-discover-emergency-about`, rebased on `main` with U46 merged. Confirm U46's exports exist: `taxonomy.listConditions`, `directory.listFacilities`, `review.listExperienceCards` on the container, and `components/patient/shared/{EmergencyPanel,BrowseCard,AccountRow,Avatar,MiniList}.tsx` with `facilityLabel`. Confirm `DATABASE_URL_TEST` names the assigned database. Run `pnpm infra:up`; on a fresh worktree run `pnpm build` once first (typed routes), then `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green. Record file and test counts and the `apps/web` line coverage. Read the open `ISSUES.md` rows ISS-120, ISS-151, ISS-152, ISS-171 and any open row in web/shell, web/data and testing. An open `S1` in the area stops the Unit. No dependency is added, so no dependency-check entry (design WF1 step 1).
- [ ] **Step 2** — Append the FD row of design § 7 ("The lawful-access explanation is on both legal pages", Question 1, the owner's answer of 2026-10-29) to `docs/status/decision-log.md`, with the next free FD number on the rebased branch, before any code. Write the number into this step's note.
- [ ] **Step 3** — Verify the test runner (Vitest 4 through `vitest.workspace.ts`, the `web` jsdom project) and record the exact unit-scoped commands in `unit-test-instructions.md`. Run the existing U20-area tests with the unit-scoped command (`components/patient/home/`, `Emergency.test.tsx`, `Policy.test.tsx`, `About.test.tsx`, `fd-022-*.test.ts(x)`, `emergency-about-policy.smoke.test.tsx`, `(patient)/home-page.test.tsx`, `(patient)/emergency/page.parity.test.ts`, `app/root.test.tsx`) and record the count before any change.

**Phase B — lower layers**

- [ ] **Step 4** — Keys (BR3.1): add `discover.browseAll`, `discover.browseFacilities`, `discover.browseTopics`, `emergview.bmdcShort`, `notFound.body`, `notFound.home` with the en and bn text of `frontend-components.md` § 4 to `packages/i18n/messages/en.json` and `bn.json` in the same commit. The Bengali copy is flagged for the owner's copy review at U50 (FD-042). Regenerate `packages/i18n/src/keys.ts` with its script, never by hand, and again after every rebase. Run `timeout 300 pnpm i18n:check`.
- [ ] **Step 5** — Contracts, domain, application, database and adapters: no change except the stub retirement in Step 19. U20 adds no entity, table, command, query or port, so no migration and no migration number. Verify later with `git diff --stat main -- packages/domain packages/application packages/database packages/adapters packages/test-support` (empty). If the build finds a missing piece in a U46 query or primitive, do not add it inside U20: record an `ISS-` row and take the narrower option inside the owned paths, marked `ASSUMPTION(U20): ...`.

**Phase C — home business logic (pure helpers)**

- [ ] **Step 6** — Implement `apps/web/src/components/patient/home/pick-chips.ts`: `pickChips(conditions: ConditionCardVM[], locale: Locale): ConditionCardVM[]` filters `accountsTotal > 0`, sorts by `accountsTotal` descending, then `Intl.Collator(locale)` on `name`, slices to 5 (BR1.2). Add `browseConditions(conditions)` (filter `accountsTotal > 0`, query order kept, BR1.3) in the same file.
- [ ] **Step 7** — Write and run `apps/web/src/components/patient/home/pick-chips.test.ts`: the zero filter, most accounts first, a tie broken by name in `en` and in `bn`, the cap of 5, an empty input; `browseConditions` keeps the query order and drops zeros.
- [ ] **Step 8** — Implement `apps/web/src/components/patient/home/teaser-sub.ts`: `teaserSub(card: FacilityCardVM, t, locale): string` returns `facility.type.{type}` · `area, city` (present parts only), then `facility.visitCount {n, count: formatNumber}` when `feedbackVisible` and the count is above 0, `facility.noVisits` when it is 0, and nothing more when `feedbackVisible` is false (BR2.2, BR2.3, BR3.2). Write and run `home/teaser-sub.test.ts` for the three states in `en` and `bn` (Bengali digits, never `0`).

**Phase D — home frontend behaviour**

- [ ] **Step 9** — Implement `apps/web/src/components/patient/home/TeaserRow.tsx`: `div.teaser-row` wrapping U46's unchanged `MiniRow {href /facilities/{publicId}, avatar Avatar(publicId, avatarHue), title facilityLabel(card), sub teaserSub(card)}` plus `span.tag label.limitedData` when `feedbackVisible && accountsLimitedData` (BR2.3, BR6.1).
- [ ] **Step 10** — Rewrite `apps/web/src/components/patient/home/Home.tsx` to the tree in `frontend-components.md` § 1 with the props of § 2 (`chips`, `browse | null`, `facilities | null`, `latest | null`, `emergency`): opener (`span.kicker`, `h1.display hero.title`, `p.lede`, `nav.home-browse[aria-label=discover.browseAll] > ul` with three `Link.btn.ghost.small`, `ul.chips` when non-empty, `aside.margin-note[data-static=disclaimer]`); shared `EmergencyPanel config` directly after; browse grid `ul.browse-grid.reveal` of `BrowseCard` with `profile.experienceCount {n, count}`, left out when `null` or empty; facility `section.panel.reveal` with `facility.separation` and `MiniList > TeaserRow` ×≤3, left out when `null` or empty; `ol.how-list > li.reveal` ×3 with `formatDigits('0n')`; latest `Reveal as=div > AccountRow` ×≤4, or `div.empty-state discover.latestEmpty` for `[]`, left out for `null`. No `.reveal` in the opener; no inline style; no `RouteTransition` (BR1.2–BR1.5, BR2.1–BR2.7, BR4.1, BR5.2).
- [ ] **Step 11** — Rewrite `apps/web/src/components/patient/home/Home.test.tsx` (`describe.each(['en', 'bn'])`, builders from `components/patient/doctors/directory-test-support.ts`, `@/i18n/routing` mocked): block order and one `h1`; three browse links and the nav named by `discover.browseAll`; chips are links to `/topics/{id}`; grid without zero topics and with plural counts; teaser rows with count, Limited data tag, `noVisits` and hidden feedback; `facility.separation`; Bengali digits in step figures and counts; `data-static` on the note and panel; no `.reveal` inside the opener; an anonymous `AccountRow` unnamed; `null` sections absent with their headings; the empty latest state.
- [ ] **Step 12** — Add U20's section to `apps/web/src/styles/patient.css`: list resets for the U20 lists, `.home-browse`, `.teaser-row`, `.emerg-note`, `.notfound`, each rule marked `/* added: U20 reason */`, on T-011 tokens, no `text-transform` under `:lang(bn)`, no hover lift, no edit to `tokens.css` or `motion.css` (BR5.1).

**Phase E — home page (API / endpoint)**

- [ ] **Step 13** — Rewrite `apps/web/src/app/[locale]/(patient)/page.tsx` per WF2: `getActor()` and `locale`; `Promise.allSettled` over `taxonomy.listConditions()`, `directory.listFacilities({page: 1, pageSize: 3})`, `review.listExperienceCards({limit: 4})`, plus `ports.config.current()` awaited unguarded; a list that is `err` or rejected logs `discover.section_unavailable {section, correlationId}` through the logger port and becomes `null`; derive `chips`, `browse`, `facilities`, `latest`; render `ViewShell view="discover" title=""` > `Home`. No `server/data` import, no caching (BR1.1, BR1.6).
- [ ] **Step 14** — Rewrite `apps/web/src/app/[locale]/(patient)/home-page.test.tsx` with a mocked container (no `server/data` mock): the four calls made once each with the right inputs; each list failing in turn (an `err` and a throw) leaves out only its section, logs `discover.section_unavailable` with exactly `section` and `correlationId`, and the opener, browse links and emergency panel still render; per locale. Then run `apps/web/src/app/pages.test.tsx` and change only its `/` row and that row's data mock; record the edit in this step's note.

**Phase F — Half A pages**

- [ ] **Step 15** — Emergency (WF3, BR2.6, BR3.3, BR5.1): `apps/web/src/app/[locale]/(patient)/emergency/page.tsx` reads `(await getContainer().ports.config.current()).emergency` instead of `DEFAULT_CONFIG_VALUES` and drops its `ASSUMPTION` comment (closes ISS-171 for release 1); in `apps/web/src/components/patient/Emergency.tsx` the inline style becomes `className="note emerg-note"` and the `BMDC` literal becomes `t('emergview.bmdcShort')`. Update `emergency/page.parity.test.ts` if it reads the old constant.
- [ ] **Step 16** — Write and run `apps/web/src/components/patient/Emergency.test.tsx` (extended, `describe.each`): the provider's numbers in both digit sets, `tel:` hrefs whose accessible name has label and number, the `emergview.bmdcShort` text, the last-verified line, no `style` attribute.
- [ ] **Step 17** — Policy (BR2.8): in `apps/web/src/components/patient/Policy.tsx` `TERMS_SECTIONS` gains the `policy.privacy.lawful` / `policy.privacy.lawfulBody` section last (six sections); comments name both legal pages and the new FD row. Update `Policy.test.tsx` (Terms has six sections, lawful last; Privacy unchanged) and `fd-022-lawful-placement.test.tsx` (present on `/terms` and `/privacy`, absent from `/`, `/about`, `/emergency`); keep `fd-022-lawful-key-usage.test.ts` green (keys referenced only from `Policy.tsx`). Convert `About.test.tsx` and `emergency-about-policy.smoke.test.tsx` to `describe.each(['en', 'bn'])` so `-t bn` selects the Bengali set (closes ISS-151; the smoke suite keeps every assertion).

**Phase G — 404**

- [ ] **Step 18** — Implement `apps/web/src/app/[locale]/(patient)/not-found.tsx` (`ViewShell view="not-found"` > `div.notfound` with `errors.common.notFound`, `notFound.body`, a link home `notFound.home` and to `/emergency` `nav.emergency`), `apps/web/src/app/[locale]/(patient)/[...rest]/page.tsx` (calls `notFound()`), and the root `apps/web/src/app/not-found.tsx` as an async component reading `getTranslations({locale: 'en'})` and `({locale: 'bn'})`, each line with its own `lang`, no inline style (BR3.3, BR4.2; closes ISS-120). Write and run `(patient)/not-found.test.tsx`, `(patient)/[...rest]/page.test.tsx` (calls `notFound`) and update `apps/web/src/app/root.test.tsx` (awaits the async component; both languages with `lang`; no `style`).

**Phase H — clean-up, smoke and gate**

- [ ] **Step 19** — Clean-up (BR6.1): run `git grep -n "home/ExperienceRow\|home/EmergencyPanel\|home/format\|DiscoverVM\|view-models/discover"` on the rebased branch. Delete only what has no importer left outside the files being deleted: `components/patient/home/ExperienceRow.tsx` and `ExperienceRow.test.tsx`, `home/EmergencyPanel.tsx`, `home/format.ts` and `format.test.ts`, `packages/contracts/src/view-models/discover.ts` and its line in `packages/contracts/src/index.ts`. Anything still imported stays, gets an `ISS-` S4 row, and U50 removes it. Edit the `DiscoverVM` row out of `docs/implementation/03-routes-and-contracts.md` §4 ("no cross-unit contract C1–C18 changes; one unused view-model stub is retired").
- [ ] **Step 20** — Smoke: add `apps/web/src/components/patient/home/home.smoke.test.tsx` asserting, in `en` and `bn`, the one `h1`, the configured emergency numbers (`tel:` links) and the three browse links. Run `timeout 600 pnpm smoke`; the suite only grows.
- [ ] **Step 21** — Gate: `timeout 1200 pnpm check` and `timeout 600 pnpm smoke`, both green, plus `timeout 300 pnpm format:check`, `npx impeccable detect apps/web/src --no-advisory` and `timeout 300 pnpm contrast`. `apps/web` stays at or above 80% lines (never lowered, D10). Run the acceptance rows of design § 8 and record expected against observed for Build and Test; rows that need a browser (reduced-motion walk, live 404 status) are marked "not walked here" unless run.

**Phase I — records**

- [ ] **Step 22** — Records:
  - `docs/implementation/ISSUES.md`: close ISS-120, ISS-151, ISS-152 and ISS-171 with `Status` naming U20; add S4 rows for the fixed numbers in `emergency.body` (parameterise with T-105), the T-105 configuration fallback (home and `/emergency` fall back to `DEFAULT_CONFIG_VALUES.emergency` once live configuration lands, R-07), and the patient catch-all also answering unknown `/{locale}/admin/*` paths; plus every defect, workaround or `ASSUMPTION(U20)` found in Steps 1–21. Each row says `Found in U20 t-207-discover-emergency-about`. Take the next free `ISS-` numbers at merge time.
  - On rebase, if U47 merged an FD row first, renumber U20's FD row and every reference to it in the same commit (R-01).
  - the T-207 task file: release-1 scope amendment (no search box, FD-105), the changed acceptance rows, and the Hand-off.
  - `construction/t-207-discover-emergency-about/code-generation/code-summary.md` (files, before and after counts and coverage, `ISS-` ids found and fixed, the bracketed route paths), `traceability.json` (step → BR → AC) and `source-manifest.json` with literal paths only (no `[`, `]` or `*`).

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
