// The Review module (U47, C9 release 1) and its pinned calling convention (functional-spec § 2.1,
// ENT-013; frozen when U47 merges, BR6.8). The seams are plain functions on the caller's `Tx`:
// they never open a transaction, never throw for an expected case and take the account only from
// `actor`. Other modules take `Pick<ReviewSeams, …>` in their own factory deps; the web tier
// reaches the module as `getContainer().review` and runs the seams inside `unitOfWork.read`.
import type {
  Actor,
  ComposerDraftVM,
  DiscardDraftInput,
  DraftSummaryVM,
  ExperiencePageVM,
  FacilityPreviewVM,
  GetDraftInput,
  GetExperienceInput,
  HasOwnReviewOfDoctorInput,
  IdentityMode,
  AuthorCardsInput,
  OwnReviewVM,
  PreviewDraftInput,
  PreviewVM,
  PublishReviewInput,
  ReviewEmptyInput,
  SaveDraftInput,
} from '@rogikotha/contracts';

import type { Command } from '../../command';
import type { Tx } from '../../ports';
import { discardDraftCommand } from './commands/discard-draft';
import {
  facilityReviewPublishCommand,
  type FacilityPublishOutput,
} from './commands/facility-review-publish';
import { publishCommand, type PublishOutput } from './commands/publish';
import { saveDraftCommand, type SaveDraftOutput } from './commands/save-draft';
import type { ReviewModulePorts } from './ports';
import { authorCardsQuery, type AuthorCardsOutput } from './queries/author-cards';
import { authorIdentityModeOf } from './queries/author-identity-mode-of';
import { countExperiencesQuery } from './queries/count-experiences';
import { getDraftQuery } from './queries/get-draft';
import { getExperienceQuery } from './queries/get-experience';
import { hasOwnReviewOfDoctorQuery } from './queries/has-own-review-of-doctor';
import { isReviewAuthor } from './queries/is-review-author';
import { isReviewPublished } from './queries/is-review-published';
import { lastEditedAt } from './queries/last-edited-at';
import { listOwnDraftsQuery } from './queries/list-own-drafts';
import { listOwnReviewsQuery } from './queries/list-own-reviews';
import { previewQuery } from './queries/preview';
import { reviewIdForPublicId } from './queries/review-id-for-public-id';

/** `ports/unit-of-work.ts` `Tx`; valid inside `unitOfWork.read` and `unitOfWork.run`. */
export type ReviewCtx = Tx;

export interface ReviewSeams {
  reviewIdForPublicId(tx: ReviewCtx, input: { publicId: string }): Promise<string | null>;
  isReviewAuthor(tx: ReviewCtx, input: { reviewId: string; actor: Actor }): Promise<boolean>;
  isReviewPublished(tx: ReviewCtx, input: { reviewId: string }): Promise<boolean>;
  /** For U49: the bare mode, never the persona or the account (BR6.9). */
  authorIdentityModeOf(tx: ReviewCtx, input: { reviewId: string }): Promise<IdentityMode | null>;
}

export interface ReviewModule extends ReviewSeams {
  saveDraft: Command<SaveDraftInput, SaveDraftOutput>;
  discardDraft: Command<DiscardDraftInput, Record<string, never>>;
  publish: Command<PublishReviewInput, PublishOutput>;
  facilityReviewPublish: Command<PublishReviewInput, FacilityPublishOutput>;
  getDraft: Command<GetDraftInput, ComposerDraftVM>;
  listOwnDrafts: Command<ReviewEmptyInput, DraftSummaryVM[]>;
  preview: Command<PreviewDraftInput, PreviewVM | FacilityPreviewVM>;
  getExperience: Command<GetExperienceInput, ExperiencePageVM>;
  countExperiences: Command<ReviewEmptyInput, { total: number }>;
  authorCards: Command<AuthorCardsInput, AuthorCardsOutput>;
  listOwnReviews: Command<ReviewEmptyInput, OwnReviewVM[]>;
  hasOwnReviewOfDoctor: Command<HasOwnReviewOfDoctorInput, { duplicate: boolean }>;
  /** ISO timestamp of the newest correction, or null (BR6.7); not part of `ReviewSeams`. */
  lastEditedAt(tx: ReviewCtx, input: { reviewId: string }): Promise<string | null>;
}

export function createReviewModule(deps: ReviewModulePorts): ReviewModule {
  const { reviews, ownership } = deps;
  return {
    saveDraft: saveDraftCommand(deps),
    discardDraft: discardDraftCommand(deps),
    publish: publishCommand(deps),
    facilityReviewPublish: facilityReviewPublishCommand(deps),
    getDraft: getDraftQuery(deps),
    listOwnDrafts: listOwnDraftsQuery(deps),
    preview: previewQuery(deps),
    getExperience: getExperienceQuery(deps),
    countExperiences: countExperiencesQuery(deps),
    authorCards: authorCardsQuery(deps),
    listOwnReviews: listOwnReviewsQuery(deps),
    hasOwnReviewOfDoctor: hasOwnReviewOfDoctorQuery(deps),
    reviewIdForPublicId: (tx, input) => reviewIdForPublicId(reviews, tx, input),
    isReviewAuthor: (tx, input) => isReviewAuthor(reviews, ownership, tx, input),
    isReviewPublished: (tx, input) => isReviewPublished(reviews, tx, input),
    authorIdentityModeOf: (tx, input) => authorIdentityModeOf(reviews, tx, input),
    lastEditedAt: (tx, input) => lastEditedAt(reviews, tx, input),
  };
}

export type { ReviewModulePorts } from './ports';
export type { SaveDraftOutput, PublishOutput, FacilityPublishOutput, AuthorCardsOutput };
