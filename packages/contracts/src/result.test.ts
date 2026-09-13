import { describe, expect, it } from 'vitest';

import { err, ok, unwrap } from './result.js';

describe('err', () => {
  it('derives the message key from the code', () => {
    const result = err('auth.invalid_credentials');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('auth.invalid_credentials');
      expect(result.error.messageKey).toBe('errors.auth.invalidCredentials');
      expect(result.error.correlationId).toEqual(expect.any(String));
    }
  });

  it('maps a code with no prefix to the common namespace', () => {
    const result = err('not_found');
    if (!result.ok) {
      expect(result.error.messageKey).toBe('errors.common.notFound');
    }
  });
});

describe('unwrap', () => {
  it('throws on error results', () => {
    expect(() => unwrap(err('forbidden'))).toThrow(/forbidden/);
  });

  it('returns the data of an ok result', () => {
    expect(unwrap(ok({ value: 1 }))).toEqual({ value: 1 });
  });
});
