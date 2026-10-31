import { useLocale, useTranslations } from 'next-intl';
import type { DemoFacilityRow } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { FacilityEntry } from './FacilityEntry';

// The /facilities list: every branch, alphabetical as the data layer returns them, never ranked.
export function FacilityList({ facilities }: { facilities: DemoFacilityRow[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <>
      <p className="lede">{t('index.facilitiesNote')}</p>
      <div className="meta-row">
        <span data-testid="facility-list-count">
          {t('facility.listCount', {
            n: facilities.length,
            count: formatNumber(facilities.length, locale),
          })}
        </span>
      </div>
      <p className="note">{t('facility.orderNote')}</p>
      {facilities.length > 0 ? (
        <div className="entry-list" data-testid="facility-list">
          {facilities.map((facility) => (
            <FacilityEntry key={facility.publicId} facility={facility} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>{t('results.none')}</h2>
          <p>{t('results.noneBody')}</p>
        </div>
      )}
    </>
  );
}
