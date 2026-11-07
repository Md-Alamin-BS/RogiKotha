// How a doctor name typed by a member is compared with the directory (FD-100). The pattern is
// written so that JavaScript (flags `iu`) and PostgreSQL's regexp_replace (flag `i`) read it alike.

/** "Prof.", "Dr." or "Dr " and "ডাঃ" / "ডা." / "ডা:" in front of a name, with following spaces. */
export const DOCTOR_TITLE_PATTERN = String.raw`^\s*(prof\.?\s+)?(dr\.\s*|dr\s+|ডাঃ\s*|ডা[.:]\s*)`;

const TITLE = new RegExp(DOCTOR_TITLE_PATTERN, 'iu');
const CONTROL_OR_FORMAT = /[\p{Cc}\p{Cf}]/u;

/** The comparison key: no title, NFC, lower case, no whitespace. */
export function doctorNameKey(name: string): string {
  return name.normalize('NFC').replace(TITLE, '').toLowerCase().replace(/\s+/g, '');
}

/** True when the text holds a control or invisible format character (zero-width, bidi, NUL). */
export function hasControlOrFormat(text: string): boolean {
  return CONTROL_OR_FORMAT.test(text);
}

// Every Cc and Cf character except ZWNJ (U+200C) and ZWJ (U+200D): Bengali spelling needs them
// (ra with ya-phala) and Bengali keyboards insert them (FD-114). Bidi controls stay refused.
const CONTROL_OR_FORMAT_EXCEPT_JOINERS = /(?![\u{200C}\u{200D}])[\p{Cc}\p{Cf}]/u;

/**
 * Like `hasControlOrFormat`, but allows the two joiners of written Bengali (FD-114); with
 * `lineBreaks`, also the `\n`, `\r` and `\t` a textarea produces (FD-115).
 */
export function hasControlOrFormatExceptJoiners(
  text: string,
  { lineBreaks = false }: { lineBreaks?: boolean } = {},
): boolean {
  return CONTROL_OR_FORMAT_EXCEPT_JOINERS.test(lineBreaks ? text.replace(/[\n\r\t]/g, '') : text);
}

/** Letters left once the title is removed; a usable name has at least three. */
export function doctorNameLetterCount(name: string): number {
  return name.normalize('NFC').replace(TITLE, '').match(/\p{L}/gu)?.length ?? 0;
}
