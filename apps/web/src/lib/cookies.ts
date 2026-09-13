import { cookies } from 'next/headers';

// Preference cookie names (01-conventions.md §7 theme/motion, §6 rk.lang is
// @rogikotha/i18n's routing.ts localeCookie). All three are 1-year,
// `sameSite: 'lax'`, `path: '/'` — set only by server/actions/preferences.ts.
export const THEME_COOKIE = 'rk.theme';
export const MOTION_COOKIE = 'rk.motion';

export type Theme = 'light' | 'dark' | null;
export type Motion = 'on' | 'off';

export async function readTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === 'light' || value === 'dark' ? value : null;
}

export async function readMotion(): Promise<Motion> {
  const store = await cookies();
  const value = store.get(MOTION_COOKIE)?.value;
  return value === 'off' ? 'off' : 'on';
}

/*
 * data-app / data-view mechanism (01-conventions.md §7, task step 7-8).
 *
 * next-intl requires the [locale] layout to own <html>/<body>, so the
 * nested (patient)/admin layouts cannot set attributes on <body>
 * themselves. Two different mechanisms are used here, on purpose:
 *
 * - data-app is derived SERVER-SIDE, in [locale]/layout.tsx, from the
 *   `x-pathname` request header that proxy.ts stamps on every request (see
 *   deriveAppFromPathname below). No client JS, no hydration risk, and the
 *   two nested layouts already need to know which stylesheet to import, so
 *   the same signal serves both needs.
 * - data-view is set CLIENT-SIDE instead, by components/patient/ViewShell's
 *   effect (`document.body.dataset.view = view`). Every page already passes
 *   its own `view` name to <ViewShell>, which is the single source of
 *   truth the prototype's own route() function used; re-deriving the same
 *   view name from the URL a second time (a full copy of the prototype's
 *   ROUTES/ADMIN VIEWS slug tables) would be duplicated logic that could
 *   drift from what the page actually rendered. Nothing in the ported CSS
 *   selects on `body[data-view]` (only `#view-<name>` ids, which every page
 *   already renders via ViewShell), so there is no flash-of-unstyled
 *   content and no hydration mismatch to suppress — data-view is simply
 *   absent from the initial server-rendered markup.
 */
export function deriveAppFromPathname(pathname: string): 'patient' | 'admin' {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
  return withoutLocale === '/admin' || withoutLocale.startsWith('/admin/') ? 'admin' : 'patient';
}

export type PatientTab = 'discover' | 'doctors' | 'facilities' | 'topics' | 'experiences' | 'mine';

// Exact-match only, mirroring the prototype's data-nav matching (app.js
// `route()` compares data-nav against the current view NAME, and a detail
// view like `profile` never equals the index view's name `doctors` — so a
// doctor profile page does not highlight the "Doctors" tab either).
export function activePatientTab(pathname: string): PatientTab | undefined {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
  switch (withoutLocale) {
    case '/':
      return 'discover';
    case '/doctors':
      return 'doctors';
    case '/facilities':
      return 'facilities';
    case '/topics':
      return 'topics';
    case '/experiences':
      return 'experiences';
    case '/me':
      return 'mine';
    default:
      return undefined;
  }
}

export type AdminTab = 'queue' | 'evidence' | 'providers' | 'notifications' | 'config';

// Prefix match (unlike activePatientTab): the admin console's case detail
// route (/admin/queue/{code}) is a real URL in this port but was never a
// separate "view" in the prototype (case selection was inline state within
// the single #queue view), so it stays part of the "queue" tab.
export function activeAdminTab(pathname: string): AdminTab | undefined {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/admin';
  if (withoutLocale.startsWith('/admin/evidence')) return 'evidence';
  if (withoutLocale.startsWith('/admin/providers')) return 'providers';
  if (withoutLocale.startsWith('/admin/notifications')) return 'notifications';
  if (withoutLocale.startsWith('/admin/config')) return 'config';
  if (withoutLocale === '/admin' || withoutLocale.startsWith('/admin/queue')) return 'queue';
  // ASSUMPTION(T-008): /admin/sign-in, /admin/approve-device, /admin/security
  // render the same console chrome as every other admin page (the
  // prototype hid topnav/tabbar/crumbs entirely on these views via a
  // dedicated admin/(public)/ route group — see ISS list in the T-008
  // hand-off) — no nav tab is highlighted for them rather than a false one.
  return undefined;
}
