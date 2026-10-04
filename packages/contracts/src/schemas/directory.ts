// Input schemas for the `directory` command catalogue
// (03-routes-and-contracts.md §4 "directory (T-201, T-204)").
import { z } from 'zod';

import { OUTCOMES, RELATIONSHIPS, SUBMISSION_STATUSES } from '../enums';
import { PUBLIC_ID_RE } from '../ids';

const publicId = z.string().regex(PUBLIC_ID_RE);
const PageParams = { page: z.number().int().min(1).optional(), pageSize: z.number().int().min(1).max(100).optional() };
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

// TODO(T-201): filter shape (specialty, city, gender, …) owned by the
// directory index task; kept unknown here so this task does not guess it.
export const ListDoctorsInput = z
  .object({
    ...PageParams,
    filters: z.unknown().optional(),
  })
  .strict();

export const GetFacilityInput = z.object({ publicId }).strict();

export const ListFacilitiesInput = z.object({ ...PageParams }).strict();

export const DoctorsAtBranchInput = z.object({ branchPublicId: publicId }).strict();

export const FacilitiesForDoctorInput = z.object({ doctorPublicId: publicId }).strict();

// TODO(T-201/T-204): `payload` shape (per-kind submission fields) owned by
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

// TODO(T-201): `newValue`'s shape depends on `field`; kept unknown here.
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
};
