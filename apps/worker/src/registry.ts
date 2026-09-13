// Job registry (task step 6). Later tasks add one entry here plus a file
// under `handlers/` — nothing else in `main.ts` needs to change.
import type { WorkOptions } from '@rogikotha/database';

import { outboxRelayHandler } from './handlers/outbox-relay.js';
import type { WorkerContainer } from './container.js';

/** From 03-routes-and-contracts.md §5's job list. Not every name has a
 * handler yet — `evidence.process` (T-304), `search.refresh` (T-205),
 * `notification.deliver`/`mail.send` (T-405/T-101), `retention.expire`
 * (T-309) and `data.export`/`data.delete` (T-410) are registered by their
 * owning task; T-009 seeds only `outbox.relay`. */
export type JobName =
  | 'outbox.relay'
  | 'evidence.process'
  | 'search.refresh'
  | 'notification.deliver'
  | 'mail.send'
  | 'retention.expire'
  | 'data.export'
  | 'data.delete';

export interface JobDefinition {
  handler: (payload: unknown, ctx: WorkerContainer) => Promise<void>;
  opts?: WorkOptions;
  cron?: string;
  /** Set only for a self-polling handler that is not driven through
   * pg-boss's own queue (see `handlers/outbox-relay.ts`'s header comment for
   * why `outbox.relay` is one of these) — `main.ts` runs it on a plain
   * `setInterval` instead of `queue.work()`. */
  intervalMs?: number;
}

// `Record<JobName, JobDefinition>` would require every job name to have an
// entry; T-009 seeds only `outbox.relay`, so this is a `Partial` on purpose
// — later tasks narrow their own key as they add it, `main.ts` iterates
// whatever is present.
export const JOBS: Partial<Record<JobName, JobDefinition>> = {
  'outbox.relay': { handler: outboxRelayHandler, intervalMs: 2000 },
};
