import type { FacilityPreviewVM, PreviewVM } from '@rogikotha/contracts';
import { useTranslations } from 'next-intl';

import { ExperienceBody } from '@/components/patient/experience/ExperienceBody';
import { FacilityAccountRow } from '@/components/patient/facilities/FacilityAccountRow';

// What the preview aside shows (frontend-components § 1): the page's own body for a doctor draft,
// U46's visit row for a facility draft. Neither carries the disclaimer, which stays static.
export function PreviewBody({ preview }: { preview: PreviewVM | FacilityPreviewVM }) {
  const t = useTranslations();
  if (preview.kind === 'experience') return <ExperienceBody vm={preview} mode="preview" />;
  if (preview.period) {
    // The row reads neither the public id nor the posted date, which a draft does not have yet.
    return (
      <FacilityAccountRow
        account={{
          publicId: '',
          posted: '',
          author: preview.author,
          period: preview.period,
          body: preview.body,
          ...(preview.overall ? { overall: preview.overall } : {}),
          criteria: preview.criteria,
        }}
      />
    );
  }
  return (
    <article className="acct" data-testid="facility-visit">
      <div className="row-flags">
        <span className="badge plain">{`${t('review.episodeDate')}: ${t('label.notProvided')}`}</span>
      </div>
      <p className="excerpt">{preview.body}</p>
    </article>
  );
}
