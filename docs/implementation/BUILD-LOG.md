# Build log

Append-only. One line per event: `YYYY-MM-DD HH:MM · lane · task · event · commit/branch · note`.
Events: `started`, `finished (done|partial)`, `validation started`, `validated PASS|PASS+F|FAIL`, `merged`, `blocked`, `unblocked`, `CR logged`.

- 2026-09-10 — · plan · demo implementation plan written (FD-031–035) · — · `docs/implementation/`
- 2026-09-12 — · plan · CR-001 applied: images-only evidence (FD-036); handoff/validation protocol added · — · `04-handoff-and-validation.md`, `07-phase-2-document-evidence.md`
- 2026-09-13 00:00 · lane B · D-001 · started · task/d-001-auth-screens-prototype · Claude Code · claude-sonnet-5 · effort high
- 2026-09-13 01:15 · loop · implement T-001, D-001 · session started · Claude Code · claude-opus-5[1m] · effort high
- 2026-09-13 02:30 · lane B · D-001 · finished (done) · a75d7f4 · patient auth screens (04b) + staff console auth (Chart Tray), static simulation; npm run check green, 96/96 smoke
- 2026-09-13 02:38 · loop · implement T-001, D-001 · turn closed; both finished (done), queued for validation · `15ac96c`, `5f215bf` · per-task started/finished lines ride on the task branches
- 2026-09-13 02:49 · lane B · D-001 · validation started · task/d-001-auth-screens-prototype (rebased onto build/demo `af2b7f8`, register-file conflict only) · Claude Code · claude-sonnet-5 · effort xhigh
- 2026-09-13 10:56 · lane B · D-001 · validated PASS · `04d06d3` · all acceptance rows pass (staff device revoke/re-approval and step-up flows verified live in-browser), `npm run check` + detector + smoke green, diff review clean; founder walkthrough still recommended before T-102/T-103 (not a merge blocker); `docs/validation/D-001.md`
