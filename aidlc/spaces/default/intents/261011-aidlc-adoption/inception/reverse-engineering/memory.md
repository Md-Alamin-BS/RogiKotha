<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-10-12T05:16:48Z — Where ARCHITECTURE-SPINE.md and the code disagree on package layout or stack, the code and decision-log FD-032/FD-033/FD-036 win; the spine's packages/{auth,evidence,search,ui} and its stack table are superseded, so never restructure code to match them. Found by the 2026-10-12 scan; the spine text itself was never updated.

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-10-12T05:16:48Z — The scan's handoff file keeps three small miscounts (admin pages 11 vs 10, contracts test files 9 vs 8, total 45 vs 46); the published knowledge-base files carry the corrected counts. The handoff is never edited after it is written, so the published files are the source of truth for counts.

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-10-12T05:16:48Z — The outbox relay queues both `data.export` and `data.delete` for every `dataRequest.created` event; check this against 03-routes-and-contracts before a delete handler exists (Contract Design / Delivery Planning).
- 2026-10-12T05:16:48Z — ARCHITECTURE-SPINE.md still shows the pre-FD-033 package layout and a stale stack table; Domain Design should reference FD-032/033/036 rather than rewrite the spine.
