import { useLocale, useTranslations } from 'next-intl';
import type { ConditionCardVM, ExperienceCardVM, FacilityCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDigits, formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import type { EmergencyConfig } from '@/components/patient/Emergency';
import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';
import { BrowseCard } from '@/components/patient/shared/BrowseCard';
import { EmergencyPanel } from '@/components/patient/shared/EmergencyPanel';
import { MiniList } from '@/components/patient/shared/MiniList';
import { TeaserRow } from './TeaserRow';

const HOW_STEPS = ['1', '2', '3'] as const;

const BROWSE_LINKS = [
  { href: '/doctors', key: 'discover.browseDoctors' },
  { href: '/facilities', key: 'discover.browseFacilities' },
  { href: '/topics', key: 'discover.browseTopics' },
] as const;

export interface HomeProps {
  /** At most five, already picked by `pickChips` (BR1.2). */
  chips: ConditionCardVM[];
  /** Topics with accounts; `null` when the query failed, so the section is left out (BR1.6). */
  browse: ConditionCardVM[] | null;
  facilities: FacilityCardVM[] | null;
  /** `[]` shows the empty state; `null` leaves the section out. */
  latest: ExperienceCardVM[] | null;
  emergency: EmergencyConfig;
}

// Port of concept-04b's renderDiscover() (app.js 472-539) for release 1: three browse links stand in
// for the search box (FD-046). The opener, disclaimer and emergency panel never move (BR5.2).
export function Home({ chips, browse, facilities, latest, emergency }: HomeProps) {
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
            <nav className="home-browse" aria-label={t('discover.browseAll')}>
              <ul>
                {BROWSE_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      className="btn ghost small"
                      href={link.href}
                      data-testid="home-browse-link"
                    >
                      {t(link.key)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            {chips.length > 0 ? (
              <ul className="chips" data-testid="home-chips">
                {chips.map((chip) => (
                  <li key={chip.publicId}>
                    <Link className="chip" href={`/topics/${chip.publicId}`}>
                      {chip.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <aside className="margin-note" data-static="disclaimer">
            <span className="k">{t('discover.editorialNote')}</span>
            <p>{t('disclaimer.short')}</p>
          </aside>
        </div>
      </section>

      <EmergencyPanel config={emergency} />

      {browse && browse.length > 0 ? (
        <>
          <h2 className="section-head">{t('discover.browse')}</h2>
          <p className="note">{t('discover.browseNote')}</p>
          <ul className="browse-grid reveal" data-testid="home-browse-grid">
            {browse.map((condition) => (
              <li key={condition.publicId}>
                <BrowseCard
                  href={`/topics/${condition.publicId}`}
                  title={condition.name}
                  sub={t('profile.experienceCount', {
                    n: condition.accountsTotal,
                    count: formatNumber(condition.accountsTotal, locale),
                  })}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {facilities && facilities.length > 0 ? (
        <section
          className="panel reveal"
          aria-labelledby="home-facilities-head"
          data-testid="home-facilities"
        >
          <h2 id="home-facilities-head">{t('discover.facilities')}</h2>
          <p className="note">{t('facility.separation')}</p>
          <MiniList>
            {facilities.map((card) => (
              <TeaserRow key={card.publicId} card={card} />
            ))}
          </MiniList>
        </section>
      ) : null}

      <h2 className="section-head">{t('how.title')}</h2>
      <ol className="how-list">
        {HOW_STEPS.map((step) => (
          <li key={step} className="reveal">
            <span className="fig">{formatDigits(`0${step}`, locale)}</span>
            <h3>{t(`how.${step}.t`)}</h3>
            <p>{t(`how.${step}.b`)}</p>
          </li>
        ))}
      </ol>

      {latest ? (
        <>
          <h2 className="section-head">{t('discover.latest')}</h2>
          {latest.length > 0 ? (
            <Reveal as="div">
              {latest.map((card) => (
                <AccountRow key={card.publicId} card={card} />
              ))}
            </Reveal>
          ) : (
            <div className="empty-state">
              <p>{t('discover.latestEmpty')}</p>
            </div>
          )}
        </>
      ) : null}
    </>
  );
}
