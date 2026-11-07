// The composer's pattern checks (BR8.4, FD-009): advisory only, never a classifier, never a block.
import type { ConfigValues, DraftPayload } from '@rogikotha/contracts';

export type SafetyFinding = 'pii' | 'emerg';

const DIGIT = '[0-9০-৯]';
const SEP = '[\\s-]*';
const NOT_DIGIT_BEFORE = `(?<!${DIGIT})`;
const NOT_DIGIT_AFTER = `(?!${DIGIT})`;

// A Bangladeshi mobile number: `+880` or `0`, then `1` and nine digits, in Latin or Bengali
// digits, with spaces or dashes anywhere between them. The digit fences keep a year or a longer
// record number from matching.
const PHONE_RE = new RegExp(
  `${NOT_DIGIT_BEFORE}(?:\\+?${SEP}[8৮]${SEP}[8৮]${SEP}[0০]|[0০])${SEP}[1১]` +
    `(?:${SEP}${DIGIT}){9}${NOT_DIGIT_AFTER}`,
  'u',
);

// The prototype's emergency words (`safetyChecks`, app.js), in both languages.
const EMERGENCY_WORDS_RE = /emergency|chest pain now|ambulance|জরুরি|অ্যাম্বুলেন্স/iu;

/** Bengali digits to Latin, so one pattern serves both scripts. */
function latinDigits(text: string): string {
  return text.replace(/[০-৯]/gu, (d) => String(d.charCodeAt(0) - 0x09e6));
}

function numberPattern(configured: string): RegExp | null {
  const digits = latinDigits(configured).replace(/[^0-9]/g, '');
  if (digits === '') return null;
  return new RegExp(`(?<![0-9])${digits.split('').join(SEP)}(?![0-9])`, 'u');
}

export function hasPhoneNumber(text: string): boolean {
  return PHONE_RE.test(text);
}

/** An emergency word, or one of the configured emergency numbers written as a number of its own. */
export function hasEmergencyMention(text: string, numbers: ConfigValues['emergency']): boolean {
  if (EMERGENCY_WORDS_RE.test(text)) return true;
  const latin = latinDigits(text);
  return [numbers.ambulance, numbers.healthLine, numbers.crisisLine].some(
    (n) => numberPattern(n)?.test(latin) ?? false,
  );
}

/** The author's free text in the draft: the title, the story and the detailed sections. */
export function draftTexts(payload: DraftPayload): string[] {
  const sections = payload.sections ?? {};
  return [
    payload.title,
    payload.story,
    sections.symptoms,
    sections.diagnosis,
    sections.treatment,
    sections.after,
  ].filter((t): t is string => t !== undefined && t !== '');
}

/** The findings for these texts, `pii` before `emerg`; dismissal is the caller's choice. */
export function safetyFindings(
  texts: readonly string[],
  numbers: ConfigValues['emergency'],
): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  if (texts.some(hasPhoneNumber)) findings.push('pii');
  if (texts.some((t) => hasEmergencyMention(t, numbers))) findings.push('emerg');
  return findings;
}
