// The `AccountRepository` port (T-101 functional-spec § 6.2). The only reader of `auth_users.email`
// and of the password hash. No method here touches `personas` or `persona_links`: the default
// personas are written by the private identity repository it delegates to (AD-3, U11 BR3.2, Q2).
// The device, bookmark and block methods stay
// stubs until their tasks (03-routes-and-contracts.md §4).
import type {
  AccountByEmailRecord,
  AccountCredentialRecord,
  AccountPreferencesPatch,
  AccountPreferencesRecord,
  AccountProfileRecord,
  AccountRepository,
  NewAccountProfile,
  NewDefaultPersonas,
  NewFeedback,
  PortResult,
  ResetTokenAccountRecord,
  Tx as AppTx,
} from '@rogikotha/application';
import type { AccountStatus, Locale } from '@rogikotha/contracts';
import { and, eq, sql } from 'drizzle-orm';

import { uniqueViolationConstraint } from '../pg-error';
import { accountPreferences, accountProfiles, feedback } from '../schema/account';
import { authAccounts, authUsers, authVerifications } from '../schema/auth';
import { executorOf } from '../unit-of-work';
import { PgPrivateIdentityRepository } from './identity-private';
import { NotImplemented } from './not-implemented';

/** Better Auth's credential provider id on `auth_accounts.provider_id`. */
export const CREDENTIAL_PROVIDER_ID = 'credential';

/**
 * Better Auth 1.7.14 stores a reset token as an `auth_verifications` row whose `identifier` is
 * this prefix plus the plain token and whose `value` is the auth user id (code-summary.md, spike).
 */
export const RESET_TOKEN_IDENTIFIER_PREFIX = 'reset-password:';

const USERNAME_UNIQUE_CONSTRAINT = 'account_profiles_username_unique';

/** `account_profiles.username_key`: the NFC, lowercase form of the username (02-data-model.md §2). */
export function usernameKeyOf(username: string): string {
  return username.normalize('NFC').toLowerCase();
}

const profileColumns = {
  accountId: accountProfiles.id,
  authUserId: accountProfiles.authUserId,
  username: accountProfiles.username,
  displayName: accountProfiles.displayName,
  locale: accountProfiles.locale,
  status: accountProfiles.status,
};

const byEmailColumns = {
  accountId: accountProfiles.id,
  authUserId: accountProfiles.authUserId,
  status: accountProfiles.status,
};

const credentialColumns = { ...byEmailColumns, passwordHash: authAccounts.password };

export class PgAccountRepository implements AccountRepository {
  private readonly privateIdentities = new PgPrivateIdentityRepository();

  async findProfileByAuthUserId(
    tx: AppTx,
    authUserId: string,
  ): Promise<AccountProfileRecord | null> {
    const [row] = await executorOf(tx)
      .select(profileColumns)
      .from(accountProfiles)
      .where(eq(accountProfiles.authUserId, authUserId))
      .limit(1);
    return row ?? null;
  }

  async findProfileById(tx: AppTx, accountId: string): Promise<AccountProfileRecord | null> {
    const [row] = await executorOf(tx)
      .select(profileColumns)
      .from(accountProfiles)
      .where(eq(accountProfiles.id, accountId))
      .limit(1);
    return row ?? null;
  }

  async findByEmail(tx: AppTx, email: string): Promise<AccountByEmailRecord | null> {
    const [row] = await executorOf(tx)
      .select(byEmailColumns)
      .from(authUsers)
      .innerJoin(accountProfiles, eq(accountProfiles.authUserId, authUsers.id))
      .where(eq(authUsers.email, email))
      .limit(1);
    return row ?? null;
  }

  async findCredentialByEmail(tx: AppTx, email: string): Promise<AccountCredentialRecord | null> {
    const [row] = await executorOf(tx)
      .select(credentialColumns)
      .from(authUsers)
      .innerJoin(accountProfiles, eq(accountProfiles.authUserId, authUsers.id))
      .innerJoin(authAccounts, credentialOf(authUsers.id))
      .where(eq(authUsers.email, email))
      .limit(1);
    return withPasswordHash(row);
  }

  async findCredentialByAccountId(
    tx: AppTx,
    accountId: string,
  ): Promise<AccountCredentialRecord | null> {
    const [row] = await executorOf(tx)
      .select(credentialColumns)
      .from(accountProfiles)
      .innerJoin(authAccounts, credentialOf(accountProfiles.authUserId))
      .where(eq(accountProfiles.id, accountId))
      .limit(1);
    return withPasswordHash(row);
  }

  async findOwnEmail(tx: AppTx, accountId: string): Promise<string | null> {
    const [row] = await executorOf(tx)
      .select({ email: authUsers.email })
      .from(accountProfiles)
      .innerJoin(authUsers, eq(authUsers.id, accountProfiles.authUserId))
      .where(eq(accountProfiles.id, accountId))
      .limit(1);
    return row?.email ?? null;
  }

