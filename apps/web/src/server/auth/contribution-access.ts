import type { Actor } from '@rogikotha/contracts';

export type ContributionAccess = 'signed-out' | 'unconfirmed' | 'unavailable' | 'allowed';

/**
 * BR8.1: anything but a confirmed, active account may not write or comment. The one rule shared by
 * `getContributionAccess()` (the gate) and `requireContributor()` (the write actions' own refusal).
 */
export function contributionAccessOf(actor: Actor): ContributionAccess {
  if (actor.kind !== 'account') return 'signed-out';
  if (actor.status === 'pending_verification') return 'unconfirmed';
  if (actor.status === 'active' && actor.emailVerified === true) return 'allowed';
  return 'unavailable';
}
