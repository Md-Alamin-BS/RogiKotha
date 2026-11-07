import type { PersonaPublicVM, ThreadVM } from '@rogikotha/contracts';
import { THREAD_CAP } from '@rogikotha/domain';
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  expectOk,
  makeCommunityWorld,
  type CommunityWorld,
  type CommunityWorldOverrides,
  type Member,
} from '../community-test-support';

const DELETED_AT = new Date('2026-10-30T09:00:00Z');

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

async function threadOf(w: CommunityWorld, reviewPublicId: string, viewer?: Member) {
  const call = viewer ? viewer.call : w.callAs(anAnonymousActor());
  return expectOk(await w.community.getThread.execute({ reviewPublicId }, call));
}

function shape(thread: ThreadVM) {
  return thread.items.map((item) => ({
    kind: item.kind,
    body: item.comment?.body ?? null,
    replies: item.replies.map((r) => r.body),
  }));
}

describe('community.thread', () => {
  it('is closed and empty for an unknown or an unpublished review', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();
    await w.posted(reader.call, reviewPublicId);
    const closed = { open: false, items: [], truncated: false };

    expect(await threadOf(w, 'zzzzzzzzzz')).toEqual(closed);
    w.reviews.reviews.find((r) => r.id === reviewId)!.state = 'hidden';
    expect(await threadOf(w, reviewPublicId)).toEqual(closed);
  });

  it('lists comments oldest first with their replies and a placeholder for a deleted parent', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const first = await w.posted(reader.call, reviewPublicId, 'First comment.');
    await w.posted(author.call, reviewPublicId, 'Reply to first.', first);
    const second = await w.posted(author.call, reviewPublicId, 'Second comment.');
    await w.posted(reader.call, reviewPublicId, 'Reply to second.', second);
    await w.posted(reader.call, reviewPublicId, 'Third comment, deleted.');
    expectOk(await w.community.deleteComment.execute({ commentPublicId: second }, author.call));
    const third = [...w.comments.rows.values()].find((r) => r.body === 'Third comment, deleted.')!;
    expectOk(
      await w.community.deleteComment.execute({ commentPublicId: third.publicId }, reader.call),
    );

    const thread = await threadOf(w, reviewPublicId);

    expect(thread.open).toBe(true);
    expect(thread.truncated).toBe(false);
    expect(shape(thread)).toEqual([
      { kind: 'comment', body: 'First comment.', replies: ['Reply to first.'] },
      { kind: 'placeholder', body: null, replies: ['Reply to second.'] },
    ]);
    const placeholder = thread.items[1]!;
    expect(Object.keys(placeholder).sort()).toEqual(['kind', 'placeholderPublicId', 'replies']);
    expect(placeholder.placeholderPublicId).toBe(second);
    expect(thread.items[0]!.comment!.isReply).toBe(false);
    expect(thread.items[0]!.replies[0]!.isReply).toBe(true);
    expect(thread.items[0]!.comment!.postedAt).toBe(w.rowOf(first).createdAt.toISOString());
  });

  it('reads 201 distinct authors through two projection batches and shows every byline', async () => {
    const batches: number[] = [];
    const { w, reviewPublicId, reviewId } = await setup('pseudonymous', {
      identity: (seams) => ({
        ...seams,
        publicProjections: (_tx, { personaIds }) => {
          batches.push(personaIds.length);
          return Promise.resolve(
            personaIds.map((id): PersonaPublicVM => ({
              kind: 'pseudonymous',
              displayName: `member_${id}`,
              username: `member_${id}`,
              avatarHue: 1,
            })),
          );
        },
      }),
    });
    for (let i = 0; i < 201; i += 1) {
      w.comments.add({ reviewId, authorPersonaId: `persona-${i}`, body: `Comment ${i}.` });
    }

    const thread = await threadOf(w, reviewPublicId);

    expect(batches).toEqual([200, 1]);
    expect(thread.items).toHaveLength(201);
    const names = thread.items.map((item) => item.comment!.author.displayName);
    expect(new Set(names).size).toBe(201);
    expect(names).toContain('member_persona-200');
  });

  it('shows the anonymous byline for an author with no projection', async () => {
    const { w, reader, reviewPublicId, reviewId } = await setup();
    await w.posted(reader.call, reviewPublicId, 'Known author.');
    w.comments.add({ reviewId, authorPersonaId: 'persona-missing', body: 'Unknown author.' });

    const thread = await threadOf(w, reviewPublicId);

    const byBody = new Map(thread.items.map((i) => [i.comment!.body, i.comment!.author]));
    expect(byBody.get('Known author.')).toMatchObject({
      kind: 'pseudonymous',
      displayName: 'tanvir_demo',
    });
    expect(byBody.get('Unknown author.')).toEqual({
      kind: 'anonymous',
      displayName: null,
      avatarHue: 0,
    });
  });

  it('asks ownership nothing for a signed-out viewer and once per distinct author when signed in', async () => {
    const asked: string[] = [];
    const { w, author, reader, reviewPublicId } = await setup('pseudonymous', {
      ownership: (seams) => ({
        ownsPersona: (tx, input) => {
          asked.push(input.personaId);
          return seams.ownsPersona(tx, input);
        },
      }),
    });
    const top = await w.posted(reader.call, reviewPublicId, 'Mine.');
    await w.posted(author.call, reviewPublicId, 'Not mine.', top);
    await w.posted(reader.call, reviewPublicId, 'Mine again.');
    await w.posted(author.call, reviewPublicId, 'Not mine again.');
    asked.length = 0;

    const signedOut = await threadOf(w, reviewPublicId);
    expect(asked).toEqual([]);
    expect(signedOut.items.every((i) => i.comment!.mine === false)).toBe(true);

    const signedIn = await threadOf(w, reviewPublicId, reader);
    expect(asked).toHaveLength(2);
    expect(new Set(asked).size).toBe(2);
    const mine = signedIn.items
      .flatMap((i) => [i.comment!, ...i.replies])
      .map((c) => [c.body, c.mine]);
    expect(mine).toEqual([
      ['Mine.', true],
      ['Not mine.', false],
      ['Mine again.', true],
      ['Not mine again.', false],
    ]);
  });

  it('cuts 501 listed rows, tombstones included, to 500 and says it was cut', async () => {
    const { w, reviewPublicId, reviewId } = await setup();
    const { reader } = { reader: await w.member({ username: 'many_demo' }) };
    for (let i = 0; i <= THREAD_CAP; i += 1) {
      w.comments.add({
        reviewId,
        authorPersonaId: reader.pseudonymousPersonaId,
        body: `Row ${i}.`,
        ...(i % 5 === 0 ? { state: 'deleted_tombstone' as const, deletedAt: DELETED_AT } : {}),
      });
    }

    const thread = await threadOf(w, reviewPublicId);

    expect(thread.truncated).toBe(true);
    expect(thread.items).toHaveLength(THREAD_CAP - THREAD_CAP / 5);
    expect(thread.items.at(-1)!.comment!.body).toBe('Row 499.');
  });

  it('keeps a thread of exactly 500 rows whole', async () => {
    const { w, reviewPublicId, reviewId } = await setup();
    for (let i = 0; i < THREAD_CAP; i += 1) {
      w.comments.add({ reviewId, body: `Row ${i}.` });
    }

    const thread = await threadOf(w, reviewPublicId);

    expect(thread.truncated).toBe(false);
    expect(thread.items).toHaveLength(THREAD_CAP);
  });

  it('carries no account, persona or internal id in the thread JSON', async () => {
    const { w, author, reader, reviewPublicId, reviewId } = await setup('anonymous');
    const top = await w.posted(reader.call, reviewPublicId);
    await w.posted(author.call, reviewPublicId, 'A reply.', top);
    const deleted = await w.posted(author.call, reviewPublicId, 'Deleted with a reply.');
    await w.posted(reader.call, reviewPublicId, 'Keeps the placeholder.', deleted);
    expectOk(await w.community.deleteComment.execute({ commentPublicId: deleted }, author.call));

    const json = JSON.stringify(await threadOf(w, reviewPublicId, reader));

    const secrets = [
      reviewId,
      author.accountId,
      reader.accountId,
      author.namedPersonaId,
      author.pseudonymousPersonaId,
      reader.namedPersonaId,
      reader.pseudonymousPersonaId,
      ...[...w.comments.rows.values()].flatMap((r) => [r.id, r.authorPersonaId]),
    ];
    for (const secret of secrets) expect(json).not.toContain(secret);
    expect(json).not.toMatch(/"(id|accountId|personaId|reviewId|likeCount|score)"/);
  });

  it("shows an anonymous author's comment under the review's alias, a different one per thread", async () => {
    const w = makeCommunityWorld();
    const author = await w.member({ displayName: 'Rumana Synthetic', username: 'rumana_demo' });
    const first = await w.published(author, 'anonymous');
    const second = await w.published(
      author,
      'anonymous',
      w.payload('quick', { doctorPublicId: w.reviews.addDoctor().publicId }),
    );
    await w.posted(author.call, first, 'On the first review.');
    await w.posted(author.call, second, 'On the second review.');
    const reviewPersona = w.reviews.reviews.find((r) => r.publicId === first)!.authorPersonaId;
    const reviewByline = await w.identityModule.publicProjection({} as never, {
      personaId: reviewPersona,
    });

    const onFirst = (await threadOf(w, first)).items[0]!.comment!.author;
    const onSecond = (await threadOf(w, second)).items[0]!.comment!.author;

    expect(onFirst.kind).toBe('anonymous');
    expect(onFirst).toEqual(reviewByline);
    expect(onSecond.kind).toBe('anonymous');
    expect(onSecond.displayName).not.toBe(onFirst.displayName);
    expect(JSON.stringify([onFirst, onSecond])).not.toContain('rumana');
  });
});
