// Queue declaration (CR-011, BR3.1, BR3.8): one table, read by every process
// that creates a queue or sends a job, so a queue gets the same policy
// whichever process creates it first.

/** The pg-boss policies a job may declare. `stately` is for a job that
 * coalesces by an entity key (BR3.4); `standard` only by a recorded decision
 * of the job's owner. */
export type DeclaredQueuePolicy = 'exclusive' | 'stately' | 'standard';

export interface QueueDeclarationEntry {
  policy: DeclaredQueuePolicy;
  retryLimit: number;
  retryBackoff: boolean;
  retryDelaySeconds: number;
  expireInSeconds: number;
}

// FD-076: 5 retries with exponential backoff.
export const DEFAULT_QUEUE_DECLARATION: QueueDeclarationEntry = Object.freeze({
  policy: 'exclusive',
  retryLimit: 5,
  retryBackoff: true,
  retryDelaySeconds: 10,
  expireInSeconds: 300,
});

/** Every job of C15. Under `exclusive` a queue holds at most one queued,
 * retrying or active job per key, and a send without a key counts as the
 * empty key, so a producer that needs concurrent jobs gives each its own key
 * (BR3.2, BR3.3). */
export const QUEUE_DECLARATION: Readonly<Record<string, QueueDeclarationEntry>> = Object.freeze({
  // U48 (BR4.6): 300 s only catches a hung or crashed worker; the handler's own 120 s budget and
  // the 15 s scan timeout bound a live attempt. Written out so a stored queue needs no change.
  'evidence.process': Object.freeze({
    ...DEFAULT_QUEUE_DECLARATION,
    retryLimit: 3,
    expireInSeconds: 300,
  }),
  'evidence.sweep': DEFAULT_QUEUE_DECLARATION,
  'search.refresh': DEFAULT_QUEUE_DECLARATION,
  'notification.deliver': DEFAULT_QUEUE_DECLARATION,
  'mail.send': DEFAULT_QUEUE_DECLARATION,
  'retention.expire': DEFAULT_QUEUE_DECLARATION,
  'data.export': DEFAULT_QUEUE_DECLARATION,
  'data.delete': DEFAULT_QUEUE_DECLARATION,
  'moderation.openRepetitionCase': DEFAULT_QUEUE_DECLARATION,
});

/** The entry for `name`, or the default for any other name (test queues). */
export function queueDeclarationFor(name: string): QueueDeclarationEntry {
  return QUEUE_DECLARATION[name] ?? DEFAULT_QUEUE_DECLARATION;
}
