import type { DraftPayloadInput, IdentityMode } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { REVIEW_PUBLISH_LIMIT, REVIEW_PUBLISH_WINDOW_SEC } from './limits';
import { publishRateLimitKey } from './publish-support';
import {
  expectErr,
  expectOk,
  makeReviewModuleWorld,
  type Member,
  type ReviewModuleWorld,
} from './review-test-support';

function without<K extends keyof DraftPayloadInput>(
  payload: DraftPayloadInput,
  ...keys: K[]
): DraftPayloadInput {
  const copy: Record<string, unknown> = { ...payload };
  for (const key of keys) delete copy[key];
  return copy;
}

/** A quick payload naming a doctor not yet listed instead of a listed one. */
function newDoctorPayload(w: ReviewModuleWorld, extra: Partial<DraftPayloadInput> = {}) {
  return {
    ...without(w.payload(), 'doctorPublicId'),
    newDoctor: { name: 'Dr. Kalponik Hossain', practiceArea: 'Mirpur', bmdc: 'A-12345' },
    ...extra,
  } satisfies DraftPayloadInput;
}

async function publishAs(
  w: ReviewModuleWorld,
  m: Member,
  draftId: string,
  identityMode: IdentityMode = 'pseudonymous',
  call = m.call,
) {
  return w.review.publish.execute({ draftId, identityMode, attestation: true }, call);
}

/** Nothing of a publish was written: no review, tag, version, audit row, event or new persona. */
function expectNothingWritten(w: ReviewModuleWorld, personasBefore: number) {
  expect(w.reviews.reviews).toHaveLength(0);
  expect(w.reviews.tags).toHaveLength(0);
  expect(w.reviews.versions).toHaveLength(0);
  expect(w.fakes.audit.events).toHaveLength(0);
  expect(w.fakes.outbox.events).toHaveLength(0);
  expect(w.identity.store.personas).toHaveLength(personasBefore);
}

