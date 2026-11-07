import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

// The author's own controls on their experience (FR4.2, FR5.1). The page renders this only after
// the server has matched the signed-in account to the experience's author.
export function AuthorTools({
  editHref,
  uploader,
}: {
  /** The edit route, given for every review kind (U22 BR5.2). */
  editHref?: string | undefined;
  uploader: ReactNode;
}) {
  const t = useTranslations();
  return (
    <section aria-labelledby="author-tools-head" data-testid="author-tools">
      <h2 className="section-head" id="author-tools-head">
        {t('experience.yourExperience')}
      </h2>
      {editHref ? (
        <p>
          <Link className="btn small ghost" href={editHref}>
            {t('experience.editExperience')}
          </Link>
        </p>
      ) : null}
      {uploader}
    </section>
  );
}
