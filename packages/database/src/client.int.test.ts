import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { withTx } from './client';
import { auditEvents } from './schema/index';
import { testDb } from './test-setup';

describe('withTx', () => {
  it('rolls back when the callback throws', async () => {
    const stream = 'account:withtx-rollback-test';
    await expect(
      withTx(testDb, async (tx) => {
        await tx.insert(auditEvents).values({
          stream,
          action: 'test_action',
          actor: 'system:test',
          details: {},
        });
        throw new Error('deliberate rollback');
      }),
    ).rejects.toThrow('deliberate rollback');

    const rows = await testDb
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.stream} = ${stream}`);
    expect(rows).toHaveLength(0);
  });
});
