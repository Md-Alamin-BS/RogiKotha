# Functional Design — questions (U11 `t-104-identity-module`)

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-104-identity-module/functional-design/`.

Context:
- Unit U11 (kind `library`, size L, **high risk**: identity) delivers T-104 (`docs/implementation/tasks/T-104-identity-module.md`) for story US3.3. It depends on U8 T-101, U10 T-103 and U3 T-010 (`unit-of-work-dependency.md`); U13 T-106, U21 T-301, U30 T-401, U32 T-403, U33 T-404, U38 T-409 and U39 T-410 depend on it. C4 in `contract-summary.md` is its contract; where C4 and the task file disagree, C4 wins (the summary's own rule) unless a question below changes C4.
- Inputs read: `unit-of-work.md` (U11, the deletion participants table, the open points), `unit-of-work-dependency.md`, `unit-of-work-story-map.md`, `requirements.md` (FR10, FR11, FR13, FR78), `stories.md` (US3.3 AC3.3.1–AC3.3.6, US10.2 AC10.2.1–AC10.2.5, AC10.3.3), `contract-summary.md` (C4, C5, C15, the common and ownership rules, the FD-088 and FD-090 revision), `docs/status/decision-log.md` (FD-008, FD-015, FD-016, FD-022, FD-037, FD-040, FD-065, FD-067, FD-069, FD-077, FD-078, FD-079, FD-086, FD-090, FD-092, FD-093), `01-conventions.md` (§1–§5, §11, §14, §15), `02-data-model.md` (§0, §3, §6, §8, §9, §10, §12, §16), `03-routes-and-contracts.md` (§2, §3, §4), `05-demo-storyboard.md`, `ARCHITECTURE-SPINE.md` AD-3 and AD-4, `05-recommended-architecture.md` "Authentication and identity", the T-106, T-401, T-402 and T-410 task files, `PRODUCT.md` hard rules through `project.md`, `docs/aidlc-migration/OWNER-REVIEW-QUEUE.md`, the U8 and U10 drafts.
- Prototype read: `ui-design-prototype/shared/rogikotha-data.js` (`accountsByAuthor()`, the anonymous reviews and comments), `concepts/concept-04b-quiet-clinic-minimal/app.js` (`byline()`, `initials()`, `renderPerson()`, the composer's identity field, the review page margin), `ui-design-prototype/admin/app.js` (the reporter reveal button and the `data-request` path for non-Super-Admin staff).
- Code read as it is on `main` (2026-10-28): `packages/database/src/schema/identity.ts`, `repositories/identity.ts`, `audit-writer.ts`, `migrations/0000_init.sql`, `0001_grants_part1.sql`, `0003_triggers.sql`, `0004_deferred_fks.sql`, `migrations.int.test.ts`; `packages/contracts/src/{enums,actor,errors}.ts`, `schemas/identity.ts`, `view-models/{public-profile,thread,experience}.ts`; `packages/test-support/src/corpus/{personas,notifications}.ts`, `seed/{seed-accounts,seed-content}.ts`, `fakes/repositories.ts`; `packages/i18n/messages/{en,bn}.json` (`byline.*`, `compose.identity.*`, `admin.reveal.*`, `admin.done.revealed`, `admin.notif.kind.identity*`, `admin.config.cap.identity`).
- Open `ISSUES.md` rows in this area: ISS-090 (S4, `identity_reveals.target_kind` reuses the shared enum), ISS-108 (S2, audit details are a shallow denylist; owner T-104), ISS-111 item 1 (stubs embed arguments in errors; the identity stubs go), ISS-159 and ISS-264 (S4, synthetic `named_<slug>` usernames, some with hyphens; "decide when T-104 validates usernames"), ISS-262 (S3, anonymous comments on non-anonymous threads; "T-401 and T-104 confirm the product rule"), ISS-263 (S4, won't fix, naming rule of `anon_author_<review>`).
- Owner answers read: U8 R1 (the worker holds a separate, mail-only key) does not touch this Unit, which sends no email; U9 Q4 (the holder's own email is shown masked on signed-in pages) is about a person's own address, not a staff reveal, and is offered as option C of Question 3.
- Research (2026-10-28): no new library is needed. The property test of T-104 step 1 uses a seeded generator instead of adding `fast-check`, so the dependency-check rule is not triggered (BR7.6). The deferrable foreign key follows the `evidence_items.published_artifact_id` precedent in `0004_deferred_fks.sql`.
- Refreshed 2026-10-29. Re-read:
  - T-010 as merged on `main` (`14c21a9`): `eslint.boundaries.mjs`, `01-conventions.md` §2, FD-093, `vitest.workspace.ts`, `packages/database/src/repositories/{identity.ts, not-implemented.test.ts}`, `migrations.int.test.ts`, `validator-probes.int.test.ts`, `packages/test-support/src/{fakes/repositories-superset.test.ts, seed/seed-content.ts, corpus/personas.ts}`, ISS-290, ISS-294;
  - the refreshed T-101 draft (`defineCommand` with `onRefused` and `recorded`, `getActor` without a persona, `insertDefaultPersonas`, the `Crypto` port, `findOwnEmail`, ISS-108 closed);
  - the T-103 draft refreshed the same day (device gate, step-up audit flag; the owner approved its staff screens on 2026-10-29, so its R1 precondition is met);
  - the refreshed T-201 draft and the T-202, T-207 and T-301 drafts (their bylines, T-202 Q7 A, T-207 Q1, and the refreshed T-301's Q8, Q16 A, Q18 A, F25 and F29);
  - `OWNER-REVIEW-QUEUE.md`: the T-104 Q15 answer, the no-questions instruction of 2026-10-29 and the T-103 staff-screen approval.
  - New Questions 16–18 follow from those. A second pass the same day changed the answer to Question 17 to match T-301 Q18 A and F25 (`profileUsername` on named and pseudonymous bylines; no alias on list surfaces) and added T-301's two internal operations to the settled points.

## Settled before this stage

These are decided by FD entries, the contracts or the requirements and are not asked again.

- **Alias per thread (FD-015).** An anonymous review uses a stable alias scoped to that one review thread, never publicly linked to the normal profile, reactions, mentions or other anonymous reviews.
- **Who may reveal (FD-016, FD-022, U10's capability table).** Super Admin always; Admin and Moderator only when the Super Admin enables their toggle, normally off; every reveal is logged; the capability is described only in the Privacy Policy and Terms. Lawful-disclosure limits live only in the Terms (FD-008).
- **Staff powers need an approved device (U10 Q3).** An Actor has a staff role and capabilities only for an active staff account on an approved device.
- **`requires` order and step-up (U10 BR7.4, Q7).** `authenticated → … → capability → stepUp`; an actor without the capability gets `forbidden`, not a password prompt; `STEP_UP_PURPOSES` includes `identity.reveal`.
- **Ownership of records (FD-065).** Administration owns `audit_events`; Notification owns `staff_notifications` and the outbox.
- **Ports for the cycle (FD-067, C4).** `RevealTarget` (implemented by Review, Community and Moderation in their Units) and `RevealContact` (implemented in the account module, built here).
- **Deletion (FD-069, FD-077, FD-078, FD-079, FD-090, C4).** `identity.deidentify {accountId, keepPersonaIds}` runs in the web transaction of `dataRequest.delete`; held posts keep their persona link until the hold ends; T-309's `SECURITY DEFINER` function removes those links later; reporter ids become null when de-identified.
- **No reporter id anywhere (FD-086).** Not in any payload, view model or log.
- **Worker boundary (FD-092, FD-093, 02 §16).** `rk_worker` holds nothing on `persona_links` or `identity_reveals` (already revoked by `0001`; this Unit adds no grant); the worker may not value-import `modules/identity/`.
- **Public profiles link named and pseudonymous content (FR11, AC10.2.1).** A profile shows the username and display name with the account's public contributions, each under the identity shown on the content. U38 T-409 builds that header from the account; named and pseudonymous bylines carry `profileUsername` for the link (Question 17, T-301 Q18 A). Only anonymous and former-member content is kept apart.
- **Two internal operations for Review (T-301 Q8 A, decided by the agent under the owner's no-questions instruction of 2026-10-29).** `identity.ownsAnyPersona({accountId, personaIds}) → boolean` for FD-080's repeat-episode flag, and `identity.currentPersonaOf` returning the pseudonymous id beside the named one for the write-free preview. Both are internal, built here over the private repository (BR3.7, BR3.5); C4 gains them additively.
- **U10's staff screens are approved (the owner, 2026-10-29).** U10's R1 precondition is met, so this Unit does not wait on that review.
- **The owner's answer to Question 15 (B, 2026-10-29).** "Former member" for named and pseudonymous personas whose link was removed; no username or profile link; C4, T-410 and the Units table corrected by an FD entry (FD-<next: Former member>, `functional-spec.md` § 9.1).
- **The anonymity note (R1).** T-301's Q16 A (no public caveat, a reworded composer note) was decided by the agent under the no-questions instruction. The owner answered T-207's Q1: the lawful-access section sits on both the Terms and the Privacy Policy. The FD entries are those Units'.
- **U8's foundations (refreshed T-101 draft).** `defineCommand` runs `onRefused` for every refusal after `authenticated` and commits a `recorded` handler error. ISS-108 is closed by U8's recursive allowlist. `getActor` reads no persona. `account.register` writes the personas through `AccountRepository.insertDefaultPersonas` until this Unit. The `Tx` is opaque in `application`.
- **Import boundaries (FD-093, T-010).** `application` imports no external package and no Node built-in; the worker cannot value-import `modules/identity/`; adapters are built only in `server/container.ts`.

## Settled in this design without a question

These follow from the contracts, the requirements, the project rules or the code. Each is explained in `functional-spec.md` § 13.

- **`identity.personaFor` is an internal operation on the caller's transaction**, not a query, because it writes on first use (F15).
- **One anonymous persona per (account, thread) is enforced by a partial unique index on `persona_links (account_id, review_id) WHERE review_id IS NOT NULL`**, since a partial index cannot read `personas.kind` and only anonymous links carry a review id (F7, BR2.3).
- **Facility feedback has no thread**, so anonymous mode without a review id creates a fresh unscoped persona every time (BR2.4).
- **Aliases are unique among anonymous personas**, enforced by a partial unique index with up to 5 retries (BR2.2); 4 characters is an `ASSUMPTION(T-104)` for the demo (F22).
- **Every anonymous persona has avatar hue 0**, so the avatar cannot correlate threads (BR1.6).
- **No view model or byline carries a persona id** (UUIDv7 ids carry their creation time) (BR1.4, F23).
- **Byline data carries no localised text**, and is batched (`bylinesFor({personaIds, surface})`), so the task's `locale` argument is not needed (F21); the lede, chip and link are chosen by the components from `personaKind` (Question 17).
- **Username lookups prefer the pseudonymous persona and never return an anonymous one** (BR1.8).
- **The current named persona is the newest linked named persona** (BR6.8; Question 14 confirms there is no flag column).
- **Reveal may target content of any persona kind**, and the record notes the kind (BR4.10).
- **Malformed input and signed-out callers are refused without a record** (there is no storable target or no requester) and logged (BR4.3, BR4.11).
- **A reveal whose record cannot be written fails as `internal`**; an identity leaves the server only after its record commits (BR5.2, BR5.3).
- **`onRefused` runs for every refusal after sign-in**, as U8's refreshed `defineCommand` already does; this Unit changes nothing in `command.ts` (F12 closed by U8, BR5.2).
- **`Actor.personaId` is resolved through identity**, so the account repository never reads `persona_links` (F9, BR3.5).
- **De-identification audits `account:<id>` `identity_deidentified {removedLinks, keptLinks}`** and leaves reveal history untouched (BR6.5, BR6.6).
- **No new dependency** (BR7.6).

## Question 1

How is a refused reveal attempt recorded when the actor has no staff role?

Why this is open: `identity_reveals.requester_role` is `NOT NULL`. Under U10's answer to its Question 3, a staff member on an unapproved device has no `staffRole` in the Actor, and an ordinary account has none either. T-104 and C4 say every attempt is recorded, granted or not; these two cases are the most suspicious attempts there are.

A. **Make `requester_role` nullable in this Unit's migration and record every attempt by a signed-in account**, with the role the Actor had at the time or null (recommended). A signed-out caller is refused and logged without a row (there is no requester). One `ALTER COLUMN … DROP NOT NULL` on an empty table.
B. **Record only actors that have a staff role**; others are refused with a log line only. No schema change, but an attempt from a stolen staff password on an unapproved device leaves no reveal row.
C. **Record with the profile's own `staff_role`**, read past the Actor. No schema change, but the record then disagrees with the authorization model U10 set up, and ordinary accounts still cannot be recorded.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 2

Which target kinds does a reveal accept, and how is the column typed?

Why this is open: C4 and `moderation.revealReporter` need `report` (the restricted reporter), but `identity_reveals.target_kind` uses the shared `target_kind` enum (`review | facility_review | comment | evidence | profile`), which has no `report` and has two values no reveal can use (ISS-090). `reports.target_kind` uses the same shared enum.

A. **A new enum `reveal_target_kind` (`review`, `facility_review`, `comment`, `report`) for this one column**, mirrored as `REVEAL_TARGET_KINDS` in contracts; the migration changes the column's type on an empty table (recommended). Closes the identity half of ISS-090.
B. **Add `report` to the shared `target_kind`.** One value, but reports could then target reports unless another check is added, and `evidence` and `profile` stay accepted for reveals.
C. **Keep the column as it is and drop reporter reveal** until a later Unit. Smallest now; `moderation.revealReporter` in 03 §4 then has no path.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 3

What does a granted reveal return?

Why this is open: three sources disagree. T-104 step 4: `{username, displayName}`, plus the email only for a Super Admin. C4 and 03 §4: `{accountId, username, email?}`. 03 §2 says view models never carry an account id; the result reaches the staff browser. The owner's answer for U9 shows the holder their own email masked, which is a different case (a person's own address on their own pages).

A. **`{username, displayName, email?}` with no account id; the full email only for a Super Admin, read only in that case** (recommended). C4 and 03 §4 are corrected (F16); nothing calls the operation yet. The Super Admin's legal or security contact needs the full address.
B. **`{accountId, username, email?}` as C4 says.** The console holds an internal account id it has no use for; enforcement goes through the case, not the account id.
C. **As A, but the Super Admin also sees the email masked** (for example `s***@example.test`), like the holder's own address. Less exposure, but a masked address cannot be used to contact anyone, which is the reason the Super Admin sees it.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 4

Does the reveal input carry a purpose besides the free-text reason?

Why this is open: AC3.3.5 says the Super Admin "must state a purpose"; the architecture note asks for "a stated moderation/security/legal reason". The contract input is `{targetKind, targetId, reason}`. Audit details may hold ids and enums only (01-conventions §5), so a free-text reason can live only in `identity_reveals`, and an audit reader cannot tell what a reveal was for.

A. **Add a required `purpose` from `moderation`, `security`, `legal`, kept with the reason (at least 10 graphemes)** (recommended). The purpose goes into the reveal row and the audit details; the reason stays only in the reveal row. A new enum and column in the same migration; no caller exists yet.
B. **Keep the reason only.** No schema change; the audit stream cannot say what reveals were for without free text.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 5

How is the staff notification of a reveal attempt written?

Why this is open: T-104 step 4 says insert `staff_notifications` kind `identityReveal` with `target_code`. FD-065 makes Notification the owner of that table, and C15 already routes `identity.revealed {revealId, granted}` to U34's `notification.deliver`, which runs in the worker. The worker has no privilege on `identity_reveals` (02 §16 (f)), so from `{revealId, granted}` it cannot find the target code the notice needs (F2).

A. **Append `identity.revealed` with the payload `{revealId, granted, outcome, targetKind, targetCode?, requesterRole}` and write no notification row here** (recommended). `targetCode` (the review or comment public id, or the case code) comes from `RevealTarget` and is absent when an unauthorised attempt never resolved the target. No account or persona id. Until U34 routes the event, the acceptance row reads "three outbox events" (F25).
B. **Insert one `staff_notifications` row in the reveal transaction**, as the task says. Writes another module's table, and U34 must then skip `identity.revealed` to avoid a duplicate notice.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 6

What does an anonymous byline show, and what happens to the seeded anonymous personas?

Why this is open: AC3.3.2 says "each thread shows its own stable alias for the author, the two aliases differ", and storyboard step 14 expects "alias `patient-xxxx`" on a new anonymous experience. The prototype never shows an alias: its byline says "Written anonymously" with an "Anonymous" chip. The 12 seeded anonymous personas all have the display name `Anonymous`, so the alias uniqueness index (BR2.2) cannot even be created on the seeded data (F6).

A. **The byline shows the thread's alias as the name, with "Written anonymously" kept as the lede and the "Anonymous" chip as in the prototype; the seed gives each seeded anonymous persona its own alias** (recommended). No new copy; meets AC3.3.2 and step 14. The seed change is an owned-path addition in `seed-content.ts`, made after the Unit now editing the seed has merged; U27 T-307 and U31 T-402 render the name the byline data gives them.
B. **Never show the alias**: bylines stay exactly as the prototype, the alias exists only as the persona's stored name, and AC3.3.2 and storyboard step 14 are reworded through a requirements change. The seed still needs distinct aliases for the index.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 7

How can an anonymous review and its thread link be written in one transaction?

Why this is open: `reviews.author_persona_id` is `NOT NULL` and points at `personas`, and `persona_links.review_id` points at `reviews` with an immediate (not deferrable) key. Publishing an anonymous review needs the persona before the review and the review before the link. The seed works around it today by back-filling the review id afterwards (F5).

A. **Make `persona_links_review_id_reviews_id_fk` `DEFERRABLE INITIALLY DEFERRED`** (keeping `ON DELETE SET NULL`), as `evidence_items.published_artifact_id` already is (recommended). The publish command generates the review id, calls `personaFor`, inserts the review; the key is checked at commit. One statement pair in the migration; no contract change.
B. **Split `personaFor` into "reserve" (persona only) and "bind" (link after the review insert)**. No key change, but every caller (U21, U30) must make two calls in the right order, and a reserved persona that is never bound is an orphan.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 8

Which modules receive the private identity repository?

Why this is open: T-104 step 6 passes it to the identity module, the data-requests module and moderation enforcement. C4 gives those two their own identity operations instead (`accountsOf`, `personasOf`, `deidentify`).

A. **Only the identity module**; data requests and moderation call identity's operations (recommended). One recipient makes the boundary type test (BR3.2) simple and strict; nothing the other two need is lost.
B. **The three modules the task names**, each with placeholder factories now. Three places can read the link table directly; the type test allows three.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 9

How is reveal proven before any module implements `RevealTarget`?

Why this is open: the review, comment and report resolvers are built by U21, U30 and U32, all after this Unit, so a real reveal has no target to resolve yet. T-104's "Reveal always recorded" row and T-106's "Capability toggles" row both expect a working reveal (F11).

A. **Build the port and an empty registry; prove every acceptance row with a test resolver** registered in the application tests and the web integration test against seeded reviews; T-106 runs its reveal rows at that level, and the browser-level reveal waits for U35 T-406 (recommended). No code in another module's folder.
B. **Write an interim `review` resolver in `modules/review/reveal-target.ts`**, which U21 replaces. Reveal works on seeded reviews from this Unit on, but this Unit then writes into the review module's folder before its owner exists.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 10

Who may hold a thread-scoped anonymous persona (ISS-262)?

Why this is open: the prototype has anonymous comments on named and pseudonymous threads (k5 on r6, k16 on r4, k42 on r20); T-401 step 4 lets only the review's own anonymous author comment under the thread alias. ISS-262 asks T-401 and T-104 to confirm the product rule.

A. **Identity provides the mechanism for any account in any thread and decides nothing about who may use it; Community (U30) and Review (U21) own the rule** (recommended). ISS-262 stays open with U30 for the product decision; identity needs no knowledge of review authors.
B. **Identity refuses an anonymous persona unless the account wrote the thread's review anonymously.** Needs a review-author port from Review (a new cycle break) and fixes the product rule here, before U30 has looked at it.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 11

Does identity validate persona usernames (ISS-159, ISS-264)?

Why this is open: the seed gives named authors synthetic `named_<slug>` usernames, eight of them with hyphens outside `USERNAME_RE`. ISS-264 waits for "T-104 validates usernames". T-104's steps do not ask identity to validate them; registration (U8) already validates every real username.

A. **No: a persona's username is a copy of its account's username, matched exactly in lookups; identity does not re-validate** (recommended). ISS-159 and ISS-264 close with this ruling and a note for U38 T-409 that the profile route must match the stored value rather than re-apply the pattern. No seed change.
B. **Yes: identity validates with `USERNAME_RE`, and the seed's hyphenated names become underscored.** One rule everywhere, but a change to generated corpus files in another Unit's area for synthetic accounts nobody signs in with.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 12

What does this Unit do about ISS-108 (audit details checked by a shallow denylist)?

Why this is open: ISS-108 (S2) names T-104 as its owner. U8 builds `application/audit/` first, and the U10 draft relies on U8 to fix it, but U8's draft does not say so. The `identity` stream is the most sensitive audit stream there is.

A. **At the start of Code Generation, check whether U8 fixed it; if not, make the detail check recursive and allowlist-based (ids, enums, counts, booleans, before/after values) in `application/audit/` and `audit-writer.ts`, with a test for each case in ISS-108, before writing any identity audit row** (recommended). Owned-path addition only in that case; closes ISS-108.
B. **Write only flat, allowlisted details here and leave ISS-108 open for U8.** Less work now; every other Unit's audit rows stay exposed to the gap.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change). Refreshed 2026-10-29: U8's refreshed draft fixes and closes ISS-108 (its BR8.2), so this Unit only confirms the closure at baseline and adds the `identity` stream's detail builders; the fallback stays for the case U8 did not.

## Question 13

Is the number of reveal attempts limited?

Why this is open: no source sets a limit. One step-up lasts 5 minutes (U10), during which a Super Admin session (or someone holding it) could reveal many authors. Every attempt is recorded and notified either way.

A. **20 attempts per hour per account through the `RateLimiter` port; the 21st is refused with `rate_limited` and recorded** (recommended). Far above any real moderation need; caps the damage of a hijacked session.
B. **No limit**: the record and the staff notice are the only defence.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 14

How is the account's current named persona known after a rename?

Why this is open: T-104 step 3 says `renameNamed` creates a new named persona "and makes it default", but no column records a default, and U8's `getActor` reads "the named persona".

A. **The newest named persona linked to the account is the current one** (UUIDv7 ids are time-ordered); no new column; `renameNamed` is an internal operation on the caller's transaction, and the account command that calls it (U38 T-409) also updates `account_profiles.display_name` and writes the audit row (recommended).
B. **A flag column (`personas.is_current`) or a pointer (`account_profiles.named_persona_id`).** Explicit, but the flag is account data on a public table or a second link to keep in step.
X. Other (please specify)

[Answer]: A (chosen by the agent on the owner's standing instruction of 2026-10-27; to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 15 — for the owner (not pre-filled: it decides what stays public after an account is deleted)

When an account is deleted, what do its named and pseudonymous personas show on the retained reviews and comments?

Why this is open: the sources contradict each other. T-104 step 3 and its "Deidentify" acceptance row replace the display names of named and pseudonymous personas with a localised "Former member". C4 ("personas keep their snapshots"), the Units table's deletion participants and T-410 step 3 ("personas keep their snapshot display names, public context stays coherent") keep them. FR13 says retained public contributions are "de-identified" (AC10.3.3). Keeping the snapshot leaves a deleted person's real name, or their username, on everything they wrote. This decides a data boundary, so the agent does not answer it. Anonymous aliases stay unchanged in every option.

A. **Keep the snapshots** (C4, T-410). Threads read as before; nothing extra to build. A deleted person's real name and username stay public on their retained posts, which is hard to call "de-identified".
B. **Show "Former member" for named and pseudonymous personas whose link was removed, and no username or profile link** (T-104 step 3). One nullable column (`personas.deidentified_at`), one key in both languages (`byline.formerMember`: en "Former member", bn "প্রাক্তন সদস্য"), and C4, T-410 and the Units table corrected; held posts change only when their hold ends, which T-309's function must then also do. Suggested by the agent.
C. **Replace only the named (real-name) personas; keep pseudonymous usernames.** Removes the real name; the username, chosen to be public, stays.
X. Other (please specify)

[Answer]: B (the owner's answer, 2026-10-29: "Former member" for named and pseudonymous personas, no username or profile link; C4, T-410 and the Units table are corrected). Recorded as FD-<next: Former member> (`functional-spec.md` § 9.1), appended before this Unit's code.

## Question 16

When a named or pseudonymous persona becomes a "Former member", is its stored snapshot scrubbed or only hidden?

Why this is open: Question 15 B says what the public sees, not what stays in `personas`. `rk_worker` holds SELECT on `personas` ("live, not ratified", FD-092), and any later copy of a persona's name, a search index for example, would read the stored value. FR13 says retained contributions are "de-identified".

A. **Scrub in the deletion transaction** (recommended): `deidentified_at = now`, `display_name = ''`, `username = null`, `avatar_hue = 0`. A check constraint makes a half-scrubbed row impossible, and anonymous personas are never scrubbed. FD-090's held-link function applies the same scrub when a hold ends. One-way; the name was the deleted person's own data.
B. **Hide only**: set `deidentified_at` and leave the name and username stored; the projection omits them. Less to write, but the name stays in the database, readable by the worker and by every future reader of `personas`.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## Question 17

The T-201 and T-202 drafts define their own `BylineVM`: nothing for anonymous authors, a display name for named and a username for pseudonymous authors, no username for named ones and no "Former member" form. The refreshed T-301 draft builds its `PageBylineVM` from identity's byline data with the thread alias, `profileUsername` for named and pseudonymous authors and `formerMember` (its Questions 17–19), keeps the alias off list cards, and asks T-104 and T-201 to agree on one shape (its F25). Which shape do all pages use?

Why this is open: AC3.3.2 and storyboard step 14 need each thread's alias on screen, which the T-201 shape cannot show. FR11 and AC10.2.1 make a public profile show the username and display name with the account's named and pseudonymous contributions, so a profile link on a named byline reveals nothing the profile does not; T-202's Question 7 A (plain text for a real-name byline, "the narrower, reversible choice") was written before T-301 Q18 settled that. Question 15 B adds a "Former member" form that the T-201 shape lacks. Several shapes would drift, and the persona projection is identity's contract (C4).

A. **One `BylineVM`, owned by identity and built only by `domain/identity/byline.ts`, with a thread and a list surface** (recommended). Fields:
   - `personaKind` and `avatarHue`;
   - named: `displayName`, `initials` and `profileUsername`;
   - pseudonymous: `username`, `initials` and `profileUsername`;
   - anonymous: `alias` (the persona's stored name, `patient-xxxx`) on the thread surface only, never `profileUsername`;
   - former member: `formerMember` only.

   `identity.bylinesFor({personaIds, surface})`: `thread` for the experience page, its preview, comments and the thread's reaction lists; `list` for cards, facility accounts, search results and profile lists, which leaves out `alias` and nothing else. `PersonaPublicVM` becomes its alias. U14 T-201's `ProviderExperience` (list) and every byline renderer take it from `identity.bylinesFor`; T-301's `PageBylineVM` maps the thread surface one to one. The T-201 shape is extended additively (`profileUsername`, `alias`, `formerMember`, `avatarHue`); the lede, chip and link choices stay in the components. T-202's `Byline` links a named author to the profile (F33). No FD entry is needed: FR11 and AC10.2.1 already require what the link shows.
B. **The T-201 and T-202 shape** (no alias, no profile username on named bylines). AC3.3.2 and storyboard step 14 then need a requirements change; `formerMember` is still needed; T-301 Q18 changes.
C. **No username on named bylines, otherwise as A** (this draft's first refresh). Keeps T-202 Q7 A; T-301 Q18 changes to its B and T-307 step 2 changes; readers lose the way from a named review to the profile the requirements describe.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change; the first refresh answered C's rule, and the second pass of the same day moved to A to match T-301 Q18 A and F25; the T-201, T-202 and T-301 drafts follow it when they are finalised)

## Question 18

How does `identity.personaFor` retry an alias or thread clash inside the caller's transaction?

Why this is open: the first draft opened a nested savepoint (`tx.transaction(...)`) in the application. Since T-010 and U8, the application holds `Tx` as an opaque type and may import no database library, so it cannot open a savepoint. Without one, a unique violation aborts the caller's whole PostgreSQL transaction.

A. **The private repository runs the savepoint**: `createAnonymousPersona(tx, …)` inserts the persona and link inside its own nested transaction and returns `created`, `alias_taken` or `thread_taken` as data. Identity retries or re-reads (recommended). No port of U8's changes.
B. **U8's `UnitOfWork` gains `savepoint(tx, fn)`**, and identity keeps the retry loop around it. More general, but it widens U8's port, its fake and its implementation for one caller.
X. Other (please specify)

[Answer]: A (decided by the agent under the owner's no-questions instruction of 2026-10-29, to be listed in docs/aidlc-migration/OWNER-REVIEW-QUEUE.md for the owner to confirm or change)

## The points raised for the owner, now settled

Details are in `functional-spec.md` § 9.

- **Q15** above: answered by the owner (B, "Former member"); FD-<next: Former member>.
- **R1 — The anonymity note in the writing flow and on the review page.** Decided by the agent under the owner's no-questions instruction of 2026-10-29, consistently with the T-301 draft's Q16 A and the owner's T-207 Q1:
  - the public experience page shows no anonymity caveat;
  - U26 T-306 rewords `compose.identity.anonNote` without the legal or staff-access sentence. It keeps "Anonymous hides your name from readers." with a line such as "Your name and profile are not shown with this review";
  - the full explanation lives in a section of both the Terms and the Privacy Policy.
  - This Unit changes no copy and appends no row for it. The FD entries are U21 T-301's (page and composer) and U20 T-207's (policy pages); the key is U26 T-306's and U27 T-307's.
