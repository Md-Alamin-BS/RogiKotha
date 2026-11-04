// The `AuditWriter` port: every command that changes state writes an audit row in the same
// transaction (01-conventions.md §5). Details come from the typed builders in
// `application/src/audit/`; this writer checks them again, at any depth, before they are stored
// (BR8.2, closes ISS-108).
import type { AuditDetails, AuditEntry, AuditWriter, Tx as AppTx } from '@rogikotha/application';

import { auditEvents } from './schema/index';
import { executorOf } from './unit-of-work';

const MAX_STRING_LENGTH = 200;
const MAX_DEPTH = 6;

// Ids, enum values, codes and ISO timestamps only: no spaces (free text), no `@` (an email), no
// `/` (a link or path).
const SAFE_STRING = /^[A-Za-z0-9_.:+-]*$/;

// Matched against the key with separators removed and lowercased, e.g. `emailAddress`, `user_agent`.
const DISALLOWED_KEY_PARTS = [
  'email',
  'password',
  'token',
  'secret',
  'cookie',
  'filename',
  'useragent',
  'ipaddress',
  'phone',
];

// Matched against whole words of the key, e.g. `body`, `snapshot_text`, `resetLink`.
const DISALLOWED_KEY_WORDS = new Set(['body', 'text', 'link', 'url', 'ip', 'note', 'notes']);

function keyWords(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== '');
}

function assertAllowedKey(key: string, path: string): void {
  const compact = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  const refused =
    DISALLOWED_KEY_PARTS.some((part) => compact.includes(part)) ||
    keyWords(key).some((word) => DISALLOWED_KEY_WORDS.has(word));
  if (refused) throw new Error(`audit details: disallowed key at ${path}`);
}

function assertSafeString(value: string, path: string): void {
  if (value.length > MAX_STRING_LENGTH) {
    throw new Error(`audit details: value at ${path} exceeds ${MAX_STRING_LENGTH} chars`);
  }
  // The value itself is never put in the message: it may be the private data being refused.
  if (!SAFE_STRING.test(value)) {
    throw new Error(`audit details: value at ${path} is not an id, code or enum value`);
  }
}

function assertAllowedValue(value: unknown, path: string, depth: number): void {
  if (depth > MAX_DEPTH)
    throw new Error(`audit details: nested deeper than ${MAX_DEPTH} at ${path}`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`audit details: value at ${path} is not finite`);
    return;
  }
  if (typeof value === 'string') return assertSafeString(value, path);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertAllowedValue(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, item] of Object.entries(value)) {
      const itemPath = `${path}.${key}`;
      // A boolean cannot carry the data a key names, so flags such as `emailVerified` pass.
      if (typeof item !== 'boolean') assertAllowedKey(key, itemPath);
      assertAllowedValue(item, itemPath, depth + 1);
    }
    return;
  }
  throw new Error(`audit details: value at ${path} is not a string, number, boolean or null`);
}

/**
 * Throws a programmer error unless `details` holds only ids, enum values, codes, counts, booleans
 * and nulls, in plain objects and arrays, under keys that do not name private data
 * (01-conventions.md §5: never free text from users, emails, file names or review bodies).
 */
export function assertAllowlisted(details: AuditDetails): void {
  assertAllowedValue(details, 'details', 0);
}

export class PgAuditWriter implements AuditWriter {
  async write(tx: AppTx, entry: AuditEntry): Promise<void> {
    assertAllowlisted(entry.details);
    // The row's other strings are checked too: an email in a stream would leak as much.
    for (const [field, value] of [
      ['stream', entry.stream],
      ['action', entry.action],
      ['actor', entry.actor],
      ['targetId', entry.targetId],
    ] as const) {
      if (value !== undefined) assertSafeString(value, field);
    }
    await executorOf(tx).insert(auditEvents).values({
      stream: entry.stream,
      action: entry.action,
      actor: entry.actor,
      targetKind: entry.targetKind,
      targetId: entry.targetId,
      details: entry.details,
    });
  }
}
