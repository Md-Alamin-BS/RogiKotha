// Registration data functions of the demo slice (FR1, plan Step 5), re-exported by `accounts.ts`
// so the profile step can own the rest of that file.
import type { Locale } from '@rogikotha/contracts';

import type { Db } from '../client';
import { accountPreferences, accountProfiles } from '../schema/account';
import { personaLinks, personas } from '../schema/identity';

export interface CreateProfileInput {
  authUserId: string;
  /** 3-24 chars of `[a-z0-9_]`, validated by the caller. */
  username: string;
  displayName: string;
  locale: Locale;
  /** The terms version the user accepted at registration. */
  termsVersion: string;
}

/**
 * Creates the `account_profiles` row with `status = 'active'`, age and terms timestamps set to now,
 * the `account_preferences` row, and one named persona linked through `persona_links`, in one
 * transaction.
 */
export function createProfileForAuthUser(
  db: Db,
  input: CreateProfileInput,
): Promise<{ accountId: string; personaId: string }> {
  return db.transaction(async (tx) => {
    const now = new Date();
    const [profile] = await tx
      .insert(accountProfiles)
      .values({
        authUserId: input.authUserId,
        username: input.username,
        // The seed's rule: the NFC, lowercase form of the username (02-data-model.md §2).
        usernameKey: input.username.normalize('NFC').toLowerCase(),
        displayName: input.displayName,
        locale: input.locale,
        // ASSUMPTION(demo-slice): active at once, no email verification (requirements Q1).
        status: 'active',
        ageConfirmedAt: now,
        termsVersion: input.termsVersion,
        termsAcceptedAt: now,
        lastSeenAt: now,
      })
      .returning({ id: accountProfiles.id });
    const accountId = profile!.id;

    await tx.insert(accountPreferences).values({ accountId, interfaceLocale: input.locale });

    const [persona] = await tx
      .insert(personas)
      .values({ kind: 'named', displayName: input.displayName, username: input.username })
      .returning({ id: personas.id });
    await tx.insert(personaLinks).values({ personaId: persona!.id, accountId });

    return { accountId, personaId: persona!.id };
  });
}
