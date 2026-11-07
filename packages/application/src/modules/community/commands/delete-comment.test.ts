import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  expectErr,
  expectOk,
  makeCommunityWorld,
} from '../community-test-support';

async function setup() {
  const w = makeCommunityWorld();
  const author = await w.member({ displayName: 'Rumana Synthetic', username: 'rumana_demo' });
  const reader = await w.member({ displayName: 'Tanvir Synthetic', username: 'tanvir_demo' });
  const reviewPublicId = await w.published(author, 'anonymous');
  return { w, author, reader, reviewPublicId };
}

describe('comment.delete', () => {
  it('removes an own comment without live replies and leaves no placeholder', async () => {
    const { w, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);

    const result = await w.community.deleteComment.execute({ commentPublicId }, reader.call);

    expect(expectOk(result)).toEqual({ placeholder: false });
    expect(w.rowOf(commentPublicId)).toMatchObject({
      state: 'deleted_tombstone',
      deletedAt: w.fakes.clock.now(),
      tombstone: false,
    });
  });

  it('keeps a placeholder when the own comment has a live reply', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);
    await w.posted(author.call, reviewPublicId, 'A reply.', commentPublicId);

    const result = await w.community.deleteComment.execute({ commentPublicId }, reader.call);

    expect(expectOk(result)).toEqual({ placeholder: true });
    expect(w.rowOf(commentPublicId).tombstone).toBe(true);
  });

  it('does not count a deleted reply as live', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);
    const reply = await w.posted(author.call, reviewPublicId, 'A reply.', commentPublicId);
    expectOk(await w.community.deleteComment.execute({ commentPublicId: reply }, author.call));

    const result = await w.community.deleteComment.execute({ commentPublicId }, reader.call);

    expect(expectOk(result)).toEqual({ placeholder: false });
  });

  it("deletes the author's alias comment on an anonymous review", async () => {
    const { w, author, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(author.call, reviewPublicId);

    const result = await w.community.deleteComment.execute({ commentPublicId }, author.call);

    expect(expectOk(result)).toEqual({ placeholder: false });
  });

  it('gives not own, unknown and already deleted the same not_found and changes nothing', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const anonymousByAuthor = await w.posted(author.call, reviewPublicId);
    const alreadyDeleted = await w.posted(reader.call, reviewPublicId, 'Gone soon.');
    expectOk(
      await w.community.deleteComment.execute({ commentPublicId: alreadyDeleted }, reader.call),
    );
    const before = w.comments.snapshot();
    const auditBefore = w.fakes.audit.events.length;
    const owns = w.identityModule.ownership.ownsPersona.bind(w.identityModule.ownership);
    const asked: string[] = [];
    w.identityModule.ownership.ownsPersona = (tx, input) => {
      asked.push(input.personaId);
      return owns(tx, input);
    };

    const errors = [];
    for (const commentPublicId of [anonymousByAuthor, 'zzzzzzzzzz', alreadyDeleted]) {
      errors.push(
        expectErr(await w.community.deleteComment.execute({ commentPublicId }, reader.call)),
      );
    }

    expect(errors.map((e) => [e.code, e.messageKey])).toEqual([
      ['not_found', errors[0]!.messageKey],
      ['not_found', errors[0]!.messageKey],
      ['not_found', errors[0]!.messageKey],
    ]);
    expect(asked).toHaveLength(2);
    expect(w.comments.snapshot()).toEqual(before);
    expect(w.fakes.audit.events).toHaveLength(auditBefore);
  });

  it('refuses a signed-out caller', async () => {
    const { w, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);

    const error = expectErr(
      await w.community.deleteComment.execute({ commentPublicId }, w.callAs(anAnonymousActor())),
    );

    expect(error.code).toBe('forbidden');
    expect(w.rowOf(commentPublicId).state).toBe('published');
  });

  it('lets a restricted account delete its own comment', async () => {
    const { w, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);
    const restrictedCall = w.callAs({ ...reader.actor, status: 'restricted' });

    const result = await w.community.deleteComment.execute({ commentPublicId }, restrictedCall);

    expect(expectOk(result)).toEqual({ placeholder: false });
  });

  it('writes one audit row with the persona actor and no outbox event or limiter hit', async () => {
    const { w, author, reader, reviewPublicId } = await setup();
    const commentPublicId = await w.posted(reader.call, reviewPublicId);
    await w.posted(author.call, reviewPublicId, 'A reply.', commentPublicId);
    const auditBefore = w.fakes.audit.events.length;
    const outboxBefore = w.fakes.outbox.events.length;
    const limiterBefore = w.fakes.rateLimiter.calls.length;

    await w.community.deleteComment.execute({ commentPublicId }, reader.call);

    const row = w.rowOf(commentPublicId);
    expect(w.fakes.audit.events.slice(auditBefore)).toEqual([
      {
        stream: `comment:${row.id}`,
        action: 'comment.deleted',
        actor: `persona:${reader.pseudonymousPersonaId}`,
        targetKind: 'comment',
        targetId: row.id,
        details: { tombstone: true },
      },
    ]);
    expect(w.fakes.outbox.events).toHaveLength(outboxBefore);
    expect(w.fakes.rateLimiter.calls).toHaveLength(limiterBefore);
  });
});
