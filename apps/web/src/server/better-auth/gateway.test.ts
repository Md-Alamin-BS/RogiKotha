// @vitest-environment node
// The gateway against the pinned Better Auth on its memory adapter: real library behaviour, this
// Unit's options and scopes, no database.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthGateway } from './gateway';
import {
  buildTestLibrary,
  emptyStore,
  type MemoryStore,
  type TestLibrary,
} from './library-test-support';

const memory = vi.hoisted(() => {
  const state: { store: Record<string, Record<string, unknown>[]> } = { store: {} };
  return state;
});

vi.mock('better-auth/adapters/drizzle', async () => {
  const { memoryAdapter } = await import('better-auth/adapters/memory');
  return { drizzleAdapter: () => memoryAdapter(memory.store) };
});

const EMAIL = 'shirin.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 20_000;

let library: TestLibrary;
let gateway: ReturnType<typeof createAuthGateway>;

function store(): MemoryStore {
  return memory.store;
}

function cookieHeaders(setCookies: readonly string[]): Headers {
  const pairs = setCookies.map((value) => value.split(';')[0]).join('; ');
  return new Headers({ cookie: pairs });
}

async function registered(status: 'pending_verification' | 'active' | 'suspended' = 'active') {
  const created = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
  if (!created.ok) throw new Error(`register failed: ${created.error.code}`);
  library.statuses.set(created.data.authUserId, status);
  return created.data.authUserId;
}

async function signedIn(): Promise<readonly string[]> {
  const session = await gateway.createSession({ email: EMAIL, password: PASSWORD });
  if (!session.ok) throw new Error(`sign-in failed: ${session.error.code}`);
  return session.data.setCookies;
}

beforeEach(() => {
  memory.store = emptyStore();
  library = buildTestLibrary();
  gateway = createAuthGateway(library.auth, library.logger);
});

describe('registering a credential user', () => {
  it(
    'creates the user with the hash from the port and no session',
    async () => {
      await registered();

      expect(store().auth_users).toHaveLength(1);
      expect(store().auth_accounts?.[0]?.password).toBe(`fast$${PASSWORD}`);
      expect(store().auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    'answers email_exists for an address that already has a user',
    async () => {
      await registered();

      const again = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });

      expect(again).toEqual({ ok: false, error: { code: 'email_exists' } });
    },
    SLOW,
  );

  it(
    'answers email_exists when a racing registration took the address after the first check',
    async () => {
      await registered();
      const { internalAdapter } = await library.auth.$context;
      // The gateway's own first look misses the row, as if the other registration had not committed.
      vi.spyOn(internalAdapter, 'findUserByEmail').mockResolvedValueOnce(null);

      const again = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });

      expect(again).toEqual({ ok: false, error: { code: 'email_exists' } });
      expect(store().auth_users).toHaveLength(1);
    },
    SLOW,
  );

  it(
    'removes the user and its credential when the registration is compensated',
    async () => {
      const authUserId = await registered();

      await expect(gateway.deleteUser(authUserId)).resolves.toEqual({ ok: true, data: null });
      expect(store().auth_users).toEqual([]);
      expect(store().auth_accounts).toEqual([]);
    },
    SLOW,
  );
});

