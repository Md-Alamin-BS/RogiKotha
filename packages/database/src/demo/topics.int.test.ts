import { newId, newPublicId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews, reviewTags } from '../schema/review';
import { taxonomyAliases, taxonomyTerms } from '../schema/taxonomy';
import { testDb } from '../test-setup';
import { getTopic, listTopics } from './doctors';
import { createQuickReview } from './reviews';

async function buildTopic(nameEn: string, nameBn: string, aliases: string[] = []) {
  const [term] = await testDb
    .insert(taxonomyTerms)
    .values({
      publicId: newPublicId(),
      kind: 'condition',
      nameEn,
      nameBn,
      nameKeyEn: nameEn.toLowerCase(),
      nameKeyBn: nameBn,
      state: 'published',
    })
    .returning({ id: taxonomyTerms.id, publicId: taxonomyTerms.publicId });
  if (aliases.length > 0) {
    await testDb.insert(taxonomyAliases).values(
      aliases.map((alias) => ({
        termId: term!.id,
        alias,
        aliasKey: alias.toLowerCase(),
        lang: 'en' as const,
        provenance: 'admin' as const,
      })),
    );
  }
  return term!;
}

async function buildAuthorAndDoctor(suffix: string) {
  const authUserId = newId();
  const username = `topic_${authUserId.slice(-8)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName: username,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  const [persona] = await testDb
    .insert(personas)
    .values({ kind: 'named', displayName: username, username })
    .returning({ id: personas.id });
  await testDb.insert(personaLinks).values({ personaId: persona!.id, accountId: profile!.id });
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: `Dr. Topic ${suffix}`,
      nameBn: `ডা. টপিক ${suffix}`,
      nameKey: `drtopic${suffix}`,
      state: 'published',
    })
    .returning({ id: doctors.id });
  return { accountId: profile!.id, personaId: persona!.id, doctorId: doctor!.id };
}

async function publishTagged(
  who: { accountId: string; personaId: string; doctorId: string },
  tag: { termId?: string; freeText?: string },
) {
  const { reviewId } = await createQuickReview(testDb, {
    authorPersonaId: who.personaId,
    authorAccountId: who.accountId,
    doctorId: who.doctorId,
    relationship: 'self',
    periodYear: 2026,
    periodMonth: 1,
    title: 'Tagged experience',
    body: 'A long enough synthetic story about the visit and the treatment.',
    sentiment: null,
    outcome: null,
    identityMode: 'named',
    language: 'en',
  });
  await testDb.insert(reviewTags).values({
    reviewId,
    group: 'condition',
    termId: tag.termId ?? null,
    freeText: tag.freeText ?? null,
  });
  return reviewId;
}

describe('listTopics and getTopic', () => {
  it('counts experiences tagged by term, by name in either language or by alias, ignoring case', async () => {
    const suffix = newId().slice(-6);
    const topic = await buildTopic(`Synthetic asthma ${suffix}`, `সিনথেটিক হাঁপানি ${suffix}`, [
      `wheeze${suffix}`,
    ]);
    const who = await buildAuthorAndDoctor(suffix);
    await publishTagged(who, { termId: topic.id });
    await publishTagged(who, { freeText: `  SYNTHETIC ASTHMA ${suffix} ` });
    await publishTagged(who, { freeText: `সিনথেটিক হাঁপানি ${suffix}` });
    await publishTagged(who, { freeText: `Wheeze${suffix}` });
    await publishTagged(who, { freeText: `something else ${suffix}` });

    const row = (await listTopics(testDb, 'en')).find((t) => t.publicId === topic.publicId);
    expect(row?.experienceCount).toBe(4);

    const detail = await getTopic(testDb, topic.publicId, 'bn');
    expect(detail).toMatchObject({
      name: `সিনথেটিক হাঁপানি ${suffix}`,
      experienceCount: 4,
      aliases: [`wheeze${suffix}`],
    });
    expect(detail?.experiences).toHaveLength(4);
    expect(detail?.doctors).toEqual([
      expect.objectContaining({ id: who.doctorId, experienceCount: 4 }),
    ]);
  });

  it('leaves a topic nobody wrote about at zero and drops an unpublished experience', async () => {
    const suffix = newId().slice(-6);
    const topic = await buildTopic(`Synthetic eczema ${suffix}`, `সিনথেটিক একজিমা ${suffix}`);
    const who = await buildAuthorAndDoctor(suffix);
    const reviewId = await publishTagged(who, { termId: topic.id });
    await testDb.update(reviews).set({ state: 'hidden' }).where(eq(reviews.id, reviewId));

    const detail = await getTopic(testDb, topic.publicId, 'en');
    expect(detail).toMatchObject({ experienceCount: 0, experiences: [], doctors: [] });
  });

  it('answers a malformed or unknown public id with null', async () => {
    expect(await getTopic(testDb, "'; drop table reviews; --", 'en')).toBeNull();
    expect(await getTopic(testDb, newPublicId(), 'en')).toBeNull();
  });
});
