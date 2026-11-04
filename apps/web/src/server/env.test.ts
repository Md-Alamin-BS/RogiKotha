// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { optionalEnv, readWebEnv, requireEnv, WebEnvError } from './env';

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

const APP_KEY = randomBytes(32).toString('base64');
const MAIL_KEY = randomBytes(32).toString('base64');

function buildVariables(overrides: Record<string, string | undefined> = {}) {
  const values: Record<string, string | undefined> = {
    DATABASE_URL: 'postgres://rk_app:synthetic@localhost:5432/rogikotha',
    APP_URL: 'http://localhost:3000/',
    BETTER_AUTH_SECRET: 'a-synthetic-secret-that-is-long-enough-0123',
    APP_ENCRYPTION_KEY: APP_KEY,
    MAIL_RECIPIENT_KEY: MAIL_KEY,
    TERMS_VERSION: '1',
    APP_MODE: 'demo',
    ...overrides,
  };
  return (name: string) => values[name];
}

function problemsOf(overrides: Record<string, string | undefined>): string[] {
  try {
    readWebEnv(buildVariables(overrides));
  } catch (error) {
    if (error instanceof WebEnvError) return error.problems;
    throw error;
  }
  return [];
}

describe('the web tier settings (BR7.2, FD-095)', () => {
  it('reads valid settings and drops the trailing slash of APP_URL', () => {
    const env = readWebEnv(buildVariables());

    expect(env.appUrl).toBe('http://localhost:3000');
    expect(env.encryptionKey).toHaveLength(32);
    expect(env.mailRecipientKey).toHaveLength(32);
    expect(env.termsVersion).toBe('1');
  });

  it.each([
    ['BETTER_AUTH_SECRET', { BETTER_AUTH_SECRET: 'too-short' }],
    ['APP_URL', { APP_URL: 'localhost:3000' }],
    ['APP_ENCRYPTION_KEY', { APP_ENCRYPTION_KEY: randomBytes(16).toString('base64') }],
    ['MAIL_RECIPIENT_KEY', { MAIL_RECIPIENT_KEY: undefined }],
    ['TERMS_VERSION', { TERMS_VERSION: '   ' }],
    ['DATABASE_URL', { DATABASE_URL: undefined }],
  ])('refuses to start when %s is not usable', (name, overrides) => {
    const problems = problemsOf(overrides);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(name);
  });

  it('refuses a mail key equal to the app key', () => {
    expect(problemsOf({ MAIL_RECIPIENT_KEY: APP_KEY })).toEqual([
      'MAIL_RECIPIENT_KEY must differ from APP_ENCRYPTION_KEY (FD-095)',
    ]);
  });

  it('names every bad variable at once and never prints a value', () => {
    const secret = 'short-secret-value';
    const error = (() => {
      try {
        readWebEnv(buildVariables({ BETTER_AUTH_SECRET: secret, TERMS_VERSION: undefined }));
      } catch (caught) {
        return caught as Error;
      }
      return null;
    })();

    expect(error?.message).toContain('BETTER_AUTH_SECRET');
    expect(error?.message).toContain('TERMS_VERSION');
    expect(error?.message).not.toContain(secret);
    expect(error?.message).not.toContain(APP_KEY);
  });
});
