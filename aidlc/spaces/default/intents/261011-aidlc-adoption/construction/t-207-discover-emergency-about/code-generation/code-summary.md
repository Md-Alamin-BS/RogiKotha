# Code summary — U20 `t-207-discover-emergency-about`

Completed at plan Step 22 (2026-11-06). Branch `bolt/t-207-discover-emergency-about`, cut from `main` `153a65c` (U9, U11 and U46 merged); the plan is `code-generation-plan.md`, the trace `traceability.json`, the written paths `source-manifest.json`. 41 files changed against `main` before the Step 22 records (1500 insertions, 618 deletions).

## What was built

- **Keys** (Step 4): `discover.browseAll`, `discover.browseFacilities`, `discover.browseTopics`, `emergview.bmdcShort`, `notFound.body`, `notFound.home` in `packages/i18n/messages/en.json` and `bn.json`; `packages/i18n/src/keys.ts` regenerated with its script (919 keys, was 913). The Bengali awaits the owner's FD-042 review (ISS-603).
- **Lower layers** (Step 5): no change to `domain`, `application`, `database`, `adapters` or `test-support`; no migration. `contracts` changes only by the deletion of Step 19.
- **Home helpers** (Steps 6–8): `components/patient/home/pick-chips.ts` (`pickChips`, `browseConditions`) and `teaser-sub.ts`, each with its test.
- **Home** (Steps 9–12): `home/TeaserRow.tsx` (wraps U46's unchanged `MiniRow` and adds the Limited data tag), the rewritten `home/Home.tsx` (opener with one `h1`, three browse links, chips and the editorial note; U46's `EmergencyPanel`; browse grid; facility teaser; how-it-works; latest `AccountRow`s) and `Home.test.tsx`; U20's section at the end of `styles/patient.css` (65 lines, each rule `/* added: U20 ... */`, T-011 tokens only).
- **Home page** (Steps 13–14): `app/[locale]/(patient)/page.tsx` runs `taxonomy.listConditions`, `directory.listFacilities({page: 1, pageSize: 3})` and `reviewReads.listExperienceCards({limit: 4})` through `runCommand` in one `Promise.allSettled` and reads `ports.config.current()`; a failing list leaves out only its section and is logged (ISS-604). `home-page.test.tsx` rewritten (18 tests); in `app/pages.test.tsx` only the data mock of the `/` row changed (container and command-call stand-ins).
- **Half A pages** (Steps 15–17): `emergency/page.tsx` reads the `ConfigProvider` (closes ISS-171 for release 1); `Emergency.tsx` uses `.emerg-note` and `emergview.bmdcShort`; `Policy.tsx` puts the lawful section last on Terms as well as Privacy (FD-109); `Emergency.test.tsx`, `Policy.test.tsx`, `About.test.tsx`, `fd-022-lawful-placement.test.tsx` and `emergency-about-policy.smoke.test.tsx` run per locale under `describe.each(['en', 'bn'])` (closes ISS-151).
- **404** (Step 18): `app/[locale]/(patient)/not-found.tsx`, the `app/[locale]/(patient)/[...rest]/page.tsx` catch-all, and the root `app/not-found.tsx` as an async component reading both dictionaries, each line with its own `lang`, no inline style (closes ISS-120); tests `not-found.test.tsx`, `[...rest]/page.test.tsx`, `root.test.tsx`.
- **Clean-up** (Step 19): deleted `components/patient/home/{ExperienceRow.tsx,ExperienceRow.test.tsx,EmergencyPanel.tsx,format.ts,format.test.ts}` and `packages/contracts/src/view-models/discover.ts` with its barrel line in `packages/contracts/src/index.ts`; the `DiscoverVM` row removed from `docs/implementation/03-routes-and-contracts.md` (it was in §6, not §4 as the plan said). A grep showed no importer left.
- **Smoke** (Step 20): `components/patient/home/home.smoke.test.tsx` (one `h1`, the configured `tel:` numbers, the three browse links, in `en` and `bn`).
- **Records** (Step 22): `docs/implementation/ISSUES.md` (rows below), the release-1 amendment and hand-off in `docs/implementation/tasks/T-207-discover-emergency-about.md`, FD-109 in `docs/status/decision-log.md` (appended at Step 2), and this summary, `traceability.json` and `source-manifest.json`.

## Counts and coverage

| | Before (Step 1, `main` `153a65c`) | After (Step 22 gate) |
|---|---|---|
| `pnpm check` test files | 269 | 272 |
| Tests passed (plus 2 expected to fail) | 2767 | 2836 |
| `apps/web` lines | 96.82% (2069/2137) | 96.97% (2082/2147) |
| All packages lines | 95.08% (6506/6842) | 95.21% (6524/6852) |
| i18n parity keys | 913 | 919 |
| `pnpm smoke` | 21 files, 41 tests | 22 files, 43 tests |
| U20-area unit tests (Step 3 command) | 12 files, 60 tests | see `unit-test-instructions.md`; 74 files, 972 tests on `apps/web/src/{app,components/patient,lib}` at Step 19 |

