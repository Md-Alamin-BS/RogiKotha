// `packages/database/src/repositories/account.ts`. It is the only reader of `auth_users.email`
// and of the password hash, and it never reads `personas` or `persona_links` (AD-3, T-104 F9).
// Every email argument is already normalised (`normaliseEmail` in contracts).
import type { AccountStatus, Locale } from '@rogikotha/contracts';

import type { PortResult } from './port-result';
import type { Tx } from './unit-of-work';

export interface AccountProfileRecord {
  accountId: string;
  authUserId: string;
  username: string;
  displayName: string;
  locale: Locale;
  status: AccountStatus;
}

/** The profile behind an address, deleted ones included; the caller decides what deleted means. */
export interface AccountByEmailRecord {
  accountId: string;
  authUserId: string;
  status: AccountStatus;
}

/** Never returned beyond the command that checks it (Q14). */
export interface AccountCredentialRecord extends AccountByEmailRecord {
  passwordHash: string;
}

/** The account a reset token belongs to, read without consuming the token (review point 1). */
export interface ResetTokenAccountRecord extends AccountByEmailRecord {
  email: string;
  expiresAt: Date;
}

export interface NewAccountProfile {
  accountId: string;
  authUserId: string;
  username: string;
  displayName: string;
  locale: Locale;
  ageConfirmedAt: Date;
  termsVersion: string;
  termsAcceptedAt: Date;
}

/** Release 2 (T-104): moves behind the identity repository; ids come from the caller's IdGenerator. */
export interface NewDefaultPersonas {
  accountId: string;
  username: string;
  displayName: string;
  namedPersonaId: string;
  pseudonymousPersonaId: string;
}

export interface AccountPreferencesRecord {
  accountId: string;
  interfaceLocale: Locale;
  emailSecurity: boolean;
  emailModeration: boolean;
  emailEvidence: boolean;
  emailDiscussion: boolean;
}

export type AccountPreferencesPatch = Partial<Omit<AccountPreferencesRecord, 'accountId'>>;

export interface NewFeedback {
  id: string;
  accountId: string;
  body: string;
  locale: Locale;
}

export interface AccountRepository {
  findProfileByAuthUserId(tx: Tx, authUserId: string): Promise<AccountProfileRecord | null>;
  findProfileById(tx: Tx, accountId: string): Promise<AccountProfileRecord | null>;
  findByEmail(tx: Tx, email: string): Promise<AccountByEmailRecord | null>;
  findCredentialByEmail(tx: Tx, email: string): Promise<AccountCredentialRecord | null>;
  findCredentialByAccountId(tx: Tx, accountId: string): Promise<AccountCredentialRecord | null>;
  /** The holder's own address, for the mask (BR4.10) and resend-own (BR2.7) only. */
  findOwnEmail(tx: Tx, accountId: string): Promise<string | null>;
  /** Reads the library's `reset-password:<token>` verification row; null when absent. */
  findResetTokenAccount(tx: Tx, token: string): Promise<ResetTokenAccountRecord | null>;
  /** Case-insensitive, deleted profiles included (BR1.3). */
  usernameTaken(tx: Tx, username: string): Promise<boolean>;
  /** `username_taken` on the unique violation of a registration race (review point 5). */
  createProfile(tx: Tx, profile: NewAccountProfile): Promise<PortResult<null, 'username_taken'>>;
  insertDefaultPersonas(tx: Tx, personas: NewDefaultPersonas): Promise<void>;
  updateStatus(tx: Tx, accountId: string, status: AccountStatus): Promise<void>;
  /** Defaults from the schema; `interfaceLocale` from the registration locale. */
  insertPreferences(tx: Tx, input: { accountId: string; interfaceLocale: Locale }): Promise<void>;
  findPreferences(tx: Tx, accountId: string): Promise<AccountPreferencesRecord | null>;
  savePreferences(tx: Tx, accountId: string, patch: AccountPreferencesPatch): Promise<void>;
  insertFeedback(tx: Tx, feedback: NewFeedback): Promise<void>;
}
