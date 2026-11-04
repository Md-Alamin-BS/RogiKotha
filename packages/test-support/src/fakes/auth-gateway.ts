// `AuthGateway` port fake: Better Auth's behaviour as the gateway exposes it (T-101 § 6.2, the
// spike results in code-summary.md), over `FakeAuthStore`. It hashes and verifies through the
// `PasswordHasher` it is given, as the real instance does, and records each method it was asked
// for, so a test can prove a command never reached the library.
import {
  portErr,
  portOk,
  type AuthGateway,
  type AuthSessionInfo,
  type AuthSessionRecord,
  type Clock,
  type PasswordHasher,
  type RequestHeaders,
  type SetCookieHeaders,
} from '@rogikotha/application';

import type { FakeAuthSession, FakeAuthStore, FakeAuthToken } from './auth-store.js';

export const FAKE_SESSION_COOKIE = 'fake.session_token';
const DAY_MS = 24 * 60 * 60 * 1000;
const VERIFY_TOKEN_MS = DAY_MS;
const RESET_TOKEN_MS = 60 * 60 * 1000;
const SESSION_MS = 30 * DAY_MS;

export type AuthGatewayMethod = keyof AuthGateway;

/** The request headers a signed-in browser sends for one session. */
export function sessionHeaders(sessionId: string | null, userAgent?: string): RequestHeaders {
  return {
    get(name: string): string | null {
      const header = name.toLowerCase();
      if (header === 'cookie') return sessionId ? `${FAKE_SESSION_COOKIE}=${sessionId}` : null;
      if (header === 'user-agent') return userAgent ?? null;
      return null;
    },
  };
}

function sessionIdFromHeaders(headers: RequestHeaders): string | null {
  const cookie = headers.get('cookie') ?? '';
  const pair = cookie.split(';').find((part) => part.trim().startsWith(`${FAKE_SESSION_COOKIE}=`));
  return pair ? (pair.split('=')[1] ?? '').trim() || null : null;
}

export class FakeAuthGateway implements AuthGateway {
  readonly calls: AuthGatewayMethod[] = [];
  /** The library refuses a session for these users, like the `session.create.before` hook. */
  readonly sessionRefusedFor = new Set<string>();
  private readonly libraryErrors = new Set<AuthGatewayMethod>();

