import type { AccountStatus } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import type { AccountProfileRecord, AuthSessionInfo } from '../../ports';
import { MAX_SESSION_AGE_MS, resolveActor } from './resolve-actor';
import type { ResolveActorInput } from './types';

const NOW = new Date('2026-11-01T09:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;

function aSession(overrides: Partial<AuthSessionInfo> = {}): AuthSessionInfo {
  return {
    sessionId: 'session-1',
    authUserId: 'auth-user-1',
    createdAt: new Date(NOW.getTime() - DAY),
    updatedAt: NOW,
    expiresAt: new Date(NOW.getTime() + 29 * DAY),
    ...overrides,
  };
}

function aProfile(status: AccountStatus, overrides: Partial<AccountProfileRecord> = {}) {
  return {
    accountId: '00000000-0000-7000-8000-000000000001',
    authUserId: 'auth-user-1',
    username: 'shirin_88',
    displayName: 'Shirin',
    locale: 'bn' as const,
    status,
    ...overrides,
  };
}

function input(overrides: Partial<ResolveActorInput> = {}): ResolveActorInput {
  return {
    session: aSession(),
    profile: aProfile('active'),
    locale: 'en',
    correlationId: 'corr-1',
    now: NOW,
    maxSessionAgeMs: MAX_SESSION_AGE_MS,
    ...overrides,
  };
}

describe('resolveActor', () => {
  it('gives an anonymous Actor without a session', () => {
    const { actor, revokeSession } = resolveActor(input({ session: null, profile: null }));

    expect(actor).toEqual({
      kind: 'anonymous',
      capabilities: [],
      locale: 'en',
      correlationId: 'corr-1',
    });
    expect(revokeSession).toBe(false);
  });

  it('refuses a session 30 days after its creation, however recently refreshed, and asks to revoke it', () => {
    const old = aSession({ createdAt: new Date(NOW.getTime() - 30 * DAY), updatedAt: NOW });

    const result = resolveActor(input({ session: old }));

    expect(result.actor.kind).toBe('anonymous');
    expect(result.revokeSession).toBe(true);
  });

  it('reports a session without a profile as missing', () => {
    const result = resolveActor(input({ profile: null }));

    expect(result.actor.kind).toBe('anonymous');
    expect(result.profileMissing).toBe(true);
  });

  it('maps each status to its Actor', () => {
    const kinds = (
      ['pending_verification', 'active', 'restricted', 'suspended', 'banned', 'deleted'] as const
    ).map((status) => {
      const { actor } = resolveActor(input({ profile: aProfile(status) }));
      return [status, actor.kind, actor.emailVerified, actor.refusal];
    });

    expect(kinds).toEqual([
      ['pending_verification', 'account', false, undefined],
      ['active', 'account', true, undefined],
      ['restricted', 'account', true, undefined],
      ['suspended', 'anonymous', undefined, 'suspended'],
      ['banned', 'anonymous', undefined, 'banned'],
      ['deleted', 'anonymous', undefined, undefined],
    ]);
  });

  it('carries the status, the route locale and no staff power, persona or step-up', () => {
    const { actor } = resolveActor(input({ profile: aProfile('restricted'), locale: 'bn' }));

    expect(actor).toEqual({
      kind: 'account',
      accountId: '00000000-0000-7000-8000-000000000001',
      emailVerified: true,
      status: 'restricted',
      capabilities: [],
      locale: 'bn',
      correlationId: 'corr-1',
    });
    expect(actor.staffRole).toBeUndefined();
    expect(actor.personaId).toBeUndefined();
  });
});
