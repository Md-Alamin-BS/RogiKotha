import { useTranslations } from 'next-intl';
import type { DistributionVM } from '@rogikotha/contracts';
import { DistBlock } from './DistBlock';

export function SentimentBlock({
  dist,
  threshold,
  compact = false,
}: {
  dist: DistributionVM;
  threshold: number;
  compact?: boolean;
}) {
  const t = useTranslations();
  return (
    <DistBlock
      dist={dist}
      prefix="sentiment."
      title={t('sentiment.title')}
      compact={compact}
      threshold={threshold}
      testId="sentiment-block"
    />
  );
}
