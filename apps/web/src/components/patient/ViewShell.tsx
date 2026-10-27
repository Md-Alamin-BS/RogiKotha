'use client';

import { useEffect, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from '@/i18n/routing';
import { useAnnounce } from '@/lib/announce';
import { titleForView, type ViewName } from '@/lib/titles';
import { decideArrival } from '@/components/shared/ThemeControls';

// A locale switch can mount a fresh #sr-live in the same commit as this
// effect, and some screen readers ignore text written into a region that
// has only just appeared (design review R-01).
const ARRIVAL_ANNOUNCE_DELAY_MS = 150;

// Port of concept-04b's <section class="view" id="view-*"> (index.html)
// plus the view-change announcement in app.js's route() ("View: " + v),
// localized per FD-042.
// ASSUMPTION(T-008): reused by admin pages too, even though
// components/patient/ is where the task's Owned paths places this file —
// admin has no separate ViewShell-equivalent listed there. See ISS list in
// the T-008 hand-off.
//
// ASSUMPTION(T-207a, fixes ISS-121): `title` only renders an `<h1
// class="display">` when non-empty. A page whose ported content brings its
// own complete heading (Emergency's `.emerg-head h1`, About/Policy's
// `.about-head h1` — neither is `.display`, and the prototype's real markup
// for these views never had a second, generic heading above them) passes
// `title=""` so this section stays a single-heading landmark instead of an
// empty `<h1>` (an axe/WCAG failure) sitting in front of the real one. See
// docs/implementation/ISSUES.md.
export function ViewShell({
  view,
  title,
  children,
}: {
  view: ViewName;
  title: string;
  children?: ReactNode;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const path = usePathname();
  const announce = useAnnounce();
  const viewName = titleForView(view, t) || t('nav.discover');
  const viewMessage = t('a11y.announce.view', { view: viewName });
  const languageMessage = t('a11y.announce.language');

  // Primitives only, never `t`: the preference actions revalidate the
  // layout, and a new translator would re-run this and replace the theme
  // announcement with the view (design review R-03). `announce` is stable.
  useEffect(() => {
    // See lib/cookies.ts for why data-view is set here, client-side,
    // instead of being derived server-side alongside data-app.
    document.body.dataset.view = view;
    const timer = window.setTimeout(() => {
      announce(decideArrival(locale, path) === 'language' ? languageMessage : viewMessage);
    }, ARRIVAL_ANNOUNCE_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      delete document.body.dataset.view;
    };
  }, [view, locale, path, viewMessage, languageMessage]);

  return (
    <section className="view" id={`view-${view}`}>
      {title ? <h1 className="display">{title}</h1> : null}
      {children}
    </section>
  );
}
