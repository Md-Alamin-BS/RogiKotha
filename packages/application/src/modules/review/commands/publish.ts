// `review.publish` (WF4, BR1.2, BR1.3, BR3.1–BR3.12, BR4.1–BR4.7, BR2.5). Authorization, then the
// actor's own live draft, claimed by its deletion, then every domain check (a refusal writes
// nothing and is not counted), then the publish limit, then in the one command transaction: ids
// and persona, a new doctor only for a named or pseudonymous review, the tag terms, the review
// with its tags and version 1, the audit row with the persona actor and the outbox event. Any
// error rolls everything back, the draft deletion, the persona, a provisional term and a new
// doctor included.
import {
  AddMemberDoctorInput,
  PublishReviewInput,
  doctorNameLetterCount,
  ok,
  type DraftPayload,
  type Result,
} from '@rogikotha/contracts';
import {
  dedupeTags,
  deriveTitle,
  detectLanguage,
  dhakaCalendarDate,
  exactDateValid,
  minimumFieldsMissing,
  orderedSections,
  tagRuleOutcome,
  type DoctorChoice,
} from '@rogikotha/domain';

import { defineCommand } from '../../../command';
import type { NewReviewTag, ReviewSectionsRecord, Tx } from '../../../ports';
import { reviewAudit } from '../audit';
import { accountIdOf, draftNotFound, findOwnDraft } from '../drafts';
import type { ReviewModulePorts } from '../ports';
import { sectionTexts } from '../projection';
import { INVALID, fieldError, hitPublishLimit, missingFields } from '../publish-support';

export interface PublishOutput {
  publicId: string;
}

/** U46's member-doctor fields as the composer names them (BR3.11). */
const NEW_DOCTOR_FIELDS: Record<string, string> = {
  name: 'newDoctorName',
  specialtyId: 'newDoctorSpecialty',
  practiceArea: 'newDoctorChamber',
  bmdcNumber: 'newDoctorBmdc',
};

const NEW_DOCTOR_MESSAGES: Record<string, string> = {
  newDoctorName: 'formErrors.compose.newDoctorName',
  newDoctorSpecialty: 'formErrors.compose.newDoctorSpecialty',
  newDoctorChamber: 'formErrors.compose.newDoctorChamber',
  newDoctorBmdc: 'formErrors.compose.newDoctorBmdc',
};

function memberDoctorRequest(newDoctor: NonNullable<DraftPayload['newDoctor']>) {
  return {
    name: newDoctor.name,
    ...(newDoctor.specialtyId !== undefined ? { specialtyId: newDoctor.specialtyId } : {}),
    ...(newDoctor.practiceArea ? { practiceArea: newDoctor.practiceArea } : {}),
    ...(newDoctor.bmdc ? { bmdcNumber: newDoctor.bmdc } : {}),
  };
}

/** Maps U46's field names, from its schema or its own refusal, to the composer's (BR3.11). */
function newDoctorFieldErrors(fields: readonly string[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const key = NEW_DOCTOR_FIELDS[field] ?? 'newDoctorName';
    errors[key] = NEW_DOCTOR_MESSAGES[key] ?? INVALID;
  }
  if (Object.keys(errors).length === 0) errors.newDoctorName = NEW_DOCTOR_MESSAGES.newDoctorName!;
  return errors;
}

function storedSections(payload: DraftPayload): ReviewSectionsRecord | null {
  if (payload.mode !== 'detailed') return null;
  return Object.fromEntries(orderedSections(payload.sections).map(({ key, body }) => [key, body]));
}

/** A typed tag's term language: Bengali script → bn, else en (ASSUMPTION(U47): mixed → bn). */
function termLanguage(text: string): 'en' | 'bn' {
  return detectLanguage([text], 'en') === 'en' ? 'en' : 'bn';
}

