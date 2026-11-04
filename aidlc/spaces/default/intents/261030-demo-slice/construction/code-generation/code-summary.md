# Code summary — demo slice (`261030-demo-slice`)

Status: plan Steps 1–14 are done. Nothing is committed. The work sits on branch `bolt/demo-slice` (from `main` at `acd6bf5`) for the review and the squash merge.

## Result in one view

| Gate | Result |
|---|---|
| Baseline before any change (Step 1) | `pnpm check` green: 98 files, 1169 passed and 2 expected fails; lines 97.92% |
| Final `timeout 1500 pnpm check` (after Step 13) | green: 155 test files, 1691 passed and 2 expected fails, then lint, format, identity guard, i18n parity and build |
| Final `timeout 600 pnpm smoke` | green: 14 files, 27 tests (one more file than the baseline: `demo-slice.smoke.test.ts`) |
| `pnpm --filter @rogikotha/web smoke:e2e` (Step 12) | green: 15 of 15 (the motion spec plus the new demo spec) |
| Click-through in a real browser (Step 12) | the whole demo works in `en` and `bn` |
| Adversarial tests (Step 13) | 95 tests in 6 files; 7 failed at first and pointed to 2 S2 defects, both fixed; all pass now |
| `npx impeccable detect apps/web/src --no-advisory` (Step 14) | clean: 220 files scanned, no findings (regex rules only; element rules need a running page) |
| Line coverage per package (Step 11, 80% floor, no threshold changed) | `apps/web` 97.8%, `apps/worker` 100%, `contracts` 100%, `database` 97.2%, `i18n` 100%, `test-support` 96.5%; overall 97.68% |
| `ISSUES.md` | ISS-324 to ISS-391 (68 rows), all `Found in demo-slice` |

## Step 1 — Baseline (2026-10-30, branch `bolt/demo-slice` at `acd6bf5`, before any change)

- `pnpm infra:up`: PostgreSQL, Mailpit and ClamAV containers running.
- `timeout 1500 pnpm check`: green (exit 0) on the first run, all eleven steps:
  - typecheck, lint, `lint:boundaries`, `format:check` and `check:identity` passed;
  - `test:coverage`: **98 test files passed (98); 1169 tests passed and 2 expected fails (1171)**;
  - coverage, all packages together: statements 97.27% (2534/2605), branches 87.92% (888/1010), functions 98.86% (784/793), lines 97.92% (2410/2461). Every package is above its 80% line floor;
  - `i18n:check`: 781 keys in both locales, no mismatch;
  - `contrast`, `contrast:patient` and `check:motion` passed;
  - `pnpm -r build` passed (web and worker).
- `pnpm smoke` was not run on its own at this step, because `pnpm check` already runs the smoke files inside `test:coverage`.

## Step 2 — Dependencies

- `apps/web`: `better-auth@~1.7.14` (newest stable; 1.8 is beta), `@node-rs/argon2@^2.2.2`, the dev dependency `@types/node@^24.13.4` (ISS-329), and, from Step 11, `zod ^4.6.2` (ISS-338).
- `pnpm-lock.yaml`: still one `drizzle-orm@0.45.2`; its peer set now includes `kysely`, which Better Auth brings.
- `docs/status/dependency-check-log.md`: a 2026-10-30 entry.

## What was built

The slice deliberately skips the layered ports and commands of the full plan (FD-099, Q7; ISS-391). Server actions in `apps/web/src/server/actions/` validate with zod, check the signed-in account on the server, and call the data functions in `packages/database/src/demo/` directly.

