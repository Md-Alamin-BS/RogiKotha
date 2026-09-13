// Input schemas for the `review` and `facilityReview` command catalogues
// (03-routes-and-contracts.md §4 "review (T-301, T-302, T-306, T-307)").
import { z } from 'zod';

import { CRITERIA, CRITERION_VALUES, FOLLOW_UP_KINDS, IDENTITY_MODES } from '../enums';
import { PUBLIC_ID_RE } from '../ids';

const publicId = z.string().regex(PUBLIC_ID_RE);
const PageParams = { page: z.number().int().min(1).optional(), pageSize: z.number().int().min(1).max(100).optional() };

// TODO(T-301/T-306): the composer draft payload shape is owned by those
// tasks; kept unknown here so this task does not guess the field list.
export const SaveDraftInput = z
  .object({
    draftId: z.string().min(1).optional(),
    payload: z.unknown(),
  })
  .strict();

export const GetDraftInput = z.object({ draftId: z.string().min(1) }).strict();

export const PublishReviewInput = z
  .object({
    draftId: z.string().min(1),
    identityMode: z.enum(IDENTITY_MODES),
    // Literal per 03-routes-and-contracts.md §4: attestation is a required
    // affirmative confirmation, not an optional flag the command tolerates
    // as false — a missing/false value never reaches `review.publish`.
    attestation: z.literal(true),
  })
  .strict();

export const PreviewReviewInput = z.object({ draftId: z.string().min(1) }).strict();

export const AddFollowUpInput = z
  .object({
    reviewId: z.string().min(1),
    kind: z.enum(FOLLOW_UP_KINDS),
    datedYear: z.number().int().min(2000).max(2100),
    datedMonth: z.number().int().min(1).max(12),
    body: z.string().min(1),
    laterProvider: z.string().min(1).optional(),
  })
  .strict();

// TODO(T-301): the correctable field list/shape is owned by that task.
export const CorrectReviewInput = z
  .object({
    reviewId: z.string().min(1),
    fields: z.unknown(),
  })
  .strict();

export const DeleteReviewInput = z.object({ reviewId: z.string().min(1) }).strict();

export const RestoreReviewInput = z.object({ reviewId: z.string().min(1) }).strict();

export const GetExperienceInput = z.object({ publicId }).strict();

// TODO(T-301): filter shape owned by that task.
export const ListExperiencesInput = z.object({ ...PageParams, filters: z.unknown().optional() }).strict();

export const ForDoctorInput = z.object({ doctorPublicId: publicId, ...PageParams }).strict();

export const ForBranchInput = z.object({ branchPublicId: publicId, ...PageParams }).strict();

export const ForConditionInput = z.object({ conditionPublicId: publicId, ...PageParams }).strict();

export const SentimentDistributionInput = z.object({ doctorId: z.string().min(1) }).strict();

export const OutcomeDistributionInput = z.object({ doctorId: z.string().min(1) }).strict();

export const CriteriaDistributionInput = z.object({ branchId: z.string().min(1) }).strict();

// `{staff: 'good', …, reportTime: null}` — every criterion key present,
// `null` meaning "not answered" (02-data-model.md §6 `facility_reviews`).
const CriteriaValues = z.record(z.enum(CRITERIA), z.enum(CRITERION_VALUES).nullable());

export const FacilityReviewPublishInput = z
  .object({
    draftId: z.string().min(1),
    identityMode: z.enum(IDENTITY_MODES),
    attestation: z.literal(true),
    criteria: CriteriaValues,
  })
  .strict();

export const FacilityReviewDeleteInput = z.object({ reviewId: z.string().min(1) }).strict();

export const FacilityReviewRestoreInput = z.object({ reviewId: z.string().min(1) }).strict();

export const reviewSchemas = {
  SaveDraftInput,
  GetDraftInput,
  PublishReviewInput,
  PreviewReviewInput,
  AddFollowUpInput,
  CorrectReviewInput,
  DeleteReviewInput,
  RestoreReviewInput,
  GetExperienceInput,
  ListExperiencesInput,
  ForDoctorInput,
  ForBranchInput,
  ForConditionInput,
  SentimentDistributionInput,
  OutcomeDistributionInput,
  CriteriaDistributionInput,
  FacilityReviewPublishInput,
  FacilityReviewDeleteInput,
  FacilityReviewRestoreInput,
};
