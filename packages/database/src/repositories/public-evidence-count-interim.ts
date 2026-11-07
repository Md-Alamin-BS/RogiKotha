// U46's interim `PublicEvidenceCount` (C17, functional-spec § 6): today's public meaning, the
// demo's `DEMO_READY_EVIDENCE_STATES`. The web tier now binds Evidence's implementation; only the
// directory smoke still uses this one, so U50 deletes it. The batched form asks once per review.
import type { PublicEvidenceCount } from '@rogikotha/application';
import { and, count, eq, inArray } from 'drizzle-orm';

import type { Db } from '../client';
import { DEMO_READY_EVIDENCE_STATES } from '../demo/ready-evidence-states';
import { evidenceItems } from '../schema/evidence';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createInterimPublicEvidenceCount(db: Db): PublicEvidenceCount {
  async function countPublicEvidence(reviewId: string): Promise<number> {
    // A non-uuid compared with the uuid column would be a PostgreSQL cast error, not a miss.
    if (!UUID_RE.test(reviewId)) return 0;
    const [row] = await db
      .select({ ready: count() })
      .from(evidenceItems)
      .where(
        and(
          eq(evidenceItems.reviewId, reviewId),
          inArray(evidenceItems.state, DEMO_READY_EVIDENCE_STATES),
        ),
      );
    return row?.ready ?? 0;
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
