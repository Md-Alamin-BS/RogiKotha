// The signed-in account behind a Better Auth user id (demo slice, plan Step 3). Owned by the
// foundation step; `apps/web/src/server/auth/session.ts` is its only caller.
import type { DemoCurrentAccount } from '@rogikotha/contracts';
import { and, desc, eq, isNull } from 'drizzle-orm';

import type { Db } from '../client';
import { accountProfiles } from '../schema/account';
import { personaLinks, personas } from '../schema/identity';

type ProfileRow = Pick<
  DemoCurrentAccount,
  'accountId' | 'authUserId' | 'username' | 'displayName' | 'locale' | 'status'
>;

async function findProfile(db: Db, authUserId: string): Promise<ProfileRow | undefined> {
  const [row] = await db
    .select({
      accountId: accountProfiles.id,
      authUserId: accountProfiles.authUserId,
      username: accountProfiles.username,
      displayName: accountProfiles.displayName,
      locale: accountProfiles.locale,
      status: accountProfiles.status,
    })
    .from(accountProfiles)
    .where(and(eq(accountProfiles.authUserId, authUserId), isNull(accountProfiles.deletedAt)))
    .limit(1);
  return row;
}

/** Account-wide personas (not scoped to one review), newest first; uuidv7 ids break same-instant ties. */
function listAccountPersonas(db: Db, accountId: string) {
  return db
    .select({ id: personas.id, kind: personas.kind, displayName: personas.displayName })
    .from(personaLinks)
    .innerJoin(personas, eq(personas.id, personaLinks.personaId))
    .where(and(eq(personaLinks.accountId, accountId), isNull(personaLinks.reviewId)))
    .orderBy(desc(personas.createdAt), desc(personas.id));
}

/**
 * Creates a named persona from the profile's display name and links it to the account. Seeded
 * accounts often have only a pseudonymous or anonymous persona, and writing needs a named one.
 */
export async function createNamedPersona(
  db: Db,
  input: { accountId: string; displayName: string; username: string },
): Promise<string> {
  return db.transaction(async (tx) => {
    const [persona] = await tx
      .insert(personas)
      .values({ kind: 'named', displayName: input.displayName, username: input.username })
      .returning({ id: personas.id });
    await tx.insert(personaLinks).values({ personaId: persona!.id, accountId: input.accountId });
    return persona!.id;
  });
}

/**
 * The current account for a Better Auth user id, or null when no live profile exists. Creates the
 * named persona on first use when the account has none.
 */
export async function getCurrentAccountByAuthUserId(
  db: Db,
  authUserId: string,
): Promise<DemoCurrentAccount | null> {
  const profile = await findProfile(db, authUserId);
  if (!profile) return null;

  const linked = await listAccountPersonas(db, profile.accountId);
  const named = linked.find((p) => p.kind === 'named');
  const pseudonymous = linked.find((p) => p.kind === 'pseudonymous');
  const currentPersonaId =
    named?.id ??
    (await createNamedPersona(db, {
      accountId: profile.accountId,
      displayName: profile.displayName,
      username: profile.username,
    }));

  return {
    ...profile,
    currentPersonaId,
    pseudonymousPersonaId: pseudonymous?.id ?? null,
    pseudonymousDisplayName: pseudonymous?.displayName ?? null,
  };
}
