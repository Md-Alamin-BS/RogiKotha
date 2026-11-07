import type { Tx } from '@rogikotha/application';
import { err } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { aCommentRecord } from '../builders/comment.js';
import { FakeCommunityModuleRepository } from './community-repository.js';
import { InMemoryUnitOfWork } from './unit-of-work.js';

const tx = {} as Tx;

function newRow(id: string, parentId: string | null = null, body = 'A synthetic comment.') {
  return {
    id,
    publicId: `pub${id.padStart(7, '0')}`,
    reviewId: 'review-1',
    parentId,
    authorPersonaId: 'persona-1',
    body,
  };
}

describe('aCommentRecord', () => {
  it('builds a live top-level release-1 row with distinct ids', () => {
    const a = aCommentRecord();
    const b = aCommentRecord({ parentId: a.id });

    expect(a).toMatchObject({
      parentId: null,
      state: 'published',
      deletedAt: null,
      tombstone: false,
    });
    expect(b.id).not.toBe(a.id);
    expect(b.publicId).not.toBe(a.publicId);
    expect(b.parentId).toBe(a.id);
  });
});

describe('FakeCommunityModuleRepository', () => {
  it('inserts a published row and finds it by public id, scoped by review when asked', async () => {
    const repo = new FakeCommunityModuleRepository();
    await expect(repo.insert(tx, newRow('1', null, 'see www.example.test'))).resolves.toEqual({
      ok: true,
      data: undefined,
    });

    await expect(repo.byPublicId(tx, { publicId: 'pub0000001' })).resolves.toMatchObject({
      id: '1',
      state: 'published',
      deletedAt: null,
    });
    await expect(
      repo.byPublicId(tx, { reviewId: 'review-2', publicId: 'pub0000001' }),
    ).resolves.toBeNull();
    expect(repo.rows.get('1')!.hasExternalLink).toBe(true);
  });

  it('refuses a reply to a reply with community.reply_depth and stores nothing', async () => {
    const repo = new FakeCommunityModuleRepository();
    await repo.insert(tx, newRow('1'));
    await repo.insert(tx, newRow('2', '1'));

    await expect(repo.insert(tx, newRow('3', '2'))).resolves.toEqual({
      ok: false,
      error: { code: 'community.reply_depth' },
    });
    expect(repo.rows.has('3')).toBe(false);
  });

  it('counts only live replies and marks a comment deleted with its tombstone flag', async () => {
    const repo = new FakeCommunityModuleRepository();
    const parent = repo.add();
    repo.add({ parentId: parent.id });
    const deleted = repo.add({ parentId: parent.id });
    repo.add({ parentId: parent.id, state: 'hidden' });
    const at = new Date('2026-06-02T00:00:00.000Z');

    await repo.markDeleted(tx, { commentId: deleted.id, at, tombstone: false });
    await expect(repo.countLiveReplies(tx, parent.id)).resolves.toBe(1);

    await repo.markDeleted(tx, { commentId: parent.id, at, tombstone: true });
    expect(repo.rows.get(parent.id)).toMatchObject({
      state: 'deleted_tombstone',
      deletedAt: at,
      updatedAt: at,
      tombstone: true,
    });
  });

  it('lists published and deleted rows of one review oldest first, then by id, up to the limit', async () => {
    const repo = new FakeCommunityModuleRepository();
    const t = new Date('2026-06-01T00:00:00.000Z');
    const later = repo.add({ id: 'c', createdAt: new Date(t.getTime() + 1000) });
    const tieB = repo.add({ id: 'b', createdAt: t, state: 'deleted_tombstone' });
    const tieA = repo.add({ id: 'a', createdAt: t });
    repo.add({ id: 'h', createdAt: t, state: 'hidden' });
    repo.add({ id: 'x', createdAt: t, reviewId: 'review-2' });

    const all = await repo.threadRows(tx, { reviewId: 'review-1', limit: 501 });
    const two = await repo.threadRows(tx, { reviewId: 'review-1', limit: 2 });

    expect(all.map((r) => r.id)).toEqual([tieA.id, tieB.id, later.id]);
    expect(two.map((r) => r.id)).toEqual([tieA.id, tieB.id]);
    expect(all[0]).not.toHaveProperty('hasExternalLink');
  });

  it('undoes its writes when the unit of work rolls back', async () => {
    const repo = new FakeCommunityModuleRepository();
    const uow = new InMemoryUnitOfWork([repo]);

    await uow.run(async (inner) => {
      await repo.insert(inner, newRow('1'));
      return err('internal');
    });

    expect(repo.rows.size).toBe(0);
  });
});
