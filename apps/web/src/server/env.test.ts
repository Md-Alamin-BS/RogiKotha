// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { optionalEnv, requireEnv } from './env';

describe('server environment', () => {
  it('returns a variable that is set', () => {
    process.env.RK_ENV_TEST_PRESENT = 'value';
    expect(requireEnv('RK_ENV_TEST_PRESENT')).toBe('value');
    expect(optionalEnv('RK_ENV_TEST_PRESENT')).toBe('value');
    delete process.env.RK_ENV_TEST_PRESENT;
  });

  it('names the missing variable instead of running without it', () => {
    expect(() => requireEnv('RK_ENV_TEST_NEVER_SET')).toThrow('RK_ENV_TEST_NEVER_SET is not set');
  });

  it('reads a missing optional variable as undefined', () => {
    expect(optionalEnv('RK_ENV_TEST_NEVER_SET')).toBeUndefined();
  });
});
