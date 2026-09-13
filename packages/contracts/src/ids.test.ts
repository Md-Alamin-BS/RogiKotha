import { describe, expect, it } from 'vitest';

import { isId, newId, newPublicId, stripSlug } from './ids.js';

describe('newPublicId', () => {
  it('generates unique valid public ids', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const id = newPublicId();
      expect(id).toMatch(/^[0-9a-hjkmnp-tv-z]{10}$/);
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
    expect(seen.size).toBe(10_000);
  });

  it('reaches more than two distinct symbols at every position (regression for ISS-077)', () => {
    // The old `.slice(0, 13)` always emitted `4` or `m` at the last position
    // because it captured UUIDv4's fixed version nibble. Uniqueness alone
    // (the test above) cannot catch a single low-entropy position, since
    // 10,000 ids can still all be unique with only 2 symbols in one slot.
    const byPosition: Array<Set<string>> = Array.from({ length: 10 }, () => new Set());
    for (let i = 0; i < 20_000; i++) {
      const id = newPublicId();
      for (let pos = 0; pos < 10; pos++) {
        byPosition[pos]!.add(id[pos]!);
      }
    }
    for (let pos = 0; pos < 10; pos++) {
      expect(byPosition[pos]!.size).toBeGreaterThan(2);
    }
  });
});

describe('stripSlug', () => {
  it('returns the id for id-with-slug and null for garbage', () => {
    expect(stripSlug('a1b2c3d4e5-dr-farhana')).toBe('a1b2c3d4e5');
    expect(stripSlug('a1b2c3d4e5')).toBe('a1b2c3d4e5');
    expect(stripSlug('not-a-valid-id')).toBeNull();
    expect(stripSlug('short')).toBeNull();
  });
});

describe('newId', () => {
  it('is a v7 uuid', () => {
    const id = newId();
    expect(isId(id)).toBe(true);
    // version nibble is '7'
    expect(id[14]).toBe('7');
  });
});
