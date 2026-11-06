// @vitest-environment node
// Adversarial tests: try to reach Better Auth around the commands (ISS-391, BR7.1, BR7.9), to
// learn from the logs whether an email is registered (NFR3), and to be sent off-site after signing
// in. They run the pinned library with this Unit's options on its memory adapter, as if the
// `/api/auth` route's allowlist had let a request through; the commands' own rules are tested in
// `@rogikotha/application`.
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthGateway } from '../better-auth/gateway';
import {
  buildTestLibrary,
  emptyStore,
  TEST_APP_URL,
  type TestLibrary,
} from '../better-auth/library-test-support';
import { applySessionEffect, runCommand } from '../command-call';
import { getContainer } from '../container';
import { signIn } from './auth';
import { INITIAL_AUTH_STATE, safeNextPath } from './auth-form';

const memory = vi.hoisted(() => {
  const state: { store: Record<string, Record<string, unknown>[]> } = { store: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.store) };
});
vi.mock('../container', () => ({ getContainer: vi.fn() }));
vi.mock('../command-call', () => ({ runCommand: vi.fn(), applySessionEffect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// T-102: a successful sign-in also deletes the `rk.pending` cookie.
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, set: vi.fn(), delete: vi.fn() }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn(() => Promise.resolve('en')) }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const EMAIL = 'nadia.islam@example.test';
const PASSWORD = 'a long enough secret';
const SLOW = 30_000;

/** Every library path a command owns, as an attacker would call it past the forms. */
const COMMAND_OWNED_PATHS = [
  '/sign-up/email',
  '/sign-in/email',
  '/request-password-reset',
  '/reset-password',
  '/verify-email',
  '/send-verification-email',
  '/change-password',
  '/update-user',
  '/delete-user',
  '/revoke-sessions',
  '/list-sessions',
];

let library: TestLibrary;

/** A POST straight to the library's handler, past the route's allowlist. */
function postPastTheRoute(path: string, body: unknown): Promise<Response> {
  return library.auth.handler(
    new Request(`${TEST_APP_URL}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: TEST_APP_URL },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  memory.store = emptyStore();
  library = buildTestLibrary();
});

describe('reaching Better Auth around the commands (BR7.1, BR7.9)', () => {
  it.each(COMMAND_OWNED_PATHS)(
    'answers 404 from the library itself for %s and writes no row',
    async (path) => {
      const response = await postPastTheRoute(path, {
        email: EMAIL,
        password: PASSWORD,
        newPassword: PASSWORD,
        name: 'Unchecked Name',
      });

      expect(response.status).toBe(404);
      expect(memory.store.auth_users).toEqual([]);
      expect(memory.store.auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    'creates no user when server code calls the library sign-up directly, outside the gateway',
    async () => {
      await expect(
        library.auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: '' } }),
      ).rejects.toThrow();

      expect(memory.store.auth_users).toEqual([]);
    },
    SLOW,
  );

  it(
    'opens no session when server code calls the library sign-in directly with the right password',
    async () => {
      const gateway = createAuthGateway(library.auth, library.logger);
      const created = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
      if (!created.ok) throw new Error(created.error.code);
      library.statuses.set(created.data.authUserId, 'active');

      await expect(
        library.auth.api.signInEmail({ body: { email: EMAIL, password: PASSWORD } }),
      ).rejects.toThrow();

      expect(memory.store.auth_sessions).toEqual([]);
    },
    SLOW,
  );
});

describe('learning from the logs whether an email is registered (NFR3, BR8.1)', () => {
  it(
    'writes neither the address nor the password anywhere across a duplicate registration and a wrong sign-in',
    async () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => undefined),
      );
      const gateway = createAuthGateway(library.auth, library.logger);

      await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
      const again = await gateway.createCredentialUser({
        email: EMAIL,
        password: 'other secret 1',
      });
      const wrong = await gateway.createSession({ email: EMAIL, password: 'not the right one' });

      const logged = JSON.stringify([
        spies.flatMap((spy) => spy.mock.calls),
        library.logger.lines,
      ]).toLowerCase();
      for (const spy of spies) spy.mockRestore();
      expect(again).toEqual({ ok: false, error: { code: 'email_exists' } });
      expect(wrong).toEqual({ ok: false, error: { code: 'invalid_credentials' } });
      expect(logged).not.toContain(EMAIL);
      expect(logged).not.toContain(PASSWORD);
    },
    SLOW,
  );
});

describe('being sent off-site after signing in (FR1.2, open redirect)', () => {
  it.each(['/.//evil.example', '/..//evil.example', '/%2e//evil.example', '/en/..//evil.example'])(
    'never hands back a protocol-relative address for %j',
    (raw) => {
      const next = safeNextPath(raw);
      expect(next === null || !next.startsWith('//')).toBe(true);
    },
  );

  it('never redirects a signed-in reader to another site when the action receives a dot-segment next', async () => {
    vi.mocked(runCommand).mockResolvedValue({
      ok: true,
      data: { session: { kind: 'set', setCookies: [] } },
    });
    // The account's language, read when there is no page to return to.
    vi.mocked(getContainer).mockReturnValue({
      ports: {
        accounts: { findByEmail: () => Promise.resolve(null) },
        unitOfWork: { read: (work: (tx: unknown) => unknown) => work({}) },
      },
    } as unknown as ReturnType<typeof getContainer>);
    const form = new FormData();
    form.set('email', EMAIL);
    form.set('password', PASSWORD);
    form.set('next', '/.//evil.example');

    await expect(signIn(INITIAL_AUTH_STATE, form)).rejects.toThrow('NEXT_REDIRECT');

    expect(applySessionEffect).toHaveBeenCalledTimes(1);
    const targets = vi.mocked(redirect).mock.calls.map(([target]) => String(target));
    expect(targets.filter((target) => target.startsWith('//'))).toEqual([]);
  });
});
