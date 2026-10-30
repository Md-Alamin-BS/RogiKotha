import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

// The author's own controls on their experience (FR4.2, FR5.1). The page renders this only after
// the server has matched the signed-in account to the experience's author.
export function AuthorTools({
  reviewPublicId,
  uploader,
}: {
  reviewPublicId: string;
  uploader: ReactNode;
}) {
  const t = useTranslations();
  return (
    <section aria-labelledby="author-tools-head">
      <h2 className="section-head" id="author-tools-head">
        {t('experience.yourExperience')}
      </h2>
      <p>
        <Link className="btn small ghost" href={`/experiences/${reviewPublicId}/edit`}>
          {t('experience.editExperience')}
        </Link>
      </p>
      {uploader}
    </section>
  );
}
