// `review.preview` (WF3, BR5.10): the page the public would see, built from the actor's own draft
// by the same projection core, without enforcing the minimum and without writing: no persona and
// no term is created, the doctor is read only, typed tags show as written with `provisional`.
// Named and pseudonymous bylines use the names the action passes in; anonymous is `{alias: null}`.
import {
  PreviewDraftInput,
  ok,
  type BylineVM,
  type DraftPayload,
  type FacilityPreviewVM,
  type IdentityMode,
  type Locale,
  type PageBylineVM,
  type PreviewVM,
  type Result,
} from '@rogikotha/contracts';
import { dedupeTags, deriveTitle, detectLanguage, orderedSections } from '@rogikotha/domain';

import { defineQuery } from '../../../command';
import type { EligibleTagRecord, ReviewSectionsRecord, Tx } from '../../../ports';
import { bylineOf } from '../cards';
import { accountIdOf, draftNotFound, findOwnDraft } from '../drafts';
import type { ReviewModulePorts } from '../ports';
import { sectionTexts, toFacilityAccount, toPreviewPage, type PreviewDeps } from '../projection';

type Names = NonNullable<PreviewDraftInput['names']>;

function previewByline(mode: IdentityMode, names: Names | undefined): PageBylineVM {
  if (mode === 'anonymous') return { personaKind: 'anonymous', alias: null };
  if (mode === 'pseudonymous') {
    const username = names?.pseudonymous;
    return username ? { personaKind: 'pseudonymous', username } : { personaKind: 'pseudonymous' };
  }
  const displayName = names?.named;
  return displayName ? { personaKind: 'named', displayName } : { personaKind: 'named' };
}

function facilityAuthor(mode: IdentityMode, names: Names | undefined): BylineVM {
  const name =
    mode === 'named' ? names?.named : mode === 'pseudonymous' ? names?.pseudonymous : null;
  if (mode === 'anonymous' || !name) return { personaKind: mode };
  return bylineOf({ personaKind: mode, displayName: name, username: name });
}

async function previewTags(
  deps: ReviewModulePorts,
  tx: Tx,
  payload: DraftPayload,
  locale: Locale,
): Promise<EligibleTagRecord[]> {
  const tags = dedupeTags(payload.tags);
  const chips = await deps.reviews.activeTermRefsByPublicIds(
    tx,
    tags.flatMap((t) => ('termPublicId' in t ? [t.termPublicId] : [])),
    locale,
  );
  const records: EligibleTagRecord[] = tags.flatMap((tag): EligibleTagRecord[] => {
    if ('termPublicId' in tag) {
      const ref = chips.get(tag.termPublicId);
      if (!ref) return [];
      return [
        {
          group: tag.group,
          notSure: false,
          termPublicId: ref.publicId,
          termName: ref.name,
          provisional: ref.provisional,
          termActive: true,
          freeText: null,
        },
      ];
    }
    return [
      {
        group: tag.group,
        notSure: false,
        termPublicId: null,
        termName: null,
        provisional: true,
        termActive: false,
        freeText: tag.text,
      },
    ];
  });
  if (payload.notSure) records.push({ group: 'condition', notSure: true });
  return records;
}

async function previewDoctor(
  deps: ReviewModulePorts,
  tx: Tx,
  payload: DraftPayload,
  locale: Locale,
): Promise<PreviewDeps['doctor']> {
  if (payload.doctorPublicId !== undefined) {
    return deps.reviews.visibleDoctorRefByPublicId(tx, payload.doctorPublicId, locale);
  }
  if (payload.newDoctor !== undefined && payload.newDoctor.name !== '') {
    // A doctor not yet listed is shown as it will be published: Added by a member, not confirmed.
    return { name: payload.newDoctor.name, specialty: null, memberAddedNotConfirmed: true };
  }
  return null;
}

export function previewQuery(deps: ReviewModulePorts) {
  return defineQuery<PreviewDraftInput, PreviewVM | FacilityPreviewVM>({
    name: 'review.preview',
    input: PreviewDraftInput,
    requires: { authenticated: true, verifiedEmail: true },
    async handle({ input, tx, actor, ports }): Promise<Result<PreviewVM | FacilityPreviewVM>> {
      const draft = await findOwnDraft(
        deps,
        ports,
        tx,
        accountIdOf(actor),
        input.draftId,
        actor.correlationId,
      );
      if (!draft) return draftNotFound(actor);
      const payload = draft.payload;
      if (payload.target === 'facility') {
        return ok(
          toFacilityAccount(payload, { author: facilityAuthor(payload.identityMode, input.names) }),
        );
      }

      const sections: ReviewSectionsRecord | null =
        payload.mode === 'detailed'
          ? Object.fromEntries(orderedSections(payload.sections).map((s) => [s.key, s.body]))
          : null;
      const body = payload.mode === 'quick' ? (payload.story ?? null) : null;
      // ASSUMPTION(U47): a draft with no text yet previews with an empty title.
      const title =
        deriveTitle({
          title: payload.title,
          mode: payload.mode,
          story: payload.story,
          sections: payload.sections,
        }) ?? '';
      const page = toPreviewPage(
        {
          kind: payload.mode,
          title,
          body,
          sections,
          language: detectLanguage([title, body, ...sectionTexts(sections)], actor.locale),
          sentiment: payload.sentiment ?? null,
          outcome: payload.outcome ?? null,
          claims: payload.claims.map((label) => ({ label })),
          tags: await previewTags(deps, tx, payload, actor.locale),
          ...(payload.relationship !== undefined ? { relationship: payload.relationship } : {}),
          ...(payload.period !== undefined ? { period: payload.period } : {}),
        },
        {
          doctor: await previewDoctor(deps, tx, payload, actor.locale),
          byline: previewByline(payload.identityMode, input.names),
        },
      );
      return ok(page);
    },
  });
}