export function publishCommand(deps: ReviewModulePorts) {
  return defineCommand<PublishReviewInput, PublishOutput>({
    name: 'review.publish',
    input: PublishReviewInput,
    // BR1.2; `attestation: true` is enforced by the input schema (BR3.1).
    requires: { authenticated: true, verifiedEmail: true, notRestricted: true },
    async handle({ input, tx, actor, ports }): Promise<Result<PublishOutput>> {
      const accountId = accountIdOf(actor);
      const { correlationId } = actor;
      const draft = await findOwnDraft(deps, ports, tx, accountId, input.draftId, correlationId);
      if (!draft) return draftNotFound(actor);
      const payload = draft.payload;
      if (payload.target !== 'doctor') return fieldError('validation', actor, { target: INVALID });

      // Claim the draft first (BR2.5): a concurrent publish of the same draft waits on this row
      // and then finds it gone. A refusal below rolls the deletion back with everything else.
      const now = ports.clock.now();
      if (!(await deps.reviews.deleteOwnDraft(tx, accountId, draft.record.id, now))) {
        return draftNotFound(actor);
      }
      const today = dhakaCalendarDate(now);

      // Minimum fields, every missing item together in the domain's order (BR3.2–BR3.4, BR3.11).
      let listedDoctorId: string | null = null;
      let doctor: DoctorChoice = { kind: 'none' };
      if (payload.doctorPublicId !== undefined) {
        listedDoctorId = await deps.reviews.visibleDoctorIdByPublicId(tx, payload.doctorPublicId);
        doctor = { kind: 'listed', visible: listedDoctorId !== null };
      } else if (payload.newDoctor !== undefined) {
        doctor = { kind: 'new', nameLetterCount: doctorNameLetterCount(payload.newDoctor.name) };
      }
      const missing = minimumFieldsMissing({
        doctor,
        relationship: payload.relationship,
        period: payload.period,
        today,
        mode: payload.mode,
        story: payload.story,
        sections: payload.sections,
        tags: payload.tags,
        notSure: payload.notSure,
      });
      if (missing.length > 0) return missingFields(missing, actor);
      if (tagRuleOutcome(payload.tags, payload.notSure) === 'too_many') {
        return fieldError('validation', actor, { tags: INVALID });
      }
      const period = payload.period!;
      const relationship = payload.relationship!;
      if (!exactDateValid(payload.exactDate, period, today)) {
        return fieldError('validation', actor, { exactDate: INVALID });
      }

      // BR3.12: no profile submission may ever name the author of an anonymous review.
      if (input.identityMode === 'anonymous' && payload.newDoctor !== undefined) {
        return fieldError('review.anonymous_new_doctor', actor, {
          identity: 'errors.review.anonymousNewDoctor',
        });
      }
      const newDoctor =
        payload.newDoctor === undefined ? null : memberDoctorRequest(payload.newDoctor);
      if (newDoctor !== null) {
        const parsed = AddMemberDoctorInput.safeParse(newDoctor);
        if (!parsed.success) {
          const fields = parsed.error.issues.map((issue) => String(issue.path[0] ?? 'name'));
          return fieldError('validation', actor, newDoctorFieldErrors(fields));
        }
      }

      // Suggested chips must name active terms (BR4.3); a refusal is a validation, not counted.
      const tags = dedupeTags(payload.tags);
      const chipIds = tags.flatMap((t) => ('termPublicId' in t ? [t.termPublicId] : []));
      const chipTerms = await deps.reviews.activeTermIdsByPublicIds(tx, chipIds);
      if (chipIds.some((id) => !chipTerms.has(id))) {
        return fieldError('validation', actor, { tags: INVALID });
      }

      const limited = await hitPublishLimit(ports, accountId, actor);
      if (limited) return limited;

      const reviewId = ports.ids.newId();
      const publicId = ports.ids.newPublicId();
      const persona = await deps.identity.personaFor(tx, {
        accountId,
        reviewId,
        mode: input.identityMode,
      });
      if (!persona.ok) return persona;
      const personaId = persona.data.personaId;
      const personaActor = `persona:${personaId}` as const;

      let doctorId = listedDoctorId;
      if (newDoctor !== null) {
        const added = await deps.directory.addMemberDoctor(tx, newDoctor, {
          accountId,
          actor: personaActor,
          correlationId,
        });
        if (!added.ok) {
          const fields = Object.keys(added.error.fieldErrors ?? {});
          return added.error.code === 'validation'
            ? fieldError('validation', actor, newDoctorFieldErrors(fields))
            : added;
        }
        doctorId = added.data.doctorId;
      }
      if (doctorId === null) return missingFields(['doctor'], actor);

      const rows = await tagRows(deps, tx, tags, chipTerms, personaActor, correlationId);
      if (!rows.ok) return rows;
      const reviewTags: NewReviewTag[] = [...rows.data];
      if (payload.notSure) reviewTags.push({ group: 'condition', notSure: true });

      const sections = storedSections(payload);
      const body = payload.mode === 'quick' ? (payload.story ?? null) : null;
      const title =
        deriveTitle({
          title: payload.title,
          mode: payload.mode,
          story: payload.story,
          sections: payload.sections,
        }) ?? '';
      const language = detectLanguage([title, body, ...sectionTexts(sections)], actor.locale);
      const claims = payload.claims.map((label) => ({ label }));
      const sentiment = payload.sentiment ?? null;
      const outcome = payload.outcome ?? null;

      await deps.reviews.insertReview(tx, {
        id: reviewId,
        publicId,
        authorPersonaId: personaId,
        doctorId,
        kind: payload.mode,
        relationship,
        identityMode: input.identityMode,
        sentiment,
        outcome,
        periodYear: period.year,
        periodMonth: period.month,
        exactDateEnc:
          payload.exactDate === undefined ? null : ports.crypto.encrypt(payload.exactDate),
        title,
        body,
        sections,
        claims,
        language,
        now,
      });
      await deps.reviews.insertTags(tx, reviewId, reviewTags);
      await deps.reviews.insertVersion(tx, {
        reviewId,
        version: 1,
        // Never the exact date, an account id or a persona id (BR4.7).
        snapshot: {
          kind: payload.mode,
          title,
          ...(body !== null ? { body } : { sections }),
          sentiment,
          outcome,
          claims,
        },
        changeKind: 'publish',
        actorKind: 'author',
        actorId: personaId,
        now,
      });
      await ports.audit.write(
        tx,
        reviewAudit.reviewPublished(reviewId, personaId, {
          kind: payload.mode,
          identityMode: input.identityMode,
          tagCount: reviewTags.length,
          newDoctor: newDoctor !== null,
        }),
      );
      await ports.outbox.append(tx, 'review.published', { reviewId, doctorId, branchId: null });
      return ok({ publicId });
    },
  });
}

/** Chips map to their active term; typed text becomes a term through Taxonomy (BR4.3). */
async function tagRows(
  deps: ReviewModulePorts,
  tx: Tx,
  tags: DraftPayload['tags'],
  chipTerms: ReadonlyMap<string, { termId: string }>,
  actor: `persona:${string}`,
  correlationId: string,
): Promise<Result<NewReviewTag[]>> {
  const rows: NewReviewTag[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    let termId: string;
    if ('termPublicId' in tag) {
      termId = chipTerms.get(tag.termPublicId)!.termId;
    } else {
      const term = await deps.taxonomy.ensureProvisionalTerm(
        tx,
        { kind: tag.group, text: tag.text, lang: termLanguage(tag.text) },
        actor,
        correlationId,
      );
      if (!term.ok) return term;
      termId = term.data.termId;
    }
    // A typed tag can land on a chip's term; one row per (group, term) (ENT-002).
    const key = `${tag.group}:${termId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ group: tag.group, termId });
  }
  return ok(rows);
}
