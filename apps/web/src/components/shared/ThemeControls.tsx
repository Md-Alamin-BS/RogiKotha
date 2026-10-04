'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link, usePathname } from '@/i18n/routing';
import { setLang, setTheme, setMotion } from '@/server/actions/preferences';
import type { Theme, Motion } from '@/lib/cookies';

// Port of app.js's #lang/#theme/#motion controls (index.html) and their
// handlers (setLang/setTheme/setMotion, app.js lines ~144-190). Shared by
// the patient and admin mastheads; admin's controls div has no motion
// toggle (admin/index.html), hence `showMotion`.
export function ThemeControls({
  locale,
  theme,
  motion,
  showMotion = true,
}: {
  locale: Locale;
  theme: Theme;
  motion: Motion;
  showMotion?: boolean;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const otherLocale: Locale = locale === 'bn' ? 'en' : 'bn';

  function handleThemeClick() {
    const isDark =
      theme === 'dark' ||
      (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    startTransition(() => {
      void setTheme(isDark ? 'light' : 'dark');
    });
  }

  function handleMotionClick() {
    startTransition(() => {
      void setMotion(motion === 'off' ? 'on' : 'off');
    });
  }

  return (
    <>
      {/*
       * ASSUMPTION(T-008): the task file describes this as a "light → dark
       * → system" cycle citing app.js:88, but that line is inside the
       * `state` object literal, not the click handler — the actual handler
       * (both patient and admin app.js) is a two-state toggle keyed off the
       * CURRENT effective theme (`currentIsDark() ? 'light' : 'dark'`),
       * which never revisits "follow the system" once clicked. Ported the
       * real handler (narrower, reversible) rather than the task's prose;
       * see ISS list in the T-008 hand-off.
       */}
      <Link
        id="lang"
        href={pathname}
        locale={otherLocale}
        className="ctl"
        title={t('a11y.lang')}
        aria-pressed={locale === 'bn'}
        onClick={() => {
          startTransition(() => {
            void setLang(otherLocale);
          });
        }}
      >
        <span>{locale === 'bn' ? 'A' : 'অ'}</span>
      </Link>
      <button
        id="theme"
        type="button"
        className="ctl"
        title={t('a11y.theme')}
        onClick={handleThemeClick}
      >
        <span>◐</span>
      </button>
      {showMotion ? (
        <button
          id="motion"
          type="button"
          className="ctl"
          title={t('a11y.motion')}
          aria-pressed={motion === 'off'}
          onClick={handleMotionClick}
        >
          <span>◌</span>
        </button>
      ) : null}
    </>
  );
}
