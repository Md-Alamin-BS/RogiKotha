// C2 `RecipientDirectory` over the account repository (T-101 WF12, BR6.1, FD-095): the address is
// read in the web tier and leaves this function only as ciphertext under the mail-only key.
import type {
  AccountPreferencesRecord,
  AccountRepository,
  Crypto,
  RecipientDirectory,
} from '../../ports';

export interface RecipientDirectoryDeps {
  accounts: AccountRepository;
  /** MAIL_RECIPIENT_KEY, never the app key. */
  mailCrypto: Crypto;
}

export function createRecipientDirectory(deps: RecipientDirectoryDeps): RecipientDirectory {
  return {
    async contactFor(tx, accountId) {
      const profile = await deps.accounts.findProfileById(tx, accountId);
      if (!profile || profile.status === 'deleted') return null;
      const email = await deps.accounts.findOwnEmail(tx, accountId);
      if (!email) return null;
      const stored = await deps.accounts.findPreferences(tx, accountId);
      // ASSUMPTION(T-101): a profile without a preferences row gets the schema defaults.
      const preferences: AccountPreferencesRecord = stored ?? {
        accountId,
        interfaceLocale: profile.locale,
        emailSecurity: true,
        emailModeration: true,
        emailEvidence: true,
        emailDiscussion: true,
      };
      return {
        toEmailEnc: deps.mailCrypto.encrypt(email),
        locale: preferences.interfaceLocale,
        preferences,
      };
    },
  };
}
