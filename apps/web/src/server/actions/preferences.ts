'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { THEME_COOKIE, MOTION_COOKIE, type Theme, type Motion } from '@/lib/cookies';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const COOKIE_OPTS = { sameSite: 'lax' as const, path: '/', maxAge: ONE_YEAR_SECONDS };

// The `rk.lang` cookie is owned by @rogikotha/i18n's routing.ts
// (next-intl's `localeCookie`); next-intl itself writes it whenever a
// locale-prefixed route is visited via its <Link locale=…>, so no server
// action is needed to set it here. This action exists only to satisfy task
// step 9 ("calls the setLang server action to write rk.lang") for the case
// where a reader clicks the language control without JS having a next-intl
// <Link> in the DOM yet (progressive enhancement / no-JS fallback would
// still navigate via the <Link>'s href).
export async function setLang(locale: 'en' | 'bn'): Promise<void> {
  const store = await cookies();
  store.set('rk.lang', locale, COOKIE_OPTS);
  revalidatePath('/', 'layout');
}

export async function setTheme(theme: Theme): Promise<void> {
  const store = await cookies();
  if (theme) {
    store.set(THEME_COOKIE, theme, COOKIE_OPTS);
  } else {
    store.delete(THEME_COOKIE);
  }
  revalidatePath('/', 'layout');
}

export async function setMotion(motion: Motion): Promise<void> {
  const store = await cookies();
  store.set(MOTION_COOKIE, motion, COOKIE_OPTS);
  revalidatePath('/', 'layout');
}
