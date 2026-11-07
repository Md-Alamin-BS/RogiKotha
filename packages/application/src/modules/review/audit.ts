// The Review module's audit builder (01-conventions §5, BR4.5): the actor is the author persona,
// never the account, and details hold enum values, counts and booleans only.
import type { CorrectionField, IdentityMode, ReviewKind } from '@rogikotha/contracts';

import { assertAuditDetails } from '../../audit/allowlist';
import type { AuditEntry } from '../../ports';

export const REVIEW_AUDIT_DETAIL_KEYS = {
  reviewPublished: ['kind', 'identityMode', 'tagCount', 'newDoctor'],
  facilityReviewPublished: ['identityMode', 'criteriaAnswered'],
  reviewCorrected: ['version', 'corrected'],
} as const;

export const reviewAudit = {
  reviewPublished(
    reviewId: string,
    personaId: string,
    details: { kind: ReviewKind; identityMode: IdentityMode; tagCount: number; newDoctor: boolean },
  ): AuditEntry {
    assertAuditDetails(details, REVIEW_AUDIT_DETAIL_KEYS.reviewPublished);
    return {
      stream: `review:${reviewId}`,
      action: 'review.published',
      actor: `persona:${personaId}`,
      targetKind: 'review',
      targetId: reviewId,
      details,
    };
  },
  facilityReviewPublished(
    facilityReviewId: string,
    personaId: string,
    details: { identityMode: Exclude<IdentityMode, 'anonymous'>; criteriaAnswered: number },
  ): AuditEntry {
    assertAuditDetails(details, REVIEW_AUDIT_DETAIL_KEYS.facilityReviewPublished);
    return {
      stream: `facility_review:${facilityReviewId}`,
      action: 'facility_review.published',
      actor: `persona:${personaId}`,
      targetKind: 'facility_review',
      targetId: facilityReviewId,
      details,
    };
  },
  /** U22 BR3.3: `corrected` is `[]` for a title-only edit. */
  reviewCorrected(
    reviewId: string,
    personaId: string,
    details: { version: number; corrected: CorrectionField[] },
  ): AuditEntry {
    assertAuditDetails(details, REVIEW_AUDIT_DETAIL_KEYS.reviewCorrected);
    return {
      stream: `review:${reviewId}`,
      action: 'review.corrected',
      actor: `persona:${personaId}`,
      targetKind: 'review',
      targetId: reviewId,
      details,
    };
  },
};