| Area | Requirement | What exists now |
|---|---|---|
| Server foundation | NFR3 | `server/env.ts`, `db.ts` (lazy shared client), `crypto.ts` (AES-256-GCM, iv 12 + tag 16 + ciphertext), `auth/password.ts` (Argon2id m=65536, t=3, p=1), `auth/instance.ts` (Better Auth on the `auth_*` tables, cookie `rk.session_token` httpOnly and sameSite=lax, secure on https or in production, logger pinned to `warn`, HTTP sign-up/sign-in/account-change paths disabled), `auth/session.ts` (`getCurrentAccount`, `requireAccount`), `data.ts`, and the `/api/auth/[...all]` route |
| Accounts (Step 5) | FR1 | Register (email, password of at least 10 characters, username, display name, age and terms) creates the auth user, an active `account_profiles` row and a named persona, and signs in at once; a used email gets one neutral message and creates nothing. Sign-in with one neutral failure message; seeded patients sign in with the seed password. Sign-out. `safeNextPath` keeps returns on this site. The masthead account control shows the signed-in state |
| Profile (Step 6) | FR2 | `/me` shows display name, username, language and own experiences. A display-name change inserts a new named persona; the language preference is saved and opens the site in that language |
| Home and doctors (Step 7) | FR3, FR7 | `/` lists recent published experiences with their doctor and the emergency panel. `/doctors` lists doctors by most accounts then name, each with "Registration not verified" and its published count. `/doctors/[id]` shows the profile, the recent experiences and "Write about this doctor" |
| Write and edit (Step 8) | FR4 | `/write` (signed in only) publishes a quick review with persona and attestation and opens it. `/experiences/[id]/edit` lets only the author edit title, body, sentiment and outcome; each edit writes `review_versions` and the page shows "Edited". Field errors appear beside the field in the active language |
| Attachments (Step 9) | FR5 | The author attaches JPEG or PNG images (type read from the bytes, at most 10 MB, at most 5). Originals are stored under `var/evidence/`, outside the web root. Each file is scanned through clamd INSTREAM right after upload; a failed or unreachable scan leaves it quarantined ("Scan pending"), never shown or counted. The public page shows only "Documents attached — not medically validated" and the count; the author sees their own list |
| Experience and comments (Step 10) | FR6 | `/experiences/[id]` shows the experience, the evidence note, and comments oldest first with one reply level. Signed-in users post comments and replies (1–2000 characters) under their persona name; an author deletes their own comment, which stays as a tombstone when it has replies. `/experiences` lists the 50 most recent |
| Integration (Step 11) | NFR1, NFR4 | Fragments merged into `en.json` and `bn.json` (72 keys each, no clash; 853 keys in both languages); form-only messages under `formErrors.*` (ISS-373). Shared page test mocked properly (ISS-372). One demo smoke assertion |
| Hardening (Steps 12–13) | NFR3 | Language switch keeps the query string (ISS-377); open redirect and public sign-up endpoint closed (ISS-383, ISS-384); stricter image signature check (ISS-387); infected originals deleted before the verdict is recorded (ISS-388) |

The hard rules hold in the slice: no star, score or quality number; a missing value reads "Not provided"; every doctor shows "Registration not verified"; the evidence wording is exact; numerals follow the active language; no capital transform in Bengali; only seeded fictional data; no tool or model identity.

## Files

161 paths changed or added against `acd6bf5` before this step; Step 14 adds `traceability.json`, `source-manifest.json` and `docs/implementation/handoffs/demo-slice.md`, and changes `docs/implementation/ISSUES.md`. The full literal list is in `source-manifest.json`.