  async findResetTokenAccount(tx: AppTx, token: string): Promise<ResetTokenAccountRecord | null> {
    const [row] = await executorOf(tx)
      .select({ ...byEmailColumns, email: authUsers.email, expiresAt: authVerifications.expiresAt })
      .from(authVerifications)
      .innerJoin(authUsers, eq(authUsers.id, authVerifications.value))
      .innerJoin(accountProfiles, eq(accountProfiles.authUserId, authUsers.id))
      .where(eq(authVerifications.identifier, `${RESET_TOKEN_IDENTIFIER_PREFIX}${token}`))
      .limit(1);
    return row ?? null;
  }

  async usernameTaken(tx: AppTx, username: string): Promise<boolean> {
    // `username` is citext, so this compares without regard to case; deleted profiles count.
    const rows = await executorOf(tx)
      .select({ id: accountProfiles.id })
      .from(accountProfiles)
      .where(eq(accountProfiles.username, username))
      .limit(1);
    return rows.length > 0;
  }

  async createProfile(
    tx: AppTx,
    profile: NewAccountProfile,
  ): Promise<PortResult<null, 'username_taken'>> {
    try {
      // A savepoint, so a lost username race leaves the caller's transaction usable.
      await executorOf(tx).transaction(async (savepoint) => {
        await savepoint.insert(accountProfiles).values({
          id: profile.accountId,
          authUserId: profile.authUserId,
          username: profile.username,
          usernameKey: usernameKeyOf(profile.username),
          displayName: profile.displayName,
          locale: profile.locale,
          status: 'pending_verification',
          ageConfirmedAt: profile.ageConfirmedAt,
          termsVersion: profile.termsVersion,
          termsAcceptedAt: profile.termsAcceptedAt,
        });
      });
    } catch (error) {
      if (uniqueViolationConstraint(error) === USERNAME_UNIQUE_CONSTRAINT) {
        return { ok: false, error: { code: 'username_taken' } };
      }
      throw error;
    }
    return { ok: true, data: null };
  }

  /** U11 BR1.2, BR3.2: the one allowed call into the private identity repository. */
  async insertDefaultPersonas(tx: AppTx, input: NewDefaultPersonas): Promise<void> {
    await this.privateIdentities.createDefault(tx, input);
  }

  async updateStatus(tx: AppTx, accountId: string, status: AccountStatus): Promise<void> {
    await executorOf(tx)
      .update(accountProfiles)
      .set({ status, updatedAt: sql`now()` })
      .where(eq(accountProfiles.id, accountId));
  }

  async insertPreferences(
    tx: AppTx,
    input: { accountId: string; interfaceLocale: Locale },
  ): Promise<void> {
    await executorOf(tx)
      .insert(accountPreferences)
      .values({ accountId: input.accountId, interfaceLocale: input.interfaceLocale });
  }

  async findPreferences(tx: AppTx, accountId: string): Promise<AccountPreferencesRecord | null> {
    const [row] = await executorOf(tx)
      .select({
        accountId: accountPreferences.accountId,
        interfaceLocale: accountPreferences.interfaceLocale,
        emailSecurity: accountPreferences.emailSecurity,
        emailModeration: accountPreferences.emailModeration,
        emailEvidence: accountPreferences.emailEvidence,
        emailDiscussion: accountPreferences.emailDiscussion,
      })
      .from(accountPreferences)
      .where(eq(accountPreferences.accountId, accountId))
      .limit(1);
    return row ?? null;
  }

  async savePreferences(
    tx: AppTx,
    accountId: string,
    patch: AccountPreferencesPatch,
  ): Promise<void> {
    await executorOf(tx)
      .update(accountPreferences)
      .set({ ...patch, updatedAt: sql`now()` })
      .where(eq(accountPreferences.accountId, accountId));
  }

  async insertFeedback(tx: AppTx, input: NewFeedback): Promise<void> {
    await executorOf(tx).insert(feedback).values({
      id: input.id,
      accountId: input.accountId,
      body: input.body,
      locale: input.locale,
    });
  }

  listDevices(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-103', { accountId });
  }

  upsertDevice(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-103', { input });
  }

  createDeviceApproval(deviceId: string): Promise<unknown> {
    throw new NotImplemented('T-103', { deviceId });
  }

  consumeDeviceApproval(tokenHash: string): Promise<unknown> {
    throw new NotImplemented('T-103', { tokenHash });
  }

  addBookmark(accountId: string, reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId, reviewId });
  }

  removeBookmark(accountId: string, reviewId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId, reviewId });
  }

  listBookmarks(accountId: string): Promise<unknown> {
    throw new NotImplemented('T-409', { accountId });
  }

  setBlock(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }

  unsetBlock(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }

  isBlocked(blockerAccountId: string, blockedAccountId: string): Promise<unknown> {
    throw new NotImplemented('T-401', { blockerAccountId, blockedAccountId });
  }
}

function credentialOf(authUserId: typeof authUsers.id | typeof accountProfiles.authUserId) {
  return and(
    eq(authAccounts.userId, authUserId),
    eq(authAccounts.providerId, CREDENTIAL_PROVIDER_ID),
  );
}

/** An account whose credential row has no password (none in T-101) is treated as having none. */
function withPasswordHash(
  row: (AccountByEmailRecord & { passwordHash: string | null }) | undefined,
): AccountCredentialRecord | null {
  if (row?.passwordHash == null) return null;
  return { ...row, passwordHash: row.passwordHash };
}
