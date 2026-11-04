// The account status machine (02-data-model.md §17, T-101 functional-spec § 5.1). `domain` imports
// nothing (FD-093), so the status list is restated here; `application` proves at compile time that
// it equals `AccountStatus` in `@rogikotha/contracts`.

export const ACCOUNT_STATES = [
  'pending_verification',
  'active',
  'restricted',
  'suspended',
  'banned',
  'deleted',
] as const;
export type AccountState = (typeof ACCOUNT_STATES)[number];

export const ACCOUNT_EVENTS = [
  'emailVerified',
  'restrict',
  'enforcementEnds',
  'suspend',
  'ban',
  'deletionCompletes',
] as const;
export type AccountEvent = (typeof ACCOUNT_EVENTS)[number];

/** Registration with a new email creates the profile in this status (BR1.5). */
export const INITIAL_ACCOUNT_STATE: AccountState = 'pending_verification';

// ASSUMPTION(T-101): "any but deleted → banned" leaves out banned → banned, and "any → deleted"
// leaves out deleted → deleted; a same-status move is not a transition.
const TRANSITIONS: Readonly<Record<AccountEvent, Partial<Record<AccountState, AccountState>>>> = {
  emailVerified: { pending_verification: 'active' },
  restrict: { active: 'restricted' },
  enforcementEnds: { restricted: 'active', suspended: 'active' },
  suspend: { active: 'suspended', restricted: 'suspended' },
  ban: {
    pending_verification: 'banned',
    active: 'banned',
    restricted: 'banned',
    suspended: 'banned',
  },
  deletionCompletes: {
    pending_verification: 'deleted',
    active: 'deleted',
    restricted: 'deleted',
    suspended: 'deleted',
    banned: 'deleted',
  },
};

/** The status after `event`, or null when the table has no such move. */
export function nextAccountState(from: AccountState, event: AccountEvent): AccountState | null {
  return TRANSITIONS[event][from] ?? null;
}

/** Pending, active and restricted accounts may hold a session; suspended and banned may not. */
export function mayHoldSession(state: AccountState): boolean {
  return state === 'pending_verification' || state === 'active' || state === 'restricted';
}

/** A deleted account is treated as unknown everywhere: sign-in, reset and resend (BR3.7). */
export function isTreatedAsUnknown(state: AccountState): boolean {
  return state === 'deleted';
}
