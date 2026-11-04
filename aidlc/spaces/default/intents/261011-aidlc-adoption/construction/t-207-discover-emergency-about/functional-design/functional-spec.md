# Functional specification — U20 `t-207-discover-emergency-about`

Unit U20 (kind `ui`, size M, not high risk) builds the release-1 Discover home and re-checks the merged Emergency, About, Terms and Privacy pages (T-207, FD-105), for US12.1, US4.3 and US2.4. It depends on U46. The lead perspective is the architect's. This file is the source of truth for workflows and screen states. Decision logic is in `rules.md`, screens are in `frontend-components.md`, and the answers are in `functional-design-questions.md` (Question 1 is the owner's answer; Questions 2–10 were decided by the agent under the owner's delegation of 2026-11-04).

## 1. What changes

The demo slice's home becomes the prototype's `renderDiscover`, without the search box. The opener holds the one `<h1>`, the lede, three browse links (doctors, hospitals and clinics, health topics), up to five topic chips and the editorial note. Then come U46's full emergency panel with the configured numbers, the topics people wrote about as browse cards, three branches from the facility index under the separation sentence, the three how-it-works steps, and the four newest accounts as U46 `AccountRow`s. The page reads U46's queries and the `ConfigProvider` in parallel, once per request. A failed list leaves out only its own section. The four Half A pages keep their markup. Emergency reads the `ConfigProvider` (closes ISS-171 for release 1), its inline style becomes a class, and its `BMDC` literal becomes a key. Terms gains the lawful-access section that Privacy already has. Unknown patient URLs get a localized 404 (ISS-120). Six keys are added. The Unit also removes the unused `DiscoverVM` contract and its `03-routes-and-contracts.md` §4 row, and the demo home components. No hard rule, data boundary or cross-unit contract (C1–C18) changes; the release-2 hero search may bring a home view model back. One FD row records the owner's Terms answer.

## 2. Baseline (`main` at `29e1837`) and dependency

- **Home**: `Home.tsx` (opener, write and doctors buttons, editorial note, `home/EmergencyPanel` with inline styles, how it works, `Reveal` over `home/ExperienceRow` × 4), fed by `server/data` `doctors.listRecentPublishedReviews(4, locale)` and `DEFAULT_CONFIG_VALUES.emergency`. It has one `h1` (ISS-152 fixed in fact, not yet pinned).
- **Half A**: `Emergency.tsx` (one inline style, `BMDC` literal, reads `DEFAULT_CONFIG_VALUES` from its page), `About.tsx`, `Policy.tsx` (lawful section on Privacy only), with their tests and the FD-022 guards.
- **Shell**: the patient layout's single `RouteTransition`, T-011's `.reveal` hook and `data-static` groups (`motion.css`), and the root `app/not-found.tsx` (ISS-120).
- **U46 (must merge first)**: `taxonomy.listConditions`, `directory.listFacilities`, `review.listExperienceCards`, and the shared `EmergencyPanel`, `BrowseCard`, `AccountRow`, `Avatar`, `MiniList`/`MiniRow` and `facilityLabel`. It rewrites `DoctorProfile` and `TopicProfile` off `home/ExperienceRow`. U20 rebases on U46 before Code Generation.

## 3. Workflows

### WF1 — Code Generation order

1. **Baseline**: rebase on `main` with U46 merged; `pnpm infra:up`; `pnpm check` and `pnpm smoke` green. Read the open `ISSUES.md` rows in web/shell, web/data and testing (ISS-120, ISS-151, ISS-152, ISS-171). No dependency is added, so no dependency-check entry is needed.
2. **FD row** (§ 7), appended to `docs/status/decision-log.md` before any code.
3. **Keys**: the six keys of BR3.1, in `en.json` and `bn.json` in one commit, with the Bengali text listed for the FD-042 review.
4. **Home**: `page.tsx` per WF2; `Home.tsx` per `frontend-components.md` § 2.
5. **Half A**: the Emergency page reads the provider (WF3); `.emerg-note` and `emergview.bmdcShort`; `TERMS_SECTIONS` gains the lawful section last; the placement test and the comments in `Policy.tsx` name both legal pages.
6. **404**: patient `not-found.tsx`, `[...rest]/page.tsx`, the root fallback (WF5).
7. **Clean-up** (BR6.1): grep for importers, then delete `home/ExperienceRow.tsx` and its test, `home/EmergencyPanel.tsx`, `home/format.ts`, and `contracts/view-models/discover.ts` with its barrel line. Edit `03-routes-and-contracts.md` §4.
8. **CSS**: the U20 section in `patient.css` (list resets, `.home-browse` link row, `.teaser-row`, `.emerg-note`, `.notfound`), every rule marked `/* added: U20 … */`.
9. **Tests** (`frontend-components.md` § 5), then `pnpm check`, `pnpm smoke`, `npx impeccable detect apps/web/src --no-advisory` and `pnpm contrast`.

