import { useLocale, useTranslations } from 'next-intl';
import type { FacilityCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Reveal } from '@/components/patient/motion/Reveal';
import { IndexHead } from '@/components/patient/shared/IndexHead';
import { FacilityEntry } from './FacilityEntry';

// The /facilities index: every public branch in the query's order, never ranked.
export function FacilityIndex({
  cards,
  total,
  threshold,
}: {
  cards: FacilityCardVM[];
  total: number;
  threshold: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <>
      <IndexHead
        kicker={t('nav.discover')}
        title={t('nav.facilities')}
        note={t('index.facilitiesNote')}
      />
      <p className="note count-line" data-testid="facility-index-count">
        {t('facility.listCount', { n: total, count: formatNumber(total, locale) })}
      </p>
      <Reveal as="div" className="index-list">
        {cards.map((card) => (
          <FacilityEntry key={card.publicId} card={card} headingLevel={2} threshold={threshold} />
        ))}
      </Reveal>
    </>
  );
}
