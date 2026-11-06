// PgIdentityRepository against DATABASE_URL_TEST (U11 functional-spec § 9, database row): the public
// reads of `personas` (BR1.1, BR1.5, BR1.6).
import { newId } from '@rogikotha/contracts';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { personas } from '../schema/identity';
import { testDb } from '../test-setup';
import { appTx, uniqueSuffix } from './account-test-support';
import { PgIdentityRepository } from './identity';

const repo = new PgIdentityRepository();
const tx = appTx(testDb);

type Kind = 'named' | 'pseudonymous' | 'anonymous';

async function buildPersona(
  kind: Kind,
  values: { displayName?: string; username?: string | null; avatarHue?: number | null } = {},
): Promise<string> {
  const [row] = await testDb
    .insert(personas)
    .values({
      kind,
      displayName: values.displayName ?? `Synthetic ${kind} ${uniqueSuffix()}`,
      username: values.username ?? null,
      avatarHue: values.avatarHue ?? null,
    })
    .returning({ id: personas.id });
  return row!.id;
}

describe('personas table', () => {
  it('has exactly the public columns and no account column (BR1.1, R-05)', async () => {
    const { rows } = await testDb.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'personas'`,
    );

    expect(rows.map((row) => row.column_name).sort()).toEqual(
      ['avatar_hue', 'created_at', 'display_name', 'id', 'kind', 'username'].sort(),
    );
  });
});

describe('PgIdentityRepository.byIds', () => {
  it('returns each requested persona once with its public fields', async () => {
    const username = `rina_${uniqueSuffix()}`;
    const named = await buildPersona('named', { displayName: 'Rina Synthetic', username });
    const anonymous = await buildPersona('anonymous', {
      displayName: `patient-${uniqueSuffix()}`,
      avatarHue: 0,
    });

    const rows = await repo.byIds(tx, [named, anonymous, named]);

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: named, kind: 'named', displayName: 'Rina Synthetic', username, avatarHue: null },
        {
          id: anonymous,
          kind: 'anonymous',
          displayName: expect.stringMatching(/^patient-/) as unknown,
          username: null,
          avatarHue: 0,
        },
      ]),
    );
  });

  it('leaves out unknown and malformed ids instead of failing the query', async () => {
    const named = await buildPersona('named');

    const rows = await repo.byIds(tx, [newId(), 'not-a-uuid', "'; drop table personas; --", named]);

    expect(rows.map((row) => row.id)).toEqual([named]);
  });

  it('returns nothing for no ids or only malformed ids', async () => {
    expect(await repo.byIds(tx, [])).toEqual([]);
    expect(await repo.byIds(tx, ['x', ''])).toEqual([]);
  });
});

describe('PgIdentityRepository.publicIdsByUsername', () => {
  it('finds named and pseudonymous personas with that username, never an anonymous one (BR1.6)', async () => {
    const username = `karim_${uniqueSuffix()}`;
    const named = await buildPersona('named', { username });
    const pseudonymous = await buildPersona('pseudonymous', { displayName: username, username });
    // A row that should never exist, written by hand to prove the kind filter holds on its own.
    await buildPersona('anonymous', { displayName: `patient-${uniqueSuffix()}`, username });
    await buildPersona('named', { username: `other_${uniqueSuffix()}` });

    const ids = await repo.publicIdsByUsername(tx, username);

    expect(ids).toEqual([named, pseudonymous].sort());
  });

  it('finds nothing for an empty or unknown username', async () => {
    await buildPersona('named', { username: '' });

    expect(await repo.publicIdsByUsername(tx, '')).toEqual([]);
    expect(await repo.publicIdsByUsername(tx, `nobody_${uniqueSuffix()}`)).toEqual([]);
  });
});
