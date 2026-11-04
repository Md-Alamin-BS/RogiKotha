import { useLocale, useTranslations } from 'next-intl';
import type { DemoDoctorListRow } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { DoctorEntry } from './DoctorEntry';

// The /doctors list (FR3.1). Rows arrive already in the neutral order from the data layer (most
// published experiences, then name); this component never re-sorts them.
export function DoctorList({ doctors }: { doctors: DemoDoctorListRow[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <>
      <div className="meta-row">
        <span data-testid="doctor-list-count">
          {t('profile.list.count', {
            n: doctors.length,
            count: formatNumber(doctors.length, locale),
          })}
        </span>
      </div>
      <p className="note">{t('profile.list.orderNote')}</p>
      {doctors.length > 0 ? (
        <div className="entry-list" data-testid="doctor-list">
          {doctors.map((doctor) => (
            <DoctorEntry key={doctor.id} doctor={doctor} />
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
