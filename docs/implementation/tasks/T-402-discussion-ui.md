# T-402 — Discussion UI on the experience page

| Field | Value |
|---|---|
| Story | STORY-COM-001, STORY-COM-002 |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-401 (`community.*` commands, `ThreadVM`), T-307 (ExperiencePage with a `<Discussion/>` slot), T-102 (gate sheet + `getActor`), T-011 (design and motion system, FD-091) |
| Parallel-safe with | T-403 (report sheet — you render the trigger, T-403 supplies `<ReportSheet/>`; stub with a placeholder prop until it lands), T-409, T-405 |

## Amendments — patient redesign and motion (FD-091)

This decision is binding and overrides the text below where they differ.

- **FD-091 — patient redesign and motion** — Pages are built on the T-011 tokens, classes and motion components (`RouteTransition`, `Reveal`), not on the concept 04b styles. The prototype stays the source of truth for content, data, structure and behaviour (copy, fields, states, flows, hard-rule wording), but not for the look. The project rule of 2026-10-27 (`project.md`, Code Style) overrides the team.md verbatim-CSS rule for patient pages; verbatim port applies only to the staff console. Page-specific styles go in this Unit's own section of `patient.css` (append-only, each rule marked `/* added: T-402 reason */`) and use only T-011 tokens and class names. Tokens, shell styles and motion rules belong to T-011; a Unit that needs a new token asks for it through an ISSUES.md row instead of editing `tokens.css` or `motion.css`. Prototype class names are kept only where T-011 kept them. Changes: Depends on, Read first, Steps intro, the motion step and the acceptance checks.

## Amendments — release 1 (FD-105, built by U49)

These decisions are binding and override the text below where they differ. Release 1 builds this task inside Unit U49 `u49-comments`, together with the comment part of T-401 (record: `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u49-comments/`).

- **FD-105 — what release 1 builds** — the `<CommentThread reviewPublicId>` slot that U47 mounts on the experience page: the disclaimer, the thread with one reply level and a deleted-comment placeholder, the composer and reply form, and delete with a confirm step. No like, dislike, report, mention or edit control (reactions, T-403 and T-405 are release 2); the report trigger and the `<ReportSheet/>` stub are not built, so the hard-rule row "report route reachable from every comment" is deferred.
- **Server access** — the slot reads through `apps/web/src/server/actions/comment-thread.ts` (`loadThread`), because components may reach the server only through `server/actions`.
- **Gate** — signed-out and unconfirmed readers see U9's `ContributionGatePanel` instead of the composer. A forged post or delete from a signed-out or restricted caller gets the `forbidden` state, not a sign-in redirect (ISS-671).
- **Copy** — six new keys in both locales (`disclaimer.comments`, `experience.noComments`, `experience.discussionClosed`, `experience.threadTruncated`, `experience.deleteConfirm`, `experience.deleteCancel`); the Bengali copy awaits the owner's review at U50 (ISS-676).
- **Styles** — U49 adds no CSS class; it reuses the existing patient classes.
- **Walks** — the storyboard step 15 round trip and the reduced-motion journey are left to the owner's phase-gate walk (ISS-677).

## Goal

Port the prototype's comment thread, reply box, inline editor, delete/tombstone, reactions, bookmark button, persistent advice warning and link warning into React components under the experience page, wired to the T-401 server actions, with the signed-out/unverified gates from the auth spec.

## Read first

1. `docs/implementation/01-conventions.md` §6–§8 (i18n, CSS port, React port rules; FD-091: for patient pages the T-011 rule replaces the CSS port rules)
2. `docs/implementation/03-routes-and-contracts.md` §1 (`/experiences/{publicId}`), §4 "community"
3. `docs/design/auth-screens-spec.md` §3.7 (gates on contribution actions)
4. Prototype, read fully with `sed -n`: `app.js` 937–947 (`bookmarks`, `isBookmarked`, `reactBtn`), 981–1059 (`ownComment`, `commentBody`, `commentHtml`, `replyBox`), the discussion block inside `renderAccount` 804–936 (search for `experience.discussion`, `experience.commentBox`, `experience.dangerWarning`, `data-bookmark`, `data-react="account:`), and the click handlers 2554–2635. `styles.css`: `.comment`, `.comment-head`, `.comment-actions`, `.comment-replies`, `.composer-box`, `.reply-box`, `.mention`, `.tombstone`, `.flagged`, `.react`, `.link-btn`, `.callout.danger`.
5. `tools/smoke.mjs` lines 60–140 — the interactions that must still work.

