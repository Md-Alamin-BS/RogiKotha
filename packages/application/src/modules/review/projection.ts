// The one public projection of a review (BR5.2–BR5.10). Pure: every lookup arrives in `deps`.
// The published page and the preview share `pageCore`, so a preview shows exactly the fields the
// public would see. Nothing here emits an internal id, an account or persona id, the exact date,
// an evidence item or any number standing for quality (BR5.9).
import {
  CRITERIA,
  REVIEWER_LABEL_CODES,
  type BylineVM,
  type Criterion,
  type CriterionValue,
  type DraftPayload,
  type ExperienceCardVM,
  type ExperienceClaimVM,
  type ExperiencePageVM,
  type ExperienceTagVM,
  type FacilityPreviewVM,
  type Outcome,
  type PageBylineVM,
  type PersonaPublicVM,
  type PreviewVM,
  type Relationship,
  type ReviewKind,
  type ReviewLanguage,
  type ReviewerLabelCode,
  type Sentiment,
} from '@rogikotha/contracts';
import { orderedSections } from '@rogikotha/domain';

import type { EligibleTagRecord, ReviewSectionsRecord } from '../../ports';
import { dhakaIsoDate } from './cards';

/** The content fields both the page and the preview project. */
export interface ReviewContent {
  kind: ReviewKind;
  title: string;
  body: string | null;
  sections: ReviewSectionsRecord | null;
  language: ReviewLanguage;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  claims: readonly { label: string }[];
  tags: readonly EligibleTagRecord[];
}

export interface PublishedReviewForPage extends ReviewContent {
  publicId: string;
  relationship: Relationship;
  periodYear: number;
  periodMonth: number;
  publishedAt: Date;
}

export interface PageDoctor {
  publicId: string;
  name: string;
  specialty: string | null;
  memberAddedNotConfirmed: boolean;
}

export interface RelatedLists {
  relatedByCondition: ExperienceCardVM[];
  sameDoctor: ExperienceCardVM[];
  otherByAuthor: ExperienceCardVM[];
}

export interface PageDeps {
  doctor: PageDoctor;
  byline: PageBylineVM;
  related: RelatedLists;
}

/** The section texts in timeline order, for language detection (BR3.7). */
export function sectionTexts(sections: ReviewSectionsRecord | null): (string | undefined)[] {
  if (sections === null) return [];
  return [sections.symptoms, sections.diagnosis, sections.treatment, sections.after];
}

const LABEL_CODES: ReadonlySet<string> = new Set(REVIEWER_LABEL_CODES);

/** A known code, or a seeded label shown as written; always under Reviewer's label (FD-111). */
export function claimOf(label: string): ExperienceClaimVM {
  return LABEL_CODES.has(label) ? { code: label as ReviewerLabelCode } : { text: label };
}

function tagOf(tag: EligibleTagRecord): ExperienceTagVM | null {
  if (tag.notSure) return { group: 'condition', notSure: true };
  const name = tag.termName ?? tag.freeText;
  if (name === null || name.trim() === '') return null;
  const vm: ExperienceTagVM = { group: tag.group, name, provisional: tag.provisional };
  if (tag.group === 'condition' && tag.termActive && tag.termPublicId !== null) {
    vm.conditionPublicId = tag.termPublicId;
  }
  return vm;
}

/**
 * The byline of the page from Identity's public projection (BR5.7). Either side saying anonymous
 * gives the anonymous form; an anonymous author carries only the thread alias, never a name.
 */
export function pageBylineOf(
  persona: PersonaPublicVM | null,
  identityMode: PageBylineVM['personaKind'],
): PageBylineVM {
  if (identityMode === 'anonymous' || persona === null || persona.kind === 'anonymous') {
    return {
      personaKind: 'anonymous',
      alias: persona?.kind === 'anonymous' ? persona.displayName : null,
    };
  }
  if (persona.kind === 'pseudonymous') {
    return { personaKind: 'pseudonymous', username: persona.username ?? persona.displayName };
  }
  return { personaKind: 'named', displayName: persona.displayName };
}

type PageCore = Pick<
  ExperiencePageVM,
  | 'kind'
  | 'reviewKind'
  | 'title'
  | 'story'
  | 'sections'
  | 'contentLanguage'
  | 'sentiment'
  | 'outcome'
  | 'claims'
  | 'tags'
  | 'byline'