  constructor(
    private readonly store: FakeAuthStore,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  /** The next call of `method` answers `library_error` (methods that have that code). */
  failNext(method: AuthGatewayMethod): void {
    this.libraryErrors.add(method);
  }

  called(method: AuthGatewayMethod): number {
    return this.calls.filter((c) => c === method).length;
  }

  async createCredentialUser(input: { email: string; password: string }) {
    this.calls.push('createCredentialUser');
    if (this.takeLibraryError('createCredentialUser')) return portErr('library_error');
    if (this.store.userByEmail(input.email)) return portErr('email_exists');
    const authUserId = this.store.nextId('auth-user');
    const passwordHash = await this.hasher.hash(input.password);
    this.store.users.set(authUserId, {
      authUserId,
      email: input.email,
      passwordHash,
      emailVerified: false,
    });
    return portOk({ authUserId });
  }

  deleteUser(authUserId: string) {
    this.calls.push('deleteUser');
    if (this.takeLibraryError('deleteUser')) return Promise.resolve(portErr('library_error'));
    this.store.users.delete(authUserId);
    this.store.deleteSessionsOf(authUserId);
    return Promise.resolve(portOk(null));
  }

  issueVerificationToken(email: string) {
    this.calls.push('issueVerificationToken');
    return Promise.resolve(this.issueToken(email, this.store.verificationTokens, VERIFY_TOKEN_MS));
  }

  verifyEmailToken(token: string) {
    this.calls.push('verifyEmailToken');
    const found = this.liveToken(this.store.verificationTokens, token);
    if (!found.ok) return Promise.resolve(found);
    const user = this.store.users.get(found.data.authUserId);
    if (!user) return Promise.resolve(portErr('token_invalid'));
    // The library marks the address verified before its auto sign-in (spike, code-summary.md).
    user.emailVerified = true;
    const setCookies = this.sessionRefusedFor.has(user.authUserId)
      ? null
      : this.openSession(user.authUserId, null);
    return Promise.resolve(portOk({ authUserId: user.authUserId, setCookies }));
  }

  issueResetToken(email: string) {
    this.calls.push('issueResetToken');
    return Promise.resolve(this.issueToken(email, this.store.resetTokens, RESET_TOKEN_MS));
  }

  async resetPassword(input: { token: string; newPassword: string }) {
    this.calls.push('resetPassword');
    const found = this.liveToken(this.store.resetTokens, input.token);
    if (!found.ok) return found;
    for (const [token, entry] of this.store.resetTokens) {
      if (entry.authUserId === found.data.authUserId) this.store.resetTokens.delete(token);
    }
    const user = this.store.users.get(found.data.authUserId);
    if (!user) return portErr('token_invalid');
    user.passwordHash = await this.hasher.hash(input.newPassword);
    this.store.deleteSessionsOf(user.authUserId);
    return portOk({ authUserId: user.authUserId });
  }

  async changePassword(input: {
    headers: RequestHeaders;
    currentPassword: string;
    newPassword: string;
  }) {
    this.calls.push('changePassword');
    if (this.takeLibraryError('changePassword')) return portErr('library_error');
    const session = this.sessionFor(input.headers);
    const user = session ? this.store.users.get(session.authUserId) : undefined;
    if (!session || !user) return portErr('invalid_credentials');
    if (!(await this.hasher.verify(input.currentPassword, user.passwordHash))) {
      return portErr('invalid_credentials');
    }
    user.passwordHash = await this.hasher.hash(input.newPassword);
    this.store.deleteSessionsOf(user.authUserId);
    return portOk({ setCookies: this.openSession(user.authUserId, null) });
  }

  async createSession(input: { email: string; password: string }) {
    this.calls.push('createSession');
    if (this.takeLibraryError('createSession')) return portErr('library_error');
    const user = this.store.userByEmail(input.email);
    if (!user || !(await this.hasher.verify(input.password, user.passwordHash))) {
      return portErr('invalid_credentials');
    }
    if (this.sessionRefusedFor.has(user.authUserId)) return portErr('session_refused');
    return portOk({ setCookies: this.openSession(user.authUserId, null) });
  }

  getSession(headers: RequestHeaders): Promise<AuthSessionInfo | null> {
    this.calls.push('getSession');
    const session = this.sessionFor(headers);
    if (!session) return Promise.resolve(null);
    const { userAgent: _userAgent, ...info } = session;
    void _userAgent;
    return Promise.resolve(info);
  }

  listSessions(authUserId: string): Promise<AuthSessionRecord[]> {
    this.calls.push('listSessions');
    return Promise.resolve(this.store.sessionsOf(authUserId).map((s) => ({ ...s })));
  }

  revokeSession(sessionId: string): Promise<void> {
    this.calls.push('revokeSession');
    this.store.sessions.delete(sessionId);
    return Promise.resolve();
  }

  revokeSessions(authUserId: string): Promise<{ revoked: number }> {
    this.calls.push('revokeSessions');
    return Promise.resolve({ revoked: this.store.deleteSessionsOf(authUserId) });
  }

  /** Test helper: a live session for the user, as if it signed in; returns its id. */
  openSessionFor(authUserId: string, userAgent: string | null = null, createdAt?: Date): string {
    const now = createdAt ?? this.clock.now();
    const session: FakeAuthSession = {
      sessionId: this.store.nextId('session'),
      authUserId,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + SESSION_MS),
      userAgent,
    };
    this.store.sessions.set(session.sessionId, session);
    return session.sessionId;
  }

  private openSession(authUserId: string, userAgent: string | null): SetCookieHeaders {
    const sessionId = this.openSessionFor(authUserId, userAgent);
    return [`${FAKE_SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; SameSite=Lax`];
  }

  private sessionFor(headers: RequestHeaders): FakeAuthSession | null {
    const sessionId = sessionIdFromHeaders(headers);
    const session = sessionId ? this.store.sessions.get(sessionId) : undefined;
    if (!session || session.expiresAt.getTime() <= this.clock.now().getTime()) return null;
    return session;
  }

  private issueToken(email: string, tokens: Map<string, FakeAuthToken>, lifetimeMs: number) {
    const user = this.store.userByEmail(email);
    if (!user) return portErr('user_not_found');
    const token = this.store.nextId('token');
    const expiresAt = new Date(this.clock.now().getTime() + lifetimeMs);
    tokens.set(token, { token, authUserId: user.authUserId, expiresAt });
    return portOk({ token });
  }

  private liveToken(tokens: Map<string, FakeAuthToken>, token: string) {
    const found = tokens.get(token);
    if (!found) return portErr('token_invalid');
    if (found.expiresAt.getTime() <= this.clock.now().getTime()) return portErr('token_expired');
    return portOk(found);
  }

  private takeLibraryError(method: AuthGatewayMethod): boolean {
    return this.libraryErrors.delete(method);
  }
}
