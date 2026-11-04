import { newId } from '@rogikotha/contracts';
import { authAccounts, authSessions, authUsers, authVerifications } from '@rogikotha/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import { getDb } from '../db';
import { optionalEnv, requireEnv } from '../env';
import { hashPassword, verifyPassword } from './password';

export const MIN_PASSWORD_LENGTH = 10;

function createAuth() {
  const baseURL = requireEnv('APP_URL');
  return betterAuth({
    appName: 'RogiKotha',
    baseURL,
    secret: requireEnv('BETTER_AUTH_SECRET'),
    // The adapter looks tables up by model name and columns by Drizzle property name, so only the
    // model names are mapped; the properties in schema/auth.ts already match Better Auth's fields.
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        auth_users: authUsers,
        auth_sessions: authSessions,
        auth_accounts: authAccounts,
        auth_verifications: authVerifications,
      },
    }),
    user: { modelName: 'auth_users' },
    session: { modelName: 'auth_sessions' },
    account: { modelName: 'auth_accounts' },
    verification: { modelName: 'auth_verifications' },
    // Over HTTP these skip the server actions' checks and name a registered email (FR1.1, NFR3);
    // disabledPaths applies only to the HTTP router, so `auth.api.*` calls keep working.
    disabledPaths: [
      '/sign-up/email',
      '/sign-in/email',
      '/update-user',
      '/change-email',
      '/change-password',
      '/delete-user',
    ],
    emailAndPassword: {
      enabled: true,
      // ASSUMPTION(demo-slice): no email verification in the demo (requirements Q1, FD-099).
      requireEmailVerification: false,
      autoSignIn: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      password: {
        hash: hashPassword,
        verify: ({ hash, password }) => verifyPassword(hash, password),
      },
    },
    advanced: {
      cookiePrefix: 'rk',
      useSecureCookies: baseURL.startsWith('https://') || optionalEnv('APP_MODE') === 'production',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' },
      database: { generateId: () => newId() },
    },
    telemetry: { enabled: false },
    // Pinned, not left to the default: Better Auth logs a duplicate sign-up's email at info (NFR3).
    logger: { level: 'warn' },
    // Must stay last: it writes the cookies set by `auth.api.*` calls inside server actions.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & { __rkAuth?: Auth };

/** The Better Auth instance, created on first use so `next build` needs no secrets or database. */
export function getAuth(): Auth {
  globalForAuth.__rkAuth ??= createAuth();
  return globalForAuth.__rkAuth;
}
