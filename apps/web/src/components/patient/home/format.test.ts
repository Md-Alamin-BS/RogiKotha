import { describe, expect, it } from 'vitest';
import { dhakaIsoDay, formatPublished } from './format';

describe('formatPublished', () => {
  it('dates a publication by the Dhaka calendar day, not the UTC one', () => {
    // 19:30 UTC on 31 May is 01:30 on 1 June in Dhaka (UTC+6).
    const lateUtc = new Date('2026-05-31T19:30:00Z');
    expect(dhakaIsoDay(lateUtc)).toBe('2026-06-01');
    expect(formatPublished(lateUtc, 'en')).toBe('1 June 2026');
  });

  it('writes the date in Bengali with Bengali numerals', () => {
    expect(formatPublished(new Date('2026-06-01T06:00:00Z'), 'bn')).toBe('১ জুন ২০২৬');
  });
});
