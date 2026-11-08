// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// BR2.10: copy may name a rating or score only to say there is none. Every message value that
// names one as a whole word must be in ALLOWLIST with its reason; a new one fails until someone
// adds it here or changes the copy. Pages are checked by structure in e2e/helpers/page-check.ts.

type Locale = 'en' | 'bn';
type Messages = { [key: string]: string | Messages };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readMessages(locale: Locale): Messages {
  const file = path.join(root, 'packages', 'i18n', 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(file, 'utf8')) as Messages;
}

function flatten(node: Messages, prefix = ''): Array<[string, string]> {
  return Object.entries(node).flatMap(([key, value]): Array<[string, string]> =>
    typeof value === 'string' ? [[`${prefix}${key}`, value]] : flatten(value, `${prefix}${key}.`),
  );
}

// Word boundaries, so "moderated" and "underscores" never match.
const EN_WORDS = /\b(rated|rating|ratings|score|scores|scored|stars?)\b/i;
// JavaScript's \b does not work for Bengali: the word must stand between the start or end,
// whitespace, punctuation or a symbol, so মডারেটর and আন্ডারস্কোর never match.
const BN_WORDS = /(^|[\s\p{P}\p{S}])(রেটিং|স্কোর|তারকা|রেট)(?=$|[\s\p{P}\p{S}])/u;

const PATTERNS: Record<Locale, RegExp> = { en: EN_WORDS, bn: BN_WORDS };

const ALLOWLIST: Record<Locale, Record<string, string>> = {
  en: {
    'compare.notRanking': 'says nothing is combined into a score',
    'facility.orderNote': 'says facilities are never scored',
    'hero.body': 'says the site holds stories, not scores',
    'how.2.b': 'says no quality score is ever calculated',
    'how.2.t': 'the "No scores, ever" heading',
    'index.doctorsNote': 'says doctors are never scored',
    'sort.whyBody': 'explains why no sort turns stories into a score',
  },
  bn: {
    'facility.orderNote': 'says facilities are never ranked or scored',
    'index.doctorsNote': 'says doctors have no order or score',
  },
};

function ratingMatches(messages: Array<[string, string]>, pattern: RegExp): string[] {
  return messages.filter(([, value]) => pattern.test(value)).map(([key]) => key);
}

function unallowed(
  messages: Array<[string, string]>,
  pattern: RegExp,
  allowlist: Record<string, string>,
): string[] {
  return ratingMatches(messages, pattern).filter((key) => allowlist[key] === undefined);
}

describe('copy names a rating or score only to say there is none (BR2.10)', () => {
  for (const locale of ['en', 'bn'] as const) {
    const messages = flatten(readMessages(locale));

    it(`every ${locale} value naming a rating or score is an allowed "no rating" message`, () => {
      expect(unallowed(messages, PATTERNS[locale], ALLOWLIST[locale])).toEqual([]);
    });

    it(`every ${locale} allowlist entry still exists and still matches`, () => {
      const matched = new Set(ratingMatches(messages, PATTERNS[locale]));
      const stale = Object.keys(ALLOWLIST[locale]).filter((key) => !matched.has(key));
      expect(stale).toEqual([]);
    });
  }

  it('fails on a planted rating label in either language', () => {
    expect(unallowed([['planted.sort', 'Highest rated doctors']], EN_WORDS, ALLOWLIST.en)).toEqual([
      'planted.sort',
    ]);
    expect(unallowed([['planted.sort', 'সেরা রেটিং']], BN_WORDS, ALLOWLIST.bn)).toEqual([
      'planted.sort',
    ]);
    expect(unallowed([['planted.badge', '৫ তারকা']], BN_WORDS, ALLOWLIST.bn)).toEqual([
      'planted.badge',
    ]);
  });

  it('never matches a word that only contains one', () => {
    const words: Array<[string, string]> = [
      ['a', 'Comments are moderated'],
      ['b', 'Letters, numbers or underscores'],
      ['c', 'মডারেটর'],
      ['d', 'আন্ডারস্কোর'],
    ];
    expect(ratingMatches(words, EN_WORDS)).toEqual([]);
    expect(ratingMatches(words, BN_WORDS)).toEqual([]);
  });
});
