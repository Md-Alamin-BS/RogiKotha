// `mail.send` (T-101 WF13, FD-071, FD-095). The logic lives in the application use case
// `sendEmailDelivery` (BR6.3); this handler only checks the job's shape and hands it over. A retry
// signal thrown by the use case propagates, so pg-boss retries the job with its backoff.
import { z } from 'zod';

import type { WorkerContainer } from '../container.js';

/** The job data `queueEmail` enqueues: the delivery id only, never an address (BR6.1). */
const MailSendJobSchema = z.object({ deliveryId: z.uuid() });

export type MailSendJob = z.infer<typeof MailSendJobSchema>;

/** The slice of the container the handler needs. */
export type MailSendContext = Pick<WorkerContainer, 'sendEmail' | 'logger'>;

export async function mailSendHandler(payload: unknown, ctx: MailSendContext): Promise<void> {
  const parsed = MailSendJobSchema.safeParse(payload);
  if (!parsed.success) {
    // A malformed job can never succeed, so it finishes here instead of being retried (WF13 step 1).
    ctx.logger.warn('mail.payload_invalid', { job: 'mail.send' });
    return;
  }
  await ctx.sendEmail({ deliveryId: parsed.data.deliveryId });
}
