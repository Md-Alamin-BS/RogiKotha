// The public half of the identity repositories (U11 functional-spec § 1, BR1.5, BR1.6): reads of
// `personas` only. `personas` holds no account data (BR1.1); the link lives in `persona_links`,
// which only `identity-private.ts` reads (BR3.1).
import type { IdentityRepository, PersonaRecord, Tx as AppTx } from '@rogikotha/application';
import { and, eq, inArray } from 'drizzle-orm';

import { personas } from '../schema/identity';
import { executorOf } from '../unit-of-work';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True for a string PostgreSQL accepts as a `uuid`; anything else would fail the whole query. */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const personaColumns = {
  id: personas.id,
  kind: personas.kind,
  displayName: personas.displayName,
  username: personas.username,
  avatarHue: personas.avatarHue,
};

export class PgIdentityRepository implements IdentityRepository {
  async byIds(tx: AppTx, ids: readonly string[]): Promise<PersonaRecord[]> {
    const wanted = [...new Set(ids)].filter(isUuid);
    if (wanted.length === 0) return [];
    return executorOf(tx).select(personaColumns).from(personas).where(inArray(personas.id, wanted));
  }

  async publicIdsByUsername(tx: AppTx, username: string): Promise<string[]> {
    if (username === '') return [];
    const rows = await executorOf(tx)
      .select({ id: personas.id })
      .from(personas)
      .where(
        and(eq(personas.username, username), inArray(personas.kind, ['named', 'pseudonymous'])),
      )
      .orderBy(personas.id);
    return rows.map((row) => row.id);
  }
}
