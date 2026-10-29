import { describe, expect, it } from 'vitest';

import { InternalError } from './errors';
import { addDays, fromIso, monthYear, toIso } from './time';

function aDate(iso = '2026-09-13T12:34:56.789Z'): Date {
  return new Date(iso);
}

describe('toIso', () => {
  it('renders UTC with millisecond precision', () => {
    expect(toIso(aDate())).toBe('2026-09-13T12:34:56.789Z');
  });

  it('converts an offset instant to UTC', () => {
    expect(toIso(aDate('2026-09-13T06:00:00+06:00'))).toBe('2026-09-13T00:00:00.000Z');
  });
});

describe('fromIso', () => {
  it('parses what toIso produced back to the same instant', () => {
    const original = aDate();
    expect(fromIso(toIso(original)).getTime()).toBe(original.getTime());
  });

  it('throws an InternalError naming the bad input', () => {
    expect(() => fromIso('next tuesday')).toThrow(InternalError);
    expect(() => fromIso('next tuesday')).toThrow(/next tuesday/);
  });

  it('throws on an empty string', () => {
    expect(() => fromIso('')).toThrow(InternalError);
  });
});

describe('addDays', () => {
  it('moves forward across a month boundary', () => {
    expect(toIso(addDays(aDate('2026-01-30T10:00:00.000Z'), 3))).toBe('2026-02-02T10:00:00.000Z');
  });

  it('moves backward when the count is negative', () => {
    expect(toIso(addDays(aDate('2026-03-01T10:00:00.000Z'), -1))).toBe('2026-02-28T10:00:00.000Z');
  });

  it('returns an equal date for zero days', () => {
    expect(addDays(aDate(), 0).getTime()).toBe(aDate().getTime());
  });

  it('does not mutate the date it was given', () => {
    const original = aDate();
    const before = original.getTime();
    const result = addDays(original, 10);
    expect(original.getTime()).toBe(before);
    expect(result).not.toBe(original);
  });
});

describe('monthYear', () => {
  it('numbers months from 1', () => {
    expect(monthYear(aDate('2026-01-15T00:00:00.000Z'))).toEqual({ year: 2026, month: 1 });
    expect(monthYear(aDate('2026-12-15T00:00:00.000Z'))).toEqual({ year: 2026, month: 12 });
  });

  it('reads the UTC month, not the local one', () => {
    expect(monthYear(aDate('2026-09-30T23:59:59.999Z'))).toEqual({ year: 2026, month: 9 });
    expect(monthYear(aDate('2026-10-01T00:00:00.000Z'))).toEqual({ year: 2026, month: 10 });
  });
});
