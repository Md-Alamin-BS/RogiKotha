// The Better Auth instance (T-101 § 7). Built by the container on first use, never at module load,
// so `next build` needs no secret and no database (BR7.2, F27). Every flow the commands own is
// closed over HTTP; the commands reach the library only through `gateway.ts`.
import type { Logger, PasswordHasher } from '@rogikotha/application';
import { newId, type AccountStatus } from '@rogikotha/contracts';
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  type Db,
} from '@rogikotha/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { currentScope, type LibraryScope } from './library-scope';

const DAY_SECONDS = 24 * 60 * 60;
export const SESSION_MAX_AGE_SECONDS = 30 * DAY_SECONDS;
const VERIFY_TOKEN_SECONDS = DAY_SECONDS;
const RESET_TOKEN_SECONDS = 60 * 60;
export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 256;

/**
 * BR7.1 second layer: the library's own routes for every flow a command owns. `disabledPaths`
 * closes only the HTTP router; `auth.api.*` calls from the gateway keep working.
 */
export const DISABLED_PATHS = [
  '/sign-up/email',
  '/sign-in/email',
  '/sign-in/social',
  '/sign-out',
  '/request-password-reset',
  '/reset-password',
  '/reset-password/:token',
  '/verify-email',
  '/send-verification-email',
  '/change-password',
  '/change-email',
  '/update-user',
  '/delete-user',
  '/delete-user/callback',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
  '/list-sessions',
  '/update-session',
  '/verify-password',
  '/list-accounts',
  '/account-info',
  '/unlink-account',
  '/link-social',
  '/refresh-token',
  '/get-access-token',
];

// `mayHoldSession` of `@rogikotha/domain`, which `web-server` may not import (T-010 matrix).
const SESSION_STATUSES: readonly AccountStatus[] = ['pending_verification', 'active', 'restricted'];

export interface AuthInstanceDeps {
  db: Db;
  secret: string;
  /** APP_URL without a trailing slash; the only trusted origin (BR4.2). */
  appUrl: string;
  hasher: PasswordHasher;
  logger: Logger;
  /** The profile status behind a library user, or null when there is no live profile. */
  accountStatusOf(authUserId: string): Promise<AccountStatus | null>;
}

/** The hook and callback bodies, kept apart from the instance so their scope rules are testable. */
export function createLibraryHooks(deps: Pick<AuthInstanceDeps, 'logger' | 'accountStatusOf'>) {
  const outside = (purpose: string): void => {
    deps.logger.warn('auth.callback_outside_scope', { purpose });
  };

  const storeToken = (expected: LibraryScope['purpose'], token: string): void => {
    const scope = currentScope();
    if (scope?.purpose !== expected) {
      outside(expected);
      return;
    }
    scope.token = token;
  };

  return {
    /** BR1.7: a library user exists only through `account.register`. */
    userCreateBefore(): Promise<boolean> {
      const scope = currentScope();
      if (scope?.purpose === 'register') return Promise.resolve(true);
      outside('register');
      return Promise.resolve(false);
    },

    /** BR7.9, BR2.2, BR3.6: a session only for a decided sign-in, a verify or a re-issue. */
    async sessionCreateBefore(authUserId: string): Promise<boolean> {
      const scope = currentScope();
      if (!scope) {
        outside('session');
        return false;
      }
      scope.authUserId = authUserId;
      const decided =
        (scope.purpose === 'signIn' && scope.sessionAllowed) ||
        scope.purpose === 'verify' ||
        scope.purpose === 'changePassword';
      if (!decided) return false;
      const status = await deps.accountStatusOf(authUserId);
      return status !== null && SESSION_STATUSES.includes(status);
    },

    sendVerificationEmail({ token }: { token: string }): Promise<void> {
      storeToken('issueVerification', token);
      return Promise.resolve();
    },

    sendResetPassword({ token }: { token: string }): Promise<void> {
      storeToken('issueReset', token);
      return Promise.resolve();
    },
  };
}

export function createAuthInstance(deps: AuthInstanceDeps) {
  const hooks = createLibraryHooks(deps);
  return betterAuth({
    appName: 'RogiKotha',
    baseURL: deps.appUrl,
    secret: deps.secret,
    trustedOrigins: [deps.appUrl],
    // BR7.3: the adapter looks tables up by model name and columns by Drizzle property name, so
    // only the model names are mapped; the properties in schema/auth.ts already match (ISS-112).
    database: drizzleAdapter(deps.db, {
      provider: 'pg',
      schema: {
        auth_users: authUsers,
        auth_sessions: authSessions,
        auth_accounts: authAccounts,
        auth_verifications: authVerifications,
      },
    }),
    user: { modelName: 'auth_users' },
    session: {
      modelName: 'auth_sessions',
      expiresIn: SESSION_MAX_AGE_SECONDS,
      updateAge: DAY_SECONDS,
      cookieCache: { enabled: false },
    },
    account: { modelName: 'auth_accounts' },
    verification: { modelName: 'auth_verifications' },
    disabledPaths: DISABLED_PATHS,
    emailAndPassword: {
      enabled: true,
      // Q2: unconfirmed accounts sign in; the commands refuse their contributions instead.
      requireEmailVerification: false,
      autoSignIn: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      resetPasswordTokenExpiresIn: RESET_TOKEN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) => deps.hasher.hash(password),
        verify: ({ hash, password }) => deps.hasher.verify(password, hash),
      },
      sendResetPassword: (data) => hooks.sendResetPassword(data),
    },
    emailVerification: {
      expiresIn: VERIFY_TOKEN_SECONDS,
      sendOnSignUp: false,
      sendOnSignIn: false,
      // Guarded by the session hook: a suspended, banned or deleted profile gets no session.
      autoSignInAfterVerification: true,
      sendVerificationEmail: (data) => hooks.sendVerificationEmail(data),
    },
    databaseHooks: {
      user: { create: { before: () => hooks.userCreateBefore() } },
      session: { create: { before: (session) => hooks.sessionCreateBefore(session.userId) } },
    },
    // BR7.5: defence in depth only; the RateLimiter port's limits are stricter and answer first.
    rateLimit: { enabled: true, storage: 'memory', window: 60, max: 100 },
    advanced: {
      cookiePrefix: 'rk',
      useSecureCookies: deps.appUrl.startsWith('https://'),
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      // BR4.9: no IP address on any session row.
      ipAddress: { disableIpTracking: true },
      database: { generateId: () => newId() },
    },
    telemetry: { enabled: false },
    // NFR3, BR8.1: the library's lines carry raw addresses and Drizzle errors with their query
    // params, so only the level and the call's purpose reach the allowlisted logger.
    logger: {
      level: 'warn',
      log: (level) => {
        const fields = { purpose: currentScope()?.purpose ?? 'none' };
        if (level === 'error') deps.logger.error('auth.library_log', fields);
        else deps.logger.warn('auth.library_log', fields);
      },
    },
    plugins: [],
  });
}

export type AuthInstance = ReturnType<typeof createAuthInstance>;
