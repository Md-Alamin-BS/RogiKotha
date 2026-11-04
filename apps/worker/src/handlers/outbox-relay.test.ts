// CR-011 (BR6.4): the relay transaction moved to `@rogikotha/database`
// (`PgOutboxRelayStore`, proven against the real database there), so the
// T-009 tests below run against an in-memory `RelayStore` with the same
// contract: claim, plan, send, mark or record the attempt, then return the
// outcomes after "commit". Their assertions are kept; the key assertion now
// expects C15's `<job>:<eventId>` form (Question 4) instead of
// `<eventId>:<job>`.
import type {
  EventOutcome,
  OutboxEventRow,
  RelayBatchOptions,
  RelayStore,
} from '@rogikotha/database';
import { describe, expect, it } from 'vitest';

import {
  OUTBOX_EVENTS,
  RELAY,
  ensureRelayQueues,
  logOutcomes,
  planEvent,
  relayOnce,
  relayQueueNames,
} from './outbox-relay.js';
import type { RelayQueue } from './outbox-relay.js';

interface SentJob {
  name: string;
  key: string;
  data: unknown;
}

/** In-memory `RelayStore`: one array of rows, one array of committed jobs. */
class FakeRelayStore implements RelayStore {
  rows: OutboxEventRow[];
  readonly processedIds: string[] = [];
  /** Events whose attempt was recorded and that stay unprocessed for a retry. */
  readonly failedIds: string[] = [];
  readonly sent: SentJob[] = [];
  private readonly failNext = new Set<string>();
  private readonly deduplicate = new Set<string>();
  failBatch = false;

  constructor(rows: OutboxEventRow[]) {
    this.rows = rows;
  }

  failNextEnqueue(job: string): void {
    this.failNext.add(job);
  }

  /** The next send of `job` finds an in-flight job with its key, as the exclusive policy reports it. */
  deduplicateNext(job: string): void {
    this.deduplicate.add(job);
  }

  relayBatch(opts: RelayBatchOptions): Promise<EventOutcome[]> {
    if (this.failBatch) {
      return Promise.reject(new Error('connection lost'));
    }
    const outcomes = this.rows.slice(0, opts.limit).map((event) => this.relayEvent(event, opts));
    return Promise.resolve(outcomes);
  }

  private relayEvent(event: OutboxEventRow, opts: RelayBatchOptions): EventOutcome {
    const base = { eventId: event.id, eventName: event.name, attempts: event.attempts, jobs: [] };
    const plan = opts.plan(event);
    if (plan.kind === 'unmapped' || plan.jobs.length === 0) {
      this.markProcessed(event.id);
      return { ...base, result: plan.kind === 'unmapped' ? 'unmapped' : 'audit_only' };
    }
    const failed = plan.jobs.find((job) => this.failNext.has(job.name));
    if (failed !== undefined) {
      this.failNext.delete(failed.name);
      event.attempts += 1;
      const decision = opts.onFailure(event.attempts);
      if (decision === 'dead') {
        this.markProcessed(event.id);
      } else {
        this.failedIds.push(event.id);
      }
      return {
        ...base,
        attempts: event.attempts,
        result: decision,
        errorCode: 'enqueue_error',
        failedJob: failed.name,
      };
    }
    const jobs = plan.jobs.map((job) => {
      if (this.deduplicate.delete(job.name)) {
        return { name: job.name, status: 'deduplicated' as const };
      }
      this.sent.push({ name: job.name, key: job.key, data: job.data });
      return { name: job.name, status: 'enqueued' as const };
    });
    this.markProcessed(event.id);
    return { ...base, result: 'relayed', jobs };
  }

  private markProcessed(id: string): void {
    this.processedIds.push(id);
    this.rows = this.rows.filter((row) => row.id !== id);
  }
}

class FakeRelayQueue implements RelayQueue {
  readonly ensured: string[] = [];
  ensureQueue(name: string): Promise<void> {
    this.ensured.push(name);
    return Promise.resolve();
  }
}

class CollectingLogger {
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
  return {
    id: 'evt-1',
    name: 'review.published',
    payload: { reviewId: 'r1' },
    attempts: 0,
    ...overrides,
  };
}

function anOutcome(overrides: Partial<EventOutcome> = {}): EventOutcome {
  return {
    eventId: 'evt-1',
    eventName: 'doctor.changed',
    result: 'relayed',
    attempts: 0,
    jobs: [],
    ...overrides,
  };
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

  it('routes no account event to mail.send, because the command queues its own email (T-101 BR6.4)', () => {
    const accountRoutes = Object.entries(RELAY).filter(([name]) => name.startsWith('account.'));

    expect(accountRoutes.map(([name]) => name).sort()).toEqual([
      'account.registered',
      'account.securityEvent',
    ]);
    for (const [, jobs] of accountRoutes) {
      expect(jobs).not.toContain('mail.send');
    }
    expect(RELAY['account.securityEvent']).toEqual(['notification.deliver']);
  });
});

