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

function getOwnForEdit(w: ReviewModuleWorld, m: Member, publicId: string) {
  return w.review.getOwnForEdit.execute({ publicId }, m.call);
}

describe('review.getOwnForEdit', () => {
  it('gives the author the current content of a quick review', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');

    const vm = expectOk(await getOwnForEdit(w, m, publicId));

    expect(vm).toEqual({
      publicId,
      kind: 'quick',
      version: 1,
      title: 'A careful visit and a clear plan',
      story: 'The doctor listened, examined me carefully and wrote the plan down.',
      sentiment: 'positive',
      outcome: 'helped',
      claims: [],
      doctorName: w.doctor.nameEn,
    });
  });

  it('gives a detailed review its filled sections only and leaves missing values out', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(
      m,
      'pseudonymous',
      w.payload('detailed', { sentiment: undefined, outcome: undefined }),
    );
    const review = w.reviews.reviews.find((r) => r.publicId === publicId)!;
    review.sections = { symptoms: 'A dry cough for three weeks.', after: '' };
    review.claims = [{ label: 'The first doctor missed the infection' }];

    const vm = expectOk(await getOwnForEdit(w, m, publicId));

    expect(vm.kind).toBe('detailed');
    expect(vm.sections).toEqual({ symptoms: 'A dry cough for three weeks.' });
    expect(vm).not.toHaveProperty('story');
    expect(vm).not.toHaveProperty('sentiment');
    expect(vm).not.toHaveProperty('outcome');
    expect(vm.claims).toEqual(['The first doctor missed the infection']);
  });

  it('gives the doctor name in Bengali for a Bengali reader', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');

    const vm = expectOk(
      await w.review.getOwnForEdit.execute({ publicId }, w.callAs({ ...m.actor, locale: 'bn' })),
    );

    expect(vm.doctorName).toBe(w.doctor.nameBn);
  });

  it('answers every non-author, signed out included, with the same not_found', async () => {
    const w = makeReviewModuleWorld();
    const a = await w.member();
    const b = await w.member({ displayName: 'Rafiq Kalponik', username: 'rafiq_demo' });
    const named = await w.published(a, 'named');
    const anonymous = await w.published(a, 'anonymous');

    const errors = [
      expectErr(await getOwnForEdit(w, b, named)),
      expectErr(await getOwnForEdit(w, b, anonymous)),
      expectErr(await getOwnForEdit(w, b, FORGED_PUBLIC_ID)),
      expectErr(
        await w.review.getOwnForEdit.execute(
          { publicId: anonymous },
          w.callAs(anAnonymousActor({ correlationId: b.actor.correlationId })),
        ),
      ),
    ];

    expect(errors[0]).toEqual({
      code: 'not_found',
      messageKey: 'errors.common.notFound',
      correlationId: b.actor.correlationId,
    });
    for (const error of errors) expect(error).toEqual(errors[0]);
  });

  it('answers the author of a hidden review with not_found', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'named');
    w.reviews.reviews.find((r) => r.publicId === publicId)!.state = 'hidden';

    expect(expectErr(await getOwnForEdit(w, m, publicId)).code).toBe('not_found');
  });

  it('holds no persona, account, actor or reason', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const publicId = await w.published(m, 'anonymous');

    const personaId = w.reviews.reviews.find((r) => r.publicId === publicId)!.authorPersonaId;

    const vm = expectOk(await getOwnForEdit(w, m, publicId));

    const keys = deepKeys(vm);
    for (const key of ['personaId', 'authorPersonaId', 'accountId', 'actorId', 'reason']) {
      expect(keys).not.toContain(key);
    }
    expect(JSON.stringify(vm)).not.toContain(m.accountId);
    expect(JSON.stringify(vm)).not.toContain(personaId);
  });
});
