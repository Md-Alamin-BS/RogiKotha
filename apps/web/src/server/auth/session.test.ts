// @vitest-environment node
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { redirect } from '@rogikotha/i18n';
import { getLocale } from 'next-intl/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getRequestContext } from '../auth';
import { session } from '../data';
import { anonymousContext, signedInContext } from '../request-context-test-support';
import { getCurrentAccount, requireAccount, requireContributor } from './session';

vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('@rogikotha/i18n', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('../auth', () => ({ getRequestContext: vi.fn() }));
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

function signedInAs(authUserId: string | null) {
  vi.mocked(getRequestContext).mockResolvedValue(
    authUserId ? signedInContext({ authUserId }) : anonymousContext('bn'),
  );
}

describe('the current account of the demo pages (on getActor, ISS-391)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocale).mockResolvedValue('bn');
  });

  it('is null when no one is signed in, without touching the database', async () => {
    signedInAs(null);
    await expect(getCurrentAccount()).resolves.toBeNull();
    expect(session.getCurrentAccountByAuthUserId).not.toHaveBeenCalled();
  });

  it('is the profile behind the Actor, looked up by the session user id', async () => {
    signedInAs('auth-user-1');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount());

    await expect(getCurrentAccount()).resolves.toEqual(buildAccount());
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

  it('is null for a suspended account, which getActor resolves to anonymous', async () => {
    vi.mocked(getRequestContext).mockResolvedValue({
      ...anonymousContext('bn'),
      actor: { ...anonymousContext('bn').actor, refusal: 'suspended' },
    });
    await expect(getCurrentAccount()).resolves.toBeNull();
    expect(session.getCurrentAccountByAuthUserId).not.toHaveBeenCalled();
  });

  it('is null for a session whose account has no profile', async () => {
    signedInAs('auth-user-without-profile');
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(null);
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

describe('the write actions’ own refusal (requireContributor, BR8.1)', () => {
  function signedInWithStatus(status: DemoCurrentAccount['status']) {
    vi.mocked(getRequestContext).mockResolvedValue(
      signedInContext({ authUserId: 'auth-user-1', status }),
    );
    vi.mocked(session.getCurrentAccountByAuthUserId).mockResolvedValue(buildAccount({ status }));
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getLocale).mockResolvedValue('bn');
  });

  it('returns a confirmed, active account', async () => {
    signedInWithStatus('active');
    await expect(requireContributor({ returnTo: '/write' })).resolves.toEqual(buildAccount());
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sends a signed-out visitor to sign in with the return path, as requireAccount does', async () => {
    signedInAs(null);
    await expect(requireContributor({ returnTo: '/write' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({
      href: { pathname: '/sign-in', query: { next: '/write' } },
      locale: 'bn',
    });
  });

  it('sends a signed-in account with an unconfirmed address to the confirm screen', async () => {
    signedInWithStatus('pending_verification');
    await expect(requireContributor({ returnTo: '/write' })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/verify-email', locale: 'bn' });
  });

  it('sends any other account state to its own page, never to a form', async () => {
    signedInWithStatus('restricted');
    await expect(requireContributor()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith({ href: '/me', locale: 'bn' });
  });

  it('leaves requireAccount open to an unconfirmed account, so it reaches its own pages', async () => {
    signedInWithStatus('pending_verification');
    await expect(requireAccount({ returnTo: '/me/security' })).resolves.toEqual(
      buildAccount({ status: 'pending_verification' }),
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});
