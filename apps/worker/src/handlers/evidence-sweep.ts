// `evidence.sweep` (U48 WF2b, BR4.11): a cron job, every 5 minutes, that ends items stuck in
// processing past the deadline. The logic lives in the application sweep.
import type { WorkerContainer } from '../container.js';

/** The slice of the container the handler needs. */
export type EvidenceSweepContext = Pick<WorkerContainer, 'sweepEvidence' | 'logger'>;

export async function evidenceSweepHandler(
  _payload: unknown,
  ctx: EvidenceSweepContext,
): Promise<void> {
  const { ended } = await ctx.sweepEvidence();
  if (ended > 0) ctx.logger.info('evidence.sweep_done', { ended });
}