### WF2 — `GET /{locale}` (Discover)

1. `getActor()` and `locale` (U46 WF13 frame).
2. In parallel: `taxonomy.listConditions()`, `directory.listFacilities({page: 1, pageSize: 3})`, `review.listExperienceCards({limit: 4})`, `ports.config.current()`. Nothing is cached between requests (BR1.1).
3. For each list: if the result is `ok`, keep it. If it is `err` or the call throws, log `discover.section_unavailable {section, correlationId}` and mark the section unavailable (BR1.6).
4. Derive the chips (BR1.2) and the grid (BR1.3) from the condition list, and the teaser (BR1.4) and latest (BR1.5) from their results.
5. Render `ViewShell(view="discover", title="")` > `Home` with the derived props and `config.emergency`.

### WF3 — `GET /{locale}/emergency`

`(await getContainer().ports.config.current()).emergency` → `Emergency {config, locale}`. No sign-in, no redirect and no prerequisite (BR2.6).

### WF4 — `GET /{locale}/{about,terms,privacy}`

As merged: `About` and `Policy kind=terms|privacy`. Terms now lists six sections, the lawful one last (BR2.8).

### WF5 — Not found

| Trigger | Renders | Status |
|---|---|---|
| `notFound()` inside any patient page | `(patient)/not-found.tsx` inside the patient layout, in the request's locale | 404 |
| unmatched path under `/{locale}/…` | `[...rest]/page.tsx` calls `notFound()` → the same page | 404 |
| path outside any locale (for example `/fr/x` after the proxy) | root `app/not-found.tsx`: both languages, each line with its own `lang` | 404 |

## 4. Screen states

| Section | Rendered when | Otherwise |
|---|---|---|
| Opener (h1, lede, browse links, editorial note) | always | — |
| Chips | at least one condition with accounts | list left out; the browse links stay |
| Emergency panel | always (the provider cannot fail) | — |
| Browse grid | conditions ok and at least one has accounts | section and heading left out |
| Facility panel | facilities ok and the list is not empty | panel left out |
| How it works | always | — |
| Latest | cards ok | ok and empty → `discover.latestEmpty`; failed → section and heading left out |

Teaser row states: feedback visible with a count above 0 → type · place · count, plus the Limited data tag when flagged; feedback visible with a count of 0 → type · place · `facility.noVisits`; feedback hidden → type · place.

## 5. Owned paths and recorded additions

Owned (`unit-of-work.md`): `app/[locale]/(patient)/page.tsx`, `(patient)/{emergency,about,terms,privacy}/`, `components/patient/home/`, `components/patient/{Emergency,About,Policy}.tsx`.

| Recorded addition | Why |
|---|---|
| `app/[locale]/(patient)/home-page.test.tsx` | the page test moves from the `server/data` mock to a container mock |
| `app/[locale]/(patient)/not-found.tsx`, `(patient)/[...rest]/page.tsx` (new) and their tests | ISS-120 |
| `app/not-found.tsx`, `app/root.test.tsx` | the root fallback reads the dictionaries; the test awaits the async component |
| `app/pages.test.tsx` | only the `/` row and its data mock |
| `components/patient/{fd-022-lawful-placement.test.tsx,emergency-about-policy.smoke.test.tsx}`, `Emergency.test.tsx`, `Policy.test.tsx`, `About.test.tsx` | lawful section on Terms; per-locale `describe.each` (ISS-151) |
| `packages/contracts/src/view-models/discover.ts` (deleted), one line in `contracts/src/index.ts` | Question 7 |
| `packages/i18n/messages/{en,bn}.json`, `apps/web/src/styles/patient.css` (U20 section) | keys; page rules |
| `docs/status/decision-log.md`, `docs/implementation/{ISSUES.md,03-routes-and-contracts.md}`, the T-207 task file amendment | FD row, issues, contract list, release-1 scope |

**Parallel wave**: U20 shares no owned path with U47. The shared files are the message files, `patient.css`, the contracts barrel, `pages.test.tsx` (the `/` row only) and `ISSUES.md`, which are on the dependency document's shared list. The swarm merges one Unit at a time, and each Unit rebases first.

## 6. Decisions and why

- **Browse links in place of search (Q2)**: this is the scope's own wording. One kind of action stays in the hero, and the write button already sits in the masthead. Rejected: keeping two write buttons on one screen.
- **Chips by most accounts (Q3)**: a neutral order the hard rule allows, the same in both languages, and no chip leads to an empty page. Rejected: by name, which shows empty topics.
- **Section-level failure (Q6)**: the front door always keeps its emergency guidance, and the error is logged, not silent. Rejected: a whole-page throw, which hides the guidance.
- **Switch to `AccountRow` (Q10)**: one row design and one byline rule. The front door stops making demo reads. Rejected: keeping the demo row.
- **Localized 404 with a catch-all (Q8)**: closes ISS-120 for every patient URL. The root reads the dictionaries through next-intl, because the boundaries lint refuses a JSON import.
- Reversibility: every decision is page-level and can be reverted with the Bolt's squash commit. No migration and no contract change.

