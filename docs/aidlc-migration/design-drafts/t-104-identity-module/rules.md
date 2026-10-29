# Business rules — U11 `t-104-identity-module`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-104-identity-module/functional-design/`.

Source of truth for the Unit's decision logic. Built from `unit-of-work.md` (U11 and the deletion participants table), `unit-of-work-story-map.md` (US3.3), `requirements.md` (FR10, FR11, FR13, FR78), `stories.md` (AC3.3.1–AC3.3.6, AC10.2.1, AC10.2.3, AC10.3.3), `contract-summary.md` (C4, C5, C15 and the ownership rules), T-104, FD-008, FD-015, FD-016, FD-022, FD-065, FD-067, FD-069, FD-077, FD-078, FD-079, FD-086, FD-090, FD-092, FD-093, AD-3, the prototype (`byline()`, `accountsByAuthor()`, `renderPerson()`), the U8 and U10 drafts (`design-drafts/t-101-better-auth-adapter/`, `t-103-staff-access-and-devices/`) and the open `ISSUES.md` rows ISS-090, ISS-108, ISS-159, ISS-262 and ISS-264.

Refreshed 2026-10-29 against T-010 as merged (`14c21a9`), the refreshed U8 T-101 and U10 T-103 drafts, the T-201, T-202, T-207 and T-301 drafts and the owner's answers. The rules that changed are BR1.1, BR1.3, BR1.5–BR1.8, BR2.1–BR2.3, BR2.6, BR3.1, BR3.3, BR3.5, BR4.1, BR4.7, BR4.9, BR5.2, BR5.3, BR5.5, BR6.3, BR6.6, BR7.1–BR7.4, BR8.2, BR8.3 and BR8.5. BR3.7, BR7.8, BR8.6 and BR8.7 are new. A second pass the same day aligned the byline with the T-301 draft (its Question 18 A and F25: `profileUsername` for named and pseudonymous personas, no alias on list surfaces) and added `ownsAnyPersona` and the pseudonymous id of `currentPersonaOf` (T-301 Question 8, its F29).

The rules that depend on a question follow the answers in `functional-design-questions.md`. Questions 1–14 were chosen on the owner's standing instruction of 2026-10-27. Question 15 is the owner's answer, B (2026-10-29). Questions 16–18 and R1 were decided by the agent under the owner's no-questions instruction of 2026-10-29. All but Question 15 await the owner's confirmation. `functional-spec.md` § 14 lists what changes if the owner reverses an answer. "Private repository" always means `PrivateIdentityRepository`, implemented only by `packages/database/src/repositories/identity-private.ts`. "Attempt" means one call of `identity.reveal` by a signed-in account whose input parsed.

**Authorization and audit at a glance** (each line is a rule below):

- `identity.reveal` requires: signed in → capability `identity.reveal` (Super Admin always; Admin and Moderator only with their toggle, U10) → a step-up under 5 minutes old → 20 attempts per hour (BR4.1, BR4.2, BR4.9).
- Every attempt writes exactly one `identity_reveals` row, one audit row on the `identity` stream and one `identity.revealed` outbox event, whether granted or refused; malformed input and signed-out callers are refused and logged, not recorded (BR4.3, BR4.11, BR5.1).
- A granted reveal returns `username` and `displayName`; `email` only to a Super Admin; never an account id or a persona id (BR4.7, BR4.8).
- One public byline shape, `BylineVM`: named → display name and profile username; pseudonymous → username and profile username; anonymous → the thread alias on thread surfaces and no name on list surfaces; after deletion → "Former member" only; never an id (BR1.3, BR1.7, BR6.3).
- Audit details on the `identity` stream: `revealId`, `targetKind`, `targetId`, `outcome`, `granted`, `requesterRole`, `purpose`, `personaKind?`, `step_up`; never the reason, an account id of the revealed person, a username or an email (BR5.5). `identity.deidentify` audits `account:<id>` `identity_deidentified {removedLinks, keptLinks}` (BR6.6).
- Only the identity module receives the private repository; only `identity-private.ts` touches `persona_links` and `identity_reveals`; the worker can do neither (BR3.1–BR3.4).

