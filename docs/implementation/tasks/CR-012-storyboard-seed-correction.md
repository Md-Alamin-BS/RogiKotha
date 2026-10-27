# CR-012 — Storyboard and seed correction (FD-039)

| Field | Value |
|---|---|
| Story | infra / demo data — closes `ISS-158`, `ISS-176` and `ISS-221` as FD-039 decided |
| Phase / Lane | 0 / either |
| Class | M1 (mechanical data and wording correction) |
| Effort setting | medium |
| Estimate | 1–2 h agent; validation 0.5 h |
| Depends on | CR-009 (database imports), CR-008 (merged) |
| Parallel-safe with | anything that does not touch `packages/test-support/src/seed/`, `05-demo-storyboard.md` or the three task files listed under Owned paths |
| Status | queued — FD-039 decided 2026-10-11; unit U6 in the AI-DLC units of work (FD-074) |

## Amendments — Contract Design and Delivery Planning (FD-076..FD-090)

These decisions are binding and override the text below where they differ.

- **FD-089 — about 10 fictional records per module** — This unit also brings the app seed in `packages/test-support/src/seed/` to about 10 synthetic records for each of these collections: doctors, facilities and branches, conditions, reviews, facility reviews, comments, evidence, follow-ups and later care, moderation cases and notifications. The seed follows the expanded prototype data in `ui-design-prototype/shared/rogikotha-data.js` (the prototype is the source of truth, FD-039): the seed adds a record only when the prototype has it. Every field is filled on the new records, but some records keep missing fields so "Not provided" stays demonstrable. Existing records, their ids and every storyboard reference stay unchanged. New Bengali copy is flagged for the owner's bilingual review, as for FD-042 (list the new keys in the hand-off). The new records are synthetic: no real person or facility is named. This unit's estimate and the "Not in scope" line "Any other storyboard step" are read with this addition; no storyboard step changes. Changes: Goal of the unit, Owned paths, a new step 4a, Tests and the acceptance rows.
- **Prerequisite** — The prototype data must already hold the expanded records. If it does not when this unit starts, stop and record it in the hand-off as a blocker; do not invent records in the seed that the prototype lacks.

## Why this exists

FD-039 decided that the code and seed follow the prototype data, and the storyboard text is wrong in
three places. The prototype (`ui-design-prototype/shared/rogikotha-data.js`) is the source of truth
for demo data. T-106, T-401 and T-409 depend on this unit because their acceptance text names the
corrected data.

- `ISS-158`: the storyboard and three task files name review **r4** and the account `anon_author_r4`
  as the anonymous review that proves alias isolation. In the prototype, r4 is `pseudo` (author
  `r_ahmed`). The anonymous reviews are r2, r8 and r12, and the seed creates `anon_author_r2`,
  `anon_author_r8` and `anon_author_r12`.
- `ISS-176`: `05-demo-storyboard.md` step 19 puts MOD-2041 in the **standard** lane. It is
  `critical` in the prototype and in the seed. The standard cases are MOD-2033 and MOD-2029.
- `ISS-221`: the seed pads MOD-2033's three extra reports with its last authored reason,
  `impersonation`, so `impersonation` becomes the majority reason (4 of 6). FD-039 says the three
  extra reports cite `factual`, so the case reads as the factual disagreement its summary describes.

## Read first

1. `docs/status/decision-log.md` FD-039
2. `docs/implementation/ISSUES.md` rows `ISS-158`, `ISS-176`, `ISS-221` (evidence for each)
3. `ui-design-prototype/shared/rogikotha-data.js`: reviews r2, r4, r8 and r12, the authors of those
   reviews, moderation cases MOD-2011, MOD-2029, MOD-2033, MOD-2038 and MOD-2041 (MOD-2033 around
   lines 1429–1433)
4. `packages/test-support/src/seed/seed-moderation.ts` (the padding at lines 84–95) and
   `packages/test-support/src/corpus/corpus.test.ts`

## Owned paths

