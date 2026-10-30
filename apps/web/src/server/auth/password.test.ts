// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

describe('password hashing (Argon2id, the seed parameters)', () => {
  it('stores an Argon2id hash with m=64 MiB, t=3, p=1, never the password itself', async () => {
    const stored = await hashPassword('demo-pass-2026!');
    expect(stored).toMatch(/^\$argon2id\$v=19\$m=65536,t=3,p=1\$/);
    expect(stored).not.toContain('demo-pass-2026!');
  });

  it('accepts the right password and refuses a wrong one', async () => {
    const stored = await hashPassword('demo-pass-2026!');
    await expect(verifyPassword(stored, 'demo-pass-2026!')).resolves.toBe(true);
    await expect(verifyPassword(stored, 'demo-pass-2027!')).resolves.toBe(false);
  });

  it('reads a stored value that is not an Argon2 hash as a failed sign-in, not an error', async () => {
    await expect(verifyPassword('not-a-hash', 'demo-pass-2026!')).resolves.toBe(false);
  });
});
