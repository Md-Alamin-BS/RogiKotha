// `AuthGateway` over Better Auth 1.7 (FD-093, T-101 § 6.2 and § 10.2). Each method opens its own
// library-call scope, so the hooks in `instance.ts` act only for this call (BR7.9). Library errors
// become the port's codes; anything unexpected is thrown for `defineCommand` to turn into
// `internal`.
import {
  portErr,
  portOk,
  type AuthGateway,
  type AuthSessionInfo,
  type AuthSessionRecord,
  type Logger,
  type RequestHeaders,
  type SetCookieHeaders,
} from '@rogikotha/application';
import { createEmailVerificationToken, isAPIError } from 'better-auth/api';

import type { AuthInstance } from './instance';
import { runInScope } from './library-scope';

const VERIFY_TOKEN_SECONDS = 24 * 60 * 60;
const RESET_IDENTIFIER_PREFIX = 'reset-password:';

/** The `body.code` of a Better Auth `APIError`, or null for any other throw. */
export function libraryErrorCode(error: unknown): string | null {
  if (!isAPIError(error)) return null;
  const code = (error as { body?: { code?: unknown } }).body?.code;
  return typeof code === 'string' ? code : null;
}

/** The library wants Fetch `Headers`; only the cookie and origin matter to it here. */
function toHeaders(headers: RequestHeaders): Headers {
  if (headers instanceof Headers) return headers;
  const copy = new Headers();
  for (const name of ['cookie', 'origin', 'user-agent']) {
    const value = headers.get(name);
    if (value !== null) copy.set(name, value);
  }
  return copy;
}

function setCookiesOf(headers: Headers): SetCookieHeaders {
  return headers.getSetCookie();
}

interface LibrarySession {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userAgent?: string | null | undefined;
}

function toSessionInfo(session: LibrarySession): AuthSessionInfo {
  return {
    sessionId: session.id,
    authUserId: session.userId,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    expiresAt: new Date(session.expiresAt),
  };
}

/**
 * The address inside a verification token the library has just accepted. Only read after
 * `verifyEmail` returned, so the signature was already checked.
 */
function verifiedTokenEmail(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
    };
    return typeof parsed.email === 'string' ? parsed.email : null;
  } catch {
    return null;
  }
}

