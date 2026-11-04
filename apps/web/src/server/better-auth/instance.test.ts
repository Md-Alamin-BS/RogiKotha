// @vitest-environment node
// The library's hooks and callbacks act only inside a gateway scope (BR7.9, BR1.7, BR2.2, BR3.6),
// checked on the hook bodies and on the pinned library itself.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createLibraryHooks, DISABLED_PATHS } from './instance';
import { runInScope } from './library-scope';
import {
  buildTestLibrary,
  emptyStore,
  recordingLogger,
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

const EMAIL = 'nadia.demo@example.test';
const PASSWORD = 'a synthetic secret 2026';
const SLOW = 20_000;

function hooksWith(status: 'active' | 'pending_verification' | 'suspended' | 'banned' | null) {
  const logger = recordingLogger();
  const hooks = createLibraryHooks({ logger, accountStatusOf: () => Promise.resolve(status) });
  return { hooks, logger };
}

describe('the user-create hook', () => {
  it('refuses a user outside the register scope and logs it without an address', async () => {
    const { hooks, logger } = hooksWith('active');

    await expect(hooks.userCreateBefore()).resolves.toBe(false);
    expect(logger.lines).toEqual([
      { level: 'warn', event: 'auth.callback_outside_scope', fields: { purpose: 'register' } },
    ]);
  });

  it('allows a user inside the register scope only', async () => {
    const { hooks } = hooksWith('active');

    await expect(runInScope({ purpose: 'register' }, () => hooks.userCreateBefore())).resolves.toBe(
      true,
    );
    await expect(runInScope({ purpose: 'signIn' }, () => hooks.userCreateBefore())).resolves.toBe(
      false,
    );
  });
});

describe('the session-create hook', () => {
  it('refuses a session outside every scope', async () => {
    const { hooks } = hooksWith('active');
    await expect(hooks.sessionCreateBefore('auth-user-1')).resolves.toBe(false);
  });

  it('refuses a sign-in the command has not decided', async () => {
    const { hooks } = hooksWith('active');
    await expect(
      runInScope({ purpose: 'signIn' }, () => hooks.sessionCreateBefore('auth-user-1')),
    ).resolves.toBe(false);
  });

  it.each(['active', 'pending_verification'] as const)(
    'allows a decided sign-in and a verify for a %s profile',
    async (status) => {
      const { hooks } = hooksWith(status);
      const decided = runInScope({ purpose: 'signIn', sessionAllowed: true }, () =>
        hooks.sessionCreateBefore('auth-user-1'),
      );
      const verify = runInScope({ purpose: 'verify' }, () =>
        hooks.sessionCreateBefore('auth-user-1'),
      );

      await expect(Promise.all([decided, verify])).resolves.toEqual([true, true]);
    },
  );

  it.each(['suspended', 'banned', null] as const)(
    'refuses even a decided sign-in for a %s profile',
    async (status) => {
      const { hooks } = hooksWith(status);
      await expect(
        runInScope({ purpose: 'signIn', sessionAllowed: true }, () =>
          hooks.sessionCreateBefore('auth-user-1'),
        ),
      ).resolves.toBe(false);
    },
  );

  it('records whose session the verify scope saw', async () => {
    const { hooks } = hooksWith('active');
    const seen = await runInScope({ purpose: 'verify' }, async (scope) => {
      await hooks.sessionCreateBefore('auth-user-7');
      return scope.authUserId;
    });
    expect(seen).toBe('auth-user-7');
  });

  it('refuses a session in the reset scope', async () => {
    const { hooks } = hooksWith('active');
    await expect(
      runInScope({ purpose: 'reset' }, () => hooks.sessionCreateBefore('auth-user-1')),
    ).resolves.toBe(false);
  });
});

describe('the email callbacks', () => {
  it('hand the token to the scope that asked for it', async () => {
    const { hooks } = hooksWith('active');
    const token = await runInScope({ purpose: 'issueReset' }, async (scope) => {
      await hooks.sendResetPassword({ token: 'reset-token-1' });
      return scope.token;
    });
    expect(token).toBe('reset-token-1');
  });

  it('store nothing outside their scope and log the attempt', async () => {
    const { hooks, logger } = hooksWith('active');
    const token = await runInScope({ purpose: 'signIn' }, async (scope) => {
      await hooks.sendVerificationEmail({ token: 'verify-token-1' });
      return scope.token;
    });
    expect(token).toBeUndefined();
    expect(logger.lines.map((line) => line.fields?.purpose)).toEqual(['issueVerification']);
  });
});

describe('the configured library (pinned 1.7)', () => {
  let library: TestLibrary;

  beforeEach(() => {
    memory.store = emptyStore();
    library = buildTestLibrary();
  });

  it('closes every flow a command owns over HTTP (BR7.1) and enables no plugin (BR7.7)', () => {
    for (const path of ['/sign-up/email', '/sign-in/email', '/reset-password', '/verify-email']) {
      expect(DISABLED_PATHS).toContain(path);
    }
    expect(library.auth.options.plugins).toEqual([]);
  });

  it(
    'refuses a sign-up called outside the register scope, leaving no user row',
    async () => {
      await expect(
        library.auth.api.signUpEmail({ body: { email: EMAIL, password: PASSWORD, name: '' } }),
      ).rejects.toThrow();
      expect(memory.store.auth_users).toEqual([]);
    },
    SLOW,
  );

  it(
    'answers 404 over HTTP for the sign-up endpoint',
    async () => {
      const response = await library.auth.handler(
        new Request('http://localhost:3000/api/auth/sign-up/email', {
          method: 'POST',
          headers: { 'content-type': 'application/json', origin: 'http://localhost:3000' },
          body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: '' }),
        }),
      );
      expect(response.status).toBe(404);
      expect(memory.store.auth_users).toEqual([]);
    },
    SLOW,
  );

  it(
    "routes the library's own log lines to the allowlisted logger without their message or arguments",
    async () => {
      const { logger } = await library.auth.$context;

      await runInScope({ purpose: 'register' }, () => {
        logger.error(`Failed to create user ${EMAIL}`, new Error(EMAIL));
        logger.warn(`Sign-up attempt for existing email: ${EMAIL}`);
        logger.info(`Signed in ${EMAIL}`);
        return Promise.resolve();
      });

      expect(library.logger.lines).toEqual([
        { level: 'error', event: 'auth.library_log', fields: { purpose: 'register' } },
        { level: 'warn', event: 'auth.library_log', fields: { purpose: 'register' } },
      ]);
    },
    SLOW,
  );
});
