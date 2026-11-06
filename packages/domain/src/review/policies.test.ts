import { describe, expect, it } from 'vitest';

import { distribution, distributionFromCounts, isLimitedData } from './policies';

const SENTIMENTS = ['positive', 'mixed', 'negative'] as const;

describe('distribution', () => {
  it('carries every key with zero when nobody gave a value', () => {
    const dist = distribution([], SENTIMENTS, 5);
    expect(dist.counts).toEqual({ positive: 0, mixed: 0, negative: 0 });
    expect(dist).toMatchObject({ total: 0, notProvided: 0, empty: true, limitedData: false });
  });

  it('counts each known value once and ignores values outside the keys', () => {
    const dist = distribution(['positive', 'positive', 'mixed', 'great'], SENTIMENTS, 5);
    expect(dist.counts).toEqual({ positive: 2, mixed: 1, negative: 0 });
    expect(dist.total).toBe(3);
  });

  it('counts an absent value as not provided, outside the denominator', () => {
    const dist = distribution(['negative', null, undefined], SENTIMENTS, 5);
    expect(dist.total).toBe(1);
    expect(dist.notProvided).toBe(2);
    expect(dist.empty).toBe(false);
  });

  it('marks limited data at 4 of 5 but not at 5 of 5', () => {
    expect(distribution(Array(4).fill('mixed'), SENTIMENTS, 5).limitedData).toBe(true);
    expect(distribution(Array(5).fill('mixed'), SENTIMENTS, 5).limitedData).toBe(false);
  });

  it('builds the same summary from grouped counts', () => {
    const dist = distributionFromCounts({ positive: 3, other: 9 }, 1, SENTIMENTS, 5);
    expect(dist.counts).toEqual({ positive: 3, mixed: 0, negative: 0 });
    expect(dist).toMatchObject({ total: 3, notProvided: 1, limitedData: true });
  });
});

describe('isLimitedData', () => {
  it('is false for no accounts, true below the threshold and false at it', () => {
    expect(isLimitedData(0, 5)).toBe(false);
    expect(isLimitedData(4, 5)).toBe(true);
    expect(isLimitedData(5, 5)).toBe(false);
  });
});
