import type { ReactNode } from 'react';
import type { DemoReviewDetail } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatDate, formatMonthYear } from '@rogikotha/i18n/format';
import { useLocale, useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';
import { Byline } from './Byline';
import { bylineIdentity, dhakaIsoDate, paragraphs } from './people';

// Port of concept-04b's renderAccount() (app.js, "4 · Account detail") for the slice's quick
// review: head, story, the evidence note, the discussion and the provenance margin. Sections
// the slice has no data for (timeline, follow-ups, tags, reactions, related) are left out.
export function ExperienceDetail({
  review,
  evidence,
  authorTools,
  discussion,
}: {
  review: DemoReviewDetail;
  /** The evidence note for every reader (FR5.3), shown once a file is ready. */
  evidence: ReactNode;
  /** The edit link and uploader, only for the author. */
  authorTools?: ReactNode;
  discussion: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const identity = bylineIdentity(review.identityMode);
  const period = formatMonthYear({ year: review.periodYear, month: review.periodMonth }, locale);
  const publishedIso = dhakaIsoDate(review.publishedAt);
  const published = formatDate(publishedIso, locale);
  const story = paragraphs(review.body);
  // A mixed-language story keeps the page language rather than claiming one.
  const storyLang = review.language === 'mixed' ? undefined : review.language;
  const sentiment = review.sentiment ? t(`sentiment.${review.sentiment}`) : t('label.notProvided');
  const outcome = review.outcome ? t(`outcome.${review.outcome}`) : t('label.notProvided');
  const doctorHref = `/doctors/${review.doctor.publicId}`;

  return (
    <>
      <section className="a-head">
        <span className="kicker">{t('experience.episode')}</span>
        <h1 className="a-title display">{review.title}</h1>
        <Byline
          variant="lead"
          name={identity === 'anon' ? null : review.authorDisplayName}
          identity={identity}
          relationship={review.relationship}
          when={published}
          whenDateTime={publishedIso}
        />
        <div className="a-flags">
          {review.sentiment ? (
            <span className={`badge ${review.sentiment}`}>{sentiment}</span>
          ) : null}
          {review.outcome ? <span className="badge plain">{outcome}</span> : null}
          <span className="badge plain">
            {t('review.episodeDate')}: {period}
          </span>
          {review.version > 1 ? <span className="badge plain">{t('label.edited')}</span> : null}
        </div>
        {/* On narrow screens the margin follows the comments, so the head names the doctor too. */}
        <p className="note">
          {t('profile.kicker')}:{' '}
          <Link className="link-btn name-link" href={doctorHref} title={t('nav.viewDoctor')}>
            {review.doctor.name}
          </Link>{' '}
          · {t('label.notVerified')}
        </p>
      </section>

      <div className="a-grid">
        <div>
          {story.length > 0 ? (
            story.map((text, index) => (
              <p
                key={index}
                className={index === 0 ? 'story story-lead' : 'story'}
                lang={storyLang}
              >
                {text}
              </p>
            ))
          ) : (
            <p className="story">{t('label.notProvided')}</p>
          )}

          {review.readyEvidenceCount > 0 ? (
            evidence
          ) : (
            <>
              <h2 className="section-head">{t('filter.evidence')}</h2>
              <p className="note">{t('label.noDocuments')}</p>
            </>
          )}
          {authorTools}
          {discussion}

          <div className="callout warn">{t('disclaimer.long')}</div>
        </div>

        <aside className="a-margin">
          {identity === 'anon' ? (
            <div>
              <span className="k">{t('compose.identity.anon')}</span>
              <span className="v">{t('compose.identity.anonNote')}</span>
            </div>
          ) : null}
          <div>
            <span className="k">{t('review.episodeDate')}</span>
            <span className="v">{period}</span>
          </div>
          <div>
            <span className="k">{t('experience.publishedLabel')}</span>
            <span className="v">{published}</span>
          </div>
          <div>
            <span className="k">{t('profile.kicker')}</span>
            <Link className="link-btn" href={doctorHref}>
              {review.doctor.name}
            </Link>
            <br />
            <span>{t('label.notVerified')}</span>
          </div>
          <div>
            <span className="k">{t('review.relationship')}</span>
            <span className="v">{t(`rel.${review.relationship}`)}</span>
          </div>
          <div>
            <span className="k">{t('experience.sentimentLabel')}</span>
            <span className="v">{sentiment}</span>
          </div>
          <div>
            <span className="k">{t('experience.outcomeLabel')}</span>
            <span className="v">{outcome}</span>
          </div>
        </aside>
      </div>
    </>
  );
}
