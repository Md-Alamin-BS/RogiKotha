# Business rules — U11 `t-104-identity-module` (release 1)

The decision logic of this Unit. Sources: `unit-of-work.md` (U11, narrowed by FD-105), `unit-of-work-story-map.md` (US3.3), `requirements.md` (FR10, FR11), `stories.md` (AC3.3.1–AC3.3.6), `contract-summary.md` (C4 and its release-1 amendment, C9 `isReviewAuthor` and its open question, C19), T-104, AD-3, FD-015, FD-022, FD-105 and the code on `main`. The questions behind these rules are in `functional-design-questions.md`; each one was decided by the agent under the owner's delegation of 2026-11-04.

"Private repository" means `PrivateIdentityRepository`, implemented only by `packages/database/src/repositories/identity-private.ts`. "Caller's transaction" means the `Tx` of the command that calls an identity operation; identity's internal operations never open a transaction of their own.

**At a glance:**

- Public content points at personas. Only `identity-private.ts` reads `persona_links`; the worker cannot (BR1.1, BR3.1, BR3.7).
- One anonymous persona per account per review thread, with a random alias; another thread gets an unrelated one (BR2.4–BR2.6).
- `PersonaPublicVM` never carries an id, and an anonymous projection never carries a username (BR1.4).
- Other modules learn ownership through `ownsPersona` (one boolean) or `ownPersonaIds` (the actor's own ids), and only the review and community modules receive them (BR3.3–BR3.5).

```yaml
rules:
  # Group 1 — Personas and the public projection
  - id: BR1.1
    statement: "personas has no account column; the link from a persona to its account lives only in persona_links."
    category: constraint
    applies_to: "packages/database/src/schema/identity.ts, every migration"
    trigger: "Any schema change"
    logic: "a schema test compares the columns of personas with the exact allowed list {id, kind, display_name, username, avatar_hue, created_at}; IF any other column appears THEN the test fails, so no account, user or email column can be added"
    violation: "A direct join from public content to the account (S1)"
    source: "AD-3, T-104 threat 1, FR10 (FD-015)"
  - id: BR1.2
    statement: "Registration creates exactly one named and one pseudonymous persona, each with a private link, through the private repository; a repeat for the same account creates nothing."
    category: constraint
    applies_to: "identity.createDefaultPersonas, PrivateIdentityRepository.createDefault, account.register"
    trigger: "account.register writes a new account"
    logic: "IF the account already has a named and a pseudonymous persona THEN return their ids ELSE insert named {display_name = displayName, username} and pseudonymous {display_name = username, username}, avatar_hue null, and one persona_links row each with review_id null; account.register keeps calling AccountRepository.insertDefaultPersonas (C19 unchanged), and PgAccountRepository.insertDefaultPersonas delegates to PgPrivateIdentityRepository.createDefault, so no persona SQL stays in the account repository (Q2)"
    violation: "Missing or extra personas break register and personaFor"
    source: "C4 createDefaultPersonas, T-104 step 3, Q2"
  - id: BR1.3
    statement: "A persona is an immutable snapshot: its kind, display name, username and hue never change after insert."
    category: constraint
    applies_to: "IdentityRepository, PrivateIdentityRepository"
    trigger: "Any write to personas"
    logic: "The repositories expose inserts only; a rename creates a new persona (BR4.1)"
    violation: "Editing a snapshot rewrites old bylines (T-104 threat 6)"
    source: "AD-3, 02-data-model.md §3, T-104 threat 6"
  - id: BR1.4
    statement: "PersonaPublicVM carries exactly the keys its kind allows and never an id, an account field, a review id or a timestamp."
    category: constraint
    applies_to: "packages/domain/src/identity/projection.ts, identity.publicProjection, PersonaPublicVM"
    trigger: "A persona is projected"
    logic: "named → {kind, displayName, username, avatarHue}; pseudonymous → {kind, displayName = username, username, avatarHue}; anonymous → {kind, displayName = alias or null (BR2.7), avatarHue: 0}, never username; a property test over 1 000 generated personas asserts no key from the denylist (id, personaId, accountId, account_id, email, reviewId, review_id, createdAt, userId, authUserId) and the exact key set per kind"
    violation: "A denylisted key or a username on an anonymous projection is a linkage leak (S1)"
    source: "C4 publicProjection, T-104 step 1, FD-015, AC3.3.2, AC3.3.3"
  - id: BR1.5
    statement: "identity.publicProjections returns the projections of up to 200 persona ids in input order, omitting unknown ids."
    category: calculation
    applies_to: "identity.publicProjection, identity.publicProjections"
    trigger: "A page renders review or comment authors"
    logic: "ids de-duplicated; more than 200 THEN programmer error; one read of personas; unknown id omitted, never an error; publicProjection({personaId}) is the one-id form and returns null for an unknown id"
    violation: "One query per byline on a thread; an error for an unknown id would tell a caller which ids exist"
    source: "C4 publicProjection (batch form additive, Q6)"
  - id: BR1.6
    statement: "identity.publicPersonaIdsByUsername returns the named and pseudonymous personas whose stored username equals the given one, and never an anonymous persona."
    category: policy
    applies_to: "IdentityRepository.publicIdsByUsername; caller U47 (the author page /authors/[username])"
    trigger: "The author page resolves its username"
    logic: "WHERE username = :u AND kind IN (named, pseudonymous); exact match; anonymous personas have username null and never match, even when :u equals an alias; the ids stay server-side"
    violation: "Resolving an alias to a profile is the path FD-015 forbids"
    source: "FR11, FD-015, AC3.3.3, Q7"
  - id: BR1.7
    statement: "Every anonymous persona has avatar hue 0; named and pseudonymous personas get null in release 1 and a rename copies the current hue."
    category: constraint
    applies_to: "createDefaultPersonas, personaFor, renameNamed"
    trigger: "A persona is created"
    logic: "anonymous: 0, never derived from the account or the thread; named and pseudonymous: null (as the demo slice writes today; the component falls back to its default); rename: the current named persona's hue"
    violation: "A per-account hue on anonymous personas would correlate threads"
    source: "FD-015, seed corpus (anonymous avatarHue 0), Q8"

  # Group 2 — personaFor and the thread alias
  - id: BR2.1
    statement: "personaFor in named mode returns the account's current named persona, the newest one; in pseudonymous mode the newest pseudonymous one; reviewId is ignored."
    category: calculation
    applies_to: "identity.personaFor, PrivateIdentityRepository.currentOf"
    trigger: "mode named or pseudonymous"
    logic: "newest by id (UUIDv7) among the account's personas of that kind whose link has review_id null"
    violation: "Two current named personas make new bylines unpredictable"
    source: "C4 personaFor release-1 rule 1, T-104 step 3 (renameNamed makes it default)"
  - id: BR2.2
    statement: "When an account has no persona of the requested named or pseudonymous kind, personaFor creates it once in the caller's transaction from the account profile's current username and display name."
    category: policy
    applies_to: "identity.personaFor, PrivateIdentityRepository.createMissingDefault"
    trigger: "Seeded or demo-created accounts that lack a default persona"
    logic: "INSERT … SELECT from account_profiles (username, display_name) of a live account, inside identity-private.ts, the only read of an account table by identity; no live account THEN programmer error (the caller passes the actor's own account)"
    violation: "Without it a seeded account cannot write under its username (the demo slice works around this in session.ts)"
    source: "demo/session.ts (seeded accounts lack a named persona), Q9"
  - id: BR2.3
    statement: "personaFor in anonymous mode requires a reviewId; without one it is a programmer error."
    category: validation
    applies_to: "identity.personaFor"
    trigger: "mode anonymous"
    logic: "reviewId absent THEN throw a programmer error (becomes internal in the command wrapper); release 1 has no anonymous use without a thread"
    violation: "An unscoped anonymous persona would be reusable across threads"
    source: "C4 personaFor release-1 rule 2"
  - id: BR2.4
    statement: "An account has at most one anonymous persona per review: the same (accountId, reviewId) always returns the same persona, and another reviewId never does."
    category: constraint
    applies_to: "identity.personaFor, PrivateIdentityRepository.findAnonymous and insertAnonymous, persona_links_account_review_uq"
    trigger: "mode anonymous with a reviewId"
    logic: "find the link (account_id, review_id) THEN its persona; ELSE insertAnonymous; on thread_taken (the unique index, a concurrent first use) THEN read the existing link and return it"
    violation: "Two personas in one thread break AC3.3.1; one persona across threads breaks AC3.3.2"
    source: "FD-015, C4 personaFor, T-104 acceptance 'Alias scoped', AC3.3.1, AC3.3.2"
  - id: BR2.5
    statement: "An alias is 'patient-' plus 4 characters drawn uniformly from abcdefghjkmnpqrstuvwxyz23456789 with Crypto.randomToken, and is derived from nothing else."
    category: calculation
    applies_to: "packages/domain/src/identity/alias.ts newAnonymousAlias(randomSource)"
    trigger: "A new anonymous persona is created"
    logic: "read only the first 42 base64url characters of each randomToken() (32 bytes give 43 characters; the 43rd carries only 4 random bits, so it is skewed and dropped); index i = position in A–Z a–z 0–9 - _; keep only i < 62; character = ALPHABET[i mod 31]; draw a new token when one runs out; no hash of an account id, review id, time or counter"
    violation: "An alias derived from account data links threads; a biased draw shrinks the alias space"
    source: "T-104 step 1, FD-015, Q5"
  - id: BR2.6
    statement: "Generated aliases are unique; a clash is retried with a new alias up to 5 times, then personaFor fails with internal and writes nothing."
    category: constraint
    applies_to: "PrivateIdentityRepository.insertAnonymous, personas_anonymous_alias_uq"
    trigger: "Inserting an anonymous persona hits the alias index"
    logic: "insertAnonymous runs its two inserts in a savepoint of its own and answers ok, alias_taken or thread_taken, leaving the caller's transaction usable; identity retries alias_taken with a new alias; after 5 THEN err internal and log identity.alias_exhausted {attempts}"
    violation: "Two anonymous authors in one thread could share a name; an unbounded loop hangs a publish"
    source: "T-104 step 3 (alias uniqueness retried on collision), Q10"
  - id: BR2.7
    statement: "An anonymous persona whose stored display name is not a generated alias (the seeded 'Anonymous') is projected with displayName null, so components show only the localized 'Written anonymously'."
    category: policy
    applies_to: "packages/domain/src/identity/projection.ts"
    trigger: "Projecting an anonymous persona"
    logic: "IF display_name matches ^patient-[abcdefghjkmnpqrstuvwxyz23456789]{4}$ THEN displayName = display_name ELSE null"
    violation: "The English seed text would show on Bengali pages, and every seeded thread would share one name"
    source: "seed corpus (anonymous displayName 'Anonymous'), FD-024, Q11"
  - id: BR2.8
    statement: "A link is never re-pointed: a persona's account and review never change."
    category: constraint
    applies_to: "PrivateIdentityRepository"
    trigger: "Any write to persona_links"
    logic: "inserts only, in application code and in the seed; changing the identity mode of published content is not an identity operation; the seed's back-fill update of review_id in seed-content.ts (around line 330) becomes a direct insert of the link with its review_id, which the deferrable key of BR2.9 allows; that edit is U11's block in the shared seed-content.ts"
    violation: "Re-pointing an anonymous persona de-anonymises a thread"
    source: "AD-3, T-104 threat 6"
  - id: BR2.9
    statement: "persona_links.review_id's foreign key is deferrable, initially deferred, so personaFor can link a persona to a review the caller inserts later in the same transaction."
    category: constraint
    applies_to: "the migration, review.publish (U47), comment.post (U49)"
    trigger: "An anonymous review is published"
    logic: "drop and re-add persona_links_review_id_reviews_id_fk DEFERRABLE INITIALLY DEFERRED, ON DELETE SET NULL kept; review.publish generates the review id, calls personaFor, then inserts the review with author_persona_id; the seed inserts each anonymous link with its review_id directly (BR2.8)"
    violation: "reviews.author_persona_id is NOT NULL and the link needs the review, so an anonymous publish cannot commit"
    source: "0004_deferred_fks.sql (evidence precedent), Q12"
  - id: BR2.10
    statement: "personaFor does not decide who may use a thread alias; the calling module does."
    category: policy
    applies_to: "identity.personaFor; callers U47 and U49"
    trigger: "A caller asks for an anonymous persona"
    logic: "no authorship or eligibility check in identity; U49 decides whether a commenter may comment under a thread alias (C4 release-1 rule 3: the review's own author resolves with the review's reviewId)"
    violation: "A check here needs a review seam inside identity, a new cycle"
    source: "C4 personaFor release-1 rule 3, FD-067"

  # Group 3 — The private boundary
  - id: BR3.1
    statement: "Only identity-private.ts reads or writes persona_links."
    category: constraint
    applies_to: "every non-test source file"
    trigger: "Any source change"
    logic: "a test lists every non-test source file that imports the personaLinks table symbol OR contains the string persona_links in code outside comments (raw SQL, sql template strings), and allows only: schema/identity.ts; repositories/identity-private.ts; the migrations; the FD-040 seed files packages/test-support/src/seed/seed-accounts.ts, seed-content.ts, seed-evidence.ts and seed-moderation.ts; and the demo-slice files that still read it, each with the Unit that removes it: demo/accounts.ts (U47), demo/accounts-create.ts (U47), demo/reviews.ts (U47), demo/session.ts (U47) and demo/comments.ts (U49); repositories/account.ts is not on the list, because its insertDefaultPersonas only calls PgPrivateIdentityRepository (BR3.2); the allowlist only shrinks"
    violation: "A second reader is a second path from an anonymous persona to its account (S1)"
    source: "AD-3, T-104 step 2, Q13"
  - id: BR3.2
    statement: "container.ts passes the private repository to createIdentityModule only."
    category: authorization
    applies_to: "apps/web/src/server/container.ts, container.test.ts"
    trigger: "The container builds the modules"
    logic: "PrivateIdentityRepository carries a unique-symbol brand; container.test.ts asserts with @ts-expect-error that no other module's ports type accepts it; one allowed exception at the database layer: PgAccountRepository.insertDefaultPersonas holds a PgPrivateIdentityRepository and calls only its createDefault (Q2, BR1.2), so register writes personas without the account module ever receiving the private repository"
    violation: "Another module holding the repository can join personas to accounts (T-104 threat 5)"
    source: "T-104 step 6, C19 module wiring"
  - id: BR3.3
    statement: "IdentityOwnership.ownsPersona(tx, {accountId, personaId}) answers only whether that persona is linked to that account."
    category: authorization
    applies_to: "packages/application/src/modules/identity/ownership.ts, PrivateIdentityRepository.owns; callers U47 isReviewAuthor, U49 comment authorship"
    trigger: "A module asks whether the signed-in account wrote a piece of content"
    logic: "EXISTS (persona_links WHERE persona_id = :p AND account_id = :a); true or false only, for every kind including anonymous; unknown ids THEN false, never an error; runs in the caller's transaction or read; the caller passes Actor.accountId and never an id from the request; the result is never logged or returned to the browser except as the caller's own yes/no (an edit link shown or a 'not_found')"
    violation: "A richer answer or a public path is a persona-to-account oracle (S1)"
    source: "contract-summary.md open question (C9, C4), C9 isReviewAuthor, Q1"
  - id: BR3.4
    statement: "IdentityOwnership.ownPersonaIds(tx, {accountId}) returns the persona ids of one account, for that account's own private lists only."
    category: authorization
    applies_to: "ownership.ts, PrivateIdentityRepository.personaIdsOf; caller U47 (the own-review list on /me)"
    trigger: "The account's own dashboard lists its reviews, anonymous ones included"
    logic: "every persona linked to the account, all kinds; the caller passes Actor.accountId only; at most 1 000 ids (programmer error beyond); never used for a public page"
    violation: "Used with another account's id it would list that account's anonymous threads (S1)"
    source: "unit-of-work.md U47 (own-review list on /me), C4 personasOf (narrowed and brought forward), Q3"
  - id: BR3.5
    statement: "Only the review and community module factories receive IdentityOwnership."
    category: authorization
    applies_to: "container.ts, container.test.ts"
    trigger: "The container builds the modules"
    logic: "createIdentityModule returns {…operations, ownership}; container.ts passes ownership into createReviewModule and createCommunityModule only; container.test.ts asserts with @ts-expect-error that the directory, taxonomy and evidence ports types do not accept it; evidence (U48) uses review's isReviewAuthor instead"
    violation: "A module outside the two can probe authorship of any content"
    source: "Q1, C19 module wiring"
  - id: BR3.6
    statement: "No server action or route handler exposes an identity operation that takes an account id or returns a persona id."
    category: authorization
    applies_to: "apps/web/src/server/actions/**, apps/web/src/app/api/**"
    trigger: "Any action or route is added"
    logic: "a test asserts no file there imports modules/identity internals; identity.renameNamed is the only identity command a server action may call, and it takes no account id (the actor's)"
    violation: "A public persona-to-account oracle (S1)"
    source: "C4 (internal operations), 01-conventions §1"
  - id: BR3.7
    statement: "The worker can neither read persona_links nor import the identity module."
    category: authorization
    applies_to: "rk_worker grants, apps/worker, eslint boundaries"
    trigger: "Any worker or grant change"
    logic: "integration test as rk_worker: SELECT from persona_links fails with permission denied; the existing REVOKE in 0001_grants_part1.sql is enough, so no grants migration; the boundary lint refuses a worker import of modules/identity"
    violation: "Breaks T-104's 'Worker cannot read links' row and AD-6"
    source: "T-104 step 5, 02-data-model.md §16, FD-093"
  - id: BR3.8
    statement: "Identity never puts an account id together with a persona id, an alias or a username in one log line or audit record, and never logs an ownership answer."
    category: constraint
    applies_to: "every Logger and AuditWriter call in modules/identity"
    trigger: "A log line or audit row is written"
    logic: "allowed: event, correlationId, one opaque id kind per line, enums, counts; a log-capture test runs every identity operation and asserts it"
    violation: "Account and persona pairs in logs re-create the link outside the database (T-104 threat 8, S1)"
    source: "T-104 threat 8, 01-conventions §11"

  # Group 4 — Rename
  - id: BR4.1
    statement: "identity.renameNamed creates a new named persona with the new display name and the current username and hue; old personas and their content are unchanged; an unchanged name changes nothing."
    category: constraint
    applies_to: "identity.renameNamed"
    trigger: "A signed-in account renames its named persona"
    logic: "requires authenticated; input {displayName} NFC, trimmed, 1–60 characters ELSE validation with errors.auth.displayNameRequired; IF equal to the current named persona's display name THEN ok {changed: false} and no audit; ELSE insert persona and link, audit account:<accountId> named_persona_created {}, ok {changed: true}; returns no persona id; account_profiles.display_name is the account module's and is not written here"
    violation: "Editing the old persona rewrites old bylines (T-104 threat 6)"
    source: "C4 renameNamed, T-104 step 3, Q14"

  # Group 5 — Scope, copy and records
  - id: BR5.1
    statement: "This Unit adds no user-facing string; any key it does add has an English and a Bengali entry in the same commit."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "Code Generation"
    logic: "renameNamed reuses errors.auth.displayNameRequired; bylines and their copy (byline.anonSentence, byline.identity.*) are rendered by U47 and U49 with keys that already exist in both languages"
    violation: "A key without its Bengali string fails the parity check"
    source: "project.md Mandated (Bengali and English), FD-024"
  - id: BR5.2
    statement: "Identity adds no copy about anonymity limits or staff access, and no projection carries such a note."
    category: policy
    applies_to: "PersonaPublicVM, packages/i18n identity keys"
    trigger: "Code Generation"
    logic: "PersonaPublicVM has no note field; this Unit changes no policy or composer text"
    violation: "A staff-access warning on the review page or in the writing flow fails AC3.3.6"
    source: "FD-022, AC3.3.6"
  - id: BR5.3
    statement: "The deferred operations are not built: no identity.reveal, identity.deidentify or identity.accountsOf, and nothing writes identity_reveals."
    category: policy
    applies_to: "modules/identity, identity-private.ts, schemas/identity.ts"
    trigger: "Code Generation"
    logic: "RevealIdentityInput and AccountsOfInput stay as they are; the stub PgIdentityRepository's recordReveal is removed with the stub, and not-implemented.test.ts drops PgIdentityRepository from its list in the same commit"
    violation: "Implementing part of a deferred contract silently breaks the ownership rules"
    source: "FD-105, contract-summary.md ownership rules (deferred contracts)"
  - id: BR5.4
    statement: "All schema changes of this Unit are one forward-only migration that takes the next free number when the Bolt is rebased for merge."
    category: constraint
    applies_to: "packages/database/src/migrations/"
    trigger: "Code Generation and merge"
    logic: "the two indexes (BR2.4, BR2.6) and the deferrable key (BR2.9); the journal entry's timestamp later than the previous one; the exact migration counts in migrations.int.test.ts and validator-probes.int.test.ts go up by one; renumbered if another batch-1 Bolt merged a migration first"
    violation: "An out-of-order journal entry is skipped silently (the CR-006 lesson)"
    source: "02-data-model.md (forward-only), FD-094 swarm, Q15"

  # Group 6 — Verification
  - id: BR6.1
    statement: "U11 is high-risk: a separate agent writes and runs 3–5 adversarial tests from functional-spec.md § 8, and they stay in the suite."
    category: validation
    applies_to: "U11 Build and Test"
    trigger: "Build and Test"
    logic: "the T-106 identity rows (no account id, email or link in any projection; alias stable within a thread and different across threads; persona_links unreachable from public code) are among them"
    violation: "Fails team.md Way of Working step 5"
    source: "team.md Way of Working, unit-of-work.md U11 (takes over from T-106)"
  - id: BR6.2
    statement: "The smoke suite gains at least one identity assertion and loses none."
    category: validation
    applies_to: "identity.smoke.test.ts"
    trigger: "Code Generation"
    logic: "personaFor returns the same persona twice for one thread and a different alias for another; its projection has no username and no id"
    violation: "Fails team.md Testing Posture (cumulative smoke suite)"
    source: "team.md Testing Posture"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | `personas` holds no account data | constraint |
| BR1.2 | Register creates one named and one pseudonymous persona through the private repository | constraint |
| BR1.3 | Personas are immutable snapshots | constraint |
| BR1.4 | `PersonaPublicVM` key set per kind; never an id; no username when anonymous | constraint |
| BR1.5 | Batch projection, at most 200, input order | calculation |
| BR1.6 | Username lookup never finds an anonymous persona | policy |
| BR1.7 | Anonymous hue 0; others null, copied on rename | constraint |
| BR2.1 | Named and pseudonymous mode return the newest of that kind | calculation |
| BR2.2 | A missing default persona is created from the profile on first use | policy |
| BR2.3 | Anonymous mode needs a reviewId | validation |
| BR2.4 | One anonymous persona per account per review | constraint |
| BR2.5 | Random `patient-xxxx` alias, no confusables | calculation |
| BR2.6 | Unique aliases, 5 retries in a savepoint | constraint |
| BR2.7 | Legacy "Anonymous" rows project with no alias | policy |
| BR2.8 | Links are never re-pointed | constraint |
| BR2.9 | Deferrable `persona_links.review_id` key | constraint |
| BR2.10 | Callers decide who may use a thread alias | policy |
| BR3.1 | Only `identity-private.ts` touches `persona_links` | constraint |
| BR3.2 | Only the identity module gets the private repository | authorization |
| BR3.3 | `ownsPersona`: one boolean, the actor's own account | authorization |
| BR3.4 | `ownPersonaIds`: the actor's own private lists only | authorization |
| BR3.5 | Only review and community receive `IdentityOwnership` | authorization |
| BR3.6 | No action or route exposes identity internals | authorization |
| BR3.7 | Worker cannot read links or import identity | authorization |
| BR3.8 | No account-and-persona pair in logs or audit | constraint |
| BR4.1 | Rename creates a new named persona | constraint |
| BR5.1 | No new strings; any key in both languages | policy |
| BR5.2 | No anonymity or staff-access copy | policy |
| BR5.3 | Reveal, deidentify and accountsOf are not built | policy |
| BR5.4 | One forward-only migration, renumbered at merge | constraint |
| BR6.1 | 3–5 adversarial tests by a separate agent | validation |
| BR6.2 | At least one identity smoke assertion | validation |
