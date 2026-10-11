// Cumulative smoke suite (04-handoff-and-validation.md §3.1) — T-009's
// first `apps/worker` smoke assertion. Kept infra-free (no compose stack
// needed, unlike `packages/database/src/queue/pg-boss-queue.int.test.ts`):
// one assertion that the outbox relay's whole point — an outbox event
// becomes the right job(s), and the batch is marked processed — actually
// works end to end through `relayOnce`, using the same in-memory doubles
// `outbox-relay.test.ts` uses.
import { describe, expect, it } from 'vitest';

import { relayOnce } from './handlers/outbox-relay.js';
import type { OutboxEventRow, OutboxSource, RelayQueue } from './handlers/outbox-relay.js';
import type { JobName } from './registry.js';

class ListOutboxSource implements OutboxSource {
  rows: OutboxEventRow[];
  readonly processed: string[] = [];
  constructor(rows: OutboxEventRow[]) {
    this.rows = rows;
  }
  claimBatch(limit: number): Promise<OutboxEventRow[]> {
    return Promise.resolve(this.rows.slice(0, limit));
  }
  markProcessed(ids: string[]): Promise<void> {
    this.processed.push(...ids);
    return Promise.resolve();
  }
  markFailed(): Promise<void> {
    return Promise.resolve();
  }
}

class ListQueue implements RelayQueue {
  readonly enqueued: { name: JobName; payload: unknown }[] = [];
  enqueue(name: JobName, payload: unknown): Promise<unknown> {
    this.enqueued.push({ name, payload });
    return Promise.resolve('id');
  }
}

const noopLogger = { info() {}, warn() {}, error() {} };

describe('worker smoke', () => {
  it('relays a review.published outbox event to search.refresh and notification.deliver', async () => {
    const outbox = new ListOutboxSource([
      { id: 'evt-smoke-1', name: 'review.published', payload: { reviewId: 'r1' }, attempts: 0 },
    ]);
    const queue = new ListQueue();

    await relayOnce({ outbox, queue, logger: noopLogger });

    expect(queue.enqueued.map((j) => j.name).sort()).toEqual(['notification.deliver', 'search.refresh']);
    expect(outbox.processed).toEqual(['evt-smoke-1']);
  });
});
