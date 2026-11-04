import { useLocale, useTranslations } from 'next-intl';
import type { DemoFacilityDetail, DemoFacilityVisit } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { DoctorAvatar } from '@/components/patient/doctors/DoctorAvatar';
import { placeLine } from '@/components/patient/doctors/DoctorEntry';
import { Byline } from '@/components/patient/experience/Byline';
import { bylineIdentity } from '@/components/patient/experience/people';
import { branchTitle } from './FacilityEntry';

function VisitRow({ visit }: { visit: DemoFacilityVisit }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const overall = visit.criteria.find((c) => c.criterion === 'overall');
  const overallText = overall ? t(`crit.${overall.value}`) : t('label.notProvided');
  const period = formatMonthYear({ year: visit.periodYear, month: visit.periodMonth }, locale);
  return (
    <article className="acct" data-testid="facility-visit">
      <div className="row-flags">
        <span className="badge plain">{`${t('crit.overall')}: ${overallText}`}</span>
        <span className="badge plain">{`${t('review.episodeDate')}: ${period}`}</span>
      </div>
      <Byline
        variant="row"
        name={visit.authorDisplayName}
        identity={bylineIdentity(visit.identityMode)}
      />
      <p className="excerpt">{visit.body}</p>
      <div className="tag-row">
        {visit.criteria
          .filter((c) => c.criterion !== 'overall')
          .map((c) => (
            <span className="tag" key={c.criterion}>
              {`${t(`crit.${c.criterion}`)}: ${t(`crit.${c.value}`)}`}
            </span>
          ))}
      </div>
    </article>
  );
}

// Port of concept-04b's renderFacility() (app.js 1324-1412) for the demo (FD-101): the hero, the
// separation notice, each visit with the criteria the visitor answered, the doctors who practise
// at the branch and its sibling branches. The per-criterion distributions wait for T-203.
export function FacilityProfile({ facility }: { facility: DemoFacilityDetail }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  return (
    <>
      <section className="panel">
        <div className="p-hero">
          <span className="p-av">
            <DoctorAvatar seed={facility.publicId} hue={null} size={118} />
          </span>
          <div>
            <span className="kicker">{t(`facility.type.${facility.type}`)}</span>
            <h1>{branchTitle(facility)}</h1>
            <p className="p-spec">{placeLine(facility) ?? notProvided}</p>
            <div className="p-flags">
              <span className="badge plain" data-testid="facility-profile-count">
                {t('facility.visitCount', {
                  n: facility.visitCount,
                  count: formatNumber(facility.visitCount, locale),
                })}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="callout warn" data-testid="facility-separation">
        <b>{t('facility.separation')}</b>
      </div>

      <div className="p-grid">
        <div>
          <h2 className="section-head">{t('facility.accounts')}</h2>
          {facility.visits.length > 0 ? (
            facility.visits.map((visit) => <VisitRow key={visit.publicId} visit={visit} />)
          ) : (
            <div className="empty-state">
              <p>{t('facility.noVisits')}</p>
            </div>
          )}
        </div>

        <aside className="p-side">
          <section className="panel">
            <h2 style={{ fontSize: '15px' }}>{t('facility.address')}</h2>
            <p className="note">{facility.address ?? notProvided}</p>
          </section>
          {facility.doctors.length > 0 ? (
            <section className="panel" data-testid="facility-doctors">
              <h2 style={{ fontSize: '15px' }}>{t('facility.doctorsHere')}</h2>
              <div className="mini-list">
                {facility.doctors.map((doctor) => (
                  <Link className="mini-row" key={doctor.id} href={`/doctors/${doctor.publicId}`}>
                    <span className="mini-av">
                      <DoctorAvatar seed={doctor.publicId} hue={null} size={38} />
                    </span>
                    <span>
                      <b>{doctor.name}</b>
                      <span>{doctor.specialty ?? notProvided}</span>
                    </span>
                  </Link>
                ))}
              </div>
              <p className="note">{t('facility.doctorsNote')}</p>
            </section>
          ) : null}
          {facility.siblings.length > 0 ? (
            <section className="panel" data-testid="facility-siblings">
              <h2 style={{ fontSize: '15px' }}>{t('facility.branch')}</h2>
              <div className="mini-list">
                {facility.siblings.map((sibling) => (
                  <Link
                    className="mini-row"
                    key={sibling.publicId}
                    href={`/facilities/${sibling.publicId}`}
                  >
                    <span className="mini-av">
                      <DoctorAvatar seed={sibling.publicId} hue={null} size={38} />
                    </span>
                    <span>
                      <b>{sibling.branchName ?? sibling.facilityName}</b>
                      <span>{placeLine(sibling) ?? notProvided}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
