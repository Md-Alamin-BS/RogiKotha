// Author corrections of a published review and the history they leave (U22 BR2, BR3.1, BR3.4,
// BR4.1–BR4.3). Pure: plain values in, plain values out; the enum lists stay in `contracts`.
import {
  REVIEW_SECTION_KEYS,
  REVIEW_SECTION_MAX,
  REVIEW_STORY_MAX,
  REVIEW_STORY_MIN,
  type ReviewLanguage,
  type ReviewSectionKey,
  deriveTitle,
  detectLanguage,
  graphemeLength,
} from './review';

/** The material parts a correction can name, in the fixed order of ENT-103 (title is never one). */
export const CORRECTION_FIELD_ORDER = [
  'story',
  'symptoms',
  'diagnosis',
  'treatment',
  'after',
  'sentiment',
  'outcome',
  'claims',
] as const;
export type CorrectionField = (typeof CORRECTION_FIELD_ORDER)[number];
export type ChangedField = 'title' | CorrectionField;

/** The reviewer's label codes a correction may add (BR2.4); mirrors `REVIEWER_LABEL_CODES`. */
export const CORRECTION_LABEL_CODES = ['wrongDx', 'wrongRx', 'secondOpinion'] as const;

export type ReviewKind = 'quick' | 'detailed';
export type FilledSections = Partial<Record<ReviewSectionKey, string>>;

/** The changeable content of a review (ENT-101), as stored and as a correction would store it. */
export interface ReviewContent {
  kind: ReviewKind;
  title: string;
  /** Quick reviews only; null for detailed. */
  body: string | null;
  /** Detailed reviews only, filled sections only; null for quick. */
  sections: FilledSections | null;
  sentiment: string | null;
  outcome: string | null;
  /** Label codes or stored labels, as written. */
  claims: string[];
  language: ReviewLanguage;
}

export interface CorrectionContentInput {
  title: string;
  content:
    | { kind: 'quick'; story: string }
    | { kind: 'detailed'; sections: Partial<Record<ReviewSectionKey, string | undefined>> };
  sentiment?: string | null | undefined;
  outcome?: string | null | undefined;
  claims: readonly string[];
}

export type CorrectionProblemField = 'kind' | 'title' | 'story' | ReviewSectionKey | 'claims';
export type CorrectionProblemReason =
  'kind_mismatch' | 'story_length' | 'control_character' | 'label_not_allowed' | 'duplicate_label';

export interface CorrectionProblem {
  field: CorrectionProblemField;
  reason: CorrectionProblemReason;
}

// ZWNJ and ZWJ pass, as in contracts' `hasControlOrFormatExceptJoiners` (FD-114): Bengali spelling
// needs them. Repeated here because the domain imports nothing.
const CONTROL_OR_FORMAT = /(?![\u{200C}\u{200D}])[\p{Cc}\p{Cf}]/u;
const LINE_BREAKS_AND_TABS = /[\n\r\t]/g;

function filledSections(
  sections: Partial<Record<ReviewSectionKey, string | null | undefined>>,
): FilledSections {
  const filled: FilledSections = {};
  for (const key of REVIEW_SECTION_KEYS) {
    const body = sections[key]?.trim();
    if (body) filled[key] = body;
  }
  return filled;
}

/**
 * Trims every text, drops empty sections, derives the title by U47 BR3.6 and the language by
 * U47 BR3.7 (BR2.2, BR2.3). Never fails: `validateCorrectionContent` reports what is wrong.
 */
export function normaliseContent(
  input: CorrectionContentInput,
  fallbackLanguage: 'en' | 'bn',
): ReviewContent {
  const { content } = input;
  const body = content.kind === 'quick' ? content.story.trim() : null;
  const sections = content.kind === 'detailed' ? filledSections(content.sections) : null;
  const title =
    deriveTitle({
      title: input.title,
      mode: content.kind,
      story: body,
      sections,
    }) ?? '';
  const sectionTexts = sections ? Object.values(sections) : [];
  return {
    kind: content.kind,
    title,
    body,
    sections,
    sentiment: input.sentiment ?? null,
    outcome: input.outcome ?? null,
    // Not trimmed: a stored label must come back exactly as stored to be kept (BR2.4).
    claims: [...input.claims],
    language: detectLanguage([title, body, ...sectionTexts], fallbackLanguage),
  };
}

function hasControl(text: string, allowLineBreaks: boolean): boolean {
  return CONTROL_OR_FORMAT.test(allowLineBreaks ? text.replace(LINE_BREAKS_AND_TABS, '') : text);
}

