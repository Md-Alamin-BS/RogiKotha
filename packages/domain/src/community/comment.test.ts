import { describe, expect, it } from 'vitest';

import { COMMENT_STATES, bodyLength, isBodyWithinLimits, isLive, normaliseBody } from './comment';
import { tombstoneOnDelete } from './deletion';

describe('normaliseBody', () => {
  it('trims whitespace and composes a combining sequence to NFC', () => {
    expect(normaliseBody('  Cafe\u0301\n')).toBe('Caf\u00E9');
    expect(normaliseBody('\u0995\u09C7\u09BE')).toBe('\u0995\u09CB');
  });

  it('keeps Bengali text, links and at-names as literal text', () => {
    expect(normaliseBody(' ডাক্তার ভালো ছিলেন https://example.test @someone ')).toBe(
      'ডাক্তার ভালো ছিলেন https://example.test @someone',
    );
  });
});

describe('isBodyWithinLimits', () => {
  it('refuses 0 and 2001 code points and accepts 1 and 2000', () => {
    expect(isBodyWithinLimits('')).toBe(false);
    expect(isBodyWithinLimits('a')).toBe(true);
    expect(isBodyWithinLimits('a'.repeat(2000))).toBe(true);
    expect(isBodyWithinLimits('a'.repeat(2001))).toBe(false);
  });

  it('refuses a whitespace-only body once normalised', () => {
    expect(isBodyWithinLimits(normaliseBody(' \t\n '))).toBe(false);
  });

  it('counts an astral character once', () => {
    expect(bodyLength('\u{1F600}')).toBe(1);
    expect(isBodyWithinLimits('\u{1F600}'.repeat(2000))).toBe(true);
  });
});

describe('isLive', () => {
  it('is true only for a published row that is not deleted', () => {
    expect(isLive({ state: 'published', deletedAt: null })).toBe(true);
    expect(isLive({ state: 'published', deletedAt: new Date('2026-01-01T00:00:00Z') })).toBe(false);
    for (const state of COMMENT_STATES.filter((s) => s !== 'published')) {
      expect(isLive({ state, deletedAt: null })).toBe(false);
    }
  });
});

describe('tombstoneOnDelete', () => {
  it('leaves no placeholder without live replies and one with a live reply', () => {
    expect(tombstoneOnDelete(0)).toBe(false);
    expect(tombstoneOnDelete(1)).toBe(true);
    expect(tombstoneOnDelete(7)).toBe(true);
  });

  it('throws a programmer error for a negative or fractional count', () => {
    expect(() => tombstoneOnDelete(-1)).toThrow(/non-negative integer/);
    expect(() => tombstoneOnDelete(0.5)).toThrow(/non-negative integer/);
  });
});
