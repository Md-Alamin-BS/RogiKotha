'use client';

import { useEffect, type ReactNode } from 'react';
import { useAnnounce } from '@/lib/announce';

// Port of concept-04b's <section class="view" id="view-*"> (index.html)
// plus the view-change announcement in app.js's route() ("View: " + v).
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
  view: string;
  title: string;
  children?: ReactNode;
}) {
  const announce = useAnnounce();

  useEffect(() => {
    // See lib/cookies.ts for why data-view is set here, client-side,
    // instead of being derived server-side alongside data-app.
    document.body.dataset.view = view;
    announce(`View: ${view}`);
    return () => {
      delete document.body.dataset.view;
    };
  }, [view, announce]);

  return (
    <section className="view" id={`view-${view}`}>
      {title ? <h1 className="display">{title}</h1> : null}
      {children}
    </section>
  );
}
