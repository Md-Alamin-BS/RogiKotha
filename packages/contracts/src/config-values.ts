// The `values` shape of `config_versions` (docs/implementation/02-data-model.md
// §11), validated with the ranges from `config.apply`
// (03-routes-and-contracts.md §4). Every key is required and no unknown key
// is accepted (`.strict()`) — `config.apply` maps a schema failure to the
// `config.invariant` error code.
import { z } from 'zod';

import { REPORT_REASONS } from './enums.js';

export const ConfigValuesSchema = z
  .object({
    thresholds: z
      .object({
        fiveAccountHide: z.number().int().min(2).max(50),
        criticalHours: z.number().int().min(1).max(168),
        standardDays: z.number().int().min(1).max(30),
        appealDays: z.number().int().min(1).max(30),
      })
      .strict(),
    retention: z
      .object({
        originalDays: z.number().int().min(1).max(3650),
        auditDays: z.number().int().min(30).max(3650),
        notificationDays: z.number().int().min(7).max(365),
      })
      .strict(),
    limitedDataThreshold: z.number().int().min(1).max(50),
    reportReasons: z.array(z.enum(REPORT_REASONS)).min(1),
    capabilities: z
      .object({
        admin: z
          .object({
            revealIdentity: z.boolean(),
            originalEvidence: z.boolean(),
          })
          .strict(),
        moderator: z
          .object({
            revealIdentity: z.boolean(),
            originalEvidence: z.boolean(),
          })
          .strict(),
      })
      .strict(),
    featureVisibility: z
      .object({
        facilityAccounts: z.boolean(),
        compareTray: z.boolean(),
      })
      .strict(),
    emergency: z
      .object({
        ambulance: z.string().min(1),
        healthLine: z.string().min(1),
        crisisLine: z.string().min(1),
        // Calendar date only (no time component) — "Last verified 21 August 2026".
        lastVerified: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .strict(),
  })
  .strict();

export type ConfigValues = z.infer<typeof ConfigValuesSchema>;

export const DEFAULT_CONFIG_VALUES: ConfigValues = {
  thresholds: { fiveAccountHide: 5, criticalHours: 24, standardDays: 3, appealDays: 7 },
  retention: { originalDays: 90, auditDays: 180, notificationDays: 90 },
  limitedDataThreshold: 5,
  reportReasons: [...REPORT_REASONS],
  capabilities: {
    admin: { revealIdentity: false, originalEvidence: false },
    moderator: { revealIdentity: false, originalEvidence: false },
  },
  featureVisibility: { facilityAccounts: true, compareTray: true },
  emergency: {
    ambulance: '999',
    healthLine: '16263',
    crisisLine: '09612-119911',
    lastVerified: '2026-08-21',
  },
};
