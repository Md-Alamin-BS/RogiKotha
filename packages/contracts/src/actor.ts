// Actor, Capability and staff-role capability resolution (01-conventions.md
// §5; 03-routes-and-contracts.md §2). `StaffRole` and `AccountStatus` are
// data-model enums and live in enums.ts (the single source for every enum);
// this file only describes the actor shape built from them.
import type { ConfigValues } from './config-values';
import type { AccountStatus, Locale, StaffRole } from './enums';

export type Capability =
  | 'reports.read'
  | 'content.act'
  | 'identity.reveal'
  | 'evidence.original'
  | 'providers.decide'
  | 'config.write'
  | 'retention.bulk'
  | 'holds.manage';

export const ALL_CAPABILITIES: readonly Capability[] = [
  'reports.read',
  'content.act',
  'identity.reveal',
  'evidence.original',
  'providers.decide',
  'config.write',
  'retention.bulk',
  'holds.manage',
];

export interface Actor {
  kind: 'anonymous' | 'account';
  accountId?: string;
  /** default persona for the account */
  personaId?: string;
  emailVerified?: boolean;
  status?: AccountStatus;
  /** undefined for ordinary users */
  staffRole?: StaffRole;
  /** resolved from staffRole + config_versions.values.capabilities */
  capabilities: Capability[];
  /** present only after a password recheck (5-minute window) */
  stepUp?: { rechecked_at: string };
  locale: Locale;
  correlationId: string;
}

export function ANONYMOUS_ACTOR(locale: Locale, correlationId: string): Actor {
  return {
    kind: 'anonymous',
    capabilities: [],
    locale,
    correlationId,
  };
}

/**
 * Resolves the capabilities a staff role currently has, given the toggles
 * in the running config (03-routes-and-contracts.md §2):
 * - super_admin: every capability (fixed in code, never config — data-model
 *   §11: "Super Admin capabilities are fixed in code, not config").
 * - admin: reports.read, content.act, providers.decide, holds.manage,
 *   plus identity.reveal / evidence.original only when
 *   config.admin.revealIdentity / config.admin.originalEvidence is true.
 * - moderator: reports.read, content.act, plus the same two toggles read
 *   from config.moderator instead.
 */
export function capabilitiesForRole(
  role: StaffRole,
  config: ConfigValues['capabilities'],
): Capability[] {
  if (role === 'super_admin') {
    return [...ALL_CAPABILITIES];
  }
  if (role === 'admin') {
    const capabilities: Capability[] = [
      'reports.read',
      'content.act',
      'providers.decide',
      'holds.manage',
    ];
    if (config.admin.revealIdentity) capabilities.push('identity.reveal');
    if (config.admin.originalEvidence) capabilities.push('evidence.original');
    return capabilities;
  }
  // moderator
  const capabilities: Capability[] = ['reports.read', 'content.act'];
  if (config.moderator.revealIdentity) capabilities.push('identity.reveal');
  if (config.moderator.originalEvidence) capabilities.push('evidence.original');
  return capabilities;
}
