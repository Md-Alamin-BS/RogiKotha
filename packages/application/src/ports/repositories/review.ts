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
  Locale,
  Outcome,
  PublicationState,
  Relationship,
  ReviewKind,
  ReviewLanguage,
  Sentiment,
  TagGroup,
  TermKind,
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
  /** U47: only reviews by these personas; an empty list matches nothing (BR7.2). */
  personaIds?: readonly string[];
  /** U47: leaves out the page's own review (BR5.8). */
  excludePublicId?: string;
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

// The write side and the module reads U47 adds (U47 functional-spec § 5). Draft methods filter by
// the owning account and `expires_at > now`, and carry `payload_enc` as bytes only: the module
// encrypts and decrypts through the `Crypto` port (BR2.2). No method reads `persona_links` or
// `evidence_items`, and no public read returns `exact_date_enc` (FR42).

export interface DraftRecord {
  id: string;
  kind: ReviewKind;
  payloadEnc: Uint8Array;
  doctorId: string | null;
  updatedAt: Date;
  expiresAt: Date;
}

export interface NewDraftRecord {
  id: string;
  accountId: string;
  kind: ReviewKind;
  payloadEnc: Uint8Array;
  doctorId: string | null;
  now: Date;
  expiresAt: Date;
}

export interface DraftChange {
  kind: ReviewKind;
  payloadEnc: Uint8Array;
  doctorId: string | null;
  now: Date;
  expiresAt: Date;
}

export interface ActiveTermRef {
  /** The effective term: the published canonical target when mapped, else the term itself. */
  termId: string;
  kind: TermKind;
}

export interface NewReviewRecord {
  id: string;
  publicId: string;
  authorPersonaId: string;
  doctorId: string;
  kind: ReviewKind;
  relationship: Relationship;
  identityMode: IdentityMode;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  periodYear: number;
  periodMonth: number;
  /** Already encrypted by the module (BR4.4). */
  exactDateEnc: Uint8Array | null;
  title: string;
  body: string | null;
  sections: ReviewSectionsRecord | null;
  claims: { label: string }[];
  language: ReviewLanguage;
  /** `published_at` and `attestation_at` (BR4.1). */
  now: Date;
}

export type NewReviewTag =
  { group: TagGroup; termId: string } | { group: 'condition'; notSure: true };

export interface NewReviewVersion {
  reviewId: string;
  version: number;
  /** `{kind, title, body | sections, sentiment, outcome, claims}` only (BR4.7). */
  snapshot: Record<string, unknown>;
  changeKind: 'publish';
  actorKind: 'author';
  /** The author persona id, never an account id (FD-112). */
  actorId: string;
  now: Date;
}

export interface NewFacilityReviewRecord {
  id: string;
  publicId: string;
  authorPersonaId: string;
  branchId: string;
  identityMode: Exclude<IdentityMode, 'anonymous'>;
  periodYear: number;
  periodMonth: number;
  body: string;
  /** Every criterion key present (BR4.8). */
  criteria: Record<Criterion, CriterionValue | null>;
  now: Date;
}

export type EligibleTagRecord =
  | {
      group: TagGroup;
      notSure: false;
      /** The effective term in the requested locale, or null for a free-text tag. */
      termPublicId: string | null;
      termName: string | null;
      provisional: boolean;
      /** False when the tag's term is no longer published. */
      termActive: boolean;
      freeText: string | null;
    }
  | { group: 'condition'; notSure: true };

export interface EligibleReviewRecord {
  /** Internal; never reaches a page. */
  id: string;
  publicId: string;
  /** Internal; passed only to Identity's public projection. */
  authorPersonaId: string;
  kind: ReviewKind;
  relationship: Relationship;
  identityMode: IdentityMode;
  sentiment: Sentiment | null;
  outcome: Outcome | null;
  periodYear: number;
  periodMonth: number;
  title: string;
  body: string | null;
  sections: ReviewSectionsRecord | null;
  /** As stored: release-1 codes or seeded labels written as is (FD-110). */
  claims: { label: string }[];
  language: ReviewLanguage;
  publishedAt: Date;
  /** In tag order. */
  tags: EligibleTagRecord[];
  doctor: {
    id: string;
    publicId: string;
    /** In the requested locale. */
    name: string;
    specialty: string | null;
    memberAddedNotConfirmed: boolean;
  };
}

