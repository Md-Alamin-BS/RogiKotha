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
