import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link } from '@/i18n/routing';
import type { AdminTab, Theme, Motion } from '@/lib/cookies';
import { ConsoleNav, type NavCounts } from './ConsoleNav';
import { ThemeControls } from '../shared/ThemeControls';

// Port of admin/index.html's <header class="masthead"> (lines 31-56). The
// #role switcher, the ↗ gallery link and the #staff-account entry are
// dropped (task step 13 — controls are lang/theme only); T-103 adds the
// read-only role chip and the real staff account entry.
export function Masthead({
  activeTab,
  counts,
  locale,
  theme,
  motion,
}: {
  activeTab?: AdminTab | undefined;
  counts: NavCounts;
  locale: Locale;
  theme: Theme;
  motion: Motion;
}) {
  const t = useTranslations();
  return (
    <header className="masthead">
      <Link className="brand" href="/admin/queue">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">
          <b>{t('brand.name')}</b>
          <i>{t('admin.portal')}</i>
        </span>
      </Link>
      <span className="staff-badge">{t('admin.staffOnly')}</span>
      <span className="staff-meta" aria-hidden="true">
        ·
      </span>

      <ConsoleNav active={activeTab} counts={counts} />

      <div className="controls">
        {/* TODO(T-103): staff account entry (security page + sign out). */}
        <ThemeControls locale={locale} theme={theme} motion={motion} showMotion={false} />
      </div>
    </header>
  );
}
