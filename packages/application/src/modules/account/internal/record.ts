// The application rows written after the library already committed (verify, reset), retried
// up to 3 times because the library's change cannot be undone (T-101 Q4, BR2.2, BR5.2).
import type { Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../../command';
import type { Tx } from '../../../ports';

export const RECORD_ATTEMPTS = 3;

/**
 * Runs `work` in its own transaction, up to RECORD_ATTEMPTS times; true once one commits.
 * ASSUMPTION(T-101): each attempt is a new transaction from the pool beside the command's own
 * idle one, so a failed attempt never leaves the command's transaction aborted.
 */
export async function recordWithRetry(
  ports: CommandPorts,
  work: (tx: Tx) => Promise<Result<null>>,
): Promise<boolean> {
  for (let attempt = 1; attempt <= RECORD_ATTEMPTS; attempt += 1) {
    try {
      const result = await ports.unitOfWork.run(work);
      if (result.ok) return true;
    } catch {
      // Retried; the final failure is logged by the caller with the account id only.
    }
  }
  return false;
}
