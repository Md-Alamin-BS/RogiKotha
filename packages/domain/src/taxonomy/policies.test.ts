import { describe, expect, it } from 'vitest';

import { normalizeAliasKey } from './policies';

describe('normalizeAliasKey', () => {
  it('gives composed and decomposed Bengali one key', () => {
    // য় written as one code point (U+09DF) and as য + nukta (U+09AF U+09BC).
    const composed = 'হাইপোথাইরয়েড';
    const decomposed = 'হাইপোথাইরয়েড';
    expect(composed).not.toBe(decomposed);
    expect(normalizeAliasKey(composed)).toBe(normalizeAliasKey(decomposed));
  });

  it('drops punctuation and spaces and lowercases Latin text', () => {
    expect(normalizeAliasKey('Thyroid (hypothyroidism)')).toBe('thyroidhypothyroidism');
    expect(normalizeAliasKey('  High  Blood-Pressure ')).toBe('highbloodpressure');
  });

  it('keeps vowel signs, the hasanta and digits', () => {
    expect(normalizeAliasKey('টাইপ ২ ডায়াবেটিস')).toBe('টাইপ২ডায়াবেটিস');
    expect(normalizeAliasKey('রক্ত')).toBe('রক্ত');
  });

  it('gives an empty key for punctuation only', () => {
    expect(normalizeAliasKey(' -- ')).toBe('');
  });
});
