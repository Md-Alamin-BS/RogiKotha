import { COMMENT_POST_LIMIT, COMMENT_POST_WINDOW_SEC } from '@rogikotha/domain';
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  expectErr,
  expectOk,
  makeCommunityWorld,
  type CommunityWorldOverrides,
} from '../community-test-support';

const UNKNOWN_PUBLIC_ID = 'zzzzzzzzzz';

async function setup(
  mode: 'named' | 'pseudonymous' | 'anonymous' = 'pseudonymous',
  overrides: CommunityWorldOverrides = {},
) {
  const w = makeCommunityWorld(overrides);
  const author = await w.member({ displayName: 'Rumana Synthetic', username: 'rumana_demo' });
  const reader = await w.member({ displayName: 'Tanvir Synthetic', username: 'tanvir_demo' });
  const reviewPublicId = await w.published(author, mode);
  return { w, author, reader, reviewPublicId, reviewId: w.reviewIdOf(reviewPublicId) };
}

describe('comment.post', () => {
  it('posts a top-level comment as a published row with a new public id', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();

    const result = await w.community.postComment.execute(
      { reviewPublicId, body: '  Thank you for sharing this.  ' },
      reader.call,
    );

    const { publicId } = expectOk(result);
    expect(Object.keys(expectOk(result))).toEqual(['publicId']);
    const row = w.rowOf(publicId);
    expect(row).toMatchObject({
      reviewId,
      parentId: null,
      body: 'Thank you for sharing this.',
      state: 'published',
      deletedAt: null,
    });
  });

  it('posts a reply under a live top-level comment of the same review', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const parent = await w.posted(reader.call, reviewPublicId, 'A question about the visit.');

    const reply = expectOk(
      await w.community.postComment.execute(
        { reviewPublicId, parentPublicId: parent, body: 'The answer to it.' },
        author.call,
      ),
    );

    expect(w.rowOf(reply.publicId).parentId).toBe(w.rowOf(parent).id);
  });

  it('refuses a signed-out caller with forbidden and writes nothing', async () => {
    const { w, reviewPublicId } = await setup();

    const error = expectErr(
      await w.community.postComment.execute(
        { reviewPublicId, body: 'Hello.' },
        w.callAs(anAnonymousActor()),
      ),
    );

    expect(error.code).toBe('forbidden');
    expect(w.comments.rows.size).toBe(0);
    expect(w.commentPostHits()).toBe(0);
  });

  it('refuses an account whose email is not confirmed', async () => {
    const { w, reviewPublicId } = await setup();
    const pending = await w.member({ status: 'pending_verification', username: 'pending_demo' });

    const error = expectErr(
      await w.community.postComment.execute({ reviewPublicId, body: 'Hello.' }, pending.call),
    );

    expect(error.code).toBe('auth.email_unverified');
    expect(w.comments.rows.size).toBe(0);
  });

  it('refuses a restricted account with forbidden', async () => {
    const { w, reviewPublicId } = await setup();
    const restricted = await w.member({ status: 'restricted', username: 'restricted_demo' });

    const error = expectErr(
      await w.community.postComment.execute({ reviewPublicId, body: 'Hello.' }, restricted.call),
    );

    expect(error.code).toBe('forbidden');
    expect(w.comments.rows.size).toBe(0);
  });

  it('refuses a body that is empty once trimmed or longer than 2000 code points', async () => {
    const { w, reader, reviewPublicId } = await setup();

    for (const body of ['   ', 'a'.repeat(2001)]) {
      const error = expectErr(
        await w.community.postComment.execute({ reviewPublicId, body }, reader.call),
      );
      expect(error.code).toBe('validation');
    }
    expect(w.comments.rows.size).toBe(0);
  });

  it('refuses invisible and control characters before the limiter, so they are not counted (FD-115)', async () => {
    const { w, reader, reviewPublicId } = await setup();
    const ch = (cp: number) => String.fromCodePoint(cp);
    const auditBefore = w.fakes.audit.events.length;

    const refused = [
      [ch(0x200b), 'errors.community.commentLength'],
      [`a${ch(0x0000)}b`, 'errors.community.commentHidden'],
      [`a${ch(0x202e)}b`, 'errors.community.commentHidden'],
      [`a${ch(0x2066)}b`, 'errors.community.commentHidden'],
    ] as const;
    for (const [body, key] of refused) {
      const error = expectErr(
        await w.community.postComment.execute({ reviewPublicId, body }, reader.call),
      );
      expect(error.code).toBe('validation');
      expect(error.fieldErrors).toEqual({ body: key });
    }

    expect(w.commentPostHits()).toBe(0);
    expect(w.comments.rows.size).toBe(0);
    expect(w.fakes.audit.events).toHaveLength(auditBefore);
  });

  it('posts a multi-line Bengali body with ZWJ and ZWNJ as typed', async () => {
    const { w, reader, reviewPublicId } = await setup();
    const body = `প্রথম লাইন: র${String.fromCodePoint(0x200d)}্যাব।\nদ্বিতীয় লাইন: উদ্${String.fromCodePoint(0x200c)}যাপন।`;

    const publicId = await w.posted(reader.call, reviewPublicId, body);

    expect(w.rowOf(publicId).body).toBe(body);
  });

  it('gives an unknown and an unpublished review the same not_found', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();
    const unknown = expectErr(
      await w.community.postComment.execute(
        { reviewPublicId: UNKNOWN_PUBLIC_ID, body: 'Hello.' },
        reader.call,
      ),
    );
    w.reviews.reviews.find((r) => r.id === reviewId)!.state = 'hidden';

    const hidden = expectErr(
      await w.community.postComment.execute({ reviewPublicId, body: 'Hello.' }, reader.call),
    );

    expect(unknown.code).toBe('not_found');
    expect(hidden.code).toBe('not_found');
    expect(hidden.messageKey).toBe(unknown.messageKey);
    expect(w.comments.rows.size).toBe(0);
  });

  it('refuses a reply to a missing parent, a deleted parent or a parent of another review', async () => {
    const { w, author, reader, reviewPublicId, reviewId } = await setup();
    const deleted = w.comments.add({
      reviewId,
      state: 'deleted_tombstone',
      deletedAt: new Date('2026-10-30T09:00:00Z'),
    });
    const otherReview = await w.published(
      author,
      'pseudonymous',
      w.payload('quick', { doctorPublicId: w.reviews.addDoctor().publicId }),
    );
    const elsewhere = await w.posted(reader.call, otherReview);
    const before = w.comments.rows.size;

    for (const parentPublicId of [UNKNOWN_PUBLIC_ID, deleted.publicId, elsewhere]) {
      const error = expectErr(
        await w.community.postComment.execute(
          { reviewPublicId, parentPublicId, body: 'A reply.' },
          reader.call,
        ),
      );
      expect(error.code).toBe('not_found');
    }
    expect(w.comments.rows.size).toBe(before);
  });

  it('refuses a reply to a reply with community.reply_depth', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const top = await w.posted(reader.call, reviewPublicId);
    const reply = await w.posted(author.call, reviewPublicId, 'A reply.', top);
    const before = w.comments.rows.size;

    const error = expectErr(
      await w.community.postComment.execute(
        { reviewPublicId, parentPublicId: reply, body: 'A nested reply.' },
        reader.call,
      ),
    );

    expect(error.code).toBe('community.reply_depth');
    expect(w.comments.rows.size).toBe(before);
  });

  it('maps the repository depth refusal to community.reply_depth', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();
    // A parent read as top-level whose stored row is a reply: the trigger is the backstop.
    const grandparent = w.comments.add({ reviewId });
    const parent = w.comments.add({ reviewId, parentId: grandparent.id });
    const original = w.comments.byPublicId.bind(w.comments);
    w.comments.byPublicId = async (tx, lookup) => {
      const found = await original(tx, lookup);
      return found && found.id === parent.id ? { ...found, parentId: null } : found;
    };

    const error = expectErr(
      await w.community.postComment.execute(
        { reviewPublicId, parentPublicId: parent.publicId, body: 'A reply.' },
        reader.call,
      ),
    );

    expect(error.code).toBe('community.reply_depth');
    expect(w.fakes.audit.events.filter((e) => e.action === 'comment.posted')).toEqual([]);
  });

  it('refuses the post after 30 valid posts in an hour with retryAfterSec', async () => {
    const { w, reader, reviewPublicId } = await setup();
    for (let i = 0; i < COMMENT_POST_LIMIT; i += 1) {
      await w.posted(reader.call, reviewPublicId, `Synthetic comment ${i}.`);
    }

    const error = expectErr(
      await w.community.postComment.execute({ reviewPublicId, body: 'One more.' }, reader.call),
    );

    expect(error.code).toBe('rate_limited');
    expect(error.retryAfterSec).toBe(COMMENT_POST_WINDOW_SEC);
    expect(w.comments.rows.size).toBe(COMMENT_POST_LIMIT);
    expect(w.fakes.rateLimiter.calls.at(-1)?.key).toBe(`comment.post:account:${reader.accountId}`);
  });

  it('does not count a refused post toward the limit', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const top = await w.posted(reader.call, reviewPublicId);
    const reply = await w.posted(author.call, reviewPublicId, 'A reply.', top);
    const hits = w.commentPostHits();

    await w.community.postComment.execute(
      { reviewPublicId: UNKNOWN_PUBLIC_ID, body: 'x' },
      reader.call,
    );
    await w.community.postComment.execute({ reviewPublicId, body: '   ' }, reader.call);
    await w.community.postComment.execute(
      { reviewPublicId, parentPublicId: UNKNOWN_PUBLIC_ID, body: 'x' },
      reader.call,
    );
    await w.community.postComment.execute(
      { reviewPublicId, parentPublicId: reply, body: 'x' },
      reader.call,
    );
    await w.community.postComment.execute(
      { reviewPublicId, body: 'x' },
      w.callAs(anAnonymousActor()),
    );

    expect(w.commentPostHits()).toBe(hits);
  });

  it("writes the author's comment under the review's named persona", async () => {
    const { w, author, reviewPublicId } = await setup('named');

    const publicId = await w.posted(author.call, reviewPublicId);

    expect(w.rowOf(publicId).authorPersonaId).toBe(author.namedPersonaId);
  });

  it("writes the author's comment on an anonymous review under that thread's alias", async () => {
    const { w, author, reviewPublicId, reviewId } = await setup('anonymous');
    const reviewPersona = w.reviews.reviews.find((r) => r.id === reviewId)!.authorPersonaId;

    const publicId = await w.posted(author.call, reviewPublicId);

    expect(w.rowOf(publicId).authorPersonaId).toBe(reviewPersona);
    expect(reviewPersona).not.toBe(author.namedPersonaId);
    expect(reviewPersona).not.toBe(author.pseudonymousPersonaId);
  });

  it('writes another account’s comment under its pseudonymous persona, even on an anonymous review', async () => {
    const { w, reader, reviewPublicId } = await setup('anonymous');

    const publicId = await w.posted(reader.call, reviewPublicId);

    expect(w.rowOf(publicId).authorPersonaId).toBe(reader.pseudonymousPersonaId);
  });

  it('fails with internal and writes nothing when the author has no review mode', async () => {
    const { w, author, reviewPublicId } = await setup('pseudonymous', {
      review: (seams) => ({ ...seams, authorIdentityModeOf: () => Promise.resolve(null) }),
    });
    const auditBefore = w.fakes.audit.events.length;
    const outboxBefore = w.fakes.outbox.events.length;

    const error = expectErr(
      await w.community.postComment.execute({ reviewPublicId, body: 'Hello.' }, author.call),
    );

    expect(error.code).toBe('internal');
    expect(w.comments.rows.size).toBe(0);
    expect(w.fakes.audit.events).toHaveLength(auditBefore);
    expect(w.fakes.outbox.events).toHaveLength(outboxBefore);
    expect(w.commentPostHits()).toBe(0);
    const logged = w.fakes.logger.entries.find((e) => e.event === 'community.author_mode_missing');
    expect(logged?.level).toBe('error');
    expect(Object.keys(logged?.fields ?? {})).toEqual(['correlationId']);
  });

  it('writes one audit row with the persona actor and one outbox event with ids only', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();
    const top = await w.posted(reader.call, reviewPublicId);
    const auditBefore = w.fakes.audit.events.length;

    const reply = await w.posted(reader.call, reviewPublicId, 'A follow-up.', top);

    const row = w.rowOf(reply);
    expect(w.fakes.audit.events.slice(auditBefore)).toEqual([
      {
        stream: `comment:${row.id}`,
        action: 'comment.posted',
        actor: `persona:${reader.pseudonymousPersonaId}`,
        targetKind: 'comment',
        targetId: row.id,
        details: { isReply: true },
      },
    ]);
    expect(w.fakes.outbox.events.filter((e) => e.name === 'comment.posted').at(-1)).toEqual({
      name: 'comment.posted',
      payload: { commentId: row.id, reviewId },
    });
    expect(JSON.stringify(w.fakes.audit.events)).not.toContain(reader.accountId);
  });
});
