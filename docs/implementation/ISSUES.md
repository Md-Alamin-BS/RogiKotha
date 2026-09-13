# Issues register

Rules in `04-handoff-and-validation.md` §4. One row per issue; never delete rows — change `status`.
IDs are sequential `ISS-nnn`. Severity: `S1` breaks demo / hard rule / private data / red check;
`S2` wrong or missing behaviour the storyboard needs; `S3` cosmetic or polish; `S4` tech debt,
assumption marker, deferral.

| ID | Date | Found in | By | Sev | Area | Title | Repro / evidence | Status | Owner |
|---|---|---|---|---|---|---|---|---|---|
| ISS-001 | 2026-09-12 | planning | human/planner | S4 | evidence | PDF/HEIC/Office evidence deferred to Phase 2 (FD-036) | `07-phase-2-document-evidence.md` | deferred → Phase 2 | founder |
| ISS-002 | 2026-09-13 | T-001 | implementer | S4 | tooling/lint | typescript-eslint `recommendedTypeChecked` needs a `disableTypeChecked` override for root-level config files | `eslint.config.mjs` lines 43-51 (`**/*.mjs`, `**/*.cjs`, `**/*.config.ts`, `vitest.workspace.ts` are not covered by any package tsconfig's `include`) | fixed in T-001 | — |
| ISS-003 | 2026-09-13 | T-001 | implementer | S4 | tooling/lint | ESLint `ignores` list needed entries beyond the task's list for pre-existing agent-tooling directories | `eslint.config.mjs` lines 8-26; `.agents/**`, `.claude/**`, `.github/**`, `.impeccable/**` added — `pnpm lint` failed with parser/`no-undef` errors in `.agents/skills/**` and `.claude/skills/**` before this fix | fixed in T-001 | — |
| ISS-004 | 2026-09-13 | T-001 | implementer | S4 | tooling/test | Vitest 4.1.11 removed the standalone `defineWorkspace` / auto-loaded `vitest.workspace.ts` mechanism the task described | `vitest/config` exports no `defineWorkspace` in 4.1.11; `vitest.workspace.ts` kept its name and globs but is now a normal config with `test.projects`, referenced explicitly via `--config vitest.workspace.ts` in every root script that runs tests (`test`, `test:int`, `smoke`). A future package only needs its own `vitest.config.ts` to be picked up by the existing globs — no further change needed here. | fixed in T-001 | — |
| ISS-005 | 2026-09-13 | T-001 | implementer | S4 | tooling/build | `apps/web` has no `src/index.ts` yet (owned by T-008), so `tsc -p apps/web/tsconfig.json` fails with TS18003 "No inputs were found" | `apps/web/package.json` `typecheck` script set to `echo "T-008"`, matching the existing `dev`/`build` placeholders, until T-008 adds real source | fixed in T-001 | T-008 |
| ISS-006 | 2026-09-13 | T-001 | implementer | S4 | tooling/test | Vitest's CLI positional filter is a substring match, not a glob | `pnpm smoke` with the literal pattern `**/*.smoke.test.*` matched zero files; changed to the substring `smoke.test` in root `package.json` | fixed in T-001 | — |
| ISS-007 | 2026-09-13 | T-001 | implementer | S4 | tooling/workspace | `pnpm install --frozen-lockfile` reports "10 workspace projects", not the "nine" the task's acceptance table names | pnpm counts the workspace root (`rogikotha`) as a project in addition to the 2 `apps/*` + 7 `packages/*` workspaces; not a defect, just a wording mismatch to flag for the validator | won't fix — informational | — |
