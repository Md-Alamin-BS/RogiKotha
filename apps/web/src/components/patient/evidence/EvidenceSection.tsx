import { getTranslations } from 'next-intl/server';

import { loadPublicEvidenceCount, logSlotFailure } from '@/server/actions/review-slots';
import { EvidenceNote } from './EvidenceNote';

// C16 slot (props frozen when U47 merges): the public side of a review's documents. A count above
// 0 shows the fixed evidence wording and the count; otherwise the heading with No documents.
// Never a file and never a preview. U48 swaps the count's source and keeps this resolution.
export async function EvidenceSection({ reviewPublicId }: { reviewPublicId: string }) {
  const t = await getTranslations();
  let count: number | null;
  try {
    count = await loadPublicEvidenceCount(reviewPublicId);
  } catch (error: unknown) {
    logSlotFailure('evidence', error);
    // A failed count is not "No documents": say the read failed instead.
    return (
      <section aria-labelledby="evidence-none-head" data-testid="evidence-error">
        <h2 className="section-head" id="evidence-none-head">
          {t('filter.evidence')}
        </h2>
        <p className="note">{t('errors.common.internal')}</p>
      </section>
    );
  }
  if (count !== null && count > 0) return <EvidenceNote count={count} />;
  return (
    <section aria-labelledby="evidence-none-head" data-testid="evidence-none">
      <h2 className="section-head" id="evidence-none-head">
        {t('filter.evidence')}
      </h2>
      <p className="note">{t('label.noDocuments')}</p>
    </section>
  );
}
