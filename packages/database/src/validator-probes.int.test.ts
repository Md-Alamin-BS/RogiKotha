// Added by the T-005 **validator**, not by the implementer
// (`04-handoff-and-validation.md` §3.2: "A validator never fixes code. It may
// add test files under the task's test paths and must say so."). See
// `docs/validation/T-005.md`.
//
// Both probes assert the behaviour the specification requires. Neither holds
// today, so both are marked `it.fails` — the run stays green while the
// defect is open, and turns **red** the moment the defect is fixed, which is
// the signal to delete the `.fails` marker and keep the plain assertion.
// Do not "fix" a red result here by weakening the assertion: a red result
// means the ISS row below can be closed.
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { testDb, workerUrlForTestDb } from './test-setup';

describe('T-005 validator probes', () => {
  // ISS-139. `02-data-model.md` §16 lists `evidence_items.original_filename_enc`
  // among `rk_worker`'s **column-level revokes**; `0005_grants_part2.sql`
  // grants the whole table instead, so the worker can read the private
  // filename ciphertext column.
  it.fails('ISS-139: rk_worker cannot read evidence_items.original_filename_enc', async () => {
    const pool = new Pool({ connectionString: workerUrlForTestDb() });
    try {
      await expect(pool.query('select original_filename_enc from evidence_items limit 1')).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await pool.end();
    }
  });

  // ISS-141. `fn_block_mutation()`'s escape hatch keys off a plain
  // transaction-local GUC (`rk.audit_expiry`) that any role may set with
  // `set_config()`. `rk_app` holds DELETE on `audit_events` (it owns the
  // table), so the append-only invariant of `02-data-model.md` §10 is one
  // `set_config` call away from being bypassed by the web tier — contrary to
  // `0003_triggers.sql`'s own comment ("every other UPDATE/DELETE ... from
  // every role including the table owner, is still blocked unconditionally").
  it.fails('ISS-141: setting rk.audit_expiry does not let rk_app delete audit_events rows', async () => {
    await testDb.execute(
      sql`insert into audit_events (stream, action, actor, details) values ('validator:iss-141', 'probe', 'system:validator', '{}')`,
    );
    await expect(
      testDb.transaction(async (tx) => {
        await tx.execute(sql`select set_config('rk.audit_expiry', 'on', true)`);
        await tx.execute(sql`delete from audit_events where stream = 'validator:iss-141'`);
      }),
    ).rejects.toThrow(/append_only_violation/i);
  });
});
