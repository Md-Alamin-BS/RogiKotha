# Owner review queue — decisions taken during the unattended Construction run

The owner is away (2026-10-27, 8–10 hours). They asked the agent to build the Units one by one, decide by its own recommendation where it would normally stop, keep notes, and show everything at the end for them to check and change. Each row below is a decision or a waiting owner review. Nothing here is final until the owner confirms it.

## Settings changed for this run

| When | What | Why | How to undo |
|---|---|---|---|
| 2026-10-27 | Construction autonomy: **Continue automatically** (owner's answer) | ordinary Unit completion checkpoints approve themselves once verified | ask "review each checkpoint" |
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

## Decisions taken on the owner's behalf

| When | Unit / stage | Decision | Options it had | Why |
|---|---|---|---|---|
| 2026-10-27 | Construction order | follow the engine's dependency levels (CR-004 first; evidence and search slightly earlier than the Bolt plan's list) | reorder the graph file in a Units revision | both orders respect every dependency; no extra gate |
| 2026-10-27 | U7 CR-004, Functional Design Q1 | the language toggle is announced after the switch, in the new language (`Language: English` on `/en`, `ভাষা: বাংলা` on `/bn`) | B: announce at the click, in the old language (likely cut off by the page change) | a screen-reader user actually hears it, in the matching voice; about one hour more |
