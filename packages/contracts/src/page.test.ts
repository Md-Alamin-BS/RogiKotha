import { describe, expect, it } from 'vitest';

import { decodeCursor, encodeCursor } from './page';

interface CursorPayload {
  after: string;
  position: number;
}

function aCursorPayload(overrides: Partial<CursorPayload> = {}): CursorPayload {
  return { after: 'a1b2c3d4e5', position: 20, ...overrides };
}

describe('encodeCursor', () => {
  it('encodes a payload as the base64url form of its JSON', () => {
    expect(encodeCursor({ a: 1 })).toBe('eyJhIjoxfQ');
  });

  it('encodes multi-byte text the way a standard UTF-8 base64url encoder does', () => {
    expect(encodeCursor({ q: 'বাংলা😀é' })).toBe('eyJxIjoi4Kas4Ka-4KaC4Kay4Ka-8J-YgMOpIn0');
  });

  it('only emits URL-safe characters and no padding', () => {
    // Sweeping the payload length covers every remainder of the 3-byte grouping.
    for (let length = 0; length < 40; length++) {
      const cursor = encodeCursor(aCursorPayload({ after: '~?>'.repeat(length) }));
      expect(cursor).toMatch(/^[A-Za-z0-9_-]*$/);
    }
  });
});

describe('decodeCursor', () => {
  it('returns the payload that encodeCursor was given', () => {
    const payload = aCursorPayload();
    expect(decodeCursor<CursorPayload>(encodeCursor(payload))).toEqual(payload);
  });

  it.each([
    ['ASCII', 'plain-text'],
    ['two-byte characters', 'café'],
    ['three-byte characters', 'বাংলা'],
    ['four-byte characters', '😀🙂'],
    ['an empty string', ''],
  ])('round-trips %s', (_label, after) => {
    const payload = aCursorPayload({ after });
    expect(decodeCursor<CursorPayload>(encodeCursor(payload))).toEqual(payload);
  });

  it('round-trips payloads whose encoded length leaves every grouping remainder', () => {
    for (let length = 0; length < 12; length++) {
      const payload = aCursorPayload({ after: 'x'.repeat(length) });
      expect(decodeCursor<CursorPayload>(encodeCursor(payload))).toEqual(payload);
    }
  });

  it('round-trips non-object JSON values', () => {
    expect(decodeCursor(encodeCursor(42))).toBe(42);
    expect(decodeCursor(encodeCursor(null))).toBeNull();
    expect(decodeCursor(encodeCursor([1, 'two']))).toEqual([1, 'two']);
  });

  it('ignores the "=" padding a standard base64 encoder would add', () => {
    expect(decodeCursor('eyJhIjoxfQ==')).toEqual({ a: 1 });
  });

  it('throws on an empty cursor', () => {
    expect(() => decodeCursor('')).toThrow(SyntaxError);
  });

  it('throws on a cursor made only of characters outside the alphabet', () => {
    expect(() => decodeCursor('!!!***')).toThrow(SyntaxError);
  });

  it('throws when the decoded bytes are not JSON', () => {
    // "bm90LWpzb24" is base64url for the text "not-json".
    expect(() => decodeCursor('bm90LWpzb24')).toThrow(SyntaxError);
  });
});
