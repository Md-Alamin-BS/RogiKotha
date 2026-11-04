// @vitest-environment node
// Adversarial (T-101 Step 15, design § 12.2 angle 3): what `getActor` is fed. `AuthGateway.getSession`
// is the only session read, so a forged cookie, a cookie that outlived sign-out everywhere or a
// password change, and a replayed verification link must all read as no session.
import { createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthGateway } from './gateway';
import {
  buildTestLibrary,
  emptyStore,
  TEST_SECRET,
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

const EMAIL = 'tahmina.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 20_000;

let library: TestLibrary;
let gateway: ReturnType<typeof createAuthGateway>;

beforeEach(() => {
  memory.store = emptyStore();
  library = buildTestLibrary();
  gateway = createAuthGateway(library.auth, library.logger);
});

async function registered(status: 'pending_verification' | 'active' = 'active'): Promise<string> {
  const created = await gateway.createCredentialUser({ email: EMAIL, password: PASSWORD });
  if (!created.ok) throw new Error(`register failed: ${created.error.code}`);
  library.statuses.set(created.data.authUserId, status);
  return created.data.authUserId;
}

function cookieOf(setCookies: readonly string[] | null): Headers {
  const pairs = (setCookies ?? []).map((value) => value.split(';')[0]).join('; ');
  return new Headers({ cookie: pairs });
}

async function signedIn(): Promise<Headers> {
  const session = await gateway.createSession({ email: EMAIL, password: PASSWORD });
  if (!session.ok) throw new Error(`sign-in failed: ${session.error.code}`);
  return cookieOf(session.data.setCookies);
}

/** A session cookie built by hand, signed the way the library signs it, with any secret. */
function handSignedCookie(token: string, secret: string): Headers {
  const signature = createHmac('sha256', secret).update(token).digest('base64');
  return new Headers({ cookie: `rk.session_token=${encodeURIComponent(`${token}.${signature}`)}` });
}

function onlySessionToken(): string {
  const token = memory.store.auth_sessions?.[0]?.token;
  if (typeof token !== 'string') throw new Error('no session token');
  return token;
}

describe('a forged session cookie', () => {
  it(
    'reads as no session unless it carries the server secret, whatever else it claims',
    async () => {
      const authUserId = await registered();
      await signedIn();
      const token = onlySessionToken();
      const forgedData = Buffer.from(
        JSON.stringify({ session: { session: { userId: authUserId }, user: { id: authUserId } } }),
      ).toString('base64url');

      // The control proves the hand-built cookie has the library's shape.
      await expect(gateway.getSession(handSignedCookie(token, TEST_SECRET))).resolves.toMatchObject(
        { authUserId },
      );
      for (const forged of [
        new Headers({ cookie: `rk.session_token=${token}` }),
        handSignedCookie(token, 'another-synthetic-secret-of-at-least-32-chars'),
        new Headers({ cookie: `rk.session_data=${forgedData}` }),
        new Headers({ cookie: `better-auth.session_token=${token}` }),
        new Headers({ cookie: `__Secure-rk.session_token=${token}` }),
      ]) {
        await expect(gateway.getSession(forged)).resolves.toBeNull();
      }
    },
    SLOW,
  );
});

describe('an old session cookie', () => {
  it(
    'stops reading after sign-out everywhere and after a password change elsewhere',
    async () => {
      const authUserId = await registered();
      const phone = await signedIn();
      const laptop = await signedIn();

      await gateway.revokeSessions(authUserId);

      await expect(gateway.getSession(phone)).resolves.toBeNull();
      await expect(gateway.getSession(laptop)).resolves.toBeNull();

      const stolen = await signedIn();
      const owner = await signedIn();
      const changed = await gateway.changePassword({
        headers: owner,
        currentPassword: PASSWORD,
        newPassword: 'another synthetic secret',
      });
      if (!changed.ok) throw new Error(`change failed: ${changed.error.code}`);

      await expect(gateway.getSession(stolen)).resolves.toBeNull();
      await expect(gateway.getSession(cookieOf(changed.data.setCookies))).resolves.toMatchObject({
        authUserId,
      });
    },
    SLOW,
  );

  it(
    'is not re-created by replaying the verification link, after sign-out everywhere or a suspension',
    async () => {
      const authUserId = await registered('pending_verification');
      const issued = await gateway.issueVerificationToken(EMAIL);
      if (!issued.ok) throw new Error('no verification token');
      const first = await gateway.verifyEmailToken(issued.data.token);
      expect(first.ok && first.data.setCookies?.join(';')).toMatch(/rk\.session_token=/);
      library.statuses.set(authUserId, 'active');
      await gateway.revokeSessions(authUserId);

      const replayed = await gateway.verifyEmailToken(issued.data.token);
      library.statuses.set(authUserId, 'suspended');
      const replayedSuspended = await gateway.verifyEmailToken(issued.data.token);

      expect(replayed.ok && replayed.data.setCookies).toBeNull();
      expect(replayedSuspended.ok && replayedSuspended.data.setCookies).toBeNull();
      expect(memory.store.auth_sessions).toEqual([]);
    },
    SLOW,
  );
});
