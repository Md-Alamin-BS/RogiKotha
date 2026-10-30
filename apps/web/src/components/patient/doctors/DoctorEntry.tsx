import { useLocale, useTranslations } from 'next-intl';
import type { DemoDoctorListRow } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { DoctorAvatar } from './DoctorAvatar';
import { NotVerifiedBadge } from './NotVerifiedBadge';

/** "Area, City", or null when neither is known. */
export function placeLine(doctor: Pick<DemoDoctorListRow, 'area' | 'city'>): string | null {
  const parts = [doctor.area, doctor.city].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(', ') : null;
}

// Port of concept-04b's doctorEntry() (app.js 712-731) for the demo slice: no condition counts,
// sentiment capsules or compare pin, only the count of published experiences (an exact count of
// accounts, never a score).
export function DoctorEntry({ doctor }: { doctor: DemoDoctorListRow }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  const headingId = `doctor-${doctor.publicId}`;

  return (
    <div className="doc-entry" role="group" aria-labelledby={headingId} data-testid="doctor-entry">
      <span className="doc-av">
        <DoctorAvatar seed={doctor.publicId} hue={doctor.avatarHue} size={48} />
      </span>
      <div>
        <h3 id={headingId}>
          <Link
            className="link-btn name-link"
            href={`/doctors/${doctor.publicId}`}
            title={t('nav.viewDoctor')}
            data-testid="doctor-entry-link"
          >
            {doctor.name}
          </Link>
        </h3>
        <p className="doc-sub">
          {doctor.specialty ?? notProvided} · {placeLine(doctor) ?? notProvided}
        </p>
        <span className="doc-flags">
          <NotVerifiedBadge />
        </span>
      </div>
      <div className="doc-side">
        <div className="dist compact">
          <span className="denominator" data-testid="doctor-entry-count">
            {t('profile.experienceCount', {
              n: doctor.publishedReviewCount,
              count: formatNumber(doctor.publishedReviewCount, locale),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
