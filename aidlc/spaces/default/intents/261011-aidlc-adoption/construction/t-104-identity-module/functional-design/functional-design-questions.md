# Functional Design questions — U11 `t-104-identity-module` (release 1)

Every question below was decided by the agent under the owner's delegation of 2026-11-04, by the recommended option. Each lists the options with what they mean and the reason for the choice. The owner can reverse any answer at the stage gate; `rules.md` names the rules each answer drives.

## Q1 — How does `isReviewAuthor` check ownership while the persona link stays private?

A. A narrow private check `ownsPersona(accountId, personaId) → boolean` on an `IdentityOwnership` object that only the review and community module factories receive (recommended in `contract-summary.md`)
B. Give the review module `accountsOf(personaIds)`: it would hold account ids for personas
C. Store the author's account id on `reviews`: a public table would carry the link (breaks AD-3)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. One boolean, from the actor's own account id, unknown ids `false`, never logged (BR3.3, BR3.5). U49 uses it for comment authorship; U48 and U22 go through `isReviewAuthor`.

## Q2 — How does `account.register` reach identity without changing `CommandPorts` or U9's server actions?

A. Keep the call `AccountRepository.insertDefaultPersonas`; its Postgres implementation delegates to `PgPrivateIdentityRepository.createDefault`, so only `identity-private.ts` writes persona tables
B. Give the account module a factory `createRegisterCommand(identity)`: changes the `registerCommand` export that U9's `actions/{account,auth}.ts` import, which U9 builds in the same batch (the swarm rule forbids two parallel Bolts touching one file)
C. Add identity to `CommandPorts` (C19 says it is closed)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04. No call site, port or U9 file changes (BR1.2). Release 2 can move register onto the module operation when the account module gets a factory.

## Q3 — How does U47 list the account's own reviews (anonymous ones included) on `/me`?

A. `IdentityOwnership.ownPersonaIds(accountId)`, from the actor's own account id only, for that account's private lists (C4's deferred `personasOf`, narrowed and brought forward)
B. U47 keeps the demo query that joins `persona_links` (a second reader, BR3.1)
C. Leave anonymous reviews off the own list (the author would lose sight of their own work)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR3.4).

## Q4 — Where do the module ports live, and how are files outside the owned paths handled?

A. `modules/identity/ports.ts` as C19 says; `ports/repositories/identity.ts` is not created; every file outside the owned paths (`functional-spec.md` § 7) is listed with an `ISS-` row
B. Create `ports/repositories/identity.ts` as the owned-path list says (contradicts C19, which is newer)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04.

## Q5 — Where does the alias get its randomness?

A. `Crypto.randomToken()` (already on the port, base64url of random bytes) with rejection sampling
B. Add `randomBytes` to the `Crypto` port (a C19 change to a merged T-101 port)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR2.5).

## Q6 — Batch projection?

A. Add `publicProjections({personaIds})`, up to 200, input order, alongside C4's `publicProjection({personaId})` (additive)
B. One call per byline
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR1.5).

## Q7 — How does the author page `/authors/[username]` find its personas?

A. `publicPersonaIdsByUsername(username)`: named and pseudonymous personas with that stored username, from the public `personas` table, never anonymous
B. Through the account: needs the private link
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR1.6).

## Q8 — Avatar hue for new named and pseudonymous personas?

A. Null, as the demo slice writes today; anonymous always 0; a rename copies the current hue
B. A random hue (needs another random draw and gives no release-1 benefit)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR1.7).

## Q9 — An account with no named or pseudonymous persona (seeded and demo-created accounts)?

A. `personaFor` creates it once from the profile's current username and display name, in the caller's transaction; this is identity's one read of an account table
B. Return an error: seeded accounts could not write
C. A backfill migration (the seed runs after migrations, so it would not cover seeded accounts)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR2.2).

## Q10 — Alias clash and concurrent first use inside the caller's transaction?

A. The private repository inserts in a savepoint and answers `alias_taken` or `thread_taken`; identity retries the alias up to 5 times and re-reads on `thread_taken`
B. Let the unique violation abort the caller's transaction
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR2.4, BR2.6).

## Q11 — Seeded anonymous personas carry the text "Anonymous", not an alias?

A. Project them with `displayName` null, so components show only the localized "Written anonymously"; leave the seed unchanged (it is outside this Unit)
B. Change the seed to generate aliases (outside the owned paths, and it touches FD-040 seed code)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR2.7). Recorded as an `S4` row so a later seed refresh can add aliases.

## Q12 — Order of inserts for an anonymous publish?

A. Make `persona_links.review_id`'s key deferrable, initially deferred, so persona and link go first and the review last, in one transaction
B. Split `personaFor` into create-persona and link-later steps for U47 to call
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR2.9).

## Q13 — The demo-slice files still read `persona_links`?

A. The boundary test allows them by name, each with the Unit that deletes it (U47, U49); the list only shrinks
B. U11 rewrites them (they are U47's and U49's to replace)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR3.1).

## Q14 — Does `renameNamed` also update `account_profiles.display_name`?

A. No: it creates the new named persona only; the account module owns the profile, and the profile flow that calls both comes with U38 (release 2)
B. Yes: identity would write an account table
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR4.1).

## Q15 — Migration number while U46 and U9 build in parallel?

A. One migration, renumbered to the next free number when the Bolt is rebased for its merge, with the count tests updated
B. Reserve a number now (another Bolt could still take it first)
X. Other (please specify)

[Answer]: A — decided by the agent under the owner's delegation of 2026-11-04 (BR5.4).