export interface OwnReviewRecord {
  publicId: string;
  title: string;
  /** In the requested locale. */
  doctorName: string;
  state: PublicationState;
  publishedAt: Date | null;
  /** A correction version exists (BR7.3). */
  edited: boolean;
}

export interface ReviewModuleRepository {
  insertDraft(tx: Tx, draft: NewDraftRecord): Promise<void>;
  /** False when no live draft of the account has the id (BR2.1). */
  updateOwnDraft(tx: Tx, accountId: string, draftId: string, change: DraftChange): Promise<boolean>;
  countOwnLiveDrafts(tx: Tx, accountId: string, now: Date): Promise<number>;
  findOwnLiveDraft(
    tx: Tx,
    accountId: string,
    draftId: string,
    now: Date,
  ): Promise<DraftRecord | null>;
  /** Newest saved first. */
  listOwnLiveDrafts(tx: Tx, accountId: string, now: Date, limit: number): Promise<DraftRecord[]>;
  /** False when no live draft of the account has the id. */
  deleteOwnDraft(tx: Tx, accountId: string, draftId: string, now: Date): Promise<boolean>;

  /** U46's visible-doctor predicate. */
  visibleDoctorIdByPublicId(tx: Tx, publicId: string): Promise<string | null>;
  /** U46's visible-branch predicate. */
  visibleBranchIdByPublicId(tx: Tx, publicId: string): Promise<string | null>;
  /** Active terms only; an unknown or unpublished public id is absent from the map. */
  activeTermIdsByPublicIds(
    tx: Tx,
    publicIds: readonly string[],
  ): Promise<Map<string, ActiveTermRef>>;

  insertReview(tx: Tx, review: NewReviewRecord): Promise<void>;
  insertTags(tx: Tx, reviewId: string, tags: readonly NewReviewTag[]): Promise<void>;
  insertVersion(tx: Tx, version: NewReviewVersion): Promise<void>;
  insertFacilityReview(tx: Tx, review: NewFacilityReviewRecord): Promise<void>;

  /** U46's eligibility predicate (BR5.1); never selects `exact_date_enc`. */
  findEligibleByPublicId(
    tx: Tx,
    publicId: string,
    locale: Locale,
  ): Promise<EligibleReviewRecord | null>;
  /** Any state (BR6.1). */
  idForPublicId(tx: Tx, publicId: string): Promise<string | null>;
  /** Any state; internal, for the ownership check only (BR6.2). */
  authorPersonaIdOf(tx: Tx, reviewId: string): Promise<string | null>;
  /** Any state; the bare mode (BR6.9). */
  identityModeOf(tx: Tx, reviewId: string): Promise<IdentityMode | null>;
  /** U46's eligibility predicate (BR6.3). */
  isEligible(tx: Tx, reviewId: string): Promise<boolean>;
  /** The newest correction version's time (BR6.7). */
  lastCorrectionAt(tx: Tx, reviewId: string): Promise<Date | null>;
  /** BR7.4. */
  countEligible(tx: Tx): Promise<number>;
  /** Every state except deleted, newest first (BR7.3). */
  listByPersonas(
    tx: Tx,
    personaIds: readonly string[],
    locale: Locale,
    limit: number,
  ): Promise<OwnReviewRecord[]>;
  /** BR7.5. */
  existsEligibleOfDoctorByPersonas(
    tx: Tx,
    doctorId: string,
    personaIds: readonly string[],
  ): Promise<boolean>;
}
