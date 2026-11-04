import type { Locale } from '@rogikotha/i18n';
import { formatDate } from '@rogikotha/i18n/format';

// ASSUMPTION(demo-slice): the calendar day is taken in Bangladesh time, where the readers are, so a
// review published at 01:00 in Dhaka does not show the previous UTC day.
const DHAKA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** "2026-06-01" for the Dhaka calendar day of `date`. */
export function dhakaIsoDay(date: Date): string {
  return DHAKA_DAY.format(date);
}

/** "1 June 2026" / "১ জুন ২০২৬" for a publication timestamp. */
export function formatPublished(date: Date, locale: Locale): string {
  return formatDate(dhakaIsoDay(date), locale);
}
