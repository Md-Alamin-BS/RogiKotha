# Resume point — Construction run (saved 2026-10-29; demo slice updated 2026-11-01)

Read this first when the session restarts. **On another computer, start with [CONTINUE-ON-ANOTHER-DEVICE.md](CONTINUE-ON-ANOTHER-DEVICE.md).** It lists exactly where the run stopped, what was in flight, and the next steps in order. The owner's decisions and every agent-made call are in [OWNER-REVIEW-QUEUE.md](OWNER-REVIEW-QUEUE.md).

## Owner instructions in force

- **No questions to the owner** (2026-10-29). Decide every open point by the recommended option and log it in the queue. **One exception:** ask when a permission is denied or a new permission is needed.
- **Build in parallel where Units don't depend on each other or collide** (2026-10-29, FD-094 changes D13). Use AI-DLC's native swarm: stage-major iteration with `Construction Execution: swarm`. Each Unit gets its own worktree, Bolt branch and test database; merges happen one at a time; commits carry only the owner's git identity.
- **User path first, admin last** (2026-10-29). After T-011 build only these 20 Units, in parallel batches: (1) T-101, T-201; (2) T-102, T-103, T-202, T-303; (3) T-104, T-105, T-203, T-304, T-405; (4) T-204, T-301, T-305; (5) T-302, T-306; (6) T-307; (7) T-308, T-401; (8) T-402. Everything else (T-106, T-205..T-207, T-309, T-403, T-404, T-406..T-410, T-501..T-505) waits until these are merged. Do not draft or design the deferred Units now.
- Patient UI first (rich, futuristic, motion within FD-091); then login and sharing; admin only as far as the release needs. Every string in `en` and `bn`. Synthetic data only. No tool or model identity anywhere.
- Plan approval is off for this piece of work, and Construction autonomy is `autonomous`.

## Progress

- **2026-10-30: the owner cut scope to a same-day demo (FD-099).** A separate express intent `261030-demo-slice` builds only these flows: register and sign in, profile edit, doctors, writing and editing an experience, attachments, and comments.
  - Reverse Engineering is approved (code knowledge base rescanned). Requirements are approved by the owner. The code plan is recorded, and plan approval is off for express.
  - **Code complete and green (`f31342a`), pushed.** The code-generation review was requested on 2026-10-30 at about 18:00. Next: the review verdict, the Code Generation gate (the owner approves), Build and Test, the 3 local deployment stages, and the merge. The build ran as workflow `wf_5973f690-709` on branch `bolt/demo-slice` (from `acd6bf5`): foundation, 6 parallel features, integrator, browser click-through, adversarial testers, records. Resume it with script `C:\Users\BS01395\.claude\projects\C--Users-BS01395-Documents-GitHub-rogikotha\5d6af544-99ce-4a55-84fe-49f5cb410bf0\workflows\scripts\build-demo-slice-wf_5973f690-709.js` and `resumeFromRunId: "wf_5973f690-709"`.
  - **2026-11-01 additions, pushed to `origin/bolt/demo-slice`, NOT merged into `main`.** The owner tested the demo and asked for three changes: the write-form fix (ISS-392), adding a doctor who is not listed (FD-100, ISS-393 to ISS-399, shown as "Added by a member — not confirmed"), and the read-only Hospitals & clinics and Health topics pages (FD-101, ISS-400). An AI-DLC reviewer read the add-a-doctor change: NOT-READY with two S2 findings (ISS-396, ISS-397), both fixed. Issues for the slice run ISS-324 to ISS-400; the next free numbers are FD-102 and ISS-401. Code Generation waits for the owner at its approval gate (recorded on 2026-11-01 with `aidlc engine orchestrate report --stage code-generation --result awaiting-approval`). The express scope runs no stage reviewer, so the review requested on 2026-10-30 is not needed. Next: the owner approves Code Generation, then Build and Test, the 3 local deployment stages and the squash merge. `main` has no commit the branch lacks. The intent cursor is per machine: another clone runs `/aidlc intent switch 261030-demo-slice` first. To show the demo on another computer: [CONTINUE-ON-ANOTHER-DEVICE.md](CONTINUE-ON-ANOTHER-DEVICE.md) section 0.
  - After it: report the code-generation gate (needs the owner's approval), then Build and Test, then the deployment-pipeline, deployment-execution and observability stages (local demo only).
- **Paused:** the full intent `261011-aidlc-adoption`, with 8 of 45 Units merged. T-101's work in progress is on `bolt/t-101-better-auth-adapter` (`20914dc`).

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
