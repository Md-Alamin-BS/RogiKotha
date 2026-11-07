# Code summary - U49 `u49-comments` (release 1)

Branch `bolt/u49-comments`, built 2026-11-06 and 2026-11-07 on `main` after U47 (merge commit `b26f848`). Plan: `code-generation-plan.md`. Design: `../functional-design/`.

## What was built

- **Domain** `packages/domain/src/community/`: `limits.ts` (C18 constants), `comment.ts` (`normaliseBody`, `isLive`, body length), `deletion.ts` (`tombstoneOnDelete`), `thread.ts` (`buildThread`, `capRows`). Tests beside each file.
- **Contracts** `packages/contracts/src/schemas/community.ts` (`PostCommentInput`, `DeleteCommentInput`, `GetThreadInput`, public ids only) and `view-models/thread.ts` (`ThreadVM`, `ThreadItemVM`, `CommentVM`).
- **Ports and database** `ports/repositories/community.ts` (`CommunityModuleRepository`), `PgCommunityRepository` in `packages/database/src/repositories/community.ts` (insert, depth-trigger mapping, threadRows with limit 501, delete, live-reply count). No migration. `community.int.test.ts` runs against the test database.
- **Application** `packages/application/src/modules/community/`: `createCommunityModule` with `postComment`, `deleteComment` and `getThread`; `audit.ts` (persona actor, no body text); `comment.posted {commentId, reviewId}` appended to `OutboxPayloads`.
- **Test support** `FakeCommunityModuleRepository`, `aCommentRecord()` builder.
- **Web** `apps/web/src/components/patient/comments/` (`CommentThread`, `CommentDisclaimer`, `CommentThreadView`, `CommentPlaceholder`, `CommentForm`, `CommentActions`, `DeleteCommentButton`); `server/actions/comments.ts` on `runCommand`; new `server/actions/comment-thread.ts`; `community` in `server/container.ts`; six keys in `en.json` and `bn.json` (960 keys).
- **Removed** the demo comment source: `packages/database/src/demo/comments.ts` and `comments.int.test.ts`, the `demo/index.ts` export, the `data.ts` binding, the U47 stand-in `loadCommentThread` (ISS-660).
- **Docs** `docs/implementation/02-data-model.md` § 8, C10 block in `inception/contract-design/contract-summary.md`, amendments and hand-off in T-401 and T-402, ISSUES rows ISS-660 to ISS-678.

## Gate on the final tree (this branch, after the merge of `main`)

| Command | Result |
|---|---|
| `pnpm check` | exit 0: typecheck, lint, boundaries, format, identity, coverage run 303 files, 3343 tests passed plus 2 expected failures, i18n parity 960 keys, both contrast runs, motion check, build |
| `pnpm smoke` | 25 files, 47 tests passed (Step 1 baseline 21 files, 41 tests; U47 merge-time 23 and 44) |
| `pnpm test:int` (Step 29) | 55 files, 382 tests plus 2 expected failures |
| `impeccable detect apps/web/src --no-advisory` (Step 29) | no findings in 365 files |
| `pnpm format:check` | clean |

## Coverage, lines per package (v8)

| Package | Before | After |
|---|---|---|
| web | 94.99% | 95.15% |
| application | 90.05% | 90.50% |
| contracts | 100% | 100% |
| database | 98.09% | 98.07% |
| domain | 99.48% | 99.55% |
| test-support | 95.32% | 95.41% |
| i18n | not listed | 100% |
| total | 95.22% | 95.34% |

"Before" is U47's merge-time record on `main`, the base this branch merged (ISS-661); no figure was re-measured on a separate checkout. Every figure is above the 80% floor and none was lowered (D10). `database` is 0.02 points lower, still far above the floor. Every U49 source file is at 100%, except `modules/community/commands/post-comment.ts` at 97.14%.

## Smoke replacement reason

`packages/database/src/demo/demo-slice.smoke.test.ts` asserted "a comment shows on it" through `demo/comments.ts`. That demo function is gone (BR6.1), so the assertion now inserts and reads through `PgCommunityRepository` (`insert`, then `threadRows`). The suite only grew: `comments.smoke.test.ts` (post, reply, delete the parent, placeholder with the reply) was added.

