// `review.correct` (U22 WF2, BR1.1–BR1.4, BR2, BR3.1–BR3.6). In one transaction: resolve, then
// published, then author (every failure the same `not_found`), lock, version check, validate,
// classify; a no-op writes nothing. Otherwise a rate-limit slot is reserved, then the content, the
// version row (persona actor), the audit row and the `review.changed` event are written. The slot
// is released on any refusal or rollback and kept only after commit, so the handler runs the
// transaction itself (`libraryFirst`): a transactional handler cannot see a failed commit.
import { CorrectReviewInput, err, ok, type Actor, type Result } from '@rogikotha/contracts';
import {
  classifyChange,
  normaliseContent,
  toVersionSnapshot,
  validateClaims,
  validateCorrectionContent,
  type CorrectionProblem,
  type ReviewContent,
} from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import type { CorrectionLockRow, FailureReservation, RateLimitKey, Tx } from '../../../ports';
import { reviewAudit } from '../audit';
import { accountIdOf } from '../drafts';
import { CORRECTIONS_PER_DAY, CORRECTIONS_WINDOW_SEC } from '../limits';
import type { ReviewModulePorts } from '../ports';
import { INVALID, MISSING_FIELD_KEYS, fieldError } from '../publish-support';
import { isReviewAuthor } from '../queries/is-review-author';
import { isReviewPublished } from '../queries/is-review-published';
import { reviewIdForPublicId } from '../queries/review-id-for-public-id';

export interface CorrectOutput {
  publicId: string;
  version: number;
  changed: boolean;
}

export function correctionRateLimitKey(accountId: string): RateLimitKey {
  return `review-correct:account:${accountId}`;
}

function notFound(actor: Actor): Result<never> {
  return err('not_found', { correlationId: actor.correlationId });
}

/** BR2.1/BR2.2 length failures keep U47's story key; every other problem is the generic one. */
function problemErrors(problems: readonly CorrectionProblem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { field, reason } of problems) {
    errors[field] ??= reason === 'story_length' ? MISSING_FIELD_KEYS.story : INVALID;
  }
  return errors;
}

function currentContent(row: CorrectionLockRow): ReviewContent {
  return {
    kind: row.kind,
    title: row.title,
    body: row.body,
    sections: row.sections,
    sentiment: row.sentiment,
    outcome: row.outcome,
    claims: row.claims.map((claim) => claim.label),
    language: row.language,
  };
}

function retryAfterSec(oldest: Date | undefined, now: Date): number | undefined {
  if (!oldest) return undefined;
  const freesAt = oldest.getTime() + CORRECTIONS_WINDOW_SEC * 1000;
  return Math.max(1, Math.ceil((freesAt - now.getTime()) / 1000));
}

export function correctCommand(deps: ReviewModulePorts) {
  const { reviews, ownership } = deps;
  return defineCommand<CorrectReviewInput, CorrectOutput>({
    name: 'review.correct',
    input: CorrectReviewInput,
    // BR1.2: the publish gate, in U47's order.
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    libraryFirst: true,
    async handle({ input, actor, ports }): Promise<Result<CorrectOutput>> {
      const accountId = accountIdOf(actor);
      let reservation: FailureReservation | null = null;

      const work = async (tx: Tx): Promise<Result<CorrectOutput>> => {
        // BR1.1: one order, one answer for "not yours", "hidden" and "unknown".
        const reviewId = await reviewIdForPublicId(reviews, tx, { publicId: input.publicId });
        if (reviewId === null) return notFound(actor);
        if (!(await isReviewPublished(reviews, tx, { reviewId }))) return notFound(actor);
        if (!(await isReviewAuthor(reviews, ownership, tx, { reviewId, actor }))) {
          return notFound(actor);
        }
        const locked = await reviews.lockForCorrection(tx, reviewId);
        if (locked === null) return notFound(actor);
        if (locked.version !== input.expectedVersion) {
          return err('conflict', { correlationId: actor.correlationId });
        }

        const current = currentContent(locked);
        const fallback = locked.language === 'mixed' ? actor.locale : locked.language;
        const next = normaliseContent(input, fallback);
        const problems = [
          ...validateCorrectionContent(next, locked.kind),
          ...validateClaims(next.claims, current.claims),
        ];
        if (problems.length > 0) return fieldError('validation', actor, problemErrors(problems));

        const { changed, corrected } = classifyChange(current, next);
        // BR3.2: nothing written and no slot reserved.
        if (changed.length === 0) {
          return ok({ publicId: input.publicId, version: locked.version, changed: false });
        }

        const now = ports.clock.now();
        reservation = await ports.rateLimiter.reserveFailure(
          correctionRateLimitKey(accountId),
          CORRECTIONS_WINDOW_SEC,
        );
        if (reservation.earlier.length >= CORRECTIONS_PER_DAY) {
          const retry = retryAfterSec(reservation.earlier[0], now);
          return err('rate_limited', {
            correlationId: actor.correlationId,
            ...(retry !== undefined ? { retryAfterSec: retry } : {}),
          });
        }

        const version = locked.version + 1;
        const updated = await reviews.updateContent(
          tx,
          reviewId,
          {
            title: next.title,
            body: next.body,
            sections: next.sections,
            // The schema already narrowed these to the contract enums.
            sentiment: input.sentiment ?? null,
            outcome: input.outcome ?? null,
            claims: next.claims.map((label) => ({ label })),
            language: next.language,
            now,
          },
          version,
        );
        if (!updated) return err('conflict', { correlationId: actor.correlationId });
        await reviews.insertVersion(tx, {
          reviewId,
          version,
          snapshot: { ...toVersionSnapshot(next, corrected) },
          changeKind: 'correction',
          actorKind: 'author',
          // FD-113: the persona, never the account.
          actorId: locked.authorPersonaId,
          now,
        });
        await ports.audit.write(
          tx,
          reviewAudit.reviewCorrected(reviewId, locked.authorPersonaId, { version, corrected }),
        );
        await ports.outbox.append(tx, 'review.changed', {
          reviewId,
          doctorId: locked.doctorId,
          branchId: locked.branchId,
        });
        return ok({ publicId: input.publicId, version, changed: true });
      };

      try {
        const result = await ports.unitOfWork.run(work);
        if (!result.ok) await releaseSlot(reservation);
        return result.ok ? result : { ok: false, error: result.error };
      } catch (error) {
        await releaseSlot(reservation);
        throw error;
      }
    },
  });
}

async function releaseSlot(reservation: FailureReservation | null): Promise<void> {
  if (reservation) await reservation.release();
}