describe('relayOnce', () => {
  it('maps review.published to search.refresh and notification.deliver', async () => {
    const store = new FakeRelayStore([anEvent({ id: 'evt-1', name: 'review.published' })]);
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger });

    expect(store.sent.map((j) => j.name).sort()).toEqual([
      'notification.deliver',
      'search.refresh',
    ]);
    expect(store.processedIds).toEqual(['evt-1']);
  });

  it('unmapped events are marked processed and logged', async () => {
    const store = new FakeRelayStore([anEvent({ id: 'evt-2', name: 'nonsense.event' })]);
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger });

    expect(store.sent).toHaveLength(0);
    expect(store.processedIds).toEqual(['evt-2']);
    const unmapped = logger.entries.find((e) => e.event === 'outbox.unmapped');
    expect(unmapped).toBeDefined();
    expect(unmapped?.level).toBe('warn');
    expect(unmapped?.fields.eventId).toBe('evt-2');
  });

  it('a failing enqueue marks the event failed and retries next tick', async () => {
    const store = new FakeRelayStore([anEvent({ id: 'evt-3', name: 'doctor.changed' })]);
    store.failNextEnqueue('search.refresh');
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger });

    expect(store.failedIds).toEqual(['evt-3']);
    expect(store.processedIds).toEqual([]);
    expect(store.rows[0]?.attempts).toBe(1);

    // Next tick: the same event, now with attempts=1, is retried and
    // succeeds because `failNextEnqueue` only fails once.
    await relayOnce({ store, queue, logger });
    expect(store.sent.map((j) => j.name)).toEqual(['search.refresh']);
    expect(store.processedIds).toEqual(['evt-3']);
  });

  it('gives up after maxAttempts and logs outbox.dead instead of retrying forever', async () => {
    const store = new FakeRelayStore([
      anEvent({ id: 'evt-4', name: 'doctor.changed', attempts: 4 }),
    ]);
    store.failNextEnqueue('search.refresh');
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger, maxAttempts: 5 });

    expect(store.failedIds).toEqual([]);
    expect(store.processedIds).toEqual(['evt-4']);
    expect(logger.entries).toContainEqual(
      expect.objectContaining({ level: 'error', event: 'outbox.dead' }),
    );
  });

  // Rewritten (BR6.4): T-009 expected `evt-5:search.refresh`; C15 fixes `<job>:<eventId>`.
  it('singleton keys are stable across retries', async () => {
    const store = new FakeRelayStore([anEvent({ id: 'evt-5', name: 'doctor.changed' })]);
    store.failNextEnqueue('search.refresh');
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger }); // fails, attempt recorded
    await relayOnce({ store, queue, logger }); // retried, succeeds

    expect(store.sent).toHaveLength(1);
    expect(store.sent[0]?.key).toBe('search.refresh:evt-5');
  });

  it('does nothing when the batch is empty', async () => {
    const store = new FakeRelayStore([]);
    const queue = new FakeRelayQueue();
    const logger = new CollectingLogger();

    await relayOnce({ store, queue, logger });

    expect(store.sent).toHaveLength(0);
    expect(store.processedIds).toHaveLength(0);
    expect(logger.entries).toHaveLength(0);
  });
});

