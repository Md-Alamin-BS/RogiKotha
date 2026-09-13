import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

// Port of concept-04b's <footer class="colophon"> (index.html lines 148-155).
export function Colophon() {
  const t = useTranslations();
  return (
    <footer className="colophon">
      <nav className="foot-nav" aria-label={t('a11y.siteSections')}>
        <Link href="/emergency">{t('nav.emergency')}</Link>
        <Link href="/about">{t('nav.about')}</Link>
      </nav>
      <p>{t('disclaimer.long')}</p>
      <p className="foot-demo">{t('demo.banner')}</p>
    </footer>
  );
}
