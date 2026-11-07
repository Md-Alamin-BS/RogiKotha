import { describe, expect, it } from 'vitest';

import { expectOk, makeCommunityWorld } from './community-test-support';

describe('comments smoke', () => {
  it('a confirmed account posts a comment and a reply, deletes the parent, and the thread shows the placeholder with the reply', async () => {
    const w = makeCommunityWorld();
    const author = await w.member({ displayName: 'Rumana Synthetic', username: 'rumana_demo' });
    const reader = await w.member({ displayName: 'Tanvir Synthetic', username: 'tanvir_demo' });
    const reviewPublicId = await w.published(author, 'named');

    const parent = await w.posted(reader.call, reviewPublicId, 'A synthetic comment.');
    await w.posted(author.call, reviewPublicId, 'A synthetic reply.', parent);

    const before = expectOk(await w.community.getThread.execute({ reviewPublicId }, reader.call));
    expect(before.open).toBe(true);
    expect(before.items).toHaveLength(1);
    expect(before.items[0]).toMatchObject({ kind: 'comment', comment: { publicId: parent } });
    expect(before.items[0]!.replies.map((r) => r.body)).toEqual(['A synthetic reply.']);

    const deleted = expectOk(
      await w.community.deleteComment.execute({ commentPublicId: parent }, reader.call),
    );
    expect(deleted).toEqual({ placeholder: true });

    const after = expectOk(await w.community.getThread.execute({ reviewPublicId }, reader.call));
    expect(after.items).toHaveLength(1);
    expect(after.items[0]!.kind).toBe('placeholder');
    expect(after.items[0]!.comment).toBeUndefined();
    expect(after.items[0]!.replies.map((r) => r.body)).toEqual(['A synthetic reply.']);
  });
});