`packages/contracts` stays at 100% lines. No coverage floor was changed (D10).

## Gate

Final run on `bolt/t-207-discover-emergency-about` after the Step 22 records (2026-11-06), each command once, no retry needed:

- `timeout 300 pnpm format:check`: clean ("All matched files use Prettier code style"); no file needed `prettier --write`.
- `timeout 1500 pnpm check`: exit 0. Typecheck of every package and app; ESLint 0 errors and 1 existing warning (unused `eslint-disable` in `packages/i18n/src/routing.ts:17`, ISS-105 and ISS-299, outside U20); boundaries fixture 18 expected violations; `format:check` clean; identity check passed; `test:coverage` 272 files, 2836 passed plus 2 expected to fail; i18n parity 919 keys; `contrast` and `contrast:patient` all pairs pass; motion rules M1–M11 OK; `next build` green.
- `timeout 600 pnpm smoke`: 22 files, 43 tests, all passed (was 21 files, 41 tests; nothing removed or skipped).
- At Step 21 also: `npx impeccable detect apps/web/src --no-advisory` exit 0 with no findings.

## Files outside the owned paths

Owned paths are those of the plan's "Owned paths". Every changed file outside them:

| Path | Why |
|---|---|
| `apps/web/src/lib/titles.ts` | ASSUMPTION(U20): the `'not-found'` view and its title (ISS-605) |
| `apps/web/src/styles/patient.css` | shared, append-only: U20's section (Step 12) |
| `apps/web/src/app/pages.test.tsx` | shared: the `/` row's data mock only (Step 14) |
| `packages/i18n/messages/{en,bn}.json`, `packages/i18n/src/keys.ts` | shared: six keys appended, `keys.ts` regenerated |
| `packages/contracts/src/index.ts` | shared: the one `discover` barrel line removed (Step 19) |
| `docs/implementation/03-routes-and-contracts.md` | the `DiscoverVM` row removed (Step 19) |
| `docs/status/decision-log.md` | FD-109 appended (Step 2; working number, renumbered at rebase if U47 merges an FD row first, R-01) |
| `docs/implementation/ISSUES.md` | four rows closed, seven added (Step 22) |
| `docs/implementation/tasks/T-207-discover-emergency-about.md` | release-1 amendment and hand-off (Step 22) |

Not touched, as the design requires: the patient layout, `Masthead`, `Colophon`, `RouteTransition`, `tokens.css`, `motion.css`, U46's `components/patient/shared/` primitives, `server/container.ts`, `server/data.ts`, the seed, `.github/workflows/`.

## Paths left out of `source-manifest.json`

The manifest holds literal paths only, so these written paths, which contain `[` and `]`, are listed here instead:

- `apps/web/src/app/[locale]/(patient)/page.tsx`
- `apps/web/src/app/[locale]/(patient)/home-page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/emergency/page.tsx`
- `apps/web/src/app/[locale]/(patient)/not-found.tsx`
- `apps/web/src/app/[locale]/(patient)/not-found.test.tsx`
- `apps/web/src/app/[locale]/(patient)/[...rest]/page.tsx`
- `apps/web/src/app/[locale]/(patient)/[...rest]/page.test.tsx`

Deleted paths (Step 19) are not in the manifest: `apps/web/src/components/patient/home/{EmergencyPanel.tsx,ExperienceRow.tsx,ExperienceRow.test.tsx,format.ts,format.test.ts}` and `packages/contracts/src/view-models/discover.ts`.

## Issues (`docs/implementation/ISSUES.md`)

Fixed by U20: ISS-120 (localized 404), ISS-151 (`-t bn` selects the Bengali set), ISS-152 (one `h1` on `/`), ISS-171 (Emergency reads the `ConfigProvider`, release 1).

Found in `U20 t-207-discover-emergency-about` (working numbers from ISS-600, because U47 numbers from ISS-517 in parallel; renumbered at merge):

| ID | Sev | What | Status |
|---|---|---|---|
| ISS-600 | S4 | `emergency.body` has fixed numbers; parameterise with T-105 | deferred, release 2 |
| ISS-601 | S4 | T-105 configuration fallback to `DEFAULT_CONFIG_VALUES.emergency` (R-07) | deferred, release 2 |
| ISS-602 | S4 | the patient catch-all also answers unknown `/{locale}/admin/*` | deferred, staff console |
| ISS-603 | S4 | Bengali of the six keys awaits FD-042 review; ASSUMPTION(U20) `emergview.bmdcShort` = `বিএমডিসি` | open, owner review |
| ISS-604 | S4 | ASSUMPTION(U20): the failure log uses `kind`, not `section` | assumption |
| ISS-605 | S4 | ASSUMPTION(U20): `titles.ts` `'not-found'` view; inlined place text in `teaser-sub.ts`; `reviewReads` not `review` | assumption |
| ISS-606 | S4 | three acceptance rows not walked at Code Generation (reduced motion, live 404 status, seeded chips) | open → Build and Test |

The lint warning for the unused `eslint-disable` in `packages/i18n/src/routing.ts` was there before U20 and already has rows (ISS-105, ISS-299); no new row.
