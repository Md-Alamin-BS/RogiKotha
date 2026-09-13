# Build log

Append-only. One line per event: `YYYY-MM-DD HH:MM · lane · task · event · commit/branch · note`.
Events: `started`, `finished (done|partial)`, `validation started`, `validated PASS|PASS+F|FAIL`, `merged`, `blocked`, `unblocked`, `CR logged`.

- 2026-09-10 — · plan · demo implementation plan written (FD-031–035) · — · `docs/implementation/`
- 2026-09-12 — · plan · CR-001 applied: images-only evidence (FD-036); handoff/validation protocol added · — · `04-handoff-and-validation.md`, `07-phase-2-document-evidence.md`
- 2026-09-13 00:00 · lane B · D-001 · started · task/d-001-auth-screens-prototype · Claude Code · claude-sonnet-5 · effort high
- 2026-09-13 01:15 · loop · implement T-001, D-001 · session started · Claude Code · claude-opus-5[1m] · effort high
- 2026-09-13 01:23 · lane A · T-001 · started · task/t-001-workspace-scaffold · Claude Code · claude-sonnet-5 · effort high
- 2026-09-13 01:45 · lane A · T-001 · finished (done) · 2f35801 · pnpm workspace scaffold (TS 6.0.3, ESLint 10.10.0, Vitest 4.1.11); vitest.workspace.ts reworked around Vitest 4's removed workspace auto-discovery (ISS-004)
- 2026-09-13 02:30 · lane B · D-001 · finished (done) · a75d7f4 · patient auth screens (04b) + staff console auth (Chart Tray), static simulation; npm run check green, 96/96 smoke
- 2026-09-13 02:38 · loop · implement T-001, D-001 · turn closed; both finished (done), queued for validation · `15ac96c`, `5f215bf` · per-task started/finished lines ride on the task branches
- 2026-09-13 02:43 · loop · validate T-001, D-001 · session started · Claude Code · claude-sonnet-5 · effort xhigh
- 2026-09-13 02:49 · lane A · T-001 · validation started · task/t-001-workspace-scaffold (rebased onto build/demo `af2b7f8`, register-file conflict only) · Claude Code · claude-sonnet-5 · effort xhigh
- 2026-09-13 02:49 · lane B · D-001 · validation started · task/d-001-auth-screens-prototype (rebased onto build/demo `af2b7f8`, register-file conflict only) · Claude Code · claude-sonnet-5 · effort xhigh
- 2026-09-13 02:53 · lane A · T-001 · validated PASS · `ae266f8` · all acceptance rows pass, `pnpm smoke` green, diff review clean; `docs/validation/T-001.md`
- 2026-09-13 10:56 · lane B · D-001 · validated PASS · `04d06d3` · all acceptance rows pass (staff device revoke/re-approval and step-up flows verified live in-browser), `npm run check` + detector + smoke green, diff review clean; founder walkthrough still recommended before T-102/T-103 (not a merge blocker); `docs/validation/D-001.md`
- 2026-09-13 11:00 · lane A · T-001 · merged · `d5f37f5` · `pnpm check` on `build/demo` stops at `i18n:check` exactly as documented (typecheck/lint/test green); `pnpm tools:check` 83/83
- 2026-09-13 11:03 · lane B · D-001 · merged · `a38f363` · `pnpm check` on `build/demo` unaffected (still stops at `i18n:check` as before); `pnpm tools:check` 96/96 (patient + admin auth journeys included); detector 2 pre-existing findings only (`ISS-027`)
- 2026-09-13 12:22 · loop · implement T-002, T-006 · session started · Claude Code · claude-sonnet-5 · effort high
- 2026-09-13 13:09 · lane A · T-002 · started · task/t-002-local-infra · Claude Code · claude-sonnet-5 · effort medium
- 2026-09-13 13:09 · lane B · T-006 · started · task/t-006-i18n · Claude Code · claude-sonnet-5 · effort medium
- 2026-09-13 13:09 · lane A · T-002 · finished (done) · `fb6daae` · local compose for postgres 18, mailpit, clamav 1.5.4 (custom test signature); 3 `// ASSUMPTION(T-002)` deviations from the task's literal compose text (postgres volume path, mailpit tag, clamav bind-mount mode), all live-verified against Docker Desktop; ISS-039..044
- 2026-09-13 13:09 · lane B · T-006 · finished (done) · `4056fd8` · 764-key bilingual dictionary ported from the prototype + auth spec + addendum, parity check, formatters, next-intl config; `pnpm check` now green end-to-end; ISS-045..056 (renumbered from ISS-039..050 by this session to resolve a collision with T-002's range)
- 2026-09-13 13:09 · loop · implement T-002, T-006 · turn closed; both finished (done), queued for validation · `fb6daae`, `4056fd8` · per-task started/finished lines ride on the task branches
- 2026-09-13 13:29 · lane B · T-006 · validated PASS · `5fad97d` · 764-key dictionary and formatters checked out: G1-G4 all green, all 108 auth-spec §5 rows verified byte-for-byte, 0 untranslated en/bn pairs across 764 keys, all 38 ErrorCodes resolved; two new S4 issues (ISS-070, ISS-071), no S1/S2 · docs/validation/T-006.md
