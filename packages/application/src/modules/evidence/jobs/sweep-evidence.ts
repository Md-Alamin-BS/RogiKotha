// `evidence.sweep` (WF2b, BR4.11): ends every item still in processing past the deadline, whatever
// stopped its job. Each item moves in its own transaction by a compare-and-set from the state the
// sweep read (BR4.2), so a lost race to a job step or a removal is skipped, not an error. The
// original is deleted after the commit.
import { ok } from '@rogikotha/contracts';
import { EVIDENCE_PROCESSING_DEADLINE_SEC, sweepReason } from '@rogikotha/domain';

import type { StuckEvidenceRecord } from '../../../ports';
import type { EvidenceSweepDeps } from '../worker-ports';

/** Items ended per run; the cron runs every 5 minutes, so a backlog drains over a few runs. */
export const EVIDENCE_SWEEP_BATCH = 100;

export interface SweepEvidenceResult {
  ended: number;
}

const errorClassOf = (error: unknown): string => (error instanceof Error ? error.name : 'unknown');

export function createSweepEvidence(deps: EvidenceSweepDeps) {
  const repo = deps.evidenceRepository;

  async function end(item: StuckEvidenceRecord): Promise<boolean> {
    const result = await deps.unitOfWork.run<ReturnType<typeof sweepReason> | null>(async (tx) => {
      // Read in this transaction, so a `scan_unavailable` a job appended since the select counts.
      const failReason = sweepReason(await repo.latestCustody(tx, item.id));
      if (!(await repo.transition(tx, item.id, item.state, 'failed', failReason))) return ok(null);
      await repo.appendCustody(tx, {
        itemId: item.id,
        event: 'failed',
        actor: 'worker',
        details: { failReason },
        now: deps.clock.now(),
      });
      await deps.outbox.append(tx, 'evidence.stateChanged', {
        itemId: item.id,
        reviewId: item.reviewId,
        state: 'failed',
      });
      return ok(failReason);
    });
    if (!result.ok || result.data === null) return false;
    deps.logger.info('evidence.swept', {
      itemId: item.id,
      state: 'failed',
      failReason: result.data,
    });
    return true;
  }

  async function deleteOriginal(item: StuckEvidenceRecord): Promise<void> {
    if (item.storageKey === null) return;
    try {
      await deps.files.delete(item.storageKey);
      await deps.unitOfWork.run(async (tx) => {
        await repo.markOriginalDeleted(tx, item.id);
        return ok(null);
      });
    } catch (error) {
      deps.logger.warn('evidence.original_delete_failed', {
        itemId: item.id,
        errorClass: errorClassOf(error),
      });
    }
  }

  return async function sweepEvidence(): Promise<SweepEvidenceResult> {
    const olderThan = new Date(
      deps.clock.now().getTime() - EVIDENCE_PROCESSING_DEADLINE_SEC * 1000,
    );
    const selected = await deps.unitOfWork.run(async (tx) =>
      ok(await repo.stuckItems(tx, olderThan, EVIDENCE_SWEEP_BATCH)),
    );
    if (!selected.ok) return { ended: 0 };
    let ended = 0;
    for (const item of selected.data) {
      try {
        if (!(await end(item))) continue;
      } catch (error) {
        // One item's fault must not stop the rest; the next run retries it.
        deps.logger.error('evidence.sweep_item_failed', {
          itemId: item.id,
          errorClass: errorClassOf(error),
        });
        continue;
      }
      ended += 1;
      await deleteOriginal(item);
    }
    if (ended > 0) deps.logger.info('evidence.sweep_finished', { count: ended });
    return { ended };
  };
}
