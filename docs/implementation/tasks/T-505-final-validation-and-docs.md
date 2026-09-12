# T-505 — Final validation matrix and documentation close-out

| Field | Value |
|---|---|
| Story | STORY-PROT-003 (evidence record), STORY-FOUND-001 (DoD: decisions linked, diff inspected), all stories' coverage rows |
| Phase / Lane | 5 / — (single cross-vendor review session, then a docs session) |
| Class → model | M4 → GPT-5.6 Sol if Claude models implemented the majority of M3 tasks, else Claude Opus 5; optional Fable 5.1 second read of the security findings only; validator: **the founder** (this task *is* the validation; its own record is checked by the human) |
| Effort setting | Sol `high` / Opus `xhigh` |
| Estimate | 3–4 h agent; founder review 1.5 h |
| Depends on | T-504 (walk-through ticked), T-503 (suite green), T-502, every `docs/validation/T-xxx.md` present with PASS or PASS+F |
| Parallel-safe with | nothing — it reviews the merged `build/demo` branch as a whole |

## Goal

Produce the evidence that the local demo is what the plan says it is: run the production capability
gates that apply to a local demo, state explicitly which gate items are demonstrated and which are
deferred, regenerate the story coverage matrix against the product code, and bring every status
document in `docs/status/`, the root `README.md`, `PRODUCT.md` and `DESIGN.md` into line with
reality. The reviewer works page by page against the **running** app with the hard-rule checklist,
not from the implementers' summaries (AD-16).

## Read first

1. `docs/implementation/00-master-plan.md` (all), `01-conventions.md` §13, §14
2. `docs/planning/10-validation-strategy.md` — "Verdict contract", "Production capability gates", "Release stop conditions", "Evidence locations"
3. `docs/planning/09-coverage-matrix.md` (current rows, proof convention) and `tools/coverage.mjs`, `tools/proof-check.mjs`, `tools/README.md`
4. `docs/status/current-status.md`, `docs/status/validation-log.md` (ends at V-027), `docs/status/decision-log.md` (FD-031…035), `docs/status/risk-register.md`, `docs/status/dependency-check-log.md`
5. `docs/implementation/06-change-requests.md` (every row; any that took a founder decision needs an FD)
6. `docs/implementation/tasks/T-504-walkthrough-record.md` and every `docs/validation/T-*.md`
7. `docs/security/local-demo-threat-notes.md` (T-502)
8. `PRODUCT.md` "Technical context", `DESIGN.md` (its technical paragraph), `README.md` (root), `docs/scope-of-work.md` "Source of truth" list
9. `AGENTS.md` (attribution rule — this task edits many docs)

## Owned paths

