import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ALIAS_ALPHABET,
  ALIAS_PATTERN,
  isGeneratedAlias,
  newAnonymousAlias,
  type RandomTokenSource,
} from './alias';

// `domain` has no Node or DOM types, so the runtime's Web Crypto is typed here by hand.
const webCrypto = (globalThis as unknown as { crypto: { getRandomValues(a: Uint8Array): void } })
  .crypto;
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 32 random bytes as unpadded base64url (43 characters), like `Crypto.randomToken`. */
const cryptoToken: RandomTokenSource = () => {
  const bytes = new Uint8Array(32);
  webCrypto.getRandomValues(bytes);
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      out += BASE64URL[(value >> bits) & 63];
    }
  }
  if (bits > 0) out += BASE64URL[(value << (6 - bits)) & 63];
  return out;
};

/** A source that returns the given tokens in order and counts how many it handed out. */
function scriptedSource(...tokens: string[]): RandomTokenSource & { calls: number } {
  const source = Object.assign(
    () => {
      const token = tokens[source.calls];
      source.calls += 1;
      if (token === undefined) throw new Error('scriptedSource: out of tokens');
      return token;
    },
    { calls: 0 },
  );
  return source;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('newAnonymousAlias', () => {
  it('draws patient- plus four characters of the alphabet, 12 characters in all', () => {
    for (let i = 0; i < 200; i += 1) {
      const alias = newAnonymousAlias(cryptoToken);
      expect(alias).toMatch(ALIAS_PATTERN);
      expect(alias).toHaveLength(12);
    }
  });

  it('reads tokens of the length a 32-byte source gives', () => {
    expect(cryptoToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('uses no confusable character', () => {
    expect(ALIAS_ALPHABET).toHaveLength(31);
    for (const confusable of ['i', 'l', 'o', '0', '1']) {
      expect(ALIAS_ALPHABET).not.toContain(confusable);
    }
  });

  it('rejects the base64url indices 62 and 63 and keeps the rest', () => {
    expect(newAnonymousAlias(scriptedSource('-_-_ABCD'))).toBe('patient-abcd');
  });

  it('maps index i to the alphabet character at i mod 31', () => {
    // `f` is base64url index 31 and `5` is index 57 (57 mod 31 = 26).
    expect(newAnonymousAlias(scriptedSource('fAf5'))).toBe(
      `patient-aa${ALIAS_ALPHABET[0]}${ALIAS_ALPHABET[26]}`,
    );
  });

  it('never reads the 43rd character of a token', () => {
    const skewedTail = `${'-'.repeat(42)}B`;

    expect(newAnonymousAlias(scriptedSource(skewedTail, 'CDEF'))).toBe('patient-cdef');
  });

  it('draws a new token when one runs out of usable characters', () => {
    const source = scriptedSource(`${'_'.repeat(40)}AB`, 'CD');

    expect(newAnonymousAlias(source)).toBe('patient-abcd');
    expect(source.calls).toBe(2);
  });

  it('refuses a source that does not return base64url', () => {
    expect(() => newAnonymousAlias(scriptedSource('AB+/'))).toThrow(/not base64url/);
  });

  it('refuses a source that never yields enough usable characters', () => {
    expect(() => newAnonymousAlias(() => '-')).toThrow(/too few usable characters/);
  });

  it('depends on the random source alone, never on time or Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const now = vi.spyOn(Date, 'now');

    const first = newAnonymousAlias(scriptedSource('xYz9Qk'));
    const second = newAnonymousAlias(scriptedSource('xYz9Qk'));

    expect(first).toBe(second);
    expect(random).not.toHaveBeenCalled();
    expect(now).not.toHaveBeenCalled();
  });

  it('is uniform over the alphabet across 10 000 draws (chi-square, 30 degrees of freedom)', () => {
    const counts = new Map<string, number>([...ALIAS_ALPHABET].map((c) => [c, 0]));
    const draws = 10_000;
    for (let i = 0; i < draws; i += 1) {
      for (const char of newAnonymousAlias(cryptoToken).slice('patient-'.length)) {
        counts.set(char, (counts.get(char) ?? 0) + 1);
      }
    }
    const expected = (draws * 4) / ALIAS_ALPHABET.length;
    const chiSquare = [...counts.values()].reduce(
      (sum, n) => sum + (n - expected) ** 2 / expected,
      0,
    );

    expect(counts.size).toBe(31);
    // 30 degrees of freedom: p < 0.0001 above 70, so a skewed draw fails and a fair one passes.
    expect(chiSquare).toBeLessThan(70);
  });
});

describe('isGeneratedAlias', () => {
  it('accepts a generated alias and nothing else', () => {
    expect(isGeneratedAlias('patient-ab23')).toBe(true);
    expect(isGeneratedAlias('Anonymous')).toBe(false);
    expect(isGeneratedAlias('patient-abc')).toBe(false);
    expect(isGeneratedAlias('patient-abcl')).toBe(false);
    expect(isGeneratedAlias('patient-ABCD')).toBe(false);
    expect(isGeneratedAlias(' patient-abcd')).toBe(false);
  });
});
