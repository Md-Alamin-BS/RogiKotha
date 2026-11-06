import { useLocale, useTranslations } from 'next-intl';
import type { ConditionCardVM } from '@rogikotha/contracts';
import type { Locale } from '@rogikotha/i18n';
import { formatNumber } from '@rogikotha/i18n/format';
import { Reveal } from '@/components/patient/motion/Reveal';
import { BrowseCard } from '@/components/patient/shared/BrowseCard';
import { IndexHead } from '@/components/patient/shared/IndexHead';

// Port of concept-04b's renderTopicIndex() (app.js 1906-1924). The prototype lists every topic in
// the directory, including those no one has written about yet, so a reader learns the topic exists
// and can be the first to write (BR4.4).
export function TopicIndex({ cards, total }: { cards: ConditionCardVM[]; total: number }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  return (
    <>
      <IndexHead
        kicker={t('nav.discover')}
        title={t('nav.condition')}
        note={t('index.topicsNote')}
      />
      <p className="note count-line" data-testid="topic-index-count">
        {t('condition.listCount', { n: total, count: formatNumber(total, locale) })}
      </p>
      <Reveal as="ul" className="index-grid">
        {cards.map((card) => (
          <li key={card.publicId}>
            <BrowseCard
              href={`/topics/${card.publicId}`}
              title={card.name}
              sub={
                card.accountsTotal > 0
                  ? t('condition.experienceCount', {
                      n: card.accountsTotal,
                      count: formatNumber(card.accountsTotal, locale),
                    })
                  : t('index.emptyTopic')
              }
            />
          </li>
        ))}
      </Reveal>
    </>
  );
}