/**
 * Field problems of normalised content against the stored kind: a kind change (BR1.3), a quick
 * story outside 20..10 000 graphemes (BR2.1), a detailed review with no section, a section over
 * 5 000 or under 20 in total (BR2.2), and invisible control characters (U47 BR3.9).
 */
export function validateCorrectionContent(
  content: ReviewContent,
  storedKind: ReviewKind,
): CorrectionProblem[] {
  if (content.kind !== storedKind) return [{ field: 'kind', reason: 'kind_mismatch' }];
  const problems: CorrectionProblem[] = [];
  if (hasControl(content.title, false)) {
    problems.push({ field: 'title', reason: 'control_character' });
  }
  if (content.kind === 'quick') {
    const story = content.body ?? '';
    const length = graphemeLength(story);
    if (length < REVIEW_STORY_MIN || length > REVIEW_STORY_MAX) {
      problems.push({ field: 'story', reason: 'story_length' });
    } else if (hasControl(story, true)) {
      problems.push({ field: 'story', reason: 'control_character' });
    }
    return problems;
  }
  const filled = REVIEW_SECTION_KEYS.flatMap((key) => {
    const text = content.sections?.[key];
    return text ? [{ key, text, length: graphemeLength(text) }] : [];
  });
  const total = filled.reduce((sum, { length }) => sum + length, 0);
  const tooLong = filled.some(({ length }) => length > REVIEW_SECTION_MAX);
  if (filled.length === 0 || total < REVIEW_STORY_MIN || tooLong) {
    problems.push({ field: 'story', reason: 'story_length' });
  }
  for (const { key, text } of filled) {
    if (hasControl(text, true)) problems.push({ field: key, reason: 'control_character' });
  }
  return problems;
}

/**
 * BR2.4: each label is a code or a label already stored on the review (a seeded free-text label
 * is kept or removed, never added or reworded), and no label appears twice.
 */
export function validateClaims(
  next: readonly string[],
  stored: readonly string[],
): CorrectionProblem[] {
  const allowed = new Set<string>([...CORRECTION_LABEL_CODES, ...stored]);
  if (next.some((label) => !allowed.has(label))) {
    return [{ field: 'claims', reason: 'label_not_allowed' }];
  }
  if (new Set(next).size !== next.length) return [{ field: 'claims', reason: 'duplicate_label' }];
  return [];
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((label) => right.has(label));
}

/**
 * BR3.1: the fields that differ between the current and the normalised next content. `changed`
 * lists title first, then the material parts; `corrected` is `changed` without the title, in the
 * fixed order. Claims are compared as sets; language is derived, so it is never compared.
 */
export function classifyChange(
  current: ReviewContent,
  next: ReviewContent,
): { changed: ChangedField[]; corrected: CorrectionField[] } {
  const corrected = CORRECTION_FIELD_ORDER.filter((field) => {
    switch (field) {
      case 'story':
        return (current.body ?? null) !== (next.body ?? null);
      case 'sentiment':
        return current.sentiment !== next.sentiment;
      case 'outcome':
        return current.outcome !== next.outcome;
      case 'claims':
        return !sameSet(current.claims, next.claims);
      default:
        return (current.sections?.[field] ?? null) !== (next.sections?.[field] ?? null);
    }
  });
  const changed: ChangedField[] = current.title !== next.title ? ['title'] : [];
  return { changed: [...changed, ...corrected], corrected };
}

export interface VersionSnapshot {
  kind: ReviewKind;
  title: string;
  body?: string;
  sections?: FilledSections;
  sentiment: string | null;
  outcome: string | null;
  claims: { label: string }[];
  corrected: CorrectionField[];
}

/**
 * The `review_versions.snapshot` of an accepted correction, in the shape of U47's publish row plus
 * `corrected` (BR3.4). It is public through Show original, so it never holds an identity field,
 * the doctor or the exact date.
 */
export function toVersionSnapshot(
  next: ReviewContent,
  corrected: readonly CorrectionField[],
): VersionSnapshot {
  return {
    kind: next.kind,
    title: next.title,
    ...(next.kind === 'quick' ? { body: next.body ?? '' } : { sections: next.sections ?? {} }),
    sentiment: next.sentiment,
    outcome: next.outcome,
    claims: next.claims.map((label) => ({ label })),
    corrected: [...corrected],
  };
}

/**
 * The `corrected` value of a version snapshot as CorrectionField codes in the fixed order. A
 * missing or malformed value (demo-era correction rows, publish and seed rows) reads as `[]`
 * (review R-05); unknown entries are dropped.
 */
export function readCorrected(corrected: unknown): CorrectionField[] {
  if (!Array.isArray(corrected)) return [];
  const present = new Set(corrected.filter((v): v is string => typeof v === 'string'));
  return CORRECTION_FIELD_ORDER.filter((field) => present.has(field));
}

