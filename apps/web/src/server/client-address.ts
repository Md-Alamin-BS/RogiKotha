// The one place that reads a request's client address (T-101 § 10.4, BR4.9). The command only
// ever hashes it into a network key; it is never stored or logged.
import type { RequestHeaders } from '@rogikotha/application';

const ADDRESS_MAX = 64;

/**
 * The first `x-forwarded-for` value outside production, else null, which the command turns into
 * the shared `:net:unknown` key.
 * ASSUMPTION(T-101): the production proxy trust rule is T-502's (F15); until it exists, no
 * forwarded header is trusted in production.
 */
export function clientAddressFrom(
  headers: RequestHeaders,
  appMode: string | undefined,
): string | null {
  if (appMode === 'production') return null;
  const first = headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  if (first.length === 0 || first.length > ADDRESS_MAX) return null;
  return first;
}
