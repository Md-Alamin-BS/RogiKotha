# CR-008 — Seed and fixture gaps found validating T-007

| Field | Value |
|---|---|
| Story | infra / demo data — closes the three `S2` and two `S3` rows T-007's validation raised |
| Phase / Lane | 0 / either — queued into lane A alongside T-009, whose owned paths it does not touch |
| Class → model | M1 → Claude Sonnet 5 (alt GPT-5.6 Terra); validator: the other vendor |
| Effort setting | high |
| Estimate | 2–3 h agent; validation 1 h |
| Depends on | T-007 (merged) |
| Parallel-safe with | anything that does not touch `packages/test-support/` — which today is everything |
| Status | **needs queueing** — no founder decision required |

## Why this exists

T-007 built the corpus, builders, fakes, seed and fixtures correctly, and its validation
(`docs/validation/T-007.md`) is a `PASS WITH FOLLOW-UP`. Five findings share one shape: the
*mechanism* is right and the *data* quietly falls short, in a place the task's own acceptance check
could not see. All five live in `packages/test-support/` (plus one root file), none needs a product
decision, and one session can close all of them.

`ISS-173`, `ISS-174` and `ISS-175` are `S2` — each is data the storyboard or a later task actually
relies on. `ISS-177` and `ISS-178` are `S3` and are batched here because they are in the same package
and the same session's reach.

## Read first

1. `docs/validation/T-007.md` — the five rows, with the exact evidence for each
2. `docs/implementation/handoffs/T-007.md` — especially "Fragile or surprising"
3. `docs/implementation/tasks/T-007-test-support-and-seed.md` steps 2, 5, 6, 8 (what was asked)
4. `docs/implementation/05-demo-storyboard.md` lines 13 and 59 (the seeded-accounts table, step 19)

## Owned paths

Modify: `packages/test-support/scripts/port-corpus.mjs`,
`packages/test-support/scripts/build-fixtures.mjs`,
`packages/test-support/src/corpus/{moderation,types}.ts` (regenerated, plus the hand-written type),
`packages/test-support/src/seed/{seed,seed-content,seed-moderation}.ts`,
`packages/test-support/src/fakes/repositories.ts`,
`packages/test-support/src/**/*.test.ts`, `packages/test-support/fixtures/**` (regenerated).
Create: `.gitattributes` (repo root).

## Not in scope

Any change to `packages/database` or `packages/contracts`. Any new i18n key — the five `notif.*` keys
this needs are already in both locales (777-key parity must not move). The `05-demo-storyboard.md`
corrections for `ISS-158`/`ISS-176`: those are the founder's wording call, not this task's.

## Steps

1. **`ISS-173` — seed the five user notifications.** `USER_NOTIFICATIONS` in
   `src/corpus/notifications.ts` is exported and never consumed. Add a `seedUserNotifications()` to
   `seed-content.ts` (or its own step file, registered in `seed.ts`'s order after accounts and
   content exist) that inserts one `notifications` row per corpus entry for `shirin_88`:
   - `kind` — the corpus `kind` maps 1:1 onto the `notification_kind` enum
     (`evidence, discussion, moderation, security, draft`); no mapping table needed.
   - `message_key` — `notif.evidenceReady`, `notif.replyReceived`, `notif.moderationOutcome`,
     `notif.securityNewDevice`, `notif.draftExpiring` respectively. **All five already exist in both
     `en.json` and `bn.json`** (ported by T-006); do not add keys.
   - `params` — the ids the copy needs (review/evidence/case public id), allowlisted, never free text.
   - `route` — the in-app path the notification opens.
   - `dedupe_key` — the corpus `seedRef` (`n1`..`n5`), which is also what makes the step idempotent.
   - `read_at` — `null` where the corpus says `unread: true`, a timestamp otherwise.
   - `expires_at` — `created_at + retention.notificationDays` (90) from the seeded retention policy.
   - `created_at` — derived from the corpus's `when` ("2 days ago", "৫ দিন আগে") relative to seed time,
     so the list orders newest-first like the prototype.
