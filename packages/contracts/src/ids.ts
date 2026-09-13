// Primary keys are app-generated UUIDv7 (`newId`); public URL identifiers are
// a 10-char lowercase Crockford base32 string (`newPublicId`), never the
// sequential or UUID key (01-conventions.md §4).
import { v4 as uuidV4, v7 as uuidV7 } from 'uuid';

const UUID_V7_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Generates a new UUIDv7 primary key. */
export function newId(): string {
  return uuidV7();
}

/** True when `s` is a well-formed UUIDv7 string. */
export function isId(s: string): boolean {
  return UUID_V7_RE.test(s);
}

// Crockford base32, lowercase, no vowels-as-words ambiguity (excludes i, l, o, u).
const PUBLIC_ID_ALPHABET = '0123456789abcdefghjkmnpqrstvwxyz';
/** Exported so `schemas/*.ts` can validate a public id field without duplicating the pattern. */
export const PUBLIC_ID_RE = /^[0-9a-hjkmnp-tv-z]{10}$/;
const SLUGGED_PUBLIC_ID_RE = /^[0-9a-hjkmnp-tv-z]{10}(-.*)?$/;

/**
 * Generates a 10-character public id.
 *
 * ASSUMPTION(T-003): the task text names `crypto.getRandomValues` as the
 * randomness source, but that global is not ambiently typed in this
 * package's tsconfig (no `dom`/`@types/node` lib, per 01-conventions.md §2:
 * "contracts -> zod only") and adding either is outside this task's owned
 * paths. Instead this draws its randomness from a fresh `uuid.v4()` (already
 * a CSPRNG-backed dependency this task installs) and repacks 50 of its 122
 * random bits into 10 base32 symbols — narrower and reversible; logged as
 * ISS-073.
 */
export function newPublicId(): string {
  const hex = uuidV4().replace(/-/g, '').slice(0, 13); // 52 bits of randomness
  let n = BigInt(`0x${hex}`);
  let out = '';
  for (let i = 0; i < 10; i++) {
    const index = Number(n & 31n);
    out = PUBLIC_ID_ALPHABET[index]! + out;
    n >>= 5n;
  }
  return out;
}

/** True when `s` is a well-formed 10-character public id. */
export function isPublicId(s: string): boolean {
  return PUBLIC_ID_RE.test(s);
}

/**
 * Extracts the public id from a URL param that may carry a trailing
 * `-slug` segment (e.g. `a1b2c3d4e5-dr-farhana` -> `a1b2c3d4e5`). Returns
 * `null` when `param` does not start with a valid public id.
 */
export function stripSlug(param: string): string | null {
  if (!SLUGGED_PUBLIC_ID_RE.test(param)) return null;
  return param.slice(0, 10);
}
