// Identity port fakes (U11 functional-spec § 1). `FakeIdentityRepository` and
// `FakePrivateIdentityRepository` share one `FakeIdentityStore`, the way `PgIdentityRepository` and
// `PgPrivateIdentityRepository` share the `personas` table. The store keeps the two uniqueness
// rules of the migration (one alias per generated name, one anonymous persona per account and
// review) and can be told to lose an alias or a thread race. A rollback of `InMemoryUnitOfWork`
// undoes its writes when it is enlisted.
import {
  portErr,
  portOk,
  type DefaultPersonaIds,
  type DefaultPersonaKind,
  type IdentityModulePorts,
  type IdentityRepository,
  type InsertAnonymousError,
  type NewAnonymousPersona,
  type NewDefaultPersonaPair,
  type NewNamedPersona,
  type PersonaRecord,
  type PortResult,
  type PrivateIdentityRepository,
  type PrivateIdentityRepositoryMethods,
  type Tx,
} from '@rogikotha/application';
import { isGeneratedAlias } from '@rogikotha/domain';

import type { FakeAccountRepository } from './account-repository.js';
import { FakeCrypto } from './crypto.js';
import { CollectingLogger } from './logger.js';
import type { Transactional } from './unit-of-work.js';

export interface FakePersonaLink {
  personaId: string;
  accountId: string;
  reviewId: string | null;
}

interface IdentityTables {
  personas: PersonaRecord[];
  links: FakePersonaLink[];
}

export class FakeIdentityStore implements Transactional {
  private tables: IdentityTables = { personas: [], links: [] };
  private counter = 0;

  /** Monotonic, UUIDv7-shaped ids, so "newest by id" holds as it does in PostgreSQL. */
  newPersonaId(): string {
    this.counter += 1;
    return `00000000-0000-7000-9000-${this.counter.toString(16).padStart(12, '0')}`;
  }

  get personas(): readonly PersonaRecord[] {
    return this.tables.personas;
  }

  get links(): readonly FakePersonaLink[] {
    return this.tables.links;
  }

  insert(persona: PersonaRecord, link: FakePersonaLink): void {
    this.tables.personas.push({ ...persona });
    this.tables.links.push({ ...link });
  }

  aliasTaken(alias: string): boolean {
    return this.tables.personas.some(
      (p) => p.kind === 'anonymous' && isGeneratedAlias(p.displayName) && p.displayName === alias,
    );
  }

  threadTaken(accountId: string, reviewId: string): boolean {
    return this.tables.links.some((l) => l.accountId === accountId && l.reviewId === reviewId);
  }

  snapshot(): unknown {
    return { personas: [...this.tables.personas], links: [...this.tables.links] };
  }

  restore(state: unknown): void {
    const saved = state as IdentityTables;
    this.tables = { personas: [...saved.personas], links: [...saved.links] };
  }
}

export class FakeIdentityRepository implements IdentityRepository {
  constructor(readonly store: FakeIdentityStore = new FakeIdentityStore()) {}

  byIds(_tx: Tx, ids: readonly string[]): Promise<PersonaRecord[]> {
    const wanted = new Set(ids);
    return Promise.resolve(
      this.store.personas.filter((p) => wanted.has(p.id)).map((p) => ({ ...p })),
    );
  }

  publicIdsByUsername(_tx: Tx, username: string): Promise<string[]> {
    return Promise.resolve(
      this.store.personas
        .filter((p) => p.kind !== 'anonymous' && p.username === username)
        .map((p) => p.id),
    );
  }
}

export class FakePrivateIdentityRepository implements PrivateIdentityRepositoryMethods {
  /** Aliases the next `insertAnonymous` calls report as taken, as if another thread held them. */
  readonly takenAliases = new Set<string>();
  /** Threads whose next first use loses a race: a concurrent winner is written first. */
  readonly racingThreads = new Set<string>();
  insertAnonymousCalls = 0;

  constructor(
    readonly store: FakeIdentityStore = new FakeIdentityStore(),
    readonly accounts: FakeAccountRepository | null = null,
  ) {}

  /** The branded port, as `createIdentityModule` takes it. */
  asPort(): PrivateIdentityRepository {
    return this as unknown as PrivateIdentityRepository;
  }

  async createDefault(_tx: Tx, input: NewDefaultPersonaPair): Promise<DefaultPersonaIds> {
    const named = await this.currentOf(_tx, input.accountId, 'named');
    const pseudonymous = await this.currentOf(_tx, input.accountId, 'pseudonymous');
    if (named && pseudonymous) {
      return { namedPersonaId: named.id, pseudonymousPersonaId: pseudonymous.id };
    }
    const namedPersonaId = input.namedPersonaId ?? this.store.newPersonaId();
    const pseudonymousPersonaId = input.pseudonymousPersonaId ?? this.store.newPersonaId();
    this.insertDefault(input.accountId, namedPersonaId, 'named', input.displayName, input.username);
    this.insertDefault(
      input.accountId,
      pseudonymousPersonaId,
      'pseudonymous',
      input.username,
      input.username,
    );
    return { namedPersonaId, pseudonymousPersonaId };
  }

