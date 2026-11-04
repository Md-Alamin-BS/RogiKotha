// `AccountRepository` port fake (T-101 § 6.2) over `FakeAuthStore`, the way `PgAccountRepository`
// joins `account_profiles` with the library's tables. The profile, persona, preference and
// feedback rows belong to the application transaction, so a rollback of `InMemoryUnitOfWork`
// undoes them; the library's rows stay. The methods without a `tx` are the T-103, T-401 and T-409
// stubs of `PgAccountRepository`, kept so the superset test stays green.
import {
  portErr,
  portOk,
  type AccountByEmailRecord,
  type AccountCredentialRecord,
  type AccountPreferencesPatch,
  type AccountPreferencesRecord,
  type AccountProfileRecord,
  type AccountRepository,
  type NewAccountProfile,
  type NewDefaultPersonas,
  type NewFeedback,
  type ResetTokenAccountRecord,
  type Tx,
} from '@rogikotha/application';
import type { AccountStatus, Locale } from '@rogikotha/contracts';

import { seqId } from '../builders/seq.js';
import { FakeAuthStore } from './auth-store.js';
import type { Transactional } from './unit-of-work.js';

type Row = Record<string, unknown>;

export interface FakeProfileRow extends NewAccountProfile {
  status: AccountStatus;
}

export interface FakePersonaRow {
  personaId: string;
  accountId: string;
  kind: 'named' | 'pseudonymous';
  displayName: string;
  username: string;
}

interface AccountTables {
  profiles: Map<string, FakeProfileRow>;
  personas: FakePersonaRow[];
  preferences: Map<string, AccountPreferencesRecord>;
  feedback: NewFeedback[];
}

function defaultPreferences(accountId: string, interfaceLocale: Locale): AccountPreferencesRecord {
  return {
    accountId,
    interfaceLocale,
    emailSecurity: true,
    emailModeration: true,
    emailEvidence: true,
    emailDiscussion: true,
  };
}

export class FakeAccountRepository implements AccountRepository, Transactional {
  private tables: AccountTables = {
    profiles: new Map(),
    personas: [],
    preferences: new Map(),
    feedback: [],
  };
  /** Usernames that pass `usernameTaken` but collide on insert, like a registration race. */
  readonly racingUsernames = new Set<string>();
  /** Number of `findCredentialByEmail` and `findByEmail` reads, so a test can prove none ran. */
  emailReads = 0;

  readonly devices = new Map<string, Row>();
  readonly deviceApprovals = new Map<string, Row>();
  readonly bookmarks = new Map<string, Row>();
  readonly blocks = new Map<string, Row>();

  constructor(readonly store: FakeAuthStore = new FakeAuthStore()) {}

  get profiles(): ReadonlyMap<string, FakeProfileRow> {
    return this.tables.profiles;
  }

  get personas(): readonly FakePersonaRow[] {
    return this.tables.personas;
  }

  get feedback(): readonly NewFeedback[] {
    return this.tables.feedback;
  }

  findProfileByAuthUserId(_tx: Tx, authUserId: string): Promise<AccountProfileRecord | null> {
    const row = [...this.tables.profiles.values()].find((p) => p.authUserId === authUserId);
    return Promise.resolve(row ? this.toProfile(row) : null);
  }

  findProfileById(_tx: Tx, accountId: string): Promise<AccountProfileRecord | null> {
    const row = this.tables.profiles.get(accountId);
    return Promise.resolve(row ? this.toProfile(row) : null);
  }

  findByEmail(_tx: Tx, email: string): Promise<AccountByEmailRecord | null> {
    this.emailReads += 1;
    const credential = this.credentialFor(email);
    if (!credential) return Promise.resolve(null);
    const { passwordHash: _hash, ...record } = credential;
    void _hash;
    return Promise.resolve(record);
  }

