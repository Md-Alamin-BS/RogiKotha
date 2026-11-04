import { newId, newPublicId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { accountProfiles } from '../schema/account';
import { authUsers } from '../schema/auth';
import { comments } from '../schema/community';
import { doctors } from '../schema/directory';
import { personaLinks, personas } from '../schema/identity';
import { reviews } from '../schema/review';
import { testDb } from '../test-setup';
import { addComment, deleteOwnComment, listComments } from './comments';

type PersonaKind = 'named' | 'pseudonymous' | 'anonymous';

async function buildAccount(displayName: string, kind: PersonaKind = 'named') {
  const authUserId = newId();
  const username = `c_${authUserId.slice(-10)}`;
  await testDb.insert(authUsers).values({ id: authUserId, email: `${username}@example.test` });
  const [profile] = await testDb
    .insert(accountProfiles)
    .values({
      authUserId,
      username,
      usernameKey: username,
      displayName,
      locale: 'en',
      status: 'active',
    })
    .returning({ id: accountProfiles.id });
  const [persona] = await testDb
    .insert(personas)
    .values({ kind, displayName })
    .returning({ id: personas.id });
  await testDb.insert(personaLinks).values({ personaId: persona!.id, accountId: profile!.id });
  return { accountId: profile!.id, personaId: persona!.id };
}

async function buildReview(authorPersonaId: string): Promise<string> {
  const [doctor] = await testDb
    .insert(doctors)
    .values({
      publicId: newPublicId(),
      nameEn: 'Dr. Synthetic Rahman',
      nameBn: 'ডা. কৃত্রিম রহমান',
      state: 'published',
      nameKey: `synthetic-${newId()}`,
    })
    .returning({ id: doctors.id });
  const [review] = await testDb
    .insert(reviews)
    .values({
      publicId: newPublicId(),
      authorPersonaId,
      doctorId: doctor!.id,
      kind: 'quick',
      relationship: 'self',
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 3,
      title: 'A synthetic experience',
      body: 'Synthetic body.',
      language: 'en',
      state: 'published',
      publishedAt: new Date(),
    })
    .returning({ id: reviews.id });
  return review!.id;
}

async function post(
  reviewId: string,
  authorPersonaId: string,
  body: string,
  parentPublicId: string | null = null,
) {
  const outcome = await addComment(testDb, { reviewId, parentPublicId, authorPersonaId, body });
  if (!outcome.ok) throw new Error(`addComment refused: ${outcome.reason}`);
  return outcome.data;
}

async function scene() {
  const author = await buildAccount('Rina Author');
  const reader = await buildAccount('Karim Reader');
  const reviewId = await buildReview(author.personaId);
  return { author, reader, reviewId };
}

describe('demo comments listing', () => {
  it('lists top-level comments oldest first, each with its replies oldest first', async () => {
    const { author, reader, reviewId } = await scene();
    const first = await post(reviewId, reader.personaId, 'First comment');
    const second = await post(reviewId, author.personaId, 'Second comment');
    await post(reviewId, author.personaId, 'Reply one', first.publicId);
    await post(reviewId, reader.personaId, 'Reply two', first.publicId);

    const threads = await listComments(testDb, reviewId, null);

    expect(threads.map((t) => t.publicId)).toEqual([first.publicId, second.publicId]);
    expect(threads[0]!.replies.map((r) => r.body)).toEqual(['Reply one', 'Reply two']);
    expect(threads[0]).toMatchObject({ authorDisplayName: 'Karim Reader', tombstone: false });
    expect(threads[1]!.replies).toEqual([]);
  });

  it('shows the viewer that only their own live comments can be deleted', async () => {
    const { author, reader, reviewId } = await scene();
    await post(reviewId, reader.personaId, 'By the reader');
    await post(reviewId, author.personaId, 'By the author');

    const asReader = await listComments(testDb, reviewId, reader.accountId);
    const signedOut = await listComments(testDb, reviewId, null);

    expect(asReader.map((t) => t.canDelete)).toEqual([true, false]);
    expect(signedOut.map((t) => t.canDelete)).toEqual([false, false]);
  });

  it('leaves out a deleted comment that has no replies', async () => {
    const { reader, reviewId } = await scene();
    const gone = await post(reviewId, reader.personaId, 'Soon deleted');
    await deleteOwnComment(testDb, gone.publicId, reader.accountId);

    await expect(listComments(testDb, reviewId, null)).resolves.toEqual([]);
  });

  it('keeps a deleted comment with replies as a tombstone without body or author', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await post(reviewId, reader.personaId, 'Deleted later');
    await post(reviewId, author.personaId, 'A reply that stays', parent.publicId);
    await deleteOwnComment(testDb, parent.publicId, reader.accountId);

    const [thread] = await listComments(testDb, reviewId, reader.accountId);

    expect(thread).toMatchObject({
      publicId: parent.publicId,
      body: null,
      authorDisplayName: null,
      tombstone: true,
      canDelete: false,
    });
    expect(thread!.replies.map((r) => r.body)).toEqual(['A reply that stays']);
  });

  it('gives an anonymous commenter no name', async () => {
    const { reviewId } = await scene();
    const anonymous = await buildAccount('Anonymous', 'anonymous');
    await post(reviewId, anonymous.personaId, 'Said anonymously');

    const [thread] = await listComments(testDb, reviewId, null);

    expect(thread).toMatchObject({ body: 'Said anonymously', authorDisplayName: null });
    expect(thread!.tombstone).toBe(false);
  });

  it('shows neither hidden comments nor comments on another experience', async () => {
    const { author, reader, reviewId } = await scene();
    const otherReviewId = await buildReview(author.personaId);
    await post(otherReviewId, reader.personaId, 'Elsewhere');
    const hidden = await post(reviewId, reader.personaId, 'Hidden by a moderator');
    await testDb.update(comments).set({ state: 'hidden' }).where(eq(comments.id, hidden.id));

    await expect(listComments(testDb, reviewId, null)).resolves.toEqual([]);
  });
});

