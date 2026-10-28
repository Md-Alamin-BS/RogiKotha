// Cumulative smoke suite (04-handoff-and-validation.md §3.1) — T-009's
// first `apps/worker` smoke assertion. Kept infra-free (no compose stack
// needed, unlike `packages/database/src/queue/pg-boss-queue.int.test.ts`):
// one assertion that the outbox relay's whole point — an outbox event
// becomes the right job(s), and the event is marked processed — actually
// works end to end through `relayOnce`.
//
// CR-011 (BR6.4): the relay transaction moved to `@rogikotha/database`, so
// the in-memory double is now a `RelayStore`; the assertion is unchanged.
import type { EventOutcome, OutboxEventRow, RelayBatchOptions, RelayStore } from '@rogikotha/database';
import { describe, expect, it } from 'vitest';

import { relayOnce } from './handlers/outbox-relay.js';
import type { RelayQueue } from './handlers/outbox-relay.js';

class ListRelayStore implements RelayStore {
  readonly enqueued: { name: string; data: unknown }[] = [];
  readonly processed: string[] = [];
  constructor(private readonly rows: OutboxEventRow[]) {}

  relayBatch(opts: RelayBatchOptions): Promise<EventOutcome[]> {
    const outcomes = this.rows.slice(0, opts.limit).map((event): EventOutcome => {
      const plan = opts.plan(event);
      const jobs = plan.kind === 'jobs' ? plan.jobs : [];
      this.enqueued.push(...jobs.map((job) => ({ name: job.name, data: job.data })));
      this.processed.push(event.id);
      return {
        eventId: event.id,
        eventName: event.name,
        result: 'relayed',
        attempts: event.attempts,
        jobs: jobs.map((job) => ({ name: job.name, status: 'enqueued' })),
      };
    });
    return Promise.resolve(outcomes);
  }
}

const noopQueue: RelayQueue = { ensureQueue: () => Promise.resolve() };
const noopLogger = { info() {}, warn() {}, error() {} };

describe('worker smoke', () => {
  it('relays a review.published outbox event to search.refresh and notification.deliver', async () => {
    const store = new ListRelayStore([
      { id: 'evt-smoke-1', name: 'review.published', payload: { reviewId: 'r1' }, attempts: 0 },
    ]);

    await relayOnce({ store, queue: noopQueue, logger: noopLogger });

    expect(store.enqueued.map((j) => j.name).sort()).toEqual(['notification.deliver', 'search.refresh']);
    expect(store.processed).toEqual(['evt-smoke-1']);
  });
});
