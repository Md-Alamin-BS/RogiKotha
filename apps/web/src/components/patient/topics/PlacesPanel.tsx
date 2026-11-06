import { useLocale, useTranslations } from 'next-intl';
import type { ConditionPlaceVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { placeText } from '@/components/patient/doctors/DoctorEntry';

// Port of concept-04b's places code in renderCondition(): where people who wrote about this
// condition actually went, pulled from their experiences. It is not a directory and not a ranking,
// so places are ordered by how many experiences name them (BR3.4).
export function PlacesPanel({ places, total }: { places: ConditionPlaceVM[]; total: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  if (places.length === 0) return null;
  const notProvided = t('label.notProvided');
  const sorted = [...places].sort((a, b) => b.count - a.count);

  return (
    <section className="panel" data-testid="places-panel">
      <h2>{t('condition.treatedAt')}</h2>
      <p className="note">{t('condition.treatedAtNote')}</p>
      <ul className="facts">
        {sorted.map((place, index) => (
          <li key={`${index}-${place.hospital ?? ''}`} data-testid="place-row">
            <span>{place.hospital ?? notProvided}</span>
            <span className="k">{placeText(place) ?? notProvided}</span>
            <span className="n">{formatNumber(place.count, locale)}</span>
          </li>
        ))}
      </ul>
      <p className="denominator">
        {t('condition.countedFrom', { n: total, count: formatNumber(total, locale) })}
      </p>
    </section>
  );
}
