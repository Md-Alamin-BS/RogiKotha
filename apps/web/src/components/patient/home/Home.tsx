import { useLocale, useTranslations } from 'next-intl';
import type { DemoReviewCard } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDigits } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import type { EmergencyConfig } from '@/components/patient/Emergency';
import { Reveal } from '@/components/patient/motion/Reveal';
import { EmergencyPanel } from './EmergencyPanel';
import { ExperienceRow } from './ExperienceRow';

const HOW_STEPS = ['1', '2', '3'] as const;

// Port of concept-04b's renderDiscover() (app.js 472-539), narrowed to the demo slice (FR7.1):
// no search, topic browse or facility panel, which wait for the full plan.
export function Home({
  latest,
  emergency,
}: {
  latest: DemoReviewCard[];
  emergency: EmergencyConfig;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;

  return (
    <>
      <section className="opener">
        <span className="kicker">{t('discover.kicker')}</span>
        <h1 className="display">{t('hero.title')}</h1>
        <div className="opener-grid">
          <div>
            <p className="lede">{t('hero.body')}</p>
            <div className="p-actions">
              <Link className="btn" href="/write" data-testid="home-write-link">
                {t('hero.cta')}
              </Link>
              <Link className="btn ghost small" href="/doctors" data-testid="home-doctors-link">
                {t('discover.browseDoctors')}
              </Link>
            </div>
          </div>
          <aside className="margin-note">
            <span className="k">{t('discover.editorialNote')}</span>
            <p>{t('disclaimer.short')}</p>
          </aside>
        </div>
      </section>

      <EmergencyPanel config={emergency} />

      <h2 className="section-head">{t('how.title')}</h2>
      <ol className="how-list">
        {HOW_STEPS.map((step) => (
          <li key={step}>
            <span className="fig">{formatDigits(`0${step}`, locale)}</span>
            <h3>{t(`how.${step}.t`)}</h3>
            <p>{t(`how.${step}.b`)}</p>
          </li>
        ))}
      </ol>

      <h2 className="section-head">{t('discover.latest')}</h2>
      {latest.length > 0 ? (
        <Reveal as="div">
          {latest.map((review) => (
            <ExperienceRow key={review.publicId} review={review} />
          ))}
        </Reveal>
      ) : (
        <div className="empty-state">
          <p>{t('discover.latestEmpty')}</p>
        </div>
      )}
    </>
  );
}
