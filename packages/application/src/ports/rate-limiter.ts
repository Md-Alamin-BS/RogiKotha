// In memory per process in `adapters/rate-limit-memory`, driven by the Clock port (BR3.12, F14).

/**
 * `<scope>:<subject kind>:<subject>`, e.g. `signin:email:<hmac>`, `signin:net:<hmac>`,
 * `register:net:<hmac>`, `resend:account:<accountId>`. Never a raw address or IP (BR3.12).
 * Each limit has its own scope, because one key keeps one window.
 */
export type RateLimitKey = `${string}:${'email' | 'net' | 'account'}:${string}`;

export interface RateLimitDecision {
  allowed: boolean;
  /** Seconds until the next hit would be allowed; present when refused. */
  retryAfter?: number;
}

/** One attempt already counted as a failure, before its password was checked (ISS-453). */
export interface FailureReservation {
  /**
   * The failures counted on the key inside the window before this one, oldest first: recorded
   * failures and attempts still in flight. `earlier.length + 1` is the post-increment count.
   */
  earlier: Date[];
  /** Takes this attempt off the count (it was refused, or it did not fail); idempotent. */
  release(): Promise<void>;
}

export interface RateLimiter {
  /** Counts one hit and decides it: at most `limit` hits per sliding `windowSec`. */
  hit(key: RateLimitKey, limit: number, windowSec: number): Promise<RateLimitDecision>;
  /**
   * Counts one failure and returns what was counted before it, in one step, so parallel attempts
   * cannot all read the same count before any of them records (ISS-453). A failed attempt keeps
   * its reservation; the caller releases it when the attempt is refused or succeeds.
   */
  reserveFailure(key: RateLimitKey, windowSec: number): Promise<FailureReservation>;
  /** Forgets every hit and failure of the key (a successful sign-in, BR3.5). */
  clear(key: RateLimitKey): Promise<void>;
}
