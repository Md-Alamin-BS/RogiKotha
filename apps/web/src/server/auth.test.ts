// @vitest-environment node
// `getActor()` with the real `resolveActor`; only the container's ports, the request headers and
// the locale are stood in for.
import type { AccountProfileRecord, AuthGateway, Logger } from '@rogikotha/application';
import type { AccountStatus } from '@rogikotha/contracts';
import { getLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { correlationIdFrom, getActor, getRequestContext } from './auth';
import { getContainer } from './container';
import { buildSessionInfo } from './request-context-test-support';

vi.mock('next/headers', () => ({ headers: vi.fn() }));
vi.mock('next-intl/server', () => ({ getLocale: vi.fn() }));
vi.mock('./container', () => ({ getContainer: vi.fn() }));

const NOW = new Date('2026-11-04T10:00:00Z');
const DAY_MS = 24 * 60 * 60 * 1000;

function buildProfile(status: AccountStatus): AccountProfileRecord {
  return {
    accountId: '0190f5a2-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'shirin_88',
    displayName: 'Shirin',
    locale: 'bn',
    status,
  };
}

const gateway = { getSession: vi.fn(), revokeSession: vi.fn() };
const findProfileByAuthUserId = vi.fn();
const logger: Logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

function signedIn(status: AccountStatus | null, createdDaysAgo = 1) {
  gateway.getSession.mockResolvedValue(
    buildSessionInfo({ createdAt: new Date(NOW.getTime() - createdDaysAgo * DAY_MS) }),
  );
  findProfileByAuthUserId.mockResolvedValue(status ? buildProfile(status) : null);
}

beforeEach(() => {
  vi.clearAllMocks();
  gateway.getSession.mockResolvedValue(null);
  vi.mocked(headers).mockResolvedValue(
    new Headers({ cookie: 'rk.session_token=abc', 'x-forwarded-for': '192.0.2.10' }),
  );
  vi.mocked(getLocale).mockResolvedValue('bn');
  vi.mocked(getContainer).mockReturnValue({
    env: { appMode: 'demo' },
    ports: {
      authGateway: gateway as unknown as AuthGateway,
      unitOfWork: { read: (work: (tx: unknown) => Promise<unknown>) => work({}) },
      accounts: { findProfileByAuthUserId },
      clock: { now: () => NOW },
      logger,
    },
  } as unknown as ReturnType<typeof getContainer>);
});

describe('getActor (WF11, BR4.3)', () => {
  it('is anonymous without a session and reads no profile', async () => {
    const actor = await getActor();

    expect(actor).toMatchObject({ kind: 'anonymous', capabilities: [], locale: 'bn' });
    expect(findProfileByAuthUserId).not.toHaveBeenCalled();
  });

  it('is the account for an active session, with no staff power and no persona', async () => {
    signedIn('active');

    const { actor, request, session } = await getRequestContext();

    expect(actor).toMatchObject({
      kind: 'account',
      accountId: '0190f5a2-0000-7000-8000-000000000001',
      emailVerified: true,
      capabilities: [],
    });
    expect(actor.staffRole).toBeUndefined();
    expect(actor.personaId).toBeUndefined();
    expect(request).toMatchObject({ sessionId: 'session-1', clientAddress: '192.0.2.10' });
    expect(session?.authUserId).toBe('auth-user-1');
  });

  it('marks an unconfirmed account as not verified', async () => {
    signedIn('pending_verification');
    await expect(getActor()).resolves.toMatchObject({ kind: 'account', emailVerified: false });
  });

  it.each(['suspended', 'banned'] as const)(
    'is anonymous with the refusal for a %s account, with no session in the request',
    async (status) => {
      signedIn(status);

      const { actor, request } = await getRequestContext();

      expect(actor).toMatchObject({ kind: 'anonymous', refusal: status });
      expect(request.sessionId).toBeNull();
    },
  );

  it('revokes a session older than 30 days and answers anonymous (BR4.1)', async () => {
    signedIn('active', 31);

    await expect(getActor()).resolves.toMatchObject({ kind: 'anonymous' });
    expect(gateway.revokeSession).toHaveBeenCalledWith('session-1');
  });

  it('logs a session without a profile by its correlation id only', async () => {
    signedIn(null);

    await expect(getActor()).resolves.toMatchObject({ kind: 'anonymous' });
    expect(vi.mocked(logger).warn.mock.calls).toEqual([
      ['auth.profile_missing', { correlationId: expect.any(String) as unknown }],
    ]);
  });

  it('falls back to English when no locale is known', async () => {
    vi.mocked(getLocale).mockRejectedValue(new Error('no locale in an API route'));
    await expect(getActor()).resolves.toMatchObject({ locale: 'en' });
  });
});

describe('the correlation id', () => {
  it('keeps a well-formed incoming id and replaces anything else', () => {
    const incoming = '0190F5A2-0000-7000-8000-0000000000AA';

    expect(correlationIdFrom(incoming)).toBe(incoming.toLowerCase());
    expect(correlationIdFrom('<script>')).not.toBe('<script>');
    expect(correlationIdFrom(null)).toMatch(/^[0-9a-f-]{36}$/);
  });
});
