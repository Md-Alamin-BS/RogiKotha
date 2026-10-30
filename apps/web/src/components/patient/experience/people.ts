// Shared helpers of the experience and comment views (demo slice, FR6): identity chips,
// initials and dates as concept-04b's byline() and its "posted" fields render them.
import type { IdentityMode } from '@rogikotha/contracts';
import type { MonthYear } from '@rogikotha/i18n';

/** The prototype's identity vocabulary, used as the `data-identity` value the byline CSS reads. */
export type BylineIdentity = 'real' | 'pseudo' | 'anon';

const IDENTITY: Record<IdentityMode, BylineIdentity> = {
  named: 'real',
  pseudonymous: 'pseudo',
  anonymous: 'anon',
};

export function bylineIdentity(mode: IdentityMode): BylineIdentity {
  return IDENTITY[mode];
}

const TITLE_PREFIX_RE = /^(Dr\.?|ডা\.?)\s+/;

/** Port of app.js initials(): two initials for a name, "@" and one letter for a username. */
export function initials(name: string, identity: BylineIdentity | undefined): string {
  const bare = name.replace(TITLE_PREFIX_RE, '');
  const first = (word: string | undefined) => Array.from(word ?? '')[0] ?? '';
  if (identity === 'pseudo') return `@${first(bare)}`;
  const words = bare.split(/\s+/).filter(Boolean);
  return first(words[0]) + (words.length > 1 ? first(words[words.length - 1]) : '');
}

// ASSUMPTION(demo-slice): dates read in Bangladesh time, where every demo reader is, so a
// comment written late in the evening does not show the next day's date.
const DHAKA_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function dhakaParts(date: Date): { year: string; month: string; day: string } {
  const parts = Object.fromEntries(DHAKA_DATE.formatToParts(date).map((p) => [p.type, p.value]));
  return { year: parts.year ?? '', month: parts.month ?? '', day: parts.day ?? '' };
}

/** "YYYY-MM-DD" of the instant in Bangladesh time, the input `formatDate` takes. */
export function dhakaIsoDate(date: Date): string {
  const { year, month, day } = dhakaParts(date);
  return `${year}-${month}-${day}`;
}

export function dhakaMonthYear(date: Date): MonthYear {
  const { year, month } = dhakaParts(date);
  return { year: Number(year), month: Number(month) };
}

/** Body text split at blank lines into paragraphs; an empty body gives none. */
export function paragraphs(body: string | null): string[] {
  if (!body) return [];
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
