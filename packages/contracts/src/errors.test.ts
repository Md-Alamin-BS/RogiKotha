import { describe, expect, it } from 'vitest';

import { ERROR_CODES, errorMessageKey } from './errors';

describe('errorMessageKey', () => {
  it('every code maps to a key matching /^errors\\.[a-z]+\\.[a-zA-Z]+$/', () => {
    for (const code of ERROR_CODES) {
      expect(errorMessageKey(code)).toMatch(/^errors\.[a-z]+\.[a-zA-Z]+$/);
    }
  });

  it('maps auth.invalid_credentials to errors.auth.invalidCredentials', () => {
    expect(errorMessageKey('auth.invalid_credentials')).toBe('errors.auth.invalidCredentials');
  });
});
