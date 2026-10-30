import { newId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { personaLinks, personas } from '../schema/identity';
import { testDb } from '../test-setup';
import { createNamedPersona, getCurrentAccountByAuthUserId } from './session';

async function buildAccount(overrides: { deleted?: boolean } = {}) {
  const authUserId = newId();
  const username = `demo_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: `Name ${username}`,
      locale: 'bn',
      status: 'active',
      deletedAt: overrides.deleted ? new Date() : null,
    })
    .returning({ id: accountProfiles.id });
  return { authUserId, accountId: profile!.id, username };
}

async function linkPersona(
  accountId: string,
  kind: 'named' | 'pseudonymous',
  displayName: string,
): Promise<string> {
  const [persona] = await testDb
    .insert(personas)
    .values({ kind, displayName })
    .returning({ id: personas.id });
  await testDb.insert(personaLinks).values({ personaId: persona!.id, accountId });
  return persona!.id;
}

describe('demo session lookup', () => {
  it('is null for a Better Auth user with no profile', async () => {
    await expect(getCurrentAccountByAuthUserId(testDb, newId())).resolves.toBeNull();
  });

  it('is null for a deleted profile', async () => {
    const { authUserId } = await buildAccount({ deleted: true });
    await expect(getCurrentAccountByAuthUserId(testDb, authUserId)).resolves.toBeNull();
  });

  it('returns the profile with its newest named persona and its pseudonymous persona', async () => {
    const { authUserId, accountId, username } = await buildAccount();
    await linkPersona(accountId, 'named', 'Old name');
    const newest = await linkPersona(accountId, 'named', 'New name');
    const alias = await linkPersona(accountId, 'pseudonymous', 'quiet_reader');

    await expect(getCurrentAccountByAuthUserId(testDb, authUserId)).resolves.toEqual({
      accountId,
      authUserId,
      username,
      displayName: `Name ${username}`,
      locale: 'bn',
      status: 'active',
      currentPersonaId: newest,
      pseudonymousPersonaId: alias,
      pseudonymousDisplayName: 'quiet_reader',
    });
  });

  it('creates one named persona for an account that has none, and reuses it afterwards', async () => {
    const { authUserId, accountId } = await buildAccount();

    const first = await getCurrentAccountByAuthUserId(testDb, authUserId);
    const second = await getCurrentAccountByAuthUserId(testDb, authUserId);

    expect(second?.currentPersonaId).toBe(first?.currentPersonaId);
    const links = await testDb
      .select()
      .from(personaLinks)
      .where(eq(personaLinks.accountId, accountId));
    expect(links).toHaveLength(1);
    expect(first?.pseudonymousPersonaId).toBeNull();
  });

  it('names a created persona after the profile', async () => {
    const { accountId, username } = await buildAccount();
    const personaId = await createNamedPersona(testDb, {
      accountId,
      displayName: 'Rina',
      username,
    });
    const [row] = await testDb.select().from(personas).where(eq(personas.id, personaId));
    expect(row).toMatchObject({ kind: 'named', displayName: 'Rina', username });
  });
});
