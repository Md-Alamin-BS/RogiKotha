import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { getLocale, getTranslations } from 'next-intl/server';

import { dhakaMonthYear } from '@/components/patient/experience/people';
import { loadLastEditedAt, logSlotFailure } from '@/server/actions/review-slots';

// C16 slot (props frozen when U47 merges): "edited" with the month and year of the last edit, or
// nothing for a review never edited (BR6.7). U22 swaps the source for the version history.
export async function ReviewHistory({ reviewPublicId }: { reviewPublicId: string }) {
  let lastEditedAt: string | null;
  try {
    lastEditedAt = await loadLastEditedAt(reviewPublicId);
  } catch (error: unknown) {
    // The edit mark is secondary; a failed read leaves it out rather than breaking the page.
    logSlotFailure('history', error);
    return null;
  }
  if (lastEditedAt === null) return null;
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const edited = dhakaMonthYear(new Date(lastEditedAt));
  const month = String(edited.month).padStart(2, '0');
  return (
    <p className="note" data-testid="review-history">
      <time dateTime={`${edited.year}-${month}`}>
        {`${t('experience.edited')} · ${formatMonthYear(edited, locale as Locale)}`}
      </time>
    </p>
  );
}
