import type { CorrectReviewInput } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { CORRECTIONS_PER_DAY } from '../limits';
import {
  deepKeys,
  expectErr,
  expectOk,
  makeReviewModuleWorld,
  type Member,
  type ReviewModuleWorld,
} from '../review-test-support';
import { correctionRateLimitKey } from './correct';

const QUICK_STORY = 'The doctor listened, examined me carefully and wrote the plan down.';
const FORGED_PUBLIC_ID = 'zzzzzzzzzz';

type Raw = Record<string, unknown>;

function quickInput(publicId: string, overrides: Partial<CorrectReviewInput> = {}): Raw {
  return {
    publicId,
    expectedVersion: 1,
    title: 'A careful visit and a clear plan',
    content: { kind: 'quick', story: QUICK_STORY },
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    ...overrides,
  };
}

function detailedInput(publicId: string, overrides: Partial<CorrectReviewInput> = {}): Raw {
  return {
    publicId,
    expectedVersion: 1,
    title: 'A careful visit and a clear plan',
    content: {
      kind: 'detailed',
      sections: {
        symptoms: 'A dry cough for three weeks.',
        diagnosis: 'চিকিৎসক বললেন এটা অ্যালার্জি থেকে হতে পারে।',
        treatment: 'An inhaler and a follow-up after two weeks.',
        after: 'The cough eased within ten days.',
      },
    },
    sentiment: 'positive',
    outcome: 'helped',
    claims: [],
    ...overrides,
  };
}

/** Reads the stored row afresh: a rollback replaces the fake's rows with restored copies. */
function storedReview(w: ReviewModuleWorld, publicId: string) {
  return () => w.reviews.reviews.find((r) => r.publicId === publicId)!;
}

async function quickReview(w: ReviewModuleWorld, m: Member, mode: 'named' | 'anonymous' = 'named') {
  const publicId = await w.published(m, mode);
  return { publicId, review: storedReview(w, publicId) };
}

async function detailedReview(w: ReviewModuleWorld, m: Member) {
  const publicId = await w.published(m, 'pseudonymous', w.payload('detailed'));
  return { publicId, review: storedReview(w, publicId) };
}

function correct(w: ReviewModuleWorld, m: Member, raw: Raw) {
  return w.review.correct.execute(raw, m.call);
}

/** What a refused correction must leave untouched, against a count taken before it. */
function counts(w: ReviewModuleWorld) {
  return {
    versions: w.reviews.versions.length,
    audit: w.fakes.audit.events.length,
    outbox: w.fakes.outbox.events.length,
    jobs: w.fakes.jobQueue.enqueued.length,
  };
}

describe('review.correct happy path', () => {
  it('corrects a quick review: new content, version 2, one version row, audit and event', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    const before = counts(w);
    const story = 'The doctor listened, examined me and changed the plan a week later.';

    const out = expectOk(
      await correct(w, m, quickInput(publicId, { content: { kind: 'quick', story } })),
    );

    expect(out).toEqual({ publicId, version: 2, changed: true });
    expect(review()).toMatchObject({ body: story, version: 2, kind: 'quick', state: 'published' });
    expect(w.reviews.versions).toHaveLength(before.versions + 1);
    expect(w.reviews.versions.at(-1)).toMatchObject({
      reviewId: review().id,
      version: 2,
      changeKind: 'correction',
      actorKind: 'author',
      actorId: m.namedPersonaId,
      snapshot: { body: story, corrected: ['story'] },
    });
    const audit = w.fakes.audit.events.at(-1)!;
    expect(audit).toMatchObject({
      action: 'review.corrected',
      actor: `persona:${m.namedPersonaId}`,
      targetKind: 'review',
      targetId: review().id,
      details: { version: 2, corrected: ['story'] },
    });
    expect(JSON.stringify(audit)).not.toContain(m.accountId);
    expect(w.fakes.outbox.events.at(-1)).toEqual({
      name: 'review.changed',
      payload: { reviewId: review().id, doctorId: w.doctor.id, branchId: null },
    });
    expect(counts(w)).toEqual({
      versions: before.versions + 1,
      audit: before.audit + 1,
      outbox: before.outbox + 1,
      jobs: before.jobs,
    });
  });

  it('corrects the outcome and a section of a detailed review in the fixed field order', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await detailedReview(w, m);
    const raw = detailedInput(publicId, { outcome: 'uncertain' });
    (raw.content as { sections: Record<string, string> }).sections.after =
      'The cough came back after a month.';

    expectOk(await correct(w, m, raw));

    expect(review().outcome).toBe('uncertain');
    expect(review().sections?.after).toBe('The cough came back after a month.');
    expect(w.reviews.versions.at(-1)!.snapshot.corrected).toEqual(['after', 'outcome']);
    expect(w.reviews.versions.at(-1)!.actorId).toBe(m.pseudonymousPersonaId);
  });

  it('records a title-only edit as a version with an empty corrected list', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId } = await quickReview(w, m);

    expectOk(await correct(w, m, quickInput(publicId, { title: 'A clear plan after one visit' })));

    expect(w.reviews.versions.at(-1)!.snapshot.corrected).toEqual([]);
    expect(w.fakes.audit.events.at(-1)!.details).toEqual({ version: 2, corrected: [] });
  });

  it('writes the persona of an anonymous review as the actor, never the account', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m, 'anonymous');

    expectOk(await correct(w, m, quickInput(publicId, { outcome: 'none' })));

    const row = w.reviews.versions.at(-1)!;
    expect(row.actorId).toBe(review().authorPersonaId);
    expect(row.actorId).not.toBe(m.accountId);
    const keys = deepKeys(row.snapshot);
    for (const key of ['personaId', 'accountId', 'doctorId', 'identityMode', 'exactDate']) {
      expect(keys).not.toContain(key);
    }
  });
});

