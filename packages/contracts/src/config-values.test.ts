import { describe, expect, it } from 'vitest';

import {
  ConfigValuesSchema,
  DEFAULT_CONFIG_VALUES,
  SignInSettingsSchema,
  type SignInSettings,
} from './config-values';

function signInSettings(overrides: Partial<SignInSettings> = {}): SignInSettings {
  return { ...DEFAULT_CONFIG_VALUES.signIn, ...overrides };
}

function acceptsSignIn(overrides: Partial<SignInSettings>): boolean {
  return SignInSettingsSchema.safeParse(signInSettings(overrides)).success;
}

describe('SignInSettingsSchema', () => {
  it('has the FD-063 defaults: delay after 3 failures, 15-minute window, 1 to 30 seconds, severe at 10', () => {
    expect(DEFAULT_CONFIG_VALUES.signIn).toEqual({
      delayAfterFailures: 3,
      windowMinutes: 15,
      firstDelaySeconds: 1,
      maxDelaySeconds: 30,
      severeFailures: 10,
    });
    expect(acceptsSignIn({})).toBe(true);
  });

  it('accepts a window of 15 to 1440 minutes and refuses 14 and 1441 (review point 2)', () => {
    expect(acceptsSignIn({ windowMinutes: 15 })).toBe(true);
    expect(acceptsSignIn({ windowMinutes: 1440 })).toBe(true);
    expect(acceptsSignIn({ windowMinutes: 14 })).toBe(false);
    expect(acceptsSignIn({ windowMinutes: 1441 })).toBe(false);
  });

  it('accepts a delay threshold of 1 to 9 failures and refuses 0 and 10', () => {
    expect(acceptsSignIn({ delayAfterFailures: 1 })).toBe(true);
    expect(acceptsSignIn({ delayAfterFailures: 9 })).toBe(true);
    expect(acceptsSignIn({ delayAfterFailures: 0 })).toBe(false);
    expect(acceptsSignIn({ delayAfterFailures: 10 })).toBe(false);
  });

  it('accepts a severe threshold of up to 10 and refuses 11, which the fixed limit could never reach', () => {
    expect(acceptsSignIn({ severeFailures: 10 })).toBe(true);
    expect(acceptsSignIn({ severeFailures: 11 })).toBe(false);
    expect(acceptsSignIn({ delayAfterFailures: 1, severeFailures: 2 })).toBe(true);
    expect(acceptsSignIn({ delayAfterFailures: 1, severeFailures: 1 })).toBe(false);
  });

  it('accepts a first delay of 1 to 60 seconds and a cap of 1 to 300 seconds', () => {
    expect(acceptsSignIn({ firstDelaySeconds: 1, maxDelaySeconds: 1 })).toBe(true);
    expect(acceptsSignIn({ firstDelaySeconds: 60, maxDelaySeconds: 300 })).toBe(true);
    expect(acceptsSignIn({ firstDelaySeconds: 0 })).toBe(false);
    expect(acceptsSignIn({ firstDelaySeconds: 61, maxDelaySeconds: 300 })).toBe(false);
    expect(acceptsSignIn({ maxDelaySeconds: 0 })).toBe(false);
    expect(acceptsSignIn({ maxDelaySeconds: 301 })).toBe(false);
  });

  it('refuses a cap below the first delay, naming maxDelaySeconds', () => {
    const result = SignInSettingsSchema.safeParse(
      signInSettings({ firstDelaySeconds: 10, maxDelaySeconds: 9 }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['maxDelaySeconds']);
  });

  it('refuses a severe threshold at or below the delay threshold, naming severeFailures', () => {
    const result = SignInSettingsSchema.safeParse(
      signInSettings({ delayAfterFailures: 5, severeFailures: 5 }),
    );
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join('.'))).toEqual(['severeFailures']);
  });

  it('refuses a fractional value and an unknown key', () => {
    expect(acceptsSignIn({ windowMinutes: 15.5 })).toBe(false);
    expect(SignInSettingsSchema.safeParse({ ...signInSettings(), captcha: true }).success).toBe(
      false,
    );
  });

  it('is required inside ConfigValues', () => {
    const withoutSignIn: Record<string, unknown> = { ...DEFAULT_CONFIG_VALUES };
    delete withoutSignIn.signIn;
    expect(ConfigValuesSchema.safeParse(withoutSignIn).success).toBe(false);
  });
});

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
