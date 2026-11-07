import { useTranslations } from 'next-intl';
import { IndexHead } from '@/components/patient/shared/IndexHead';

/** Placeholder rows while the index streams in. */
const SKELETON_ROWS = 3;

// WF7: a static skeleton with no animation (BR8.11). No ViewShell here, so the view is announced
// once, by the page itself.
export default function ExperienceIndexLoading() {
  const t = useTranslations();
  return (
    <section className="view" aria-busy="true" data-testid="experience-index-loading">
      <IndexHead
        kicker={t('nav.discover')}
        title={t('nav.account')}
        note={t('index.experiencesNote')}
      />
      <div className="index-list" aria-hidden="true">
        {Array.from({ length: SKELETON_ROWS }, (_, i) => (
          <div key={i} className="index-skeleton">
            <span className="index-skeleton-line wide" />
            <span className="index-skeleton-line" />
          </div>
        ))}
      </div>
    </section>
  );
}
