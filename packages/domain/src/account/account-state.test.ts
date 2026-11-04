import { describe, expect, it } from 'vitest';

import {
  ACCOUNT_EVENTS,
  ACCOUNT_STATES,
  INITIAL_ACCOUNT_STATE,
  isTreatedAsUnknown,
  mayHoldSession,
  nextAccountState,
  type AccountEvent,
  type AccountState,
} from './account-state';

// The § 5.1 table as written, one row per allowed move; every other pair must be refused.
const ALLOWED: ReadonlyArray<[AccountState, AccountEvent, AccountState]> = [
  ['pending_verification', 'emailVerified', 'active'],
  ['active', 'restrict', 'restricted'],
  ['restricted', 'enforcementEnds', 'active'],
  ['active', 'suspend', 'suspended'],
  ['restricted', 'suspend', 'suspended'],
  ['suspended', 'enforcementEnds', 'active'],
  ['pending_verification', 'ban', 'banned'],
  ['active', 'ban', 'banned'],
  ['restricted', 'ban', 'banned'],
  ['suspended', 'ban', 'banned'],
  ['pending_verification', 'deletionCompletes', 'deleted'],
  ['active', 'deletionCompletes', 'deleted'],
  ['restricted', 'deletionCompletes', 'deleted'],
  ['suspended', 'deletionCompletes', 'deleted'],
  ['banned', 'deletionCompletes', 'deleted'],
];

describe('nextAccountState', () => {
  it('starts a newly registered account as pending verification', () => {
    expect(INITIAL_ACCOUNT_STATE).toBe('pending_verification');
  });

  it.each(ALLOWED)('moves %s on %s to %s', (from, event, to) => {
    expect(nextAccountState(from, event)).toBe(to);
  });

  it('refuses every pair that the table does not list', () => {
    const allowed = new Set(ALLOWED.map(([from, event]) => `${from}:${event}`));
    const refused: string[] = [];
    for (const from of ACCOUNT_STATES) {
      for (const event of ACCOUNT_EVENTS) {
        if (allowed.has(`${from}:${event}`)) continue;
        expect(nextAccountState(from, event), `${from} on ${event}`).toBeNull();
        refused.push(`${from}:${event}`);
      }
    }
    expect(refused.length).toBe(ACCOUNT_STATES.length * ACCOUNT_EVENTS.length - ALLOWED.length);
  });

  it('never leaves deleted and never verifies an account twice', () => {
    for (const event of ACCOUNT_EVENTS) expect(nextAccountState('deleted', event)).toBeNull();
    expect(nextAccountState('active', 'emailVerified')).toBeNull();
    expect(nextAccountState('suspended', 'emailVerified')).toBeNull();
  });
});

describe('what each status allows', () => {
  it('lets pending, active and restricted accounts hold a session, and nobody else', () => {
    const holders = ACCOUNT_STATES.filter((state) => mayHoldSession(state));
    expect(holders).toEqual(['pending_verification', 'active', 'restricted']);
  });

  it('treats only a deleted account as unknown', () => {
    expect(ACCOUNT_STATES.filter((state) => isTreatedAsUnknown(state))).toEqual(['deleted']);
  });
});
