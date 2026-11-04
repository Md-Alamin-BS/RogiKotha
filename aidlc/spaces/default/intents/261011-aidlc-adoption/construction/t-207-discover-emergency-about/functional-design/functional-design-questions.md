# Functional Design — questions (U20 `t-207-discover-emergency-about`)

Unit U20 (kind `ui`, size M, not high risk) delivers what is left of T-207 for release 1 (FD-105): the Discover home on U46's module queries and shared primitives, and a re-check of the merged Emergency, About, Terms and Privacy pages in both languages. It carries ISS-120, ISS-151 and ISS-152, and takes ISS-171 for release 1. It depends on U46 only. Stories: US12.1, US4.3, and US2.4 through the story map.

This file starts from the draft in `docs/aidlc-migration/design-drafts/t-207-discover-emergency-about/` (2026-10-29) and is brought up to date with `main` at `29e1837` and release 1. The draft's search-box, T-105 and T-201/T-202/T-203 assumptions are replaced by U46's design and the C18 constants. Question 1 keeps the owner's answer. Every other question is decided by the agent under the owner's delegation of 2026-11-04 and is listed for the owner in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` at Code Generation.

## What the code on `main` shows

1. **The demo slice's home is merged.** `components/patient/home/Home.tsx` renders the opener with `h1.display` `hero.title`, a "Share your experience" button and a "Browse doctors" link, the editorial note, `home/EmergencyPanel`, how it works, and four rows read through `server/data`'s `doctors.listRecentPublishedReviews` and drawn by `home/ExperienceRow`. It has no topic chips, browse grid or facility teaser.
2. **ISS-152 is fixed in fact.** Since the demo slice, `/` renders exactly one `<h1>` (the opener's). The row is still open and has no test that pins it.
3. **The home panel and the Emergency note use inline styles** (`home/EmergencyPanel.tsx`: three; `Emergency.tsx`: `marginTop: '18px'`), and the BMDC card prints a literal `BMDC`.
4. **Both emergency surfaces read `DEFAULT_CONFIG_VALUES.emergency` directly**, not the container's `ConfigProvider`. C18 says release-1 readers go through `ConfigProvider.current()` (defaults-only, U8).
5. **`emergency.body` writes 999 and 16263 as fixed copy.** With the defaults-only provider the numbers cannot change in release 1, so the sentence and the `tel:` lines always agree.
6. **The lawful-access section is on `/privacy` only.** `Policy.tsx` has no such section in `TERMS_SECTIONS`, and `fd-022-lawful-placement.test.tsx` asserts that it is absent from `/terms`.
7. **`app/not-found.tsx` hard-codes its copy, uses inline styles and always emits `<html lang="en">`** (ISS-120). There is no `not-found.tsx` and no catch-all under `[locale]/(patient)/`.
8. **`packages/contracts/src/view-models/discover.ts` is a stub with `TODO(T-207)`** (`DiscoverVM`, `EmergencyPanelVM`). Only the contracts barrel imports it.
9. **`home/ExperienceRow` is also imported by `doctors/DoctorProfile.tsx` and `topics/TopicProfile.tsx`.** U46 rewrites both onto its shared `AccountRow`, so after U46 the home is the row's last importer.
10. **T-011 is merged.** `motion.css` already has the `.reveal` hook ("home scroll reveal, T-207; never on the first section") and the `data-static="emergency" | "disclaimer"` static groups, and the patient layout wraps every page in one `RouteTransition`. No patient page wraps itself.

## Settled before this stage

- **No search box on the home** (FD-105, `unit-of-work.md`): T-206 is deferred, and the home links to the doctor, facility and topic indexes instead.
- **Data and primitives come from U46**: `taxonomy.listConditions()` → `ConditionCardVM[]` (all canonical conditions by name, zeros included), `directory.listFacilities({page, pageSize})` → `FacilityCardVM` (the counts appear only when `feedbackVisible`), and `review.listExperienceCards({limit})` → `ExperienceCardVM` (newest first, no engagement counts). The shared components are `EmergencyPanel`, `BrowseCard`, `AccountRow`, `Avatar`, `MiniList`/`MiniRow` and `facilityLabel` in `components/patient/shared/`. U46 keeps `listRecentPublishedReviews` unchanged until its last caller switches.
- **Emergency numbers through `ConfigProvider.current().emergency`** (C18). T-105 is deferred to release 2.
- **The look and motion are T-011's** (FD-091, `project.md` Code Style): plain CSS, tokens, the layout's single route transition, and static groups for the emergency guidance and the disclaimer.
- **No percentages and counts only** (FD-106 as U46 proposes it). Facility figures never enter doctor figures (U46 BR2.6, tested at query level).
- **Import boundaries, the 80% floor and the local gate** (FD-093, D10, FD-102): `pnpm check` and `pnpm smoke`, with no CI.
- **No new dependency.**

## Question 1 — answered by the owner

FD-008 puts the lawful-disclosure explanation "only in Terms and Conditions"; FD-022 says "only in the Privacy Policy/Terms". T-207a built it on Privacy only (fact 6).

A. **The same section on both legal pages** (recommended): Terms gains the existing section, with the same keys, as its last section, and Privacy keeps it. The placement test expects it on `/terms` and `/privacy` and nowhere else. One FD row records the reading before code.
B. Privacy only, with an FD row that narrows FD-008.
C. A pointer section on Terms that links to Privacy.
X. Other (please specify)

[Answer]: A (the owner's answer, 2026-10-29: the same lawful-access section on both Terms and Privacy; a new FD entry settles FD-008 against FD-022)

## Question 2 — What takes the search box's place in the hero?

A. **A row of three browse links where the prototype's search form stood**: "Browse doctors" → `/doctors`, "Browse hospitals & clinics" → `/facilities`, "Browse health topics" → `/topics`. The topic chips sit under it. The demo slice's "Share your experience" button leaves the hero, because the masthead carries it on every page and the prototype's hero has none (recommended). It follows the Unit's scope word for word, gives the hero one kind of action (finding), and keeps the structure the prototype has. It adds two keys.
B. Keep the demo slice's two buttons (write, doctors) and add the other two indexes. That gives four actions, two write buttons on one screen, and a structure the prototype does not have.
C. No replacement, chips only. The facility index is then reachable only from the teaser.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 3 — Which topic chips, in what order, and where do they go?

Without search, a chip cannot run a query. The prototype takes the first five conditions in array order, which the database does not hold.

A. **Up to five conditions with at least one account, by most accounts, ties by name in the active language. Each chip is a link to `/topics/{publicId}`** (recommended). The order is one the hard rule allows ("most accounts"), the chips are the same topics in both languages, and no chip leads to an empty page.
B. The first five by name. Different topics per language, and topics nobody wrote about can appear.
C. No chips in release 1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 4 — Which marks do the facility teaser rows carry?

Every seeded facility has fewer accounts than the placeholder threshold of 5.

A. **Type · place · the visit count, then the "Limited data" tag when `accountsLimitedData`. A branch with no visits reads `facility.noVisits` in words, never 0. With facility feedback hidden, the row shows type and place only. No "Not verified" badge on the row; the branch page and the facility index carry it** (recommended). The sparse-sample mark stays next to the figure it qualifies, and the row stays one line on a 360 px phone.
B. A, plus "Not verified" on each row. More complete, but rows wrap twice on phones.
C. Bare counts, as in the prototype.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 5 — How does the home move?

A. **T-011's scroll `.reveal` on each how-it-works step (as in the prototype) and on the browse grid and the facility panel as whole blocks. The latest list keeps the merged `Reveal` stagger (capped at 6). Nothing in the opener, the editorial note or the emergency panel moves** (recommended). No element gets two entry animations, the LCP heading never animates in, and the emergency guidance stays static.
B. One `.reveal` per section only. Calmer, but it drops the prototype's per-step reveal.
C. Reveal staggers on every list. These overlap the scroll hook on the same elements.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 6 — What happens when one list query fails?

There is no `error.tsx`. A thrown failure would replace the front door, emergency panel included, with Next's default error page.

A. **Leave out only the failed section, heading included, and log `discover.section_unavailable` with the section name and the correlation id. The opener, the browse links and the emergency panel always render. The configuration read is not guarded: the defaults-only provider cannot fail, and a throw from it is a programming error** (recommended). The error reaches the log, so the failure is not silent, and the person still reaches emergency help and the indexes.
B. Throw to the error boundary, as other pages do.
C. Add a patient `error.tsx`, which is wider than this Unit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 7 — The `DiscoverVM` stub (fact 8)

A. **Delete `view-models/discover.ts` and its barrel line, and drop `DiscoverVM` from `03-routes-and-contracts.md` §4. The page composes the VMs U46 already provides** (recommended). No new query and no dead contract, and nothing imports the stub.
B. Fill it with a `discover.getHome` query: a new query for data the page can already read.
C. Keep it and re-point its TODO.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 8 — ISS-120: how is "not found" localized?

A. **A patient `not-found.tsx` inside the patient layout, with the masthead, demo marker and disclaimer. It shows `h1` `errors.common.notFound`, a body line and links home and to `/emergency`. A catch-all `[...rest]/page.tsx` calls `notFound()`, so unmatched patient URLs reach it with status 404. The root `app/not-found.tsx` stays the last resort for paths outside any locale: it reads its two lines through `getTranslations({locale})` for `en` and `bn` (no JSON import, which the boundaries lint refuses) and drops its inline styles** (recommended). It adds keys `notFound.body` and `notFound.home`.
B. The localized `not-found.tsx` only. Unmatched URLs keep the English root page.
C. Leave ISS-120 for release 2.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 9 — The `BMDC` literal on `/emergency`

A. **A key `emergview.bmdcShort` with "BMDC" in both languages** (recommended). It keeps the rule against hard-coded strings and lets the Bengali review change it without code.
B. Keep the literal, as an acronym exception.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Question 10 — The latest accounts: switch now or keep the demo read?

A. **Switch to `review.listExperienceCards({limit: 4})` drawn by U46's `AccountRow`, as `unit-of-work.md` and C9 assign. Delete `home/ExperienceRow.tsx` with its test, `home/EmergencyPanel.tsx` and `home/format.ts`, each only if nothing imports it any more. `listRecentPublishedReviews` stays for U47's `/experiences` until U47 or U50 removes it** (recommended). The home rows then match the doctor and topic pages, carry the evidence wording and the anonymous byline rule from one place, and stop reading `server/data`. The comment count leaves the home rows (`ExperienceCardVM` has none), as it does on U46's pages.
B. Keep `listRecentPublishedReviews` and `home/ExperienceRow`. That leaves two row designs and a demo read on the front door.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's delegation of 2026-11-04)

## Assumptions & Open Questions

None.
