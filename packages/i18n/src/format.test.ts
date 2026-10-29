import { describe, expect, it } from 'vitest';
import {
  countParams,
  formatDate,
  formatDigits,
  formatMonthYear,
  formatNumber,
  formatRelative,
} from './format';

describe('formatNumber', () => {
  it('formatNumber renders Bengali digits for bn', () => {
    expect(formatNumber(1234, 'bn')).toBe('১,২৩৪');
    expect(formatNumber(5, 'bn')).toBe('৫');
    expect(formatNumber(0, 'bn')).toBe('০');
  });

  it('formatNumber keeps Latin digits for en', () => {
    expect(formatNumber(1234, 'en')).toBe('1,234');
    expect(formatNumber(5, 'en')).toBe('5');
  });
});

describe('formatMonthYear', () => {
  it("formatMonthYear matches the prototype's March 2026 / মার্চ ২০২৬", () => {
    expect(formatMonthYear({ year: 2026, month: 3 }, 'en')).toBe('March 2026');
    expect(formatMonthYear({ year: 2026, month: 3 }, 'bn')).toBe('মার্চ ২০২৬');
  });

  it('matches every other period value seen in the prototype corpus', () => {
    expect(formatMonthYear({ year: 2026, month: 1 }, 'en')).toBe('January 2026');
    expect(formatMonthYear({ year: 2026, month: 1 }, 'bn')).toBe('জানুয়ারি ২০২৬');
    expect(formatMonthYear({ year: 2025, month: 11 }, 'en')).toBe('November 2025');
    expect(formatMonthYear({ year: 2025, month: 11 }, 'bn')).toBe('নভেম্বর ২০২৫');
    expect(formatMonthYear({ year: 2026, month: 8 }, 'bn')).toBe('আগস্ট ২০২৬');
  });

  it('rejects an out-of-range month', () => {
    expect(() => formatMonthYear({ year: 2026, month: 0 }, 'en')).toThrow(RangeError);
    expect(() => formatMonthYear({ year: 2026, month: 13 }, 'en')).toThrow(RangeError);
  });
});

describe('formatRelative', () => {
  it('formatRelative says 12 minutes ago in both locales', () => {
    const from = new Date('2026-09-13T10:00:00Z');
    const to = new Date('2026-09-13T10:12:00Z');
    expect(formatRelative(from, to, 'en')).toBe('12 minutes ago');
    expect(formatRelative(from, to, 'bn')).toBe('১২ মিনিট আগে');
  });

  it('uses singular "minute"/"hour"/"day" for a value of 1', () => {
    const from = new Date('2026-09-13T10:00:00Z');
    expect(formatRelative(from, new Date('2026-09-13T10:01:00Z'), 'en')).toBe('1 minute ago');
    expect(formatRelative(from, new Date('2026-09-13T11:00:00Z'), 'en')).toBe('1 hour ago');
    expect(formatRelative(from, new Date('2026-09-14T10:00:00Z'), 'en')).toBe('1 day ago');
  });

  it('buckets into hours at 60 minutes and days at 24 hours', () => {
    const from = new Date('2026-09-13T00:00:00Z');
    expect(formatRelative(from, new Date('2026-09-13T03:00:00Z'), 'en')).toBe('3 hours ago');
    expect(formatRelative(from, new Date('2026-09-13T03:00:00Z'), 'bn')).toBe('৩ ঘণ্টা আগে');
    expect(formatRelative(from, new Date('2026-09-15T00:00:00Z'), 'en')).toBe('2 days ago');
    expect(formatRelative(from, new Date('2026-09-15T00:00:00Z'), 'bn')).toBe('২ দিন আগে');
  });
});

describe('formatDate', () => {
  it('matches the prototype\'s "21 August 2026" / "২১ আগস্ট ২০২৬"', () => {
    expect(formatDate('2026-08-21', 'en')).toBe('21 August 2026');
    expect(formatDate('2026-08-21', 'bn')).toBe('২১ আগস্ট ২০২৬');
  });

  it('rejects a non-ISO string', () => {
    expect(() => formatDate('21 August 2026', 'en')).toThrow(RangeError);
  });
});

describe('formatDigits', () => {
  it('substitutes digits only, keeping a leading zero and a hyphen intact', () => {
    expect(formatDigits('09612-119911', 'bn')).toBe('০৯৬১২-১১৯৯১১');
    expect(formatDigits('09612-119911', 'en')).toBe('09612-119911');
  });

  it('does not add thousands grouping (unlike formatNumber)', () => {
    expect(formatDigits('16263', 'bn')).toBe('১৬২৬৩');
  });
});

describe('countParams', () => {
  it('countParams returns localized digit strings', () => {
    expect(countParams(3, 5, 'en')).toEqual({ count: '3', total: '5' });
    expect(countParams(3, 5, 'bn')).toEqual({ count: '৩', total: '৫' });
  });
});
