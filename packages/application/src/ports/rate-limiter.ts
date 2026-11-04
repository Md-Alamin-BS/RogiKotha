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

export interface RateLimiter {
  /** Counts one hit and decides it: at most `limit` hits per sliding `windowSec`. */
  hit(key: RateLimitKey, limit: number, windowSec: number): Promise<RateLimitDecision>;
  /** Failure times inside the last `windowSec`, oldest first. */
  failures(key: RateLimitKey, windowSec: number): Promise<Date[]>;
  recordFailure(key: RateLimitKey): Promise<void>;
  /** Forgets every hit and failure of the key (a successful sign-in, BR3.5). */
  clear(key: RateLimitKey): Promise<void>;
}