## Owned paths

- `apps/web/src/components/patient/Discussion.tsx` (thread + composer), `Comment.tsx`, `ReplyBox.tsx`, `CommentEditor.tsx`, `ReactionButton.tsx`, `BookmarkButton.tsx`
- `apps/web/src/server/actions/community.ts` (`postComment`, `editComment`, `deleteComment`, `setReaction`, `setBookmark`)
- `apps/web/src/components/patient/ExperiencePage.tsx` — only the lines that mount `<Discussion/>`, `<BookmarkButton/>` and the review-level `<ReactionButton/>`s (coordinate with T-307; note the exact hunk in hand-off)
- `apps/web/src/components/patient/*.test.tsx` for the above
- `apps/web/src/styles/patient.css` — additions only, marked `/* added: T-402 */` (expected: none)

## Not in scope

The report sheet contents and `report.file` (T-403), the evidence viewer (T-308), notifications (T-405), moderation states other than rendering what `ThreadVM` says, comment reactions other than like (the prototype exposes only "helpful" on comments — keep that; dislike exists only on the review level as in the prototype).

## Steps

Port in this order; each sub-block keeps the prototype's DOM and, where T-011 kept them, its class names (FD-091); the look comes from T-011.

1. **`Discussion.tsx`** (server component). Renders `<h2 class="section-head">experience.discussion</h2>`, then the persistent advice warning exactly as the prototype: `.callout.danger`? — **check**: in `renderAccount` the thread-level warning uses `experience.dangerWarning` in a `.callout warn` above the composer; the per-comment `k.dangerous` red callout is a moderation flag. Render the thread-level warning always; render the per-comment flagged callout only when `CommentVM.state === 'hidden_pending_review'` and the viewer is the author/staff (T-401 provides the state). Then the top-level composer (`experience.commentBox` label, textarea, `experience.commentHint`, `experience.commentPost`) and the list of `<Comment/>`.
   - Signed out → composer replaced by the gate sheet trigger button (`auth.gate.title`), per auth spec §3.7. Unverified → composer disabled with `auth.gate.verifyToAct`.
