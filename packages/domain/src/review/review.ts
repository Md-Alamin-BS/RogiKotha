// Publish validation and the derived fields of a doctor review (U47 BR3.2–BR3.4, BR3.6, BR3.7,
// BR3.11, BR5.4). Pure: plain values in, plain values out. The enum lists stay in `contracts`;
// the domain imports nothing, so the shapes here are structural.

/** Sentiment is optional at publish (FR45 constant); an absent one renders Not provided. */
export const REVIEW_SENTIMENT_REQUIRED = false;
/** Tag rows per review, the Not sure row included (ENT-002). */
export const REVIEW_TAG_MAX = 20;
export const REVIEW_TAG_TEXT_MAX = 60;
export const REVIEW_TITLE_MAX = 120;
export const REVIEW_DERIVED_TITLE_MAX = 80;
export const REVIEW_STORY_MIN = 20;
export const REVIEW_STORY_MAX = 10_000;
export const REVIEW_SECTION_MAX = 5_000;
export const REVIEW_PERIOD_MIN_YEAR = 2000;
/** Letters a member-added doctor's name needs once its title is removed (U46 BR5.5, FD-100). */
export const MEMBER_DOCTOR_NAME_MIN_LETTERS = 3;

export const REVIEW_SECTION_KEYS = ['symptoms', 'diagnosis', 'treatment', 'after'] as const;
export type ReviewSectionKey = (typeof REVIEW_SECTION_KEYS)[number];
export type ReviewSections = Partial<Record<ReviewSectionKey, string | null | undefined>>;

/** The order every missing item is reported in (BR3.2). */
export const MINIMUM_FIELDS = ['doctor', 'relationship', 'period', 'story', 'tags'] as const;
export type MinimumField = (typeof MINIMUM_FIELDS)[number];

export interface CalendarMonth {
  year: number;
  month: number;
}

export interface CalendarDate extends CalendarMonth {
  day: number;
}

/** A listed doctor (visible by U46's predicate), a member-added one, or none chosen. */
export type DoctorChoice =
  | { kind: 'listed'; visible: boolean }
  | { kind: 'new'; nameLetterCount: number }
  | { kind: 'none' };

/** A suggested chip names a term; a typed tag carries its text. */
export type ReviewTagInput =
  { group: string; termPublicId: string } | { group: string; text: string };

export type TagRuleOutcome = 'ok' | 'missing' | 'too_many';

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

export function graphemeLength(text: string): number {
  return Array.from(graphemes.segment(text)).length;
}

function firstGraphemes(text: string, max: number): string {
  let out = '';
  let count = 0;
  for (const { segment } of graphemes.segment(text)) {
    if (count === max) break;
    out += segment;
    count += 1;
  }
  return out;
}