| Group | Paths |
|---|---|
| Server (`apps/web/src/server/`) | `env.ts`, `db.ts`, `crypto.ts`, `data.ts`, `storage.ts`, `clamav.ts`, `auth/{instance,password,session}.ts`, `actions/{auth,auth-form,profile,review,evidence,comments}.ts`, each with its test |
| Components (`apps/web/src/components/`) | `patient/auth/**`, `patient/profile/**`, `patient/home/**`, `patient/doctors/**`, `patient/compose/**`, `patient/evidence/**`, `patient/experience/**`, `patient/comments/**`, `patient/Masthead.tsx`, `shared/ThemeControls.tsx` |
| Data (`packages/database/src/demo/`) | `session.ts`, `accounts.ts`, `accounts-create.ts`, `doctors.ts`, `reviews.ts`, `evidence.ts`, `comments.ts`, `index.ts`, `not-built.ts`, their `*.int.test.ts`, `demo-slice.smoke.test.ts`, `evidence.adversarial.test.ts`; `packages/database/src/index.ts` |
| Contracts and i18n | `packages/contracts/src/view-models/demo.ts`, `packages/contracts/src/index.ts`, `packages/i18n/messages/{en,bn}.json`, `packages/i18n/src/keys.ts` |
| Config and styles | `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/e2e/tsconfig.json`, `apps/web/src/styles/patient.css`, `pnpm-lock.yaml`, `.gitignore` |
| End-to-end | `apps/web/e2e/smoke/demo.spec.ts` (new), `apps/web/e2e/smoke/motion.spec.ts` |
| Shared tests | `apps/web/src/app/pages.test.tsx`, `apps/web/src/app/layouts.test.tsx` |
| Records and docs | this folder, the intent's audit shard, `docs/status/dependency-check-log.md`, `docs/aidlc-migration/RESUME.md`, `docs/implementation/ISSUES.md`, `docs/implementation/handoffs/demo-slice.md` |

These 22 paths contain `[` or `]`, so `source-manifest.json` leaves them out:

- `apps/web/src/app/[locale]/(patient)/page.tsx`
- `apps/web/src/app/[locale]/(patient)/home-page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/layout.tsx`
- `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts`
- `apps/web/src/app/[locale]/(patient)/register/page.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/page.tsx`
- `apps/web/src/app/[locale]/(patient)/sign-in/auth-pages.test.tsx`
- `apps/web/src/app/[locale]/(patient)/me/page.tsx`
- `apps/web/src/app/[locale]/(patient)/me/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/doctors/page.tsx`
- `apps/web/src/app/[locale]/(patient)/doctors/[id]/page.tsx`
- `apps/web/src/app/[locale]/(patient)/doctors/doctors-pages.test.tsx`
- `apps/web/src/app/[locale]/(patient)/write/page.tsx`
- `apps/web/src/app/[locale]/(patient)/write/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/page.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/page.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/page.test.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/page.tsx`
- `apps/web/src/app/[locale]/(patient)/experiences/[id]/edit/page.test.tsx`
- `apps/web/src/app/api/auth/[...all]/route.ts`
- `apps/web/src/app/api/auth/[...all]/route.test.ts`

## Tests (test-after, per the Testing Contract)

Each layer was implemented first, then its tests were written and run. Every page renders in `en` and `bn`; names read as sentences; builders, not hand-written fixtures.

- Step 3 foundation: 8 files, 39 tests (`server/{crypto,env,data}`, `server/auth/{password,instance,session}`, the auth route).
- Steps 5–10 features: unit and component tests beside each file listed above, plus the database integration tests `accounts`, `accounts-create`, `session`, `doctors`, `reviews`, `evidence` and `comments`.
- Step 11: `apps/web` vitest 76 files and 927 tests; `pnpm test:int` 26 files, 173 passed and 2 expected fails. New: the masthead sign-in link and account menu (both languages), a seeded `published` file listed as ready and counted publicly, the record h1 on `/doctors/[id]` and `/experiences/[id]` (both languages), and `packages/database/src/demo/demo-slice.smoke.test.ts` (a reader registers, publishes about a doctor, the doctor shows one published experience in the Bengali list, the experience reads back by public id, and a comment appears with delete allowed for its author).
- Step 12: `apps/web/e2e/smoke/demo.spec.ts`, 3 tests: the whole demo in `en`, the whole demo in `bn`, and the language switch keeping the sign-in return (failed before the ThemeControls fix).
- Step 13: the adversarial files below, plus fixer tests ("deletes an infected original even when its scan result cannot be recorded", two signature tests in `storage.test.ts`). PNG fixtures were given real header bytes; no test was weakened.

## Click-through (Step 12)