describe('demo comment posting', () => {
  it('publishes a top-level comment under the given persona', async () => {
    const { reader, reviewId } = await scene();

    const outcome = await addComment(testDb, {
      reviewId,
      parentPublicId: null,
      authorPersonaId: reader.personaId,
      body: 'See https://example.test for context',
    });

    expect(outcome.ok).toBe(true);
    const [row] = await testDb.select().from(comments).where(eq(comments.reviewId, reviewId));
    expect(row).toMatchObject({
      authorPersonaId: reader.personaId,
      parentId: null,
      state: 'published',
      hasExternalLink: true,
      deletedAt: null,
    });
  });

  it('refuses a reply to a reply', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await post(reviewId, reader.personaId, 'Top');
    const reply = await post(reviewId, author.personaId, 'Reply', parent.publicId);

    await expect(
      addComment(testDb, {
        reviewId,
        parentPublicId: reply.publicId,
        authorPersonaId: reader.personaId,
        body: 'Too deep',
      }),
    ).resolves.toEqual({ ok: false, reason: 'reply_depth' });
  });

  it('refuses a reply to an unknown, deleted or other-experience comment', async () => {
    const { author, reader, reviewId } = await scene();
    const otherReviewId = await buildReview(author.personaId);
    const elsewhere = await post(otherReviewId, reader.personaId, 'On another experience');
    const deleted = await post(reviewId, reader.personaId, 'Deleted');
    await deleteOwnComment(testDb, deleted.publicId, reader.accountId);

    for (const parentPublicId of [newPublicId(), elsewhere.publicId, deleted.publicId]) {
      await expect(
        addComment(testDb, {
          reviewId,
          parentPublicId,
          authorPersonaId: author.personaId,
          body: 'Reply',
        }),
      ).resolves.toEqual({ ok: false, reason: 'parent_not_found' });
    }
  });
});

describe('demo comment deletion', () => {
  it('lets nobody delete a comment they did not write', async () => {
    const { author, reader, reviewId } = await scene();
    const theirs = await post(reviewId, reader.personaId, 'Not yours');

    await expect(deleteOwnComment(testDb, theirs.publicId, author.accountId)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
    const [row] = await testDb.select().from(comments).where(eq(comments.id, theirs.id));
    expect(row!.deletedAt).toBeNull();
  });

  it('marks the comment deleted, as a tombstone only when it has live replies', async () => {
    const { author, reader, reviewId } = await scene();
    const lonely = await post(reviewId, reader.personaId, 'No replies');
    const answered = await post(reviewId, reader.personaId, 'Has a reply');
    await post(reviewId, author.personaId, 'The reply', answered.publicId);

    await expect(deleteOwnComment(testDb, lonely.publicId, reader.accountId)).resolves.toEqual({
      ok: true,
      data: { tombstone: false },
    });
    await expect(deleteOwnComment(testDb, answered.publicId, reader.accountId)).resolves.toEqual({
      ok: true,
      data: { tombstone: true },
    });
    const [row] = await testDb.select().from(comments).where(eq(comments.id, answered.id));
    expect(row).toMatchObject({ state: 'deleted_tombstone', tombstone: true });
    expect(row!.deletedAt).toBeInstanceOf(Date);
  });

  it('does not delete the same comment twice', async () => {
    const { reader, reviewId } = await scene();
    const once = await post(reviewId, reader.personaId, 'Once');
    await deleteOwnComment(testDb, once.publicId, reader.accountId);

    await expect(deleteOwnComment(testDb, once.publicId, reader.accountId)).resolves.toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});