// Bangladesh has kept UTC+6 without daylight saving since 2009, so a fixed offset is exact.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** The calendar date in Asia/Dhaka at `instant` (BR3.4: "the current month in Asia/Dhaka"). */
export function dhakaCalendarDate(instant: Date): CalendarDate {
  const shifted = new Date(instant.getTime() + DHAKA_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

/** January 2000 up to and including the current month (BR3.4). */
export function periodValid(
  period: CalendarMonth | null | undefined,
  today: CalendarMonth,
): period is CalendarMonth {
  if (!period) return false;
  const { year, month } = period;
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return false;
  const index = year * 12 + month;
  return index >= REVIEW_PERIOD_MIN_YEAR * 12 + 1 && index <= today.year * 12 + today.month;
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The private exact date (`YYYY-MM-DD`): a real calendar date inside the period's month and not
 * after today (BR3.4). Absent is valid; a bad one is a validation error on `exactDate`.
 */
export function exactDateValid(
  exactDate: string | null | undefined,
  period: CalendarMonth,
  today: CalendarDate,
): boolean {
  if (exactDate === null || exactDate === undefined) return true;
  const match = ISO_DATE_RE.exec(exactDate);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  const real =
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day;
  if (!real || year !== period.year || month !== period.month) return false;
  const asNumber = (d: CalendarDate) => d.year * 10_000 + d.month * 100 + d.day;
  return asNumber({ year, month, day }) <= asNumber(today);
}

function tagKey(tag: ReviewTagInput): string {
  return 'termPublicId' in tag
    ? `${tag.group}\u0000term\u0000${tag.termPublicId}`
    : `${tag.group}\u0000text\u0000${tag.text.trim().toLocaleLowerCase()}`;
}

/** Drops repeats of (group, term) and of (group, case-folded text), keeping the first (BR3.3). */
export function dedupeTags<T extends ReviewTagInput>(tags: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const tag of tags) {
    const key = tagKey(tag);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
}

/**
 * BR3.3: Not sure, a condition or symptom chip, or any typed tag satisfies the rule; more than
 * 20 rows after de-duplication is too many.
 */
// ASSUMPTION(U47): the Not sure row counts toward the 20 because it is stored as a `review_tags`
// row and ENT-002 caps the rows per review at 20.
export function tagRuleOutcome(tags: readonly ReviewTagInput[], notSure: boolean): TagRuleOutcome {
  const unique = dedupeTags(tags);
  if (unique.length + (notSure ? 1 : 0) > REVIEW_TAG_MAX) return 'too_many';
  const satisfied =
    notSure ||
    unique.some(
      (tag) => !('termPublicId' in tag) || tag.group === 'condition' || tag.group === 'symptom',
    );
  return satisfied ? 'ok' : 'missing';
}

export function tagRuleSatisfied(tags: readonly ReviewTagInput[], notSure: boolean): boolean {
  return tagRuleOutcome(tags, notSure) === 'ok';
}

function nonEmpty(text: string | null | undefined): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}

/** The filled sections in the fixed order, bodies as written, empty ones left out (BR5.4). */
export function orderedSections(
  sections: ReviewSections | null | undefined,
): { key: ReviewSectionKey; body: string }[] {
  if (!sections) return [];
  return REVIEW_SECTION_KEYS.flatMap((key) => {
    const body = sections[key];
    return nonEmpty(body) ? [{ key, body }] : [];
  });
}

export interface StoryInput {
  mode: 'quick' | 'detailed';
  story?: string | null | undefined;
  sections?: ReviewSections | null | undefined;
}

function storySatisfied({ mode, story, sections }: StoryInput): boolean {
  if (mode === 'quick') {
    const length = nonEmpty(story) ? graphemeLength(story.trim()) : 0;
    return length >= REVIEW_STORY_MIN && length <= REVIEW_STORY_MAX;
  }
  const filled = orderedSections(sections);
  const total = filled.reduce((sum, { body }) => sum + graphemeLength(body.trim()), 0);
  return filled.length > 0 && total >= REVIEW_STORY_MIN;
}

/** A facility visit story uses the quick bounds: 20 to 10 000 graphemes (BR3.10). */
export function quickStorySatisfied(story: string | null | undefined): boolean {
  return storySatisfied({ mode: 'quick', story });
}

function doctorSatisfied(doctor: DoctorChoice): boolean {
  if (doctor.kind === 'listed') return doctor.visible;
  if (doctor.kind === 'new') return doctor.nameLetterCount >= MEMBER_DOCTOR_NAME_MIN_LETTERS;
  return false;
}

export interface MinimumFieldsInput extends StoryInput {
  doctor: DoctorChoice;
  relationship?: string | null | undefined;
  period?: CalendarMonth | null | undefined;
  today: CalendarMonth;
  tags: readonly ReviewTagInput[];
  notSure: boolean;
}

/**
 * Every missing minimum item of a doctor review, in the order doctor, relationship, period,
 * story, tags (BR3.2, BR3.11). Empty means the minimum is met. Too many tags is not a missing
 * item: it is a validation error the caller checks with `tagRuleOutcome`.
 */
export function minimumFieldsMissing(input: MinimumFieldsInput): MinimumField[] {
  const missing: MinimumField[] = [];
  if (!doctorSatisfied(input.doctor)) missing.push('doctor');
  if (!nonEmpty(input.relationship)) missing.push('relationship');
  if (!periodValid(input.period, input.today)) missing.push('period');
  if (!storySatisfied(input)) missing.push('story');
  if (tagRuleOutcome(input.tags, input.notSure) === 'missing') missing.push('tags');
  return missing;
}

// A terminator ends a sentence only before whitespace or the end, so "2.5 mg" stays whole.
const SENTENCE_END_RE = /[.!?।](?=\s|$)|[\r\n]/u;

function firstSentence(text: string): string {
  const trimmed = text.trim();
  const match = SENTENCE_END_RE.exec(trimmed);
  if (!match) return trimmed;
  const isBreak = match[0] === '\n' || match[0] === '\r';
  return trimmed.slice(0, isBreak ? match.index : match.index + 1).trim();
}

export interface TitleInput extends StoryInput {
  title?: string | null | undefined;
}

/**
 * The author's title when it is 1 to 120 graphemes after trimming; otherwise the first sentence
 * of the story, or of the first filled section, cut at 80 graphemes with an ellipsis (BR3.6).
 * Null when there is no text at all (the draft list shows Untitled draft).
 */
export function deriveTitle({ title, mode, story, sections }: TitleInput): string | null {
  if (nonEmpty(title)) {
    const trimmed = title.trim();
    if (graphemeLength(trimmed) <= REVIEW_TITLE_MAX) return trimmed;
  }
  const texts = mode === 'quick' ? [story] : orderedSections(sections).map(({ body }) => body);
  const source = texts.find(nonEmpty);
  if (source === undefined) return null;
  const sentence = firstSentence(source);
  if (graphemeLength(sentence) <= REVIEW_DERIVED_TITLE_MAX) return sentence;
  return `${firstGraphemes(sentence, REVIEW_DERIVED_TITLE_MAX).trimEnd()}…`;
}

export type ReviewLanguage = 'en' | 'bn' | 'mixed';

const LETTER_RE = /\p{L}/gu;
const BENGALI_RE = /\p{Script=Bengali}/u;
const LATIN_RE = /\p{Script=Latin}/u;

/**
 * The script of the letters in the title and text: only Bengali is `bn`, only Latin is `en`,
 * both is `mixed`, none is the actor's locale (BR3.7). Never asked, never translated.
 */
export function detectLanguage(
  texts: readonly (string | null | undefined)[],
  fallback: 'en' | 'bn',
): ReviewLanguage {
  let bengali = false;
  let latin = false;
  for (const text of texts) {
    if (!text) continue;
    for (const [letter] of text.matchAll(LETTER_RE)) {
      if (BENGALI_RE.test(letter)) bengali = true;
      else if (LATIN_RE.test(letter)) latin = true;
    }
    if (bengali && latin) return 'mixed';
  }
  if (bengali) return 'bn';
  if (latin) return 'en';
  return fallback;
}
