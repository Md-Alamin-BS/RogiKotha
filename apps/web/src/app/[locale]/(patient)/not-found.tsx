import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ViewShell } from '@/components/patient/ViewShell';

// BR4.2: inside the patient layout, so the masthead, demo marker and disclaimer stay; the way to
// emergency help is always one link away (BR3.3).
export default function PatientNotFound() {
  const t = useTranslations();

  return (
    <ViewShell view="not-found" title="">
      <div className="notfound">
        <h1 className="display">{t('errors.common.notFound')}</h1>
        <p className="lede">{t('notFound.body')}</p>
        <p className="p-actions">
          <Link className="btn" href="/">
            {t('notFound.home')}
          </Link>
          <Link className="btn ghost" href="/emergency">
            {t('nav.emergency')}
          </Link>
        </p>
      </div>
    </ViewShell>
  );
}
