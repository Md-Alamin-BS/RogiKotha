// The thread alias of an anonymous persona (U11 BR2.5): `patient-` plus 4 characters drawn
// uniformly from a 31-character alphabet without confusables, from random tokens only.

export const ALIAS_PREFIX = 'patient-';
export const ALIAS_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
export const ALIAS_BODY_LENGTH = 4;
export const ALIAS_PATTERN = /^patient-[abcdefghjkmnpqrstuvwxyz23456789]{4}$/;

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// A 32-byte token is 43 base64url characters; the 43rd carries only 4 random bits, so it is skewed.
const UNIFORM_CHARS_PER_TOKEN = 42;
// 62 = 2 × 31, so `index mod 31` is uniform over the alphabet once 62 and 63 are rejected.
const ACCEPTED_INDEX_LIMIT = 2 * ALIAS_ALPHABET.length;
// Each character is rejected with probability 2/64, so this bound is never reached by a real source.
const MAX_TOKENS = 64;

/** Returns a fresh URL-safe random token of at least 32 bytes (`Crypto.randomToken`). */
export type RandomTokenSource = () => string;

export function isGeneratedAlias(value: string): boolean {
  return ALIAS_PATTERN.test(value);
}

/** Draws a new alias; throws a programmer error when the source does not return base64url. */
export function newAnonymousAlias(randomToken: RandomTokenSource): string {
  let body = '';
  for (let tokens = 0; tokens < MAX_TOKENS; tokens += 1) {
    const token = randomToken().slice(0, UNIFORM_CHARS_PER_TOKEN);
    for (const char of token) {
      const index = BASE64URL.indexOf(char);
      if (index < 0) throw new Error('newAnonymousAlias: the random source is not base64url');
      if (index >= ACCEPTED_INDEX_LIMIT) continue;
      body += ALIAS_ALPHABET[index % ALIAS_ALPHABET.length];
      if (body.length === ALIAS_BODY_LENGTH) return `${ALIAS_PREFIX}${body}`;
    }
  }
  throw new Error('newAnonymousAlias: the random source returned too few usable characters');
}
