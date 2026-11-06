// The identity module's audit rows (U11 BR3.8, BR4.1). Details stay empty: never the persona id,
// the name or the username, so no row pairs an account with a persona.
import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditEntry } from '../../ports/audit-writer';

export const IDENTITY_AUDIT_ACTIONS = ['named_persona_created'] as const;
export type IdentityAuditAction = (typeof IDENTITY_AUDIT_ACTIONS)[number];

export const identityAudit = {
  namedPersonaCreated(accountId: string): AuditEntry {
    const details = {};
    assertAuditDetails(details, []);
    return {
      stream: `account:${accountId}`,
      action: 'named_persona_created',
      actor: `account:${accountId}`,
      details,
    };
  },
};
