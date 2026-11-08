'use client';

import { useEffect, useSyncExternalStore, ViewTransition, type ReactNode } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from '@/i18n/routing';

// A navigation that carries this transition type swaps at once. A language
// switch keeps the locale-free path, but Next remounts the whole `[locale]`
// subtree, so React would otherwise pair the old and new `page` boundaries
// and run the route fade (BR6.1; T-011 Code Generation spike).
export const LANGUAGE_SWITCH_TRANSITION = 'rk-language';

const PAGE_CLASS = { [LANGUAGE_SWITCH_TRANSITION]: 'none', default: 'rk-page' };

// fix: U50 (ISS-784): the locale navigation sometimes commits without the link's transition
// types, so the toggle also marks the switch here. Both frames then hold `none` when the
// navigation commits: the old one from the click's own urgent update, the new one from its mount.
let pendingLocale: string | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

// A switch that never arrives (a failed navigation) gives the route fade back after this.
const PENDING_LIFETIME_MS = 10_000;

function setPendingLocale(next: string | null): void {
  if (pendingLocale === next) return;
  pendingLocale = next;
  clearTimeout(pendingTimer);
  if (next !== null) pendingTimer = setTimeout(() => setPendingLocale(null), PENDING_LIFETIME_MS);
  for (const listener of listeners) listener();
}

export function markLanguageSwitch(targetLocale: string): void {
  setPendingLocale(targetLocale);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function usePendingLocale(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => pendingLocale,
    () => null,
  );
}

// FD-091 route transition (frontend-components.md § 5.1, BR6.1). The boundary
// lives in the patient layout, which persists across navigations, so it is
// keyed by the locale-free path: a new path remounts it and React pairs the
// old and new frames under the one name `page`. Search-parameter changes,
// theme or motion toggles and server-action refreshes keep the key, and
// `update="none"` keeps them still. All timing is in motion.css.
export function RouteTransition({ children }: { children: ReactNode }) {
  const path = usePathname();
  const locale = useLocale();
  const pending = usePendingLocale();
  const pageClass = pending === null ? PAGE_CLASS : 'none';

  useEffect(() => {
    // Entry motion applies only to content inserted after this mark, so the
    // server-rendered first paint never animates (BR4.5). A DOM property
    // write, not a style attribute, so a strict CSP allows it.
    document.documentElement.dataset.motionReady = '';
  }, []);

  useEffect(() => {
    // The frame in the target language has committed, so the switch has arrived.
    if (pending === locale) setPendingLocale(null);
  }, [pending, locale]);

  return (
    <ViewTransition
      key={path}
      name="page"
      default="none"
      enter={pageClass}
      exit={pageClass}
      share={pageClass}
      update="none"
    >
      <div className="page-frame">{children}</div>
    </ViewTransition>
  );
}
