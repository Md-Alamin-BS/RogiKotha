import { describe, expect, it } from 'vitest';

import { InternalError } from './errors';

describe('InternalError', () => {
  it('is an Error that carries its message and a stable name', () => {
    const error = new InternalError('invariant broken');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('invariant broken');
    expect(error.name).toBe('InternalError');
  });

  it('keeps the underlying cause when one is given', () => {
    const cause = new TypeError('root cause');
    expect(new InternalError('wrapped', { cause }).cause).toBe(cause);
  });

  it('has no cause when none is given', () => {
    expect(new InternalError('plain').cause).toBeUndefined();
  });
});
