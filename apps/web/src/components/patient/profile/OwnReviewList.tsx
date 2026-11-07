import { useTranslations } from 'next-intl';
import type { Locale, OwnReviewVM } from '@rogikotha/contracts';
import { formatMonthYear, formatNumber } from '@rogikotha/i18n/format';

import { Link } from '@/i18n/routing';

import { dhakaMonthYear } from './dates';

const STATE_BADGE = {
  hidden: 'mine.profile.state.hidden',
  removed: 'mine.profile.state.removed',
  other: 'mine.profile.state.other',
} as const;

function OwnReview({ review, locale }: { review: OwnReviewVM; locale: Locale }) {
  const t = useTranslations();
  const published = review.state === 'published';
  const when = review.publishedAt
    ? t('mine.profile.posted', {
        date: formatMonthYear(dhakaMonthYear(review.publishedAt), locale),
      })
    : t('label.notProvided');

  return (
    <article className="mine-item" data-testid="profile-review">
      {review.state !== 'published' || review.edited ? (
        <div className="row-flags">
          {review.state !== 'published' ? (
            <span className="badge warn">{t(STATE_BADGE[review.state])}</span>
          ) : null}
          {review.edited ? <span className="badge plain">{t('label.edited')}</span> : null}
        </div>
      ) : null}
      <h3>{review.title}</h3>
      <p className="note">
        {review.doctorName} · {when}
      </p>
      {published ? (
        <div className="mine-actions">
          <Link
            className="btn small ghost"
            href={`/experiences/${review.publicId}`}
            data-testid="profile-review-read"
          >
            {t('review.readFull')}
          </Link>
          <Link
            className="btn small ghost"
            href={`/experiences/${review.publicId}/edit`}
            data-testid="profile-review-edit"
          >
            {t('mine.edit')}
          </Link>
        </div>
      ) : null}
    </article>
  );
}

// Port of the prototype's "Published" list (app.js renderMine, `.mine-item`), limited to what the
// demo slice has: no drafts, follow-ups or deletion yet.
export function OwnReviewList({ reviews, locale }: { reviews: OwnReviewVM[]; locale: Locale }) {
  const t = useTranslations();
  return (
    <section className="panel" aria-labelledby="profile-experiences-head">
      <h2 className="section-head" id="profile-experiences-head">
        {t('mine.profile.experiences')}{' '}
        <span className="count" data-testid="profile-review-count">
          {formatNumber(reviews.length, locale)}
        </span>
      </h2>
      {reviews.length > 0 ? (
        reviews.map((review) => <OwnReview key={review.publicId} review={review} locale={locale} />)
      ) : (
        <div className="empty-state">
          <p>{t('mine.empty')}</p>
          <Link className="btn small" href="/write" data-testid="profile-write">
            {t('nav.compose')}
          </Link>
        </div>
      )}
    </section>
  );
}
