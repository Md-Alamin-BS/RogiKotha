# T-503 — Bilingual parity, accessibility and viewport E2E

| Field | Value |
|---|---|
| Story | STORY-PROT-003 (NFR-001/004–007), STORY-PLAT-001 (parity), STORY-NFR-006 |
| Phase / Lane | 5 / B |
| Class → model | M2 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 6–8 h agent; validation 2 h |
| Depends on | CR-004 (the live-region announcements `live-region.spec.ts` asserts), T-011 (design and motion system, FD-091), every UI task (T-102, T-202, T-203, T-206, T-207, T-306, T-307, T-308, T-402, T-406, T-407, T-408, T-409), T-501, T-502 (rerun after it merges), T-007 (seed) |
| Parallel-safe with | T-502 (rerun the suite after T-502 merges), T-504 (T-504 consumes this suite's green run) |

## Amendments — patient redesign and motion (FD-091, NFR13, US2.4)

- **FD-091** — The patient pages now use the T-011 design and motion system, not the 04b styles. Journeys check the redesigned pages. Changes: Depends on (T-011), Not in scope, step 9 and new acceptance rows.
- **NFR13 gate (overrides "no gate" for three page groups)** — For the `/en` and `/bn` home, search and experience pages, Lighthouse runs on a throttled mid-range Android profile (slow 4G, 4× CPU slowdown) and gates LCP ≤ 2.5 s and CLS ≤ 0.1. INP ≤ 200 ms is measured with a Lighthouse timespan run or a Playwright interaction trace, because a navigation run reports TBT, not INP. Other pages keep the old "record once, no gate" rule (AC2.3.6). This task also runs `pnpm check:motion` (built in T-011) and the reduced-motion journeys, with the OS setting and with the app's own switch.

| Check | Command | Expected |
|---|---|---|
| FD-091: NFR13 performance gate (AC2.4.6) | Lighthouse (throttled mid-range Android) on `/en`, `/bn`, `/en/search?q=…`, `/bn/experiences/<id>`; timespan or Playwright trace for INP | LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms on each; the LCP element is never animated in |
| FD-091: reduced motion (AC2.4.3) | journeys with `prefers-reduced-motion: reduce`, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step completes |
| FD-091: animated properties (AC2.4.2) | `pnpm check:motion` | passes |
| FD-091: never-animated elements (AC2.4.4) | journey asserts on the disclaimer, emergency guidance and demo marker | no animation or transition on them; visible at once |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


Storyboard steps involving PDFs are replaced (see `05-demo-storyboard.md` steps 6 and 12): the
evidence journey uploads two JPEGs, one flagged JPEG and one broken JPEG; the viewer pages between the
two images in a group; download fetches the processed image.

## Goal

Prove, with an automated suite that runs on one command, that the critical journeys work end to end
in **both** languages, at the five target viewports, in three engines, keyboard-only, with reduced
motion, with no serious or critical axe violations, with no Bengali overflow, and at 200 % zoom —
and fix what the suite finds. The screenshots it produces are the visual evidence the Gate 4 matrix
asked for and never got (`docs/status/current-status.md` "Not verified").

## Read first

1. `docs/implementation/00-master-plan.md` §1, §5 Phase 5, §7
2. `docs/implementation/01-conventions.md` §6, §7, §8, §10, §13, §14
3. `docs/implementation/05-demo-storyboard.md` — every step marked ● is a scripted journey; the seeded accounts table
4. `docs/planning/10-validation-strategy.md` "Gate 4 — Runnable concept matrix" (viewports, browsers, accessibility rows) and "Validation layers"
5. `docs/planning/08-product-backlog.md` STORY-PROT-003 and STORY-PLAT-001 acceptance
6. `docs/planning/ux/EXPERIENCE.md` §"States" and the accessibility/motion paragraphs; `docs/planning/ux/DESIGN.md` Bengali typography rules
7. `docs/design/auth-screens-spec.md` §6 (acceptance lines for keyboard/screen-reader/360 px)
8. `tools/smoke.mjs` and `tools/bangla-metrics.mjs` (the prototype's own checks — port their assertions where they apply)
9. Playwright 1.63 and `@axe-core/playwright` 4.13 docs (pinned in master plan §3)

## Owned paths

Create:
- `apps/web/playwright.config.ts` (projects: `chromium`, `firefox`, `webkit`, `chromium-reduced-motion` (`reducedMotion: 'reduce'`), `chromium-mobile-360` … one project per viewport × Chromium; Firefox/WebKit run the 390×844 and 1280×800 viewports only)
- `apps/web/e2e/helpers/mailpit.ts` (`latestLink(to, subjectContains)` via Mailpit REST `GET /api/v1/search?query=to:<email>` then `/api/v1/message/<id>`)
- `apps/web/e2e/helpers/seed.ts` (`globalSetup` runs `pnpm db:seed --reset` once; exposes the accounts table from `packages/test-support/src/seed/accounts.ts`)
- `apps/web/e2e/helpers/axe.ts` (`expectNoSeriousViolations(page)` with the shared rule config; `impact ∈ {serious, critical}` fails)
- `apps/web/e2e/helpers/locale.ts` (`forEachLocale(test, fn)` runs a journey in `en` then `bn`, asserting `html[lang]`, `data-lang`, numerals)
- `apps/web/e2e/journeys/reading.spec.ts` (storyboard Part 1 steps 1–7)
- `apps/web/e2e/journeys/contributor.spec.ts` (Part 2 steps 8–10, uses Mailpit helper)
- `apps/web/e2e/journeys/writing.spec.ts` (Part 3 steps 11–14 with the fixtures from `packages/test-support/fixtures/`; ClamAV must be up — skip with a clear message if `/api/health.scanner !== 'ok'`)
- `apps/web/e2e/journeys/discussion.spec.ts` (Part 4 steps 15–17)
- `apps/web/e2e/journeys/staff.spec.ts` (Part 5 steps 18–25)
- `apps/web/e2e/journeys/workspace.spec.ts` (Part 6 step 26)
- `apps/web/e2e/a11y/keyboard.spec.ts` (register, sign-in, composer, report sheet, viewer — Tab/Shift+Tab/Enter/Escape only; focus returns to trigger after sheets close; skip link works)
- `apps/web/e2e/a11y/zoom-and-spacing.spec.ts` (doctor profile + composer at 200 % (`page.setViewportSize` 640×400 with `deviceScaleFactor` 2 → equivalent reflow) and with the WCAG 1.4.12 text-spacing stylesheet injected: no horizontal scroll on `document.documentElement`, no clipped text)
- `apps/web/e2e/a11y/bengali-overflow.spec.ts` (longest strings: seeds `LONG_BN_FIXTURE` review; walks doctor/facility/condition/experience/composer/queue in `bn` at 360×800; asserts `scrollWidth <= clientWidth` on `body` and on every `.panel`, `.capsules`, `.tabs`, `.opt-row`, `.kv` table)
- `apps/web/e2e/a11y/live-region.spec.ts` (route change, sheet open/close, language toggle announce into `#sr-live`; port from `tools/smoke.mjs` STORY-NFR-006 assertions)
- `apps/web/e2e/screenshots.spec.ts` (captures every page in the URL map at every viewport in both locales, light and dark, into `docs/design/screenshots/demo/{locale}/{viewport}/{page}-{theme}.png`; `fullPage: true`; masks nothing — all content is synthetic)
- `docs/design/screenshots/demo/README.md` (what is captured, how to regenerate, date, commit)
- `.github/workflows/e2e.yml` (Chromium project only, Postgres + Mailpit services, no ClamAV → writing spec skips scanner steps, `timeout-minutes: 15`, artifacts: traces on failure)

Modify:
- `package.json` (root) — `e2e`, `e2e:ui`, `e2e:ci`, `screenshots` scripts
- `apps/web/package.json` — devDeps `@playwright/test`, `@axe-core/playwright` at the pinned versions
- `.gitignore` — `apps/web/test-results/`, `apps/web/playwright-report/`
- Fixes to UI components/stylesheets found by the suite, **each ≤ 1 h**; anything larger → a CR row in `docs/implementation/06-change-requests.md` and a `test.fixme` with the CR id

## Not in scope

Real Safari/iOS device smoke (manual, recorded by the founder in the validation log), screen-reader
output verification with NVDA/VoiceOver (manual — leave a checklist in the hand-off), performance
budgets (record Lighthouse numbers once in the hand-off; no gate), the staff console at Firefox/WebKit
beyond 1280×800.

## Steps

1. Install the pinned Playwright + axe; `pnpm --filter web exec playwright install chromium firefox webkit`. Write `playwright.config.ts`: `baseURL` from `APP_URL`, `webServer` = `pnpm demo:serve` (T-504 provides it; until then, `pnpm --filter web start` + worker in a second command — coordinate with T-504's implementer via the tracker note), `globalSetup` seeds, `retries: 1` locally / `2` in CI, `trace: 'retain-on-failure'`, `locale` set per project? — no: locale comes from the URL; set `timezoneId: 'Asia/Dhaka'`.
2. Viewport projects: `360x800`, `390x844`, `768x1024`, `1280x800`, `1440x900` (Chromium). `firefox` and `webkit` projects at `390x844` and `1280x800`. `chromium-reduced-motion` at `390x844` with `reducedMotion: 'reduce'` and `colorScheme: 'dark'` (covers dark mode once).
3. Helpers: Mailpit, seed, axe, locale. The axe helper excludes nothing; if a rule must be excluded, the reason goes in the helper file with the axe rule id and a CR.
4. Journeys: script each ● step from the storyboard as a test with the storyboard step number in its title (`test('P1.2 Banglish search resolves to the condition and keeps the original')`). Every journey runs through `forEachLocale`. Each test ends with `expectNoSeriousViolations(page)` on the final page and calls it after every navigation that shows a new template.
5. Keyboard, zoom/spacing, Bengali overflow, live-region specs as listed under owned paths. For the text-spacing test inject the standard stylesheet (`line-height:1.5 !important; letter-spacing:.12em !important; word-spacing:.16em !important; p{margin-bottom:2em !important}`) — for `bn` use the same values; the Bengali line-height in the design is already ≥ 1.95 so the injection must not break it.
6. Screenshots spec: iterate the URL map from `docs/implementation/03-routes-and-contracts.md` §1 with seeded public ids (read from the seed helper), sign in as `shirin_88` for private pages and `sa_founder` for `/admin/*`; capture light then dark (toggle via the `◐` control so the cookie path is exercised). Write `docs/design/screenshots/demo/README.md`. Keep total size under 40 MB (PNG, `scale: 'css'`).
7. Run the whole suite; triage findings: fix ≤ 1 h items in the owning component (you may edit any `apps/web/src/components/**` or `apps/web/src/styles/*.css` file for a fix, with `/* fix: T-503 <finding> */`), log the rest as CRs with `test.fixme('CR-nnn: …')`.
8. CI workflow with Chromium only; confirm it completes under 10 minutes on GitHub-hosted runners (record the time).
9. Run `pnpm check`, `pnpm e2e` (all projects) locally with ClamAV up, `npx impeccable detect apps/web/src --no-advisory`, `pnpm contrast`. Record Lighthouse (Chrome DevTools, mobile preset) for `/bn`, `/bn/doctors/<id>`, `/bn/experiences/<id>` in the hand-off.
10. Write the manual checklist for the founder in the hand-off: NVDA + Chrome on the doctor profile, composer and queue in both locales; iOS Safari smoke of Part 1; note that jsdom-only proof (`docs/status/current-status.md` "Not verified") is now superseded by these screenshots.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Suite green, all engines | `pnpm e2e` | 0 failed; `fixme` count listed with CR ids |
| CI green under budget | GitHub Actions `e2e` run | passes; ≤ 10 min |
| Both locales per journey | `pnpm e2e --grep "\[bn\]"` and `--grep "\[en\]"` | equal test counts; equal passes |
| No serious/critical axe | `pnpm e2e --grep a11y` | 0 violations; any excluded rule has a CR |
| Viewport matrix | `pnpm e2e --project=chromium-360x800` … ×5 | green |
| Reduced motion | `pnpm e2e --project=chromium-reduced-motion` | every journey completes; `getComputedStyle(el).animationName === 'none'` sampled on the hero |
| Keyboard-only | `pnpm e2e --grep keyboard` | register → confirm → sign-in → write → publish → report completed without a mouse; focus returned to trigger after every sheet |
| 200 % + text spacing | `pnpm e2e --grep zoom` | no horizontal scroll; no clipped text on profile and composer |
| Bengali overflow | `pnpm e2e --grep bengali-overflow` | no element wider than its container at 360 px |
| Live region | `pnpm e2e --grep live-region` | announcements match the prototype's (`View: …`, sheet titles, `Language: বাংলা`) |
| Screenshots committed | `git ls-files docs/design/screenshots/demo \| wc -l` | ≥ 2 locales × 5 viewports × ~28 pages × 2 themes ≈ 560 files, < 40 MB |
| Quality gates | `pnpm check`; `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | green; zero findings; every text pair ≥ 4.5:1 |

## Tests to write

All files under `apps/web/e2e/` listed in Owned paths. Naming: `P<part>.<step> <sentence>`
for journeys; `A11Y <what>` for accessibility specs. Every journey asserts at least one **hard
rule** visibly (e.g. `P1.4` asserts the text "Registration not verified" and a capsule label
matching `/\d+ of \d+/` or its Bengali equivalent with Bengali digits; `P1.3` asserts the sort menu
has no option containing "rated"/"রেটিং").

## Threat notes

Not an M3 task.

## Hard-rule checklist

- [ ] No number stands for quality; denominators visible (asserted in P1.4, P1.5).
- [ ] "Not provided" / "No documents" never `0` (asserted on a seeded sparse doctor in P1.4 variant).
- [ ] "Limited data" shown for the seeded sparse doctor.
- [ ] Every doctor shows "Registration not verified" (P1.4).
- [ ] Evidence copy "Documents attached — not medically validated" (P1.6).
- [ ] "Reviewer's label" rendered (P1.6).
- [ ] Reporter identity reads "restricted" in the console (P5.19).
- [ ] Original evidence URL returns 403 (P1.6).
- [ ] Disclaimer and emergency guidance present on every captured page (screenshots spec asserts the colophon text).
- [ ] Ordering neutral (P1.3).
- [ ] Bengali and English both work; numerals follow language; no cap-transform (locale helper asserts `text-transform: none` on headings in `bn`).
- [ ] Synthetic marker visible (screenshots spec asserts `.demo`).
- [ ] No agent/tool attribution in any file or commit (including screenshot README).

## Release 1 amendment (FD-105, U50)

Built by Unit U50 `u50-release-check` for the 7 November date. Where this amendment and the text above differ, the amendment wins for release 1. Source: U50 functional design § 14.

| Acceptance row | Where it is met in release 1 |
|---|---|
| Suite green, all engines | Chromium projects only (`chromium-360`, `chromium-desktop`, `chromium-reduced-motion`, `log-scan`, `nfr13`), two consecutive full `pnpm e2e` runs with 0 failed, 0 flaky, 0 skipped; Firefox and WebKit: deferred to release 2 (FD-105) |
| CI green under budget | deferred: there is no CI and no `e2e.yml` (FD-102) |
| Both locales per journey | every journey runs in `bn` then `en` (`forEachLocale`) |
| No serious or critical axe | `expectNoSeriousViolations`, empty exclusion list |
| Viewport matrix | 360 px and 1280 px; the 390, 768 and 1440 px viewports: deferred to release 2 (FD-105) |
| Reduced motion | `chromium-reduced-motion` runs Part 1, the P3.11 composer and `motion-switch.spec.ts` only; the other journeys: deferred to release 2 |
| Keyboard-only | register, confirm, sign-in, write and publish; the report sheet: deferred to release 2 |
| 200 % zoom and text spacing, Bengali overflow, live region | `zoom-and-spacing.spec.ts`, the `checkPage` overflow check at 360 px, `live-region.spec.ts` |
| Screenshots committed | deferred to release 2 (FD-105) |
| FD-091 rows (NFR13, reduced motion, animated properties, never-animated) | NFR13 Lighthouse flow, motion-switch spec, the motion CSS check, `checkPage` |
| Quality gates | `pnpm check`, `pnpm smoke` and `pnpm test:int` green on the Bolt branch and on `main` |

Deferred to release 2 (FD-105): Firefox and WebKit, the real Safari smoke and screen-reader output checks (manual), the staff and workspace journeys, the search page and its NFR13 gate, the PWA checks, the committed screenshot set. The browser smoke runs inside `pnpm e2e` (`pnpm e2e:smoke`); `pnpm smoke` stays Vitest-only.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
