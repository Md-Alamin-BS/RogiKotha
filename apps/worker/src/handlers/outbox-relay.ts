// Outbox → job relay (task steps 6-7). Note on mechanism: the task's step 6
// calls `outbox.relay` "a self-rescheduling poller" and step 7 describes it
// as "every 2 s (setInterval guarded against overlap)". Those two hints
// point at different implementations (chaining itself through pg-boss's own
// queue vs. a plain JS timer); read together with `registry.ts`'s comment,
// this implementation takes the narrower, more testable option — a plain
// `setInterval` driven directly by `main.ts` (see `intervalMs` on its
// registry entry), not a pg-boss job. `relayOnce` below is the
// dependency-injected core so it can be unit-tested without pg-boss or a
// database (ASSUMPTION(T-009), logged as an `ISS-` row — see hand-off).
//
// CR-011 (FD-038): the relay transaction itself lives in
// `@rogikotha/database` (`PgOutboxRelayStore`); this module decides the
// routes, keys, job data and the retry-or-dead rule, and logs the outcomes
// once the batch committed.
import type {
  EventOutcome,
  EventPlan,
  OutboxEventRow,
  PlannedJob,
  RelayStore,
} from '@rogikotha/database';

import type { Logger } from '../logger.js';
import type { WorkerContainer } from '../container.js';
import type { JobName } from '../registry.js';

/** The slice of `PgBossQueue` the relay needs before each batch. */
export interface RelayQueue {
  ensureQueue(name: string): Promise<void>;
}

export interface RelayDeps {
  store: RelayStore;
  queue: RelayQueue;
  logger: Logger;
  batchSize?: number;
  /** Attempts (including the one that just failed) after which the relay
   * gives up on an event rather than retrying it forever — task step 7:
   * "stop after 5 attempts with `outbox.dead`". */
  maxAttempts?: number;
}

/**
 * The event → jobs map, copied from 03-routes-and-contracts.md §5. An event
 * name present here with an empty array (`config.applied`, `hold.changed`,
 * `retention.policyChanged`) is "audit only" per §5 — expected, not
 * unmapped. A name that is not a key at all is unmapped (see `planEvent`).
 *
 * ASSUMPTION(T-009): `dataRequest.created` fans out to both `data.export`
 * and `data.delete` — §5 lists them as alternatives ("data.export /
 * data.delete") depending on the request's `kind`, but neither the payload
 * shape nor a `JobQueue`/command layer exists yet (T-410) to branch on it.
 * Both are queued; T-410 either narrows this to one job by inspecting
 * `payload.kind`, or the two handlers become idempotent no-ops for a
 * request kind they don't own. Logged as an `ISS-` row.
 */
export const RELAY: Record<string, JobName[]> = {
  'account.registered': ['mail.send'],
  'account.securityEvent': ['notification.deliver', 'mail.send'],
  'review.published': ['search.refresh', 'notification.deliver'],
  'review.changed': ['search.refresh', 'notification.deliver'],
  'review.hidden': ['search.refresh', 'notification.deliver'],
  'review.restored': ['search.refresh', 'notification.deliver'],
  'review.deleted': ['search.refresh', 'notification.deliver'],
  'doctor.changed': ['search.refresh'],
  'facility.changed': ['search.refresh'],
  'term.changed': ['search.refresh'],
  'evidence.received': ['evidence.process'],
  'evidence.stateChanged': ['notification.deliver'],
  'comment.posted': ['notification.deliver'],
  'comment.changed': ['notification.deliver'],
  'report.filed': ['notification.deliver'],
  'case.decided': ['notification.deliver'],
  'appeal.decided': ['notification.deliver'],
  'config.applied': [],
  'hold.changed': [],
  'retention.policyChanged': [],
  'dataRequest.created': ['data.export', 'data.delete'],
};

/** Every event name §5 documents — the canonical source `RELAY`'s keys are
 * checked against (ISS-145: nothing used to tie `outbox_events.name` to the
 * catalogue, so a typo silently never fired a job). */
