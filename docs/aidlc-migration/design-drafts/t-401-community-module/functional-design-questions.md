# Functional Design — questions (U30 `t-401-community-module`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-401-community-module/functional-design/`. Drafted on 2026-10-29.

Context:
- Unit U30 (kind `library`, size L) delivers T-401 (`docs/implementation/tasks/T-401-community-module.md`, with its FD-045..FD-075 and FD-076..FD-090 amendments) for US8.1 and US8.2. It depends on U22 T-302, U11 T-104, U12 T-105, U34 T-405, U3 T-010 and U6 CR-012 (`unit-of-work-dependency.md`); U29, U31, U32, U38, U39 and U41 depend on it. C10 is its contract. Run as **high risk** (anonymity, identity, deletion), although `unit-of-work.md` does not flag it (finding F16).
- Inputs read: `unit-of-work.md` (U30, the deletion participants table, the open points on recipients and web-tier email), `unit-of-work-story-map.md`, `requirements.md` (FR10, FR13, FR22, FR72–FR78, FR81), `stories.md` (AC8.1.1–AC8.1.6, AC8.2.1–AC8.2.6, AC3.3.1, AC10.3.3), `components.md`, `contract-summary.md` (C2, C4, C5, C9, C10, C11, C13, C15), the decision log to FD-094, `01-conventions.md`, `02-data-model.md`, `03-routes-and-contracts.md`, `docs/planning/01-requirement-baseline.md` (rate limits), the T-402, T-403, T-404, T-405, T-409 and T-410 task files.
- Code read on `main` at `9cf860a`: `packages/database/src/{schema/community.ts, schema/account.ts, schema/retention.ts, migrations/0002_content.sql, 0003_triggers.sql, 0005_grants_part2.sql, 0008_worker_grant_review.sql, repositories/{community,account,not-implemented.test}.ts}`; `packages/contracts/src/{schemas/community.ts, schemas/account.ts, view-models/{thread,experience}.ts, errors.ts}`; `packages/i18n/messages/en.json`; `packages/test-support/src/{corpus/comments.ts, corpus/reviews.ts, seed/seed-content.ts, seed/seed-moderation.ts, fakes/repositories.ts, builders/comment.ts}`; the prototype (`app.js` 1040–1160 and 2970–3070, `rogikotha-data.js`).
- Drafts read for what this Unit uses or owes: `t-101-better-auth-adapter` (`defineCommand`, `sendsMail`, allowlist builders, `RateLimiter`), `t-104-identity-module` (`personaFor`, `personasOf`, `accountsOf`, `publicByUsername`, `bylinesFor`, `RevealTarget` with `targetCode`, Q10, Q15, Q17), `t-105-runtime-configuration` (no rate limits in `ConfigValues`), `t-201` (format), `t-204-provider-submission-claim-field-change` (`approvedClaimOf` for U30), `t-301-review-module-core` (persona audit actor), `t-302-review-changes-and-tombstones` (`DiscussionPresence`, F11, F12, Question 9), `t-307-experience-page-and-index` (no counts before T-402).
- Owner's answers read in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`: counts only, no percentages; "Former member" for de-identified named and pseudonymous personas; the no-questions instruction of 2026-10-29.
- Open `ISSUES.md` rows in this area: ISS-142 (stale migration name in `schema/community.ts`), ISS-262 (anonymous comments on non-anonymous threads; owner U30 and U11), ISS-267 (prototype comment counts, informational), ISS-270 (comment mentions not seeded; owner U30), ISS-294 (stub test pins).

## Settled before this stage

Decided by FD entries, the contracts, an earlier Unit or the owner, and not asked again.

