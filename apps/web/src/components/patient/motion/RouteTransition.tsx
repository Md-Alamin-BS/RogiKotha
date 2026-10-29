'use client';

import { useEffect, ViewTransition, type ReactNode } from 'react';
import { usePathname } from '@/i18n/routing';

// A navigation that carries this transition type swaps at once. A language
// switch keeps the locale-free path, but Next remounts the whole `[locale]`
// subtree, so React would otherwise pair the old and new `page` boundaries
// and run the route fade (BR6.1; T-011 Code Generation spike).
export const LANGUAGE_SWITCH_TRANSITION = 'rk-language';

const PAGE_CLASS = { [LANGUAGE_SWITCH_TRANSITION]: 'none', default: 'rk-page' };

// FD-091 route transition (frontend-components.md § 5.1, BR6.1). The boundary
// lives in the patient layout, which persists across navigations, so it is
// keyed by the locale-free path: a new path remounts it and React pairs the
// old and new frames under the one name `page`. Search-parameter changes,
// theme or motion toggles and server-action refreshes keep the key, and
// `update="none"` keeps them still. All timing is in motion.css.
export function RouteTransition({ children }: { children: ReactNode }) {
  const path = usePathname();

  useEffect(() => {
    // Entry motion applies only to content inserted after this mark, so the
    // server-rendered first paint never animates (BR4.5). A DOM property
    // write, not a style attribute, so a strict CSP allows it.
    document.documentElement.dataset.motionReady = '';
  }, []);

  return (
    <ViewTransition
      key={path}
      name="page"
      default="none"
      enter={PAGE_CLASS}
      exit={PAGE_CLASS}
      share={PAGE_CLASS}
      update="none"
    >
      <div className="page-frame">{children}</div>
    </ViewTransition>
  );
}
