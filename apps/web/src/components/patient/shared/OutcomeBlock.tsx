import { useTranslations } from 'next-intl';
import type { DistributionVM } from '@rogikotha/contracts';
import { DistBlock } from './DistBlock';

// Outcomes are the author's own report, so the block always says so (BR2.3).
export function OutcomeBlock({
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
    <>
      <DistBlock
        dist={dist}
        prefix="outcome."
        title={t('outcome.title')}
        compact={compact}
        threshold={threshold}
        rows
        testId="outcome-block"
      />
      {compact ? null : <p className="note">{t('outcome.selfReported')}</p>}
    </>
  );
}
