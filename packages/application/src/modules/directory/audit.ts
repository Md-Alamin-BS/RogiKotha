// The Directory module's audit builder (01-conventions §5): ids and booleans only, never the typed
// name, place or BMDC number (BR5.8).
import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditActor, AuditEntry } from '../../ports';

export const DIRECTORY_AUDIT_DETAIL_KEYS = {
  memberAdded: ['doctorId', 'hasSpecialty', 'hasChamber'],
} as const;

export const directoryAudit = {
  memberAdded(
    doctorId: string,
    flags: { hasSpecialty: boolean; hasChamber: boolean },
    actor: AuditActor,
  ): AuditEntry {
    const details = { doctorId, hasSpecialty: flags.hasSpecialty, hasChamber: flags.hasChamber };
    assertAuditDetails(details, DIRECTORY_AUDIT_DETAIL_KEYS.memberAdded);
    return {
      stream: `directory:${doctorId}`,
      action: 'memberAdded',
      actor,
      targetKind: 'profile',
      targetId: doctorId,
      details,
    };
  },
};
