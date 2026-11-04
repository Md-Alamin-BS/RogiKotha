import { useLocale, useTranslations } from 'next-intl';
import type { DemoReviewCard, IdentityMode } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';
import { dhakaIsoDay, formatPublished } from './format';

type IdentityAttr = 'real' | 'pseudo' | 'anon';

// The prototype's identity names, which patient.css keys `[data-identity]` on.
const IDENTITY_ATTR: Record<IdentityMode, IdentityAttr> = {
  named: 'real',
  pseudonymous: 'pseudo',
  anonymous: 'anon',
};

/** Port of the prototype's initials(): a username shows "@" and its first letter. */
export function initialsFor(name: string, identity: IdentityAttr): string {
  const bare = name.replace(/^(Dr\.?|ডা\.?)\s+/, '').trim();
  const first = (word: string | undefined) => (word ? (Array.from(word)[0] ?? '') : '');
  if (identity === 'pseudo') return `@${first(bare)}`;
  const parts = bare.split(/\s+/).filter(Boolean);
  return first(parts[0]) + (parts.length > 1 ? first(parts[parts.length - 1]) : '');
}

function Byline({ review, locale }: { review: DemoReviewCard; locale: Locale }) {
  const t = useTranslations();
  const identity = IDENTITY_ATTR[review.identityMode];
  const anon = identity === 'anon';
  return (
    <p className="byline byline--row">
      <span className="byline-av" data-identity={identity} aria-hidden="true">
        {anon ? '—' : initialsFor(review.authorDisplayName, identity)}
      </span>
      {/* An anonymous author is never named, not even by their per-review alias (ADR-0008). */}
      {anon ? null : <span className="byline-lede">{t('experience.writtenBy')}</span>}
      <span className="byline-name">
        {anon ? t('byline.anonSentence') : review.authorDisplayName}
      </span>
      <span className="byline-id" data-identity={identity}>
        {anon ? t('compose.identity.anon') : t(`byline.identity.${identity}`)}
      </span>
      <span className="byline-rel">{t(`rel.${review.relationship}`)}</span>
      <time className="byline-when" dateTime={dhakaIsoDay(review.publishedAt)}>
        {formatPublished(review.publishedAt, locale)}
      </time>
    </p>
  );
}

function RowFlags({ review, locale }: { review: DemoReviewCard; locale: Locale }) {
  const t = useTranslations();
  const ready = review.readyEvidenceCount;
  return (
    <div className="row-flags">
      {review.sentiment ? (
        <span className={`badge ${review.sentiment}`}>{t(`sentiment.${review.sentiment}`)}</span>
      ) : null}
      {review.outcome ? (
        <span className="badge plain">{t(`outcome.${review.outcome}`)}</span>
      ) : null}
      {ready > 0 ? (
        <>
          <span className="badge warn">{t('evidence.status')}</span>
          <span className="badge plain">
            {t('review.card.documents', { n: ready, count: formatNumber(ready, locale) })}
          </span>
        </>
      ) : (
        <span className="badge plain">{t('label.noDocuments')}</span>
      )}
      {review.edited ? <span className="tag">{t('label.edited')}</span> : null}
    </div>
  );
}

// Port of concept-04b's accountRow() (app.js 624-645). The title is the primary link
// (EXPERIENCE.md:57); the doctor line is left out where the page is already about that doctor.
export function ExperienceRow({
  review,
  showDoctor = true,
}: {
  review: DemoReviewCard;
  showDoctor?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const href = `/experiences/${review.publicId}`;
  const period = formatMonthYear({ year: review.periodYear, month: review.periodMonth }, locale);

  return (
    <article className="acct" data-testid="experience-row">
      <RowFlags review={review} locale={locale} />
      <h3>
        <Link className="link-btn name-link" href={href} data-testid="experience-row-title-link">
          {review.title}
        </Link>
      </h3>
      <Byline review={review} locale={locale} />
      <p className="who">
        <span>
          {t('review.episodeDate')}: {period}
        </span>
        {showDoctor ? (
          <span>
            <Link
              className="link-btn name-link"
              href={`/doctors/${review.doctor.publicId}`}
              title={t('nav.viewDoctor')}
              data-testid="experience-row-doctor-link"
            >
              {review.doctor.name}
            </Link>
          </span>
        ) : null}
        <span>
          {t('review.card.comments', {
            n: review.commentCount,
            count: formatNumber(review.commentCount, locale),
          })}
        </span>
      </p>
      {review.excerpt ? <p className="excerpt">{review.excerpt}</p> : null}
      <Link className="btn small ghost" href={href} data-testid="experience-row-read-link">
        {t('review.readFull')}
      </Link>
    </article>
  );
}
