import { useLocale, useTranslations } from 'next-intl';
import type { DemoTopicRow } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Link } from '@/i18n/routing';

// Port of concept-04b's renderTopicIndex() (app.js 1906-1924): every topic, alphabetical, including
// the ones nobody has written about, because an empty topic is an invitation to write.
export function TopicList({ topics }: { topics: DemoTopicRow[] }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <>
      <p className="lede">{t('index.topicsNote')}</p>
      <div className="meta-row">
        <span data-testid="topic-list-count">
          {t('condition.listCount', {
            n: topics.length,
            count: formatNumber(topics.length, locale),
          })}
        </span>
      </div>
      <div className="index-grid" data-testid="topic-list">
        {topics.map((topic) => (
          <Link
            key={topic.publicId}
            className="browse-card"
            href={`/topics/${topic.publicId}`}
            data-testid="topic-card"
          >
            <b>{topic.name}</b>
            <span>
              {topic.experienceCount > 0
                ? t('condition.experienceCount', {
                    n: topic.experienceCount,
                    count: formatNumber(topic.experienceCount, locale),
                  })
                : t('index.emptyTopic')}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
