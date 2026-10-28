import { describe, expect, it } from 'vitest';

import { formatDate } from './format';

describe('formatDate month range', () => {
  it.each(['2026-00-15', '2026-13-15'])('rejects the impossible month in %s', (isoDate) => {
    expect(() => formatDate(isoDate, 'en')).toThrow(RangeError);
    expect(() => formatDate(isoDate, 'bn')).toThrow(/month must be 1-12/);
  });

  it('accepts the first and last month of the year', () => {
    expect(formatDate('2026-01-01', 'en')).toBe('1 January 2026');
    expect(formatDate('2026-12-31', 'bn')).toBe('৩১ ডিসেম্বর ২০২৬');
  });
});
