// Input schemas for the `retention` and `hold` command catalogues, both
// listed under the "evidence" section of 03-routes-and-contracts.md §4 but
// owned by the `retention` module (01-conventions.md §1 fixed module list).
import { z } from 'zod';

import { TARGET_KINDS } from '../enums.js';

export const CurrentPolicyInput = z.object({}).strict();

// Same ranges as `config-values.ts`'s `retention.originalDays`/`auditDays`
// (02-data-model.md §11).
export const SetRetentionPolicyInput = z
  .object({
    originalDays: z.number().int().min(1).max(3650),
    auditDays: z.number().int().min(30).max(3650),
    reason: z.string().min(1),
  })
  .strict();

export const PreviewRetentionBulkInput = z
  .object({
    fromDays: z.number().int().min(1),
    toDays: z.number().int().min(1),
  })
  .strict();

export const ExecuteRetentionBulkInput = z
  .object({
    previewToken: z.string().min(1),
    reason: z.string().min(1),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const HoldPlaceInput = z
  .object({
    targetKind: z.enum(TARGET_KINDS),
    targetId: z.string().min(1),
    reason: z.string().min(1),
    expiresAt: z.string().optional(),
  })
  .strict();

export const HoldReleaseInput = z
  .object({
    holdId: z.string().min(1),
    reason: z.string().min(1),
  })
  .strict();

// job — hourly cron, no payload
export const RetentionExpireJobInput = z.object({}).strict();

export const retentionSchemas = {
  CurrentPolicyInput,
  SetRetentionPolicyInput,
  PreviewRetentionBulkInput,
  ExecuteRetentionBulkInput,
  HoldPlaceInput,
  HoldReleaseInput,
  RetentionExpireJobInput,
};
