// `evidence.remove` (WF4, BR1.3, BR6.3, BR4.7): the author removes one of their own items, on their
// own review whether or not it is still published. One transaction moves it to `removed` with its
// custody, audit and outbox rows; after commit the original file is deleted and marked deleted. A
// failed delete is logged and left for retention (S4), never turned into an error.
import { ok, RemoveEvidenceInput, type Result } from '@rogikotha/contracts';
import { canTransition, type EvidenceItemState } from '@rogikotha/domain';

import { defineCommand, type CommandCall } from '../../../command';
import type { Tx } from '../../../ports';
import { accountIdOf, refused } from '../access';
import { evidenceAudit } from '../audit';
import type { EvidenceModuleDeps } from '../ports';

/** A worker step can move the item between our read and our write; re-read that many times. */
const COMPARE_AND_SET_TRIES = 3;

interface Removed {
  itemId: string;
  storageKey: string | null;
}

async function removeInTx(
  deps: EvidenceModuleDeps,
  call: CommandCall,
  tx: Tx,
  itemPublicId: string,
): Promise<Result<Removed>> {
  const { actor, ports } = call;
  const repo = deps.evidenceRepository;
  const accountId = accountIdOf(actor);
  for (let attempt = 0; attempt < COMPARE_AND_SET_TRIES; attempt += 1) {
    const item = await repo.findOwned(tx, itemPublicId, accountId);
    if (item === null || !canTransition(item.state, 'removed')) return refused('not_found', actor);
    if (!(await deps.review.isReviewAuthor(tx, { reviewId: item.reviewId, actor }))) {
      return refused('not_found', actor);
    }
    const from: EvidenceItemState = item.state;
    if (!(await repo.transition(tx, item.id, from, 'removed'))) continue;
    const now = deps.clock.now();
    await repo.appendCustody(tx, {
      itemId: item.id,
      event: 'removed',
      actor: `account:${accountId}`,
      details: {},
      now,
    });
    await ports.audit.write(tx, evidenceAudit.evidenceRemoved(item.id, accountId, from));
    await ports.outbox.append(tx, 'evidence.stateChanged', {
      itemId: item.id,
      reviewId: item.reviewId,
      state: 'removed',
    });
    return ok({ itemId: item.id, storageKey: item.storageKey });
  }
  throw new Error('evidence.remove: the item kept changing state');
}

async function deleteOriginal(
  deps: EvidenceModuleDeps,
  call: CommandCall,
  removed: Removed,
): Promise<void> {
  if (removed.storageKey === null) return;
  try {
    await deps.files.delete(removed.storageKey);
    await call.ports.unitOfWork.run(async (tx) => {
      await deps.evidenceRepository.markOriginalDeleted(tx, removed.itemId);
      return ok(null);
    });
  } catch (error) {
    deps.logger.warn('evidence.original_delete_failed', {
      itemId: removed.itemId,
      errorClass: error instanceof Error ? error.name : 'unknown',
    });
  }
}

export function removeEvidenceCommand(deps: EvidenceModuleDeps) {
  // `libraryFirst` gives the handler no open transaction, so the delete runs after the commit.
  return defineCommand<RemoveEvidenceInput, Record<string, never>>({
    name: 'evidence.remove',
    input: RemoveEvidenceInput,
    requires: { authenticated: true, verifiedEmail: true },
    libraryFirst: true,
    async handle(ctx) {
      const result = await ctx.ports.unitOfWork.run((tx) =>
        removeInTx(deps, ctx, tx, ctx.input.itemPublicId),
      );
      if (!result.ok) return { ok: false, error: result.error };
      await deleteOriginal(deps, ctx, result.data);
      deps.logger.info('evidence.removed', { itemId: result.data.itemId, state: 'removed' });
      return ok({});
    },
  });
}