- **Comments take Like and Dislike** (FD-062, ADR-007), with one current reaction per account and target and `public_persona_id` null when the reactor is anonymous in that thread (02 §8).
- **No emergency banner and no classifier on comments** (FD-046, FD-009, FD-017); dangerous advice reaches moderators through the report reason, and the danger flag comes from Moderation (`ModerationSignals`, C10/C11).
- **Discussion email is queued by `comment.post` in the web tier**, in the same transaction, through `notification.queueEmail`, with the recipients' preferences applied (FD-047, FD-070, FD-075, C2).
- **Recipients are resolved and filtered in the web tier** (`identity.accountsOf`, `account.blocksBetween`) and travel as account ids in `comment.posted` (C10, C15).
- **Hold checks are T-309's** (FD-073), and a held delete must look normal to the author (FD-079).
- **`comment.setState` is silent** (FD-087); appeals are deferred (FD-088).
- **The worker gets no new grant** (FD-077, FD-092).
- **Counts only, no percentages; "Former member"** (owner).
- **T-010's boundaries, coverage floor, pins and CI** (FD-093, D10).

## Settled in this design without a question

- **`comment.edit` has its own limit of 60 per hour** (`comment-edit:account:<id>`), so typo fixes do not use up the posting limit; `comment.delete` has none (BR1.7).
- **Edits send no notice** and re-check mentions with the same refusals (BR3.8), as C15 routes `comment.changed` to no notice.
- **An author may react to their own content** (BR6.7): the prototype allows it and reactions are engagement only.
- **Reply targets must be published** (BR3.2): replying to a hidden or deleted comment is `not_found`.
- **Thread size cap 500** with a `truncated` flag (BR7.9).
- **When the last live reply under a tombstone goes, the tombstone goes** (BR4.5).
- **The depth trigger also checks the review and refuses re-parenting** (migration step 4, finding F9).

## Question 1

**Who comments as whom (ISS-262)?** Task step 4 gives every commenter the pseudonymous persona, except the review's anonymous author, who uses the thread alias. The prototype data has comments by other accounts under anonymous aliases (k5 on r6, k16 on r4, k42 on r20) and under real names (k2, k18, k25), and the review author replying under the review's persona (k15, k20, k29).

A. **Per-thread identity** (recommended). The review's author always comments under the review's persona. Any other account picks named, pseudonymous or anonymous on its first comment in that thread (default pseudonymous, which is what the prototype composer posts), and keeps that persona for every later comment there; a different choice later is refused with `community.identity_fixed`. The input gains an optional `identity`. Matches all the prototype data; one more refusal and an optional field for U31's composer.
B. **The task text**: the anonymous author uses the alias, everyone else the pseudonymous persona. Simplest, but named and anonymous comments by other accounts stay data the product cannot create, and a named review author would reply under a different name.
C. **Like B, but the author of any review replies under the review's persona.** Fixes the author case only.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 2

**What does a block do where the blocking party is anonymous in the thread?** Refusing with `community.blocked` on an anonymous review tells the blocked member that the review's author is someone who blocked them; with one known blocker, that names the author (FD-015). The same holds for a reply to an anonymous comment.

A. **Silent** (recommended). Where the party is anonymous in that thread, the comment posts normally and the party is removed from the recipients, so they get no notice or email. Elsewhere the refusal stays. `canReply` never depends on blocks. Closes the oracle; the blocker still never hears from the blocked member.
B. **Refuse everywhere.** Simpler and literal, but the oracle stays open.
C. **Never refuse, always filter silently.** No oracle anywhere, but a blocked member can keep replying to the blocker's named comments, which the block is meant to stop.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 3

**Which direction of a block refuses what?** The task says the review author's block refuses the actor; C5's `blocksBetween` is symmetric.

A. **Symmetric** (recommended): a block in either direction refuses a comment on the other party's thread, a direct reply to them and a mention of them. One query, one rule, and the blocker cannot keep interacting with the person they blocked.
B. **Directional**: only the blocker's side refuses the blocked member. The blocker could still reply to and mention the person they blocked.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 4

**How is the provider label computed?** Task step 5 derives `providerHere` when the thread is read, from the author persona's account and Directory's claims. That reads the persona-to-account link in a public projection (AD-3 forbids it), and on an alias it would tell everyone the doctor wrote the anonymous comment.

A. **Store it when the comment is written** (recommended): `comments.provider_label`, set at post and edit when the persona is named or pseudonymous and the account holds the approved claim on the review's doctor (`directory.approvedClaimOf`). The thread reads the column. A label stays if a claim is later revoked. Needs the U17 → U30 edge (Question 15) and an FD entry.
B. **Derive at read time, skipping aliases.** Always current, but the public query reads private links (an AD-3 exception and an FD entry).
C. **No provider label in release 1.** Fails AC8.1.5 and FR22.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 5

