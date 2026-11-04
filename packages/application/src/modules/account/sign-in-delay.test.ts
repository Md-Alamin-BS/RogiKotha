import { DEFAULT_CONFIG_VALUES } from '@rogikotha/contracts';
import { describe, expect, it } from 'vitest';

import { signInRefusal } from './sign-in-delay';

const NOW = new Date('2026-11-01T09:00:00.000Z');
const defaults = DEFAULT_CONFIG_VALUES.signIn;

/** `n` failures, the latest `ageMs` before NOW and the rest one second apart before it. */
function failuresEndingAgo(n: number, ageMs = 0): Date[] {
  return Array.from({ length: n }, (_, i) => new Date(NOW.getTime() - ageMs - (n - 1 - i) * 1000));
}

describe('the progressive sign-in delay', () => {
  it('refuses after failures 3 to 9 with 1, 2, 4, 8, 16, 30 and 30 seconds (FD-063)', () => {
    const answers = [3, 4, 5, 6, 7, 8, 9].map((n) =>
      signInRefusal(failuresEndingAgo(n), NOW, defaults),
    );

    expect(answers).toEqual([1, 2, 4, 8, 16, 30, 30]);
  });

  it('lets an attempt through below the threshold', () => {
    expect(signInRefusal(failuresEndingAgo(2), NOW, defaults)).toBeNull();
  });

  it('lets an attempt through once the delay since the latest failure has passed', () => {
    expect(signInRefusal(failuresEndingAgo(5, 4_000), NOW, defaults)).toBeNull();
    expect(signInRefusal(failuresEndingAgo(5, 3_500), NOW, defaults)).toBe(1);
  });

  it('forgets failures older than the window', () => {
    const old = failuresEndingAgo(5, 15 * 60_000);

    expect(signInRefusal(old, NOW, defaults)).toBeNull();
  });

  it('follows other settings: threshold 5 and a 10 second cap', () => {
    const settings = { ...defaults, delayAfterFailures: 5, maxDelaySeconds: 10 };

    expect(signInRefusal(failuresEndingAgo(4), NOW, settings)).toBeNull();
    expect(signInRefusal(failuresEndingAgo(5), NOW, settings)).toBe(1);
    expect(signInRefusal(failuresEndingAgo(9), NOW, settings)).toBe(10);
  });
});
