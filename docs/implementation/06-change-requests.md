# Change requests during the build

Small changes the founder asks for while the build is running. One row each. A change that alters a
hard rule, a data boundary or a founder decision needs a new FD in `docs/status/decision-log.md`
first; put its ID in the last column.

Size: **S** ≤ 1 h agent time inside an open task · **M** 1–4 h, gets its own mini task file
`tasks/CR-nnn-*.md` · **L** > 4 h, replan.

| CR | Date | Requested change (verbatim if short) | Absorbed by task / new CR task | Size | Status | FD |
|---|---|---|---|---|---|---|
| CR-001 | 2026-09-12 | "initially I just want the user able to upload image files, nothing else" — PDF and every other document type out of the demo; plan them as a next phase | T-002, T-007, T-303, T-304, T-305, T-306, T-308, T-503, T-504 (scope-change blocks); new `07-phase-2-document-evidence.md` | M | applied to the plan | FD-036 |