export function createAuthGateway(auth: AuthInstance, logger: Logger): AuthGateway {
  const context = () => auth.$context;

  const libraryError = (method: string, error: unknown) => {
    logger.error('auth.library_error', {
      purpose: method,
      errorCode: libraryErrorCode(error) ?? 'unknown',
    });
    return portErr('library_error' as const);
  };

  const userIdByEmail = async (email: string): Promise<string | null> => {
    // The library stores addresses lower-cased (sign-up and sign-in both lower-case them).
    const found = await (await context()).internalAdapter.findUserByEmail(email.toLowerCase());
    return found?.user.id ?? null;
  };

  return {
    createCredentialUser({ email, password }) {
      return runInScope({ purpose: 'register' }, async () => {
        // With `autoSignIn: false` the library answers a duplicate with a synthetic user and a
        // fresh id that has no row, so the gateway checks the address itself, before and after.
        if ((await userIdByEmail(email)) !== null) return portErr('email_exists');
        let createdId: string;
        try {
          // ASSUMPTION(T-101): the library's `name` stays empty; the display name lives only in
          // account_profiles, so the auth tables hold no second copy of it (as in the demo slice).
          const result = await auth.api.signUpEmail({ body: { email, password, name: '' } });
          createdId = result.user.id;
        } catch (error) {
          const code = libraryErrorCode(error);
          const duplicate =
            code === 'USER_ALREADY_EXISTS' ||
            code === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL' ||
            // Review point 5: a racing registration's unique violation surfaces as this code.
            (code === 'FAILED_TO_CREATE_USER' && (await userIdByEmail(email)) !== null);
          if (duplicate) return portErr('email_exists');
          return libraryError('register', error);
        }
        // A racing registration that won between the check and the call gets the synthetic answer.
        if ((await userIdByEmail(email)) !== createdId) return portErr('email_exists');
        return portOk({ authUserId: createdId });
      });
    },

    async deleteUser(authUserId) {
      try {
        await (await context()).internalAdapter.deleteUser(authUserId);
        return portOk(null);
      } catch (error) {
        return libraryError('deleteUser', error);
      }
    },

    issueVerificationToken(email) {
      return runInScope({ purpose: 'issueVerification' }, async () => {
        try {
          if ((await userIdByEmail(email)) === null) return portErr('user_not_found');
          // ASSUMPTION(T-101): the token is minted directly with the library's own signer, the
          // same JWT `sendVerificationEmail` builds, so no library endpoint (and none of its own
          // 500 ms floor or callback timing) sits between the command and its token.
          const ctx = await context();
          const token = await createEmailVerificationToken(
            ctx.secret,
            email,
            undefined,
            VERIFY_TOKEN_SECONDS,
          );
          return portOk({ token });
        } catch (error) {
          return libraryError('issueVerification', error);
        }
      });
    },

    verifyEmailToken(token) {
      return runInScope({ purpose: 'verify' }, async (scope) => {
        let setCookies: SetCookieHeaders | null = null;
        try {
          const result = await auth.api.verifyEmail({ query: { token }, returnHeaders: true });
          const cookies = setCookiesOf(result.headers);
          setCookies = cookies.length > 0 ? cookies : null;
        } catch (error) {
          const code = libraryErrorCode(error);
          if (code === 'TOKEN_EXPIRED') return portErr('token_expired');
          // Spike: the address is verified before the refused session throws (BR2.2).
          if (code !== 'FAILED_TO_CREATE_SESSION') return portErr('token_invalid');
        }
        const email = verifiedTokenEmail(token);
        const authUserId = scope.authUserId ?? (email ? await userIdByEmail(email) : null);
        if (authUserId === null) return portErr('token_invalid');
        return portOk({ authUserId, setCookies });
      });
    },

    issueResetToken(email) {
      return runInScope({ purpose: 'issueReset' }, async (scope) => {
        try {
          await auth.api.requestPasswordReset({ body: { email } });
        } catch (error) {
          return libraryError('issueReset', error);
        }
        return scope.token ? portOk({ token: scope.token }) : portErr('user_not_found');
      });
    },

    resetPassword({ token, newPassword }) {
      return runInScope({ purpose: 'reset' }, async () => {
        const ctx = await context();
        const row = await ctx.internalAdapter.findVerificationValue(
          `${RESET_IDENTIFIER_PREFIX}${token}`,
        );
        if (!row) return portErr('token_invalid');
        if (new Date(row.expiresAt).getTime() <= Date.now()) return portErr('token_expired');
        // Each link is its own row and the library consumes only the one used, so the user's
        // other links go first; a failed reset then costs only a fresh request (BR5.1).
        await ctx.adapter.deleteMany({
          model: 'verification',
          where: [
            { field: 'identifier', operator: 'starts_with', value: RESET_IDENTIFIER_PREFIX },
            { field: 'value', value: row.value },
            { field: 'identifier', operator: 'ne', value: row.identifier },
          ],
        });
        try {
          await auth.api.resetPassword({ body: { token, newPassword } });
          return portOk({ authUserId: row.value });
        } catch (error) {
          if (libraryErrorCode(error) === null) throw error;
          return portErr('token_invalid');
        }
      });
    },

    changePassword({ headers, currentPassword, newPassword }) {
      return runInScope({ purpose: 'changePassword' }, async () => {
        try {
          const result = await auth.api.changePassword({
            body: { currentPassword, newPassword, revokeOtherSessions: true },
            headers: toHeaders(headers),
            returnHeaders: true,
          });
          return portOk({ setCookies: setCookiesOf(result.headers) });
        } catch (error) {
          if (libraryErrorCode(error) === 'INVALID_PASSWORD') return portErr('invalid_credentials');
          return libraryError('changePassword', error);
        }
      });
    },

    createSession({ email, password }) {
      return runInScope({ purpose: 'signIn', sessionAllowed: true }, async () => {
        try {
          const result = await auth.api.signInEmail({
            body: { email, password },
            returnHeaders: true,
          });
          return portOk({ setCookies: setCookiesOf(result.headers) });
        } catch (error) {
          const code = libraryErrorCode(error);
          if (code === 'INVALID_EMAIL_OR_PASSWORD') return portErr('invalid_credentials');
          if (code === 'FAILED_TO_CREATE_SESSION') return portErr('session_refused');
          return libraryError('signIn', error);
        }
      });
    },

    async getSession(headers) {
      const found = await auth.api.getSession({ headers: toHeaders(headers) });
      return found ? toSessionInfo(found.session) : null;
    },

    async listSessions(authUserId) {
      const sessions = (await (
        await context()
      ).internalAdapter.listSessions(authUserId, {
        onlyActiveSessions: true,
      })) as LibrarySession[];
      return sessions.map((session): AuthSessionRecord => ({
        ...toSessionInfo(session),
        userAgent: session.userAgent ?? null,
      }));
    },

    async revokeSession(sessionId) {
      const ctx = await context();
      const row = await ctx.adapter.findOne<{ token: string }>({
        model: 'session',
        where: [{ field: 'id', value: sessionId }],
      });
      if (row) await ctx.internalAdapter.deleteSession(row.token);
    },

    async revokeSessions(authUserId) {
      const ctx = await context();
      const live = await ctx.internalAdapter.listSessions(authUserId, { onlyActiveSessions: true });
      await ctx.internalAdapter.deleteUserSessions(authUserId);
      return { revoked: live.length };
    },
  };
}
