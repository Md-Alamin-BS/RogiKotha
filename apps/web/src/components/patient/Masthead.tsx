import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link } from '@/i18n/routing';
import type { PatientTab } from '@/lib/cookies';
import type { Theme, Motion } from '@/lib/cookies';
import { Tabs } from './Tabs';
import { Icon } from '../shared/Icon';
import { ThemeControls } from '../shared/ThemeControls';

// Port of concept-04b's <header class="masthead"> (index.html lines 31-90).
// The ⌘ gallery link and ◇ demo button are dropped (task step 7); the
// account control links to /sign-in instead of opening the demo session
// simulation (T-102 replaces this with the real signed-in states).
export function Masthead({
  activeTab,
  locale,
  theme,
  motion,
}: {
  activeTab?: PatientTab | undefined;
  locale: Locale;
  theme: Theme;
  motion: Motion;
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
        {/* STORY-AUTH-001 (T-102 not built yet): signed-out glyph only. */}
        <Link id="account" href="/sign-in" className="ctl" title={t('auth.signIn.title')}>
          <Icon name="person" />
        </Link>
        <ThemeControls locale={locale} theme={theme} motion={motion} />
      </div>
    </header>
  );
}
