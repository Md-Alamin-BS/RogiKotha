import { useLocale, useTranslations } from 'next-intl';
import type { ExperienceCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { Byline } from '@/components/patient/experience/Byline';
import { bylineIdentity } from '@/components/patient/experience/people';
import { ConditionLink } from './ConditionLink';
import { DoctorLink } from './DoctorLink';

/** The name a byline shows: none for an anonymous author, ever (BR2.10). */
export function bylineName(author: ExperienceCardVM['author']): string | null {
  if (author.personaKind === 'named') return author.displayName ?? null;
  if (author.personaKind === 'pseudonymous') return author.username ?? null;
  return null;
}

// Port of concept-04b's accountRow() (app.js 624-645): flags, the title as the primary link, the
// byline, the episode date and doctor, and the excerpt. No engagement counts (Question 9).
export function AccountRow({
  card,
  showDoctor = true,
  headingLevel = 3,
}: {
  card: ExperienceCardVM;
  showDoctor?: boolean;
  headingLevel?: 2 | 3;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const href = `/experiences/${card.publicId}`;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const period = formatMonthYear(card.period, locale);

  return (
    <article className="acct" data-testid="account-row">
      <div className="row-flags">
        {card.sentiment ? (
          <span className={`badge ${card.sentiment}`}>{t(`sentiment.${card.sentiment}`)}</span>
        ) : null}
        {card.outcome ? <span className="badge plain">{t(`outcome.${card.outcome}`)}</span> : null}
        {card.condition ? (
          <span className="tag" data-testid="account-condition">
            <ConditionLink publicId={card.condition.publicId} label={card.condition.name} />
          </span>
        ) : null}
        {card.documentsCount > 0 ? (
          <>
            <span className="badge warn">{t('evidence.status')}</span>
            <span className="badge plain">
              {t('review.card.documents', {
                n: card.documentsCount,
                count: formatNumber(card.documentsCount, locale),
              })}
            </span>
          </>
        ) : (
          <span className="badge plain">{t('label.noDocuments')}</span>
        )}
      </div>
      <Heading>
        <Link className="link-btn name-link" href={href} data-testid="account-row-title-link">
          {card.title}
        </Link>
      </Heading>
      <Byline
        variant="row"
        name={bylineName(card.author)}
        identity={bylineIdentity(card.author.personaKind)}
        relationship={card.relationship}
      />
      <p className="who">
        <span>
          {t('review.episodeDate')}: {period}
        </span>
        {showDoctor ? (
          <span>
            <DoctorLink publicId={card.doctor.publicId} label={card.doctor.name} />
          </span>
        ) : null}
      </p>
      <p className="excerpt">{card.truncated ? `${card.excerpt}…` : card.excerpt}</p>
      <Link className="btn small ghost" href={href} data-testid="account-row-read-link">
        {t('review.readFull')}
      </Link>
    </article>
  );
}
