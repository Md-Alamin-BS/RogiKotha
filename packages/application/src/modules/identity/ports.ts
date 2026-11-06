// The identity module's own ports (C19, U11 functional-spec § 1). `container.ts` builds them once
// and passes them to `createIdentityModule`; `CommandPorts` is not extended. The private repository
// is the only reader and writer of `persona_links` (BR3.1) and reaches no other module (BR3.2).
import type { AnonymousPersonaPublicVM, IdentityMode, PersonaPublicVM } from '@rogikotha/contracts';
import type { Persona, PersonaKind, PersonaProjection } from '@rogikotha/domain';

import type { Crypto } from '../../ports/crypto';
import type { Logger } from '../../ports/logger';
import type { PortResult } from '../../ports/port-result';
import type { Tx } from '../../ports/unit-of-work';

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
/** Fails to compile if the domain kind list drifts from `IDENTITY_MODES` in contracts. */
export type PersonaKindsMatchContracts = Assert<Same<PersonaKind, IdentityMode>>;
/** Fails to compile if the domain projection drifts from the contracts view model. */
export type ProjectionMatchesContracts = Assert<Same<PersonaProjection, PersonaPublicVM>>;
export type AnonymousHueMatchesContracts = Assert<
  Same<
    Extract<PersonaProjection, { kind: 'anonymous' }>['avatarHue'],
    AnonymousPersonaPublicVM['avatarHue']
  >
>;

/** A `personas` row as the repositories read it; it never leaves the server. */
export type PersonaRecord = Persona;

export type DefaultPersonaKind = Exclude<PersonaKind, 'anonymous'>;

/** Public reads of `personas` only (BR1.5, BR1.6). */
export interface IdentityRepository {
  /** The personas with these ids, in no particular order; unknown or malformed ids are left out. */
  byIds(tx: Tx, ids: readonly string[]): Promise<PersonaRecord[]>;
  /** Named and pseudonymous personas whose stored username equals `username`; never anonymous. */
  publicIdsByUsername(tx: Tx, username: string): Promise<string[]>;
}

export interface NewDefaultPersonaPair {
  accountId: string;
  username: string;
  displayName: string;
  /** Given by `account.register` from its id generator; otherwise the database makes them. */
  namedPersonaId?: string;
  pseudonymousPersonaId?: string;
}

export interface DefaultPersonaIds {
  namedPersonaId: string;
  pseudonymousPersonaId: string;
}

export interface NewAnonymousPersona {
  accountId: string;
  reviewId: string;
  alias: string;
}

export interface NewNamedPersona {
  accountId: string;
  displayName: string;
  username: string | null;
  avatarHue: number | null;
}

export type InsertAnonymousError = 'alias_taken' | 'thread_taken';

/** The private repository's methods; the brand below keeps it from passing for anything else. */
export interface PrivateIdentityRepositoryMethods {
  /** BR1.2: returns the existing pair, or inserts both personas and their unscoped links. */
  createDefault(tx: Tx, input: NewDefaultPersonaPair): Promise<DefaultPersonaIds>;
  /** BR2.2: inserts the persona from the live account's profile; null when no live account. */
  createMissingDefault(tx: Tx, accountId: string, kind: DefaultPersonaKind): Promise<string | null>;
  /** BR2.1: the newest persona of that kind with an unscoped link. */
  currentOf(tx: Tx, accountId: string, kind: DefaultPersonaKind): Promise<PersonaRecord | null>;
  /** The persona linked to `(accountId, reviewId)`, if any. */
  findAnonymous(tx: Tx, accountId: string, reviewId: string): Promise<string | null>;
  /** BR2.6: both inserts in one savepoint, so a clash leaves the caller's transaction usable. */
  insertAnonymous(
    tx: Tx,
    input: NewAnonymousPersona,
  ): Promise<PortResult<{ personaId: string }, InsertAnonymousError>>;
  /** BR4.1: a new named persona and its unscoped link. */
  insertNamed(tx: Tx, input: NewNamedPersona): Promise<string>;
  /** BR3.3: whether that persona is linked to that account; malformed ids give false. */
  owns(tx: Tx, accountId: string, personaId: string): Promise<boolean>;
  /** BR3.4: every persona id linked to the account, at most `limit`. */
  personaIdsOf(tx: Tx, accountId: string, limit: number): Promise<string[]>;
}

declare const PRIVATE_IDENTITY_BRAND: unique symbol;

/**
 * Only `packages/database/src/repositories/identity-private.ts` makes one, and only
 * `createIdentityModule` receives it (BR3.2).
 */
export interface PrivateIdentityRepository extends PrivateIdentityRepositoryMethods {
  readonly [PRIVATE_IDENTITY_BRAND]: 'PrivateIdentityRepository';
}

export interface IdentityModulePorts {
  identities: IdentityRepository;
  privateIdentities: PrivateIdentityRepository;
  /** For aliases only. */
  crypto: Pick<Crypto, 'randomToken'>;
  // ASSUMPTION(U11): the design's port list has no logger, but WF3 logs `identity.alias_exhausted`.
  logger: Logger;
}
