// `RateLimiter` port fakes. `AlwaysAllowRateLimiter` never refuses; `WindowedRateLimiter` keeps
// sliding windows on a `Clock`, like `adapters/rate-limit-memory`, and records every call so a
// test can prove that a refused sign-in touched nothing else (T-101 BR3.2).
import type {
  Clock,
  FailureReservation,
  RateLimitDecision,
  RateLimiter,
  RateLimitKey,
} from '@rogikotha/application';

export class AlwaysAllowRateLimiter implements RateLimiter {
  hit(_key: RateLimitKey, _limit: number, _windowSec: number): Promise<RateLimitDecision> {
    void _key;
    void _limit;
    void _windowSec;
    return Promise.resolve({ allowed: true });
  }

  reserveFailure(_key: RateLimitKey, _windowSec: number): Promise<FailureReservation> {
    void _key;
    void _windowSec;
    return Promise.resolve({ earlier: [], release: () => Promise.resolve() });
  }

  clear(_key: RateLimitKey): Promise<void> {
    void _key;
    return Promise.resolve();
  }
}

export interface RateLimiterCall {
  method: 'hit' | 'reserveFailure' | 'release' | 'clear';
  key: RateLimitKey;
}

interface Failure {
  at: number;
}

export class WindowedRateLimiter implements RateLimiter {
  readonly calls: RateLimiterCall[] = [];
  private readonly hits = new Map<string, number[]>();
  private readonly failureTimes = new Map<string, Failure[]>();

  constructor(private readonly clock: Clock) {}

  hit(key: RateLimitKey, limit: number, windowSec: number): Promise<RateLimitDecision> {
    this.calls.push({ method: 'hit', key });
    const now = this.clock.now().getTime();
    const recent = this.inWindow(this.hits.get(key) ?? [], now, windowSec);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      const oldest = recent[0] ?? now;
      const retryAfter = Math.max(1, Math.ceil((oldest + windowSec * 1000 - now) / 1000));
      return Promise.resolve({ allowed: false, retryAfter });
    }
    this.hits.set(key, [...recent, now]);
    return Promise.resolve({ allowed: true });
  }

  reserveFailure(key: RateLimitKey, windowSec: number): Promise<FailureReservation> {
    this.calls.push({ method: 'reserveFailure', key });
    const now = this.clock.now().getTime();
    const list = (this.failureTimes.get(key) ?? []).filter((f) => now - f.at < windowSec * 1000);
    const earlier = list.map((f) => new Date(f.at));
    const failure: Failure = { at: now };
    list.push(failure);
    this.failureTimes.set(key, list);
    return Promise.resolve({ earlier, release: () => this.release(key, failure) });
  }

  clear(key: RateLimitKey): Promise<void> {
    this.calls.push({ method: 'clear', key });
    this.hits.delete(key);
    this.failureTimes.delete(key);
    return Promise.resolve();
  }

  /** Test helper: the keys that hold any counted failure, whatever their age. */
  keysWithFailures(): string[] {
    return [...this.failureTimes.entries()].filter(([, list]) => list.length > 0).map(([k]) => k);
  }

  /** Test helper: how many failures the key holds, whatever their age. */
  failureCount(key: RateLimitKey): number {
    return this.failureTimes.get(key)?.length ?? 0;
  }

  private release(key: RateLimitKey, failure: Failure): Promise<void> {
    this.calls.push({ method: 'release', key });
    const list = this.failureTimes.get(key);
    const index = list ? list.indexOf(failure) : -1;
    if (list && index >= 0) list.splice(index, 1);
    return Promise.resolve();
  }

  private inWindow(times: number[], now: number, windowSec: number): number[] {
    return times.filter((t) => now - t < windowSec * 1000);
  }
}
