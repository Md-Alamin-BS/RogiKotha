// FD-065. The relay routes `account.registered` to no job and `account.securityEvent` to
// `notification.deliver` only (C15, BR6.4).
import type { EvidenceItemState } from '@rogikotha/domain';

import type { Tx } from './unit-of-work';

/** The kinds T-101 writes; C15 also lists newSignIn and deviceApproved (T-103). */
export const SECURITY_EVENT_KINDS = [
  'passwordChanged',
  'signOutAll',
  'existingEmailRegister',
  'severeSignInActivity',
] as const;
export type SecurityEventKind = (typeof SECURITY_EVENT_KINDS)[number];

/** Event name to payload; later Units add their events here. Payloads hold ids and enums only. */
export type OutboxPayloads = {
  'account.registered': { accountId: string };
  'account.securityEvent': { accountId: string; kind: SecurityEventKind };
  // U46: a member-added doctor (BR5.8) and a provisional term (BR5.3).
  'doctor.changed': { id: string };
  'term.changed': { id: string };
  // U48 (BR4.1, BR4.7): internal ids and the state entered only; never an account id.
  // ASSUMPTION(U48): the plan names no step for these entries; added with the evidence ports.
  'evidence.received': { itemId: string };
  'evidence.stateChanged': { itemId: string; reviewId: string; state: EvidenceItemState };
};

export type OutboxEventName = keyof OutboxPayloads;

export interface Outbox {
  append<N extends OutboxEventName>(tx: Tx, name: N, payload: OutboxPayloads[N]): Promise<void>;
}
