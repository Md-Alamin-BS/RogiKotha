// Input schemas for the `directory` command catalogue
// (03-routes-and-contracts.md §4 "directory (T-201, T-204)").
import { z } from 'zod';

import { CRITERIA, OUTCOMES, RELATIONSHIPS, SUBMISSION_STATUSES } from '../enums';
import { PUBLIC_ID_RE } from '../ids';

const publicId = z.string().regex(PUBLIC_ID_RE);
const PageParams = {
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
};
const PROFILE_KIND = z.enum(['doctor', 'facility']);

export const GetDoctorInput = z
  .object({
    publicId,
    condition: publicId.optional(),
    outcome: z.enum(OUTCOMES).optional(),
    relationship: z.enum(RELATIONSHIPS).optional(),
    docs: z.boolean().optional(),
  })
  .strict();

// The index filters come with search (T-205, release 2); release 1 lists one page (Question 10).
export const ListDoctorsInput = z.object({ ...PageParams }).strict();

/** Same limits as the merged write form (`apps/web/src/server/actions/review.ts`, BR5.5). */
export const MEMBER_DOCTOR_NAME_MAX = 120;
export const MEMBER_DOCTOR_PLACE_MAX = 200;

// Shape only; the letter count, the title and invisible characters are checked by
// `directory.addMemberDoctor` with `contracts/doctor-name.ts` (FD-100).
export const AddMemberDoctorInput = z
  .object({
    name: z.string().trim().min(1).max(MEMBER_DOCTOR_NAME_MAX),
    specialtyId: z.uuid().optional(),
    practiceArea: z.string().trim().min(1).max(MEMBER_DOCTOR_PLACE_MAX).optional(),
    bmdcNumber: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9-]{1,20}$/)
      .optional(),
  })
  .strict();

// ASSUMPTION(U46): the inputs of the read-side Review stub's queries live here, beside the
// directory inputs, because `schemas/review.ts` belongs to U47's review module.
export const DoctorDistributionInput = z
  .object({ doctorId: z.uuid(), conditionPublicId: publicId.optional() })
  .strict();

export const BranchCriteriaInput = z
  .object({ branchId: z.uuid(), key: z.enum(CRITERIA).optional() })
  .strict();

export const LIST_EXPERIENCE_CARDS_MAX = 50;

export const ListExperienceCardsInput = z
  .object({
    limit: z.number().int().min(1).max(LIST_EXPERIENCE_CARDS_MAX).optional(),
    cursor: z.string().min(1).max(200).optional(),
    doctorPublicId: publicId.optional(),
    conditionPublicId: publicId.optional(),
    // U47 (BR7.2, BR5.8): internal persona ids from Identity, never from the browser.
    personaIds: z.array(z.uuid()).max(1000).optional(),
    excludePublicId: publicId.optional(),
  })
  .strict();

export const GetFacilityInput = z.object({ publicId }).strict();

export const ListFacilitiesInput = z.object({ ...PageParams }).strict();

export const DoctorsAtBranchInput = z.object({ branchPublicId: publicId }).strict();

export const FacilitiesForDoctorInput = z.object({ doctorPublicId: publicId }).strict();

// Release 2 (T-201/T-204): `payload` shape (per-kind submission fields) owned by
// the directory tasks.
export const SubmitProfileInput = z
  .object({
    kind: PROFILE_KIND,
    payload: z.unknown(),
  })
  .strict();

export const ListSubmissionsInput = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    ...PageParams,
  })
  .strict();

export const ListClaimsInput = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    ...PageParams,
  })
  .strict();

export const ListFieldChangesInput = z
  .object({
    status: z.enum(SUBMISSION_STATUSES).optional(),
    ...PageParams,
  })
  .strict();

export const DecideSubmissionInput = z
  .object({
    submissionId: z.string().min(1),
    decision: z.enum(['approve', 'reject', 'merge']),
    mergeIntoId: z.string().min(1).optional(),
    reason: z.string().min(1),
  })
  .strict();

export const ClaimProfileInput = z
  .object({
    targetKind: PROFILE_KIND,
    targetId: z.string().min(1),
    method: z.string().min(1),
    evidenceNote: z.string().min(1),
  })
  .strict();

export const DecideClaimInput = z
  .object({
    claimId: z.string().min(1),
    decision: z.enum(['approve', 'reject']),
    reason: z.string().min(1),
  })
  .strict();

// Release 2 (T-201): `newValue`'s shape depends on `field`; kept unknown here.
export const ProposeFieldChangeInput = z
  .object({
    targetKind: PROFILE_KIND,
    targetId: z.string().min(1),
    field: z.string().min(1),
    newValue: z.unknown(),
  })
  .strict();

export const DecideFieldChangeInput = z
  .object({
    changeId: z.string().min(1),
    decision: z.enum(['approve', 'reject']),
    reason: z.string().min(1),
  })
  .strict();

export type GetDoctorInput = z.output<typeof GetDoctorInput>;
export type ListDoctorsInput = z.output<typeof ListDoctorsInput>;
export type GetFacilityInput = z.output<typeof GetFacilityInput>;
export type ListFacilitiesInput = z.output<typeof ListFacilitiesInput>;
export type DoctorsAtBranchInput = z.output<typeof DoctorsAtBranchInput>;
export type FacilitiesForDoctorInput = z.output<typeof FacilitiesForDoctorInput>;
export type AddMemberDoctorInput = z.output<typeof AddMemberDoctorInput>;
export type DoctorDistributionInput = z.output<typeof DoctorDistributionInput>;
export type BranchCriteriaInput = z.output<typeof BranchCriteriaInput>;
export type ListExperienceCardsInput = z.output<typeof ListExperienceCardsInput>;

export const directorySchemas = {
  GetDoctorInput,
  ListDoctorsInput,
  GetFacilityInput,
  ListFacilitiesInput,
  DoctorsAtBranchInput,
  FacilitiesForDoctorInput,
  SubmitProfileInput,
  ListSubmissionsInput,
  ListClaimsInput,
  ListFieldChangesInput,
  DecideSubmissionInput,
  ClaimProfileInput,
  DecideClaimInput,
  ProposeFieldChangeInput,
  DecideFieldChangeInput,
  AddMemberDoctorInput,
  DoctorDistributionInput,
  BranchCriteriaInput,
  ListExperienceCardsInput,
};
