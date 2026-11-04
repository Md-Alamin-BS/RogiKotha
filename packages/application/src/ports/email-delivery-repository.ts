// The email-delivery methods of `packages/database/src/repositories/notification.ts` (BR6.1,
// BR6.3, BR6.8). Used by `queueEmail` in the web tier and by `sendEmailDelivery` in the worker.
import type { Locale } from '@rogikotha/contracts';

import type { Tx } from './unit-of-work';

/** The categories T-101 writes; the column allows more (moderation, evidence, ...). */
export type EmailCategory = 'verification' | 'reset' | 'security';

export const T101_EMAIL_MESSAGE_KEYS = [
  'email.verify',
  'email.reset',
  'email.existing',
  'email.security.passwordChanged',
  'email.security.severeSignInActivity',
] as const;
export type EmailMessageKey = (typeof T101_EMAIL_MESSAGE_KEYS)[number];

export type EmailDeliveryStatus = 'queued' | 'sent' | 'failed' | 'suppressed';

export type EmailDeliveryErrorCode =
  | 'smtp_unavailable'
  | 'smtp_rejected'
  | 'smtp_timeout'
  | 'decrypt_failed'
  | 'template_missing'
  | 'params_invalid';

/** Every T-101 message key allows `{link}` only (BR6.2). */
export type EmailParams = Readonly<Record<string, string>>;

export interface NewEmailDelivery {
  id: string;
  accountId: string;
  /** Under the mail-only key (FD-095). */
  toEmailEnc: Uint8Array;
  locale: Locale;
  category: EmailCategory;
  messageKey: EmailMessageKey;
  params: EmailParams;
  dedupeKey: string | null;
}

export interface EmailDeliveryRecord extends NewEmailDelivery {
  status: EmailDeliveryStatus;
  attempts: number;
  lastErrorCode: EmailDeliveryErrorCode | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface EmailDeliveryRepository {
  insert(tx: Tx, row: NewEmailDelivery): Promise<void>;
  findById(tx: Tx, id: string): Promise<EmailDeliveryRecord | null>;
  findByDedupeKey(tx: Tx, dedupeKey: string): Promise<{ id: string } | null>;
  /** The newest delivery of `messageKey` to the account created at or after `since` (BR3.9). */
  findRecent(
    tx: Tx,
    query: { accountId: string; messageKey: EmailMessageKey; since: Date },
  ): Promise<{ id: string; createdAt: Date } | null>;
  /** A failed try that may be retried: `attempts + 1`, `last_error_code`; returns the new count. */
  recordAttempt(
    tx: Tx,
    id: string,
    errorCode: EmailDeliveryErrorCode,
  ): Promise<{ attempts: number }>;
  /** `sent`, `sent_at`, `attempts + 1`, params cleared. */
  markSent(tx: Tx, id: string, sentAt: Date): Promise<void>;
  /** `failed`, `last_error_code`, params cleared. */
  markFailed(tx: Tx, id: string, errorCode: EmailDeliveryErrorCode): Promise<void>;
}
