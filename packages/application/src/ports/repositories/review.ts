// The read methods of the Review repository port that U46's read-side Review stub uses (U46
// functional-spec § 8, FD-067). Every method applies BR1.3 in SQL: the review is published, not
// deleted, has a publication time, and its doctor is published and not merged. Facility reviews
// apply BR1.4 and never meet a doctor's figures (BR2.6, BR2.7). No method reads evidence: document
// counts come only through `PublicEvidenceCount` (BR1.5). U47 adds its write methods beside these.
import type {
  Criterion,
  CriterionValue,
  FacilityType,
  IdentityMode,
  Outcome,
  Relationship,
  Sentiment,
  TagGroup,
} from '@rogikotha/contracts';

import type { Tx } from '../unit-of-work';

/** An active condition term a review is about by the one rule of BR1.7. */
export interface AboutTermRecord {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
}

export interface ReviewSectionsRecord {
  symptoms?: string;
  diagnosis?: string;
  treatment?: string;
  after?: string;
}

/** Public persona columns only (BR2.10). */
export interface BylineRecord {
  /** `anonymous` when either the persona or the review's identity mode is anonymous. */
  personaKind: IdentityMode;
  displayName: string;
  username: string | null;
}

export interface ReviewCardRecord {
  /** Internal; passed only to `PublicEvidenceCount`. */
  id: string;
  publicId: string;
  doctorId: string;
  doctorPublicId: string;
  doctorNameEn: string;
  doctorNameBn: string;
  branchId: string | null;
  title: string;
  body: string | null;
  sections: ReviewSectionsRecord | null;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  relationship: Relationship;
  periodYear: number;
  periodMonth: number;
  publishedAt: Date;
  author: BylineRecord;
  /** The first condition tag that makes the review about an active term (BR3.9). */
  cardTerm: AboutTermRecord | null;
  /** The first free-text condition tag, shown without a link when no tag resolves. */
  cardFreeText: string | null;
  /** Every active condition term the review is about (BR1.7), each once. */
  aboutTerms: AboutTermRecord[];
}

export interface MentionRecord {
  group: Exclude<TagGroup, 'condition'>;
  /** The effective term's names, or null for a free-text tag. */
  termNameEn: string | null;
  termNameBn: string | null;
  freeText: string | null;
}

export interface BranchRefRecord {
  id: string;
  publicId: string;
  nameEn: string;
  nameBn: string;
  ownNameEn: string | null;
  ownNameBn: string | null;
  facilityNameEn: string;
  facilityNameBn: string;
  type: FacilityType;
  avatarHue: number | null;
}

export interface TermReviewRecord extends ReviewCardRecord {
  doctorSpecialtyEn: string | null;
  doctorSpecialtyBn: string | null;
  doctorAreaEn: string | null;
  doctorAreaBn: string | null;
  doctorCityEn: string | null;
  doctorCityBn: string | null;
  doctorAvatarHue: number | null;
  /** The doctor's first chamber by sort order. */
  doctorPrimaryChamberEn: string | null;
  doctorPrimaryChamberBn: string | null;
  /** The review's branch when that branch is visible (BR1.2). */
  branch: BranchRefRecord | null;
  /** Medicine, treatment and symptom tags; `not sure` tags are not mentions (BR3.4). */
  mentions: MentionRecord[];
}

export interface FacilityReviewRecord {
  publicId: string;
  author: BylineRecord;
  periodYear: number;
  periodMonth: number;
  publishedAt: Date;
  body: string;
  criteria: Partial<Record<Criterion, CriterionValue | null>>;
}

export interface ReviewSummaryRecord {
  /** Internal; passed only to `PublicEvidenceCount`. */
  reviewId: string;
  doctorId: string;
  sentiment: Sentiment | null;
  aboutTerms: AboutTermRecord[];
}

export interface BranchFeedbackRecord {
  branchId: string;
  overall: CriterionValue | null;
}

export interface RecentCardsRequest {
  limit: number;
  /** Keyset: the last card of the previous page. */
  after?: { publishedAt: Date; publicId: string };
  doctorPublicId?: string;
  termPublicId?: string;
}

export interface ReviewReadRepository {
  /** The doctor's eligible reviews, newest first (BR2.8). */
  publishedForDoctor(tx: Tx, doctorId: string): Promise<ReviewCardRecord[]>;
  /** Eligible reviews about the term (BR1.7), newest first. */
  publishedForTerm(tx: Tx, termId: string): Promise<TermReviewRecord[]>;
  /** The branch's eligible facility reviews, newest first. */
  publishedForBranch(tx: Tx, branchId: string): Promise<FacilityReviewRecord[]>;
  /** One grouped read for an index page (BR3.10). */
  summariesForDoctors(tx: Tx, doctorIds: readonly string[]): Promise<ReviewSummaryRecord[]>;
  summariesForBranches(tx: Tx, branchIds: readonly string[]): Promise<BranchFeedbackRecord[]>;
  /** Eligible reviews about each term by BR1.7; every given id is a key, 0 included. */
  totalsForTerms(tx: Tx, termIds: readonly string[]): Promise<Map<string, number>>;
  /** Newest first, keyset on (`published_at`, `public_id`). */
  listRecentCards(tx: Tx, request: RecentCardsRequest): Promise<ReviewCardRecord[]>;
}