describe('creating a session after the command decided', () => {
  it(
    'returns the session cookie for the right password',
    async () => {
      await registered();

      const cookies = await signedIn();

      expect(cookies.join(';')).toMatch(/rk\.session_token=/);
      expect(cookies.join(';').toLowerCase()).toContain('httponly');
    },
    SLOW,
  );

  it(
    'answers invalid_credentials for a wrong password and writes no session',
    async () => {
      await registered();

      const refused = await gateway.createSession({ email: EMAIL, password: 'not the password' });

      expect(refused).toEqual({ ok: false, error: { code: 'invalid_credentials' } });
      expect(store().auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    'answers session_refused for a suspended profile, so no session row exists',
    async () => {
      await registered('suspended');

      const refused = await gateway.createSession({ email: EMAIL, password: PASSWORD });

      expect(refused).toEqual({ ok: false, error: { code: 'session_refused' } });
      expect(store().auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    'stores no IP address on the session row (BR4.9)',
    async () => {
      await registered();
      await signedIn();

      expect(store().auth_sessions?.[0]?.ipAddress ?? '').toBe('');
    },
    SLOW,
  );
});

describe('reading, listing and revoking sessions', () => {
  it(
    'reads the session a cookie names and lists it with its user agent',
    async () => {
      const authUserId = await registered();
      const headers = cookieHeaders(await signedIn());

      const found = await gateway.getSession(headers);
      const listed = await gateway.listSessions(authUserId);

      expect(found?.authUserId).toBe(authUserId);
      expect(listed.map((session) => session.sessionId)).toEqual([found?.sessionId]);
      expect(listed[0]).toHaveProperty('userAgent');
    },
    SLOW,
  );

  it('answers null for a request without a session cookie', async () => {
    await expect(gateway.getSession(new Headers())).resolves.toBeNull();
  });

  it(
    'revokes one session by its id, so its cookie no longer reads',
    async () => {
      await registered();
      const headers = cookieHeaders(await signedIn());
      const found = await gateway.getSession(headers);

      await gateway.revokeSession(found!.sessionId);

      await expect(gateway.getSession(headers)).resolves.toBeNull();
    },
    SLOW,
  );

  it(
    'revokes every session of the account and counts them',
    async () => {
      const authUserId = await registered();
      await signedIn();
      await signedIn();

      await expect(gateway.revokeSessions(authUserId)).resolves.toEqual({ revoked: 2 });
      await expect(gateway.listSessions(authUserId)).resolves.toEqual([]);
    },
    SLOW,
  );
});

describe('email verification', () => {
  it(
    'issues a token for a known address and verifies it into a session',
    async () => {
      const authUserId = await registered('pending_verification');

      const issued = await gateway.issueVerificationToken(EMAIL);
      if (!issued.ok) throw new Error('no token');
      const verified = await gateway.verifyEmailToken(issued.data.token);

      expect(verified.ok && verified.data.authUserId).toBe(authUserId);
      expect(verified.ok && verified.data.setCookies?.join(';')).toMatch(/rk\.session_token=/);
      expect(store().auth_users?.[0]?.emailVerified).toBe(true);
    },
    SLOW,
  );

  it(
    'verifies a suspended account without signing it in (BR2.2)',
    async () => {
      await registered('suspended');
      const issued = await gateway.issueVerificationToken(EMAIL);
      if (!issued.ok) throw new Error('no token');

      const verified = await gateway.verifyEmailToken(issued.data.token);

      expect(verified.ok && verified.data.setCookies).toBeNull();
      expect(store().auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    'answers user_not_found for an unknown address and token_invalid for a forged token',
    async () => {
      await expect(gateway.issueVerificationToken('nobody.demo@example.test')).resolves.toEqual({
        ok: false,
        error: { code: 'user_not_found' },
      });
      await expect(gateway.verifyEmailToken('not.a.token')).resolves.toEqual({
        ok: false,
        error: { code: 'token_invalid' },
      });
    },
    SLOW,
  );
});

describe('password reset and change', () => {
  it(
    'issues a reset token through the callback, then resets once and refuses the replay',
    async () => {
      const authUserId = await registered();
      await signedIn();

      const issued = await gateway.issueResetToken(EMAIL);
      if (!issued.ok) throw new Error('no reset token');
      const reset = await gateway.resetPassword({
        token: issued.data.token,
        newPassword: 'another synthetic secret',
      });
      const replay = await gateway.resetPassword({
        token: issued.data.token,
        newPassword: 'third synthetic secret',
      });

      expect(reset).toEqual({ ok: true, data: { authUserId } });
      expect(replay).toEqual({ ok: false, error: { code: 'token_invalid' } });
      expect(store().auth_sessions).toEqual([]);
    },
    SLOW,
  );

  it(
    "consumes the user's older reset links with the one used, and leaves other users' links",
    async () => {
      await registered();
      const other = await gateway.createCredentialUser({
        email: 'rumana.demo@example.test',
        password: PASSWORD,
      });
      if (!other.ok) throw new Error('second register failed');
      const older = await gateway.issueResetToken(EMAIL);
      const newer = await gateway.issueResetToken(EMAIL);
      const othersLink = await gateway.issueResetToken('rumana.demo@example.test');
      if (!older.ok || !newer.ok || !othersLink.ok) throw new Error('no reset token');

      const reset = await gateway.resetPassword({
        token: newer.data.token,
        newPassword: 'another synthetic secret',
      });
      const replay = await gateway.resetPassword({
        token: older.data.token,
        newPassword: 'third synthetic secret',
      });

      expect(reset.ok).toBe(true);
      expect(replay).toEqual({ ok: false, error: { code: 'token_invalid' } });
      expect((store().auth_verifications ?? []).map((row) => row.identifier)).toEqual([
        `reset-password:${othersLink.data.token}`,
      ]);
    },
    SLOW,
  );

  it(
    'answers token_expired for a reset token past its hour',
    async () => {
      await registered();
      const issued = await gateway.issueResetToken(EMAIL);
      if (!issued.ok) throw new Error('no reset token');
      for (const row of store().auth_verifications ?? [])
        row.expiresAt = new Date(Date.now() - 1000);

      await expect(
        gateway.resetPassword({
          token: issued.data.token,
          newPassword: 'another synthetic secret',
        }),
      ).resolves.toEqual({ ok: false, error: { code: 'token_expired' } });
    },
    SLOW,
  );

  it(
    'answers user_not_found for a reset of an unknown address',
    async () => {
      await expect(gateway.issueResetToken('nobody.demo@example.test')).resolves.toEqual({
        ok: false,
        error: { code: 'user_not_found' },
      });
    },
    SLOW,
  );

  it(
    'changes the password with the current one and re-issues only the current session',
    async () => {
      const authUserId = await registered();
      await signedIn();
      const headers = cookieHeaders(await signedIn());

      const changed = await gateway.changePassword({
        headers,
        currentPassword: PASSWORD,
        newPassword: 'another synthetic secret',
      });

      expect(changed.ok && changed.data.setCookies.join(';')).toMatch(/rk\.session_token=/);
      await expect(gateway.listSessions(authUserId)).resolves.toHaveLength(1);
    },
    SLOW,
  );

  it(
    'answers invalid_credentials for a wrong current password',
    async () => {
      await registered();
      const headers = cookieHeaders(await signedIn());

      await expect(
        gateway.changePassword({
          headers,
          currentPassword: 'wrong',
          newPassword: 'another synthetic secret',
        }),
      ).resolves.toEqual({ ok: false, error: { code: 'invalid_credentials' } });
    },
    SLOW,
  );
});