## 7. FD row proposed (appended before code)

The row has no fixed number. It takes the next free FD number at rebase: U20 and U47 are built in parallel, so if U47 merged first and took a number, U20 renumbers its row when it rebases and updates every in-code and record reference to it in the same commit.

- **FD-1xx — The lawful-access explanation is on both legal pages (T-207 Question 1, the owner's answer of 2026-10-29)**: FD-008 ("only in Terms and Conditions") and FD-022 ("only in the Privacy Policy/Terms") are read together: the same section (`policy.privacy.lawful`, `policy.privacy.lawfulBody`) is the last section of both `/terms` and `/privacy`, and it appears nowhere else, never as a banner or a review-page warning. | Both decisions are met word for word, with no new copy. Counsel review of the legal copy stays a release gate.

## 8. Acceptance mapping

| Check | Expected | Rules |
|---|---|---|
| Home order, `en` and `bn` | opener (one h1, browse links, chips, note) → emergency → browse grid → facilities → how → latest | BR1.1–BR1.5, BR4.1 |
| Chips on the seed | the same five topics in both languages, most accounts first, each a link to `/topics/{id}` | BR1.2 |
| Teaser | three rows in index order, Limited data tags, separation sentence, no 0 | BR1.4, BR2.2–BR2.4 |
| Failure | a mocked failing list leaves out its section only; the log line has only `section` and `correlationId` | BR1.6 |
| Emergency | configured numbers in the active digits, last-verified date, `tel:` links, signed out, static | BR2.6, BR3.2 |
| Legal pages | lawful section on `/terms` and `/privacy`, absent from `/`, `/about`, `/emergency` | BR2.8 |
| 404 | `/bn/nope` → Bengali 404 in the patient chrome, status 404; root fallback has no inline style | BR4.2 |
| Motion | reduced-motion walk; opener, note and emergency never move | BR5.2 |
| Gate | `pnpm check`, `pnpm smoke`, impeccable, contrast; `-t "bn"` selects the Bengali set | BR6.2 |

## 9. Risks to verify

- U46's `MiniList`/`MiniRow` are used unchanged (BR6.1). The Limited data tag is rendered by the U20-owned `home/TeaserRow.tsx` wrapper next to the row, so it does not depend on the type of `MiniRow.sub`.
- The `[...rest]` catch-all also catches unknown `/{locale}/admin/*` paths. The staff console is deferred, so this gets an S4 row (BR6.3).
- The seed's limited-data threshold placeholder (5) puts every teaser row in the limited state, which is expected.

## 10. Deferred to release 2 (FD-105)

The hero search box, suggestions and the search page (T-205, T-206); live configuration, including the `emergency.body` numbers as parameters (T-105); the PWA shell cache of `/en` and `/bn` (T-501); and the gated Lighthouse run on the home (U50 in release 1, NFR13).

## Entity-relationship view

None. This `ui` Unit owns no entity. It reads U46's view models (`ConditionCardVM`, `FacilityCardVM`, `ExperienceCardVM`) and `ConfigValues.emergency`.

## Rules summary (derived from `rules.md`)

Data and order: BR1.1–BR1.6. Hard rules: BR2.1–BR2.8. Language: BR3.1–BR3.3. Structure and 404: BR4.1–BR4.2. Look and motion: BR5.1–BR5.2. Process: BR6.1–BR6.3.

## Sources

- `inception/units-generation/unit-of-work.md` (U20), `unit-of-work-story-map.md`, `unit-of-work-dependency.md`; `inception/user-stories/stories.md` (US12.1, US4.3, US2.4); `inception/contract-design/contract-summary.md` (C6, C7, C9, C18).
- `construction/u46-directory/functional-design/` (§§ 3, 4, 7, 11 and `frontend-components.md` § 3).
- `docs/status/decision-log.md` FD-008, FD-022, FD-046, FD-091, FD-099–FD-105; `project.md` hard rules; `team.md` practices.
- `docs/aidlc-migration/design-drafts/t-207-discover-emergency-about/` (2026-10-29 draft).
- Code on `main` at `29e1837`: `app/[locale]/(patient)/{page.tsx,home-page.test.tsx,emergency/page.tsx}`, `components/patient/{home/*,Emergency,Policy}.tsx`, `app/not-found.tsx`, `server/container.ts`, `styles/motion.css`, `contracts/src/view-models/discover.ts`, `i18n/messages/*.json`; prototype `concept-04b` `renderDiscover`.

## Assumptions & Open Questions

None.
