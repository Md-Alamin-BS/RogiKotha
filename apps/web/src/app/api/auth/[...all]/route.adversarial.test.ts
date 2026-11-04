// @vitest-environment node
// Adversarial (T-101 Step 15, design § 12.2 angles 2 and 3): the `/api/auth/*` route in front of
// the pinned Better Auth on its memory adapter. The owned flows must stay closed however the path
// is spelled, and the one session read the route lets through must not hand the browser more than
// `getActor` would accept.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthGateway } from '@/server/better-auth/gateway';
import {
  buildTestLibrary,
  emptyStore,
  type TestLibrary,
} from '@/server/better-auth/library-test-support';
import { getContainer } from '@/server/container';

import { GET, POST } from './route';

const memory = vi.hoisted(() => {
  const state: { store: Record<string, Record<string, unknown>[]> } = { store: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.store) };
});

vi.mock('@/server/container', () => ({ getContainer: vi.fn() }));

const ORIGIN = 'http://localhost:3000';
const EMAIL = 'rumana.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOW = 20_000;

let library: TestLibrary;
let gateway: ReturnType<typeof createAuthGateway>;

beforeEach(() => {
  memory.store = emptyStore();
  library = buildTestLibrary();
  gateway = createAuthGateway(library.auth, library.logger);
  vi.mocked(getContainer).mockReturnValue({ auth: library.auth } as unknown as ReturnType<
    typeof getContainer
  >);
});

async function signedInCookie(status: 'active' | 'suspended' = 'active'): Promise<string> {
  const created = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
  if (!created.ok) throw new Error(`register failed: ${created.error.code}`);
  library.statuses.set(created.data.authUserId, 'active');
  const session = await gateway.createSession({ email: EMAIL, password: PASSWORD });
  if (!session.ok) throw new Error(`sign-in failed: ${session.error.code}`);
  library.statuses.set(created.data.authUserId, status);
  return session.data.setCookies.map((value) => value.split(';')[0]).join('; ');
}

function getSessionOverHttp(cookie: string): Promise<Response> {
  return GET(new Request(`${ORIGIN}/api/auth/get-session`, { headers: { cookie } }));
}

function sessionRow(): Record<string, unknown> {
  const row = memory.store.auth_sessions?.[0];
  if (!row) throw new Error('no session row');
  return row;
}

describe('the owned flows behind the /api/auth route, however the path is spelled', () => {
  it.each([
    '/api/auth/./sign-in/email',
    '/api/auth/get-session/../sign-in/email',
    '/api/auth/%2e%2e/auth/sign-in/email',
    '/api/auth/get-session%2F..%2Fsign-in%2Femail',
    '/api/auth//sign-in/email',
    '/api/auth/Sign-In/Email',
    '/api/auth/sign-in/email/',
    '/api/auth/%73ign-in/email',
  ])(
    'answers 404 for %s and creates no session for the right password',
    async (path) => {
      const cookie = await signedInCookie();
      memory.store.auth_sessions = [];

      const response = await POST(
        new Request(`${ORIGIN}${path}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: ORIGIN, cookie },
          body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
        }),
      );

      expect(response.status).toBe(404);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(memory.store.auth_sessions).toEqual([]);
    },
    SLOW,
  );
});

describe('the session read the route lets through (BR4.1, BR4.8, BR8.3, FD-096)', () => {
  it(
    "never hands the browser the session token or the holder's full address",
    async () => {
      const cookie = await signedInCookie();

      const body = await (await getSessionOverHttp(cookie)).text();

      expect(body).not.toContain(String(sessionRow().token));
      expect(body.toLowerCase()).not.toContain(EMAIL);
    },
    SLOW,
  );

  it(
    'answers no session for the old cookie of an account suspended after it signed in',
    async () => {
      const cookie = await signedInCookie('suspended');

      const body = (await (await getSessionOverHttp(cookie)).json()) as unknown;

      expect(body).toBeNull();
    },
    SLOW,
  );

  it(
    'answers no session 30 days after its creation, however recently it was refreshed',
    async () => {
      const cookie = await signedInCookie();
      const row = sessionRow();
      row.createdAt = new Date(Date.now() - 31 * DAY_MS);
      row.updatedAt = new Date(Date.now() - DAY_MS / 2);

      const body = (await (await getSessionOverHttp(cookie)).json()) as unknown;

      expect(body).toBeNull();
    },
    SLOW,
  );
});
