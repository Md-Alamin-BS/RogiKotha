// Adversarial tests (U9 plan Step 14, angle 3; BR6.1, BR6.4; T-106): reach the session data of
// `/me/security` without a live session: signed out, with a forged session cookie, and by
// replaying a cookie after "sign out everywhere". The page's guard (`requireAccount`) and both of
// its queries run with the real container against the compose test database.
// ASSUMPTION(U9): the page itself is TSX, which the `web-int` project cannot transform, so this
// file attacks the guard and the two queries the page calls; `page.test.tsx` covers the render.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { optionalEnv } from '@/server/env';
import {
  browser,
  formOf,
  newRequest,
  signedOutBrowser,
  stateOf,
  submit,
  thrownBy,
} from '@/server/actions/auth-adversarial-test-support';

vi.mock('next/headers', async () =>
  (await import('@/server/actions/auth-adversarial-test-support')).cookieJarModule(),
);
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
const EMAIL = `adv.security+${RUN}@example.test`;
const PASSWORD = 'a synthetic secret 2026';
const RETURN_TO = '/en/me/security';

/** The confirmed holder's live cookies, captured right after confirming. */
let liveCookies: Map<string, string>;

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  const { register, confirmEmail } = await import('@/server/actions/auth');
  const { INITIAL_AUTH_STATE } = await import('@/server/actions/auth-form');
  const { getContainer } = await import('@/server/container');
  const { ports } = getContainer();

  signedOutBrowser();
  await submit(() =>
    register(
      INITIAL_AUTH_STATE,
      formOf({
        email: EMAIL,
        password: PASSWORD,
        username: `sec_${RUN}`,
        displayName: 'Security Demo',
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
  newRequest();
  await submit(() => confirmEmail(INITIAL_AUTH_STATE, formOf({ token: token ?? '' })));
  liveCookies = new Map(browser.values);
}, 90_000);

afterAll(async () => {
  const { getDb } = await import('@/server/db');
  await getDb().$client.end();
});

/** What `/me/security` would get: the guard's verdict and both queries' answers. */
async function whatThePageSees() {
  const { requireAccount } = await import('@/server/auth/session');
  const { getOwnAccount, listSessions } = await import('@/server/actions/account');
  newRequest();
  const guard = await submit(() => requireAccount({ returnTo: RETURN_TO }));
  newRequest();
  const [account, sessions] = await Promise.all([getOwnAccount({}), listSessions({})]);
  return { guard, account, sessions };
}

function expectNoSessionData(seen: Awaited<ReturnType<typeof whatThePageSees>>): void {
  expect(seen.guard).toEqual({
    thrown: `NEXT_REDIRECT ${JSON.stringify({
      href: { pathname: '/sign-in', query: { next: RETURN_TO } },
      locale: 'en',
    })}`,
  });
  expect(seen.account).toMatchObject({ ok: false });
  expect(seen.sessions).toMatchObject({ ok: false });
  expect(JSON.stringify(seen)).not.toContain(EMAIL);
  expect(JSON.stringify(seen)).not.toContain('example.test');
}

describe('reaching /me/security without a live session (BR6.1)', () => {
  it('a live session sees its own data, so the refusals below are real', async () => {
    browser.values = new Map(liveCookies);
    const seen = await whatThePageSees();

    expect(stateOf(seen.guard)).toMatchObject({ username: `sec_${RUN}` });
    expect(seen.account).toMatchObject({ ok: true });
    expect(seen.sessions).toMatchObject({ ok: true });
  });

  it('signed out, the guard sends the browser to sign in and the queries return nothing', async () => {
    signedOutBrowser();

    expectNoSessionData(await whatThePageSees());
  });

  it('a forged session cookie is refused like no cookie at all', async () => {
    browser.values = new Map([...liveCookies].map(([name]) => [name, 'forged.synthetic-value']));

    expectNoSessionData(await whatThePageSees());
  });

  it('replaying the cookie after "sign out everywhere" returns no session data (BR6.4)', async () => {
    const { signOutEverywhereForm } = await import('@/server/actions/auth');
    const { INITIAL_AUTH_STATE } = await import('@/server/actions/auth-form');
    browser.values = new Map(liveCookies);
    newRequest();
    const signedOut = await submit(() =>
      signOutEverywhereForm(INITIAL_AUTH_STATE, formOf({ confirm: 'yes' })),
    );
    expect(thrownBy(signedOut)).toContain('signedOut');

    // The attacker kept a copy of the cookies from before.
    browser.values = new Map(liveCookies);
    expectNoSessionData(await whatThePageSees());
  }, 60_000);
});
