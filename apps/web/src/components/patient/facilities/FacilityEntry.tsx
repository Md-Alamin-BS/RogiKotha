import { useLocale, useTranslations } from 'next-intl';
import type { FacilityCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { placeText } from '@/components/patient/doctors/DoctorEntry';
import { Avatar } from '@/components/patient/shared/Avatar';
import { DistBlock } from '@/components/patient/shared/DistBlock';
import { FacilityLink, facilityLabel } from '@/components/patient/shared/FacilityLink';
import { NotVerified } from '@/components/patient/shared/NotVerified';

/** "Part of {parent}", shown only when the organisation's name differs from the title (BR3.11). */
export function ParentBadge({ card }: { card: Pick<FacilityCardVM, 'name' | 'parentName'> }) {
  const t = useTranslations();
  if (!card.parentName || card.parentName === card.name) return null;
  return (
    <span className="badge plain" data-testid="facility-parent">
      {t('facility.parentOf', { parent: card.parentName })}
    </span>
  );
}

// Port of concept-04b's facilityEntry() (app.js 733-748), minus "Describe your visit" (T-204).
// Figures appear only while facility feedback is on (BR2.12).
export function FacilityEntry({
  card,
  headingLevel = 2,
  threshold,
}: {
  card: FacilityCardVM;
  headingLevel?: 2 | 3;
  threshold: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const headingId = `facility-${card.publicId}`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const place = placeText(card) ?? t('label.notProvided');
  const accounts = card.feedbackVisible ? card.accountsTotal : undefined;

  return (
    <div
      className="doc-entry"
      role="group"
      aria-labelledby={headingId}
      data-testid="facility-entry"
    >
      <span className="doc-av">
        <Avatar seed={card.publicId} hue={card.avatarHue} size={48} />
      </span>
      <div>
        <Heading id={headingId}>
          <FacilityLink publicId={card.publicId} label={facilityLabel(card)} />
        </Heading>
        <p className="doc-sub">{`${t(`facility.type.${card.type}`)} · ${place}`}</p>
        <span className="doc-flags">
          <NotVerified kind="facility" />
          {accounts !== undefined ? (
            <span className="badge plain" data-testid="facility-visit-count">
              {accounts > 0
                ? t('facility.visitCount', { n: accounts, count: formatNumber(accounts, locale) })
                : t('facility.noVisits')}
            </span>
          ) : null}
          {card.feedbackVisible && card.accountsLimitedData ? (
            <span className="badge warn" data-testid="facility-entry-limited">
              {t('label.limitedData')}
            </span>
          ) : null}
          <ParentBadge card={card} />
        </span>
      </div>
      {card.feedbackVisible && card.overall ? (
        <div className="doc-side">
          <DistBlock dist={card.overall} prefix="crit." compact threshold={threshold} />
        </div>
      ) : null}
    </div>
  );
}
