import { describe, expect, it } from 'vitest';

// Cumulative smoke suite (04-handoff-and-validation.md §3.1). Every other
// package imports this one through its single `.` entry point
// (packages/contracts/package.json `exports`), so the smoke assertion is:
// the whole public surface (Result, errors, actor, config, a command
// schema) loads through that one entry point and works together.
import {
  ANONYMOUS_ACTOR,
  DEFAULT_CONFIG_VALUES,
  RegisterInput,
  capabilitiesForRole,
  err,
  ok,
} from './index';

describe('contracts package surface', () => {
  it('validates a command input, builds Results and resolves capabilities through the single entry point', () => {
    const parsed = RegisterInput.safeParse({
      email: 'shirin@example.com',
      password: 'correct-horse',
      username: 'shirin_88',
      displayName: 'Shirin',
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    });
    expect(parsed.success).toBe(true);

    const success = ok({ accountId: 'a1' });
    expect(success.ok).toBe(true);

    const failure = err('auth.invalid_credentials');
    expect(failure.ok).toBe(false);

    const anon = ANONYMOUS_ACTOR('en', 'c1');
    expect(anon.capabilities).toEqual([]);

    expect(capabilitiesForRole('super_admin', DEFAULT_CONFIG_VALUES.capabilities)).toContain(
      'config.write',
    );
  });
});
