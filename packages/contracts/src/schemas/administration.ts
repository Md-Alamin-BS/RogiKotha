// Input schemas for the `administration` command catalogue
// (03-routes-and-contracts.md §4 "administration (T-105, T-408)").
import { z } from 'zod';

import { ConfigValuesSchema } from '../config-values';

export const GetCurrentConfigInput = z.object({}).strict();

export const GetConfigHistoryInput = z
  .object({ page: z.number().int().min(1).optional() })
  .strict();

// TODO(T-408): whether a shallow or deep partial best fits the config
// editor's diff preview is owned by that task; shallow partial for now.
export const ProposeConfigInput = z.object({ values: ConfigValuesSchema.partial() }).strict();

export const ApplyConfigInput = z
  .object({
    values: ConfigValuesSchema,
    reason: z.string().min(1),
    expectedVersion: z.number().int().min(1),
  })
  .strict();

export const RollbackConfigInput = z
  .object({
    toVersion: z.number().int().min(1),
    reason: z.string().min(1),
  })
  .strict();

export const AdminNavCountsInput = z.object({}).strict();

export const administrationSchemas = {
  GetCurrentConfigInput,
  GetConfigHistoryInput,
  ProposeConfigInput,
  ApplyConfigInput,
  RollbackConfigInput,
  AdminNavCountsInput,
};
