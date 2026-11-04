// T-101 web integration (functional-spec § 11, `web-int`): the real container, gateway, Better
// Auth, Argon2 and repositories against the compose PostgreSQL test database. Register, verify,
// `getActor`, sign-out and sign-in run end to end through the commands, the way the server actions
// call them. Mail is only queued here; `worker-int` sends it through Mailpit.
//
// Needs `pnpm infra:up` and the repo-root `.env` (APP_URL, the three secrets, TERMS_VERSION). Runs
// in group 3, after `database` reset `DATABASE_URL_TEST` and `test-support-seed` seeded it.
import {
  registerCommand,
  signInCommand,
  signOutCommand,
  verifyEmailCommand,
  type CommandRequest,
} from '@rogikotha/application';
import { ANONYMOUS_ACTOR, newId, type Actor } from '@rogikotha/contracts';
import { DEFAULT_POOL_OPTIONS } from '@rogikotha/database';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type * as AuthModule from './auth';
import type { WebContainer } from './container';
import { optionalEnv } from './env';

const request = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock('next/headers', () => ({ headers: () => Promise.resolve(request.headers) }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));

const RUN = Date.now().toString(36);
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 60_000;

let container: WebContainer;
let auth: typeof AuthModule;
let addressSeq = 0;
let usernameSeq = 0;
const consoleLines: unknown[][] = [];

function emailFor(label: string): string {
  return `shirin.demo+${label}-${RUN}@example.test`;
}

/** A fresh documentation-range address per call, so the per-network limits never interfere. */
function freshRequest(cookie?: string): CommandRequest {
  addressSeq += 1;
  const headers = new Headers({ 'x-forwarded-for': `198.51.100.${addressSeq}` });
  if (cookie) headers.set('cookie', cookie);
  return { headers, clientAddress: `198.51.100.${addressSeq}`, sessionId: null };
}

function anonymous(): Actor {
  return ANONYMOUS_ACTOR('en', newId());
}

function cookieHeaderOf(setCookies: readonly string[]): string {
  return setCookies.map((value) => value.split(';')[0]).join('; ');
}

async function query<T>(text: string, values: unknown[] = []): Promise<T[]> {
  const { getDb } = await import('./db');
  const { rows } = await getDb().$client.query(text, values);
  return rows as T[];
}

async function register(label: string) {
  const email = emailFor(label);
  usernameSeq += 1;
  const result = await registerCommand.execute(
    {
      email,
      password: PASSWORD,
      username: `int_${RUN}_${usernameSeq}`,
      displayName: 'Shirin Demo',
      locale: 'en',
      ageConfirmed: true,
      termsAccepted: true,
    },
    { actor: anonymous(), request: freshRequest(), ports: container.ports },
  );
  if (!result.ok) throw new Error(`register failed: ${result.error.code}`);
  return { email, accountId: result.data.accountId };
}

/** The token in the newest queued confirmation link; params are cleared only once sent. */
async function verificationToken(accountId: string): Promise<string> {
  const [row] = await query<{ params: { link: string } }>(
    `select params from email_deliveries
     where account_id = $1 and message_key = 'email.verify' order by created_at desc limit 1`,
    [accountId],
  );
  const token = row ? new URL(row.params.link).searchParams.get('token') : null;
  if (!token) throw new Error('no confirmation link was queued');
  return token;
}

/** `getActor()` for a request carrying `cookie`, as a page render would read it. */
async function actorFor(cookie: string | null) {
  request.headers = new Headers(cookie ? { cookie } : {});
  return auth.getRequestContext();
}

async function signIn(email: string, password: string) {
  return signInCommand.execute(
    { email, password },
    { actor: anonymous(), request: freshRequest(), ports: container.ports },
  );
}

beforeAll(async () => {
  // The container reads DATABASE_URL; point it at the integration database before it is built.
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args);
    });
  }
  // The web logger writes info lines to stdout directly.
  vi.spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    consoleLines.push([String(chunk)]);
    return true;
  });
  container = (await import('./container')).getContainer();
  auth = await import('./auth');
});

afterAll(async () => {
  vi.restoreAllMocks();
  const { getDb } = await import('./db');
  await getDb().$client.end();
});

describe('register, verify and sign in end to end (US3.1, US3.2)', () => {
  it(
    'registers a pending account whose confirmation link signs it in, verified',
    async () => {
      const { accountId } = await register('verify');
      const [pending] = await query<{ status: string }>(
        'select status from account_profiles where id = $1',
        [accountId],
      );
      expect(pending?.status).toBe('pending_verification');

      const verified = await verifyEmailCommand.execute(
        { token: await verificationToken(accountId) },
        { actor: anonymous(), request: freshRequest(), ports: container.ports },
      );
      expect(verified.ok).toBe(true);
      if (!verified.ok || verified.data.session.kind !== 'set')
        throw new Error('no session cookie');

      const context = await actorFor(cookieHeaderOf(verified.data.session.setCookies));
      expect(context.actor).toMatchObject({
        kind: 'account',
        accountId,
        emailVerified: true,
        capabilities: [],
      });
      expect(context.actor).not.toHaveProperty('staffRole');
    },
    SLOW,
  );

  it(
    'sets an HttpOnly, SameSite=Lax session cookie on sign-in and stores no IP on the session row',
    async () => {
      const { email, accountId } = await register('cookie');

      const signedIn = await signIn(email, PASSWORD);

      expect(signedIn.ok).toBe(true);
      if (!signedIn.ok || signedIn.data.session.kind !== 'set')
        throw new Error('no session cookie');
      const sessionCookie = signedIn.data.session.setCookies.find((c) =>
        c.includes('session_token'),
      );
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=Lax/i);
      expect(sessionCookie).toMatch(/Path=\//i);
      const rows = await query<{ ip_address: string | null }>(
        `select s.ip_address from auth_sessions s
         join account_profiles p on p.auth_user_id = s.user_id where p.id = $1`,
        [accountId],
      );
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) expect(row.ip_address ?? '').toBe('');
    },
    SLOW,
  );

  it(
    'signs out, after which the old cookie reads as anonymous',
    async () => {
      const { email } = await register('signout');
      const signedIn = await signIn(email, PASSWORD);
      if (!signedIn.ok || signedIn.data.session.kind !== 'set')
        throw new Error('no session cookie');
      const cookie = cookieHeaderOf(signedIn.data.session.setCookies);
      const context = await actorFor(cookie);

      const signedOut = await signOutCommand.execute(
        {},
        { actor: context.actor, request: context.request, ports: container.ports },
      );

      expect(signedOut).toEqual({ ok: true, data: { session: { kind: 'clear' } } });
      expect((await actorFor(cookie)).actor.kind).toBe('anonymous');
    },
    SLOW,
  );

  it(
    'answers a wrong password and an unknown address with the same refusal',
    async () => {
      const { email } = await register('wrong');

      const wrong = await signIn(email, 'not the right secret');
      const unknown = await signIn(emailFor('nobody'), PASSWORD);

      expect(wrong.ok || wrong.error.code).toBe('auth.invalid_credentials');
      expect(unknown.ok || unknown.error.code).toBe('auth.invalid_credentials');
    },
    SLOW,
  );
});

