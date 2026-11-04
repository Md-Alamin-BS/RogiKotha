// What Better Auth keeps in `auth_users`, `auth_accounts`, `auth_sessions` and
// `auth_verifications`, in memory. `FakeAuthGateway` writes it the way the library does, and
// `FakeAccountRepository` reads it the way `PgAccountRepository` joins those tables, so a test
// sees one consistent world. The library commits on its own connection, so a rollback of the
// application's unit of work never undoes these rows (T-101 Q4).

export interface FakeAuthUser {
  authUserId: string;
  /** Normalised, as the commands pass it. */
  email: string;
  passwordHash: string;
  emailVerified: boolean;
}

export interface FakeAuthSession {
  sessionId: string;
  authUserId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userAgent: string | null;
}

export interface FakeAuthToken {
  token: string;
  authUserId: string;
  expiresAt: Date;
}

export class FakeAuthStore {
  readonly users = new Map<string, FakeAuthUser>();
  readonly sessions = new Map<string, FakeAuthSession>();
  readonly verificationTokens = new Map<string, FakeAuthToken>();
  readonly resetTokens = new Map<string, FakeAuthToken>();
  private counter = 0;

  nextId(prefix: string): string {
    this.counter += 1;
    return `${prefix}-${this.counter}`;
  }

  userByEmail(email: string): FakeAuthUser | undefined {
    for (const user of this.users.values()) if (user.email === email) return user;
    return undefined;
  }

  sessionsOf(authUserId: string): FakeAuthSession[] {
    return [...this.sessions.values()].filter((s) => s.authUserId === authUserId);
  }

  deleteSessionsOf(authUserId: string, keep?: string): number {
    let revoked = 0;
    for (const session of this.sessionsOf(authUserId)) {
      if (session.sessionId === keep) continue;
      this.sessions.delete(session.sessionId);
      revoked += 1;
    }
    return revoked;
  }
}
