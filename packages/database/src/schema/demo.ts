// Demo support (02-data-model.md §15, dev/demo only). The `Clock` port adds
// `offset_seconds` in `APP_MODE=demo|development`; this table is guarded
// out of production start-up by an `APP_MODE` assertion (AD-14), not by a
// separate migrations set.
import { sql } from 'drizzle-orm';
import { bigint, check, pgTable, smallint, text, timestamp } from 'drizzle-orm/pg-core';

import { createdAt } from './_common';

export const demoClock = pgTable(
  'demo_clock',
  {
    id: smallint('id').primaryKey().default(1),
    // `mode: 'bigint'` with a plain JS `0n` default crashes drizzle-kit's
    // snapshot serializer (`TypeError: Do not know how to serialize a
    // BigInt`); a SQL-literal default avoids passing a JS BigInt through it.
    offsetSeconds: bigint('offset_seconds', { mode: 'bigint' })
      .notNull()
      .default(sql`0`),
    setBy: text('set_by'),
    // ISS-111 item (2): every table has `created_at` per 02-data-model.md's
    // header rule; missing here since T-004. `demo.ts` is outside T-005's
    // "Modify" owned paths, but this single-line fix was explicitly assigned
    // to this task by the coordinating session (see the hand-off).
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('demo_clock_single_row', sql`${t.id} = 1`)],
);
