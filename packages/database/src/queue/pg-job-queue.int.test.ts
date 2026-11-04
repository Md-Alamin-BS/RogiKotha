// The application `JobQueue` and `Outbox` ports over pg-boss and `outbox_events` (T-101 WF12,
// ISS-253): a job and an event written inside `PgUnitOfWork.run` commit or roll back with it.
import type { AppError } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PgOutbox } from '../repositories/outbox';
import { outboxEvents } from '../schema/index';
import { testDb } from '../test-setup';
import { PgUnitOfWork } from '../unit-of-work';
import { PgBossQueue } from './pg-boss-queue';
import { PgJobQueue } from './pg-job-queue';
import { jobsIn, silentLogger, uniqueName } from './queue-test-support';

const unitOfWork = new PgUnitOfWork(testDb);
const outbox = new PgOutbox();
const boss = new PgBossQueue(process.env.DATABASE_URL_TEST!, silentLogger, {
  supervise: false,
  schedule: false,
});
const jobQueue = new PgJobQueue(boss);

function refused(): AppError {
  return { code: 'forbidden', messageKey: 'errors.forbidden', correlationId: 'corr-1' };
}

async function eventsFor(accountId: string): Promise<number> {
  const rows = await testDb
    .select()
    .from(outboxEvents)
    .where(eq(outboxEvents.name, 'account.registered'));
  return rows.filter((row) => (row.payload as { accountId?: string }).accountId === accountId)
    .length;
}

beforeAll(async () => {
  await jobQueue.ensure('t101.job-queue.probe');
});

afterAll(async () => {
  await boss.stop({ graceful: false });
});

describe('PgJobQueue with PgUnitOfWork', () => {
  it('commits the job with the command that enqueued it', async () => {
    const name = uniqueName('t101.commit');
    await jobQueue.ensure(name);

    const result = await unitOfWork.run(async (tx) => {
      const enqueued = await jobQueue.enqueue(tx, name, { deliveryId: 'd-1' }, { key: 'k-1' });
      return enqueued.ok ? { ok: true, data: enqueued.data } : { ok: false, error: refused() };
    });

    expect(result).toEqual({ ok: true, data: 'enqueued' });
    expect(await jobsIn(name)).toMatchObject([
      { singleton_key: 'k-1', data: { deliveryId: 'd-1' } },
    ]);
  });

  it('leaves no job behind when the command rolls back', async () => {
    const name = uniqueName('t101.rollback');
    await jobQueue.ensure(name);

    await unitOfWork.run(async (tx) => {
      await jobQueue.enqueue(tx, name, { deliveryId: 'd-2' }, { key: 'k-2' });
      return { ok: false, error: refused() };
    });

    expect(await jobsIn(name)).toEqual([]);
  });

  it('answers deduplicated for a second job with the same key', async () => {
    const name = uniqueName('t101.dedupe');
    await jobQueue.ensure(name);
    const enqueueOnce = () =>
      unitOfWork.run(async (tx) => {
        const enqueued = await jobQueue.enqueue(tx, name, { deliveryId: 'd-3' }, { key: 'k-3' });
        return enqueued.ok ? { ok: true, data: enqueued.data } : { ok: false, error: refused() };
      });

    await enqueueOnce();
    const second = await enqueueOnce();

    expect(second).toEqual({ ok: true, data: 'deduplicated' });
    expect(await jobsIn(name)).toHaveLength(1);
  });
});

describe('PgOutbox as the application Outbox port', () => {
  it('commits an event appended on the command transaction, and drops it on rollback', async () => {
    const kept = `kept-${uniqueName('acct')}`;
    const dropped = `dropped-${uniqueName('acct')}`;

    await unitOfWork.run(async (tx) => {
      await outbox.append(tx, 'account.registered', { accountId: kept });
      return { ok: true, data: null };
    });
    await unitOfWork.run(async (tx) => {
      await outbox.append(tx, 'account.registered', { accountId: dropped });
      return { ok: false, error: refused() };
    });

    expect(await eventsFor(kept)).toBe(1);
    expect(await eventsFor(dropped)).toBe(0);
  });
});
