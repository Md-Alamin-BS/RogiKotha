// Rate-limit keys and fixed limits of the account commands (03 §4, C5, T-101 BR1.2, BR2.4, BR3.2,
// BR5.1, BR5.3, BR11.2, review points 2 and 4). Keys hold keyed hashes, never a raw address or IP
// (BR3.12); one scope per limit, because one key keeps one window.
import { err, type Result } from '@rogikotha/contracts';

import type { Crypto, RateLimitKey } from '../../ports';

const HOUR_SEC = 60 * 60;

export const REGISTER_NETWORK_LIMIT = { limit: 5, windowSec: HOUR_SEC } as const;
export const RESEND_EMAIL_LIMIT = { limit: 3, windowSec: HOUR_SEC } as const;
export const RESEND_OWN_LIMIT = { limit: 3, windowSec: HOUR_SEC } as const;
export const RESET_EMAIL_LIMIT = { limit: 3, windowSec: HOUR_SEC } as const;
/**
 * Review point 4: mail sent to addresses typed by anonymous callers, per network. Resend, reset
 * request and the register existing-email notice share one counter, so mixing them gains nothing.
 */
export const MAIL_NETWORK_LIMIT = { limit: 10, windowSec: HOUR_SEC } as const;
export const MAIL_NETWORK_SCOPE = 'mail';
/** C5 fixed limits; both count inside `signIn.windowMinutes` (review point 2). */
export const SIGN_IN_NETWORK_FAILURES = 30;
export const SIGN_IN_EMAIL_FAILURES = 10;
export const CHANGE_PASSWORD_FAILURES = { limit: 5, windowSec: 15 * 60 } as const;
export const FEEDBACK_LIMIT = { limit: 5, windowSec: 24 * HOUR_SEC } as const;

export function emailKey(crypto: Crypto, scope: string, normalisedEmail: string): RateLimitKey {
  return `${scope}:email:${crypto.hmac('email-key', normalisedEmail)}`;
}

/** With no client address every such request shares one key (BR4.9). */
export function networkKey(
  crypto: Crypto,
  scope: string,
  clientAddress: string | null,
): RateLimitKey {
  if (clientAddress === null || clientAddress.trim() === '') return `${scope}:net:unknown`;
  return `${scope}:net:${crypto.hmac('network-key', clientAddress.trim())}`;
}

export function accountKey(scope: string, accountId: string): RateLimitKey {
  return `${scope}:account:${accountId}`;
}

/** Seconds until the oldest counted event leaves the window, at least 1. */
export function secondsUntilWindowFrees(oldest: Date, windowSec: number, now: Date): number {
  return Math.max(1, Math.ceil((oldest.getTime() + windowSec * 1000 - now.getTime()) / 1000));
}

export function rateLimited(
  correlationId: string,
  retryAfterSec: number,
  code: 'auth.rate_limited' | 'rate_limited' = 'auth.rate_limited',
): Result<never> {
  return err(code, { correlationId, retryAfterSec: Math.max(1, Math.ceil(retryAfterSec)) });
}
