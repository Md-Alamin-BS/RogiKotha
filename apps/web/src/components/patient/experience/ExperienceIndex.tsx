import type { DemoReviewCard } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { ExperienceRow } from './ExperienceRow';

// Port of concept-04b's renderExperienceIndex() and indexHead() (app.js): the recent published
// experiences, newest first as the data function returns them.
export function ExperienceIndex({ cards }: { cards: DemoReviewCard[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <>
      <section className="a-head index-head">
        <span className="kicker">{t('nav.discover')}</span>
        <h1 className="display">{t('nav.account')}</h1>
        <p className="lead">{t('index.experiencesNote')}</p>
      </section>
      <p className="note count-line">
        {formatNumber(cards.length, locale)} {t('sentiment.accounts')}
      </p>
      {cards.length > 0 ? (
        <div className="index-list">
          {cards.map((card) => (
            <ExperienceRow key={card.publicId} card={card} />
          ))}
        </div>
      ) : (
        <p className="note">{t('mine.empty')}</p>
      )}
    </>
  );
}
