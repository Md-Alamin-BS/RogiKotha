// CR-011 functional-spec.md § 11.2: T6–T12 and the design review's T17, for
// the relay transaction (FD-038). The store and the queue connect as
// `rk_worker`, the real worker's role. A batch also claims rows other files
// left unprocessed, so `beforeEach` drains them first and every assertion is
// about this test's own events and queues.
import { performance } from 'node:perf_hooks';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { testPool, workerUrlForTestDb } from '../test-setup';
import { PgOutboxRelayStore } from './outbox-relay-store';
import type { EventOutcome, EventPlan, OutboxEventRow, PlannedJob } from './outbox-relay-store';
import { PgBossQueue, QueueMissingError } from './pg-boss-queue';
import {
  jobsIn,
  removeQueueBehindCache,
  removeQueueRow,
  silentLogger,
  uniqueName,
} from './queue-test-support';

interface StoredEvent {
  processed_at: Date | null;
  attempts: number;
}

const MAX_ATTEMPTS = 5;
const onFailure = (attempts: number): 'retry' | 'dead' =>
  attempts >= MAX_ATTEMPTS ? 'dead' : 'retry';

/** Appends events as `rk_app`, the way a module's own transaction would. */
async function appendEvents(count: number, attempts = 0): Promise<string[]> {
  const name = uniqueName('cr011.event');
  const { rows } = await testPool.query<{ id: string }>(
    `insert into outbox_events (name, payload, attempts)
     select $1, jsonb_build_object('n', n), $2 from generate_series(1, $3::int) as n
     returning id`,
    [name, attempts, count],
  );
  return rows.map((row) => row.id);
}

async function storedEvent(id: string): Promise<StoredEvent> {
  const { rows } = await testPool.query<StoredEvent>(
    'select processed_at, attempts from outbox_events where id = $1',
    [id],
  );
  return rows[0]!;
}

/** The worker's key rule and envelope (BR2.1, BR2.3), for the queues a test names. */
function jobsFor(event: OutboxEventRow, queues: string[]): PlannedJob[] {
  const data = { eventId: event.id, name: event.name, payload: event.payload };
  return queues.map((queue) => ({ name: queue, key: `${queue}:${event.id}`, data }));
}

/** Routes the given event ids to their queues; any other row is unmapped. */
function planFrom(routes: Map<string, string[]>): (event: OutboxEventRow) => EventPlan {
  return (event) => {
    const queues = routes.get(event.id);
    return queues === undefined
      ? { kind: 'unmapped' }
      : { kind: 'jobs', jobs: jobsFor(event, queues) };
  };
}

function outcomeFor(outcomes: EventOutcome[], id: string): EventOutcome | undefined {
  return outcomes.find((outcome) => outcome.eventId === id);
}