  createMissingDefault(
    _tx: Tx,
    accountId: string,
    kind: DefaultPersonaKind,
  ): Promise<string | null> {
    const profile = this.accounts?.profiles.get(accountId);
    if (!profile || profile.status === 'deleted') return Promise.resolve(null);
    const personaId = this.store.newPersonaId();
    const displayName = kind === 'named' ? profile.displayName : profile.username;
    this.insertDefault(accountId, personaId, kind, displayName, profile.username);
    return Promise.resolve(personaId);
  }

  currentOf(_tx: Tx, accountId: string, kind: DefaultPersonaKind): Promise<PersonaRecord | null> {
    const ids = new Set(
      this.store.links
        .filter((l) => l.accountId === accountId && l.reviewId === null)
        .map((l) => l.personaId),
    );
    const newest = this.store.personas
      .filter((p) => p.kind === kind && ids.has(p.id))
      .sort((a, b) => b.id.localeCompare(a.id))[0];
    return Promise.resolve(newest ? { ...newest } : null);
  }

  findAnonymous(_tx: Tx, accountId: string, reviewId: string): Promise<string | null> {
    const link = this.store.links.find((l) => l.accountId === accountId && l.reviewId === reviewId);
    return Promise.resolve(link?.personaId ?? null);
  }

  insertAnonymous(
    _tx: Tx,
    input: NewAnonymousPersona,
  ): Promise<PortResult<{ personaId: string }, InsertAnonymousError>> {
    this.insertAnonymousCalls += 1;
    const thread = `${input.accountId}:${input.reviewId}`;
    if (this.racingThreads.delete(thread)) {
      this.writeAnonymous(input.accountId, input.reviewId, `${input.alias}-winner`);
      return Promise.resolve(portErr('thread_taken'));
    }
    if (this.store.threadTaken(input.accountId, input.reviewId)) {
      return Promise.resolve(portErr('thread_taken'));
    }
    if (this.takenAliases.has(input.alias) || this.store.aliasTaken(input.alias)) {
      return Promise.resolve(portErr('alias_taken'));
    }
    const personaId = this.writeAnonymous(input.accountId, input.reviewId, input.alias);
    return Promise.resolve(portOk({ personaId }));
  }

  insertNamed(_tx: Tx, input: NewNamedPersona): Promise<string> {
    const personaId = this.store.newPersonaId();
    this.store.insert(
      {
        id: personaId,
        kind: 'named',
        displayName: input.displayName,
        username: input.username,
        avatarHue: input.avatarHue,
      },
      { personaId, accountId: input.accountId, reviewId: null },
    );
    return Promise.resolve(personaId);
  }

  owns(_tx: Tx, accountId: string, personaId: string): Promise<boolean> {
    return Promise.resolve(
      this.store.links.some((l) => l.accountId === accountId && l.personaId === personaId),
    );
  }

  personaIdsOf(_tx: Tx, accountId: string, limit: number): Promise<string[]> {
    return Promise.resolve(
      this.store.links
        .filter((l) => l.accountId === accountId)
        .map((l) => l.personaId)
        .slice(0, limit),
    );
  }

  private insertDefault(
    accountId: string,
    personaId: string,
    kind: DefaultPersonaKind,
    displayName: string,
    username: string,
  ): void {
    this.store.insert(
      { id: personaId, kind, displayName, username, avatarHue: null },
      { personaId, accountId, reviewId: null },
    );
  }

  private writeAnonymous(accountId: string, reviewId: string, alias: string): string {
    const personaId = this.store.newPersonaId();
    this.store.insert(
      { id: personaId, kind: 'anonymous', displayName: alias, username: null, avatarHue: 0 },
      { personaId, accountId, reviewId },
    );
    return personaId;
  }
}

/** The identity module's ports over one shared store, for application tests. */
export function makeIdentityPorts(
  options: {
    accounts?: FakeAccountRepository;
    crypto?: FakeCrypto;
    logger?: CollectingLogger;
  } = {},
) {
  const store = new FakeIdentityStore();
  const identities = new FakeIdentityRepository(store);
  const privateIdentities = new FakePrivateIdentityRepository(store, options.accounts ?? null);
  const logger = options.logger ?? new CollectingLogger();
  const crypto = options.crypto ?? new FakeCrypto({ keyByte: 3 });
  const ports: IdentityModulePorts = {
    identities,
    privateIdentities: privateIdentities.asPort(),
    crypto,
    logger,
  };
  return { ports, store, identities, privateIdentities, logger, crypto };
}
