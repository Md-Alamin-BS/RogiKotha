// `evidence.process` (U48 WF2, BR4.1, BR4.6, BR4.9). The logic lives in the application processor;
// this handler checks the C15 envelope, maps pg-boss's attempt metadata and sets the attempt budget.
// A thrown error propagates, so pg-boss retries the job with its backoff.
import type { JobAttempt } from '@rogikotha/database';
import { z } from 'zod';

import type { WorkerContainer } from '../container.js';

/** The C15 job data the relay builds: `{eventId, name, payload}`, with the internal item id. */
const EvidenceProcessJobSchema = z.object({
  eventId: z.string().min(1),
  name: z.literal('evidence.received'),
  payload: z.object({ itemId: z.uuid() }),
});

export type EvidenceProcessJob = z.infer<typeof EvidenceProcessJobSchema>;

/** One attempt's own budget, shorter than the queue's 300 s expiry (C8, BR4.6). */
export const EVIDENCE_ATTEMPT_BUDGET_MS = 120_000;

/** The slice of the container the handler needs. */
export type EvidenceProcessContext = Pick<WorkerContainer, 'processEvidence' | 'logger'>;

export async function evidenceProcessHandler(
  payload: unknown,
  ctx: EvidenceProcessContext,
  attempt?: JobAttempt,
): Promise<void> {
  const parsed = EvidenceProcessJobSchema.safeParse(payload);
  if (!parsed.success) {
    // A malformed job can never succeed, so it finishes here instead of being retried.
    ctx.logger.warn('evidence.payload_invalid', { job: 'evidence.process' });
    return;
  }
  const retryCount = attempt?.retryCount ?? 0;
  const retryLimit = attempt?.retryLimit ?? 0;
  const budget = AbortSignal.timeout(EVIDENCE_ATTEMPT_BUDGET_MS);
  await ctx.processEvidence({
    itemId: parsed.data.payload.itemId,
    attempt: retryCount + 1,
    lastAttempt: retryCount >= retryLimit,
    signal: attempt === undefined ? budget : AbortSignal.any([attempt.signal, budget]),
  });
}
