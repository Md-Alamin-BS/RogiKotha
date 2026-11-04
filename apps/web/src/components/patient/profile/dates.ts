import type { MonthYear } from '@rogikotha/i18n/format';

// ASSUMPTION(demo-slice): dates on /me are shown in Bangladesh time, where the demo's readers are.
const DHAKA_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `YYYY-MM-DD` of `date` in Asia/Dhaka, the input `formatDate` expects. */
export function dhakaIsoDate(date: Date): string {
  return DHAKA_PARTS.format(date);
}

export function dhakaMonthYear(date: Date): MonthYear {
  const [year, month] = dhakaIsoDate(date).split('-').map(Number);
  return { year: year!, month: month! };
}
