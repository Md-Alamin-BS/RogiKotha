// Builders for the T-101 repository tests. Synthetic `example.test` addresses with a per-call
// suffix, so tests never collide with each other or with a seeded corpus.
import { randomUUID } from 'node:crypto';

import type { Tx as AppTx } from '@rogikotha/application';
import { newId } from '@rogikotha/contracts';

import type { Db } from '../client';
import { authAccounts, authUsers, authVerifications } from '../schema/auth';
import { appTxOf, type Executor } from '../unit-of-work';
import {
  CREDENTIAL_PROVIDER_ID,
  PgAccountRepository,
  RESET_TOKEN_IDENTIFIER_PREFIX,
} from './account';

let sequence = 0;

/** A short unique suffix: `[a-z0-9]`, so it also fits a username. */
export function uniqueSuffix(): string {
  sequence += 1;
  return `${randomUUID().slice(0, 8)}${sequence}`;
}

export interface BuiltAuthUser {
  authUserId: string;
  email: string;
  passwordHash: string;
}

/** A library user with a credential row, as `signUpEmail` leaves it before the profile exists. */
export async function buildAuthUser(
  db: Db,
  options: { withCredential?: boolean } = {},
): Promise<BuiltAuthUser> {
  const suffix = uniqueSuffix();
  const user: BuiltAuthUser = {
    authUserId: newId(),
    email: `shirin.demo+${suffix}@example.test`,
    passwordHash: `$argon2id$v=19$m=19456,t=2,p=1$synthetic${suffix}`,
  };
  await db.insert(authUsers).values({ id: user.authUserId, email: user.email, name: '' });
  if (options.withCredential ?? true) {
    await db.insert(authAccounts).values({
      id: newId(),
      accountId: user.authUserId,
      providerId: CREDENTIAL_PROVIDER_ID,
      userId: user.authUserId,
      password: user.passwordHash,
    });
  }
  return user;
}

export interface BuiltAccount extends BuiltAuthUser {
  accountId: string;
  username: string;
  displayName: string;
}

/** A registered account: library user, credential and a `pending_verification` profile. */
export async function buildAccount(
  db: Db,
  overrides: { username?: string; displayName?: string } = {},
): Promise<BuiltAccount> {
  const user = await buildAuthUser(db);
  const account: BuiltAccount = {
    ...user,
    accountId: newId(),
    username: overrides.username ?? `shirin_${uniqueSuffix()}`.slice(0, 24),
    displayName: overrides.displayName ?? 'Shirin Demo',
  };
  const now = new Date();
  const created = await new PgAccountRepository().createProfile(appTx(db), {
    accountId: account.accountId,
    authUserId: account.authUserId,
    username: account.username,
    displayName: account.displayName,
    locale: 'bn',
    ageConfirmedAt: now,
    termsVersion: 'terms-demo-1',
    termsAcceptedAt: now,
  });
  if (!created.ok) throw new Error(`buildAccount: ${created.error.code}`);
  return account;
}

/** A reset token row in the format Better Auth 1.7.14 writes (code-summary.md, spike). */
export async function buildResetToken(
  db: Db,
  authUserId: string,
  expiresAt = new Date(Date.now() + 60 * 60 * 1000),
): Promise<string> {
  const token = randomUUID().replace(/-/g, '').slice(0, 24);
  await db.insert(authVerifications).values({
    id: newId(),
    identifier: `${RESET_TOKEN_IDENTIFIER_PREFIX}${token}`,
    value: authUserId,
    expiresAt,
  });
  return token;
}

export function appTx(executor: Executor): AppTx {
  return appTxOf(executor);
}
