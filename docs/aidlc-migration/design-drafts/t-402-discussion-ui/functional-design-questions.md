# Functional Design questions — U31 `t-402-discussion-ui`

Drafted on 2026-10-29, ahead of the stage, against `main` at `14c21a9` (T-010 merged) and the branch `bolt/t-011-patient-design-and-motion-system` (T-011 phase A: `motion.css`, `Reveal`, `RouteTransition`, `PublishTick`). It is finalised into the AI-DLC record and reviewed when the workflow reaches this Unit's Functional Design stage.

Every open point below is decided by its recommended option (A), under the owner's no-questions instruction of 2026-10-29. Each decision is listed in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when this draft is finalised. Question 3 narrows a requirement, so `functional-spec.md` § 12 carries the FD entry the build appends before code. § 13 of the same file lists what changes under each other option.

## Context

- Unit U31 (kind `ui`, size M, not high risk) delivers T-402 (`docs/implementation/tasks/T-402-discussion-ui.md`, with its FD-091 amendment) for US8.1 (AC8.1.1–AC8.1.6) and US8.2 (AC8.2.1–AC8.2.6) (`unit-of-work-story-map.md`). It is Bolt 31, "people can talk about an experience" (`bolt-plan.md`). It depends on U30 T-401, U27 T-307, U9 T-102, U3 T-010 and U45 T-011 (`unit-of-work-dependency.md`). U42 T-503 depends on it. U32 T-403 plugs its report sheet into this Unit's report trigger.
- Inputs read: `unit-of-work.md` (U31), `unit-of-work-dependency.md`, `requirements.md` (FR22, FR72–FR75, FR77, FR78, FR95, NFR4, NFR6, NFR7, NFR13), `stories.md` (US8.1, US8.2, AC2.4.3–AC2.4.5, AC3.1.4, AC3.3.2), `contract-summary.md` (C5, C9, C10, the privacy rules), `docs/status/decision-log.md` (FD-009, FD-015, FD-017, FD-046, FD-062, FD-075, FD-086, FD-091, FD-093, FD-094), `01-conventions.md` §2–§8, `02-data-model.md` §2 and §8, `03-routes-and-contracts.md` §1, §2 and §4, `05-demo-storyboard.md` (seeded accounts, step 15), `tools/smoke.mjs` (lines 73–200), `ISSUES.md` (ISS-083, ISS-261, ISS-294), `OWNER-REVIEW-QUEUE.md`.
- Upstream drafts read: none of these Units is built yet, so their drafts are the interface. `t-307-experience-page-and-index` (rules and questions; its spec is still being written): `DiscussionSlot`, `ActionsRow`, BR2.5, BR5.1, BR5.2 and BR6.1. `t-102-patient-auth-screens`: `useAuthGate().guard`, `AuthGateProvider`, the `Viewer`, BR10.3–BR10.6. `t-202-doctor-index-and-profile`: `Byline` with `variant: 'comment'` and `Badge`. `t-104-identity-module`: the one `BylineVM`, the thread alias and "Former member". `t-011-patient-design-and-motion-system`: tokens, the press list, `Reveal`, the static set (BR7.1–BR7.4). `t-101-better-auth-adapter`: `getActor`, the container, the server-action pattern. `t-302-review-changes-and-tombstones`: `TombstoneVM.threadSlot`. **U30 T-401 has no draft**, so this design reads T-401's task file and C10 and states in `entities.md` the `ThreadVM` it needs (a cross-Unit change, `functional-spec.md` § 11).
- Prototype read: `ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js` at its current line numbers (the task's numbers are stale): the discussion block in `renderAccount` (970–994), `bookmarks`/`isBookmarked`/`reactBtn` (1034–1044), `ownComment`/`commentBody`/`commentHtml`/`replyBox` (1078–1156), the click handlers (2975–3060). Also `ui-design-prototype/shared/rogikotha-data.js` comments k1–k30.

## What the code and data show that the task file does not

1. **The thread-level warning key is the wrong text.** Step 1 says the thread-level warning uses `experience.dangerWarning`. That key reads "This comment describes changing or stopping treatment … A moderator has been asked to review it." It belongs to one flagged comment. The prototype's thread-level advice is `experience.commentHint` ("This is not the place for medical instructions"), shown only inside the composer, so a signed-out reader never sees it (Question 1).
2. **Comments take Like and Dislike.** "Not in scope" keeps the prototype's like-only comment button. FD-062 is binding and T-401's amendment says "T-402 renders both buttons". This is settled, not a question.
3. **Nobody builds the bookmark command.** Step 7 calls "T-302's `review.bookmark` command". Neither T-302's task nor its draft has one, `03-routes-and-contracts.md` §4 lists none, and the stubs `addBookmark`, `removeBookmark` and `listBookmarks` on `PgAccountRepository` name T-409 (Bolt 37, six Bolts after this one) (Question 4).
4. **"Public reaction lists" have no contract.** FR77 and AC8.2.3 talk about a public list of who reacted. C10 and 03 §4 say `community.reactionsOf` returns counts only (Question 3).
5. **The flagged-comment rule disagrees in three places.** `02-data-model.md` §8 derives `dangerous` from a `hidden_pending_review` state. C10 says "a comment is flagged when it has an open case with reason dangerous". FR75 says dangerous instructions "remain visible with a strong warning". The prototype shows k3 publicly with the red callout. Step 1 shows the callout only to the author or staff (Question 2).
6. **Internal ids would reach the browser.** T-401's inputs and `ThreadVM` carry `reviewId`. T-307 and T-301 F22 keep internal ids out of the page, and the slot carries the public id only (Question 5).
7. **Prefilling an alias would mention a stranger.** Step 3 prefills `@<alias>` for an anonymous author. The alias looks like `patient-xxxx`, and T-401's `parseMentions` reads `@` followed by `[a-z0-9_]{3,24}`. It would mention a user called `patient` if one exists. Named authors would get `@Dr. Farhana Rahman`, which is not a mention at all (Question 7).
8. **The list reveal does not fit a thread.** T-011's `Reveal` animates children 1–6 of a list when they are inserted. A comment posted to a thread that already has six items appears without motion. Wrapping the whole thread would make every comment fade in on arrival (Question 11).
9. **Comment actions are too small and do not wrap.** `.link-btn` has no `min-height`, and `.comment-actions` is a flex row without wrapping. With Like, Dislike, Reply, Edit, Delete and Report, it overflows at 360 px. The touch targets miss FD-091's 44 px (Question 17).
10. **A tombstoned review still shows its thread.** T-302 and T-307 keep the discussion under a tombstone. T-401's `comment.post` requires a `published` review, so a composer there would only produce refusals (Question 14).
11. **Storyboard step 15 cannot be walked as written.** It deletes k8 and k10 as `rafi_c`, but both are `shirin_88`'s comments (the prototype's own note says so), so `rafi_c` sees no Delete button on them. ISS-261 adds that `rafi_c` has no persona or content in the seed (Question 16).
12. **The body limit has two values.** The contracts stub has `COMMENT_BODY_MAX = 4000`, and T-401 step 2 says 1–2000 characters (Question 19).
13. **The error keys already exist.** `errors.community.replyDepth`, `errors.community.blocked`, `errors.community.mentionAnonymous` and `errors.common.rateLimited` (with `{minutes}`) are in both dictionaries (781 keys). T-401 step 8 would add them again.
14. **The byline is T-202's.** Step 2 says "reuse T-307's `Byline`". T-307's Question 1 A uses T-202's one `Byline` (`components/patient/shared/`), which has `variant: 'comment'`.
15. **The thread is server-rendered after every write.** The prototype keeps `state.commentEdits`, `state.commentDeleted` and `state.commentLikes` in the browser. Here the server is the source of truth. Each action revalidates the route, and the thread re-renders from `ThreadVM` (task step 5). Only reaction counts are optimistic while the action runs.

