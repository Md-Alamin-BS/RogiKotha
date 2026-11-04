// @vitest-environment node
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect as redirectInLocale } from '@/i18n/routing';
import { APIError } from 'better-auth/api';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getAuth } from '../auth/instance';
import { accounts, session } from '../data';
import { register, signIn, signOut } from './auth';
import { INITIAL_AUTH_STATE } from './auth-form';

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
vi.mock('../auth/instance', () => ({ getAuth: vi.fn() }));
vi.mock('../env', () => ({ optionalEnv: vi.fn(() => undefined) }));
vi.mock('../data', () => ({
  accounts: {
    createProfileForAuthUser: vi.fn(),
    isUsernameTaken: vi.fn(),
    removeAuthUserWithoutProfile: vi.fn(),
  },
  session: { getCurrentAccountByAuthUserId: vi.fn() },
}));

const EMAIL = 'nadia.islam@example.test';
const PASSWORD = 'a long enough secret';

const api = { signUpEmail: vi.fn(), signInEmail: vi.fn(), signOut: vi.fn() };
const deleteSession = vi.fn();
const cookieStore = { delete: vi.fn() };
const requestHeaders = new Headers({ origin: 'http://localhost:3000' });

function buildAccount(overrides: Partial<DemoCurrentAccount> = {}): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'nadia_i',
    displayName: 'Nadia Islam',
    locale: 'bn',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

function registerForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values = {
    email: EMAIL,
    password: PASSWORD,
    username: 'nadia_i',
    displayName: 'Nadia Islam',
    locale: 'bn',
    age: 'on',
    terms: 'on',
    ...overrides,
  };
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

function signInForm(extra: Record<string, string> = {}): FormData {
  const form = new FormData();
  form.set('email', EMAIL);
  form.set('password', PASSWORD);
  for (const [name, value] of Object.entries(extra)) form.set(name, value);
  return form;
}

function apiError(code: string, status: 'UNAUTHORIZED' | 'UNPROCESSABLE_ENTITY') {
  return new APIError(status, { code, message: code });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(headers).mockResolvedValue(requestHeaders);
  vi.mocked(cookies).mockResolvedValue(cookieStore as never);
  vi.mocked(getAuth).mockReturnValue({
    api,
    $context: Promise.resolve({
      internalAdapter: { deleteSession },
      authCookies: {
        sessionToken: { name: 'rk.session_token' },
        sessionData: { name: 'rk.session_data' },
      },
    }),
  } as unknown as ReturnType<typeof getAuth>);
  vi.mocked(accounts.isUsernameTaken).mockResolvedValue(false);
  vi.mocked(accounts.createProfileForAuthUser).mockResolvedValue({
    accountId: 'account-1',
    personaId: 'persona-1',
  });
  api.signUpEmail.mockResolvedValue({ token: 'token-1', user: { id: 'auth-user-1' } });
  api.signInEmail.mockResolvedValue({ token: 'token-1', user: { id: 'auth-user-1' } });
});

