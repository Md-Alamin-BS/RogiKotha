// ISS-778 (BR6.5, WF7 step 3): changing the password on `/me/security`, through the real form
// actions and container against the compose test database. `headers()` is frozen per request, as
// in Next.js, where the page rendered in a server action's own response still gets the incoming
// request's headers and only `cookies()` sees what the action set. That render therefore cannot
// see the rotated session, so the change has to answer with a redirect (Post/Redirect/Get).
// ASSUMPTION(ISS-778): the page itself is TSX, which `web-int` cannot transform, so this file
// runs the page's guard and session query; `page.test.tsx` covers the notice.
import { afterAll, beforeAll, expect, it, vi } from 'vitest';

import { optionalEnv } from '@/server/env';
import {
  browser,
  formOf,
  newRequest,
  signedOutBrowser,
  stateOf,
  submit,
  thrownBy,
  type CookieWrite,
} from '@/server/actions/auth-adversarial-test-support';

const frozen = vi.hoisted(() => ({ headers: new Headers() }));

vi.mock('next/headers', async () => {
  const jar = (await import('@/server/actions/auth-adversarial-test-support')).cookieJarModule();
  return { cookies: jar.cookies, headers: () => Promise.resolve(frozen.headers) };
});
vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT ${target}`);
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: () => Promise.resolve('en') }));
vi.mock('@/i18n/routing', () => ({
  redirect: vi.fn((target: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(target)}`);
  }),
}));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn((target: unknown) => {
    throw new Error(`NEXT_REDIRECT ${JSON.stringify(target)}`);
  }),
}));

const RUN = Date.now().toString(36);
const EMAIL = `chg.password+${RUN}@example.test`;
const USERNAME = `chg_${RUN}`;
const PASSWORD = 'a synthetic secret 2026';
const NEW_PASSWORD = 'a changed synthetic secret 2026';
const RETURN_TO = '/en/me/security';
const TO_SIGN_IN = `NEXT_REDIRECT ${JSON.stringify({
  href: { pathname: '/sign-in', query: { next: RETURN_TO } },
  locale: 'en',
})}`;

/** This device's cookies after confirming, and a second device's after signing in. */
let thisDevice: Map<string, string>;
let otherDevice: Map<string, string>;

/** A new request from the browser as it is now: its headers stay as sent until it ends. */
async function startRequest(): Promise<void> {
  newRequest();
  const { cookieJarModule } = await import('@/server/actions/auth-adversarial-test-support');
  frozen.headers = await cookieJarModule().headers();
}

async function guard(): Promise<unknown> {
  const { requireAccount } = await import('@/server/auth/session');
  return submit(() => requireAccount({ returnTo: RETURN_TO }));
}

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  const { register, confirmEmail, signIn } = await import('@/server/actions/auth');
  const { INITIAL_AUTH_STATE } = await import('@/server/actions/auth-form');
  const { getContainer } = await import('@/server/container');
  const { ports } = getContainer();

  signedOutBrowser();
  await startRequest();
  await submit(() =>
    register(
      INITIAL_AUTH_STATE,
      formOf({
        email: EMAIL,
        password: PASSWORD,
        username: USERNAME,
        displayName: 'Password Demo',
        locale: 'en',
        age: 'on',
        terms: 'on',
      }),
    ),
  );
  const account = await ports.unitOfWork.read((tx) => ports.accounts.findByEmail(tx, EMAIL));
  const { rows } = await (await import('@/server/db')).getDb().$client.query<{ link: string }>(
    `select params->>'link' as link from email_deliveries
     where account_id = $1 and message_key = 'email.verify' order by created_at desc limit 1`,
    [account?.accountId],
  );
  const token = rows[0] ? new URL(rows[0].link).searchParams.get('token') : null;
  await startRequest();
  await submit(() => confirmEmail(INITIAL_AUTH_STATE, formOf({ token: token ?? '' })));
  thisDevice = new Map(browser.values);

  signedOutBrowser();
  await startRequest();
  await submit(() => signIn(INITIAL_AUTH_STATE, formOf({ email: EMAIL, password: PASSWORD })));
  otherDevice = new Map(browser.values);
}, 90_000);

afterAll(async () => {
  const { getDb } = await import('@/server/db');
  await getDb().$client.end();
});

it('a password change redirects to the security page, signed in on the rotated session only', async () => {
  const { changePasswordForm } = await import('@/server/actions/auth');
  const { INITIAL_AUTH_STATE } = await import('@/server/actions/auth-form');
  const { listSessions } = await import('@/server/actions/account');

  browser.values = new Map(thisDevice);
  await startRequest();
  expect(stateOf(await guard())).toMatchObject({ username: USERNAME });

  const changed = await submit(() =>
    changePasswordForm(
      INITIAL_AUTH_STATE,
      formOf({ currentPassword: PASSWORD, newPassword: NEW_PASSWORD }),
    ),
  );
  const sessionWrites: CookieWrite[] = browser.writes.filter(
    (write) => write.op === 'set' && write.name.includes('session_token'),
  );

  // The cause of ISS-778: rendered in the same response, the page still sees the revoked session.
  expect(await guard()).toEqual({ thrown: TO_SIGN_IN });
  expect(thrownBy(changed)).toBe(
    `NEXT_REDIRECT ${JSON.stringify({
      href: { pathname: '/me/security', query: { changed: '1' } },
      locale: 'en',
    })}`,
  );
  expect(sessionWrites).toHaveLength(1);
  expect(sessionWrites[0]?.value).not.toBe(thisDevice.get(sessionWrites[0]?.name ?? ''));
  expect(sessionWrites[0]?.options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/' });

  // The redirected request carries the rotated cookie.
  await startRequest();
  expect(stateOf(await guard())).toMatchObject({ username: USERNAME });
  const sessions = await listSessions({});
  expect(sessions).toMatchObject({ ok: true });
  expect(sessions.ok ? sessions.data.map((row) => row.current) : null).toEqual([true]);

  // BR6.5: the old cookie of this device and the other device's session are both revoked.
  for (const cookies of [thisDevice, otherDevice]) {
    browser.values = new Map(cookies);
    await startRequest();
    expect(await guard()).toEqual({ thrown: TO_SIGN_IN });
  }
}, 60_000);

it('a wrong current password changes nothing and does not redirect', async () => {
  const { changePasswordForm } = await import('@/server/actions/auth');
  const { INITIAL_AUTH_STATE } = await import('@/server/actions/auth-form');

  const { signIn } = await import('@/server/actions/auth');
  signedOutBrowser();
  await startRequest();
  await submit(() => signIn(INITIAL_AUTH_STATE, formOf({ email: EMAIL, password: NEW_PASSWORD })));
  const signedIn = new Map(browser.values);

  await startRequest();
  const refused = await submit(() =>
    changePasswordForm(
      INITIAL_AUTH_STATE,
      formOf({ currentPassword: 'not the synthetic secret', newPassword: 'another secret 2026' }),
    ),
  );

  expect(stateOf(refused)).toMatchObject({
    status: 'refused',
    fieldErrors: { currentPassword: { key: 'errors.auth.invalidCredentials' } },
  });
  expect(browser.writes).toEqual([]);
  browser.values = signedIn;
  await startRequest();
  expect(stateOf(await guard())).toMatchObject({ username: USERNAME });
}, 60_000);
