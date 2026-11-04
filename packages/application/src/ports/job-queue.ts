// pg-boss in `packages/database/src/queue`. The caller ensures a queue before it opens the
// transaction it enqueues on, so no second connection is used inside it (ISS-253).
import type { PortResult } from './port-result';
import type { Tx } from './unit-of-work';

export const MAIL_SEND_JOB = 'mail.send';

export interface MailSendPayload {
  /** The only field: no address, no params, no link (ISS-243). */
  deliveryId: string;
}

export type EnqueueOutcome = 'enqueued' | 'deduplicated';

export interface JobQueue {
  /** Creates the queue with its declared policy if it is missing; idempotent. */
  ensure(name: string): Promise<void>;
  /** Inserts the job on `tx`. `key` is the singleton key, e.g. `mail.send:<deliveryId>`. */
  enqueue(
    tx: Tx,
    name: string,
    payload: Record<string, unknown>,
    opts: { key: string },
  ): Promise<PortResult<EnqueueOutcome, 'job_not_enqueued'>>;
}
