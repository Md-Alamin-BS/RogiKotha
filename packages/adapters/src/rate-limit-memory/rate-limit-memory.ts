// The `RateLimiter` port held in process memory (BR3.12, C5). Keys are HMACs built by the caller;
// time comes from the Clock port so the demo clock and tests drive the windows.
// ASSUMPTION(T-101): state is per process and lost on restart; acceptable for the local demo only.
import type { Clock, RateLimitDecision, RateLimiter, RateLimitKey } from '@rogikotha/application';

interface Entry {
  hits: number[];
  failures: number[];
}

// The longest window any caller uses (signIn.windowMinutes max 1440); entries untouched for longer
// are swept so keys of addresses that never come back do not accumulate.
const RETENTION_MS = 24 * 60 * 60 * 1000;
const SWEEP_EVERY_WRITES = 1000;

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`RateLimiter: ${name} must be a positive integer, got ${value}`);
  }
}

function insideWindow(times: number[], now: number, windowMs: number): number[] {
  return times.filter((time) => time > now - windowMs);
}

export function createMemoryRateLimiter(clock: Clock): RateLimiter {
  const entries = new Map<RateLimitKey, Entry>();
  let writes = 0;

  function entryFor(key: RateLimitKey): Entry {
    let entry = entries.get(key);
    if (!entry) {
      entry = { hits: [], failures: [] };
      entries.set(key, entry);
    }
    return entry;
  }

  function sweep(now: number): void {
    for (const [key, entry] of entries) {
      // Both lists are appended in clock order, so the last element is the newest.
      const newest = Math.max(entry.hits.at(-1) ?? -Infinity, entry.failures.at(-1) ?? -Infinity);
      if (newest <= now - RETENTION_MS) entries.delete(key);
    }
  }

  function noteWrite(now: number): void {
    writes += 1;
    if (writes % SWEEP_EVERY_WRITES === 0) sweep(now);
  }

  return {
    hit(key, limit, windowSec) {
      assertPositiveInteger('limit', limit);
      assertPositiveInteger('windowSec', windowSec);
      const now = clock.now().getTime();
      const windowMs = windowSec * 1000;
      const entry = entryFor(key);
      entry.hits = insideWindow(entry.hits, now, windowMs);
      let decision: RateLimitDecision;
      if (entry.hits.length >= limit) {
        // A refused hit is not counted, so a caller who keeps trying is not locked out for longer.
        const oldest = entry.hits[0] ?? now;
        decision = {
          allowed: false,
          retryAfter: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
        };
      } else {
        entry.hits.push(now);
        decision = { allowed: true };
      }
      noteWrite(now);
      return Promise.resolve(decision);
    },
    failures(key, windowSec) {
      assertPositiveInteger('windowSec', windowSec);
      const entry = entries.get(key);
      if (!entry) return Promise.resolve([]);
      const now = clock.now().getTime();
      entry.failures = insideWindow(entry.failures, now, windowSec * 1000);
      return Promise.resolve(entry.failures.map((time) => new Date(time)));
    },
    recordFailure(key) {
      const now = clock.now().getTime();
      entryFor(key).failures.push(now);
      noteWrite(now);
      return Promise.resolve();
    },
    clear(key) {
      entries.delete(key);
      return Promise.resolve();
    },
  };
}
