// Cumulative smoke suite (04-handoff-and-validation.md §3.1) — T-009's
// first `apps/worker` smoke assertion. Kept infra-free (no compose stack
// needed, unlike `packages/database/src/queue/pg-boss-queue.int.test.ts`):
// one assertion that the outbox relay's whole point — an outbox event
// becomes the right job(s), and the event is marked processed — actually
// works end to end through `relayOnce`.
//
// CR-011 (BR6.4): the relay transaction moved to `@rogikotha/database`, so
// the in-memory double is now a `RelayStore`; the assertion is unchanged.
import type {
  EventOutcome,
  OutboxEventRow,
  RelayBatchOptions,
  RelayStore,
} from '@rogikotha/database';
import { describe, expect, it } from 'vitest';

import type { WorkerContainer } from './container.js';
import { buildEmailCatalog } from './email-catalog.js';
import { relayOnce } from './handlers/outbox-relay.js';
import type { RelayQueue } from './handlers/outbox-relay.js';
import { JOBS } from './registry.js';

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

    expect(store.enqueued.map((j) => j.name).sort()).toEqual([
      'notification.deliver',
      'search.refresh',
    ]);
    expect(store.processed).toEqual(['evt-smoke-1']);
  });

  // T-101: the worker's `mail.send` entry hands each job to the use case and has copy in both languages.
  it('registers mail.send, hands its delivery id over, and has the verification email in en and bn', async () => {
    const sent: unknown[] = [];
    const ctx = {
      logger: noopLogger,
      sendEmail: (job: unknown) => {
        sent.push(job);
        return Promise.resolve();
      },
    } as unknown as WorkerContainer;
    const catalog = buildEmailCatalog();

    await JOBS['mail.send']?.handler({ deliveryId: '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a01' }, ctx);

    expect(sent).toEqual([{ deliveryId: '0192d6a4-7c1e-7a3b-9f10-5d2c8e4b6a01' }]);
    expect(catalog.en['email.verify']?.body).toContain('{link}');
    expect(catalog.bn['email.verify']?.body).toContain('{link}');
  });
});