2. **`ISS-174` — MOD-2033 really has six reports.** `port-corpus.mjs` currently drops the prototype's
   `reports` number; carry it through as `reportCount` on the corpus case type (`corpus/types.ts`),
   re-run `pnpm --filter @rogikotha/test-support port`, and commit the regenerated
   `corpus/moderation.ts`. Then in `seed-moderation.ts` replace `reportCount: c.reportReasons.length`
   (line ~92) with the ported number, and insert that many `reports` rows from the `reporter_1..6`
   pool instead of one per reason — pad the reason list by repeating its last entry (or a documented
   `other`) when `reportCount > reportReasons.length`. `distinct_reporters` stays
   `min(reportCount, 6)`. Check the four other cases are unchanged (their `reasons` length already
   equals their `reports`). MOD-2033's seeded summary says "Six reports disagree with the experience"
   and `coordinated_signal` is already `true`; after this the count, the copy and the signal agree,
   and the case finally demonstrates what it is for — six distinct reporters crossing
   `thresholds.fiveAccountHide = 5` and the experience **still** staying public because the reason is
   a factual disagreement.
3. **`ISS-175` — make `photo.jpg` actually carry EXIF GPS.** `build-fixtures.mjs`'s
   `withExif({ IFD0: …, GPS: … })` silently drops the whole `GPS` block on sharp 0.35.4 — the written
   file has `IFD0.Software` and no tag `0x8825` anywhere. Find the key shape this sharp version
   honours (check sharp's current `withExif`/`withMetadata` docs and changelog before writing code —
   `AGENTS.md` requires a fresh `docs/status/dependency-check-log.md` entry if the last one is older
   than 3 days); if sharp cannot write a GPS IFD at all, build the EXIF block by hand and splice the
   APP1 segment. Then **assert it in the generator itself**: after writing the file, re-read it and
   fail the script unless tag `0x8825` is present. A fixture that claims a property must prove it,
   or T-304's metadata-stripping test passes vacuously.
4. **`ISS-177` — complete the two short repository fakes.** In `src/fakes/repositories.ts` add the
   seven methods `FakeReviewRepository` is missing (`sentimentDistribution`, `outcomeDistribution`,
   `criteriaDistribution`, `listExperiences`, `insertFacilityReview`, `restoreFacilityReview`,
   `softDeleteFacilityReview`) and the three `FakeAccountRepository` is missing (`isBlocked`,
   `setBlock`, `unsetBlock`), with the same in-memory-Map behaviour the other eleven fakes use. The
   three distribution methods must count **only** the fake's own reviews, never facility reviews —
   that is the hard rule they exist to let application tests assert. Then add a test that reads each
   stub's method names out of `packages/database/src/repositories/*.ts` and asserts the matching fake
   is a superset, so the next stub method cannot silently diverge again.
5. **`ISS-178` — add a root `.gitattributes`.** `* text=auto eol=lf`, plus `binary` for `*.pdf` and
   the image extensions the fixtures use. Then re-run `pnpm --filter @rogikotha/test-support port`
   and `pnpm fixtures:build` and confirm the working tree is genuinely clean afterwards (today both
   leave 17 EOL-only modified files on a Windows checkout with `core.autocrlf=true`). While there,
   restate T-007's first acceptance row as `git diff --quiet packages/test-support/src/corpus`, which
   tests the property that was actually meant.
6. Update the affected `ISSUES.md` rows to `fixed in CR-008` with how, add a `CR-008` row to
   `06-change-requests.md`, and fill this file's Hand-off section. Commit messages start `CR-008: `.

## Acceptance checks

| Check | How | Expected |
|---|---|---|
| Notifications seeded | `pnpm db:reset && pnpm db:migrate && pnpm db:seed`, then count `notifications` | **5**, all for `shirin_88`, one per `kind` of the enum, every `message_key` resolvable in both locales |
| Notifications idempotent | `pnpm db:seed` again | `0 inserted` for every step, `notifications` still 5 |
| MOD-2033 reports | query `report_count`, `distinct_reporters` and the actual `reports` rows for the case | `report_count` **6**, `distinct_reporters` **6**, and **6** real `reports` rows from six distinct `reporter_N` accounts — matching its own `summary_en` |
| Other cases unchanged | same query for MOD-2011/2029/2038/2041 | `0/0`, `1/1`, `1/1`, `2/2` — exactly as before |
| `photo.jpg` has GPS | re-read the written fixture and look for EXIF tag `0x8825` | present, with the four GPS tags; and the generator itself fails if it is not |
| Fakes complete | the new superset test | green for all 13 repository fakes |
| Generators leave a clean tree | `pnpm ... port && pnpm fixtures:build && git status --porcelain` | empty |
| Nothing else moved | `pnpm check`, `pnpm smoke`, `pnpm test:int`, and the standalone `seed.int.test.ts` | all green; i18n parity still **777** keys; test counts only grow |

## Hard-rule checklist

