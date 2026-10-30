import { describe, expect, it } from 'vitest';
import { periodOptions, periodValue } from './period';

describe('the treatment period choices', () => {
  const now = new Date(Date.UTC(2026, 2, 15));

  it('start at the current month and never offer a future one', () => {
    const options = periodOptions(now, 'en');
    expect(options[0]).toEqual({ value: '2026-03', label: 'March 2026' });
    expect(options.some((o) => o.value === '2026-04')).toBe(false);
  });

  it('go back to January ten years ago', () => {
    const options = periodOptions(now, 'en');
    expect(options.at(-1)).toEqual({ value: '2016-01', label: 'January 2016' });
    expect(options).toHaveLength(3 + 12 * 10);
  });

  it('label the months with Bengali numerals in Bengali', () => {
    expect(periodOptions(now, 'bn')[0]).toEqual({ value: '2026-03', label: 'মার্চ ২০২৬' });
  });

  it('pads the month in the submitted value', () => {
    expect(periodValue(2025, 7)).toBe('2025-07');
  });
});