**Where is the private history of comments kept?** AC8.1.3 keeps earlier text "only in private version history"; AC8.1.4 keeps deleted text "only in private history". There is no history table, and task step 4 clears the body on delete, which would also destroy what a hold or a moderator needs (FD-079).

A. **A new private table `comment_versions`** (recommended): one immutable row per posted or edited text; never projected, no worker grant; delete and removal empty `comments.body`; purge deletes the history; `comments` also gains `hidden_at`, `hidden_reason_code` and `removed_by`, so hides carry their reason and placeholders can say who removed the comment. Nothing restores a deleted comment in release 1. One migration, one FD entry.
B. **No history**: keep the body in `comments` on delete and never show it. AC8.1.3's history is not met, and an edit loses the earlier text.
C. **Reuse `review_versions`**: wrong owner and shape; it is append-only audit-like data of another module.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 6

**What happens to an account's comments when the account is deleted?** C10 and T-410 step 3 tombstone or delete them in the worker. FR13 and AC10.3.3 say retained contributions are de-identified, not deleted; U22 T-302 Question 9 decided so for reviews; and the worker cannot find the comments once Identity's web step has removed the links.

A. **Keep them, de-identified** (recommended): comments stay; Identity's step makes named and pseudonymous bylines read "Former member" and aliases stay as they were; the community step deletes the account's reactions only, in the web transaction; no worker entry. One FD entry; U39 changes its plan rows.
B. **Tombstone them in the web tier** before Identity's step, resolving the comment ids while the links exist. Contradicts FR13 and loses other members' context.
C. **As C10**, in the worker. Cannot work without a new worker grant on `persona_links` (FD-041, FD-077 forbid it).
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 7

**Public reaction lists?** FR77, AC8.2.3 and AC8.2.4 mention "who reacted" lists and reactions on public activity and the dashboard; T-401, 03 §4 and the prototype show counts only.

A. **Counts only in release 1** (recommended): Like and Dislike counts and the viewer's own state; lists, public-activity and dashboard reactions move to release 2; `public_persona_id` is still stored for them. One FD entry narrowing FR77 and FR78.
B. **Build a reactor list now** (`community.reactorsOf` with thread bylines; aliases shown; anonymous-author reactions kept off public activity). More surface for linkage and a UI the prototype does not have.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 8

**Are reactions audited?** 01-conventions §5 says every state-changing command writes audit, and `components.md` lists reaction audit rows; T-401 step 4 says no audit for reactions.

A. **No audit row for `reaction.set`**, recorded as the one exception (recommended): reactions are engagement only (FR78), high in volume, and an audit actor would name the account of an anonymous reactor. Recorded in FD (e) and in a note the build adds to 01 §5.
B. **Audit with actor `persona:<thread persona>`, or `system` when anonymous.** Follows the convention; adds a row per click with nothing a moderator uses.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 9

**Which audit stream and actor do comment actions use?** The task puts `comment.posted` on `review:<id>` with no actor rule; T-403 audits setState "on the owning stream"; U21 uses the author persona as actor so audit never links an anonymous author to an account.

A. **Stream `comment:<commentId>`, actor `persona:<authorPersonaId>`** (recommended) for post, edit and delete; setState rows on the same stream with the staff or system actor. The moderation case timeline (U33) reads the comment's own stream, and no row links an alias to an account.
B. **Stream `review:<reviewId>`** as the task says, with the persona actor. Puts discussion noise into the review's timeline and splits a comment's history across streams.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 10

**Where do the block commands live?** `blocks` is an Account entity (`components.md`), its repository stubs are on `PgAccountRepository`, and C5's `blocksBetween` is in `modules/account`; T-401's owned paths put everything in `modules/community`.

A. **In `modules/account`** (recommended): `commands/set-block.ts`, `commands/unset-block.ts`, `queries/blocked-list.ts`, `queries/blocks-between.ts`, keeping the catalogue names `block.set`, `block.unset`, `community.blockedList`. The owner of the table writes it; owned paths extended and recorded.
B. **In `modules/community`**, calling Account's repository. Matches the task's owned paths but writes another component's table.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 11

