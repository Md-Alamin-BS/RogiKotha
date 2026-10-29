import { describe, expect, it } from 'vitest';

import { isId, isPublicId, newId, newPublicId, stripSlug } from './ids';

describe('isPublicId', () => {
  it('accepts a freshly generated public id', () => {
    expect(isPublicId(newPublicId())).toBe(true);
  });

  it.each([
    ['too short', 'a1b2c3d4e'],
    ['too long', 'a1b2c3d4e5f'],
    ['uppercase', 'A1B2C3D4E5'],
    ['an excluded letter (i)', 'a1b2c3d4ei'],
    ['an excluded letter (u)', 'a1b2c3d4eu'],
    ['a slug suffix', 'a1b2c3d4e5-dr-farhana'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isPublicId(value)).toBe(false);
  });
});

describe('isId', () => {
  it('accepts a generated primary key', () => {
    expect(isId(newId())).toBe(true);
  });

  it.each([
    ['a version 4 uuid', '9b2f2c0e-3f1a-4b57-8f0a-1c2d3e4f5a6b'],
    ['a non-uuid string', 'not-a-uuid'],
    ['an empty string', ''],
  ])('rejects %s', (_label, value) => {
    expect(isId(value)).toBe(false);
  });
});

describe('stripSlug', () => {
  it('keeps only the id when an empty slug follows it', () => {
    expect(stripSlug('a1b2c3d4e5-')).toBe('a1b2c3d4e5');
  });

  it('returns null for an id with an excluded letter', () => {
    expect(stripSlug('a1b2c3d4ei-dr-farhana')).toBeNull();
  });
});