`pnpm db:reset` and `pnpm db:seed`, then the web build served by `playwright.config.ts` on 127.0.0.1:3107. In a real browser, in `en` and in `bn`:

1. register, and see the signed-in masthead;
2. change the display name on `/me`;
3. open the doctors list and a seeded doctor showing "Registration not verified";
4. write and publish an experience from that doctor's page, edit it and see "Edited";
5. attach a generated PNG: with ClamAV running it became "Ready", and the public page changed from "No documents" to "Documents attached — not medically validated" with "Files attached: 1" (১ in `bn`);
6. sign out, sign in as the seeded patient `abba_of_two@demo.rogikotha.local`, post a comment and a reply, and check the evidence note.

Four defects were found and fixed: the language switch dropped the query string (ISS-377), the motion spec opened a page that now needs sign-in (ISS-378), experience title links were unstyled (ISS-379), and the upload label ran into the file input (ISS-380). One database test hung once inside the full check and passed on re-run (ISS-381). Screenshots were taken in a temporary folder outside the repo and are not part of the record.

## Adversarial results (Step 13)

Separate agents tried to break the high-risk areas (auth and evidence).

| File | Tests | Result |
|---|---|---|
| `apps/web/src/server/actions/auth.adversarial.test.ts` | 11 | 7 failed at first (5 open redirect, 2 public sign-up endpoint); all pass after the fixes |
| `apps/web/src/server/actions/ownership.adversarial.test.ts` | 28 | all pass: forged ids never edit, delete, attach to or list another user's records; signed-out, suspended and profile-less visitors are sent to sign-in with no write |
| `apps/web/src/app/[locale]/(patient)/signed-out.adversarial.test.ts` | 14 | all pass: `/me`, `/write` and the edit page redirect with a safe `next`; another user's edit page is not found |
| `apps/web/src/server/actions/evidence.adversarial.test.ts` | 22 | all pass: disguised files, an oversize file, a sixth file, three files in one request, forged ids and every ClamAV failure end refused or quarantined |
| `apps/web/src/server/storage.adversarial.test.ts` | 18 | all pass: 14 crafted storage keys refused, random stored names, no URL reaches an original |
| `packages/database/src/demo/evidence.adversarial.test.ts` | 2 | all pass: only clean files are counted, on every public page |

Defects: the open redirect through `safeNextPath` dot segments (S2, ISS-383, fixed) and the public Better Auth sign-up endpoint that revealed registered emails and created profile-less users (S2, ISS-384, fixed). Smaller findings: ISS-385 to ISS-390, plus ISS-361 and ISS-363 (four fixed, the rest open for the full Units).

## ISS ids

Found and recorded in this slice: ISS-324 to ISS-391.

- Fixed in demo-slice: ISS-329, ISS-334, ISS-335, ISS-336, ISS-338, ISS-339, ISS-343, ISS-349, ISS-359 (web side), ISS-364, ISS-372, ISS-377, ISS-378, ISS-379, ISS-380, ISS-383, ISS-384, ISS-386, ISS-387, ISS-388.
- Open S2: none. Open S1: none.
- Open S3: ISS-371 (accepted deviation) and the worker side of ISS-359.
- Open S4: every other row; ISS-330 and ISS-384 name the owner for a decision.
- Existing row seen again: ISS-299 (the unused `eslint-disable` warning in `packages/i18n/src/routing.ts:17`, a warning only).

## Additions after the owner's demo test (2026-11-01)

The owner tried the demo on 2026-11-01 and asked for three changes, deciding the details to the agent.

| Change | Record | What exists now |
|---|---|---|
| A refused post wiped the doctor and the attestation and showed no visible error | ISS-392 | The form keeps every choice after a refusal, marks refused fields in red, lists them in the error summary and counts the story while it is under 20 characters |
| Members could not write about an unlisted doctor | FD-100, ISS-393 to ISS-399 | "Add a doctor who isn't listed" in the write form; the doctor is public at once with "Added by a member — not confirmed" beside "Registration not verified", and a pending `profile_submissions` row for staff |
| Hospitals & clinics and Health topics were placeholders | FD-101, ISS-400 | `/facilities` and `/facilities/[id]`, `/topics` and `/topics/[id]`, read-only, from the existing seed |

