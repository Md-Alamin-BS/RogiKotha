# Handoff — T-xxx <title>

| Field | Value |
|---|---|
| State | done / partial / blocked |
| Branch · commit | `task/t-xxx-…` · `<sha>` |
| Lane | A / B |
| Session length | ≈ h (estimate was x–y h) |
| Validation | pending → `docs/validation/T-xxx.md` |

## What exists now (3–8 lines)
What a reader can run or open after this task. Name the commands, routes, tables, components.

## How I verified it
Commands run with results (≤ 20 lines). The smoke assertion(s) I added (file names).

## Fragile or surprising
Things the next agent will trip over: gotchas in libraries, Windows-specific behaviour, order-dependent setup, anything that "works but I am not sure why". One bullet each; link `ISS-` rows.

## Assumptions and open questions
Each `// ASSUMPTION(T-xxx):` marker with its `ISS-` row. Questions the human must answer, with the two options and which one I took.

## If you continue this task (partial only)
The exact next step, the file to open first, and the test that should go green next.

## Issues logged
`ISS-nnn` (severity) — title … one line each.

## Next task for this lane
Which task (from the master plan order) and the first three things that agent should do. If nothing is unblocked, say what is blocking and who unblocks it.
