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

- [ ] No number stands for quality; counts still come from rows (the six MOD-2033 reports are six real
      `reports` rows, not a stored number).
- [ ] Reporter identity never reaches the reported person — the three extra reporters come from the
      `reporter_1..6` pool, still disjoint from every authoring account.
- [ ] Audit/notification details stay allowlisted: notification `params` carry ids and enums only,
      never free text, an email, a filename or a review body.
- [ ] Bengali and English both work — every seeded `message_key` exists in both files; parity stays at
      777 keys (this task adds none).
- [ ] Synthetic marker still visible in every regenerated fixture.
- [ ] No agent/tool attribution in any file or commit.

## Hand-off (implementer fills in)