The AI-DLC reviewer read the add-a-doctor diff and returned NOT-READY with two S2 findings (ISS-396, ISS-397) and one owner risk (ISS-398); both S2 findings are fixed and tested.

FD-100 and FD-101 go beyond the approved `requirements.md` (FR1 to FR7, NFR1 to NFR6). Nothing traces them to a requirement, so the owner's approval at the Code Generation gate is their acceptance.

### Files (2026-11-01)

- New: `packages/contracts/src/doctor-name.ts` (+ test), `packages/database/src/demo/facilities.ts`, `packages/database/src/demo/{facilities,topics}.int.test.ts`, `apps/web/src/components/patient/doctors/MemberAddedBadge.tsx`, `apps/web/src/components/patient/facilities/{FacilityEntry,FacilityList,FacilityProfile}.tsx` (+ `FacilityViews.test.tsx`), `apps/web/src/components/patient/topics/{TopicList,TopicProfile}.tsx` (+ `TopicViews.test.tsx`).
- Changed: `apps/web/src/server/actions/review.ts`, `apps/web/src/components/patient/compose/{ComposeForm,TextField,FormErrorSummary,OptionGroup}.tsx`, `apps/web/src/components/patient/doctors/{DoctorEntry,DoctorProfile}.tsx`, `apps/web/src/server/data.ts`, `apps/web/src/styles/patient.css`, `packages/database/src/demo/{doctors,reviews,index}.ts`, `packages/contracts/src/{index.ts,view-models/demo.ts}`, `packages/i18n/messages/{en,bn}.json` and the generated `packages/i18n/src/keys.ts` (873 keys), the pages `apps/web/src/app/[locale]/(patient)/{write,facilities,facilities/[id],topics,topics/[id]}/page.tsx`, and their tests.
- Records: `docs/status/decision-log.md` (FD-100, FD-101), `docs/implementation/ISSUES.md` (ISS-392 to ISS-400), `docs/implementation/handoffs/demo-slice.md`, this file and `source-manifest.json`.

### Tests added (2026-11-01)

- Unit and component: `doctor-name.test.ts` (7), `review.test.ts` (+13: add-a-doctor, refused names, NUL byte, kept tick), `ComposeForm.test.tsx` (+5: kept doctor and tick, field list, live count, add-a-doctor panel in `en` and `bn`), `DoctorList.test.tsx` (+2: the member-added badge in both languages), `FacilityViews.test.tsx` (8), `TopicViews.test.tsx` (6), and the shared `pages.test.tsx` now renders the real facility and topic pages.
- Database: `reviews.int.test.ts` (+6: create, reuse, different specialty, "Dristy"/"Isty", rollback, seeded doctor not marked), `facilities.int.test.ts` (3, including that facility visits never reach a doctor's count), `topics.int.test.ts` (3).
- Smoke: `demo-slice.smoke.test.ts` gains "a reader adds an unlisted doctor, who then lists as member-added, and the directory pages answer".
- End to end: `apps/web/e2e/smoke/demo.spec.ts` gains click-path steps 9 and 10 in `en` and `bn`.

Verification on 2026-11-01: `pnpm typecheck`, `lint`, `lint:boundaries`, `format:check`, `check:identity`, `test:coverage` (160 files, 1742 passed and 2 expected fails), `i18n:check` (873 keys), `contrast`, `contrast:patient`, `check:motion` and `pnpm smoke` (14 files, 27 tests) green before the smoke and e2e additions; after them the new smoke file passes and `pnpm --filter @rogikotha/web smoke:e2e` is 17 of 17. `pnpm --filter @rogikotha/web build` green. A browser walk in `en` and `bn` of the refused-then-fixed post, adding a doctor, reusing it by name, and the facility and topic pages.