- [x] No number stands for quality; counts still come from rows (the six MOD-2033 reports are six real
      `reports` rows, not a stored number). Evidence: live query against the seeded `rogikotha_cr008`
      database — `moderation_cases` for `MOD-2033` shows `report_count`/`distinct_reporters` **6/6**,
      matched by **6** real `reports` rows from six distinct `reporter_1..6` accounts, and
      `moderation_case_reasons` for the case sums to **6** (`packages/test-support/src/seed/
      seed-moderation.ts` — `paddedReasons` feeds both the reason-count insert and the report-row
      loop, so the two never diverge).
- [x] Reporter identity never reaches the reported person — the three extra reporters come from the
      `reporter_1..6` pool, still disjoint from every authoring account. Evidence: the live query above
      shows all six `MOD-2033` reports filed by `reporter_1`..`reporter_6`; `REPORTER_USERNAMES` in
      `seed-moderation.ts` is unchanged from T-007 (still disjoint from every content-author account).
- [x] Audit/notification details stay allowlisted: notification `params` carry ids and enums only,
      never free text, an email, a filename or a review body. Evidence:
      `packages/test-support/src/seed/seed-notifications.ts` (`resolveNotificationFields`) — every
      `params` value is a `reviewPublicId`/`evidenceItemPublicId`/`commentPublicId`/`caseCode` or `{}`;
      live query confirms, e.g. `{"reviewPublicId": "da7dttdqr7", "evidenceItemPublicId":
      "xck74mncmy"}` for `n1`, never the corpus's free-text `text.en/bn`.
- [x] Bengali and English both work — every seeded `message_key` exists in both files; parity stays at
      777 keys (this task adds none). Evidence: `pnpm i18n:check` — "i18n parity check passed: 777
      keys, both locales" (unchanged from before this task; the five `notif.*` keys already existed).
- [x] Synthetic marker still visible in every regenerated fixture. Evidence: `photo.jpg` is the only
      fixture whose bytes actually changed (its EXIF, not its pixels) — `writePhotoWithExifGps()` still
      rasterises the same `prescriptionSvg()` template that draws `DEMO_MARKER` (T-007's proven path);
      the other six fixtures (`prescription-1/2.jpg`, `not-a-png.png`, `broken.jpg`, `flagged.jpg`,
      `report.pdf`) are byte-identical to before this task (only an EOL-only regeneration touched
      `report.pdf`, fixed by `.gitattributes`).
- [x] No agent/tool attribution in any file or commit. Evidence: `git log -1
      --format='%an <%ae>%n%cn <%ce>%n%B'` on the final commit (see Run record below); grepped every
      changed file under `packages/test-support/` for tool/model/brand names — none found outside the
      required `TOOL · MODEL · EFFORT` run-record fields in `docs/implementation/`.

## Hand-off (implementer fills in)

### What changed

All five findings from T-007's validation, entirely inside `packages/test-support/` (plus the new root
`.gitattributes`):

1. **`ISS-173`** — new `src/seed/seed-notifications.ts` (`seedUserNotifications`), registered last in
   `seed.ts`'s step order (after accounts/config/directory/content/evidence/moderation, since its
   `params` resolve ids seeded by the last two of those). Inserts the five `USER_NOTIFICATIONS` corpus
   rows for `shirin_88`, idempotent by `dedupeKey` (`n1`..`n5`); `read_at` null where `unread`,
   `expires_at` computed from the seeded retention policy's `notification_days`.
2. **`ISS-174`** — `corpus/types.ts` gained `CorpusModerationCase.reportCount`; `port-corpus.mjs` now
   carries the prototype's `reports` field through; `seed-moderation.ts` pads `reportReasons` up to
   `reportCount` (repeating the last reason) and uses the padded list for both the reason-count insert
   and the report-row insert, so the two stay consistent.
3. **`ISS-175`** — `build-fixtures.mjs`'s `writePhotoWithExifGps` writes the GPS block under sharp's
   documented `IFD3` key instead of `GPS` (confirmed against sharp's own docs and empirically — `GPS`
   is silently dropped, `IFD3` is not) and re-reads the file after writing, failing the script unless
   EXIF tag `0x8825` (GPSInfo) is present.
4. **`ISS-177`** — `fakes/repositories.ts`: `FakeReviewRepository` gained a separate `facilityReviews`
   store plus `listExperiences`, `sentimentDistribution`, `outcomeDistribution`, `criteriaDistribution`,
   `insertFacilityReview`, `softDeleteFacilityReview`, `restoreFacilityReview`;
   `FakeAccountRepository` gained a `blocks` store plus `setBlock`/`unsetBlock`/`isBlocked`. New
   `fakes/repositories-superset.test.ts` reads method names out of each `packages/database/src/
   repositories/*.ts` stub's source text (never imports `@rogikotha/database` — boundary) and asserts
   every one of the 13 fakes is a method-name superset of its stub.
