// @vitest-environment node
// Adversarial tests (plan Step 13): try to learn whether an email is registered, to keep a session
// for a credential with no profile, and to be sent off-site after signing in. Unlike auth.test.ts
// these run the real Better Auth instance from `server/auth/instance.ts`, its real error codes,
// logger level and Argon2id hashing, on Better Auth's in-memory adapter instead of PostgreSQL.
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect } from 'next/navigation';
import type * as NextJsIntegration from 'better-auth/next-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuth } from '../auth/instance';
import { accounts, session } from '../data';
import { register, signIn } from './auth';
import { INITIAL_AUTH_STATE, safeNextPath } from './auth-form';

type Row = Record<string, unknown>;

const memory = vi.hoisted(() => {
  const state: { db: Record<string, Row[]> } = { db: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.db) };
});
// The cookie writer needs a live Next request; the tests read the session rows instead.
vi.mock('better-auth/next-js', async (importOriginal) => ({
  ...(await importOriginal<typeof NextJsIntegration>()),
  nextCookies: () => ({ id: 'next-cookies' }),
}));
vi.mock('../db', () => ({ getDb: () => ({}) }));
vi.mock('../env', () => ({
  requireEnv: (name: string) =>
    ({
      APP_URL: 'http://localhost:3000',
      BETTER_AUTH_SECRET: 'synthetic-adversarial-test-secret-0123456789',
    })[name] ?? '',
  optionalEnv: () => undefined,
}));
vi.mock('next/headers', () => ({ headers: vi.fn(), cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
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
vi.mock('../data', () => ({
  accounts: {
    createProfileForAuthUser: vi.fn(),
    isUsernameTaken: vi.fn(),
    removeAuthUserWithoutProfile: vi.fn(),
  },
  session: { getCurrentAccountByAuthUserId: vi.fn() },
}));

const APP_URL = 'http://localhost:3000';
const EMAIL = 'nadia.islam@example.test';
const PASSWORD = 'a long enough secret';
const SLOW = 30_000;

/** The profiles the fake data layer holds, by Better Auth user id. */
const profiles = new Map<string, DemoCurrentAccount>();

function freshMemoryDb(): Record<string, Row[]> {
  // Both the default model names and the `auth_*` names the instance maps them to.
  const tables = ['user', 'session', 'account', 'verification'];
  return Object.fromEntries(
    [...tables, ...tables.map((t) => `auth_${t}s`)].map((name) => [name, [] as Row[]]),
  );
}

function rows(model: 'user' | 'session'): Row[] {
  return [...(memory.db[model] ?? []), ...(memory.db[`auth_${model}s`] ?? [])];
}

function registerForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values = {
    email: EMAIL,
    password: PASSWORD,
    username: 'nadia_i',
    displayName: 'Nadia Islam',
    locale: 'en',
    age: 'on',
    terms: 'on',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function signInForm(email: string, password: string, extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set('email', email);
  form.set('password', password);
  for (const [name, value] of Object.entries(extra)) form.set(name, value);
  return form;
}

async function registerOnce(overrides: Record<string, string> = {}) {
  await expect(register(INITIAL_AUTH_STATE, registerForm(overrides))).rejects.toThrow(
    'NEXT_REDIRECT',
  );
}

/** What `app/api/auth/[...all]/route.ts` does with every POST to /api/auth/*. */
function postToAuthRoute(path: string, body: unknown): Promise<Response> {
  return getAuth().handler(
    new Request(`${APP_URL}/api/auth${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: APP_URL },
      body: JSON.stringify(body),
    }),
  );
}

function everythingLogged(spies: { mock: { calls: unknown[][] } }[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls)).toLowerCase();
}

beforeEach(async () => {
  vi.clearAllMocks();
  memory.db = freshMemoryDb();
  profiles.clear();
  delete (globalThis as { __rkAuth?: unknown }).__rkAuth;

  const { headers, cookies } = await import('next/headers');
  vi.mocked(headers).mockResolvedValue(new Headers({ origin: APP_URL }));
  vi.mocked(cookies).mockResolvedValue({ delete: vi.fn(), get: vi.fn(), set: vi.fn() } as never);

  vi.mocked(accounts.isUsernameTaken).mockImplementation((username: string) =>
    Promise.resolve([...profiles.values()].some((p) => p.username === username)),
  );
  vi.mocked(accounts.createProfileForAuthUser).mockImplementation((input) => {
    const n = profiles.size + 1;
    const ids = { accountId: `account-${n}`, personaId: `persona-${n}` };
    profiles.set(input.authUserId, {
      accountId: ids.accountId,
      authUserId: input.authUserId,
      username: input.username,
      displayName: input.displayName,
      locale: input.locale,
      status: 'active',
      currentPersonaId: ids.personaId,
      pseudonymousPersonaId: null,
      pseudonymousDisplayName: null,
    });
    return Promise.resolve(ids);
  });
  vi.mocked(session.getCurrentAccountByAuthUserId).mockImplementation((authUserId: string) =>
    Promise.resolve(profiles.get(authUserId) ?? null),
  );
});

describe('learning whether an email is registered (FR1.1, NFR3)', () => {
  it(
    'answers a second registration with the same email, in other letter case, with the neutral message and creates nothing',
    async () => {
      await registerOnce();
      expect(rows('user')).toHaveLength(1);

      const state = await register(
        INITIAL_AUTH_STATE,
        registerForm({ email: 'Nadia.Islam@Example.TEST', username: 'someone_else' }),
      );

      expect(state).toEqual({ fieldErrors: {}, formError: 'formErrors.auth.registrationRefused' });
      expect(JSON.stringify(state).toLowerCase()).not.toContain('nadia');
      expect(rows('user')).toHaveLength(1);
      expect(accounts.createProfileForAuthUser).toHaveBeenCalledTimes(1);
      // The undo path must never run against the existing account's user.
      expect(accounts.removeAuthUserWithoutProfile).not.toHaveBeenCalled();
    },
    SLOW,
  );

  it(
    'never writes the used email or the password to the console',
    async () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => undefined),
      );
      await registerOnce();

      await register(INITIAL_AUTH_STATE, registerForm({ username: 'someone_else' }));

      const logged = everythingLogged(spies);
      for (const spy of spies) spy.mockRestore();
      expect(logged).not.toContain(EMAIL);
      expect(logged).not.toContain(PASSWORD);
    },
    SLOW,
  );

  it(
    'does not confirm a registered email through the public /api/auth sign-up endpoint',
    async () => {
      await registerOnce();

      const response = await postToAuthRoute('/sign-up/email', {
        email: EMAIL,
        password: 'another long secret',
        name: '',
      });

      expect(await response.text()).not.toMatch(/already exists|USER_ALREADY_EXISTS/i);
    },
    SLOW,
  );

  it(
    'creates no Better Auth user through the public /api/auth sign-up endpoint, which skips the username, age and terms checks',
    async () => {
      await postToAuthRoute('/sign-up/email', {
        email: 'no.terms@example.test',
        password: 'another long secret',
        name: 'Unchecked Name',
      });

      expect(rows('user')).toHaveLength(0);
    },
    SLOW,
  );
});

describe('signing in with a credential that should not work (FR1.2)', () => {
  it(
    'gives an unknown email and a wrong password for a known email exactly the same answer',
    async () => {
      await registerOnce();

      const unknown = await signIn(INITIAL_AUTH_STATE, signInForm('nobody@example.test', PASSWORD));
      const wrongPassword = await signIn(
        INITIAL_AUTH_STATE,
        signInForm(EMAIL, 'not the right secret'),
      );

      expect(unknown).toEqual({ fieldErrors: {}, formError: 'errors.auth.invalidCredentials' });
      expect(wrongPassword).toEqual(unknown);
    },
    SLOW,
  );

  it(
    'removes the session Better Auth opened for a credential with no profile behind it',
    async () => {
      // A Better Auth user whose profile was never created, as a failed undo would leave it.
      await getAuth().api.signUpEmail({
        body: { email: 'orphan@example.test', password: PASSWORD, name: '' },
      });
      memory.db.session = [];
      memory.db.auth_sessions = [];

      const state = await signIn(INITIAL_AUTH_STATE, signInForm('orphan@example.test', PASSWORD));

      expect(state).toEqual({ fieldErrors: {}, formError: 'errors.auth.invalidCredentials' });
      expect(rows('session')).toHaveLength(0);
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

  it(
    'never redirects a signed-in reader to another site when the action receives a dot-segment next',
    async () => {
      await registerOnce();
      vi.mocked(redirect).mockClear();

      await expect(
        signIn(INITIAL_AUTH_STATE, signInForm(EMAIL, PASSWORD, { next: '/.//evil.example' })),
      ).rejects.toThrow('NEXT_REDIRECT');

      const targets = vi.mocked(redirect).mock.calls.map(([target]) => String(target));
      expect(targets.filter((target) => target.startsWith('//'))).toEqual([]);
    },
    SLOW,
  );
});
