import { useLocale, useTranslations } from 'next-intl';
import type { DemoFacilityRow } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { DoctorAvatar } from '@/components/patient/doctors/DoctorAvatar';
import { placeLine } from '@/components/patient/doctors/DoctorEntry';

/** "Facility — Branch", or the facility alone when the branch carries its name. */
export function branchTitle(row: Pick<DemoFacilityRow, 'facilityName' | 'branchName'>): string {
  return row.branchName ? `${row.facilityName} — ${row.branchName}` : row.facilityName;
}

// Port of concept-04b's facilityEntry() (app.js 733-748) without the overall distribution, which
// waits for T-203.
export function FacilityEntry({ facility }: { facility: DemoFacilityRow }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const headingId = `facility-${facility.publicId}`;
  const place = placeLine(facility) ?? t('label.notProvided');
  return (
    <div
      className="doc-entry"
      role="group"
      aria-labelledby={headingId}
      data-testid="facility-entry"
    >
      <span className="doc-av">
        <DoctorAvatar seed={facility.publicId} hue={null} size={48} />
      </span>
      <div>
        <h3 id={headingId}>
          <Link href={`/facilities/${facility.publicId}`} data-testid="facility-entry-link">
            {branchTitle(facility)}
          </Link>
        </h3>
        <p className="doc-sub">{`${t(`facility.type.${facility.type}`)} · ${place}`}</p>
        <span className="doc-flags">
          <span className="badge plain" data-testid="facility-visit-count">
            {t('facility.visitCount', {
              n: facility.visitCount,
              count: formatNumber(facility.visitCount, locale),
            })}
          </span>
        </span>
      </div>
    </div>
  );
}
