// The recursive audit-details allowlist (01-conventions §5, T-101 BR8.2, closes ISS-108). Details
// hold ids, enum values, counts and booleans only: every key at every depth must be on the
// action's list, and every string must be a short token, never free text, an address or a link.
// `packages/database/src/audit-writer.ts` runs the same check again before it writes.
import { InternalError } from '@rogikotha/contracts';

import type { AuditDetails, AuditDetailValue } from '../ports';

/** Ids (UUIDv7, public ids), enum values, ISO timestamps: one token, no spaces, no `@`, no `/`. */
const TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9_.:-]*$/;
export const AUDIT_STRING_MAX = 64;
export const AUDIT_ARRAY_MAX = 32;
const MAX_DEPTH = 4;

function refuse(path: string, why: string): never {
  // The value itself never enters the message: it may be the private data being refused.
  throw new InternalError(`audit details refused at ${path}: ${why}`);
}

function checkString(value: string, path: string): void {
  if (value.length > AUDIT_STRING_MAX) refuse(path, 'string too long');
  if (!TOKEN_RE.test(value)) refuse(path, 'not an id or enum value');
}

function checkValue(
  value: AuditDetailValue,
  allowed: ReadonlySet<string>,
  path: string,
  depth: number,
): void {
  if (depth > MAX_DEPTH) refuse(path, 'nested too deep');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) refuse(path, 'not a finite number');
    return;
  }
  if (typeof value === 'string') return checkString(value, path);
  if (Array.isArray(value)) {
    const items = value as readonly AuditDetailValue[];
    if (items.length > AUDIT_ARRAY_MAX) refuse(path, 'array too long');
    items.forEach((item, i) => checkValue(item, allowed, `${path}[${i}]`, depth + 1));
    return;
  }
  checkObject(value as AuditDetails, allowed, path, depth + 1);
}

function checkObject(
  details: AuditDetails,
  allowed: ReadonlySet<string>,
  path: string,
  depth: number,
): void {
  for (const [key, value] of Object.entries(details)) {
    const at = path === '' ? key : `${path}.${key}`;
    if (!allowed.has(key)) refuse(at, 'key not on the allowlist');
    checkValue(value, allowed, at, depth);
  }
}

/**
 * Throws a programmer error unless every key, at any depth, is in `allowedKeys` and every value
 * is an id, an enum value, a count, a boolean or null (or an array or object of those).
 */
export function assertAuditDetails(details: AuditDetails, allowedKeys: readonly string[]): void {
  checkObject(details, new Set(allowedKeys), '', 0);
}
