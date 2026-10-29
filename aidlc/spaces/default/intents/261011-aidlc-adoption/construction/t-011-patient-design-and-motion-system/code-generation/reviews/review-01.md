## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-10-29T14:16:46Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | apps/web/src/styles/motion.css > press rule (lines 285-349) and list reveal rules (lines 207-231) | When a pressable element (for example `.browse-card` or a `[data-press]` row) is a direct child of a `Reveal` list, the reveal rule wins on specificity (0,5,0 against 0,2,0). Its press squeeze then runs over `--dur-base` (240 ms) after the item's stagger delay, which is up to 200 ms for the 6th item, instead of over `--dur-instant` with no delay. On later items the feedback arrives late or not at all, and the release is delayed the same way. This goes against BR6.5 (press over `--dur-instant`) and BR4.6 (motion never delays input). The comment at lines 286-288 shows this was chosen on purpose, but neither the design nor `Reveal` mentions the side effect. | Pick one: (a) give pressable reveal-list children a press transition at `--dur-instant` with no delay once entry has finished, or (b) state in `Reveal.tsx` and frontend-components.md § 5.2 that a `Reveal` child wraps its pressable and is never a pressable itself, so page Units T-202, T-203 and T-207 follow it. Add a test for whichever you choose. | New |
| R-02 | Minor | apps/web/src/styles/patient.css > `.tabs` (lines 439-457); docs/implementation/ISSUES.md > ISS-318 | On phones the tab strip scrolls sideways inside the masthead, with a hidden scrollbar and an end fade. BR3.5 says the masthead "wraps instead of scrolling" and "never hide a control". ISS-318 records this as an agent decision (S4), but it is not in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md, so the owner has not seen that the approved design changed. | Add ISS-318 to the owner review queue with both options (wrap and accept a taller header, or keep the scrolling strip) and a suggestion. If the owner keeps the scroll, amend BR3.5 to match. | New |
| R-03 | Minor | apps/web/src/styles/patient.css > page-body rules (170 literal `font-size` values, for example line 1066 `12.5px` and line 1134 `16.5px`) | BR2.1 says a hard-coded font size outside the FD-091 scale is a defect. Page bodies are out of this Unit's scope, but ISS-313 records only the literal spacing that remains, not the literal font sizes. So the page Units have no record telling them to move their type to the scale tokens. | Widen ISS-313, or add an S4 row, so it covers literal font sizes in page-body rules, and have each page Unit replace them with the `--fs-*` / `:lang(bn)` scale tokens. | New |
| R-04 | Minor | apps/web/e2e/smoke/motion.spec.ts > "with motion switched off in the app" (line 181) | The in-app switch is tested only with the `rk.motion=off` cookie set before the page loads. No test clicks `#motion` during a session and then checks that `<html data-motion="reduced">` appears and the next tab click swaps at once. That runtime path (server action, then a refresh that re-renders the `[locale]` layout's `<html>` attributes) is the one BR5.2 adds, and it is unproved. | Add one Playwright case: load with motion on, click `#motion`, wait for `html[data-motion="reduced"]`, click a tab, and assert that no page animation runs. | New |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `node scripts/css-motion-check.mjs` (spot run) | PASS: "2 stylesheet(s) pass the motion rules (M1-M11)" | No motion declarations in patient.css, no `:hover` transform, only transform/opacity animate, every movement is behind both guards, no motion rule selects a static element, one dark token block. This confirms BR4.x, BR5.3, BR6.5, BR7.4, BR1.8 and BR2.2. |
| Identity scan of the diff (audit shards excluded) and of the commit author/committer/trailers | PASS | All three commits are `Md. Al-Amin` with no trailers. No tool or model name appears in the added lines. |
| Boundary scan | PASS | The motion tests import only the local `motion-test-support.ts`, not `packages/test-support`. No `packages/` file changed, so no i18n key was added (BR9.3). The components contain no hard-coded user-facing strings. |
| Gate (established by the orchestrator, not rerun) | `pnpm check` 11 steps green, `pnpm smoke` 26 green, impeccable clean, `smoke:e2e` 12/12 | Accepted as given. |

### Summary

The code matches the design. Every movement in motion.css sits behind both the OS guard and the in-app `:root:not([data-motion="reduced"])` guard, with reduced token values as a second line of defence. View-transition pseudo-elements are named explicitly for reduced mode. The demo marker, disclaimer and emergency guidance carry `animation/transition: none !important`, are left out of the press squeeze, and paint as non-animated groups above the moving page. Hover transforms are gone. The focus ring is 3 px with a 2 px offset and is never removed. Controls use 44 px targets, and the font loads on `bn` only without preload. Staff files are untouched, and ThemeControls is covered by § 11 and ISS-319. The four findings are Minor: a delayed press squeeze on pressable reveal-list children, a masthead departure that is not in the owner queue, literal page-body font sizes with no record, and an untested runtime toggle of the in-app switch.
