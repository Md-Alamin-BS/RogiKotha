# Handoff, 2026-11-06 evening: continue release 1 on another device

> **LAST PUSH FOR 2026-11-06.** This is the last push from the office computer today, at about 20:10 (+06).
> Every builder on that computer was stopped after its last commit. Nothing is running there, and no
> uncommitted work is left in any worktree. Another device can pull and carry on from here. Any agent that
> picks this up: start with this file, then [builder-notes.md](builder-notes.md).

Older context: [../RESUME.md](../RESUME.md) (history and the owner's standing instructions), [../CONTINUE-ON-ANOTHER-DEVICE.md](../CONTINUE-ON-ANOTHER-DEVICE.md) (first-time setup of a new computer, how to run the demo).

## Owner instructions in force (do not ask the owner again)

- **Do everything yourself.** Approve every gate and checkpoint with the recommended option, and quote the owner's delegation of 2026-11-04 in `--user-input`: "all the permission need from me or approval do it yourself which is best and recomeded dont need to ask me unless you dont know the recomneded things". High-risk sign-offs are written by an agent and labelled as delegated. Ask the owner only when a permission is denied or a hook blocks every route. Then give one `!` command in one line.
- **Build in parallel wherever Units don't depend on each other.** Use sub-agents one after another per Unit, in short step-range chunks. Never pause to wait for the owner. Plan approval is off.
- **No GitHub Actions or CI (FD-102).** Never create or edit `.github/workflows`. The gate is local only: `pnpm check` and `pnpm smoke`.
- **No tool or model identity anywhere:** no `Co-Authored-By`, no "Generated with". Commits carry only the owner's git identity.
- Never run `git reset --hard`, `git checkout --` or `git clean` on a dirty tree.
- Use synthetic data only. Every user-facing string goes into both `en.json` and `bn.json`. Commit only the paths a Unit owns.
- `bolt/demo-slice` stays untouched.

## Where things stand

Release 1 is the 10-Unit plan (FD-105). The AI-DLC stage is **Code Generation**. Construction Execution is `serial` in the engine; the parallel builds run in our own git worktrees, as described below.

| Unit | Slug / branch | State | Next step |
|---|---|---|---|
| U9 | `t-102-patient-auth-screens` | merged, reviewed READY, unit complete | (Build and Test later) |
| U11 | `t-104-identity-module` | merged, reviewed READY, unit complete | (Build and Test later) |
| U46 | `u46-directory` | merged, reviewed READY, unit complete | (Build and Test later) |
| U20 | `t-207-discover-emergency-about` | merged (`a77d70a`, plus review fixes `dbc9c03`), reviewed READY, unit complete | (Build and Test later) |
| **U47** | `bolt/u47-reviews` @ `3659ae3` | steps 1-37 built; **Step 38 is not ticked**, so check whether `review-module.int.test.ts` exists and passes | **steps 38-61, then merge (next in the engine)** |
| U48 | `bolt/u48-evidence` @ `cf88779` | steps 1-25 built (the part that does not need U47) | steps 26-53, after U47 is on `main` |
| U49 | `bolt/u49-comments` @ `e63d4c9` | steps 1, 3, 5-14 built | steps 2, 4, 15-31, after U47 is on `main` |
| U41 | `bolt/t-502-security-hardening` @ `c10ba79` | steps 1-27 built | steps 28-38; 28-32 (the upload route) need U48 on `main` |
| U22 | `t-302-review-changes-and-tombstones` | plan written (33 steps), nothing built, no branch | all steps, after U47 is on `main` |
| U50 | `u50-release-check` | plan written (52 steps), nothing built | last: after all other Units are merged |

The engine has already handed out the U47 Code Generation run-stage (`aidlc engine orchestrate next` returns it again; its `plan_approval` is `approved`/skipped).

### Remaining U47 chunks (the order the builders were following)

- 38-46: Step 38's int test if missing; i18n keys and the composer, with its tests.
- 47-54: the write page, experience components and pages, slots, the `/me` addition, CSS, experience tests.
- 55-58: retire the demo code (grep for callers first), move the tests, smoke. **Step 56 must also delete** `publishReview`, `ComposeInput`, `NewDoctorInput`, `ComposeCommon`, `personaFor`, `languageOf` and the `Compose*` types that Step 36 kept (see builder-notes, U47 steps 35-38).
- **FOLLOWUP** (two review fixes owned by U47):
  - (a) U9 Major: `requireAccount` / `requireContributor` (`apps/web/src/server/auth/session.ts`) must prefix the locale on `returnTo`, so `safeAuthNext` accepts it. Add a test that follows the path to the sign-in page's `next`.
  - (b) U11 Major: narrow `WebContainer.identity` (`apps/web/src/server/container.ts`) to `publicProjection` and `ownsPersona`. Keep `ownership` and `personaFor` local to `buildContainer`. Widen the BR3.6 identity-boundary scans to `app/**` and `server/**`.
  - Add an ISSUES row for each, Found in the U9 / U11 review, fixed in U47.
- 59-60: the gate and the acceptance rows.
- 61: the records step. Write the ISSUES rows (U47 numbers from **ISS-517**), `code-summary.md`, `traceability.json` and `source-manifest.json` (exclude `aidlc/`, `.claude/`, `.agents/` and paths with `[ ]` or `*`). Then run `pnpm format:check`, `pnpm check` and `pnpm smoke`, and commit.

**ISS numbering**, to avoid collisions between parallel Units: `main` currently ends at ISS-516, then ISS-600 to ISS-606 (U20). Reserved ranges: U47 ISS-517-599, U48 ISS-620-659, U49 ISS-660-689, U41 ISS-690-719, U22 ISS-720-749, U50 ISS-750+.

## How to continue on the other device

### 1. Get the code and the worktrees

```bash
git clone https://github.com/Md-Alamin-BS/RogiKotha.git rogikotha   # or: cd rogikotha && git fetch --all && git switch main && git pull
cd rogikotha
# set up .env, pnpm install and pnpm infra:up as in ../CONTINUE-ON-ANOTHER-DEVICE.md
git worktree add ../rk-u47 bolt/u47-reviews
git worktree add ../rk-u48 bolt/u48-evidence
git worktree add ../rk-u49 bolt/u49-comments
git worktree add ../rk-u41 bolt/t-502-security-hardening
# later, when U47 is on main:  git worktree add -b bolt/t-302-review-changes-and-tombstones ../rk-u22 main
```

In each worktree, copy the main `.env` and change **only** the `DATABASE_URL_TEST` database name, then run `pnpm install --frozen-lockfile`. The names are U47 `rogikotha_test_w4`, U22 `rogikotha_test_w5`, U48 `rogikotha_test_w6`, U49 `rogikotha_test_w7` and U41 `rogikotha_test_w8`. Create each database on the compose PostgreSQL (port 5433) if it is missing. The test reset accepts names ending in `_test_w<n>`.

### 2. Build in chunks

- The two workflow scripts used today are in this folder: [build-u47-chunks.workflow.txt](build-u47-chunks.workflow.txt) and [build-batch3-early-chunks.workflow.txt](build-batch3-early-chunks.workflow.txt).
- Before you reuse one (save it as a `.js` file outside the repo first):
  - change `ROOT` to the new computer's parent folder;
  - put the builder agent's type, model and effort where the `BUILDER` comment is (the high-effort agent type);
  - replace the `chunks` lists with the remaining step ranges.
- Each chunk is one agent that does a few plan steps, runs unit-scoped tests and commits as `<unit>: plan step(s) <range>`. One agent per whole Unit stalled for hours, so keep the chunks short.
- **Do not use the `aidlc-developer-agent` type for parallel work.** A hook refuses it unless the brief starts with `testing-posture brief` for the engine's *active* Unit.

### 3. Land a Unit (U47 first)

1. In the worktree, `git merge main` and resolve conflicts. Keep shared files append-only. Run `pnpm check` and `pnpm smoke`; both must be green.
2. On `main`, run `git merge --squash bolt/<unit>`, then commit as `<unit-slug>: <one-line summary>` and push.
3. Run `aidlc engine orchestrate next`, then each `aidlc engine orchestrate continue <receipt>` **as a bare command** (no pipe, redirect or `cd` before it; a hook blocks those) until the `run-stage` for that Unit arrives.
4. Request the review:
   ```
   aidlc engine log review --stage code-generation --reviewer aidlc-architecture-reviewer-agent --unit <slug> --iteration 1
   ```
   It prints a `reviewFile`. Write `aidlc/spaces/default/intents/261011-aidlc-adoption/.aidlc-engine/reviewer-dispatch.json` with the exempt paths (see earlier units for the shape), then dispatch the `aidlc-architecture-reviewer-agent`. It writes the review file using the Prior/New findings tables, with no raw `|` inside cells.
5. When the review is done, delete `reviewer-dispatch.json` and record the verdict:
   ```
   aidlc engine log review --stage code-generation --reviewer aidlc-architecture-reviewer-agent --unit <slug> --iteration 1 --verdict 'READY'
   ```
6. Close the Unit, then commit and push `aidlc/spaces/default/intents/261011-aidlc-adoption`:
   ```
   aidlc engine state unit start --stage code-generation --unit <slug>
   aidlc engine state unit complete --stage code-generation --unit <slug>
   ```
7. Fix the Minor review findings on a small branch, then squash and push (as was done for U20).

### 4. Then

- After U47 is on `main`:
  - merge `main` into U48, U49 and U41;
  - start U22 (T-302) on a new branch;
  - build U48 26-53, U49 (2, 4, 15-31) and U22 in parallel.
- U41 28-38 follows once U48 is merged.
- U48 and U41 are high-risk. Each needs 3-5 adversarial tests by a separate agent, plus a delegated sign-off in its record.
- Then U50 (the release check: e2e, the demo walk in en and bn, the owner checklist).
- Then the Build and Test stage, which covers every Unit's acceptance rows and the open Minor findings below.

## Known problems and workarounds

- `aidlc engine swarm prepare` fails with "Approved parent source is not committed", even after the line-ending fixes. That is why Construction Execution is `serial` and we use our own worktrees.
- The `runtime-graph.json bolt_dag is missing or stale` warning on every `next` is harmless.
- The Stop hook keeps saying "AI-DLC is carrying on with Code Generation for …" while a run-stage is held. It is not the owner speaking: keep working.
- A 5000 ms test timeout under machine load is flaky. Re-run once before trusting a red result.

## Open Minor findings for Build and Test

- **U46:**
  - the issues table lacks ISS-516;
  - the manifest lists `reset.ts` and `global-setup.ts`, which came from U11;
  - the Step 1 baseline was never recorded;
  - ISS-514 needs a new migration after 0011;
  - `addMemberDoctor` is exposed on the shared container.
- **U9:**
  - the reset token stays in the URL;
  - the confirm step has login CSRF.
- **U11:**
  - the `PgPrivateIdentityRepository` barrel export;
  - a duplicate insert in `createDefault`;
  - the seed is not transactional.
- **U20:** all four findings were fixed in `dbc9c03`.

## Time estimate

About 2 days of building remain, if it runs nearly around the clock with the parallel chunks: U47 about 3 h, then U48, U49 and U22 in parallel about 5 h, then U41 about 2 h, then U50 and Build and Test. **The target is 2026-11-09 to 2026-11-10.**
