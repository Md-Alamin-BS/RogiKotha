# T-402 — Discussion UI on the experience page

| Field | Value |
|---|---|
| Story | STORY-COM-001, STORY-COM-002 |
| Phase / Lane | 4 / B |
| Class → model | M2 → Claude Sonnet 5 (alt. GPT-5.6 Terra); validator: GPT-5.6 Terra |
| Effort setting | `high` |
| Estimate | 3–4 h agent; validation 1 h |
| Depends on | T-401 (`community.*` commands, `ThreadVM`), T-307 (ExperiencePage with a `<Discussion/>` slot), T-102 (gate sheet + `getActor`) |
| Parallel-safe with | T-403 (report sheet — you render the trigger, T-403 supplies `<ReportSheet/>`; stub with a placeholder prop until it lands), T-409, T-405 |

## Goal

Port the prototype's comment thread, reply box, inline editor, delete/tombstone, reactions, bookmark button, persistent advice warning and link warning into React components under the experience page, wired to the T-401 server actions, with the signed-out/unverified gates from the auth spec.

## Read first

1. `docs/implementation/01-conventions.md` §6–§8 (i18n, CSS port, React port rules)
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

Port in this order; each sub-block keeps the prototype's DOM and class names.

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

## Acceptance checks

| Check | Command | Expected |
|---|---|---|
| Smoke parity | `pnpm vitest run apps/web/src/components/patient/Discussion` | the eight prototype smoke assertions pass against the React thread |
| Both locales | same, `bn` render | Bengali labels, Bengali numerals in counts, no English fallback text |
| Gate | render with anonymous actor | composer absent, gate button present; clicking opens the sheet with `auth.gate.body` |
| Server round-trip | manual: post, reply, edit, delete k8 vs k10 as `rafi_c` | matches storyboard step 15 |
| a11y | `impeccable detect` + axe in T-503 later | no findings on these components |

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

### What changed
### Not done and why
### Questions for the human
### Follow-ups
### `pnpm check` output summary
### Hard-rule evidence
