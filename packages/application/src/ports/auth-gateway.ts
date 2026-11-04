// The only way application code reaches Better Auth (FD-093, T-101 § 6.2 and § 10.2). Implemented
// in `apps/web/src/server/better-auth/gateway.ts`; each method runs the library inside its own
// library-call scope, so the library's hooks and email callbacks act only for that call (BR7.9).
import type { PortResult } from './port-result';

/** Satisfied by the Fetch `Headers` the web tier passes through; application code never reads it. */
export interface RequestHeaders {
  get(name: string): string | null;
}

/**
 * `Set-Cookie` values from the library. They carry the session token, so only the server action
 * reads them, applies them with `cookies()` and never returns them to the browser (BR8.3).
 */
export type SetCookieHeaders = readonly string[];

export interface AuthSessionInfo {
  /** The library's session id, never the token. */
  sessionId: string;
  authUserId: string;
  createdAt: Date;
  /** Last refresh; shown as last seen. */
  updatedAt: Date;
  expiresAt: Date;
}

export interface AuthSessionRecord extends AuthSessionInfo {
  /** Input to the browser and OS families only; never shown or logged. */
  userAgent: string | null;
}

export type AuthLibraryError = 'library_error';

export interface AuthGateway {
  /** Register scope: user plus credential, hash through `PasswordHasher`, no session, no email. */
  createCredentialUser(input: {
    email: string;
    password: string;
  }): Promise<PortResult<{ authUserId: string }, 'email_exists' | AuthLibraryError>>;
  /** Register compensation (`auth_users` cascade), never through a library HTTP path. */
  deleteUser(authUserId: string): Promise<PortResult<null, AuthLibraryError>>;
  /** IssueVerification scope: the callback's token comes back here; the library sends nothing. */
  issueVerificationToken(
    email: string,
  ): Promise<PortResult<{ token: string }, 'user_not_found' | AuthLibraryError>>;
  /**
   * Verify scope with the library's auto sign-in. `setCookies` is null when the session hook
   * refused a session for the account's status: verified, but not signed in (BR2.2).
   */
  verifyEmailToken(
    token: string,
  ): Promise<
    PortResult<
      { authUserId: string; setCookies: SetCookieHeaders | null },
      'token_invalid' | 'token_expired'
    >
  >;
  /** IssueReset scope, 1 h token. */
  issueResetToken(
    email: string,
  ): Promise<PortResult<{ token: string }, 'user_not_found' | AuthLibraryError>>;
  /**
   * Reset scope: consumes the token and every other outstanding reset token of the same user, so
   * an older link cannot replay a completed reset; rotates the password; revokes the sessions.
   */
  resetPassword(input: {
    token: string;
    newPassword: string;
  }): Promise<PortResult<{ authUserId: string }, 'token_invalid' | 'token_expired'>>;
  /** ChangePassword scope: rotates the password and revokes every other session. */
  changePassword(input: {
    headers: RequestHeaders;
    currentPassword: string;
    newPassword: string;
  }): Promise<
    PortResult<{ setCookies: SetCookieHeaders }, 'invalid_credentials' | AuthLibraryError>
  >;
  /**
   * SignIn scope with `sessionAllowed`: only a command that already checked the password and the
   * status calls it (BR3.8).
   */
  createSession(input: {
    email: string;
    password: string;
  }): Promise<
    PortResult<
      { setCookies: SetCookieHeaders },
      'invalid_credentials' | 'session_refused' | AuthLibraryError
    >
  >;
  /** The session the request's cookie names, or null. Never called inside a cached scope (BR4.4). */
  getSession(headers: RequestHeaders): Promise<AuthSessionInfo | null>;
  listSessions(authUserId: string): Promise<AuthSessionRecord[]>;
  revokeSession(sessionId: string): Promise<void>;
  revokeSessions(authUserId: string): Promise<{ revoked: number }>;
}