export const OUTBOX_EVENTS = Object.keys(RELAY) as readonly string[];

// ASSUMPTION(CR-011): batch size 50 and 5 relay attempts stay as T-009 set them.
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_ATTEMPTS = 5;

/** Every distinct job name a route names: the queues ensured at start and before each batch (BR1.12). */
export function relayQueueNames(routes: Record<string, JobName[]> = RELAY): JobName[] {
  return [...new Set(Object.values(routes).flat())];
}

/** Ensures every routed queue; already-ensured queues cost nothing. */
export async function ensureRelayQueues(
  queue: RelayQueue,
  routes: Record<string, JobName[]> = RELAY,
): Promise<void> {
  for (const name of relayQueueNames(routes)) {
    await queue.ensureQueue(name);
  }
}

/** C15 key (BR2.1). The exclusive queue policy refuses a second in-flight job
 * with it, and the relay transaction (FD-038) never re-sends a committed job. */
export function jobKey(job: JobName, eventId: string): string {
  return `${job}:${eventId}`;
}

/** What the relay does with one claimed event (BR2.1–BR2.3): the C15 envelope, payload unchanged. */
export function planEvent(
  event: OutboxEventRow,
  routes: Record<string, JobName[]> = RELAY,
): EventPlan {
  const jobs = routes[event.name];
  if (jobs === undefined) {
    return { kind: 'unmapped' };
  }
  const data = { eventId: event.id, name: event.name, payload: event.payload };
  return {
    kind: 'jobs',
    jobs: jobs.map((job): PlannedJob => ({ name: job, key: jobKey(job, event.id), data })),
  };
}

export function decideFailure(
  attempts: number,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
): 'retry' | 'dead' {
  return attempts >= maxAttempts ? 'dead' : 'retry';
}

/** One line per outcome that needs one; ids, names, counts and codes only (BR2.4). */
export function logOutcomes(logger: Logger, outcomes: EventOutcome[]): void {
  for (const outcome of outcomes) {
    const ids = { eventName: outcome.eventName, eventId: outcome.eventId };
    switch (outcome.result) {
      case 'unmapped':
        logger.warn('outbox.unmapped', ids);
        break;
      case 'retry':
        logger.warn('outbox.relay_failed', {
          ...ids,
          job: outcome.failedJob,
          attempts: outcome.attempts,
          errorCode: outcome.errorCode,
        });
        break;
      case 'dead':
        logger.error('outbox.dead', {
          ...ids,
          job: outcome.failedJob,
          attempts: outcome.attempts,
          errorCode: outcome.errorCode,
        });
        break;
      case 'relayed':
        for (const job of outcome.jobs) {
          if (job.status === 'deduplicated') {
            logger.info('outbox.job_deduplicated', { ...ids, job: job.name });
          }
        }
        break;
      case 'audit_only':
        break;
    }
  }
}

/** One relay tick: ensure the routed queues, relay one batch in one
 * transaction, then log its outcomes. A per-event enqueue failure is recorded
 * on that event only; a batch failure (connection, timeout, a missing queue)
 * rejects with nothing changed and nothing logged here, for the poller to report. */
export async function relayOnce(deps: RelayDeps): Promise<void> {
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  await ensureRelayQueues(deps.queue);
  const outcomes = await deps.store.relayBatch({
    limit: deps.batchSize ?? DEFAULT_BATCH_SIZE,
    plan: (event) => planEvent(event),
    onFailure: (attempts) => decideFailure(attempts, maxAttempts),
  });
  logOutcomes(deps.logger, outcomes);
}

/** Registry-shaped wrapper (`registry.ts`'s `JobDefinition.handler`) — the
 * payload argument is unused, the whole point of this handler is the tick
 * itself, not one job's data. */
export async function outboxRelayHandler(_payload: unknown, ctx: WorkerContainer): Promise<void> {
  await relayOnce({ store: ctx.relayStore, queue: ctx.queue, logger: ctx.logger });
}
