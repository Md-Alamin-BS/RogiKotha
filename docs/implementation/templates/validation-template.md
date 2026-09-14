# Validation — T-xxx <title>

| Field | Value |
|---|---|
| Story | STORY-… |
| Commit range | `build/demo..<sha>` |
| Date | |
| Validator | `<model id>` at effort `<setting>` — validation evidence only, never attribution |
| Implementer model class | M? (from the task file) |

## Gates
| Gate | Command / method | Exit / result |
|---|---|---|
| G1 self-check (re-run) | `pnpm check` | |
| G2 acceptance | see table below | |
| G3 regression smoke | `pnpm smoke` (+ `pnpm e2e:smoke` after T-503) | |
| G4 review | diff read; adversarial tests (M3) | |

## Acceptance table
| Check | Expected | Observed | Pass/fail |
|---|---|---|---|

## Adversarial tests (M3 tasks)
| Test | File | Result |
|---|---|---|

## Findings
| ISS | Severity | file:line | What | Why it matters | Suggested fix |
|---|---|---|---|---|---|

## Hard-rule evidence checked
Which ticked items in the task file I verified and how.

## Verdict
**PASS | PASS WITH FOLLOW-UP | FAIL**
Follow-ups (owner task, due gate) or the `ISS-` rows that must be fixed before re-validation.

## Residual risk / decisions for the human
