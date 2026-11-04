// `RateLimiter` port fakes. `AlwaysAllowRateLimiter` never refuses; `WindowedRateLimiter` keeps
// sliding windows on a `Clock`, like `adapters/rate-limit-memory`, and records every call so a
// test can prove that a refused sign-in touched nothing else (T-101 BR3.2).
import type { Clock, RateLimitDecision, RateLimiter, RateLimitKey } from '@rogikotha/application';

export class AlwaysAllowRateLimiter implements RateLimiter {
  hit(_key: RateLimitKey, _limit: number, _windowSec: number): Promise<RateLimitDecision> {
    void _key;
    void _limit;
    void _windowSec;
    return Promise.resolve({ allowed: true });
  }

  failures(_key: RateLimitKey, _windowSec: number): Promise<Date[]> {
    void _key;
    void _windowSec;
    return Promise.resolve([]);
  }

  recordFailure(_key: RateLimitKey): Promise<void> {
    void _key;
    return Promise.resolve();
  }

  clear(_key: RateLimitKey): Promise<void> {
    void _key;
    return Promise.resolve();
  }
}

export interface RateLimiterCall {
  method: 'hit' | 'failures' | 'recordFailure' | 'clear';
  key: RateLimitKey;
}

export class WindowedRateLimiter implements RateLimiter {
  readonly calls: RateLimiterCall[] = [];
  private readonly hits = new Map<string, number[]>();
  private readonly failureTimes = new Map<string, number[]>();

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

  failures(key: RateLimitKey, windowSec: number): Promise<Date[]> {
    this.calls.push({ method: 'failures', key });
    const now = this.clock.now().getTime();
    const recent = this.inWindow(this.failureTimes.get(key) ?? [], now, windowSec);
    return Promise.resolve(recent.map((t) => new Date(t)));
  }

  recordFailure(key: RateLimitKey): Promise<void> {
    this.calls.push({ method: 'recordFailure', key });
    const list = this.failureTimes.get(key) ?? [];
    list.push(this.clock.now().getTime());
    this.failureTimes.set(key, list);
    return Promise.resolve();
  }

  clear(key: RateLimitKey): Promise<void> {
    this.calls.push({ method: 'clear', key });
    this.hits.delete(key);
    this.failureTimes.delete(key);
    return Promise.resolve();
  }

  /** Test helper: the keys that have any recorded failure, whatever their age. */
  keysWithFailures(): string[] {
    return [...this.failureTimes.keys()];
  }

  private inWindow(times: number[], now: number, windowSec: number): number[] {
    return times.filter((t) => now - t < windowSec * 1000);
  }
}
