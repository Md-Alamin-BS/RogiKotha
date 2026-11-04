import type { DemoReviewCard } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { Byline } from './Byline';
import { bylineIdentity } from './people';

// Port of concept-04b's accountRow() (app.js): one published experience in a list. The slice has
// no conditions, so the prototype's condition tag is left out.
export function ExperienceRow({ card }: { card: DemoReviewCard }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const identity = bylineIdentity(card.identityMode);
  const titleId = `experience-${card.publicId}-title`;

  return (
    <article className="acct">
      <div className="row-flags">
        {card.sentiment ? (
          <span className={`badge ${card.sentiment}`}>{t(`sentiment.${card.sentiment}`)}</span>
        ) : null}
        {card.outcome ? <span className="badge plain">{t(`outcome.${card.outcome}`)}</span> : null}
        {card.readyEvidenceCount > 0 ? (
          <span className="badge warn">
            {formatNumber(card.readyEvidenceCount, locale)} {t('label.documentsWord')}
          </span>
        ) : (
          <span className="badge plain">{t('label.noDocuments')}</span>
        )}
        {card.edited ? <span className="badge plain">{t('label.edited')}</span> : null}
      </div>
      <h3 id={titleId}>{card.title}</h3>
      <Byline
        variant="row"
        name={identity === 'anon' ? null : card.authorDisplayName}
        identity={identity}
        relationship={card.relationship}
      />
      <p className="who">
        <span>
          {t('review.episodeDate')}:{' '}
          {formatMonthYear({ year: card.periodYear, month: card.periodMonth }, locale)}
        </span>
        <span>
          <Link
            className="link-btn name-link"
            href={`/doctors/${card.doctor.publicId}`}
            title={t('nav.viewDoctor')}
          >
            {card.doctor.name}
          </Link>
        </span>
      </p>
      <p className="excerpt">{card.excerpt}</p>
      <Link
        className="btn small ghost"
        href={`/experiences/${card.publicId}`}
        aria-describedby={titleId}
      >
        {t('review.readFull')}
      </Link>
    </article>
  );
}
