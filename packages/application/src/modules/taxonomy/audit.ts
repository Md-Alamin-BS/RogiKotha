// The Taxonomy module's audit builder (01-conventions §5): ids and enum values, never the wording
// (BR5.3).
import type { TermKind } from '@rogikotha/contracts';

import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditActor, AuditEntry } from '../../ports';

export const TAXONOMY_AUDIT_DETAIL_KEYS = {
  provisionalCreated: ['termId', 'kind', 'lang'],
} as const;

export const taxonomyAudit = {
  provisionalCreated(
    termId: string,
    kind: TermKind,
    lang: 'en' | 'bn' | 'banglish',
    actor: AuditActor,
  ): AuditEntry {
    const details = { termId, kind, lang };
    assertAuditDetails(details, TAXONOMY_AUDIT_DETAIL_KEYS.provisionalCreated);
    return { stream: `taxonomy:${termId}`, action: 'term.provisional_created', actor, details };
  },
};
