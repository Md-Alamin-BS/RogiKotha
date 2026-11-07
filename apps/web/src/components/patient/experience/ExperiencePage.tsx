import type { ExperiencePageVM } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { CommentThread } from '@/components/patient/comments/CommentThread';
import { AuthorEvidence } from '@/components/patient/evidence/AuthorEvidence';
import { EvidenceSection } from '@/components/patient/evidence/EvidenceSection';
import { ReviewHistory } from '@/components/patient/review-history/ReviewHistory';
import { AuthorTools } from './AuthorTools';
import { ExperienceHead, ExperienceStory } from './ExperienceBody';
import { ExperienceMargin } from './ExperienceMargin';
import { PublishedNote } from './PublishedNote';
import { RelatedGrid } from './RelatedGrid';

// Port of concept-04b's renderAccount() block order (frontend-components § 1): the head, then the
// story, the edit mark, the documents, the author's tools, the discussion, the related lists and
// the disclaimer, with the provenance margin beside them. The slots get only the public id.
export function ExperiencePage({
  vm,
  reviewPublicId,
  isAuthor,
  published,
}: {
  vm: ExperiencePageVM;
  reviewPublicId: string;
  isAuthor: boolean;
  /** `?published=1` for the author only (BR8.7). */
  published: boolean;
}) {
  const t = useTranslations();
  const editHref = `/experiences/${reviewPublicId}/edit`;

  return (
    <>
      {published ? <PublishedNote /> : null}
      <article className="experience" data-testid="experience-page">
        <ExperienceHead vm={vm} mode="page" />
        <div className="a-grid">
          <div>
            <ExperienceStory vm={vm} mode="page" />
            <ReviewHistory reviewPublicId={reviewPublicId} />
            <EvidenceSection reviewPublicId={reviewPublicId} />
            {isAuthor ? (
              <AuthorTools
                editHref={editHref}
                uploader={<AuthorEvidence reviewPublicId={reviewPublicId} />}
              />
            ) : null}
            <CommentThread reviewPublicId={reviewPublicId} />
            <RelatedGrid
              title={t('experience.relatedCond')}
              note={t('experience.relatedNote')}
              cards={vm.relatedByCondition}
              alwaysShow
              testId="related-condition"
            />
            <RelatedGrid
              title={t('experience.relatedDoc')}
              cards={vm.sameDoctor}
              alwaysShow={false}
              testId="related-doctor"
            />
            <div className="callout warn experience-disclaimer" data-static="disclaimer">
              {t('disclaimer.long')}
            </div>
          </div>
          <ExperienceMargin vm={vm} />
        </div>
      </article>
    </>
  );
}