describe('CR-011 PgOutboxRelayStore (rk_worker)', () => {
  const queue = new PgBossQueue(workerUrlForTestDb(), silentLogger);
  const workerPool = new Pool({ connectionString: workerUrlForTestDb() });
  const store = new PgOutboxRelayStore(workerPool, queue);

  beforeAll(async () => {
    await queue.start();
  });

  afterAll(async () => {
    await queue.stop({ graceful: false });
    await workerPool.end();
  });

  beforeEach(async () => {
    const drainAll = { limit: 500, plan: (): EventPlan => ({ kind: 'unmapped' }), onFailure };
    while ((await store.relayBatch(drainAll)).length > 0) {
      // Keep draining until no unprocessed row is left.
    }
  });

  it('T6: a committed batch marks each event processed and leaves one job per routed job, keyed <job>:<eventId> with the envelope as data', async () => {
    const first = uniqueName('cr011.t6.first');
    const second = uniqueName('cr011.t6.second');
    await queue.ensureQueue(first);
    await queue.ensureQueue(second);
    const ids = await appendEvents(50);
    const routes = new Map(ids.map((id) => [id, [first, second]]));

    const started = performance.now();
    const outcomes = await store.relayBatch({ limit: 50, plan: planFrom(routes), onFailure });
    const elapsedMs = performance.now() - started;

    expect(outcomes.filter((outcome) => outcome.result === 'relayed')).toHaveLength(50);
    for (const id of ids) {
      expect((await storedEvent(id)).processed_at).not.toBeNull();
    }
    for (const queueName of [first, second]) {
      const jobs = await jobsIn(queueName);
      expect(jobs.map((job) => job.singleton_key).sort()).toEqual(
        ids.map((id) => `${queueName}:${id}`).sort(),
      );
    }
    const [job] = (await jobsIn(first)).filter((row) => row.singleton_key === `${first}:${ids[0]}`);
    const [stored] = (
      await testPool.query<{ name: string; payload: unknown }>(
        'select name, payload from outbox_events where id = $1',
        [ids[0]],
      )
    ).rows;
    expect(job?.data).toEqual({ eventId: ids[0], name: stored?.name, payload: stored?.payload });
    // 50 events, 100 jobs: far inside the 5 s statement timeout (functional-spec.md § 15).
    expect(elapsedMs).toBeLessThan(5_000);
    console.warn(
      `CR-011 relay batch timing: 50 events, 100 jobs committed in ${Math.round(elapsedMs)} ms`,
    );
  }, 30_000);

  it('T7: an event set back to unprocessed while its job is still queued is relayed again without a second job', async () => {
    const target = uniqueName('cr011.t7');
    await queue.ensureQueue(target);
    const [id] = await appendEvents(1);
    const plan = planFrom(new Map([[id!, [target]]]));

    await store.relayBatch({ limit: 50, plan, onFailure });
    await testPool.query('update outbox_events set processed_at = null where id = $1', [id]);
    const again = await store.relayBatch({ limit: 50, plan, onFailure });

    expect(outcomeFor(again, id!)).toMatchObject({
      result: 'relayed',
      jobs: [{ name: target, status: 'deduplicated' }],
    });
    expect(await jobsIn(target)).toHaveLength(1);
    expect((await storedEvent(id!)).processed_at).not.toBeNull();
  });

  it('T8: when the second job of a two-job event fails, that event keeps no job and one more attempt while the rest of the batch commits', async () => {
    const shared = uniqueName('cr011.t8.shared');
    const failing = uniqueName('cr011.t8.failing');
    await queue.ensureQueue(shared);
    await removeQueueBehindCache(queue, failing);
    const [failingEvent, ...others] = await appendEvents(3);
    const routes = new Map<string, string[]>([[failingEvent!, [shared, failing]]]);
    for (const id of others) {
      routes.set(id, [shared]);
    }

    const outcomes = await store.relayBatch({ limit: 50, plan: planFrom(routes), onFailure });

    expect(outcomeFor(outcomes, failingEvent!)).toMatchObject({
      result: 'retry',
      attempts: 1,
      errorCode: 'job_not_enqueued',
      failedJob: failing,
    });
    expect(await storedEvent(failingEvent!)).toEqual({ processed_at: null, attempts: 1 });
    const sharedKeys = (await jobsIn(shared)).map((job) => job.singleton_key);
    expect(sharedKeys).not.toContain(`${shared}:${failingEvent}`);
    expect(sharedKeys.sort()).toEqual(others.map((id) => `${shared}:${id}`).sort());
    for (const id of others) {
      expect((await storedEvent(id)).processed_at).not.toBeNull();
    }
  });

  it('T9: an event that fails its fifth attempt is marked processed with no job and reported dead', async () => {
    const failing = uniqueName('cr011.t9');
    await removeQueueBehindCache(queue, failing);
    const [id] = await appendEvents(1, MAX_ATTEMPTS - 1);

    const outcomes = await store.relayBatch({
      limit: 50,
      plan: planFrom(new Map([[id!, [failing]]])),
      onFailure,
    });

    expect(outcomeFor(outcomes, id!)).toMatchObject({
      result: 'dead',
      attempts: MAX_ATTEMPTS,
      errorCode: 'job_not_enqueued',
    });
    const stored = await storedEvent(id!);
    expect(stored.processed_at).not.toBeNull();
    expect(stored.attempts).toBe(MAX_ATTEMPTS);
    expect(await jobsIn(failing)).toHaveLength(0);
  });

  it('T10: an unmapped event and an audit-only event are marked processed with no job', async () => {
    const [unmapped, auditOnly] = await appendEvents(2);
    const plan = (event: OutboxEventRow): EventPlan =>
      event.id === auditOnly ? { kind: 'jobs', jobs: [] } : { kind: 'unmapped' };

    const outcomes = await store.relayBatch({ limit: 50, plan, onFailure });

    expect(outcomeFor(outcomes, unmapped!)).toMatchObject({ result: 'unmapped', jobs: [] });
    expect(outcomeFor(outcomes, auditOnly!)).toMatchObject({ result: 'audit_only', jobs: [] });
    expect((await storedEvent(unmapped!)).processed_at).not.toBeNull();
    expect((await storedEvent(auditOnly!)).processed_at).not.toBeNull();
  });

  it('T11: a batch that fails outside an event savepoint changes no event and leaves no job', async () => {
    const target = uniqueName('cr011.t11');
    await queue.ensureQueue(target);
    const [relayable, broken] = await appendEvents(2);
    const plan = (event: OutboxEventRow): EventPlan => {
      if (event.id === broken) {
        throw new Error('planning failed');
      }
      return { kind: 'jobs', jobs: jobsFor(event, [target]) };
    };

    await expect(store.relayBatch({ limit: 50, plan, onFailure })).rejects.toThrow(
      'planning failed',
    );

    expect(await storedEvent(relayable!)).toEqual({ processed_at: null, attempts: 0 });
    expect(await storedEvent(broken!)).toEqual({ processed_at: null, attempts: 0 });
    expect(await jobsIn(target)).toHaveLength(0);
  });

  it('T12: two batches started at the same time never claim the same event, and each event gets one job', async () => {
    const target = uniqueName('cr011.t12');
    await queue.ensureQueue(target);
    const ids = await appendEvents(20);
    const plan = planFrom(new Map(ids.map((id) => [id, [target]])));

    const [left, right] = await Promise.all([
      store.relayBatch({ limit: 10, plan, onFailure }),
      store.relayBatch({ limit: 10, plan, onFailure }),
    ]);

    const leftIds = left.map((outcome) => outcome.eventId);
    const rightIds = right.map((outcome) => outcome.eventId);
    expect(leftIds.filter((id) => rightIds.includes(id))).toEqual([]);
    expect([...leftIds, ...rightIds].sort()).toEqual([...ids].sort());
    expect((await jobsIn(target)).map((job) => job.singleton_key).sort()).toEqual(
      ids.map((id) => `${target}:${id}`).sort(),
    );
  });

  it('T17: a send that throws because the queue was dropped leaves the event unprocessed with no attempt counted, and the next batch relays it', async () => {
    const target = uniqueName('cr011.t17');
    await queue.ensureQueue(target);
    // Gone from both the database and pg-boss's cache, as after the 60 s cache refresh.
    await removeQueueRow(target);
    const [id] = await appendEvents(1);
    const plan = planFrom(new Map([[id!, [target]]]));

    await expect(store.relayBatch({ limit: 50, plan, onFailure })).rejects.toBeInstanceOf(
      QueueMissingError,
    );
    expect(await storedEvent(id!)).toEqual({ processed_at: null, attempts: 0 });

    // What the worker does before every batch: the cleared ensured mark makes this re-create the queue.
    await queue.ensureQueue(target);
    const outcomes = await store.relayBatch({ limit: 50, plan, onFailure });

    expect(outcomeFor(outcomes, id!)).toMatchObject({ result: 'relayed', attempts: 0 });
    expect((await jobsIn(target)).map((job) => job.singleton_key)).toEqual([`${target}:${id}`]);
  });
});
