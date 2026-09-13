import { useTranslations } from 'next-intl';
import { navGroupLabelKey, navItemKey } from './ConsoleNav';
import type { AdminTab } from '@/lib/cookies';

// Port of admin/app.js's renderCrumbs() (lines ~281-289).
export function Crumbs({ active }: { active?: AdminTab | undefined }) {
  const t = useTranslations();
  if (!active) {
    return (
      <p className="crumbs">
        <span>{t('admin.portal')}</span>
      </p>
    );
  }
  return (
    <p className="crumbs">
      <span>{t('admin.portal')}</span>
      <span className="sep" aria-hidden="true">
        /
      </span>
      <span>{t(navGroupLabelKey(active))}</span>
      <span className="sep" aria-hidden="true">
        /
      </span>
      <b>{t(navItemKey(active))}</b>
    </p>
  );
}