**What does the thread show for hidden comments?** The task shows `hidden_pending_review` "only for the author/staff". The seed hides k3 (dangerous) and k31; the prototype shows k3 with a danger warning, and FR75 keeps dangerous advice visible with a warning by default. A hidden parent with published replies would orphan them.

A. **The visibility table of BR7.2** (recommended): danger-flagged comments stay visible with the warning (published or pending review); other hidden comments are shown to their author with a notice and, to everyone else, as a `withheld` placeholder only when they have shown replies; tombstones say `deleted` or `removed`; placeholders carry only their id, reason and replies. Staff use the console, not the thread.
B. **Hide every non-published comment from others**, replies included. Simpler, but readers lose published replies and dangerous advice disappears, against FR75.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 12

**Are the rate limits configurable?** The PRD baseline calls 30 comments and 100 reactions per hour "configurable"; T-401 names T-105 as the source, but `ConfigValues` has no rate limits.

A. **Fixed in code for release 1** (recommended): 30 posts, 60 edits, 100 reactions, 60 block changes per hour in `modules/community/limits.ts`. Recorded in FD (e); configurability can be added later as a new `ConfigValues` block.
B. **Add a `rateLimits` block to `ConfigValues`** now. Changes U12's schema, ranges and console after it has merged.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 13

**How are mentions parsed and refused?** The task gives the token shape and "max 5", and refuses mentions of anonymous personas; it does not say what an unknown username, an email address, an alias written as `@patient-4f2k` or a sixth mention does.

A. **As BR3.3–BR3.5 and BR2.8** (recommended): a token not preceded by a letter, digit, `_`, `.` or `@` (so email addresses do not count) and not followed by `[a-z0-9_-]` (so `@patient-4f2k` does not become `@patient`); unknown and de-identified usernames stay plain text; an alias token is refused with `community.mention_anonymous`; more than five distinct tokens is a `validation` error. U31 must not prefill `@` for an anonymous parent.
B. **Refuse unknown usernames too.** Ordinary text with an `@` becomes unpostable.
C. **Silently keep the first five.** The rest are never notified, with no explanation.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 14

**Input names and the body limit.** The T-003 schemas are `CommentPostInput`, `ReactionSetInput`, … with a 4000-character body; C10 and 01-conventions name inputs `<VerbNoun>Input` (`PostCommentInput`) and T-401 sets 2000.

A. **Rename to the C10 names and use 1–2000** (recommended). Only the test-support builder imports the old names; the contract summary wins over older text.
B. **Keep the T-003 names and 4000.** No rename, but two naming styles for one contract.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 15

**The provider label needs U17 T-204, which U30 does not depend on.** No path in `unit-of-work-dependency.md` leads from U17 to U30; under the swarm (FD-094) U30 could be built first.

A. **Add the edge U17 → U30** (recommended). U17 is planned much earlier anyway, so no schedule moves; the record states the dependency.
B. **Build the label without the claim check until U17 merges** (always false). Leaves AC8.1.5 failing in between.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Question 16

**What does the seed need from this Unit?** T-401 step 7 asks for a new mapping of the comments, but CR-012 already seeds all 49. Missing: mentions (ISS-270), the provider label, the link text in the body (k4 and k27 carry the link only in the corpus field) and the history rows.

A. **A `seed-community.ts` step for the missing parts only** (recommended), run after `seed-content` and before `seed-moderation`, idempotent by `seed_ref`, with one import line in `seed.ts` and the new counts pinned in `seed.int.test.ts`. CR-012's files stay untouched; closes ISS-270.
B. **Edit `seed-content.ts`.** Fewer files, but changes another Unit's seed step.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29)

## Decided under the owner's no-questions instruction of 2026-10-29

All sixteen questions above. Questions 1–8 and 12 change a data boundary, a requirement reading or a founder-level rule, so `functional-spec.md` § 18 gives the five FD entries the build appends before code: (a) Questions 1–3, (b) Question 4, (c) Question 6, (d) Question 5, (e) Questions 7, 8 and 12. Each becomes a row in `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md` when the stage finalises it.
