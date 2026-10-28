import { describe, expect, it } from 'vitest';

import { err, isOk, ok } from './result';

describe('isOk', () => {
  it('is true for an ok result', () => {
    expect(isOk(ok('value'))).toBe(true);
  });

  it('is false for an error result', () => {
    expect(isOk(err('not_found'))).toBe(false);
  });
});

describe('ok', () => {
  it('omits meta when none is given', () => {
    expect(ok('value')).toEqual({ ok: true, data: 'value' });
    expect('meta' in ok('value')).toBe(false);
  });

  it('carries page meta when given', () => {
    expect(ok(['a'], { nextCursor: 'abc', total: 1 })).toEqual({
      ok: true,
      data: ['a'],
      meta: { nextCursor: 'abc', total: 1 },
    });
  });
});

describe('err', () => {
  it('keeps field errors, retry hint and the supplied correlation id', () => {
    const result = err('rate_limited', {
      fieldErrors: { email: 'errors.auth.usernameInvalid' },
      retryAfterSec: 30,
      correlationId: 'corr-1',
    });
    expect(result).toEqual({
      ok: false,
      error: {
        code: 'rate_limited',
        messageKey: 'errors.common.rateLimited',
        correlationId: 'corr-1',
        fieldErrors: { email: 'errors.auth.usernameInvalid' },
        retryAfterSec: 30,
      },
    });
  });

  it('leaves optional fields off the error when they are not given', () => {
    const result = err('conflict');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect('fieldErrors' in result.error).toBe(false);
      expect('retryAfterSec' in result.error).toBe(false);
    }
  });

  it('gives each error a fresh correlation id', () => {
    const first = err('internal');
    const second = err('internal');
    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);
    if (!first.ok && !second.ok) {
      expect(first.error.correlationId).not.toBe(second.error.correlationId);
    }
  });
});
