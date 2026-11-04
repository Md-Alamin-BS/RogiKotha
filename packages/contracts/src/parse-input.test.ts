import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { fieldErrorsFromIssues, parseInput } from './parse-input';

const TwoFieldInput = z
  .object({
    password: z.string().min(10, { error: 'errors.auth.passwordTooShort' }),
    username: z.string().min(3, { error: 'errors.auth.usernameInvalid' }),
  })
  .strict();

function twoFieldInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { password: 'long-enough-1', username: 'shirin_88', ...overrides };
}

describe('parseInput', () => {
  it('returns the parsed value when the input is valid', () => {
    const result = parseInput(TwoFieldInput, twoFieldInput());
    expect(result).toEqual({ ok: true, data: twoFieldInput() });
  });

  it('answers one field problem with that field key and its own error code', () => {
    const result = parseInput(TwoFieldInput, twoFieldInput({ password: 'short' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('auth.password_too_short');
    expect(result.error.fieldErrors).toEqual({ password: 'errors.auth.passwordTooShort' });
  });

  it('answers several field problems with validation and every field key', () => {
    const result = parseInput(TwoFieldInput, twoFieldInput({ password: 'short', username: 'x' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
    expect(result.error.fieldErrors).toEqual({
      password: 'errors.auth.passwordTooShort',
      username: 'errors.auth.usernameInvalid',
    });
  });

  it('answers an unknown key with validation and no field errors', () => {
    const result = parseInput(TwoFieldInput, twoFieldInput({ extra: 1 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
    expect(result.error.fieldErrors).toBeUndefined();
  });

  it('carries the caller correlation id on the error', () => {
    const result = parseInput(TwoFieldInput, null, { correlationId: 'corr-1' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.correlationId).toBe('corr-1');
  });
});

describe('fieldErrorsFromIssues', () => {
  it('replaces an English default message with the generic validation key', () => {
    const parsed = z.object({ age: z.number() }).safeParse({ age: 'ten' });
    expect(parsed.success).toBe(false);
    expect(fieldErrorsFromIssues(parsed.error?.issues ?? [])).toEqual({
      age: 'errors.common.validation',
    });
  });

  it('keeps only the first problem of a field and joins nested paths with dots', () => {
    const Nested = z.object({
      inner: z.object({
        code: z
          .string()
          .min(3, { error: 'errors.auth.usernameInvalid' })
          .regex(/^[a-z]+$/, { error: 'errors.auth.tokenInvalid' }),
      }),
    });
    const parsed = Nested.safeParse({ inner: { code: '1' } });
    expect(fieldErrorsFromIssues(parsed.error?.issues ?? [])).toEqual({
      'inner.code': 'errors.auth.usernameInvalid',
    });
  });
});