describe('review.publish happy path', () => {
  it.each([
    ['named', (m: Member) => m.namedPersonaId],
    ['pseudonymous', (m: Member) => m.pseudonymousPersonaId],
  ] as const)('publishes in %s mode under the default persona', async (mode, personaOf) => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);

    const { publicId } = expectOk(await publishAs(w, m, draftId, mode));

    const review = w.reviews.reviews[0]!;
    expect(review).toMatchObject({
      publicId,
      authorPersonaId: personaOf(m),
      doctorId: w.doctor.id,
      identityMode: mode,
      kind: 'quick',
      relationship: 'self',
      periodYear: 2026,
      periodMonth: 3,
      language: 'en',
      state: 'published',
    });
    expect(w.reviews.tags).toEqual([
      expect.objectContaining({ reviewId: review.id, group: 'condition', termId: w.condition.id }),
    ]);
    expect(w.reviews.versions).toEqual([
      expect.objectContaining({
        reviewId: review.id,
        version: 1,
        changeKind: 'publish',
        actorKind: 'author',
        actorId: personaOf(m),
      }),
    ]);
    expect(w.reviews.drafts).toHaveLength(0);
    expect(w.directory.calls).toHaveLength(0);
  });

  it('publishes in anonymous mode under a new thread persona linked to the review', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);

    expectOk(await publishAs(w, m, draftId, 'anonymous'));

    const review = w.reviews.reviews[0]!;
    expect([m.namedPersonaId, m.pseudonymousPersonaId]).not.toContain(review.authorPersonaId);
    const persona = w.identity.store.personas.find((p) => p.id === review.authorPersonaId)!;
    expect(persona.kind).toBe('anonymous');
    expect(persona.username).toBeNull();
    expect(w.identity.store.links).toContainEqual({
      personaId: review.authorPersonaId,
      accountId: m.accountId,
      reviewId: review.id,
    });
    expect(review.identityMode).toBe('anonymous');
  });

  it('publishes a detailed review with its sections in order and a derived title', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, without(w.payload('detailed'), 'title'));

    expectOk(await publishAs(w, m, draftId));

    const review = w.reviews.reviews[0]!;
    expect(review.kind).toBe('detailed');
    expect(review.body).toBeNull();
    expect(Object.keys(review.sections ?? {})).toEqual([
      'symptoms',
      'diagnosis',
      'treatment',
      'after',
    ]);
    expect(review.title).not.toBe('');
    expect(review.language).toBe('mixed');
    expect(w.taxonomy.calls).toEqual([
      expect.objectContaining({
        request: { kind: 'condition', text: 'Seasonal cough', lang: 'en' },
      }),
    ]);
  });

  it('writes one audit row with the persona actor and the review.published outbox event', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);

    expectOk(await publishAs(w, m, draftId, 'named'));

    const review = w.reviews.reviews[0]!;
    expect(w.fakes.audit.events).toHaveLength(1);
    expect(w.fakes.audit.events[0]).toMatchObject({
      action: 'review.published',
      actor: `persona:${m.namedPersonaId}`,
      targetKind: 'review',
      targetId: review.id,
      details: { kind: 'quick', identityMode: 'named', tagCount: 1, newDoctor: false },
    });
    expect(JSON.stringify(w.fakes.audit.events)).not.toContain(m.accountId);
    expect(w.fakes.outbox.events).toEqual([
      {
        name: 'review.published',
        payload: { reviewId: review.id, doctorId: w.doctor.id, branchId: null },
      },
    ]);
  });

  it('keeps the exact date only encrypted and never in the version snapshot', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('quick', { exactDate: '2026-03-14' }));

    expectOk(await publishAs(w, m, draftId));

    const review = w.reviews.reviews[0]!;
    expect(review.exactDateEnc).not.toBeNull();
    expect(w.fakes.crypto.decryptText(review.exactDateEnc!)).toEqual({
      ok: true,
      data: '2026-03-14',
    });
    const snapshot = JSON.stringify(w.reviews.versions[0]!.snapshot);
    expect(snapshot).not.toContain('2026-03-14');
    expect(snapshot).not.toContain(m.pseudonymousPersonaId);
    expect(snapshot).not.toContain(m.accountId);
  });

  it('adds a new doctor for a named review on the publish transaction, under the persona actor', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, newDoctorPayload(w));

    expectOk(await publishAs(w, m, draftId, 'named'));

    expect(w.directory.calls).toEqual([
      {
        raw: { name: 'Dr. Kalponik Hossain', practiceArea: 'Mirpur', bmdcNumber: 'A-12345' },
        caller: {
          accountId: m.accountId,
          actor: `persona:${m.namedPersonaId}`,
          correlationId: m.actor.correlationId,
        },
      },
    ]);
    const added = w.reviews.doctors.find((d) => d.nameEn === 'Dr. Kalponik Hossain')!;
    expect(w.reviews.reviews[0]!.doctorId).toBe(added.id);
    expect(w.fakes.audit.events[0]!.details).toMatchObject({ newDoctor: true });
  });
});

