// Registration data functions of the demo slice (FR1, plan Step 5), re-exported by `accounts.ts`
// so the profile step can own the rest of that file.
import type { Locale } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';

import type { Db } from '../client';
import { accountPreferences, accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
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

/** True when `account_profiles.username` (citext, so case-insensitive) is already used. */
export async function isUsernameTaken(db: Db, username: string): Promise<boolean> {
  const rows = await db
    .select({ id: accountProfiles.id })
    .from(accountProfiles)
    .where(eq(accountProfiles.username, username))
    .limit(1);
  return rows.length > 0;
}

/**
 * Deletes a Better Auth user (its sessions and credential cascade) when no profile was created for
 * it, so a registration whose profile insert failed leaves nothing behind. Returns whether a row
 * was deleted; a user that has a profile is never touched.
 */
export function removeAuthUserWithoutProfile(db: Db, authUserId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .select({ id: accountProfiles.id })
      .from(accountProfiles)
      .where(eq(accountProfiles.authUserId, authUserId))
      .limit(1);
    if (profile) return false;
    const deleted = await tx
      .delete(authUsers)
      .where(eq(authUsers.id, authUserId))
      .returning({ id: authUsers.id });
    return deleted.length > 0;
  });
}