describe('review.correct refusals: who', () => {
  it('gives the same not_found for another account (named, anonymous) and an unknown id', async () => {
    const w = makeReviewModuleWorld();
    const a = await w.member();
    const b = await w.member({ displayName: 'Rafiq Kalponik', username: 'rafiq_demo' });
    const named = await quickReview(w, a, 'named');
    const anonymous = await quickReview(w, a, 'anonymous');
    const before = counts(w);

    const errors = [
      expectErr(await correct(w, b, quickInput(named.publicId, { outcome: 'none' }))),
      expectErr(await correct(w, b, quickInput(anonymous.publicId, { outcome: 'none' }))),
      expectErr(await correct(w, b, quickInput(FORGED_PUBLIC_ID, { outcome: 'none' }))),
    ];

    for (const error of errors) expect(error).toEqual(errors[0]);
    expect(errors[0]).toMatchObject({ code: 'not_found' });
    expect(errors[0]!.fieldErrors).toBeUndefined();
    expect(counts(w)).toEqual(before);
    expect(w.fakes.rateLimiter.failureCount(correctionRateLimitKey(b.accountId))).toBe(0);
  });

  it('gives not_found for the author of a hidden review', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    review().state = 'hidden';

    expect(expectErr(await correct(w, m, quickInput(publicId, { outcome: 'none' })))).toMatchObject(
      { code: 'not_found' },
    );
    expect(review().outcome).toBe('helped');
  });

  it('gives not_found and writes nothing when the review is hidden while the lock is taken', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    const before = counts(w);
    const lock = w.reviews.lockForCorrection.bind(w.reviews);
    // A hide that commits between the first published check and the row lock.
    w.reviews.lockForCorrection = (tx, reviewId) => {
      review().state = 'hidden';
      return lock(tx, reviewId);
    };

    const error = expectErr(await correct(w, m, quickInput(publicId, { outcome: 'none' })));

    expect(error).toMatchObject({ code: 'not_found' });
    // The refusal rolls back, so the fake's scripted hide is undone with it.
    expect(review().outcome).toBe('helped');
    expect(review().version ?? 1).toBe(1);
    expect(counts(w)).toEqual(before);
    expect(w.fakes.rateLimiter.failureCount(correctionRateLimitKey(m.accountId))).toBe(0);
  });

  it('refuses an unconfirmed account and a restricted account at the gate', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId } = await quickReview(w, m);
    const before = counts(w);

    const unconfirmed = await w.review.correct.execute(
      quickInput(publicId, { outcome: 'none' }),
      w.callAs({ ...m.actor, emailVerified: false }),
    );
    const restricted = await w.review.correct.execute(
      quickInput(publicId, { outcome: 'none' }),
      w.callAs({ ...m.actor, status: 'restricted' }),
    );

    // The shared gate answers an unconfirmed email with its own code (U47's publish gate).
    expect(expectErr(unconfirmed).code).toBe('auth.email_unverified');
    expect(expectErr(restricted).code).toBe('forbidden');
    expect(counts(w)).toEqual(before);
  });
});

