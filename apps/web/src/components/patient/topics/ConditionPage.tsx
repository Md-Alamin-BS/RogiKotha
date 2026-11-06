import { useLocale, useTranslations } from 'next-intl';
import type { ConditionPageVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import type { EmergencyConfig } from '@/components/patient/Emergency';
import { placeText } from '@/components/patient/doctors/DoctorEntry';
import { Reveal } from '@/components/patient/motion/Reveal';
import { AccountRow } from '@/components/patient/shared/AccountRow';
import { Avatar } from '@/components/patient/shared/Avatar';
import { EmergencyPanel } from '@/components/patient/shared/EmergencyPanel';
import { facilityLabel } from '@/components/patient/shared/FacilityLink';
import { MiniList, MiniRow } from '@/components/patient/shared/MiniList';
import { OutcomeBlock } from '@/components/patient/shared/OutcomeBlock';
import { SentimentBlock } from '@/components/patient/shared/SentimentBlock';
import { FreqList } from './FreqList';
import { PlacesPanel } from './PlacesPanel';

// Port of concept-04b's renderCondition() (app.js 1173-1322) on the U46 view model. Every count is
// of distinct eligible accounts (BR3.3); the mention lists count what authors wrote and are not a
// treatment guideline (BR3.6); the emergency panel is static (BR9.4).
export function ConditionPage({
  vm,
  threshold,
  emergency,
}: {
  vm: ConditionPageVM;
  threshold: number;
  emergency: EmergencyConfig;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const n = (value: number) => formatNumber(value, locale);
  const notProvided = t('label.notProvided');
  const total = vm.accountsTotal;

  return (
    <>
      <section className="a-head" data-testid="condition-head">
        <span className="kicker">{t('condition.kicker')}</span>
        {vm.provisional ? (
          <span className="badge warn" data-testid="condition-provisional">
            {t('condition.provisional')}
          </span>
        ) : null}
        <h1 className="display">{vm.name}</h1>
        {vm.aliases.length > 0 ? (
          <p className="note" data-testid="condition-aliases">
            {`${t('condition.alsoCalled')}: ${vm.aliases.join(', ')}`}
          </p>
        ) : null}
        <p className="lede" data-testid="condition-counts">
          {total > 0
            ? t('condition.countsLine', {
                a: total,
                accounts: n(total),
                d: vm.doctorsTotal,
                doctors: n(vm.doctorsTotal),
              })
            : t('index.emptyTopic')}
        </p>
        {vm.accountsLimitedData ? (
          <p className="limited" data-testid="condition-limited">
            <b>{t('label.limitedData')}</b>
            <span>{t('label.limitedDataWhy', { threshold: n(threshold) })}</span>
          </p>
        ) : null}
        {vm.specialties.length > 0 ? (
          <p className="specs-tag" data-testid="condition-specialties">
            <span>{t('condition.specialtyTag')}</span>{' '}
            {vm.specialties.slice(0, 3).map((s) => (
              <span className="tag" key={s.name}>
                {`${s.name} (${n(s.count)})`}
              </span>
            ))}
          </p>
        ) : null}
      </section>

      <PlacesPanel places={vm.places} total={total} />

      <div className="p-grid">
        <div>
          <section className="panel" data-testid="condition-across">
            <h2>{t('condition.acrossAll')}</h2>
            <SentimentBlock dist={vm.sentiment} threshold={threshold} />
            <div className="dist-gap">
              <OutcomeBlock dist={vm.outcome} threshold={threshold} />
            </div>
          </section>
          <FreqList
            title={t('condition.medicines')}
            items={vm.medicines}
            total={total}
            testId="freq-medicines"
          />
          <FreqList
            title={t('condition.treatments')}
            items={vm.treatments}
            total={total}
            testId="freq-treatments"
          />
          <FreqList
            title={t('condition.symptoms')}
            items={vm.symptoms}
            total={total}
            testId="freq-symptoms"
          />
          <div className="callout" data-testid="condition-prov-note">
            <b>{t('condition.provisional')}</b> {t('condition.provNote')}
          </div>
          <h2 className="section-head">{t('condition.accounts')}</h2>
          {vm.accounts.length > 0 ? (
            <Reveal as="div">
              {vm.accounts.map((card) => (
                <AccountRow key={card.publicId} card={card} />
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
          {vm.doctors.length > 0 ? (
            <section className="panel" data-testid="condition-doctors">
              <h2>{t('condition.doctors')}</h2>
              <MiniList>
                {vm.doctors.map((doctor) => (
                  <MiniRow
                    key={doctor.publicId}
                    href={`/doctors/${doctor.publicId}`}
                    avatar={<Avatar seed={doctor.publicId} hue={doctor.avatarHue} size={38} />}
                    title={doctor.name}
                    sub={`${doctor.specialty ?? notProvided} · ${t('condition.doctorCount', {
                      n: doctor.count,
                      count: n(doctor.count),
                    })}`}
                    loc={
                      [doctor.primaryChamber, placeText(doctor)].filter(Boolean).join(' · ') ||
                      undefined
                    }
                  />
                ))}
              </MiniList>
            </section>
          ) : null}
          {vm.facilities.length > 0 ? (
            <section className="panel" data-testid="condition-facilities">
              <h2>{t('condition.facilities')}</h2>
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
            </section>
          ) : null}
          <EmergencyPanel config={emergency} compact />
        </aside>
      </div>
    </>
  );
}