  findCredentialByEmail(_tx: Tx, email: string): Promise<AccountCredentialRecord | null> {
    this.emailReads += 1;
    return Promise.resolve(this.credentialFor(email));
  }

  findCredentialByAccountId(_tx: Tx, accountId: string): Promise<AccountCredentialRecord | null> {
    const row = this.tables.profiles.get(accountId);
    const user = row ? this.store.users.get(row.authUserId) : undefined;
    return Promise.resolve(row && user ? this.toCredential(row, user.passwordHash) : null);
  }

  findOwnEmail(_tx: Tx, accountId: string): Promise<string | null> {
    const row = this.tables.profiles.get(accountId);
    return Promise.resolve((row && this.store.users.get(row.authUserId)?.email) ?? null);
  }

  findResetTokenAccount(_tx: Tx, token: string): Promise<ResetTokenAccountRecord | null> {
    const found = this.store.resetTokens.get(token);
    const user = found ? this.store.users.get(found.authUserId) : undefined;
    const row = user ? this.profileOfAuthUser(user.authUserId) : undefined;
    if (!found || !user || !row) return Promise.resolve(null);
    return Promise.resolve({
      accountId: row.accountId,
      authUserId: row.authUserId,
      status: row.status,
      email: user.email,
      expiresAt: found.expiresAt,
    });
  }

  usernameTaken(_tx: Tx, username: string): Promise<boolean> {
    return Promise.resolve(this.hasUsername(username));
  }

  createProfile(_tx: Tx, profile: NewAccountProfile) {
    if (this.hasUsername(profile.username) || this.racingUsernames.has(profile.username)) {
      return Promise.resolve(portErr('username_taken'));
    }
    this.tables.profiles.set(profile.accountId, { ...profile, status: 'pending_verification' });
    return Promise.resolve(portOk(null));
  }

  insertDefaultPersonas(_tx: Tx, input: NewDefaultPersonas): Promise<void> {
    this.tables.personas.push(
      {
        personaId: input.namedPersonaId,
        accountId: input.accountId,
        kind: 'named',
        displayName: input.displayName,
        username: input.username,
      },
      {
        personaId: input.pseudonymousPersonaId,
        accountId: input.accountId,
        kind: 'pseudonymous',
        displayName: input.username,
        username: input.username,
      },
    );
    return Promise.resolve();
  }

  updateStatus(_tx: Tx, accountId: string, status: AccountStatus): Promise<void> {
    const row = this.tables.profiles.get(accountId);
    if (row) this.tables.profiles.set(accountId, { ...row, status });
    return Promise.resolve();
  }

  insertPreferences(_tx: Tx, input: { accountId: string; interfaceLocale: Locale }): Promise<void> {
    this.tables.preferences.set(
      input.accountId,
      defaultPreferences(input.accountId, input.interfaceLocale),
    );
    return Promise.resolve();
  }

  findPreferences(_tx: Tx, accountId: string): Promise<AccountPreferencesRecord | null> {
    const found = this.tables.preferences.get(accountId);
    return Promise.resolve(found ? { ...found } : null);
  }

  savePreferences(_tx: Tx, accountId: string, patch: AccountPreferencesPatch): Promise<void> {
    const current = this.tables.preferences.get(accountId);
    if (current) this.tables.preferences.set(accountId, { ...current, ...patch });
    return Promise.resolve();
  }

  insertFeedback(_tx: Tx, feedback: NewFeedback): Promise<void> {
    this.tables.feedback.push({ ...feedback });
    return Promise.resolve();
  }

  /** Legacy finder kept for the T-103 staff code; the commands use `findProfileByAuthUserId`. */
  findByAuthUserId(authUserId: string): Promise<FakeProfileRow | undefined> {
    return Promise.resolve(this.profileOfAuthUser(authUserId));
  }

  findByUsername(username: string): Promise<FakeProfileRow | undefined> {
    const key = username.toLowerCase();
    return Promise.resolve(
      [...this.tables.profiles.values()].find((p) => p.username.toLowerCase() === key),
    );
  }

