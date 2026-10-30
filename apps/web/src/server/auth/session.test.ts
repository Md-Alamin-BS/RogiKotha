// @vitest-environment node
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect } from '@rogikotha/i18n';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '../data';
import { getAuth } from './instance';
import { getCurrentAccount, requireAccount } from './session';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('./instance', () => ({ getAuth: vi.fn() }));
vi.mock('../data', () => ({ session: { getCurrentAccountByAuthUserId: vi.fn() } }));

function buildAccount(overrides: Partial<DemoCurrentAccount> = {}): DemoCurrentAccount {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'ammu_of_tuli',
    displayName: 'ammu_of_tuli',
    locale: 'bn',
    status: 'active',
    currentPersonaId: '0190f5a2-0000-7000-8000-0000000000aa',
    pseudonymousPersonaId: null,
    pseudonymousDisplayName: null,
    ...overrides,
  };
}

const getSession = vi.fn();
const requestHeaders = new Headers({ cookie: 'rk.session_token=abc' });

function signedInAs(authUserId: string | null) {
  getSession.mockResolvedValue(authUserId ? { user: { id: authUserId }, session: {} } : null);
}

describe('the current account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(headers).mockResolvedValue(requestHeaders);
    vi.mocked(getAuth).mockReturnValue({ api: { getSession } } as unknown as ReturnType<
      typeof getAuth
    >);
    vi.mocked(getLocale).mockResolvedValue('bn');
  });

  it('is null when no one is signed in, without touching the database', async () => {
    signedInAs(null);
    await expect(getCurrentAccount()).resolves.toBeNull();
    expect(session.getCurrentAccountByAuthUserId).not.toHaveBeenCalled();
  });

  it('is the profile behind the session cookie, looked up by the Better Auth user id', async () => {
    signedInAs('auth-user-1');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    await expect(getCurrentAccount()).resolves.toEqual(buildAccount());
    expect(getSession).toHaveBeenCalledWith({ headers: requestHeaders });
    expect(session.getCurrentAccountByAuthUserId).toHaveBeenCalledWith('auth-user-1');
  });

  it('carries no email address or password field', async () => {
    signedInAs('auth-user-1');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    const account = await getCurrentAccount();
    expect(Object.keys(account ?? {})).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/email|password/i)]),
    );
  });

  it('is null for a session whose account has no profile', async () => {
    signedInAs('auth-user-without-profile');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(null);
    await expect(getCurrentAccount()).resolves.toBeNull();
  });

  it('is null for a suspended account', async () => {
    signedInAs('auth-user-1');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(
      buildAccount({ status: 'suspended' }),
    );
    await expect(getCurrentAccount()).resolves.toBeNull();
  });

  it('requireAccount returns the signed-in account', async () => {
    signedInAs('auth-user-1');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    await expect(requireAccount()).resolves.toEqual(buildAccount());
    expect(redirect).not.toHaveBeenCalled();
  });

  it('requireAccount sends a signed-out visitor to sign in, in the active language', async () => {
    signedInAs(null);
    await expect(requireAccount()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/sign-in', locale: 'bn' });
  });

  it('requireAccount passes the page to return to after signing in', async () => {
    signedInAs(null);
    await expect(requireAccount({ returnTo: '/bn/write' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({
      href: { pathname: '/sign-in', query: { next: '/bn/write' } },
      locale: 'bn',
    });
  });
});
