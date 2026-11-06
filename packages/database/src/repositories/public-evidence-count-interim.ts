// U46's interim `PublicEvidenceCount` (C17, functional-spec § 6): today's public meaning, the
// demo's `DEMO_READY_EVIDENCE_STATES`, until U48 binds Evidence's implementation and deletes this
// file with `demo/evidence.ts`. The batched form asks once per review (F2); U48's is one query.
import type { PublicEvidenceCount } from '@rogikotha/application';

import type { Db } from '../client';
import { countReadyEvidence } from '../demo/evidence';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createInterimPublicEvidenceCount(db: Db): PublicEvidenceCount {
  async function countPublicEvidence(reviewId: string): Promise<number> {
    // A non-uuid compared with the uuid column would be a PostgreSQL cast error, not a miss.
    if (!UUID_RE.test(reviewId)) return 0;
    return countReadyEvidence(db, reviewId);
  }
  return {
    countPublicEvidence,
    async countPublicEvidenceByReview(reviewIds) {
      const counts = new Map<string, number>();
      for (const id of new Set(reviewIds)) counts.set(id, await countPublicEvidence(id));
      return counts;
    },
  };
}