```yaml
rules:
  # Group 1 — Personas and public projection
  - id: BR1.1
    statement: "personas is a public table with no account column; a persona's kind is named, pseudonymous or anonymous, and the link to its account lives only in persona_links."
    category: constraint
    applies_to: "packages/database/src/schema/identity.ts, every migration"
    trigger: "Any schema change"
    logic: "personas columns stay {id, kind, display_name, username, avatar_hue, created_at, deidentified_at} (deidentified_at added by this Unit's migration, Q15 B, with the check constraint personas_deidentified_scrubbed_ck of BR6.3); a schema test fails if a column whose name contains account, user or email is added to personas"
    violation: "An account column on a public table is a direct join from public content to the account (S1, threat T1)"
    source: "AD-3, 02-data-model.md §3, T-104 threat 1"
  - id: BR1.2
    statement: "Registration creates exactly one named and one pseudonymous persona with a private link each, through identity.createDefaultPersonas on the register transaction; a second call for the same account creates nothing."
    category: constraint
    applies_to: "identity.createDefaultPersonas, account.register"
    trigger: "account.register creates a new account"
    logic: "IF the account already has a named and a pseudonymous persona THEN return their ids ELSE insert named {display_name = displayName, username} and pseudonymous {display_name = username, username}, the same random avatar hue, and one persona_links row each with review_id null, through PrivateIdentityRepository.createDefault; no audit row of its own; U8's AccountRepository.insertDefaultPersonas (TODO(T-104)) is removed and account.register calls this operation instead (F28)"
    violation: "Missing or extra personas fail T-104's 'Register still works' row and U8's register test"
    source: "T-104 step 3, C4 createDefaultPersonas, U8 BR1.10 and § 6.2 (insertDefaultPersonas TODO(T-104)), 03 §4 account.register"
  - id: BR1.3
    statement: "The public projection of a persona is the one BylineVM shape: personaKind, avatarHue, and exactly the fields its kind allows (named: displayName, initials and profileUsername; pseudonymous: username, initials and profileUsername; anonymous: alias, on the thread surface only; de-identified: formerMember), never any account field."
    category: constraint
    applies_to: "packages/domain/src/identity/{projection,byline}.ts, identity.publicProjection, identity.bylinesFor, BylineVM (PersonaPublicVM is its alias)"
    trigger: "Any public rendering of a persona"
    logic: "named → {personaKind, displayName, initials, profileUsername = username, avatarHue}; pseudonymous → {personaKind, username, initials, profileUsername = username, avatarHue}; anonymous → {personaKind, alias = display_name, avatarHue: 0} on the thread surface and {personaKind, avatarHue: 0} on the list surface; deidentified_at set → {personaKind, formerMember: true, avatarHue: 0}; profileUsername follows FR11 and AC10.2.1 (a public profile shows the username and display name with the account's non-anonymous contributions) and T-301 Q18 A, which supersedes T-202 Q7 A; property test over 1 000 generated personas: the JSON contains no key from the denylist (id, personaId, accountId, account_id, email, reviewId, review_id, createdAt, userId, authUserId, linkId) and the field presence is exactly as listed for each kind and surface"
    violation: "A denylisted key in public JSON is a linkage leak (S1); a profile username on an anonymous or former-member byline links what FD-015 and FR13 keep apart (S1); an alias on a list card carries it out of its thread; a second byline shape in another module drifts (F27)"
    source: "T-104 step 1 and acceptance row 'No linkage in projection', C4 publicProjection, 03 §2, FR11, AC10.2.1, Questions 6, 15 and 17, T-301 draft Question 18 A and F25"
  - id: BR1.4
    statement: "No view model or byline data carries a persona id, an account id, a review id or a persona timestamp."
    category: constraint
    applies_to: "PersonaPublicVM, BylineVM, every view model that embeds a persona"
    trigger: "A view model is built"
    logic: "Personas are referenced publicly by their projection only; profile links use the username; UUIDv7 ids carry creation time, so even persona ids stay server-side"
    violation: "A persona id in a view model lets readers match anonymous personas across pages by id or by creation time (threat T2, F23)"
    source: "03 §2 (view models never carry accountId or private linkage), FD-015, design decision"
  - id: BR1.5
    statement: "A persona is an immutable snapshot: its kind, display name, username and hue never change, except for the one-way de-identification scrub of BR6.3."
    category: constraint
    applies_to: "PrivateIdentityRepository, IdentityRepository"
    trigger: "Any write to personas"
    logic: "The repositories expose no update of personas other than scrubDeidentified (BR6.3), which only sets deidentified_at, empties display_name, nulls username and sets avatar_hue 0, never the reverse; a rename creates a new persona (BR6.7)"
    violation: "Editing a snapshot rewrites old bylines retroactively (threat T6)"
    source: "AD-3, 02-data-model.md §3 rules, T-104 threat 6"
  - id: BR1.6
    statement: "Named and pseudonymous personas get a random avatar hue at creation, kept across a rename; every anonymous persona has the same hue 0."
    category: constraint
    applies_to: "createDefaultPersonas, personaFor, renameNamed"
    trigger: "A persona is created"
    logic: "named and pseudonymous: hue = random integer 0-359 drawn from Crypto.randomBytes (rejection sampling, F30), the pseudonymous persona copies the named one's, a rename copies the current one's; anonymous: hue = 0, never derived from the account or the thread; a de-identified persona: hue 0 (BR6.3)"
    violation: "A hue shared by one account's anonymous personas would correlate threads (threat T2)"
    source: "FD-015, seed corpus (anonymous avatarHue 0), prototype byline (anonymous avatar shows a dash)"
  - id: BR1.7
    statement: "identity.bylinesFor({personaIds, surface}) returns, per persona and in input order, the one BylineVM of BR1.3 for that surface; every module that shows an author takes it from identity, and components pick the lede key, the chip and the link by personaKind and variant."
    category: calculation
    applies_to: "packages/domain/src/identity/byline.ts, identity.bylinesFor, BylineVM; consumers U14 T-201 (ProviderExperience), U15 T-202, U16 T-203, U21 T-301, U27 T-307, U30 T-401, U31 T-402, U38 T-409"
    trigger: "A page renders review, comment or reaction bylines"
    logic: "fields per BR1.3; initials: named = first grapheme of the first and of the last word after removing a leading Dr. or ডা. (Intl.Segmenter), pseudonymous = '@' + first grapheme, anonymous and former member = none; surface thread (the experience page and its preview, comments, the thread's reaction lists) or list (experience cards, facility accounts, search results, profile lists), list omitting alias and nothing else; components: named → the display name linking to /<locale>/authors/<profileUsername> with chip byline.identity.real; pseudonymous → @username linking to /<locale>/authors/<profileUsername> with chip byline.identity.pseudo; anonymous → byline.anonSentence (with the alias on the thread surface) and chip compose.identity.anon, never a link; former member → byline.formerMember, no chip, never a link; at most 200 ids per call; unknown ids are omitted; no module reads personas to build its own byline"
    violation: "Different byline data per page breaks AC3.3.1's 'the chosen identity is shown on the review, on the author's comments and in that thread's reaction lists'; a byline without the alias fails AC3.3.2 (F27)"
    source: "T-104 step 7, prototype byline() and initials() (a real-name author's name links to the profile), AC3.3.1, AC3.3.2, AC10.2.1, Questions 6 and 17, T-301 draft Question 18 A and F25 (supersedes T-202 Q7 A)"
  - id: BR1.8
    statement: "Lookups by username return the pseudonymous persona of that username, else the current named one, and never an anonymous persona; a persona's username is a copy of its account's username and is not validated again by identity."
    category: policy
    applies_to: "IdentityRepository.findPublicByUsername, identity.publicByUsername"
    trigger: "A mention, a profile route or any other code resolves a username"
    logic: "WHERE username = :u AND kind IN (pseudonymous, named) AND deidentified_at IS NULL ORDER BY kind = pseudonymous DESC, created_at DESC LIMIT 1; anonymous personas have username null and are never matched, even when :u equals an alias; a scrubbed persona has username null and is never matched; the stored value is matched exactly, so seeded named_<slug> names with hyphens still resolve (Q11)"
    violation: "Resolving an alias or an anonymous persona by name is the path FD-015 forbids (mentions, profiles)"
    source: "FD-015, AC3.3.3, 03 §4 comment.post (anonymous personas cannot be mentioned), ISS-159, ISS-264, Question 11"

  # Group 2 — Anonymous alias
  - id: BR2.1
    statement: "An anonymous alias is 'patient-' followed by 4 characters drawn uniformly from abcdefghjkmnpqrstuvwxyz23456789 with random bytes from the Crypto port, and is derived from nothing else."
    category: calculation
    applies_to: "packages/domain/src/identity/alias.ts newAnonymousAlias"
    trigger: "A new anonymous persona is created"
    logic: "Draw bytes from Crypto.randomBytes (the port method added here, F30); keep a byte b only if b < 248; char = ALPHABET[b % 31]; repeat until 4 chars; alias = 'patient-' + chars; no hash or encoding of an account id, review id, time or counter; the seed calls the same pure function with a seeded byte source keyed by the corpus persona key (F26)"
    violation: "An alias derived from account data links threads (threat T2); a confusable character or a biased draw weakens the alias space"
    source: "T-104 step 1 (alphabet, no confusables), FD-015, construction.md Security"
  - id: BR2.2
    statement: "Aliases are unique among anonymous personas; a clash is retried with a new alias up to 5 times, then the operation fails with internal and writes nothing."
    category: constraint
    applies_to: "personaFor, the migration (personas_anonymous_alias_uq)"
    trigger: "Inserting an anonymous persona hits the alias unique index"
    logic: "Partial unique index on personas(display_name) WHERE kind = anonymous; PrivateIdentityRepository.createAnonymousPersona runs its inserts in a savepoint of its own and returns alias_taken on that index's unique violation, leaving the caller's transaction usable (the application cannot open a savepoint on its opaque Tx, Q18); identity retries with a new alias; after 5 attempts return err internal and log identity.alias_exhausted {attempts}; ASSUMPTION(T-104): 4 characters suffice for the demo (F22)"
    violation: "Two anonymous authors with one alias in a thread are indistinguishable; an unbounded retry loop hangs a publish"
    source: "T-104 step 3 (alias uniqueness retried on collision), acceptance test 'alias collision retry'"
  - id: BR2.3
    statement: "An account has at most one anonymous persona per review thread: personaFor(account, review, anonymous) returns the existing one or creates it once."
    category: constraint
    applies_to: "personaFor, PrivateIdentityRepository.findAnonymousFor, the migration (persona_links_account_review_uq)"
    trigger: "Anonymous mode with a review id"
    logic: "Look up persona_links (account_id, review_id); found THEN its persona; ELSE createAnonymousPersona (the repository's savepoint); thread_taken (a unique violation on (account_id, review_id) WHERE review_id IS NOT NULL) THEN re-read the existing link"
    violation: "Two personas for one author in one thread breaks AC3.3.1 ('no other identity anywhere in the thread'); a shared persona across threads breaks AC3.3.2 and FD-015"
    source: "T-104 step 3 and acceptance row 'Alias scoped', FD-015, AC3.3.1, AC3.3.2"
  - id: BR2.4
    statement: "Anonymous mode without a review id (facility feedback, which has no thread) creates a fresh anonymous persona with an unscoped link on every call and never reuses one."
    category: policy
    applies_to: "personaFor"
    trigger: "Anonymous mode and reviewId absent"
    logic: "Insert a new anonymous persona and a persona_links row with review_id null; there is no lookup by account for anonymous personas without a thread"
    violation: "Reusing one unscoped persona would link all of an account's anonymous facility feedback"
    source: "FD-015, 02-data-model.md §6 (facility_reviews have no thread), seed (facility personas linked with review_id null)"
  - id: BR2.5
    statement: "Identity gives any account a thread-scoped anonymous persona in any thread; whether an account may contribute anonymously in a given thread is the calling module's rule."
    category: policy
    applies_to: "personaFor; Community (U30 T-401) and Review (U21 T-301) as callers"
    trigger: "A caller asks for an anonymous persona"
    logic: "personaFor does not check authorship of the review; Community decides who may comment under the thread alias (ISS-262 stays open with U30 for the product rule)"
    violation: "Checking authorship here needs a review-author port from Review (a new cycle) and would block the prototype's anonymous comments on named threads before the product rule is settled"
    source: "Question 10, ISS-262, FD-067 (ports only where a cycle needs them)"
  - id: BR2.6
    statement: "An anonymous persona is unreachable from any public path: it has no username, it cannot be mentioned, it has no profile, and it appears on no list of an author's other content."
    category: constraint
    applies_to: "IdentityRepository, identity.publicByUsername, bylinesFor"
    trigger: "Any public lookup or listing"
    logic: "username null; an anonymous BylineVM carries only personaKind, avatarHue 0 and, on the thread surface only, alias; never profileUsername, and components never link it; findPublicByUsername excludes it; identity offers no 'personas of the same account' query on the public side"
    violation: "Fails AC3.3.3 (anonymous content on the profile, activity, mentions or other reviews) and FD-015"
    source: "FD-015, AC3.3.2, AC3.3.3, prototype accountsByAuthor() returning [] for anonymous"
  - id: BR2.7
    statement: "personaFor in named mode returns the account's current named persona and in pseudonymous mode its pseudonymous persona, ignoring any review id."
    category: calculation
    applies_to: "personaFor"
    trigger: "Mode named or pseudonymous"
    logic: "named: newest named persona linked to the account (BR6.8); pseudonymous: the account's pseudonymous persona; none THEN not_found, logged with the account id only"
    violation: "A thread-scoped named persona would split one author's named reviews"
    source: "C4 personaFor, 02-data-model.md §3 rules"
  - id: BR2.8
    statement: "A link is never re-pointed: a persona's account and review never change, and identity has no operation that moves content to another persona."
    category: constraint
    applies_to: "PrivateIdentityRepository"
    trigger: "Any write to persona_links"
    logic: "persona_links rows are inserted or deleted, never updated; changing the identity mode of published content is not an identity operation"
    violation: "Re-pointing an anonymous persona to a named one de-anonymises a thread retroactively"
    source: "AD-3 (retroactive deanonymization prevented), T-104 threat 6"
  - id: BR2.9
    statement: "persona_links.review_id's foreign key is deferrable, initially deferred, so a persona, its review and its link can be inserted in any order in one transaction."
    category: constraint
    applies_to: "The migration (persona_links_review_id_reviews_id_fk), review.publish (U21), comment.post (U30)"
    trigger: "A command creates an anonymous persona for a review it inserts in the same transaction"
    logic: "DROP and ADD the constraint with DEFERRABLE INITIALLY DEFERRED, keeping ON DELETE SET NULL; the publish command generates the review id first, calls personaFor, then inserts the review"
    violation: "With an immediate key and reviews.author_persona_id NOT NULL, an anonymous review cannot be published in one transaction (F5)"
    source: "Question 7, 0004_deferred_fks.sql (evidence_items precedent), seed back-fill workaround"

  # Group 3 — Private boundary
  - id: BR3.1
    statement: "Only identity-private.ts reads or writes persona_links and identity_reveals."
    category: constraint
    applies_to: "packages/database/src/repositories/identity-private.ts and every other source file"
    trigger: "Any source change"
    logic: "A unit test lists every non-test source file importing the personaLinks or identityReveals table symbols and allows only repositories/identity-private.ts, schema/*.ts, migrations and the FD-040 seed; U8's interim AccountRepository.insertDefaultPersonas is removed (F28), so the account repository neither reads nor writes personas or persona_links (BR3.5)"
    violation: "A second reader is a second path to the account behind an anonymous persona (S1, threat T5)"
    source: "T-104 goal and step 2, AD-3, 02-data-model.md §3 ('readable only by identity module')"
  - id: BR3.2
    statement: "The composition root passes the private repository to the identity module only."
    category: authorization
    applies_to: "apps/web/src/server/container.ts, container.test.ts"
    trigger: "The container builds the modules"
    logic: "PrivateIdentityRepository carries a unique-symbol brand; container.test.ts has a // @ts-expect-error line per non-identity module factory that tries to pass it and a runtime assertion that only makeIdentityModule receives it; DataRequests and Moderation use identity.accountsOf, personasOf and deidentify instead"
    violation: "Another module holding the repository can join personas to accounts outside the reveal command (threat T5)"
    source: "Question 8, T-104 step 6 and threat 5, C4 (accountsOf, personasOf, deidentify)"
  - id: BR3.3
    statement: "The private operations accountsOf, personasOf, currentPersonaOf and ownsAnyPersona are internal: callable by application modules and the web composition root, never exposed as a server action or route handler."
    category: authorization
    applies_to: "packages/application/src/modules/identity/internal/, apps/web/src/server/actions/**"
    trigger: "Any server action or route handler is added"
    logic: "apps/web/src/server/actions/identity.ts exports revealIdentity only; a test asserts that no file under server/actions or app/api imports modules/identity/internal"
    violation: "A server action returning accountsOf is a public persona-to-account oracle (S1)"
    source: "C4 (internal, private; web tier only), 01-conventions §1 (server actions are thin)"
  - id: BR3.4
    statement: "The worker can neither read persona_links or identity_reveals nor import the identity module."
    category: authorization
    applies_to: "rk_worker grants, eslint boundary rules, apps/worker"
    trigger: "Any worker change or grant change"
    logic: "Integration test as rk_worker: select from persona_links and from identity_reveals each fail with permission denied (-t worker-grants); FD-093's lint refuses a worker value import of modules/identity/ by any specifier, a relative path included (FD-093 (2)); no grant change in this Unit"
    violation: "Fails T-104's 'Worker cannot read links' row; breaks FD-092 and AD-6"
    source: "T-104 step 5, 02-data-model.md §16 (f), FD-092, FD-093, 01-conventions §11"
  - id: BR3.5
    statement: "getActor resolves Actor.personaId through identity.currentPersonaOf, not through the account repository."
    category: constraint
    applies_to: "apps/web/src/server/auth.ts getActor"
    trigger: "Every request that resolves an Actor"
    logic: "U8's getActor leaves personaId unset; identity.currentPersonaOf({accountId}) returns {namedPersonaId, pseudonymousPersonaId} (the pseudonymous id serves U21 T-301's write-free preview, its Question 8 refresh); this Unit adds personaId = namedPersonaId to the inputs server/auth.ts gathers for a non-deleted account Actor (cached per request), passed through U8's pure resolveActor; the account repository has no method that reads personas or persona_links"
    violation: "The account repository reading persona_links is a second reader (BR3.1, F9)"
    source: "U8 refreshed draft BR4.3 ('T-104 fills it through identity.currentPersonaOf') and F26, AD-3, finding F9, T-301 draft Question 8 refresh and F29"
  - id: BR3.6
    statement: "Identity logs never put an account id and a persona id, an alias or a username in one line, and never log a reveal reason, a revealed identity or an email."
    category: constraint
    applies_to: "every Logger call in modules/identity and modules/account/reveal-contact.ts"
    trigger: "A log line is written"
    logic: "Allowed fields: event, correlationId, one opaque id kind per line (personaId or accountId or revealId), enums, counts; a log-capture test runs every identity operation and asserts no line holds both an account id and a persona id, and none holds an email, an alias, a username or the reason"
    violation: "Account and persona pairs in logs re-create the private link outside the database (threat T8, S1)"
    source: "T-104 threat 8, 01-conventions §11"
  - id: BR3.7
    statement: "identity.ownsAnyPersona({accountId, personaIds}) answers one boolean: whether any of the given personas is linked to the account; nothing else about the link leaves identity."
    category: authorization
    applies_to: "packages/application/src/modules/identity/internal/owns-any-persona.ts, PrivateIdentityRepository.ownsAny; caller U21 T-301 (review.publish, the repeat-episode flag of FD-080)"
    trigger: "A module needs to know whether an account is the author behind one of a few personas"
    logic: "personaIds: 1-50 uuids, de-duplicated, ELSE validation; ownsAny(tx, accountId, personaIds) = EXISTS (SELECT 1 FROM persona_links WHERE account_id = :a AND persona_id = ANY(:ids)); returns true or false only, never which persona, how many or of which kind; internal (BR3.3) and unreachable from the worker (BR3.4); the result is never logged, and the caller keeps it only as its own flag"
    violation: "A per-persona answer or a public path is an account-to-persona oracle (S1); giving Review accountsOf instead would hand it account ids (T-301 Question 8 option B)"
    source: "T-301 draft Question 8 A and F29, FD-080 (repeat-episode flag), C4 (additive), AD-3"

  # Group 4 — Reveal authorization
  - id: BR4.1
    statement: "identity.reveal requires a signed-in account, the identity.reveal capability and a step-up under 5 minutes old, checked in U10's order."
    category: authorization
    applies_to: "packages/application/src/modules/identity/commands/reveal-identity.ts"
    trigger: "Every call"
    logic: "requires: {authenticated: true, capability: 'identity.reveal', stepUp: true}; U8's order authenticated → verifiedEmail → notRestricted → staffRole → capability → stepUp → owner, so an actor without the capability gets forbidden, not a password prompt; Actor.stepUp is filled by U10 from rk_stepup"
    violation: "Reveal without capability or step-up fails AC3.3.5 and FD-016 (S1)"
    source: "T-104 step 4, C4 reveal, AC3.3.5, FD-016, U8 BR7.11, U10 BR7.3 and BR7.4"
  - id: BR4.2
    statement: "The capability comes only from U10's table: Super Admin always, Admin and Moderator only when their revealIdentity toggle is on, read on every request."
    category: authorization
    applies_to: "Actor.capabilities (U10 resolveCapabilities), ConfigProvider"
    trigger: "Every call"
    logic: "No identity code grants or checks a role directly; with the default configuration only super_admin holds identity.reveal; a staff account without an approved device has no capabilities (U10 Q3)"
    violation: "A second capability source can drift; reveal by default for Admin or Moderator breaks FD-016"
    source: "FD-016, FD-022, U10 BR1.2–BR1.4, BR3.1, T-104 threat 4"
  - id: BR4.3
    statement: "The input is {targetKind, targetId, purpose, reason}: a reveal target kind, a uuid, a purpose from moderation, security or legal, and a reason of at most 500 graphemes; input that does not parse is refused with validation and is not recorded."
    category: validation
    applies_to: "RevealIdentityInput (packages/contracts/src/schemas/identity.ts)"
    trigger: "Every call"
    logic: "z.object({targetKind: z.enum(REVEAL_TARGET_KINDS), targetId: z.uuid(), purpose: z.enum(REVEAL_PURPOSES), reason: z.string()}).strict(); reason NFC and trimmed; over 500 graphemes is a parse failure; a parse failure returns validation and logs identity.reveal_input_rejected {actorAccountId?} with no input values"
    violation: "A target that is not a uuid cannot be stored in identity_reveals.target_id; free-form purposes would push free text into audit details"
    source: "T-104 step 4, C4 RevealIdentityInput, Questions 2 and 4, 05-recommended-architecture.md (a stated moderation, security or legal reason)"
  - id: BR4.4
    statement: "A reason of fewer than 10 graphemes after NFC and trimming is refused with validation on the reason field, and the attempt is recorded with outcome reason_too_short."
    category: validation
    applies_to: "identity.reveal handler"
    trigger: "An authorised attempt"
    logic: "count = graphemes(Intl.Segmenter, reason); IF count < 10 THEN record (granted false, outcome reason_too_short) and return err validation with fieldErrors.reason = errors.identity.reasonTooShort"
    violation: "A purpose-less reveal fails AC3.3.5 ('must state a purpose'); counting UTF-16 units miscounts Bengali"
    source: "T-104 step 4 (reason at least 10 chars), AC3.3.5, 01-conventions §4 (grapheme-aware), T-106 candidate 'reason with 9 chars'"
  - id: BR4.5
    statement: "The target is resolved through the RevealTarget implementation registered for its kind; no implementation or no target ends the attempt as not_found with outcome target_not_found."
    category: policy
    applies_to: "identity.reveal, RevealTarget registry"
    trigger: "An authorised attempt with a valid reason"
    logic: "resolver = registry[targetKind]; IF absent THEN record target_not_found and return not_found; ELSE resolver.resolve(tx, {targetKind, targetId}) → persona subject {personaId, targetCode} for review, facility_review, comment, or account subject {accountId | null, targetCode} for report; err THEN record target_not_found and return not_found"
    violation: "Identity reading another module's tables breaks the module boundaries (FD-067)"
    source: "C4 RevealTarget, FD-067, T-104 step 4, Question 9"
  - id: BR4.6
    statement: "A persona subject is followed through linkFor; a persona with no link, or a report whose reporter was de-identified, ends the attempt as not_found with outcome no_link."
    category: policy
    applies_to: "identity.reveal"
    trigger: "The target resolved"
    logic: "persona subject: link = linkFor(tx, personaId); IF none THEN record no_link and return not_found; account subject with accountId null THEN the same; RevealContact returning null THEN the same"
    violation: "Claiming a grant without an identity misstates the record"
    source: "FD-077, FD-078 (reporter id null after de-identification), T-104 step 4"
  - id: BR4.7
    statement: "The contact comes from RevealContact: username and display name for every authorised role, the email address only for a Super Admin, and the email is read only in that case."
    category: authorization
    applies_to: "identity.reveal, RevealContact (modules/account/reveal-contact.ts)"
    trigger: "A linked account was found"
    logic: "contactForReveal(tx, accountId, {withEmail: actor.staffRole === 'super_admin'}); withEmail true THEN the email is read with U8's AccountRepository.findOwnEmail(accountId), web tier only; withEmail false THEN the implementation does not read the auth user; a deleted account gives its username and last display name and no email"
    violation: "An email shown to an Admin or Moderator goes beyond T-104 step 4 and C4 (email?: super admin only)"
    source: "T-104 step 4 (email only for super_admin), C4 RevealContact and result, Question 3"
  - id: BR4.8
    statement: "A granted reveal returns {username, displayName, email?}, only after its record has committed, and the result is never logged, cached or put into any other record."
    category: constraint
    applies_to: "identity.reveal, apps/web/src/server/actions/identity.ts"
    trigger: "A granted attempt"
    logic: "Result built from the RevealContact output after the transaction of BR5.3 commits; no accountId and no persona id in the result; the action logs identity.revealed {revealId, outcome} only"
    violation: "An identity returned before its record exists is a reveal without trace (threat T3); an account id in the browser crosses 03 §2's rule"
    source: "Question 3, T-104 step 4, 03 §2, 01-conventions §11"
  - id: BR4.9
    statement: "An account may attempt at most 20 reveals per hour; further attempts are refused with rate_limited and recorded with outcome rate_limited."
    category: policy
    applies_to: "identity.reveal, RateLimiter port"
    trigger: "Every authorised-so-far attempt"
    logic: "Key identity:reveal:account:<accountId>, 20 per 60 minutes, checked after the step-up check and before the target is resolved; over THEN the attempt is recorded with outcome rate_limited and the result carries retryAfterSec; recorded either by onRefused, if U8's defineCommand offers a command-level limit that refuses through it (U8 BR7.11), or by the handler with err('rate_limited', {recorded: true})"
    violation: "One step-up window could otherwise reveal without bound (threat T10)"
    source: "Question 13, T-104 threat 4, 03 §3 RateLimiter"
  - id: BR4.10
    statement: "A reveal may target content of any persona kind; the record notes the persona kind."
    category: policy
    applies_to: "identity.reveal"
    trigger: "A persona subject was resolved"
    logic: "No refusal by kind; audit details carry personaKind (named, pseudonymous, anonymous); report targets carry no persona kind"
    violation: "Refusing named or pseudonymous targets would hide their contact data from a Super Admin with a legal need; not recording the kind hides what was revealed"
    source: "05-recommended-architecture.md (a target content id), 02-data-model.md §3 (every reveal attempt), design decision"
  - id: BR4.11
    statement: "A signed-out caller is refused with forbidden; nothing is recorded because there is no requester, and the refusal is logged."
    category: authorization
    applies_to: "identity.reveal"
    trigger: "Actor kind anonymous"
    logic: "requires.authenticated fails THEN err forbidden, onRefused is not called, log identity.reveal_refused_anonymous {correlationId}"
    violation: "A row without a requester cannot be inserted (requester_account_id NOT NULL) and would carry no information"
    source: "02-data-model.md §3 (requester_account_id), Question 1"

  # Group 5 — Reveal records
  - id: BR5.1
    statement: "Every attempt writes exactly one identity_reveals row, one audit row on the identity stream and one identity.revealed outbox event, whatever its outcome."
    category: policy
    applies_to: "identity.reveal, onRefused, recordAttempt"
    trigger: "Every attempt (BR4.3 and BR4.11 excepted)"
    logic: "All paths end in one recordAttempt(tx, {actor, input, outcome, granted, revealedAccountId?, targetCode?}); outcomes granted, no_capability, step_up_required, rate_limited, reason_too_short, target_not_found, no_link"
    violation: "Fails T-104's 'Reveal always recorded' row, C4 ('every attempt, granted or refused') and FD-016 (S1)"
    source: "T-104 step 4 and acceptance row, C4 reveal notes, 02-data-model.md §3, FD-016, FD-022"
  - id: BR5.2
    statement: "Authorization refusals after sign-in are recorded by onRefused in a transaction of their own; if that record cannot be written, the result is internal."
    category: constraint
    applies_to: "packages/application/src/command.ts defineCommand, identity.reveal onRefused"
    trigger: "A capability, step-up or rate-limit refusal of a signed-in account"
    logic: "U8's defineCommand calls onRefused({actor, input, refusal}) for every refusal after authenticated, in its own committed transaction (U8 BR7.11; this Unit does not change command.ts); identity.reveal's onRefused writes the record with the target unresolved; IF it throws THEN log identity.refusal_unrecorded {correlationId} and return err internal; the attempt is refused either way"
    violation: "A capability refusal without a row breaks BR5.1 (F12, closed by U8); a refusal reported normally after its record failed hides a gap in the record"
    source: "01-conventions §3 (onRefused), T-104 step 4 (catch the refusal inside the wrapper for this command only), U8 BR7.11, Question 1"
  - id: BR5.3
    statement: "A handler-level outcome is recorded in the command's own transaction, together with the link read; a granted identity leaves the server only after that transaction commits, and a failed commit returns internal with no identity."
    category: constraint
    applies_to: "identity.reveal handler, defineCommand"
    trigger: "An authorised attempt"
    logic: "Granted: record, audit and outbox in the handler's tx, then ok; refusals at BR4.4–BR4.6 (and BR4.9 when the handler checks the limit): record, then err(code, {recorded: true}); U8's UnitOfWork commits a handler err only when recorded is set and strips the flag (by default an err rolls back)"
    violation: "An identity returned with no record, or a refusal whose record rolled back, breaks BR5.1 (threat T3)"
    source: "C4 reveal, 01-conventions §3 (one transaction with audit and outbox), U8 BR7.11 and § 10.1, functional-spec.md § 10.2"
  - id: BR5.4
    statement: "An identity_reveals row holds the requester account, the requester's staff role or null, the target kind and id, the purpose, the outcome, the reason, granted, and the revealed account only when granted."
    category: constraint
    applies_to: "identity_reveals, the migration"
    trigger: "recordAttempt"
    logic: "requester_role = actor.staffRole ?? null (Question 1); target_kind of type reveal_target_kind (Question 2); purpose reveal_purpose; outcome reveal_outcome; reason as entered (NFC, trimmed); revealed_account_id set only when granted; granted = (outcome = granted)"
    violation: "A role column that must be filled cannot record an ordinary account's attempt (F4); a revealed account on a refused row would itself be a leak"
    source: "02-data-model.md §3, Questions 1, 2, 4, ISS-090"
  - id: BR5.5
    statement: "Audit rows for reveals are on the identity stream, actor account:<requesterId>, action reveal, with details limited to revealId, targetKind, targetId, outcome, granted, requesterRole, purpose, personaKind and step_up."
    category: constraint
    applies_to: "identity.reveal through AuditWriter"
    trigger: "recordAttempt"
    logic: "details = {revealId, targetKind, targetId, outcome, granted, requesterRole: role | null, purpose, personaKind?, step_up: actor.stepUp !== undefined}, built by the identity stream's detail builder added to U8's allowlist; never the reason, the revealed account id, a username, a display name or an email; U8's recursive allowlist check (ISS-108, closed by U8) passes"
    violation: "Free text or identity data in audit_events, which the console reads, spreads the reveal beyond its record (S1)"
    source: "01-conventions §5 (allowlisted details), audit_events stream identity (02-data-model.md §9), U10 BR7.5, ISS-108 (U8 BR8.2)"
  - id: BR5.6
    statement: "The identity.revealed outbox event carries {revealId, granted, outcome, targetKind, targetCode?, requesterRole} and nothing that identifies a person."
    category: constraint
    applies_to: "identity.reveal, C15 identity.revealed"
    trigger: "recordAttempt"
    logic: "targetCode = the target's public code from RevealTarget (review or comment public id, or the case code for a report), absent when the target was not resolved (WF5); no account id, persona id, username, email or reason; U34 T-405's notification.deliver turns it into one staff_notifications row of kind identityReveal"
    violation: "The worker cannot read identity_reveals, so a payload of {revealId, granted} cannot produce the notice (F2); an identifying field in the payload reaches the worker (FD-086)"
    source: "Question 5, C15, FD-065, FD-086, 02-data-model.md §12 (staff_notifications.target_code) and §16 (f)"
  - id: BR5.7
    statement: "identity_reveals is append-only: no code updates or deletes a row, and the database refuses it."
    category: constraint
    applies_to: "identity_reveals, 0003_triggers.sql"
    trigger: "Any write"
    logic: "The repository exposes insert only; the existing trigger raises on UPDATE and DELETE; an integration test proves both raise"
    violation: "An editable reveal record breaks AC3.3.5 ('an audit event that cannot be changed')"
    source: "02-data-model.md §10, AC3.3.5, T-104 threat 3"
  - id: BR5.8
    statement: "granted is true exactly when an identity was returned."
    category: constraint
    applies_to: "recordAttempt"
    trigger: "recordAttempt"
    logic: "granted = (outcome = granted); every other outcome is granted false with revealed_account_id null"
    violation: "A granted row for a not_found reveal misstates oversight counts"
    source: "T-104 acceptance row (rows false, false, true), design decision"

  # Group 6 — Rename and de-identification
  - id: BR6.1
    statement: "identity.deidentify deletes every persona_links row of the account except those of the kept personas, on the caller's transaction, and returns the counts."
    category: constraint
    applies_to: "identity.deidentify, PrivateIdentityRepository.removeLinks"
    trigger: "dataRequest.delete runs the identity step (U39 T-410)"
    logic: "DELETE FROM persona_links WHERE account_id = :a AND persona_id <> ALL(:keep) RETURNING persona_id; result {removedLinks, keptLinks}; a second run removes 0"
    violation: "A link left behind keeps the deleted account revealable and joinable; a held post's link removed breaks FD-079"
    source: "C4 deidentify, FD-077, FD-079, T-104 step 3, unit-of-work deletion participants"
  - id: BR6.2
    statement: "Every kept persona id must be linked to the account being de-identified; otherwise nothing is deleted and the result is validation."
    category: validation
    applies_to: "identity.deidentify"
    trigger: "Before deleting"
    logic: "IF any id in keepPersonaIds is not in personasOf(accountId) THEN err validation, no delete, log identity.deidentify_bad_keep {accountId, count}"
    violation: "A foreign kept id hides a caller bug that could keep the wrong links"
    source: "Design decision (C4 keepPersonaIds)"
  - id: BR6.3
    statement: "After de-identification a named or pseudonymous persona shows 'Former member', with no username, no initials and no profile link, and its stored snapshot is scrubbed in the same transaction."
    category: policy
    applies_to: "identity.deidentify, PrivateIdentityRepository.scrubDeidentified, publicProjection, bylinesFor, the migration's personas_deidentified_scrubbed_ck"
    trigger: "identity.deidentify removed a named or pseudonymous persona's link"
    logic: "scrubDeidentified(tx, personaIds) for the removed personas of kind named or pseudonymous: deidentified_at = now, display_name = '', username = null, avatar_hue = 0; CHECK (deidentified_at IS NULL OR (kind <> 'anonymous' AND display_name = '' AND username IS NULL AND avatar_hue = 0)); the projection then returns {personaKind, formerMember: true, avatarHue: 0} and components render byline.formerMember; anonymous personas are never scrubbed (BR6.4); held (kept) personas change only when T-309's FD-090 function removes their link, and that function applies the same scrub (FD-<next: Former member>, F32)"
    violation: "Keeping the name stored or public leaves a deleted person identifiable on retained posts and readable by rk_worker (FR13 'de-identifies', threat T14)"
    source: "T-104 step 3 and acceptance row 'Deidentify', FR13, AC10.3.3, Question 15 (the owner's answer B, 2026-10-29), Question 16, FD-<next: Former member> (amends C4, T-410 step 3 and the Units table)"
  - id: BR6.4
    statement: "De-identification never changes an anonymous persona: its alias text stays and only its link goes."
    category: constraint
    applies_to: "identity.deidentify"
    trigger: "identity.deidentify"
    logic: "No write to personas rows of kind anonymous"
    violation: "Changing aliases rewrites other people's threads and can reveal which aliases belonged to the deleted account (T-104 threat 7)"
    source: "T-104 step 3 and threat 7, T-410 step 3"
  - id: BR6.5
    statement: "De-identification leaves identity_reveals untouched."
    category: constraint
    applies_to: "identity.deidentify"
    trigger: "identity.deidentify"
    logic: "Append-only rows stay, including revealed_account_id, which points at the tombstoned account profile (the profile row is kept with status deleted, FD-077)"
    violation: "Deleting reveal history breaks AC3.3.5's unchangeable audit"
    source: "T-410 step 3, 02-data-model.md §10, AC3.3.5"
  - id: BR6.6
    statement: "identity.deidentify writes one audit row on account:<accountId>, action identity_deidentified, with the three counts."
    category: constraint
    applies_to: "identity.deidentify"
    trigger: "identity.deidentify succeeds"
    logic: "details {removedLinks, keptLinks, scrubbed}; no persona ids; built by the detail builder added to U8's allowlist"
    violation: "An irreversible privacy change without an audit row breaks 01-conventions §5"
    source: "01-conventions §5 (every state change audited)"
  - id: BR6.7
    statement: "identity.renameNamed creates a new named persona with the new display name, the same username and hue, and links it; old personas and their content are unchanged; an unchanged name changes nothing."
    category: constraint
    applies_to: "identity.renameNamed"
    trigger: "An account command changes the display name (U38 T-409)"
    logic: "displayName NFC, trimmed, 1-60 graphemes ELSE validation; IF equal to the current named persona's THEN return its id; ELSE insert persona and link on the caller's tx; the caller updates account_profiles.display_name and audits"
    violation: "Editing the old persona rewrites old bylines (threat T6); fails T-104's rename test"
    source: "T-104 step 3 and threat 6, 02-data-model.md §3 rules"
  - id: BR6.8
    statement: "An account's current named persona is its newest linked named persona."
    category: calculation
    applies_to: "PrivateIdentityRepository.currentNamedOf, personaFor, currentPersonaOf"
    trigger: "Any lookup of the current named persona"
    logic: "ORDER BY personas.id DESC (UUIDv7, time-ordered) LIMIT 1 among named personas linked to the account; no flag column"
    violation: "Two current named personas make bylines of new content unpredictable"
    source: "Question 14, T-104 step 3 ('makes it default')"

  # Group 7 — Contracts and records
  - id: BR7.1
    statement: "The reference documents and contracts are corrected where this design changes them, in the same Bolt."
    category: policy
    applies_to: "contract-summary.md C4 and C15, 03-routes-and-contracts.md §4, 02-data-model.md §3"
    trigger: "Code Generation"
    logic: "FD-<next: Former member> appended before any code; C4: personaFor as an internal operation, bylinesFor with its surface and the one BylineVM (PersonaPublicVM its alias), publicByUsername, currentPersonaOf with the pseudonymous id, ownsAnyPersona, RevealIdentityInput with purpose and REVEAL_TARGET_KINDS, result {username, displayName, email?}, RevealTarget with targetCode, RevealContact with displayName and withEmail, deidentify with the Former-member scrub; C15: identity.revealed payload; 03 §2 BylineVM with profileUsername (T-202's Byline renders a named author as a profile link, F33), 03 §4 the same as C4; 02 §3 the new columns, enums, indexes and the check constraint; unit-of-work.md deletion participants and T-410 step 3 per FD-<next: Former member>"
    violation: "Leaving the old text recreates source drift"
    source: "contract-summary.md (the provider Unit owns its block; consumers ignore unknown fields), errors.ts header rule, project.md Mandated (FD entry before code)"
  - id: BR7.2
    statement: "All schema changes of this Unit are one forward-only migration with the next free number."
    category: constraint
    applies_to: "packages/database/src/migrations/"
    trigger: "Code Generation"
    logic: "The ten items of functional-spec.md § 7 in one drizzle custom migration whose journal timestamp is later than the previous one; migrations.int.test.ts and validator-probes.int.test.ts (P8) counts + 1, each with a comment; no SECURITY DEFINER function, so the CR-006 adversarial test's definer list is unchanged"
    violation: "An out-of-order journal entry is skipped silently (the CR-006 lesson)"
    source: "02-data-model.md (forward-only), CR-006 hand-off"
  - id: BR7.3
    statement: "Every new string has an English and a Bengali entry with the same key in the same commit."
    category: policy
    applies_to: "packages/i18n/messages/{en,bn}.json"
    trigger: "A key is added"
    logic: "errors.identity.reasonTooShort; byline.formerMember (en 'Former member', bn 'প্রাক্তন সদস্য', Q15 B); Bengali flagged for the owner's review (FD-042 precedent)"
    violation: "A key without its Bengali string fails the parity check and the project rule"
    source: "project.md Mandated (Bengali and English), ADR 0011"
  - id: BR7.4
    statement: "The open ISS rows in this area are closed or updated, and every new finding gets a row linked to U11 T-104."
    category: policy
    applies_to: "docs/implementation/ISSUES.md"
    trigger: "End of Code Generation"
    logic: "Closed: ISS-090 (identity half: reveal_target_kind), ISS-290 (the identity fake replaced), ISS-159 and ISS-264 (ruling of Q11), ISS-108 only if it was still open and fixed here (Q12; U8 closes it); noted: ISS-294 (the stub test updated in the same commit); updated: ISS-262 (identity offers the mechanism, Q10; the product rule stays with U30); new rows F1–F33 of functional-spec.md § 9.2 that are still open or record a decision"
    violation: "An unrecorded defect breaks the defect-register rule"
    source: "project.md Mandated (ISS rows), team.md Way of Working"
  - id: BR7.5
    statement: "Every file changed outside T-104's literal owned paths is listed, with its reason, in the hand-off and in one ISS row."
    category: policy
    applies_to: "Owned paths"
    trigger: "Code Generation"
    logic: "The additions in functional-spec.md § 15"
    violation: "An unrecorded file fails the reviewer's diff review (G4)"
    source: "team.md Way of Working"
  - id: BR7.6
    statement: "This Unit adds no dependency; the property test uses a seeded generator, so no dependency check entry is needed beyond reusing the current ones."
    category: policy
    applies_to: "package.json files, docs/status/dependency-check-log.md"
    trigger: "Code Generation"
    logic: "No fast-check or other new package; IF one becomes necessary THEN the dependency-check rule applies before adding it"
    violation: "A silent new dependency breaks the project's Mandated dependency rule"
    source: "AGENTS.md, project.md Mandated"
  - id: BR7.7
    statement: "Reporter identity is revealed only through identity.reveal with target kind report, and nothing in this Unit puts a reporter id into a payload, view model, notice or log."
    category: authorization
    applies_to: "identity.reveal, RevealTarget for report (U32)"
    trigger: "A report target"
    logic: "The account subject's id is used only inside the transaction to call RevealContact and fill revealed_account_id when granted; the outbox carries the case code, not the account"
    violation: "Breaks the PRODUCT.md hard rule on reporter identity and FD-086 (S1)"
    source: "PRODUCT.md hard rule (project.md Forbidden), 01-conventions §5, FD-086, 03 §4 moderation.revealReporter"
  - id: BR7.8
    statement: "Identity adds no copy about anonymity limits or staff access: the public experience page carries no anonymity caveat, the composer's note is reworded without the legal or staff-access sentence by U26 T-306, and the explanation lives on both the Terms and the Privacy Policy."
    category: policy
    applies_to: "packages/i18n/messages (identity keys), compose.identity.anonNote (U26 T-306, U27 T-307), the experience page margin (U21 T-301)"
    trigger: "Code Generation of this Unit and of the Units that render these strings"
    logic: "This Unit changes neither compose.identity.anonNote nor any policy text; BylineVM and the projections carry no anonymity note; the FD entries are U21 T-301's (its Q16 A) and U20 T-207's (its Q1, the owner's answer)"
    violation: "A staff-access or lawful-disclosure warning on the review page or in the writing flow fails AC3.3.6 and FD-022"
    source: "R1 (decided by the agent under the owner's no-questions instruction of 2026-10-29), T-301 draft Q16 A, T-207 draft Q1 (owner), FD-008, FD-022, AC3.3.6"

  # Group 8 — Verification
  - id: BR8.1
    statement: "Each level has the tests of functional-spec.md § 11, with builders and synthetic data only."
    category: validation
    applies_to: "domain, application, database, web tests"
    trigger: "Code Generation and Build and Test"
    logic: "Domain: alias, projection property test, rename; application: every operation, every outcome of § 5.3, onRefused widening, one audit assertion per command; database: indexes, deferrable key, append-only, worker grants; web: boundary test, reveal action end to end with a test resolver"
    violation: "A missing level fails team.md Testing Posture"
    source: "team.md Testing Posture, 01-conventions §10, T-104 'Tests to write'"
  - id: BR8.2
    statement: "The smoke suite gains at least one identity assertion and loses none."
    category: validation
    applies_to: "identity.smoke.test.ts"
    trigger: "Code Generation"
    logic: "A seeded anonymous persona's thread byline has an alias and neither username nor profileUsername, and its list byline has no alias; personaFor returns the same persona twice for one thread"
    violation: "Fails team.md (cumulative smoke suite)"
    source: "team.md Testing Posture"
  - id: BR8.3
    statement: "pnpm check, pnpm smoke and pnpm test:int are green before the Unit is done, and CI is green on the pushed Bolt head before merge."
    category: validation
    applies_to: "U11"
    trigger: "End of Code Generation and Build and Test"
    logic: "All three exit 0 on the Bolt branch and on main after the merge; pnpm check is the eleven-step gate (T-010's typecheck, lint, lint:boundaries, format:check, check:identity, test:coverage, i18n:check, contrast and build, plus U45's contrast:patient and check:motion); pnpm test:int covers U8's database, web-int and worker-int projects; .github/workflows/check.yml green on the Bolt head"
    violation: "Fails T-104's 'Checks' row and team.md Way of Working"
    source: "T-104 acceptance row 'Checks', team.md Way of Working"
  - id: BR8.4
    statement: "As a high-risk Unit, U11 runs with collaborators on, gets 3-5 adversarial tests from a separate agent and needs the owner's written sign-off before the phase gate."
    category: validation
    applies_to: "U11"
    trigger: "Build and Test"
    logic: "The adversarial agent starts from functional-spec.md § 12.2; its tests stay in the suite"
    violation: "Fails team.md Way of Working step 5"
    source: "team.md Way of Working, unit-of-work.md (U11 high risk: yes)"
  - id: BR8.5
    statement: "Every package this Unit touches stays at or above 80 % line coverage."
    category: validation
    applies_to: "packages/domain, application, adapters, database, contracts, test-support, apps/web"
    trigger: "Build and Test"
    logic: "Measured by pnpm test:coverage with T-010's thresholds (80% lines per package, every source file counted, untested files at 0%); domain and application are measured as soon as they hold code; never lowered to pass (D10)"
    violation: "Below the floor blocks the merge"
    source: "team.md Testing Posture, T-010 (vitest.workspace.ts COVERAGE_ROOTS)"
  - id: BR8.6
    statement: "Every file this Unit creates or changes sits where the T-010 boundary matrix allows its imports, and pnpm lint and pnpm lint:boundaries prove it with no new suppression."
    category: constraint
    applies_to: "eslint.boundaries.mjs, 01-conventions.md §2, every file in functional-spec.md § 6.4"
    trigger: "Code Generation"
    logic: "domain imports nothing; application imports only domain and contracts, no external package, no Node built-in and no database API (savepoints are the repository's, Q18; random bytes through Crypto.randomBytes); only identity-private.ts reads persona_links and identity_reveals; adapters are built only in server/container.ts; the worker gains nothing and cannot reach modules/identity (FD-093 (2) and U8's import-graph test of @rogikotha/application/worker)"
    violation: "A red pnpm lint is S1; a re-export that carries identity code into the worker breaks AD-6"
    source: "FD-093, 01-conventions.md §2 as built by T-010, U8 BR7.12"
  - id: BR8.7
    statement: "The tests T-010 pinned are updated in the same commit as the change they pin."
    category: constraint
    applies_to: "packages/database/src/repositories/not-implemented.test.ts, migrations.int.test.ts, validator-probes.int.test.ts, packages/test-support/src/fakes/repositories-superset.test.ts"
    trigger: "Code Generation"
    logic: "PgIdentityRepository leaves STUB_REPOSITORIES (ISS-294); both exact migration counts go up by one with a comment; the superset test pairs the new identity fakes with identity.ts and identity-private.ts (or the fakes implement their ports, with a comment); the account fake loses insertDefaultPersonas; no assertion is removed or skipped"
    violation: "A stale pin turns pnpm check red (S1)"
    source: "ISS-294, ISS-242, ISS-223, ISS-290, team.md Testing Posture"
```

