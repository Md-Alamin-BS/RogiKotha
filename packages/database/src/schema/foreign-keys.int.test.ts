// The Drizzle schema and the migrated database must agree on every foreign key: the schema is
// what repositories are typed against, the migrations are what PostgreSQL enforces.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTableName, is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { testPool } from '../test-setup';
import * as schema from './index';

const DELETE_ACTIONS: Record<string, string> = {
  a: 'no action',
  r: 'restrict',
  c: 'cascade',
  n: 'set null',
  d: 'set default',
};

const DATABASE_FOREIGN_KEYS_SQL = `
  select con.conname as name,
         src.relname as table_name,
         array_agg(sa.attname::text order by k.ord) as columns,
         tgt.relname as foreign_table,
         array_agg(ta.attname::text order by k.ord) as foreign_columns,
         con.confdeltype as delete_action,
         con.condeferrable as deferrable,
         con.condeferred as initially_deferred
  from pg_constraint con
  join pg_class src on src.oid = con.conrelid
  join pg_namespace ns on ns.oid = src.relnamespace
  join pg_class tgt on tgt.oid = con.confrelid
  cross join lateral unnest(con.conkey, con.confkey) with ordinality as k(src_att, tgt_att, ord)
  join pg_attribute sa on sa.attrelid = con.conrelid and sa.attnum = k.src_att
  join pg_attribute ta on ta.attrelid = con.confrelid and ta.attnum = k.tgt_att
  where con.contype = 'f' and ns.nspname = 'public'
  group by con.oid, con.conname, src.relname, tgt.relname, con.confdeltype, con.condeferrable,
           con.condeferred`;

interface DatabaseForeignKey {
  name: string;
  table_name: string;
  columns: string[];
  foreign_table: string;
  foreign_columns: string[];
  delete_action: string;
  deferrable: boolean;
  initially_deferred: boolean;
}

function describeKey(key: {
  table: string;
  columns: string[];
  foreignTable: string;
  foreignColumns: string[];
  onDelete: string;
}): string {
  return `${key.table}(${key.columns.join(', ')}) -> ${key.foreignTable}(${key.foreignColumns.join(', ')}) on delete ${key.onDelete}`;
}

function schemaForeignKeys(): string[] {
  return (Object.values(schema) as unknown[])
    .filter((value): value is PgTable => is(value, PgTable))
    .flatMap((table) => {
      const config = getTableConfig(table);
      return config.foreignKeys.map((foreignKey) => {
        const reference = foreignKey.reference();
        return describeKey({
          table: config.name,
          columns: reference.columns.map((column) => column.name),
          foreignTable: getTableName(reference.foreignColumns[0]!.table),
          foreignColumns: reference.foreignColumns.map((column) => column.name),
          onDelete: foreignKey.onDelete ?? 'no action',
        });
      });
    })
    .sort();
}

async function databaseForeignKeys(): Promise<DatabaseForeignKey[]> {
  const { rows } = await testPool.query<DatabaseForeignKey>(DATABASE_FOREIGN_KEYS_SQL);
  return rows;
}

function describeDatabaseKey(key: DatabaseForeignKey): string {
  return describeKey({
    table: key.table_name,
    columns: key.columns,
    foreignTable: key.foreign_table,
    foreignColumns: key.foreign_columns,
    onDelete: DELETE_ACTIONS[key.delete_action] ?? `unknown (${key.delete_action})`,
  });
}

/** Constraint names `0004_deferred_fks.sql` adds by hand, outside the Drizzle schema. */
function rawSqlConstraintNames(): string[] {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const migration = readFileSync(
    path.join(here, '..', 'migrations', '0004_deferred_fks.sql'),
    'utf8',
  );
  return [...migration.matchAll(/ADD CONSTRAINT\s+(\w+)\s+FOREIGN KEY/gi)].map((m) => m[1]!).sort();
}

describe('foreign keys', () => {
  it('every foreign key the Drizzle schema declares exists in the migrated database with the same columns, target and delete action', async () => {
    const declared = schemaForeignKeys();
    const inDatabase = new Set((await databaseForeignKeys()).map(describeDatabaseKey));

    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((key) => !inDatabase.has(key))).toEqual([]);
  });

  it('the only database foreign keys the schema does not declare are the raw-SQL ones of 0004_deferred_fks.sql', async () => {
    const declared = new Set(schemaForeignKeys());
    const undeclared = (await databaseForeignKeys())
      .filter((key) => !declared.has(describeDatabaseKey(key)))
      .map((key) => key.name)
      .sort();

    expect(rawSqlConstraintNames().length).toBeGreaterThan(0);
    expect(undeclared).toEqual(rawSqlConstraintNames());
  });

  it('defers evidence_items.published_artifact_id to commit, so evidence.publish can write the artifact in the same transaction', async () => {
    const key = (await databaseForeignKeys()).find(
      (k) => k.table_name === 'evidence_items' && k.columns.join() === 'published_artifact_id',
    );

    expect(key).toMatchObject({
      foreign_table: 'evidence_artifacts',
      deferrable: true,
      initially_deferred: true,
    });
  });

  it('defers persona_links.review_id to commit and keeps on delete set null, so a persona and its link can be written before their review (U11 BR2.9)', async () => {
    const key = (await databaseForeignKeys()).find(
      (k) => k.table_name === 'persona_links' && k.columns.join() === 'review_id',
    );

    expect(key).toMatchObject({
      name: 'persona_links_review_id_reviews_id_fk',
      foreign_table: 'reviews',
      delete_action: 'n',
      deferrable: true,
      initially_deferred: true,
    });
  });
});