describe('review.publish refusals', () => {
  it('refuses an account whose email is not confirmed', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    const call = w.callAs({ ...m.actor, emailVerified: false });

    const error = expectErr(await publishAs(w, m, draftId, 'pseudonymous', call));

    expect(error.code).toBe('auth.email_unverified');
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('refuses a restricted account', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    const call = w.callAs({ ...m.actor, status: 'restricted' });

    const error = expectErr(await publishAs(w, m, draftId, 'pseudonymous', call));

    expect(error.code).toBe('forbidden');
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('refuses a signed-out reader', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    const call = w.callAs({
      kind: 'anonymous',
      capabilities: [],
      locale: 'en',
      correlationId: 'c',
    });

    expect(expectErr(await publishAs(w, m, draftId, 'pseudonymous', call)).code).toBe('forbidden');
    expectNothingWritten(w, 2);
  });

  it('refuses when the publish limit is used up, after validation, and keeps the draft', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);
    const key = publishRateLimitKey(m.accountId);
    for (let i = 0; i < REVIEW_PUBLISH_LIMIT; i += 1) {
      await w.fakes.rateLimiter.hit(key, REVIEW_PUBLISH_LIMIT, REVIEW_PUBLISH_WINDOW_SEC);
    }

    const error = expectErr(await publishAs(w, m, draftId));

    expect(error.code).toBe('rate_limited');
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it.each([[{ attestation: false }], [{}]])(
    'refuses a publish without the attestation as a validation (%o)',
    async (attestation) => {
      const w = makeReviewModuleWorld();
      const m = await w.member();
      const draftId = await w.draftOf(m);

      const error = expectErr(
        await w.review.publish.execute(
          { draftId, identityMode: 'pseudonymous', ...attestation },
          m.call,
        ),
      );

      expect(error.code).toBe('validation');
      expectNothingWritten(w, 2);
      expect(w.reviews.drafts).toHaveLength(1);
    },
  );

  it("answers not_found for another account's draft", async () => {
    const w = makeReviewModuleWorld();
    const owner = await w.member();
    const other = await w.member();
    const draftId = await w.draftOf(owner);

    expect(expectErr(await publishAs(w, other, draftId)).code).toBe('not_found');
    expectNothingWritten(w, 4);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  const minimumCases: [string, (w: ReviewModuleWorld) => DraftPayloadInput, string][] = [
    ['no doctor', (w) => without(w.payload(), 'doctorPublicId'), 'doctor'],
    ['an unknown doctor', (w) => w.payload('quick', { doctorPublicId: 'zzzzzzzzzz' }), 'doctor'],
    [
      'a new doctor with too short a name',
      (w) => ({ ...without(w.payload(), 'doctorPublicId'), newDoctor: { name: 'Dr' } }),
      'doctor',
    ],
    ['no relationship', (w) => without(w.payload(), 'relationship'), 'relationship'],
    ['no period', (w) => without(w.payload(), 'period'), 'period'],
    ['a future period', (w) => w.payload('quick', { period: { year: 2027, month: 1 } }), 'period'],
    ['no story', (w) => without(w.payload(), 'story'), 'story'],
    ['too short a story', (w) => w.payload('quick', { story: 'Fine visit.' }), 'story'],
    [
      'a detailed review with no sections',
      (w) => without(w.payload('detailed'), 'sections'),
      'story',
    ],
    ['no tag and no Not sure', (w) => w.payload('quick', { tags: [] }), 'tags'],
  ];

  it.each(minimumCases)('refuses %s with review.min_fields', async (_label, build, field) => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, build(w));

    const error = expectErr(await publishAs(w, m, draftId));

    expect(error.code).toBe('review.min_fields');
    expect(Object.keys(error.fieldErrors ?? {})).toEqual([field]);
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('lists every missing item together in the fixed order', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, {
      ...without(w.payload(), 'doctorPublicId', 'relationship', 'period', 'story'),
      tags: [],
    });

    const error = expectErr(await publishAs(w, m, draftId));

    expect(error.fieldErrors).toEqual({
      doctor: 'errors.review.missingDoctor',
      relationship: 'errors.review.missingRelationship',
      period: 'errors.review.periodInvalid',
      story: 'errors.review.missingStory',
      tags: 'errors.review.missingTag',
    });
  });

  it('accepts Not sure in place of a condition tag', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('quick', { tags: [], notSure: true }));

    expectOk(await publishAs(w, m, draftId));

    expect(w.reviews.tags).toEqual([
      expect.objectContaining({ group: 'condition', notSure: true }),
    ]);
  });

  it.each([
    ['in the future', '2026-11-02', 11],
    ['before the period', '2026-02-27', 3],
    ['after the period month', '2026-04-02', 3],
    ['not a calendar date', '2026-02-30', 2],
  ])('refuses an exact date %s', async (_label, exactDate, month) => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(
      m,
      w.payload('quick', { exactDate, period: { year: 2026, month } }),
    );

    const error = expectErr(await publishAs(w, m, draftId));

    expect(error.code).toBe('validation');
    expect(error.fieldErrors).toEqual({ exactDate: 'errors.common.validation' });
    expectNothingWritten(w, 2);
  });

  it('refuses a stored draft carrying an unknown Reviewer label as a draft that does not exist', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = w.fakes.ids.newId();
    const now = w.fakes.clock.now();
    w.reviews.drafts.push({
      id: draftId,
      accountId: m.accountId,
      kind: 'quick',
      payloadEnc: w.ports.crypto.encrypt(
        JSON.stringify({ ...w.payload(), claims: ['platformVerdict'] }),
      ),
      doctorId: w.doctor.id,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 86_400_000),
    });

    expect(expectErr(await publishAs(w, m, draftId)).code).toBe('not_found');
    expectNothingWritten(w, 2);
  });

  it('refuses a suggested chip that names no active term', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const retired = w.reviews.addTerm({ state: 'hidden' });
    const draftId = await w.draftOf(
      m,
      w.payload('quick', { tags: [{ group: 'condition', termPublicId: retired.publicId }] }),
    );

    const error = expectErr(await publishAs(w, m, draftId));

    expect(error.code).toBe('validation');
    expect(error.fieldErrors).toEqual({ tags: 'errors.common.validation' });
    expectNothingWritten(w, 2);
  });

  it('does not count refused publishes: five min_fields refusals, then a valid publish succeeds', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const incomplete = await w.draftOf(m, without(w.payload(), 'story'));
    for (let i = 0; i < REVIEW_PUBLISH_LIMIT; i += 1) {
      expect(expectErr(await publishAs(w, m, incomplete)).code).toBe('review.min_fields');
    }
    const complete = await w.draftOf(m);

    expectOk(await publishAs(w, m, complete));

    const key = publishRateLimitKey(m.accountId);
    expect(w.fakes.rateLimiter.calls.filter((c) => c.key === key)).toHaveLength(1);
  });
});

