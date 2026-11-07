// What `review.publish` and `facilityReview.publish` share: the publish limit (BR1.3), which is
// hit only after every validation rule has passed, and the field-error shapes of BR3.
import { err, type Actor, type ErrorCode, type Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../command';
import type { RateLimitKey } from '../../ports';
import { REVIEW_PUBLISH_LIMIT, REVIEW_PUBLISH_WINDOW_SEC } from './limits';

export function publishRateLimitKey(accountId: string): RateLimitKey {
  return `review.publish:account:${accountId}`;
}

/** Counts this attempt; null when allowed, else the `rate_limited` answer (BR1.3). */
export async function hitPublishLimit(
  ports: CommandPorts,
  accountId: string,
  actor: Actor,
): Promise<Result<never> | null> {
  const decision = await ports.rateLimiter.hit(
    publishRateLimitKey(accountId),
    REVIEW_PUBLISH_LIMIT,
    REVIEW_PUBLISH_WINDOW_SEC,
  );
  if (decision.allowed) return null;
  return err('rate_limited', {
    correlationId: actor.correlationId,
    ...(decision.retryAfter !== undefined ? { retryAfterSec: decision.retryAfter } : {}),
  });
}

export function fieldError(
  code: ErrorCode,
  actor: Actor,
  fieldErrors: Record<string, string>,
): Result<never> {
  return err(code, { correlationId: actor.correlationId, fieldErrors });
}

export const INVALID = 'errors.common.validation';

/** The missing-item message keys of BR3.2 and BR3.10, in the domain's field order. */
export const MISSING_FIELD_KEYS = {
  doctor: 'errors.review.missingDoctor',
  relationship: 'errors.review.missingRelationship',
  period: 'errors.review.periodInvalid',
  story: 'errors.review.missingStory',
  tags: 'errors.review.missingTag',
  branch: 'errors.review.missingBranch',
} as const;

export function missingFields(
  missing: readonly (keyof typeof MISSING_FIELD_KEYS)[],
  actor: Actor,
): Result<never> {
  return fieldError(
    'review.min_fields',
    actor,
    Object.fromEntries(missing.map((field) => [field, MISSING_FIELD_KEYS[field]])),
  );
}
