// The FD-063 progressive delay as a refusal, never a wait (T-101 BR3.3, § 5.3). Pure: the command
// reads the failures from the RateLimiter port and the settings from the ConfigProvider.
import type { SignInSettings } from '@rogikotha/contracts';

/**
 * Seconds the caller must wait before the next attempt is checked, or null when it may be checked
 * now. With the defaults, after failures 3 to 9 the answers are 1, 2, 4, 8, 16, 30 and 30.
 */
export function signInRefusal(
  failures: readonly Date[],
  now: Date,
  settings: Pick<
    SignInSettings,
    'delayAfterFailures' | 'windowMinutes' | 'firstDelaySeconds' | 'maxDelaySeconds'
  >,
): number | null {
  const windowMs = settings.windowMinutes * 60_000;
  const recent = failures.filter((t) => now.getTime() - t.getTime() < windowMs);
  const n = recent.length;
  if (n < settings.delayAfterFailures) return null;
  const delaySec = Math.min(
    settings.firstDelaySeconds * 2 ** (n - settings.delayAfterFailures),
    settings.maxDelaySeconds,
  );
  const last = Math.max(...recent.map((t) => t.getTime()));
  const waitMs = last + delaySec * 1000 - now.getTime();
  return waitMs > 0 ? Math.max(1, Math.ceil(waitMs / 1000)) : null;
}