describe('review.correct refusals: what', () => {
  it('refuses a kind change with a kind field error', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId } = await quickReview(w, m);

    const error = expectErr(await correct(w, m, detailedInput(publicId)));

    expect(error).toMatchObject({
      code: 'validation',
      fieldErrors: { kind: 'errors.common.validation' },
    });
  });

  it.each([
    ['identityMode', 'anonymous'],
    ['doctorId', '00000000-0000-7000-8000-000000000001'],
  ])('refuses an extra key %s at the schema', async (key, value) => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    const before = counts(w);

    const error = expectErr(await correct(w, m, { ...quickInput(publicId), [key]: value }));

    expect(error.code).toBe('validation');
    expect(review().identityMode).toBe('named');
    expect(counts(w)).toEqual(before);
  });

  it('refuses a short quick story with the story key', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId } = await quickReview(w, m);

    const error = expectErr(
      await correct(
        w,
        m,
        quickInput(publicId, { content: { kind: 'quick', story: 'Too short.' } }),
      ),
    );

    expect(error).toMatchObject({
      code: 'validation',
      fieldErrors: { story: 'errors.review.missingStory' },
    });
  });

  it('refuses a detailed review with every section empty', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await detailedReview(w, m);

    const error = expectErr(
      await correct(
        w,
        m,
        detailedInput(publicId, {
          content: { kind: 'detailed', sections: { symptoms: '   ', after: '' } },
        }),
      ),
    );

    expect(error).toMatchObject({
      code: 'validation',
      fieldErrors: { story: 'errors.review.missingStory' },
    });
    expect(review().sections?.symptoms).toBe('A dry cough for three weeks.');
  });

  it('refuses a new free-text label but keeps or removes a stored one', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    const stored = 'The first doctor missed the infection';
    review().claims = [{ label: stored }];

    const added = expectErr(
      await correct(w, m, quickInput(publicId, { claims: [stored, 'A brand new free claim'] })),
    );
    expect(added).toMatchObject({
      code: 'validation',
      fieldErrors: { claims: 'errors.common.validation' },
    });

    expectOk(await correct(w, m, quickInput(publicId, { claims: [stored, 'wrongRx'] })));
    expect(review().claims).toEqual([{ label: stored }, { label: 'wrongRx' }]);
    expectOk(
      await correct(w, m, quickInput(publicId, { expectedVersion: 2, claims: ['wrongRx'] })),
    );
    expect(review().claims).toEqual([{ label: 'wrongRx' }]);
  });

  it('answers conflict for a stale expectedVersion and writes nothing', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    expectOk(await correct(w, m, quickInput(publicId, { outcome: 'none' })));
    const before = counts(w);

    const error = expectErr(await correct(w, m, quickInput(publicId, { outcome: 'worse' })));

    expect(error.code).toBe('conflict');
    expect(review().outcome).toBe('none');
    expect(counts(w)).toEqual(before);
  });

  it('writes nothing and reserves no slot for a save that changes nothing', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId } = await quickReview(w, m);
    const before = counts(w);

    const out = expectOk(await correct(w, m, quickInput(publicId)));

    expect(out).toEqual({ publicId, version: 1, changed: false });
    expect(counts(w)).toEqual(before);
    expect(w.fakes.rateLimiter.calls.filter((c) => c.method === 'reserveFailure')).toEqual([]);
  });
});

describe('review.correct rate limit', () => {
  /** A distinct valid story per attempt, so every save is a material change. */
  function nthStory(n: number): string {
    return `The doctor listened carefully on visit number ${n} and wrote the plan down.`;
  }

  async function correctTimes(w: ReviewModuleWorld, m: Member, publicId: string, times: number) {
    for (let i = 0; i < times; i += 1) {
      const version = w.reviews.reviews.find((r) => r.publicId === publicId)!.version ?? 1;
      expectOk(
        await correct(
          w,
          m,
          quickInput(publicId, {
            expectedVersion: version,
            content: { kind: 'quick', story: nthStory(i) },
          }),
        ),
      );
    }
  }

  it('refuses the 31st correction in 24 hours and writes nothing for it', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    await correctTimes(w, m, publicId, CORRECTIONS_PER_DAY);
    const before = counts(w);

    const error = expectErr(
      await correct(
        w,
        m,
        quickInput(publicId, {
          expectedVersion: review().version!,
          content: { kind: 'quick', story: nthStory(99) },
        }),
      ),
    );

    expect(error.code).toBe('rate_limited');
    expect(review().body).toBe(nthStory(CORRECTIONS_PER_DAY - 1));
    expect(counts(w)).toEqual(before);
    expect(w.fakes.rateLimiter.failureCount(correctionRateLimitKey(m.accountId))).toBe(
      CORRECTIONS_PER_DAY,
    );
  });

  it('releases the slot when the transaction fails after the update, so 30 still fit', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const { publicId, review } = await quickReview(w, m);
    const before = counts(w);
    w.fakes.unitOfWork.failCommits(1);

    const failed = expectErr(await correct(w, m, quickInput(publicId, { outcome: 'none' })));

    expect(failed.code).toBe('internal');
    expect(review()).toMatchObject({ outcome: 'helped' });
    expect(review().version ?? 1).toBe(1);
    expect(counts(w)).toEqual(before);
    expect(w.fakes.rateLimiter.failureCount(correctionRateLimitKey(m.accountId))).toBe(0);
    await correctTimes(w, m, publicId, CORRECTIONS_PER_DAY);
    expect(review().version).toBe(CORRECTIONS_PER_DAY + 1);
  });
});
