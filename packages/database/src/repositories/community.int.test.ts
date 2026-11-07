// PgCommunityRepository against DATABASE_URL_TEST (U49 functional-spec § 1, § 9 database row): each
// method on `comments`, and the `fn_comment_depth` trigger mapped to `community.reply_depth`.
import type { NewCommentRow } from '@rogikotha/application';
import { newId, newPublicId } from '@rogikotha/contracts';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { comments } from '../schema/community';
import { testDb } from '../test-setup';
import { appTx } from './account-test-support';
import { PgCommunityRepository } from './community';
import { buildDoctor, buildPersona, buildReview } from './directory-test-support';

const repo = new PgCommunityRepository();
const tx = appTx(testDb);

async function scene() {
  const doctor = await buildDoctor(testDb);
  const author = await buildPersona(testDb, { displayName: 'Rina Akter' });
  const reader = await buildPersona(testDb, { kind: 'pseudonymous', displayName: 'Karim Reader' });
  const review = await buildReview(testDb, doctor.id, author);
  return { doctorId: doctor.id, author, reader, reviewId: review.id };
}

function newRow(reviewId: string, authorPersonaId: string, extra: Partial<NewCommentRow> = {}) {
  return {
    id: newId(),
    publicId: newPublicId(),
    reviewId,
    parentId: null,
    authorPersonaId,
    body: 'A synthetic comment.',
    ...extra,
  } satisfies NewCommentRow;
}

async function insertOk(row: NewCommentRow): Promise<NewCommentRow> {
  const result = await repo.insert(tx, row);
  expect(result).toEqual({ ok: true, data: undefined });
  return row;
}

async function insertAt(
  row: NewCommentRow,
  createdAt: Date,
  state: 'published' | 'hidden' = 'published',
) {
  await testDb.insert(comments).values({ ...row, state, createdAt });
  return row;
}

describe('insert', () => {
  it('publishes a top-level comment and flags an external link as the demo did', async () => {
    const { reader, reviewId } = await scene();
    const row = await insertOk(
      newRow(reviewId, reader, { body: 'See https://example.test for context' }),
    );

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, row.id));
    expect(stored).toMatchObject({
      publicId: row.publicId,
      reviewId,
      parentId: null,
      authorPersonaId: reader,
      state: 'published',
      hasExternalLink: true,
      deletedAt: null,
      tombstone: false,
    });
  });

  it('stores a plain body without the link flag', async () => {
    const { reader, reviewId } = await scene();
    const row = await insertOk(newRow(reviewId, reader, { body: 'No link here.' }));

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, row.id));
    expect(stored!.hasExternalLink).toBe(false);
  });

  it('accepts a reply to a top-level comment', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await insertOk(newRow(reviewId, reader));
    const reply = await insertOk(newRow(reviewId, author, { parentId: parent.id }));

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, reply.id));
    expect(stored!.parentId).toBe(parent.id);
  });

  it('refuses a reply to a reply with community.reply_depth and writes nothing', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await insertOk(newRow(reviewId, reader));
    const reply = await insertOk(newRow(reviewId, author, { parentId: parent.id }));
    const tooDeep = newRow(reviewId, reader, { parentId: reply.id });

    await expect(repo.insert(tx, tooDeep)).resolves.toEqual({
      ok: false,
      error: { code: 'community.reply_depth' },
    });
    expect(await testDb.select().from(comments).where(eq(comments.id, tooDeep.id))).toEqual([]);
  });

  it('leaves the surrounding transaction usable after the depth refusal', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await insertOk(newRow(reviewId, reader));
    const reply = await insertOk(newRow(reviewId, author, { parentId: parent.id }));
    const after = newRow(reviewId, author);

    await testDb.transaction(async (drizzleTx) => {
      const inner = appTx(drizzleTx);
      const refused = await repo.insert(inner, newRow(reviewId, reader, { parentId: reply.id }));
      expect(refused.ok).toBe(false);
      await expect(repo.insert(inner, after)).resolves.toEqual({ ok: true, data: undefined });
    });

    expect(await testDb.select().from(comments).where(eq(comments.id, after.id))).toHaveLength(1);
  });

  it('rethrows any other database error', async () => {
    const { reader } = await scene();

    await expect(repo.insert(tx, newRow(newId(), reader))).rejects.toThrow();
  });
});

describe('byPublicId', () => {
  it('finds a comment in any state, with its internal fields', async () => {
    const { reader, reviewId } = await scene();
    const row = await insertOk(newRow(reviewId, reader));
    await repo.markDeleted(tx, { commentId: row.id, at: new Date(), tombstone: false });

    const found = await repo.byPublicId(tx, { publicId: row.publicId });

    expect(found).toMatchObject({
      id: row.id,
      publicId: row.publicId,
      reviewId,
      parentId: null,
      authorPersonaId: reader,
      body: row.body,
      state: 'deleted_tombstone',
      tombstone: false,
    });
    expect(found!.deletedAt).toBeInstanceOf(Date);
    expect(found!.createdAt).toBeInstanceOf(Date);
  });

  it('is scoped by review when a review id is given', async () => {
    const { doctorId, author, reader, reviewId } = await scene();
    const other = await buildReview(testDb, doctorId, author);
    const row = await insertOk(newRow(reviewId, reader));

    await expect(repo.byPublicId(tx, { reviewId, publicId: row.publicId })).resolves.toMatchObject({
      id: row.id,
    });
    await expect(repo.byPublicId(tx, { reviewId: other.id, publicId: row.publicId })).resolves.toBe(
      null,
    );
  });

  it('returns null for an unknown public id or a review id that is not a uuid', async () => {
    const { reader, reviewId } = await scene();
    const row = await insertOk(newRow(reviewId, reader));

    await expect(repo.byPublicId(tx, { publicId: newPublicId() })).resolves.toBeNull();
    await expect(
      repo.byPublicId(tx, { reviewId: 'not-a-uuid', publicId: row.publicId }),
    ).resolves.toBeNull();
  });
});

