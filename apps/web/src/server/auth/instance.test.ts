// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getAuth } from './instance';
import { verifyPassword } from './password';

const ENV = {
  APP_URL: 'http://localhost:3000',
  // A test-only value; Better Auth wants at least 32 characters.
  BETTER_AUTH_SECRET: 'test-secret-for-the-instance-test-0123456789',
  // Never connected: these tests read the configuration only.
  DATABASE_URL: 'postgres://nobody:nothing@127.0.0.1:1/none',
};

describe('the Better Auth instance', () => {
  const saved: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const [name, value] of Object.entries(ENV)) {
      saved[name] = process.env[name];
      process.env[name] = value;
    }
  });

  afterAll(() => {
    for (const name of Object.keys(ENV)) process.env[name] = saved[name];
  });

  // The instance is created lazily, so the variables above are in place by the first call.
  function loadAuth() {
    return Promise.resolve(getAuth());
  }

  it('is created once and reused', async () => {
    expect(await loadAuth()).toBe(await loadAuth());
  });

  it('offers email and password sign-up without email verification and a 10-character floor', async () => {
    const { emailAndPassword } = (await loadAuth()).options;
    expect(emailAndPassword).toMatchObject({
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
    });
  });

  it('maps the four Better Auth models onto the auth_* tables', async () => {
    const { user, session, account, verification } = (await loadAuth()).options;
    expect([
      user?.modelName,
      session?.modelName,
      account?.modelName,
      verification?.modelName,
    ]).toEqual(['auth_users', 'auth_sessions', 'auth_accounts', 'auth_verifications']);
  });

  it('sets an httpOnly, sameSite=lax session cookie that is not marked secure on plain http', async () => {
    const context = await (await loadAuth()).$context;
    const { name, attributes } = context.authCookies.sessionToken;
    expect(name).toBe('rk.session_token');
    expect(attributes).toMatchObject({ httpOnly: true, sameSite: 'lax' });
    expect(attributes.secure).toBeFalsy();
  });

  it('hashes new passwords with Argon2id, so seeded and new accounts verify the same way', async () => {
    const context = await (await loadAuth()).$context;
    const stored = await context.password.hash('a-new-password-1');
    expect(stored.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(stored, 'a-new-password-1')).resolves.toBe(true);
  });
});
