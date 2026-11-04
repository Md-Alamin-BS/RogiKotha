// FD-065. The relay routes `account.registered` to no job and `account.securityEvent` to
// `notification.deliver` only (C15, BR6.4).
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
};

export type OutboxEventName = keyof OutboxPayloads;

export interface Outbox {
  append<N extends OutboxEventName>(tx: Tx, name: N, payload: OutboxPayloads[N]): Promise<void>;
}