describe('review.publish with a new doctor', () => {
  it('refuses an anonymous review naming a new doctor and never calls addMemberDoctor', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, newDoctorPayload(w));
    const doctorsBefore = w.reviews.doctors.length;

    const error = expectErr(await publishAs(w, m, draftId, 'anonymous'));

    expect(error.code).toBe('review.anonymous_new_doctor');
    expect(error.fieldErrors).toEqual({ identity: 'errors.review.anonymousNewDoctor' });
    expect(w.directory.calls).toHaveLength(0);
    expect(w.reviews.doctors).toHaveLength(doctorsBefore);
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('rolls back the persona, the doctor and the review when addMemberDoctor fails', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, newDoctorPayload(w));
    const doctorsBefore = w.reviews.doctors.length;
    w.directory.failWith = { code: 'conflict' };

    const error = expectErr(await publishAs(w, m, draftId, 'pseudonymous'));

    expect(error.code).toBe('conflict');
    expect(w.directory.calls).toHaveLength(1);
    expect(w.reviews.doctors).toHaveLength(doctorsBefore);
    expectNothingWritten(w, 2);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it("maps addMemberDoctor's field refusal onto the composer's new-doctor fields", async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, newDoctorPayload(w));
    w.directory.failWith = {
      code: 'validation',
      fieldErrors: { bmdcNumber: 'errors.common.validation' },
    };

    const error = expectErr(await publishAs(w, m, draftId, 'named'));

    expect(error.code).toBe('validation');
    expect(error.fieldErrors).toEqual({ newDoctorBmdc: 'formErrors.compose.newDoctorBmdc' });
    expectNothingWritten(w, 2);
  });

  it('rolls back the anonymous persona and the provisional terms when ensureProvisionalTerm fails', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(
      m,
      w.payload('quick', {
        tags: [
          { group: 'condition', text: 'Synthetic rash' },
          { group: 'condition', text: 'কাল্পনিক জ্বর' },
        ],
      }),
    );
    const termsBefore = w.reviews.terms.length;
    w.taxonomy.failFromCall = 2;

    const error = expectErr(await publishAs(w, m, draftId, 'anonymous'));

    expect(error.code).toBe('conflict');
    expect(w.taxonomy.calls.map((c) => c.request.lang)).toEqual(['en', 'bn']);
    expect(w.taxonomy.calls[0]!.actor).toMatch(/^persona:/);
    expect(w.reviews.terms).toHaveLength(termsBefore);
    expectNothingWritten(w, 2);
    expect(w.identity.store.links.every((l) => l.reviewId === null)).toBe(true);
    expect(w.reviews.drafts).toHaveLength(1);
  });
});
