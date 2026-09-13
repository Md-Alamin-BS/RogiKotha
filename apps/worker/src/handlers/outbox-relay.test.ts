import { describe, expect, it } from 'vitest';

import { OUTBOX_EVENTS, RELAY, relayOnce } from './outbox-relay.js';
import type { OutboxEventRow, OutboxSource, RelayQueue } from './outbox-relay.js';
import type { JobName } from '../registry.js';

/** In-memory `OutboxSource` — a local double rather than
 * `test-support`'s `ListOutbox` fake, which only implements `append` (the
 * `Outbox` port shape), not `claimBatch`/`markProcessed`/`markFailed` (the
 * repository shape the relay actually reads through) — see the hand-off's
 * "Not done and why" for why this stays local instead of widening a fake
 * outside this task's owned paths. */
class FakeOutboxSource implements OutboxSource {
  rows: OutboxEventRow[];
  readonly processedIds: string[] = [];
  readonly failedIds: string[] = [];

  constructor(rows: OutboxEventRow[]) {
    this.rows = rows;
  }

  claimBatch(limit: number): Promise<OutboxEventRow[]> {
    const claimed = this.rows.slice(0, limit);
    return Promise.resolve(claimed);
  }

  markProcessed(ids: string[]): Promise<void> {
    this.processedIds.push(...ids);
    this.rows = this.rows.filter((r) => !ids.includes(r.id));
    return Promise.resolve();
  }

  markFailed(id: string): Promise<void> {
    this.failedIds.push(id);
    const row = this.rows.find((r) => r.id === id);
    if (row) {
      row.attempts += 1;
    }
    return Promise.resolve();
  }
}

interface EnqueuedJob {
  name: JobName;
  payload: unknown;
  key: string | undefined;
}

class FakeRelayQueue implements RelayQueue {
  readonly enqueued: EnqueuedJob[] = [];
  private failNext: Set<JobName> = new Set();

  failNextEnqueue(name: JobName): void {
    this.failNext.add(name);
  }

  enqueue(name: JobName, payload: unknown, opts?: { key?: string }): Promise<unknown> {
    if (this.failNext.has(name)) {
      this.failNext.delete(name);
      return Promise.reject(new Error(`enqueue failed for ${name}`));
    }
    this.enqueued.push({ name, payload, key: opts?.key });
    return Promise.resolve('job-id');
  }
}

class NoopLogger {
  readonly entries: { level: string; event: string; fields: Record<string, unknown> }[] = [];
  info(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'info', event, fields });
  }
  warn(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'warn', event, fields });
  }
  error(event: string, fields: Record<string, unknown> = {}): void {
    this.entries.push({ level: 'error', event, fields });
  }
}

function anEvent(overrides: Partial<OutboxEventRow> = {}): OutboxEventRow {
  return { id: 'evt-1', name: 'review.published', payload: { reviewId: 'r1' }, attempts: 0, ...overrides };
}

describe('RELAY / OUTBOX_EVENTS (ISS-145)', () => {
  it('every RELAY key is one of the canonical §5 event names', () => {
    for (const name of Object.keys(RELAY)) {
      expect(OUTBOX_EVENTS).toContain(name);
    }
  });

  it('has no duplicate event names', () => {
    expect(new Set(OUTBOX_EVENTS).size).toBe(OUTBOX_EVENTS.length);
  });

  it('a typo in an event name is not silently accepted', () => {
    // `review.publish` (missing the "ed") is not a real event — proves a
    // typo'd RELAY key would fail this same assertion the moment it were
    // added, rather than silently never firing a job.
    expect(OUTBOX_EVENTS).not.toContain('review.publish');
  });
});

describe('relayOnce', () => {
  it('maps review.published to search.refresh and notification.deliver', async () => {
    const outbox = new FakeOutboxSource([anEvent({ id: 'evt-1', name: 'review.published' })]);
    const queue = new FakeRelayQueue();
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger });

    expect(queue.enqueued.map((j) => j.name).sort()).toEqual(['notification.deliver', 'search.refresh']);
    expect(outbox.processedIds).toEqual(['evt-1']);
  });

  it('unmapped events are marked processed and logged', async () => {
    const outbox = new FakeOutboxSource([anEvent({ id: 'evt-2', name: 'nonsense.event' })]);
    const queue = new FakeRelayQueue();
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger });

    expect(queue.enqueued).toHaveLength(0);
    expect(outbox.processedIds).toEqual(['evt-2']);
    const unmapped = logger.entries.find((e) => e.event === 'outbox.unmapped');
    expect(unmapped).toBeDefined();
    expect(unmapped?.level).toBe('warn');
    expect(unmapped?.fields.eventId).toBe('evt-2');
  });

  it('a failing enqueue marks the event failed and retries next tick', async () => {
    const outbox = new FakeOutboxSource([anEvent({ id: 'evt-3', name: 'doctor.changed' })]);
    const queue = new FakeRelayQueue();
    queue.failNextEnqueue('search.refresh');
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger });

    expect(outbox.failedIds).toEqual(['evt-3']);
    expect(outbox.processedIds).toEqual([]);
    expect(outbox.rows[0]?.attempts).toBe(1);

    // Next tick: the same event, now with attempts=1, is retried and
    // succeeds because `failNextEnqueue` only fails once.
    await relayOnce({ outbox, queue, logger });
    expect(queue.enqueued.map((j) => j.name)).toEqual(['search.refresh']);
    expect(outbox.processedIds).toEqual(['evt-3']);
  });

  it('gives up after maxAttempts and logs outbox.dead instead of retrying forever', async () => {
    const outbox = new FakeOutboxSource([anEvent({ id: 'evt-4', name: 'doctor.changed', attempts: 4 })]);
    const queue = new FakeRelayQueue();
    queue.failNextEnqueue('search.refresh');
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger, maxAttempts: 5 });

    expect(outbox.failedIds).toEqual([]);
    expect(outbox.processedIds).toEqual(['evt-4']);
    expect(logger.entries).toContainEqual(expect.objectContaining({ level: 'error', event: 'outbox.dead' }));
  });

  it('singleton keys are stable across retries', async () => {
    const outbox = new FakeOutboxSource([anEvent({ id: 'evt-5', name: 'doctor.changed' })]);
    const queue = new FakeRelayQueue();
    queue.failNextEnqueue('search.refresh');
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger }); // fails, markFailed
    await relayOnce({ outbox, queue, logger }); // retried, succeeds

    expect(queue.enqueued).toHaveLength(1);
    expect(queue.enqueued[0]?.key).toBe('evt-5:search.refresh');
  });

  it('does nothing when the batch is empty', async () => {
    const outbox = new FakeOutboxSource([]);
    const queue = new FakeRelayQueue();
    const logger = new NoopLogger();

    await relayOnce({ outbox, queue, logger });

    expect(queue.enqueued).toHaveLength(0);
    expect(outbox.processedIds).toHaveLength(0);
  });
});
