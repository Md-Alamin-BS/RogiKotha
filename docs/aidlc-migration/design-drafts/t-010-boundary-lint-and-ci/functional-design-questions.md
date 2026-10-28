# Functional Design — questions (U3 `t-010-boundary-lint-and-ci`)

Draft written ahead of the stage on 2026-10-28, while U4 CR-011 was being built on `bolt/cr-011-queue-dedup-reset-and-quiet-env`. The lead finalises it when AI-DLC reaches this Unit's Functional Design; `functional-spec.md` § 16 lists what must be re-checked once CR-011 is on `main`.

Context:
- Unit U3 (kind `packaging`, size S, not high risk) delivers T-010 (`docs/implementation/tasks/T-010-boundary-lint-and-ci.md`) for story US1.1 (NFR11, D10). Inputs read: `unit-of-work.md` (U3: "boundary lint, format check, 80% coverage floor and CI (D10, FD-040 test-support seed edge, ISS-205)"; depends on U1 CR-009 and U2 CR-007, both merged), `unit-of-work-story-map.md` (US1.1 → U2, U3, U4, U5, U43, U44), `stories.md` (AC1.1.1–AC1.1.5), `requirements.md` (NFR6, NFR11, NFR13), `components.md` (the worker boundary open point), `contract-summary.md` (no runtime contract on U3's edges; C13's `worker_import_rule`).
- The T-010 task file has no amendments section. Its later changes come from `team.md` (D10 coverage floor; `format:check` in `pnpm check`, the owner's answer of 2026-10-15; adapters only in `server/container.ts`), FD-040 (`test-support/src/seed/** → database`, nothing in `apps/*` imports `test-support`), and the open `ISSUES.md` rows that name T-010: ISS-060, ISS-127, ISS-205, ISS-226.
- Code read on the working tree of 2026-10-28 (CR-011 in progress): `eslint.config.mjs`, root and package `package.json`, every `vitest.config.ts`, `vitest.workspace.ts`, `prettier.config.mjs`, `.prettierignore`, `.gitattributes`, `tsconfig.base.json`, `tools/contrast.mjs`, `tools/README.md`, `apps/worker/src/container.test.ts`, `apps/worker/src/health.ts`, `infra/compose/` (compose file, `postgres-init/*.sql`, `.env.example`), and an inventory of every import edge in `packages/*/src` and `apps/*/src` (`functional-spec.md` § 2).
- Measured read-only on 2026-10-28 (nothing written to the repository): `prettier --check` over the source tree; line coverage of every Vitest project except `database` (left out so the run could not reset the test database the CR-011 build uses); `tools/contrast.mjs` run in memory against the prototype stylesheet, `apps/web/src/styles/tokens.css` and `apps/web/src/styles/patient.css`. Results are in `functional-spec.md` § 2.

## Settled before this stage

These are decided by FD entries, `team.md` or the task file and are not asked again.

- **`eslint-plugin-boundaries` is the tool; `dependency-cruiser` is the fallback** (task "Read first" item 6, master plan §3). The fallback applies only if the adopted plugin release does not support ESLint 10.
- **The FD-040 edge.** `packages/test-support/src/seed/** → database` is allowed as a dev-only edge; nothing in `apps/*` imports `test-support` (FD-040, ISS-226). This overrides the task's older "web → test-support from `*.test.ts(x)`" (step 2).
- **Adapters are instantiated only in `apps/web/src/server/container.ts`** (team.md Code Style, `01-conventions.md` §1). This is narrower than the task's "web-server → adapters".
- **The 80% line floor per package, measured with `@vitest/coverage-v8`, never lowered; packages with no source code are exempt until they have some** (team.md Testing Posture, D10, AC1.1.3).
- **`format:check` (Prettier `--check`) joins `pnpm check` and CI** (team.md Code Style, the owner's answer of 2026-10-15).
- **The worker never imports Better Auth, an identity-reveal command or a user-facing deletion command** (AD-6, `01-conventions.md` §2, C13 `worker_import_rule`).
- **No bot-authored commit or comment step in CI; no tool or model identity anywhere** (task step 7, project Forbidden rule).

## Settled in this design without a question

Each follows from the sources above or from the code; the reasons are in `functional-spec.md` § 13.

- **Every source file belongs to exactly one element, and an import the linter cannot resolve fails.** An unclassified file or an unresolved `@rogikotha/*` or `@/` specifier would otherwise pass silently, which is the opposite of an enforced boundary.
- **Type-only imports, re-exports and dynamic imports are checked like value imports**, with the one exception Question 2 grants.
- **The AD-6 bans use specifier rules (`no-restricted-imports`), not module resolution**, so they bite before T-101 installs `better-auth` and keep biting after.
- **The worker's container-grep test stays.** It matches text (`identity.reveal`, `dataRequest.delete`), which the lint rule cannot see through the `@rogikotha/application` root export (task "Tests to write": delete it only if the rule covers it exactly; it does not).
- **`pnpm contrast` reads `apps/web/src/styles/tokens.css`.** Run in memory on 2026-10-28, it gave the same 150 pair results as `pnpm tools:contrast` (0 skipped, all pass), although the two files are not byte-identical (one header line differs). With `--tokens`, a pair whose tokens are missing fails the run instead of being skipped; without the flag the tool behaves exactly as today.
- **`pnpm check` runs the tests once, with coverage on**, instead of a test run and a second coverage run.
- **CI runs the local gate (`pnpm check`, then `pnpm smoke`) and does not run `pnpm test:int` again.** `pnpm check`'s test step already runs the `database` project (team.md Way of Working), so task step 7's extra `pnpm test:int` would run the integration tests twice.
- **CI actions are pinned to full commit hashes, the job token is read-only, and no repository secret is used.**
- **The Unit's smoke assertion lives in a small `tooling` Vitest project** that runs the fixture proof through ESLint's Node API, because no package project owns the root scripts.
- **An FD entry comes first.** The rulings below that change the written architecture rules of `01-conventions.md` §2 (Questions 1–5) are recorded as the next free FD entry (FD-093 at the time of writing) before any configuration is written.
- **The dependency checks are due again.** The relevant log entries are older than 3 days: ESLint 10.10.0, `eslint-plugin-boundaries` 7.2.0, `dependency-cruiser` 18.2.0 and Prettier 3.9.6 (2026-09-10), `postgres:18` (2026-09-13). `@vitest/coverage-v8` and the GitHub Actions used have no entry at all. npm showed `eslint-plugin-boundaries` 7.4.0 published about two days before this draft, so the newest is not automatically the stable choice.

## Question 1

Task step 2 gives `web-components → [contracts, i18n, web-components]`: a component may not import anything from `apps/web/src/server/`. May a component import a **server action** from `apps/web/src/server/actions/**`?

Why this is open: `01-conventions.md` §8 has forms submit to server actions and enhance them with `useActionState` in client components (register, sign-in, report, comment). A client component that may not import the action must receive it as a prop from its page. No component imports server code today, so either answer keeps the current tree green. Server actions import the container, which imports database and adapters, but the boundary rule checks direct imports only, and Next treats a `'use server'` module imported by a client component as a reference, not as bundled server code.

A. **Allow `web-components → web-actions` only** (recommended). Components may import from `server/actions/**`; never `server/container.ts`, `server/auth.ts` or any other server file, and never `database`, `adapters` or `test-support`. This matches §8 and keeps the forms of T-102, T-306 and T-402 simple, while the things §2 forbids stay forbidden.
B. **Keep the task's rule as written.** Every action is passed down as a prop. Stricter, but every form-bearing UI Unit then carries an extra prop chain the prototype port does not have.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

How does the lint rule enforce AD-6 on **application code the worker imports**?

Why this is open: task step 2 forbids path patterns (`**/identity/**/reveal*`, `**/data-requests/**/delete*`, `**/modules/identity/**`). `@rogikotha/application` exports only its root (`"."`), which by `01-conventions.md` §1 is "the Application interface: { commands, queries } typed by module". A worker file that imports that root reaches `identity.reveal` and `dataRequest.delete` without any path matching the patterns, so the rule would pass while the boundary is broken. Contract C13 says the worker imports only "per-module deletion-step internals (worker entries)". The worker imports nothing from `application` today.

A. **The worker imports application code only through a dedicated worker entry** (recommended): a value import of the `@rogikotha/application` root, or of any path under `modules/identity/`, `modules/account/` or `modules/data-requests/commands/`, fails; type-only imports from the root stay allowed (they carry no capability). The first Unit that needs application code in the worker adds a `@rogikotha/application/worker` subpath export holding only the job-side entries (C13's deletion-step worker entries and the job commands), and the rule allows exactly that subpath. The container-grep test stays as a second net.
B. **Use the task's path patterns as written** and rely on the grep test for the root export. Less to build, but the lint rule then does not enforce what its name says.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

May the worker import **`drizzle-orm` or `pg`** directly (ISS-205: "decide in T-010's boundary rules whether `worker` may import `drizzle-orm`")?

Why this is open: `apps/worker/src/health.ts` runs `select count(*) … from outbox_events where processed_at is null` with `drizzle-orm`'s `sql`, and `apps/worker/package.json` declares `drizzle-orm`. `01-conventions.md` §2 gives `apps/worker → application, contracts, database, adapters`, so table access belongs in a `packages/database` repository. The task says "do not fix other packages' violations here", but ISS-205's owner column names T-010, and the fix is one repository method.

A. **Forbid both; fix ISS-205 in this Unit** (recommended): move the count into the outbox repository (for example `countPending`) with an integration test, have `health.ts` call it, drop `drizzle-orm` from `apps/worker/package.json`. Recorded as an owned-path addition. Done after CR-011 is on `main`, because CR-011 rewrites the outbox repository and `apps/worker/src/`.
B. **Forbid both, suppress the one line** with `// eslint-disable-next-line … -- ISS-205` and leave the move to a later Unit. Green today, but a known violation of §2 stays in the tree.
C. **Allow `drizzle-orm` and `pg` in the worker.** Contradicts §2; table access would spread into handlers.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Two external imports in merged code contradict the text of `01-conventions.md` §2: **`packages/contracts/src` imports `uuid`** (§2 and team.md: "contracts imports zod only"; §1 and T-003 put `newId()` with UUIDv7 in `contracts/src/ids.ts`), and **`packages/i18n/src` imports `next-intl`** (§2: "i18n → nothing runtime; next-intl is wired in apps/web"; `packages/i18n/package.json` declares `next-intl` as a peer dependency, and `request.ts` and `routing.ts` use it). How are they encoded?

A. **Encode the merged design** (recommended): contracts may import `zod` and `uuid` and nothing else; i18n may import `next-intl` and no internal package. §2 is corrected in this Unit under the FD entry, and the team.md Code Style line "contracts imports zod only" is proposed for correction through the learnings step at this stage's gate (team.md is not edited directly).
B. **Encode §2 literally** and treat both as violations: `newId()` would have to move out of `contracts`, and the next-intl wiring out of `packages/i18n`. Both are merged, working designs from T-003 and T-006.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

How are **test files** treated by the boundary rules?

Why this is open: ten component test files under `apps/web/src/components/` import `node:fs`, `node:path` and `node:module` (reading stylesheets and message files), and one `apps/web/src/lib` test does too. A literal "components may not import `node:` modules" turns `pnpm lint` red on merged tests. §10 says application tests use `test-support` fakes, so package tests need `test-support`. FD-040 says nothing in `apps/*` imports `test-support`, yet `apps/web/package.json` still lists it as a devDependency (unused).

A. **Classify test files separately** (recommended): files matching `*.test.ts(x)`, `*.smoke.test.ts(x)`, `*.int.test.ts` and the test setup files keep their element's internal rules, and in addition (1) may import Node built-ins, and (2) in `packages/*` may import `test-support`. Tests in `apps/*` may never import `test-support` (FD-040), `database` from a component test stays forbidden, and the unused `@rogikotha/test-support` devDependency is removed from `apps/web/package.json`. The Node-built-in ban stays absolute for shipped component code.
B. **Apply the rules to test files unchanged** and rewrite the eleven tests to avoid Node built-ins. Rewrites merged tests outside this Unit's area for no runtime benefit (tests never ship in a bundle).
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

How much does the **fixture proof** (`lint-fixtures/boundary-violation/`, `pnpm lint:boundaries`) cover?

Why this is open: task step 4 plants exactly three violations (domain → application, component → `node:fs`, worker → `better-auth`) and expects "3 expected violations found". The rules now carry more forbidden edges (worker → `drizzle-orm`, non-container → adapters, component → database or a non-action server file, application root import from the worker, `test-support` outside `seed/` → database, app tests → `test-support`) and three allowed exceptions (the FD-040 seed edge, the container's adapter import, a component test's `node:fs`). A rule nobody plants a violation for can silently stop biting; an exception nobody exercises can silently turn into a refusal. Also, as written, the fixture's files sit outside every element pattern, so the rules would not classify them at all.

A. **A manifest-driven fixture that mirrors the repository layout** (recommended): one violation file per forbidden edge class and one control file per allowed exception, under `lint-fixtures/boundary-violation/` in the same `packages/…/src` and `apps/…/src` shape, which the element patterns accept as a second root. The script compares the reported (file, rule) pairs with a manifest, requires every control file to report nothing, and prints "N expected violations found" (N is the manifest size). The three cases of task step 4 are among them; the acceptance row's "3" is corrected to the manifest count in the hand-off.
B. **Exactly the three cases of task step 4.** Matches the acceptance row literally; the other edges are proven only by the manual "temporarily add an import" checks at Build and Test.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

Which packages does the 80% floor cover, and what does this Unit do about **packages that are below it**?

Why this is open: team.md says "T-010 adds the thresholds … and raises any package below 80%"; the task file (written before D10) does not mention coverage and is sized S. A read-only trial run on 2026-10-28 (all projects except `database`, which was not run) measured: `packages/contracts` 74.8% (237/317 lines), `packages/test-support` 52.2% (211/404), `apps/web` 79.6% (172/216), `apps/worker` 81.7% (49/60), `packages/i18n` 97.4% (38/39). The trial counted only files some test loaded (15 of 67 web source files, 3 of 9 worker files), so the real figures for `apps/web` and `apps/worker` are lower once untested files count (Question 8, BR3.2). `packages/database` is unmeasured.

A. **Every workspace package with source code, apps included, and the raise happens in this Unit** (recommended). That is `contracts`, `database`, `i18n`, `test-support`, `apps/web` and `apps/worker` today; `domain`, `application` and `adapters` join automatically once they hold code. U3 adds tests (test files only, no source change) until each is at or above 80%, then switches the thresholds on in the same Bolt. The Unit is re-estimated from S to M–L and the re-estimate is recorded. A package that cannot reach 80% without a source change is reported to the owner with an ISS row; the floor is not lowered.
B. **The same packages, but the raise is a separate new Unit** (the next free Unit id) that lands before U3 switches the floor on. Keeps U3 small, but adds a Unit to the plan and delays the floor, and every feature Unit already waits on U3.
C. **Leave `packages/test-support` outside the floor** as test tooling. Narrows the affirmed team practice (team.md names only the three empty packages as exempt), so it is the owner's call, not the agent's.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

Which files may be **excluded** from the coverage measurement?

Why this is open: every exclusion shrinks a package's denominator, which is a way of lowering the floor without changing the number (D10). Candidates seen in the tree: process entry points (`packages/database/src/migrate.ts`, `reset.ts`, `packages/test-support/src/seed/seed.ts`, `apps/worker/src/main.ts`), the generated `packages/i18n/src/keys.ts`, Next route files under `apps/web/src/app/**`, the corpus data files of `test-support`, and test helpers (`test-setup.ts`, `global-setup.ts`, `*-test-support.ts`).

A. **Exclude only what is not source under test** (recommended): test files, test setup and global-setup files, test-helper modules used only by tests, type declarations (`*.d.ts`), and files carrying a "generated, do not edit" header. Entry points, route files and data modules count. Each exclusion pattern is listed in the coverage configuration with its reason, and adding one later needs a recorded reason in that Unit's hand-off.
B. **Also exclude process entry points and Next route files.** Raises the figures at once, but hides exactly the code that runs first in the demo.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

What do **`format:check`'s scope, its line-ending policy and the first green run** look like?

Why this is open: a read-only `prettier --check` on 2026-10-28 flagged 309 files. 180 of them differ only in line endings: this checkout has `core.autocrlf=true` and CRLF files in the working tree although `.gitattributes` says `* text=auto eol=lf`, and Prettier's default `endOfLine: 'lf'` rejects every CRLF file. With line endings ignored, 129 files still differ in content: 42 in `test-support`, 37 in `database` (10 of them drizzle `meta/*.json` snapshots), 22 in `apps/web` (3 of them the ported stylesheets), 11 in `contracts`, 6 in `apps/worker` (CR-011's area), 5 in `i18n`, plus `AGENTS.md`, `README.md`, `PRODUCT.md`, `DESIGN.md`, `infra/compose/README.md` and the compose file. Prettier on the ported CSS would rewrite it, which `01-conventions.md` §7.1 forbids for the staff console's stylesheet.

A. **Code and configuration in scope; git owns line endings; one formatting-only commit** (recommended). Scope: `apps/`, `packages/`, `scripts/`, `lint-fixtures/`, `.github/workflows/`, root configuration files. Out of scope (in `.prettierignore`, each with a reason): `apps/web/src/styles/**` (ported or FD-091 CSS, until T-011 decides for its own CSS), drizzle `migrations/**` (generated SQL and snapshots), Markdown files (instruction and product documents, where reflowed tables and emphasis would add churn without a reader benefit), the agent and engine directories, `aidlc/`, `docs/`, `tools/`, `ui-design-prototype/`, the lockfile. `prettier.config.mjs` gets `endOfLine: 'auto'`, so the check is the same on a CRLF Windows working tree and an LF CI runner, while `.gitattributes` keeps the repository LF. The first green run comes from one commit in the Bolt that contains only `prettier --write` output over the scope, made after CR-011 is on `main`, verified by `pnpm check` and by a `git diff --ignore-all-space`-style review that shows no token change.
B. **Same scope, but keep `endOfLine: 'lf'`** and renormalise every checkout (`git add --renormalize .`). Stricter about line endings, but it rewrites the owner's working tree and every future Windows checkout must repeat it.
C. **Check only files changed on the Bolt branch.** No big commit, but the tree is never fully formatted and the check depends on git state.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

When does the **CI workflow** run, and does a Bolt wait for it before merging?

Why this is open: task step 7 triggers on `main` and `task/**`, but Bolt branches are now `bolt/<slug>`, and team.md squash-merges locally and pushes only `main`, with no pull request per Bolt. `org.md` adds "CI execution before merge" for the `classic` scope. If only `main` triggers CI, CI always runs after the merge.

A. **Run on pushes to `main` and `bolt/**` and on manual dispatch; a Bolt merges only after its branch head has a green run** (recommended). The agent pushes the Bolt branch (no pull request), waits for the run, records its URL in the hand-off, then squash-merges locally and pushes `main`, which runs CI once more. This meets `org.md`'s "before merge" without changing the no-pull-request practice.
B. **Run on `main` only**, after the merge; the local `pnpm check` is the only pre-merge gate. Fewer pushes, but CI never blocks a merge.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

Does this Unit add the **identity guard** that ISS-060 asks for (owner column: T-010)?

Why this is open: no automated check enforces the project's "no tool, model or agent identity" rule; ISS-057 was caught by a human reading a diff. Bare model names appear legitimately in this repository (task headers under `docs/implementation/tasks/`, the AI-DLC engine directories, the audit cost entries AGENTS.md allows), so a naive grep for names would fail at once.

A. **A narrow guard in `pnpm check` and CI** (recommended): `check:identity` fails on attribution markers, not on names: `Co-Authored-By:` trailers, "Generated with/by" footers, the robot-emoji footer and known tool no-reply addresses, (1) in the commit messages from `main`'s merge base to `HEAD` and (2) in tracked files outside `docs/`, `aidlc/`, `.claude/`, `.codex/`, `.agents/`, `.github/agents/`, `_bmad/` and `ui-design-prototype/`. The guard gets its own planted cases in the tooling tests (a file and a commit message that must be refused, a bare model name that must pass). ISS-060 closes.
B. **Leave ISS-060 for U44 T-505** and keep relying on review.
X. Other (please specify)

[Answer]: A (decided by the agent on the owner's standing instruction of 2026-10-27; listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Raised for the owner, not decided in this stage

None of the questions above changes a hard rule, a data boundary or a product behaviour, so all were decided on the standing instruction. Two answers carry the most weight for the owner to confirm: Question 7 (the Unit grows from S to M–L because the floor needs new tests) and Question 10 (every later Bolt pushes its branch and waits for CI before merging).