## Files outside U49's owned paths

Each edit is minimal and recorded (ISS-668, ISS-672, ISS-673, ISS-674):

- `apps/web/src/components/patient/experience/Byline.tsx` (U47): one condition, thread alias on the comment variant.
- `apps/web/src/components/patient/experience/slots.test.tsx`, `apps/web/src/server/actions/review-slots.ts` (U47): the stand-in `loadCommentThread` and its two tests removed.
- `apps/web/src/server/actions/ownership.adversarial.test.ts`: comment lines only.
- `apps/web/src/server/actions/contribution-access.adversarial.int.test.ts` (U9): the comment case and its header comment.
- `apps/web/src/server/container.test.ts`: one stub line in the database mock.
- `packages/database/src/pg-error.ts`: helper `isRaiseWithPrefix` appended.
- `packages/database/src/repositories/{not-implemented,persona-links-allowlist,persona-links-scan.adversarial}.test.ts`, `demo/index.ts`, `apps/web/src/server/data.ts`: the community or `demo/comments.ts` lines.
- `packages/test-support/src/builders/comment.ts`, `fakes/repositories.ts` (one comment), `fakes/repositories-superset.test.ts` (community lines), `fakes/index.ts`.
- `packages/application/src/ports/outbox.ts` and `ports/repositories/index.ts`, `packages/application/src/index.ts`, `packages/domain/src/index.ts`: appended exports.
- `packages/i18n/messages/{en,bn}.json` and `src/keys.ts`: six keys, regenerated.

No path in the diff contains `[`, `]` or `*`, and the bracketed experience route (`experiences/[id]/page.tsx`) was not touched (U47 mounts the slot through `ExperiencePage.tsx`), so `source-manifest.json` lists every path.

## Merge with main

`main` at `1924f24` (U47 review fixes: a publish claims its draft once, ZWNJ and ZWJ allowed in review text through `hasControlOrFormatExceptJoiners`, FD-114, ISS-547 and ISS-548) merged into this branch as `bf4d3d4`, without conflicts.

- No renumbering: U49 adds no `FD-` entry, and its `ISS-660` to `ISS-678` do not overlap main's new rows.
- i18n keys regenerated: unchanged at 961 keys (U49's six plus main's one).
- FD-114 and comments: `PostCommentInput.body` (`packages/contracts/src/schemas/community.ts`) has no control or format character check and reuses no contracts helper, so ZWNJ and ZWJ were already accepted and nothing was switched. A test now pins that a Bengali comment with both joiners (`র` ZWJ `্যাব উদ্` ZWNJ `যাপন`) parses and keeps them (`community.test.ts`). The same absence means a comment also keeps other format characters (for example U+202E or U+200B) that review text refuses; this is reported to the owner, not changed here.
- No merge fix was needed in code; `source-manifest.json` is unchanged, because the merge did not change U49's file list.
- Gate after the merge: `pnpm format:check` clean; `pnpm check` exit 0, 303 files, 3362 tests passed plus 2 expected failures, i18n parity 961 keys; `pnpm smoke` 25 files, 47 tests passed. No timeout re-run was needed.

## `ISS-` ids for the Build and Test record

- Found in U49 and fixed in U49: ISS-660 (stand-in comment source), ISS-662 (test database name), ISS-674 (two red tests at the gate).
- Found in U49 and accepted: ISS-661, ISS-668, ISS-671, ISS-672, ISS-673.
- Found in U49 and open: ISS-663, ISS-664 (T-105), ISS-665 (owner confirms), ISS-666, ISS-667, ISS-675, ISS-678 (U50), ISS-669 (owner), ISS-670 (U11), ISS-676 (U50, Bengali copy review), ISS-677 (owner's phase-gate walk).
- No open `S1` or `S2` row belongs to U49.

## Acceptance

Expected against observed for every release-1 row of T-401 and T-402: plan Step 29. Two rows are not automated: FD-046 passes by inspection (ISS-675), and the server round trip and reduced-motion journey await the owner's walk (ISS-677). Release-2 rows (reactions, mentions, edit, blocks, discussion email, deletion step) are deferred under FD-105.
