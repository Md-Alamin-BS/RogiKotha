# Resume point — Construction run (saved 2026-10-29; demo slice updated 2026-11-01)

Read this first when the session restarts. **On another computer, start with [CONTINUE-ON-ANOTHER-DEVICE.md](CONTINUE-ON-ANOTHER-DEVICE.md).** It lists exactly where the run stopped, what was in flight, and the next steps in order. The owner's decisions and every agent-made call are in [OWNER-REVIEW-QUEUE.md](OWNER-REVIEW-QUEUE.md).

## Owner instructions in force

- **No questions to the owner** (2026-10-29). Decide every open point by the recommended option and log it in the queue. **One exception:** ask when a permission is denied or a new permission is needed.
- **Build in parallel where Units don't depend on each other or collide** (2026-10-29, FD-094 changes D13). Use AI-DLC's native swarm: stage-major iteration with `Construction Execution: swarm`. Each Unit gets its own worktree, Bolt branch and test database; merges happen one at a time; commits carry only the owner's git identity.
- **User path first, admin last** (2026-10-29). After T-011 build only these 20 Units, in parallel batches: (1) T-101, T-201; (2) T-102, T-103, T-202, T-303; (3) T-104, T-105, T-203, T-304, T-405; (4) T-204, T-301, T-305; (5) T-302, T-306; (6) T-307; (7) T-308, T-401; (8) T-402. Everything else (T-106, T-205..T-207, T-309, T-403, T-404, T-406..T-410, T-501..T-505) waits until these are merged. Do not draft or design the deferred Units now.
- Patient UI first (rich, futuristic, motion within FD-091); then login and sharing; admin only as far as the release needs. Every string in `en` and `bn`. Synthetic data only. No tool or model identity anywhere.
- Plan approval is off for this piece of work, and Construction autonomy is `autonomous`.

## Progress

- **2026-11-04: release 1 was re-planned (FD-105)** and approved under the owner's delegation of the same day: the agent approves gates with the recommended option. The new plan is 10 active Units in 5 parallel batches; 18 Units are deferred to release 2. Construction runs stage-major with swarm. The plan's estimate is **2026-11-11** at about 12 hours a day, or about 2026-11-09 running nearly around the clock.
  - Batch 1: U46 directory, U9 T-102, U11 T-104.
  - Batch 2: U47 reviews, U20 T-207.
  - Batch 3: U48 evidence, U22 T-302, U49 comments.
  - Batch 4: U41 T-502.
  - Batch 5: U50 release check.
- Merged on `main`: 9 Units plus the demo slice. `main` is at `bc63889`. There is no CI (FD-102).
- **Functional Design progress (2026-11-04 night):**
  - Waves 1 and 2 are complete, all reviewed READY and fixed: U9, U11, U46, U20, U47. Pushed at `f56e9fc`.
  - Wave 3 (U22, U48, U49) is being written by 3 parallel architects. Then come reviews (one dispatch record at a time), fixes, and `unit complete --wave`.
  - Then wave 4 (U41) and wave 5 (U50), then Code Generation in parallel batches. Each Unit's Code Generation must first append that Unit's proposed FD rows to the decision log; the next free number is FD-106.

## In flight when the session closed (cut off by the close; resume as below)

1. **T-011 Phase A developer:** finished; nothing to resume.
2. **Design-draft workflow `wf_4906a906-d92`:** STOPPED on the owner's instruction (the 12 Units left are all deferred). Was: drafts for 27 Units in `docs/aidlc-migration/design-drafts/<unit>/`.
   - Complete: t-106, t-206, t-302.
   - The rest had been cut off by an API drop and were re-running. Some folders are partial.
   - Resume with: `Workflow({scriptPath: "C:\Users\BS01395\.claude\projects\C--Users-BS01395-Documents-GitHub-rogikotha\5d6af544-99ce-4a55-84fe-49f5cb410bf0\workflows\scripts\draft-remaining-functional-designs-wf_4906a906-d92.js", resumeFromRunId: "wf_4906a906-d92", args: {units: [...the 27 units...]}})`. Completed agents replay from cache.
   - The unit list is in the script's last run, or in "Units without drafts" below.
3. **Draft refresh of T-103, T-104 and T-105:** partly done (files modified). Re-run one architect agent to finish it. The brief: refresh against T-010 as merged and the refreshed T-101 draft; the owner approved the T-103 staff screens; FD-094 is now the D13 change, so refer to T-101's proposed FD rows by content.

## Uncommitted files and where they belong

- **T-011 code** (bolt branch): `.gitattributes`, `apps/web/src/app/[locale]/layout.tsx`, `apps/web/src/app/[locale]/(patient)/layout.tsx`, `apps/web/src/styles/patient.css`, `apps/web/src/styles/motion.css`, `apps/web/src/app/fonts/**`, `apps/web/src/components/patient/motion/**`, `apps/web/vitest.setup.ts`, `docs/status/dependency-check-log.md`, and the T-011 record's `code-generation/*`. These go in T-011's Phase A commit.
- **Not T-011** (commit separately on `main` after T-011 merges; they carry over a branch switch):
  - `docs/status/decision-log.md` (FD-094)
  - `aidlc/spaces/default/memory/team.md` and `project.md` (D13 amended)
  - `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`
  - `docs/aidlc-migration/design-drafts/**`
  - this file

  When committing T-011, exclude them with `':!docs/aidlc-migration' ':!docs/status/decision-log.md' ':!aidlc/spaces/default/memory'`.
- **Never commit** `aidlc/.aidlc-subagent-inflight` or `.cp.json`.

## Next steps, in order

