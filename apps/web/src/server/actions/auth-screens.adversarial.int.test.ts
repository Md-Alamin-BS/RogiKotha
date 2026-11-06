// Adversarial tests (U9 plan Step 14, angles 1 and 2; T-106 rows), written by a tester who did not
// build the screens: learn whether an address is registered from the register and resend forms,
// and reuse or outlive a reset link. They drive the real form actions and container against the
// compose test database; the browser is the cookie jar of `auth-adversarial-test-support.ts`.
// ASSUMPTION(U9): named `*.adversarial.int.test.ts` so the `web-int` project, which has the
// database, runs it; a plain `*.adversarial.test.ts` runs in the jsdom project without one.
// ASSUMPTION(U9): the emailed tokens are read from the queued `email_deliveries` rows, as
// `auth-screens.int.test.ts` does; the worker that hands mail to Mailpit does not run here.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { WebContainer } from '../container';
import { optionalEnv } from '../env';
import type * as AuthActions from './auth';
import {
  browser,
  formOf,
  newRequest,
  signedOutBrowser,
  stateOf,
  submit,
  thrownBy,
} from './auth-adversarial-test-support';
import type * as AuthForms from './auth-form';

vi.mock('next/headers', async () =>
  (await import('./auth-adversarial-test-support')).cookieJarModule(),
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

type Actions = typeof AuthActions;
type Forms = typeof AuthForms;

const RUN = Date.now().toString(36);
const PASSWORD = 'a synthetic secret 2026';
const NEXT = '/en/write';

let container: WebContainer;
let actions: Actions;
let forms: Forms;
let usernames = 0;

beforeAll(async () => {
  process.env.DATABASE_URL = optionalEnv('DATABASE_URL_TEST') ?? '';
  container = (await import('../container')).getContainer();
  actions = await import('./auth');
  forms = await import('./auth-form');
});

afterAll(async () => {
  const { getDb } = await import('../db');
  await getDb().$client.end();
});

function address(label: string): string {
  return `adv.${label}+${RUN}@example.test`;
}

function registerForm(email: string): FormData {
  usernames += 1;
  return formOf({
    email,
    password: PASSWORD,
    username: `adv_${RUN}_${usernames}`,
    displayName: 'Adversary Demo',
    locale: 'en',
    age: 'on',
    terms: 'on',
    next: NEXT,
  });
}

async function latestLink(email: string, messageKey: string): Promise<string> {
  const { ports } = container;
  const account = await ports.unitOfWork.read((tx) => ports.accounts.findByEmail(tx, email));
  if (!account) throw new Error(`no account for ${messageKey}`);
  const { rows } = await (await import('../db')).getDb().$client.query<{ link: string }>(
    `select params->>'link' as link from email_deliveries
     where account_id = $1 and message_key = $2 order by created_at desc limit 1`,
    [account.accountId, messageKey],
  );
  const token = rows[0] ? new URL(rows[0].link).searchParams.get('token') : null;
  if (!token) throw new Error(`no ${messageKey} email was queued`);
  return token;
}

async function registerFresh(email: string): Promise<void> {
  signedOutBrowser();
  await submit(() => actions.register(forms.INITIAL_AUTH_STATE, registerForm(email)));
}

async function registerAndConfirm(email: string): Promise<void> {
  await registerFresh(email);
  const token = await latestLink(email, 'email.verify');
  newRequest();
  const confirmed = await submit(() =>
    actions.confirmEmail(forms.INITIAL_AUTH_STATE, formOf({ token })),
  );
  expect(thrownBy(confirmed)).toContain('confirmed=1');
  signedOutBrowser();
}

/** Everything a signed-out browser observes from one submission, with its own address masked. */
async function observe(email: string, run: () => Promise<unknown>): Promise<unknown> {
  signedOutBrowser();
  const outcome = await submit(run);
  const typed = forms.serialisePendingCookie({ email, next: NEXT });
  return {
    outcome,
    cookies: browser.writes.map(({ op, name, value, options }) => ({
      op,
      name,
      options,
      holdsTypedAddressOnly: value === typed,
    })),
  };
}

describe('account enumeration through the register and resend forms (BR2.1, BR2.4, T-106)', () => {
  const fresh = address('fresh');
  const unconfirmed = address('unconfirmed');
  const confirmed = address('confirmed');

  beforeAll(async () => {
    await registerFresh(unconfirmed);
    await registerAndConfirm(confirmed);
  }, 90_000);

  it('answers register identically for a new, an unconfirmed and a confirmed address', async () => {
    const seen = [];
    for (const email of [fresh, unconfirmed, confirmed]) {
      seen.push(
        await observe(email, () => actions.register(forms.INITIAL_AUTH_STATE, registerForm(email))),
      );
    }

    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    // Guards against all three failing the same way: each is the pending redirect with only the
    // `rk.pending` cookie, and none signs the browser in.
    expect(seen[0]).toEqual({
      outcome: { thrown: 'NEXT_REDIRECT /en/verify-email?next=%2Fen%2Fwrite' },
      cookies: [
        {
          op: 'set',
          name: forms.PENDING_EMAIL_COOKIE,
          options: {
            httpOnly: true,
            sameSite: 'lax',
            secure: container.env.appUrl.startsWith('https:'),
            path: '/',
            maxAge: forms.PENDING_EMAIL_MAX_AGE_SEC,
          },
          holdsTypedAddressOnly: true,
        },
      ],
    });
  }, 90_000);

  it('answers a signed-out resend identically for a new, an unconfirmed and a confirmed address', async () => {
    const seen = [];
    for (const email of [fresh, unconfirmed, confirmed]) {
      seen.push(
        await observe(email, () => actions.resendLink(forms.INITIAL_AUTH_STATE, formOf({ email }))),
      );
    }

    expect(seen[1]).toEqual(seen[0]);
    expect(seen[2]).toEqual(seen[0]);
    expect(seen[0]).toEqual({
      outcome: { state: forms.doneWith('auth.verify.resent') },
      cookies: [],
    });
  }, 90_000);
});

describe('reusing or outliving a reset link (BR5.3, T-106)', () => {
  const email = address('reset');
  const firstNew = 'first replacement secret 2026';
  const replayed = 'replayed replacement secret 2026';
  const late = 'late replacement secret 2026';

  async function requestResetToken(): Promise<string> {
    signedOutBrowser();
    await submit(() => actions.requestReset(forms.INITIAL_AUTH_STATE, formOf({ email })));
    return latestLink(email, 'email.reset');
  }

  function setPassword(token: string, password: string): Promise<unknown> {
    signedOutBrowser();
    return submit(() =>
      actions.setNewPassword(
        forms.INITIAL_AUTH_STATE,
        formOf({ token, newPassword: password, confirmPassword: password }),
      ),
    );
  }

  async function signsInWith(password: string): Promise<boolean> {
    signedOutBrowser();
    const outcome = await submit(() =>
      actions.signIn(forms.INITIAL_AUTH_STATE, formOf({ email, password })),
    );
    const done =
      typeof outcome === 'object' &&
      outcome !== null &&
      'thrown' in outcome &&
      String(outcome.thrown).startsWith('NEXT_REDIRECT');
    signedOutBrowser();
    return done;
  }

  beforeAll(async () => {
    await registerAndConfirm(email);
  }, 90_000);

  it('refuses a used reset link and leaves the password it set unchanged', async () => {
    const token = await requestResetToken();
    expect(thrownBy(await setPassword(token, firstNew))).toContain('NEXT_REDIRECT');

    const replay = await setPassword(token, replayed);
    expect(stateOf(replay)).toMatchObject({ status: 'refused', expired: true });
    expect(browser.writes).toEqual([]);
    expect(await signsInWith(replayed)).toBe(false);
    expect(await signsInWith(firstNew)).toBe(true);
  }, 90_000);

  it('refuses an expired reset link and leaves the password unchanged', async () => {
    const since = new Date();
    const token = await requestResetToken();
    // The link outlives its hour: only this run's newest reset row is moved into the past.
    const { rowCount } = await (await import('../db')).getDb().$client.query(
      `update auth_verifications set expires_at = now() - interval '1 minute'
       where identifier like 'reset-password:%' and created_at >= $1`,
      [since],
    );
    expect(rowCount).toBe(1);

    const outcome = await setPassword(token, late);
    expect(stateOf(outcome)).toMatchObject({ status: 'refused', expired: true });
    expect(browser.writes).toEqual([]);
    expect(await signsInWith(late)).toBe(false);
    expect(await signsInWith(firstNew)).toBe(true);
  }, 90_000);
});
