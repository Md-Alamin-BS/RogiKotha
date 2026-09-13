// Input schemas for the `staff.*` commands nested under the account module's
// catalogue entry (03-routes-and-contracts.md §4 "account (T-101, T-102,
// T-103, T-105)") but kept in their own file per T-003's owned paths.
import { z } from 'zod';

import { STAFF_ROLES } from '../enums.js';

export const BeginDeviceApprovalInput = z.object({ deviceSecret: z.string().min(1).optional() }).strict();

export const ApproveDeviceInput = z
  .object({
    token: z.string().min(1),
    password: z.string().min(1),
  })
  .strict();

export const ListStaffDevicesInput = z.object({}).strict();

// `deviceId` is the internal `staff_devices.id` (uuid), not a public id.
export const RevokeStaffDeviceInput = z.object({ deviceId: z.string().min(1) }).strict();

export const SetStaffRoleInput = z
  .object({
    accountId: z.string().min(1),
    role: z.enum(STAFF_ROLES).nullable(),
  })
  .strict();

export const staffSchemas = {
  BeginDeviceApprovalInput,
  ApproveDeviceInput,
  ListStaffDevicesInput,
  RevokeStaffDeviceInput,
  SetStaffRoleInput,
};