1. **T-011 Phase A:** done (`1401e06`).
   - Decided under the no-questions instruction: the language toggle must not run the page fade. Add `transitionTypes={[LANGUAGE_SWITCH_TRANSITION]}` to the `#lang` link in `apps/web/src/components/shared/ThemeControls.tsx`, a recorded owned-path addition that goes to B2.
   - Correct BR6.1, functional-spec § 7 and frontend-components § 10 to name the transition-type mechanism.
   - Add the proposed ISS rows from the Phase A report, Found in U45 T-011:
     - S3: the language fade.
     - S2, fixed: staff dark tokens leaked into patient dark mode.
     - S4: the design departures.
     - S4: static groups take no pointer input for 240 ms.
     - S4: `/favicon.ico` returns 404.
     - S4: browser checks used `puppeteer-core` because the DevTools MCP was unavailable.
2. **T-011 Phase B:** three developers in parallel, using the Phase A developer's exact file split. Then commit.
   - **B1 (Step 7):**
     - Files: new `scripts/css-motion-check.mjs` and its `.test.mjs`, `tools/contrast.mjs`, `scripts/contrast.test.mjs`, the root `package.json` (scripts only), `.prettierignore`, `prettier.config.mjs`.
     - Do not reformat `patient.css` or `motion.css`; both already pass with `--no-single-quote`.
     - The checker accepts `html:lang(bn) X` and `X:lang(bn)`.
     - `@keyframes` blocks inside the reduced-motion guard need no selector.
     - Press is `scale(var(--press-scale))`.
   - **B2 (Step 8):**
     - Files: `patient.css` only, plus `ThemeControls.tsx` for the `#lang` `transitionTypes`.
     - Keep the two dark copies identical.
     - Remove the hover transforms on `.ctl`, `.btn`, `.chip`, `.browse-card`, `.emergency-lines a`, `.doc-entry`, `.related-card`, `.react`, `.mini-row`, `.c-mode`, `.opt`, `.case`, `.emerg-card`, `.tabs a:hover::after` and `.cap:hover::before`.
     - Replace the old 2 px focus ring with the 3 px ring.
   - **B3 (Step 9):**
     - Files: tests under `apps/web/src/components/patient/motion/` (incl. `motion.smoke.test.tsx`), `apps/web/src/app/layouts.test.tsx`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/tsconfig.json`, `apps/web/e2e/smoke/motion.spec.ts`, `apps/web/package.json` (`smoke:e2e`), `pnpm-lock.yaml` (Playwright 1.64.1).
     - The `next/font/local` mock already exists in `vitest.setup.ts`; don't add a second.
3. **T-011 Phase C** (one developer): eleven-step gate, records, `code-summary`, `traceability`, `source-manifest`. Then commit.
4. **T-011 wrap-up:**
   - Push the bolt branch so CI runs. At the same time, run `aidlc engine log review --stage code-generation …`, write the reviewer dispatch file, and dispatch the reviewer.
   - Fix any findings, record the verdict, then `state unit start/complete --stage code-generation`.
   - Checkpoint `verify` then `approve`.
   - Squash-merge to `main`, run `pnpm check` on `main`, push.
   - Then commit the non-T-011 files listed above on `main`.
5. **Switch to parallel:**
   - `aidlc engine state set-construction-iteration stage-major`
   - `aidlc engine state set-construction-execution swarm`
   - Then `next`. Follow `.claude/aidlc-common/protocols/stage-protocol-swarm.md` and `stage-protocol-construction.md` §12b.
6. **Functional Design for every remaining Unit** (stage-major runs this first): finalise each draft into `construction/<unit>/functional-design/`, review it, then `state unit start/complete --stage functional-design`.
   - Reviews can run several at once; one reviewer dispatch file per Unit, as the protocol says.
   - Answer every open point by recommendation, and append the FD rows each draft proposes, renumbering from FD-095.
   - Consider adding T-106 as a dependency of T-301 and T-303 (T-106 draft finding F7) before Code Generation starts.
7. **Code Generation in swarm batches:**
   - `aidlc engine swarm prepare --batch <n> --units <…>`.
   - Give each worktree a `.env` copied from the main one, with `DATABASE_URL_TEST` pointing at its own `rogikotha_test_w1`…`w6`. These six already exist in the compose Postgres with pg_trgm, citext and pgcrypto.
   - Fan out one developer per Unit, then `check` → reviewer per Unit → `finalize` → `aidlc engine worktree merge --slug … --target main --strategy squash` for each converged Unit.
   - High-risk Units also need collaborators on and 3–5 adversarial tests.

## Units without drafts at the moment of saving (the workflow was re-running them)

t-204, t-205, t-303, t-304, t-305, t-306, t-307, t-308, t-309, t-401, t-402, t-403, t-404, t-405, t-406, t-407, t-408, t-409, t-410, t-501, t-502, t-503, t-504, t-505 (full slugs in `aidlc/spaces/default/intents/261011-aidlc-adoption/inception/units-generation/unit-of-work-dependency.md`). Some have partial folders; check each folder for all five files and a parsing `traceability.json`.

## Known hazards

- **API drops** ("SSL certificate hostname mismatch") kill agents mid-task. Resume them with SendMessage, or the workflow resume, rather than starting over.
- **Parallel test load** causes one-off cold-start timeouts in tests (ISS-295..297, ISS-302). Re-run the full suite with the machine idle before trusting a red result.
- **Agents and decisions:** a safety check refuses to let agents record an approval in the owner's name. Owner-only approvals (look reviews, sign-offs) must come from the owner.
- **Hooks:**
  - Code Generation steering must be continued bare: `aidlc engine orchestrate continue <receipt>`, with no redirect or pipe.
  - Writes outside the current Unit's record are blocked until its plan is recorded.
- **Manifests:** `source-manifest.json` paths must not contain `[`, `]` or `*`.
- **Timeouts:** every long command needs an outer `timeout`.