Create:
- `docs/validation/DEMO-GATES.md` (the gate matrix: item | demonstrated in demo (evidence) | deferred to production (why) | stop condition hit? )
- `docs/validation/DEMO-REVIEW-CHECKLIST.md` (page-by-page hard-rule checklist against the running app — see step 4)
- `docs/validation/T-505.md` (this task's own record, verdict on the branch)

Modify:
- `tools/coverage.mjs` — extend the grep roots from `ui-design-prototype/` to also `apps/` and `packages/` for `// STORY-XYZ:` and `<!-- STORY-XYZ: -->` markers (see step 3 for exactly how)
- `tools/proof-check.mjs` — accept anchors in `.ts`/`.tsx`/`.sql` files (path filter only)
- `tools/README.md` — document the new roots
- `docs/planning/09-coverage-matrix.md` — regenerated rollup + hand-edited proof anchors pointing at product code; keep the prototype proofs as a second citation where the prototype remains the visual source
- `docs/status/validation-log.md` — append V-028 … V-0nn (one per phase gate plus DEMO-GATES)
- `docs/status/current-status.md` — rewrite "As of / Phase / Overall state", "Completed outcomes" (add the build), "Validation status", "Not started", "Next executable gate"
- `docs/status/decision-log.md` — add any FD taken during the build (from CRs), and the "As of" date
- `docs/status/risk-register.md` — residual risks from T-502 threat notes, T-503 fixmes, T-504 findings
- `docs/status/dependency-check-log.md` — a close-out entry listing the versions actually installed (from `pnpm-lock.yaml`) vs the plan pins
- `PRODUCT.md` "Technical context" (5 bullets: workspace exists, no longer static; what runs where), `DESIGN.md` technical paragraph, root `README.md` (replace the docx-era contents with: what it is, run the demo → `DEMO.md`, repo map, docs entry points, licence note unchanged)
- `docs/scope-of-work.md` "Source of truth" — add `docs/implementation/` and `docs/validation/`
- `docs/implementation/README.md` §5 tracker — final statuses

## Not in scope

Fixing code. Every defect found is a finding in `docs/validation/T-505.md` with severity; critical/high
findings make the verdict FAIL and go back to the owning task as a CR. Production release gates
(legal, clinical, restore drill, real-user analytics) — listed as deferred, not attempted.

## Steps

1. **Preconditions.** `git switch build/demo`; `pnpm install --frozen-lockfile`; `pnpm check`; `pnpm demo` (fresh reset); `pnpm e2e` — all green or stop and FAIL. List every task in the tracker and confirm a validation record exists with PASS or PASS+F; any `FAIL` or missing record → stop.
2. **Gate matrix** (`DEMO-GATES.md`). Take each bullet of the five "Production capability gates" and the eight "Architecture acceptance gates" in `docs/planning/05-recommended-architecture.md` and classify:
   - *Demonstrated locally* — cite the test file / validation record / storyboard step (e.g. "enumeration: `T-106.md` §adversarial cases 1–3"; "five-reporter auto-hide resistance to duplicate accounts: `discussion.spec.ts` P4.16 + `moderation` unit table").
   - *Deferred to production* — with the reason (e.g. "full backup restore within RPO: no production topology exists"; "malicious corpus beyond EICAR/encrypted/mismatch: legally safe corpus not yet assembled"; "counsel/healthcare scenario review: specialist gate").
   - Then the "Release stop conditions" list: for each, state "not hit — evidence" or "hit — finding id". A local demo may ship with deferred items; it may **not** ship with a hit stop condition.
3. **Coverage regeneration.** In `tools/coverage.mjs` add `ROOTS = ['ui-design-prototype', 'apps', 'packages']` and extend the file filter to `.js,.mjs,.html,.css,.ts,.tsx,.sql`; keep the marker regexes (`STORY-[A-Z]+-\d{3}`, `NFR-\d{3}`, `FR-[A-Z]+-\d{3}`); output per story the set of files per root so the matrix can cite product code first. Run it; for each of the 36 rows write the new proof in the `file:line anchor` convention pointing at product code (a `// STORY-XYZ:` comment placed by the implementing task; where an implementer omitted the marker, add it in the owning file with a one-line comment — this is the one code edit allowed, and it must be listed in the hand-off). Statuses: `Done` only when the acceptance in `08-product-backlog.md` is met in the running app; `Partial` with the missing criterion named; the production-only halves of OPS-001/OPS-002 stay `Missing` with "deferred to production" in Notes. Run `node tools/proof-check.mjs`; zero broken citations.
4. **Page-by-page review** (`DEMO-REVIEW-CHECKLIST.md`). A table with one row per URL in `03-routes-and-contracts.md` §1 × locale (`en`, `bn`) and the hard rules that apply on that page (from `01-conventions.md` §14), each cell `✓ (evidence)` / `✗ (finding id)` / `n/a`. Fill it by opening every page in the running app — not from screenshots. Include the four negative probes: `/api/evidence/items/<id>/original` as a signed-out user and as a moderator without the capability (403 both), a hidden experience by direct URL (404), a search for a hidden review's title (absent), an anonymous review's alias in `/authors/<real username>` (absent).
5. **Validation log.** Append entries V-028 (Phase 0 gate: `pnpm check` from clean clone), V-029 (Phase 1: T-106 record), V-030 (Phase 2: search corpus bands from T-205's record), V-031 (Phase 3: evidence fail-closed and original isolation), V-032 (Phase 4: five-account hide, appeals segregation, config rollback), V-033 (T-503 matrix: engines × viewports × locales, axe result), V-034 (T-504 clean-clone timing and walk-through), V-035 (DEMO-GATES verdict). Each entry follows the verdict contract: ids, commit range, environment (Node/pnpm/Docker/OS versions), commands with exit codes, expected/observed, reviewer session (model id allowed here only), limitations, verdict.
6. **Status docs.** `current-status.md`: phase becomes "Local demo delivered on `build/demo` (date); production not started"; move the "Not started" items that now exist; keep the honest "Not verified" style — list what is still only jsdom/arithmetic (nothing, after T-503) and what is manual-only (real iOS Safari, screen reader). `decision-log.md`: FD-036+ for any CR that changed a rule; update the header date. `risk-register.md`: add rows from T-502 residuals, T-503 `fixme`s, T-504 Windows notes, Drizzle 1.0 migration, Better Auth advisory recheck, TS 7 toolchain. `dependency-check-log.md`: close-out entry.
7. **Product docs.** `PRODUCT.md` "Technical context" and `DESIGN.md`'s technical paragraph: replace "static HTML/CSS prototype is the current state" with the workspace facts; keep the prototype as the visual source of truth statement (FD-032). Root `README.md`: rewrite (the current file still describes a docx-only repo); include the repo map from master plan §4, the two entry points (`DEMO.md`, `docs/implementation/README.md`), and the documentation list; keep the licence paragraph.
8. **Founder-facing summary** at the top of `docs/validation/T-505.md`: ten lines — verdict, what is demonstrated, what is deferred, the three biggest residual risks, and what the next gate is (production topology, specialist reviews).
9. `pnpm check`; `node tools/coverage.mjs`; `node tools/proof-check.mjs`; the docs link check used at Gate 2 (`docs/status/validation-log.md` V-0xx names the script; rerun it) — zero broken links.
10. Commit as `T-505: validation matrix, coverage regeneration, status close-out` — no attribution.

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Branch green | `pnpm check && pnpm e2e` on `build/demo` | green |
| Gate matrix complete | open `docs/validation/DEMO-GATES.md` | every bullet of both gate lists classified; every stop condition addressed; no stop condition hit |
| Coverage regenerated | `node tools/coverage.mjs` | rollup printed; product-code proofs for every `Done`/`Partial` row |
| Proofs resolve | `node tools/proof-check.mjs` | exit 0 |
| Page review filled | `docs/validation/DEMO-REVIEW-CHECKLIST.md` | all URL × locale rows filled; four negative probes recorded |
| Validation log | `grep -c "^### V-0" docs/status/validation-log.md` | ≥ 35 entries; each has a verdict line |
| Status coherent | read `current-status.md`, `decision-log.md`, `risk-register.md` | dates and phase agree; every CR with a rule change has an FD |
| README rewritten | `README.md` | mentions `DEMO.md`, the repo map, no docx-only wording |
| Links | the Gate 2 markdown link check | zero broken |
| No attribution | `git log build/demo --format='%an %ae %b' \| grep -iE "claude\|codex\|gpt\|co-authored"`; `grep -riE "co-authored-by\|generated with" docs README.md DEMO.md` | no hits (model ids appear only inside `docs/validation/*.md` records) |
| Verdict | `docs/validation/T-505.md` | PASS or PASS WITH FOLLOW-UP with owners; FAIL blocks the demo from being called delivered |

## Tests to write

- `tools/__tests__/coverage-roots.test.mjs` — a fixture tree with a marker in `apps/x.tsx` and one in `ui-design-prototype/y.js` is reported under both roots.
- `tools/__tests__/proof-check-ts.test.mjs` — an anchor in a `.tsx` file resolves; a drifted line is repaired by `--fix`.

## Threat notes

Not an implementation task; the reviewer re-reads `docs/security/local-demo-threat-notes.md` and
records in `T-505.md` whether each control's test exists and passed on `build/demo`.

## Hard-rule checklist

Applied page by page in `DEMO-REVIEW-CHECKLIST.md`; the summary here must be consistent with it:

- [ ] No number stands for quality; denominators everywhere; no combined score in schema or code (`grep -rn "score\|rating" packages apps` reviewed).
- [ ] "Not provided" / "No documents", never `0`.
- [ ] "Limited data" at the configured threshold.
- [ ] "Registration not verified" on every doctor page.
- [ ] "Documents attached — not medically validated".
- [ ] "Reviewer's label".
- [ ] Facility feedback never in doctor aggregates (test cited).
- [ ] Reporter identity restricted everywhere; reveal audited.
- [ ] Original evidence isolated; scanner fail-closed (test cited).
- [ ] Disclaimer and emergency guidance on every applicable page.
- [ ] Neutral ordering; no "highest rated".
- [ ] Bengali and English parity; numerals; no cap-transform.
- [ ] Synthetic marker cannot be disabled in demo mode; no real person in a negative account.
- [ ] No agent/tool attribution anywhere (grep evidence above).

## Hand-off (implementer fills in)

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
