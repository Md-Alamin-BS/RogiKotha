# Handoff, 2026-11-09: release 1 finished and submitted; how to continue the full project

> **Start here when you continue the project after submission.** This file lives on the archive
> branch `archive/full-project-2026-11-09`. It is the complete project: every defect row, task file,
> migration note, design draft and handoff, plus the closed AI-DLC record of release 1.

## Two branches, two purposes

| Branch | What it is | Use it for |
|---|---|---|
| `main` | The submitted course project. Only the product, the docs a reviewer needs, and the AI-DLC record and harness. The old BMAD material, the hand-run build loop, the defect register, task files, migration notes and the Codex copy of the harness were removed. The `v1.0.0` tag marks the submission. | Reading, grading, running the demo. |
| `archive/full-project-2026-11-09` | `main` as it stood just before that cleanup, after release 1 was finished: all history and working documents. | **Continuing the work.** Every `ISS-`, `T-` and handoff reference in the AI-DLC records resolves here. |

How to continue:

1. `git fetch --all`, then `git switch archive/full-project-2026-11-09`. Or branch off it:
   `git switch -c dev/release-2 archive/full-project-2026-11-09`.
2. To bring in the reviewer-facing docs from `main` (new README, LICENSE, `docs/README.md`,
   `docs/how-it-was-built.md`, `docs/known-limitations.md`), run `git merge main`. The merge would also
   delete the removed working docs, so take only the files you want, for example:
   `git checkout main -- README.md LICENSE docs/how-it-was-built.md docs/known-limitations.md`.
3. Set up the computer as in [../CONTINUE-ON-ANOTHER-DEVICE.md](../CONTINUE-ON-ANOTHER-DEVICE.md):
   `.env` from `infra/compose/.env.example`, `pnpm install`, `pnpm infra:up`, `pnpm demo`.
4. The AI-DLC intent cursor is per machine. If `/aidlc` resumes `demo-slice`, run
   `! aidlc engine intent switch aidlc-adoption`.

## State at the end of 2026-11-09

- All ten release-1 Units (FD-105) are merged, reviewed READY, their review fixes merged, and closed in
  the engine. Build and Test passed; the details are in
  `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/build-and-test/`.
- The three last security gaps were fixed on 2026-11-09 under the owner's choice "Fix all three":
  ISS-141 (the audit-log escape hatch is limited to the owner role), ISS-139 (the worker can no longer
  read the encrypted original filename), and ISS-704 (better-auth 1.7.18).
- The U50 manual checks M3-M6 and the clean-clone rehearsal were walked on the office computer
  (`docs/validation/U50-walkthrough.md`).
- The high-risk sign-offs (U48, U41), FD-116 and the Bengali copy review were written by agents under
  the owner's delegation of 2026-11-04. The owner can still confirm them in their own words. The rows
  are in [../OWNER-REVIEW-QUEUE.md](../OWNER-REVIEW-QUEUE.md).

## What is left, to finish the full product

1. **Owner confirmations** (OWNER-REVIEW-QUEUE.md, "Owner reviews waiting"): U48 and U41 sign-offs,
   FD-116, and the Bengali copy review (FD-042, including the `ev.*` wording). Also walk the demo
   storyboard in bn and en (G5).
2. **Release 2** (FD-105, deferred Units keep their frozen IDs):
   - the staff console and moderation;
   - reports and thresholds;
   - notifications;
   - admin configuration;
   - search (ISS-233);
   - provider claims and merges;
   - retention and legal holds;
   - data export and deletion (ISS-234);
   - the workspace extras and the PWA;
   - evidence redaction and the viewer;
   - mentions, reactions and blocks;
   - tombstones and restore.

   Start a new AI-DLC intent for release 2 (or a new Units Generation on this one), then build in
   parallel worktrees as in [../handoff-2026-11-06/README.md](../handoff-2026-11-06/README.md).
3. **Open defects:** `docs/implementation/ISSUES.md` still has open S3 and S4 rows (polish and debt).
   Triage them at the start of release 2.
4. **Operation phase:** the classic scope skipped it. A staging environment and deployment pipeline are
   needed before any public launch. Moderation (release 2) must exist first, because FD-105 says
   release 1 is not for unrestricted public launch.

## Machine notes

- Office computer: the old worktrees `../rk-u9`, `rk-u11`, `rk-u20`, `rk-u41`, `rk-u46` to `rk-u49`
  are stale (their branches are merged). Remove them with `git worktree remove <path>` when convenient.
- lelin-pc: see [../handoff-2026-11-08/README.md](../handoff-2026-11-08/README.md).