Modify: `docs/implementation/05-demo-storyboard.md`,
`packages/test-support/src/seed/seed-moderation.ts`, the other files under `packages/test-support/src/seed/` that load the collections above (FD-089), `packages/i18n/messages/{en,bn}.json` (only if a new seeded record needs a key, FD-089), `packages/test-support/src/**/*.test.ts`,
`docs/implementation/tasks/T-106-auth-identity-validation.md`,
`docs/implementation/tasks/T-401-community-module.md`,
`docs/implementation/tasks/T-409-personal-workspace.md` (only the rows that name r4,
`anon_author_r4` or MOD-2041's lane), `docs/implementation/ISSUES.md` (status of the three rows).

## Not in scope

Any change to `packages/database`, `packages/contracts`, the prototype or i18n keys. Any other
storyboard step. Changing which reviews are anonymous: the prototype decides that.

## Steps

1. **Pick the alias-isolation review.** In the prototype, find the anonymous review among r2, r8 and
   r12 whose author also writes public content, which is what storyboard step 7 needs ("public profile
   lists r1 and public comments only; the anonymous review is nowhere"). Confirm that the seed creates
   its `anon_author_rN` account and persona. Record the choice and its evidence in the hand-off.
2. **Storyboard.** In `05-demo-storyboard.md`:
   - Seeded-accounts table (line 15): replace `anon_author_r4` and "author of r4" with the review
     from step 1.
   - Step 7 (line 39): name that review.
   - Step 19 (line 59): MOD-2041 is in the **critical** lane; the standard lane shows MOD-2033 and
     MOD-2029.
3. **Task files.** Replace r4 and `anon_author_r4` with the review and account from step 1 in T-106
   (rows "Alias leakage — profile" and "Alias leakage — search"), T-401 (rows "Mention refusal" and
   "Anonymous linkage") and T-409 (rows "Storyboard 7" and "Appeal"). For the "Appeal" row, check in
   the prototype and the seed which account owns the content MOD-2011 decided, and name that account.
4. **Seed.** In `seed-moderation.ts`, pad MOD-2033's extra reports with `factual` instead of
   repeating the last authored reason, and keep the derivation shared by `moderation_case_reasons` and
   the `reports` rows. Update the comment at lines 84–86 to cite FD-039. Make the padding rule
   explicit for this case only; the other cases are unchanged.
4a. **Expanded demo data (FD-089).** For each collection named in the FD-089 amendment, load the prototype records the prototype now holds, so the seeded count equals the prototype count (about 10). Keep every existing record, id, code and storyboard reference byte-for-byte; add new ids only. New records link to existing doctors, branches, conditions and accounts through real foreign keys. Keep the report and reporter counts of the existing moderation cases as they are; new moderation cases add their own rows. Make the loaders idempotent (`0 inserted` on a second run). List the new Bengali strings in the hand-off for the owner's review.
5. **Tests.** Extend the seed test so that MOD-2033's reason counts are asserted (`factual` 5,
   `impersonation` 1) and MOD-2041's lane is `critical`.
6. **ISSUES.md.** Set `ISS-158`, `ISS-176` and `ISS-221` to fixed by CR-012, with the commit.
7. **`pnpm check`, `pnpm smoke`, hand-off.**

## Acceptance checks

| Check | How | Expected |
|---|---|---|
| MOD-2033 reasons | `pnpm db:reset && pnpm db:migrate && pnpm db:seed`, then query `moderation_case_reasons` and `reports` for MOD-2033 | `factual` **5**, `impersonation` **1**; 6 `reports` rows from 6 distinct reporters; the counts in both tables agree |
| Other cases unchanged | same query for MOD-2011/2029/2038/2041 | report and reporter counts `0/0`, `1/1`, `1/1`, `2/2`; reasons unchanged |
| MOD-2041 lane | query `moderation_cases.lane` for MOD-2041 | `critical`; the storyboard step 19 text says the same |
| Alias-isolation account | the storyboard seeded-accounts table and `pnpm db:seed` | the account the storyboard names exists in the seed, its review is `anonymous`, and its anonymous persona is linked to no public content of that account: a database query shows the persona on the anonymous review only, and none of the account's other public reviews, comments or reactions carry that persona's id. The `/authors/<account>` page check belongs to T-409's own "Storyboard 7" row, not this one |
| No stale names | `grep -rn "anon_author_r4" docs/implementation/05-demo-storyboard.md docs/implementation/tasks/T-106* docs/implementation/tasks/T-401* docs/implementation/tasks/T-409*` | no match |
| Seed idempotent | `pnpm db:seed` again | `0 inserted` for every step |
| FD-089: counts per module | `pnpm db:reset && pnpm db:migrate && pnpm db:seed`, then `count(*)` on doctors, facilities, branches, taxonomy conditions, reviews, facility reviews, comments, evidence items, follow-ups plus later care, moderation cases and notifications | each collection has about 10 rows and exactly as many as the same collection in `ui-design-prototype/shared/rogikotha-data.js`; the test lists the expected count per collection and fails on any difference |
| FD-089: new records are complete, some gaps remain | query the new records of each collection for null columns | every field the prototype fills is filled; at least one new doctor and one new facility keep a missing optional field, and the VM for it renders "Not provided", never 0 |
| FD-089: referential integrity | a database test that left-joins every foreign key of the seeded tables | zero orphans: every review points to an existing doctor and persona, every comment to an existing review, every evidence item to an existing review, every case to an existing target, every follow-up to an existing review |
| FD-089: storyboard unchanged | `pnpm smoke`, then run the storyboard rows that name seeded ids (steps 7, 19 and 26) | every existing id and code exists with the same values as before this change; the MOD-2011/2029/2033/2038/2041 counts in the rows above still hold; no step needs a text change |
| FD-089: synthetic and flagged | read the new records and the hand-off | no real person or facility is named; each new Bengali string is listed in the hand-off for the owner's review |
| Nothing else moved | `pnpm check`, `pnpm smoke`, `pnpm test:int` | all green; i18n parity unchanged; test counts only grow |

## Hard-rule checklist

- [ ] Synthetic data only; no real person or facility named.
- [ ] Counts still come from rows: the six MOD-2033 reports are six real `reports` rows.
- [ ] The reporter stays "restricted" in every staff view.

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
