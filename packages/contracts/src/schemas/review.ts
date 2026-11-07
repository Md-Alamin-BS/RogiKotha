// Input schemas for the `review` and `facilityReview` command catalogues
// (03-routes-and-contracts.md §4 "review (T-301, T-302, T-306, T-307)").
import { z } from 'zod';

import { hasControlOrFormat, hasControlOrFormatExceptJoiners } from '../doctor-name';
import {
  CRITERIA,
  CRITERION_VALUES,
  FOLLOW_UP_KINDS,
  IDENTITY_MODES,
  OUTCOMES,
  RELATIONSHIPS,
  REVIEW_KINDS,
  SENTIMENTS,
  TAG_GROUPS,
} from '../enums';
import { PUBLIC_ID_RE } from '../ids';
import { MEMBER_DOCTOR_NAME_MAX, MEMBER_DOCTOR_PLACE_MAX } from './directory';

const publicId = z.string().regex(PUBLIC_ID_RE);
const PageParams = {
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
};

/** The release-1 Reviewer's labels: the prototype's three codes (FD-111, BR3.8). */
export const REVIEWER_LABEL_CODES = ['wrongDx', 'wrongRx', 'secondOpinion'] as const;
export type ReviewerLabelCode = (typeof REVIEWER_LABEL_CODES)[number];

export const DRAFT_TARGETS = ['doctor', 'facility'] as const;
export type DraftTarget = (typeof DRAFT_TARGETS)[number];

/** The composer's three safety checks an author may dismiss (personal data, emergency, duplicate). */
export const SAFETY_CHECK_KINDS = ['pii', 'emerg', 'dup'] as const;
export type SafetyCheckKind = (typeof SAFETY_CHECK_KINDS)[number];

export const REVIEW_SECTION_KEYS = ['symptoms', 'diagnosis', 'treatment', 'after'] as const;
export type ReviewSectionKey = (typeof REVIEW_SECTION_KEYS)[number];

/** `reviews.language`, detected from the script of the text (BR3.7). */
export const REVIEW_LANGUAGES = ['en', 'bn', 'mixed'] as const;
export type ReviewLanguage = (typeof REVIEW_LANGUAGES)[number];

export const DRAFT_TITLE_MAX = 120;
export const DRAFT_STORY_MAX = 10_000;
export const DRAFT_SECTION_MAX = 5_000;
export const DRAFT_TAG_MAX = 20;
export const DRAFT_TAG_TEXT_MAX = 60;

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const graphemeCount = (text: string) => Array.from(graphemes.segment(text)).length;

// Lengths are graphemes, not UTF-16 units: a Bengali story needs several units per letter.
// Only outer whitespace is trimmed; no other normalisation of author text (BR3.9).
// Names keep the directory's strict check (FD-100); the author's own words may hold the two
// Bengali joiners ZWNJ and ZWJ (FD-114).
function plainText(max: number, min = 0, { joiners = false }: { joiners?: boolean } = {}) {
  const refused = joiners ? hasControlOrFormatExceptJoiners : hasControlOrFormat;
  return z
    .string()
    .trim()
    .refine((s) => !refused(s), { error: 'errors.common.validation' })
    .refine((s) => graphemeCount(s) >= min && graphemeCount(s) <= max, {
      error: 'errors.common.validation',
    });
}

function longText(max: number) {
  return z
    .string()
    .trim()
    .refine((s) => !hasControlOrFormatExceptJoiners(s, { lineBreaks: true }), {
      error: 'errors.common.validation',
    })
    .refine((s) => graphemeCount(s) <= max, { error: 'errors.common.validation' });
}

// The letter count and the title rule are publish checks (BR3.11), so a half-typed name saves.
const DraftNewDoctor = z.object({
  name: plainText(MEMBER_DOCTOR_NAME_MAX),
  specialtyId: z.uuid().optional(),
  practiceArea: plainText(MEMBER_DOCTOR_PLACE_MAX).optional(),
  bmdc: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{0,20}$/)
    .optional(),
});

const DraftTag = z.union([
  z.object({ group: z.enum(TAG_GROUPS), termPublicId: publicId }),
  z.object({
    group: z.enum(TAG_GROUPS),
    text: plainText(DRAFT_TAG_TEXT_MAX, 1, { joiners: true }),
  }),
]);

/**
 * The composer's state inside an encrypted draft (ENT-006). Lenient: every field is optional and
 * defaulted, bounds are enforced, unknown keys (FR46 checkboxes, any rating-like key) are
 * dropped. The publish minimum is checked by the domain, not here.
 */
