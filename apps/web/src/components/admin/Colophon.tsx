import { useTranslations } from 'next-intl';

// Port of admin/index.html's <footer class="colophon"> (lines 94-97).
export function Colophon() {
  const t = useTranslations();
  return (
    <footer className="colophon">
      <p className="foot-note">{t('admin.staffOnlyNote')}</p>
      <p className="foot-demo">{t('admin.permissionNote')}</p>
    </footer>
  );
}
