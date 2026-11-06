import { useLocale, useTranslations } from 'next-intl';
import type { FacilityProfileVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { placeText } from '@/components/patient/doctors/DoctorEntry';
import { ProvTag } from '@/components/patient/doctors/DoctorProfile';
import { Reveal } from '@/components/patient/motion/Reveal';
import { Avatar } from '@/components/patient/shared/Avatar';
import { DistBlock } from '@/components/patient/shared/DistBlock';
import { MiniList, MiniRow } from '@/components/patient/shared/MiniList';
import { NotVerified } from '@/components/patient/shared/NotVerified';
import { FacilityAccountRow } from './FacilityAccountRow';
import { ParentBadge } from './FacilityEntry';

// Port of concept-04b's renderFacility() (app.js 1324-1412) on the U46 view model, minus
// "Describe your visit" (T-204). The separation callout is static and never revealed (BR2.6); the
// figures, criteria and visits exist only while facility feedback is on (BR2.12).
export function FacilityProfile({ vm, threshold }: { vm: FacilityProfileVM; threshold: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  const place = placeText(vm) ?? notProvided;
  const accounts = vm.feedbackVisible ? vm.accountsTotal : undefined;

  return (
    <>
      <section className="panel" data-testid="facility-hero">
        <div className="p-hero">
          <span className="p-av">
            <Avatar seed={vm.publicId} hue={vm.avatarHue} size={118} />
          </span>
          <div>
            <span className="kicker">{t(`facility.type.${vm.type}`)}</span>
            <h1>{vm.name}</h1>
            <p className="p-spec">{vm.branchName ? `${vm.branchName} · ${place}` : place}</p>
            <div className="p-flags">
              <NotVerified kind="facility" describedById="facility-not-verified-why" />
              {accounts !== undefined ? (
                <span className="badge plain" data-testid="facility-profile-count">
                  {accounts > 0
                    ? t('facility.visitCount', {
                        n: accounts,
                        count: formatNumber(accounts, locale),
                      })
                    : t('facility.noVisits')}
                </span>
              ) : null}
              {vm.feedbackVisible && vm.accountsLimitedData ? (
                <span className="badge warn">{t('label.limitedData')}</span>
              ) : null}
              <ProvTag provenance={vm.provenance.name} />
              <ParentBadge card={vm} />
            </div>
          </div>
        </div>
      </section>

      <div className="callout warn" data-testid="facility-separation">
        <b>{t('facility.separation')}</b>
      </div>

      <div className="p-grid">
        <div>
          {vm.feedbackVisible && vm.criteria.length > 0 ? (
            <section className="panel" data-testid="facility-criteria">
              <h2>{t('facility.criteria')}</h2>
              {vm.accountsLimitedData ? (
                <p className="limited" data-testid="facility-limited">
                  <b>{t('label.limitedData')}</b>
                  <span>
                    {t('label.limitedDataWhy', { threshold: formatNumber(threshold, locale) })}
                  </span>
                </p>
              ) : null}
              <div className="crit-grid">
                {vm.criteria.map(({ key, dist }) => (
                  <div className="crit" key={key} data-testid={`crit-${key}`}>
                    <h3>{t(`crit.${key}`)}</h3>
                    <DistBlock dist={dist} prefix="crit." threshold={threshold} limitedNote="tag" />
                    {key === 'reportTrust' ? (
                      <p className="note">{t('crit.reportTrustNote')}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {vm.feedbackVisible ? (
            <>
              <h2 className="section-head">{t('facility.accounts')}</h2>
              {vm.accounts.length > 0 ? (
                <Reveal as="div">
                  {vm.accounts.map((account) => (
                    <FacilityAccountRow key={account.publicId} account={account} />
                  ))}
                </Reveal>
              ) : (
                <div className="empty-state">
                  <p>{t('facility.noVisits')}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        <aside className="p-side">
          <section className="panel" data-testid="facility-address">
            <h2>{t('facility.address')}</h2>
            <p className="note">{vm.address ?? notProvided}</p>
            {vm.address && vm.provenance.address ? (
              <ProvTag provenance={vm.provenance.address} />
            ) : null}
          </section>
          {vm.doctorsHere.length > 0 ? (
            <section className="panel" data-testid="facility-doctors">
              <h2>{t('facility.doctorsHere')}</h2>
              <MiniList>
                {vm.doctorsHere.map((doctor) => (
                  <MiniRow
                    key={doctor.publicId}
                    href={`/doctors/${doctor.publicId}`}
                    avatar={<Avatar seed={doctor.publicId} hue={doctor.avatarHue} size={38} />}
                    title={doctor.name}
                    sub={doctor.specialty ?? notProvided}
                  />
                ))}
              </MiniList>
              <p className="note">{t('facility.doctorsNote')}</p>
            </section>
          ) : null}
          {vm.siblings.length > 0 ? (
            <section className="panel" data-testid="facility-siblings">
              <h2>{t('facility.branch')}</h2>
              <MiniList>
                {vm.siblings.map((sibling) => (
                  <MiniRow
                    key={sibling.publicId}
                    href={`/facilities/${sibling.publicId}`}
                    avatar={<Avatar seed={sibling.publicId} hue={sibling.avatarHue} size={38} />}
                    title={sibling.branchName ?? sibling.name}
                    sub={sibling.area ?? notProvided}
                  />
                ))}
              </MiniList>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
