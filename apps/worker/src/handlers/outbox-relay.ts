// Outbox → job relay (task steps 6-7). Note on mechanism: the task's step 6
// calls `outbox.relay` "a self-rescheduling poller" and step 7 describes it
// as "every 2 s (setInterval guarded against overlap)". Those two hints
// point at different implementations (chaining itself through pg-boss's own
// queue vs. a plain JS timer); read together with `registry.ts`'s comment,
// this implementation takes the narrower, more testable option — a plain
// `setInterval` driven directly by `main.ts` (see `intervalMs` on its
// registry entry), not a pg-boss job. `relayOnce` below is the pure,
// dependency-injected core so it can be unit-tested without pg-boss or a
// database (ASSUMPTION(T-009), logged as an `ISS-` row — see hand-off).
import type { Logger } from '../logger.js';
import type { WorkerContainer } from '../container.js';
import type { JobName } from '../registry.js';

export interface OutboxEventRow {
  id: string;
  name: string;
  payload: unknown;
  attempts: number;
}

/** The slice of `PgOutbox` (packages/database/src/repositories/outbox.ts)
 * the relay needs, with `db` already closed over by whoever builds this
 * (see `container.ts`) — kept as a narrow interface so tests can supply an
 * in-memory double instead of a real `Db`. */
export interface OutboxSource {
  claimBatch(limit: number): Promise<OutboxEventRow[]>;
  markProcessed(ids: string[]): Promise<void>;
  markFailed(id: string): Promise<void>;
}

export interface RelayQueue {
  enqueue(name: JobName, payload: unknown, opts?: { key?: string }): Promise<unknown>;
}

export interface RelayDeps {
  outbox: OutboxSource;
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
 * unmapped. A name that is not a key at all is unmapped (see `relayOnce`).
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

/** One relay tick: claim a batch, enqueue the mapped jobs for each event,
 * mark the batch processed. Never throws — a per-event enqueue failure is
 * recorded on that event only, so one bad event never blocks the rest of
 * the batch or the next tick. */
export async function relayOnce(deps: RelayDeps): Promise<void> {
  const { outbox, queue, logger } = deps;
  const batchSize = deps.batchSize ?? 50;
  const maxAttempts = deps.maxAttempts ?? 5;

  const events = await outbox.claimBatch(batchSize);
  if (events.length === 0) {
    return;
  }

  const processedIds: string[] = [];

  for (const event of events) {
    const jobs = RELAY[event.name];
    if (jobs === undefined) {
      logger.warn('outbox.unmapped', { eventName: event.name, eventId: event.id });
      processedIds.push(event.id);
      continue;
    }
    try {
      for (const job of jobs) {
        // Deterministic per (event, job) pair, so a retry after `markFailed`
        // enqueues under the same `singletonKey` — never a duplicate job.
        await queue.enqueue(job, event.payload, { key: `${event.id}:${job}` });
      }
      processedIds.push(event.id);
    } catch (err) {
      const attempts = event.attempts + 1;
      if (attempts >= maxAttempts) {
        logger.error('outbox.dead', {
          eventName: event.name,
          eventId: event.id,
          attempts,
          message: err instanceof Error ? err.message : String(err),
        });
        // Give up rather than retry forever — never blocks the queue.
        processedIds.push(event.id);
      } else {
        logger.warn('outbox.relay_failed', {
          eventName: event.name,
          eventId: event.id,
          attempts,
          message: err instanceof Error ? err.message : String(err),
        });
        await outbox.markFailed(event.id);
      }
    }
  }

  if (processedIds.length > 0) {
    await outbox.markProcessed(processedIds);
  }
}

/** Registry-shaped wrapper (`registry.ts`'s `JobDefinition.handler`) — the
 * payload argument is unused, the whole point of this handler is the tick
 * itself, not one job's data. */
export async function outboxRelayHandler(_payload: unknown, ctx: WorkerContainer): Promise<void> {
  await relayOnce({ outbox: ctx.outboxSource, queue: ctx.queue, logger: ctx.logger });
}