2. **`Comment.tsx`**: `<article class="comment [flagged] [tombstone]">`; head = `byline(k,'comment')` (reuse T-307's `Byline`), `experience.providerHere` badge when `providerHere`, `experience.ownComment` badge when `mine`, `(experience.edited)` when `editedAt`, relative/when text via `formatRelative`; body with `.mention` spans from `mentions`; link warning `.note` with `experience.linkWarning` when `hasExternalLink`; actions row: helpful `.link-btn` with `aria-pressed` + count (`bn` numerals via `formatNumber`), **Reply** only when `!isReply` (`canReply`), **Edit/Delete** only when `canEdit`, **Report** always (`data-report="comment:<publicId>"` → opens T-403's sheet via the `onReport` prop). Tombstone branch renders `experience.commentGone` + `experience.commentGoneWhy` and nested replies only.
3. **`ReplyBox.tsx`** (client): non-modal, prefilled `@<author username> ` (use `author.username`; for anonymous authors the alias display name — same as prototype `P(k.author)`), `experience.replyingTo`, post/cancel; posts through `postComment` server action with `parentId`; on `Result` error render the `messageKey`.
4. **`CommentEditor.tsx`** (client): inline textarea prefilled with body, save/cancel → `editComment`.
5. **Delete**: `deleteComment` action; after success `router.refresh()`; the thread re-renders from `ThreadVM` (tombstone or gone). No client-side state mirrors — the server is the source of truth (differs from the prototype's `state.commentDeleted`; note it).
6. **`ReactionButton.tsx`** (client): `.react` button, `aria-pressed`, label + `<b>count</b>`; optimistic toggle then `setReaction`; announce `"<label> <count>"` through `useAnnounce()`. Used for review helpful/notHelpful (`review.helpful`, `review.notHelpful`, `review.reactionNote`) and comment helpful.
7. **`BookmarkButton.tsx`** (client): `experience.bookmark` / `experience.bookmarked` toggle with `aria-pressed`, `experience.bookmarkNote`; calls `setBookmark` (T-302's `review.bookmark` command); gated like other actions.
8. **Server actions** in `apps/web/src/server/actions/community.ts`: parse with contracts schemas, `getActor()`, call the command, return `Result`; `revalidatePath` for the experience route.
9. **Tests** (Testing Library, `en` and `bn`): reply button absent on replies; reply box prefilled with `@`; edit shows `(edited)`; foreign comment has no edit/delete; tombstone renders replies; signed-out composer shows gate; reaction announces.
10. `npx impeccable detect apps/web/src/components/patient --no-advisory` clean; `pnpm check`.
11. **Motion (FD-091).** A new comment or reply appears with the T-011 reveal (one item, no stagger). The reply box and inline editor open with a short fade. Reaction and bookmark buttons give a press state only; no count animation. Deleting a comment shows the tombstone at once. The persistent advice warning and link warning are never animated (AC2.4.4), and nothing encourages posting (AC2.4.5).

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Smoke parity | `pnpm vitest run apps/web/src/components/patient/Discussion` | the eight prototype smoke assertions pass against the React thread |
| Both locales | same, `bn` render | Bengali labels, Bengali numerals in counts, no English fallback text |
| Gate | render with anonymous actor | composer absent, gate button present; clicking opens the sheet with `auth.gate.body` |
| Server round-trip | manual: post, reply, edit, delete k8 vs k10 as `rafi_c` | matches storyboard step 15 |
| a11y | `impeccable detect` + axe in T-503 later | no findings on these components |
| FD-091: motion check | `pnpm check:motion` | passes; this Unit's styles animate only `transform` and `opacity` with T-011 duration and easing tokens |
| FD-091: reduced-motion journey (AC2.4.3) | walk this Unit's pages with the OS reduced-motion setting, then with `data-motion="reduced"` | no slide, scale, stagger, route movement or scroll reveal; every step still completes; the disclaimer, emergency guidance and demo marker are never animated (AC2.4.4) |
| FD-091: detector and contrast on the new styles | `npx impeccable detect apps/web/src --no-advisory`; `pnpm contrast` | zero findings |

## Tests to write

Component tests listed in step 9; one action test that a thrown command error becomes `err('internal')` with a correlation id.

## Hard-rule checklist

- [ ] Advice warning persistent and non-modal; report route reachable from every comment.
- [ ] No reporter identity anywhere in the thread VM or DOM.
- [ ] Anonymous author's replies show the thread alias only.
- [ ] Numerals follow language; no cap-transform in Bengali (inherited CSS).
- [ ] No hard-coded strings; keys exist in both locales.
- [ ] No agent/tool attribution.

## Hand-off (implementer fills in)

Built in release 1 by Unit U49 `u49-comments` (branch `bolt/u49-comments`, 2026-11-07); the full record is `aidlc/spaces/default/intents/261011-aidlc-adoption/construction/u49-comments/code-generation/code-summary.md`.

### What changed
- `apps/web/src/components/patient/comments/`: `CommentThread`, `CommentDisclaimer`, `CommentThreadView` (on `ThreadVM`), `CommentPlaceholder`, `CommentForm`, `CommentActions`, `DeleteCommentButton`; `server/actions/comments.ts` on `runCommand` and the new `server/actions/comment-thread.ts`; the community module in `server/container.ts`; six keys in `en.json` and `bn.json`.
- `Byline.tsx` (U47) shows the thread alias on the comment variant (ISS-673).

### Not done and why
- Like and Dislike, report trigger, mentions, edit, blocks: release 2 (FD-105). The manual server round trip and the reduced-motion journey: the owner's phase-gate walk (ISS-677).

### Questions for the human
- Review the Bengali copy of the five new `experience.*` keys (ISS-676).

### Follow-ups
- ISS-671 (forbidden state instead of a sign-in redirect), ISS-672, ISS-676 to ISS-678.

### `pnpm check` output summary
- Green on the final tree; see `code-summary.md`. `pnpm smoke` green. `impeccable detect` found nothing; `pnpm contrast` and `pnpm check:motion` pass.

### Hard-rule evidence
- Disclaimer first and in every state, no reporter identity, thread alias only for anonymous authors, both locales: `CommentThread.test.tsx`, `CommentThreadView.test.tsx`, `CommentForm.test.tsx`, `DeleteCommentButton.test.tsx` (each in `en` and `bn`).