describe('registering', () => {
  it('creates the Better Auth user, then the active profile, and opens /me in the chosen language', async () => {
    await expect(register(INITIAL_AUTH_STATE, registerForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(api.signUpEmail).toHaveBeenCalledWith({
      body: { email: EMAIL, password: PASSWORD, name: '' },
      headers: requestHeaders,
    });
    expect(accounts.createProfileForAuthUser).toHaveBeenCalledWith({
      authUserId: 'auth-user-1',
      username: 'nadia_i',
      displayName: 'Nadia Islam',
      locale: 'bn',
      termsVersion: '1',
    });
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/me', locale: 'bn' });
  });

  it('returns to the same-site page it was sent from', async () => {
    await expect(register(INITIAL_AUTH_STATE, registerForm({ next: '/bn/write' }))).rejects.toThrow(
      'NEXT_REDIRECT',
    );
    expect(redirect).toHaveBeenCalledWith('/bn/write');
  });

  it('shows field errors and creates nothing when the form is incomplete', async () => {
    const state = await register(INITIAL_AUTH_STATE, registerForm({ password: 'short' }));

    expect(state).toEqual({
      fieldErrors: { password: 'errors.auth.passwordTooShort' },
      formError: null,
    });
    expect(api.signUpEmail).not.toHaveBeenCalled();
  });

  it('names a taken username on its field before any user is created', async () => {
    vi.mocked(accounts.isUsernameTaken).mockResolvedValue(true);

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state.fieldErrors).toEqual({ username: 'errors.auth.usernameTaken' });
    expect(api.signUpEmail).not.toHaveBeenCalled();
  });

  it('answers a used email with a neutral message and creates no profile', async () => {
    api.signUpEmail.mockRejectedValue(
      apiError('USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL', 'UNPROCESSABLE_ENTITY'),
    );

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state).toEqual({ fieldErrors: {}, formError: 'formErrors.auth.registrationRefused' });
    expect(JSON.stringify(state)).not.toContain(EMAIL);
    expect(accounts.createProfileForAuthUser).not.toHaveBeenCalled();
  });

  it('removes the new auth user and its session when the username is taken in a race', async () => {
    vi.mocked(accounts.createProfileForAuthUser).mockRejectedValue(
      Object.assign(new Error('insert failed'), { cause: { code: '23505' } }),
    );

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state.fieldErrors).toEqual({ username: 'errors.auth.usernameTaken' });
    expect(deleteSession).toHaveBeenCalledWith('token-1');
    expect(accounts.removeAuthUserWithoutProfile).toHaveBeenCalledWith('auth-user-1');
    expect(cookieStore.delete).toHaveBeenCalledWith('rk.session_token');
    expect(redirectInLocale).not.toHaveBeenCalled();
  });

  it('logs an unexpected failure by its code only, never the email or password', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    api.signUpEmail.mockRejectedValue(new Error(`boom for ${EMAIL} ${PASSWORD}`));

    const state = await register(INITIAL_AUTH_STATE, registerForm());

    expect(state.formError).toBe('errors.common.internal');
    expect(log).toHaveBeenCalled();
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/nadia\.islam|long enough secret/);
    log.mockRestore();
  });
});

describe('signing in', () => {
  it('opens the home page in the account’s preferred language', async () => {
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).rejects.toThrow('NEXT_REDIRECT');

    expect(api.signInEmail).toHaveBeenCalledWith({
      body: { email: EMAIL, password: PASSWORD },
      headers: requestHeaders,
    });
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'bn' });
  });

  it('returns to a same-site page but ignores a link to another site', async () => {
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    await expect(signIn(INITIAL_AUTH_STATE, signInForm({ next: '/en/write' }))).rejects.toThrow();
    expect(redirect).toHaveBeenCalledWith('/en/write');

    vi.mocked(redirect).mockClear();
    await expect(
      signIn(INITIAL_AUTH_STATE, signInForm({ next: '//evil.example/' })),
    ).rejects.toThrow();
    expect(redirect).not.toHaveBeenCalled();
    expect(redirectInLocale).toHaveBeenLastCalledWith({ href: '/', locale: 'bn' });
  });

  it('gives a wrong email or password one neutral message', async () => {
    api.signInEmail.mockRejectedValue(apiError('INVALID_EMAIL_OR_PASSWORD', 'UNAUTHORIZED'));

    await expect(signIn(INITIAL_AUTH_STATE, signInForm())).resolves.toEqual({
      fieldErrors: {},
      formError: 'errors.auth.invalidCredentials',
    });
  });

  it('closes the session again for a suspended account and says so', async () => {
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(
      buildAccount({ status: 'suspended' }),
    );

    const state = await signIn(INITIAL_AUTH_STATE, signInForm());

    expect(state.formError).toBe('errors.auth.accountSuspended');
    expect(deleteSession).toHaveBeenCalledWith('token-1');
    expect(cookieStore.delete).toHaveBeenCalledWith('rk.session_token');
  });

  it('treats a credential with no profile behind it like a wrong password', async () => {
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(null);

    const state = await signIn(INITIAL_AUTH_STATE, signInForm());

    expect(state.formError).toBe('errors.auth.invalidCredentials');
    expect(deleteSession).toHaveBeenCalledWith('token-1');
  });
});

describe('signing out', () => {
  it('ends the Better Auth session, clears the cookies and goes home in the active language', async () => {
    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');

    expect(api.signOut).toHaveBeenCalledWith({ headers: requestHeaders });
    expect(cookieStore.delete).toHaveBeenCalledWith('rk.session_token');
    expect(redirectInLocale).toHaveBeenCalledWith({ href: '/', locale: 'en' });
  });

  it('still clears the cookies when there was no session to end', async () => {
    api.signOut.mockRejectedValue(apiError('FAILED_TO_GET_SESSION', 'UNAUTHORIZED'));

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT');
    expect(cookieStore.delete).toHaveBeenCalledWith('rk.session_token');
  });
});
