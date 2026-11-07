import { getTranslations } from 'next-intl/server';

import { loadPublicEvidenceCount, logSlotFailure } from '@/server/actions/review-slots';
import { EvidenceNote } from './EvidenceNote';

// C16 slot: the public side of a review's documents, props frozen. It renders only the note with
// the count (BR5.3, BR5.5): never a file list or a name, and nothing for an unknown or
// unpublished review. The author's own list lives in AuthorEvidence.
export async function EvidenceSection({ reviewPublicId }: { reviewPublicId: string }) {
  let count: number | null;
  try {
    count = await loadPublicEvidenceCount(reviewPublicId);
  } catch (error: unknown) {
    logSlotFailure('evidence', error);
    const t = await getTranslations();
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
  if (count === null) return null;
  return <EvidenceNote count={count} />;
}
