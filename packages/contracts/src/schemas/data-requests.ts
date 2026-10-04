// Input schemas for the `dataRequest` command catalogue
// (03-routes-and-contracts.md §4 "data-requests (T-410)").
import { z } from 'zod';

export const RequestDataExportInput = z.object({ idempotencyKey: z.string().min(1) }).strict();

export const RequestDataDeletionInput = z
  .object({
    idempotencyKey: z.string().min(1),
    password: z.string().min(1),
  })
  .strict();

export const GetDataRequestStatusInput = z.object({ requestId: z.string().min(1).optional() }).strict();

export const dataRequestsSchemas = {
  RequestDataExportInput,
  RequestDataDeletionInput,
  GetDataRequestStatusInput,
};
