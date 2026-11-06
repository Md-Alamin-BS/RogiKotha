// 01-conventions §5, BR8.2. Details come only from the typed builders in `application/src/audit/`;
// the database writer checks them again recursively (closes ISS-108).
import type { TargetKind } from '@rogikotha/contracts';

import type { Tx } from './unit-of-work';

/** Ids, enum values, counts and booleans, possibly nested; never free text, email or token. */
export type AuditDetailValue =
  | string
  | number
  | boolean
  | null
  | readonly AuditDetailValue[]
  | { readonly [key: string]: AuditDetailValue };

export type AuditDetails = { readonly [key: string]: AuditDetailValue };

/**
 * `account:<accountId>`, `staff:<accountId>`, `system` or `anonymous`; `persona:<personaId>` is
 * what an operation inside a publish records, so an anonymous review names no account (U46 BR5.3).
 */
export type AuditActor = `${'account' | 'staff' | 'persona'}:${string}` | 'system' | 'anonymous';

export interface AuditEntry {
  /** e.g. `account:<accountId>` */
  stream: `${string}:${string}`;
  action: string;
  actor: AuditActor;
  targetKind?: TargetKind;
  targetId?: string;
  details: AuditDetails;
}

export interface AuditWriter {
  /** Writes on `tx`; throws a programmer error for details outside the allowlist. */
  write(tx: Tx, entry: AuditEntry): Promise<void>;
}
