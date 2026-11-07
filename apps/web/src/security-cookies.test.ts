// @vitest-environment node
// The session cookie posture and trusted origins (BR3.7, BR5.1, design § 4.3): the pinned Better
// Auth on its memory adapter with this app's options, for an http and an https APP_URL.
// ASSUMPTION(U41): the plan puts this file in `server/`, but `web-server` may not import the auth
// route in `app/` (eslint.boundaries.mjs), so it sits in the `web` element beside the proxy.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/auth/[...all]/route';
import { createAuthGateway } from '@/server/better-auth/gateway';
import {
  createAuthInstance,
  type AuthInstance,
  type AuthInstanceDeps,
} from '@/server/better-auth/instance';
import {
  buildTestLibrary,
  emptyStore,
  fastHasher,
  recordingLogger,
  TEST_APP_URL,
  TEST_SECRET,
  type TestLibrary,
} from '@/server/better-auth/library-test-support';
import { getContainer } from '@/server/container';
import type { AccountStatus } from '@rogikotha/contracts';

const memory = vi.hoisted(() => {
  const state: { store: Record<string, Record<string, unknown>[]> } = { store: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.store) };
});

vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

const HTTPS_APP_URL = 'https://demo.rogikotha.local';
const EMAIL = 'nasrin.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 20_000;

// ASSUMPTION(U41): `buildTestLibrary` is pinned to http://localhost:3000 and `server/better-auth/*`
// is not edited, so the https library is built here with the same options.
function httpsLibrary(): TestLibrary {
  const logger = recordingLogger();
  const statuses = new Map<string, AccountStatus>();
  const auth: AuthInstance = createAuthInstance({
    db: {} as AuthInstanceDeps['db'],
    secret: TEST_SECRET,
    appUrl: HTTPS_APP_URL,
    hasher: fastHasher,
    logger,
    accountStatusOf: (authUserId) => Promise.resolve(statuses.get(authUserId) ?? null),
  });
  return { auth, logger, statuses };
}

interface ParsedCookie {
  name: string;
  attributes: Map<string, string>;
}

function parseSetCookie(header: string): ParsedCookie {
  const [pair = '', ...rest] = header.split(';').map((part) => part.trim());
  const attributes = new Map<string, string>();
  for (const part of rest) {
    const [key = '', value = ''] = part.split('=');
    attributes.set(key.toLowerCase(), value);
  }
  return { name: pair.slice(0, pair.indexOf('=')), attributes };
}

async function sessionCookieOf(library: TestLibrary): Promise<ParsedCookie> {
  const gateway = createAuthGateway(library.auth, library.logger);
  const created = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
  if (!created.ok) throw new Error(`register failed: ${created.error.code}`);
  library.statuses.set(created.data.authUserId, 'active');
  const session = await gateway.createSession({ email: EMAIL, password: PASSWORD });
  if (!session.ok) throw new Error(`sign-in failed: ${session.error.code}`);
  const cookies = session.data.setCookies.map(parseSetCookie);
  const token = cookies.find((cookie) => cookie.name.endsWith('rk.session_token'));
  if (token === undefined) throw new Error('no session cookie was set');
  return token;
}

beforeEach(() => {
  memory.store = emptyStore();
});

describe.each([
  { appUrl: TEST_APP_URL, build: buildTestLibrary, name: 'rk.session_token', secure: false },
  { appUrl: HTTPS_APP_URL, build: httpsLibrary, name: '__Secure-rk.session_token', secure: true },
])('the session cookie for $appUrl', ({ appUrl, build, name, secure }) => {
  it(
    `is named ${name}, HttpOnly, SameSite=Lax, on / and has no Domain`,
    async () => {
      const cookie = await sessionCookieOf(build());

      expect(cookie.name).toBe(name);
      expect(cookie.attributes.has('httponly')).toBe(true);
      expect(cookie.attributes.get('samesite')?.toLowerCase()).toBe('lax');
      expect(cookie.attributes.get('path')).toBe('/');
      expect(cookie.attributes.has('domain')).toBe(false);
      expect(cookie.attributes.has('secure')).toBe(secure);
    },
    SLOW,
  );

  it('trusts only APP_URL as an origin', async () => {
    const { trustedOrigins } = await build().auth.$context;
    expect([...new Set(trustedOrigins)]).toEqual([appUrl]);
  });
});

describe('the library session read over HTTP', () => {
  it('answers /api/auth/get-session with a 404 and never reaches the library', async () => {
    const handler = vi.fn(() => Promise.resolve(new Response('handled', { status: 200 })));
    vi.mocked(getContainer).mockReturnValue({ auth: { handler } } as unknown as ReturnType<
      typeof getContainer
    >);

    const response = await GET(new Request(`${TEST_APP_URL}/api/auth/get-session`));

    expect(response.status).toBe(404);
    expect(handler).not.toHaveBeenCalled();
  });
});
