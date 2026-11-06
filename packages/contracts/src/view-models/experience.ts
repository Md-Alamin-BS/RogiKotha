// The public experience page (`renderAccount`, app.js), also returned by `review.preview`
// (U47 ENT-007, ENT-008, ENT-011). One pure projection builds it (BR5.1–BR5.10). It never carries
// an internal id, an account or persona id, an email, the exact date, an evidence item, a
// reaction or comment count, or any number standing for quality (BR5.9).
import type {
  Criterion,
  CriterionValue,
  IdentityMode,
  Outcome,
  Relationship,
  ReviewKind,
  Sentiment,
  TagGroup,
} from '../enums';
import type { ReviewLanguage, ReviewSectionKey, ReviewerLabelCode } from '../schemas/review';
import type { BylineVM, ExperienceCardVM } from './experience-card';

// The card moved to its own file with U46 (functional-spec § 7); U47 extends it there.
export type { ExperienceCardVM } from './experience-card';

export interface ExperienceSectionVM {
  key: ReviewSectionKey;
  /** As written (BR5.4). */
  body: string;
}

/** Always rendered under "Reviewer's label": a known code, or a seeded label shown as written. */
export type ExperienceClaimVM = { code: ReviewerLabelCode } | { text: string };

export type ExperienceTagVM =
  | { group: TagGroup; name: string; provisional: boolean; conditionPublicId?: string }
  | { group: 'condition'; notSure: true };

/** The byline of the page itself; cards keep U46's `BylineVM`, which has no alias (BR5.7). */
export interface PageBylineVM {
  personaKind: IdentityMode;
  /** Named only. */
  displayName?: string;
  /** Pseudonymous only; the `/authors` link. */
  username?: string;
  /** Anonymous only, on the page only; null for a legacy row or a preview. Never a link. */
  alias?: string | null;
}

export interface ExperiencePageVM {
  kind: 'experience';
  /** Absent in a preview. */
  publicId?: string;
  reviewKind: ReviewKind;
  title: string;
  /** Quick reviews only. */
  story?: string;
  /** Detailed reviews: symptoms, diagnosis, treatment, after; empty ones absent. */
  sections: ExperienceSectionVM[];
  contentLanguage: ReviewLanguage;
  relationship: Relationship;
  /** Absent renders Not provided (BR5.2). */
  sentiment?: Sentiment;
  /** Absent renders Not provided (BR5.2). */
  outcome?: Outcome;
  /** Month and year only; never a day (BR5.5). */
  period: { year: number; month: number };
  /** ISO date; absent in a preview. */
  publishedAt?: string;
  claims: ExperienceClaimVM[];
  tags: ExperienceTagVM[];
  /** The page always adds Registration not verified (BR5.6). */
  doctor: { publicId: string; name: string; specialty?: string; memberAddedNotConfirmed: boolean };
  byline: PageBylineVM;
  /** At most 6, never the page's own review. */
  relatedByCondition: ExperienceCardVM[];
  /** At most 6. */
  sameDoctor: ExperienceCardVM[];
  /** At most 10; empty for an anonymous review and in a preview. */
  otherByAuthor: ExperienceCardVM[];
}

/**
 * `review.preview` of a doctor draft: the page's own fields, built by the same projection core.
 * ASSUMPTION(U47): the minimum is not enforced in a preview (BR5.10), so the period, the
 * relationship and the doctor may still be missing; a doctor not yet listed has no public id.
 */
export type PreviewVM = Omit<
  ExperiencePageVM,
  'publicId' | 'publishedAt' | 'period' | 'relationship' | 'doctor'
> & {
  period?: { year: number; month: number };
  relationship?: Relationship;
  doctor?: {
    publicId?: string;
    name: string;
    specialty?: string;
    memberAddedNotConfirmed: boolean;
  };
};

/** `review.preview` of a facility draft (`toFacilityAccount`); no score anywhere (BR3.10). */
export interface FacilityPreviewVM {
  kind: 'facility';
  author: BylineVM;
  period?: { year: number; month: number };
  body: string;
  overall?: CriterionValue;
  /** Answered criteria only, in enum order. */
  criteria: { key: Criterion; value: CriterionValue }[];
}

/**
 * One row of the author's own list on `/me`. Structurally equal to `DemoOwnReviewRow`, so
 * `ProfileWorkspace` is unchanged; that is why `publishedAt` is a `Date`.
 */
export interface OwnReviewVM {
  publicId: string;
  title: string;
  doctorName: string;
  state: 'published' | 'hidden' | 'removed' | 'other';
  publishedAt: Date | null;
  edited: boolean;
}
