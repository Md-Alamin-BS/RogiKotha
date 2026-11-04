// C2: how `notification.queueEmail` learns where and in which language to send, without the
// address ever leaving the web tier unencrypted. Implemented in `modules/account` over the
// account repository and `mailCrypto`.
import type { Locale } from '@rogikotha/contracts';

import type { AccountPreferencesRecord } from './account-repository';
import type { Tx } from './unit-of-work';

export interface RecipientContact {
  /** Under `mailCrypto` (MAIL_RECIPIENT_KEY), never `crypto` (FD-095). */
  toEmailEnc: Uint8Array;
  /** `account_preferences.interface_locale`. */
  locale: Locale;
  preferences: AccountPreferencesRecord;
}

export interface RecipientDirectory {
  /** Null for a deleted or unknown account: the email is suppressed and nothing is written. */
  contactFor(tx: Tx, accountId: string): Promise<RecipientContact | null>;
}
