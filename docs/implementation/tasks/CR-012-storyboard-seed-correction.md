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
`packages/test-support/src/seed/seed-moderation.ts`, `packages/test-support/src/**/*.test.ts`,
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
