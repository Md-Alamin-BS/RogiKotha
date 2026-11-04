// `PgJobQueue` without a database: pg-boss is started once, and a job is only ever sent on the
// command's own connection. The int test proves the commit and rollback against PostgreSQL.
import type { Tx as AppTx } from '@rogikotha/application';
import { describe, expect, it, vi } from 'vitest';

import type { PgBossQueue } from './pg-boss-queue';
import { PgJobQueue, sqlExecutorOf } from './pg-job-queue';

function aBossQueue(start: () => Promise<void> = () => Promise.resolve()) {
  return {
    start: vi.fn(start),
    ensureQueue: vi.fn(() => Promise.resolve()),
    enqueue: vi.fn(() => Promise.resolve({ ok: true as const, data: 'enqueued' as const })),
  };
}

function aTransactionOn(query: (text: string) => Promise<{ rows: unknown[] }>): AppTx {
  return { session: { client: { query } } } as unknown as AppTx;
}

describe('PgJobQueue', () => {
  it('starts pg-boss once however many queues are ensured', async () => {
    const boss = aBossQueue();
    const queue = new PgJobQueue(boss as unknown as PgBossQueue);

    await queue.ensure('mail.send');
    await queue.ensure('other.job');

    expect(boss.start).toHaveBeenCalledTimes(1);
    expect(boss.ensureQueue).toHaveBeenCalledWith('other.job');
  });

  it('tries the start again after a failed one', async () => {
    const boss = aBossQueue();
    boss.start.mockRejectedValueOnce(new Error('database not reachable'));
    const queue = new PgJobQueue(boss as unknown as PgBossQueue);

    await expect(queue.ensure('mail.send')).rejects.toThrow('database not reachable');
    await queue.ensure('mail.send');

    expect(boss.start).toHaveBeenCalledTimes(2);
  });

  it("sends the job with its key on the transaction's own connection", async () => {
    const query = vi.fn(() => Promise.resolve({ rows: [{ one: 1 }] }));
    const boss = aBossQueue();
    const queue = new PgJobQueue(boss as unknown as PgBossQueue);

    const result = await queue.enqueue(
      aTransactionOn(query),
      'mail.send',
      { deliveryId: 'd-1' },
      { key: 'mail.send:d-1' },
    );
    const [, , opts] = boss.enqueue.mock.calls[0] as unknown as [
      string,
      unknown,
      { key: string; executor: { executeSql: (t: string) => Promise<unknown> } },
    ];
    await opts.executor.executeSql('select 1');

    expect(result).toEqual({ ok: true, data: 'enqueued' });
    expect(opts.key).toBe('mail.send:d-1');
    expect(query).toHaveBeenCalledWith('select 1', undefined);
  });
});

describe('sqlExecutorOf', () => {
  it('refuses a transaction that exposes no node-postgres client', () => {
    expect(() => sqlExecutorOf({} as unknown as AppTx)).toThrow('no node-postgres client');
  });
});
