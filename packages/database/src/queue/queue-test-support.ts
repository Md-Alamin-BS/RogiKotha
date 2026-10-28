// Shared by the CR-011 queue and relay tests in this folder. Every read and
// every queue removal runs as `rk_app` (`testPool`); the code under test runs
// as `rk_worker`.
import { randomUUID } from 'node:crypto';

import { testPool } from '../test-setup';
import type { PgBossQueue, QueueLogger } from './pg-boss-queue';

export const silentLogger: QueueLogger = { info() {}, warn() {}, error() {} };

export function uniqueName(prefix: string): string {
  return `${prefix}.${randomUUID()}`;
}

export interface JobRow {
  id: string;
  singleton_key: string | null;
  data: unknown;
  state: string;
  retry_limit: number;
}

export async function jobsIn(queue: string): Promise<JobRow[]> {
  const { rows } = await testPool.query<JobRow>(
    'select id, singleton_key, data, state, retry_limit from pgboss.job where name = $1 order by created_on',
    [queue],
  );
  return rows;
}

export async function storedPolicy(queue: string): Promise<string | null> {
  const { rows } = await testPool.query<{ policy: string }>('select policy from pgboss.queue where name = $1', [
    queue,
  ]);
  return rows[0]?.policy ?? null;
}

/** A queue created the way T-009 did, with pg-boss's default `standard` policy. */
export async function createStandardQueue(queue: string): Promise<void> {
  await testPool.query(`select pgboss.create_queue($1, '{"policy":"standard"}'::jsonb)`, [queue]);
}

/**
 * Leaves `queue` cached in this process's pg-boss while its row is gone, as
 * after a reset under a running worker: one send fills the cache, then the job
 * and the queue row are deleted behind it. pg-boss then answers a send with
 * `null` until its 60 s cache refresh.
 */
export async function removeQueueBehindCache(boss: PgBossQueue, queue: string): Promise<void> {
  await boss.enqueue(queue, {}, { key: uniqueName('warm-cache') });
  await removeQueueRow(queue);
}

/** Deletes the queue row (and its jobs) without telling the process, so its cache does not hold it. */
export async function removeQueueRow(queue: string): Promise<void> {
  await testPool.query('delete from pgboss.job where name = $1', [queue]);
  await testPool.query('delete from pgboss.queue where name = $1', [queue]);
}
