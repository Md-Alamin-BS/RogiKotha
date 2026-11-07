import type { Outcome, Sentiment } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

// The head's flags (concept-04b renderAccount, `.a-flags`): what the author said about the episode
// and when it was, month and year only (BR5.5). An unanswered judgement reads Not provided, never a
// number or a blank (BR5.2).
export function Flags({
  sentiment,
  outcome,
  period,
}: {
  sentiment?: Sentiment | undefined;
  outcome?: Outcome | undefined;
  period?: { year: number; month: number } | undefined;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  return (
    <div className="a-flags" data-testid="experience-flags">
      {sentiment ? (
        <span className={`badge ${sentiment}`}>{t(`sentiment.${sentiment}`)}</span>
      ) : (
        <span className="badge plain">{`${t('experience.sentimentLabel')}: ${notProvided}`}</span>
      )}
      {outcome ? (
        <span className="badge plain">{t(`outcome.${outcome}`)}</span>
      ) : (
        <span className="badge plain">{`${t('experience.outcomeLabel')}: ${notProvided}`}</span>
      )}
      <span className="badge plain">
        {`${t('review.episodeDate')}: ${period ? formatMonthYear(period, locale) : notProvided}`}
      </span>
    </div>
  );
}
