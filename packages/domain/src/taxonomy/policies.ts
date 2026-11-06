// Taxonomy keys (U46 BR4.1, BR4.2). Every stored and looked-up key comes from here, in
// application code or the seed; the database package never computes one.

const NOT_KEY_CHARACTER = /[^\p{L}\p{M}\p{N}]/gu;

/**
 * NFC, lower case, keeping only letters, combining marks and digits: composed and decomposed
 * Bengali give one key, and vowel signs and the hasanta stay.
 */
export function normalizeAliasKey(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(NOT_KEY_CHARACTER, '');
}
