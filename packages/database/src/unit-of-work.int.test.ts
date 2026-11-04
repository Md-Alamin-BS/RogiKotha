// PgUnitOfWork against DATABASE_URL_TEST (T-101 BR7.11, functional-spec § 10.1): ok commits, a
// recorded error commits, any other error rolls back, a throw rolls back and is rethrown.
import type { HandlerResult, RecordedError, Tx as AppTx } from '@rogikotha/application';
import type { AppError } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { PgAuditWriter } from './audit-writer';
import { uniqueSuffix } from './repositories/account-test-support';
import { auditEvents } from './schema/index';
import { testDb } from './test-setup';
import { PgUnitOfWork } from './unit-of-work';

const unitOfWork = new PgUnitOfWork(testDb);
const writer = new PgAuditWriter();

function anError(): AppError {
  return { code: 'forbidden', messageKey: 'errors.forbidden', correlationId: 'corr-1' };
}

/** Writes one audit row on `tx` under a fresh stream and returns that stream. */
async function writeMarker(tx: AppTx): Promise<`account:${string}`> {
  const stream = `account:uow-${uniqueSuffix()}` as const;
  await writer.write(tx, { stream, action: 'uow_probe', actor: 'system', details: {} });
  return stream;
}

async function rowsIn(stream: string): Promise<number> {
  const rows = await testDb.select().from(auditEvents).where(eq(auditEvents.stream, stream));
  return rows.length;
}

describe('PgUnitOfWork.run', () => {
  it('commits an ok result and returns it unchanged', async () => {
    let stream = '';
    const result = await unitOfWork.run(async (tx) => {
      stream = await writeMarker(tx);
      return { ok: true, data: { done: 1 } };
    });

    expect(result).toEqual({ ok: true, data: { done: 1 } });
    expect(await rowsIn(stream)).toBe(1);
  });

  it('rolls back an error result and returns it unchanged', async () => {
    let stream = '';
    const error: HandlerResult<never> = { ok: false, error: anError() };
    const result = await unitOfWork.run(async (tx) => {
      stream = await writeMarker(tx);
      return error;
    });

    expect(result).toBe(error);
    expect(await rowsIn(stream)).toBe(0);
  });

  it('commits an error result marked recorded and returns it unchanged', async () => {
    let stream = '';
    const recorded: RecordedError = { ok: false, error: anError(), recorded: true };
    const result = await unitOfWork.run(async (tx) => {
      stream = await writeMarker(tx);
      return recorded;
    });

    expect(result).toBe(recorded);
    expect(await rowsIn(stream)).toBe(1);
  });

  it('rolls back and rethrows when the work throws', async () => {
    let stream = '';
    const failure = new Error('handler bug');

    await expect(
      unitOfWork.run(async (tx) => {
        stream = await writeMarker(tx);
        throw failure;
      }),
    ).rejects.toBe(failure);
    expect(await rowsIn(stream)).toBe(0);
  });
});

describe('PgUnitOfWork.read', () => {
  it('runs the work on the client and returns its value', async () => {
    let stream = '';
    const value = await unitOfWork.read(async (tx) => {
      stream = await writeMarker(tx);
      return 'read-result';
    });

    expect(value).toBe('read-result');
    // No transaction: the statement stands on its own.
    expect(await rowsIn(stream)).toBe(1);
  });
});
