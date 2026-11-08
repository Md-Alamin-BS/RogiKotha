import { newId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountPreferences, accountProfiles } from '../schema/account';
import { authAccounts, authUsers } from '../schema/auth';
import { personaLinks, personas } from '../schema/identity';
import { testDb } from '../test-setup';
import { createProfileForAuthUser } from './accounts-create';
import { getCurrentAccountByAuthUserId } from './session';

async function buildAuthUser(): Promise<string> {
  const authUserId = newId();
  await testDb
    .insert(authUsers)
    .values({ id: authUserId, email: `u${authUserId.slice(-10)}@example.test` });
  await testDb.insert(authAccounts).values({
    id: newId(),
    accountId: authUserId,
    providerId: 'credential',
    userId: authUserId,
    password: 'not-a-real-hash',
  });
  return authUserId;
}

function uniqueUsername(prefix: string): string {
  return `${prefix}_${newId().slice(-8)}`.toLowerCase();
}

describe('demo registration data', () => {
  it('creates an active profile with its preferences and one linked named persona', async () => {
    const authUserId = await buildAuthUser();
    const username = uniqueUsername('new');

    const { accountId, personaId } = await createProfileForAuthUser(testDb, {
      authUserId,
      username,
      displayName: 'Shathi Akter',
      locale: 'bn',
      termsVersion: '1',
    });

    const [profile] = await testDb
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.id, accountId));
    expect(profile).toMatchObject({
      authUserId,
      username,
      usernameKey: username,
      displayName: 'Shathi Akter',
      locale: 'bn',
      status: 'active',
      termsVersion: '1',
    });
    expect(profile?.ageConfirmedAt).toBeInstanceOf(Date);
    expect(profile?.termsAcceptedAt).toBeInstanceOf(Date);

    const [prefs] = await testDb
      .select()
      .from(accountPreferences)
      .where(eq(accountPreferences.accountId, accountId));
    expect(prefs?.interfaceLocale).toBe('bn');

    const [persona] = await testDb.select().from(personas).where(eq(personas.id, personaId));
    expect(persona).toMatchObject({ kind: 'named', displayName: 'Shathi Akter', username });
    const links = await testDb
      .select()
      .from(personaLinks)
      .where(eq(personaLinks.accountId, accountId));
    expect(links.map((l) => l.personaId)).toEqual([personaId]);
  });

  it('makes the new account the signed-in account with the persona it created', async () => {
    const authUserId = await buildAuthUser();
    const { accountId, personaId } = await createProfileForAuthUser(testDb, {
      authUserId,
      username: uniqueUsername('signed'),
      displayName: 'Rafi',
      locale: 'en',
      termsVersion: '1',
    });

    const current = await getCurrentAccountByAuthUserId(testDb, authUserId);
    expect(current).toMatchObject({ accountId, status: 'active', currentPersonaId: personaId });
  });

  it('refuses a second profile with the same username in any letter case and writes nothing', async () => {
    const username = uniqueUsername('dup');
    await createProfileForAuthUser(testDb, {
      authUserId: await buildAuthUser(),
      username,
      displayName: 'First',
      locale: 'en',
      termsVersion: '1',
    });
    const secondUser = await buildAuthUser();

    await expect(
      createProfileForAuthUser(testDb, {
        authUserId: secondUser,
        username: username.toUpperCase(),
        displayName: 'Second',
        locale: 'en',
        termsVersion: '1',
      }),
    ).rejects.toThrow();

    const orphan = await testDb
      .select()
      .from(accountProfiles)
      .where(eq(accountProfiles.authUserId, secondUser));
    expect(orphan).toHaveLength(0);
    const secondPersonas = await testDb
      .select()
      .from(personas)
      .where(eq(personas.displayName, 'Second'));
    expect(secondPersonas).toHaveLength(0);
  });
});
