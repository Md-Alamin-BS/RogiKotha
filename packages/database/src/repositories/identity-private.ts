// The private half of the identity repositories (U11 functional-spec § 1): the only reader and
// writer of `persona_links` (BR3.1). Only `createIdentityModule` receives it, and
// `PgAccountRepository.insertDefaultPersonas` calls its `createDefault` (BR3.2, Q2). Personas and
// links are inserted, never updated (BR1.3, BR2.8). Nothing here logs.
import type {
  DefaultPersonaIds,
  DefaultPersonaKind,
  InsertAnonymousError,
  NewAnonymousPersona,
  NewDefaultPersonaPair,
  NewNamedPersona,
  PersonaRecord,
  PortResult,
  PrivateIdentityRepository,
  PrivateIdentityRepositoryMethods,
  Tx as AppTx,
} from '@rogikotha/application';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { uniqueViolationConstraint } from '../pg-error';
import { personaLinks, personas } from '../schema/identity';
import { executorOf, type Executor } from '../unit-of-work';
import { isUuid, personaColumns } from './identity';

const ALIAS_UNIQUE_INDEX = 'personas_anonymous_alias_uq';
const THREAD_UNIQUE_INDEX = 'persona_links_account_review_uq';

async function newestOf(
  db: Executor,
  accountId: string,
  kind: DefaultPersonaKind,
): Promise<PersonaRecord | null> {
  const [row] = await db
    .select(personaColumns)
    .from(personaLinks)
    .innerJoin(personas, eq(personas.id, personaLinks.personaId))
    .where(
      and(
        eq(personaLinks.accountId, accountId),
        isNull(personaLinks.reviewId),
        eq(personas.kind, kind),
      ),
    )
    // `created_at` is the database clock; `register` passes app-clock UUIDv7 ids, so ordering by
    // `id` alone lets app-to-database clock skew hide a later rename (U11 Step 17 finding c).
    .orderBy(desc(personas.createdAt), desc(personas.id))
    .limit(1);
  return row ?? null;
}

async function insertLinked(
  db: Executor,
  accountId: string,
  persona: {
    id?: string;
    kind: PersonaRecord['kind'];
    displayName: string;
    username: string | null;
    avatarHue: number | null;
  },
  reviewId: string | null,
): Promise<string> {
  const [row] = await db.insert(personas).values(persona).returning({ id: personas.id });
  const personaId = row!.id;
  await db.insert(personaLinks).values({ personaId, accountId, reviewId });
  return personaId;
}

export class PgPrivateIdentityRepository implements PrivateIdentityRepositoryMethods {
  /** The branded port, as `createIdentityModule` takes it (BR3.2). */
  asPort(): PrivateIdentityRepository {
    return this as unknown as PrivateIdentityRepository;
  }

  async createDefault(tx: AppTx, input: NewDefaultPersonaPair): Promise<DefaultPersonaIds> {
    const db = executorOf(tx);
    const named = await newestOf(db, input.accountId, 'named');
    const pseudonymous = await newestOf(db, input.accountId, 'pseudonymous');
    if (named && pseudonymous) {
      return { namedPersonaId: named.id, pseudonymousPersonaId: pseudonymous.id };
    }
    const namedPersonaId = await insertLinked(
      db,
      input.accountId,
      {
        ...(input.namedPersonaId === undefined ? {} : { id: input.namedPersonaId }),
        kind: 'named',
        displayName: input.displayName,
        username: input.username,
        avatarHue: null,
      },
      null,
    );
    const pseudonymousPersonaId = await insertLinked(
      db,
      input.accountId,
      {
        ...(input.pseudonymousPersonaId === undefined ? {} : { id: input.pseudonymousPersonaId }),
        kind: 'pseudonymous',
        displayName: input.username,
        username: input.username,
        avatarHue: null,
      },
      null,
    );
    return { namedPersonaId, pseudonymousPersonaId };
  }

  async createMissingDefault(
    tx: AppTx,
    accountId: string,
    kind: DefaultPersonaKind,
  ): Promise<string | null> {
    if (!isUuid(accountId)) return null;
    // BR2.2: one statement reads the live profile and writes the persona and its link.
    const result = await executorOf(tx).execute<{ persona_id: string }>(sql`
      with profile as (
        select id, username::text as username, display_name
        from account_profiles
        where id = ${accountId} and status <> 'deleted'
      ), persona as (
        insert into personas (kind, display_name, username)
        select ${kind}::identity_mode,
               case when ${kind} = 'named' then display_name else username end,
               username
        from profile
        returning id
      )
      insert into persona_links (persona_id, account_id)
      select id, ${accountId}::uuid from persona
      returning persona_id
    `);
    return result.rows[0]?.persona_id ?? null;
  }

  currentOf(tx: AppTx, accountId: string, kind: DefaultPersonaKind): Promise<PersonaRecord | null> {
    if (!isUuid(accountId)) return Promise.resolve(null);
    return newestOf(executorOf(tx), accountId, kind);
  }

  async findAnonymous(tx: AppTx, accountId: string, reviewId: string): Promise<string | null> {
    if (!isUuid(accountId) || !isUuid(reviewId)) return null;
    const [row] = await executorOf(tx)
      .select({ personaId: personaLinks.personaId })
      .from(personaLinks)
      .where(and(eq(personaLinks.accountId, accountId), eq(personaLinks.reviewId, reviewId)))
      .limit(1);
    return row?.personaId ?? null;
  }

  async insertAnonymous(
    tx: AppTx,
    input: NewAnonymousPersona,
  ): Promise<PortResult<{ personaId: string }, InsertAnonymousError>> {
    try {
      // A savepoint, so a clash leaves the caller's transaction usable (BR2.6).
      const personaId = await executorOf(tx).transaction((savepoint) =>
        insertLinked(
          savepoint,
          input.accountId,
          { kind: 'anonymous', displayName: input.alias, username: null, avatarHue: 0 },
          input.reviewId,
        ),
      );
      return { ok: true, data: { personaId } };
    } catch (error) {
      const constraint = uniqueViolationConstraint(error);
      if (constraint === ALIAS_UNIQUE_INDEX) return { ok: false, error: { code: 'alias_taken' } };
      if (constraint === THREAD_UNIQUE_INDEX) return { ok: false, error: { code: 'thread_taken' } };
      throw error;
    }
  }

  insertNamed(tx: AppTx, input: NewNamedPersona): Promise<string> {
    return insertLinked(
      executorOf(tx),
      input.accountId,
      {
        kind: 'named',
        displayName: input.displayName,
        username: input.username,
        avatarHue: input.avatarHue,
      },
      null,
    );
  }

  async owns(tx: AppTx, accountId: string, personaId: string): Promise<boolean> {
    if (!isUuid(accountId) || !isUuid(personaId)) return false;
    const rows = await executorOf(tx)
      .select({ personaId: personaLinks.personaId })
      .from(personaLinks)
      .where(and(eq(personaLinks.personaId, personaId), eq(personaLinks.accountId, accountId)))
      .limit(1);
    return rows.length > 0;
  }

  async personaIdsOf(tx: AppTx, accountId: string, limit: number): Promise<string[]> {
    if (!isUuid(accountId)) return [];
    const rows = await executorOf(tx)
      .select({ personaId: personaLinks.personaId })
      .from(personaLinks)
      .where(eq(personaLinks.accountId, accountId))
      .orderBy(personaLinks.personaId)
      .limit(limit);
    return rows.map((row) => row.personaId);
  }
}
