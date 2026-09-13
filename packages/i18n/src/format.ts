import type { Locale } from './routing';

/**
 * Bengali digits, so numerals do not stay Latin in a Bangla interface.
 * Matches ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js
 * bn(n), line ~67-71: `String(n).replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d])`.
 */
const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

function toBengaliDigits(input: string): string {
  return input.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] as string);
}

/**
 * Renders a number for the given locale.
 *
 * The prototype's own `bn(n)` helper (app.js line ~67) is simpler than this:
 * it is `String(n)` with digits swapped, with no thousands grouping at all —
 * confirmed by reading every call site, none of which ever passes a value
 * >= 1000 (review/account counts, minutes, hours, days). This function adds
 * `Intl.NumberFormat('en-US')` grouping before the digit swap so counts at a
 * scale the demo never reaches (e.g. a real facility with 1,234 reviews)
 * still render sensibly.
 * // ASSUMPTION(T-006): thousands grouping is new behaviour beyond the demo
 * // prototype's bn(); it produces byte-identical output to the prototype
 * // for every value actually seen in ui-design-prototype (all < 1000).
 * // Bengali locale keeps the Latin ',' grouping separator (digit
 * // substitution only touches 0-9); Bangladesh's lakh/crore grouping is not
 * // implemented since the prototype gives no evidence either way. See
 * // docs/implementation/ISSUES.md.
 */
export function formatNumber(n: number, locale: Locale): string {
  const grouped = new Intl.NumberFormat('en-US').format(n);
  return locale === 'bn' ? toBengaliDigits(grouped) : grouped;
}

/**
 * // ASSUMPTION(T-207a): added — outside this task's owned paths
 * // (`packages/i18n/src`), but T-207's step 1 requires digit-only Bengali
 * // rendering of literal config strings (phone numbers) that `formatNumber`
 * // cannot handle: `formatNumber` coerces its input to a `number` and adds
 * // Intl thousands grouping, which would insert a comma into "16263" and
 * // cannot represent "09612-119911" (leading zero, embedded hyphen) at all.
 * // This substitutes digit characters only, leaving every other character
 * // (the hyphen) untouched — same substitution `formatNumber` already does
 * // internally, exposed for values that are not really numbers. See
 * // docs/implementation/ISSUES.md.
 */
export function formatDigits(input: string, locale: Locale): string {
  return locale === 'bn' ? toBengaliDigits(input) : input;
}

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * Bengali month names, verified to match every `period.bn` value in
 * ui-design-prototype/shared/rogikotha-data.js (e.g. 'মার্চ ২০২৬' for
 * 'March 2026') and Intl.DateTimeFormat('bn', { month: 'long' }).
 */
const MONTHS_BN = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
] as const;

export interface MonthYear {
  year: number;
  /** 1-12 */
  month: number;
}

/**
 * // ASSUMPTION(T-207a): added — outside this task's owned paths
 * // (`packages/i18n/src`). `01-conventions.md` §9 only names
 * // `formatMonthYear` (month/year only, for review/treatment dates); T-207
 * // step 1 explicitly names a day-level `formatDate` for
 * // `ConfigValues.emergency.lastVerified`, which the prototype always
 * // showed with a day ("21 August 2026" / "২১ আগস্ট ২০২৬") — this is
 * // operational config metadata, not review content, so the month/year-only
 * // rule's privacy rationale does not apply. Narrower, reversible: added
 * // one function, reusing the existing month-name tables and digit
 * // substitution rather than introducing a new date library. See
 * // docs/implementation/ISSUES.md.
 */
export function formatDate(isoDate: string, locale: Locale): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new RangeError(`formatDate: expected an ISO "YYYY-MM-DD" date, got "${isoDate}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) {
    throw new RangeError(`formatDate: month must be 1-12, got ${month}`);
  }
  const monthName = locale === 'bn' ? MONTHS_BN[month - 1] : MONTHS_EN[month - 1];
  const dayStr = locale === 'bn' ? toBengaliDigits(String(day)) : String(day);
  const yearStr = locale === 'bn' ? toBengaliDigits(String(year)) : String(year);
  return `${dayStr} ${monthName} ${yearStr}`;
}

/**
 * "March 2026" / "মার্চ ২০২৬" — matches the prototype's `period`/`posted`
 * fields exactly (docs/implementation/tasks/T-006-i18n.md step 8).
 */
export function formatMonthYear({ year, month }: MonthYear, locale: Locale): string {
  if (month < 1 || month > 12) {
    throw new RangeError(`formatMonthYear: month must be 1-12, got ${month}`);
  }
  const monthName = locale === 'bn' ? MONTHS_BN[month - 1] : MONTHS_EN[month - 1];
  // A year is never thousands-grouped ("2026", not "2,026") — digit
  // substitution only, matching the prototype's period.bn values exactly.
  const yearStr = locale === 'bn' ? toBengaliDigits(String(year)) : String(year);
  return `${monthName} ${yearStr}`;
}

/**
 * Fixed "ago" suffix, matching the value of the `admin.timeline.timeAgo`
 * message key (packages/i18n/messages/{en,bn}.json). Duplicated here on
 * purpose: format.ts has no access to next-intl's loaded messages (it is a
 * plain formatting module, not a React/server component), and this word is
 * a stable, non-review-sensitive UI constant.
 * // ASSUMPTION(T-006): kept in sync by hand with admin.timeline.timeAgo;
 * // see docs/implementation/ISSUES.md for the coupling risk.
 */
const AGO = { en: 'ago', bn: 'আগে' } as const;

/**
 * Relative time, generalising the prototype's `relTime(min)`
 * (ui-design-prototype/admin/app.js line ~899-905): minutes for under an
 * hour, then hours, then days — using Bengali digits for `bn`.
 *
 * // ASSUMPTION(T-006): the prototype's relTime() spells out unit words for
 * // hours/days ("h"/"d", Latin letters even in the Bengali render) but has
 * // NO unit word at all for the under-an-hour case (just "{n} ago"). This
 * // function spells out "minute(s)"/"hour(s)"/"day(s)" in English and
 * // "মিনিট"/"ঘণ্টা"/"দিন" in Bengali for all three buckets, since the
 * // task's own test ("formatRelative says 12 minutes ago in both locales")
 * // requires the unit word the prototype omits. Logged as an S4 issue.
 */
export function formatRelative(from: Date, to: Date, locale: Locale): string {
  const minutes = Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60000));
  const ago = AGO[locale];

  if (minutes < 60) {
    const unit = locale === 'bn' ? 'মিনিট' : minutes === 1 ? 'minute' : 'minutes';
    return `${formatNumber(minutes, locale)} ${unit} ${ago}`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const unit = locale === 'bn' ? 'ঘণ্টা' : hours === 1 ? 'hour' : 'hours';
    return `${formatNumber(hours, locale)} ${unit} ${ago}`;
  }

  const days = Math.floor(hours / 24);
  const unit = locale === 'bn' ? 'দিন' : days === 1 ? 'day' : 'days';
  return `${formatNumber(days, locale)} ${unit} ${ago}`;
}

export interface CountParams {
  count: string;
  total: string;
}

/**
 * Localised digit strings for a "{count} of {total}" style message. Text
 * comes from an i18n key (the `sentiment.of` pattern); this only produces
 * the two localised numeral params.
 */
export function countParams(count: number, total: number, locale: Locale): CountParams {
  return { count: formatNumber(count, locale), total: formatNumber(total, locale) };
}
