// Input and output types of every account command and query (T-101 functional-spec § 6.1). Types
// only; the commands live one per file in `commands/`, the queries in `queries/`.
//
// Exported names the application developer creates (01-conventions naming):
//   commands/register.ts                    registerCommand                 account.register
//   commands/verify-email.ts                verifyEmailCommand              account.verifyEmail
//   commands/resend-verification.ts         resendVerificationCommand       account.resendVerification
//   commands/resend-own-verification.ts     resendOwnVerificationCommand    account.resendOwnVerification
//   commands/sign-in.ts                     signInCommand                   account.signIn
//   commands/sign-out.ts                    signOutCommand                  account.signOut
//   commands/sign-out-everywhere.ts         signOutEverywhereCommand        account.signOutEverywhere
//   commands/request-password-reset.ts      requestPasswordResetCommand     account.requestPasswordReset
//   commands/reset-password.ts              resetPasswordCommand            account.resetPassword
//   commands/change-password.ts             changePasswordCommand           account.changePassword
//   commands/update-preferences.ts          updatePreferencesCommand        account.updatePreferences
//   commands/submit-feedback.ts             submitFeedbackCommand           account.submitFeedback
//   queries/list-sessions.ts                listSessionsQuery               account.listSessions
//   queries/get-own-account.ts              getOwnAccountQuery              account.getOwnAccount
//   resolve-actor.ts                        resolveActor (pure function, BR4.3)
//   sign-in-delay.ts                        signInRefusal (pure function, BR3.3)
//   recipient-directory.ts                  createRecipientDirectory (implements RecipientDirectory)
// And in modules/notification: internal/queue-email.ts queueEmail, send-email-delivery.ts
// sendEmailDelivery (the worker's use case, exported through `@rogikotha/application/worker`).
import type {
  AccountStatus,
  Actor,
  ChangePasswordInput,
  GetOwnAccountInput,
  ListSessionsInput,
  Locale,
  OwnAccountVM,
  RegisterInput,
  RequestPasswordResetInput,
  ResendOwnVerificationInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SessionVM,
  SignInInput,
  SignOutEverywhereInput,
  SignOutInput,
  SubmitFeedbackInput,
  UpdatePreferencesInput,
  VerifyEmailInput,
} from '@rogikotha/contracts';
import type { AccountState } from '@rogikotha/domain';

import type { AccountProfileRecord, AuthSessionInfo, SetCookieHeaders } from '../../ports';

export type {
  ChangePasswordInput,
  GetOwnAccountInput,
  ListSessionsInput,
  RegisterInput,
  RequestPasswordResetInput,
  ResendOwnVerificationInput,
  ResendVerificationInput,
  ResetPasswordInput,
  SignInInput,
  SignOutEverywhereInput,
  SignOutInput,
  SubmitFeedbackInput,
  UpdatePreferencesInput,
  VerifyEmailInput,
};

type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
/** Fails to compile if the domain status list drifts from `ACCOUNT_STATUSES` in contracts. */
export type AccountStatesMatchContracts = Assert<Same<AccountState, AccountStatus>>;

/** The neutral `{}` of commands that must not reveal whether an address exists. */
export type EmptyOutput = Record<never, never>;

/**
 * What the server action does with the session cookie. `set` carries the library's `Set-Cookie`
 * values; the action applies them and drops this field before anything reaches the browser.
 */
export type SessionCookieEffect =
  { kind: 'set'; setCookies: SetCookieHeaders } | { kind: 'clear' } | { kind: 'none' };

/** Also returned, with a fresh id that is never stored, for an existing email (BR1.4). */
export interface RegisterOutput {
  accountId: string;
}

/** `none` when the account was verified but its status allows no session (BR2.2). */
export interface VerifyEmailOutput {
  session: SessionCookieEffect;
}

export type ResendVerificationOutput = EmptyOutput;
export type ResendOwnVerificationOutput = EmptyOutput;

export interface SignInOutput {
  session: Extract<SessionCookieEffect, { kind: 'set' }>;
}

export interface SignOutOutput {
  session: Extract<SessionCookieEffect, { kind: 'clear' }>;
}

export interface SignOutEverywhereOutput {
  revoked: number;
  session: Extract<SessionCookieEffect, { kind: 'clear' }>;
}

export type RequestPasswordResetOutput = EmptyOutput;

/** Every session is revoked, so the action clears the cookie and sends the holder to sign in. */
export interface ResetPasswordOutput {
  session: Extract<SessionCookieEffect, { kind: 'clear' }>;
}

/** The library re-issues the current session after revoking the others. */
export interface ChangePasswordOutput {
  session: Extract<SessionCookieEffect, { kind: 'set' }>;
}

/** Live sessions inside the 30-day cap, newest first (BR4.7). */
export type ListSessionsOutput = SessionVM[];

export type UpdatePreferencesOutput = EmptyOutput;
export type SubmitFeedbackOutput = EmptyOutput;

/** The only result carrying any form of an address: the holder's own, masked (FD-096). */
export type GetOwnAccountOutput = OwnAccountVM;

/** What `getActor` in `apps/web/src/server/auth.ts` gathers for the pure `resolveActor`. */
export interface ResolveActorInput {
  session: AuthSessionInfo | null;
  /** The profile of `session.authUserId`; null when there is no session or no profile. */
  profile: AccountProfileRecord | null;
  locale: Locale;
  correlationId: string;
  now: Date;
  /** Session lifetime cap from creation, 30 days (BR4.1). */
  maxSessionAgeMs: number;
}

export interface ResolveActorOutput {
  actor: Actor;
  /** True when the session passed the 30-day cap: `getActor` revokes it. */
  revokeSession: boolean;
  /** A session without a profile: `getActor` logs `auth.profile_missing`. */
  profileMissing: boolean;
}

/** Audit actions of the `account:<id>` stream written by T-101 (entities.md AuditEvent). */
export type AccountAuditAction =
  | 'registered'
  | 'existing_email_register'
  | 'email_verified'
  | 'signed_out'
  | 'signed_out_everywhere'
  | 'password_reset'
  | 'password_changed'
  | 'severe_sign_in_activity'
  | 'preferences_updated'
  | 'feedback_submitted';
