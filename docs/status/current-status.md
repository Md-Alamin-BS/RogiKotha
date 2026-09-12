# RogiKotha current status

**As of:** 2026-09-12  
**Phase:** Gate 4 delivered and a direction selected; demo implementation plan approved (FD-031–035); production build not started  
**Overall state:** The Gates 1–3 planning package stands. Gate 4 was executed: five directions were built and compared, and FD-027 (2026-09-06) selected **Concept 04b — Quiet Clinic (minimal pass)** as the implementation direction, with FD-028 narrowing the live gallery to 03, 04 and 04b. On 2026-09-08 directions 03 and 04 were archived in turn (FD-029): `ui-design-prototype/concepts/` now holds Concept 04b alone, and the gallery lists only what is live. Concepts 01, 02, 03, 04, 04c, 04d and 05 all remain inspectable under `ui-design-prototype/.archive/`. The staff console at `ui-design-prototype/admin/` was rebuilt on the same date onto its own surface system, *Chart Tray* (FD-030). Live story coverage is tracked in [`09-coverage-matrix.md`](../planning/09-coverage-matrix.md). The prototype is a static HTML/CSS/JS design artifact — no build step, no framework, no backend — and per [`rogikotha-dev-spec.md`](../design/rogikotha-dev-spec.md) it is the source of truth for the visual system, not a production codebase. No production application code or dependency has been added.

## Completed outcomes

- Gate 1 source inventory, full PRD/BRD semantic extraction, 100 functional + 12 non-functional baseline, conflict resolution, current primary-source research and architecture option comparison.
- Founder decisions FD-001–025 incorporated, including public/synthetic demo boundaries, narrow evidence allowlist, dynamic logged retention, simple email/password, no automated medical-danger classification, equal Bengali/English product status, and five complete light/dark Gate 4 concepts built public-first.
- Ports-and-adapters modular-monolith architecture spine, 13 ADRs, dependency selections and extraction/migration seams.
- Requirement traceability matrix covering all 112 PRD IDs and 24 founder decisions.
- Readable backlog with 12 epics, 34 stories and full story contracts; automation YAML with 104 implementation/validation task records and dependency/parallel groups.
- Current environment/model assignment policy with independent and cross-vendor validation rules.
- Final Gate 3 `DESIGN.md`/`EXPERIENCE.md`, three original concept briefs and representative desktop/mobile wireframes; FD-025 expands Gate 4 implementation and comparison to five concepts.
- Current official-source component research and a self-contained Gate 4 implementation handoff covering five concepts, light/dark modes, public-first sequencing, the admin matrix, safety boundaries and completion evidence.
- Validation strategy, third-party component register, design-comparison scaffold and worktree-safe execution plan.
- Sequential architecture rubric, source-fidelity and divergence/security reviews; clear findings were applied. Automated spine lint passed.
- Three staff-console shell studies — A *Chart Tray*, B *Ink Ledger*, C *Signal Ward* — built and compared on 2026-09-08 (FD-030); A was chosen and ported into `ui-design-prototype/admin/`. All three are kept at `ui-design-prototype/.archive/admin-shell-studies/` as the record of how that decision was made.
- Staff console rebuilt on the Chart Tray surface system: four planes — sunken, page, raised, overlay — where elevation encodes agency, so below the page means read-only, raised means workable, and one solid accent fill is the primary action. Lanes became trays. The five identical unlabelled `<button>` pills became a grouped, iconed, counted top nav (Casework / Oversight) with a breadcrumb and `aria-current`, and a bottom tab bar below 760px. A docked **Record decision** commit button was added — the console previously offered ten option buttons, a textarea and no way to submit anything.
- Measured against the pass it replaces: the page-to-tray surface step went from 1.042:1 to 1.098:1 in light and from 1.055:1 to 1.179:1 in dark; air across a lane boundary went from 1.58:1 to 6.5:1 against the gap between rows; selection is now stronger than hover rather than weaker; badge and button are separated by fill band, height (20px against 34px) and radius (4px against 9px), ending the inversion in which the read-only `.count` rendered heavier than the interactive `.opt`; meta text inside a well went from 3.64:1, below AA, to 4.92:1.

## Demo implementation plan (2026-09-10)

The founder approved building a locally runnable, finished-product-quality demo on the real stack (FD-031–FD-035). The complete instruction set — master plan with 46 tasks, estimates and model routing, conventions, data model, routes/command catalogue, auth screen spec with EN/BN copy, demo storyboard, and one spec file per task — lives in [`docs/implementation/`](../implementation/README.md). Estimated effort: 179–243 implementation agent-hours plus ≈ 30 % independent validation; 3–4 calendar weeks with two lanes. The auth screens (previously undesigned — STORY-AUTH-001/002 were Missing) are specified in [`docs/design/auth-screens-spec.md`](../design/auth-screens-spec.md) and get a prototype pass (task D-001) before implementation. Nothing under `apps/` or `packages/` exists yet; task T-001 creates the workspace. On 2026-09-12 the founder narrowed Phase 1 evidence to JPEG/PNG images (FD-036, CR-001); PDF and later formats are planned in [`07-phase-2-document-evidence.md`](../implementation/07-phase-2-document-evidence.md). The build now runs under the handoff/issue/validation protocol in [`04-handoff-and-validation.md`](../implementation/04-handoff-and-validation.md): every session starts from `NEXT.md` and ends by writing a handoff, issues and the build log; every task is independently validated through gates G1–G5. The whole build can be driven with one repeated prompt via [`LOOP.md`](../implementation/LOOP.md). Revised effort: ≈ 245–335 agent-hours, 4–5 calendar weeks with two lanes.

