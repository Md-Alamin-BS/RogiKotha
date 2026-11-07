import { CRITERIA, DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { publishRateLimitKey } from './publish-support';
import { expectErr, expectOk, makeReviewModuleWorld } from './review-test-support';

describe('facilityReview.publish', () => {
  it('publishes a named facility account with every criterion key, an audit row and no event', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('facility'));

    const out = expectOk(
      await w.review.facilityReviewPublish.execute(
        { draftId, identityMode: 'named', attestation: true },
        m.call,
      ),
    );

    expect(out.branchPublicId).toBe(w.branch.publicId);
    expect(w.reviews.facilityReviews).toHaveLength(1);
    const row = w.reviews.facilityReviews[0]!;
    expect(row).toMatchObject({
      publicId: out.publicId,
      authorPersonaId: m.namedPersonaId,
      branchId: w.branch.id,
      identityMode: 'named',
      periodYear: 2026,
      periodMonth: 3,
    });
    expect(Object.keys(row.criteria).sort()).toEqual([...CRITERIA].sort());
    expect(row.criteria).toMatchObject({ staff: 'good', waiting: 'mixed', overall: 'good' });
    expect(Object.values(row.criteria).filter((v) => v === null)).toHaveLength(CRITERIA.length - 3);
    expect(w.fakes.audit.events).toEqual([
      expect.objectContaining({
        action: 'facility_review.published',
        actor: `persona:${m.namedPersonaId}`,
        details: { identityMode: 'named', criteriaAnswered: 3 },
      }),
    ]);
    expect(w.fakes.outbox.events).toHaveLength(0);
    expect(w.reviews.reviews).toHaveLength(0);
    expect(w.reviews.drafts).toHaveLength(0);
  });

  it('answers forbidden while facility feedback is off and writes nothing', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('facility'));
    w.fakes.config.set({
      ...DEFAULT_CONFIG_VALUES,
      featureVisibility: { ...DEFAULT_CONFIG_VALUES.featureVisibility, facilityAccounts: false },
    });

    const error = expectErr(
      await w.review.facilityReviewPublish.execute(
        { draftId, identityMode: 'named', attestation: true },
        m.call,
      ),
    );

    expect(error.code).toBe('forbidden');
    expect(w.reviews.facilityReviews).toHaveLength(0);
    expect(w.fakes.audit.events).toHaveLength(0);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('refuses an anonymous facility account before the limit and creates no persona', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m, w.payload('facility', { identityMode: 'anonymous' }));

    const error = expectErr(
      await w.review.facilityReviewPublish.execute(
        { draftId, identityMode: 'anonymous', attestation: true },
        m.call,
      ),
    );

    expect(error.code).toBe('validation');
    expect(error.fieldErrors).toEqual({ identity: 'errors.common.validation' });
    expect(w.reviews.facilityReviews).toHaveLength(0);
    expect(w.identity.store.personas).toHaveLength(2);
    const publishKey = publishRateLimitKey(m.accountId);
    expect(w.fakes.rateLimiter.calls.filter((c) => c.key === publishKey)).toHaveLength(0);
    expect(w.reviews.drafts).toHaveLength(1);
  });

  it('refuses a facility account without a visible branch with review.min_fields', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const hidden = w.reviews.addBranch({ visible: false });
    const draftId = await w.draftOf(m, w.payload('facility', { branchPublicId: hidden.publicId }));

    const error = expectErr(
      await w.review.facilityReviewPublish.execute(
        { draftId, identityMode: 'pseudonymous', attestation: true },
        m.call,
      ),
    );

    expect(error.code).toBe('review.min_fields');
    expect(error.fieldErrors).toEqual({ branch: 'errors.review.missingBranch' });
    expect(w.reviews.facilityReviews).toHaveLength(0);
  });

  it('refuses a doctor draft sent to the facility command', async () => {
    const w = makeReviewModuleWorld();
    const m = await w.member();
    const draftId = await w.draftOf(m);

    const error = expectErr(
      await w.review.facilityReviewPublish.execute(
        { draftId, identityMode: 'named', attestation: true },
        m.call,
      ),
    );

    expect(error.code).toBe('validation');
    expect(w.reviews.facilityReviews).toHaveLength(0);
    expect(w.reviews.reviews).toHaveLength(0);
  });
});