describe('CR-011 relay planning and logging', () => {
  it('W1: every route plans its jobs with the key <job>:<eventId> and the envelope, payload unchanged', () => {
    const payload = { reviewId: 'r1', nested: { kept: true } };
    for (const [name, jobs] of Object.entries(RELAY)) {
      const plan = planEvent(anEvent({ id: 'evt-w1', name, payload }));
      expect(plan).toEqual({
        kind: 'jobs',
        jobs: jobs.map((job) => ({
          name: job,
          key: `${job}:evt-w1`,
          data: { eventId: 'evt-w1', name, payload },
        })),
      });
    }
    expect(planEvent(anEvent({ name: 'nonsense.event' }))).toEqual({ kind: 'unmapped' });
  });

  it('W2: no route in RELAY can produce a planned job without a key', () => {
    for (const name of Object.keys(RELAY)) {
      const plan = planEvent(anEvent({ id: 'evt-w2', name }));
      expect(plan.kind).toBe('jobs');
      for (const job of plan.kind === 'jobs' ? plan.jobs : []) {
        expect(job.key.length, `${name} -> ${job.name}`).toBeGreaterThan(job.name.length + 1);
      }
    }
  });

  it('W3: outcomes are logged only after the batch commits, and a rolled-back batch logs none of them', async () => {
    const logger = new CollectingLogger();
    const queue = new FakeRelayQueue();
    let linesAtCommit = -1;
    const committing: RelayStore = {
      relayBatch: (opts) => {
        opts.plan(anEvent({ id: 'evt-w3', name: 'nonsense.event' }));
        linesAtCommit = logger.entries.length;
        return Promise.resolve([
          anOutcome({ eventId: 'evt-w3', eventName: 'nonsense.event', result: 'unmapped' }),
        ]);
      },
    };

    await relayOnce({ store: committing, queue, logger });
    expect(linesAtCommit).toBe(0);
    expect(logger.entries.map((e) => e.event)).toEqual(['outbox.unmapped']);

    const rolledBackLogger = new CollectingLogger();
    const rollingBack = new FakeRelayStore([anEvent({ id: 'evt-w3b', name: 'nonsense.event' })]);
    rollingBack.failBatch = true;
    await expect(
      relayOnce({ store: rollingBack, queue, logger: rolledBackLogger }),
    ).rejects.toThrow('connection lost');
    expect(rolledBackLogger.entries).toEqual([]);
  });

  it('W4: relay lines carry only the event name, event id, job, attempts and error code', () => {
    const logger = new CollectingLogger();
    logOutcomes(logger, [
      anOutcome({
        eventId: 'e-dead',
        result: 'dead',
        attempts: 5,
        errorCode: 'job_not_enqueued',
        failedJob: 'search.refresh',
      }),
      anOutcome({
        eventId: 'e-retry',
        result: 'retry',
        attempts: 2,
        errorCode: 'enqueue_error',
        failedJob: 'search.refresh',
      }),
      anOutcome({ eventId: 'e-unmapped', eventName: 'nonsense.event', result: 'unmapped' }),
      anOutcome({ eventId: 'e-dedup', jobs: [{ name: 'search.refresh', status: 'deduplicated' }] }),
      anOutcome({ eventId: 'e-audit', eventName: 'config.applied', result: 'audit_only' }),
    ]);

    expect(logger.entries.map((e) => [e.level, e.event])).toEqual([
      ['error', 'outbox.dead'],
      ['warn', 'outbox.relay_failed'],
      ['warn', 'outbox.unmapped'],
      ['info', 'outbox.job_deduplicated'],
    ]);
    const allowed = new Set(['eventName', 'eventId', 'job', 'attempts', 'errorCode']);
    for (const entry of logger.entries) {
      expect(
        Object.keys(entry.fields).filter((key) => !allowed.has(key)),
        entry.event,
      ).toEqual([]);
    }
    expect(logger.entries[0]?.fields).toEqual({
      eventName: 'doctor.changed',
      eventId: 'e-dead',
      job: 'search.refresh',
      attempts: 5,
      errorCode: 'job_not_enqueued',
    });
  });

  it('a de-duplicated job is logged once the batch committed, and the event still counts as relayed', async () => {
    const store = new FakeRelayStore([anEvent({ id: 'evt-dedup', name: 'doctor.changed' })]);
    store.deduplicateNext('search.refresh');
    const logger = new CollectingLogger();

    await relayOnce({ store, queue: new FakeRelayQueue(), logger });

    expect(store.processedIds).toEqual(['evt-dedup']);
    expect(logger.entries).toEqual([
      {
        level: 'info',
        event: 'outbox.job_deduplicated',
        fields: { eventName: 'doctor.changed', eventId: 'evt-dedup', job: 'search.refresh' },
      },
    ]);
  });

  it('W5: the queues ensured are exactly the distinct job names in RELAY', async () => {
    const distinct = [...new Set(Object.values(RELAY).flat())].sort();
    expect([...relayQueueNames()].sort()).toEqual(distinct);

    const queue = new FakeRelayQueue();
    await ensureRelayQueues(queue);
    expect([...queue.ensured].sort()).toEqual(distinct);
    expect(queue.ensured).toHaveLength(distinct.length);
  });

  it('every tick ensures the routed queues before it relays', async () => {
    const queue = new FakeRelayQueue();
    let ensuredBeforeBatch = 0;
    const store: RelayStore = {
      relayBatch: () => {
        ensuredBeforeBatch = queue.ensured.length;
        return Promise.resolve([]);
      },
    };

    await relayOnce({ store, queue, logger: new CollectingLogger() });

    expect(ensuredBeforeBatch).toBe(relayQueueNames().length);
  });
});
