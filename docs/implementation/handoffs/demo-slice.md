# Handoff — demo slice (FD-099), how to run the demo

| Field | Value |
|---|---|
| State | Code complete: plan Steps 1–14 (`f31342a`) plus the 2026-11-01 additions (FD-100, FD-101). Code Generation waits for the owner's approval; Build and Test, the 3 local deployment stages and the squash merge are still to run |
| Branch · commit | `bolt/demo-slice` · start `acd6bf5`; pushed to `origin/bolt/demo-slice`, NOT merged into `main` |
| AI-DLC intent | `261030-demo-slice` (express) |
| Record | `aidlc/spaces/default/intents/261030-demo-slice/construction/code-generation/code-summary.md` |

## Start the demo

You need Docker running and the repo-root `.env` (copied from `infra/compose/.env.example`, with
`APP_ENCRYPTION_KEY` and `BETTER_AUTH_SECRET` filled in).

```bash
pnpm infra:up      # PostgreSQL 18, Mailpit, ClamAV. ClamAV's first start downloads its signatures (several minutes)
pnpm db:reset      # empty, freshly migrated dev database
pnpm db:seed       # the synthetic corpus and demo accounts
pnpm demo          # migrate, seed, then web (http://localhost:3000) and worker in dev mode
```

To serve the production build instead of dev mode:

```bash
pnpm --filter @rogikotha/web build
pnpm --filter @rogikotha/web start    # http://localhost:3000
```

`pnpm demo:reset` clears everything a demo run (or `demo.spec.ts`) added. Uploads read "Ready" only
while ClamAV is up; without it they stay "Scan pending" on purpose (fail closed, ISS-359).

## Demo logins

Every seeded account uses the same synthetic password.

| Account | Email | Password |
|---|---|---|
| Patient `abba_of_two` | `abba_of_two@demo.rogikotha.local` | `demo-pass-2026!` |
| Patient `ctg_reader` | `ctg_reader@demo.rogikotha.local` | `demo-pass-2026!` |

A new account can also be registered on the spot; it is active and signed in at once.

## Click path (works in `/en` and `/bn`; switch with the language control)

1. Open `/en`, then **Register** with a new email, username and display name.
2. The masthead now shows the account. Open **/me** and change the display name.
3. Open **Doctors**, then a doctor: the page shows "Registration not verified".
4. **Write about this doctor**, fill in the quick review, tick the attestation and publish.
5. On the experience page, **Edit**, change the text, save: the page shows "Edited".
6. Attach a JPEG or PNG: it shows "Ready" after the scan, and the public page reads
   "Documents attached — not medically validated" with the file count.
7. **Sign out**, sign in as `abba_of_two`, open the same experience, post a comment, then a reply.
8. Switch to `bn` at any step: every string, and the numerals, follow the language.
9. **Write** again and choose **Add a doctor who isn't listed**: type a new name, publish, then open
   **Doctors**: the new doctor shows "Registration not verified" and "Added by a member — not
   confirmed" (FD-100).
10. Open **Hospitals & clinics** and a branch, then **Health topics** and a topic (FD-101).

## Where the work stands (2026-11-01)

- The owner tested the demo on 2026-11-01. That led to three changes: the write-form fix (ISS-392),
  "Add a doctor who isn't listed" (FD-100, ISS-393 to ISS-399) and the read-only Hospitals & clinics
  and Health topics pages (FD-101, ISS-400).
- An AI-DLC reviewer read the add-a-doctor change and returned NOT-READY with two S2 findings
  (ISS-396, ISS-397). Both are fixed and tested. ISS-398 is the owner's accepted risk.
- Code Generation waits for the owner at its approval gate (recorded on 2026-11-01 with `aidlc engine orchestrate report --stage code-generation --result awaiting-approval`). The express scope runs no stage reviewer, so the review requested on 2026-10-30 is not needed.
- All 14 plan steps are done and ticked. If a resume ever shows the boxes in
  `code-generation-plan.md` as `[ ]` (the engine clears them when a clone starts a build it has no
  receipt for), take the file back from git; never rebuild.
- The branch is on `origin/bolt/demo-slice` and is NOT merged into `main`. `main` has no commit the
  branch lacks, so the later squash merge cannot conflict while `main` stays put. Merge only after the
  Code Generation gate and Build and Test are approved.
- The AI-DLC intent cursor (`aidlc/spaces/default/intents/active-intent`) is gitignored and per
  machine. On another clone run `/aidlc intent switch 261030-demo-slice` before `/aidlc --resume`.

## How it was verified

`pnpm check` and `pnpm smoke` green; `pnpm --filter @rogikotha/web smoke:e2e` 17 of 17, with
`apps/web/e2e/smoke/demo.spec.ts` walking click-path steps 1 to 10 in both languages (steps 9 and 10
added on 2026-11-01). Details, adversarial results and counts are in the code summary.

## Fragile or surprising

- On Docker Desktop for Windows, `localhost` resolved to `::1` and clamd closed the connection
  silently; the web app uses `127.0.0.1` (ISS-359).
- `reset-guard.int.test.ts` hung once inside a full `pnpm check` and passed on re-run (ISS-381).
- The slice calls `packages/database/src/demo/*` straight from server actions; the full Units
  replace it (ISS-391).

## Issues logged

ISS-324 to ISS-400, all `Found in demo-slice`. None is an open S1 or S2. ISS-330 (username lookup)
and ISS-384 (disabled Better Auth HTTP paths) wait for the owner's decision.
