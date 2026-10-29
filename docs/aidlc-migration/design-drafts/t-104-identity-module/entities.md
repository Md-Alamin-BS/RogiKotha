# Entities — U11 `t-104-identity-module`

Draft written ahead of the stage. The lead finalises it when the workflow reaches this Unit; then it moves to `<record>/construction/t-104-identity-module/functional-design/`.

Source of truth for the data shape this Unit works on. Built from T-104, `02-data-model.md` §0, §3, §6, §8, §9, §12 and §16, `contract-summary.md` (C4, C15), the code on `main` (`packages/database/src/schema/identity.ts`, `migrations/0000_init.sql`, `0001_grants_part1.sql`, `0003_triggers.sql`, `0004_deferred_fks.sql`, `packages/contracts/src/{enums,actor}.ts`, `schemas/identity.ts`, `packages/test-support/src/corpus/personas.ts`, `seed/seed-content.ts`) and the U8 and U10 draft entities, which this file extends and does not repeat. Workflows and state transitions are in `functional-spec.md`; decision logic is in `rules.md`.

Refreshed 2026-10-29:
- `personas.deidentified_at` is no longer conditional, with the scrub check (the owner's Q15 answer B, Q16).
- The one `BylineVM` replaces both public shapes, and `PersonaPublicVM` becomes its alias (Q17). Named and pseudonymous bylines carry `profileUsername` (FR11, AC10.2.1, T-301 Q18 A); the alias is the anonymous persona's name on thread surfaces only, and list surfaces (cards) carry no alias (T-301 F25).
- `identity.ownsAnyPersona` and the pseudonymous id in `identity.currentPersonaOf` (T-301 Q8 A, its F29) are new value objects.
- The private repository's methods carry the savepoint retries (Q18).
- `Crypto.randomBytes` is added to U8's port.

Three kinds of entity appear here: **persisted** rows (three existing tables; this Unit adds columns, three enum types, three indexes and a deferrable key, and no table), **value objects** that cross a boundary (projections, byline data, the reveal input and result, the port shapes), and the **alias**, which is a value with a format but no table of its own. Logical types only; the physical columns are the ones on `main` plus the migration of `functional-spec.md` § 7.

```yaml
entities:
  - name: Persona
    kind: persisted
    table: personas
    owner: "Identity module (repositories/identity.ts reads, identity-private.ts writes)"
    description: "A public identity snapshot that content points at. Public by design; carries no account data (AD-3)."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true, constraints: "server-side only; never in a view model (BR1.4)" }
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: true, constraints: "named: the display name at creation (1-60, NFC, trimmed); pseudonymous: the username; anonymous: the alias patient-xxxx (BR2.1); never updated (BR1.5) except emptied ('') by the de-identification scrub (BR6.3)" }
      - { name: username, type: text, required: false, constraints: "named and pseudonymous: a copy of the account's username (not re-validated, Q11), stored for lookups and given to bylines as `profileUsername` for the profile link (Q17); anonymous: always null; null after the scrub" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359, constraints: "named and pseudonymous: random at creation from Crypto.randomBytes, copied on rename; anonymous: 0 (BR1.6); 0 after the scrub" }
      - { name: deidentified_at, type: timestamp, required: false, constraints: "new column (Q15 B); set by identity.deidentify, or later by FD-090's held-link function, for named and pseudonymous personas whose link was removed; never set on an anonymous persona" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "No account, user or email column, ever (BR1.1)"
      - "Partial unique index personas_anonymous_alias_uq on (display_name) WHERE kind = anonymous (new migration, BR2.2)"
      - "Check constraint personas_deidentified_scrubbed_ck: deidentified_at IS NULL OR (kind <> 'anonymous' AND display_name = '' AND username IS NULL AND avatar_hue = 0) (BR6.3, FD-<next: Former member>)"
      - "rk_worker holds SELECT on this table (0001, live and not ratified, FD-092); it learns nothing without persona_links, and nothing of a deleted account after the scrub"
      - "Referenced by reviews.author_persona_id, facility_reviews.author_persona_id, comments.author_persona_id, comment_mentions.mentioned_persona_id and reactions.public_persona_id (all owned by other modules)"
    relationships:
      - { to: PersonaLink, cardinality: "one-to-zero-or-one", direction: "Persona has at most one private link (none after de-identification)" }

  - name: PersonaLink
    kind: persisted
    table: persona_links
    owner: "Identity module; only repositories/identity-private.ts touches it (BR3.1)"
    description: "The private link from a persona to its account, and for an anonymous persona in a review thread, to that thread."
    attributes:
      - { name: persona_id, type: uuid-v7, required: true, unique: true, references: Persona.id, constraints: "primary key; cascade delete with the persona" }
      - { name: account_id, type: uuid-v7, required: true, references: AccountProfile.id, constraints: "cascade delete; the account profile is kept as a tombstone on deletion (FD-077), so the cascade does not run in normal operation" }
      - { name: review_id, type: uuid-v7, required: false, references: Review.id, constraints: "set only for anonymous personas of a review thread; null for named, pseudonymous and facility-feedback personas; ON DELETE SET NULL; the key becomes DEFERRABLE INITIALLY DEFERRED (BR2.9)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Partial unique index persona_links_account_review_uq on (account_id, review_id) WHERE review_id IS NOT NULL (BR2.3)"
      - "Index persona_links_account_idx on (account_id) (private lookups are by account)"
      - "Rows are inserted or deleted, never updated (BR2.8)"
      - "rk_worker has no privilege (0001, 02-data-model.md §16 (f)); tested (BR3.4)"
    relationships:
      - { to: Persona, cardinality: "one-to-one", direction: "PersonaLink links Persona" }
      - { to: AccountProfile, cardinality: "many-to-one", direction: "PersonaLink belongs to AccountProfile" }
      - { to: Review, cardinality: "many-to-zero-or-one", direction: "PersonaLink is scoped to a review thread (anonymous only)" }

  - name: IdentityReveal
    kind: persisted
    table: identity_reveals
    owner: "Identity module; only repositories/identity-private.ts touches it"
    description: "One row per reveal attempt by a signed-in account, granted or refused. Append-only."
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true, constraints: "the revealId in audit details and the outbox event" }
      - { name: requester_account_id, type: uuid-v7, required: true, references: AccountProfile.id }
      - { name: requester_role, type: enum, required: false, allowed_values: [super_admin, admin, moderator], constraints: "Actor.staffRole at the time; null when the Actor had none, for example an ordinary account or a staff account on an unapproved device (migration drops NOT NULL, Question 1)" }
      - { name: target_kind, type: enum, required: true, allowed_values: [review, facility_review, comment, report], constraints: "new type reveal_target_kind replacing the shared target_kind (Question 2, ISS-090)" }
      - { name: target_id, type: uuid-v7, required: true, constraints: "the content row id, or the report row id for a reporter reveal" }
      - { name: purpose, type: enum, required: true, allowed_values: [moderation, security, legal], constraints: "new column of type reveal_purpose (Question 4)" }
      - { name: outcome, type: enum, required: true, allowed_values: [granted, no_capability, step_up_required, rate_limited, reason_too_short, target_not_found, no_link], constraints: "new column of type reveal_outcome" }
      - { name: reason, type: text, required: true, constraints: "the staff member's stated reason, NFC and trimmed, at most 500 graphemes; stored only here: never in audit details, outbox, notices or logs" }
      - { name: granted, type: boolean, required: true, constraints: "true exactly when outcome = granted (BR5.8)" }
      - { name: revealed_account_id, type: uuid-v7, required: false, references: AccountProfile.id, constraints: "set only when granted" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "Append-only: the 0003 trigger raises on UPDATE and DELETE (BR5.7)"
      - "rk_worker has no privilege (0001); tested (BR3.4)"
      - "Every row has exactly one AuditEvent (identity stream) and one OutboxEvent (identity.revealed) written in the same transaction (BR5.1)"
    relationships:
      - { to: AccountProfile, cardinality: "many-to-one", direction: "IdentityReveal is requested by AccountProfile" }
      - { to: AccountProfile, cardinality: "many-to-zero-or-one", direction: "IdentityReveal reveals AccountProfile (granted only)" }

  - name: AuditEvent (identity records)
    kind: persisted
    table: audit_events
    owner: "Administration (FD-065) through the AuditWriter port"
    attributes:
      - { name: stream, type: text, required: true, constraints: "identity for reveal attempts; account:<accountId> for identity_deidentified" }
      - { name: action, type: enum, required: true, allowed_values: [reveal, identity_deidentified] }
      - { name: actor, type: text, required: true, constraints: "account:<requesterId> for reveal; the calling command's actor for identity_deidentified" }
      - { name: details, type: object, required: true, constraints: "reveal: {revealId, targetKind, targetId, outcome, granted, requesterRole, purpose, personaKind?, step_up}; identity_deidentified: {removedLinks, keptLinks, scrubbed}; never the reason, a revealed account id, a username, a display name or an email (BR5.5); built by detail builders in U8's allowlist (ISS-108 closed by U8)" }

  - name: OutboxEvent (identity.revealed)
    kind: persisted
    table: outbox_events
    owner: "Notification module (FD-065); appended by identity.reveal"
    attributes:
      - { name: name, type: enum, required: true, allowed_values: [identity.revealed] }
      - { name: payload, type: object, required: true, constraints: "{revealId, granted, outcome, targetKind, targetCode?, requesterRole} (Question 5, extends C15's {revealId, granted}); routed to notification.deliver, which U34 builds; no account or persona id (BR5.6)" }

  - name: AnonymousAlias
    kind: value object
    source: "packages/domain/src/identity/alias.ts"
    attributes:
      - { name: value, type: text, required: true, constraints: "'patient-' + 4 characters of abcdefghjkmnpqrstuvwxyz23456789, drawn with rejection sampling from Crypto random bytes (BR2.1); 923 521 possible values (F22)" }
    constraints:
      - "Derived from nothing: no account id, review id, time or counter"
      - "Unique among anonymous personas (BR2.2); shown unchanged in both languages, like a username"

  - name: BylineVM
    kind: value object (view model)
    source: "packages/contracts/src/view-models/persona.ts (new); built only by packages/domain/src/identity/byline.ts through identity.bylinesFor and identity.publicProjection (Question 17)"
    attributes:
      - { name: personaKind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: displayName, type: text, required: false, constraints: "named only (not de-identified)" }
      - { name: username, type: text, required: false, constraints: "pseudonymous only (not de-identified): the name the byline shows" }
      - { name: profileUsername, type: text, required: false, constraints: "named and pseudonymous only (not de-identified): the persona's stored username, the target of /<locale>/authors/<profileUsername> (FR11, AC10.2.1, T-301 Q18 A; supersedes T-202 Q7 A); never on an anonymous or former-member byline" }
      - { name: alias, type: text, required: false, constraints: "anonymous only, thread surface only: the persona's stored display name, the thread alias patient-xxxx, shown as the author's name (Question 6, AC3.3.2); absent on the list surface (cards), so the alias stays inside its thread (T-301 F25)" }
      - { name: initials, type: text, required: false, constraints: "named: first and last word graphemes after a leading Dr. or ডা.; pseudonymous: '@' + first grapheme; absent for anonymous and former members (the component shows a dash)" }
      - { name: avatarHue, type: integer, required: true, min: 0, max: 359, constraints: "0 for anonymous and former members" }
      - { name: formerMember, type: boolean, required: false, constraints: "true only for a de-identified named or pseudonymous persona; then no other optional field is present, profileUsername included (Question 15 B)" }
    constraints:
      - "Two surfaces, one type: identity.bylinesFor({personaIds, surface}) with surface thread (experience page, comments, reaction lists of that thread) or list (experience cards, facility accounts, search results, profile lists); the list surface omits alias and nothing else"
      - "Exactly the fields of functional-spec.md WF3's table; components choose the lede key by variant (experience.writtenBy, byline.commentBy, byline.yourIdentity, byline.anonSentence), the chip by personaKind (byline.identity.real, byline.identity.pseudo, compose.identity.anon, none for a former member) and render byline.formerMember for a former member"
      - "No id of any kind, no timestamp, no account field (BR1.3, BR1.4); property-tested over 1 000 generated personas"
      - "The one byline shape: U14 T-201's ProviderExperience (list surface), U15 T-202, U16 T-203, U21 T-301, U27 T-307, U30 T-401, U31 T-402 and U38 T-409 take it from identity (F27)"

  - name: PersonaPublicVM
    kind: value object (view model, alias)
    source: "packages/contracts/src/view-models/persona.ts: export type PersonaPublicVM = BylineVM"
    constraints:
      - "Kept as C4's name for identity.publicProjection; no second shape"

  - name: RevealIdentityInput
    kind: value object (command input)
    source: "packages/contracts/src/schemas/identity.ts (changed)"
    attributes:
      - { name: targetKind, type: enum, required: true, allowed_values: [review, facility_review, comment, report], constraints: "REVEAL_TARGET_KINDS (new, Question 2)" }
      - { name: targetId, type: uuid-v7, required: true, constraints: "was min(1) string; a uuid so it can be stored" }
      - { name: purpose, type: enum, required: true, allowed_values: [moderation, security, legal], constraints: "REVEAL_PURPOSES (new, Question 4)" }
      - { name: reason, type: text, required: true, constraints: "at most 500 graphemes in parsing; at least 10 graphemes checked after authorization and recorded (BR4.4)" }
    constraints:
      - ".strict(); no caller exists yet (U35 T-406 comes later), so the changes break nothing"

  - name: RevealResult
    kind: value object (command result)
    source: "identity.reveal"
    attributes:
      - { name: username, type: text, required: true }
      - { name: displayName, type: text, required: true, constraints: "the account profile's current display name" }
      - { name: email, type: email-address, required: false, constraints: "only when the requester's staffRole is super_admin (BR4.7); absent for a deleted account" }
    constraints:
      - "No account id, no persona id (Question 3, against C4's accountId)"
      - "Returned only after the record commits; never logged or cached (BR4.8)"

  - name: RevealTargetRef
    kind: value object (port result)
    source: "RevealTarget.resolve (modules/identity/ports.ts), implemented by Review (U21), Community (U30), Moderation (U32)"
    attributes:
      - { name: subject, type: enum, required: true, allowed_values: [persona, account] }
      - { name: personaId, type: uuid-v7, required: false, constraints: "persona subject (review, facility_review, comment)" }
      - { name: accountId, type: uuid-v7, required: false, constraints: "account subject (report: the restricted reporter); null after de-identification (FD-078)" }
      - { name: targetCode, type: text, required: true, constraints: "the public code for the staff notice: review or comment public id, case code for a report (new, Question 5)" }

  - name: RevealContact
    kind: value object (port result)
    source: "RevealContact.contactForReveal (modules/identity/ports.ts), implemented in modules/account/reveal-contact.ts by this Unit (C4)"
    attributes:
      - { name: username, type: text, required: true }
      - { name: displayName, type: text, required: true, constraints: "new in the port (Question 3)" }
      - { name: email, type: email-address, required: false, constraints: "read only when called with withEmail true" }

  - name: RevealOutcome
    kind: value object (enum)
    source: "packages/contracts/src/enums.ts REVEAL_OUTCOMES (new); database type reveal_outcome"
    attributes:
      - { name: value, type: enum, required: true, allowed_values: [granted, no_capability, step_up_required, rate_limited, reason_too_short, target_not_found, no_link] }

  - name: PrivateIdentityRepository
    kind: value object (port)
    source: "packages/application/src/ports/repositories/identity.ts"
    attributes:
      - { name: brand, type: unique-symbol, required: true, constraints: "readonly [PRIVATE_IDENTITY]: true, so the boundary type test can find it (BR3.2)" }
      - { name: methods, type: list, required: true, constraints: "linkFor, personasOf, currentNamedOf, pseudonymousOf, ownsAny (one boolean, T-301 Q8 A), findAnonymousFor, createDefault, createAnonymousPersona (own savepoint; returns created, alias_taken or thread_taken, Question 18), createNamed, accountsOf, removeLinks (returns the removed persona ids and kinds), scrubDeidentified (Question 15 B, Question 16), recordReveal; each takes the caller's tx" }
    constraints:
      - "Implemented only by repositories/identity-private.ts; passed only to the identity module (BR3.1, BR3.2)"
      - "The application holds the tx as an opaque type and never opens a savepoint itself (T-010, U8)"

  - name: CurrentPersonas
    kind: value object (internal query result)
    source: "identity.currentPersonaOf (modules/identity/internal/)"
    attributes:
      - { name: namedPersonaId, type: uuid-v7, required: true, constraints: "the newest linked named persona (BR6.8); fills Actor.personaId" }
      - { name: pseudonymousPersonaId, type: uuid-v7, required: true, constraints: "the account's pseudonymous persona; for U21 T-301's write-free preview (T-301 Q8 refresh, its F29)" }
    constraints:
      - "Internal only: never a server action, never in a view model, unreachable from the worker (BR3.3)"

  - name: OwnsAnyPersona
    kind: value object (internal query input and result)
    source: "identity.ownsAnyPersona (modules/identity/internal/), C4 additive (T-301 Q8 A)"
    attributes:
      - { name: accountId, type: uuid-v7, required: true }
      - { name: personaIds, type: list<uuid-v7>, required: true, constraints: "1-50 ids; the author personas of U21's repeat-episode candidates" }
      - { name: result, type: boolean, required: true, constraints: "true when at least one of the personas is linked to the account; no id, count or kind leaves the operation (BR3.7)" }

  - name: CryptoRandomBytes
    kind: port method (added to U8's Crypto port)
    source: "packages/application/src/ports/crypto.ts; packages/adapters/src/crypto (node:crypto randomBytes); FakeCrypto (seeded, deterministic)"
    attributes:
      - { name: randomBytes, type: "(n: number) => Uint8Array", required: true, constraints: "the only random source of aliases and avatar hues (BR1.6, BR2.1, F30)" }

  - name: IdentityRepository
    kind: value object (port)
    source: "packages/application/src/ports/repositories/identity.ts"
    attributes:
      - { name: methods, type: list, required: true, constraints: "getPersona(id), listPersonas(ids), findPublicByUsername(username); reads personas only" }
```

## Summary

- **Three existing identity tables** carry the module: `Persona` (public snapshot, no account data), `PersonaLink` (the only bridge to an account, and for anonymous personas to one review thread) and `IdentityReveal` (one append-only row per attempt). The migration adds a thread uniqueness index, an alias uniqueness index, an account index, a deferrable thread key, a reveal target-kind enum, purpose and outcome columns and a nullable requester role; no table and no grant.
- **One reader.** Only `identity-private.ts` touches `persona_links` and `identity_reveals`; only the identity module receives it; the worker can do neither.
- **What leaves the module publicly** is the one `BylineVM` (also called `PersonaPublicVM`): the display name and the profile username for named personas, the username and the profile username for pseudonymous ones, the thread alias for anonymous ones on thread surfaces only, "Former member" after deletion, the kind and the hue; never an id.
- **What other modules learn privately** is limited to `accountsOf`, `personasOf`, `currentPersonaOf` (named and pseudonymous ids) and the one boolean of `ownsAnyPersona`.
- **After deletion** a named or pseudonymous persona is scrubbed in place (no name, no username, hue 0, `deidentified_at`), held by a check constraint (FD-<next: Former member>).
- **What leaves a reveal** is `{username, displayName, email?}` to the requester after commit, and the record: the row, an allowlisted audit row and an `identity.revealed` event with a target code and no person in it.
- **Contract changes break no consumer:** `RevealIdentityInput.purpose` and the uuid `targetId`, the `report` target kind, the result without `accountId`, `RevealTargetRef.targetCode`, `RevealContact.displayName` and the extended `identity.revealed` payload all land before any consumer is built.