## Rules summary

| ID | Rule | Category |
|---|---|---|
| BR1.1 | `personas` public, no account column | constraint |
| BR1.2 | Two default personas at registration, idempotent | constraint |
| BR1.3 | Allowlisted projection; profile username; alias on thread surfaces only | constraint |
| BR1.4 | No ids or timestamps in view models | constraint |
| BR1.5 | Personas are immutable snapshots | constraint |
| BR1.6 | Avatar hue random, anonymous fixed 0 | constraint |
| BR1.7 | Byline data | calculation |
| BR1.8 | Username lookups never anonymous; no re-validation | policy |
| BR2.1 | Alias format and randomness | calculation |
| BR2.2 | Alias unique, 5 retries | constraint |
| BR2.3 | One anonymous persona per account and thread | constraint |
| BR2.4 | Facility feedback: fresh unscoped persona | policy |
| BR2.5 | Mechanism here, policy in the caller | policy |
| BR2.6 | Anonymous persona unreachable publicly | constraint |
| BR2.7 | Named and pseudonymous resolution | calculation |
| BR2.8 | Links never re-pointed | constraint |
| BR2.9 | Deferrable thread key | constraint |
| BR3.1 | One reader of the private tables | constraint |
| BR3.2 | Private repository only in identity | authorization |
| BR3.3 | Private operations never server actions | authorization |
| BR3.4 | Worker denied and import-barred | authorization |
| BR3.5 | `Actor.personaId` through identity | constraint |
| BR3.6 | Logs never pair accounts and personas | constraint |
| BR3.7 | `ownsAnyPersona`: one boolean, internal | authorization |
| BR4.1 | Capability and step-up required | authorization |
| BR4.2 | Capability only from U10's table | authorization |
| BR4.3 | Input shape; malformed not recorded | validation |
| BR4.4 | Reason at least 10 graphemes, recorded | validation |
| BR4.5 | Target through `RevealTarget` | policy |
| BR4.6 | Link through `linkFor`; `no_link` | policy |
| BR4.7 | Email only for Super Admin, read only then | authorization |
| BR4.8 | Result after commit, never logged | constraint |
| BR4.9 | 20 attempts per hour | policy |
| BR4.10 | Any persona kind, kind recorded | policy |
| BR4.11 | Signed-out caller refused, logged | authorization |
| BR5.1 | One row, one audit, one event per attempt | policy |
| BR5.2 | `onRefused` for every refusal; failure is `internal` | constraint |
| BR5.3 | Handler outcomes in the command's transaction | constraint |
| BR5.4 | Reveal row fields | constraint |
| BR5.5 | Allowlisted audit details | constraint |
| BR5.6 | Outbox payload with target code | constraint |
| BR5.7 | Append-only | constraint |
| BR5.8 | `granted` means an identity was returned | constraint |
| BR6.1 | De-identify removes links except kept | constraint |
| BR6.2 | Kept ids must belong to the account | validation |
| BR6.3 | "Former member" after deletion, snapshot scrubbed (Q15 B, Q16) | policy |
| BR6.4 | Anonymous aliases unchanged | constraint |
| BR6.5 | Reveal history untouched | constraint |
| BR6.6 | De-identify audited | constraint |
| BR6.7 | Rename creates a new persona | constraint |
| BR6.8 | Current named persona is the newest | calculation |
| BR7.1 | Contracts and reference documents corrected | policy |
| BR7.2 | One forward-only migration | constraint |
| BR7.3 | `en` + `bn` together | policy |
| BR7.4 | ISS rows closed and added | policy |
| BR7.5 | Owned-path additions recorded | policy |
| BR7.6 | No new dependency | policy |
| BR7.7 | Reporter identity only through reveal | authorization |
| BR7.8 | No anonymity or staff-access copy from identity (R1) | policy |
| BR8.1 | Tests per level | validation |
| BR8.2 | Smoke grows | validation |
| BR8.3 | All checks green | validation |
| BR8.4 | Adversarial tests, collaborators, sign-off | validation |
| BR8.5 | Coverage floor | validation |
| BR8.6 | Placement under the T-010 boundaries | constraint |
| BR8.7 | T-010's pins updated with the change | constraint |
