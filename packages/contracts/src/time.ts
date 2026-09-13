// Time travels as UTC RFC 3339 strings in contracts; locale formatting only
// happens in packages/i18n formatters (01-conventions.md §4, ARCHITECTURE-
// SPINE.md "Consistency Conventions"). All "now" comes from the `Clock` port
// (packages/application/src/ports/clock.ts) so the demo clock can move time
// — nothing in this file reads the system clock itself.
import { InternalError } from './errors.js';

export type Iso8601 = string & { readonly __brand: 'Iso8601' };

/** UTC, millisecond precision, e.g. `2026-09-13T12:34:56.789Z`. */
export function toIso(d: Date): Iso8601 {
  return d.toISOString() as Iso8601;
}

/** Throws {@link InternalError} when `s` is not a parseable date-time. */
export function fromIso(s: string): Date {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new InternalError(`fromIso: not a valid ISO 8601 date-time: ${s}`);
  }
  return d;
}

/** Returns a new date `n` days after `d` (`n` may be negative). Does not mutate `d`. */
export function addDays(d: Date, n: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

/** Public treatment dates are month/year only (01-conventions.md §4). `month` is 1-12. */
export function monthYear(d: Date): { year: number; month: number } {
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}
