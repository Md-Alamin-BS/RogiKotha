// Input schemas for the `moderation` and `appeal` command catalogues
// (03-routes-and-contracts.md §4 "moderation (T-403, T-404)").
import { z } from 'zod';

import { CASE_STATUSES, MODERATION_ACTIONS, MODERATION_LANES, REPORT_REASONS, TARGET_KINDS } from '../enums.js';

const REPORT_DETAIL_MAX = 2000;
const CASE_CODE = z.string().regex(/^MOD-\d+$/);

export const FileReportInput = z
  .object({
    targetKind: z.enum(TARGET_KINDS),
    targetId: z.string().min(1),
    reason: z.enum(REPORT_REASONS),
    detail: z.string().max(REPORT_DETAIL_MAX),
    evidenceNote: z.string().max(REPORT_DETAIL_MAX).optional(),
  })
  .strict();

export const GetQueueInput = z
  .object({
    lane: z.enum(MODERATION_LANES).optional(),
    status: z.enum(CASE_STATUSES).optional(),
    page: z.number().int().min(1).optional(),
  })
  .strict();

export const GetCaseInput = z.object({ code: CASE_CODE }).strict();

export const DecideCaseInput = z
  .object({
    caseCode: CASE_CODE,
    action: z.enum(MODERATION_ACTIONS),
    reasonCode: z.string().min(1),
    reasonToAuthor: z.string().min(1),
    policyVersion: z.string().min(1),
  })
  .strict();

export const RestoreCaseInput = z
  .object({
    caseCode: CASE_CODE,
    reasonCode: z.string().min(1),
  })
  .strict();

export const FileAppealInput = z
  .object({
    caseCode: CASE_CODE,
    text: z.string().min(1),
  })
  .strict();

// TODO(T-404): the appeal review checklist shape is owned by that task.
export const DecideAppealInput = z
  .object({
    appealId: z.string().min(1),
    status: z.enum(['upheld', 'changed']),
    reason: z.string().min(1),
    checklist: z.unknown(),
  })
  .strict();

export const MyAppealableInput = z.object({}).strict();

export const ModerationBulkPreviewInput = z
  .object({
    caseCodes: z.array(CASE_CODE).min(1),
    action: z.enum(MODERATION_ACTIONS),
  })
  .strict();

export const ModerationBulkApplyInput = z
  .object({
    previewToken: z.string().min(1),
    reasonCode: z.string().min(1),
    idempotencyKey: z.string().min(1),
  })
  .strict();

export const RevealReporterInput = z
  .object({
    caseCode: CASE_CODE,
    reason: z.string().min(1),
  })
  .strict();

export const moderationSchemas = {
  FileReportInput,
  GetQueueInput,
  GetCaseInput,
  DecideCaseInput,
  RestoreCaseInput,
  FileAppealInput,
  DecideAppealInput,
  MyAppealableInput,
  ModerationBulkPreviewInput,
  ModerationBulkApplyInput,
  RevealReporterInput,
};