export const DraftPayload = z
  .object({
    v: z.literal(1).default(1),
    target: z.enum(DRAFT_TARGETS).default('doctor'),
    mode: z.enum(REVIEW_KINDS).default('quick'),
    step: z.number().int().min(1).max(4).default(1),
    doctorPublicId: publicId.optional(),
    newDoctor: DraftNewDoctor.optional(),
    branchPublicId: publicId.optional(),
    relationship: z.enum(RELATIONSHIPS).optional(),
    period: z
      .object({
        year: z.number().int().min(2000).max(2100),
        month: z.number().int().min(1).max(12),
      })
      .optional(),
    exactDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    title: plainText(DRAFT_TITLE_MAX, 0, { joiners: true }).optional(),
    story: longText(DRAFT_STORY_MAX).optional(),
    sections: z
      .object({
        symptoms: longText(DRAFT_SECTION_MAX).optional(),
        diagnosis: longText(DRAFT_SECTION_MAX).optional(),
        treatment: longText(DRAFT_SECTION_MAX).optional(),
        after: longText(DRAFT_SECTION_MAX).optional(),
      })
      .optional(),
    tags: z.array(DraftTag).max(DRAFT_TAG_MAX).default([]),
    notSure: z.boolean().default(false),
    sentiment: z.enum(SENTIMENTS).optional(),
    outcome: z.enum(OUTCOMES).optional(),
    claims: z
      .array(z.enum(REVIEWER_LABEL_CODES))
      .max(REVIEWER_LABEL_CODES.length)
      .default([])
      .transform((codes) => [...new Set(codes)]),
    criteria: z.partialRecord(z.enum(CRITERIA), z.enum(CRITERION_VALUES)).optional(),
    identityMode: z.enum(IDENTITY_MODES).default('pseudonymous'),
    dismissedChecks: z.array(z.enum(SAFETY_CHECK_KINDS)).max(SAFETY_CHECK_KINDS.length).optional(),
  })
  .refine((p) => !(p.doctorPublicId !== undefined && p.newDoctor !== undefined), {
    error: 'errors.common.validation',
    path: ['newDoctor'],
  });

export type DraftPayload = z.output<typeof DraftPayload>;
export type DraftPayloadInput = z.input<typeof DraftPayload>;

export const SaveDraftInput = z
  .object({
    draftId: z.uuid().optional(),
    payload: DraftPayload,
  })
  .strict();

export const DiscardDraftInput = z.object({ draftId: z.uuid() }).strict();

export const GetDraftInput = z.object({ draftId: z.uuid() }).strict();

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
export const ListExperiencesInput = z
  .object({ ...PageParams, filters: z.unknown().optional() })
  .strict();

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
  DraftPayload,
  SaveDraftInput,
  DiscardDraftInput,
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

// U47's module inputs beside the catalogue above (functional-spec § 2).
export const ReviewEmptyInput = z.object({}).strict();

/** WF3: the author's own names come from `account.getOwnAccount`, passed in by the action. */
export const PreviewDraftInput = z
  .object({
    draftId: z.uuid(),
    names: z
      .object({
        named: plainText(MEMBER_DOCTOR_NAME_MAX).nullable(),
        pseudonymous: plainText(MEMBER_DOCTOR_NAME_MAX).nullable(),
      })
      .optional(),
  })
  .strict();

/** WF8: any string is answered; an unknown username gets the same empty page (BR7.2). */
export const AuthorCardsInput = z
  .object({
    username: z.string().trim().min(1).max(64),
    cursor: z.string().min(1).max(200).optional(),
  })
  .strict();

export const HasOwnReviewOfDoctorInput = z.object({ draftId: z.uuid() }).strict();

export type ReviewEmptyInput = z.output<typeof ReviewEmptyInput>;
export type SaveDraftInput = z.output<typeof SaveDraftInput>;
export type DiscardDraftInput = z.output<typeof DiscardDraftInput>;
export type GetDraftInput = z.output<typeof GetDraftInput>;
export type PublishReviewInput = z.output<typeof PublishReviewInput>;
export type PreviewDraftInput = z.output<typeof PreviewDraftInput>;
export type GetExperienceInput = z.output<typeof GetExperienceInput>;
export type AuthorCardsInput = z.output<typeof AuthorCardsInput>;
export type HasOwnReviewOfDoctorInput = z.output<typeof HasOwnReviewOfDoctorInput>;
