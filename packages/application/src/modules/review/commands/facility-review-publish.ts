// `facilityReview.publish` (WF5, BR3.10, BR4.8): `forbidden` while facility feedback is off; the
// draft is claimed by its deletion, then the branch, period, story and criteria are checked and an
// anonymous mode is refused (FD-112) before the shared publish limit is hit (BR1.3). Then, in the
// one transaction: the persona, the `facility_reviews` row with every criterion key and the audit
// row with the persona actor; a refusal rolls the deletion back. No outbox event, and never a
// doctor's review or figures (hard rule).
// ASSUMPTION(U47): the input is `PublishReviewInput`, as functional-spec § 2 says ("same input");
// the criteria come from the draft, so the T-003 `FacilityReviewPublishInput` stays unused.
import {
  CRITERIA,
  CRITERION_VALUES,
  PublishReviewInput,
  err,
  ok,
  type Result,
} from '@rogikotha/contracts';
import {
  completeCriteria,
  criteriaValid,
  dhakaCalendarDate,
  facilityMinimumFieldsMissing,
} from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import { reviewAudit } from '../audit';
import { accountIdOf, draftNotFound, findOwnDraft } from '../drafts';
import type { ReviewModulePorts } from '../ports';
import { INVALID, fieldError, hitPublishLimit, missingFields } from '../publish-support';

export interface FacilityPublishOutput {
  publicId: string;
  branchPublicId: string;
}

export function facilityReviewPublishCommand(deps: ReviewModulePorts) {
  return defineCommand<PublishReviewInput, FacilityPublishOutput>({
    name: 'facilityReview.publish',
    input: PublishReviewInput,
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    async handle({ input, tx, actor, ports }): Promise<Result<FacilityPublishOutput>> {
      const config = await ports.config.current();
      if (!config.featureVisibility.facilityAccounts) {
        return err('forbidden', { correlationId: actor.correlationId });
      }
      const accountId = accountIdOf(actor);
      const draft = await findOwnDraft(
        deps,
        ports,
        tx,
        accountId,
        input.draftId,
        actor.correlationId,
      );
      if (!draft) return draftNotFound(actor);
      const payload = draft.payload;
      if (payload.target !== 'facility') {
        return fieldError('validation', actor, { target: INVALID });
      }

      // Claim the draft first (BR2.5): a concurrent publish of the same draft waits on this row
      // and then finds it gone. A refusal below rolls the deletion back with everything else.
      const now = ports.clock.now();
      if (!(await deps.reviews.deleteOwnDraft(tx, accountId, draft.record.id, now))) {
        return draftNotFound(actor);
      }
      const branchId =
        payload.branchPublicId === undefined
          ? null
          : await deps.reviews.visibleBranchIdByPublicId(tx, payload.branchPublicId);
      const missing = facilityMinimumFieldsMissing({
        branchVisible: branchId !== null,
        period: payload.period,
        today: dhakaCalendarDate(now),
        story: payload.story,
      });
      if (missing.length > 0) return missingFields(missing, actor);
      if (!criteriaValid(payload.criteria, CRITERIA, CRITERION_VALUES)) {
        return fieldError('validation', actor, { criteria: INVALID });
      }
      const identityMode = input.identityMode;
      if (identityMode === 'anonymous') {
        return fieldError('validation', actor, { identity: INVALID });
      }

      const limited = await hitPublishLimit(ports, accountId, actor);
      if (limited) return limited;

      const persona = await deps.identity.personaFor(tx, { accountId, mode: identityMode });
      if (!persona.ok) return persona;
      const personaId = persona.data.personaId;
      const id = ports.ids.newId();
      const publicId = ports.ids.newPublicId();
      const criteria = completeCriteria(payload.criteria, CRITERIA);
      const period = payload.period!;
      await deps.reviews.insertFacilityReview(tx, {
        id,
        publicId,
        authorPersonaId: personaId,
        branchId: branchId!,
        identityMode,
        periodYear: period.year,
        periodMonth: period.month,
        body: payload.story!,
        criteria,
        now,
      });
      await ports.audit.write(
        tx,
        reviewAudit.facilityReviewPublished(id, personaId, {
          identityMode,
          criteriaAnswered: Object.values(criteria).filter((v) => v !== null).length,
        }),
      );
      return ok({ publicId, branchPublicId: payload.branchPublicId! });
    },
  });
}
