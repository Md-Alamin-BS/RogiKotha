// The one repository-adjacent class that is implemented, not stubbed
// (task step 14): every command that changes state writes an audit row in
// the same transaction (01-conventions.md §5), so later tasks need this to
// exist now. `application`'s `AuditWriter` port does not exist yet; this
// class gets an `implements` clause when it does (T-101 onward), same as
// the repositories in `repositories/*.ts`.
import type { TargetKind } from '@rogikotha/contracts';

import type { Tx } from './client.js';
import { auditEvents } from './schema/index.js';

const DISALLOWED_KEYS = new Set(['email', 'body', 'text', 'filename', 'password', 'token']);
const MAX_STRING_LENGTH = 200;

export interface AuditDetails {
  [key: string]: unknown;
}

export interface WriteAuditEvent {
  stream: string;
  action: string;
  actor: string;
  targetKind?: TargetKind;
  targetId?: string;
  details?: AuditDetails;
}

/**
 * Throws when `details` carries a key on the private-data denylist, or a
 * string value over 200 chars (01-conventions.md §5: "Never free text from
 * users, never emails, never file names, never review bodies").
 */
export function assertAllowlisted(details: AuditDetails): void {
  for (const [key, value] of Object.entries(details)) {
    if (DISALLOWED_KEYS.has(key)) {
      throw new Error(`audit details: disallowed key "${key}"`);
    }
    if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
      throw new Error(`audit details: value for "${key}" exceeds ${MAX_STRING_LENGTH} chars`);
    }
  }
}

export class PgAuditWriter {
  async write(tx: Tx, event: WriteAuditEvent): Promise<void> {
    const details = event.details ?? {};
    assertAllowlisted(details);
    await tx.insert(auditEvents).values({
      stream: event.stream,
      action: event.action,
      actor: event.actor,
      targetKind: event.targetKind,
      targetId: event.targetId,
      details,
    });
  }
}
