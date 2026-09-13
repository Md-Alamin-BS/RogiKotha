# Change requests during the build

Small changes the founder asks for while the build is running. One row each. A change that alters a
hard rule, a data boundary or a founder decision needs a new FD in `docs/status/decision-log.md`
first; put its ID in the last column.

Size: **S** ≤ 1 h agent time inside an open task · **M** 1–4 h, gets its own mini task file
`tasks/CR-nnn-*.md` · **L** > 4 h, replan.

| CR | Date | Requested change (verbatim if short) | Absorbed by task / new CR task | Size | Status | FD |
|---|---|---|---|---|---|---|
| CR-001 | 2026-09-12 | "initially I just want the user able to upload image files, nothing else" — PDF and every other document type out of the demo; plan them as a next phase | T-002, T-007, T-303, T-304, T-305, T-306, T-308, T-503, T-504 (scope-change blocks); new `07-phase-2-document-evidence.md` | M | applied to the plan | FD-036 |
| CR-002 | 2026-09-13 | "fix these if you can... if its small and easily can be fixable then fix it within current scope" — founder authorized fixing `ISS-077`/`ISS-078` (both found by a second, independent T-003 validation after T-003 had already merged) directly instead of only logging them; also authorized the standing policy this CR documents | `packages/contracts/src/ids.ts` (`newPublicId()` entropy fix + regression test), `docs/implementation/03-routes-and-contracts.md` §2 + `packages/contracts/src/errors.ts` (`auth.account_suspended` added), `packages/i18n/scripts/check-parity.mjs` (new reverse keys→codes check), `pnpm-workspace.yaml` (`ISS-055` fixed opportunistically — real `allowBuilds` block, ends the recurring `ERR_PNPM_IGNORED_BUILDS` friction), plus record corrections (`ISS-082`, `ISS-083`) and the new `04-handoff-and-validation.md` §4.1 / `LOOP.md` policy for this class of finding | S | applied — see `docs/implementation/handoffs/CR-002.md` | — |