>;

function pageCore(review: ReviewContent, byline: PageBylineVM): PageCore {
  const core: PageCore = {
    kind: 'experience',
    reviewKind: review.kind,
    title: review.title,
    sections: review.kind === 'detailed' ? orderedSections(review.sections) : [],
    contentLanguage: review.language,
    claims: review.claims.map((c) => claimOf(c.label)),
    tags: review.tags.flatMap((t) => {
      const vm = tagOf(t);
      return vm === null ? [] : [vm];
    }),
    byline,
  };
  if (review.kind === 'quick' && review.body !== null && review.body.trim() !== '') {
    core.story = review.body;
  }
  // Absent means Not provided (BR5.2): never a blank, a 0 or a default.
  if (review.sentiment !== null) core.sentiment = review.sentiment;
  if (review.outcome !== null) core.outcome = review.outcome;
  return core;
}

function doctorOf(doctor: PageDoctor): ExperiencePageVM['doctor'] {
  const vm: ExperiencePageVM['doctor'] = {
    publicId: doctor.publicId,
    name: doctor.name,
    memberAddedNotConfirmed: doctor.memberAddedNotConfirmed,
  };
  if (doctor.specialty !== null) vm.specialty = doctor.specialty;
  return vm;
}

/** The public page of one eligible review (BR5.1–BR5.9). */
export function toExperiencePage(review: PublishedReviewForPage, deps: PageDeps): ExperiencePageVM {
  const otherByAuthor = deps.byline.personaKind === 'anonymous' ? [] : deps.related.otherByAuthor;
  return {
    ...pageCore(review, deps.byline),
    publicId: review.publicId,
    relationship: review.relationship,
    // Month and year only; the exact date never leaves the server (BR5.5).
    period: { year: review.periodYear, month: review.periodMonth },
    publishedAt: dhakaIsoDate(review.publishedAt),
    doctor: doctorOf(deps.doctor),
    relatedByCondition: deps.related.relatedByCondition.filter(
      (c) => c.publicId !== review.publicId,
    ),
    sameDoctor: deps.related.sameDoctor.filter((c) => c.publicId !== review.publicId),
    otherByAuthor: otherByAuthor.filter((c) => c.publicId !== review.publicId),
  };
}

export interface DraftReviewForPreview extends ReviewContent {
  relationship?: Relationship;
  period?: { year: number; month: number };
}

export interface PreviewDeps {
  doctor: {
    publicId?: string;
    name: string;
    specialty: string | null;
    memberAddedNotConfirmed: boolean;
  } | null;
  byline: PageBylineVM;
}

/** The preview of a doctor draft (BR5.10): no public id, no posted date, no related lists. */
export function toPreviewPage(review: DraftReviewForPreview, deps: PreviewDeps): PreviewVM {
  const vm: PreviewVM = {
    ...pageCore(review, deps.byline),
    relatedByCondition: [],
    sameDoctor: [],
    otherByAuthor: [],
  };
  if (review.relationship !== undefined) vm.relationship = review.relationship;
  if (review.period !== undefined) vm.period = { ...review.period };
  if (deps.doctor !== null) {
    const doctor: NonNullable<PreviewVM['doctor']> = {
      name: deps.doctor.name,
      memberAddedNotConfirmed: deps.doctor.memberAddedNotConfirmed,
    };
    if (deps.doctor.publicId !== undefined) doctor.publicId = deps.doctor.publicId;
    if (deps.doctor.specialty !== null) doctor.specialty = deps.doctor.specialty;
    vm.doctor = doctor;
  }
  return vm;
}

/** The preview of a facility draft (BR3.10, BR5.10): answered criteria only, no score. */
export function toFacilityAccount(
  payload: DraftPayload,
  deps: { author: BylineVM },
): FacilityPreviewVM {
  const criteria = payload.criteria ?? {};
  const vm: FacilityPreviewVM = {
    kind: 'facility',
    author: deps.author,
    body: payload.story ?? '',
    criteria: CRITERIA.flatMap((key: Criterion) => {
      const value: CriterionValue | undefined = criteria[key];
      return value ? [{ key, value }] : [];
    }),
  };
  if (payload.period !== undefined) vm.period = { ...payload.period };
  if (criteria.overall) vm.overall = criteria.overall;
  return vm;
}