describe('countLiveReplies', () => {
  it('counts published replies and ignores deleted and hidden ones', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await insertOk(newRow(reviewId, reader));
    await insertOk(newRow(reviewId, author, { parentId: parent.id }));
    const deleted = await insertOk(newRow(reviewId, author, { parentId: parent.id }));
    await repo.markDeleted(tx, { commentId: deleted.id, at: new Date(), tombstone: false });
    await insertAt(newRow(reviewId, author, { parentId: parent.id }), new Date(), 'hidden');

    await expect(repo.countLiveReplies(tx, parent.id)).resolves.toBe(1);
  });

  it('is 0 without replies, after the last live reply is deleted, and for a non-uuid', async () => {
    const { author, reader, reviewId } = await scene();
    const parent = await insertOk(newRow(reviewId, reader));
    await expect(repo.countLiveReplies(tx, parent.id)).resolves.toBe(0);

    const reply = await insertOk(newRow(reviewId, author, { parentId: parent.id }));
    await repo.markDeleted(tx, { commentId: reply.id, at: new Date(), tombstone: false });

    await expect(repo.countLiveReplies(tx, parent.id)).resolves.toBe(0);
    await expect(repo.countLiveReplies(tx, 'not-a-uuid')).resolves.toBe(0);
  });
});

describe('markDeleted', () => {
  it('moves the comment to deleted_tombstone with deleted_at and updated_at, without tombstone', async () => {
    const { reader, reviewId } = await scene();
    const row = await insertOk(newRow(reviewId, reader));
    const at = new Date('2026-06-01T10:00:00.000Z');

    await repo.markDeleted(tx, { commentId: row.id, at, tombstone: false });

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, row.id));
    expect(stored).toMatchObject({
      state: 'deleted_tombstone',
      deletedAt: at,
      updatedAt: at,
      tombstone: false,
      body: row.body,
    });
  });

  it('sets the tombstone flag when asked', async () => {
    const { author, reader, reviewId } = await scene();
    const row = await insertOk(newRow(reviewId, reader));
    await insertOk(newRow(reviewId, author, { parentId: row.id }));

    await repo.markDeleted(tx, { commentId: row.id, at: new Date(), tombstone: true });

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, row.id));
    expect(stored).toMatchObject({ state: 'deleted_tombstone', tombstone: true });
  });

  it('touches no other comment', async () => {
    const { reader, reviewId } = await scene();
    const target = await insertOk(newRow(reviewId, reader));
    const bystander = await insertOk(newRow(reviewId, reader));

    await repo.markDeleted(tx, { commentId: target.id, at: new Date(), tombstone: false });

    const [stored] = await testDb.select().from(comments).where(eq(comments.id, bystander.id));
    expect(stored).toMatchObject({ state: 'published', deletedAt: null });
  });
});

describe('threadRows', () => {
  it('lists published and deleted rows oldest first, then by id, and never hidden ones', async () => {
    const { author, reader, reviewId } = await scene();
    const t0 = new Date('2026-05-01T08:00:00.000Z');
    const t1 = new Date('2026-05-01T09:00:00.000Z');
    const ids = [newId(), newId()].sort();
    const late = await insertAt(newRow(reviewId, reader), t1);
    const tieB = await insertAt(newRow(reviewId, author, { id: ids[1]! }), t0);
    const tieA = await insertAt(newRow(reviewId, reader, { id: ids[0]! }), t0);
    await insertAt(newRow(reviewId, reader), t0, 'hidden');
    await repo.markDeleted(tx, { commentId: tieB.id, at: new Date(), tombstone: false });

    const rows = await repo.threadRows(tx, { reviewId, limit: 501 });

    expect(rows.map((r) => r.id)).toEqual([tieA.id, tieB.id, late.id]);
    expect(rows.map((r) => r.state)).toEqual(['published', 'deleted_tombstone', 'published']);
  });

  it('reads at most the given limit', async () => {
    const { reader, reviewId } = await scene();
    const base = Date.parse('2026-05-02T08:00:00.000Z');
    const rows = [];
    for (let i = 0; i < 3; i++) {
      rows.push(await insertAt(newRow(reviewId, reader), new Date(base + i * 1000)));
    }

    const listed = await repo.threadRows(tx, { reviewId, limit: 2 });

    expect(listed.map((r) => r.id)).toEqual([rows[0]!.id, rows[1]!.id]);
  });

  it('lists only the given review, and nothing for a non-uuid review id', async () => {
    const { doctorId, author, reader, reviewId } = await scene();
    const other = await buildReview(testDb, doctorId, author);
    await insertOk(newRow(other.id, reader));
    const mine = await insertOk(newRow(reviewId, reader));

    const rows = await repo.threadRows(tx, { reviewId, limit: 501 });

    expect(rows.map((r) => r.id)).toEqual([mine.id]);
    await expect(repo.threadRows(tx, { reviewId: 'not-a-uuid', limit: 501 })).resolves.toEqual([]);
  });
});
