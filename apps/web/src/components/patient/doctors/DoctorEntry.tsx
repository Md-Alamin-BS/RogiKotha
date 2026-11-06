import { useLocale, useTranslations } from 'next-intl';
import type { DoctorCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Avatar } from '@/components/patient/shared/Avatar';
import { DoctorLink } from '@/components/patient/shared/DoctorLink';
import { MemberAdded } from '@/components/patient/shared/MemberAdded';
import { NotVerified } from '@/components/patient/shared/NotVerified';
import { SentimentBlock } from '@/components/patient/shared/SentimentBlock';

/** "Area, City" from the parts that are present, or undefined when neither is. */
export function placeText(place: { area?: string | undefined; city?: string | undefined }) {
  const parts = [place.area, place.city].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// Port of concept-04b's doctorEntry() (app.js 712-731), minus the compare pin (needs search).
export function DoctorEntry({
  card,
  headingLevel = 2,
  threshold,
}: {
  card: DoctorCardVM;
  headingLevel?: 2 | 3;
  threshold: number;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const notProvided = t('label.notProvided');
  const headingId = `doctor-${card.publicId}`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  return (
    <div className="doc-entry" role="group" aria-labelledby={headingId} data-testid="doctor-entry">
      <span className="doc-av">
        <Avatar seed={card.publicId} hue={card.avatarHue} size={48} />
      </span>
      <div>
        <Heading id={headingId}>
          <DoctorLink publicId={card.publicId} label={card.name} />
        </Heading>
        <p className="doc-sub">
          {card.specialty ?? notProvided} · {placeText(card) ?? notProvided}
        </p>
        {card.topConditions.length > 0 ? (
          <p className="doc-treats" data-testid="doctor-entry-treats">
            {card.topConditions
              .map((c) => `${c.name} (${formatNumber(c.count, locale)})`)
              .join(', ')}
          </p>
        ) : null}
        <span className="doc-flags">
          <NotVerified kind="doctor" />
          {card.memberAddedNotConfirmed ? <MemberAdded /> : null}
          <span className="badge plain" data-testid="doctor-entry-documents">
            {card.documentsCount > 0
              ? t('review.card.documents', {
                  n: card.documentsCount,
                  count: formatNumber(card.documentsCount, locale),
                })
              : t('label.noDocuments')}
          </span>
          {card.accountsLimitedData ? (
            <span className="badge warn" data-testid="doctor-entry-limited">
              {t('label.limitedData')}
            </span>
          ) : null}
        </span>
      </div>
      <div className="doc-side">
        <SentimentBlock dist={card.sentiment} threshold={threshold} compact />
      </div>
    </div>
  );
}
