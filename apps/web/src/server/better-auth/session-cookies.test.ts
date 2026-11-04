// @vitest-environment node
// Review R-06: sign-out must expire the session cookies under both spellings, and a `__Secure-`
// cookie only with `Secure`, or the browser keeps it.
import type { Db } from '@rogikotha/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthInstance } from './instance';
import { fastHasher, recordingLogger, TEST_SECRET } from './library-test-support';
import { clearSessionCookies } from './session-cookies';

const jar = vi.hoisted(() => ({ deleted: [] as Record<string, unknown>[] }));

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({
      delete: (options: Record<string, unknown>) => jar.deleted.push(options),
    }),
}));

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter({}) };
});

function libraryOn(appUrl: string) {
  return createAuthInstance({
    db: {} as Db,
    secret: TEST_SECRET,
    appUrl,
    hasher: fastHasher,
    logger: recordingLogger(),
    accountStatusOf: () => Promise.resolve(null),
  });
}

beforeEach(() => {
  jar.deleted = [];
});

describe('clearSessionCookies', () => {
  it('expires both cookies under both spellings, Secure only on the __Secure- ones', async () => {
    await clearSessionCookies(libraryOn('https://demo.example.test'));

    expect(jar.deleted.map((c) => [c.name, c.secure, c.path])).toEqual([
      ['rk.session_token', false, '/'],
      ['__Secure-rk.session_token', true, '/'],
      ['rk.session_data', false, '/'],
      ['__Secure-rk.session_data', true, '/'],
    ]);
  });

  it('clears the same names when the library runs on plain http', async () => {
    await clearSessionCookies(libraryOn('http://localhost:3000'));

    expect(jar.deleted.map((c) => c.name)).toEqual([
      'rk.session_token',
      '__Secure-rk.session_token',
      'rk.session_data',
      '__Secure-rk.session_data',
    ]);
    expect(jar.deleted.every((c) => c.httpOnly === true && c.sameSite === 'lax')).toBe(true);
  });
});
