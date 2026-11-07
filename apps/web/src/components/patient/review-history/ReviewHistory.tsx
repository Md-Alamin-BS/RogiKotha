import type { ReviewHistoryVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { getLocale, getTranslations } from 'next-intl/server';

import { dhakaMonthYear } from '@/components/patient/experience/people';
import { loadReviewHistory, logSlotFailure } from '@/server/actions/review-slots';
import { OriginalText } from './OriginalText';
import { VersionList } from './VersionList';

// C16 slot (props frozen): the Edited mark, one dated line per material correction with the earlier
// wording under Show original, and the author's own version list (BR4.1-BR4.5). It never throws.
export async function ReviewHistory({ reviewPublicId }: { reviewPublicId: string }) {
  let history: ReviewHistoryVM | null;
  try {
    history = await loadReviewHistory(reviewPublicId);
  } catch (error: unknown) {
    logSlotFailure('history', error);
    const t = await getTranslations();
    return (
      <p className="note" data-testid="review-history-error">
        {t('history.unavailable')}
      </p>
    );
  }
  if (history === null || history.editedAt === undefined) return null;
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const month = (iso: string) => {
    const parts = dhakaMonthYear(new Date(iso));
    return {
      text: formatMonthYear(parts, locale as Locale),
      iso: `${parts.year}-${String(parts.month).padStart(2, '0')}`,
    };
  };
  const edited = month(history.editedAt);
  return (
    <section className="review-history" data-testid="review-history">
      <p className="note">
        <time dateTime={edited.iso}>{`${t('label.edited')} · ${edited.text}`}</time>
      </p>
      {history.corrections.length > 0 ? (
        <ul className="corrections" data-testid="review-corrections">
          {history.corrections.map((correction) => {
            const fields = correction.fields.map((field) => t(`history.field.${field}`)).join(', ');
            return (
              <li key={`${correction.at}-${fields}`}>
                <p className="note">
                  {t('history.corrected', { fields, date: month(correction.at).text })}
                </p>
                <OriginalText original={correction.original} />
              </li>
            );
          })}
        </ul>
      ) : null}
      {history.versions !== undefined && history.versions.length > 0 ? (
        <VersionList versions={history.versions} />
      ) : null}
    </section>
  );
}
