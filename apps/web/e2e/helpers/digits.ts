// BR2.6: numbers are compared across locales through this map; a bn number has no ASCII digit.

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

export function toLatinDigits(text: string): string {
  return text.replace(/[০-৯]/g, (digit) => String(BENGALI_DIGITS.indexOf(digit)));
}

export function toBengaliDigits(text: string): string {
  return text.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)] ?? digit);
}

/** The same grouping `packages/i18n/src/format.ts` formatNumber renders. */
export function formatNumber(value: number, locale: 'bn' | 'en'): string {
  const grouped = new Intl.NumberFormat('en-US').format(value);
  return locale === 'bn' ? toBengaliDigits(grouped) : grouped;
}

export const hasAsciiDigit = (text: string): boolean => /[0-9]/.test(text);
