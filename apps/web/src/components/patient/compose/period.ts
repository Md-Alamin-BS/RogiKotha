import type { Locale } from '@rogikotha/contracts';
import { formatMonthYear } from '@rogikotha/i18n/format';

export interface PeriodOption {
  /** "YYYY-MM", the value `server/actions/review.ts` parses. */
  value: string;
  label: string;
}

// ASSUMPTION(demo-slice): the composer offers the last ten years; the server accepts any month from
// 2000 to now, so an older treatment can still be added later without a schema change.
const YEARS_OFFERED = 10;

export function periodValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Months from now back to January ten years ago, newest first, labelled in the active language. */
export function periodOptions(now: Date, locale: Locale): PeriodOption[] {
  const options: PeriodOption[] = [];
  const firstYear = now.getUTCFullYear() - YEARS_OFFERED;
  for (let year = now.getUTCFullYear(); year >= firstYear; year--) {
    const lastMonth = year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;
    for (let month = lastMonth; month >= 1; month--) {
      options.push({
        value: periodValue(year, month),
        label: formatMonthYear({ year, month }, locale),
      });
    }
  }
  return options;
}