  listDevices(accountId: string): Promise<Row[]> {
    return Promise.resolve([...this.devices.values()].filter((d) => d.accountId === accountId));
  }

  upsertDevice(input: Row): Promise<Row> {
    const row = { id: seqId('device'), ...input };
    this.devices.set(row.id, row);
    return Promise.resolve(row);
  }

  createDeviceApproval(deviceId: string): Promise<Row> {
    const row: Row = { id: seqId('approval'), deviceId, tokenHash: seqId('token') };
    this.deviceApprovals.set(row.id as string, row);
    return Promise.resolve(row);
  }

  consumeDeviceApproval(tokenHash: string): Promise<Row | undefined> {
    const approval = [...this.deviceApprovals.values()].find((a) => a.tokenHash === tokenHash);
    if (approval) approval.usedAt = new Date();
    return Promise.resolve(approval);
  }

  addBookmark(accountId: string, reviewId: string): Promise<Row> {
    const row = { id: `${accountId}:${reviewId}`, accountId, reviewId };
    this.bookmarks.set(row.id, row);
    return Promise.resolve(row);
  }

  removeBookmark(accountId: string, reviewId: string): Promise<boolean> {
    return Promise.resolve(this.bookmarks.delete(`${accountId}:${reviewId}`));
  }

  listBookmarks(accountId: string): Promise<Row[]> {
    return Promise.resolve([...this.bookmarks.values()].filter((b) => b.accountId === accountId));
  }

  setBlock(blockerAccountId: string, blockedAccountId: string): Promise<Row> {
    const row = {
      id: `${blockerAccountId}:${blockedAccountId}`,
      blockerAccountId,
      blockedAccountId,
    };
    this.blocks.set(row.id, row);
    return Promise.resolve(row);
  }

  unsetBlock(blockerAccountId: string, blockedAccountId: string): Promise<boolean> {
    return Promise.resolve(this.blocks.delete(`${blockerAccountId}:${blockedAccountId}`));
  }

  isBlocked(blockerAccountId: string, blockedAccountId: string): Promise<boolean> {
    return Promise.resolve(this.blocks.has(`${blockerAccountId}:${blockedAccountId}`));
  }

  snapshot(): unknown {
    return {
      profiles: new Map(this.tables.profiles),
      personas: [...this.tables.personas],
      preferences: new Map(this.tables.preferences),
      feedback: [...this.tables.feedback],
    } satisfies AccountTables;
  }

  restore(state: unknown): void {
    const saved = state as AccountTables;
    this.tables = {
      profiles: new Map(saved.profiles),
      personas: [...saved.personas],
      preferences: new Map(saved.preferences),
      feedback: [...saved.feedback],
    };
  }

  private hasUsername(username: string): boolean {
    const key = username.toLowerCase();
    return [...this.tables.profiles.values()].some((p) => p.username.toLowerCase() === key);
  }

  private profileOfAuthUser(authUserId: string): FakeProfileRow | undefined {
    return [...this.tables.profiles.values()].find((p) => p.authUserId === authUserId);
  }

  private credentialFor(email: string): AccountCredentialRecord | null {
    const user = this.store.userByEmail(email);
    const row = user ? this.profileOfAuthUser(user.authUserId) : undefined;
    return user && row ? this.toCredential(row, user.passwordHash) : null;
  }

  private toCredential(row: FakeProfileRow, passwordHash: string): AccountCredentialRecord {
    return {
      accountId: row.accountId,
      authUserId: row.authUserId,
      status: row.status,
      passwordHash,
    };
  }

  private toProfile(row: FakeProfileRow): AccountProfileRecord {
    return {
      accountId: row.accountId,
      authUserId: row.authUserId,
      username: row.username,
      displayName: row.displayName,
      locale: row.locale,
      status: row.status,
    };
  }
}
