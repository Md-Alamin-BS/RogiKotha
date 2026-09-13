import { describe, expect, it } from 'vitest';

import { ConfigValuesSchema, DEFAULT_CONFIG_VALUES } from './config-values';

describe('ConfigValuesSchema', () => {
  it('parses the defaults', () => {
    const result = ConfigValuesSchema.safeParse(DEFAULT_CONFIG_VALUES);
    expect(result.success).toBe(true);
  });

  it('fails when a threshold is out of range', () => {
    const result = ConfigValuesSchema.safeParse({
      ...DEFAULT_CONFIG_VALUES,
      thresholds: { ...DEFAULT_CONFIG_VALUES.thresholds, fiveAccountHide: 1 },
    });
    expect(result.success).toBe(false);
  });

  it('fails when an unknown key is present', () => {
    const result = ConfigValuesSchema.safeParse({
      ...DEFAULT_CONFIG_VALUES,
      notARealKey: true,
    });
    expect(result.success).toBe(false);
  });
});
