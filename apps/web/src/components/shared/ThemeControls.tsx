'use client';

import { useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Locale } from '@rogikotha/i18n';
import { Link, usePathname } from '@/i18n/routing';
import { setLang, setTheme, setMotion } from '@/server/actions/preferences';
import type { Theme, Motion } from '@/lib/cookies';
import { useAnnounce } from '@/lib/announce';
import { LANGUAGE_SWITCH_TRANSITION, markLanguageSwitch } from '../patient/motion/RouteTransition';

// The language toggle navigates to a page in the other locale, so it cannot
// speak the change itself: it leaves this per-tab note and the arriving
// page's ViewShell announces it in the new language (FD-042, BR2.1-BR2.3).
const LANGUAGE_NOTE_KEY = 'rk.langNote';
const LANGUAGE_NOTE_LIFETIME_MS = 30_000;

type LanguageNote = { targetLocale: string; path: string; at: number };

export function writeNote(targetLocale: Locale, path: string): void {
  const note: LanguageNote = { targetLocale, path, at: Date.now() };
  try {
    window.sessionStorage.setItem(LANGUAGE_NOTE_KEY, JSON.stringify(note));
  } catch {
    // Storage blocked or full: the switch still works, only its announcement is lost (BR2.4).
  }
}

function readNote(): LanguageNote | null {
  const raw = window.sessionStorage.getItem(LANGUAGE_NOTE_KEY);
  if (raw === null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    'targetLocale' in parsed &&
    'path' in parsed &&
    'at' in parsed &&
    typeof parsed.targetLocale === 'string' &&
    typeof parsed.path === 'string' &&
    typeof parsed.at === 'number'
  ) {
    return { targetLocale: parsed.targetLocale, path: parsed.path, at: parsed.at };
  }
  return null;
}

export function decideArrival(activeLocale: string, path: string): 'language' | 'view' {
  try {
    const note = readNote();
    if (note === null) return 'view';
    if (Date.now() - note.at > LANGUAGE_NOTE_LIFETIME_MS) {
      window.sessionStorage.removeItem(LANGUAGE_NOTE_KEY);
      return 'view';
    }
    // A fresh note for the other locale belongs to a switch still in flight.
    if (note.targetLocale !== activeLocale) return 'view';
    // Used up here: the matching page speaks it once, so Back then Forward
    // does not repeat it (BR2.2); any other path discards it (BR2.3).
    window.sessionStorage.removeItem(LANGUAGE_NOTE_KEY);
    return note.path === path ? 'language' : 'view';
  } catch {
    // Unreadable or blocked storage falls back to the view announcement (BR2.4).
    return 'view';
  }
}

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
  // Kept across the switch: `?next=` on sign-in and `?doctor=` on the write page carry the flow.
  const searchParams = useSearchParams();
  const query = searchParams ? Object.fromEntries(searchParams.entries()) : {};
  const languageHref = Object.keys(query).length > 0 ? { pathname, query } : pathname;
  const announce = useAnnounce();
  const [, startTransition] = useTransition();
  const otherLocale: Locale = locale === 'bn' ? 'en' : 'bn';

  function handleThemeClick() {
    const isDark =
      theme === 'dark' ||
      (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    const message = t(next === 'dark' ? 'a11y.announce.themeDark' : 'a11y.announce.themeLight');
    startTransition(() => {
      // Chained, not awaited: a failed write announces nothing and its
      // rejection surfaces exactly as before (BR1.3).
      void setTheme(next).then(() => {
        announce(message);
      });
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
        href={languageHref}
        locale={otherLocale}
        // A language switch swaps the page at once instead of running the route fade (BR6.1).
        transitionTypes={[LANGUAGE_SWITCH_TRANSITION]}
        className="ctl"
        title={t('a11y.lang')}
        // fix: U50 (ISS-760): a link cannot carry aria-pressed (axe aria-allowed-attr); the glyph names the target.
        onClick={(event) => {
          writeNote(otherLocale, pathname);
          // A modified click opens another tab, so this page does not switch (fix: U50, ISS-784).
          if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
            markLanguageSwitch(otherLocale);
          }
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
