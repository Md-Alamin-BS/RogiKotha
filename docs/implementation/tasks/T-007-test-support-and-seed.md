# T-007 — Test support: typed synthetic corpus, builders, fakes, seed, fixtures

| Field | Value |
|---|---|
| Story | STORY-PROT-001 — Deterministic synthetic demo services (corpus) + STORY-FOUND-001 |
| Phase / Lane | 0 / A |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | high |
| Estimate | 4–5 h agent; validation 1.5 h |
| Depends on | T-003, T-005 |
| Parallel-safe with | T-006, T-008, T-009, T-010 |

## Scope change 2026-09-12 — images only (CR-001 / FD-036)


Seeded evidence items are **images only**: generate `page_png` artifacts (plus thumbnails) for e1–e4,
e6, e7 with sharp; e5 stays `failed` but with reason `malformed` instead of `encrypted`; every
`page_count` is 1 and evidence groups with two documents (e.g. r1 reviewed) become two items. Do not
generate PDFs. Fixture list as in T-303's scope-change block; `flagged.jpg` carries the
`ROGIKOTHA-MALWARE-TEST-MARKER` string in a JPEG COM segment.

## Goal

Turn the prototype's `rogikotha-data.js` into a typed synthetic corpus, provide builders and in-memory fakes for every port, and write the idempotent seed that loads the demo database with the accounts, content, evidence derivatives, moderation cases and configuration the storyboard relies on. Until the real evidence pipeline exists (T-304), the seed produces derivatives with a small direct script.

## Read first

1. `docs/implementation/05-demo-storyboard.md` — seeded accounts table, "Seeded content", "Fixtures"
2. `docs/implementation/02-data-model.md` §2, §3, §4, §5, §6, §7, §8, §9, §11, §12, §13 (which columns the seed must fill), §17 (states)
3. `docs/implementation/03-routes-and-contracts.md` §3 (every port the fakes implement) and §4 (`account.register` — the seed creates accounts the same way Better Auth would, but Better Auth is not installed until T-101: see step 6)
4. `docs/implementation/01-conventions.md` §1 (`test-support` layout), §10 (builders, never hand-written fixtures)
5. `ui-design-prototype/shared/rogikotha-data.js` — everything: `doctors` (6), `conditions` (8, with `aliases`), `facilities` (5, `parent`/`branch`), `reviews` (12, with `timeline`, `tags`, `followUp`, `claims`), `followUps`, `laterCare`, `facilityReviews` (8, `criteria`), `comments` (10; `k8` has reply `k9`, `k10` none), `evidence` (7; `e5` failed "password protected"), `user` (shirin_88: drafts `dr1`/`dr2` — `dr2` blocked on a pending profile, bookmarks `r6`/`r9`, 5 notifications), `moderation` (`thresholds`, `permissions`, `auditLog` 13 rows, `notifications` 6, `cases` 5 `MOD-2011…2041`, `quarantine` 4, `providers.pending` `P-140`/`P-143`, `claims` `C-58`, `fieldChanges` 2), `config` (emergency numbers, `limitedDataThreshold: 5`), `CRITERIA`, `EVIDENCE_GROUPS`, `OUTCOMES`
6. `docs/design/rogikotha-dev-spec.md` "Data layer" (selector semantics such as `accountsByAuthor()` returning `[]` for anonymous)

## Owned paths

Create: `packages/test-support/scripts/port-corpus.mjs`, `packages/test-support/scripts/build-fixtures.mjs`, `packages/test-support/src/corpus/{doctors,facilities,branches,conditions,aliases,reviews,facility-reviews,follow-ups,comments,evidence,accounts,personas,moderation,notifications,config}.ts`, `packages/test-support/src/corpus/index.ts`, `packages/test-support/src/builders/*.ts`, `packages/test-support/src/fakes/*.ts`, `packages/test-support/src/seed/{seed,seed-accounts,seed-directory,seed-content,seed-evidence,seed-moderation,seed-config}.ts`, `packages/test-support/src/seed/derivatives.ts`, `packages/test-support/fixtures/README.md` (+ generated fixture files ≤ 1 MB each), `packages/test-support/src/index.ts`, `packages/test-support/src/**/*.test.ts`
Modify: `packages/test-support/package.json`, `packages/test-support/vitest.config.ts`, `.gitignore` (add `packages/test-support/fixtures/oversize.png`)

