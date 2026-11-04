// PgAuditWriter against DATABASE_URL_TEST: an allowlisted row is stored on the caller's
// transaction; a refused one writes nothing (BR8.2, ISS-108).
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { PgAuditWriter } from './audit-writer';
import { appTx, uniqueSuffix } from './repositories/account-test-support';
import { auditEvents } from './schema/index';
import { testDb } from './test-setup';

const writer = new PgAuditWriter();

function aStream(): `account:${string}` {
  return `account:audit-${uniqueSuffix()}`;
}

async function rowsIn(stream: string) {
  return testDb.select().from(auditEvents).where(eq(auditEvents.stream, stream));
}

describe('PgAuditWriter', () => {
  it('inserts an allowlisted row with nested details on the given transaction', async () => {
    const stream = aStream();
    await testDb.transaction(async (tx) => {
      await writer.write(appTx(tx), {
        stream,
        action: 'password_changed',
        actor: 'account:019a3f2e-7c1d-7b2a-9f00-1a2b3c4d5e6f',
        targetKind: 'profile',
        targetId: '019a3f2e-7c1d-7b2a-9f00-1a2b3c4d5e6f',
        details: { revoked: 2, change: { from: 'pending_verification', to: 'active' } },
      });
    });

    const rows = await rowsIn(stream);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'password_changed',
      actor: 'account:019a3f2e-7c1d-7b2a-9f00-1a2b3c4d5e6f',
      details: { revoked: 2, change: { from: 'pending_verification', to: 'active' } },
    });
  });

  it('writes nothing when a nested key names private data', async () => {
    const stream = aStream();

    await expect(
      writer.write(appTx(testDb), {
        stream,
        action: 'registered',
        actor: 'anonymous',
        details: { actor: { email: 'x' } },
      }),
    ).rejects.toThrow(/disallowed key/);
    expect(await rowsIn(stream)).toHaveLength(0);
  });

  it('writes nothing when the stream itself carries an email', async () => {
    await expect(
      writer.write(appTx(testDb), {
        stream: 'account:shirin.demo@example.test',
        action: 'registered',
        actor: 'anonymous',
        details: {},
      }),
    ).rejects.toThrow(/value at stream/);
    expect(await rowsIn('account:shirin.demo@example.test')).toHaveLength(0);
  });
});
