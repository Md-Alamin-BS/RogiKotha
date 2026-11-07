import type { CorrectReviewInput } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import {
  anAnonymousActor,
  deepKeys,
  expectErr,
  expectOk,
  makeReviewModuleWorld,
  type Member,
  type ReviewModuleWorld,
} from '../review-test-support';

const FORGED_PUBLIC_ID = 'zzzzzzzzzz';
const STORY = 'The doctor listened, examined me carefully and wrote the plan down.';

function quickInput(publicId: string, overrides: Partial<CorrectReviewInput> = {}) {
  return {
    publicId,
    expectedVersion: 1,
    title: 'A careful visit and a clear plan',
    content: { kind: 'quick', story: STORY },
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    ...overrides,
  };
}

async function corrected(
  w: ReviewModuleWorld,
  m: Member,
  publicId: string,
  overrides: Partial<CorrectReviewInput>,
) {
  return expectOk(await w.review.correct.execute(quickInput(publicId, overrides), m.call));
}

function history(w: ReviewModuleWorld, call: Member['call'], reviewPublicId: string) {
  return w.review.getHistory.execute({ reviewPublicId }, call);
}

function signedOut(w: ReviewModuleWorld) {
  return w.callAs(anAnonymousActor());
}

describe('review.getHistory', () => {
  it('gives an unedited review no Edited date, no correction and the author one version', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');

    expect(expectOk(await history(w, signedOut(w), publicId))).toEqual({ corrections: [] });
    const own = expectOk(await history(w, m.call, publicId));
    expect(own.editedAt).toBeUndefined();
    expect(own.versions).toEqual([
      { version: 1, at: w.fakes.clock.now().toISOString(), kind: 'published', fields: [] },
    ]);
  });

  it('gives every reader, signed out included, the original before a material correction', async () => {
    const w = makeReviewModuleWorld();
    const a = await w.member();
    const b = await w.member({ displayName: 'Rafiq Kalponik', username: 'rafiq_demo' });
    const publicId = await w.published(a, 'named');
    w.fakes.clock.advance(3);
    const at = w.fakes.clock.now().toISOString();
    await corrected(w, a, publicId, { outcome: 'worse' });

    const expected = {
      editedAt: at,
      corrections: [
        {
          at,
          fields: ['outcome'],
          original: {
            kind: 'quick',
            title: 'A careful visit and a clear plan',
            story: STORY,
            sentiment: 'positive',
            outcome: 'helped',
          },
        },
      ],
    };
    expect(expectOk(await history(w, signedOut(w), publicId))).toEqual(expected);
    expect(expectOk(await history(w, b.call, publicId))).toEqual(expected);
    expect(expectOk(await history(w, a.call, publicId))).toMatchObject(expected);
  });

  it('gives an outcome that was empty before the correction as null, read as Not provided', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');
    await corrected(w, m, publicId, { outcome: undefined });
    await corrected(w, m, publicId, { expectedVersion: 2, outcome: 'worse' });

    const { corrections } = expectOk(await history(w, signedOut(w), publicId));

    expect(corrections.map((c) => c.fields)).toEqual([['outcome'], ['outcome']]);
    expect(corrections[0]!.original.outcome).toBe('helped');
    expect(corrections[1]!.original.outcome).toBeNull();
    expect(corrections[1]!.original.sentiment).toBe('positive');
    expect(corrections[1]!.original).not.toHaveProperty('claims');
  });

  it('gives no reader an original after a title-only edit, only the Edited date', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');
    await corrected(w, m, publicId, { title: 'A clear plan after one visit' });

    const result = expectOk(await history(w, signedOut(w), publicId));

    expect(result.editedAt).toBe(w.fakes.clock.now().toISOString());
    expect(result.corrections).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('A careful visit');
  });

  it('lists the versions newest first for the author only', async () => {
    const w = makeReviewModuleWorld();
    const a = await w.member();
    const b = await w.member({ displayName: 'Rafiq Kalponik', username: 'rafiq_demo' });
    const publicId = await w.published(a, 'named');
    await corrected(w, a, publicId, { title: 'A clear plan after one visit' });
    await corrected(w, a, publicId, {
      expectedVersion: 2,
      title: 'A clear plan after one visit',
      sentiment: 'mixed',
    });

    const own = expectOk(await history(w, a.call, publicId));
    expect(own.versions?.map((v) => [v.version, v.kind, v.fields])).toEqual([
      [3, 'corrected', ['sentiment']],
      [2, 'edited', []],
      [1, 'published', []],
    ]);
    expect(expectOk(await history(w, b.call, publicId))).not.toHaveProperty('versions');
    expect(expectOk(await history(w, signedOut(w), publicId))).not.toHaveProperty('versions');
  });

  it('gives a non-author the same shape for an anonymous and a named review', async () => {
    const w = makeReviewModuleWorld();
    const a = await w.member();
    const b = await w.member({ displayName: 'Rafiq Kalponik', username: 'rafiq_demo' });
    const named = await w.published(a, 'named');
    const anonymous = await w.published(a, 'anonymous');
    await corrected(w, a, named, { outcome: 'none' });
    await corrected(w, a, anonymous, { outcome: 'none' });

    expect(expectOk(await history(w, b.call, anonymous))).toEqual(
      expectOk(await history(w, b.call, named)),
    );
  });

  it('answers an unknown, a forged and a hidden review with the same not_found', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const hidden = await w.published(m, 'named');
    w.reviews.reviews.find((r) => r.publicId === hidden)!.state = 'hidden';

    const errors = [
      expectErr(await history(w, m.call, hidden)),
      expectErr(await history(w, m.call, FORGED_PUBLIC_ID)),
    ];

    expect(errors[0]).toMatchObject({ code: 'not_found' });
    expect(errors[1]).toEqual(errors[0]);
  });

  it('holds no actor, persona, account or reason in any result', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'anonymous');
    await corrected(w, m, publicId, { outcome: 'none' });
    const personaId = w.reviews.reviews.find((r) => r.publicId === publicId)!.authorPersonaId;

    for (const call of [m.call, signedOut(w)]) {
      const result = expectOk(await history(w, call, publicId));
      const keys = deepKeys(result);
      for (const key of ['actorId', 'actorKind', 'personaId', 'accountId', 'reason']) {
        expect(keys).not.toContain(key);
      }
      expect(JSON.stringify(result)).not.toContain(personaId);
      expect(JSON.stringify(result)).not.toContain(m.accountId);
    }
  });
});
