# Handoff, 2026-11-08: release 1, nine Units merged, U50 release check running

> Written on lelin-pc. Start here, then read [../handoff-2026-11-06/README.md](../handoff-2026-11-06/README.md)
> for the standing owner instructions (they still hold) and the merge procedure.

## Owner instructions in force

Unchanged from the 2026-11-06 handoff: approve gates with the recommended option under the owner's
delegation of 2026-11-04, ask only when a permission is denied or a hook blocks every route (then
give one `!` command), build in parallel worktrees, no GitHub Actions (FD-102), no tool or model
identity anywhere, never `git reset --hard` / `checkout --` / `clean` on a dirty tree. On 2026-11-07
the owner asked for the demo to be finished by 2026-11-08 or 2026-11-09.

## Where things stand

All nine feature Units of the release-1 plan (FD-105) are squash-merged on `main`, reviewed by the
AI-DLC reviewer (all READY, advisory) and closed in the engine. Each review's findings were fixed on
a small `bolt/<unit>-review-fixes` branch and squash-merged.

| Unit | On `main` | Review fixes | Notes |
|---|---|---|---|
| U9, U11, U46, U20 | before 2026-11-07 | done | merged on the other device |
| U47 reviews | `f3eec20` | `1924f24` (FD-114: Bengali ZWNJ/ZWJ allowed) | |
| U49 comments | `f065c1b` | `efcac8c` (FD-115: comment body check) | |
| U22 T-302 corrections | `16fd56b` | `995e3c6` | |
| U48 evidence (high risk) | `a9a2ffe` | `1110c4c` | owner sign-off queued |
| U41 T-502 security (high risk) | `a3d9a56` | `729aaa2` (proxy checks every path; live probe) | owner sign-off and FD-116 queued |
| **U50 release check** | in progress on `bolt/u50-release-check` | | engine holds its run-stage |

U50 has written all its specs and documents (plan steps 1–33, 35–40, 46–50). The final run (Steps 34,
41–45, 51, 52: rebase, browser suite, fixes, two clean full runs, demo-code deletions, gate, records)
was started on lelin-pc on 2026-11-08. After it: merge `main` into U50 once more (it predates
`729aaa2`), squash, gate on `main`, review U50, close it in the engine, then the Build and Test stage.

## Waiting for the owner

`docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`, "Owner reviews waiting": the owner's own written sign-off
for U48 and U41 (high risk), FD-116, the Bengali copy review (FD-042), and the earlier rows. None of
these blocks the build; they block the phase gate.

## Machine notes (lelin-pc)

- Worktrees `D:\git_repos\rk-<unit>`, test databases `rogikotha_test_w4..w9` (owner `rk_app`).
- The intent cursor had to be switched by the owner: `! aidlc engine intent switch aidlc-adoption`.
- Under heavy parallel load ESLint can crash with exit 3221225477 (access violation) or 139; re-run
  once before trusting a red `pnpm check`.
