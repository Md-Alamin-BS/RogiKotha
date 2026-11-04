import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link } from '@/i18n/routing';
import type { PatientTab } from '@/lib/cookies';
import type { Theme, Motion } from '@/lib/cookies';
import { Tabs } from './Tabs';
import { ThemeControls } from '../shared/ThemeControls';
import { AccountControl, type MastheadAccount } from './auth/AccountControl';

// Port of concept-04b's <header class="masthead"> (index.html lines 31-90).
// The ⌘ gallery link and ◇ demo button are dropped (task step 7). The
// account control shows the real signed-in state (FR1.4); the layout passes
// the signed-in account, and only its display name reaches the client.
export function Masthead({
  activeTab,
  locale,
  theme,
  motion,
  account = null,
}: {
  activeTab?: PatientTab | undefined;
  locale: Locale;
  theme: Theme;
  motion: Motion;
  account?: MastheadAccount | null | undefined;
}) {
  const t = useTranslations();
  return (
    <header className="masthead">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true" />
        <span className="brand-text">
          <b>{t('brand.name')}</b>
          <i>{t('brand.tagline')}</i>
        </span>
      </Link>

      <Tabs active={activeTab} />

      <Link className="btn cta-write" href="/write" data-nav="compose">
        {t('nav.compose')}
      </Link>

      <div className="controls">
        <AccountControl account={account ? { displayName: account.displayName } : null} />
        <ThemeControls locale={locale} theme={theme} motion={motion} />
      </div>
    </header>
  );
}
