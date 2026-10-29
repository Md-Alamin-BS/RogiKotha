# Functional Design — questions (U13 `t-106-auth-identity-validation`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-106-auth-identity-validation/functional-design/`.

First draft, 2026-10-29. Every open point was decided by the agent under the owner's no-questions instruction of 2026-10-29, by the recommended option (listed first, as A). Each awaits the owner's confirmation in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`.

Context:
- Unit U13 (kind `spec`, size M, **high risk**) delivers T-106 (`docs/implementation/tasks/T-106-auth-identity-validation.md`) for US3.1, US3.2, US3.3 and US11.1. It depends on U8 T-101, U9 T-102, U10 T-103, U11 T-104, U12 T-105 and U6 CR-012 (`unit-of-work-dependency.md`); U43 T-504 depends on it. It writes tests and records only, so there is no `frontend-components.md`.
- Inputs read: `unit-of-work.md` (U13), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `stories.md` (AC3.1.1–AC3.1.6, AC3.2.1–AC3.2.5, AC3.3.1–AC3.3.6, AC11.1.1–AC11.1.6), `contract-summary.md` (C1, C4, C5), `docs/status/decision-log.md` (to FD-094), `01-conventions.md` §2, §5, §10–§14, `02-data-model.md`, `docs/implementation/README.md` §4, `docs/planning/10-validation-strategy.md`, `ARCHITECTURE-SPINE.md` AD-16, `00-master-plan.md` §7–§8, `docs/design/auth-screens-spec.md` §6, `05-demo-storyboard.md`, `docs/validation/README.md` and `T-009.md`, the drafts of U6, U8, U9, U10, U11 and U12, T-011's code plan, and on `main`: `eslint.boundaries.mjs`, `vitest.workspace.ts`, `packages/{application,database}/vitest.config.ts`, `apps/web/{package.json,vitest.config.ts}`, `scripts/check-identity.mjs`, `packages/test-support/src/{corpus/accounts.ts,seed/}`, `packages/database/src/schema/search.ts`, the route folders under `apps/web/src/app`.
- Open `ISSUES.md` rows naming this Unit: none open (ISS-158 is fixed in U6 CR-012 and moved T-106's alias rows to r2 and `anon_author_r2`). Related: ISS-057 (S1 for a tool name in a document), ISS-139 (the expected-failure precedent), ISS-298 (`pnpm check` duration).
- Owner answers that bear on this Unit: masked own email; "Former member"; release 1 settings narrowed; threshold 2–50; mail-only worker key; text-only feedback; FD-094 (independent Units build in parallel); the no-questions instruction of 2026-10-29.

## Settled before this stage

- **No second vendor (D12, `team.md`).** Validation is the AI-DLC reviewer, collaborators on, a separate agent's 3–5 adversarial tests and the owner's written sign-off.
- **No tool or model identity in any document (`project.md` Forbidden).** Question 1 only settles how the records and the old prompt are aligned with it.
- **No code fixes (T-106 Not in scope).** Findings go to the owning Unit.
- **Swarm (FD-094).** One worktree, Bolt branch and test database per Unit; merges one at a time.
- **r2 and `anon_author_r2` (FD-039, CR-012).**
- **The drafts' limits and codes** (FD-058, FD-063, C5; U8 BR3.2, BR3.3; U10 BR4.2; U11 BR4.4; U12 BR6.1).
- **FD-088.** No appeal route in release 1, so the suspended copy names none.

## Settled in this design without a question

- **The matrix is checked against the designs, not the task's first wording,** where a design changed a value: shared sign-in counter (F12), `rk.pending` added to the cookie row (F14), FD-063's delay sequence (F11).
- **Window resets, 30-day sessions and token expiry are proven with a fake `Date` in `web-int`,** because a browser test cannot wait 15 minutes, an hour or 30 days (F24).
- **A defect found here is committed as an expected failure named by its `ISS-` id** (BR3.5, ISS-139 precedent), so the gate stays green and the fix must convert it.
- **The audit check compares exact differences,** not "at least", against a reviewed fixture (BR5.4).
- **Leak scans record kinds, locations and counts, never values** (BR6.4).
- **SQL set-up runs through `psql` inside the compose container on the isolated database only,** with no new dependency (BR2.6).

## Question 1

Who validates, and may the Phase 1 record name the validator's model?

Why this is open: T-106's header asks for "a separate session, other vendor" with named models, and README §4, `docs/validation/README.md` and the template ask for a "validator model id" line. D12 and `team.md` use no second vendor, and `project.md` Forbidden bans tool or model identity in any document (ISS-057 was S1 for a tool name). AD-16 still says "cross-vendor".

A. **Validate inside AI-DLC with four roles (build agent, reviewer, separate adversarial agent, owner), name roles only, and record it in a new FD entry that amends AD-16, the master plan's M4 class, T-106's header, README §4, `docs/validation/README.md` and the template** (recommended). Old records stay as history.
B. Keep the "validator model id" line as validation evidence, as `docs/validation/README.md` allows. Conflicts with the affirmed Forbidden rule, which would need its own amendment first.
C. Use a second vendor's tool for this Unit only. Contradicts D12 and `team.md`; no such tool is set up.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

What happens to the matrix rows whose page or data does not exist in Phase 1?

Why this is open: `/authors/[username]` is a placeholder until U38 T-409, `search_documents` is empty until U18 T-205, the reveal button is U35 T-406's and the configuration view U37 T-408's. Run as written, these rows pass on empty data (F5).

A. **Prove the data- or command-level part now (identity queries, the `search_documents` columns, reveal and config through the container), mark the page-level part deferred to the owning Unit's acceptance row, and let deferred rows cap the verdict at `PASS WITH FOLLOW-UP`** (recommended). The Phase 1 gate opens now; nothing passes vacuously.
B. Move this Unit after U18, U35, U37 and U38. Full browser evidence, but the gate for identity and evidence work opens only in Phase 4.
C. Build interim pages or resolvers here. Writes into other Units' paths, against the task's scope.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

What must a second use of an email-verification link show?

Why this is open: T-106 expects `auth.token_invalid`; U8 BR2.2 returns `ok` and changes nothing for an account that is already active (and the library may sign the token instead of storing it).

A. **Follow U8: a second confirm on an active account is `ok` with no state change and no second `email_verified` row; on a suspended, banned or deleted account it is `auth.token_invalid` with no session; reset links stay single use** (recommended). Tests the decided behaviour; the security claim (no reactivation, no extra session) is what matters.
B. Require `auth.token_invalid` on any second use. U8 would need a store of used verification tokens.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

Where do the checks live, and which owned paths does this Unit add?

Why this is open: T-106 owns only browser specs and application unit tests, but grants, catalog paths, row counts and fake clocks need the real database (F17).

A. **Three levels: Playwright specs in `apps/web/e2e/phase1/` with a `psql` helper; `web-int` tests in `apps/web/src/server/__validation__/`; database tests in `packages/database/src/__validation__/`; plus a `next-path` unit test, two Playwright projects and an `e2e:phase1` script, all recorded as owned-path additions** (recommended). Each claim at the level that observes it; W, D and A tests run in every `pnpm check`.
B. Only the task's two paths, with database facts as `psql` output pasted into the record. Evidence that never re-runs.
C. Everything in Playwright, with `pg` added to the web app's dev dependencies. A new dependency and database code outside the boundary rules.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

How does the run stay out of sibling worktrees' way under the swarm?

Why this is open: FD-094 gives each Unit its own test database, but the matrix also changes the development database (suspends, revokes, applies configuration) and reads Mailpit, which every worktree shares (F9).

A. **Own development and test databases (`rogikotha_t106`, `rogikotha_test_t106`), own port 3106 and `APP_URL`, and a Mailpit filter on recipient, time and link origin** (recommended). No new infrastructure; T-009 used the same pattern.
B. Run this Unit only when no other worktree is active, on the shared databases, and reset them afterwards. Serialises the build the owner wants parallel.
C. A second Mailpit container per worktree. A compose change for one Unit.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

How are the rate-limit, timing and sign-in specs kept from tripping each other?

Why this is open: the limiter is in memory per process, the network limit is 30 failures per 15 minutes, and seeded accounts are shared by specs (F6).

A. **A unique `x-forwarded-for` value per spec, fresh addresses wherever a seeded account is not needed, the limit specs in a last `phase1-limits` project, and a server restart between the two projects** (recommended). Repeatable and fast.
B. Restart the server before every spec. Slow (one production start per spec).
C. Lower the limits through configuration. Not possible: the per-email and per-network limits are fixed (C5).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

How does the dependency graph hold identity and evidence work until this Unit's verdict?

Why this is open: the master plan gates that work on "T-106 PASS", but only U43 T-504 depends on U13; under the swarm U21 T-301 and U23 T-303 could start first (F7).

A. **Add U13 to the `depends_on` of U21 T-301 and U23 T-303 at the next Units revision; every later identity, evidence, moderation, retention and deletion Unit depends on one of them** (recommended). Two edges; the swarm enforces the gate.
B. Add U13 to every high-risk Unit explicitly. Same effect, more edges to maintain.
C. No edge; an orchestration note only. The swarm may start them early, and a FAIL then touches more Units.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

How is the verdict computed?

A. **`FAIL` on any failed, blocked or unrepeatable row or open S1/S2; `PASS WITH FOLLOW-UP` when only deferred rows or S3/S4 findings remain, each with an owner Unit and a gate; `PASS` otherwise** (recommended). Matches the verdict contract.
B. Count deferred rows as passed. Hides that a claim is not yet proven in the browser.
C. Count deferred rows as failed. The verdict can never pass in Phase 1.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

What happens after a `FAIL`?

A. **Each finding's `ISS-` row names the owning Unit; the fix is a change-request Unit; this Unit runs a second round (`PHASE-1-round-2.md`) of the failed rows, the whole `phase1` suite and `pnpm smoke`; U21 and U23 wait** (recommended). Merged Units are never reopened; T-003's round 2 is the precedent.
B. Reopen the owning Unit's Bolt. Rewrites a merged Unit's record.
C. Let this Unit fix small defects. Against T-106's scope.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

How is the enumeration timing measured?

A. **Against the production build (`next start`), 3 discarded warm-ups, then 20 runs per case, each run from its own network value, comparing medians** (recommended). Measures the defence, not compilation.
B. Against `next dev`. First-hit compilation dominates the numbers.
C. Drop the timing row. It is a T-106 acceptance row and an AC3.2.1 claim.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

Which records does this Unit update besides `PHASE-1.md`?

Why this is open: README §4 also updates `BUILD-LOG.md`, the README tracker and `NEXT.md`, which the migration retires (F16).

A. **`PHASE-1.md`, the `ISS-` rows, one row in `docs/status/validation-log.md` (the index `docs/validation/README.md` names) and the Unit record; not `BUILD-LOG.md`, the tracker or `NEXT.md`** (recommended). One source of status.
B. Update every file README §4 names. Two status sources during the migration.
C. Only `PHASE-1.md` and the Unit record. The validation index goes stale.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

How are "two browsers" provided for sign out everywhere and the device rows?

A. **Two isolated Chromium contexts (separate cookie jars)** (recommended). Chromium is what T-011 installs; separate contexts give separate sessions.
B. Install Firefox for this suite. Another browser download for no extra evidence.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)
