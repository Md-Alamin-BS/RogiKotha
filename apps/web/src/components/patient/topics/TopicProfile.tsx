import { useLocale, useTranslations } from 'next-intl';
import type { DemoTopicDetail } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { DoctorAvatar } from '@/components/patient/doctors/DoctorAvatar';
import { ExperienceRow } from '@/components/patient/home/ExperienceRow';
import { Reveal } from '@/components/patient/motion/Reveal';

// Port of concept-04b's renderCondition() (app.js 1173-1322) for the demo (FD-101): the hero with
// other wordings, the tagged experiences newest first and the doctors people wrote about. The
// symptom, medicine, treatment and place summaries wait for T-203.
export function TopicProfile({ topic }: { topic: DemoTopicDetail }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  return (
    <>
      <section className="panel">
        <span className="kicker">{t('condition.kicker')}</span>
        <h1>{topic.name}</h1>
        {topic.aliases.length > 0 ? (
          <p className="p-spec" data-testid="topic-aliases">
            {`${t('condition.alsoCalled')}: ${topic.aliases.join(', ')}`}
          </p>
        ) : null}
        <div className="p-flags">
          <span className="badge plain" data-testid="topic-count">
            {t('condition.experienceCount', {
              n: topic.experienceCount,
              count: formatNumber(topic.experienceCount, locale),
            })}
          </span>
        </div>
        <p className="note">{t('condition.mentionNote')}</p>
      </section>

      <div className="p-grid">
        <div>
          <h2 className="section-head">{t('condition.accounts')}</h2>
          {topic.experiences.length > 0 ? (
            <Reveal as="div">
              {topic.experiences.map((review) => (
                <ExperienceRow key={review.publicId} review={review} showDoctor />
              ))}
            </Reveal>
          ) : (
            <div className="empty-state">
              <p>{t('index.emptyTopic')}</p>
              <Link className="btn" href="/write">
                {t('index.beFirst')}
              </Link>
            </div>
          )}
        </div>

        <aside className="p-side">
          {topic.doctors.length > 0 ? (
            <section className="panel" data-testid="topic-doctors">
              <h2 style={{ fontSize: '15px' }}>{t('condition.doctors')}</h2>
              <div className="mini-list">
                {topic.doctors.map((doctor) => (
                  <Link className="mini-row" key={doctor.id} href={`/doctors/${doctor.publicId}`}>
                    <span className="mini-av">
                      <DoctorAvatar seed={doctor.publicId} hue={null} size={38} />
                    </span>
                    <span>
                      <b>{doctor.name}</b>
                      <span>
                        {`${doctor.specialty ?? notProvided} · ${t('condition.doctorCount', {
                          n: doctor.experienceCount,
                          count: formatNumber(doctor.experienceCount, locale),
                        })}`}
                      </span>
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