## Settled before this stage

- **The look follows FD-091.** T-011's tokens, classes and motion hooks apply. Page rules go in T-402's own appended section of `patient.css`. No token or motion rule is added. The prototype is the source of truth for content and behaviour.
- **Comments take Like and Dislike, as reviews do** (FD-062). There is no emergency-language banner and no content check on comment text (FD-046, FD-009).
- **The gate is T-102's.** Every contribution control goes through `guard(fn)`. The server refuses whatever the UI did (T-102 BR10.6).
- **The byline is T-202's `Byline` with `variant: 'comment'`, on T-104's `BylineVM`** (thread surface). An anonymous author shows the thread alias without a link. A de-identified persona reads "Former member" (the owner's T-104 Q15 B).
- **The report sheet and `report.file` are T-403's.** This Unit renders the trigger (`data-report="comment:<publicId>"`).
- **Boundaries are T-010's** (FD-093). Components import server actions only. Adapters are built only in `server/container.ts`. Nothing in `apps/*` imports `test-support`.
- **The 80% line floor applies to `apps/web`**, with untested files counted. `pnpm check` (eleven steps after T-011) and CI must be green on the Bolt head.
- **There is no public anonymity caveat** (the owner's answer; T-307 BR2.7).
- **Counts only, with no percentages** (the owner's T-202 Q1 B). Reaction counts are plain integers in the active language's numerals.

## Settled in this design without a question

- Components live in `components/patient/discussion/`, beside T-202's `shared/` and T-307's `experience/`. The task lists them flat under `components/patient/`. The names are kept.
- The thread renders in the order T-401's query returns: top level by `created_at` ascending, replies nested under their parent.
- The heading count is the number of visible comments and replies, without tombstones, printed through `formatNumber`. It is a real count, so a thread with none prints the number 0 and the `mine.empty` line, as the prototype does.
- `experience.replyLevel` stays under the thread, and `experience.providerNote` stays under the heading (T-307's `DiscussionSlot`).
- `review.reactionNote` stays under the review's actions row. `experience.bookmarkNote` follows it, as task step 7 asks.
- Deleting a comment shows the result at once, with no motion (task step 11).
- No count animates. Reaction and bookmark buttons give press feedback only (AC2.4.5).

## Question 1 — the persistent advice warning

AC8.1.2 needs a persistent, non-modal medical-advice warning wherever the comment area shows. The task names `experience.dangerWarning`, whose text describes one flagged comment (fact 1). The prototype's `experience.commentHint` is the general warning, but it sits inside the composer, so a signed-out reader never sees it. Which warning shows, and where?

A. **`experience.commentHint` in a `div.callout.warn` at the top of the discussion, for every viewer, signed in or not, and on a tombstone's thread too. It is marked `data-static="notice"`, so it never moves, and it is never inside a `Reveal`. The composer does not repeat it** (recommended). The text already discourages unqualified advice (FD-009), and no new key is needed. `experience.dangerWarning` stays on flagged comments (Question 2).
B. **`experience.dangerWarning` at thread level, as the task says.** It tells every reader that a moderator is reviewing "this comment" when none is, which is false (S2).
C. **A new key with new wording.** It adds a Bengali string for the owner's review (FD-042), with no gain over A.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2 — how a flagged comment shows

FR75 keeps dangerous instructions visible with a strong warning. C10's `ModerationSignals.dangerousFlags` flags a comment with an open case whose reason is `dangerous`. The data model ties the flag to `hidden_pending_review`. The task shows the callout only to the author or staff (fact 5). What does the thread show?

A. **`CommentVM.dangerFlag` comes from `ModerationSignals` (an open case with reason `dangerous`). Every viewer sees a flagged, visible comment as `article.comment.flagged` with `div.callout.danger` (`b` `report.dangerous` + `experience.dangerWarning`) above the body, as the prototype does. A comment that is `hidden_pending_review` (five reports, or a critical reason) is not in the public thread. Its author alone sees it, with a `p.note` `experience.commentPending` (new key), and no reactions or Reply. The callout is `data-static="notice"`** (recommended). It matches FR75, FD-017, C10 and the prototype. T-401 adds the two fields (`functional-spec.md` § 11). T-403's port is unchanged.
B. **Show the callout only on `hidden_pending_review` comments, to the author or staff (the task text).** Readers would see the dangerous advice with no warning until the fifth report, against FR75 (S1 for a health product).
C. **Hide a flagged comment from everyone at once.** That is a classifier-free auto-hide on the first report, which FD-017 rejects for this reason.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3 — "see who reacted"

FR77 says a confirmed account may "view public reaction lists", and AC8.2.3 tests that such a list on an anonymous thread shows only the alias. C10 and 03 §4 say `community.reactionsOf` returns counts only (fact 4). Does this Unit build a list of who reacted?

A. **Counts only in release 1: Like and Dislike counts and the viewer's own pressed state, with no list of reactors. An FD entry narrows FR77 and AC8.2.3's list half** (recommended; `functional-spec.md` § 12). Without a list, nothing can link an anonymous thread's reactions to a profile, so FD-015 holds by construction. The contracts need no change, and a list can be added later as its own decision. AC8.2.4's public-activity half stays T-409's.
B. **Build a "who reacted" sheet** (a new T-401 query `community.reactorsOf` returning thread-surface `BylineVM`s, anonymous-thread reactions shown under the alias, reactions of other anonymous personas left out). It adds a C10 change, a privacy-sensitive query, a sheet and about four keys. It is the riskiest place for an anonymity leak.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4 — who builds Save (bookmarks)

The bookmark button needs a command and the viewer's saved state. No Unit owns either: T-302 has none, and the repository stubs name T-409, which is Bolt 37 (fact 3). Who builds them?

A. **This Unit builds the write side and the state read: `bookmark.set {reviewPublicId, saved}` and `bookmark.stateOf {reviewPublicId}` in `modules/account`, with `addBookmark`, `removeBookmark` and a new `hasBookmark` on `PgAccountRepository` (stub owner tags move from T-409 to T-402), a `ReviewLookup` port the account module declares and Review implements, and `BookmarkSetInput` in a new `contracts/src/schemas/bookmark.ts`. T-409 builds only `listBookmarks` for `/saved`** (recommended). Save works at the Bolt 31 demo. Bookmarks stay private: no audit, no outbox, never projected (02 §2). T-409 comes later, so the two Units never touch `repositories/account.ts` in the same swarm batch. 03 §4 and C5 gain the two operations (an additive contract change, no FD).
B. **Add a dependency edge from T-402 to T-409.** Save waits for Bolt 37, and the whole discussion Bolt moves after T-404.
C. **Render Save as unavailable (`aria-disabled`, `TODO(T-409)`) and let T-409 wire it.** T-409 would then edit this Unit's `BookmarkButton`, and storyboard step 15's "Bookmark" fails at this Bolt's demo.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5 — which ids cross the browser

T-401's inputs take `reviewId`, `parentId` and `commentId`, and `ThreadVM` carries `reviewId` (fact 6). The page and its slot carry public ids only. What do the server actions receive?

A. **Public ids only. T-401's schemas take `reviewPublicId`, `parentPublicId` and `commentPublicId`, and `SetReactionInput.targetId` is the target's public id, validated with `isPublicId`. Each command resolves them inside its transaction. `ThreadVM` carries `reviewPublicId`** (recommended). No internal uuid reaches the DOM or a form field. A forged id resolves to `not_found` inside the command, and authorization stays in one place.
B. **The actions resolve public ids first through a lookup query, then call the commands with internal ids.** That makes two round trips and a check-then-act gap, and the lookup query is a second way in.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6 — where the discussion data is loaded

`Discussion` needs the thread, the review's reaction counts and the viewer's saved state. Under the T-010 boundaries a component may import server actions and nothing else under `server/`.

A. **The experience route loads it. A `loadDiscussion(publicId, actor)` helper in the route folder (`app/[locale]/(patient)/experiences/[publicId]/discussion-data.ts`, element `web`) calls `community.thread`, `community.reactionsOf` and `bookmark.stateOf` in parallel and returns a `DiscussionVM`. The page passes it down to `Discussion` through T-307's slot** (recommended). This is one hunk in T-307's `page.tsx` and one in its `ExperiencePage`, both noted in the hand-off. The reads stay plain server calls, not public action endpoints.
B. **`Discussion` (a server component) awaits a read function exported from `server/actions/community.ts`.** It works, but every export of a `'use server'` file is a public POST endpoint, so the reads become callable from outside.
C. **Client fetch after load.** The page would flash and need loading states, and it fails without JavaScript.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7 — the reply prefill

The prototype prefills `@<author>` so the mention path is exercised (fact 7). What does the reply box start with?

A. **`@<profileUsername> ` for named and pseudonymous authors (from `BylineVM.profileUsername`), and an empty box for anonymous and "Former member" authors. Every reply box shows "Replying to <name as the byline shows it>"** (recommended). Smoke's "prefilled with mention" holds on every seeded parent it clicks (k1 and k8 are pseudonymous). An alias never becomes a mention, so `community.mention_anonymous` is never provoked by the UI, and no stranger is mentioned.
B. **`@<display name>` for everyone, as the prototype does.** It produces `@Dr. Farhana Rahman` (not a mention) and `@patient-xxxx` (a possible stranger).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8 — the edited marker

AC8.1.3 asks for an Edited timestamp. The prototype and smoke show "(edited)".

A. **"(edited)" (`experience.edited` in brackets), then the edit date in a `<time dateTime={editedAt}>` through `formatDate`** (recommended). Smoke's `/\(edited\)/` and the AC both hold, and no key is added.
B. **"(edited)" only.** It is the prototype as is, but it misses the AC's timestamp.
C. **T-302's `experience.editedOn` ("Edited {date}").** It breaks the smoke assertion.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9 — the posted time

The prototype prints a month and year ("June 2026"). The task says `formatRelative`.

A. **`formatRelative` for posts under 7 days old ("2 hours ago"), `formatDate` after that, always inside `<time dateTime={postedAt}>`. The reference time is the request time on the server** (recommended). A fresh post reads as fresh, an old one reads as a date, and numerals follow the language.
B. **Month and year always.** A comment posted a minute ago reads like one from weeks ago.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10 — external links in comment text

FR74 asks for warned external links. T-401 flags `hasExternalLink`, and its checklist says no link is followed or fetched server-side.

A. **Comment text is plain text and never auto-linked. When `hasExternalLink` is true, a `p.note` follows the body with the warning `experience.linkWarning` (a decorative glyph marked `aria-hidden`). It is `data-static="notice"`** (recommended). No user-supplied URL becomes an anchor, so no `javascript:` or look-alike link can be clicked from the page, and the URL stays readable to copy. It is the narrower, reversible option.
B. **Auto-link `http(s)` URLs** with `rel="ugc nofollow noopener noreferrer"`, `target="_blank"` and the warning. That needs a URL parser in the component, a scheme allowlist, and tests against spoofed text.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11 — how a new comment appears

Task step 11 says a new comment appears with T-011's reveal, one item and no stagger. T-011's `Reveal` animates the first six children of a list as they are inserted (fact 8).

A. **After a successful post, the client thread state remembers the new comment's `publicId`. When that comment renders, its `article` is wrapped in a one-child `Reveal as="div"`, so it fades and rises once (child 1, no stagger). Comments with an external link or a danger flag are not wrapped, because a static notice must never sit inside a moving element (T-011 BR7.4)** (recommended). It uses only T-011's existing hook and adds no motion rule. Reduced motion turns it off through T-011.
B. **Wrap the whole thread in `Reveal`.** On arrival, up to six comments stagger in, which competes with the route transition. A comment posted after the sixth item still does not move.
C. **Ask T-011 for a new single-entry hook.** It opens an ISSUES row and waits on T-011 for something A already gets.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12 — how the reply box and editor open

The task asks for "a short fade" when the reply box or inline editor opens. T-011 offers no fade-only hook for inline regions.

A. **Wrap the opened box in a one-child `Reveal as="div"` (a fade with a small rise, `--dur-base`). Closing is instant. Focus moves to the textarea, with the caret at the end for a reply** (recommended). The task's "fade" becomes T-011's fade-and-rise. That is recorded for the look review, and reduced motion leaves no movement.
B. **Ask T-011 for a fade-only hook.** It opens an ISSUES row and adds a cross-Unit wait.
C. **No motion.**
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13 — Report before T-403 lands

T-403 (Bolt 34) supplies the report sheet. This Unit merges first.

A. **A `ReportButton` (client) reads an optional `ReportSheetContext` from `discussion/report-context.tsx`. Signed-out and unverified viewers get the gate. A confirmed viewer gets `aria-disabled="true"` and nothing happens (`TODO(T-403)`), until T-403 mounts its provider in the experience page and the button opens the sheet. T-403 can use the same button for the review-level Report** (recommended). This matches T-307's Question 5 A. The trigger is on every comment from day one, and T-403 edits no file of this Unit.
B. **No Report button until T-403.** AC8.1.2's "reachable from each comment" fails in between.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14 — the thread under a tombstoned review

T-307 keeps the discussion slot on a tombstone, and T-401 refuses new comments on a review that is not `published` (fact 10).

A. **Read-only: `ThreadVM.open` is false for a tombstoned review. There is then no composer, no Reply and no gate button, and an author's Edit, Delete, the reactions and Report stay** (recommended). The page offers only what the server accepts. Readers can still flag unsafe advice.
B. **Fully interactive.** Every post would end in an error message.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15 — confirming a delete

The prototype deletes at once. A comment without replies is removed outright and cannot be restored.

A. **Delete at once, as the prototype does. The thread re-renders, and the live region announces `experience.commentDeleted`** (recommended). The behaviour stays the prototype's (FD-091), with one key added.
B. **An inline "Delete this comment? Delete / Keep" step.** It is safer against a slip, but it adds two keys and changes the prototype's behaviour. If the owner wants it, it can be added later.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 16 — storyboard step 15

Step 15 deletes k8 and k10 as `rafi_c`, but they are `shirin_88`'s comments. ISS-261 (S2, open) also notes that `rafi_c` has no content (fact 11).

A. **The design follows the prototype data: as `shirin_88`, delete k10 (gone) and k8 (tombstone, with k9 kept). As any other confirmed account (`rafi_c` once ISS-261 is ruled), post, reply to k8, edit and delete that account's own new comment, react and bookmark. A new ISSUES row (S2, docs/storyboard, found in U31) asks T-504 to correct step 15 together with ISS-261. The acceptance row "Server round-trip" is walked that way** (recommended). No seed data changes, and FD-039 and FD-089 stand.
B. **Give k8 and k10 to `rafi_c` in the seed.** It changes prototype data and the storyboard's `shirin_88` thread (step 26 keeps "k8's thread" under r1's tombstone).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 17 — comment actions at 360 px

There can be up to six actions in a row (fact 9).

A. **In T-402's own section of `patient.css`: `.comment-actions` wraps (`flex-wrap: wrap`, gap `var(--space-2)` by `var(--space-4)`), and `.comment-actions .link-btn` gets `min-block-size: var(--target)` and `display: inline-flex; align-items: center`. Each action carries `data-press` (`.link-btn` is not in T-011's press list)** (recommended). Every target is 44 px, nothing overflows, and only tokens are used. No T-011 file changes.
B. **Ask T-011 to restyle `.link-btn` for every page.** It is broader than needed and waits on an ISSUES row.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 18 — posting without JavaScript

A. **The composer, reply box and editor are real `<form>`s with server actions through `useActionState`, so they post without JavaScript. The page re-renders with the result. With JavaScript, the form resets after success and focus returns to the new comment's heading line** (recommended). Delete, reactions and Save are `<form>` buttons too. This matches T-102's form wrappers and progressive enhancement.
B. **Buttons with click handlers only.** Nothing works before hydration.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 19 — the body limit

The contracts stub says 4000 characters, and T-401 says 1–2000 (fact 12).

A. **T-401's 2000 wins. T-401 changes `COMMENT_BODY_MAX` to 2000 and exports it. Every textarea sets `maxLength={COMMENT_BODY_MAX}` and `required`. An empty or whitespace-only body is refused in the browser (focus stays) and by the schema (`errors.common.validation`). No character counter is shown** (recommended). There is one constant and no new key.
B. **Keep 4000.** T-401's task text and tests would disagree with the contract.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 20 — the composer for an unconfirmed account

Task step 1 says the composer is "disabled with `auth.gate.verifyToAct`". T-102's `guard` opens the unverified sheet.

A. **Signed out: in place of the composer, a `button.btn.small` labelled `auth.gate.title` calls `guard` and opens the sign-in sheet. Unconfirmed: the textarea renders disabled, a `p.note` shows `auth.gate.verifyToAct`, and Post stays enabled as a gate button that opens the confirm-email sheet. Reply, reactions, Save and Report go through `guard` the same way** (recommended). There is no dead control: every press either acts or explains why not (auth spec §3.7), and smoke's "signed-out reaction click opens the gate sheet" holds.
B. **Hide the composer for unconfirmed accounts.** The holder cannot tell why there is no box.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Raised for the owner, not decided in this stage

- **R1 — Question 3 narrows FR77.** The FD entry is in `functional-spec.md` § 12. The build appends it to `docs/status/decision-log.md` before code.
- **R2 — Storyboard step 15** (Question 16) goes with ISS-261, which still waits for the owner's ruling.
- **R3 — Four new Bengali strings** (`experience.commentPending`, `experience.commentPosted`, `experience.commentSaved`, `experience.commentDeleted`) wait for the owner's bilingual review (FD-042).
