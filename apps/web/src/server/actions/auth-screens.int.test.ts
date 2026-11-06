// T-102 (design § 10 risk 1): register → emailed token → confirm → `getContributionAccess()` is
// `allowed`, through the real form actions and container against the compose test database. The
// request's cookies live in one jar, as the browser would carry them, so the access query reads
// the session the confirm action set, the way a server component calls it.
// ASSUMPTION(U9): the token is read from the queued `email_deliveries` row, as T-101's smoke does;
// the worker that hands the mail to Mailpit does not run in `web-int`.
// ASSUMPTION(U9): it lives in `server/actions/` because a `server/` file may not import the actions.
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import type { WebContainer } from '../container';
import { optionalEnv } from '../env';

type CookieTarget = string | { name: string };

const jar = vi.hoisted(() => ({ values: new Map<string, string>() }));

vi.mock('next/headers', () => {
  const cookieHeader = () =>
    [...jar.values].map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join('; ');
  return {
    headers: () => Promise.resolve(new Headers(jar.values.size ? { cookie: cookieHeader() } : {})),
    cookies: () =>
      Promise.resolve({
        get: (name: string) => {
          const value = jar.values.get(name);
          return value === undefined ? undefined : { name, value };
        },
        set: (name: string, value: string) => {
          jar.values.set(name, value);
        },
        delete: (target: CookieTarget) => {
          jar.values.delete(typeof target === 'string' ? target : target.name);
        },
      }),
  };
});
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const RUN = Date.now().toString(36);
const EMAIL = `screens.demo+${RUN}@example.test`;

let container: WebContainer;

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  container = (await import('../container')).getContainer();
});

afterAll(async () => {
  const { getDb } = await import('../db');
  await getDb().$client.end();
});

async function emailedToken(email: string): Promise<string> {
  const { ports } = container;
  const account = await ports.unitOfWork.read((tx) => ports.accounts.findByEmail(tx, email));
  if (!account) throw new Error('register stored no account');
  const { rows } = await (await import('../db')).getDb().$client.query<{ link: string }>(
    `select params->>'link' as link from email_deliveries
     where account_id = $1 and message_key = 'email.verify' order by created_at desc limit 1`,
    [account.accountId],
  );
  const token = rows[0] ? new URL(rows[0].link).searchParams.get('token') : null;
  if (!token) throw new Error('no verification email was queued');
  return token;
}

function formOf(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

it('turns a registration and its confirm button into an account allowed to contribute', async () => {
  const { register, confirmEmail } = await import('./auth');
  const { getContributionAccess } = await import('./account');
  const { INITIAL_AUTH_STATE, PENDING_EMAIL_COOKIE } = await import('./auth-form');

  await expect(
    register(
      INITIAL_AUTH_STATE,
      formOf({
        email: EMAIL,
        password: 'a synthetic secret 2026',
        username: `scr_${RUN}`,
        displayName: 'Screens Demo',
        locale: 'en',
        age: 'on',
        terms: 'on',
        next: '/en/write',
      }),
    ),
  ).rejects.toThrow('NEXT_REDIRECT /en/verify-email?next=%2Fen%2Fwrite');
  expect(jar.values.get(PENDING_EMAIL_COOKIE)).toBe(
    JSON.stringify({ email: EMAIL, next: '/en/write' }),
  );
  await expect(getContributionAccess()).resolves.toBe('signed-out');

  const token = await emailedToken(EMAIL);
  await expect(confirmEmail(INITIAL_AUTH_STATE, formOf({ token }))).rejects.toThrow(
    'NEXT_REDIRECT /en/verify-email?confirmed=1&next=%2Fen%2Fwrite',
  );

  expect(jar.values.has(PENDING_EMAIL_COOKIE)).toBe(false);
  await expect(getContributionAccess()).resolves.toBe('allowed');
}, 90_000);