describe('sessions the request must refuse (BR4.1, BR4.8)', () => {
  it(
    'revokes a session older than 30 days on its next request and answers anonymous',
    async () => {
      const { email, accountId } = await register('aged');
      const signedIn = await signIn(email, PASSWORD);
      if (!signedIn.ok || signedIn.data.session.kind !== 'set')
        throw new Error('no session cookie');
      const cookie = cookieHeaderOf(signedIn.data.session.setCookies);
      await query(
        `update auth_sessions set created_at = now() - interval '31 days'
         where user_id = (select auth_user_id from account_profiles where id = $1)`,
        [accountId],
      );

      expect((await actorFor(cookie)).actor.kind).toBe('anonymous');
      const left = await query(
        `select 1 from auth_sessions
         where user_id = (select auth_user_id from account_profiles where id = $1)`,
        [accountId],
      );
      expect(left).toEqual([]);
    },
    SLOW,
  );

  it(
    'gives a suspended account an anonymous Actor that carries the refusal',
    async () => {
      const { email, accountId } = await register('suspended');
      const signedIn = await signIn(email, PASSWORD);
      if (!signedIn.ok || signedIn.data.session.kind !== 'set')
        throw new Error('no session cookie');
      await query(`update account_profiles set status = 'suspended' where id = $1`, [accountId]);

      const { actor } = await actorFor(cookieHeaderOf(signedIn.data.session.setCookies));

      expect(actor).toMatchObject({ kind: 'anonymous', refusal: 'suspended' });
    },
    SLOW,
  );

  it(
    'opens no session when a suspended account follows its confirmation link (BR2.2)',
    async () => {
      const { accountId } = await register('verify-suspended');
      const token = await verificationToken(accountId);
      await query(`update account_profiles set status = 'suspended' where id = $1`, [accountId]);

      const verified = await verifyEmailCommand.execute(
        { token },
        { actor: anonymous(), request: freshRequest(), ports: container.ports },
      );

      expect(verified.ok || verified.error.code).toBe('auth.token_invalid');
      const sessions = await query(
        `select 1 from auth_sessions
         where user_id = (select auth_user_id from account_profiles where id = $1)`,
        [accountId],
      );
      expect(sessions).toEqual([]);
    },
    SLOW,
  );
});

describe('the shared pool under parallel library calls (ISS-452)', () => {
  const PARALLEL = 15;

  it(
    'completes 15 parallel registrations and 15 parallel successful sign-ins on the 10-connection pool',
    async () => {
      expect(PARALLEL).toBeGreaterThan(DEFAULT_POOL_OPTIONS.max);
      const accounts = await Promise.all(
        Array.from({ length: PARALLEL }, (_, i) => register(`pool-${i}`)),
      );

      const results = await Promise.all(accounts.map(({ email }) => signIn(email, PASSWORD)));

      expect(results.map((r) => (r.ok ? 'ok' : r.error.code))).toEqual(
        Array.from({ length: PARALLEL }, () => 'ok'),
      );
      const [row] = await query<{ sessions: string }>(
        `select count(*) as sessions from auth_sessions s
         join account_profiles p on p.auth_user_id = s.user_id where p.id = any($1)`,
        [accounts.map((a) => a.accountId)],
      );
      expect(Number(row?.sessions)).toBe(PARALLEL);
    },
    SLOW,
  );
});

describe('the library handler on the real database (BR7.1)', () => {
  it(
    'answers 404 for the sign-up path past the route allowlist and creates no user',
    async () => {
      const email = emailFor('route');
      const pastRoute = await container.auth.handler(
        new Request(`${container.env.appUrl}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: container.env.appUrl },
          body: JSON.stringify({ email, password: PASSWORD, name: '' }),
        }),
      );

      expect(pastRoute.status).toBe(404);
      expect(await query('select 1 from auth_users where email = $1', [email])).toEqual([]);
    },
    SLOW,
  );
});

describe('private data in the logs (BR8.1, NFR3)', () => {
  it('never wrote an address, a password or a token to the console during these flows', () => {
    const logged = JSON.stringify(consoleLines).toLowerCase();

    expect(logged).not.toContain(`-${RUN}@example.test`);
    expect(logged).not.toContain(PASSWORD);
    expect(logged).not.toMatch(/token=/);
  });
});
