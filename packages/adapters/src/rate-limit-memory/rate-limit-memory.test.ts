import { describe, expect, it } from 'vitest';

import type { Clock, RateLimitKey } from '@rogikotha/application';

import { createMemoryRateLimiter } from './rate-limit-memory';

interface ManualClock extends Clock {
  advanceSeconds(seconds: number): void;
}

function buildClock(start = Date.parse('2026-11-01T08:00:00.000Z')): ManualClock {
  let current = start;
  return {
    now: () => new Date(current),
    advanceSeconds(seconds) {
      current += seconds * 1000;
    },
  };
}

const EMAIL_KEY: RateLimitKey = 'signin:email:0a1b2c';
const NET_KEY: RateLimitKey = 'signin:net:3d4e5f';

describe('createMemoryRateLimiter hit', () => {
  it('allows up to the limit inside the window, then refuses with the seconds to wait', async () => {
    const clock = buildClock();
    const limiter = createMemoryRateLimiter(clock);

    const allowed = [];
    for (let i = 0; i < 3; i += 1) {
      allowed.push((await limiter.hit(NET_KEY, 3, 60)).allowed);
      clock.advanceSeconds(10);
    }
    const refused = await limiter.hit(NET_KEY, 3, 60);

    expect(allowed).toEqual([true, true, true]);
    expect(refused).toEqual({ allowed: false, retryAfter: 30 });
  });

  it('allows again once the oldest hit has left the sliding window', async () => {
    const clock = buildClock();
    const limiter = createMemoryRateLimiter(clock);
    await limiter.hit(NET_KEY, 1, 60);

    clock.advanceSeconds(59);
    const stillRefused = await limiter.hit(NET_KEY, 1, 60);
    clock.advanceSeconds(1);
    const allowedAgain = await limiter.hit(NET_KEY, 1, 60);

    expect(stillRefused).toEqual({ allowed: false, retryAfter: 1 });
    expect(allowedAgain).toEqual({ allowed: true });
  });

  it('does not count refused hits, so retrying does not extend the wait', async () => {
    const clock = buildClock();
    const limiter = createMemoryRateLimiter(clock);
    await limiter.hit(NET_KEY, 1, 60);
    for (let i = 0; i < 5; i += 1) {
      clock.advanceSeconds(10);
      await limiter.hit(NET_KEY, 1, 60);
    }

    clock.advanceSeconds(10);

    await expect(limiter.hit(NET_KEY, 1, 60)).resolves.toEqual({ allowed: true });
  });

  it('keeps each key separate', async () => {
    const limiter = createMemoryRateLimiter(buildClock());
    await limiter.hit(NET_KEY, 1, 60);

    await expect(limiter.hit(EMAIL_KEY, 1, 60)).resolves.toEqual({ allowed: true });
    await expect(limiter.hit(NET_KEY, 1, 60)).resolves.toMatchObject({ allowed: false });
  });

  it('refuses a limit or window that is not a positive integer', () => {
    const limiter = createMemoryRateLimiter(buildClock());

    expect(() => limiter.hit(NET_KEY, 0, 60)).toThrow(/limit/);
    expect(() => limiter.hit(NET_KEY, 1, 1.5)).toThrow(/windowSec/);
    expect(() => limiter.failures(NET_KEY, -1)).toThrow(/windowSec/);
  });
});

describe('createMemoryRateLimiter failures', () => {
  it('returns the failures inside the window, oldest first', async () => {
    const clock = buildClock();
    const limiter = createMemoryRateLimiter(clock);
    await limiter.recordFailure(EMAIL_KEY);
    clock.advanceSeconds(600);
    await limiter.recordFailure(EMAIL_KEY);
    clock.advanceSeconds(400);
    await limiter.recordFailure(EMAIL_KEY);

    const failures = await limiter.failures(EMAIL_KEY, 900);

    expect(failures.map((time) => time.toISOString())).toEqual([
      '2026-11-01T08:10:00.000Z',
      '2026-11-01T08:16:40.000Z',
    ]);
  });

  it('returns no failures for a key it has never seen', async () => {
    const limiter = createMemoryRateLimiter(buildClock());

    await expect(limiter.failures(EMAIL_KEY, 900)).resolves.toEqual([]);
  });

  it('forgets the hits and failures of a cleared key only', async () => {
    const limiter = createMemoryRateLimiter(buildClock());
    await limiter.recordFailure(EMAIL_KEY);
    await limiter.recordFailure(NET_KEY);
    await limiter.hit(EMAIL_KEY, 1, 60);

    await limiter.clear(EMAIL_KEY);

    await expect(limiter.failures(EMAIL_KEY, 900)).resolves.toEqual([]);
    await expect(limiter.hit(EMAIL_KEY, 1, 60)).resolves.toEqual({ allowed: true });
    await expect(limiter.failures(NET_KEY, 900)).resolves.toHaveLength(1);
  });

  it('sweeps keys untouched for a day while keeping recent ones', async () => {
    const clock = buildClock();
    const limiter = createMemoryRateLimiter(clock);
    await limiter.recordFailure(EMAIL_KEY);
    clock.advanceSeconds(24 * 60 * 60);
    await limiter.recordFailure(NET_KEY);

    for (let i = 0; i < 1000; i += 1) await limiter.hit(`bulk:account:${i}`, 1, 60);

    // A swept key reads as empty even with a window that would still reach its failure.
    await expect(limiter.failures(EMAIL_KEY, 2 * 24 * 60 * 60)).resolves.toEqual([]);
    await expect(limiter.failures(NET_KEY, 2 * 24 * 60 * 60)).resolves.toHaveLength(1);
  });
});