## Binding planning artifacts

- [Recommended architecture](../planning/05-recommended-architecture.md) and [architecture spine](../architecture/ARCHITECTURE-SPINE.md)
- [Dependency selections](../architecture/DEPENDENCY-SELECTIONS.md) and [ADRs](../architecture/decisions/)
- [Requirement traceability](../planning/06-requirement-traceability-matrix.md)
- [Agent/model assignment](../planning/07-agent-model-assignment.md)
- [Product backlog](../planning/08-product-backlog.md) and [automation YAML](../planning/backlog.yaml)
- [Frontend prototype brief](../planning/09-frontend-prototype-plan.md), [visual contract](../planning/ux/DESIGN.md) and [experience contract](../planning/ux/EXPERIENCE.md)
- [Gate 4 dummy UI execution prompt](../handoffs/GATE4_DUMMY_UI_AGENT_PROMPT.md) and [component-source research](../planning/research/technical-ui-component-sources-2026-08-30/research.md)
- [Validation strategy](../planning/10-validation-strategy.md) and [worktree-safe execution](../planning/11-worktree-safe-execution-plan.md)

## Validation status

- Architecture spine lint: pass, zero findings.
- Trace inventory: 112 unique IDs (100 FR, 12 NFR).
- Story consistency: all 33 trace-referenced stories exist in Markdown/YAML; one additional required design-concept story exists in both.
- Task consistency: 104 unique task definitions; all 104 story references resolve.
- Local Markdown links: pass across `docs`, zero broken targets.
- Legacy project/language-positioning scan: clean after founder correction.
- YAML semantic parser: pass with a one-off standards-compliant `js-yaml` parse; structural/reference checks also passed.
- Staff-console behaviour (2026-09-08): a jsdom harness boots the redesigned console and passes 33 of 33 checks.
- Staff-console contrast (2026-09-08): a contrast pass over `ui-design-prototype/admin/styles.css` clears every text pair and every surface step in both themes.
- Link resolution after the 03/04 archive moves: the gallery, `gallery.css` and `README.md` carry no reference to an archived concept directory.
- The committed checks under `tools/` — `npm run check` — still read Concept 04b only. The console harness and the console contrast pass were run separately against `ui-design-prototype/admin/` and are not yet part of that run.

**Not verified.** Nothing about the redesigned staff console has been seen rendering. No screenshots were taken of the ported console, and the bottom tab bar below 760px has not been observed in a browser. jsdom does not lay out or paint, so the 33 checks prove DOM and behaviour, not visual result; the contrast figures are computed from the tokens as they ship, not sampled from pixels.

## Not started

- No Next.js workspace, dependency lockfile, database schema, service, UI route, synthetic fixture implementation, container topology or deployment.
- No comparison screenshots under `docs/design/screenshots/`, no directly-selectable demo state matrix, and no per-concept admin consoles — Gate 4 brief deliverables that the FD-027/FD-028 selection concluded without.
- No real authentication, production backend, evidence storage/processing, moderation service or analytics.
- No Gate 4 validation record: `validation-log.md` still ends at V-027 (2026-08-30), so the Gate 4 matrix required by `10-validation-strategy.md` has not been run or recorded.

## Next executable gate

Gate 4 is closed by FD-027/FD-028. Three things gate what follows:

1. **Record or waive the Gate 4 validation matrix.** `10-validation-strategy.md:72` says a concept with a critical accessibility, privacy, synthetic-data or trust-language issue cannot be selected until fixed — 04b was selected without that matrix being run.
2. **Reconcile the prototype architecture.** `09-frontend-prototype-plan.md` specifies `apps/web/design-lab/` with `packages/contracts/` and `packages/ui/`; what was built is the standalone `ui-design-prototype/` tree. ADR-0010 and ARCHITECTURE-SPINE AD-11 assume the former.
3. **See the console.** The Chart Tray port is verified by harness and by arithmetic, not by eye. A browser pass — light and dark, both locales, and the sub-760px tab bar — is owed before the console counts as delivered.

A fourth item needs a product call rather than a gate: with 03 and 04 archived, a first-time reader of the live gallery no longer sees three side-by-side directions, which is what STORY-PROT-002 asks for. The requirement was met historically and the directions remain in `.archive/`; whether the story stays Partial is a decision, not a build task.

Production backend work remains separately gated.

## Worktree note

The pre-existing changes to `AGENTS.md` and `README.md` and the deletion of `install.log` were preserved and have since been committed with the planning package. The prototype is committed through `1dc17be` (2026-09-07). The 2026-09-08 work — the 03/04 archive moves, the Chart Tray console, the shell studies and the `tools/` checks — is still uncommitted; it is grouped for commit in [`pending-changes-inventory.md`](pending-changes-inventory.md), whose groups A–F are now closed against the commits that took them.
