import { newId, newPublicId, type PublicationState } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountPreferences, accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { testDb } from '../test-setup';
import { getProfile, listOwnReviews, updateDisplayName, updateLocale } from './accounts';
import { getCurrentAccountByAuthUserId } from './session';

async function buildAccount(overrides: { deleted?: boolean } = {}) {
  const authUserId = newId();
  const username = `prof_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: 'Rina Akter',
      locale: 'en',
      status: 'active',
      deletedAt: overrides.deleted ? new Date() : null,
    })
    .returning({ id: accountProfiles.id });
  return { authUserId, accountId: profile!.id, username };
}

async function createPersona(kind: 'named' | 'anonymous', displayName: string): Promise<string> {
  const [persona] = await testDb
    .insert(personas)
    .values({ kind, displayName })
    .returning({ id: personas.id });
  return persona!.id;
}

async function linkPersona(
  accountId: string,
  kind: 'named' | 'anonymous',
  displayName: string,
): Promise<string> {
  const personaId = await createPersona(kind, displayName);
  await testDb.insert(personaLinks).values({ personaId, accountId });
  return personaId;
}

async function buildDoctor(): Promise<string> {
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Example',
      nameBn: 'ডা. কাল্পনিক উদাহরণ',
      state: 'published',
      nameKey: `synthetic example ${newId()}`,
    })
    .returning({ id: doctors.id });
  return doctor!.id;
}

async function buildReview(input: {
  personaId: string;
  doctorId: string;
  title: string;
  state?: PublicationState;
  publishedAt?: Date | null;
  version?: number;
  deletedAt?: Date | null;
}) {
  const publicId = newPublicId();
  const [review] = await testDb
    .insert(reviews)
    .values({
      publicId,
      authorPersonaId: input.personaId,
      doctorId: input.doctorId,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 3,
      title: input.title,
      body: 'A synthetic account.',
      language: 'en',
      state: input.state ?? 'published',
      publishedAt: input.publishedAt === undefined ? new Date() : input.publishedAt,
      version: input.version ?? 1,
      deletedAt: input.deletedAt ?? null,
    })
    .returning({ id: reviews.id });
  return { publicId, reviewId: review!.id };
}

describe('demo profile reads', () => {
  it('returns the live profile for /me', async () => {
    const { accountId, username } = await buildAccount();
    await expect(getProfile(testDb, accountId)).resolves.toMatchObject({
      accountId,
      username,
      displayName: 'Rina Akter',
      locale: 'en',
    });
  });

  it('returns no profile for a deleted account or an unknown id', async () => {
    const { accountId } = await buildAccount({ deleted: true });
    await expect(getProfile(testDb, accountId)).resolves.toBeNull();
    await expect(getProfile(testDb, newId())).resolves.toBeNull();
  });
});

describe('demo display-name change', () => {
  it('renames the profile and makes a new named persona the current one', async () => {
    const { authUserId, accountId, username } = await buildAccount();
    const oldPersona = await linkPersona(accountId, 'named', 'Rina Akter');

    const { personaId } = await updateDisplayName(testDb, accountId, 'Rina A.');

    expect(personaId).not.toBe(oldPersona);
    const [created] = await testDb.select().from(personas).where(eq(personas.id, personaId));
    expect(created).toMatchObject({ kind: 'named', displayName: 'Rina A.', username });
    const current = await getCurrentAccountByAuthUserId(testDb, authUserId);
    expect(current).toMatchObject({ displayName: 'Rina A.', currentPersonaId: personaId });
  });

  it('keeps the old name on content written before the change', async () => {
    const { accountId } = await buildAccount();
    const oldPersona = await linkPersona(accountId, 'named', 'Rina Akter');
    const doctorId = await buildDoctor();
    const { publicId } = await buildReview({ personaId: oldPersona, doctorId, title: 'Before' });

    await updateDisplayName(testDb, accountId, 'Rina A.');

    const [row] = await testDb
      .select({ name: personas.displayName })
      .from(reviews)
      .innerJoin(personas, eq(personas.id, reviews.authorPersonaId))
      .where(eq(reviews.publicId, publicId));
    expect(row?.name).toBe('Rina Akter');
  });

  it('refuses to rename a deleted account and creates no persona', async () => {
    const { accountId } = await buildAccount({ deleted: true });
    await expect(updateDisplayName(testDb, accountId, 'Ghost')).rejects.toThrow(/no live account/);
    const links = await testDb
      .select()
      .from(personaLinks)
      .where(eq(personaLinks.accountId, accountId));
    expect(links).toHaveLength(0);
  });
});

describe('demo language preference', () => {
  it('stores the language on the profile and creates the missing preferences row', async () => {
    const { accountId } = await buildAccount();

    await updateLocale(testDb, accountId, 'bn');

    await expect(getProfile(testDb, accountId)).resolves.toMatchObject({ locale: 'bn' });
    const [prefs] = await testDb
      .select()
      .from(accountPreferences)
      .where(eq(accountPreferences.accountId, accountId));
    expect(prefs?.interfaceLocale).toBe('bn');
  });

  it('updates an existing preferences row instead of adding one', async () => {
    const { accountId } = await buildAccount();
    await testDb.insert(accountPreferences).values({ accountId, interfaceLocale: 'en' });

    await updateLocale(testDb, accountId, 'bn');
    await updateLocale(testDb, accountId, 'en');

    const rows = await testDb
      .select()
      .from(accountPreferences)
      .where(eq(accountPreferences.accountId, accountId));
    expect(rows).toEqual([expect.objectContaining({ interfaceLocale: 'en' })]);
  });

  it('refuses a deleted account', async () => {
    const { accountId } = await buildAccount({ deleted: true });
    await expect(updateLocale(testDb, accountId, 'bn')).rejects.toThrow(/no live account/);
  });
});

describe('demo own experiences', () => {
  it('lists the experiences of every persona of the account, newest first, in the requested language', async () => {
    const { accountId } = await buildAccount();
    const named = await linkPersona(accountId, 'named', 'Rina Akter');
    const doctorId = await buildDoctor();
    const older = await buildReview({
      personaId: named,
      doctorId,
      title: 'Older',
      publishedAt: new Date('2026-03-01T00:00:00Z'),
    });
    // An anonymous persona is scoped to its one review, so it is linked after the review exists.
    const anonymous = await createPersona('anonymous', 'Anonymous');
    const newer = await buildReview({
      personaId: anonymous,
      doctorId,
      title: 'Newer',
      publishedAt: new Date('2026-04-01T00:00:00Z'),
      version: 2,
    });
    await testDb
      .insert(personaLinks)
      .values({ personaId: anonymous, accountId, reviewId: newer.reviewId });

    const rows = await listOwnReviews(testDb, accountId, 'bn');

    expect(rows.map((r) => r.publicId)).toEqual([newer.publicId, older.publicId]);
    expect(rows[0]).toMatchObject({ doctorName: 'ডা. কাল্পনিক উদাহরণ', edited: true });
    expect(rows[1]).toMatchObject({ state: 'published', edited: false });
  });

  it('never lists another account’s experiences', async () => {
    const mine = await buildAccount();
    const theirs = await buildAccount();
    const theirPersona = await linkPersona(theirs.accountId, 'named', 'Someone Else');
    await buildReview({ personaId: theirPersona, doctorId: await buildDoctor(), title: 'Theirs' });

    await expect(listOwnReviews(testDb, mine.accountId, 'en')).resolves.toEqual([]);
  });

  it('maps hidden, removed and unpublished experiences to their own states', async () => {
    const { accountId } = await buildAccount();
    const named = await linkPersona(accountId, 'named', 'Rina Akter');
    const doctorId = await buildDoctor();
    const base = { personaId: named, doctorId };
    await buildReview({ ...base, title: 'Hidden', state: 'hidden_pending_review' });
    await buildReview({ ...base, title: 'Deleted', deletedAt: new Date() });
    await buildReview({ ...base, title: 'Draft', state: 'draft', publishedAt: null });

    const rows = await listOwnReviews(testDb, accountId, 'en');
    const stateOf = (title: string) => rows.find((r) => r.title === title)?.state;

    expect(stateOf('Hidden')).toBe('hidden');
    expect(stateOf('Deleted')).toBe('removed');
    expect(stateOf('Draft')).toBe('other');
    expect(rows.find((r) => r.title === 'Draft')?.publishedAt).toBeNull();
  });
});
