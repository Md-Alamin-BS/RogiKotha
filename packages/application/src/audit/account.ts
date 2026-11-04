// One typed builder per `account:<id>` audit action (T-101 entities.md AuditEvent, BR8.2). A
// builder takes only the fields its action may record, so no email, token, link, password, IP or
// user agent can reach `audit_events`; the result is checked against the allowlist once more.
import type { AccountAuditAction } from '../modules/account/types';
import type { AuditActor, AuditDetails, AuditEntry } from '../ports';
import { assertAuditDetails } from './allowlist';

/** The keys each action may carry; the database writer checks against the same lists. */
export const ACCOUNT_AUDIT_DETAIL_KEYS: Readonly<Record<AccountAuditAction, readonly string[]>> = {
  registered: ['locale'],
  existing_email_register: [],
  email_verified: ['via'],
  signed_out: [],
  signed_out_everywhere: ['revoked'],
  password_reset: [],
  password_changed: [],
  severe_sign_in_activity: ['failures'],
  preferences_updated: ['fields'],
  feedback_submitted: ['feedbackId'],
};

function entry(
  accountId: string,
  action: AccountAuditAction,
  actor: AuditActor,
  details: AuditDetails = {},
): AuditEntry {
  assertAuditDetails(details, ACCOUNT_AUDIT_DETAIL_KEYS[action]);
  // The stream names the account; `TargetKind` has no account kind, so no target is set.
  return { stream: `account:${accountId}`, action, actor, details };
}

const self = (accountId: string): AuditActor => `account:${accountId}`;

export const accountAudit = {
  registered: (accountId: string, locale: string) =>
    entry(accountId, 'registered', 'anonymous', { locale }),
  existingEmailRegister: (accountId: string) =>
    entry(accountId, 'existing_email_register', 'anonymous'),
  /** `link` from the verification email, `reset` from a completed reset (BR5.4). */
  emailVerified: (accountId: string, via: 'link' | 'reset') =>
    entry(accountId, 'email_verified', 'anonymous', { via }),
  signedOut: (accountId: string) => entry(accountId, 'signed_out', self(accountId)),
  signedOutEverywhere: (accountId: string, revoked: number) =>
    entry(accountId, 'signed_out_everywhere', self(accountId), { revoked }),
  passwordReset: (accountId: string) => entry(accountId, 'password_reset', 'anonymous'),
  passwordChanged: (accountId: string) => entry(accountId, 'password_changed', self(accountId)),
  severeSignInActivity: (accountId: string, failures: number) =>
    entry(accountId, 'severe_sign_in_activity', 'anonymous', { failures }),
  /** Field names only, never their values. */
  preferencesUpdated: (accountId: string, fields: readonly string[]) =>
    entry(accountId, 'preferences_updated', self(accountId), { fields: [...fields] }),
  /** The row id only: the body is never audited (BR11.2). */
  feedbackSubmitted: (accountId: string, feedbackId: string) =>
    entry(accountId, 'feedback_submitted', self(accountId), { feedbackId }),
};
