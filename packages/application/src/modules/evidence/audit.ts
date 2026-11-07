// The Evidence module's audit builder (01-conventions §5, BR6.3): ids and enum values only, never
// the file name, size, hash or storage key.
// ASSUMPTION(U48): the actor is the account, as on the item's custody row; the audit stream is
// staff-only like custody, and the remover holds no persona of its own outside a publish.
import type { EvidenceItemState } from '@rogikotha/domain';

import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditEntry } from '../../ports';

export const EVIDENCE_AUDIT_DETAIL_KEYS = {
  evidenceRemoved: ['fromState'],
} as const;

export const evidenceAudit = {
  evidenceRemoved(itemId: string, accountId: string, fromState: EvidenceItemState): AuditEntry {
    const details = { fromState };
    assertAuditDetails(details, EVIDENCE_AUDIT_DETAIL_KEYS.evidenceRemoved);
    return {
      stream: `evidence:${itemId}`,
      action: 'evidence.removed',
      actor: `account:${accountId}`,
      targetKind: 'evidence',
      targetId: itemId,
      details,
    };
  },
};