/** One `review_versions` row as the history read returns it: never the actor or the reason. */
export interface VersionHistoryRow {
  version: number;
  changeKind: string;
  createdAt: Date;
  /** The snapshot's `corrected` value, unparsed. */
  corrected: unknown;
  /** The full snapshot, present only for a version directly followed by a material correction. */
  content?: unknown;
}

export interface OriginalText {
  kind: ReviewKind;
  title: string;
  story?: string;
  sections?: FilledSections;
  sentiment?: string;
  outcome?: string;
  claims?: string[];
}

export interface ReviewCorrection {
  at: string;
  fields: CorrectionField[];
  original: OriginalText;
}

export interface ReviewVersion {
  version: number;
  at: string;
  kind: 'published' | 'edited' | 'corrected';
  fields: CorrectionField[];
}

export interface ReviewHistory {
  editedAt?: string;
  corrections: ReviewCorrection[];
  versions?: ReviewVersion[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function claimLabels(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((claim) => {
    if (typeof claim === 'string') return [claim];
    if (isRecord(claim) && typeof claim.label === 'string') return [claim.label];
    return [];
  });
}

/**
 * The text of a version snapshot for Show original (BR4.2). A key the snapshot lacks, or holds as
 * null, is left out, never filled with Not provided or 0; the kind is read from `body` or
 * `sections` when the snapshot names none (seed rows).
 */
export function toOriginalText(snapshot: unknown): OriginalText {
  const s = isRecord(snapshot) ? snapshot : {};
  const rawSections = isRecord(s.sections) ? s.sections : {};
  const sections = filledSections(
    Object.fromEntries(
      REVIEW_SECTION_KEYS.flatMap((key) => {
        const text = rawSections[key];
        return typeof text === 'string' ? [[key, text]] : [];
      }),
    ),
  );
  const hasSections = Object.keys(sections).length > 0;
  const kind: ReviewKind =
    s.kind === 'quick' || s.kind === 'detailed'
      ? s.kind
      : !nonEmptyString(s.body) && hasSections
        ? 'detailed'
        : 'quick';
  const claims = claimLabels(s.claims);
  return {
    kind,
    // ASSUMPTION(U22): a snapshot without a title (none is written so) gives an empty title.
    title: typeof s.title === 'string' ? s.title : '',
    ...(kind === 'quick' && nonEmptyString(s.body) ? { story: s.body } : {}),
    ...(kind === 'detailed' && hasSections ? { sections } : {}),
    ...(nonEmptyString(s.sentiment) ? { sentiment: s.sentiment } : {}),
    ...(nonEmptyString(s.outcome) ? { outcome: s.outcome } : {}),
    ...(claims !== undefined ? { claims } : {}),
  };
}

/**
 * BR4.1–BR4.3: `editedAt` from the newest correction row; one correction line per version with a
 * non-empty `corrected`, oldest first, whose original is the version just before it; and, for the
 * author only, the versions newest first. A non-author result has no `versions` key at all.
 */
export function toHistory(rows: readonly VersionHistoryRow[], isAuthor: boolean): ReviewHistory {
  const ascending = [...rows].sort((a, b) => a.version - b.version);
  const byVersion = new Map(ascending.map((row) => [row.version, row]));
  const correctionRows = ascending.filter((row) => row.changeKind === 'correction');

  const newest = correctionRows.reduce<Date | undefined>(
    (max, row) => (max === undefined || row.createdAt > max ? row.createdAt : max),
    undefined,
  );

  const corrections = correctionRows.flatMap((row) => {
    const fields = readCorrected(row.corrected);
    if (fields.length === 0) return [];
    return [
      {
        at: row.createdAt.toISOString(),
        fields,
        original: toOriginalText(byVersion.get(row.version - 1)?.content),
      },
    ];
  });

  const history: ReviewHistory = {
    ...(newest !== undefined ? { editedAt: newest.toISOString() } : {}),
    corrections,
  };
  if (!isAuthor) return history;

  // ASSUMPTION(U22): moderation_redaction and restore rows (release 2) stay out of the author's list.
  const versions = ascending
    .filter((row) => row.changeKind === 'publish' || row.changeKind === 'correction')
    .reverse()
    .map((row): ReviewVersion => {
      const fields = row.changeKind === 'publish' ? [] : readCorrected(row.corrected);
      const kind =
        row.changeKind === 'publish' ? 'published' : fields.length === 0 ? 'edited' : 'corrected';
      return { version: row.version, at: row.createdAt.toISOString(), kind, fields };
    });
  return { ...history, versions };
}
