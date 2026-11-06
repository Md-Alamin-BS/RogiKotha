// Shared mappers of the read-side Review stub (U46 BR2.9, BR2.10, BR3.7, BR3.9): an eligible
// review row becomes the account card the prototype's accountRow() draws (app.js 624-645).
import type { BylineVM, DistributionVM, ExperienceCardVM, Locale } from '@rogikotha/contracts';
import { textIn, type Distribution } from '@rogikotha/domain';

import type {
  AboutTermRecord,
  BylineRecord,
  ReviewCardRecord,
  ReviewSectionsRecord,
} from '../../ports';

/** The prototype's `accountRow()` cuts the account's text at 190 characters (BR3.7). */
export const EXCERPT_GRAPHEMES = 190;

const SECTION_ORDER = ['symptoms', 'diagnosis', 'treatment', 'after'] as const;
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/**
 * The quick body, else the present sections in timeline order, whitespace collapsed, cut at 190
 * graphemes so a Bengali conjunct or an emoji is never split.
 */
export function excerptOf(
  body: string | null,
  sections: ReviewSectionsRecord | null,
): { excerpt: string; truncated: boolean } {
  const source =
    body !== null && body.trim() !== ''
      ? body
      : SECTION_ORDER.map((key) => sections?.[key] ?? '')
          .filter((text) => text.trim() !== '')
          .join(' ');
  const flat = source.replace(/\s+/g, ' ').trim();
  const parts = Array.from(graphemes.segment(flat), (s) => s.segment);
  if (parts.length <= EXCERPT_GRAPHEMES) return { excerpt: flat, truncated: false };
  return { excerpt: parts.slice(0, EXCERPT_GRAPHEMES).join('').trimEnd(), truncated: true };
}

const TITLE_PREFIX = /^(Dr\.?|ডা\.?)\s+/u;

function firstGrapheme(word: string | undefined): string {
  if (word === undefined) return '';
  for (const { segment } of graphemes.segment(word)) return segment;
  return '';
}

/** Port of app.js initials(): two initials for a name, "@" and one letter for a username. */
export function initialsOf(name: string, kind: 'named' | 'pseudonymous'): string {
  const bare = name.replace(TITLE_PREFIX, '').trim();
  if (kind === 'pseudonymous') return `@${firstGrapheme(bare)}`;
  const words = bare.split(/\s+/).filter(Boolean);
  return firstGrapheme(words[0]) + (words.length > 1 ? firstGrapheme(words[words.length - 1]) : '');
}

/** Only public persona columns, and nothing at all for an anonymous author (BR2.10). */
export function bylineOf(author: BylineRecord): BylineVM {
  if (author.personaKind === 'anonymous') return { personaKind: 'anonymous' };
  if (author.personaKind === 'pseudonymous') {
    const username = author.username ?? author.displayName;
    return {
      personaKind: 'pseudonymous',
      username,
      initials: initialsOf(username, 'pseudonymous'),
    };
  }
  return {
    personaKind: 'named',
    displayName: author.displayName,
    initials: initialsOf(author.displayName, 'named'),
  };
}

export function toDistributionVM<K extends string>(dist: Distribution<K>): DistributionVM {
  return {
    keys: [...dist.keys],
    counts: { ...dist.counts },
    total: dist.total,
    notProvided: dist.notProvided,
    empty: dist.empty,
    limitedData: dist.limitedData,
  };
}

export function termName(term: AboutTermRecord, locale: Locale): string {
  return locale === 'bn' ? term.nameBn : term.nameEn;
}

export function cardOf(
  row: ReviewCardRecord,
  locale: Locale,
  documentsCount: number,
): ExperienceCardVM {
  const { excerpt, truncated } = excerptOf(row.body, row.sections);
  const card: ExperienceCardVM = {
    publicId: row.publicId,
    title: row.title,
    excerpt,
    truncated,
    documentsCount,
    author: bylineOf(row.author),
    relationship: row.relationship,
    period: { year: row.periodYear, month: row.periodMonth },
    doctor: {
      publicId: row.doctorPublicId,
      name: locale === 'bn' ? row.doctorNameBn : row.doctorNameEn,
    },
  };
  if (row.sentiment !== null) card.sentiment = row.sentiment;
  if (row.outcome !== null) card.outcome = row.outcome;
  if (row.cardTerm !== null) {
    card.condition = { publicId: row.cardTerm.publicId, name: termName(row.cardTerm, locale) };
  } else if (row.cardFreeText !== null && row.cardFreeText.trim() !== '') {
    // Free text stays as the author wrote it, never translated (BR2.9).
    card.condition = { name: row.cardFreeText };
  }
  return card;
}

/** `text` in the reader's language, or undefined (re-exported for the stub's mappers). */
export const localText = textIn;

/** The ISO date of an instant in Bangladesh time, where every reader of release 1 is. */
const DHAKA_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dhakaIsoDate(instant: Date): string {
  return DHAKA_DATE.format(instant);
}
