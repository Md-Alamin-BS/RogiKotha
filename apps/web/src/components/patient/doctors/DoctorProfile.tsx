import { useLocale, useTranslations } from 'next-intl';
import {
  OUTCOMES,
  RELATIONSHIPS,
  type DoctorFactKey,
  type DoctorProfileVM,
  type ProvenanceVM,
} from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDate, formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import type { ProfileFilters as Filters } from '@/lib/doctor-filters';
import { dhakaIsoDate } from '@/components/patient/experience/people';
import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';
import { Avatar } from '@/components/patient/shared/Avatar';
import { facilityLabel } from '@/components/patient/shared/FacilityLink';
import { MemberAdded } from '@/components/patient/shared/MemberAdded';
import { MiniList, MiniRow } from '@/components/patient/shared/MiniList';
import { NotVerified } from '@/components/patient/shared/NotVerified';
import { OutcomeBlock } from '@/components/patient/shared/OutcomeBlock';
import { SentimentBlock } from '@/components/patient/shared/SentimentBlock';
import { ConditionPills } from './ConditionPills';
import { placeText } from './DoctorEntry';
import { ProfileFilters } from './ProfileFilters';

const FACT_LABEL: Record<DoctorFactKey, string> = {
  bmdc: 'profile.bmdc',
  specialty: 'profile.specialty',
  qualifications: 'profile.qualifications',
  languages: 'profile.languages',
  fee: 'profile.fee',
};

/** The provenance tag every fact and chamber carries (BR2.9). */
export function ProvTag({ provenance }: { provenance: ProvenanceVM }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <span className="prov" data-p={provenance.source}>
      {t('prov.updatedOn', {
        source: t(`prov.${provenance.source}`),
        date: formatDate(dhakaIsoDate(new Date(provenance.updatedAt)), locale),
      })}
    </span>
  );
}

