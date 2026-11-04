// Builders for the request context `getRequestContext()` returns, for tests that stand in for
// `@/server/auth`. Apps may not import `test-support` (FD-040), so they live here.
import type { AuthSessionInfo } from '@rogikotha/application';
import { ANONYMOUS_ACTOR, type AccountStatus, type Actor, type Locale } from '@rogikotha/contracts';

import type { RequestContext } from './auth';

const CORRELATION_ID = '0190f5a2-0000-7000-8000-00000000c0de';

export function buildSessionInfo(overrides: Partial<AuthSessionInfo> = {}): AuthSessionInfo {
  const now = new Date('2026-11-01T09:00:00Z');
  return {
    sessionId: 'session-1',
    authUserId: 'auth-user-1',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

export function anonymousContext(locale: Locale = 'en'): RequestContext {
  return {
    actor: ANONYMOUS_ACTOR(locale, CORRELATION_ID),
    session: null,
    request: { headers: new Headers(), clientAddress: null, sessionId: null },
  };
}

export function signedInContext(input: {
  authUserId: string;
  accountId?: string;
  status?: AccountStatus;
  locale?: Locale;
}): RequestContext {
  const session = buildSessionInfo({ authUserId: input.authUserId });
  const status = input.status ?? 'active';
  const actor: Actor = {
    kind: 'account',
    accountId: input.accountId ?? `account-of-${input.authUserId}`,
    emailVerified: status !== 'pending_verification',
    status,
    capabilities: [],
    locale: input.locale ?? 'en',
    correlationId: CORRELATION_ID,
  };
  return {
    actor,
    session,
    request: { headers: new Headers(), clientAddress: null, sessionId: session.sessionId },
  };
}