## Not in scope

- Real pipeline processing (T-304) — derivatives here come from `derivatives.ts` and carry the `// TODO(T-304): re-seed through the pipeline` marker.
- Password hashing via Better Auth (T-101). The seed writes Argon2id PHC strings with `@node-rs/argon2` directly into `auth_accounts.password` using the same parameters T-101 will pin (m=65536, t=3, p=1); T-101 must verify sign-in works against seeded hashes and adjust one side if not.
- Search documents (T-205 owns `search.refresh`; the seed leaves `search_documents` empty and T-205 adds a `seed-search.ts` step).

## Steps

1. `pnpm --filter @rogikotha/test-support add @node-rs/argon2@^2.2.0 sharp@^0.35.4 @cantoo/pdf-lib@latest` (check the latest stable of `@cantoo/pdf-lib` on npm and pin it; record in hand-off) and `-D tsx@^4`. Scripts: `seed` (`tsx src/seed/seed.ts`), `fixtures:build`, `port`, `test`, `typecheck`.
2. `scripts/port-corpus.mjs`: same vm trick as T-006 to load `RK`; for each collection emit a TS file exporting a `const … = [...] as const satisfies Corpus<X>[]` with the records **verbatim** (bilingual `{en, bn}` pairs stay — the corpus is data, not a view model) plus a `seedRef` field equal to the prototype id (`d1`, `r6`, `k8`, `MOD-2041`, `Q-882`, `P-140`, `C-58`). Emit `moderation.ts` from `RK.moderation.*`, `notifications.ts` from `RK.user.notifications` + `RK.moderation.notifications`, `config.ts` from `RK.config` + `RK.moderation.thresholds`. Run once, commit output, then hand-edit types in `corpus/types.ts` (`CorpusDoctor`, `CorpusReview`, …) — keep the script runnable so the output can be regenerated and diffed.
3. Derive what the prototype implies but does not store: `branches.ts` — each `facilities` record is a branch (`branch` field) of an organisation (`parent` field, or the facility itself when `parent` is absent); create one `CorpusFacilityOrg` per distinct `parent` and one branch per record; `personas.ts` — one persona per distinct `author` value across reviews/comments/facilityReviews with `kind` from `identity` (`real`→`named`, `pseudo`→`pseudonymous`, `anon`→`anonymous` — anonymous personas are **per review**, so `r4`'s alias is its own persona); `accounts.ts` — the storyboard table (usernames, roles, which persona/reviews they own: `shirin_88` → r1 + comments k8; `rafi_c` → r6; `anon_author_r4` → r4 anonymously; `reporter_1..6`; `mod_rashid`, `admin_nadia`, `sa_founder`); every other prototype author becomes a `contributor` account with username = author string (`en`), email `<username>@demo.rogikotha.local`, password `demo-pass-2026!`.
4. Builders (`builders/`): `aDoctor(overrides?)`, `aBranch()`, `aCondition()`, `aReview()`, `aFacilityReview()`, `aComment()`, `anEvidenceItem()`, `anAccount()`, `aPersona()`, `aCase()`, `aReport()`, `aConfig()` — each returns a fully valid object for the corresponding **contracts** input/entity with deterministic ids from a counter (`seq()`), never `Math.random`. Tests use these; the seed uses the corpus.
5. Fakes (`fakes/`): one class per port in 03 §3 — `FakeClock` (`set`, `advance`), `SequentialIds`, `FakeCrypto` (XOR-free: real AES with a fixed test key), `FastHasher` (sha256 of the password — tests only), `RecordingMailer` (`sent[]`), `MemoryStorage` (Map of key → bytes, `putQuarantine/getPrivate/putDerivative/head/delete`), `ScriptedScanner` (`nextResults.push('clean'|'detected'|'unavailable')`), `PassthroughImageSanitiser` (returns a 1×1 PNG), `FixturePdfRasteriser` (returns N blank pages), `ConcatPdfAssembler`, `MemoryJobQueue` (records enqueues; `drain()` runs handlers), `ListOutbox`, `NaiveSearchIndex` (substring match), `AlwaysAllowRateLimiter`, `CollectingLogger`, `StaticConfigProvider`, `ListAuditWriter`, and in-memory repository fakes for every repository port **with the method names from the T-004/T-005 stubs** (behaviour: Maps keyed by id; enough for application tests). Export `makeFakePorts()` returning all of them wired together.
6. Seed (`seed/seed.ts`): connects with `DATABASE_URL` (refuses on `APP_MODE=production`), runs steps in order inside one transaction per step, each step idempotent by `seed_ref` (skip rows that exist; **update** nothing — a re-run after `demo:reset` recreates everything; a re-run on a live DB is a no-op). Order: `seed-config` (config version 1 = `DEFAULT_CONFIG_VALUES` with `emergency.lastVerified` from the corpus; retention policy v1 90/180/90; `demo_clock` row offset 0) → `seed-accounts` (insert `auth_users` + `auth_accounts` credential rows with Argon2id hashes + `account_profiles` + preferences + personas + `persona_links`; staff roles; **no** `staff_devices` rows are seeded — every staff account goes through device approval on first sign-in, per the storyboard) → `seed-directory` (terms + aliases from `conditions.aliases` with `lang` guessed: Bengali script → `bn`, else if it appears in a hard-coded Banglish list (`dayabetis`, …) → `banglish`, else `en`; specialties as `taxonomy_terms kind=specialty`; orgs, branches, doctors with `field_provenance` from `provenance`, chambers (`branch_id` resolved by chamber name = branch name where it matches, else null), `profile_submissions` P-140/P-143 `pending` with `duplicate_of_id` = d2 for P-140, claim C-58 pending, the two field changes pending) → `seed-content` (reviews `published` with `published_at` from `posted`, `period_*` from `period` (parse "March 2026" / "মার্চ ২০২৬" → 2026-03; keep a month table), `sections` from `timeline` for detailed reviews (map the four timeline entries to symptoms/diagnosis/treatment/after in order; if the prototype's `timeline` entries carry their own labels use those — inspect and document), tags, `claims`, `review_versions` v1, follow-ups + later care (`laterCare` → `kind: later_care`), `latest_status`; facility reviews with criteria; comments with `parent_id` for k9 → k8; reactions so that `likes`/`dislikes` counts match the prototype (create that many reactions from generated `reactor_N` accounts — or store counts? **Counts are derived from rows**, so create the rows); bookmarks r6/r9 for shirin_88; drafts dr1 (encrypted payload with the excerpt) and dr2 (`blocked_on_submission_id` = P-140's id — wait, dr2 says "waiting for a doctor profile", bind it to P-143); notifications n1–n5 for shirin_88 with `message_key`s that exist in i18n (map the prototype's free text to the closest `mine.notif*`/new keys — add keys `notif.evidenceReady`, `notif.replyReceived`, `notif.moderationOutcome`, `notif.securityNewDevice`, `notif.draftExpiring` to i18n via a follow-up note to the human if missing: **this task may add these five keys in both languages** to `packages/i18n/messages/*.json` — the only cross-package edit allowed here; list them in the hand-off) → `seed-evidence` (items e1–e7 with states: e5 `failed`/`encrypted`, others `published`; artifacts generated by `derivatives.ts`; custody events `received…published` per item; `original_sha256` of the generated source; **no original artifact rows are kept public**; `retention_expires_at = published_at + 90 d`; quarantine records Q-882 etc. map to items by `reviewId` — the prototype's quarantine rows are a staff view of items: give e1/e2/e3/e4 the `stages` implied) → `seed-moderation` (cases with `code` from the corpus, lanes, `report_count`/`distinct_reporters` from `reports`, `auto_hidden`, reasons, reports rows from `reporter_N` accounts to make the counts true, decisions where `auditLog` shows `record`, appeal for MOD-2011 with `appealText`, audit events from `auditLog` with `created_at = now − timeMin`, staff notifications). Set the target content state to `hidden_pending_review` where `autoHidden` is true.
7. `seed/derivatives.ts`: for each evidence item generate `page_count` PNG pages (1240×1754, white, black text `DEMO — SYNTHETIC DOCUMENT — NOT A REAL PATIENT RECORD` + the item label + page N — draw with sharp's SVG input), thumbnails (200 px), and a derivative PDF via `@cantoo/pdf-lib` embedding the PNGs; write through the **real** `FsStorage` adapter? That adapter is T-303/T-304's; here write directly under `STORAGE_ROOT/public/<itemId>/…` and `STORAGE_ROOT/private/<itemId>/…` with the key layout documented in `fixtures/README.md` so T-304 keeps it. Compute sha256 per artifact. Mark the file header `// TODO(T-304): re-seed through the pipeline`.
8. `scripts/build-fixtures.mjs` (`pnpm fixtures:build`): generate `fixtures/prescription.pdf` (2 pages, marker text), `photo.jpg` (synthetic prescription image with EXIF GPS written via sharp `withMetadata({ exif: … })` — verify with `sharp(file).metadata()` that `exif` is present), `encrypted.pdf` (use `@cantoo/pdf-lib` `encrypt` if available; else store a hand-made minimal encrypted PDF fixture ≤ 5 KB and document its origin), `not-a-png.png` (PDF bytes), `eicar.pdf` (a PDF whose stream contains the EICAR test string — the standard 68-byte string; document that it is harmless), `oversize.png` (16 MB, **git-ignored**, regenerated on demand). `fixtures/README.md` explains each and the storage key layout.
9. Tests: builders produce valid contracts inputs; fakes behave (`MemoryStorage` round-trips; `ScriptedScanner` returns scripted results then `unavailable`); corpus invariants — "every review's doctorId exists", "every comment's reviewId exists", "k9's parent is k8", "anonymous review r4 has no persona shared with any other content", "no doctor has a rating/score field". Seed integration test (`seed.int.test.ts`, database project): "seed on an empty database inserts the corpus and is idempotent on re-run" (row counts equal after two runs), "sentiment distribution for d1 counts only published reviews" (raw SQL), "facility_reviews never reference doctors".
10. `pnpm db:reset && pnpm db:migrate && pnpm db:seed && pnpm db:seed` → second run inserts nothing. Commit: `T-007: typed synthetic corpus, builders, fakes, idempotent seed, fixtures`.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Corpus port reproducible | `pnpm --filter @rogikotha/test-support port && git status --porcelain packages/test-support/src/corpus` | no diff |
| Seed from empty | `pnpm db:reset && pnpm db:migrate && pnpm db:seed` | exit 0; prints counts (doctors 6, branches 5, terms ≥ 8, reviews 12, facility_reviews 8, comments 10, evidence_items 7, cases 5, accounts ≥ 15) |
| Idempotent | `pnpm db:seed` again | exit 0; "0 inserted" for every step |
| Accounts sign-in-able later | `psql … -c "select count(*) from auth_accounts where password like '\$argon2id\$%'"` | equals account count |
| Derivatives on disk | `ls .data/storage/public` | 6 item directories with `page-1.png`, `thumb.png`, `derivative.pdf` |
| No public originals | `psql … -c "select count(*) from evidence_artifacts where kind='original' and public"` | 0 |
| Fixtures | `pnpm fixtures:build && ls packages/test-support/fixtures` | six files; `oversize.png` git-ignored |
| Unit + integration tests | `pnpm test && pnpm test:int` | green |
| No secrets committed | `git diff --cached \| grep -i "device_secret\|password" ` | only the documented demo password constant |

## Tests to write

- `corpus.test.ts`: the five invariants in step 9.
- `builders.test.ts`: "every builder output parses with its contracts schema".
- `fakes.test.ts`: "MemoryStorage round-trips bytes", "ScriptedScanner falls back to unavailable", "MemoryJobQueue drain runs handlers once per job".
- `seed.int.test.ts`: the three integration tests in step 9.

## Hard-rule checklist

- [x] No number stands for quality; counts come from rows, never stored aggregates. Evidence: `packages/test-support/src/seed/seed-content.ts:162` (`seedReactions` — every like/dislike is a real `reactions` row); `packages/test-support/src/seed/seed-moderation.ts` (`reports` inserted one row per reporter, `report_count`/`distinct_reporters` set from the corpus's own reason-array length, not a formula); no table anywhere in the seed writes a pre-computed score/rating.
- [x] Missing values are absent, never `0` (e.g. `fee_display` null when the prototype omitted it). Evidence: `packages/test-support/src/seed/seed-content.ts:342` (`criteria: fr.criteria` — facility-review criteria keep the corpus's `null` entries, e.g. `reportTime: null`, verbatim, never coerced to a value); `evidence_items.retentionExpiresAt` is `null` for the failed item (`seed-evidence.ts`), not `0`/an arbitrary date.
- [x] Facility feedback never touches a doctor's aggregates (tested). Evidence: `packages/test-support/src/seed/seed.int.test.ts` — `facility_reviews never reference doctors` (queries `information_schema.columns` for any `%doctor%` column on `facility_reviews`, asserts zero); passing (see `pnpm check` summary below).
- [x] Reporter identity never reaches the reported person (reports use `reporter_N` accounts; no report row for the target's author). Evidence: `packages/test-support/src/seed/seed-moderation.ts:115` (`REPORTER_USERNAMES` is a fixed 6-account pool, `reporter_1..reporter_6`, disjoint from every content-author account).
- [x] Original evidence is never served publicly (no public original artifacts; tested). Evidence: `packages/test-support/src/seed/seed-evidence.ts` never inserts an `evidence_artifacts` row with `kind: 'original'` at all (only `page_png`/`thumbnail`); verified live: `select count(*) from evidence_artifacts where kind='original' and public` → `0` on the seeded demo database.
- [x] Synthetic marker: every generated page contains the DEMO marker text. Evidence: `packages/test-support/src/seed/derivatives.ts:24` (`DEMO_MARKER`, drawn into every generated `page_png`); `packages/test-support/scripts/build-fixtures.mjs` draws the same marker into `prescription-1.jpg`/`prescription-2.jpg`/`photo.jpg`/etc.
- [x] No real person or facility named negatively (corpus is the founder-approved fictional set — do not add names). Evidence: `packages/test-support/scripts/port-corpus.mjs` ports `ui-design-prototype/shared/rogikotha-data.js` verbatim; no name/content was authored by this task.
- [x] No agent/tool attribution in any file or commit. Evidence: verified at commit time (`git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'`, see Hand-off below); grepped `packages/test-support/` for tool/model names — none found outside the required `TOOL · MODEL · EFFORT` run records in `docs/implementation/`.

## Hand-off (implementer fills in)

### What changed

Everything under `packages/test-support/` (owned paths only): the typed corpus (`src/corpus/`, 6 doctors, 8 conditions/aliases, 5 branches/4 orgs, 12 reviews, 8 facility reviews, 10 comments, 7 evidence items, 5 moderation cases + audit log/quarantine/providers, personas, ≥15 accounts, notifications, config) generated by `scripts/port-corpus.mjs` from `ui-design-prototype/shared/rogikotha-data.js` (reproducible — `pnpm port` twice produces byte-identical output, verified with a sha256 diff); 13 builders (`src/builders/`) with a deterministic `seq()`/`seqId()` counter; 16 fakes (`src/fakes/`) for every port named in `03-routes-and-contracts.md` §3 except `PdfRasteriser`/`PdfAssembler` (Phase 2, not created — FD-036); the idempotent seed (`src/seed/seed.ts` + 6 step files + `derivatives.ts`) that loads the demo database through direct Drizzle inserts (no application-command layer exists yet — `ISS-155`); `scripts/build-fixtures.mjs` (8 fixtures + README); `.gitignore` gained `packages/test-support/fixtures/oversize.png`. Unit tests: `corpus.test.ts`, `builders.test.ts`, `fakes.test.ts`, one smoke test (`test-support.smoke.test.ts`), and `seed.int.test.ts` (see "Fragile or surprising" for how it runs).

### Not done and why

- `taxonomy_terms.suggested` (addendum) does not exist and is outside owned paths — `ISS-157`.
- Facility-review reactions are not seeded (only review/comment likes/dislikes are) — `S3`, `ISS-160`.
- MOD-2038's target evidence item (`e6`) does not get its own state flipped on auto-hide — no schema support — `ISS-164`.
- `doctors.claimed_by_account_id` stays `null` even for `claimed: true` doctors (d1, d4) — no claiming account exists in the corpus — `ISS-168`.

### Questions for the human

- `docs/implementation/05-demo-storyboard.md`'s seeded-accounts table names `anon_author_r4` as proving alias isolation, but r4 is not anonymous in the actual prototype data (see `ISS-158`). Should the storyboard be corrected to name one of the real anonymous reviews (r2/r8/r12), or is this acceptable drift for the walkthrough?
- `CR-006` (open, from T-005's validation) is unrelated to this task but was not re-checked — not touched here.

### Follow-ups

See `ISS-155` through `ISS-169` (15 rows). The two most load-bearing for later tasks: `ISS-158` (storyboard account-name mismatch — affects T-102/T-504 walkthrough scripting) and `ISS-167` (`seed.int.test.ts` runs standalone, not via `pnpm test:int` — a future task should either widen the root `test:int` script's `--project` filter or give `packages/database`'s test-setup a lock so both int-test projects can share one command safely).

### `pnpm check` output summary

```
pnpm typecheck   — 9/9 packages, exit 0 (test-support: tsc --types node, see ISS-166)
pnpm lint        — 0 errors, 1 pre-existing warning (packages/i18n/src/routing.ts, not touched here)
pnpm test        — 37 files / 146 passed + 2 expected-fail (148), all green
pnpm i18n:check  — 777 keys, both locales, parity OK (no i18n edit was needed — the five notif.*
                   keys step 6 allows already existed, ported by an earlier task)
pnpm build       — apps/web + apps/worker, both green (37 route rows + Proxy)
pnpm smoke       — 7 files / 10 tests (+1 file/+1 test — test-support.smoke.test.ts)
pnpm test:int    — 7 files / 27 passed + 2 expected-fail (29), unchanged (database project only;
                   see ISS-167 for why this task's own int test runs separately)
```

Seed verified directly against both databases:
```
pnpm db:reset && pnpm db:migrate && pnpm db:seed   → accounts 44, config 3, directory 63,
    content 392, evidence 63, moderation 39 inserted
pnpm db:seed (again)                                → 0 inserted for every step
pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
    → 3/3 tests green against rogikotha_test_t007 (fresh reset + migrate inside the test)
```
Row counts on the seeded demo database: doctors 6, facility_branches 5, taxonomy_terms 14,
reviews 12, facility_reviews 8, comments 10, evidence_items 7, moderation_cases 5,
account_profiles 80 (≥15). `.data/storage/public` has 6 item directories with
`page-1.png`+`thumb.png` (e5 fails validation, gets no derivatives). `evidence_artifacts` has
zero `kind='original' and public` rows. `auth_accounts.password` for every seeded account
verifies against `demo-pass-2026!` with `@node-rs/argon2`'s `verify()` (spot-checked).

### Hard-rule evidence

See the checklist above — every row has a file:line or live-query citation.


## Addendum — fixture mappings agreed after the spine reconciliation

- `RK.moderation.cases[].lane === 'appeal'` → enum `appeals`; `targetKind === 'account'` → `review`.
- `doctors[].accent` / `facilities[].accent` → `avatar_hue`.
- `followUps` and `laterCare` are seeded with real `dated_year/dated_month` so ordering is by date (newest first), never by array position.
- The prototype's hard-coded `TAG_GROUPS` (04b `app.js` ≈ 1314–1330, 12 suggestions per group) are seeded as `taxonomy_terms` with `suggested = true` (add the boolean column in T-005 if missing) so `taxonomy.listSuggested` (T-201) has data.
- Comment fixture fields `dangerous`, `link`, `providerFor`, `mentions` map to: a `hidden_pending_review` comment with an open `dangerous` case; `has_external_link`; an approved `profile_claims` row for the author; `comment_mentions`.
- Evidence item `e5` (failed, password protected) is seeded `failed(encrypted)` and is **not** public.