// Port of concept-04b's renderProfile() (app.js 776-893) on the U46 view model, block order as the
// prototype (frontend-components § 5.2), minus the claim sheet and "Is this you?" (need T-204).
export function DoctorProfile({
  vm,
  filters,
  threshold,
}: {
  vm: DoctorProfileVM;
  filters: Filters;
  threshold: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const n = (value: number) => formatNumber(value, locale);
  const notProvided = t('label.notProvided');
  const showingText = t('profile.showingCount', {
    showing: n(vm.showing),
    total: n(vm.scopedTotal),
  });

  return (
    <>
      <section className="panel" data-testid="profile-hero">
        <div className="p-hero">
          <span className="p-av">
            <Avatar seed={vm.publicId} hue={vm.avatarHue} size={118} />
          </span>
          <div>
            <span className="kicker">{t('profile.kicker')}</span>
            <h1>{vm.name}</h1>
            <p className="p-spec">
              {vm.specialty ?? notProvided} · {placeText(vm) ?? notProvided}
            </p>
            <div className="p-flags">
              <NotVerified kind="doctor" describedById="doctor-not-verified-why" />
              {vm.memberAddedNotConfirmed ? <MemberAdded /> : null}
              <span className="badge plain" data-testid="doctor-profile-count">
                {t('profile.experienceCount', { n: vm.accountsTotal, count: n(vm.accountsTotal) })}
              </span>
              {vm.accountsLimitedData ? (
                <span className="badge warn" data-testid="doctor-profile-limited">
                  {t('label.limitedData')}
                </span>
              ) : null}
              {vm.claimed ? <span className="badge positive">{t('prov.provider')}</span> : null}
            </div>
            {vm.memberAddedNotConfirmed ? <MemberAdded withWhy /> : null}
            <div className="p-actions">
              <Link
                className="btn"
                href={`/write?doctor=${encodeURIComponent(vm.publicId)}`}
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
          <section className="panel" aria-labelledby="profile-conditions-head">
            <h2 id="profile-conditions-head">{t('profile.conditions')}</h2>
            <p className="note">{t('profile.byCondition')}</p>
            <ConditionPills
              publicId={vm.publicId}
              filters={filters}
              conditions={vm.conditions}
              total={vm.accountsTotal}
            />
            <SentimentBlock dist={vm.scopedSentiment} threshold={threshold} />
            <div className="dist-gap">
              <OutcomeBlock dist={vm.scopedOutcome} threshold={threshold} />
            </div>
          </section>

          {vm.breakdown.length > 0 ? (
            <section className="panel" data-testid="profile-breakdown">
              <h2 id="profile-breakdown-head">{t('profile.breakdown')}</h2>
              <div
                className="table-scroll"
                role="region"
                tabIndex={0}
                aria-labelledby="profile-breakdown-head"
              >
                <table className="breakdown">
                  <thead>
                    <tr>
                      <th scope="col">{t('filter.condition')}</th>
                      <th scope="col">{t('sentiment.positive')}</th>
                      <th scope="col">{t('sentiment.mixed')}</th>
                      <th scope="col">{t('sentiment.negative')}</th>
                      <th scope="col">{t('profile.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.breakdown.map(({ condition, sentiment }) => (
                      <tr key={condition.publicId}>
                        <th scope="row">
                          {condition.name}
                          {sentiment.limitedData ? (
                            <>
                              {' '}
                              <span aria-hidden="true">⚠</span>
                              <span className="sr-only">{t('label.limitedData')}</span>
                            </>
                          ) : null}
                        </th>
                        <td>{n(sentiment.counts.positive ?? 0)}</td>
                        <td>{n(sentiment.counts.mixed ?? 0)}</td>
                        <td>{n(sentiment.counts.negative ?? 0)}</td>
                        <td>{n(sentiment.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="denominator">
                {t('label.limitedDataWhy', { threshold: n(threshold) })}
              </p>
            </section>
          ) : null}

          <section className="panel" aria-labelledby="profile-filters-head">
            <h2 id="profile-filters-head">{t('profile.filterAccounts')}</h2>
            <ProfileFilters
              publicId={vm.publicId}
              filters={filters}
              outcomes={OUTCOMES.map((value) => ({ value, label: t(`outcome.${value}`) }))}
              relationships={RELATIONSHIPS.map((value) => ({ value, label: t(`rel.${value}`) }))}
              labels={{
                outcomeGroup: t('filter.outcome'),
                relationshipGroup: t('profile.filterRelationship'),
                documentsGroup: t('filter.evidence'),
                hasDocuments: t('profile.hasDocuments'),
              }}
              showing={vm.showing}
              showingText={showingText}
            />
            <p className="denominator" data-testid="profile-showing">
              {showingText}
            </p>
          </section>

          <h2 className="section-head">{t('profile.accounts')}</h2>
          {vm.accounts.length > 0 ? (
            <Reveal as="div">
              {vm.accounts.map((card) => (
                <AccountRow key={card.publicId} card={card} showDoctor={false} />
              ))}
            </Reveal>
          ) : (
            <div className="empty-state">
              <p>{t('profile.noExperiences')}</p>
            </div>
          )}
        </div>

        <aside className="p-side" aria-label={t('prov.title')}>
          <section className="panel" data-testid="doctor-profile-facts">
            <h2>{t('profile.about')}</h2>
            <p className="note" data-testid="doctor-profile-about">
              {vm.about ?? notProvided}
            </p>
            {vm.facts.length > 0 ? (
              <ul className="facts">
                {vm.facts.map((fact) => (
                  <li key={fact.key} data-testid={`fact-${fact.key}`}>
                    <span className="k">{t(FACT_LABEL[fact.key])}</span>
                    <span>{fact.value}</span>
                    <ProvTag provenance={fact.provenance} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section className="panel" data-testid="doctor-profile-chambers">
            <h2>{t('profile.chambers')}</h2>
            {vm.chambers.length > 0 ? (
              <ul className="facts">
                {vm.chambers.map((chamber, index) => (
                  <li key={`${index}-${chamber.name}`}>
                    <span>{chamber.name}</span>
                    {chamber.hours ? <span className="k">{chamber.hours}</span> : null}
                    <ProvTag provenance={chamber.provenance} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">{notProvided}</p>
            )}
          </section>
          {vm.facilities.length > 0 ? (
            <section className="panel" data-testid="doctor-profile-facilities">
              <h2>{t('profile.facilities')}</h2>
              <MiniList>
                {vm.facilities.map((facility) => (
                  <MiniRow
                    key={facility.publicId}
                    href={`/facilities/${facility.publicId}`}
                    avatar={<Avatar seed={facility.publicId} hue={facility.avatarHue} size={38} />}
                    title={facilityLabel(facility)}
                    sub={t(`facility.type.${facility.type}`)}
                  />
                ))}
              </MiniList>
              <p className="note">{t('profile.facilitySep')}</p>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
