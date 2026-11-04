# Entities — U11 `t-104-identity-module` (release 1)

The data shape this Unit works on. It is built from `unit-of-work.md` (U11, narrowed by FD-105), `contract-summary.md` (C4 with its release-1 amendment, C9 `isReviewAuthor`, C19), T-104, AD-3, FD-015, and the code on `main`: `packages/database/src/schema/identity.ts`, `migrations/0000_init.sql`, `0001_grants_part1.sql`, `0004_deferred_fks.sql`, `packages/contracts/src/{actor,enums}.ts`, `schemas/identity.ts`, the demo slice's persona code (`packages/database/src/demo/{accounts,accounts-create,reviews,session}.ts`) and T-101's `register.ts`. It replaces the earlier draft in `docs/aidlc-migration/design-drafts/t-104-identity-module/`. The reveal and de-identification parts of that draft are left out (deferred to release 2, FD-105). Decision logic is in `rules.md`; workflows are in `functional-spec.md`; the decided questions are in `functional-design-questions.md`.

The tables already exist on `main`. This Unit adds no column. It adds two indexes and makes one foreign key deferrable (one migration, BR5.4).

```yaml
entities:
  - name: Persona
    table: personas
    description: "A public author identity. Public content (reviews, comments) points at a persona, never at an account. It holds no account data."
    owner: Identity (U11)
    attributes:
      - { name: id, type: uuid-v7, required: true, unique: true, constraints: "server-side only; never in a view model (BR1.4)" }
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: display_name, type: text, required: true, constraints: "named: the display name at creation; pseudonymous: the username; anonymous: the alias patient-xxxx (BR2.5), or the legacy seeded text 'Anonymous' (BR2.7); never updated (BR1.3)" }
      - { name: username, type: text, required: false, constraints: "named and pseudonymous: a copy of the account's username; anonymous: always null" }
      - { name: avatar_hue, type: integer, required: false, min: 0, max: 359, constraints: "anonymous: 0; named and pseudonymous: null in release 1, copied on rename (BR1.7)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "no column whose name names an account, a user or an email (BR1.1)"
      - "new partial unique index personas_anonymous_alias_uq on (display_name) WHERE kind = 'anonymous' AND display_name LIKE 'patient-%' (BR2.6); the legacy 'Anonymous' rows stay outside it; declared in the Drizzle schema packages/database/src/schema/identity.ts so later generated migrations keep it"
    relationships:
      - "Persona 1 — 0..1 PersonaLink (the private link, by persona_id)"
      - "Persona 1 — 0..* Review, Comment (public content points at it; owned by U47 and U49)"

  - name: PersonaLink
    table: persona_links
    description: "The private link from a persona to its account, and for an anonymous persona the review thread it is scoped to. Read and written only by identity-private.ts (BR3.1)."
    owner: Identity (U11)
    attributes:
      - { name: persona_id, type: uuid-v7, required: true, unique: true, references: Persona.id, constraints: "primary key; cascade delete with the persona" }
      - { name: account_id, type: uuid-v7, required: true, references: AccountProfile.id }
      - { name: review_id, type: uuid-v7, required: false, references: Review.id, constraints: "set only for an anonymous persona; null for named and pseudonymous; ON DELETE SET NULL kept; the key becomes DEFERRABLE INITIALLY DEFERRED (BR2.9)" }
      - { name: created_at, type: timestamp, required: true }
    constraints:
      - "new partial unique index persona_links_account_review_uq on (account_id, review_id) WHERE review_id IS NOT NULL (BR2.4); declared in the Drizzle schema packages/database/src/schema/identity.ts"
      - "rows are inserted, never updated, by the seed too (BR2.8)"
      - "rk_worker has no grant (0001_grants_part1.sql REVOKE ALL, BR3.7)"
    relationships:
      - "PersonaLink * — 1 AccountProfile (Account, U8)"
      - "PersonaLink * — 0..1 Review (Review, U47): one anonymous persona per account per review"

  - name: AnonymousAlias
    kind: value object
    description: "The public name of an anonymous persona inside one review thread."
    attributes:
      - { name: value, type: text, required: true, constraints: "'patient-' + 4 characters of abcdefghjkmnpqrstuvwxyz23456789 (31 characters, no confusables; 923 521 values); drawn from Crypto.randomToken with rejection sampling; derived from nothing else (BR2.5)" }

  - name: PersonaPublicVM
    kind: view model
    path: packages/contracts/src/view-models/persona.ts
    description: "The only public shape of a persona, returned by identity.publicProjection (C4). Bylines on reviews and comments are built from it by U47 and U49."
    attributes:
      - { name: kind, type: enum, required: true, allowed_values: [named, pseudonymous, anonymous] }
      - { name: displayName, type: text, required: false, constraints: "named: the snapshot display name; pseudonymous: the username; anonymous: the alias, or null for a legacy row that holds no alias (BR2.7)" }
      - { name: username, type: text, required: false, constraints: "named and pseudonymous only, for the /<locale>/authors/<username> link; never on an anonymous projection" }
      - { name: avatarHue, type: integer, required: false, min: 0, max: 359, constraints: "anonymous: 0; otherwise the stored value or null" }
    constraints:
      - "no other key: never an id, a persona id, an account id, a review id, an email or a timestamp (BR1.4)"

  - name: IdentityOwnership
    kind: module seam (private)
    path: packages/application/src/modules/identity/ownership.ts
    description: "The narrow private check that answers ownership questions without handing out the link. Given only to the review and community module factories (BR3.5)."
    operations:
      - "ownsPersona(tx, {accountId, personaId}): boolean (BR3.3)"
      - "ownPersonaIds(tx, {accountId}): personaId[] (BR3.4)"

  - name: IdentityModulePorts
    kind: module ports (C19)
    path: packages/application/src/modules/identity/ports.ts
    description: "What createIdentityModule(ports) receives from container.ts; CommandPorts is not extended."
    attributes:
      - { name: identities, type: IdentityRepository, required: true, constraints: "public reads of personas only: byIds, publicIdsByUsername" }
      - { name: privateIdentities, type: PrivateIdentityRepository, required: true, constraints: "branded type; implemented only by packages/database/src/repositories/identity-private.ts (BR3.2)" }
      - { name: crypto, type: "Pick<Crypto, 'randomToken'>", required: true, constraints: "the web instance from CommandPorts.crypto; used for aliases only" }

  - name: AuditEvent (named_persona_created)
    kind: record
    description: "Written by identity.renameNamed when it creates a new named persona."
    attributes:
      - { name: stream, type: text, required: true, constraints: "account:<accountId>" }
      - { name: action, type: enum, required: true, allowed_values: [named_persona_created] }
      - { name: actor, type: text, required: true, constraints: "account:<accountId>" }
      - { name: details, type: object, required: true, constraints: "{} — never the persona id, the name or the username (BR3.8)" }
```

## Summary

- **Persona** and **PersonaLink** are the two tables AD-3 already split: `personas` is public and carries no account data, `persona_links` is private. Release 1 adds two partial unique indexes and a deferrable key, and no column.
- **AnonymousAlias** is the thread alias `patient-xxxx`, random and unique among generated aliases.
- **PersonaPublicVM** is the one public shape. It never carries an id. Anonymous projections carry the alias and nothing that leads to a profile.
- **IdentityOwnership** settles the open question in `contract-summary.md`: other modules learn one boolean (`ownsPersona`) or the actor's own persona ids (`ownPersonaIds`), never another account's link.
- **IdentityModulePorts** is the module's own ports interface under C19.
- **Not touched in release 1:** `identity_reveals` (the table stays, nothing writes it), `RevealIdentityInput` and `AccountsOfInput` in `schemas/identity.ts`, and the `RevealTarget` and `RevealContact` ports (FD-105).
