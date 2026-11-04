// Account and profile data functions of the demo slice (FR1, FR2). Signatures fixed by the
// foundation step; bodies are written by the auth and profile steps (plan Steps 5 and 6).
import type { DemoOwnReviewRow, DemoProfile, Locale, PublicationState } from '@rogikotha/contracts';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { Db } from '../client';
import { accountPreferences, accountProfiles } from '../schema/account';
import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';

// Registration (plan Step 5) has its own file, so the auth and profile steps edit separate files.
export {
  createProfileForAuthUser,
  isUsernameTaken,
  removeAuthUserWithoutProfile,
  type CreateProfileInput,
} from './accounts-create';

const liveAccount = (accountId: string) =>
  and(eq(accountProfiles.id, accountId), isNull(accountProfiles.deletedAt));

/** The profile for `/me`, or null when the account does not exist or is deleted. */
export async function getProfile(db: Db, accountId: string): Promise<DemoProfile | null> {
  const [row] = await db
    .select({
      accountId: accountProfiles.id,
      username: accountProfiles.username,
      displayName: accountProfiles.displayName,
      locale: accountProfiles.locale,
      createdAt: accountProfiles.createdAt,
    })
    .from(accountProfiles)
    .where(liveAccount(accountId))
    .limit(1);
  return row ?? null;
}

/**
 * Sets `account_profiles.display_name` and inserts a new named persona linked to the account, so
 * content written before keeps the old name (Q4). Returns the new persona id.
 */
export function updateDisplayName(
  db: Db,
  accountId: string,
  newName: string,
): Promise<{ personaId: string }> {
  return db.transaction(async (tx) => {
    const [profile] = await tx
      .update(accountProfiles)
      .set({ displayName: newName, updatedAt: sql`now()` })
      .where(liveAccount(accountId))
      .returning({ username: accountProfiles.username });
    // The caller is the signed-in account, so a missing row is a programmer error, not a refusal.
    if (!profile) throw new Error(`updateDisplayName: no live account ${accountId}`);

    // The session picks the newest named persona, so this one becomes current at once.
    const [persona] = await tx
      .insert(personas)
      .values({ kind: 'named', displayName: newName, username: profile.username })
      .returning({ id: personas.id });
    await tx.insert(personaLinks).values({ personaId: persona!.id, accountId });
    return { personaId: persona!.id };
  });
}

/** Sets `account_profiles.locale` and `account_preferences.interface_locale`. */
export async function updateLocale(db: Db, accountId: string, locale: Locale): Promise<void> {
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(accountProfiles)
      .set({ locale, updatedAt: sql`now()` })
      .where(liveAccount(accountId))
      .returning({ id: accountProfiles.id });
    if (updated.length === 0) throw new Error(`updateLocale: no live account ${accountId}`);

    // Seeded accounts may have no preferences row yet.
    await tx
      .insert(accountPreferences)
      .values({ accountId, interfaceLocale: locale })
      .onConflictDoUpdate({
        target: accountPreferences.accountId,
        set: { interfaceLocale: locale, updatedAt: sql`now()` },
      });
  });
}

function ownReviewState(
  state: PublicationState,
  deletedAt: Date | null,
): DemoOwnReviewRow['state'] {
  if (deletedAt) return 'removed';
  switch (state) {
    case 'published':
      return 'published';
    case 'hidden':
    case 'hidden_pending_review':
      return 'hidden';
    case 'deleted_tombstone':
    case 'rejected':
      return 'removed';
    default:
      return 'other';
  }
}

/** Every experience written by any of the account's personas, newest first; doctor names in `locale`. */
export async function listOwnReviews(
  db: Db,
  accountId: string,
  locale: Locale,
): Promise<DemoOwnReviewRow[]> {
  const rows = await db
    .select({
      publicId: reviews.publicId,
      title: reviews.title,
      doctorName: locale === 'bn' ? doctors.nameBn : doctors.nameEn,
      state: reviews.state,
      deletedAt: reviews.deletedAt,
      publishedAt: reviews.publishedAt,
      version: reviews.version,
    })
    .from(reviews)
    // Review-scoped anonymous personas are linked too, so this covers every identity mode.
    .innerJoin(personaLinks, eq(personaLinks.personaId, reviews.authorPersonaId))
    .innerJoin(doctors, eq(doctors.id, reviews.doctorId))
    .where(eq(personaLinks.accountId, accountId))
    .orderBy(desc(sql`coalesce(${reviews.publishedAt}, ${reviews.createdAt})`), desc(reviews.id));

  return rows.map((row) => ({
    publicId: row.publicId,
    title: row.title,
    doctorName: row.doctorName,
    state: ownReviewState(row.state, row.deletedAt),
    publishedAt: row.publishedAt,
    edited: row.version > 1,
  }));
}
