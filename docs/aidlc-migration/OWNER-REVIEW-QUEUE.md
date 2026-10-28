# Owner review queue — decisions taken during the unattended Construction run

The owner is away (2026-10-27, 8–10 hours). They asked the agent to build the Units one by one, decide by its own recommendation where it would normally stop, keep notes, and show everything at the end for them to check and change. Each row below is a decision or a waiting owner review. Nothing here is final until the owner confirms it.

## Settings changed for this run

| When | What | Why | How to undo |
|---|---|---|---|
| 2026-10-27 | Construction autonomy: **Continue automatically** (owner's answer) | ordinary Unit completion checkpoints approve themselves once verified | ask "review each checkpoint" |
| 2026-10-28 | Overlap design and review with builds (owner's answer): the next Units' Functional Designs are drafted in parallel under `docs/aidlc-migration/design-drafts/<unit>/` while a Unit builds; each draft is finalised, reviewed and recorded when AI-DLC reaches that Unit's stage. Builds, merges and commits stay one Unit at a time (D13) | faster without parallel builds | ask "stop drafting ahead" |
| 2026-10-27 | Plan approval **off** for this piece of work (`guard.plan-approval off`) | the owner asked to proceed without being asked while away; every code plan is still written and reviewed and stays in the record | ask "turn plan approval back on" |

## Owner reviews waiting (the build continues; these need the owner)

| Unit / Bolt | Review | Where |
|---|---|---|
| U45 T-011 | look review of the restyled patient shell in `en` and `bn` (FD-091) | T-011 task file, hand-off |
| U9 T-102, U10 T-103 | auth-screen review on the new look, both languages, both themes, 360 px (FD-053) | task files |
| every high-risk Unit | written sign-off before the milestone gate (team practice step 5) | the Unit's record |
| each milestone | storyboard walk in `en` and `bn` and the Bengali copy review (FD-042) | `05-demo-storyboard.md` |

## Units done in this run

| Unit | Commit on `main` | Checks | Notes for the owner |
|---|---|---|---|
| U7 CR-004 live-region announcements | `bc563f3` | verified with `pnpm infra:up && pnpm check && pnpm smoke` (exit 0); `pnpm check` green on `main` | 4 new Bengali strings await your bilingual review (ISS-228); Q1 = A changes how CR-004's "Bengali" row reads (ISS-229); the running-app screen-reader check of a real locale switch is still to do in Build and Test |
| U1 CR-009 database extensionless imports | squash of `bolt/cr-009-database-extensionless-imports` (the commit named `CR-009: …`) | verified with `pnpm infra:up && pnpm check && pnpm smoke` (exit 0); counts identical to the baseline (220 tests, 15 smoke, 36 int, 781 keys, 37 routes); probe build and mutation test recorded; `pnpm check` green on `main` | ISS-183 closed; the web app can now import the database package. Reviewer READY with two minor points: ISS-230 and ISS-232 (see decisions) |
| U5 CR-006 worker `auth_users` grant (**high risk**) | squash of `bolt/cr-006-worker-auth-users-grant` (the commit named `CR-006: …`) | verified with `pnpm infra:up && pnpm check && pnpm smoke` (exit 0); 240 tests, 16 smoke, 61 int (5 adversarial tests, all held); mutation check: removing the revokes turns 7 probes red; `pnpm check` green on `main` | **your written sign-off is pending** (team practice step 5) — merged ahead of it on your standing instruction so T-101 can start. Confirm FD-092 (the agent-decided grant rulings, Q1–Q8 below). Decide R1 (ISS-240) and R2 (ISS-241). ISS-233/234 (S2) must be settled before T-205 and T-410 build. Code reviewer's minor points: the adversarial test pins the definer-function list and P8 pins 9 migrations (T-309 and later migrations must update them); §16 does not yet list the `pgboss` payload read (ISS-243); the 0005 comment edit changed its content hash (behaviour unchanged). The first adversarial pass was stopped by a safety check before writing anything; a second, read-only pass wrote the 5 tests |
| U2 CR-007 integration-test reset determinism | squash of `bolt/cr-007-int-test-reset-determinism` (the commit named `CR-007: …`) | verified with `pnpm infra:up && pnpm check && pnpm smoke` (exit 0); 10 consecutive `pnpm test:int` runs green, median 30.05 s, longest 1.01× the median; a held lock now fails the run in 13 s naming the blocker (before: hung until cut off); one reset per run; `pnpm check` green on `main` | ISS-143 closed. Confirm ISS-245 (the stale-session sweep runs only from the test run's global setup, not inside every reset) and ISS-247 (an extra smoke file). Each `pnpm test:int` is now about 8 s longer, because one test deliberately waits out the 10 s lock timeout. Reviewer's minor points: a failed ROLLBACK could hide the lock-timeout message; only one test run at a time per test database |
| U4 CR-011 queue de-duplication, reset and quiet env | squash of `bolt/cr-011-queue-dedup-reset-and-quiet-env` (the commit named `CR-011: …`) | smoke 18, integration 85 + 2 expected-fail; checkpoint verification and `pnpm check` on `main` recorded in the commit | ISS-144, 185, 201, 202, 203 closed; ISS-248..257 added. Confirm the five design answers below. Reviewer's minor points: a caller sending inside its own transaction must ensure the queue first (ISS-253, matters for T-101's mail); a slow insert that hits the 5 s statement timeout counts as one of the event's 5 attempts. One `pnpm check` run failed only on test-worker start-up timeouts while four design drafts ran on the same machine; checks are re-run with the machine idle before merge |

## Decisions taken on the owner's behalf

| When | Unit / stage | Decision | Options it had | Why |
|---|---|---|---|---|
| 2026-10-27 | Construction order | follow the engine's dependency levels (CR-004 first; evidence and search slightly earlier than the Bolt plan's list) | reorder the graph file in a Units revision | both orders respect every dependency; no extra gate |
| 2026-10-27 | U7 CR-004, Functional Design Q1 | the language toggle is announced after the switch, in the new language (`Language: English` on `/en`, `ভাষা: বাংলা` on `/bn`) | B: announce at the click, in the old language (likely cut off by the page change) | a screen-reader user actually hears it, in the matching voice; about one hour more |
| 2026-10-27 | U1 CR-009, Functional Design | skipped for this Unit, with the reason recorded | run a full Functional Design | a mechanical build change (import suffixes and one config line) with no behaviour to design |
| 2026-10-27 | U1 CR-009, code | directory imports keep `/index` (`./schema/index`), not the bare folder (`./schema`) the plan's example showed (ISS-230) | bare folder form: a 4-line follow-up | matches CR-005 in `packages/contracts` and changes only the suffix; both forms build |
| 2026-10-27 | U1 CR-009, traceability check | accepted the advisory traceability sensor's "upstream ID set is empty" result for this story-less Unit (ISS-232); nothing invented to make it pass | exempt enabling Units from that sensor (a framework setting) | the check is advisory; the same result will show on the other enabling Units (CR-006, CR-007, CR-011, CR-012, T-010) |
| 2026-10-27 | U5 CR-006 (high risk) | collaborators turned on for this Unit (team practice for high-risk Units); turned back off after it | — | team practice step 5 |
| 2026-10-27 | U5 CR-006, Functional Design Q1 | keep the worker's `reviews` UPDATE on (`state`, `deleted_at`) | B: revoke now, T-410 asks again | T-410's `data.delete` and T-309's held deletion need exactly these two columns (FD-077, FD-079) |
| 2026-10-27 | U5 CR-006, Q2 | **revoke** the worker's `review_versions` INSERT (migration 0008) | B: keep until T-410/T-309 land | no job and no planned Unit writes a worker version row |
| 2026-10-27 | U5 CR-006, Q3 | keep the worker's `comments` SELECT and UPDATE as they are; narrowing to columns waits for T-410 | B: narrow now; C: revoke | T-410, T-309 and T-405 need them; a column list guessed now could break T-410 |
| 2026-10-27 | U5 CR-006, Q4 | **revoke** the worker's `reports` column SELECT (migration 0008); one `constraints.int.test.ts` assertion rewritten to expect the denial | B: keep | nothing needs it, and T-403's own acceptance row expects it denied |
| 2026-10-27 | U5 CR-006, Q5 | keep the worker's `account_profiles` SELECT on five columns (no `auth_user_id`); re-judged in T-410's design | B: revoke; C: narrow to 3 columns | T-410's export writes the profile file |
| 2026-10-27 | U5 CR-006, Q6 | keep the worker's `legal_holds` SELECT, read only | B: revoke | the expiry and deletion jobs must see holds to respect them |
| 2026-10-27 | U5 CR-006, Q7 | keep the worker's `account_preferences` SELECT | B: revoke and drop the send-time check | T-405's send-time preference check (a mail turned off after queueing is not sent) needs it |
| 2026-10-27 | U5 CR-006, Q8 | `02-data-model.md` §16 lists every live worker grant with its jobs and Units (documentation only) | B: amend §16 only for the FD-050 grants | §16 becomes the complete list Contract Design relies on |
| 2026-10-28 | U4 CR-011, Functional Design Q1 | every application queue uses pg-boss's `exclusive` policy, from one shared declaration, on top of the transactional relay | B: keep `standard` (rewrite the ISS-201 probe); C: `stately` everywhere; D: `singletonSeconds` | the only option that stops a duplicate job while the first is still waiting or running |
| 2026-10-28 | U4 CR-011, Q2 | extend CR-011's owned paths to `repositories/outbox.ts` and `outbox.int.test.ts` (ISS row added) | B: separate relay SQL in `queue/` (two claim paths); C: leave ISS-144 and ISS-185 out (blocks FD-038) | one claim path, and FD-038 is not blocked |
| 2026-10-28 | U4 CR-011, Q3 | a queue that already exists with a different policy fails closed, naming the queue, both policies and `pnpm db:reset` | B: warn and continue; C: delete and re-create automatically (loses jobs) | no silent wrong behaviour, no lost data |
| 2026-10-28 | U4 CR-011, Q4 | align the relay with C15 now: key `<job>:<eventId>` and envelope `{eventId, name, payload}` | B: key only; C: neither | later Units' handlers get the contract they were designed against |
| 2026-10-28 | U4 CR-011, Q5 | apply FD-076's retries now in the queue declaration: 5 with backoff, 3 for `evidence.process`, an explicit caller value wins | B: keep 3 and let each Unit change it | one place sets them, matching the decision |
| 2026-10-27 | U5 CR-006, not decided | R1 (`reviews` SELECT covers `exact_date_enc`), R2 (USAGE on the migrations sequence), R3 (T-205 search refresh lacks reads it needs), R4 (T-410 export lacks reads it needs) are left for you: each changes a data boundary without an FD entry; live grants unchanged; ISS rows added | — | project rule: a data-boundary change needs an FD entry first |