5. **`ISS-178`** — new root `.gitattributes` (`* text=auto eol=lf`, plus `binary` for
   `*.pdf`/`*.jpg`/`*.jpeg`/`*.png`); `git add --renormalize .` then a fresh `port` + `fixtures:build`
   left the working tree genuinely clean (`git status --porcelain` empty, `git diff --quiet` exit 0).

`packages/test-support/src/builders/case.ts`'s `aCase()` builder gained a `reportCount` field
(defaulting to `reportReasons.length`) — a mechanical consequence of widening `CorpusModerationCase`,
not a new decision.

### Not done and why

Nothing from the task's six steps was skipped. `ISS-176` (storyboard names MOD-2041 in the wrong lane)
is explicitly out of scope — a founder wording call, not this task's.

### Questions for the human

None — the task needed no founder decision, per its own "Status: needs queueing — no founder decision
required" and the two `// ASSUMPTION(CR-008):` markers taken as the narrower, reversible option (see
`ISS-190`, `ISS-191`).

### Follow-ups

- `ISS-190` (S4) — `seed-notifications.ts`'s `params` deliberately omit the values four of the five
  message keys interpolate (`{label}`, `{name}`, `{action}`, `{city}`, `{days}`); T-405 (the first task
  to render these) must resolve them from the stored ids at query time.
- `ISS-192` (S4) — `pnpm db:reset` does not clear `STORAGE_ROOT`, so repeated reset+seed cycles in a
  long-lived worktree accumulate orphaned derivative directories (found while verifying the
  "Derivatives on disk" acceptance row; not a CR-008 defect — `seed-evidence.ts`/`derivatives.ts` are
  untouched by this task).

### `pnpm check` output summary

```
pnpm typecheck   — 9/9 packages, exit 0
pnpm lint        — 0 errors, 1 pre-existing warning (packages/i18n/src/routing.ts, ISS-105, not touched here)
pnpm test        — 38 files / 160 passed + 2 expected-fail (162) — was 37/146+2xf; +1 file
                   (repositories-superset.test.ts), +14 tests (13 repository-fake pairs + 1 coverage check)
pnpm i18n:check  — 777 keys, both locales, parity unchanged (no i18n edit — the five notif.* keys
                   already existed, ported by T-006)
pnpm build       — apps/web + apps/worker, both green (37 route rows + Proxy, unchanged)
pnpm smoke       — 7 files / 10 tests, unchanged
pnpm test:int    — 7 files / 27 passed + 2 expected-fail (29), unchanged (database project only)
pnpm --filter @rogikotha/test-support exec vitest run src/seed/seed.int.test.ts
                 — 3/3 green against a freshly reset+migrated rogikotha_test_cr008
```

Seed verified directly against the isolated demo database (`rogikotha_cr008`, `.env`'s
`DATABASE_URL`), from empty storage:
```
pnpm db:reset && pnpm db:migrate && pnpm db:seed   → accounts 44, config 3, directory 63, content 392,
    evidence 63, moderation 42 (was 39 — +3 MOD-2033 report rows), notifications 5 inserted
pnpm db:seed (again)                                → 0 inserted for every step, including notifications
```
Row counts unchanged from T-007's baseline: doctors 6, facility_branches 5, taxonomy_terms 14,
reviews 12, facility_reviews 8, comments 10, evidence_items 7, moderation_cases 5,
account_profiles 80. `.data/storage/public` has 6 item directories with `page-1.png`+`thumb.png`
(from a from-empty storage run — see `ISS-192`). `notifications` has 5 rows, all `shirin_88`, one per
`notification_kind`. `moderation_cases`/`reports`/`moderation_case_reasons` for MOD-2033 are 6/6/6/6/6
as specified; MOD-2011/2029/2038/2041 unchanged at 0/0, 1/1, 1/1, 2/2. `fixtures/photo.jpg` re-read
with a hand-rolled EXIF parser shows tag `0x8825` present. `git status --porcelain` is empty after a
fresh `port` + `fixtures:build`.

### Hard-rule evidence

See the checklist above — every row has a file:line or live-query citation.

### Run record

Claude Code · claude-sonnet-5 · effort high · start `553889b` → end (see commit below)
