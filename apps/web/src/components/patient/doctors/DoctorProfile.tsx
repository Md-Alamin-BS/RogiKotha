import { useLocale, useTranslations } from 'next-intl';
import type { DemoDoctorDetail, DemoReviewCard } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { ExperienceRow } from '@/components/patient/home/ExperienceRow';
import { Reveal } from '@/components/patient/motion/Reveal';
import { DoctorAvatar } from './DoctorAvatar';
import { placeLine } from './DoctorEntry';
import { NotVerifiedBadge } from './NotVerifiedBadge';

interface Fact {
  key: string;
  label: string;
  value: string | null;
}

// Port of concept-04b's renderProfile() (app.js 776-893) for the demo slice (FR3.2): the hero,
// the published experiences newest first, and the facts and chambers. The condition filters,
// distributions and breakdown table wait for the full plan. The facts carry no provenance tag
// because the slice's view rows have no provenance.
export function DoctorProfile({
  doctor,
  experiences,
}: {
  doctor: DemoDoctorDetail;
  experiences: DemoReviewCard[];
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  const facts: Fact[] = [
    { key: 'specialty', label: t('profile.specialty'), value: doctor.specialty },
    { key: 'qualifications', label: t('profile.qualifications'), value: doctor.qualifications },
    { key: 'languages', label: t('profile.languages'), value: doctor.languages },
    { key: 'fee', label: t('profile.fee'), value: doctor.feeDisplay },
  ];

  return (
    <>
      <section className="panel">
        <div className="p-hero">
          <span className="p-av">
            <DoctorAvatar seed={doctor.publicId} hue={doctor.avatarHue} size={118} />
          </span>
          <div>
            <span className="kicker">{t('profile.kicker')}</span>
            <h1>{doctor.name}</h1>
            <p className="p-spec">
              {doctor.specialty ?? notProvided} · {placeLine(doctor) ?? notProvided}
            </p>
            <div className="p-flags">
              <NotVerifiedBadge />
              <span className="badge plain" data-testid="doctor-profile-count">
                {t('profile.experienceCount', {
                  n: doctor.publishedReviewCount,
                  count: formatNumber(doctor.publishedReviewCount, locale),
                })}
              </span>
            </div>
            <div className="p-actions">
              {/* The write page accepts the uuid or the public id; the public id keeps uuids out of URLs. */}
              <Link
                className="btn"
                href={`/write?doctor=${encodeURIComponent(doctor.publicId)}`}
                data-testid="doctor-profile-write-link"
              >
                {t('profile.writeAbout')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="p-grid">
        <div>
          <h2 className="section-head">{t('profile.accounts')}</h2>
          {experiences.length > 0 ? (
            <Reveal as="div">
              {experiences.map((review) => (
                <ExperienceRow key={review.publicId} review={review} showDoctor={false} />
              ))}
            </Reveal>
          ) : (
            <div className="empty-state">
              <p>{t('profile.noExperiences')}</p>
            </div>
          )}
        </div>

        <aside className="p-side">
          <section className="panel" data-testid="doctor-profile-facts">
            <h2 style={{ fontSize: '15px' }}>{t('profile.about')}</h2>
            <p className="note">{doctor.about ?? notProvided}</p>
            <ul className="facts">
              {facts.map((fact) => (
                <li key={fact.key}>
                  <span className="k">{fact.label}</span>
                  <span>{fact.value ?? notProvided}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2 style={{ fontSize: '15px' }}>{t('profile.chambers')}</h2>
            {doctor.chambers.length > 0 ? (
              <ul className="facts">
                {doctor.chambers.map((chamber, index) => (
                  <li key={`${index}-${chamber.name}`}>
                    <span>{chamber.name}</span>
                    <span className="k">{chamber.hours ?? notProvided}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">{notProvided}</p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
