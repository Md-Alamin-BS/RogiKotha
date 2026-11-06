import { useLocale, useTranslations } from 'next-intl';
import type { DoctorCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Reveal } from '@/components/patient/motion/Reveal';
import { IndexHead } from '@/components/patient/shared/IndexHead';
import { DoctorEntry } from './DoctorEntry';

// The /doctors index (FR3.1, Question 6). Cards arrive in the query's neutral order; this component
// never re-sorts them.
export function DoctorIndex({
  cards,
  total,
  threshold,
}: {
  cards: DoctorCardVM[];
  total: number;
  threshold: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <>
      <IndexHead
        kicker={t('nav.discover')}
        title={t('nav.profile')}
        note={t('index.doctorsNote')}
      />
      <p className="note count-line" data-testid="doctor-index-count">
        {t('profile.list.count', { n: total, count: formatNumber(total, locale) })}
      </p>
      {cards.length > 0 ? (
        <Reveal as="div" className="index-list">
          {cards.map((card) => (
            <DoctorEntry key={card.publicId} card={card} headingLevel={2} threshold={threshold} />
          ))}
        </Reveal>
      ) : (
        <div className="empty-state">
          <h2>{t('results.none')}</h2>
          <p>{t('results.noneBody')}</p>
        </div>
      )}
    </>
  );
}
